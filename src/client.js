var samlEcpJs = samlEcpJs || {};

//@@include('clientHelper.js')

samlEcpJs.client = function(config) {
	this.config = config;
	this.parser = new DOMParser();
};

samlEcpJs.client.prototype = {
	/**
	 * Step 1 - Initiate the initial resource request to the SP
	 */
	get: function (url, config) {

		// Construct the call context
		var callCtx = {};
		applyConfig(callCtx, this.config);
		applyConfig(callCtx, config);
		callCtx.url = url;

		var me = this;

		// Send the PAOS request to the SP
		var xmlHttp = new XMLHttpRequest();
		xmlHttp.open("GET", url);
		xmlHttp.setRequestHeader(HEADER.ACCEPT.KEY, HEADER.ACCEPT.PAOS);
		xmlHttp.setRequestHeader(HEADER.PAOS.KEY, HEADER.PAOS.SAML2_ECP);
		xmlHttp.withCredentials = true;

		xmlHttp.onreadystatechange = function () {
			if (xmlHttp.readyState == 4) {
				if (xmlHttp.status == 200)
					onSPResourceRequestRespone.call(me, callCtx, xmlHttp);
			}
		};

		xmlHttp.send();
	},

	parseResponseHeadersString : function(responseHeadersString) {
		var responseHeaderArray = responseHeadersString.split("\r\n");
		var result = {};
		for(var i = 0; i < responseHeaderArray.length; i++) {
			var tokens = /^(.+?):(.*)/.exec(responseHeaderArray[i]);
			if(tokens === null) continue;
			result[tokens[1]] = tokens[2];
		}
		return result;
	},
	isResponseAnAuthRequest : function(responseHeaders, responseBody) {

		var contentType = getObjectValueFromCaseInsensitiveKey(responseHeaders, "content-type");

		if(contentType === null)
			return false;

		//var isPAOSContentType = false;
		var isAuthRequest = false;
		var xmlDoc = null;
		var paosRequestNode = null;

		if(!contentType.split(";").some(function(element) {
			return element.trim().toLowerCase() == HEADER.CONTENT_TYPE.PAOS;
		})) {
			return false;
		}

		xmlDoc = this.parser.parseFromString(responseBody, "text/xml");

		// If we are not authenticated then we should be greeted with a SOAP message
		// that we should forward to the IdP, otherwise we simply retrieve the actual resource
		paosRequestNode = xpathQuery(	xmlDoc,
			"//SOAP_ENV:Envelope/SOAP_ENV:Header/PAOS:Request",
			NS);

		// The most reliable method of determining if this is a PAOS request or not to simply
		// check if the PAOS:Request xpath expression was able to evaluate properly.
		// We cannot rely on content-type headers or other such things as the actual resource
		// may in fact be an XML document.
		return paosRequestNode.length !== 0;
	}
};

/////////////////////////////// Private methods ///////////////////////////////////////////

/**
 * Step 2 - Forward the SP response to the IdP
 *
 * Process the response from the SP after the initial request for a resource
 * has been made and then forward this response to the IdP while performing
 * basic auth (if required).
 */
function onSPResourceRequestRespone(callCtx, reqXmlHttp) {

	var response = reqXmlHttp.responseText;

	// If the response is not an auth request then we are already authenticated
	if(!this.isResponseAnAuthRequest(this.parseResponseHeadersString(reqXmlHttp.getAllResponseHeaders()), response)) {
		callCtx.success(response, reqXmlHttp.statusText, reqXmlHttp);
		return;
	}

	var xmlDoc = this.parser.parseFromString(response,"text/xml");

	// If we are not authenticated then we should be greeted with a SOAP message
	// that we should forward to the IdP, otherwise we simply retrieve the actual resource
	var paosRequestNode = xpathQuery(	xmlDoc,
		"//SOAP_ENV:Envelope/SOAP_ENV:Header/PAOS:Request",
		NS);

	callCtx.responseConsumerURL = paosRequestNode[0].getAttribute("responseConsumerURL");

	// First, attempt to have the IdP authenticate the request with credentials
	// (i.e. see if we are 'signed on' to the IdP already)
	// Post the data to the IdP
	var me = this;
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.open("POST", callCtx.idpEndpointUrl, true);
	xmlHttp.setRequestHeader(HEADER.CONTENT_TYPE.KEY, HEADER.CONTENT_TYPE.XML);
	xmlHttp.withCredentials = true;
	if(callCtx.password !== undefined) {
		xmlHttp.setRequestHeader("Authorization",
			createBasicAuthString(callCtx.username, callCtx.password));
	}
	xmlHttp.onreadystatechange = function() {
		if (xmlHttp.readyState == 4) {
			if(xmlHttp.status == 200) {
				onIdPUnauthRequestRespone.call(me, callCtx, xmlHttp.responseText);
			}
		}
	};

	// As per (http://docs.oasis-open.org/security/saml/Post2.0/saml-ecp/v2.0/cs01/saml-ecp-v2.0-cs01.html)
	// (section "2.3.4 ECP Routes <samlp:AuthnRequest> to Identity Provider"), the SOAP header should not be forwarded to the IDP
	// so strip it from the request
	deleteElement(xmlDoc, NS.SOAP_ENV, "Header");
	xmlHttp.send(XML_HEADER + serializeDocument(xmlDoc));
}

/**
 * Step 2.5 - Check the response of the unauthenticated request
 * that was sent to the IdP
 */
function onIdPUnauthRequestRespone(callCtx, response) {

	var xmlDoc = this.parser.parseFromString(response,"text/xml");
	var me = this;

	// Check the SAML status set by the IdP to check for authentication failure
	var samlStatusNode =
		xpathQuery(	xmlDoc,
			"//SOAP_ENV:Envelope/SOAP_ENV:Body/SAML2P:Response/SAML2P:Status",
			NS);

	var statusObj = getStatusObjFromSamlStatus(samlStatusNode[0]);

	// If this succeeded then skip to the next step
	if(statusObj.statusCode[0] == samlEcpJs.SAML2_STATUS.SUCCESS) {
		onIdPAuthRequestRespone.call(this, callCtx, response);
		return;
	} else {
		if(callCtx.ecpError !== undefined) {
			callCtx.ecpError({
				errorCode: samlEcpJs.ECP_ERROR.IDP_RESPONSE_ERROR,
				idpStatus: statusObj
			});
		}
	}
	// Authentication failed so we can assume we are not 'signed on'
	// Retry the same request but this time provide authentication

	// Ensure that the ecpAuth callback exists
	if(callCtx.ecpAuth === undefined) {
		if(callCtx.ecpError === undefined) {
			return;
		}
		callCtx.ecpError({
			errorCode: samlEcpJs.ECP_ERROR.CLIENT_CONFIG_ERROR,
			errorMsg: "Authentication is requried and a ecpAuth callback was not provided."
		});
		return;
	}

	// Invoke the ecpAuth callback and allow the caller to set the password and
	// retry/continue the authentication process.
	callCtx.ecpAuth({
		setPassword : function(password) {
			callCtx.password = password;
		},
		retryAuth : function() {
			me.get(callCtx.url, callCtx);
		}
	});
}

/**
 * Step 3 - Return the IdP's response back to the SP
 *
 * Process the response from the IdP and then post this response back to the SP.
 */
function onIdPAuthRequestRespone(callCtx, response) {

	var xmlDoc = this.parser.parseFromString(response,"text/xml");

	// Check the SAML status set by the IdP to check for authentication failure
	var samlStatusNode =
		xpathQuery(	xmlDoc,
			"//SOAP_ENV:Envelope/SOAP_ENV:Body/SAML2P:Response/SAML2P:Status",
			NS);

	var statusObj = getStatusObjFromSamlStatus(samlStatusNode[0]);
	//console.debug("statusObj", statusObj);

	if(statusObj.statusCode[0] != samlEcpJs.SAML2_STATUS.SUCCESS) {
		if(callCtx.ecpError !== undefined) {
			callCtx.ecpError({
				errorCode: samlEcpJs.ECP_ERROR.IDP_RESPONSE_ERROR,
				idpStatus: statusObj
			});
		}
		return;
	}

	var ecpResponseNode =
		xpathQuery(	xmlDoc,
			"//SOAP_ENV:Envelope/SOAP_ENV:Header/ECP:Response",
			NS);

	var assertionConsumerServiceURL = ecpResponseNode[0].getAttribute("AssertionConsumerServiceURL");

	//TODO: Compare responseConsumerURL to assertionConsumerServiceURL and send SOAP fault if <>


	var serializer = new XMLSerializer();
	var msgBody = serializer.serializeToString(xmlDoc);

	var me = this;

	// Post the data back to the SP
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.open("POST", assertionConsumerServiceURL, true);
	xmlHttp.setRequestHeader(HEADER.CONTENT_TYPE.KEY, HEADER.CONTENT_TYPE.PAOS);
	xmlHttp.withCredentials = true;
	xmlHttp.onreadystatechange = function() {
		if (xmlHttp.readyState == 4) {
			if(xmlHttp.status == 200 || xmlHttp.status == 302) {
				onRelayIdpResponseToSPResponse.call(me, callCtx, xmlHttp.responseText);
			} else {
				if(callCtx.error !== undefined)
					callCtx.error(xmlHttp, "Error occurred while posting back IdP response");
			}
		}
	};
	xmlHttp.send(response);
}

/**
 * Step 4 (final step) - Process the authenticated (hopefully) resource data
 *
 * If all goes well this will be the actual resource data from the SP that was initially
 * requested.
 */
function onRelayIdpResponseToSPResponse(callCtx, response) {


	// Authentication succeeded, so now retrieve the original request
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.open("GET", callCtx.url, true);
	xmlHttp.setRequestHeader(HEADER.ACCEPT.KEY, HEADER.ACCEPT.PAOS);
	xmlHttp.setRequestHeader(HEADER.PAOS.KEY, HEADER.PAOS.SAML2_ECP);
	xmlHttp.withCredentials = true;

	xmlHttp.onreadystatechange = function() {
		if (xmlHttp.readyState == 4) {
			if(xmlHttp.status == 200) {
				if(callCtx.success !== undefined)
					callCtx.success(xmlHttp.responseText, xmlHttp.statusText, xmlHttp);
			}

		}
	};
	xmlHttp.send();

}

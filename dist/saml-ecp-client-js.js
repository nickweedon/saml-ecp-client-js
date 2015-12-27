define('saml-ecp-client-js',
    
	[],
    // module definition function
    // dependencies (foo and bar) are mapped to function parameters
    function () {

        var samlEcpClientJs = samlEcpClientJs || {};

        var samlEcpClientJs = samlEcpClientJs || {};

samlEcpClientJs.base64 = {
		//		private property
		_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

		//		public method for encoding
		encode : function (input) {
			var output = "";
			var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
			var i = 0;

			input = samlEcpClientJs.base64._utf8_encode(input);

			while (i < input.length) {

				chr1 = input.charCodeAt(i++);
				chr2 = input.charCodeAt(i++);
				chr3 = input.charCodeAt(i++);

				enc1 = chr1 >> 2;
				enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
				enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
				enc4 = chr3 & 63;

				if (isNaN(chr2)) {
					enc3 = enc4 = 64;
				} else if (isNaN(chr3)) {
					enc4 = 64;
				}

				output = output +
					samlEcpClientJs.base64._keyStr.charAt(enc1) + samlEcpClientJs.base64._keyStr.charAt(enc2) +
					samlEcpClientJs.base64._keyStr.charAt(enc3) + samlEcpClientJs.base64._keyStr.charAt(enc4);

			}

			return output;
		},

		//		public method for decoding
		decode : function (input) {
			var output = "";
			var chr1, chr2, chr3;
			var enc1, enc2, enc3, enc4;
			var i = 0;

			input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

			while (i < input.length) {

				enc1 = samlEcpClientJs.base64._keyStr.indexOf(input.charAt(i++));
				enc2 = samlEcpClientJs.base64._keyStr.indexOf(input.charAt(i++));
				enc3 = samlEcpClientJs.base64._keyStr.indexOf(input.charAt(i++));
				enc4 = samlEcpClientJs.base64._keyStr.indexOf(input.charAt(i++));

				chr1 = (enc1 << 2) | (enc2 >> 4);
				chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
				chr3 = ((enc3 & 3) << 6) | enc4;

				output = output + String.fromCharCode(chr1);

				if (enc3 != 64) {
					output = output + String.fromCharCode(chr2);
				}
				if (enc4 != 64) {
					output = output + String.fromCharCode(chr3);
				}

			}

			output = samlEcpClientJs.base64._utf8_decode(output);

			return output;

		},

		//		private method for UTF-8 encoding
		_utf8_encode : function (string) {
			string = string.replace(/\r\n/g,"\n");
			var utftext = "";

			for (var n = 0; n < string.length; n++) {

				var c = string.charCodeAt(n);

				if (c < 128) {
					utftext += String.fromCharCode(c);
				}
				else if((c > 127) && (c < 2048)) {
					utftext += String.fromCharCode((c >> 6) | 192);
					utftext += String.fromCharCode((c & 63) | 128);
				}
				else {
					utftext += String.fromCharCode((c >> 12) | 224);
					utftext += String.fromCharCode(((c >> 6) & 63) | 128);
					utftext += String.fromCharCode((c & 63) | 128);
				}

			}

			return utftext;
		},

		//		private method for UTF-8 decoding
		_utf8_decode : function (utftext) {
			var string = "";
			var i = 0;
			var c1;
			var c2;
			var c;
			
			c = c1 = c2 = 0;

			while ( i < utftext.length ) {

				c = utftext.charCodeAt(i);

				if (c < 128) {
					string += String.fromCharCode(c);
					i++;
				}
				else if((c > 191) && (c < 224)) {
					c2 = utftext.charCodeAt(i+1);
					string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
					i += 2;
				}
				else {
					c2 = utftext.charCodeAt(i+1);
					c3 = utftext.charCodeAt(i+2);
					string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
					i += 3;
				}

			}
			return string;
		}
};


        var samlEcpClientJs = samlEcpClientJs || {};

/////////////////// Public constants ///////////////////////////

samlEcpClientJs.ECP_ERROR = {
	IDP_RESPONSE_ERROR : -1,
	CONSUMER_URL_MISMATCH : -2,
	CLIENT_CONFIG_ERROR : -3
};

// SAML 2 status codes (see https://msdn.microsoft.com/en-us/library/hh269642.aspx)
samlEcpClientJs.SAML2_STATUS = {
	// Top-level status codes
	SUCCESS : "urn:oasis:names:tc:SAML:2.0:status:Success",
	REQUESTER : "urn:oasis:names:tc:SAML:2.0:status:Requester",
	RESPONDER : "urn:oasis:names:tc:SAML:2.0:status:Responder",
	VERSION_MISMATCH : "urn:oasis:names:tc:SAML:2.0:status:VersionMismatch",
		
	// Second-level status codes
	AUTHN_FAILED : "urn:oasis:names:tc:SAML:2.0:status:AuthnFailed",
	INVALID_ATTR_NAME_OR_VALUE : "urn:oasis:names:tc:SAML:2.0:status:InvalidAttrNameOrValue",
	INVALID_NAME_ID_POLICY : "urn:oasis:names:tc:SAML:2.0:status:InvalidNameIDPolicy",
	NO_AUTHN_CONTEXT : "urn:oasis:names:tc:SAML:2.0:status:NoAuthnContext",
	NO_AVAILABLE_IDP : "urn:oasis:names:tc:SAML:2.0:status:NoAvailableIDP",
	NO_PASSIVE : "urn:oasis:names:tc:SAML:2.0:status:NoPassive",
	NO_SUPPORTED_IDP : "urn:oasis:names:tc:SAML:2.0:status:NoSupportedIDP",
	PARTIAL_LOGOUT : "urn:oasis:names:tc:SAML:2.0:status:PartialLogout",
	PROXY_COUNT_EXCEEDED : "urn:oasis:names:tc:SAML:2.0:status:ProxyCountExceeded",
	REQUEST_DENIED : "urn:oasis:names:tc:SAML:2.0:status:RequestDenied",
	REQUEST_UNSUPPORTED : "urn:oasis:names:tc:SAML:2.0:status:RequestUnsupported",
	REQUEST_VERSION_DEPRECATED : "urn:oasis:names:tc:SAML:2.0:status:RequestVersionDeprecated",
	REQUEST_VERSION_TOO_HIGH : "urn:oasis:names:tc:SAML:2.0:status:RequestVersionTooHigh",
	REQUEST_VERSION_TOO_LOW : "urn:oasis:names:tc:SAML:2.0:status:RequestVersionTooLow",
	RESOURCE_NOT_RECOGNIZED : "urn:oasis:names:tc:SAML:2.0:status:ResourceNotRecognized",
	TOO_MANY_RESPONSES : "urn:oasis:names:tc:SAML:2.0:status:TooManyResponses",
	UNKNOWN_ATTR_PROFILE : "urn:oasis:names:tc:SAML:2.0:status:UnknownAttrProfile",
	UNKNOWN_PRINCIPAL : "urn:oasis:names:tc:SAML:2.0:status:UnknownPrincipal",
	UNSUPPORTED_BINDING : "urn:oasis:names:tc:SAML:2.0:status:UnsupportedBinding"
};

        var samlEcpClientJs = samlEcpClientJs || {};

// Private functions

function getObjectValueFromCaseInsensitiveKey(object, key) {
    var lowerCaseKey = key.trim().toLowerCase();

    for(var currentKey in object) {
        if(object.hasOwnProperty(currentKey) && currentKey.trim().toLowerCase() == lowerCaseKey) {
            return object[currentKey];
        }
    }

    return null;
}

function applyConfig(target, source) {
    for(var key in source) {
        if(source.hasOwnProperty(key))
            target[key] = source[key];
    }
}

function serializeNodeChildren(node) {
    var childNodes = node.childNodes;
    var result = "";
    for(var i = 0; i < childNodes.length; i++) {
        result += serializeDocument(childNodes[i]);
    }
    return result;
}


// Serialize the document and remove the XML header in a browser safe way
function serializeDocument(xmlDoc) {

    var serializer = new XMLSerializer();
    if (typeof xmlDoc.documentElement !== 'undefined') {
        return serializer.serializeToString(xmlDoc.documentElement);
    } else {
        return serializer.serializeToString(xmlDoc);
    }
}

function createBasicAuthString(user, pass) {
    var tok = user + ':' + pass;
    return "Basic " + samlEcpClientJs.base64.encode(tok);
}

function deleteElement(xmlDoc, namespaceString, elementName) {
    var results = xmlDoc.getElementsByTagNameNS(namespaceString, elementName);
    if(results.length === 0)
        return false;
    var targetNode = results[0];
    targetNode.parentNode.removeChild(targetNode);
}

function getStatusObjFromSamlStatus(statusNode) {

    var statusObj = {};

    var children = statusNode.childNodes;
    for(var i = 0; i < children.length; i++) {
        var child = children[i];
        // We don't care about the namespace
        var nameTokens = child.nodeName.split(":");
        var childName = nameTokens.length == 1 ? nameTokens[0] : nameTokens[1];
        switch(childName) {
            case "StatusMessage":
                statusObj.statusMessage = child.textContent;
                break;
            case "StatusDetail":
                //TODO: Implement this
                break;
            case "StatusCode":
                statusObj.statusCode = [];
                statusObj.statusCode.push(child.getAttribute("Value"));
                if(child.childNodes.length > 0) {
                    for(var j = 0; j < child.childNodes.length; j++) {
                        if(child.childNodes[j] instanceof Text)
                            continue;
                        statusObj.statusCode.push(child.childNodes[j].getAttribute("Value"));
                    }
                }
                break;
        }
    }
    return statusObj;
}

function isIE() {

    var ms_ie = false;
    var ua = window.navigator.userAgent;
    var old_ie = ua.indexOf('MSIE ');
    var new_ie = ua.indexOf('Trident/');

    return ((old_ie > -1) || (new_ie > -1));
}

function xpathQuery(xmlDoc, xpath, namespaces) {

    if(isIE()) {
        var namespaceString = "";

        for(var key in namespaces) {
            namespaceString += "xmlns:" + key + "=" + namespaces[key] + " ";
        }
        xmlDoc.setProperty("SelectionNamespaces", namespaceString);

        return xmlDoc.selectNodes(xpath);
    } else {

        var namespaceResolver = function (prefix) {
            return namespaces[prefix];
        };

        var result = xmlDoc.evaluate(xpath, xmlDoc, namespaceResolver,
            XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);

        var found = [];
        var res;
        while ((res = result.iterateNext()))
            found.push(res);
        return found;
    }
}

//////// Constants ///////////

var XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

// HTTP headers
var HEADER = {

    ACCEPT : {
        KEY : "Accept",
        PAOS : "text/html; application/vnd.paos+xml"
    },
    PAOS : {
        KEY : "PAOS",
        SAML2_ECP : 'ver="urn:liberty:paos:2003-08";"urn:oasis:names:tc:SAML:2.0:profiles:SSO:ecp"'
    },
    CONTENT_TYPE : {
        KEY : "Content-Type",
        XML : "text/xml;charset=UTF-8",
        PAOS : "application/vnd.paos+xml"
    }
};

// XML namespace definitions
var NS = {
    SOAP_ENV : "http://schemas.xmlsoap.org/soap/envelope/",
    ECP : "urn:oasis:names:tc:SAML:2.0:profiles:SSO:ecp",
    PAOS : "urn:liberty:paos:2003-08",
    SAML2P : "urn:oasis:names:tc:SAML:2.0:protocol"
};


samlEcpClientJs.Client = function(config) {

	this.config = {
		samlTimeout : 0,
		resourceTimeout : 0,
		onError : null,
		onEcpError : null,
		onEcpAuth : null,
		onSuccess : null,
		onSamlTimeout : null,
		onResourceTimeout : null,
		xhrFactory : null,
		username : null,
		password : null
	};

	applyConfig(this.config, config);
	this.parser = new DOMParser();
};

samlEcpClientJs.Client.prototype = {
	/**
	 * Step 1 - Initiate the initial resource request to the SP
	 */
	get : function (url, config) {

		// Construct the call context
		var callCtx = {};
		applyConfig(callCtx, this.config);
		applyConfig(callCtx, config);
		callCtx.url = url;

		var me = this;

		// Send the PAOS request to the SP
		var xmlHttp = callCtx.xhrFactory !== null ? callCtx.xhrFactory() : new XMLHttpRequest();
		xmlHttp.open("GET", url);
		xmlHttp.setRequestHeader(HEADER.ACCEPT.KEY, HEADER.ACCEPT.PAOS);
		xmlHttp.setRequestHeader(HEADER.PAOS.KEY, HEADER.PAOS.SAML2_ECP);
		xmlHttp.withCredentials = true;

		xmlHttp.onreadystatechange = function () {
			if (xmlHttp.readyState != 4) return;
			clearTimeout(callCtx.deadlineTimer);
			onSPResourceRequestRespone.call(me, callCtx, xmlHttp);
		};

		if(callCtx.resourceTimeout !== 0) {
			callCtx.deadlineTimer =
				setTimeout(function () {
					xmlHttp.abort();
					callCtx.onResourceTimeout(xmlHttp);
				}, callCtx.resourceTimeout);
		}

		xmlHttp.send();
	},
	auth : function (PAOSRequest, url, config) {

		// Construct the call context
		var callCtx = {};
		applyConfig(callCtx, this.config);
		applyConfig(callCtx, config);
		callCtx.url = url;

		processPAOSRequest.call(this, callCtx, PAOSRequest);
	}
};

samlEcpClientJs.Client.parseResponseHeadersString = function(responseHeadersString) {

	var responseHeaderArray = responseHeadersString.split("\r\n");
	var result = {};

	for(var i = 0; i < responseHeaderArray.length; i++) {
		var tokens = /^(.+?):(.*)/.exec(responseHeaderArray[i]);
		if(tokens === null) continue;
		result[tokens[1].trim()] = tokens[2].trim();
	}

	return result;
};

samlEcpClientJs.Client.isResponseAnAuthRequest = function(responseHeaders, responseBody) {

	var contentType = getObjectValueFromCaseInsensitiveKey(responseHeaders, "content-type");

	if(contentType === null)
		return false;

	var isAuthRequest = false;
	var xmlDoc = null;
	var paosRequestNode = null;

	if(!contentType.split(";").some(function(element) {
			return element.trim().toLowerCase() == HEADER.CONTENT_TYPE.PAOS;
		})) {
		return false;
	}

	var parser = new DOMParser();

	xmlDoc = parser.parseFromString(responseBody, "text/xml");

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
	if(!samlEcpClientJs.Client.isResponseAnAuthRequest(samlEcpClientJs.Client.parseResponseHeadersString(reqXmlHttp.getAllResponseHeaders()), response)) {
		callCtx.onSuccess(response, reqXmlHttp.statusText, reqXmlHttp);
		return;
	}

	processPAOSRequest.call(this, callCtx, reqXmlHttp.responseText);
}

function processPAOSRequest(callCtx, PAOSRequest) {

	var xmlDoc = this.parser.parseFromString(PAOSRequest,"text/xml");

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
	var xmlHttp = callCtx.xhrFactory !== null ? callCtx.xhrFactory() : new XMLHttpRequest();
	xmlHttp.open("POST", callCtx.idpEndpointUrl, true);
	xmlHttp.setRequestHeader(HEADER.CONTENT_TYPE.KEY, HEADER.CONTENT_TYPE.XML);
	xmlHttp.withCredentials = true;
	if(callCtx.password !== null) {
		xmlHttp.setRequestHeader("Authorization",
			createBasicAuthString(callCtx.username, callCtx.password));
	}
	xmlHttp.onreadystatechange = function() {
		if (xmlHttp.readyState != 4) return;
		clearTimeout(callCtx.deadlineTimer);
		if(xmlHttp.status != 200) {
			if(callCtx.onError !== null) {
				callCtx.onError(xmlHttp, "Received invalid HTTP response while attempting to communicate with IdP URL '" + callCtx.idpEndpointUrl + "'");
			}
			return;
		}
		onIdPUnauthRequestRespone.call(me, callCtx, xmlHttp.responseText);
	};

	if(callCtx.samlTimeout !== 0) {
		callCtx.deadlineTimer =
			setTimeout(function () {
				xmlHttp.abort();
				callCtx.onSamlTimeout(xmlHttp);
			}, callCtx.samlTimeout);
	}

	// As per (http://docs.oasis-open.org/security/saml/Post2.0/saml-ecp/v2.0/cs01/saml-ecp-v2.0-cs01.html)
	// (section "2.3.4 ECP Routes <samlp:AuthnRequest> to Identity Provider" -> "Any header blocks received from the service provider MUST be removed."),
	// the SOAP header should NOT be forwarded to the IDP so strip it from the request
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
	if(statusObj.statusCode[0] == samlEcpClientJs.SAML2_STATUS.SUCCESS) {
		onIdPAuthRequestRespone.call(this, callCtx, response);
		return;
	} else {
		if(callCtx.onEcpError !== null) {
			callCtx.onEcpError({
				errorCode: samlEcpClientJs.ECP_ERROR.IDP_RESPONSE_ERROR,
				idpStatus: statusObj
			});
		}
	}
	// Authentication failed so we can assume we are not 'signed on'
	// Retry the same request but this time provide authentication

	// Ensure that the onEcpAuth callback exists
	if(callCtx.onEcpAuth === null) {
		if(callCtx.onEcpError === null) {
			return;
		}
		callCtx.onEcpError({
			errorCode: samlEcpClientJs.ECP_ERROR.CLIENT_CONFIG_ERROR,
			errorMsg: "Authentication is required and a onEcpAuth callback was not provided."
		});
		return;
	}

	// Invoke the onEcpAuth callback and allow the caller to set the password and
	// retry/continue the authentication process.
	callCtx.onEcpAuth({
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

	if(statusObj.statusCode[0] != samlEcpClientJs.SAML2_STATUS.SUCCESS) {
		if(callCtx.onEcpError !== null) {
			callCtx.onEcpError({
				errorCode: samlEcpClientJs.ECP_ERROR.IDP_RESPONSE_ERROR,
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
	var xmlHttp = callCtx.xhrFactory !== null ? callCtx.xhrFactory() : new XMLHttpRequest();
	xmlHttp.open("POST", assertionConsumerServiceURL, true);
	xmlHttp.setRequestHeader(HEADER.CONTENT_TYPE.KEY, HEADER.CONTENT_TYPE.PAOS);
	xmlHttp.withCredentials = true;
	xmlHttp.onreadystatechange = function() {
		if (xmlHttp.readyState != 4) return;
		clearTimeout(callCtx.deadlineTimer);
		if(xmlHttp.status != 200 && xmlHttp.status != 302) {
			if(callCtx.onError !== null) {
				callCtx.onError(xmlHttp, "Error occurred while posting back IdP response");
			}
			return;
		}
		onRelayIdpResponseToSPResponse.call(me, callCtx, xmlHttp.responseText);
	};

	if(callCtx.samlTimeout !== 0) {
		callCtx.deadlineTimer =
			setTimeout(function () {
				xmlHttp.abort();
				callCtx.onSamlTimeout(xmlHttp);
			}, callCtx.samlTimeout);
	}

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
	var xmlHttp = callCtx.xhrFactory !== null ? callCtx.xhrFactory() : new XMLHttpRequest();
	xmlHttp.open("GET", callCtx.url, true);
	xmlHttp.setRequestHeader(HEADER.ACCEPT.KEY, HEADER.ACCEPT.PAOS);
	xmlHttp.setRequestHeader(HEADER.PAOS.KEY, HEADER.PAOS.SAML2_ECP);
	xmlHttp.withCredentials = true;

	xmlHttp.onreadystatechange = function() {
		if (xmlHttp.readyState == 4) {
			clearTimeout(callCtx.deadlineTimer);
			if(callCtx.onSuccess !== null)
				callCtx.onSuccess(xmlHttp.responseText, xmlHttp.statusText, xmlHttp);
		}
	};

	if(callCtx.resourceTimeout !== 0) {
		callCtx.deadlineTimer =
			setTimeout(function () {
				xmlHttp.abort();
				callCtx.onResourceTimeout(xmlHttp);
			}, callCtx.resourceTimeout);
	}

	xmlHttp.send();

}


        return samlEcpClientJs;
    }
);


var samlEcpJs = samlEcpJs || {};

samlEcpJs.client = function() {
 
	////////////////// Private implementation ////////////////////////////
	
	var impl = {
			// Constants
			HEADER : {
				
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
			},
			NS : {
				SOAP_ENV : "http://schemas.xmlsoap.org/soap/envelope/",
				ECP : "urn:oasis:names:tc:SAML:2.0:profiles:SSO:ecp",
				PAOS : "urn:liberty:paos:2003-08"
			},
			// Variables
			idpEndpointUrl : null,
			spUrl : null,
			username : null,
			password : null,
			responseConsumerURL : null,
			
			// Serialize the document and remove the XML header in a browser safe way
			serializeDocument : function(xmlDoc) {
				
		    	var serializer = new XMLSerializer();
		    	if (typeof xmlDoc.documentElement !== 'undefined') {
		    		return serializer.serializeToString(xmlDoc.documentElement);
				} else {
					return serializer.serializeToString(xmlDoc);
				}
			},
			createBasicAuthString : function(user, pass) {
				var tok = user + ':' + pass;
				return "Basic " + samlEcpJs.base64.encode(tok);
			},
			deleteElement : function(xmlDoc, namespaceString, elementName) {
		    	var results = xmlDoc.getElementsByTagNameNS(namespaceString, elementName);
		    	if(results.length === 0)
		    		return false;
		    	var targetNode = results[0];
		    	targetNode.parentNode.removeChild(targetNode);
			},
			isIE : function() {
				
				var ms_ie = false;
				var ua = window.navigator.userAgent;
				var old_ie = ua.indexOf('MSIE ');
				var new_ie = ua.indexOf('Trident/');
				
				return ((old_ie > -1) || (new_ie > -1));
			},
			xpathQuery : function(xmlDoc, xpath, namespaces) {
				
		    	if(this.isIE()) {
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
			},
			/**
			 * Step 1 - Initiate the initial resource request to the SP 
			 */
			get : function(idpEndpointUrl, spUrl, username, password) {

				this.idpEndpointUrl = idpEndpointUrl;
				this.spUrl = spUrl;
				this.username = username;
				this.password = password;
				
				var me = this;
				
		    	// Send the PAOS request to the SP
		    	var xmlHttp = new XMLHttpRequest();
		    	xmlHttp.open("GET", spUrl, true);
		    	xmlHttp.setRequestHeader(this.HEADER.ACCEPT.KEY, this.HEADER.ACCEPT.PAOS);
		    	xmlHttp.setRequestHeader(this.HEADER.PAOS.KEY, this.HEADER.PAOS.SAML2_ECP);
		    	xmlHttp.withCredentials = true;
		    	
		    	xmlHttp.onreadystatechange = function() {
		    		if (xmlHttp.readyState == 4) {
		    			if(xmlHttp.status == 200) 
		    				me.onSPResourceRequestRespone(xmlHttp.responseText);
		    	    }
		    	};
		    	xmlHttp.send();
		    },	
			/**
			 * Step 2 - Forward the SP response to the IdP
			 *  
			 * Process the response from the SP after the initial request for a resource
			 * has been made and then forward this response to the IdP while performing
			 * basic auth.
			 */
			onSPResourceRequestRespone : function(response) {
				
		    	// Extract the SOAP message from the SOAP envelope 
		    	// (we do not send the SOAP envelope to the IdP
		    	parser = new DOMParser();
		    	var xmlDoc = parser.parseFromString(response,"text/xml");
		    	
		    	var paosRequestNode = this.xpathQuery(	xmlDoc, 
			    										"//SOAP_ENV:Envelope/SOAP_ENV:Header/PAOS:Request", 
			    										this.NS);
		    	
		    	this.responseConsumerURL = paosRequestNode[0].getAttribute("responseConsumerURL");
		    	
		    	var xmlHttp = new XMLHttpRequest();
				var me = this;
		    	
				var authString = this.createBasicAuthString(this.username, this.password);
				
		    	// Post the data to the IdP
		    	xmlHttp.open("POST", this.idpEndpointUrl, true);
		    	xmlHttp.setRequestHeader(this.HEADER.CONTENT_TYPE.KEY, this.HEADER.CONTENT_TYPE.XML);
		    	xmlHttp.setRequestHeader("Authorization", authString);
		    	xmlHttp.withCredentials = true;
		    	xmlHttp.onreadystatechange = function() {
		    		if (xmlHttp.readyState == 4) {
		    			if(xmlHttp.status == 200) 
		    				me.onIdPAuthRequestRespone(xmlHttp.responseText);
		    	    }
		    	};
		    	xmlHttp.send(response);
			},
			/**
			 * Step 3 - Return the IdP's response back to the SP
			 * 
			 * Process the response from the IdP and then post this response back to the SP. 
			 */
			onIdPAuthRequestRespone : function(response) {
		    	
		    	var xmlDoc = parser.parseFromString(response,"text/xml");
		    	
		    	var ecpResponseNode = this.xpathQuery(	xmlDoc, 
														"//SOAP_ENV:Envelope/SOAP_ENV:Header/ECP:Response", 
														this.NS);

		    	var assertionConsumerServiceURL = ecpResponseNode[0].getAttribute("AssertionConsumerServiceURL");
		    	
		    	//TODO: Compare responseConsumerURL to assertionConsumerServiceURL and send SOAP fault if <>
		    	
		    	var serializer = new XMLSerializer();
		    	var msgBody = serializer.serializeToString(xmlDoc);
		    	
				var me = this;
		    	
		    	// Post the data back to the SP
		    	var xmlHttp = new XMLHttpRequest();
		    	xmlHttp.open("POST", assertionConsumerServiceURL, true);
		    	xmlHttp.setRequestHeader(this.HEADER.CONTENT_TYPE.KEY, this.HEADER.CONTENT_TYPE.PAOS);
		    	xmlHttp.withCredentials = true;
		    	xmlHttp.onreadystatechange = function() {
		    		if (xmlHttp.readyState == 4) {
		    			if(xmlHttp.status == 200) 
		    				me.onRelayIdpResponseToSPResponse(xmlHttp.responseText);
		    	    }
		    	};
		    	xmlHttp.send(response);
			},
			/**
			 * Step 4 (final step) - Process the authenticated (hopefully) resource data 
			 * 
			 * If all goes well this will be the actual resource data from the SP that was initially
			 * requested.
			 */ 
			onRelayIdpResponseToSPResponse : function (response) {
		    	
		    	console.debug(response);
			}
	};
	
	
	
	
	////////////////// Public ////////////////////////////
	
    this.get = function() {
    	impl.get.apply(impl, arguments);
    };
}; 

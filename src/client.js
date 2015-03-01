

var samlEcpJs = samlEcpJs || {};

samlEcpJs.client = function(config) {

	////////////////// Private implementation ////////////////////////////
	
	var impl = {
			//////// Constants ///////////
			
			// HTTP headers
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
			// XML namespace definitions
			NS : {
				SOAP_ENV : "http://schemas.xmlsoap.org/soap/envelope/",
				ECP : "urn:oasis:names:tc:SAML:2.0:profiles:SSO:ecp",
				PAOS : "urn:liberty:paos:2003-08",
				SAML2P : "urn:oasis:names:tc:SAML:2.0:protocol"
			},
			
			//////////////// Variables //////////////
			config : config,
			
			////////////// Methods ////////////////////////
			// Serialize the document and remove the XML header in a browser safe way
			serializeDocument : function(xmlDoc) {
				
		    	var serializer = new XMLSerializer();
		    	if (typeof xmlDoc.documentElement !== 'undefined') {
		    		return serializer.serializeToString(xmlDoc.documentElement);
				} else {
					return serializer.serializeToString(xmlDoc);
				}
			},
			applyConfig : function(target, source) {
				for(var key in source) {
					if(source.hasOwnProperty(key))
						target[key] = source[key];
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
			getStatusObjFromSamlStatus : function(statusNode) {
				
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
									statusObj.statusCode.push(child.childNodes[j].getAttribute("Value"));
								}
							}
							break;
					}
				}
				return statusObj;
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
			get : function(url, config) {

				// Construct the call context
				var callCtx = {};
				this.applyConfig(callCtx, this.config);
				this.applyConfig(callCtx, config);
				callCtx.url = url;
				
				var me = this;
				
		    	// Send the PAOS request to the SP
		    	var xmlHttp = new XMLHttpRequest();
		    	xmlHttp.open("GET", url, true);
		    	xmlHttp.setRequestHeader(this.HEADER.ACCEPT.KEY, this.HEADER.ACCEPT.PAOS);
		    	xmlHttp.setRequestHeader(this.HEADER.PAOS.KEY, this.HEADER.PAOS.SAML2_ECP);
		    	xmlHttp.withCredentials = true;
		    	
		    	xmlHttp.onreadystatechange = function() {
		    		if (xmlHttp.readyState == 4) {
		    			if(xmlHttp.status == 200) 
		    				me.onSPResourceRequestRespone(callCtx, xmlHttp);
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
			onSPResourceRequestRespone : function(callCtx, reqXmlHttp) {
				
				var response = reqXmlHttp.responseText;
				
		    	// Extract the SOAP message from the SOAP envelope 
		    	// (we do not send the SOAP envelope to the IdP
		    	parser = new DOMParser();
		    	var xmlDoc = parser.parseFromString(response,"text/xml");

		    	// If we are not authenticated then we should be greeted with a SOAP message
		    	// that we should forward to the IdP, otherwise we simply retrieve the actual resource
		    	
		    	
		    	
		    	var paosRequestNode = this.xpathQuery(	xmlDoc, 
			    										"//SOAP_ENV:Envelope/SOAP_ENV:Header/PAOS:Request", 
			    										this.NS);
		    	
		    	
		    	// The most reliable method of determining if this is a PAOS request or not to simply
		    	// check if the PAOS:Request xpath expression was able to evaluate properly.
		    	// We cannot rely on content-type headers or other such things as the actual resource
		    	// may in fact be an XML document.
		    	
		    	if(paosRequestNode.length === 0) {
		    		callCtx.success(response, reqXmlHttp.statusText, reqXmlHttp);
		    		return;
		    	}

		    	callCtx.responseConsumerURL = paosRequestNode[0].getAttribute("responseConsumerURL");
		    		
		    	var xmlHttp = new XMLHttpRequest();
				var me = this;
		    	
				var authString = this.createBasicAuthString(callCtx.username, callCtx.password);
				
		    	// Post the data to the IdP
		    	xmlHttp.open("POST", callCtx.idpEndpointUrl, true);
		    	xmlHttp.setRequestHeader(this.HEADER.CONTENT_TYPE.KEY, this.HEADER.CONTENT_TYPE.XML);
		    	if(callCtx.doAuth)
		    		xmlHttp.setRequestHeader("Authorization", authString);
		    	xmlHttp.withCredentials = true;
		    	xmlHttp.onreadystatechange = function() {
		    		if (xmlHttp.readyState == 4) {
		    			if(xmlHttp.status == 200) 
		    				me.onIdPAuthRequestRespone(callCtx, xmlHttp.responseText);
		    	    }
		    	};
		    	xmlHttp.send(response);
			},
			/**
			 * Step 3 - Return the IdP's response back to the SP
			 * 
			 * Process the response from the IdP and then post this response back to the SP. 
			 */
			onIdPAuthRequestRespone : function(callCtx, response) {
		    	
		    	var xmlDoc = parser.parseFromString(response,"text/xml");

		    	// Check the SAML status set by the IdP to check for authentication failure
		    	var samlStatusNode = 
		    		this.xpathQuery(	xmlDoc, 
		    							"//SOAP_ENV:Envelope/SOAP_ENV:Body/SAML2P:Response/SAML2P:Status", 
		    							this.NS);
		    	
		    	var statusObj = this.getStatusObjFromSamlStatus(samlStatusNode[0]);
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
		    		this.xpathQuery(	xmlDoc, 
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
		    			if(xmlHttp.status == 200 || xmlHttp.status == 302) {
		    				me.onRelayIdpResponseToSPResponse(callCtx, xmlHttp.responseText);
		    			} else {
		    				if(callCtx.error !== undefined)
		    					callCtx.error(xmlHttp, "Error occurred while posting back IdP response");
		    			}
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
			onRelayIdpResponseToSPResponse : function (callCtx, response) {
		    	
				
				// Authentication succeeded, so now retrieve the original request
		    	var xmlHttp = new XMLHttpRequest();
		    	xmlHttp.open("GET", callCtx.url, true);
		    	xmlHttp.setRequestHeader(this.HEADER.ACCEPT.KEY, this.HEADER.ACCEPT.PAOS);
		    	xmlHttp.setRequestHeader(this.HEADER.PAOS.KEY, this.HEADER.PAOS.SAML2_ECP);
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
	};
	
	////////////////// Apply class config ////////////////
	
	impl.applyConfig(impl.config, config);
	
	////////////////// Public ////////////////////////////
	
    this.get = function() {
    	impl.get.apply(impl, arguments);
    };
    
    this.setConfig = function(config) {
    	this.impl.config = config;
    };

    this.getConfig = function() {
    	return this.impl.config;
    };
    
}; 

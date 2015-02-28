

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
			relayState : null,
			
			// Methods
			serializeNodeChildren : function(node) {
				
		    	var serializer = new XMLSerializer();
		    	var targetChildren = node.children; 
		    	var targetBody = "";
		    	for(var i = 0; i < targetChildren.length; i++) {
		    		targetBody += serializer.serializeToString(targetChildren[i]);
		    	}
		    	return targetBody;
			},
			// Extract a node and its children from an XML document and return as text
			serializeElementChildren : function(xmlDoc, namespaceString, elementName) {
				
		    	var targetNode = xmlDoc.getElementsByTagNameNS(namespaceString, elementName);
		    	if(targetNode.length === 0)
		    		return null;
		    	
		    	return this.serializeNodeChildren(targetNode[0]);
			},
			// Serialize the document and remove the XML header in a browser safe way
			serializeDocument : function(xmlDoc) {
				
		    	var serializer = new XMLSerializer();
		    	if (typeof xmlDoc.documentElement !== 'undefined') {
		    		return serializer.serializeToString(xmlDoc.documentElement);
				} else {
					return serializer.serializeToString(xmlDoc);
				}
			},
			// Serialize the document
			rawSerializeDocument : function(xmlDoc) {
				
		    	var serializer = new XMLSerializer();
				return serializer.serializeToString(xmlDoc);
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
			extractXMLXPathText : function(xmlDoc, xpath) {
				
				var targetNode = this.xpathQuery(xmlDoc, xpath);
				if(targetNode.length === 0)
					return null;
				
				return this.serializeNodeChildren(targetNode[0]);
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
		    	
		    	// Retrieve the optional 'RelayState'
		    	//var relayState = serializeElementChildren(xmlDoc, NS.ECP, "RelayState");
		    	var relayStateElements = xmlDoc.getElementsByTagNameNS(this.NS.ECP, "RelayState");
		    	
		    	this.relayState = relayStateElements.length > 0 ? relayStateElements[0] : null; 
		    	
		    	//console.debug("RelayState: ", relayState);
		    	
		    	var paosRequestNode = this.xpathQuery(	xmlDoc, 
			    										"//SOAP_ENV:Envelope/SOAP_ENV:Header/PAOS:Request", 
			    										this.NS);
		    	
		    	var responseConsumerURL = paosRequestNode[0].getAttribute("responseConsumerURL");
		    	
		    	//console.debug("responseConsumerURL: ", responseConsumerURL);
		    	
		    	//var msgBody = serializeElementChildren(xmlDoc, NS.SOAP_ENV, "Envelope");
		    	this.deleteElement(xmlDoc, this.NS.SOAP_ENV, "Header");
		    	
		    	var msgBody = this.serializeDocument(xmlDoc);
		    	
		    	
		    	//console.debug(msgBody);
		    	
		    	
		    	
		    	//console.debug("msgBody: ", msgBody);
		    	var xmlHttp = new XMLHttpRequest();
				var me = this;
		    	
				var authString = this.createBasicAuthString(this.username, this.password);
				
				console.debug("authString", authString);
				
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
		    	//xmlHttp.send(msgBody);
		    	xmlHttp.send(response);
		    	
		    	
			},
			/**
			 * Step 3 - Return the IdP's response back to the SP
			 * 
			 * Process the response from the IdP and then post this response back to the SP. 
			 */
			onIdPAuthRequestRespone : function(response) {
		    	
		    	//console.debug(response);
		    	
		    	var xmlDoc = parser.parseFromString(response,"text/xml");
		    	
		    	//console.debug("Orig response", response);
		    	//console.debug("Parsed response", this.rawSerializeDocument(xmlDoc));
		    	
		    	var ecpResponseNode = this.xpathQuery(	xmlDoc, 
														"//SOAP_ENV:Envelope/SOAP_ENV:Header/ECP:Response", 
														this.NS);

		    	var assertionConsumerServiceURL = ecpResponseNode[0].getAttribute("AssertionConsumerServiceURL");
		    	
		    	//TODO: Compare responseConsumerURL to assertionConsumerServiceURL and send SOAP fault if <>
		    	
		    	console.debug("relayState", this.relayState);
		    	
		    	//this.deleteElement(xmlDoc, this.NS.SOAP_ENV, "Header");
		    	
		    	var headerElements = xmlDoc.getElementsByTagNameNS(this.NS.SOAP_ENV, "Header");
		    	var headerElement = headerElements[0];
		    	var headerChildren = headerElement.childNodes;
		    	console.debug("Children:", headerChildren);
		    	var childCount = headerChildren.length;
		    	for(var i = 0; i < childCount; i++) {
		    		headerElement.removeChild(headerChildren[0]);
		    	}
		    	
		    		
		    	
		    	if(this.relayState !== null)
		    		headerElement.appendChild(this.relayState);
		    	
		    	//var msgBody = this.serializeDocument(xmlDoc);
		    	var serializer = new XMLSerializer();
		    	var msgBody = serializer.serializeToString(xmlDoc);
		    	
		    	//console.debug("Final:", msgBody);
		    	
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
		    	//xmlHttp.send(msgBody);
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

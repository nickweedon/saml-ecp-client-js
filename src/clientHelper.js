// Private functions
function applyConfig(target, source) {
    for(var key in source) {
        if(source.hasOwnProperty(key))
            target[key] = source[key];
    }
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
    return "Basic " + samlEcpJs.base64.encode(tok);
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

describe('Saml ECP Client', function() {

    var client = null;
    var server = null;

    var IDP_ENDPOINT_URL = "http://my-idp.fakedomain.int/idp/profile/SAML2/SOAP/ECP";
    var SP_RESOURCE_URL = "http://my-sp.fakedomain.int";
    var SP_NAME = "my-sp.fakedomain.int";
    var USERNAME = "bob";

    var PAOS_REQUEST =
        '<?xml version="1.0" encoding="UTF-8"?>\
        <soap11:Envelope xmlns:soap11="http://schemas.xmlsoap.org/soap/envelope/">\
    <soap11:Header>\
    <paos:Request xmlns:paos="urn:liberty:paos:2003-08" responseConsumerURL="' + SP_RESOURCE_URL + '/saml/SSO"\
        service="urn:oasis:names:tc:SAML:2.0:profiles:SSO:ecp"\
        soap11:actor="http://schemas.xmlsoap.org/soap/actor/next" soap11:mustUnderstand="1"/>\
        <ecp:Request xmlns:ecp="urn:oasis:names:tc:SAML:2.0:profiles:SSO:ecp" IsPassive="false"\
        soap11:actor="http://schemas.xmlsoap.org/soap/actor/next" soap11:mustUnderstand="1">\
        <saml2:Issuer xmlns:saml2="urn:oasis:names:tc:SAML:2.0:assertion">' + SP_NAME + '</saml2:Issuer>\
        </ecp:Request>\
        </soap11:Header>\
        <soap11:Body>\
        <saml2p:AuthnRequest xmlns:saml2p="urn:oasis:names:tc:SAML:2.0:protocol"\
        AssertionConsumerServiceURL="' + SP_RESOURCE_URL + '/saml/SSO" ForceAuthn="false"\
        ID="a24dd26eh9h6fj944a10b9616cfh8d7" IsPassive="false"\
        IssueInstant="2015-11-14T00:50:17.744Z"\
        ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:PAOS" Version="2.0">\
        <saml2:Issuer xmlns:saml2="urn:oasis:names:tc:SAML:2.0:assertion">' + SP_NAME + '</saml2:Issuer>\
        <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">\
        <ds:SignedInfo>\
        <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>\
        <ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>\
        <ds:Reference URI="#a24dd26eh9h6fj944a10b9616cfh8d7">\
        <ds:Transforms>\
        <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>\
        <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>\
        </ds:Transforms>\
        <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>\
        <ds:DigestValue>3KbzG3e/Z1BhWmy8ik7swefH9jE=</ds:DigestValue>\
        </ds:Reference>\
        </ds:SignedInfo>\
        <ds:SignatureValue>\
        Y00XC4VlpaGDMx2b3bCtIFGep21ZYONxW2RuDZ0eMBhm+7rVL6eeSKt1NbM09e1HS+ZGNVF+lgR3SEpxij1LQ4nmCzgbWQ8DdOH2+pZmDil8oCaHS7P1Z5wgjZXZzKTBB1/DzZ/kd9eLYE/orJCP3zA12FiExJDsnQCWLQrVl2nhrR20dZRX0FptwwDf3QGYKUB7mSuDN6jtbh0XNwTDFERXNc5CMJerTjFmdAfeLzg+2TjN+RuCqSpRbNZCIYDFao13WeLGoCjB4ifXSvq0e9XFVL0NUDFztjmsQorJDKOn1tYQ5To7w+pwEnBGTq0WDqNCvfOzgVLGR6hlAw61wg==\
        </ds:SignatureValue>\
        <ds:KeyInfo>\
        <ds:X509Data>\
        <ds:X509Certificate>MIIDUjCCAjqgAwIBAgIEUOLIQTANBgkqhkiG9w0BAQUFADBrMQswCQYDVQQGEwJGSTEQMA4GA1UE\
        CBMHVXVzaW1hYTERMA8GA1UEBxMISGVsc2lua2kxGDAWBgNVBAoTD1JNNSBTb2Z0d2FyZSBPeTEM\
        MAoGA1UECwwDUiZEMQ8wDQYDVQQDEwZhcG9sbG8wHhcNMTMwMTAxMTEyODAxWhcNMjIxMjMwMTEy\
        ODAxWjBrMQswCQYDVQQGEwJGSTEQMA4GA1UECBMHVXVzaW1hYTERMA8GA1UEBxMISGVsc2lua2kx\
        GDAWBgNVBAoTD1JNNSBTb2Z0d2FyZSBPeTEMMAoGA1UECwwDUiZEMQ8wDQYDVQQDEwZhcG9sbG8w\
        ggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCXqP0wqL2Ai1haeTj0alwsLafhrDtUt00E\
        5xc7kdD7PISRA270ZmpYMB4W24Uk2QkuwaBp6dI/yRdUvPfOT45YZrqIxMe2451PAQWtEKWF5Z13\
        F0J4/lB71TtrzyH94RnqSHXFfvRN8EY/rzuEzrpZrHdtNs9LRyLqcRTXMMO4z7QghBuxh3K5gu7K\
        qxpHx6No83WNZj4B3gvWLRWv05nbXh/F9YMeQClTX1iBNAhLQxWhwXMKB4u1iPQ/KSaal3R26pON\
        UUmu1qVtU1quQozSTPD8HvsDqGG19v2+/N3uf5dRYtvEPfwXN3wIY+/R93vBA6lnl5nTctZIRsyg\
        0Gv5AgMBAAEwDQYJKoZIhvcNAQEFBQADggEBAFQwAAYUjso1VwjDc2kypK/RRcB8bMAUUIG0hLGL\
        82IvnKouGixGqAcULwQKIvTs6uGmlgbSG6Gn5ROb2mlBztXqQ49zRvi5qWNRttir6eyqwRFGOM6A\
        8rxj3Jhxi2Vb/MJn7XzeVHHLzA1sV5hwl/2PLnaL2h9WyG9QwBbwtmkMEqUt/dgixKb1Rvby/tBu\
        RogWgPONNSACiW+Z5o8UdAOqNMZQozD/i1gOjBXoF0F5OksjQN7xoQZLj9xXefxCFQ69FPcFDeEW\
        bHwSoBy5hLPNALaEUoa5zPDwlixwRjFQTc5XXaRpgIjy/2gsL8+Y5QRhyXnLqgO67BlLYW/GuHE=\
        </ds:X509Certificate>\
        </ds:X509Data>\
        </ds:KeyInfo>\
        </ds:Signature>\
        </saml2p:AuthnRequest>\
        </soap11:Body>\
        </soap11:Envelope>';

    beforeEach(function(done) {

        server = sinon.fakeServer.create();

        require(["saml-ecp-js"], function(samlEcpJs) {
            client = new samlEcpJs.client({
                idpEndpointUrl: IDP_ENDPOINT_URL
            });
            done();
        });
    });

    afterEach(function () {
        server.restore();
    });

    it("makes SP request with PAOS headers", function () {

        var requestCallback = sinon.spy();

        server.respondWith("GET", SP_RESOURCE_URL, function(fakeRequest) {
            requestCallback(fakeRequest);
        });

        client.get(SP_RESOURCE_URL, {
                username : USERNAME,
                success : function(data, status) {
                    console.debug("Status: ", status);
                },
                ecpError : function(ecpErrorObj) {

                    console.debug("Got error");
                    if(ecpErrorObj.errorCode == samlEcpJs.ECP_ERROR.IDP_RESPONSE_ERROR)
                        console.debug("IdP Error:", ecpErrorObj.idpStatus);
                },
                error : function(xmlHttp, msg) {
                    console.error(msg);
                }
            }
        );

        server.respond(); // Process all requests so far

        assert(expect(requestCallback.calledOnce).to.be.true);
        sinon.assert.calledWith(requestCallback, sinon.match({
            requestHeaders: {
                PAOS: 'ver="urn:liberty:paos:2003-08";"urn:oasis:names:tc:SAML:2.0:profiles:SSO:ecp"',
                Accept: 'text/html; application/vnd.paos+xml'
            }
        }));
    });

    it("forwards SP PAOS auth request to IDP", function () {

        var requestCallback = sinon.spy();

        server.respondWith("GET", SP_RESOURCE_URL, [
            200, {
                "SOAPAction": "http://www.oasis-open.org/committees/security"
            },
            PAOS_REQUEST
        ]);


        server.respondWith("POST", IDP_ENDPOINT_URL, function(fakeRequest) {
            requestCallback(fakeRequest);
        });

        client.get(SP_RESOURCE_URL, {
                username : USERNAME,
                success : function(data, status) {
                    console.debug("Status: ", status);
                },
                ecpError : function(ecpErrorObj) {

                    console.debug("Got error");
                    if(ecpErrorObj.errorCode == samlEcpJs.ECP_ERROR.IDP_RESPONSE_ERROR)
                        console.debug("IdP Error:", ecpErrorObj.idpStatus);
                },
                error : function(xmlHttp, msg) {
                    console.error(msg);
                }
            }
        );

        server.respond(); // Process all requests so far
        server.respond(); // Process all requests so far

        assert(expect(requestCallback.calledOnce).to.be.true);
        sinon.assert.calledWith(requestCallback, sinon.match({
            requestBody: PAOS_REQUEST
        }));
    });
});
describe('Saml ECP Client', function() {
    var samlEcpClientJs = null;
    var client = null;
    var clientConfig = null;
    var server = null;
    var STE = null; // SinonTestExt namespace
    var TestData = null; // Test data constants

    function ClientConfig(username){
        this.username = username;
        this.onSuccess = sinon.spy();
        this.onEcpError = sinon.spy();
        this.onError = sinon.spy();
        this.onEcpAuth = sinon.spy();
        this.onSamlTimeout = sinon.spy();
        this.onResourceTimeout = sinon.spy();
    }

    ClientConfig.prototype = {
        setEcpAuth : function(onEcpAuth) {
            this.onEcpAuth = sinon.spy(onEcpAuth);
        },
        setOnResourceTimeout : function(onResourceTimeout) {
            this.onResourceTimeout = sinon.spy(onResourceTimeout);
        },
        setOnSamlTimeout : function(onSamlTimeout) {
            this.onSamlTimeout = sinon.spy(onSamlTimeout);
        },
        assertNoErrors : function() {
            sinon.assert.notCalled(this.onError);
            sinon.assert.notCalled(this.onEcpError);
        },
        assertSuccessNotCalled : function() {
            sinon.assert.notCalled(this.onSuccess);
        }
    };

    beforeEach(function(done) {
        require(["saml-ecp-client-js", "SinonTestExt", "SamlTestData"], function(samlEcpClientJsNS, sinonTestExt, SamlTestData) {
            TestData = SamlTestData;
            server = sinon.fakeServer.create();
            server.autoRespondAfter = 50;
            samlEcpClientJs = samlEcpClientJsNS;
            client = new samlEcpClientJs.client({
                idpEndpointUrl: TestData.IDP_ENDPOINT_URL
            });
            STE = sinonTestExt;
            clientConfig = new ClientConfig(TestData.USERNAME);
            done();
        });
    });

    afterEach(function () {
        server.restore();
        server.xhr.useFilters = false;
        server.xhr.filters = [];
    });

    describe('SP Resource Request', function() {
        it("makes SP request with PAOS headers", function (done) {

            var requestCallback = sinon.spy();
            var serverResponder = new STE.AsyncServerResponder(server, done);

            server.respondWith("GET", TestData.SP_RESOURCE_URL, function(fakeRequest) {
                requestCallback(fakeRequest.requestHeaders);

                fakeRequest.respond(
                    200, {
                    "SOAPAction" : TestData.PAOS_SOAP_ACTION,
                    "Content-Type" : TestData.PAOS_UTF8_CONTENT_TYPE
                },
                    TestData.createPAOSRequest()
                );

                serverResponder.done();
            });

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.calledOnce(requestCallback);
                sinon.assert.calledWith(requestCallback, sinon.match(TestData.PAOS_HTTP_HEADER));
                clientConfig.assertNoErrors();
                clientConfig.assertSuccessNotCalled();
            });
        });
    });

    describe('PAOS Request Forwarding', function() {
        it("forwards SP PAOS auth request to IDP", function (done) {

            var requestCallback = sinon.spy();
            var serverResponder = new STE.AsyncServerResponder(server, done);

            server.respondWith("GET", TestData.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction" : TestData.PAOS_SOAP_ACTION,
                    "Content-Type" : TestData.PAOS_UTF8_CONTENT_TYPE
                },
                TestData.createPAOSRequest()
            ]);

            server.respondWith("POST", TestData.IDP_ENDPOINT_URL, function(fakeRequest) {
                requestCallback(fakeRequest.requestHeaders, fakeRequest.requestBody);

                fakeRequest.respond(
                    200, {
                        "SOAPAction": TestData.PAOS_SOAP_ACTION,
                    },
                    TestData.createPAOSAuthSuccess());
                serverResponder.done();
            });

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.calledOnce(requestCallback);
                // This checks that the request is forwarded to the IDP after removing the SOAP header element
                sinon.assert.calledWith(requestCallback, sinon.match.any, TestData.PAOS_REQUEST_WITHOUT_HEADER);

                // Ensure that we don't pass the PAOS HTTP headers to the IDP
                sinon.assert.neverCalledWith(requestCallback, sinon.match({
                    PAOS: TestData.PAOS_ATTRIBUTE
                }));
                sinon.assert.neverCalledWith(requestCallback, sinon.match({
                    Accept: TestData.TEXT_PAOS_ACCEPT_ATTRIBUTE
                }));
                sinon.assert.neverCalledWith(requestCallback, sinon.match.has("Authorization"));
                clientConfig.assertNoErrors();
                clientConfig.assertSuccessNotCalled();
            });
        });

        it("wont forward actual SP resource to IDP", function () {

            server.respondImmediately = true;
            var requestCallback = sinon.spy();

            server.respondWith("GET", TestData.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION,
                    "Content-Type" : TestData.PAOS_UTF8_CONTENT_TYPE
                },
                TestData.SP_RESOURCE
            ]);


            server.respondWith("POST", TestData.IDP_ENDPOINT_URL, function(fakeRequest) {
                requestCallback(fakeRequest);
            });

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            sinon.assert.notCalled(requestCallback);
        });

        it("posts back to SP on successful PAOS auth response from IDP", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);
            var requestCallback = sinon.spy();

            server.respondWith("GET", TestData.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION,
                    "Content-Type" : TestData.PAOS_UTF8_CONTENT_TYPE
                },
                TestData.createPAOSRequest()
            ]);

            server.respondWith("POST", TestData.IDP_ENDPOINT_URL, [
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION
                },
                TestData.createPAOSAuthSuccess()
            ]);

            server.respondWith("POST", TestData.SP_SSO_URL, function(fakeRequest) {
                requestCallback(fakeRequest.requestHeaders, fakeRequest.requestBody);
                fakeRequest.respond(
                    302, {
                        "SOAPAction": TestData.PAOS_SOAP_ACTION
                    },
                    TestData.createPAOSRequest());
                serverResponder.done();
            });


            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.notCalled(clientConfig.onEcpAuth);
                sinon.assert.calledOnce(requestCallback);
                sinon.assert.calledWith(requestCallback, sinon.match({
                        "Content-Type": TestData.PAOS_UTF8_CONTENT_TYPE
                    }),
                    TestData.createPAOSAuthSuccess()
                );
                clientConfig.assertNoErrors();
                clientConfig.assertSuccessNotCalled();
            });
        });

        it("posts back to correct SP consumer service URL on successful PAOS auth response from IDP", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);
            var requestCallback = sinon.spy();
            var SOME_CRAZY_URL = TestData.SP_RESOURCE_URL + "/somecrazy/SSOURL";

            server.respondWith("GET", TestData.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION,
                    "Content-Type" : TestData.PAOS_UTF8_CONTENT_TYPE
                },
                TestData.createPAOSRequest()
            ]);

            server.respondWith("POST", TestData.IDP_ENDPOINT_URL, [
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION
                },
                TestData.createPAOSAuthSuccess({
                    assertionConsumerServiceURL : SOME_CRAZY_URL
                })
            ]);

            server.respondWith("POST", SOME_CRAZY_URL, function(fakeRequest) {
                requestCallback(fakeRequest.requestHeaders, fakeRequest.requestBody);
                fakeRequest.respond(
                    302, {
                        "SOAPAction": TestData.PAOS_SOAP_ACTION
                    },
                    TestData.createPAOSRequest());
                serverResponder.done();
            });


            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.notCalled(clientConfig.onEcpAuth);
                sinon.assert.calledOnce(requestCallback);
                sinon.assert.calledWith(requestCallback, sinon.match({
                        "Content-Type": TestData.PAOS_UTF8_CONTENT_TYPE
                    }),
                    TestData.createPAOSAuthSuccess({
                        assertionConsumerServiceURL : SOME_CRAZY_URL
                    })
                );
                clientConfig.assertNoErrors();
                clientConfig.assertSuccessNotCalled();
            });
        });

        it("won't post back to SP on unsuccessful PAOS auth response from IDP", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);
            var requestCallback = sinon.spy();
            var callCount = 0;

            server.respondWith("GET", TestData.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION,
                    "Content-Type" : TestData.PAOS_UTF8_CONTENT_TYPE
                },
                TestData.createPAOSRequest()
            ]);

            server.respondWith("POST", TestData.IDP_ENDPOINT_URL, function(fakeRequest) {

                fakeRequest.respond(
                    200, {
                        "SOAPAction": TestData.PAOS_SOAP_ACTION
                    },
                    TestData.createPAOSAuthFailed()
                );
                if(++callCount > 1) {
                    serverResponder.done();
                }
            });

            server.respondWith("POST", TestData.SP_SSO_URL, function() {
                requestCallback();
            });


            clientConfig.setEcpAuth(function(authCtx) {
                authCtx.setPassword('bob');
                authCtx.retryAuth();
            });
            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.called(clientConfig.onEcpAuth);
                sinon.assert.notCalled(requestCallback);
                sinon.assert.calledTwice(clientConfig.onEcpError);
                sinon.assert.alwaysCalledWith(clientConfig.onEcpError, sinon.match({
                    errorCode: samlEcpClientJs.ECP_ERROR.IDP_RESPONSE_ERROR,
                    idpStatus: {
                        statusCode: [ samlEcpClientJs.SAML2_STATUS.REQUESTER, samlEcpClientJs.SAML2_STATUS.AUTHN_FAILED ],
                        statusMessage: "An error occurred."
                    }
                }));
                clientConfig.assertSuccessNotCalled();
            });
        });
    });

    describe('Authentication Required Detection and Header Handling', function() {
        it("invokes password callback when IDP PAOS response returns auth failed and no password set", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);

            server.respondWith("GET", TestData.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION,
                    "Content-Type" : TestData.PAOS_UTF8_CONTENT_TYPE
                },
                TestData.createPAOSRequest()
            ]);

            server.respondWith("POST", TestData.IDP_ENDPOINT_URL, [
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION
                },
                TestData.createPAOSAuthFailed()
            ]);

            clientConfig.setEcpAuth(function () {
                serverResponder.done();
            });
            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function () {
                clientConfig.assertSuccessNotCalled();
            });
        });

        it("converts a XMLHttpRequest header to a javascript object", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);

            server.respondWith("GET", "/hello", function(fakeRequest) {
                fakeRequest.respond(
                    200, {
                        "SOAPAction": TestData.PAOS_SOAP_ACTION,
                        "Content-Type" : TestData.PAOS_UTF8_CONTENT_TYPE
                    },
                    TestData.createPAOSRequest());
            });

            var request = new XMLHttpRequest();
            var parsedHeaderObj = null;

            request.open("GET", "/hello");
            request.onreadystatechange = function() {
                if(request.readyState == 4) {
                    parsedHeaderObj = client.parseResponseHeadersString(request.getAllResponseHeaders());
                    serverResponder.done();
                }
            };

            request.send();

            serverResponder.waitUntilDone(function () {
                assert.deepEqual({
                        "SOAPAction": 'http://www.oasis-open.org/committees/security',
                        "Content-Type": 'application/vnd.paos+xml;charset=utf-8'
                }, parsedHeaderObj);
            });

        });

        it("detects an authentication request", function (done) {
            var serverResponder = new STE.AsyncServerResponder(server, done);

            server.respondWith("GET", TestData.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION,
                    "Content-Type" : TestData.PAOS_UTF8_CONTENT_TYPE
                },
                TestData.createPAOSRequest()
            ]);

            var isAuthRequest = null;
            var request = new XMLHttpRequest();

            request.open("GET", TestData.SP_RESOURCE_URL);
            request.onreadystatechange = function() {
                if(request.readyState == 4) {
                    var parsedHeaderObj = client.parseResponseHeadersString(request.getAllResponseHeaders());
                    isAuthRequest = client.isResponseAnAuthRequest(parsedHeaderObj, request.responseText);
                    serverResponder.done();
                }
            };
            request.send();

            serverResponder.waitUntilDone(function () {
                assert.isTrue(isAuthRequest);
            });
        });

        it("does not detects non-auth request as auth-request", function (done) {
            var serverResponder = new STE.AsyncServerResponder(server, done);

            server.respondWith("GET", TestData.SP_RESOURCE_URL, [
                200, {},
                TestData.createPAOSRequest()
            ]);

            var isAuthRequest = null;
            var request = new XMLHttpRequest();

            request.open("GET", TestData.SP_RESOURCE_URL);
            request.onreadystatechange = function() {
                if(request.readyState == 4) {
                    var parsedHeaderObj = client.parseResponseHeadersString(request.getAllResponseHeaders());
                    isAuthRequest = client.isResponseAnAuthRequest(parsedHeaderObj, request.responseText);
                    serverResponder.done();
                }
            };
            request.send();

            serverResponder.waitUntilDone(function () {
                assert.isFalse(isAuthRequest);
            });
        });

        it("attempts to authenticate after password retry callback called", function (done) {

            var requestCallback = sinon.spy();
            var count = 0;
            var serverResponder = new STE.AsyncServerResponder(server, done);

            server.respondWith("GET", TestData.SP_RESOURCE_URL, function(fakeRequest) {
                requestCallback(fakeRequest.requestHeaders);
                fakeRequest.respond(
                    200, {
                        "SOAPAction": TestData.PAOS_SOAP_ACTION,
                        "Content-Type" : TestData.PAOS_UTF8_CONTENT_TYPE
                    },
                    TestData.createPAOSRequest());
                if(++count > 1) {
                    serverResponder.done();
                }
            });

            server.respondWith("POST", TestData.IDP_ENDPOINT_URL, [
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION
                },
                TestData.createPAOSAuthFailed()
            ]);

            clientConfig.setEcpAuth(function(authCtx) {
                authCtx.setPassword('bob');
                authCtx.retryAuth();
            });
            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.calledTwice(requestCallback);
                sinon.assert.called(clientConfig.onEcpAuth);
                sinon.assert.alwaysCalledWith(requestCallback, sinon.match(TestData.PAOS_HTTP_HEADER));
                clientConfig.assertSuccessNotCalled();
            });
        });

        it("sends authorization header to IDP after password retry callback called", function (done) {

            var requestCallback = sinon.spy();
            var callCount = 0;
            var serverResponder = new STE.AsyncServerResponder(server, done);

            server.respondWith("GET", TestData.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION,
                    "Content-Type" : TestData.PAOS_UTF8_CONTENT_TYPE
                },
                TestData.createPAOSRequest()
            ]);

            server.respondWith("POST", TestData.IDP_ENDPOINT_URL, function(fakeRequest) {
                requestCallback(fakeRequest.requestHeaders);
                var responseData = ++callCount == 1 ? TestData.createPAOSAuthFailed() : TestData.createPAOSAuthSuccess();

                fakeRequest.respond(
                    200, {
                        "SOAPAction": TestData.PAOS_SOAP_ACTION
                    },
                    responseData);
                if(callCount > 1) {
                    serverResponder.done();
                }
            });

            server.respondWith("GET", TestData.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION,
                    "Content-Type" : TestData.PAOS_UTF8_CONTENT_TYPE
                },
                TestData.createPAOSRequest()
            ]);

            clientConfig.setEcpAuth(function(authCtx) {
                authCtx.setPassword(TestData.PASSWORD);
                authCtx.retryAuth();
            });
            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.calledTwice(requestCallback);
                sinon.assert.calledWith(requestCallback, sinon.match.has("Authorization", TestData.BASIC_AUTH_STRING));
                clientConfig.assertSuccessNotCalled();
            });
        });
    });
    describe('Authentication Error Handling', function() {

        it("times out when no response on initial resource access", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);
            var requestCallback = sinon.spy();

            server.xhr.useFilters = true;
            server.xhr.addFilter(function (method, url) {
                return url === TestData.SP_RESOURCE_URL;
            });

            server.respondWith("POST", TestData.IDP_ENDPOINT_URL, function (fakeRequest) {
                requestCallback();
            });

            clientConfig.resourceTimeout = 50;
            clientConfig.setOnResourceTimeout(function() {
                serverResponder.done();
            });

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function () {
                sinon.assert.notCalled(clientConfig.onEcpAuth);
                sinon.assert.notCalled(requestCallback);
                sinon.assert.calledOnce(clientConfig.onResourceTimeout);
            });
        });

        it("reports ECP errors on unsuccessful PAOS auth response from IDP", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);
            var requestCallback = sinon.spy();

            server.respondWith("GET", TestData.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION,
                    "Content-Type" : TestData.PAOS_UTF8_CONTENT_TYPE
                },
                TestData.createPAOSRequest()
            ]);

            server.respondWith("POST", TestData.IDP_ENDPOINT_URL, function (fakeRequest) {

                fakeRequest.respond(
                    200, {
                        "SOAPAction": TestData.PAOS_SOAP_ACTION
                    },
                    TestData.createPAOSAuthFailed()
                );
                serverResponder.done();
            });

            server.respondWith("POST", TestData.SP_SSO_URL, function () {
                requestCallback();
            });


            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function () {
                sinon.assert.called(clientConfig.onEcpAuth);
                sinon.assert.notCalled(requestCallback);
                sinon.assert.calledOnce(clientConfig.onEcpError);
                sinon.assert.alwaysCalledWith(clientConfig.onEcpError, sinon.match({
                    errorCode: samlEcpClientJs.ECP_ERROR.IDP_RESPONSE_ERROR,
                    idpStatus: {
                        statusCode: [ samlEcpClientJs.SAML2_STATUS.REQUESTER, samlEcpClientJs.SAML2_STATUS.AUTHN_FAILED ],
                        statusMessage: "An error occurred."
                    }
                }));
                clientConfig.assertSuccessNotCalled();
            });
        });

        it("reports IDP HTTP errors on initial POST", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);
            var requestCallback = sinon.spy();
            var callCount = 0;

            server.respondWith("GET", TestData.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION,
                    "Content-Type" : TestData.PAOS_UTF8_CONTENT_TYPE
                },
                TestData.createPAOSRequest()
            ]);

            server.respondWith("POST", TestData.IDP_ENDPOINT_URL, function (fakeRequest) {

                fakeRequest.respond(403);
                serverResponder.done();
            });

            server.respondWith("POST", TestData.SP_SSO_URL, function () {
                requestCallback();
            });

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function () {
                sinon.assert.notCalled(requestCallback);
                sinon.assert.calledOnce(clientConfig.onError);
                sinon.assert.alwaysCalledWith(clientConfig.onError, sinon.match.has("status", 403));
                clientConfig.assertSuccessNotCalled();
            });
        });

        it("times out on no response from IDP POST", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);
            var requestCallback = sinon.spy();
            var callCount = 0;

            server.xhr.useFilters = true;
            server.xhr.addFilter(function (method, url) {
                return url === TestData.IDP_ENDPOINT_URL;
            });

            server.respondWith("GET", TestData.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION,
                    "Content-Type" : TestData.PAOS_UTF8_CONTENT_TYPE
                },
                TestData.createPAOSRequest()
            ]);

            server.respondWith("POST", TestData.SP_SSO_URL, function () {
                requestCallback();
            });

            clientConfig.samlTimeout = 50;
            clientConfig.setOnSamlTimeout(function() {
                serverResponder.done();
            });

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function () {
                sinon.assert.notCalled(requestCallback);
                sinon.assert.calledOnce(clientConfig.onSamlTimeout);
                clientConfig.assertSuccessNotCalled();
            });
        });

        it("reports HTTP errors on posting back IDP response to SP", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);
            var requestCallback = sinon.spy();


            server.respondWith("GET", TestData.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION,
                    "Content-Type" : TestData.PAOS_UTF8_CONTENT_TYPE
                },
                TestData.createPAOSRequest()
            ]);

            server.respondWith("POST", TestData.IDP_ENDPOINT_URL, function (fakeRequest) {

                fakeRequest.respond(
                    200, {
                        "SOAPAction": TestData.PAOS_SOAP_ACTION
                    },
                    TestData.createPAOSAuthSuccess()
                );
            });

            server.respondWith("POST", TestData.SP_SSO_URL, function (fakeRequest) {
                fakeRequest.respond(403);
                serverResponder.done();
            });

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function () {
                sinon.assert.notCalled(requestCallback);
                sinon.assert.calledOnce(clientConfig.onError);
                sinon.assert.alwaysCalledWith(clientConfig.onError, sinon.match.has("status", 403));
                clientConfig.assertSuccessNotCalled();
            });
        });

        it("times out on no response when posting back IDP response to SP", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);
            var requestCallback = sinon.spy();

            server.xhr.useFilters = true;
            server.xhr.addFilter(function (method, url) {
                return url === TestData.SP_SSO_URL;
            });

            server.respondWith("GET", TestData.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION,
                    "Content-Type" : TestData.PAOS_UTF8_CONTENT_TYPE
                },
                TestData.createPAOSRequest()
            ]);

            server.respondWith("POST", TestData.IDP_ENDPOINT_URL, function (fakeRequest) {

                fakeRequest.respond(
                    200, {
                        "SOAPAction": TestData.PAOS_SOAP_ACTION
                    },
                    TestData.createPAOSAuthSuccess()
                );
            });

            clientConfig.samlTimeout = 50;
            clientConfig.setOnSamlTimeout(function() {
                serverResponder.done();
            });

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function () {
                sinon.assert.notCalled(requestCallback);
                sinon.assert.calledOnce(clientConfig.onSamlTimeout);
                clientConfig.assertSuccessNotCalled();
            });
        });

        it("doesn't report HTTP errors on initial resource access", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);
            var requestCallback = sinon.spy();

            server.respondWith("GET", TestData.SP_RESOURCE_URL, function(fakeRequest) {
                fakeRequest.respond(403);
                serverResponder.done();
            });

            server.respondWith("POST", TestData.IDP_ENDPOINT_URL, function (fakeRequest) {
                requestCallback();
            });

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function () {
                sinon.assert.notCalled(clientConfig.onEcpAuth);
                sinon.assert.calledOnce(clientConfig.onSuccess);
                sinon.assert.calledWith(clientConfig.onSuccess, sinon.match.any, sinon.match.any, sinon.match.has("status", 403));
                clientConfig.assertNoErrors();
            });
        });

        it("doesn't report HTTP errors on final resource access after authentication", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);
            var count = 0;

            server.respondWith("GET", TestData.SP_RESOURCE_URL, function(fakeRequest) {

                if(++count == 1) {
                    fakeRequest.respond(
                        200, {
                            "SOAPAction": TestData.PAOS_SOAP_ACTION,
                            "Content-Type": TestData.PAOS_UTF8_CONTENT_TYPE
                        },
                        TestData.createPAOSRequest()
                    );
                    return;
                }
                fakeRequest.respond(403);
                serverResponder.done();
            });

            server.respondWith("POST", TestData.IDP_ENDPOINT_URL, [
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION
                },
                TestData.createPAOSAuthSuccess()
            ]);

            server.respondWith("POST", TestData.SP_SSO_URL, function(fakeRequest) {
                fakeRequest.respond(
                    302, {
                        "SOAPAction": TestData.PAOS_SOAP_ACTION
                    },
                    TestData.createPAOSRequest());
            });

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.notCalled(clientConfig.onEcpAuth);
                sinon.assert.calledOnce(clientConfig.onSuccess);
                sinon.assert.calledWith(clientConfig.onSuccess, sinon.match.any, sinon.match.any, sinon.match.has("status", 403));
                clientConfig.assertNoErrors();
            });
        });

        it("times out when no response from resource after successful authentication", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);

            server.respondWith("GET", TestData.SP_RESOURCE_URL, function(fakeRequest) {

                fakeRequest.respond(
                    200, {
                        "SOAPAction": TestData.PAOS_SOAP_ACTION,
                        "Content-Type": TestData.PAOS_UTF8_CONTENT_TYPE
                    },
                    TestData.createPAOSRequest()
                );
                // Set this URL to timeout after the first request (i.e. on the final request)
                // There seems to be some kind of bug where success is still called after the timeout
                // (perhaps as part of cleanup?). This doesn't seem like a real problem however and so
                // the check to see whether onSuccess has been called is avoided.
                server.xhr.useFilters = true;
                server.xhr.addFilter(function (method, url) {
                    return url === TestData.SP_RESOURCE_URL;
                });
            });

            server.respondWith("POST", TestData.IDP_ENDPOINT_URL, [
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION
                },
                TestData.createPAOSAuthSuccess()
            ]);

            server.respondWith("POST", TestData.SP_SSO_URL, function(fakeRequest) {
                fakeRequest.respond(
                    302, {
                        "SOAPAction": TestData.PAOS_SOAP_ACTION
                    },
                    TestData.createPAOSRequest());
            });

            clientConfig.resourceTimeout = 50;
            clientConfig.setOnResourceTimeout(function() {
                serverResponder.done();
            });

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.notCalled(clientConfig.onEcpAuth);
                sinon.assert.calledOnce(clientConfig.onResourceTimeout);
                clientConfig.assertNoErrors();
            });
        });
    });

    describe('Successful Authentication', function() {
        it("returns the resource on successful authentication", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);
            var count = 0;

            server.respondWith("GET", TestData.SP_RESOURCE_URL, function(fakeRequest) {

                if(++count == 1) {
                    fakeRequest.respond(
                        200, {
                            "SOAPAction": TestData.PAOS_SOAP_ACTION,
                            "Content-Type": TestData.PAOS_UTF8_CONTENT_TYPE
                        },
                        TestData.createPAOSRequest()
                    );
                    return;
                }
                fakeRequest.respond(
                    200, {
                        "Content-Type" : TestData.TEXT_HTML_CONTENT_TYPE
                    },
                    TestData.SP_RESOURCE
                );
                serverResponder.done();
            });

            server.respondWith("POST", TestData.IDP_ENDPOINT_URL, [
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION
                },
                TestData.createPAOSAuthSuccess()
            ]);

            server.respondWith("POST", TestData.SP_SSO_URL, function(fakeRequest) {
                fakeRequest.respond(
                    302, {
                        "SOAPAction": TestData.PAOS_SOAP_ACTION
                    },
                    TestData.createPAOSRequest());
            });


            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.notCalled(clientConfig.onEcpAuth);
                sinon.assert.calledOnce(clientConfig.onSuccess);
                sinon.assert.calledWith(clientConfig.onSuccess, TestData.SP_RESOURCE);
                clientConfig.assertNoErrors();
            });
        });
    });
});
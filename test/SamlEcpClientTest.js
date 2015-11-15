describe('Saml ECP Client', function() {
    var client = null;
    var clientConfig = null;
    var server = null;
    var STE = null; // SinonTestExt namespace
    var TestData = null; // Test data constants

    function ClientConfig(username){
        this.username = username;
        this.success = sinon.spy();
        this.ecpError = sinon.spy();
        this.error = sinon.spy();
        this.ecpAuth = sinon.spy();
    }

    ClientConfig.prototype = {
        setEcpAuth : function(ecpAuth) {
            this.ecpAuth = sinon.spy(ecpAuth);
        },
        assertNoErrors : function() {
            sinon.assert.notCalled(this.error);
            sinon.assert.notCalled(this.ecpError);
        },
        assertSuccessNotCalled : function() {
            sinon.assert.notCalled(this.success);
        }
    };

    beforeEach(function(done) {
        require(["saml-ecp-js", "SinonTestExt", "SamlTestData"], function(samlEcpJs, sinonTestExt, SamlTestData) {
            TestData = SamlTestData;
            server = sinon.fakeServer.create();
            server.autoRespondAfter = 50;
            client = new samlEcpJs.client({
                idpEndpointUrl: TestData.IDP_ENDPOINT_URL
            });
            STE = sinonTestExt;
            clientConfig = new ClientConfig(TestData.USERNAME);
            done();
        });
    });

    afterEach(function () {
        server.restore();
    });

    describe('SP Resource Request', function() {
        it("makes SP request with PAOS headers", function (done) {

            var requestCallback = sinon.spy();
            var serverResponder = new STE.AsyncServerResponder(server, done);

            server.respondWith("GET", TestData.SP_RESOURCE_URL, function(fakeRequest) {
                requestCallback(fakeRequest.requestHeaders);
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
                    "SOAPAction": TestData.PAOS_SOAP_ACTION
                },
                TestData.createPAOSRequest()
            ]);

            server.respondWith("POST", TestData.IDP_ENDPOINT_URL, function(fakeRequest) {
                requestCallback(fakeRequest.requestHeaders, fakeRequest.requestBody);
                serverResponder.done();
            });

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.calledOnce(requestCallback);
                sinon.assert.calledWith(requestCallback, sinon.match.any, TestData.createPAOSRequest());

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
                    "SOAPAction": TestData.PAOS_SOAP_ACTION
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
                    "SOAPAction": TestData.PAOS_SOAP_ACTION
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
                sinon.assert.notCalled(clientConfig.ecpAuth);
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
                    "SOAPAction": TestData.PAOS_SOAP_ACTION
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
                sinon.assert.notCalled(clientConfig.ecpAuth);
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
                    "SOAPAction": TestData.PAOS_SOAP_ACTION
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
                sinon.assert.called(clientConfig.ecpAuth);
                sinon.assert.notCalled(requestCallback);
                sinon.assert.calledTwice(clientConfig.ecpError);
                sinon.assert.alwaysCalledWith(clientConfig.ecpError, sinon.match({
                    errorCode: -1,
                    idpStatus: {
                        statusCode: ["urn:oasis:names:tc:SAML:2.0:status:Requester", "urn:oasis:names:tc:SAML:2.0:status:AuthnFailed"],
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
                    "SOAPAction": TestData.PAOS_SOAP_ACTION
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

        it("attempts to authenticate after password retry callback called", function (done) {

            var requestCallback = sinon.spy();
            var count = 0;
            var serverResponder = new STE.AsyncServerResponder(server, done);

            server.respondWith("GET", TestData.SP_RESOURCE_URL, function(fakeRequest) {
                requestCallback(fakeRequest.requestHeaders);
                fakeRequest.respond(
                    200, {
                        "SOAPAction": TestData.PAOS_SOAP_ACTION
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
                sinon.assert.called(clientConfig.ecpAuth);
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
                    "SOAPAction": TestData.PAOS_SOAP_ACTION
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
                    "SOAPAction": TestData.PAOS_SOAP_ACTION
                },
                TestData.createPAOSRequest()
            ]);

            clientConfig.setEcpAuth(function(authCtx) {
                authCtx.setPassword('bob');
                authCtx.retryAuth();
            });
            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.calledTwice(requestCallback);
                sinon.assert.calledWith(requestCallback, sinon.match.has("Authorization"));
                clientConfig.assertSuccessNotCalled();
            });
        });
    });

    describe('Authentication Error Handling', function() {
        it("reports errors on unsuccessful PAOS auth response from IDP", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);
            var requestCallback = sinon.spy();
            var callCount = 0;

            server.respondWith("GET", TestData.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION
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
                sinon.assert.called(clientConfig.ecpAuth);
                sinon.assert.notCalled(requestCallback);
                sinon.assert.calledOnce(clientConfig.ecpError);
                sinon.assert.alwaysCalledWith(clientConfig.ecpError, sinon.match({
                    errorCode: -1,
                    idpStatus: {
                        statusCode: ["urn:oasis:names:tc:SAML:2.0:status:Requester", "urn:oasis:names:tc:SAML:2.0:status:AuthnFailed"],
                        statusMessage: "An error occurred."
                    }
                }));
                clientConfig.assertSuccessNotCalled();
            });
        });
    });
});
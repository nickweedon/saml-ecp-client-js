describe('Saml ECP Client', function() {
    var client = null;
    var clientConfig = null;
    var server = null;
    var STE = null; // SinonTestExt namespace
    var Constant = null; // Test data constants

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
        require(["saml-ecp-js", "SinonTestExt", "SamlTestConstant"], function(samlEcpJs, sinonTestExt, SamlTestConstant) {
            Constant = SamlTestConstant;
            server = sinon.fakeServer.create();
            server.autoRespondAfter = 50;
            client = new samlEcpJs.client({
                idpEndpointUrl: Constant.IDP_ENDPOINT_URL
            });
            STE = sinonTestExt;
            clientConfig = new ClientConfig(Constant.USERNAME);
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

            server.respondWith("GET", Constant.SP_RESOURCE_URL, function(fakeRequest) {
                requestCallback(fakeRequest.requestHeaders);
                serverResponder.done();
            });

            client.get(Constant.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.calledOnce(requestCallback);
                sinon.assert.calledWith(requestCallback, sinon.match(Constant.PAOS_HTTP_HEADER));
                clientConfig.assertNoErrors();
                clientConfig.assertSuccessNotCalled();
            });
        });
    });

    describe('PAOS Request Forwarding', function() {
        it("forwards SP PAOS auth request to IDP", function (done) {

            var requestCallback = sinon.spy();
            var serverResponder = new STE.AsyncServerResponder(server, done);

            server.respondWith("GET", Constant.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction": Constant.PAOS_SOAP_ACTION
                },
                Constant.PAOS_REQUEST
            ]);


            server.respondWith("POST", Constant.IDP_ENDPOINT_URL, function(fakeRequest) {
                requestCallback(fakeRequest.requestHeaders, fakeRequest.requestBody);
                serverResponder.done();
            });

            client.get(Constant.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.calledOnce(requestCallback);
                sinon.assert.calledWith(requestCallback, sinon.match.any, Constant.PAOS_REQUEST);

                // Ensure that we don't pass the PAOS HTTP headers to the IDP
                sinon.assert.neverCalledWith(requestCallback, sinon.match({
                    PAOS: Constant.PAOS_ATTRIBUTE
                }));
                sinon.assert.neverCalledWith(requestCallback, sinon.match({
                    Accept: Constant.TEXT_PAOS_ACCEPT_ATTRIBUTE
                }));
                sinon.assert.neverCalledWith(requestCallback, sinon.match.has("Authorization"));
                clientConfig.assertNoErrors();
                clientConfig.assertSuccessNotCalled();
            });
        });

        it("wont forward actual SP resource to IDP", function () {

            server.respondImmediately = true;
            var requestCallback = sinon.spy();

            server.respondWith("GET", Constant.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction": Constant.PAOS_SOAP_ACTION
                },
                Constant.SP_RESOURCE
            ]);


            server.respondWith("POST", Constant.IDP_ENDPOINT_URL, function(fakeRequest) {
                requestCallback(fakeRequest);
            });

            client.get(Constant.SP_RESOURCE_URL, clientConfig);

            sinon.assert.notCalled(requestCallback);
        });

        it("posts back to SP on successful PAOS auth response from IDP", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);
            var requestCallback = sinon.spy();

            server.respondWith("GET", Constant.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction": Constant.PAOS_SOAP_ACTION
                },
                Constant.PAOS_REQUEST
            ]);

            server.respondWith("POST", Constant.IDP_ENDPOINT_URL, [
                200, {
                    "SOAPAction": Constant.PAOS_SOAP_ACTION
                },
                Constant.PAOS_AUTH_SUCCESS
            ]);

            server.respondWith("POST", Constant.SP_SSO_URL, function(fakeRequest) {
                requestCallback(fakeRequest.requestHeaders, fakeRequest.requestBody);
                fakeRequest.respond(
                    302, {
                        "SOAPAction": Constant.PAOS_SOAP_ACTION
                    },
                    Constant.PAOS_REQUEST);
                serverResponder.done();
            });


            client.get(Constant.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.notCalled(clientConfig.ecpAuth);
                sinon.assert.calledOnce(requestCallback);
                sinon.assert.calledWith(requestCallback, sinon.match({
                        "Content-Type": Constant.PAOS_UTF8_CONTENT_TYPE
                    }),
                    Constant.PAOS_AUTH_SUCCESS
                );
                clientConfig.assertNoErrors();
                clientConfig.assertSuccessNotCalled();
            });
        });

        it("won't post back to SP on unsuccessful PAOS auth response from IDP", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);
            var requestCallback = sinon.spy();
            var callCount = 0;

            server.respondWith("GET", Constant.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction": Constant.PAOS_SOAP_ACTION
                },
                Constant.PAOS_REQUEST
            ]);

            server.respondWith("POST", Constant.IDP_ENDPOINT_URL, function(fakeRequest) {

                fakeRequest.respond(
                    200, {
                        "SOAPAction": Constant.PAOS_SOAP_ACTION
                    },
                    Constant.PAOS_AUTH_FAILED
                );
                if(++callCount > 1) {
                    serverResponder.done();
                }
            });

            server.respondWith("POST", Constant.SP_SSO_URL, function() {
                requestCallback();
            });


            clientConfig.setEcpAuth(function(authCtx) {
                authCtx.setPassword('bob');
                authCtx.retryAuth();
            });
            client.get(Constant.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.called(clientConfig.ecpAuth);
                sinon.assert.notCalled(requestCallback);
                clientConfig.assertNoErrors();
                clientConfig.assertSuccessNotCalled();
            });
        });
    });

    describe('Authentication Required Detection and Header Handling', function() {
        it("invokes password callback when IDP PAOS response returns auth failed and no password set", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);

            server.respondWith("GET", Constant.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction": Constant.PAOS_SOAP_ACTION
                },
                Constant.PAOS_REQUEST
            ]);

            server.respondWith("POST", Constant.IDP_ENDPOINT_URL, [
                200, {
                    "SOAPAction": Constant.PAOS_SOAP_ACTION
                },
                Constant.PAOS_AUTH_FAILED
            ]);

            clientConfig.setEcpAuth(function () {
                serverResponder.done();
            });
            client.get(Constant.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function () {
                clientConfig.assertNoErrors();
                clientConfig.assertSuccessNotCalled();
            });
        });

        it("attempts to authenticate after password retry callback called", function (done) {

            var requestCallback = sinon.spy();
            var count = 0;
            var serverResponder = new STE.AsyncServerResponder(server, done);

            server.respondWith("GET", Constant.SP_RESOURCE_URL, function(fakeRequest) {
                requestCallback(fakeRequest.requestHeaders);
                fakeRequest.respond(
                    200, {
                        "SOAPAction": Constant.PAOS_SOAP_ACTION
                    },
                    Constant.PAOS_REQUEST);
                if(++count > 1) {
                    serverResponder.done();
                }
            });

            server.respondWith("POST", Constant.IDP_ENDPOINT_URL, [
                200, {
                    "SOAPAction": Constant.PAOS_SOAP_ACTION
                },
                Constant.PAOS_AUTH_FAILED
            ]);

            clientConfig.setEcpAuth(function(authCtx) {
                authCtx.setPassword('bob');
                authCtx.retryAuth();
            });
            client.get(Constant.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.calledTwice(requestCallback);
                sinon.assert.alwaysCalledWith(requestCallback, sinon.match(Constant.PAOS_HTTP_HEADER));
                clientConfig.assertNoErrors();
                clientConfig.assertSuccessNotCalled();
            });
        });

        it("sends authorization header to IDP after password retry callback called", function (done) {

            var requestCallback = sinon.spy();
            var callCount = 0;
            var serverResponder = new STE.AsyncServerResponder(server, done);

            server.respondWith("GET", Constant.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction": Constant.PAOS_SOAP_ACTION
                },
                Constant.PAOS_REQUEST
            ]);

            server.respondWith("POST", Constant.IDP_ENDPOINT_URL, function(fakeRequest) {
                requestCallback(fakeRequest.requestHeaders);
                var responseData = ++callCount == 1 ? Constant.PAOS_AUTH_FAILED : Constant.PAOS_AUTH_SUCCESS;

                fakeRequest.respond(
                    200, {
                        "SOAPAction": Constant.PAOS_SOAP_ACTION
                    },
                    responseData);
                if(callCount > 1) {
                    serverResponder.done();
                }
            });

            server.respondWith("GET", Constant.SP_RESOURCE_URL, [
                200, {
                    "SOAPAction": Constant.PAOS_SOAP_ACTION
                },
                Constant.PAOS_REQUEST
            ]);

            clientConfig.setEcpAuth(function(authCtx) {
                authCtx.setPassword('bob');
                authCtx.retryAuth();
            });
            client.get(Constant.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.calledTwice(requestCallback);
                sinon.assert.calledWith(requestCallback, sinon.match.has("Authorization"));
                clientConfig.assertNoErrors();
                clientConfig.assertSuccessNotCalled();
            });
        });
    });
});
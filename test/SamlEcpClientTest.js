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
                Accept: Constant.PAOS_ACCEPT_ATTRIBUTE
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

        clientConfig.setEcpAuth(function() {
            serverResponder.done();
        });
        client.get(Constant.SP_RESOURCE_URL, clientConfig);

        serverResponder.waitUntilDone(function() {
            clientConfig.assertNoErrors();
            clientConfig.assertSuccessNotCalled();
        });
    });

    /*
    it("posts back to SP successful PAOS auth response from IDP", function () {

        var passwordCallback = sinon.spy();

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

        client.get(Constant.SP_RESOURCE_URL, {
                username : USERNAME,
                success : function(data, status) {
                    sinon.assert.fail("Did not expect 'success' with status: " + status);
                },
                ecpError : function(ecpErrorObj) {
                    sinon.assert.fail("Did not expect 'ecpError' with error code: " + ecpErrorObj.errorCode);
                },
                error : function(xmlHttp, msg) {
                    sinon.assert.fail("Did not expect 'error' with message: " + msg);
                },
                ecpAuth : passwordCallback
            }
        );

        //server.respond(); // Process SP request
        //server.respond(); // Process IDP POST (forwarding PAOS request)

        sinon.assert.calledOnce(passwordCallback);
    });
    */

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
describe('Saml ECP Client', function() {
    var samlEcpClientJs = null;
    var client = null;
    var clientConfig = null;
    var server = null;
    var STE = null; // SinonTestExt namespace
    var TestData = null; // Test data constants

    ///////////////////////////////////////////////////////////////////////////
    // Spy and test function variables
    ///////////////////////////////////////////////////////////////////////////

    var spResourceRequestCount;
    var idpRequestCount;
    var spResourceRequestSpy;
    var spSSORequestSpy;
    var idpAuthRequestSpy;

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

    ///////////////////////////////////////////////////////////////////////////
    // Testing setup helper methods
    ///////////////////////////////////////////////////////////////////////////

    function setupSpRespondWithPaosRequest(requestMethod, authChallengeCount, respondWithResource, serverResponder) {

        if(respondWithResource === undefined) {
            respondWithResource = true;
        }

        server.respondWith(requestMethod, TestData.SP_RESOURCE_URL, function(fakeRequest) {

            spResourceRequestSpy(fakeRequest.requestHeaders, fakeRequest.requestBody);

            if(authChallengeCount === undefined || spResourceRequestCount++ < authChallengeCount) {
                fakeRequest.respond(
                    200, {
                        "SOAPAction": TestData.PAOS_SOAP_ACTION,
                        "Content-Type": TestData.PAOS_UTF8_CONTENT_TYPE
                    },
                    TestData.createPAOSRequest()
                );
                // If we are not sending the actual resource then we should trigger the 'done' method and not wait for another call
                if(respondWithResource || spResourceRequestCount < authChallengeCount) {
                    return;
                }
            }
            if(respondWithResource) {
                fakeRequest.respond(
                    200, {
                        "Content-Type" : TestData.TEXT_HTML_CONTENT_TYPE
                    },
                    TestData.SP_RESOURCE
                );
            }
            if(serverResponder !== undefined) {
                serverResponder.done();
            }
        });
    }

    function setupIdPRespondWithAuth(fieldValues, responseBeforeDoneCount, serverResponder, responseMethod) {

        if(responseBeforeDoneCount === undefined) {
            responseBeforeDoneCount = 0;
        }

        server.respondWith("POST", TestData.IDP_ENDPOINT_URL, function (fakeRequest) {

            idpAuthRequestSpy(fakeRequest.requestHeaders, fakeRequest.requestBody);

            fakeRequest.respond(
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION
                },
                responseMethod(fieldValues)
            );
            if(++idpRequestCount >= responseBeforeDoneCount) {
                if(serverResponder !== undefined) {
                    serverResponder.done();
                }
            }
        });
    }

    function setupIdPRespondWithAuthSuccess(fieldValues, responseBeforeDoneCount, serverResponder) {
        setupIdPRespondWithAuth(fieldValues, responseBeforeDoneCount, serverResponder, TestData.createPAOSAuthSuccess);
    }

    function setupIdPRespondWithAuthFailed(fieldValues, responseBeforeDoneCount, serverResponder) {
        setupIdPRespondWithAuth(fieldValues, responseBeforeDoneCount, serverResponder, TestData.createPAOSAuthFailed);
    }

    function setupSpSSORespondWithOK(serverResponder) {
        server.respondWith("POST", TestData.SP_SSO_URL, function(fakeRequest) {

            spSSORequestSpy(fakeRequest.requestHeaders, fakeRequest.requestBody);

            fakeRequest.respond(
                200, {
                    "SOAPAction": TestData.PAOS_SOAP_ACTION
                },
                "");

            if(serverResponder !== undefined) {
                serverResponder.done();
            }
        });
    }

    ///////////////////////////////////////////////////////////////////////////
    // Setup and tear down methods
    ///////////////////////////////////////////////////////////////////////////

    beforeEach(function(done) {
        require(["saml-ecp-client-js", "SinonTestExt", "SamlTestData"], function(samlEcpClientJsNS, sinonTestExt, SamlTestData) {
            TestData = SamlTestData;
            server = sinon.fakeServer.create();
            server.autoRespondAfter = 50;
            samlEcpClientJs = samlEcpClientJsNS;
            client = new samlEcpClientJs.Client({
                idpEndpointUrl: TestData.IDP_ENDPOINT_URL
            });
            STE = sinonTestExt;
            clientConfig = new ClientConfig(TestData.USERNAME);

            spResourceRequestCount = 0;
            idpRequestCount = 0;
            spResourceRequestSpy = sinon.spy();
            spSSORequestSpy = sinon.spy();
            idpAuthRequestSpy = sinon.spy();

            done();
        });
    });

    afterEach(function () {
        server.restore();
        server.xhr.useFilters = false;
        server.xhr.filters = [];
    });

    ///////////////////////////////////////////////////////////////////////////
    // Begin test suite
    ///////////////////////////////////////////////////////////////////////////

    describe('Instantiation and configuration tests', function() {
        it("Uses xhrFactory when supplied", function () {
            var customXhrOpenSpy = null;

            clientConfig.xhrFactory = function() {
                var xhr = new XMLHttpRequest();
                customXhrOpenSpy = sinon.spy(xhr, "open");
                return xhr;
            };

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            sinon.assert.calledOnce(customXhrOpenSpy);
        });
    });


    describe('SP Resource Request', function() {
        it("makes SP request with PAOS headers", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);

            setupSpRespondWithPaosRequest("GET", 1, false, serverResponder);

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.calledOnce(spResourceRequestSpy);
                sinon.assert.calledWith(spResourceRequestSpy, sinon.match(TestData.PAOS_HTTP_HEADER));
                clientConfig.assertNoErrors();
                clientConfig.assertSuccessNotCalled();
            });
        });
    });

    describe('PAOS Request Forwarding', function() {
        it("forwards SP PAOS auth request to IDP", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);

            setupSpRespondWithPaosRequest("GET");
            setupIdPRespondWithAuthSuccess(undefined, 0, serverResponder);

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.calledOnce(idpAuthRequestSpy);
                // This checks that the request is forwarded to the IDP after removing the SOAP header element
                sinon.assert.calledWith(idpAuthRequestSpy, sinon.match.any, TestData.PAOS_REQUEST_WITHOUT_HEADER);

                // Ensure that we don't pass the PAOS HTTP headers to the IDP
                sinon.assert.neverCalledWith(idpAuthRequestSpy, sinon.match({
                    PAOS: TestData.PAOS_ATTRIBUTE
                }));
                sinon.assert.neverCalledWith(idpAuthRequestSpy, sinon.match({
                    Accept: TestData.TEXT_PAOS_ACCEPT_ATTRIBUTE
                }));
                sinon.assert.neverCalledWith(idpAuthRequestSpy, sinon.match.has("Authorization"));
                clientConfig.assertNoErrors();
                clientConfig.assertSuccessNotCalled();
            });
        });

        it("wont forward actual SP resource to IDP", function () {

            server.respondImmediately = true;

            setupSpRespondWithPaosRequest("GET", 0, true);
            setupIdPRespondWithAuthSuccess();

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            sinon.assert.notCalled(idpAuthRequestSpy);
        });

        it("posts back to SP on successful PAOS auth response from IDP", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);

            setupSpRespondWithPaosRequest("GET");
            setupIdPRespondWithAuthSuccess();
            setupSpSSORespondWithOK(serverResponder);

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.notCalled(clientConfig.onEcpAuth);
                sinon.assert.calledOnce(spSSORequestSpy);
                sinon.assert.calledWith(spSSORequestSpy, sinon.match({
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

            setupSpRespondWithPaosRequest("GET");
            setupIdPRespondWithAuthSuccess({
                assertionConsumerServiceURL : SOME_CRAZY_URL
            });

            server.respondWith("POST", SOME_CRAZY_URL, function(fakeRequest) {
                requestCallback(fakeRequest.requestHeaders, fakeRequest.requestBody);
                fakeRequest.respond(
                    200, {
                        "SOAPAction": TestData.PAOS_SOAP_ACTION
                    },
                    "");
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

            setupSpRespondWithPaosRequest("GET");
            setupIdPRespondWithAuthFailed(undefined, 2, serverResponder);
            setupSpSSORespondWithOK();

            clientConfig.setEcpAuth(function(authCtx) {
                authCtx.setPassword('bob');
                authCtx.retryAuth();
            });
            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.called(clientConfig.onEcpAuth);
                sinon.assert.notCalled(spSSORequestSpy);
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

    describe('Authentication Required/Failed Detection and Header Handling', function() {
        it("invokes password callback when IDP PAOS response returns auth failed and no password set", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);

            setupSpRespondWithPaosRequest("GET");
            setupIdPRespondWithAuthFailed();

            clientConfig.setEcpAuth(function () {
                serverResponder.done();
            });
            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function () {
                clientConfig.assertSuccessNotCalled();
            });
        });

        it("Invokes password callback when no username set and before authentication attempt", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);
            var spRequestSpy = sinon.spy();
            var idpRequestSpy = sinon.spy();

            setupSpRespondWithPaosRequest("GET");
            setupIdPRespondWithAuthFailed();

            delete clientConfig.username;
            clientConfig.setEcpAuth(function () {
                serverResponder.done();
            });
            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function () {
                sinon.assert.notCalled(spRequestSpy);
                sinon.assert.notCalled(idpRequestSpy);
                clientConfig.assertSuccessNotCalled();
            });
        });

        it("Can authenticate when username is set through authentication callback", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);

            setupSpRespondWithPaosRequest("GET");
            setupIdPRespondWithAuthSuccess(undefined, 0, serverResponder);

            delete clientConfig.username;
            clientConfig.setEcpAuth(function(authCtx) {
                authCtx.setUsername(TestData.USERNAME);
                authCtx.setPassword(TestData.PASSWORD);
                authCtx.retryAuth();
            });

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function () {
                sinon.assert.calledOnce(spResourceRequestSpy);
                sinon.assert.calledOnce(idpAuthRequestSpy);
                sinon.assert.calledWith(idpAuthRequestSpy, sinon.match.has("Authorization", TestData.BASIC_AUTH_STRING));
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
                    parsedHeaderObj = samlEcpClientJs.Client.parseResponseHeadersString(request.getAllResponseHeaders());
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

            setupSpRespondWithPaosRequest("GET");

            var isAuthRequest = null;
            var request = new XMLHttpRequest();

            request.open("GET", TestData.SP_RESOURCE_URL);
            request.onreadystatechange = function() {
                if(request.readyState == 4) {
                    var parsedHeaderObj = samlEcpClientJs.Client.parseResponseHeadersString(request.getAllResponseHeaders());
                    isAuthRequest = samlEcpClientJs.Client.isResponseAnAuthRequest(parsedHeaderObj, request.responseText);
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

            // Don't send the proper PAOS headers
            server.respondWith("GET", TestData.SP_RESOURCE_URL, [
                200, {},
                TestData.createPAOSRequest()
            ]);

            var isAuthRequest = null;
            var request = new XMLHttpRequest();

            request.open("GET", TestData.SP_RESOURCE_URL);
            request.onreadystatechange = function() {
                if(request.readyState == 4) {
                    var parsedHeaderObj = samlEcpClientJs.Client.parseResponseHeadersString(request.getAllResponseHeaders());
                    isAuthRequest = samlEcpClientJs.Client.isResponseAnAuthRequest(parsedHeaderObj, request.responseText);
                    serverResponder.done();
                }
            };
            request.send();

            serverResponder.waitUntilDone(function () {
                assert.isFalse(isAuthRequest);
            });
        });

        it("attempts to authenticate after password retry callback called", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);

            setupSpRespondWithPaosRequest("GET", 2, false, serverResponder);
            setupIdPRespondWithAuthFailed();

            clientConfig.setEcpAuth(function(authCtx) {
                authCtx.setPassword('bob');
                authCtx.retryAuth();
            });
            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.calledTwice(spResourceRequestSpy);
                sinon.assert.called(clientConfig.onEcpAuth);
                sinon.assert.alwaysCalledWith(spResourceRequestSpy, sinon.match(TestData.PAOS_HTTP_HEADER));
                clientConfig.assertSuccessNotCalled();
            });
        });

        it("sends authorization header to IDP after password retry callback called", function (done) {

            var callCount = 0;
            var serverResponder = new STE.AsyncServerResponder(server, done);

            setupSpRespondWithPaosRequest("GET");
            setupIdPRespondWithAuth(undefined, 2, serverResponder, function(fieldValues) {
                return ++callCount == 1 ? TestData.createPAOSAuthFailed(fieldValues) : TestData.createPAOSAuthSuccess(fieldValues);
            });

            clientConfig.setEcpAuth(function(authCtx) {
                authCtx.setPassword(TestData.PASSWORD);
                authCtx.retryAuth();
            });
            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.calledTwice(idpAuthRequestSpy);
                sinon.assert.calledWith(idpAuthRequestSpy, sinon.match.has("Authorization", TestData.BASIC_AUTH_STRING));
                clientConfig.assertSuccessNotCalled();
            });
        });

        it("returns the resource on direct authentication with IDP", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);

            setupSpRespondWithPaosRequest("GET", 0, true, serverResponder);
            setupIdPRespondWithAuthSuccess();
            setupSpSSORespondWithOK();

            client.auth("GET", TestData.createPAOSRequest(), TestData.SP_RESOURCE_URL, undefined, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.notCalled(clientConfig.onEcpAuth);
                sinon.assert.calledOnce(clientConfig.onSuccess);
                sinon.assert.calledWith(clientConfig.onSuccess, TestData.SP_RESOURCE);
                clientConfig.assertNoErrors();
            });
        });

        it("returns the resource and posts data on direct authentication with IDP", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);

            setupSpRespondWithPaosRequest("POST", 0, true, serverResponder);
            setupIdPRespondWithAuthSuccess();
            setupSpSSORespondWithOK();

            client.auth("POST", TestData.createPAOSRequest(), TestData.SP_RESOURCE_URL, TestData.POST_DATA, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.calledOnce(spResourceRequestSpy);
                sinon.assert.calledWith(spResourceRequestSpy, sinon.match.any, TestData.POST_DATA);
                //assert(TestData.POST_DATA == spResourceRequestSpy.args[0][1]);
                sinon.assert.notCalled(clientConfig.onEcpAuth);
                sinon.assert.calledOnce(clientConfig.onSuccess);
                sinon.assert.calledWith(clientConfig.onSuccess, TestData.SP_RESOURCE);
                clientConfig.assertNoErrors();
            });
        });

        it("returns the resource and posts data on direct authentication with IDP after failed auth", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);
            var callCount = 0;

            setupSpRespondWithPaosRequest("POST", 1, true, serverResponder);
            //setupIdPRespondWithAuthFailed();
            setupIdPRespondWithAuth(undefined, 2, undefined, function(fieldValues) {
                return ++callCount == 1 ? TestData.createPAOSAuthFailed(fieldValues) : TestData.createPAOSAuthSuccess(fieldValues);
            });

            setupSpSSORespondWithOK();

            clientConfig.setEcpAuth(function(authCtx) {
                authCtx.setPassword('bob');
                authCtx.retryAuth();
            });

            client.auth("POST", TestData.createPAOSRequest(), TestData.SP_RESOURCE_URL, TestData.POST_DATA, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.calledTwice(spResourceRequestSpy);
                assert.equal(TestData.POST_DATA, spResourceRequestSpy.args[0][1], "Expected first SP call to contain post data");
                assert.equal(TestData.POST_DATA, spResourceRequestSpy.args[1][1], "Expected second SP call to contain post data");
                sinon.assert.calledOnce(clientConfig.onEcpAuth);
                sinon.assert.calledOnce(clientConfig.onSuccess);
                sinon.assert.calledWith(clientConfig.onSuccess, TestData.SP_RESOURCE);
                //clientConfig.assertNoErrors();
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

            server.respondWith("POST", TestData.IDP_ENDPOINT_URL, function () {
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

            setupSpRespondWithPaosRequest("GET");
            setupIdPRespondWithAuthFailed(undefined, 1, serverResponder);
            setupSpSSORespondWithOK();

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function () {
                sinon.assert.called(clientConfig.onEcpAuth);
                sinon.assert.notCalled(spSSORequestSpy);
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

            setupSpRespondWithPaosRequest("GET");
            setupSpSSORespondWithOK();

            server.respondWith("POST", TestData.IDP_ENDPOINT_URL, function (fakeRequest) {

                fakeRequest.respond(403);
                serverResponder.done();
            });

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function () {
                sinon.assert.notCalled(spSSORequestSpy);
                sinon.assert.calledOnce(clientConfig.onError);
                sinon.assert.alwaysCalledWith(clientConfig.onError, sinon.match.has("status", 403));
                clientConfig.assertSuccessNotCalled();
            });
        });

        it("times out on no response from IDP POST", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);

            server.xhr.useFilters = true;
            server.xhr.addFilter(function (method, url) {
                return url === TestData.IDP_ENDPOINT_URL;
            });

            setupSpRespondWithPaosRequest("GET");
            setupSpSSORespondWithOK();

            clientConfig.samlTimeout = 50;
            clientConfig.setOnSamlTimeout(function() {
                serverResponder.done();
            });

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function () {
                sinon.assert.notCalled(spSSORequestSpy);
                sinon.assert.calledOnce(clientConfig.onSamlTimeout);
                clientConfig.assertSuccessNotCalled();
            });
        });

        it("reports HTTP errors on posting back IDP response to SP", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);

            setupSpRespondWithPaosRequest("GET");
            setupIdPRespondWithAuthSuccess();

            server.respondWith("POST", TestData.SP_SSO_URL, function (fakeRequest) {
                fakeRequest.respond(403);
                serverResponder.done();
            });

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function () {
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

            setupSpRespondWithPaosRequest("GET");
            setupIdPRespondWithAuthSuccess();

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

            server.respondWith("POST", TestData.IDP_ENDPOINT_URL, function () {
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

            setupIdPRespondWithAuthSuccess();
            setupSpSSORespondWithOK();

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

            setupIdPRespondWithAuthSuccess();
            setupSpSSORespondWithOK();

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

    describe('Successful authentication using REST methods', function() {

        it("gets the resource on successful authentication", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);

            setupSpRespondWithPaosRequest("GET", 1, true, serverResponder);
            setupIdPRespondWithAuthSuccess();
            setupSpSSORespondWithOK();

            client.get(TestData.SP_RESOURCE_URL, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.notCalled(clientConfig.onEcpAuth);
                sinon.assert.calledOnce(clientConfig.onSuccess);
                sinon.assert.calledWith(clientConfig.onSuccess, TestData.SP_RESOURCE);
                clientConfig.assertNoErrors();
            });
        });

        it("posts the resource on successful authentication", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);

            setupSpRespondWithPaosRequest("POST", 1, true, serverResponder);
            setupIdPRespondWithAuthSuccess();
            setupSpSSORespondWithOK();

            client.post(TestData.SP_RESOURCE_URL, TestData.POST_DATA, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.calledTwice(spResourceRequestSpy);
                sinon.assert.calledWith(spResourceRequestSpy, sinon.match.any, TestData.POST_DATA);
                sinon.assert.notCalled(clientConfig.onEcpAuth);
                sinon.assert.calledOnce(clientConfig.onSuccess);
                sinon.assert.calledWith(clientConfig.onSuccess, TestData.SP_RESOURCE);
                clientConfig.assertNoErrors();
            });
        });

        it("puts the resource on successful authentication", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);

            setupSpRespondWithPaosRequest("PUT", 1, true, serverResponder);
            setupIdPRespondWithAuthSuccess();
            setupSpSSORespondWithOK();

            client.put(TestData.SP_RESOURCE_URL, TestData.PUT_DATA, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.calledTwice(spResourceRequestSpy);
                sinon.assert.calledWith(spResourceRequestSpy, sinon.match.any, TestData.PUT_DATA);
                sinon.assert.notCalled(clientConfig.onEcpAuth);
                sinon.assert.calledOnce(clientConfig.onSuccess);
                sinon.assert.calledWith(clientConfig.onSuccess, TestData.SP_RESOURCE);
                clientConfig.assertNoErrors();
            });
        });

        it("patches the resource on successful authentication", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);

            setupSpRespondWithPaosRequest("PATCH", 1, true, serverResponder);
            setupIdPRespondWithAuthSuccess();
            setupSpSSORespondWithOK();

            client.patch(TestData.SP_RESOURCE_URL, TestData.PATCH_DATA, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.calledTwice(spResourceRequestSpy);
                sinon.assert.calledWith(spResourceRequestSpy, sinon.match.any, TestData.PATCH_DATA);
                sinon.assert.notCalled(clientConfig.onEcpAuth);
                sinon.assert.calledOnce(clientConfig.onSuccess);
                sinon.assert.calledWith(clientConfig.onSuccess, TestData.SP_RESOURCE);
                clientConfig.assertNoErrors();
            });
        });

        it("deletes the resource on successful authentication", function (done) {

            var serverResponder = new STE.AsyncServerResponder(server, done);

            setupSpRespondWithPaosRequest("DELETE", 1, true, serverResponder);
            setupIdPRespondWithAuthSuccess();
            setupSpSSORespondWithOK();

            client.delete(TestData.SP_RESOURCE_URL, TestData.DELETE_DATA, clientConfig);

            serverResponder.waitUntilDone(function() {
                sinon.assert.calledTwice(spResourceRequestSpy);
                sinon.assert.calledWith(spResourceRequestSpy, sinon.match.any, TestData.DELETE_DATA);
                sinon.assert.notCalled(clientConfig.onEcpAuth);
                sinon.assert.calledOnce(clientConfig.onSuccess);
                sinon.assert.calledWith(clientConfig.onSuccess, TestData.SP_RESOURCE);
                clientConfig.assertNoErrors();
            });
        });
    });
});
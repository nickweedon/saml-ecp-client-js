saml-ecp-client-js
==================
This javascript library provides a client to facilitate SAML based authentication using the ECP (extended client proxy) profile.


TODO
====
* Dumb down the client a little by changing it so that it no longer attempts to work out whether you are already
  authenticated and automatically retry etc and instead break it up into separate functions so that you can instead
  for instance ask the library if the the HTTP response is a SAML auth request leave it to the caller to call
  the library again with the request.
* Add lots more error checking unit tests to test for things like 404s and bad responses at various points in the
  communication.

TODO ECP Functionality
======================
* Look into 'RelayState'
* Provide support for additional client PAOS HTTP headers such as:
** "urn:oasis:names:tc:SAML:2.0:profiles:SSO:ecp:2.0:WantAuthnRequestsSigned
** Holder of key (what is it)?
** Channel binding?? (maybe no support for this)
* Possibly provide support for SP issuing a list of IDPs to choose from
* Possibly provide support for the IDP returning HTML as a response
* Report SOAP errors returned by the IdP. Easiest way to reproduce this is to do a 'replace' on something in the PAOS
 AuthnRequest XML block which will cause signature validation to fail. Then use the resulting SOAP error in unit tests.
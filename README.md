saml-ecp-js
===========
This javascript library provides a client to facilitate SAML based authentication using the ECP (extended client proxy) profile.


TODO
====
* Dumb down the client a little by changing it so that it no longer attempts to work out whether you are already
  authenticated and automatically retry etc and instead break it up into separate functions so that you can instead
  for instance ask the library if the the HTTP response is a SAML auth request leave it to the caller to call
  the library again with the request.
* Add lots more error checking unit tests to test for things like 404s and bad responses at various points in the
  communication.
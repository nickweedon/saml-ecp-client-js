var samlEcpClientJs = samlEcpClientJs || {};

/////////////////// Public constants ///////////////////////////

samlEcpClientJs.ECP_ERROR = {
	IDP_RESPONSE_ERROR : -1,
	CONSUMER_URL_MISMATCH : -2,
	CLIENT_CONFIG_ERROR : -3
};

// SAML 2 status codes (see https://msdn.microsoft.com/en-us/library/hh269642.aspx)
samlEcpClientJs.SAML2_STATUS = {
	// Top-level status codes
	SUCCESS : "urn:oasis:names:tc:SAML:2.0:status:Success",
	REQUESTER : "urn:oasis:names:tc:SAML:2.0:status:Requester",
	RESPONDER : "urn:oasis:names:tc:SAML:2.0:status:Responder",
	VERSION_MISMATCH : "urn:oasis:names:tc:SAML:2.0:status:VersionMismatch",
		
	// Second-level status codes
	AUTHN_FAILED : "urn:oasis:names:tc:SAML:2.0:status:AuthnFailed",
	INVALID_ATTR_NAME_OR_VALUE : "urn:oasis:names:tc:SAML:2.0:status:InvalidAttrNameOrValue",
	INVALID_NAME_ID_POLICY : "urn:oasis:names:tc:SAML:2.0:status:InvalidNameIDPolicy",
	NO_AUTHN_CONTEXT : "urn:oasis:names:tc:SAML:2.0:status:NoAuthnContext",
	NO_AVAILABLE_IDP : "urn:oasis:names:tc:SAML:2.0:status:NoAvailableIDP",
	NO_PASSIVE : "urn:oasis:names:tc:SAML:2.0:status:NoPassive",
	NO_SUPPORTED_IDP : "urn:oasis:names:tc:SAML:2.0:status:NoSupportedIDP",
	PARTIAL_LOGOUT : "urn:oasis:names:tc:SAML:2.0:status:PartialLogout",
	PROXY_COUNT_EXCEEDED : "urn:oasis:names:tc:SAML:2.0:status:ProxyCountExceeded",
	REQUEST_DENIED : "urn:oasis:names:tc:SAML:2.0:status:RequestDenied",
	REQUEST_UNSUPPORTED : "urn:oasis:names:tc:SAML:2.0:status:RequestUnsupported",
	REQUEST_VERSION_DEPRECATED : "urn:oasis:names:tc:SAML:2.0:status:RequestVersionDeprecated",
	REQUEST_VERSION_TOO_HIGH : "urn:oasis:names:tc:SAML:2.0:status:RequestVersionTooHigh",
	REQUEST_VERSION_TOO_LOW : "urn:oasis:names:tc:SAML:2.0:status:RequestVersionTooLow",
	RESOURCE_NOT_RECOGNIZED : "urn:oasis:names:tc:SAML:2.0:status:ResourceNotRecognized",
	TOO_MANY_RESPONSES : "urn:oasis:names:tc:SAML:2.0:status:TooManyResponses",
	UNKNOWN_ATTR_PROFILE : "urn:oasis:names:tc:SAML:2.0:status:UnknownAttrProfile",
	UNKNOWN_PRINCIPAL : "urn:oasis:names:tc:SAML:2.0:status:UnknownPrincipal",
	UNSUPPORTED_BINDING : "urn:oasis:names:tc:SAML:2.0:status:UnsupportedBinding"
};

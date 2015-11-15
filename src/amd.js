define('saml-ecp-js', 
    
	[],
    // module definition function
    // dependencies (foo and bar) are mapped to function parameters
    function () {

        var samlEcpJs = samlEcpJs || {};

        //@@include('base64.js')
        //@@include('constant.js')
        //@@include('client.js')

        return samlEcpJs;
    }
);
define('saml-ecp-client-js',
    
	[],
    // module definition function
    // dependencies (foo and bar) are mapped to function parameters
    function () {

        var samlEcpClientJs = samlEcpClientJs || {};

        //@@include('base64.js')
        //@@include('constant.js')
        //@@include('client.js')

        return samlEcpClientJs;
    }
);


var samlEcpJs = samlEcpJs || {};

samlEcpJs.client = function(){
 
	this.msg = 'Yay! it is now working!';
	
    this.doStuff = function() {

    	
    	/*
    	$.soap({
    	    url: 'http://www.google.com/soapservices/',
    	    method: 'helloWorld',

    	    data: {
    	        name: 'Remy Blom',
    	        msg: 'Hi!'
    	    },

    	    success: function (soapResponse) {
    	    	
    	    	console.debug("Yay!");
    	        // do stuff with soapResponse
    	        // if you want to have the response as JSON use soapResponse.toJSON();
    	        // or soapResponse.toString() to get XML string
    	        // or soapResponse.toXML() to get XML DOM
    	    },
    	    error: function (SOAPResponse) {
    	    	
    	    	console.debug("Error!");
    	    	
    	        // show error
    	    }
    	});
    	*/
    	
    	
    	console.log(this.msg);
    };
}; 

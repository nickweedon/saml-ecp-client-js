var tests = [];
for (var file in window.__karma__.files) {
    if (window.__karma__.files.hasOwnProperty(file)) {
        if (/Test\.js$/.test(file)) {
            tests.push(file);
        }
    }
}

require.config({

    // Required for Karma only (fix this)
    baseUrl: '/base/test',

    shim: {
        'jquery-colorbox' : {
            deps : ['jquery']
        }
    },
    paths: {
        jquery: "../bower_components/jquery/dist/jquery",
        requirejs: "../bower_components/requirejs/require",
        "saml-ecp-client-js": "../dist/saml-ecp-client-js",
        "SinonTestExt" : "util/SinonTestExt",
        "SamlTestData" : "data/SamlTestData",
        "jquery-colorbox": "../bower_components/jquery-colorbox/jquery.colorbox",
        underscore: '../bower_components/underscore/underscore'
    },
    packages: [
    ],

    // ask Require.js to load these files (all our tests)
    deps: tests,

    // start test run, once Require.js is done
    callback: window.__karma__.start

});

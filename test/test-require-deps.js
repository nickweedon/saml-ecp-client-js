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
        },
        'saml-ecp-js' : {
            deps : ['jquery-colorbox']
        }
    },
    paths: {
        jquery: "../bower_components/jquery/dist/jquery",
        requirejs: "../bower_components/requirejs/require",
        "saml-ecp-js": "../dist/saml-ecp-js",
        "SinonTestExt" : "util/SinonTestExt",
        "SamlTestConstant" : "data/SamlTestConstant",
        "jquery-colorbox": "../bower_components/jquery-colorbox/jquery.colorbox"
    },
    packages: [
    ],

    // ask Require.js to load these files (all our tests)
    deps: tests,

    // start test run, once Require.js is done
    callback: window.__karma__.start

});

require.config({
  shim: {
    'jquery-colorbox': {
      deps: [
        'jquery'
      ]
    },
    'saml-ecp-client-js': {
      deps: [
        'jquery-colorbox'
      ]
    }
  },
  paths: {
    jquery: '../../bower_components/jquery/dist/jquery',
    requirejs: '../../bower_components/requirejs/require',
    'saml-ecp-client-js': '../../dist/saml-ecp-client-js',
    'jquery-colorbox': '../../bower_components/jquery-colorbox/jquery.colorbox',
    underscore: '../../bower_components/underscore/underscore'
  },
  packages: [

  ]
});

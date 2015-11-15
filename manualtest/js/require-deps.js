require.config({
  shim: {
    'jquery-colorbox': {
      deps: [
        'jquery'
      ]
    },
    'saml-ecp-js': {
      deps: [
        'jquery-colorbox'
      ]
    }
  },
  paths: {
    jquery: '../../bower_components/jquery/dist/jquery',
    requirejs: '../../bower_components/requirejs/require',
    'saml-ecp-js': '../../dist/saml-ecp-js',
    'jquery-colorbox': '../../bower_components/jquery-colorbox/jquery.colorbox',
    underscore: '../../bower_components/underscore/underscore'
  },
  packages: [

  ]
});

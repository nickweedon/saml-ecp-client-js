// Karma configuration
// Generated on Sat Oct 17 2015 11:50:54 GMT+1000 (E. Australia Standard Time)

module.exports = function(config) {
  'use strict';
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: [ 'requirejs', 'mocha', 'chai', 'sinon', 'sinon-expect' ],

    // list of files / patterns to load in the browser
    files: [
      {pattern: 'src/**/*.js', included: false},
      {pattern: 'test/*Test.js', included: false},
      {pattern: 'test/test-require-deps.js', included: true},
      {pattern: 'test/util/*.js', included: false},
      {pattern: 'test/data/*.js', included: false},
      {pattern: 'bower_components/**/*.js', included: false},
      {pattern: 'dist/**/*.js', included: false}
    ],

    // list of files to exclude
    exclude: [
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress', 'junit'],

    // the default configuration
    junitReporter: {
      outputDir: 'test_output', // results will be saved as $outputDir/$browserName.xml
      suite: 'samlEcpClientJs', // suite will become the package name attribute in xml testsuite element
      useBrowserName: true // add browser name to report and classes names
    },

    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,

    client: {
      mocha: {
        //reporter: 'html', // change Karma's debug.html to the mocha web reporter
        //ui: 'tdd',
        timeout: 2000
      }
    },

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    browserNoActivityTimeout: 10000,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['PhantomJS'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true
  })
};

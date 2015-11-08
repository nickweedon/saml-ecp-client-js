// Karma configuration
// Generated on Sat Oct 17 2015 11:50:54 GMT+1000 (E. Australia Standard Time)

module.exports = function(config) {
  'use strict';
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    //frameworks: [ 'mocha', 'chai' ],
    frameworks: [ 'jasmine' ],
    //frameworks: [ 'qunit' ],

    plugins: [
        'karma-jasmine',
        'karma-nodewebkit-launcher'
    ],

    // list of files / patterns to load in the browser
    files: [
      {pattern: 'src/**/*.js', included: false},
      {pattern: 'test/*Test.js', included: true}
    ],

    /*
    proxies: {
      "/data/": "/base/test/data/"
    },
    */


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
    reporters: [ 'progress' ],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    //browserNoActivityTimeout: 500,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    //browsers: ['PhantomJS'],
    browsers: ['NodeWebkit'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true
  })
}

'use strict';

module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    api: ['./index.js', './server/**/*.js'],
    modules: ['./lib/**/*.js'],
    tests: ['./test/**/*.js'],
    specs: ['./spec/**/*.js'],
    eslint: {
      target: ['./*.js', '<%= api %>', '<%= modules %>', '<%= tests %>', '<%= specs %>']
    },
    env: {
      test: {
        RESPONSE_FAIL_ACTION: 'error',
        SEARCH_API_SVC_SERVICE_HOST: 'localhost',
        SEARCH_API_SVC_SERVICE_PORT: 9000,
        PRODUCTS_API_SVC_SERVICE_HOST: 'localhost',
        PRODUCTS_API_SVC_SERVICE_PORT: 9001,
        SUPPLIERS_API_SVC_SERVICE_HOST: 'localhost',
        SUPPLIERS_API_SVC_SERVICE_PORT: 9002,
        CUSTOMERS_API_SVC_SERVICE_HOST: 'localhost',
        CUSTOMERS_API_SVC_SERVICE_PORT: 9003,
        BIGWEDNESDAY_JWT_SECRET: 'SECRET',
        BIGWEDNESDAY_JWT: '4383008727',
        SEARCH_API_TOKEN: '2761266339'
      }
    },
    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
          clearRequireCache: false
        },
        src: ['<%= tests %>']
      },
      spec: {
        options: {
          reporter: 'spec',
          clearRequireCache: false
        },
        src: ['<%= specs %>']
      }
    },
    watch: {
      tests: {
        files: ['<%= modules %>', '<%= tests %>'],
        tasks: ['lint', 'test']
      },
      specs: {
        files: ['<%= api %>', '<%= specs %>'],
        tasks: ['lint', 'spec']
      }
    },
    retire: {
      node: ['node']
    }
  });

  grunt.registerTask('lint', 'eslint');
  grunt.registerTask('test', ['env:test', 'mochaTest:test']);
  grunt.registerTask('spec', ['env:test', 'mochaTest:spec']);
  grunt.registerTask('default', ['lint', 'test', 'spec']);
  grunt.registerTask('ci', ['default', 'retire']);
};

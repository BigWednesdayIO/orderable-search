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
        INDEXER_PORT: 8888,
        RESPONSE_FAIL_ACTION: 'error'
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

module.exports = function(grunt) {

  grunt.initConfig({
    jshint: {
      files: [
        'src/*.js',
        'test/*.js'
      ],
      options: {
        node: true,
        browser: true,
        globals: {
          '_': true,
          'd3': true,
          'queue': true
        }
      }
    },
    watch: {
      files: ['<%= jshint.files %>'],
      tasks: ['default', 'http-server'],
      options: {
        atBegin: true,
        interrupt: true
      }
    },
    'http-server': {
      'dev': {
        port: 8000
      }
    },
    mochaTest: {
      test: {
        options: {
          reporter: 'spec'
        },
        src: ['test/*.js']
      }
    },
    /* browserify and browserify-shim config is in package.json */
    browserify: {
      'build/bundled.js': 'src/*.js'
    },
    uglify: {
      my_target: {
        files: {
          'build/bundled.min.js': ['build/bundled.js']
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-http-server');

  grunt.registerTask('default', ['jshint', 'mochaTest', 'browserify', 'uglify']);

};


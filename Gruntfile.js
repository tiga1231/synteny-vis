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
        port: 8000,
        root: 'build'
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
    },
    cdnify: {
      dev: {
        options: {
          rewriter: function(url) {
            if(url.indexOf('d3') > -1)
              return 'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.6/d3.min.js';
            if(url.indexOf('queue') > -1)
              return 'https://cdnjs.cloudflare.com/ajax/libs/queue-async/1.0.7/queue.min.js';
            if(url.indexOf('lodash') > -1)
              return 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/3.10.1/lodash.min.js';
            return url;
          }
        },
        src: 'build/index.html',
        dest: 'build/index.html'
      }
    },
    copy: {
      main: {
        files: [{
          src: 'style.css',
          dest: 'build/'
        }, {
          src: 'index.html',
          dest: 'build/'
        }, {
          expand: true,
          src: 'lib/**',
          dest: 'build/'
        }, {
          expand: true,
          src: 'data/**',
          dest: 'build/'
        }, {
          expand: true,
          src: 'lengths/**',
          dest: 'build/'
        }]
      }
    },
    clean: ['build/*']
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-http-server');
  grunt.loadNpmTasks('grunt-cdnify');

  grunt.registerTask('core', ['jshint', 'mochaTest', 'browserify', 'uglify']);
  grunt.registerTask('default', ['core', 'copy']);
  grunt.registerTask('prod', ['default', 'cdnify']);

};


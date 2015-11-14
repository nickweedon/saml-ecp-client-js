module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		concat: {
			options: {
				separator: ';'
			},
			dist: {
				src: ['src/base64.js', 'src/constant.js', 'src/client.js', 'src/amd.js'],
				dest: 'dist/<%= pkg.name %>.js'
			}
		},
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
			},
			dist: {
				src: 'dist/<%= pkg.name %>.js',
				dest: 'dist/<%= pkg.name %>.min.js'
			}
		},
		jshint: {
		    all: ['src/**/*.js']
		},
		"bower-install-simple": {
	        options: {
	            color: true
	        },
	        "prod": {
	            options: {
	                production: true
	            }
	        },
	        "dev": {
	            options: {
	                production: false
	            }
	        }
	    },
	    connect: {
	    	server: {
	    	      options: {
	    	    	keepalive: true,
	    	        port: 8020
	    	      }
	    	}	    	
	    }
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks("grunt-bower-install-simple");
	grunt.loadNpmTasks('grunt-contrib-connect');
	
	// Default task(s).
	grunt.registerTask('default', ['jshint', 'concat', 'uglify']);
	grunt.registerTask('compile', ['jshint', 'concat', 'uglify']);
	grunt.registerTask('bower-install', ['bower-install-simple']);
	grunt.registerTask('test', ['default', 'bower-install-simple', 'connect']);
};

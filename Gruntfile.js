module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		includereplace: {
			dist : {
				options: {
					includesDir: "src",
					prefix: "//@@"
				},
				// Files to perform replacements and includes with
				src: 'src/**/*.js',
				// Destination directory to copy files to
				dest: 'obj/'
			}
		},
		copy: {
			dist: {
				files: [{
					expand: true,
					src: 'obj/src/amd.js',
					rename: function(dest, src) {
						return "dist/<%= pkg.name %>.js";
					}
				}]
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
	grunt.loadNpmTasks('grunt-include-replace');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks("grunt-bower-install-simple");
	grunt.loadNpmTasks('grunt-contrib-connect');
	
	// Default task(s).
	grunt.registerTask('default', ['jshint', 'includereplace', 'copy', 'uglify']);
	grunt.registerTask('compile', ['jshint', 'includereplace', 'copy']);
	grunt.registerTask('bower-install', ['bower-install-simple']);
	grunt.registerTask('test', ['default', 'bower-install-simple', 'connect']);
};

/* global tinymce, MediaElementPlayer, WPPlaylistView */

/**
 * Note: this API is "experimental" meaning that it will probably change
 * in the next few releases based on feedback from 3.9.0.
 * If you decide to use it, please follow the development closely.
 */

window.wp = window.wp || {};

( function( $ ) {
	var views = {},
		instances = {},
		media = wp.media,
		viewOptions = ['encodedText'];

	wp.mce = wp.mce || {};

	/**
	 * wp.mce.View
	 *
	 * A Backbone-like View constructor intended for use when rendering a TinyMCE View. The main difference is
	 * that the TinyMCE View is not tied to a particular DOM node.
	 */
	wp.mce.View = function( options ) {
		var defs;

		options = options || {};
		this.type = options.type;
		this.shortcode = options.shortcode;
		if ( tinymce.settings._shortcodes[ options.type ] ) {
			this.settings = _.clone( tinymce.settings._shortcodes[ options.type ] );
			defs = _.clone( this.settings.attributes );
			_.each( defs, function( object, attribute ) {
				defs[ attribute ] = object.defaults;
			} );
			this.shortcode.attrs.named = _.defaults( this.shortcode.attrs.named, defs );
		}
		_.extend( this, _.pick( options, viewOptions ) );
		this.initialize.apply( this, arguments );
	};

	_.extend( wp.mce.View.prototype, {
		initialize: function() {},
		getHtml: function() {},
		render: function() {
			var html = this.getHtml( this.shortcode.attrs.named, this.shortcode.content, this.shortcode.tag ) || '',
				iframeHTML, loadIframe;

			loadIframe = ( html && html.indexOf( '<script' ) !== -1 ) || ( this.settings && this.settings.scripts );

			if ( loadIframe ) {
				iframeHTML = html;
				html = '';
			}

			html = '<div class="toolbar">' +
				( _.isFunction( this.edit ) ? '<div class="dashicons dashicons-edit edit"></div>' : '' ) +
				'<div class="dashicons dashicons-no-alt remove"></div></div>' + html;

			// Search all tinymce editor instances and update the placeholders
			_.each( tinymce.editors, function( editor ) {
				var self = this;
				if ( editor.plugins.wpview ) {
					/* jshint scripturl: true */
					$( editor.getDoc() ).find( '[data-wpview-text="' + this.encodedText + '"]' ).each( function ( i, element ) {
						var node = $( element ),
							iframe, doc, iframeContent, contentCSS;
						node.html( html );
						if ( loadIframe ) {
							iframe = editor.dom.add( element, 'iframe', {
								src: 'javascript:""',
								frameBorder: '0',
								allowTransparency: 'true',
								style: {
									width: '100%',
									height: '400px',
									display: 'block'
								}
							} );
							contentCSS = [ tinymce.settings.iframeViewCSS ];
							iframeContent = '<!DOCTYPE html><html><head>';
							iframeContent += '<meta charset="utf-8" />';
							for ( i = 0; i < contentCSS.length; i++ ) {
								iframeContent += '<link type="text/css" rel="stylesheet" href="' + contentCSS[i] + '" />';
							}
							if ( self.settings.scripts ) {
								for ( i = 0; i < self.settings.scripts.length; i++ ) {
									iframeContent += '<script type="text/javascript" src="' + tinymce.settings._scripts[ self.settings.scripts[i] ].src + '"></script>';
								}
							}
							if ( self.settings.previewjs ) {
								iframeContent += '<script type="text/javascript" src="' + self.settings.previewjs + '"></script>';
							}
							iframeContent += '</head><body onload="">' + iframeHTML + '</body></html>';
							iframe.contentWindow.attributes = self.shortcode.attrs.named;
							doc = iframe.contentWindow.document;
							doc.open();
							doc.write( iframeContent );
							doc.close();
							node.append( '<div class="wpview-overlay"></div>' );
						}
						// The <ins> is used to mark the end of the wrapper div. Needed when comparing
						// the content as string for preventing extra undo levels.
						node.append( '<ins data-wpview-end="1"></ins>' );
						$( self ).trigger( 'ready', element );
					} );
				}
			}, this );
		},
		unbind: function() {}
	} );

	// take advantage of the Backbone extend method
	wp.mce.View.extend = Backbone.View.extend;

	/**
	 * wp.mce.views
	 *
	 * A set of utilities that simplifies adding custom UI within a TinyMCE editor.
	 * At its core, it serves as a series of converters, transforming text to a
	 * custom UI, and back again.
	 */
	wp.mce.views = {

		/**
		 * wp.mce.views.register( type, view )
		 *
		 * Registers a new TinyMCE view.
		 *
		 * @param type
		 * @param constructor
		 */
		register: function( type, constructor ) {
			var defaultConstructor  = {
					shortcode: type,
					type: type,
					toView: function( content ) {
						var match = wp.shortcode.next( type, content );

						if ( ! match ) {
							return;
						}

						return {
							index: match.index,
							content: match.content,
							options: {
								shortcode: match.shortcode
							}
						};
					}
				};

			if ( constructor && ! constructor.View ) {
				constructor.View = constructor;
			}

			constructor = constructor ? _.extend( defaultConstructor, constructor ) : defaultConstructor;

			constructor.View = wp.mce.View.extend( constructor.View );

			views[ type ] = constructor;
		},

		/**
		 * wp.mce.views.get( id )
		 *
		 * Returns a TinyMCE view constructor.
		 */
		get: function( type ) {
			return views[ type ];
		},

		/**
		 * wp.mce.views.unregister( type )
		 *
		 * Unregisters a TinyMCE view.
		 */
		unregister: function( type ) {
			delete views[ type ];
		},

		/**
		 * wp.mce.views.unbind( editor )
		 *
		 * The editor DOM is being rebuilt, run cleanup.
		 */
		unbind: function() {
			_.each( instances, function( instance ) {
				instance.unbind();
			} );
		},

		/**
		 * toViews( content )
		 * Scans a `content` string for each view's pattern, replacing any
		 * matches with wrapper elements, and creates a new instance for
		 * every match, which triggers the related data to be fetched.
		 */
		toViews: function( content ) {
			var pieces = [ { content: content } ],
				current;

			_.each( views, function( view, viewType ) {
				current = pieces.slice();
				pieces  = [];

				_.each( current, function( piece ) {
					var remaining = piece.content,
						result;

					// Ignore processed pieces, but retain their location.
					if ( piece.processed ) {
						pieces.push( piece );
						return;
					}

					// Iterate through the string progressively matching views
					// and slicing the string as we go.
					while ( remaining && ( result = view.toView( remaining ) ) ) {
						// Any text before the match becomes an unprocessed piece.
						if ( result.index ) {
							pieces.push({ content: remaining.substring( 0, result.index ) });
						}

						// Add the processed piece for the match.
						pieces.push( {
							content: wp.mce.views.toView( viewType, result.content, result.options ),
							processed: true
						} );

						// Update the remaining content.
						remaining = remaining.slice( result.index + result.content.length );
					}

					// There are no additional matches. If any content remains,
					// add it as an unprocessed piece.
					if ( remaining ) {
						pieces.push({ content: remaining });
					}
				} );
			} );

			return _.pluck( pieces, 'content' ).join( '' );
		},

		/**
		 * Create a placeholder for a particular view type
		 *
		 * @param viewType
		 * @param text
		 * @param options
		 *
		 */
		toView: function( viewType, text, options ) {
			var view = wp.mce.views.get( viewType ),
				encodedText = window.encodeURIComponent( text ),
				instance, viewOptions;

			if ( ! view ) {
				return text;
			}

			if ( ! wp.mce.views.getInstance( encodedText ) ) {
				viewOptions = options;
				viewOptions.encodedText = encodedText;
				viewOptions.type = viewType;
				instance = new view.View( viewOptions );
				instances[ encodedText ] = instance;
			}

			return wp.html.string( {
				tag: 'div',
				attrs: {
					'class': 'wpview-wrap wpview-type-' + viewType,
					'data-wpview-text': encodedText,
					'data-wpview-type': viewType,
					'contenteditable': 'false'
				},
				content: '\u00a0'
			} );
		},

		/**
		 * Refresh views after an update is made
		 *
		 * @param view {object} being refreshed
		 * @param text {string} textual representation of the view
		 */
		refreshView: function( instance, text, node ) {
			var encodedText, newInstance, viewOptions, result;

			encodedText = window.encodeURIComponent( text );

			// Update the node's text.
			$( node ).attr( 'data-wpview-text', encodedText );

			if ( ! this.getInstance( encodedText ) ) {
				// Parse the text.
				result = views[ instance.type ].toView( text );
				viewOptions = result.options;
				viewOptions.encodedText = encodedText;

				// Create a new instance.
				newInstance = new views[ instance.type ].View( viewOptions );
				instances[ encodedText ] = newInstance;
			}

			wp.mce.views.render();
		},

		getInstance: function( encodedText ) {
			return instances[ encodedText ];
		},

		/**
		 * render( scope )
		 *
		 * Renders any view instances inside a DOM node `scope`.
		 *
		 * View instances are detected by the presence of wrapper elements.
		 * To generate wrapper elements, pass your content through
		 * `wp.mce.view.toViews( content )`.
		 */
		render: function() {
			_.each( instances, function( instance ) {
				instance.render();
			} );
		},

		edit: function( node ) {
			var encodedText = $( node ).attr( 'data-wpview-text' ),
				text = window.decodeURIComponent( encodedText ),
				instance = this.getInstance( encodedText );

			if ( instance && _.isFunction( instance.edit ) ) {
				instance.edit( text, node );
			}
		}
	};

	wp.mce.views.register( 'gallery', {
		template: media.template( 'view-gallery' ),
		postID: $( '#post_ID' ).val(),

		initialize: function( options ) {
			this.shortcode = options.shortcode;
			this.fetch();
		},

		fetch: function() {
			this.attachments = wp.media.gallery.attachments( this.shortcode, this.postID );
			this.dfd = this.attachments.more().done( _.bind( this.render, this ) );
		},

		getHtml: function( attributes ) {
			var attachments = false,
				options;

			// Don't render errors while still fetching attachments
			if ( this.dfd && 'pending' === this.dfd.state() && ! this.attachments.length ) {
				return;
			}

			if ( this.attachments.length ) {
				attachments = this.attachments.toJSON();

				_.each( attachments, function( attachment ) {
					if ( attachment.sizes ) {
						if ( attachment.sizes.thumbnail ) {
							attachment.thumbnail = attachment.sizes.thumbnail;
						} else if ( attachment.sizes.full ) {
							attachment.thumbnail = attachment.sizes.full;
						}
					}
				} );
			}

			options = {
				attachments: attachments,
				columns: attributes.columns ? parseInt( attributes.columns, 10 ) : 3
			};

			return this.template( options );
		},

		edit: function( text, node ) {
			var gallery = wp.media.gallery,
				self = this,
				frame;

			frame = gallery.edit( text );

			frame.state( 'gallery-edit' ).on( 'update', function( selection ) {
				wp.mce.views.refreshView( self, gallery.shortcode( selection ).string(), node );
				frame.detach();
			} );
		}
	} );

	/**
	 * These are base methods that are shared by each shortcode's MCE controller
	 *
	 * @mixin
	 */
	wp.mce.av = _.extend( wp.media.mixin, {
		loaded: false,

		initialize: function() {
			this.players = [];
			_.bindAll( this, 'setPlayer' );
			$( this ).on( 'ready', this.setPlayer );
		},

		/**
		 * Creates the player instance for the current node
		 *
		 * @global MediaElementPlayer
		 * @global _wpmejsSettings
		 *
		 * @param {Event} event
		 * @param {HTMLElement} node
		 */
		setPlayer: function( event, node ) {
			// if the ready event fires on an empty node
			if ( ! node ) {
				return;
			}

			var self = this,
				media,
				firefox = this.ua.is( 'ff' ),
				className = '.wp-' +  this.shortcode.tag + '-shortcode';

			media = $( node ).find( className );

			if ( ! this.isCompatible( media ) ) {
				media.closest( '.wpview-wrap' ).addClass( 'wont-play' );
				if ( ! media.parent().hasClass( 'wpview-wrap' ) ) {
					media.parent().replaceWith( media );
				}
				media.replaceWith( '<p>' + media.find( 'source' ).eq( 0 ).prop( 'src' ) + '</p>' );
				return;
			} else {
				media.closest( '.wpview-wrap' ).removeClass( 'wont-play' );
				if ( firefox ) {
					media.prop( 'preload', 'metadata' );
				} else {
					media.prop( 'preload', 'none' );
				}
			}

			media = wp.media.view.MediaDetails.prepareSrc( media.get(0) );

			setTimeout( function() {
				wp.mce.av.loaded = true;
				self.players.push( new MediaElementPlayer( media, self.mejsSettings ) );
			}, self.loaded ? 10 : 500 );
		},

		/**
		 * Pass data to the View's Underscore template and return the compiled output
		 *
		 * @returns {string}
		 */
		getHtml: function( attributes, content, tag ) {
			attributes.content = content;

			return this.template( {
				model: _.defaults( attributes, wp.media[ tag ].defaults )
			} );
		},

		unbind: function() {
			this.unsetPlayers();
		},

		edit: function( text, node ) {
			var media = wp.media[ this.type ],
				self = this,
				frame, callback;

			wp.media.mixin.pauseAllPlayers();

			frame = media.edit( text );

			console.log( text, frame );

			frame.on( 'close', function() {
				frame.detach();
			} );

			callback = function( selection ) {
				wp.mce.views.refreshView( self, wp.media[ self.type ].shortcode( selection ).string(), node );
				frame.detach();
			};

			if ( _.isArray( self.state ) ) {
				_.each( self.state, function ( state ) {
					frame.state( state ).on( 'update', callback );
				} );
			} else {
				frame.state( self.state ).on( 'update', callback );
			}

			frame.open();
		}
	} );

	/**
	 * TinyMCE handler for the audio shortcode
	 *
	 * @mixes wp.mce.av
	 */
	wp.mce.views.register( 'audio', _.extend( {}, wp.mce.av, {
		state: 'audio-details',
		template: media.template( 'view-audio' )
	} ) );

	/**
	 * TinyMCE handler for the video shortcode
	 *
	 * @mixes wp.mce.av
	 */
	wp.mce.views.register( 'video', _.extend( {}, wp.mce.av, {
		state: 'video-details',
		template: media.template( 'view-video' )
	} ) );

	/**
	 * TinyMCE handler for the playlist shortcode
	 *
	 * @mixes wp.mce.av
	 */
	wp.mce.views.register( 'playlist', _.extend( {}, wp.mce.av, {
		state: ['playlist-edit', 'video-playlist-edit'],
		template: media.template( 'view-playlist' ),

		initialize: function() {
			this.players = [];
			this.data = {};
			this.attachments = [];
			this.fetch();
			_.bindAll( this, 'setPlaylist' );
			$( this ).on( 'ready', this.setPlaylist );
		},

		setPlaylist: function( event, element ) {
			if ( ! this.data.tracks ) {
				return;
			}

			this.players.push( new WPPlaylistView( {
				el: $( element ).find( '.wp-playlist' ).get( 0 ),
				metadata: this.data
			} ).player );
		},

		/**
		 * Asynchronously fetch the shortcode's attachments
		 */
		fetch: function() {
			this.attachments = wp.media.playlist.attachments( this.shortcode );
			this.dfd = this.attachments.more().done( _.bind( this.render, this ) );
		},

		/**
		 * Set the data that will be used to compile the Underscore template,
		 *  compile the template, and then return it.
		 *
		 * @returns {string}
		 */
		getHtml: function( attributes ) {
			var model = wp.media.playlist,
				options,
				attachments,
				tracks = [];

			// Don't render errors while still fetching attachments
			if ( this.dfd && 'pending' === this.dfd.state() && ! this.attachments.length ) {
				return;
			}

			_.each( model.defaults, function( value, key ) {
				attributes[ key ] = model.coerce( attributes, key );
			} );

			options = {
				type: attributes.type,
				style: attributes.style,
				tracklist: attributes.tracklist,
				tracknumbers: attributes.tracknumbers,
				images: attributes.images,
				artists: attributes.artists
			};

			if ( ! this.attachments.length ) {
				return this.template( options );
			}

			attachments = this.attachments.toJSON();

			_.each( attachments, function( attachment ) {
				var size = {}, resize = {}, track = {
					src : attachment.url,
					type : attachment.mime,
					title : attachment.title,
					caption : attachment.caption,
					description : attachment.description,
					meta : attachment.meta
				};

				if ( 'video' === attributes.type ) {
					size.width = attachment.width;
					size.height = attachment.height;
					if ( media.view.settings.contentWidth ) {
						resize.width = media.view.settings.contentWidth - 22;
						resize.height = Math.ceil( ( size.height * resize.width ) / size.width );
						if ( ! options.width ) {
							options.width = resize.width;
							options.height = resize.height;
						}
					} else {
						if ( ! options.width ) {
							options.width = attachment.width;
							options.height = attachment.height;
						}
					}
					track.dimensions = {
						original : size,
						resized : _.isEmpty( resize ) ? size : resize
					};
				} else {
					options.width = 400;
				}

				track.image = attachment.image;
				track.thumb = attachment.thumb;

				tracks.push( track );
			} );

			options.tracks = tracks;
			this.data = options;

			return this.template( options );
		},

		unbind: function() {
			this.unsetPlayers();
		}
	} ) );

	wp.mce.views.register( 'more', {
		View: {
			getHtml: function() {
				return '<p><span>MORE</span></p>';
			}
		}
	} );

	wp.mce.views.register( 'nextpage', {
		View: {
			getHtml: function() {
				return '<p><span>NEXT PAGE</span></p>';
			}
		}
	} );

} )( jQuery );

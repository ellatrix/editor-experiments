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
		var defs, self = this;

		options = options || {};
		this.type = options.type;
		if ( options.shortcode ) {
			this.shortcode = options.shortcode;
			if ( tinymce.settings._shortcodes[ options.type ] ) {
				this.settings = _.clone( tinymce.settings._shortcodes[ options.type ] );
				defs = _.clone( this.settings.attributes );
				_.each( defs, function( object, attribute ) {
					defs[ attribute ] = object.defaults;
				} );
				this.shortcode.attrs.named = _.defaults( this.shortcode.attrs.named, defs );
			}
			_.each( this.shortcode.attrs.named, function( value, key ) {
				self.shortcode.attrs.named[ key ] = value === 'false' ? false : value;
			} );
		}
		_.extend( this, _.pick( options, viewOptions ) );
		this.options = options;
		this.initialize.apply( this, arguments );
	};

	_.extend( wp.mce.View.prototype, {
		initialize: function() {},
		getHtml: function() {},
		render: function() {
			var html = this.getHtml.apply( this, _.values( this.options ) ) || '',
				loadIframe = ( html && html.indexOf( '<script' ) !== -1 ) || ( this.settings && this.settings.scripts );

			this.setContent(
				'<p class="wpview-selection-before">\u00a0</p>' +
				'<div class="wpview-body" contenteditable="false">' +
					'<div class="toolbar">' +
						( _.isFunction( views[ this.type ].edit ) ? '<div class="dashicons dashicons-edit edit"></div>' : '' ) +
						'<div class="dashicons dashicons-no-alt remove"></div>' +
					'</div>' +
					'<div class="wpview-content wpview-type-' + this.type + '">' +
						( loadIframe ? '' : html ) +
					'</div>' +
					( this.overlay ? '<div class="wpview-overlay"></div>' : '' ) +
					// The <ins> is used to mark the end of the wrapper div (has to be the last child node).
					// Needed when comparing the content as string for preventing extra undo levels.
					'<ins data-wpview-end="1"></ins>' +
				'</div>' +
				'<p class="wpview-selection-after">\u00a0</p>',
				function( self, editor, node ) {
					$( self ).trigger( 'ready', [ editor, node ] );
				},
				null, true, loadIframe
			);
		},
		refresh: function( attributes, node ) {
			var text, defs, validKeys;
			if ( this.settings.attributes ) {
				defs = _.clone( this.settings.attributes );
				validKeys = [];
				_.each( defs, function( object, attribute ) {
					defs[ attribute ] = object.defaults;
					validKeys.push( attribute );
				} );
				attributes = _.defaults( attributes, defs );
				attributes = _.pick( attributes, validKeys );
			}
			text = '[' + this.type;
			_.each( attributes, function( value, key ) {
				text += ' ' + key + '="' + value + '"';
			} );
			text += ']';
			wp.mce.views.refreshView( this, text, node );
		},
		modal: function( node, callback ) {
			var modal, modalInner,
				self = this,
				template,
				postDivRich = tinymce.DOM.select( '#postdivrich' )[0],
				scrollY = window.pageYOffset,
				postDivRichTop = postDivRich.getBoundingClientRect().top + scrollY,
				postDivRichHeight = postDivRich.offsetHeight,
				windowHeight = window.document.documentElement.clientHeight,
				editorBody = tinymce.activeEditor.getBody();

			wp.editor.fade.Out();

			tinymce.DOM.setStyles( postDivRich, { opacity: 0.1 } );

			modalInner = tinymce.DOM.create( 'DIV', { id: 'wp-block-modal-inner' } );
			modal = tinymce.DOM.create( 'DIV', { id: 'wp-block-modal' }, modalInner );

			tinymce.DOM.setStyles( modalInner, {
				left: tinymce.DOM.getPos( postDivRich ).x + tinymce.activeEditor.dom.getPos( editorBody ).x - 10,
				width: editorBody.offsetWidth + 20
			} );

			document.body.appendChild( modal );

			template = $( '#' + this.type + '-shortcode-edit-template' ).clone();

			$( modalInner ).append( template );

			$.each( this.shortcode.attrs.named, function( key, value ) {
				var input = template.find( 'input[name="' + key + '"]' );
				if ( input ) {
					if ( input.is( ':checkbox' ) ) {
						input.prop( 'checked', value );
					} else {
						input.val( value );
					}
				}
			} );

			template.show();

			template.on( 'submit', function( event ) {
				event.preventDefault();

				$.fn.serializeObject = function() {
					var object = {},
						array = this.serializeArray();
					$.each( array, function() {
						if ( object[ this.name ] !== undefined ) {
							if ( ! object[ this.name ].push ) {
								object[ this.name ] = [ object[ this.name ] ];
							}
							object[ this.name ].push( this.value || '' );
						} else {
							object[ this.name ] = this.value || '';
						}
					} );
					return object;
				};

				self.refresh( jQuery( this ).serializeObject(), node );

				wp.editor.fade.auto();

				tinymce.DOM.removeClass( document.body, 'wp-block-modal-open' );
				tinymce.DOM.setStyles( postDivRich, { opacity: 1 } );
				tinymce.DOM.remove( modal );
			} );

			// We're blocking scrolling for the page, so make sure the block modal is fully in the viewport.
			if ( postDivRichTop - 32 > scrollY ) {
				window.scrollTo( 0, postDivRichTop - 32 ); // Admin bar.
			} else if ( postDivRichTop + postDivRichHeight < scrollY + windowHeight ) {
				window.scrollTo( 0, postDivRichTop + postDivRichHeight - windowHeight );
			}

			tinymce.DOM.addClass( document.body, 'wp-block-modal-open' );

			callback( template );
		},
		unbind: function() {},
		setContent: function( html, callback, replace, setWrap, loadIframe ) {
			_.each( tinymce.editors, function( editor ) {
				var self = this;
				if ( editor.plugins.wpview ) {
					/* jshint scripturl: true */
					$( editor.getBody() )
					.find( '[data-wpview-text="' + this.encodedText + '"]' )
					.each( function ( i, element ) {
						var contentWrap = $( element ).find( '.wpview-content' ),
							wrap = element,
							iframe, doc, iframeContent, contentCSS;

						if ( contentWrap.length && ! setWrap ) {
							element = contentWrap = contentWrap[0];
						}

						if ( _.isString( html ) ) {
							if ( replace ) {
								element = editor.dom.replace( editor.dom.createFragment( html ), wrap );
							} else {
								editor.dom.setHTML( element, html );
							}
						} else {
							if ( replace ) {
								element = editor.dom.replace( html, wrap );
							} else {
								element.appendChild( html );
							}
						}

						element = $( element ).find( '.wpview-content' )[0];

						if ( loadIframe && ! replace ) {
							iframe = editor.dom.add( element, 'iframe', {
								src: 'javascript:""',
								frameBorder: '0',
								allowTransparency: 'true',
								style: {
									width: '100%',
									height: '1px',
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
							iframeContent += '</head><body onload="resize()"></body></html>';
							iframe.contentWindow.attributes = self.shortcode.attrs.named;
							iframe.contentWindow.resize = function() {
								window.parent.postMessage( {
									height: $( iframe.contentWindow.document ).height()
								}, '*' );
							};
							window.addEventListener( 'message', function ( event ) {
								if ( event.data.height ) {
									$( iframe ).height( event.data.height );
								}
							}, false );
							doc = iframe.contentWindow.document;
							doc.open();
							doc.write( iframeContent );
							doc.close();
						}

						if ( _.isFunction( callback ) ) {
							callback( self, editor, element );
						}
					} );
				}
			}, this );
		},
		setError: function( message, dashicon ) {
			this.setContent(
				'<div class="wpview-error">' +
					'<div class="dashicons dashicons-' + ( dashicon ? dashicon : 'no' ) + '"></div>' +
					'<p>' + message + '</p>' +
				'</div>'
			);
		}
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
			var defaultConstructor = {
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
								attributes: match.shortcode.attrs.named,
								content: match.shortcode.content,
								tag: match.shortcode.tag,
								shortcode: match.shortcode
							}
						};
					}
				};

			if ( constructor && ! constructor.View ) {
				constructor.View = constructor;
			}

			constructor = constructor ? _.defaults( constructor, defaultConstructor ) : defaultConstructor;

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
					'class': 'wpview-wrap',
					'data-wpview-text': encodedText,
					'data-wpview-type': viewType
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
				viewOptions.type = instance.type;

				// Create a new instance.
				newInstance = new views[ instance.type ].View( viewOptions );
				instances[ encodedText ] = newInstance;
			}

			this.render();
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

		initialize: function() {
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
		setPlayer: function( event, editor, node ) {
			var self = this,
				media;

			media = $( node ).find( '.wp-' +  this.shortcode.tag + '-shortcode' );

			if ( ! this.isCompatible( media ) ) {
				media.closest( '.wpview-wrap' ).addClass( 'wont-play' );
				media.replaceWith( '<p>' + media.find( 'source' ).eq( 0 ).prop( 'src' ) + '</p>' );
				return;
			} else {
				media.closest( '.wpview-wrap' ).removeClass( 'wont-play' );
				if ( this.ua.is( 'ff' ) ) {
					media.prop( 'preload', 'metadata' );
				} else {
					media.prop( 'preload', 'none' );
				}
			}

			media = wp.media.view.MediaDetails.prepareSrc( media.get( 0 ) );

			setTimeout( function() {
				self.loaded = true;
				self.players.push( new MediaElementPlayer( media, self.mejsSettings ) );
			}, this.loaded ? 10 : 500 );
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


	/**
	 * TinyMCE handler for the embed shortcode
	 */
	wp.mce.embedView = _.extend( {}, wp.media.mixin, {
		overlay: true,
		initialize: function( options ) {
			this.players = [];
			this.content = options.content;
			this.fetching = false;
			this.parsed = false;
			this.original = options.url || options.shortcode.string();

			if ( options.url ) {
				this.shortcode = '[embed]' + options.url + '[/embed]';
			} else {
				this.shortcode = options.shortcode.string();
			}

			_.bindAll( this, 'setHtml', 'setNode', 'fetch' );
			$( this ).on( 'ready', this.setNode );
		},
		unbind: function() {
			var self = this;
			_.each( this.players, function ( player ) {
				player.pause();
				self.removePlayer( player );
			} );
			this.players = [];
		},
		setNode: function () {
			if ( this.parsed ) {
				this.setHtml( this.parsed );
				this.parseMediaShortcodes();
			} else if ( ! this.fetching ) {
				this.fetch();
			}
		},
		fetch: function () {
			var self = this;

			this.fetching = true;

			wp.ajax.send( 'parse-embed', {
				data: {
					post_ID: $( '#post_ID' ).val(),
					content: this.shortcode
				}
			} )
			.done( function( content ) {
				self.fetching = false;

				if ( content.substring( 0, ( '<a href' ).length ) === '<a href' ) {
					if ( self.type === 'embed' ) {
						self.setError( self.original + ' failed to embed.', 'admin-media' );
					} else {
						self.setContent( '<p>' + self.original + '</p>', null, true );
					}
				} else {
					self.parsed = content;
					self.setHtml( content );
				}
			} )
			.fail( function() {
				self.fetching = false;
				self.setError( self.original + ' failed to embed due to a server error.', 'admin-media' );
			} );
		},
		/* jshint scripturl: true */
		setHtml: function ( content ) {
			var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver,
				iframe, iframeDoc, i, resize,
				dom = tinymce.DOM;

			if ( content.indexOf( '<script' ) !== -1 ) {
				iframe = dom.create( 'iframe', {
					src: tinymce.Env.ie ? 'javascript:""' : '',
					frameBorder: '0',
					allowTransparency: 'true',
					style: {
						width: '100%',
						display: 'block'
					}
				} );

				this.setContent( iframe );
				iframeDoc = iframe.contentWindow.document;

				iframeDoc.open();
				iframeDoc.write(
					'<!DOCTYPE html>' +
					'<html>' +
						'<head>' +
							'<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />' +
						'</head>' +
						'<body>' +
							content +
						'</body>' +
					'</html>'
				);
				iframeDoc.close();

				resize = function() {
					$( iframe ).height( $( iframeDoc ).height() );
				};

				if ( MutationObserver ) {
					new MutationObserver( _.debounce( function() {
						resize();
					}, 100 ) )
					.observe( iframeDoc.body, {
						attributes: true,
						childList: true,
						subtree: true
					} );
				} else {
					for ( i = 1; i < 6; i++ ) {
						setTimeout( resize, i * 700 );
					}
				}
			} else {
				this.setContent( content );
			}

			this.parseMediaShortcodes();
		},
		parseMediaShortcodes: function () {
			var self = this;
			$( '.wp-audio-shortcode, .wp-video-shortcode', this.node ).each( function ( i, element ) {
				self.players.push( new MediaElementPlayer( element, self.mejsSettings ) );
			} );
		},
		getHtml: function() {
			return '';
		}
	} );

	wp.mce.embedMixin = {
		View: wp.mce.embedView,
		edit: function( node ) {
			var embed = media.embed,
				self = this,
				frame,
				data,
				isURL = 'embedURL' === this.shortcode;

			$( document ).trigger( 'media:edit' );

			data = window.decodeURIComponent( $( node ).attr('data-wpview-text') );
			frame = embed.edit( data, isURL );
			frame.on( 'close', function() {
				frame.detach();
			} );
			frame.state( 'embed' ).props.on( 'change:url', function (model, url) {
				if ( ! url ) {
					return;
				}
				frame.state( 'embed' ).metadata = model.toJSON();
			} );
			frame.state( 'embed' ).on( 'select', function() {
				var shortcode;

				if ( isURL ) {
					shortcode = frame.state( 'embed' ).metadata.url;
				} else {
					shortcode = embed.shortcode( frame.state( 'embed' ).metadata ).string();
				}
				$( node ).attr( 'data-wpview-text', window.encodeURIComponent( shortcode ) );
				wp.mce.views.refreshView( self, shortcode );
				frame.detach();
			} );
			frame.open();
		}
	};

	wp.mce.views.register( 'embed', _.extend( {}, wp.mce.embedMixin ) );

	wp.mce.views.register( 'embedURL', _.extend( {}, wp.mce.embedMixin, {
		toView: function( content ) {
			var re = /(?:^|<p>)(https?:\/\/[^\s"]+?)(?:<\/p>\s*|$)/gi,
				match = re.exec( tinymce.trim( content ) );

			if ( ! match ) {
				return;
			}

			return {
				index: match.index,
				content: match[0],
				options: {
					url: match[1]
				}
			};
		}
	} ) );

	wp.mce.views.register( 'more', {
		toView: function( content ) {
			var re = /<!--(more|nextpage)(.*?)-->/g,
				match = re.exec( content );

			if ( ! match ) {
				return;
			}

			return {
				index: match.index,
				content: match[0],
				options: {
					_type: match[1],
					text: tinymce.trim( match[2] )
				}
			};
		},
		View: {
			initialize: function( options ) {
				this.text = options.text;
				this._type = options._type;
			},
			getHtml: function() {
				var text;

				if ( this._type === 'nextpage' ) {
					text = 'Page Break';
				} else if ( this.text ) {
					text = this.text;
				} else {
					text = '(more&hellip;)';
				}

				return '<p><span>' + text + '</span></p>';
			}
		}
	} );

} )( jQuery );

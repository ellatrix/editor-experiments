/* global tinymce, fadeOutSurroundings, autoFadeSurroundings */

tinymce.PluginManager.add( 'insert', function( editor ) {

	var insert, insertLocation,
		matchInsert = /<(P|BLOCKQUOTE)[^>]+id="wp-insert-block"[^>]*>[\s\S]*<\/(P|BLOCKQUOTE)>/gi;

	editor.on( 'keyup click ExecCommand AddUndo', function( event ) {

		var dom = editor.dom,
			alignleft, empty, fontSize, offset, range, selection;

		if ( event.type === 'addundo' && ! event.lastlevel ) {
			return;
		}

		if ( event.type === 'click' && ( event.target === insert || event.target.parentNode === insert ) ) {
			event.stopPropagation();
			removeElement();
			editor.selection.setCursorLocation( insertLocation );
			editor.fire( 'wpInsertClicked' );
			return;
		}

		selection = editor.selection.getStart();
		range = editor.selection.getRng();

		if ( selection.nodeName !== 'P' ) {
			selection = dom.getParent( selection, 'P' );
		}

		removeElement();

		if ( ! selection ) {
			return;
		}

		empty = dom.isEmpty( selection );

		if ( selection && empty && selection.nodeName === 'P' ) {
			offset = dom.getPos( selection );
			fontSize = dom.getStyle( selection, 'font-size', true );
			insert = editor.dom.create(
				( selection.parentNode.nodeName === 'BLOCKQUOTE' ? 'BLOCKQUOTE' : 'P' ),
				{
					id: 'wp-insert-block',
					contenteditable: false
				},
				'<span class="dashicons dashicons-plus-alt" style="width: ' + fontSize + ';"></span> Add a content block'
			);
			dom.setStyles( insert, { 'top': offset.y - 2, 'left': offset.x + 10 } );
			editor.getBody().appendChild( insert );
			insertLocation = selection;
		} else if ( range && selection && ! empty && editor.selection.isCollapsed() && range.startOffset === 0 && range.endOffset === 0 ) {
			alignleft = selection.querySelector( '.alignleft' );
			if ( ! alignleft ) {
				offset = dom.getPos( selection );
				fontSize = dom.getStyle( selection, 'font-size', true );
				insert = editor.dom.create(
					'P',
					{
						id: 'wp-insert-block',
						contenteditable: false
					},
					'<span class="dashicons dashicons-plus-alt" style="width: ' + fontSize + ';">'
				);
				dom.setStyles( insert, { 'top': offset.y - 2, 'left': offset.x - fontSize.slice( 0, -2 ) - 5 } );
				editor.getBody().appendChild( insert );
				insertLocation = selection;
			}
		}

	} );

	editor.on( 'keydown blur', removeElement );

	editor.on( 'PostProcess', function( event ) {
		if ( event.get ) {
			event.content = event.content.replace( matchInsert, '' );
		}
	} );

	editor.on( 'BeforeAddUndo', function( event ) {
		if ( event.level ) {
			event.level.content = event.level.content.replace( matchInsert, '' );
		}
	} );

	editor.on( 'wpInsertClicked', function() {
		var scrollTop,
			jQuery = window.jQuery,
			$window = jQuery( window ),
			$postdivrich = jQuery( '#postdivrich' ),
			$postdivrichTop = $postdivrich.offset().top,
			$postdivrichHeight = $postdivrich.height(),
			$windowScrollTop = $window.scrollTop(),
			$windowHeight = $window.height();

		// We're blocking scrolling for the page, so make sure the block modal is fully in the viewport.
		if ( $postdivrichTop > $windowScrollTop ) {
			scrollTop = $postdivrichTop - 32; // Admin bar.
		} else if ( $postdivrichTop + $postdivrichHeight < $windowScrollTop + $windowHeight ) {
			scrollTop = $postdivrichTop + $postdivrichHeight - $windowHeight;
		}

		if ( scrollTop ) {
			jQuery( 'html, body' ).animate( {
				scrollTop: scrollTop
			}, 500 ).promise().done( showModal );
		} else {
			showModal();
		}
	} );

	function showModal() {
		var modal, modalInner,
			postdivrich = tinymce.DOM.select( '#postdivrich' )[0];

		tinymce.DOM.addClass( document.body, 'wp-block-modal-open' );

		modalInner = tinymce.DOM.create( 'DIV', { id: 'wp-block-modal-inner' } );
		modal = tinymce.DOM.create( 'DIV', { id: 'wp-block-modal' }, modalInner );

		document.body.appendChild( modal );

		tinymce.DOM.setStyles( modalInner, { left: tinymce.DOM.getPos( postdivrich ).x, width: postdivrich.offsetWidth } );
		tinymce.DOM.setStyles( postdivrich, { opacity: 0.1 } );

		fadeOutSurroundings();

		tinymce.each( editor.blocks, function( options ) {
			var html;
			html = '<div class="dashicons dashicons-' + options.icon + '"></div>' + options.title;
			html = tinymce.DOM.create( 'DIV', { 'class': 'wp-block-modal-item' }, html );
			tinymce.DOM.bind( html, 'click', function() {
				options.onclick( editor );
			} );
			modalInner.appendChild( html );
		} );

		tinymce.DOM.bind( modal, 'click', function() {
			autoFadeSurroundings();
			tinymce.DOM.removeClass( document.body, 'wp-block-modal-open' );
			tinymce.DOM.setStyles( postdivrich, { opacity: 1 } );
			tinymce.DOM.remove( modal );
		} );
	}

	editor.on( 'PreInit', function() {
		editor.blocks = {
			image: {
				title: 'Image',
				icon: 'format-image',
				onclick: function() {
					var instance = wp.media.editor.open().setState( 'insert' );
					jQuery( instance.el )
						.find( 'select.attachment-filters' )
						.val( 'image' )
						.trigger( 'change' );
				}
			},
			gallery: {
				title: 'Gallery',
				icon: 'format-gallery',
				onclick: function() {
					wp.media.editor.open().setState( 'gallery-library' );
				}
			},
			audio: {
				title: 'Audio',
				icon: 'format-audio',
				onclick: function() {
					var instance = wp.media.editor.open().setState( 'insert' );
					jQuery( instance.el )
						.find( 'select.attachment-filters' )
						.val( 'audio' )
						.trigger( 'change' );
				}
			},
			audioPlaylist: {
				title: 'Audio Playlist',
				icon: 'playlist-audio',
				onclick: function() {
					wp.media.editor.open().setState( 'playlist' );
				}
			},
			video: {
				title: 'Video',
				icon: 'video-alt3',
				onclick: function() {
					var instance = wp.media.editor.open().setState( 'insert' );
					jQuery( instance.el )
						.find( 'select.attachment-filters' )
						.val( 'video' )
						.trigger( 'change' );
				}
			},
			videoPlaylist: {
				title: 'Video Playlist',
				icon: 'playlist-video',
				onclick: function() {
					wp.media.editor.open().setState( 'video-playlist' );
				}
			},
			blockQuote: {
				title: 'Block Quote',
				icon: 'format-quote',
				onclick: function( editor ) {
					editor.execCommand( 'mceBlockQuote' );
				}
			},
			list: {
				title: 'List',
				icon: 'editor-ul',
				onclick: function( editor ) {
					editor.execCommand( 'InsertUnorderedList' );
				}
			},
			table: {
				title: 'Table',
				icon: 'screenoptions',
				onclick: function() {}
			},
			hr: {
				title: 'Horizontal Rule',
				icon: 'editor-insertmore',
				onclick: function( editor ) {
					editor.execCommand( 'InsertHorizontalRule' );
				}
			},
			more: {
				title: 'More...',
				icon: 'editor-insertmore',
				onclick: function( editor ) {
					editor.execCommand( 'WP_More' );
				}
			},
			nextPage: {
				title: 'Next Page',
				icon: 'editor-insertmore',
				onclick: function( editor ) {
					editor.execCommand( 'WP_Page' );
				}
			}
		};
	} );

	function removeElement() {
		if ( insert ) {
			editor.dom.remove( insert );
			insert = false;
		}
	}

	return {
		removeElement: removeElement
	};

} );

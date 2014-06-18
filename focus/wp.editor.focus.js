// Based on an experiment by Mark Jaquith.
// http://codepen.io/markjaquith/pen/uCtGJ

/* global tinymce */

( function( $ ) {

	'use strict';

	window.wp = wp || {};
	wp.editor = wp.editor || {};

	$( function() {

		var $window = $( window ),
			$document = $( document ),
			$adminBar = $( '#wpadminbar' ),
			$visualTop,
			$visualEditor,
			$textTop = $( '#ed_toolbar' ),
			$textEditor = $( '#content' ),
			$textEditorClone = $( '<div id="content-clone"></div>' ),
			$bottom = $( '#post-status-info' ),
			$postDivRich = $( '#postdivrich' ),
			$toFade = $( '#adminmenuwrap, #wp-toolbar, .postbox:visible, div.updated:visible, div.error:visible, .wrap h2, #screen-meta-links, #wpfooter' ),
			fullscreen = window.wp.editor.fullscreen,
			editorInstance,
			statusBarHeight = 0,
			windowHeight = $window.height(),
			fixedTop = false,
			fixedBottom = false;

		// Disable resizing by WordPress.
		$bottom.off();

		$( 'body' ).append( $textEditorClone );

		$textEditorClone.css( {
			'font-family': $textEditor.css( 'font-family' ),
			'font-size': $textEditor.css( 'font-size' ),
			'line-height': $textEditor.css( 'line-height' ),
			'white-space': 'pre-wrap',
			'word-wrap': 'break-word',
			'display': 'none'
		} );

		// Recalculate the text editor height.
		$textEditor.on( 'focus input propertychange', function() {

			textEditorResize();

		});

		function textEditorResize() {

			// Look if the text editor is active.
			if ( editorInstance && ! editorInstance.isHidden() ) {
				return;
			}

			var hiddenHeight = $textEditorClone.width( $textEditor.width() ).text( $textEditor.val() + '&nbsp;' ).height(),
				textEditorHeight = $textEditor.height();

			if ( hiddenHeight === textEditorHeight ) {
				return;
			} else if ( hiddenHeight < 300 ) {
				hiddenHeight = 300;
			}

			$textEditor.height( hiddenHeight );

			adjust( 'resize' );

		}

		// We need to wait for TinyMCE to initialize.
		$document.on( 'tinymce-editor-init.scroll', function( event, editor ) {

			// Make sure it's the main editor.
			if ( editor.id !== 'content' ) {
				return;
			}

			// Copy the editor instance.
			editorInstance = editor;

			// Resizing will be handled by the autoresize plugin.
			editor.theme.resizeTo = function() {};

			// Set the minimum height to the initial viewport height.
			editor.settings.autoresize_min_height = 300;

			// Get the necessary UI elements.
			statusBarHeight = $( '#wp-content-wrap .mce-statusbar:visible' ).outerHeight();
			$visualTop = $( '#wp-content-wrap .mce-toolbar-grp' );
			$visualEditor = $( '#wp-content-wrap .mce-edit-area' );

			// Adjust when switching editor modes.
			editor.on( 'show', function() {
				setTimeout( function() {
					editor.execCommand( 'mceAutoResize' );
					adjust( 'resize' );
				}, 200 );
			} );

			editor.on( 'hide', function() {
				textEditorResize();
				adjust( 'resize' );
			} );

			// Adjust when the editor resizes.
			editor.on( 'nodechange setcontent keyup FullscreenStateChanged', function() {
				adjust( 'resize' );
			} );

			// And adjust immediately.
			setTimeout( function() {
				adjust( 'resize' );
			}, 500 );

		} );

		// Adjust whenever the window is scrolled or resized.
		$window.on( 'scroll resize', function( event ) {

			adjust( event.type );

		} );

		// Adjust when exiting fullscreen mode.
		fullscreen.pubsub.subscribe( 'hidden', function() {

			adjust( 'resize' );

		} );

		$( '#collapse-menu' ).on( 'click.collapse-menu', function() {

			setTimeout( function() {
				adjust( 'resize' );
			}, 10 );

		} );

		$( '.columns-prefs input[type="radio"]' ).on( 'click.postboxes', function() {

			setTimeout( function() {
				adjust( 'resize' );
			}, 10 );

		} );

		// Adjust the toolbars based on the active editor mode.
		function adjust( eventType ) {

			// Make sure we're not in fullscreen mode.
			if ( fullscreen.settings.visible ) {
				return;
			}

			var windowPos = $window.scrollTop(),
				adminBarHeight = $adminBar.height(),
				bottomHeight = $bottom.outerHeight(),
				$top, $editor, visual,
				topPos, topHeight, editorPos, editorHeight, editorWidth, windowWidth;

			// Visual editor.
			if ( editorInstance && ! editorInstance.isHidden() ) {

				$top = $visualTop;
				$editor = $visualEditor;
				visual = true;

				// Not sure if this is a bit too intensive. Doesn't hide the panel of 'styleselect'.
				tinymce.each( editorInstance.controlManager.buttons, function( button ) {
					if ( button._active && ( button.type === 'colorbutton' || button.type === 'panelbutton' || button.type === 'menubutton' ) ) {
						button.hidePanel();
					}
				} );

			// Text editor.
			} else {

				$top = $textTop;
				$editor = $textEditor;

			}

			topPos = $top.parent().offset().top;
			topHeight = $top.outerHeight();
			editorPos = $editor.offset().top;
			editorHeight = $editor.outerHeight();
			editorWidth = $editor.outerWidth();
			windowHeight = $window.height();
			windowWidth = $window.width();

			// Maybe adjust the top bar.
			if ( ( ! fixedTop || eventType === 'resize' ) &&
					( windowPos >= ( topPos - adminBarHeight ) &&
					windowPos <= ( topPos - adminBarHeight + editorHeight - 100 ) ) ) {
				fixedTop = true;
				$top.css( {
					position: 'fixed',
					top: ( windowWidth > 600 ? adminBarHeight : 0 ),
					width: editorWidth - ( visual ? 0 : 38 )
				} );
				if ( visual ) {
					$editor.css( {
						paddingTop: topHeight
					} );
				} else {
					$top.parent().css( {
						paddingTop: topHeight
					} );
				}
			} else if ( fixedTop &&
					// The topHeight is added to the editorHeight (padding), so we'll have to subtract it again.
					( windowPos <= ( topPos - adminBarHeight ) ||
					windowPos >= ( topPos - adminBarHeight + editorHeight - ( visual ? topHeight : 0 ) - 100 ) ) ) {
				fixedTop = false;
				$top.css( {
					position: 'relative',
					top: 'auto',
					width: 'auto'
				} );
				if ( visual ) {
					$editor.css( {
						paddingTop: 0
					} );
				} else {
					$top.parent().css( {
						paddingTop: 0
					} );
				}
			}

			// Maybe adjust the bottom bar.
			if ( ( ! fixedBottom || eventType === 'resize' ) &&
					// + 1 for the border around the .wp-editor-container.
					( windowPos + windowHeight ) <= ( editorPos + editorHeight + bottomHeight + statusBarHeight + 1 ) ) {
				fixedBottom = true;
				$bottom.css( {
					position: 'fixed',
					bottom: 0,
					width: editorWidth + 2,
					borderTop: '1px solid #dedede'
				} );
			} else if ( fixedBottom &&
					( windowPos + windowHeight ) > ( editorPos + editorHeight + bottomHeight + statusBarHeight - 1 ) ) {
				fixedBottom = false;
				$bottom.css( {
					position: 'relative',
					bottom: 'auto',
					width: '100%',
					borderTop: 'none'
				} );
			}

		}

		textEditorResize();

		wp.editor.fadeOutSurroundings = function( event ) {
			if ( ! wp.editor.enableFadeSurroundings ) {
				return;
			}

			if ( ! event ) {
				$postDivRich.off( '.hoverIntent' );
			}

			$toFade.fadeTo( 'slow' , 0.1 );
		};

		wp.editor.fadeInSurroundings = function( event ) {
			if ( ! wp.editor.enableFadeSurroundings ) {
				return;
			}

			var panels = $( '.mce-popover, .mce-menu' );

			if ( ! event ) {
				this.autoFadeSurroundings();
			}

			if ( ! panels.length || ( panels.length && ! panels.is( ':visible' ) ) ) {
				$toFade.fadeTo( 'slow' , 1 );
			}
		};

		wp.editor.autoFadeSurroundings = function() {
			$postDivRich.hoverIntent( {
				over: this.fadeOutSurroundings,
				out: this.fadeInSurroundings,
				timeout: 500
			} );
		};

		wp.editor.autoFadeSurroundings();

	} );

} )( jQuery );

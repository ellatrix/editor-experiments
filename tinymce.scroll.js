// Based on an experiment by Mark Jaquith.
// http://codepen.io/markjaquith/pen/uCtGJ

/* global tinymce */
tinymce.PluginManager.add( 'scroll', function( editor ) {

	'use strict';

	if ( ! jQuery ) {
		return;
	}

	var $ = jQuery;

	editor.on( 'init', function() {

		var $window = $( window ),
			$top = $( '.mce-toolbar-grp' ),
			$bottom = $( '#post-status-info' ),
			$editor = $( '.mce-edit-area' ),
			statusBarHeight = $( '.mce-statusbar:visible' ).outerHeight(),
			adminBarHeight = 32,
			fixedTop = false,
			fixedBottom = false;

		// Disable resizing by WordPress.
		$( '#post-status-info' ).off();

		function adjust( eventType ) {

			if ( editor.settings.wp_fullscreen ) {
				return;
			}

			// Not sure if this is a bit too intensive. Doesn't hide the panel of 'styleselect'.
			tinymce.each( editor.controlManager.buttons, function( button ) {
				if ( button._active && ( button.type === 'colorbutton' || button.type === 'panelbutton' || button.type === 'menubutton' ) ) {
					button.hidePanel();
				}
			} );

			var windowPos = $window.scrollTop(),
				windowHeight = $window.height(),
				topPos = $top.parent().offset().top,
				topHeight = $top.outerHeight(),
				bottomHeight = $bottom.outerHeight(),
				editorPos  = $editor.offset().top,
				editorHeight = $editor.outerHeight(),
				editorWidth = $editor.width();

			// Maybe adjust the top bar.
			if ( ( ! fixedTop || eventType === 'resize' ) &&
					( windowPos >= ( topPos - adminBarHeight ) &&
					windowPos <= ( topPos - adminBarHeight + editorHeight ) ) ) {
				fixedTop = true;
				$top.css( {
					position: 'fixed',
					top: adminBarHeight,
					width: editorWidth
				} );
				$editor.css( {
					paddingTop: topHeight
				} );
			} else if ( fixedTop &&
					( windowPos <= ( topPos - adminBarHeight ) ||
					// The topHeight is added to the editorHeight (padding), so we'll have to subtract it again.
					windowPos >= ( topPos - adminBarHeight + editorHeight - topHeight ) ) ) {
				fixedTop = false;
				$top.css( {
					position: 'static',
					top: 'auto',
					width: 'auto'
				} );
				$editor.css( {
					paddingTop: 0
				} );
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
					( windowPos + windowHeight ) >= ( editorPos + editorHeight + bottomHeight + statusBarHeight + 1 ) ) {
				fixedBottom = false;
				$bottom.css( {
					position: 'static',
					bottom: 'auto',
					width: '100%',
					borderTop: 'none'
				} );
			}

		}

		$window.on( 'scroll resize', function( event ) {

			adjust( event.type );

		} );

		adjust();

	} );

} );
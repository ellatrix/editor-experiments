/* global tinymce */

tinymce.PluginManager.add( 'wpfullscreen', function( editor ) {

	function fullscreen() {
		if ( typeof wp !== 'undefined' && wp.editor && wp.editor.fullscreen ) {
			wp.editor.fullscreen.on();
		}
	}

	editor.addCommand( 'fullscreen', fullscreen );
	editor.addCommand( 'wpFullscreen', fullscreen );

	editor.addShortcut( 'alt+shift+w', 'Fullscreen', 'fullscreen' );

	editor.addButton( 'wp_fullscreen', {
		tooltip: 'Fullscreen',
		cmd: 'fullscreen',
		classes: 'wp-fullscreen btn widget'
	} );

} );

/* global tinymce */

tinymce.PluginManager.add( 'title', function( editor ) {

	var VK = tinymce.util.VK,
		title;

	// editor.on( 'keydown', function( event ) {
	// 	if ( event.keyCode === VK.BACKSPACE ) {
	// 		event.stopPropagation();
	// 	}
	// } );

	editor.on( 'keyup', function( event ) {
		jQuery( '#title' ).val( editor.dom.select( '#wp-title' )[0].textContent );
	} );

	editor.on( 'LoadContent', function() {
		var body = editor.getBody();
		title = editor.dom.create(
			'h1',
			{ id: 'wp-title' },
			jQuery( '#title' ).val()
		);
		body.insertBefore( title, body.firstChild );
	} );

	editor.on( 'PostProcess', function( event ) {
		if ( event.get ) {
			event.content = event.content.replace( /<H1[^>]+id="wp-title"[^>]*>[\s\S]*<\/H1>/gi, '' );
		}
	} );

	editor.on( 'show BeforeRenderUI', function() {
		jQuery( '#title' ).hide();
	} );

	editor.on( 'hide', function() {
		jQuery( '#title' ).show();
	} );

} );

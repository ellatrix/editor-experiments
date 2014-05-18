/* global tinymce */
tinymce.PluginManager.add( 'general', function( editor ) {

	// Remove spaces from empty paragraphs.
	editor.on( 'BeforeSetContent', function( event ) {
		if ( event.content ) {
			event.content = event.content.replace( /<p>(?:&nbsp;|\ufeff|\s)+<\/p>/gi, '<p></p>' );
		}
	} );

} );

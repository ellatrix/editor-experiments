/* global tinymce */
tinymce.PluginManager.add( 'general', function( editor ) {

	// Remove spaces from empty paragraphs.
	editor.on( 'BeforeSetContent', function( event ) {

		if ( event.content ) {
			event.content = event.content.replace( /<p>(?:&nbsp;|\ufeff|\s)+<\/p>/gi, '<p></p>' );
		}

	} );

	editor.on( 'init', function() {

		function setColors() {

			var style;

			style = editor.dom.getStyle( editor.getBody(), 'color', true );
			style = style.replace( /rgb\s*\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)/gi, function( match, r, g, b ) {
				return 'rgba( ' + r + ', ' + g + ', ' + b + ', 0.8 )';
			} );
			style = '.wpview-wrap.selected { outline-color: ' + style + '; }';
			style = editor.dom.create( 'style', { 'type': 'text/css' }, style );

			editor.getDoc().head.appendChild( style );

		}

		jQuery( '#post-formats-select input.post-format' ).on( 'change.set-editor-class', function() {

			setTimeout( setColors, 200 );

		} );

		setTimeout( setColors, 200 );

	} );

} );

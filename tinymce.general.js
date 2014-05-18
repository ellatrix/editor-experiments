/* global tinymce */

tinymce.PluginManager.add( 'general', function( editor ) {

	var colors = [];

	// Remove spaces from empty paragraphs.
	editor.on( 'BeforeSetContent', function( event ) {

		if ( event.content ) {
			event.content = event.content.replace( /<p>(?:&nbsp;|\ufeff|\s)+<\/p>/gi, '<p></p>' );
		}

	} );

	editor.on( 'init', function() {

		setTimeout( setUIColors, 200 );

	} );

	// This should move to post.js if added to core.
	jQuery( '#post-formats-select input.post-format' ).on( 'change.set-editor-class', function() {

		setTimeout( setUIColors, 200 );

	} );

	// Set colors for ui elements inside the content based on the text color of the body.
	function setUIColors() {

		var detectedColor,
			style = '';

		detectedColor = editor.dom.getStyle( editor.getBody(), 'color', true );
		detectedColor = detectedColor.replace( /rgb\s*\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)/gi, function( match, r, g, b ) {
			tinymce.each( colors, function( color ) {
				style += color.selector + '{' + color.property + ':rgba(' + r + ',' + b + ',' + g + ',' + color.opacity + ');}';
			} );
		} );
		style = editor.dom.create( 'style', { 'type': 'text/css' }, style );

		editor.getDoc().head.appendChild( style );

	}

	function addUIColor( selector, property, opacity ) {

		colors.push( {
			selector: selector,
			property: property,
			opacity: opacity
		} );

	}

	addUIColor( '.wpview-wrap.selected', 'outline-color', '0.5' );
	addUIColor( '.wpview-wrap .toolbar div,.wpview-wrap .toolbar div:hover', 'color', '1' );

	return {
		setUIColors: setUIColors,
		addUIColor: addUIColor
	};

} );

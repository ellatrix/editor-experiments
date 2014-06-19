/* global tinymce, switchEditors */

tinymce.PluginManager.add( 'general', function( editor ) {

	var colors = [], styleElement;

	editor.addButton( 'switchmode', {
		classes: 'container btn-group switchmode',
		type: 'buttongroup',
		items: [
			{
				icon: 'visibility',
				classes: 'widget btn active',
				tooltip: 'Visual mode'
			},
			{
				icon: 'editor-code',
				onclick: function() {
					switchEditors.go( 'content', 'html' );
				},
				tooltip: 'Text mode'
			}
		]
	} );

	// Remove spaces from empty paragraphs.
	editor.on( 'BeforeSetContent', function( event ) {

		if ( event.content ) {
			event.content = event.content.replace( /<p>(?:&nbsp;|\ufeff|\s)+<\/p>/gi, '<p></p>' );
		}

	} );

	editor.on( 'init', function() {

		setTimeout( setUIColors, 250 );

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
				style += color.selector + '{' + color.property + ':rgba(' + r + ',' + g + ',' + b + ',' + color.opacity + ');}';
			} );
		} );

		if ( styleElement ) {

			editor.dom.setHTML( styleElement, style );

		} else {

			styleElement = editor.dom.create( 'style', { type: 'text/css' }, style );

			editor.getDoc().head.appendChild( styleElement );

		}

	}

	function addUIColor( selector, property, opacity ) {

		colors.push( {
			selector: selector,
			property: property,
			opacity: opacity
		} );

	}

	addUIColor( '.wpview-wrap[data-mce-selected]:before', 'outline-color', '0.5' );
	addUIColor( '.wpview-wrap .toolbar div,.wpview-wrap .toolbar div:hover', 'color', '1' );
	addUIColor( '#wp-insert-block', 'color', '0.5' );
	addUIColor( '#wp-insert-block:hover', 'color', '1' );
	addUIColor( '.wpview-type-more span:before,.wpview-type-more span:after', 'border-bottom-color', '0.5' );
	addUIColor( '.wpview-type-more span', 'color', '0.5' );
	addUIColor( '.wpview-type-more[data-mce-selected] span:before,.wpview-type-more[data-mce-selected] span:after', 'border-bottom-color', '1' );
	addUIColor( '.wpview-type-more[data-mce-selected] span', 'color', '1' );
	addUIColor( '.wpview-type-nextpage span:before,.wpview-type-nextpage span:after', 'border-bottom-color', '0.5' );
	addUIColor( '.wpview-type-nextpage span', 'color', '0.5' );
	addUIColor( '.wpview-type-nextpage[data-mce-selected] span:before,.wpview-type-nextpage[data-mce-selected] span:after', 'border-bottom-color', '1' );
	addUIColor( '.wpview-type-nextpage[data-mce-selected] span', 'color', '1' );
	addUIColor( '.wpview-error', 'color', '0.5' );

	addUIColor( '.wpview-wrap.wpview-selection-before:before,.wpview-wrap.wpview-selection-after:before', 'background-color', '1' );

	return {
		setUIColors: setUIColors,
		addUIColor: addUIColor
	};

} );

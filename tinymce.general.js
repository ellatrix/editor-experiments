/* global tinymce, switchEditors */

tinymce.PluginManager.add( 'general', function( editor ) {

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

		setTimeout( function() { editor.setUIColor(); }, 250 );

	} );

	// This should move to post.js if added to core.
	jQuery( '#post-formats-select input.post-format' ).on( 'change.set-editor-class', function() {

		setTimeout( function() { editor.setUIColor(); }, 250 );

	} );

	editor.setUIColor = function( selector, property ) {
		var dom = this.dom,
			fn = this.setUIColor,
			style = '',
			bodyColor;

		fn.colors = fn.colors || [];

		if ( selector ) {
			fn.colors.push( {
				selector: selector,
				property: property || 'color'
			} );
		} else {
			bodyColor = dom.getStyle( this.getBody(), 'color', true );
				tinymce.each( fn.colors, function( color ) {
				style += color.selector + '{' + color.property + ':' + bodyColor + ';}';
			} );

			if ( fn.styleElement ) {
				dom.setHTML( fn.styleElement, style );
			} else {
				fn.styleElement = dom.create( 'style', { type: 'text/css' }, style );
				this.getDoc().head.appendChild( fn.styleElement );
			}
		}
	};

	editor.setUIColor( '.wpview-wrap[data-mce-selected]:before', 'border-color' );
	editor.setUIColor( '.wpview-type-more span:before, .wpview-type-more span:after', 'border-bottom-color' );
	editor.setUIColor( '.wpview-wrap.wpview-selection-before:before,.wpview-wrap.wpview-selection-after:before', 'background-color' );

} );

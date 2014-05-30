/* global tinymce */

tinymce.PluginManager.add( 'title', function( editor ) {

	var Env = tinymce.Env,
		VK = tinymce.util.VK,
		originalTitle = tinymce.DOM.select( '#title' )[0];

	function dummyTitle() {
		var title = editor.dom.select( '#wp-title' )[0],
			body;
		if ( ! title ) {
			title = editor.dom.create(
				'h1',
				{ id: 'wp-title' },
				originalTitle.value || ( ( Env.ie && Env.ie < 11 ) ? '' : '<br data-mce-bogus="1" />' )
			);
			body = editor.getBody();
			body.insertBefore( title, body.firstChild );
		}
		return title;
	}

	if ( ! originalTitle ) {
		return;
	}

	editor.on( 'keydown', function( event ) {
		var selection = editor.selection,
			title, range, node;

		if ( event.keyCode === VK.BACKSPACE ) {
			range = selection.getRng();
			node = selection.getNode();
			title = dummyTitle();
			if ( title &&
					( node.previousSibling === title ||
					node === title ) &&
				selection.isCollapsed() && range.startOffset === 0 && range.endOffset === 0 ) {
				event.preventDefault();
			}
		} else if ( event.keyCode === VK.ENTER ) {
			node = selection.getNode();
			if ( node === dummyTitle() ) {
				selection.setCursorLocation( node.nextSibling );
				event.preventDefault();
			}
		}
	} );

	editor.on( 'nodechange blur', function( event ) {
		var dom = editor.dom,
			title = dummyTitle(),
			firstP = dom.select( 'p' )[0],
			node = editor.selection.getNode();

		if ( dom.isEmpty( title ) && node !== title ) {
			dom.addClass( title, 'empty' );
		} else {
			dom.removeClass( title, 'empty' );
		}

		if ( dom.isEmpty( firstP ) && node !== firstP ) {
			dom.addClass( firstP, 'empty' );
		} else {
			dom.removeClass( firstP, 'empty' );
		}
	} );

	editor.on( 'keyup', function() {
		var title = dummyTitle();
		if ( title ) {
			originalTitle.value = title.textContent;
		}
	} );

	editor.on( 'LoadContent', dummyTitle );

	editor.on( 'PostProcess', function( event ) {
		if ( event.get ) {
			event.content = event.content.replace( /<H1[^>]+id="wp-title"[^>]*>[\s\S]*<\/H1>/gi, '' );
		}
	} );

	editor.on( 'show BeforeRenderUI', function() {
		tinymce.DOM.hide( 'titlediv' );
		tinymce.DOM.hide( 'wp-' + editor.id + '-editor-tools' );
	} );

	editor.on( 'hide', function() {
		tinymce.DOM.show( 'titlediv' );
		tinymce.DOM.show( 'wp-' + editor.id + '-editor-tools' );
	} );

} );

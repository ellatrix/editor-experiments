/* global tinymce */

tinymce.PluginManager.add( 'insert', function( editor ) {

	var insert, insertLocation,
		matchInsert = /<(P|BLOCKQUOTE)[^>]+id="wp-insert-block"[^>]*>[\s\S]*<\/(P|BLOCKQUOTE)>/gi;

	editor.on( 'keyup click ExecCommand AddUndo', function( event ) {

		var dom = editor.dom,
			alignleft, empty, fontSize, offset, range, selection;

		if ( event.type === 'addundo' && ! event.lastlevel ) {
			return;
		}

		if ( event.type === 'click' && ( event.target === insert || event.target.parentNode === insert ) ) {
			event.stopPropagation();
			removeElement();
			editor.selection.setCursorLocation( insertLocation );
			editor.fire( 'wpInsertClicked' );
			return;
		}

		selection = editor.selection.getStart();
		range = editor.selection.getRng();

		if ( selection.nodeName !== 'P' ) {
			selection = dom.getParent( selection, 'P' );
		}

		removeElement();

		if ( ! selection ) {
			return;
		}

		empty = dom.isEmpty( selection );

		if ( selection && empty && selection.nodeName === 'P' ) {
			offset = dom.getPos( selection );
			fontSize = dom.getStyle( selection, 'font-size', true );
			insert = editor.dom.create(
				( selection.parentNode.nodeName === 'BLOCKQUOTE' ? 'BLOCKQUOTE' : 'P' ),
				{
					id: 'wp-insert-block',
					contenteditable: false
				},
				'<span class="dashicons dashicons-plus-alt" style="width: ' + fontSize + ';"></span> Add a content block'
			);
			dom.setStyles( insert, { 'top': offset.y - 2, 'left': offset.x + 10 } );
			editor.getBody().appendChild( insert );
			insertLocation = selection;
		} else if ( range && selection && ! empty && editor.selection.isCollapsed() && range.startOffset === 0 && range.endOffset === 0 ) {
			alignleft = selection.querySelector( '.alignleft' );
			if ( ! alignleft ) {
				offset = dom.getPos( selection );
				fontSize = dom.getStyle( selection, 'font-size', true );
				insert = editor.dom.create(
					'DIV',
					{
						id: 'wp-insert-block',
						contenteditable: false
					},
					'<span class="dashicons dashicons-plus-alt" style="width: ' + fontSize + ';">'
				);
				dom.setStyles( insert, { 'top': offset.y - 2, 'left': offset.x - fontSize.slice( 0, -2 ) - 5 } );
				editor.getBody().appendChild( insert );
				insertLocation = selection;
			}
		}

	} );

	editor.on( 'keydown blur', removeElement );

	editor.on( 'PostProcess', function( event ) {
		if ( event.get ) {
			event.content = event.content.replace( matchInsert, '' );
		}
	} );

	editor.on( 'BeforeAddUndo', function( event ) {
		if ( event.level ) {
			event.level.content = event.level.content.replace( matchInsert, '' );
		}
	} );

	editor.on( 'wpInsertClicked', function() {
		// Just for testing.
		editor.execCommand( 'WP_Medialib' );
	} );

	function removeElement() {
		if ( insert ) {
			editor.dom.remove( insert );
			insert = false;
		}
	}

	return {
		removeElement: removeElement
	};

} );

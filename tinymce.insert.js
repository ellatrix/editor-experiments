/* global tinymce */

tinymce.PluginManager.add( 'insert', function( editor ) {
	'use strict';

	var insert, insertModal,
		Factory = tinymce.ui.Factory,
		DOM = tinymce.DOM;

	editor.on( 'NodeChange', function( event ) {
		var node = event.element;

		insert.hide();

		node = node.nodeName === 'BR' ? node.parentNode : node;

		if ( node.nodeName === 'P' && editor.dom.isEmpty( node ) && ! editor.wp.getView( node ) ) {
			insert.show( node );
		}
	} );

	editor.on( 'keydown blur hide', function() {
		insert.hide();
	} );

	function getParent( node ) {
		var body = editor.getBody();

		if ( node === body ) {
			return node.firstChild;
		}

		while ( node ) {
			if ( node.parentNode === body ) {
				return node;
			}

			node = node.parentNode;
		}

		return false;
	}

	editor.on( 'PreInit', function() {
		insert = Factory.create( {
			type: 'panel',
			layout: 'stack',
			classes: 'insert',
			ariaRoot: true,
			ariaRemember: true,
			html: '<span class="dashicons dashicons-plus-alt"></span> Add a block',
			onclick: function() {
				if ( insertModal._visible ) {
					insertModal.hide();
					editor.focus();
				} else {
					insertModal.setPos();
				}
			}
		} );

		insertModal = Factory.create( {
			type: 'panel',
			layout: 'flow',
			classes: 'insert-modal',
			ariaRoot: true,
			ariaRemember: true,
			items: editor.toolbarItems( editor.settings.blocks, true )
		} );

		insert.on( 'show', function() {
			this.setPos();
		} );

		insert.on( 'hide', function() {
			insertModal.hide();
		} );

		DOM.bind( window, 'resize', function() {
			insert.hide();
		} );

		insert.setPos = function( node ) {
			node = node || editor.selection.getNode();
			node = node.nodeName === 'BR' ? node.parentNode : node;

			var insertEl = this.getEl(),
				cursor = editor.dom.getPos(node ),
				iframe = DOM.getPos( editor.getContentAreaContainer().querySelector( 'iframe' ) ),
				diff = ( node.clientHeight - insertEl.clientHeight ) / 2;

			DOM.setStyles( insertEl, {
				'left': iframe.x + cursor.x,
				'top': iframe.y + cursor.y + diff,
				'color': editor.dom.getStyle( node, 'color', true )
			} );

			return this;
		};

		insert.renderTo( document.body ).hide();

		insertModal.on( 'hide', function() {
			editor.dom.remove( editor.dom.select( '.mce-insert-placeholder' ) );
			DOM.removeClass( insert.getEl(), 'open' );
		} );

		DOM.bind( window, 'resize', function() {
			insertModal.hide();
		} );

		insertModal.setPos = function( node ) {
			node = node || editor.selection.getNode();
			node = node.nodeName === 'BR' ? node.parentNode : node;

			var dom = editor.dom,
				parent = getParent( node ),
				insertEl = this.getEl(),
				body = editor.dom.getPos( editor.getBody() ),
				iframe = DOM.getPos( editor.getContentAreaContainer().querySelector( 'iframe' ) ),
				placeholder;

			DOM.addClass( insert.getEl(), 'open' );

			placeholder = dom.create( 'p', {
				'data-mce-bogus': 'all',
				'class': 'mce-insert-placeholder',
				'style': 'height: 0px;'
			}, '\u00a0' );

			dom.insertAfter( placeholder, parent );

			DOM.setStyles( insertEl, {
				'left': iframe.x + body.x,
				'top': iframe.y + editor.dom.getPos( placeholder ).y,
				'width': editor.getBody().clientWidth,
				'opacity': 0
			} );

			insertModal.show();

			editor.dom.setStyles( placeholder, {
				'height': insertEl.clientHeight
			} );

			jQuery( placeholder )
				.hide()
				.height( insertEl.clientHeight )
				.slideDown( 'fast', function() {
					// $( modal ).css( 'opacity', '' ).fadeIn();
					DOM.setStyles( insertEl, {
						'opacity': 1
					} );

					editor.execCommand( 'wpAutoResize' );
				} );

			return this;
		};

		insertModal.renderTo( document.body ).hide();
	} );

	editor.addButton( 'wp_image', {
		tooltip: 'Image',
		icon: 'dashicons-format-image',
		onclick: function() {
			var instance = wp.media.editor.open().setState( 'insert' );

			jQuery( instance.el )
				.find( 'select.attachment-filters' )
				.val( 'image' )
				.trigger( 'change' );
		}
	} );

	editor.addButton( 'wp_gallery', {
		tooltip: 'Gallery',
		icon: 'dashicons-format-gallery',
		onclick: function() {
			wp.media.editor.open().setState( 'gallery-library' );
		}
	} );

	editor.addButton( 'wp_audio', {
		tooltip: 'Audio',
		icon: 'dashicons-format-audio',
		onclick: function() {
			var instance = wp.media.editor.open().setState( 'insert' );

			jQuery( instance.el )
				.find( 'select.attachment-filters' )
				.val( 'audio' )
				.trigger( 'change' );
		}
	} );

	editor.addButton( 'wp_audio_playlist', {
		tooltip: 'Audio Playlist',
		icon: 'dashicons-playlist-audio',
		onclick: function() {
			wp.media.editor.open().setState( 'playlist' );
		}
	} );

	editor.addButton( 'wp_video', {
		tooltip: 'Video',
		icon: 'dashicons-video-alt3',
		onclick: function() {
			var instance = wp.media.editor.open().setState( 'insert' );

			jQuery( instance.el )
				.find( 'select.attachment-filters' )
				.val( 'video' )
				.trigger( 'change' );
		}
	} );

	editor.addButton( 'wp_video_playlist', {
		tooltip: 'Video Playlist',
		icon: 'dashicons-playlist-video',
		onclick: function() {
			wp.media.editor.open().setState( 'video-playlist' );
		}
	} );
} );

/* global tinymce */

tinymce.PluginManager.add( 'toolbar', function( editor ) {
	var each = tinymce.each,
		Factory = tinymce.ui.Factory,
		DOM = tinymce.DOM,
		settings = editor.settings,
		toolbar;

	editor.on( 'keyup mouseup nodechange', function() {
		if ( editor.selection.isCollapsed() ) {
			toolbar.hide();
			return;
		}

		setTimeout( function() {
			var element = editor.selection.getNode();

			if ( ! editor.selection.isCollapsed() &&
					editor.selection.getContent().replace( /<[^>]+>/g, '' ).trim() &&
					element.nodeName !== 'IMG' &&
					element.nodeName !== 'HR' &&
					element.id !== 'wp-title' &&
					! editor.wp.getView( element ) ) {
				if ( toolbar._visible ) {
					toolbar.reposition();
				} else {
					toolbar.show();
				}
			} else {
				toolbar.hide();
			}
		}, 50 );
	} );

	editor.on( 'blur', function() {
		toolbar.hide();
	} );

	editor.on( 'PreInit', function() {
		toolbar = Factory.create( {
			type: 'floatpanel',
			role: 'application',
			classes: 'inline-toolbar-grp',
			layout: 'stack',
			autohide: true,
			items: [
				{
					type: 'toolbar',
					layout: 'flow',
					items: editor.toolbarItems( settings.inlineToolbar )
				}
			]
		} );

		toolbar.on( 'show', function() {
			this.reposition();
			DOM.addClass( this.getEl(), 'mce-inline-toolbar-active' );
		} );

		toolbar.on( 'hide', function() {
			DOM.removeClass( this.getEl(), 'mce-inline-toolbar-active' );
		} );

		DOM.bind( window, 'resize', function() {
			toolbar.hide();
		} );

		toolbar.reposition = function() {
			var toolbarEl = this.getEl(),
				boundary = editor.selection.getRng().getBoundingClientRect(),
				boundaryMiddle = ( boundary.left + boundary.right ) / 2,
				windowWidth = window.innerWidth,
				toolbarWidth, toolbarHalf,
				margin = parseInt( DOM.getStyle( toolbarEl, 'margin-bottom', true ), 10),
				top, left, className, iFramePos;

			toolbarEl.className = ( ' ' + toolbarEl.className + ' ' ).replace( /\smce-arrow-\S+\s/g, ' ' ).slice( 1, -1 );

			toolbarWidth = toolbarEl.offsetWidth;
			toolbarHalf = toolbarWidth / 2;

			if ( boundary.top < toolbarEl.offsetHeight ) {
				className = ' mce-arrow-up';
				top = boundary.bottom + margin;
			} else {
				className = ' mce-arrow-down';
				top = boundary.top - toolbarEl.offsetHeight - margin;
			}

			left = boundaryMiddle - toolbarHalf;

			iFramePos = DOM.getPos( editor.getContentAreaContainer().querySelector( 'iframe' ) );

			top = top + iFramePos.y;
			left = left + iFramePos.x;

			if ( toolbarWidth >= windowWidth ) {
				className += ' mce-arrow-full';
				left = 0;
			} else if ( ( left < 0 && boundary.left + toolbarWidth > windowWidth ) || ( left + toolbarWidth > windowWidth && boundary.right - toolbarWidth < 0 ) ) {
				left = ( windowWidth - toolbarWidth ) / 2;
			} else if ( left < 0 ) {
				className += ' mce-arrow-left';
				left = boundary.left;
				left = left + iFramePos.x;
			} else if ( left + toolbarWidth > windowWidth ) {
				className += ' mce-arrow-right';
				left = boundary.right - toolbarWidth;
				left = left + iFramePos.x;
			}

			toolbarEl.className += className;

			DOM.setStyles( toolbarEl, { 'left': left, 'top': top } );

			return this;
		};

		toolbar.renderTo( document.body ).hide();

		editor.shortcuts.add( 'Alt+F8', '', function() {
			var item = toolbar.find( 'toolbar' )[0];

			item && item.focus( true );
		} );

		toolbar.on( 'cancel', function() {
			editor.focus();
		} );

		editor.inlineToolbar = toolbar;
	} );

	each( {
		H1: 'Heading 1',
		H2: 'Heading 2',
		H3: 'Heading 3',
		H4: 'Heading 4',
		H5: 'Heading 5',
		H6: 'Heading 6',
		Pre: 'Preformatted'
	}, function( text, name ) {
		var nameLower = name.toLowerCase();

		editor.addButton( nameLower, {
			tooltip: text,
			text: name,
			onclick: function() {
				editor.formatter.toggle( nameLower );
			},
			onPostRender: function() {
				var self = this;

				editor.on( 'nodeChange', function( event ) {
					each( event.parents, function( node ) {
						self.active( !! editor.formatter.matchNode( node, nameLower ) );
					} );
				} );
			}
		} );
	} );
} );

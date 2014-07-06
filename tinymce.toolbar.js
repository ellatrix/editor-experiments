/* global tinymce */

tinymce.PluginManager.add( 'toolbar', function( editor ) {

	var each = tinymce.each,
		dom = tinymce.DOM,
		toolbar, lastNodeChange;

	editor.on( 'nodechange', function( event ) {
		if ( ! editor.selection.isCollapsed() &&
				editor.selection.getContent().trim() &&
				event.element.nodeName !== 'IMG' &&
				event.element.nodeName !== 'HR' &&
				event.element.id !== 'wp-title' &&
				! editor.wp.getView( event.element ) ) {
			if ( toolbar._visible ) {
				toolbar.setPos();
			} else {
				toolbar.show();
			}
		} else {
			toolbar.hide();
		}
	} );

	editor.on( 'blur', function() {
		toolbar.hide();
	} );

	editor.on( 'PreInit', createToolbar );

	function createToolbar() {
		var inlineToolbar = editor.settings.inlineToolbar || 'bold italic strikethrough link unlink blockquote h2 h3',
			buttons = [];

		each( inlineToolbar.split( /[ ,]/ ), function( name ) {
			var item = editor.buttons[name],
				button;
			if ( item ) {
				item.type = item.type || 'button';
				item.tooltip = false;

				// Auto select a link when clicked, and (de)activate the link button appropriately.
				if ( name === 'link' ) {
					item.onPostRender = function() {
						var self = this;

						editor.on( 'NodeChange', function( event ) {
							if ( event.element.nodeName === 'A' && editor.selection.isCollapsed() ) {
								if ( ! lastNodeChange || lastNodeChange && lastNodeChange.element !== event.element ) {
									editor.selection.select( event.element );
									editor.nodeChanged();
								}
							}

							self.active( event.element.nodeName === 'A' );

							lastNodeChange = event;
						} );
					};
				// Only show the unlink buton when there is a link in the selection.
				} else if ( name === 'unlink' ) {
					item.onPostRender = function() {
						var self = this;

						editor.on( 'NodeChange', function() {
							self.disabled( editor.selection.getContent().indexOf( '<a href' ) === -1 );
						} );
					};
				}

				button = tinymce.ui.Factory.create( item );
				buttons.push( button );
			}
		} );

		toolbar = tinymce.ui.Factory.create( {
			type: 'panel',
			layout: 'stack',
			classes: 'inline-toolbar-grp popover',
			ariaRoot: true,
			ariaRemember: true,
			items: {
				type: 'toolbar',
				layout: 'flow',
				items: {
					type: 'buttongroup',
					items: buttons
				}
			}
		} );

		toolbar.on( 'show', function() {
			this.setPos();
		} );

		toolbar.on( 'hide', function() {
			dom.removeClass( this.getEl(), 'mce-inline-toolbar-active' );
		} );

		dom.bind( window, 'resize', function() {
			if ( toolbar._visible ) {
				toolbar.hide();
			}
		} );

		toolbar.setPos = function() {
			var toolbarEl = this.getEl(),
				boundary = editor.selection.getRng().getBoundingClientRect(),
				boundaryMiddle = ( boundary.left + boundary.right ) / 2,
				toolbarHalf = toolbarEl.offsetWidth / 2,
				margin = parseInt( dom.getStyle( toolbarEl, 'margin-bottom', true ), 10),
				top, left, iFramePos;

			if ( boundary.top < toolbarEl.offsetHeight ) {
				dom.addClass( toolbarEl, 'mce-inline-toolbar-arrow-up' );
				dom.removeClass( toolbarEl, 'mce-inline-toolbar-arrow-down' );
				top = boundary.bottom + margin;
			} else {
				dom.addClass( toolbarEl, 'mce-inline-toolbar-arrow-down' );
				dom.removeClass( toolbarEl, 'mce-inline-toolbar-arrow-up' );
				top = boundary.top - toolbarEl.offsetHeight - margin;
			}

			left = boundaryMiddle - toolbarHalf;

			iFramePos = dom.getPos( editor.getContentAreaContainer().querySelector( 'iframe' ) );

			top = top + iFramePos.y;
			left = ( ( left + iFramePos.x ) > 0 ) ? left + iFramePos.x : 0;

			dom.setStyles( toolbarEl, { 'left': left, 'top': top } );

			setTimeout( function() {
				dom.addClass( toolbarEl, 'mce-inline-toolbar-active' );
			}, 100 );

			return this;
		};

		toolbar.renderTo( document.body ).hide();

		editor.inlineToolbar = toolbar;
	}

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

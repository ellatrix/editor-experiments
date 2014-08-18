/* global tinymce, switchEditors */

tinymce.PluginManager.add( 'general', function( editor ) {
	var settings = editor.settings,
		Factory = tinymce.ui.Factory,
		each = tinymce.each,
		DOM = tinymce.DOM;

	editor.wp = editor.wp || {};

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
	editor.setUIColor( '.has-focus .wpview-wrap.wpview-selection-before:before, .has-focus .wpview-wrap.wpview-selection-after:before', 'background-color' );

	editor.wp.getView = function( node ) {
		return editor.dom.getParent( node, function( node ) {
			return editor.dom.hasClass( node, 'wpview-wrap' );
		});
	};

	function toolbarItems( array, block ) {
		var items = [],
			buttonGroup;

		if ( ! array ) {
			return;
		}

		function getParent( node, nodeName ) {
			while ( node ) {
				if ( node.nodeName === nodeName ) {
					return node;
				}

				node = node.parentNode;
			}

			return false;
		}

		each( array, function( item ) {
			var itemName;

			function bindSelectorChanged() {
				var selection = editor.selection;

				if ( itemName === 'bullist' ) {
					selection.selectorChanged( 'ul > li', function( state, args ) {
						var nodeName,
							i = args.parents.length;

						while ( i-- ) {
							nodeName = args.parents[ i ].nodeName;

							if ( nodeName === 'OL' || nodeName === 'UL' ) {
								break;
							}
						}

						item.active( state && nodeName === 'UL' );
					} );
				}

				if ( itemName === 'numlist' ) {
					selection.selectorChanged( 'ol > li', function(state, args) {
						var nodeName,
							i = args.parents.length;

						while ( i-- ) {
							nodeName = args.parents[ i ].nodeName;

							if ( nodeName === 'OL' || nodeName === 'UL' ) {
								break;
							}
						}

						item.active( state && nodeName === 'OL' );
					} );
				}

				if ( item.settings.stateSelector ) {
					selection.selectorChanged( item.settings.stateSelector, function( state ) {
						item.active( state );
					}, true );
				}

				if ( item.settings.disabledStateSelector ) {
					selection.selectorChanged( item.settings.disabledStateSelector, function( state ) {
						item.disabled( state );
					} );
				}
			}

			if ( item === '|' ) {
				buttonGroup = null;
			} else {
				if ( Factory.has( item ) ) {
					item = {
						type: item
					};

					if ( settings.toolbar_items_size ) {
						item.size = settings.toolbar_items_size;
					}

					items.push( item );
					buttonGroup = null;
				} else {
					if ( ! buttonGroup || block ) {
						buttonGroup = {
							type: 'buttongroup',
							items: []
						};
						items.push( buttonGroup );
					}

					if ( editor.buttons[ item ] ) {
						itemName = item;
						item = editor.buttons[ itemName ];

						if ( typeof( item ) === 'function' ) {
							item = item();
						}

						if ( block ) {
							if ( item.icon.indexOf( 'dashicons' ) !== -1 ) {
								item.icon = 'dashicon ' + item.icon;
							}

							item.text = item.tooltip;
						}

						item.type = item.type || 'button';

						if ( settings.toolbar_items_size ) {
							item.size = settings.toolbar_items_size;
						}

						item.tooltip = false;

						if ( itemName === 'link' ) {
							item.onPostRender = function() {
								var self = this;

								editor.on( 'NodeChange', function( event ) {
									self.active( getParent( event.element, 'A' ) );
								} );
							};
						} else if ( itemName === 'unlink' ) {
							item.onPostRender = function() {
								var self = this;

								editor.on( 'NodeChange', function( event ) {
									var disabled = event.element.nodeName !== 'A' && editor.selection.getContent().indexOf( '<a' ) === -1;
									self.disabled( disabled );
									DOM.setAttrib( self.getEl(), 'tabindex', disabled ? '0' : '-1' );
								} );
							};

							item.onclick = function() {
								if ( editor.selection.getContent().indexOf( '<a' ) === -1 ) {
									editor.selection.select( editor.selection.getNode() );
								}

								editor.execCommand( 'unlink' );
							};
						}

						item = Factory.create( item );
						buttonGroup.items.push( item );

						if ( editor.initialized ) {
							bindSelectorChanged();
						} else {
							editor.on( 'init', bindSelectorChanged );
						}
					}
				}
			}
		});

		return items;
	}

	editor.toolbarItems = toolbarItems;
} );

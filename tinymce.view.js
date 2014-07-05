/* global tinymce */

tinymce.PluginManager.add( 'wpview', function( editor ) {
	if ( typeof wp === 'undefined' || ! wp.mce ) {
		return;
	}

	var selected,
		views = wp.mce.views,
		Env = tinymce.Env,
		TreeWalker = tinymce.dom.TreeWalker,
		VK = tinymce.util.VK,
		toRemove = false,
		isView, cursorInterval;

	editor.isView = isView = function( node ) {
		return editor.dom.getParent( node, function( node ) {
			return editor.dom.hasClass( node, 'wpview-wrap' );
		} );
	};

	function createPadNode() {
		return editor.dom.create( 'p', { 'data-wpview-pad': 1 },
			( Env.ie && Env.ie < 11 ) ? '' : '<br data-mce-bogus="1" />' );
	}

	/**
	 * Get the text/shortcode string for a view.
	 *
	 * @param view The view wrapper's node
	 * @returns string The text/shoercode string of the view
	 */
	function getViewText( view ) {
		view = isView( view );

		if ( view ) {
			return window.decodeURIComponent( editor.dom.getAttrib( view, 'data-wpview-text' ) || '' );
		}
		return '';
	}

	/**
	 * Set the view's original text/shortcode string
	 *
	 * @param view The view wrapper's node
	 * @param text The text string to be set
	 */
	function setViewText( view, text ) {
		view = isView( view );

		if ( view ) {
			editor.dom.setAttrib( view, 'data-wpview-text', window.encodeURIComponent( text || '' ) );
			return true;
		}
		return false;
	}

	function _stop( event ) {
		event.stopPropagation();
	}

	function setViewCursor( before, view ) {
		var location = before ? 'before' : 'after',
			offset = before ? 0 : 1;
		editor.selection.setCursorLocation( editor.dom.select( '.wpview-selection-' + location, view )[0], offset );
	}

	function handleEnter( view, before ) {
		var dom = editor.dom,
			padNode;

		if ( ! before && view.nextSibling && dom.isEmpty( view.nextSibling ) && view.nextSibling.nodeName === 'P' ) {
			padNode = view.nextSibling;
		} else if ( before && view.previousSibling && dom.isEmpty( view.previousSibling ) && view.previousSibling.nodeName === 'P' ) {
			padNode = view.previousSibling;
		} else {
			padNode = dom.create( 'p' );

			if ( ! ( Env.ie && Env.ie < 11 ) ) {
				padNode.innerHTML = '<br data-mce-bogus="1">';
			}

			if ( before ) {
				view.parentNode.insertBefore( padNode, view );
			} else {
				dom.insertAfter( padNode, view );
			}
		}

		deselect();
		editor.selection.setCursorLocation( padNode, 0 );
		editor.nodeChanged();
	}

	function select( viewNode ) {
		var clipboard,
			dom = editor.dom;

		// Bail if node is already selected.
		if ( viewNode === selected ) {
			return;
		}

		deselect();
		selected = viewNode;
		dom.setAttrib( viewNode, 'data-mce-selected', 'true' );

		clipboard = dom.create( 'div', {
			'class': 'wpview-clipboard',
			'contenteditable': 'true'
		}, getViewText( viewNode ) );

		// Prepend inside the wrapper
		viewNode.insertBefore( clipboard, viewNode.firstChild );

		// Both of the following are necessary to prevent manipulating the selection/focus
		dom.bind( clipboard, 'beforedeactivate focusin focusout', _stop );
		dom.bind( selected, 'beforedeactivate focusin focusout', _stop );

		// Make sure that the editor is focused.
		// It is possible that the editor is not focused when the mouse event fires
		// without focus, the selection will not work properly.
		// editor.getBody().focus();

		// select the hidden div
		editor.selection.select( clipboard, true );

		editor.nodeChanged();

		views.select( viewNode );
	}

	/**
	 * Deselect a selected view and remove clipboard
	 */
	function deselect() {
		var clipboard,
			dom = editor.dom;

		if ( selected ) {
			clipboard = editor.dom.select( '.wpview-clipboard', selected )[0];
			dom.unbind( clipboard );
			dom.remove( clipboard );

			dom.unbind( selected, 'beforedeactivate focusin focusout click mouseup', _stop );
			dom.setAttrib( selected, 'data-mce-selected', null );
		}

		selected = null;

		views.deselect();
	}

	// Remove the content of view wrappers from HTML string
	function emptyViews( content ) {
		return content.replace(/(<div[^>]+wpview-wrap[^>]+>)[\s\S]+?data-wpview-end[^>]*><\/ins><\/div>/g, '$1</div>' );
	}

	// Prevent adding undo levels on changes inside a view wrapper
	editor.on( 'BeforeAddUndo', function( event ) {
		if ( event.lastLevel && emptyViews( event.level.content ) === emptyViews( event.lastLevel.content ) ) {
			event.preventDefault();
		}
	});

	// When the editor's content changes, scan the new content for
	// matching view patterns, and transform the matches into
	// view wrappers.
	editor.on( 'BeforeSetContent', function( event ) {
		var node;

		if ( ! event.content ) {
			return;
		}

		if ( ! event.initial ) {
			views.unbind( editor );
		}

		node = editor.selection.getNode();

		// When a url is pasted, only try to embed it when pasted in an empty paragrapgh.
		if ( event.content.match( /^\s*(https?:\/\/[^\s"]+)\s*$/i ) &&
				( node.nodeName !== 'P' || node.parentNode !== editor.getBody() || ! editor.dom.isEmpty( node ) ) ) {
			return;
		}

		event.content = views.toViews( event.content );
	});

	// When the editor's content has been updated and the DOM has been
	// processed, render the views in the document.
	editor.on( 'SetContent', function( event ) {
		var body, padNode;

		views.render();

		// Add padding <p> if the noneditable node is last
		if ( event.load || ! event.set ) {
			body = editor.getBody();

			if ( isView( body.lastChild ) ) {
				padNode = createPadNode();
				body.appendChild( padNode );

				if ( ! event.initial ) {
					editor.selection.setCursorLocation( padNode, 0 );
				}
			}
		}
	});

	// Detect mouse down events that are adjacent to a view when a view is the first view or the last view
	editor.on( 'click', function( event ) {
		var body = editor.getBody(),
			doc = editor.getDoc(),
			scrollTop = doc.documentElement.scrollTop || body.scrollTop || 0,
			x, y, firstNode, lastNode, padNode;

		if ( event.target.nodeName === 'HTML' && ! event.metaKey && ! event.ctrlKey ) {
			firstNode = body.firstChild;
			lastNode = body.lastChild;
			x = event.clientX;
			y = event.clientY;

			// Detect clicks above or to the left if the first node is a wpview
			if ( isView( firstNode ) && ( ( x < firstNode.offsetLeft && y < ( firstNode.offsetHeight - scrollTop ) ) ||
				y < firstNode.offsetTop ) ) {

				padNode = createPadNode();
				body.insertBefore( padNode, firstNode );

			// Detect clicks to the right and below the last view
			} else if ( isView( lastNode ) && ( x > ( lastNode.offsetLeft + lastNode.offsetWidth ) ||
				( ( scrollTop + y ) - ( lastNode.offsetTop + lastNode.offsetHeight ) ) > 0 ) ) {

				padNode = createPadNode();
				body.appendChild( padNode );
			}

			if ( padNode ) {
				// Make sure that a selected view is deselected so that focus and selection are handled properly
				deselect();
				editor.getBody().focus();
				editor.selection.setCursorLocation( padNode, 0 );
			}
		}
	});

	editor.on( 'init', function() {
		var selection = editor.selection;
		// When a view is selected, ensure content that is being pasted
		// or inserted is added to a text node (instead of the view).
		editor.on( 'BeforeSetContent', function() {
			var walker, target,
				view = isView( selection.getNode() );

			// If the selection is not within a view, bail.
			if ( ! view ) {
				return;
			}

			if ( ! view.nextSibling || isView( view.nextSibling ) ) {
				// If there are no additional nodes or the next node is a
				// view, create a text node after the current view.
				target = editor.getDoc().createTextNode('');
				editor.dom.insertAfter( target, view );
			} else {
				// Otherwise, find the next text node.
				walker = new TreeWalker( view.nextSibling, view.nextSibling );
				target = walker.next();
			}

			// Select the `target` text node.
			selection.select( target );
			selection.collapse( true );
		});

		// When the selection's content changes, scan any new content
		// for matching views.
		//
		// Runs on paste and on inserting nodes/html.
		editor.on( 'SetContent', function( e ) {
			if ( ! e.context ) {
				return;
			}

			var node = selection.getNode();

			if ( ! node.innerHTML ) {
				return;
			}

			node.innerHTML = views.toViews( node.innerHTML );
		});

		editor.dom.bind( editor.getBody().parentNode, 'mousedown mouseup click', function( event ) {
			var view = isView( event.target ),
				deselectEventType;

			// Contain clicks inside the view wrapper
			if ( view ) {

				event.stopPropagation();

				editor.plugins.insert.removeElement();

				// Hack to try and keep the block resize handles from appearing. They will show on mousedown and then be removed on mouseup.
				if ( Env.ie <= 10 ) {
					deselect();
				}

				select( view );

				if ( event.type === 'click' && ! event.metaKey && ! event.ctrlKey ) {
					if ( editor.dom.hasClass( event.target, 'edit' ) ) {
						jQuery( view ).trigger( 'edit', getViewText( view ) );
						event.preventDefault();
					} else if ( editor.dom.hasClass( event.target, 'remove' ) ) {
						jQuery( view ).trigger( 'remove' );
						editor.dom.remove( view );
					}
				}
				// Returning false stops the ugly bars from appearing in IE11 and stops the view being selected as a range in FF.
				// Unfortunately, it also inhibits the dragging of views to a new location.
				return false;
			} else {

				// Fix issue with deselecting a view in IE8. Without this hack, clicking content above the view wouldn't actually deselect it
				// and the caret wouldn't be placed at the mouse location
				if ( Env.ie && Env.ie <= 8 ) {
					deselectEventType = 'mouseup';
				} else {
					deselectEventType = 'mousedown';
				}

				if ( event.type === deselectEventType ) {
					deselect();
				}
			}
		});
	});

	editor.on( 'PreProcess', function( event ) {
		var dom = editor.dom;

		// Remove empty padding nodes
		tinymce.each( dom.select( 'p[data-wpview-pad]', event.node ), function( node ) {
			if ( dom.isEmpty( node ) ) {
				dom.remove( node );
			} else {
				dom.setAttrib( node, 'data-wpview-pad', null );
			}
		});

		// Replace the wpview node with the wpview string/shortcode?
		tinymce.each( dom.select( 'div[data-wpview-text]', event.node ), function( node ) {
			// Empty the wrap node
			if ( 'textContent' in node ) {
				node.textContent = '\u00a0';
			} else {
				node.innerText = '\u00a0';
			}
		});
    });

    editor.on( 'PostProcess', function( event ) {
		if ( event.content ) {
			event.content = event.content.replace( /<div [^>]*?data-wpview-text="([^"]*)"[^>]*>[\s\S]*?<\/div>/g, function( match, shortcode ) {
				if ( shortcode ) {
					return '<p>' + window.decodeURIComponent( shortcode ) + '</p>';
				}
				return ''; // If error, remove the view wrapper
			});
		}
	});

	// Handle key presses for selected views.
	editor.on( 'keydown', function( event ) {
		var dom = editor.dom,
			keyCode = event.keyCode,
			selection = editor.selection,
			view;

		// If a view isn't selected, let the event go on its merry way.
		if ( ! selected ) {
			return;
		}

		// Let key presses that involve the command or control keys through.
		// Also, let any of the F# keys through.
		if ( event.metaKey || event.ctrlKey || ( keyCode >= 112 && keyCode <= 123 ) ) {
			// But remove the view when cmd/ctrl + x/backspace are pressed.
			if ( ( event.metaKey || event.ctrlKey ) && ( keyCode === 88 || keyCode === VK.BACKSPACE ) ) {
				// We'll remove a cut view on keyup, otherwise the browser can't copy the content.
				if ( keyCode === 88 ) {
					toRemove = selected;
				} else {
					editor.dom.remove( selected );
				}
			}
			return;
		}

		view = isView( selection.getNode() );

		// If the caret is not within the selected view, deselect the view and bail.
		if ( view !== selected ) {
			deselect();
			return;
		}

		if ( keyCode === VK.LEFT || keyCode === VK.UP ) {
			setViewCursor( true, view );
			deselect();
		} else if ( keyCode === VK.RIGHT || keyCode === VK.DOWN ) {
			setViewCursor( false, view );
			deselect();
		} else if ( keyCode === VK.ENTER ) {
			handleEnter( view );
		} else if ( keyCode === VK.DELETE || keyCode === VK.BACKSPACE ) {
			dom.remove( selected );
		}

		event.preventDefault();
	});

	// (De)select views when arrow keys are used to navigate the content of the editor.
	editor.on( 'keydown', function( event ) {
		var keyCode = event.keyCode,
			dom = editor.dom,
			selection = editor.selection,
			node = selection.getNode(),
			cursorBefore = ( node.className === 'wpview-selection-before' ),
			cursorAfter = ( node.className === 'wpview-selection-after' ),
			view;

		if ( ! cursorBefore && ! cursorAfter ) {
			return;
		}

		if ( event.metaKey || event.ctrlKey || ( keyCode >= 112 && keyCode <= 123 ) ) {
			return;
		}

		if ( ( cursorBefore && keyCode === VK.LEFT ) || ( cursorAfter && keyCode === VK.RIGHT ) ) {
			return;
		}

		view = isView( node );

		if ( ( cursorAfter && keyCode === VK.UP ) || ( cursorBefore && keyCode === VK.BACKSPACE ) ) {
			if ( view.previousSibling ) {
				if ( isView( view.previousSibling ) ) {
					setViewCursor( false, view.previousSibling );
				} else {
					selection.select( view.previousSibling, true );
					selection.collapse();
				}
			} else {
				handleEnter( view, true );
			}
			event.preventDefault();
		} else if ( cursorAfter && keyCode === VK.DOWN ) {
			if ( view.nextSibling ) {
				if ( isView( view.nextSibling ) ) {
					setViewCursor( false, view.nextSibling );
				} else {
					return;
				}
			} else {
				handleEnter( view );
			}
			event.preventDefault();
		} else if ( cursorBefore && keyCode === VK.UP ) {
			if ( view.previousSibling ) {
				if ( isView( view.previousSibling ) ) {
					setViewCursor( true, view.previousSibling );
				} else {
					return;
				}
			} else {
				handleEnter( view, true );
			}
			event.preventDefault();
		} else if ( cursorBefore && keyCode === VK.DOWN ) {
			if ( view.previousSibling ) {
				if ( isView( view.nextSibling ) ) {
					setViewCursor( true, view.nextSibling );
				} else {
					selection.setCursorLocation( view.nextSibling, 0 );
				}
			} else {
				handleEnter( view );
			}
			event.preventDefault();
		} else if ( ( cursorAfter && keyCode === VK.LEFT ) || ( cursorBefore && keyCode === VK.RIGHT ) ) {
			select( view );
			event.preventDefault();
		} else if ( cursorAfter && keyCode === VK.BACKSPACE ) {
			dom.remove( view );
			event.preventDefault();
		} else if ( cursorAfter ) {
			handleEnter( view );
		} else if ( cursorBefore ) {
			handleEnter( view , true);
		}

		if ( keyCode === VK.ENTER ) {
			event.preventDefault();
		}
	} );

	// Make sure we don't eat any content.
	editor.on( 'keydown', function( event ) {
		var selection = editor.selection,
			range, view;

		if ( event.keyCode === VK.BACKSPACE ) {
			if ( ( range = selection.getRng() ) &&
					range.startOffset === 0 &&
					range.endOffset === 0 &&
					selection.isCollapsed() &&
					( view = isView( selection.getNode().previousSibling ) ) &&
					! editor.dom.isEmpty( selection.getNode() ) ) {
				setViewCursor( false, view );
				event.preventDefault();
			}
		}
	} );

	editor.on( 'keyup', function( event ) {
		var padNode,
			keyCode = event.keyCode,
			body = editor.getBody(),
			range;

		// Remove views that were cut and marked for removal on keydown.
		if ( toRemove ) {
			editor.dom.remove( toRemove );
			toRemove = false;
		}

		if ( keyCode === VK.DELETE || keyCode === VK.BACKSPACE ) {
			// Make sure there is padding if the last element is a view
			if ( isView( body.lastChild ) ) {
				padNode = createPadNode();
				body.appendChild( padNode );

				if ( body.childNodes.length === 2 ) {
					editor.selection.setCursorLocation( padNode, 0 );
				}
			}

			range = editor.selection.getRng();

			// Allow an initial element in the document to be removed when it is before a view
			if ( body.firstChild === range.startContainer && range.collapsed === true &&
					isView( range.startContainer.nextSibling ) && range.startOffset === 0 ) {

				editor.dom.remove( range.startContainer );
			}
		}
	});

	editor.on( 'nodechange', function( event ) {
		var dom = editor.dom,
			views = editor.dom.select( '.wpview-wrap' ),
			className = event.element.className,
			view = event.element.parentNode;

		clearInterval( cursorInterval );

		dom.removeClass( views, 'wpview-selection-before' );
		dom.removeClass( views, 'wpview-selection-after' );
		dom.removeClass( views, 'wpview-cursor-hide' );

		if ( ! selected && className === 'wpview-selection-before' || className === 'wpview-selection-after' ) {
			dom.addClass( view, className );

			cursorInterval = setInterval( function() {
				if ( dom.hasClass( view, 'wpview-cursor-hide' ) ) {
					dom.removeClass( view, 'wpview-cursor-hide' );
				} else {
					dom.addClass( view, 'wpview-cursor-hide' );
				}
			}, 500 );
		}
	} );

	return {
		getViewText: getViewText,
		setViewText: setViewText,
		select: select,
		deselect: deselect
	};
});

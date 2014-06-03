wp.mce.views.register( 'map', {
	View: {
		initialize: function() {}, // options
		getHtml: function() { // attributes, content, tag
			return '<style type="text/css">.map img { max-width: none; }</style>';
		},
		unbind: function() {}
	},
	edit: function() {}
} );

( function( $, window ) {

	fullscreen = {
		bind_resize: function() {},
		dfwWidth: function() {},
		fade: {
			In: function() {},
			Out: function() {},
			sensitivity: 100,
			transitions: true
		},
		off: this.on,
		on: function() {
			$( 'body' ).toggleClass( 'fullscreen' );
			this.settings.visible = true;
			$( window ).trigger( 'resize' );
		},
		pubsub: {
			publish: function() {},
			subscribe: function() {},
			topics: {
				hidden: [],
				hide: [],
				hiding: [],
				show: [],
				showing: [],
				shown: []
			},
			unsubscribe: function() {}
		},
		refreshButtons: function() {},
		resizeTextarea: function() {},
		save: function() {},
		settings: {
			id: "",
			mode: "tinymce",
			timer: 0,
			title_id: "",
			toolbar_shown: true,
			visible: false
		},
		switchmode: function() {},
		toggleUI: function() {},
		ui: {
			fade: function() {},
			init: function() {}
		}
	}

	window.wp = window.wp || {};
	window.wp.editor = window.wp.editor || {};
	window.wp.editor.fullscreen = fullscreen;

} )( jQuery, window );

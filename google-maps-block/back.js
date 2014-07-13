/* global google */

( function( $, views ) {
	'use strict';

	views.register( 'map', {
		initialize: function() {
			var self = this;

			$( this ).on( 'ready', function( event, editor, node, content ) {
				if ( typeof google === 'undefined' || ! google.maps ) {
					return self.setError( 'Google Maps seems to be down.' );
				}

				var inlineControls = this.inlineControls( {
						template: wp.media.template( 'google-maps-edit' ),
						viewNode: node,
						editor: editor
					} ),
					input = inlineControls.input,
					attributes = self.shortcode.attrs.named,
					maps = google.maps,
					addListener = maps.event.addListener,
					mapElement, latLng, map, marker, autocomplete;

				mapElement = editor.dom.create( 'div' );
				mapElement.className = 'map';
				mapElement.style.height = attributes.height;

				content.appendChild( mapElement );

				latLng = new google.maps.LatLng( attributes.latitude, attributes.longitude );

				map = new google.maps.Map( mapElement, {
					zoom: parseInt( attributes.zoom, 10 ),
					center: latLng,
					mapTypeId: google.maps.MapTypeId[ attributes.type.toUpperCase() ]
				} );

				marker = new maps.Marker( {
					position: latLng,
					map: map,
					draggable: true,
					visible: !! attributes.marker
				} );

				autocomplete = new maps.places.Autocomplete( input.$address[0] );
				autocomplete.bindTo( 'bounds', map );

				input.$marker.on( 'change', function() {
					marker.setVisible( input.$marker.is( ':checked' ) );
				} );

				addListener( autocomplete, 'place_changed', function() {
					var place = autocomplete.getPlace();

					if ( ! place.geometry ) {
						return;
					}

					map.panTo( place.geometry.location );
					map.setZoom( 12 );
				} );

				addListener( map, 'center_changed', _.debounce( function() {
					var center = map.getCenter();
					marker.setPosition( center );
					input.$latitude.val( center.lat() ).change();
					input.$longitude.val( center.lng() ).change();
				}, 500 ) );

				addListener( map, 'zoom_changed', function() {
					input.$zoom.val( map.getZoom() ).change();
				} );

				addListener( map, 'maptypeid_changed', function() {
					input.$type.val( map.getMapTypeId() ).change();
				} );

				addListener( marker, 'dragend', function() {
					var center = marker.getPosition();
					map.panTo( center );
					input.$latitude.val( center.lat() ).change();
					input.$longitude.val( center.lng() ).change();
				} );

				maps.event.addDomListener( input.$address[0], 'keydown', function( event ) {
					if ( event.keyCode === 13 ) {
						event.preventDefault();
					}
				} );
			} );
		},
		overlay: true
	} );

} )( jQuery, wp.mce.views );

/* global google */

( function( $, views ) {
	'use strict';

	views.register( 'map', {
		editTemplate: function() {
			return '' +
				'<form>' +
					'<input type="hidden" name="latitude" value"">' +
					'<input type="hidden" name="longitude" value"">' +
					'<input type="hidden" name="zoom" value"">' +
					'<input type="hidden" name="height" value"">' +
					'<input type="hidden" name="type" value"">' +
					'<select><option>la</option><option>la</option><option>la</option><option>la</option><option>la</option><option>la</option><option>la</option><option>la</option><option>la</option><option>la</option><option>la</option><option>la</option><option>la</option></select>' +
					'<div style="padding: 5px 5px 10px;">' +
						'<input type="text" name="address" value"" placeholder="Search..." style="line-height: 1.5;margin-right: 5px;">' +
						'<label for="map-shortcode-marker"><input type="checkbox" id="map-shortcode-marker" name="marker" value"true"> Show marker</label>' +
						'<input type="submit" class="button button-primary alignright">' +
					'</div>' +
				'</form>';
		},
		content: function( document, iframe, editIframe, view ) {
			if ( typeof google === 'undefined' ) {
				this.setError( 'Google Maps seems to be down.' )
				return;
			}

			var $document = $( document ),
				$editDocument = $( editIframe.contentWindow.document ),
				mapElement, latLng, map, marker, autocomplete,
				attributes = this.shortcode.attrs.named,
				maps = google.maps,
				addListener = maps.event.addListener,
				inputAddress = $editDocument.find( 'input[name="address"]' ),
				inputLat = $editDocument.find( 'input[name="latitude"]' ),
				inputLng = $editDocument.find( 'input[name="longitude"]' ),
				inputType = $editDocument.find( 'input[name="type"]' ),
				inputZoom = $editDocument.find( 'input[name="zoom"]' ),
				inputMarker = $editDocument.find( 'input[name="marker"]' );

				console.log( inputAddress );

			mapElement = document.createElement( 'DIV' );
			mapElement.className = 'map';
			mapElement.style.width = '100%';
			mapElement.style.height = attributes.height;

			document.body.appendChild( mapElement );

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

			autocomplete = new maps.places.Autocomplete( inputAddress[0] );
			autocomplete.bindTo( 'bounds', map );

			inputMarker.on( 'change', function() {
				marker.setVisible( inputMarker.is( ':checked' ) );
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
				inputLat.val( center.lat() );
				inputLng.val( center.lng() );
			}, 500 ) );

			addListener( map, 'zoom_changed', function() {
				inputZoom.val( map.getZoom() );
			} );

			addListener( map, 'maptypeid_changed', function() {
				inputType.val( map.getMapTypeId() );
			} );

			addListener( marker, 'dragend', function() {
				var center = marker.getPosition();
				map.panTo( center );
				inputLat.val( center.lat() );
				inputLng.val( center.lng() );
			} );

			maps.event.addDomListener( inputAddress[0], 'keydown', function( event ) {
				if ( event.keyCode === 13 ) {
					event.preventDefault();
				}
			} );

			$( view ).on( 'edit', function() {
				console.log( 'clicked edit' );
			} );

			$document.click( function() {
				$( iframe ).click();
			} );
		},
		edit: function() {}
	} );

} )( jQuery, wp.mce.views );

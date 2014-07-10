/* global google */

( function( $, views ) {
	'use strict';

	views.register( 'map', {
		overlay: true,
		content: function( doc, iframe, view, editor ) {
			if ( typeof google === 'undefined' || ! google.maps ) {
				this.setError( 'Google Maps seems to be down.' );
				return;
			}

			var self = this,
				$view = $( view ),
				$template, modal,
				mapElement, latLng, map, marker, autocomplete,
				attributes = this.shortcode.attrs.named,
				maps = google.maps,
				addListener = maps.event.addListener;

			mapElement = doc.createElement( 'DIV' );
			mapElement.className = 'map';
			mapElement.style.width = '100%';
			mapElement.style.height = attributes.height;

			doc.body.appendChild( mapElement );

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

			$view.on( 'select', function() {
				var editorBody = editor.getBody(),
					editorIframeOffset = $( editor.getContentAreaContainer().getElementsByTagName( 'iframe' ) ).offset(),
					inputAddress, inputLat, inputLng, inputType, inputZoom, inputMarker;

				modal = document.createElement( 'DIV' );
				modal.id = 'wp-block-edit';

				$( modal ).css( {
					opacity: 0,
					top: editorIframeOffset.top + editor.dom.getPos( view ).y,
					left: editorIframeOffset.left + editor.dom.getPos( editorBody ).x,
					width: editorBody.offsetWidth
				} );

				document.body.appendChild( modal );

				$template = $( $.trim( wp.media.template( 'google-maps-edit' )() ) );

				modal.appendChild( $template[0] );

				$view
					.find( '.wpview-edit-placeholder' )
					.height( $( modal ).height() )
					.slideDown( 'fast', function() {
						$( modal ).hide().css( 'opacity', '' ).fadeIn();
					} );

				inputAddress = $template.find( 'input[name="address"]' );
				inputLat = $template.find( 'input[name="latitude"]' );
				inputLng = $template.find( 'input[name="longitude"]' );
				inputType = $template.find( 'input[name="type"]' );
				inputZoom = $template.find( 'input[name="zoom"]' );
				inputMarker = $template.find( 'input[name="marker"]' );

				$.each( attributes, function( key, value ) {
					var input = $template.find( 'input[name="' + key + '"]' );
					if ( input ) {
						if ( input.is( ':checkbox' ) ) {
							input.prop( 'checked', value );
						} else {
							input.val( value );
						}
					}
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
					inputLat.val( center.lat() ).change();
					inputLng.val( center.lng() ).change();
				}, 500 ) );

				addListener( map, 'zoom_changed', function() {
					inputZoom.val( map.getZoom() ).change();
				} );

				addListener( map, 'maptypeid_changed', function() {
					inputType.val( map.getMapTypeId() ).change();
				} );

				addListener( marker, 'dragend', function() {
					var center = marker.getPosition();
					map.panTo( center );
					inputLat.val( center.lat() ).change();
					inputLng.val( center.lng() ).change();
				} );

				maps.event.addDomListener( inputAddress[0], 'keydown', function( event ) {
					if ( event.keyCode === 13 ) {
						event.preventDefault();
					}
				} );
			} );

			editor.on( 'nodechange', function( event ) {
				if ( event.element !== $( view ).find( '.wpview-clipboard' )[0] ) {
					$.fn.serializeObject = function() {
						var object = {},
							array = this.serializeArray();
						$.each( array, function() {
							if ( object[ this.name ] !== undefined ) {
								if ( ! object[ this.name ].push ) {
									object[ this.name ] = [ object[ this.name ] ];
								}
								object[ this.name ].push( this.value || '' );
							} else {
								object[ this.name ] = this.value || '';
							}
						} );
						return object;
					};

					if ( $template && $template.length ) {
						views.refreshView( self, self.formToShortcode( $( $template ).serializeObject() ), view, true );
						editor.undoManager.add();
					}

					$( modal ).remove();
					$view.find( '.wpview-edit-placeholder' ).hide();
				}
			} );

			$view.on( 'deselect', function() {
				$view.find( '.wpview-edit-placeholder' ).slideUp();
			} );
		}
	} );

} )( jQuery, wp.mce.views );

<script src="https://maps.googleapis.com/maps/api/js?sensor=false"></script>
<style type="text/css">.map img { max-width: none; }</style>
<script type="text/javascript">
	'use strict'; // &amp;libraries=places

	var attributes = <?php echo json_encode( $attributes ); ?>,
		thisScript = document.currentScript || document.scripts[ document.scripts.length - 1 ];

	google.maps.event.addDomListener( window, 'load', function() {
		var mapElement, latLng, mapOptions, map;

		mapElement = document.createElement( 'DIV' );
		mapElement.className = 'map';
		mapElement.style.width = '100%';
		mapElement.style.height = attributes.height;

		thisScript.parentNode.insertBefore( mapElement, thisScript );

		latLng = new google.maps.LatLng( attributes.latitude, attributes.longitude );

		mapOptions = {
			zoom: parseInt( attributes.zoom, 10 ),
			center: latLng,
			mapTypeId: google.maps.MapTypeId[ attributes.type.toUpperCase() ],
			styles: [{
				featureType: "administrative",
				stylers: [{
					visibility: "on"
				}, {
					weight: 0.1
				}]
			}, {
				featureType: "poi",
				stylers: [{
					visibility: "simplified"
				}]
			}, {
				featureType: "road",
				elementType: "labels",
				stylers: [{
					visibility: "simplified"
				}]
			}, {
				featureType: "water",
				stylers: [{
					visibility: "simplified"
				}]
			}, {
				featureType: "transit",
				stylers: [{
					visibility: "simplified"
				}]
			}, {
				featureType: "landscape",
				stylers: [{
					visibility: "simplified"
				}]
			}, {
				featureType: "road.highway",
				stylers: [{
					visibility: "off"
				}]
			}, {
				featureType: "road.local",
				stylers: [{
					visibility: "on"
				}]
			}, {
				featureType: "road.highway",
				elementType: "geometry",
				stylers: [{
					visibility: "on"
				}]
			}, {
				featureType: "water",
				stylers: [{
					color: "#84afa3"
				}, {
					lightness: 52
				}]
			}, {
				stylers: [{
					saturation: -17
				}, {
					gamma: 0.36
				}]
			}, {
				featureType: "transit.line",
				elementType: "geometry",
				stylers: [{
					color: "#3f518c"
				}]
			}]
		};

		map = new google.maps.Map( mapElement, mapOptions );

		if ( attributes.marker ) {
			new google.maps.Marker( {
				position: latLng,
				map: map
			} );
		}
	} );
</script>

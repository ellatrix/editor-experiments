<script src="https://maps.googleapis.com/maps/api/js?sensor=false"></script>
<style type="text/css">.map img { max-width: none; }</style>
<script type="text/javascript">
	'use strict';

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
			mapTypeId: google.maps.MapTypeId[ attributes.type.toUpperCase() ]
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

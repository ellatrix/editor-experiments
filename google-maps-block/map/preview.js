/* global attributes, google */

google.maps.event.addDomListener( window, 'load', function() {
	var mapElement, latLng, mapOptions, map;

	mapElement = document.createElement( 'DIV' );
	mapElement.className = 'map';
	mapElement.style.width = '100%';
	mapElement.style.height = attributes.height;

	document.body.appendChild( mapElement );

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
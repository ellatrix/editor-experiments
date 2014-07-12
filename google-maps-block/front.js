/* global google */

( function() {
	'use strict';

	if ( typeof google === 'undefined' || ! google.maps ) {
		return;
	}

	var gmaps = google.maps;

	gmaps.event.addDomListener( window, 'load', function() {
		var maps = document.querySelectorAll( '.map' ),
			i, map, attributes, gmap, latLng, marker;

		for ( i = 0; i < maps.length; ++i ) {
			map = maps[i];
			attributes = map.dataset;

			map.style.width = '100%';
			map.style.height = attributes.height;

			latLng = new gmaps.LatLng( attributes.latitude, attributes.longitude );

			gmap = new gmaps.Map( map, {
				zoom: parseInt( attributes.zoom, 10 ),
				center: latLng,
				mapTypeId: gmaps.MapTypeId[ attributes.type.toUpperCase() ]
			} );

			marker = new gmaps.Marker( {
				position: latLng,
				map: gmap,
				visible: !! attributes.marker
			} );
		}
	} );
} )();

<?php

/*
Plugin Name: Google Maps Block
Plugin URI: https://github.com/avryl/editor-experiments
Description: Add a Google Maps content block.
Author: Janneke Van Dorpe
Author URI: http://profiles.wordpress.org/avryl/
Version: 0.1
Text Domain: google-maps-block
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
*/

if ( ! class_exists( 'Editor_Experiments' ) ) {
	return;
}

add_action( 'wp_enqueue_scripts', 'google_map_block_enqueue_scripts' );
add_action( 'print_media_templates', 'google_map_block_print_media_templates' );

function google_map_block_enqueue_scripts() {
	wp_enqueue_script( 'google-maps-api', 'https://maps.googleapis.com/maps/api/js?sensor=false' );
}

function google_map_block_print_media_templates() {
	?>
	<script type="text/html" id="tmpl-google-maps-edit">
		<form>
			<input type="hidden" name="latitude" value="">
			<input type="hidden" name="longitude" value="">
			<input type="hidden" name="zoom" value="">
			<input type="hidden" name="height" value="">
			<input type="hidden" name="type" value="">
			<div style="padding: 5px 5px 10px;">
				<input type="text" name="address" value="" placeholder="Search..." style="line-height: 1.5;margin-right: 5px;">
				<label for="map-shortcode-marker"><input type="checkbox" id="map-shortcode-marker" name="marker" value="true"> Show marker</label>
			</div>
		</form>
	</script>
	<?php
}

add_action( 'admin_enqueue_scripts', 'google_map_block_admin_enqueue_scripts' );

function google_map_block_admin_enqueue_scripts() {
	wp_enqueue_script( 'google-maps-api', 'https://maps.googleapis.com/maps/api/js?sensor=false&amp;libraries=places' );
}

register_shortcode( 'map', array(
	'__FILE__' => __FILE__,
	'content' => false,
	'block' => true,
	'attributes' => array(
		'latitude' => array(
			'title' => __( 'Latitude' ),
			'defaults' => '0'
		),
		'longitude' => array(
			'title' => __( 'Longitude' ),
			'defaults' => '0'
		),
		'zoom' => array(
			'title' => __( 'Zoom' ),
			'defaults' => '1'
		),
		'marker' => array(
			'title' => __( 'Marker' ),
			'defaults' => false
		),
		'height' => array(
			'title' => __( 'Height' ),
			'defaults' => '400px'
		),
		'type' => array(
			'title' => __( 'Type' ),
			'defaults' => 'roadmap'
		)
	),
	'scripts' => array( 'google-maps-api' )
) );

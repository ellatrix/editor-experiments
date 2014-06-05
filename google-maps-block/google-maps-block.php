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

function google_map_block_enqueue_scripts() {
	wp_enqueue_script( 'google-maps-api', 'https://maps.googleapis.com/maps/api/js?sensor=false' );
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
	'scripts' => array( 'google-maps-api' ),
	'block_preview_interaction' => true
) );

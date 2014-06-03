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

register_shortcode( 'map', array(
	'__FILE__' => __FILE__,
	'content' => false,
	'block' => true,
	'attributes' => array(
		'latitude' => array(
			'title' => __( 'Latitude' ),
			'default' => '0'
		),
		'longitude' => array(
			'title' => __( 'Longitude' ),
			'default' => '0'
		),
		'zoom' => array(
			'title' => __( 'Zoom' ),
			'default' => '1'
		),
		'marker' => array(
			'title' => __( 'Marker' ),
			'default' => false
		),
		'height' => array(
			'title' => __( 'Height' ),
			'default' => '400px'
		),
		'type' => array(
			'title' => __( 'Type' ),
			'default' => 'roadmap'
		)
	),
	'scripts' => array( 'google-maps-api' ),
	'block_preview_interaction' => true
) );

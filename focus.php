<?php

/*
Plugin Name: Focus
Plugin URI: http://wordpress.org/plugins/focus/
Description: Focus.
Author: Janneke Van Dorpe
Author URI: http://profiles.wordpress.org/avryl/
Version: 0.1
Text Domain: focus
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
*/

if ( is_admin() && ! class_exists( 'Focus' ) ) {

	class Focus {

		function __construct() {

			add_filter( 'mce_css', array( $this, 'mce_css' ) );
			add_action( 'mce_external_plugins', array( $this, 'mce_external_plugins' ) );
			add_action( 'wp_enqueue_editor', array( $this, 'wp_enqueue_editor' ) );
			add_action( 'tiny_mce_before_init', array( $this, 'tiny_mce_before_init' ) );

		}

		function mce_css( $css ) {

			$css = explode( ',', $css );

			array_push( $css, plugins_url( 'tinymce.content.css?ver=' . urlencode( time() ), __FILE__ ) );

			return implode( ',', $css );

		}

		function mce_external_plugins( $plugins ) {

			$plugins['autoresize'] = plugins_url( 'tinymce.autoresize.js', __FILE__ );

			return $plugins;

		}

		function wp_enqueue_editor( $args ) {

			if ( ! empty( $args['tinymce'] ) ) {

				wp_enqueue_style( 'wp-editor-focus', plugins_url( 'wp.editor.focus.css', __FILE__ ) );
				wp_enqueue_script( 'wp-editor-focus', plugins_url( 'wp.editor.focus.js', __FILE__ ), array( 'jquery', 'hoverIntent' ), '0.3', true );

			}
		}

		function tiny_mce_before_init( $init ) {

			$init['resize'] = false;

			return $init;

		}

	}

	new Focus;

}

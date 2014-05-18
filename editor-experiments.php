<?php

/*
Plugin Name: Editor Experiments
Plugin URI: http://wordpress.org/plugins/editor-experiments/
Description: TinyMCE blocks.
Author: Janneke Van Dorpe
Author URI: http://profiles.wordpress.org/avryl/
Version: 0.1
Text Domain: editor-experiments
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
*/

if ( is_admin() && ! class_exists( 'Editor_Experiments' ) ) {

	class Editor_Experiments {

		function __construct() {

			add_filter( 'mce_css', array( $this, 'mce_css' ) );

			add_action( 'tiny_mce_plugins', array( $this, 'tiny_mce_plugins' ) );
			add_action( 'mce_external_plugins', array( $this, 'mce_external_plugins' ) );
			add_action( 'wp_enqueue_editor', array( $this, 'wp_enqueue_editor' ) );
			add_action( 'mce_buttons', array( $this, 'mce_buttons' ) );
			add_action( 'mce_buttons_2', array( $this, 'mce_buttons_2' ) );
			add_action( 'tiny_mce_before_init', array( $this, 'tiny_mce_before_init' ) );
			add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ) );

		}

		function mce_css( $css ) {

			$css = explode( ',', $css );

			array_push( $css, plugins_url( '/content.css?ver=' . urlencode( time() ), __FILE__ ) );

			return implode( ',', $css );

		}

		function tiny_mce_plugins( $plugins ) {

			$to_remove = array_keys( $plugins, 'wpview' );
			$to_remove = array_merge( $to_remove, array_keys( $plugins, 'wpeditimage' ) );
			$to_remove = array_merge( $to_remove, array_keys( $plugins, 'wpgallery' ) );

			foreach( $to_remove as $plugin ) {
			    unset( $plugins[$plugin] );
			}

			return $plugins;

		}

		function mce_external_plugins( $plugins ) {

			$plugins['autoresize'] = plugins_url( 'tinymce.autoresize.js', __FILE__ );
			$plugins['wpview'] = plugins_url( 'tinymce.view.js', __FILE__ );
			$plugins['wpeditimage'] = plugins_url( 'tinymce.image.js', __FILE__ );
			$plugins['wpgallery'] = plugins_url( 'tinymce.gallery.js', __FILE__ );
			$plugins['general'] = plugins_url( 'tinymce.general.js', __FILE__ );

			return $plugins;

		}

		function wp_enqueue_editor( $args ) {

			if ( ! empty( $args['tinymce'] ) ) {

				wp_enqueue_style( 'wp-editor-scroll', plugins_url( 'wp.editor.scroll.css', __FILE__ ) );
				wp_enqueue_script( 'wp-editor-scroll', plugins_url( 'wp.editor.scroll.js', __FILE__ ), array( 'jquery', 'hoverIntent' ), false, true );

			}
		}

		function mce_buttons( $buttons ) {

			return $buttons;

		}

		function mce_buttons_2( $buttons ) {

			return $buttons;

		}

		function tiny_mce_before_init( $init ) {

			$init['resize'] = false;

			return $init;

		}

		function admin_enqueue_scripts() {

			wp_deregister_script( 'mce-view' );
			wp_register_script( 'mce-view', plugins_url( 'wp.mce.view.js', __FILE__ ), array( 'shortcode', 'media-models', 'media-audiovideo', 'wp-playlist' ), false, true );

		}

	}

	new Editor_Experiments;

}

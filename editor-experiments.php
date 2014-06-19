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

if ( ! class_exists( 'Editor_Experiments' ) ) {

	class Editor_Experiments {

		const WP_VERSION = '4.0-alpha-28611-src';

		function __construct() {

			if ( is_admin() ) {

				add_filter( 'mce_css', array( $this, 'mce_css' ) );

				add_action( 'tiny_mce_plugins', array( $this, 'tiny_mce_plugins' ) );
				add_action( 'mce_external_plugins', array( $this, 'mce_external_plugins' ) );
				add_action( 'wp_enqueue_editor', array( $this, 'wp_enqueue_editor' ) );
				add_action( 'mce_buttons', array( $this, 'mce_buttons' ), 10, 2 );
				add_action( 'mce_buttons_2', array( $this, 'mce_buttons_2' ), 10, 2 );
				add_action( 'tiny_mce_before_init', array( $this, 'tiny_mce_before_init' ) );
				add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ) );
				add_action( 'wp_enqueue_editor', array( $this, 'wp_enqueue_editor_shortcodes' ) );
				add_action( 'admin_footer', array( $this, 'admin_footer_shortcodes' ) );
				add_action( 'wp_ajax_parse-embed', array( $this, 'wp_ajax_parse_embed' ), 1 );

			}

		}

		static function admin_notices() {

			echo '<div class="error"><p>Please update WordPress to <strong>' . self::WP_VERSION . '</strong> to activate the editor experiments.</p></div>';

		}

		function mce_css( $css ) {

			$css = explode( ',', $css );

			array_push( $css, plugins_url( 'tinymce.content.css?ver=' . urlencode( time() ), __FILE__ ) );

			return implode( ',', $css );

		}

		function tiny_mce_plugins( $plugins ) {

			$to_remove = array_keys( $plugins, 'wpview' );
			$to_remove = array_merge( $to_remove, array_keys( $plugins, 'wpeditimage' ) );
			$to_remove = array_merge( $to_remove, array_keys( $plugins, 'wpgallery' ) );
			$to_remove = array_merge( $to_remove, array_keys( $plugins, 'wordpress' ) );
			$to_remove = array_merge( $to_remove, array_keys( $plugins, 'wpfullscreen' ) );

			foreach( $to_remove as $plugin ) {
			    unset( $plugins[$plugin] );
			}

			return $plugins;

		}

		function mce_external_plugins( $plugins ) {

			$plugins['wpview'] = plugins_url( 'tinymce.view.js', __FILE__ );
			$plugins['wpeditimage'] = plugins_url( 'tinymce.image.js', __FILE__ );
			$plugins['wpgallery'] = plugins_url( 'tinymce.gallery.js', __FILE__ );
			$plugins['general'] = plugins_url( 'tinymce.general.js', __FILE__ );
			$plugins['insert'] = plugins_url( 'tinymce.insert.js', __FILE__ );
			$plugins['toolbar'] = plugins_url( 'tinymce.toolbar.js', __FILE__ );
			$plugins['title'] = plugins_url( 'tinymce.title.js', __FILE__ );
			$plugins['wordpress'] = plugins_url( 'tinymce.wordpress.js', __FILE__ );
			$plugins['wpfullscreen'] = plugins_url( 'tinymce.fullscreen.js', __FILE__ );

			return $plugins;

		}

		function wp_enqueue_editor( $args ) {

			wp_enqueue_style( 'editor', plugins_url( 'editor.css', __FILE__ ) );

			if ( ! empty( $args['tinymce'] ) ) {

			}

		}

		function mce_buttons( $buttons, $id ) {

			return $id === 'content' ? array( 'undo', 'redo', 'fullscreen', 'pastetext', 'removeformat', 'switchmode' ) : $buttons;

			// TODO: 'bullist', 'numlist', 'alignleft', 'aligncenter', 'alignright', 'charmap', 'outdent', 'indent', 'wp_help'

		}

		function mce_buttons_2( $buttons, $id ) {

			return $id === 'content' ? array() : $buttons;

		}

		function tiny_mce_before_init( $init ) {

			global $_shortcodes, $wp_scripts;

			$init['iframeViewCSS'] = plugins_url( 'iframe.css', __FILE__ );
			$init['_shortcodes'] = json_encode( $_shortcodes );
			$init['_scripts'] = json_encode( $wp_scripts->registered );

			return $init;

		}

		function admin_enqueue_scripts() {

			wp_deregister_script( 'mce-view' );
			wp_deregister_script( 'wp-fullscreen' );
			wp_register_script( 'mce-view', plugins_url( 'wp.mce.view.js', __FILE__ ), array( 'shortcode', 'media-models', 'media-audiovideo', 'wp-playlist' ), false, true );
			wp_register_script( 'wp-fullscreen', plugins_url( 'wp.editor.fullscreen.js', __FILE__ ), array( 'jquery' ), false, true );

		}

		static function shortcode_callback( $attributes, $content, $tag ) {
			global $_shortcodes;

			$defaults = array_map( array( 'Editor_Experiments', 'set_default' ) , $_shortcodes[ $tag ]['attributes'] );

			$attributes = shortcode_atts( $defaults, $attributes );
			$attributes = array_map( array( 'Editor_Experiments', 'set_false' ) , $attributes );

			ob_start();
			include( trailingslashit( $_shortcodes[ $tag ]['path'] ) . 'template.php' );
			return ob_get_clean();
		}

		static function set_false( $attribute ) {
			return $attribute === 'false' ? false : $attribute;
		}

		static function set_default( $attribute ) {
			return $attribute['defaults'];
		}

		function wp_enqueue_editor_shortcodes() {
			global $_shortcodes;

			foreach ( $_shortcodes as $shortcode => $settings ) {
				if ( file_exists( plugin_dir_path( $settings['__FILE__'] ) . $shortcode . '/register.js' ) ) {
					wp_enqueue_script( $shortcode . '-view-registration', plugins_url( $shortcode . '/register.js', $settings['__FILE__'] ), array( 'mce-view' ), false, true );
				}
			}
		}

		function admin_footer_shortcodes() {
			global $_shortcodes;

			foreach ( $_shortcodes as $shortcode => $settings ) {
				?>
				<form id="<?php echo $shortcode; ?>-shortcode-edit-template" class="shortcode-edit-template" style="display: none;">
					<span class="shortcode-edit-template-tag">EDIT <?php echo strtoupper( $shortcode ); ?></span>
					<?php include( plugin_dir_path( $settings['__FILE__'] ) . $shortcode . '/edit.php' ); ?>
				</form>
				<?php
			}
		}

		function wp_ajax_parse_embed() {
			global $post, $wp_embed;

			if ( ! $post = get_post( (int) $_REQUEST['post_ID'] ) ) {
				wp_send_json_error();
			}

			if ( ! current_user_can( 'read_post', $post->ID ) ) {
				wp_send_json_error();
			}

			setup_postdata( $post );

			$parsed = $wp_embed->run_shortcode( $_POST['content'] );
			$parsed = do_shortcode( $parsed );

			wp_send_json_success( $parsed );
		}
	}

	global $wp_version;

	if ( empty( $wp_version ) || version_compare( $wp_version, Editor_Experiments::WP_VERSION, '<' ) ) {

		add_action( 'admin_notices', array( 'Editor_Experiments', 'admin_notices' ) );

		return;

	}

	new Editor_Experiments;

	function register_shortcode( $tag, $settings ) {

		// 'callback' => (function) *
		// 'block' => (bool) *
		// 'command' => (string) TinyMCE command
		// 'button' => (string) TinyMCE button, defaults to 'command'
		// 'plugin' => (string) Added by plugin
		// 'description' => (string)
		// 'parameters' => (array)

		// 	_doing_it_wrong( __FUNCTION__, '', null );

		global $_shortcodes;

		if ( ! is_array( $_shortcodes ) ) {
			$_shortcodes = array();
		}

		if ( file_exists( plugin_dir_path( $settings['__FILE__'] ) . $tag . '/preview.js' ) ) {
			$settings['previewjs'] = plugins_url( $tag . '/preview.js', $settings['__FILE__'] );
		}

		$_shortcodes[$tag] = $settings;

		add_shortcode( $tag, array( 'Editor_Experiments', 'shortcode_callback' ) );

	}

	require_once( 'focus/focus.php' );
	require_once( 'google-maps-block/google-maps-block.php' );

}

/**
 * lc_micro_slider.js - lightweight responsive slider with jquery.touchSwipe.js integration
 * Version: 1.2
 * Author: Luca Montanari aka LCweb
 * Website: http://www.lcweb.it
 * Licensed under the MIT license
 */

(function ($) {
	var lc_micro_slider = function(element, lcms_settings) {
		
		var settings = $.extend({
			slide_fx		: 'fadeslide',	// (string) sliding effect / none - slide - fade - fadeslide - zoom-in - zoom-out
			nav_arrows		: true,		// (bool) shows navigation arrows 
			nav_dots		: true,		// (bool) shows navigation dots
			slideshow_cmd	: true,		// (bool) shows slideshow commands (play/pause)
			carousel		: true,		// (bool) non-stop carousel
			touchswipe		: true,		// (bool) enable touch navigation (requires jquery.touchSwipe.js)
			autoplay		: false,	// (bool) starts the slideshow
			animation_time	: 700, 		// (int) animation timing in millisecods / 1000 = 1sec
			slideshow_time	: 5000, 	// (int) interval time of the slideshow in milliseconds / 1000 = 1sec	
			pause_on_hover	: true,		// (bool) pause and restart the autoplay on box hover
			loader_code		: '<span class="lcms_loader"></span>'	// loading animation code
		}, lcms_settings);

	
		// Global variables accessible only by the plugin
		var vars = { 
			slides : [], 		// slides array -> object {content - img}
			shown_slide : 0,	// shown slide index
			cached_img: [],		// array containing cached images
			is_sliding : false,
			is_playing : false,
			paused_on_hover : false 
		};	
		
		
		// .data() system to avoid issues on multi instances
		var $lcms_wrap_obj = $(element);
		$lcms_wrap_obj.data('lcms_vars', vars);
		$lcms_wrap_obj.data('lcms_settings', settings);		
			
		/////////////////////////////////////////////////////////////////	


		/*** setup slider and slides array ***/
		var slider_setup = function($wrap_obj) {
			var vars = $wrap_obj.data('lcms_vars');
			var settings = $wrap_obj.data('lcms_settings');
			
			$wrap_obj.find('li').each(function(i, v) {
            	$(this).find('noscript').remove();
				var obj = {
					'content' 	: $(this).html(),
					'img'		: $(this).attr('lcms_img'),
					'classes'	: (typeof($(this).attr('class')) == 'undefined') ? '' : $(this).attr('class') 
				}; 
				vars.slides.push(obj);
            });
			
			// populate with first to show
			$wrap_obj.html('<div class="lcms_wrap"><div class="lcms_container"></div></div>');
			
			vars.shown_slide = 0;
			populate_slide($wrap_obj, 'init', 0);
			
			// populate with arrows
			if(settings.nav_arrows && vars.slides.length > 1) {
				$wrap_obj.find('.lcms_wrap').addClass('lcms_has_nav_arr').prepend('<div class="lcms_nav"><span class="lcms_prev"></span><span class="lcms_next"></span></div>');	
			}
			
			// populate with full nav dots
			if(settings.nav_dots && vars.slides.length > 1) {
				var code = '<div class="lcms_nav_dots">';
				for(a=0; a<vars.slides.length; a++) {code += '<span rel="'+a+'"></span>';}
				
				$wrap_obj.find('.lcms_wrap').addClass('lcms_has_nav_dots').prepend(code+'</div>');	
				$wrap_obj.find('.lcms_nav_dots span').first().addClass('lcms_sel_dot');
			}
			
			// populate with slideshow commands
			if(settings.slideshow_cmd && vars.slides.length > 1) {
				$wrap_obj.find('.lcms_wrap').addClass('lcms_has_ss_cmd').prepend('<div class="lcms_play"><span></span></div>');	
			}
			
			// autoplay
			if(settings.autoplay) {
				$wrap_obj.lcms_start_slideshow();
			}
			
			// hook after slider is ready and showing first element
			$wrap_obj.trigger('lcms_ready');
			
			// touchswipe
			$(document).ready(function(e) {
				if(typeof($.fn.swipe) == 'function') {
					touchswipe();
				}
			});
		};



		/* populate slide and append it in the slider
		 * type -> init - fade - prev - next
		 */
		var populate_slide = function($wrap_obj, type, slide_index) {
			var vars = $wrap_obj.data('lcms_vars');
			var settings = $wrap_obj.data('lcms_settings');
			
			var slide = vars.slides[ slide_index ];
			var preload_class = (slide.img) ? 'lcms_preload' : '';
			var loader_code = (slide.img) ? settings.loader_code : '';
			var fx_class;
			
			// showing fx class
			switch(type) {
				case 'init' : fx_class = 'lcms_active_slide'; break;
				case 'fade' : fx_class = 'lcms_fadein'; break;	
				case 'prev' : fx_class = 'lcms_before'; break;	
				case 'next' : fx_class = 'lcms_after'; break;	
			}
			
			// if using dots nav - set selected
			$wrap_obj.find('.lcms_nav_dots span').removeClass('lcms_sel_dot');
			$wrap_obj.find('.lcms_nav_dots span').eq(slide_index).addClass('lcms_sel_dot');
			
			// contents block
			var bg 			= (slide.img) ? '<div class="lcms_bg" style="background-image: url('+ slide.img +');"></div>' : '';
			var contents 	= ($.trim(slide.content)) ? '<div class="lcms_content">'+ slide.content +'</div>' : '';	
			var slide_code = '<div class="lcms_slide '+ fx_class +' '+ preload_class +'" rel="'+ slide_index +'"><div class="lcms_inner '+ slide.classes +'">'+ bg + contents +'</div>'+ loader_code +'</div>';
			
			// populate
			$wrap_obj.find('.lcms_container').append(slide_code);	
			
			// preload current element	
			if(slide.img) {
				if( $.inArray(slide.img, vars.cached_img) === -1 ) {
					$('<img/>').bind("load",function(){ 
						vars.cached_img.push( this.src );
						
						$('.lcms_slide[rel='+ slide_index +']').removeClass('lcms_preload');
						$('.lcms_slide[rel='+ slide_index +']').find('> *').not('.lcms_inner').fadeOut(300, function() {
							$(this).remove();	
						});
						
						// trigger custom action | args: slide index - slide object
						$wrap_obj.trigger('lcms_slide_shown', [slide_index, slide]);
						
						// action for first slide shown | args: slide index - slide object
						if($('.lcms_slide[rel='+ slide_index +']').hasClass('lcms_active_slide')) {
							$wrap_obj.trigger('lcms_initial_slide_shown', [slide_index, slide]);	
						}
					}).attr('src', slide.img);
				}
				else {
					$('.lcms_slide[rel='+ slide_index +']').removeClass('lcms_preload').addClass('lcms_cached');
					$('.lcms_slide[rel='+ slide_index +']').find('> *').not('.lcms_inner').remove();	
					
					// trigger custom action | args: slide index - slide object
					$wrap_obj.trigger('lcms_slide_shown', [slide_index, slide]);
				}
			}
			
			// smart preload - previous and next
			if(vars.slides.length > 1) {
				var next_load = (slide_index < (vars.slides.length - 1)) ? (slide_index + 1) : 0;
				
				if( $.inArray(vars.slides[ next_load ].img, vars.cached_img) === -1 ) {
					$('<img/>').bind("load",function(){ 
						vars.cached_img.push( this.src );
					}).attr('src', vars.slides[ next_load ].img);
				}
			}
			if(vars.slides.length > 2) {
				var prev_load = (!slide_index) ? (vars.slides.length - 1) : (slide_index - 1); 
				
				if( $.inArray(vars.slides[ prev_load ].img, vars.cached_img) === -1 ) {
					$('<img/>').bind("load",function(){ 
						vars.cached_img.push( this.src );
					}).attr('src', vars.slides[ prev_load ].img);
				}
			}	
		};
		
		
		
		/*** change element - direction could be next/prev or slide index ***/
		lcms_slide = function($wrap_obj, direction) {
			var vars = $wrap_obj.data('lcms_vars');
			var settings = $wrap_obj.data('lcms_settings');
			var at = settings.animation_time;
			var curr_index = vars.shown_slide;
			
			if(!settings.carousel && ((direction == 'prev' &&  !vars.shown_slide) || (direction == 'next' &&  vars.shown_slide == vars.slides.length - 1))) {return false;}
			if(vars.lcms_is_sliding || vars.slides.length == 1) {return false;}
			if(typeof(direction) == 'number' && (direction < 0 || direction > (vars.slides.length - 1))) {return false;}
			
			vars.lcms_is_sliding = true;
			
			// find the new index and populate
			if(direction == 'prev') {
				var new_index = (curr_index === 0) ? (vars.slides.length - 1) : (curr_index - 1); 
			} 
			else if (direction == 'next') {
				var new_index = (curr_index == (vars.slides.length - 1)) ? 0 : (curr_index + 1); 	
			}
			else {
				var new_index = direction; // direct slide jump	
				direction = (new_index > curr_index) ? 'next' : 'prev'; // normalize direction var
			}
			
			// add class to active slide
			$wrap_obj.find('.lcms_active_slide').addClass('lcms_prepare_for_'+direction);
			
			// populate
			var type = (settings.slide_fx == 'fade') ? 'fade' : direction;
			populate_slide($wrap_obj, type, new_index);
			vars.shown_slide = new_index;
			
			// trigger custom action | args: new slide index - new slide object - old slide index
			$wrap_obj.trigger('lcms_changing_slide', [new_index, vars.slides[new_index], curr_index]);
			
			// entrance effects
			if(settings.slide_fx == 'fade') {
				$wrap_obj.find('.lcms_active_slide').fadeOut(at);	
			}
			
			else if(settings.slide_fx == 'slide') {
				if(direction == 'prev') {
					$wrap_obj.find('.lcms_before').css('left', '-100%').animate({left : '0%'}, at);
					$wrap_obj.find('.lcms_active_slide').animate({left : '100%'}, at);	
				} else {
					$wrap_obj.find('.lcms_after').css('left', '100%').animate({left : '0%'}, at);
					$wrap_obj.find('.lcms_active_slide').animate({left : '-100%'}, at);	
				}
			}
			
			else if(settings.slide_fx == 'fadeslide') {
				if(direction == 'prev') {
					$wrap_obj.find('.lcms_before').fadeTo(0, 0).animate({left : '0%', opacity: 1}, at);
					$wrap_obj.find('.lcms_active_slide').animate({left : '100%', opacity: 0}, at);	
				} else {
					$wrap_obj.find('.lcms_after').fadeTo(0, 0).animate({left : '0%', opacity: 1}, at);
					$wrap_obj.find('.lcms_active_slide').animate({left : '-100%', opacity: 0}, at);	
				}
			}

			else if(settings.slide_fx == 'zoom-in') {
				$wrap_obj.find('.lcms_before, .lcms_after').fadeTo(0, 0).animate(
					{opacity: 1},
					{step: function(now, fx) {
						var val = 0.5 + (now / 2);
						$(this).css('-ms-transform','scale('+val+')').css('-webkit-transform','scale('+val+')').css('transform','scale('+val+')'); 
					},
					duration: at
				});
			}
			
			else if(settings.slide_fx == 'zoom-out') {
				$wrap_obj.find('.lcms_before, .lcms_after').fadeTo(0, 0).animate(
					{opacity: 1},
					{step: function(now, fx) {
						var val = 1.5 - (now / 2);
						$(this).css('-ms-transform','scale('+val+')').css('-webkit-transform','scale('+val+')').css('transform','scale('+val+')'); 
					},
					duration: at
				});
			}


			setTimeout(function() {
				$wrap_obj.find('.lcms_active_slide').remove();
				$wrap_obj.find('.lcms_slide').removeClass('lcms_fadein lcms_before lcms_after').addClass('lcms_active_slide');

				vars.lcms_is_sliding = false;
				
				// trigger custom action | args: new slide index - slide object
				$wrap_obj.trigger('lcms_new_active_slide', [new_index, vars.slides[new_index]]);
			}, at); 
		};


		////////////////////////////////////////////
		
		// play / pause button
		$('.lcms_prev').unbind('click');
		$lcms_wrap_obj.delegate('.lcms_play', 'click', function() {
			var $subj = $(this).parents('.lcms_wrap').parent();
			
			if(jQuery(this).hasClass('lcms_pause')) {
				$subj.lcms_stop_slideshow();	
			} else {
				$subj.lcms_start_slideshow();	
			}
		});
		
		// prev news - click event
		$('.lcms_prev').unbind('click');
		$lcms_wrap_obj.delegate('.lcms_prev:not(.lcms_disabled)', 'click', function() {
			var $subj = $(this).parents('.lcms_wrap').parent();
			if(typeof(lcms_one_click) != 'undefined') {clearTimeout(lcms_one_click);}
			
			lcms_one_click = setTimeout(function() {
				$subj.lcms_stop_slideshow();
				lcms_slide($subj, 'prev');	
			}, 5);
		});
		
		// next news - click event
		$('.lcms_next').unbind('click');
		$lcms_wrap_obj.delegate('.lcms_next:not(.lcms_disabled)', 'click', function() {
			var $subj = $(this).parents('.lcms_wrap').parent();
			if(typeof(lcms_one_click) != 'undefined') {clearTimeout(lcms_one_click);}
			
			lcms_one_click = setTimeout(function() {
				$subj.lcms_stop_slideshow();
				lcms_slide($subj, 'next');	
			}, 5);
		});
		
		// dots navigation - click event
		$('.lcms_next').unbind('click');
		$lcms_wrap_obj.delegate('.lcms_nav_dots span:not(.lcms_sel_dot)', 'click', function() {
			var $subj = $(this).parents('.lcms_wrap').parent();
			var new_index = parseInt(jQuery(this).attr('rel'));
			if(typeof(lcms_one_click) != 'undefined') {clearTimeout(lcms_one_click);}
			
			lcms_one_click = setTimeout(function() {
				$subj.lcms_stop_slideshow();
				lcms_slide($subj, new_index);	
			}, 5);
		});
		
		// touchswipe	
		var touchswipe = function() {
			$('.lcms_wrap').swipe({
				swipeRight: function() {
					var $subj = jQuery(this).parent();

					$subj.lcms_stop_slideshow();
					lcms_slide($subj, 'prev');		
				},
				swipeLeft: function() {
					var $subj = jQuery(this).parent();
				
					$subj.lcms_stop_slideshow();
					lcms_slide($subj, 'next');		
				},
				threshold: 40,
				allowPageScroll: 'vertical'
			});	
		};
		
		
		// pause on hover
		if(settings.pause_on_hover) {
			$lcms_wrap_obj.delegate('.lcms_wrap', 'mouseenter', function() {
				var $subj = $(this).parent();
				
				var vars = $subj.data('lcms_vars');
				var settings = $subj.data('lcms_settings');
				
				if(vars.is_playing) {
					$subj.lcms_stop_slideshow();
					vars.paused_on_hover = true; 
				}
			})
			.delegate('.lcms_wrap', 'mouseleave', function() {
				var $subj = $(this).parent();
				
				var vars = $subj.data('lcms_vars');
				var settings = $subj.data('lcms_settings');
				
				if(vars.paused_on_hover) {
					$subj.lcms_start_slideshow();
					vars.paused_on_hover = false;
				}
			});
		}
		
		////////////////////////////////////////////
		
		// execution
		slider_setup($lcms_wrap_obj);
		return this;
	};	
		
	////////////////////////////////////////////
	
	// init
	$.fn.lc_micro_slider = function(lcms_settings) {

		// destruct
		$.fn.lcms_destroy = function() {
			var $elem = $(this);
			$elem.find('.lcms_wrap').remove();
			
			// clear interval
			var vars = $elem.data('lcms_vars');
			if(vars.is_playing) {clearInterval(vars.is_playing); }
			
			// undelegate events
			$elem.find('.lcms_next, .lcms_prev').undelegate('click');
			
			// remove stored data
			$elem.removeData('lcms_vars');
			$elem.removeData('lcms_settings');
			$elem.removeData('lc_micro_slider');
			
			return true;
		};	
		
		
		// pagination (next/prev)
		$.fn.lcms_paginate = function(direction) {
			var $elem = $(this);
			
			var vars = $elem.data('lcms_vars');	
			var settings = $elem.data('lcms_settings');
			
			$elem.lcms_stop_slideshow(); 
			
			lcms_slide($elem, direction);
			return true;
		};
		
		
		// start slideshow
		$.fn.lcms_start_slideshow = function() {
			var $elem = $(this);
			
			var vars = $elem.data('lcms_vars');	
			var settings = $elem.data('lcms_settings');	

			vars.is_playing = setInterval(function() {
				lcms_slide($elem, 'next');
			}, (settings.slideshow_time + settings.animation_time));	
			
			$elem.find('.lcms_play').addClass('lcms_pause');
			$elem.trigger('lcms_play_slideshow');
			return true;
		};
		
		
		// stop the slideshow
		$.fn.lcms_stop_slideshow = function() {
			var $elem = $(this);

			var vars = $elem.data('lcms_vars');	
			var settings = $elem.data('lcms_settings');
			
			clearInterval(vars.is_playing);
			vars.is_playing = null;

			$elem.find('.lcms_play').removeClass('lcms_pause');
			$elem.trigger('lcms_stop_slideshow');
			return true;
		};


		// construct
		return this.each(function(){
            // Return early if this element already has a plugin instance
            if ( $(this).data('lc_micro_slider') ) { return $(this).data('lc_micro_slider'); }
			
            // Pass options to plugin constructor
            var ms = new lc_micro_slider(this, lcms_settings);
			
            // Store plugin object in this element's data
            $(this).data('lc_micro_slider', ms);
        });
	};			
	
})(jQuery);

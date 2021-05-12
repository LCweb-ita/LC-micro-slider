/**
 * lc_micro_slider.js - Light and modern vanilla javascript (ES6) contents slider    
 * Version: 2.0.2
 * Author: Luca Montanari aka LCweb
 * Website: https://lcweb.it
 * Licensed under the MIT license
 */


(function() { 
	"use strict";
    if(typeof(window.lc_micro_slider) != 'undefined') {return false;} // prevent multiple script inits  

    
    // global flag to know whether to inject basic CSS code
    let style_generated = null;
    
    // global cached images database
    let cached_img = [];
    
    
    
    /*** default options ***/
    const def_opts = {
        slide_fx		    : 'fadeslide',	// (string) sliding effect / none - slide - fade - fadeslide - zoom-in - zoom-out
        slide_easing	    : 'ease',	// (string) CSS animation easing to use / ease - linear - ease-in (etc) [supports also cubic-bezier]
        nav_arrows		    : true,		// (bool) whether to add navigation arrows 
        nav_dots		    : false,	// (bool) whether to add navigation dots
        slideshow_cmd	    : true,		// (bool) whether to add slideshow commands (play/pause)
        carousel		    : true,		// (bool) whether to use carousel navigation
        touchswipe		    : true,		// (bool) whether to enable touch navigation
        autoplay		    : false,	// (bool) whether to autostart slideshow
        animation_time	    : 700, 		// (int) animation timing in millisecods / 1000 = 1sec
        slideshow_time	    : 5000, 	// (int) interval time of the slideshow in milliseconds / 1000 = 1sec	
        pause_on_hover	    : true,		// (bool) whether to pause and restart slideshow on hover
        pause_on_video_play : false,    // (bool) whether to pause slideshow on HTML video play  
        extra_cmd_code      : '',       // (string) extra HTML code to be injected in the slider to add further commands
        fixed_slide_type    : '',       // (string) defines a fixed slide type fallback. Is overrided by speific data-type attribute. Possible values: image, video, iframe, mixed
        loader_code		    : '<span class="lcms_loader"></span>', // (string) loading animation HTML code
        addit_classes       : [],       // (array) additional classes attached to the slider wrapper. Use it also to define the attached theme
    };

    
    
    /*** instance vars template associated to each targeted element ***/
    const vars = { 
        slides          : [], /* slides array -> object 
            {
                type    : (string) slide type - Possible values: image, video, iframe, mixed 
                content : (string) what you defined into the slide <li> tag,
                img		: (string|bool) data-img attribute set for <li> tag or false if not set
                classes	: (string) eventual extra classes passed to <li> tag
            }*/
        
        shown_slide     : 0,        // (int) shown slide index
        uniqid          : '',       // (string) slider uniqueid
        is_sliding      : false,    // (bool) flag knowing whether slider is sliding
        is_playing      : false,    // (bool) flag knowing whether slider is playing
        paused_on_hover : false     // (bool) flag knowing whether slider needs to be paused on mouse hover
    };	
    
    


    /*** plugin class ***/
    window.lc_micro_slider = function(attachTo, options = {}) {
        if(!attachTo) {
            return console.error('You must provide a valid selector or DOM object as first argument');
        }
    
        
        // override options
        if(typeof(options) !=  'object') {
            return console.error('Options must be an object');    
        }
        options = Object.assign({}, def_opts, options);
        

        
        /* initialize */
        this.init = function() {
            const $this = this;
            
            // generate style
            if(!style_generated) {
                this.generate_style();
                style_generated = true;
            }
            
            maybe_querySelectorAll(attachTo).forEach(function($wrap_obj) {

                // do not initialize twice
                if(typeof($wrap_obj.lcms_vars) != 'undefined') {
                    return;    
                }    
                $wrap_obj.lcms_vars = JSON.parse(JSON.stringify(vars));
                
                
                // retrieve slides content
                const $slides = $wrap_obj.children[0].children;
                if(!$slides.length) {
                    return false;    
                }

                for(const $slide of $slides) {
                    $slide.querySelectorAll('noscript').forEach(function(noscript) {
                        noscript.remove();    
                    });
                
                    $wrap_obj.lcms_vars.slides.push({
                        type    : $this.get_slide_type($slide),
                        content : $slide.innerHTML,
                        img		: ($slide.hasAttribute('data-img')) ? $slide.getAttribute('data-img') : false,
                        classes	: ($slide.hasAttribute('class')) ? $slide.getAttribute('class') : '',
                    }); 
                }
                

                // setup structure
                const uniqid = Math.random().toString(36).substr(2, 9);
                $wrap_obj.lcms_vars.uniqid = uniqid;
                
                $wrap_obj.innerHTML = 
                    '<div class="lcms_wrap '+ options.addit_classes.join(' ') +'" data-id="'+ uniqid +'">'+
                        '<div class="lcms_container"></div>'+
                    '</div>';
                
                const $slider_wrap = document.querySelector('.lcms_wrap[data-id="'+ uniqid +'"]');
                
                
                // populate with arrows
                if(options.nav_arrows && $wrap_obj.lcms_vars.slides.length > 1) {
                    const disabled_btn = (options.carousel) ? '' : 'lcms_disabled_btn';
                    
                    $slider_wrap.classList.add('lcms_has_nav_arr');
                    $slider_wrap.insertAdjacentHTML('afterbegin', '<div class="lcms_nav"><span class="lcms_prev '+ disabled_btn +'"></span><span class="lcms_next"></span></div>'); 
                }
                
                // populate with slideshow commands
                if(options.slideshow_cmd && $wrap_obj.lcms_vars.slides.length > 1) {
                    $slider_wrap.classList.add('lcms_has_ss_cmd');
                    $slider_wrap.insertAdjacentHTML('afterbegin', '<div class="lcms_play"><span></span></div>'); 
                }
                
                // extra nav cmd
                if(options.extra_cmd_code) {
                    $slider_wrap.insertAdjacentHTML('afterbegin', options.extra_cmd_code);   
                }
                
                
                // populate with full nav dots
                if(options.nav_dots && $wrap_obj.lcms_vars.slides.length > 1) {
                    $slider_wrap.classList.add('lcms_has_nav_dots');
                    $slider_wrap.insertAdjacentHTML('afterbegin', '<div class="lcms_nav_dots"></div>');
                    
                    $this.populate_dots($wrap_obj);
                }

                // dispatched whenever slider structure is ready, before injecting the first slide, before showing first element
                const ready_event = new Event('lcms_ready', {bubbles:true});
                $wrap_obj.dispatchEvent(ready_event);
                  
                
                // populate with first to show
                $wrap_obj.lcms_vars.shown_slide = 0;
                $this.populate_slide($wrap_obj, 'init', 0);
                
                
                // dispatched whenever very first slide is populated, before preloading | args: slide object
                const first_pop_event = new CustomEvent('lcms_first_populated', {
                    bubbles : true,
                    detail  : {
                        slide_data : $wrap_obj.lcms_vars.slides[0]    
                    }
                });
                $wrap_obj.dispatchEvent(first_pop_event);
                
                
                // sliding fx setup
                if(options.slide_fx && options.slide_fx != 'none') {
			
                    // use custom easing?
                    const easing_code = (options.slide_easing && options.slide_easing != 'ease') ? 'animation-timing-function: '+ options.slide_easing +' !important;' : '';

                    // setup inline CSS for animation timings
                    document.head.insertAdjacentHTML('beforeend', 
                    `<style>
                    .lcms_wrap[data-id="${ uniqid }"] .lcms_before, 
                    .lcms_wrap[data-id="${ uniqid }"] .lcms_after, 
                    .lcms_wrap[data-id="${ uniqid }"] .lcms_prepare_for_prev,
                    .lcms_wrap[data-id="${ uniqid }"] .lcms_prepare_for_next {
                        animation-duration: ${ options.animation_time }ms !important;
                        ${ easing_code }
                    }</style>`);

                    $slider_wrap.classList.add('lcms_'+ options.slide_fx +'_fx');
                }    
                
                
                
                ////// BASIC EVENT HANDLERS
                
                // play/pause
                if($wrap_obj.querySelector('.lcms_play')) {
                    $wrap_obj.querySelector('.lcms_play').addEventListener('click', (e) => {
                        
                        const $elem = recursive_parent(e.target, '.lcms_wrap').parentNode;
                        ($wrap_obj.querySelector('.lcms_play').classList.contains('lcms_pause')) ? $this.stop($elem) : $this.play($elem);
                    });
                }
                
                
                // prev element - click event
                if($wrap_obj.querySelector('.lcms_prev')) {
                   $wrap_obj.querySelector('.lcms_prev:not(.lcms_disabled)').addEventListener('click', (e) => {
    
                        const $elem = recursive_parent(e.target, '.lcms_wrap').parentNode;
                        $this.slide($elem, 'prev');
                       
                        $wrap_obj.lcms_vars.paused_on_hover = false;
                        $this.stop($elem);
                    });   
                }
                
                
                // next element - click event
                if($wrap_obj.querySelector('.lcms_next')) {
                   $wrap_obj.querySelector('.lcms_next:not(.lcms_disabled)').addEventListener('click', (e) => {
    
                        const $elem = recursive_parent(e.target, '.lcms_wrap').parentNode;
                        $this.slide($elem, 'next');
                       $this.stop($elem);
                    });   
                }
                
                
                // pause on hover
                if(options.pause_on_hover) {
                    $wrap_obj.addEventListener('mouseenter', (e) => {
                        if($wrap_obj.lcms_vars.is_playing) {
                            $wrap_obj.lcms_vars.paused_on_hover = true; 
                            $this.stop($wrap_obj, true);
                        }    
                    });

                    $wrap_obj.addEventListener('mouseleave', (e) => {
                        if($wrap_obj.lcms_vars.paused_on_hover) {
                            $wrap_obj.lcms_vars.paused_on_hover = true; 
                            $this.play($wrap_obj);
                        }    
                    });
                }

                
                // swipe integration for touch?
                if(options.touchswipe) {
                    const swipe_threshold = 30;
                    new swiper($slider_wrap.querySelector('.lcms_container'), function(directions, $swiped_el) {
                       
                        if(directions.left && directions.left >= swipe_threshold) {
                            lcms_slide($wrap_obj, 'next');        
                        }
                        else if(directions.right && directions.right >= swipe_threshold) {
                            lcms_slide($wrap_obj, 'prev');        
                        }
                    });
                }
                
                
                // utility class knowign when slider has been hovered once
                $wrap_obj.addEventListener('mouseleave', (e) => {
                    if(!$slider_wrap.classList.contains('lcms_already_hovered')) {
                        $slider_wrap.classList.add('lcms_already_hovered');
                    }    
                });
                
                
                
                ////// EXTRA EVENT HANDLERS
                
                // slide (next/prev/index)
                $wrap_obj.addEventListener('lcms_slide', (e) => {
                    $this.stop($wrap_obj);
                    $this.slide($wrap_obj, e.detail.direction);
                });
                
                
                // play
                $wrap_obj.addEventListener('lcms_play', () => {
                    $this.play($wrap_obj);
                });
                
                
                // stop
                $wrap_obj.addEventListener('lcms_stop', () => {
                    $this.stop($wrap_obj);
                });
                
                
                /////////////////////////
                
                
                // autoplay
                if(options.autoplay) {
                    $this.play($wrap_obj);
                }
            });
        };

        
        
        /* populate dots navigation wrapper */
        this.populate_dots = function($wrap_obj) {
            const $this = this;
            let code = '';
            
            for(let a = 0; a < $wrap_obj.lcms_vars.slides.length; a++) {
                const sel_class = (!a) ? 'lcms_sel_dot' : ''; 

                let img = $wrap_obj.lcms_vars.slides[a].img;
                if(!img) {img = '';}

                code += '<span class="'+ sel_class +'" data-index="'+ a +'" data-image="'+ img +'"></span>';
            }
            $wrap_obj.querySelector('.lcms_nav_dots').innerHTML = code;
            
            // dots navigation - click event
            $wrap_obj.querySelectorAll('.lcms_nav_dots span').forEach(function($dot) {
                $dot.addEventListener('click', (e) => {
                    if($dot.classList.contains('lcms_sel_dot')) {
                        return true;
                    }

                    const $elem     = recursive_parent($dot, '.lcms_wrap').parentNode,
                          new_index = parseInt($dot.getAttribute('data-index'), 10);

                    $this.slide($elem, new_index);
                    
                    $wrap_obj.lcms_vars.paused_on_hover = false;
                    $this.stop($elem);
                });
            });
        };
        
        
        
        /* try detecting slide type and returns it (string) */
        this.get_slide_type = function($slide) {
            if($slide.hasAttribute('data-type')) {
                return $slide.getAttribute('data-type');    
            }
            else if(options.fixed_slide_type) {
                return options.fixed_slide_type;        
            }
            
            // try guessing it
            if($slide.hasAttribute('data-img')) {
                return ($slide.children.length) ? 'mixed' : 'image'
            }  
            else {
                if(!$slide.children.length || $slide.children.length > 1) {
                    return 'mixed';    
                }
                else if($slide.children[0].nodeName == 'IFRAME') {
                    return 'iframe';        
                }
                else if($slide.children[0].nodeName == 'VIDEO') {
                    return 'video';        
                }
                else {
                    return 'mixed'; 
                }
            }   
        };
        
        
        
        /* populate slide and append it in the slider
		 * type -> init - fade - prev - next
		 */
		this.populate_slide = function($wrap_obj, type, slide_index) {
            
			const $this = this, 
                  slide = $wrap_obj.lcms_vars.slides[ slide_index ],
                  loader_code = (slide.img) ? options.loader_code : '';
            
			let fx_class;
			
			// showing fx class
			switch(type) {
				case 'init' : fx_class = 'lcms_active_slide'; break;
				case 'fade' : fx_class = 'lcms_fadein'; break;	
				case 'prev' : fx_class = 'lcms_before'; break;	
				case 'next' : fx_class = 'lcms_after'; break;	
			}
			
			// if using dots nav - set selected
            if($wrap_obj.querySelector('.lcms_has_nav_dots')) {
                $wrap_obj.querySelector('.lcms_nav_dots .lcms_sel_dot').classList.remove('lcms_sel_dot');
                $wrap_obj.querySelectorAll('.lcms_nav_dots span')[slide_index].classList.add('lcms_sel_dot');
            }
			
			// contents block
			const bg 		 = (slide.img) ? '<div class="lcms_bg" style="background-image: url('+ slide.img +');"></div>' : '',
			      contents   = (slide.content.toString().trim()) ? '<div class="lcms_content">'+ slide.content +'</div>' : '',
                  
                  slide_code = 
                    '<div class="lcms_slide '+ fx_class +'" data-index="'+ slide_index +'" data-type="'+ slide.type +'">'+
                        '<div class="lcms_inner '+ slide.classes +'">'+ bg + contents +'</div>'+
                    '</div>';
			
			// populate
            $wrap_obj.querySelector('.lcms_container').insertAdjacentHTML('beforeend', slide_code);
            const $slide = $wrap_obj.querySelector('.lcms_slide[data-index="'+ slide_index +'"]');
            
			// preload current element	
			if(slide.img) {
				if(cached_img.indexOf(slide.img) === -1 ) {
                    $slide.classList.add('lcms_preload');
                    
                    // show preloader
                    if(loader_code) {
                        $slide.insertAdjacentHTML('beforeend', loader_code);
                    }
                    
                    // lazyload image
					let img = new Image();
                    img.src = slide.img;

                    img.onload = (e) => {
                        cached_img.push(slide.img);    
                        $slide.classList.remove('lcms_preload');
                        
                        // remove preloader
                        if(loader_code) {
                            for(const el of $slide.children) {
                                if(!el.classList || !el.classList.contains('lcms_inner')) {
                                    el.remove(); 
                                }
                            }
                        }
                        
                        // dispatched whenever a new slide is shown (after lazyload) | args: slide index - slide data object - slide DOM object
						const ss_event = new CustomEvent('lcms_slide_shown', {
                            bubbles : true,
                            detail  : {
                                slide_index : slide_index,
                                slide_data  : slide,
                                silde_elem  : $slide
                            }
                        });
                        $wrap_obj.dispatchEvent(ss_event);
                        
                    };
                }

                // image already cached
				else {  
					// dispatched whenever a new slide is shown | args: slide index - slide object
                    const ss_event = new CustomEvent('lcms_slide_shown', {
                        bubbles : true,
                        detail  : {
                            slide_index : slide_index,
                            slide_data  : slide,
                            silde_elem  : $slide
                        }
                    });
                    $wrap_obj.dispatchEvent(ss_event);
				}
			}
			
            
			// smart preload - previous and next
			if($wrap_obj.lcms_vars.slides.length > 1) {
				const next_load = (slide_index < ($wrap_obj.lcms_vars.slides.length - 1)) ? (slide_index + 1) : 0;
				
				if(cached_img.indexOf( $wrap_obj.lcms_vars.slides[ next_load ].img ) === -1 ) {
					let img = new Image();
                    img.src = $wrap_obj.lcms_vars.slides[ next_load ].img;

                    img.onload = (e) => {
                        cached_img.push(img.src);    
                    };
				}
			}
            
			if($wrap_obj.lcms_vars.slides.length > 2) {
				const prev_load = (!slide_index) ? ($wrap_obj.lcms_vars.slides.length - 1) : (slide_index - 1); 
				
                if(cached_img.indexOf( $wrap_obj.lcms_vars.slides[ prev_load ].img ) === -1 ) {
					let img = new Image();
                    img.src = $wrap_obj.lcms_vars.slides[ prev_load ].img;

                    img.onload = (e) => {
                        cached_img.push(img.src);    
                    };
				}
			}	
            
            
            // stop slideshow on HTML5 video play
            if(options.pause_on_video_play && slide.type == 'video' && $slide.querySelector('video')) {
                $slide.querySelector('video').addEventListener('play', () => {
                    $this.stop($wrap_obj);    
                });
            }
		};
        
        
        
        
        /*** change shown slide - direction could be next/prev or slide index ***/
		this.slide = function($wrap_obj, direction) {
			const at         = options.animation_time,
                  curr_index = $wrap_obj.lcms_vars.shown_slide;
			
            if(direction != 'prev' && direction != 'next' && typeof(direction) != 'number') {
                return false;    
            }
			if(!options.carousel && ((direction == 'prev' &&  !$wrap_obj.lcms_vars.shown_slide) || (direction == 'next' &&  $wrap_obj.lcms_vars.shown_slide == $wrap_obj.lcms_vars.slides.length - 1))) {
                return false;
            }
			if($wrap_obj.lcms_vars.lcms_is_sliding || $wrap_obj.lcms_vars.slides.length == 1) {
                return false;
            }
			if(typeof(direction) == 'number' && (direction < 0 || direction > ($wrap_obj.lcms_vars.slides.length - 1))) {
                return false;
            }
			
			// find the new index and populate
            let new_index;
            
			if(direction == 'prev') {
				new_index = (curr_index === 0) ? ($wrap_obj.lcms_vars.slides.length - 1) : (curr_index - 1); 
			} 
			else if (direction == 'next') {
				new_index = (curr_index == ($wrap_obj.lcms_vars.slides.length - 1)) ? 0 : (curr_index + 1); 	
			}
			else {
				new_index = direction; // direct slide jump	
				direction = (new_index > curr_index) ? 'next' : 'prev'; // normalize direction var
			}
			
			$wrap_obj.lcms_vars.lcms_is_sliding = true;
            $wrap_obj.classList.add('lcms_is_sliding', 'lcms_moving_'+direction);

            // add class to active slide
            $wrap_obj.querySelector('.lcms_active_slide').classList.add('lcms_prepare_for_'+direction);
            
			
			// populate
			const type = (options.slide_fx == 'fade') ? 'fade' : direction;
			this.populate_slide($wrap_obj, type, new_index);
			$wrap_obj.lcms_vars.shown_slide = new_index;
			
			
            // dispatched whenever a slide action is performed | args: new slide index - new slide object - old slide index
            const cs_event = new CustomEvent('lcms_changing_slide', {
                bubbles : true,
                detail  : {
                    new_index   : new_index,
                    slide_data  : $wrap_obj.lcms_vars.slides[new_index],
                    curr_index  : curr_index,
                }
            });
            $wrap_obj.dispatchEvent(cs_event);


			// if isn't carousel - manage arrows visibility
			if(!options.carousel) {
                $wrap_obj.querySelectorAll('.lcms_prev, .lcms_next, .lcms_play > span').forEach(function(el) {
                    el.classList.remove('lcms_disabled_btn');
                });
                
				if(!new_index) {
                    $wrap_obj.querySelectorAll('.lcms_prev').forEach(function(el) {
                        el.classList.all('lcms_disabled_btn');
                    });
				}
				else if(new_index == ($wrap_obj.lcms_vars.slides.length - 1)) {
                    $wrap_obj.querySelectorAll('.lcms_next, .lcms_play > span').forEach(function(el) {
                        el.classList.all('lcms_disabled_btn');
                    });
				}
			}
			

			// after sliding fx 
			setTimeout(() => {
				$wrap_obj.querySelector('.lcms_active_slide').remove();
				
				$wrap_obj.lcms_vars.lcms_is_sliding = false;
                $wrap_obj.classList.remove('lcms_is_sliding', 'lcms_moving_'+direction);
                
                $wrap_obj.querySelector('.lcms_slide').classList.remove('lcms_fadein', 'lcms_before', 'lcms_after');
                $wrap_obj.querySelector('.lcms_slide').classList.add('lcms_active_slide');
                

				// dispatched whenever the new slide is in its final position | args: new slide index - slide object
                const nas_event = new CustomEvent('lcms_new_active_slide', {
                    bubbles : true,
                    detail  : {
                        new_index   : new_index,
                        slide_data  : $wrap_obj.lcms_vars.slides[new_index]
                    }
                });
                $wrap_obj.dispatchEvent(nas_event);
			}, at); 
		};
        
        
        
        // play
        this.play = function($wrap_obj) {
            const $this = this;
            
            if($wrap_obj.querySelector('.lcms_play')) {
                $wrap_obj.querySelector('.lcms_play').classList.add('lcms_pause');
            }
            
            if($wrap_obj.lcms_vars.is_playing) {
                return true;    
            }
            $wrap_obj.classList.add('lcms_is_playing');
            
            $wrap_obj.lcms_vars.is_playing = setInterval(() => {
                $this.slide($wrap_obj, 'next');
            }, (options.slideshow_time + options.animation_time));	

            
            // dispatched whenever slider slideshow plays
            const ps_event = new Event('lcms_play_slideshow', {bubbles : true});
            $wrap_obj.dispatchEvent(ps_event);
        };
        
        
        
        // stop
        this.stop = function($wrap_obj, on_hover = false) {
            const $this = this;
            
            if($wrap_obj.querySelector('.lcms_play') && !on_hover) {
                $wrap_obj.querySelector('.lcms_play').classList.remove('lcms_pause');
            }
            
            if(!$wrap_obj.lcms_vars.is_playing) {
                return true;    
            }
            $wrap_obj.classList.remove('lcms_is_playing');
            
            clearInterval($wrap_obj.lcms_vars.is_playing);
            $wrap_obj.lcms_vars.is_playing = null;

            
            // dispatched whenever slider slideshow stops
            const ps_event = new Event('lcms_stop_slideshow', {bubbles : true});
            $wrap_obj.dispatchEvent(ps_event);       
        };
        


		//////////////////////////////////////////////////////////
		

        
        /* CSS - creates basic inline CSS into the page */
        this.generate_style = function() {
            document.head.insertAdjacentHTML('beforeend', 
`<style>
/* MANDATORY STYLES */
.lcms_wrap, 
.lcms_wrap *,
.lcms_wrap *:before,
.lcms_wrap *:after {
    box-sizing: border-box;
}
.lcms_wrap,
.lcms_container {
	width: 100%;
	height: 100%;	
}
.lcms_wrap {
	position: relative;
	overflow: visible;	
}
.lcms_container {
	position: absolute;
	z-index: 20;
	overflow: hidden !important;
}
.lcms_slide {
	position: absolute;	
	width: 100%;
	height: 100%;	
	z-index: 100;
	top: 0%;
	left: 0%;
}
.lcms_inner {
	width: 100%;
	height: 100%;
	opacity: 1;
	overflow: hidden;
	transition: opacity .3s ease-in;
}
.lcms_preload .lcms_inner {
	opacity: 0;	
}
.lcms_cached {
	transition: opacity 0s ease-in !important;	
}
.lcms_slide.lcms_fadein {
	z-index: 90;	
}
.lcms_bg, .lcms_content {
	position: absolute;	
}
.lcms_bg {
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 10;
	
	background: transparent; 
	background-position: center center;
	background-repeat: no-repeat;
	background-size: cover;		
}
.lcms_content {
	z-index: 20;
}


/* nav and buttons */
.lcms_nav,
.lcms_play,
.lcms_nav_dots {
	position: absolute;
	z-index: 999;	
}
.lcms_play {
	z-index: 998;	
}
.lcms_wrap.lcms_has_nav_dots {
    max-height: calc(100% - 40px);
	margin-bottom: 40px;
}
.lcms_nav_dots {
	z-index: 997;
	right: 0px;	
	left: 0;
	bottom: -35px;
	text-align: center;
}
.lcms_disabled_btn,
.lcms_sel_dot {
	cursor: default !important;	
}



/* slide type rules */
.lcms_slide[data-type="iframe"] .lcms_content,
.lcms_slide[data-type="video"] .lcms_content,
.lcms_slide[data-type="iframe"] .lcms_content > *,
.lcms_slide[data-type="video"] .lcms_content > * {
    height: 100%;
    width: 100%;
    border: 0;
    padding: 0;
    margin: 0;
}
.lcms_slide[data-type="mixed"] .lcms_content {
    height: 100%;
    width: 100%;
}



/*** ENTRANCE/EXIT EFFECTS ***/

/* fade */
.lcms_is_sliding .lcms_fade_fx .lcms_active_slide {
	animation: lcms_fade .7s normal ease;
}
@keyframes lcms_fade {
    100% {opacity: 0;}
}



/* slide */
.lcms_moving_prev .lcms_slide_fx .lcms_before {
	animation: lcms_slide_new_p .7s normal ease;	
}
@keyframes lcms_slide_new_p {
	0% {left: -100%;}
	100% {left: 0;}
}


.lcms_moving_prev .lcms_slide_fx .lcms_active_slide {
	animation: lcms_slide_p .7s normal ease;	
}
@keyframes lcms_slide_p {
	0% {left: 0;}
	100% {left: 100%;}
}


.lcms_moving_next .lcms_slide_fx .lcms_after {
	animation: lcms_slide_new_n .7s normal ease;	
}
@keyframes lcms_slide_new_n {
	0% {left: 100%;}
	100% {left: 0;}
}


.lcms_moving_next .lcms_slide_fx .lcms_active_slide {
	animation: lcms_slide_n .7s normal ease;	
}
@keyframes lcms_slide_n {
	0% {left: 0;}
	100% {left: -100%;}
}



/* vertical slide */
.lcms_moving_prev .lcms_v_slide_fx .lcms_before {
	animation: lcms_v_slide_new_p .7s normal ease;	
}
@keyframes lcms_v_slide_new_p {
	0% {top: -100%;}
	100% {top: 0;}
}


.lcms_moving_prev .lcms_v_slide_fx .lcms_active_slide {
	animation: lcms_v_slide_p .7s normal ease;	
}
@keyframes lcms_v_slide_p {
	0% {top: 0;}
	100% {top: 100%;}
}


.lcms_moving_next .lcms_v_slide_fx .lcms_after {
	animation: lcms_v_slide_new_n .7s normal ease;	
}
@keyframes lcms_v_slide_new_n {
	0% {top: 100%;}
	100% {top: 0;}
}


.lcms_moving_next .lcms_v_slide_fx .lcms_active_slide {
	animation: lcms_v_slide_n .7s normal ease;	
}
@keyframes lcms_v_slide_n {
	0% {top: 0;}
	100% {top: -100%;}
}



/* overlap */
.lcms_moving_prev .lcms_overlap_fx .lcms_before {
	animation: lcms_overlap_p .7s normal ease;	
}
@keyframes lcms_overlap_p {
	0% {left: -100%;}
	100% {left: 0;}
}


.lcms_moving_next .lcms_overlap_fx .lcms_after {
	animation: lcms_overlap_n .7s normal ease;	
}
@keyframes lcms_overlap_n {
	0% {left: 100%;}
	100% {left: 0;}
}



/* vertical overlap */
.lcms_moving_prev .lcms_v_overlap_fx .lcms_before {
	animation: lcms_v_overlap_p .7s normal ease;	
}
@keyframes lcms_v_overlap_p {
	0% {top: -100%;}
	100% {top: 0;}
}


.lcms_moving_next .lcms_v_overlap_fx .lcms_after {
	animation: lcms_v_overlap_n .7s normal ease;	
}
@keyframes lcms_v_overlap_n {
	0% {top: 100%;}
	100% {top: 0;}
}



/* fadeslide */
.lcms_moving_prev .lcms_fadeslide_fx .lcms_before {
	animation: lcms_fadeslide_new_p .7s normal ease;	
}
@keyframes lcms_fadeslide_new_p {
	0% {
		opacity: 0;
		left: -100%;
	}
	100% {
		opacity: 1;
		left: 0;
	}
}


.lcms_moving_prev .lcms_fadeslide_fx .lcms_active_slide {
	animation: lcms_fadeslide_p .7s normal ease;	
}
@keyframes lcms_fadeslide_p {
	0% {
		opacity: 1;
		left: 0;
	}
	100% {
		opacity: 0;
		left: 100%;
	}
}


.lcms_moving_next .lcms_fadeslide_fx .lcms_after {
	animation: lcms_fadeslide_new_n .7s normal ease;	
}
@keyframes lcms_fadeslide_new_n {
	0% {
		opacity: 0;
		left: 100%;
	}
	100% {
		opacity: 1;
		left: 0;
	}
}


.lcms_moving_next .lcms_fadeslide_fx .lcms_active_slide {
	animation: lcms_fadeslide_n .7s normal ease;	
}
@keyframes lcms_fadeslide_n {
	0% {
		opacity: 1;
		left: 0;
	}
	100% {
		opacity: 0;
		left: -100%;
	}
}



/* zoom-in */
.lcms_moving_prev .lcms_zoom-in_fx .lcms_before {
	animation: lcms_zoom-in_new_p .7s normal ease;	
}
@keyframes lcms_zoom-in_new_p {
	0% {
		opacity: 0;
		transform: scale(1.5);
	}
	100% {
		opacity: 1;
		transform: scale(1);
	}
}


.lcms_moving_prev .lcms_zoom-in_fx .lcms_active_slide {
	animation: lcms_zoom-in_p .7s normal ease;	
}
@keyframes lcms_zoom-in_p {
	0% {
		opacity: 1;
		transform: scale(1);
	}
	100% {
		opacity: 0;
		transform: scale(.5);
	}
}


.lcms_moving_next .lcms_zoom-in_fx .lcms_after {
	animation: lcms_zoom-in_new_n .7s normal ease;	
}
@keyframes lcms_zoom-in_new_n {
	0% {
		opacity: 0;
		transform: scale(.5);
	}
	100% {
		opacity: 1;
		transform: scale(1);
	}
}


.lcms_moving_next .lcms_zoom-in_fx .lcms_active_slide {
	animation: lcms_zoom-in_n .7s normal ease;	
}
@keyframes lcms_zoom-in_n {
	0% {
		opacity: 1;
		transform: scale(1);
	}
	100% {
		opacity: 0;
		transform: scale(1.5);
	}
}



/* zoom-out */
.lcms_moving_prev .lcms_zoom-out_fx .lcms_before {
	animation: lcms_zoom-out_new_p .7s normal ease;	
}
@keyframes lcms_zoom-out_new_p {
	0% {
		opacity: 0;
		transform: scale(.5);
	}
	100% {
		opacity: 1;
		transform: scale(1);
	}
}


.lcms_moving_prev .lcms_zoom-out_fx .lcms_active_slide {
	animation: lcms_zoom-out_p .7s normal ease;	
}
@keyframes lcms_zoom-out_p {
	0% {
		opacity: 1;
		transform: scale(1);
	}
	100% {
		opacity: 0;
		transform: scale(1.5);
	}
}


.lcms_moving_next .lcms_zoom-out_fx .lcms_after {
	animation: lcms_zoom-out_new_n .7s normal ease;	
}
@keyframes lcms_zoom-out_new_n {
	0% {
		opacity: 0;
		transform: scale(1.5);
	}
	100% {
		opacity: 1;
		transform: scale(1);
	}
}


.lcms_moving_next .lcms_zoom-out_fx .lcms_active_slide {
	animation: lcms_zoom-out_n .7s normal ease;	
}
@keyframes lcms_zoom-out_n {
	0% {
		opacity: 1;
		transform: scale(1);
	}
	100% {
		opacity: 0;
		transform: scale(.5);
	}
}
</style>`);
        };
        

        // init when called
        this.init();  
        return this;
    };
    
    
    

    ////////////////////////////////////////////////////
    // PUBLIC FUNCTIONS
    
    // play
    window.lcms_play = function(subj) {
        maybe_querySelectorAll(subj).forEach(function($wrap_obj) {
            const event = new Event('lcms_play');
            $wrap_obj.dispatchEvent(event);      
        });
    };
    
    
    // stop
    window.lcms_stop = function(subj) {
        maybe_querySelectorAll(subj).forEach(function($wrap_obj) {
            const event = new Event('lcms_stop');
            $wrap_obj.dispatchEvent(event);      
        });
    };
    
    
    // slide (next/prev/index)
    window.lcms_slide = function(subj, direction) {
        maybe_querySelectorAll(subj).forEach(function($wrap_obj) {
            
            const event = new CustomEvent('lcms_slide', {
                detail : {
                    direction : direction,
                }
            });
            $wrap_obj.dispatchEvent(event);      
        });
    };
    
    
 
        
    ////////////////////////////////////////////////////
    // UTILITIES
        
    // sanitize "selector" parameter allowing both strings and DOM objects
    const maybe_querySelectorAll = (selector) => {
             
        if(typeof(selector) != 'string') {
            if(selector instanceof Element) { // JS or jQuery 
                return [selector];
            }
            else {
                let to_return = [];
                
                for(const obj of selector) {
                    if(obj instanceof Element) {
                        to_return.push(obj);    
                    }
                }
                return to_return;
            }
        }
        
        // clean problematic selectors
        (selector.match(/(#[0-9][^\s:,]*)/g) || []).forEach(function(n) {
            selector = selector.replace(n, '[id="' + n.replace("#", "") + '"]');
        });
        
        return document.querySelectorAll(selector);
    };
    
    
    // pure-JS equivalent to parents()
    const recursive_parent = (element, target) => {
        let node = element;
        
        while(node.parentNode != null && !node.matches(target) ) {
            node = node.parentNode;
        }
        return node;
    };  
    
    
    // swipe tracking - derived from LC Swiper
    const swiper = function(attachTo, callback) {
        this.$elements  = [];
        this.uniqid     = Math.random().toString(36).substr(2, 9);
        
        
        /* initialize touch tracking */
        this.init = function() {
            const $this = this;
            this.$elements = maybe_querySelectorAll(attachTo);   
            
            this.$elements.forEach(function($el) {
                
                // cache trick for easy destruction
                if(typeof($el.lcswiper_cb) == 'undefined') {
                    $el.lcswiper_cb = {};        
                }
                $el.lcswiper_cb[ $this.uniqid ] = callback;

                // track first touch
                $el.addEventListener('touchstart', (e) => {
                    $el.lcswiper_xDown = e.touches[0].clientX;
                    $el.lcswiper_yDown = e.touches[0].clientY;
                });   
                
                // track touch end
                $el.addEventListener('touchend', (e) => {
                    $this.handleTouchDiff($el, e);
                });
            });
        };
        
        /* handle touchend values and eventually triggers callback passing directions object and $el */
        this.handleTouchDiff = function($el, e) {
            if(
                typeof($el.lcswiper_xDown) == 'undefined' || !$el.lcswiper_xDown || 
                typeof($el.lcswiper_yDown) == 'undefined' || !$el.lcswiper_yDown ||
                typeof($el.lcswiper_cb[ this.uniqid ]) == 'undefined'
            ) {
                return;
            }

            const xUp = e.changedTouches[0].clientX,
                  yUp = e.changedTouches[0].clientY,
                  
                  xDiff = parseInt($el.lcswiper_xDown - xUp, 10),
                  yDiff = parseInt($el.lcswiper_yDown - yUp, 10);

            if(Math.abs(xDiff) !== 0 || Math.abs(yDiff) !== 0) {
                const to_return = {
                    up      : (yDiff > 0) ? yDiff : 0,
                    right   : (xDiff < 0) ? Math.abs(xDiff) : 0,
                    down    : (yDiff < 0) ? Math.abs(yDiff) : 0,
                    left    : (xDiff > 0) ? xDiff : 0,
                };
                $el.lcswiper_cb[ this.uniqid ].call(this, to_return, $el);
            }
            
            // reset
            $el.lcswiper_xDown = 0; 
            $el.lcswiper_yDown = 0; 
        };
        
        // init and return class
        this.init();
        return this;
    };
    
})();
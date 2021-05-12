# Lightweight vanilla javascript media and contents slider, by LCweb

Just 20KB to have: 

![](plugin_preview.png)


### Top features list:

- single file, no dependencies, 100% pure javascript
- designed to be themed with no efforts (default theme included + extra theme for demo)
- themes mix support using prefixed selectors 
- pure CSS sliding effects (default ones: slide - fade - fadeslide - zoom-in - zoom-out)
- slide anything. Literally. With specific support to:

    - images (with lazyloader)
    - HTML5 videos and iframes (eg. youtube embed) 
    - mixed contents

- slideshow with optional autoplay and pause-on-hover
- carousel navigation
- integrated touchswipe support
- super customizable and developer-friendly (w/ public functions and events)


Tested on all mordern browsers *(don't ask for old IE support please)*<br/>
For live demos check: https://lcweb.it/lc-micro-slider-javascript-plugin


<br/>


## Installation & Usage

1. include js/lc-micro-slider.min.js file

2. include a theme (*eg. themes/default_theme.css*) 

3. initialize plugin targeting one/multiple properly composed page elements<br/>**NB:** first parameter may be a textual selector or a DOM object (yes, also jQuery objects)


Few notes anout the HTML structure:

 - the target element must contain a UL list. Each list element will be a slide
 - is suggested to use the "data-type" attribute. Possible values: image, video, iframe, mixed<br/>Can be globally defined using *fixed_slide_type* option
 - the "data-img" attributes defines slide's background and is lazyloaded

```

<div id="slider_wrap">
    <ul style="display: none;">
        <li data-img="../demo_assets/parrot.jpg" data-type="image">A colorful parrot!</li>

        <li data-type="video">
            <iframe style="height: 100%; width: 100%;" src="https://player.vimeo.com/video/40291524?rel=0" frameborder="0" allowfullscreen></iframe>
        </li>
        <li data-type="iframe">
            <video controls autoplay muted>
                <source src="../demo_assets/squirrel.mp4" type="video/mp4">
            </video> 
        </li>

        <li data-img="../demo_assets/cat.jpg" data-type="mixed">
            <h4 id="txt_heading">Also some plain text!</h4>
            <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam eaque ipsa, quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt, explicabo.</p> <p>Nemo enim ipsam voluptatem, quia voluptas sit, aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos, qui ratione voluptatem sequi nesciunt, neque porro quisquam est</p>
        </li>

    </ul>
</div>


<script type="text/javascript>
new lc_micro_slider('#slider_wrap', {
    addit_classes : ['lcms_default_theme'] // always specify which theme to use    
});
</script>
```


<br/>


## Options

Here are listed available options with default values


```
<script type="text/javascript>
new lc_micro_slider('#slider_wrap', {

    // (string) sliding effect / none - slide - fade - fadeslide - zoom-in - zoom-out
    slide_fx : 'fadeslide',	
    
    // (string) CSS animation easing to use / ease - linear - ease-in (etc) [supports also cubic-bezier]
    slide_easing : 'ease',	
    
    // (bool) shows navigation arrows 
    nav_arrows : true,	
    
    // (bool) shows navigation dots
    nav_dots : false,	
    
    // (bool) whether to add slideshow commands (play/pause)
    slideshow_cmd : true,		
    
    // (bool) whether to use carousel navigation
    carousel : true,	
    
    // (bool) whether to enable touch navigation
    touchswipe : true,	
    
    // (bool) whether to autostart slideshow
    autoplay : false,	
    
    // (int) animation timing in millisecods / 1000 = 1sec
    animation_time : 700, 	
    
    // (int) interval time of the slideshow in milliseconds / 1000 = 1sec
    slideshow_time : 5000, 	
    
    // (bool) whether to pause and restart slideshow on hover
    pause_on_hover : true,	
    
    // (bool) whether to pause slideshow on HTML video play 
    pause_on_video_play : false,  
    
    // (string) extra HTML code to be injected in the slider to add further commands
    extra_cmd_code : '',   
    
    // (string) defines a fixed slide type fallback. Is overrided by speific data-type attribute. Possible values: image, video, iframe, mixed
    fixed_slide_type : '',    
    
    // (string) loading animation HTML code
    loader_code : '<span class="lcms_loader"></span>', 
    
    // (array) additional classes attached to the slider wrapper. Use it also to define the attached theme
    addit_classes : [],       
});
</script>
```


<br/>

## Mixing themes

You can use multiple themes in the same page. Be sure to prefix every theme's CSS rule with the class you will use.<br/>
For example *.lcms_light_theme* and *.lcms_dark_theme*


```
<link href="themes/light.css" rel="stylesheet" type="text/css">
<link href="themes/dark.css" rel="stylesheet" type="text/css">

<script type="text/javascript>
new lc_micro_slider('#slider_wrap1', {
    addit_classes : ['lcms_light_theme'] // always specify which theme to use    
});

new lc_micro_slider('#slider_wrap2', {
    addit_classes : ['lcms_dark_theme'] // always specify which theme to use    
});
</script>
```


<br/>

## Public Functions

```
<script type="text/javascript>
const target_el = '#slider_wrap';

new lc_micro_slider(target_el, {
    addit_classes : ['lcms_default_theme']
});


// starts slideshow (pass a selector string or DOM element object)
lcms_play(target_el); 

// stops slideshow (pass a selector string or DOM element object)
lcms_stop(target_el); 

// move to a slide (pass a selector string or DOM element object)
lcms_slide(target_el, slide_index); 
</script>
```


<br/>

## Public Events

```
<script type="text/javascript>
const $el = document.getElementById('slider_wrap');

// dispatched whenever slider structure is ready, before injecting the first slide
$el.addEventListener('lcms_ready', (e) => {
    ...
});


// dispatched whenever very first slide is populated, before preloading
$el.addEventListener('lcms_first_populated', (e) => {
    
    // e.detail.slide_data - (object) slide data 
});


// dispatched whenever a new slide is shown (after lazyload)
$el.addEventListener('lcms_slide_shown', (e) => {
    
    // e.detail.slide_index - (int) slide index
    // e.detail.slide_data - (object) slide data 
});


// dispatched whenever a slide action is performed
$el.addEventListener('lcms_changing_slide', (e) => {
    
    // e.detail.new_index - (int) incoming slide index
    // e.detail.slide_data - (object) incoming slide data 
    // e.detail.curr_index - (int) current (to be removed) slide index
});


// dispatched whenever the new slide is in its final position
$el.addEventListener('lcms_new_active_slide', (e) => {
    
    // e.detail.new_index - (int) new slide index
    // e.detail.slide_data - (object) new slide data 
});


// dispatched whenever slider slideshow plays
$el.addEventListener('lcms_play_slideshow', (e) => {
    ...
});


// dispatched whenever slider slideshow stops
$el.addEventListener('lcms_stop_slideshow', (e) => {
    ...
});
</script>
```


<br/>

## Extra tips

Slider dynamic variables are stored in the DOM object. This might be useful to retrieve or alterate slider data.

Inspect the initial plugin's code part to know which vars are used 


```
<script type="text/javascript>
const $el = document.getElementById('slider_wrap');

const instance = new lc_micro_slider($el, {
    addit_classes : ['lcms_default_theme']
});


// retrieve currently shown slide index
const active_index = $el.lcms_vars.shown_slide; // (int)

// know whether slideshow is playing
const active_index = $el.lcms_vars.is_playing; // (bool)


// inject a new slide and eventually refresh dots navigation
$el.lcms_vars.slides.push({
    type    : 'image',              // (string) slide type - Possible values: image, video, iframe, mixed 
    content : 'The caption!',       // (string) what you normally defines into the slide <li> tag,
    img		: 'the-image-url.jpg',  // (string|bool) data-img attribute set for <li> tag or false if not set
    classes	: ''                    // (string) eventual extra classes
});
instance.populate_dots($el);
</script>
```


* * *


Copyright &copy; Luca Montanari - [LCweb](https://lcweb.it)

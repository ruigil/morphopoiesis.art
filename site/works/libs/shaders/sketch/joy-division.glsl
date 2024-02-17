#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T

uniform sampler2D u_buffer0;

#include '../constants.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/noise.glsl'

// Album cover "Unknow Pleasures" from Joy Division 
// https://blogs.scientificamerican.com/sa-visual/pop-culture-pulsar-origin-story-of-joy-division-s-unknown-pleasures-album-cover-video/

#if defined(BUFFER_0)
out vec4 pixel;
void main() {

    vec2 r = ref(UV, R) * 2.;
    // the texture reference frame is between [0,1] 
    vec2 t = UV ;

    // we apply an offset to the ghost line from the previous
    // frame to make it go up
    float v = max(texture(u_buffer0,t-vec2(.0,.01)).r ,.0);

    r += vec2(.0,.75);
    // the pulse is  perlin noise, modulated by a cosine
    float pulse =  .5 * noise( 100.+vec2(r.x*20.,T*5.)) * max(0.,cos(3.*r.x));
        
    // draw the new horizontal line
    v = min(1., v + stroke(r.y  - pulse,  .01, EPS, true));
        
    // clip bellow the line 
    v *= fill(r.y  - pulse , EPS, false); 

    // clip above 
    // does not work too well, because it is clipping with the noise  
    // for the current time, and it should calculate a new
    // pulse based on the time offset of the last ghost line
    v *= fill(r.y - 1.5 - pulse , EPS, true); 

    // clip borders
    v *= stroke(r.x,1.5, EPS, true);

    pixel = vec4(vec3(v),1.);
}
#else
out vec4 pixel;
void main() { 
    pixel = vec4(vec3(texture(u_buffer0,UV).r), 1.);
}
#endif
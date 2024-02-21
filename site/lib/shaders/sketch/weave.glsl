#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T


#include '../constants.glsl'
#include '../utils/2d-utils.glsl'

out vec4 pixel;
void main() {

    vec2 r = (ref(UV, R) * 2.  * (3. + sin(T))) * rot(radians(sin(T*.2)*45.));

    // create tiles and every other tile rotate the pattern 90 degrees
    r = mod(floor(r.x) + floor(r.y) , 2.) == 0. ? 
            fract(r)-.5 : fract(r.yx)-.5;
    
    // the pattern   
    float v = 
        fill( rect( r, vec2(.5,1.1) ), .01,  true) *
        fill( sin((r.x-.707) *60.), .1, true) *
        smoothstep(.0,1.0, abs(r.y)) *

        fill( rect( r, vec2(1.,.6) ), .01, false) +
        fill( rect( r, vec2(1.1,.5) ), .01, true) *
        fill( sin((r.y-.707) *60.), .1, true) *
        smoothstep(1.,.0, abs(r.x));

    pixel = vec4( vec3(v), 1.0 );
} 
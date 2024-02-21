#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T


#include '../constants.glsl'
#include '../utils/2d-utils.glsl'

out vec4 pixel;
void main() {
    vec2 r = ref(UV, R) * 8.;
    
    // an example of symmetry and recursivity
    // all is built from a single pattern
    // that is copied an mirrores several times
    // in different scales

    // the trick here is to start from the pattern
    // and then built sucessive previous transformations
    // adding complexity and scale

    // a six fold angular mirror
    // we adjust the previous pattern 60 degrees and translate it
    r = modpolar(r,6.,radians(30.));
    r *= rot(radians(-60.));
    r -= vec2(4.,.0);
    
    // a three fold angular mirror
    // we adjust the previous pattern 60 degrees and translate it
    r = modpolar(r,3.,.0);
    r *= rot(radians(-60.));
    r -= vec2(2.,.0);
    
    // a three fold angular mirror
    // we adjust the previous pattern 60 degrees and translate it
    r = modpolar(r,3.,.0);
    r *= rot(radians(-60.));
    r -= vec2(1.,.0);
    
    // a mirror on the y axis and a flip on the x axis
    // we adjust the previous pattern 60 degrees and translate it
    r = vec2(r.x*sign(r.y),abs(r.y) -.6);

    // the pattern is just to simple rectangles rotated 30 degrees
    vec2 r1 = r * rot(radians(30.));
    vec2 r2 = r * rot(radians(-30.));

    // the pattern
    float f = 
        fill( rect( r1, vec2(.5,1.7) ), .01,  true) *
        fill( sin((r1.x-.707) *60.), .1, true) *
        smoothstep(.2,.8, abs(r1.y)) *
        smoothstep(.3,.0, abs(r1.x)) *


        fill( rect( r2, vec2(.55,1.7) ), .01, false) +
        fill( rect( r2, vec2(.5,1.7) ), .01, true) *
        fill( sin((r2.x-.707) *60.), .1, true) *
        smoothstep(.3,.0, abs(r2.x));
        
    
    pixel = vec4(vec3(f),1.);
}

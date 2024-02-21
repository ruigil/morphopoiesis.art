#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T


#include '../constants.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/shaping-functions.glsl'
#include '../utils/noise.glsl'

out vec4 pixel;
void main() {

    vec2 r = ref(UV, R) * 2.;

    // pattern 010101
    float p = floor(mod(T,2.));
    
    // two alternate time steps
    float t1 = fract(T) * p;
    float t2 = fract(T) * abs(1.-p);
    
    // two rotation controlled by the timesteps
    vec2 r1 = r * rot(easePow(t1, 2., modeInOut)*6.283*.5); 
    vec2 r2 = r * rot(-easePow(t2, 2., modeInOut)*6.283); 

    // The Yin Yang Symbol
    float f = 
        xor(
            min(fill(r2.x, EPS, true) * 
            fill(circle(r2, .5), EPS, true) *
            fill(circle(vec2(r2.x,r2.y - .25), .25), EPS, false) +
            fill(circle(vec2(r2.x,r2.y + .25), .25), EPS, true) +
            stroke(circle(r2, .5), .01, EPS, true), 1.),
            fill(circle( vec2(r1.x,abs(r1.y) - .25), .1), EPS, true)
        );

    pixel = vec4(vec3(f),1.);
}
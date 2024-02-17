#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T


#include '../constants.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/noise.glsl'

out vec4 pixel;
void main() {

    vec2 r = ref(UV, R) * 20.;

    // adding an oscillator to the reference frame
    // two waves with diffrerent frequencies and offsets
    r += vec2(0., sin(r.x + T) + sin(.5 * r.x - T) );

    float f = 
        // the line is just a rect, repeated in the y
         fill(rect(vec2(r.x, fract(r.y) - .5), vec2(30.,.1)), EPS, true) * 
        // clip the top and bottom
        fill(abs(r.y) - 15., EPS, true);

    pixel = vec4(vec3(f),1.);
}
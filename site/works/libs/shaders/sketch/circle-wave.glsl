#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T


#include '../constants.glsl'
#include '../utils/2d-utils.glsl'

out vec4 pixel;
void main() {

    vec2 r = ref(UV, R) * 14.;

    // repeat space in both directions
    vec2 r1 = fract(r) - .5;
    // get the integer or the coordinate to differentiate the squares
    vec2 r2 = floor(r) * 36.;
    
    // make a rotation with an offset that depends
    // on the x and y component of the square 
    vec2 r3 = r1 * rot(radians(r2.x + r2.y + T * 180.));

    float f = 
        // draw a square
        fill(rect(r1, vec2(.8)), EPS, true) *
        // clip a circle inside with the calculated rotation 
        fill(circle(r3 - vec2(.0,.1), .2), EPS, false) *
        // clip a border of the frame
        fill(rect(r, vec2(9.75) ), EPS, true);

    pixel = vec4(vec3(f),1.);
}
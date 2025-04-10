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

    vec2 r = ref(UV, R) * 14.;

    // repeat space in both directions
    vec2 r1 = fract(r) - .5;
 
    // time speed
    float t = .2* T * 6.283;
    // big circle center
    vec2 c = r + 3. * vec2(cos(t), sin(t*2.));
    // calculate the radius of circles, based onP the distance
    // from the big circle 
    float radius = .4 - (length(c)*.05);

    float f = 
        // draw a square
        fill(rect(r1, vec2(.8)), EPS, true) *
        // clip a circle inside with the calculated size 
        fill(circle(r1 , radius ), EPS, false) *
        // clip a border of the frame
        fill(rect(r, vec2(9.75) ), EPS, true);

    pixel = vec4(vec3(f),1.);
}
#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T


#include '../constants.glsl'
#include '../utils/shaping-functions.glsl'
#include '../utils/2d-utils.glsl'

// squaring the circle...
// using and easing function to animate
// scale , position and rotation of objects.
out vec4 pixel;
void main() {
    
    vec2 r = ref(UV, R) * 2.;

    // the domain of easing function is [0,1]
    float t = fract(T/4.);

    // a quadratic function to animate the size
    float size = .2 + .5 * abs(easePow(t,2.,modeOut)-.5);

    // a cubic function to animate the position
    float ep = easePow(t,3.,modeInOut);

    vec2 p1 = vec2(cos(ep*6.238),sin(ep*6.238))*.5;
    vec2 p2 = vec2(cos(1.57+ep*6.238),sin(1.57+ep*6.238))*.5;

    // a quartic function to animate the rotation
    float er = easePow(t,4.,modeInOut);

    mat2 r1 = rot(er*6.283*.25); 
    mat2 r2 = rot(-er*6.283*2.); 
 
    float f = 
        fill(circle(r, size * .5), EPS, true) *
        stroke(circle(r, size * .2), size * .1, EPS, false) +
        fill(rect((r + p1) * r1,vec2(size)), EPS, true) +
        fill(rect((r - p1) * r1,vec2(size)), EPS, true) +
        stroke(rect((r + p2) * r2,vec2(size)), size * .1, EPS, true) +
        stroke(rect((r - p2) * r2,vec2(size)), size * .1, EPS, true);

    pixel = vec4(vec3(f),1.);
}
#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

#include '../constants.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/noise.glsl'

out vec4 pixel;
void main() {

    vec2 r = ref(UV, R) * 1.;

    // mouse in normalized coordinates
    vec2 m = M/R;
    // controls the number of iterations
    int n = int(floor(m.x*7.));

    // with start with a normalized reference frame
    vec2 lr = r;
    for (int i=0; i<n; i++) {
        vec2 next = 2. * vec2(lr.x * - signz(lr.x), lr.y) + vec2(.5, .5 * - signz(lr.y));
        lr =  (lr.y >= 0. ? next.xy : next.yx);

    }

    // in the last transformation the initial shape.
    float v = 
        stroke( rect(lr- vec2(.0,-.125), vec2(.5,.75)), .1 , EPS, true) * 
        fill( rect(lr - vec2(.3,-.426) , vec2(1,.25) ), EPS, false ) +
        fill( rect(lr + vec2(-0.25-.125,.25), vec2(.25,.1)), EPS, true) ;

    pixel = vec4(vec3(v),1.);
}
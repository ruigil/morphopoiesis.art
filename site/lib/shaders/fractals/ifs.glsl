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

    vec2 r = ref(UV, R) * 1.5;

    // mouse in normalized coordinates
    vec2 m = M/R;
    // controls the number of iterations in the mouse x direction
    int n = int(floor(m.x*12.));

    // with start with a normalized reference frame
    vec2 lr = r;
    for (int i=0; i<n; i++) {
        // if the current pixel is above the diagonal 
        lr = (lr.y - lr.x) > 0. ? 
            // apply scale translate transform 
            (lr*2.)-vec2(-.5, .5) : 
            // apply rotate, scale, translate 
            (lr*rot(radians(-45.))*((sqrt(2.))))-vec2(.0, -.5);
    }

    // in the last transformation we just draw one circle.
    float v = fill( circle(lr, .5), EPS, true);

    pixel = vec4(vec3(v),1.);
}
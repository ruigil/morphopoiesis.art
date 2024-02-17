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
    // controls the number of iterations
    int n = int(floor(m.x*7.));

    // with start with a normalized reference frame
    vec2 lr = r;
    for (int i=0; i<n; i++) {
        // we apply a radial symetry of 3, and a translation
        lr = modpolar(lr*2.,3.,radians(30.)) - vec2(.0,.5);
    }

    // in the last transformation we just draw one circle.
    float v = stroke( circle(lr, .45), .1 , EPS, true);

    pixel = vec4(vec3(v),1.);
}
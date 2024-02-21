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
    int n = int(floor(m.x*5.));

    // with start with a normalized reference frame
    vec2 lr = r;
    for (int i=0; i<n; i++) {
        // the fold operation is a symmetry along an arbitrary axis
        lr = fold(abs(lr*3.),radians(45.))-vec2(1.,.5);
        lr = vec2(lr.x,abs(lr.y)-.5);
    }

    // in the last transformation we just draw one circle.
    float v = fill( circle(lr, .5) , EPS, true);

    pixel = vec4(vec3(v),1.);
}
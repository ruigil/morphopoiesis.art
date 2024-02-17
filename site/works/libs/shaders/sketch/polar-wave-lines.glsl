#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T

#include '../constants.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/noise.glsl'
#include '../utils/complex-math.glsl'

out vec4 pixel;
void main() {

    // convert to polar
    vec2 r = toPolar(ref(UV, R) * 40.);

    // add two oscilators on the radial coordinate
    r += vec2(r.x * (sin(r.y * 3. + T) *.2 + sin(r.y * 7. - T) *.2),0.);

    float f = 
        // repeat on the radial axis and convert to cartesian
        stroke(circle(toCarte(vec2(fract(r.x), r.y)), .5), .1, EPS, true) *
        // clip boundary
        fill(circle(toCarte(r), 10.), EPS, true);

    pixel = vec4(vec3(f),1.);
}
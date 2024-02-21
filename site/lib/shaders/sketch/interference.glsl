#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T


#include '../constants.glsl'
#include '../utils/2d-utils.glsl'

out vec4 pixel;
void main() {

    vec2 r = ref(UV, R) * 40.;

    // time speed
    float t = .01 * T * 6.238;

    // one oscilator
    vec2 c = r + 30. * vec2(cos(t*3.), sin(t*2.));

    // add sin waves from the oscilator and one at the center
    float f = clamp(  sin(length(c)-t*40.) + sin(length(r) -t * 30.) , 0., 1. );

    pixel = vec4(vec3(f),1.);
}
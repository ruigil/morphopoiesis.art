#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T


#include '../constants.glsl'
#include '../utils/2d-utils.glsl'

// an isolated charge has a radius of the charge param
float charge(vec2 r, float charge) {
    return (1. / charge) - (charge / dot(r,r));
}

out vec4 pixel;
void main() {

    vec2 r = ref(UV, R) * 4.;

    float v = fill(
        charge( r, .25) +  
        charge( r + sin(T), 1.) + 
        charge( vec2(-r.x,r.y) + cos(T), 2.)
    , EPS, true);

    pixel = vec4(vec3(v),1.);
}
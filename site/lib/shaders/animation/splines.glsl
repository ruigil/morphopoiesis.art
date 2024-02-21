#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

#include '../constants.glsl'
#include '../utils/noise.glsl'
#include '../utils/2d-utils.glsl'

vec3 spline(vec3 m1, vec3 c1, vec3 c2, vec3 m2, float t) {
    return 
        c1 * (2.*t*t*t - 3.*t*t + 1.) + 
        m1 * (t*t*t - 2.*t*t + t) + 
        c2 * (-2.*t*t*t + 3.*t*t) +
        m2 * (t*t*t - t*t);
}

vec2 spline(vec2 m1, vec2 c1, vec2 c2, vec2 m2, float t) {
    return 
        c1 * (2.*t*t*t - 3.*t*t + 1.) + 
        m1 * (t*t*t - 2.*t*t + t) + 
        c2 * (-2.*t*t*t + 3.*t*t) +
        m2 * (t*t*t - t*t);
}


out vec4 pixel;
void main() {
    vec2 r = ref(UV,u_resolution);

    vec2 m = u_mouse/u_resolution;
}
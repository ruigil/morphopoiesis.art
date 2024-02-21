#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T

#include '../constants.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/noise.glsl'
#include '../utils/shaping-functions.glsl'

out vec4 pixel;
void main() {
    // this is a remix of a generative artwork by William J. Kolomyjec
    // http://dada.compart-bremen.de/item/agent/644

    vec2 r = ref(UV, R) * 12.;

    // repeat space in both directions
    vec2 r1 = fract(r) - .5;
    // grid coordinates
    vec2 r2 = floor(r) * 36.;

    // draw a white square
    float f = fill(rect(r1, vec2(.8)), EPS, true);

    // random number of inner squares
    float ns = 2. + floor(4.* hash(r2));
    for (float s=0.; s < ns; s++) {
        // size of inner squares
        float size = (.1 + (.1*s)) * (.7/(ns*.1));
  
        // center offset of the inner square
        vec2 center = (.35 - size * .5) * vec2(noise(r2 + T)-.5,noise(r2.yx + T)-.5);
  
        // clip a rect inside with the calculated size and offset 
        f *= stroke(rect(r1 - center, vec2( size  )), .03, EPS, false);
    }

    // clip a border of the frame
    f *= fill(rect(r, vec2(9.75) ), EPS, true);

    pixel = vec4(vec3(f),1.);
}
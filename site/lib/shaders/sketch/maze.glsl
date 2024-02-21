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

    vec2 r = ref(UV, R);

    // the size of the maze
    float grid = 30.;
    
    // here we use the function sign 
    // that returns 1 or -1 of a random function. 
    // this will give us flipped reference frame 
    // in the x axis with 50% probability 
    vec2 m = fract(grid * vec2( signz(noise(T*.1 + floor(grid * r)) - .5) * r.x,  r.y ));

    // draw a diagonal line
    float v = stroke(m.x - m.y, .1, .1, true);

    // clip borders
    v *= fill( rect(r,vec2(1.6)) , EPS, true);

    pixel = vec4(vec3(v),1.);
}
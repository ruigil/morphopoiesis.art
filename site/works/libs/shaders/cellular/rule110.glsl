#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_buffer0;

#include '../constants.glsl'
#include '../utils/noise.glsl'
#include '../utils/2d-utils.glsl'

#define size 170.

#if defined(BUFFER_0)
// Rule 110 is a Turing-complete cellular automata 
// https://en.wikipedia.org/wiki/Rule_110

float rule110(sampler2D t, vec2 p, float scale) {

    int result = 0;

    // read the previous state
    int values[3];
    for (int i=0; i<3; i++) {
        vec2 offset =  vec2( (i%3) - 1 , -1. ) * PIXEL_SIZE * scale;
        values[i] = int( texture (t, fract(p + offset) ) );
    }

    // the rule number is ...
    // l2 * 2^2 + l1 * 2^1 + l0 * 2^0
    int rule = (values[2] << 2) + (values[1] << 1) + values[0];

    // apply the ruleset...
    // https://en.wikipedia.org/wiki/Rule_110#/media/File:One-d-cellular-automaton-rule-110.gif
    result = 
        rule == 7 ? 0 :
        rule == 6 ? 1 :
        rule == 5 ? 1 :
        rule == 4 ? 0 :
        rule == 3 ? 1 :
        rule == 2 ? 1 :
        rule == 1 ? 1 :
        0;

    return float(result);
}


out vec4 pixel;
void main() {
    // the scale of the pixel
    float scale = 4.;
    // XY is the coordinate of the pixel gl_FragCoord.xy
    // but because coordinates are for the middle of the pixel, 
    // they are 1.5, 2.5, 3.5,... we need to subtract .5 and 
    // add it afterwards with the correct scale
    vec2 p = ( (floor( (XY - .5) / scale ) * scale )) / R;

    // add half pixel
    p += (PIXEL_SIZE * scale * .5);

    float r110 =  
        p.y >= 1. - PIXEL_SIZE.y * scale ? // is it the first line ?
        mod(T, 30.) < .1 ? // 30 seconds have passed ?
            floor( hash( floor(T) + p) + .5) : // reset the state
            rule110( u_buffer0, p, scale ) : // apply the rule
        texture(u_buffer0, p + vec2(0.,PIXEL_SIZE.y*scale) ).r; // slide the texture down  

    // output the calculated value
    pixel = vec4( vec3(r110), 1.); 
}
#else
// we just copy the texture to the screen...
out vec4 pixel;
void main() {
    pixel = vec4(texture(u_buffer0,UV).rgb,1.);
}
#endif
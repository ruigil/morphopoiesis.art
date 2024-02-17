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

    // eclipse shader
    // the corona is built with a deformed circle
    // to have noise stich in a circular way, 
    // we need to sample it in a polar form

    // reference frame
    vec2 r = ref(UV, R) * 2.;
 
    // convert to polar coordinates
    vec2 pr = toPolar(r);

    // noise in the angular component
    pr.y +=  noise(r * pr.x + T * .1 ) - .5;
    
    // noise in the radial component
    pr.x += noise( toCarte(vec2( 10. + 5. * sin(T*.05), pr.y) ) );
    
    float f =
        // the sun 
        xor(stroke(circle(r,.3),.01,  EPS, true)*.7,
        // the moon
        fill(circle(r,.29), .01, false) *
        // the corona 
        fill(circle(toCarte(pr), .7), .1, true) * fbm(pr.xy-T*.2));

    pixel = vec4(vec3(f),1.);   
}
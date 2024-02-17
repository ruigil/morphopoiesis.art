#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T


#include '../constants.glsl'
#include '../utils/2d-utils.glsl'

// accept value between [-1,1]
// returns a scale between double and half
float scale(float d) {
    return min( - 1./ (min(1. + d, 1.5) - 2.), - 1. / (min(1. + d *.5, 1.5) - 2.) );
}

out vec4 pixel;
void main() {

    // inspired by Victor Vasarely

    // reference frame
    vec2 r = ref(UV, R) * 14.;

    // the distortion is made by generating a field between [-1,0]
    // and use it to distort the scale of the grid
    r *= scale(-sin(radians((max(1.-length(r*.15),0.))*(90.))));

    // fractional reference frame
    vec2 fr = fract(r) -.5;

    // to generate pattern of 01010101
    float t = floor(mod(floor(r.x)+floor(r.y),2.));
    // a grid
    float f = stroke(rect(fr, vec2(1.)), .05, EPS, true );
   
    // use the pattern to choose the shape
    f += bool(t) ? 
          fill(circle(fr,.3 ), EPS , sign(r.x*r.y) < 0. ) 
        : fill(rect(fr * rot(T),vec2(.4)), EPS, true );

    pixel = vec4(vec3(f),1.);   
}
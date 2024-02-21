#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T

#include '../constants.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/noise.glsl'


// the distions of x <0 forces a path of transformations
// that invalidate some points.
// try to remove the distinction and accumulate with a xor or multiply
out vec4 pixel;
void main() {

    vec2 r = ref(UV, R) * 3.;

    // mouse in normalized coordinates
    vec2 m = M/R;
    // controls the number of iterations
    int n = int(floor(m.x*12.));

    vec2 lr = r;
    vec2 r1 = r;
    vec2 r2 = r;
    float sqrt2 = sqrt(2.);
    float v = 0.;
    for (int i=0; i<n; i++) {

        
        r1 = ((lr * sqrt2) * rot(radians(-45.)) + vec2(.0,-sqrt2*.5)) ;
        r2 = ((lr * sqrt2) * rot(radians(-135.)) + vec2(.0,sqrt2*.5)) ;
        
        lr =  lr.x < 0. ? r1: r2;

        v+= fill(circle(lr,.1),EPS,true);
    }

    // draw a shape in the resulting reference frame
    v += 
        fill( rect( lr *rot(radians(45.)) , vec2(1.)), EPS, true) * fill(lr.y, EPS, false) +
        fill( rect( lr *rot(radians(45.)) , vec2(1.)), EPS, true) * fill(lr.y, EPS, false) 
        ;
    
    v += fill( rect(r, vec2(.01,2.)) , EPS, true);
    v += fill( rect(r, vec2(2.,.01)) , EPS, true);
    v += stroke( rect(r*rot(radians(45.)), vec2(1.)) ,.01, EPS, true);

    pixel = vec4(vec3(v),1.);
}
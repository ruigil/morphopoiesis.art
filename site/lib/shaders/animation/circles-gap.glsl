#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T


#include '../constants.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/noise.glsl'
#include '../utils/shaping-functions.glsl'

// using easing functions with noise
out vec4 pixel;
void main() {
    
    vec2 r = ref(UV, R) * 2.;

    float f = 0.; // result

    for (float i = 0.; i < 4.; i++) { // 4 circles

        float t = fract( T / 4. ); // time domain
        float n = noise( vec2(i , floor( (T / 4. ) + .5)) ); // noise dependent on time and index

        f = max(f, 
                // the circle with variable radius
                stroke( circle(r, .1 + n * abs(easePow(t, 3., modeInOut) - .5) ), .01, EPS, true) *
                // the gaps with variable number of rays and rotation 
                fill( rays( r * rot( sign(n - .5) * easePow(t, 4., modeInOut) * 6.283 * floor(n * 4.)) , 1. + floor(5. * n) ), EPS, false)
            );  
    }


    pixel = vec4(vec3(f),1.);
}
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
    // reference frame
    vec2 r = ref(UV, R);

    // float accumulator
    float f = 0.;

    // One way to build fractals is to iterate
    // a transformation and accumulate a value

    // here we have a function exp that serves as the value to accumulate.
    
    // it has the protery of exp(0) = 1 and the negative side 
    // tends to zero without reaching it.

    // we use it to accumulate on the direction of the y axis
    // then we apply a iterative transformation, that rotates the space

    // this allow us to view all the result of all the rotations of the space
    for (float i = .0 ; i < 5. ; i++) {
        // abs to introduce a symmetry of the axis
        r = abs(2.*fract(r)-1.) * 
            // a rotation that varies in time and in the iteration
            rot(radians(90.*sin( (T*.2) + i/6.283) ) );

        // accumulate exp in the y axis multipling by a value to modulate
        // the accumulation. If we iterate more, this value must be bigger.
        f += exp(-abs(r.y) * 10. );
    }

    pixel = vec4(vec3(f),1.);
 }


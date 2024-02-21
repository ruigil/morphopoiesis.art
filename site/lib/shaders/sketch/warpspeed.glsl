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
void main( void ) {

    vec2 r = ref(UV, R);

    // there is absolutely no physic involved in this shader !
    // to prove that a good illusion is almost as good as the real thing :)

    // to construct the starfield, we acumullate 4 polar grids.
    // in the radial axis, we use a random function to choose a star

    // the next step is to deform the radial axis with a pow function 
    // raised to a number less than 1.

    // by modulating this exponent, we 'warp' space giving the illusion 
    // of speed ! 

    // convert the reference frame to polar coordinates
    vec2 p = toPolar(r);

    // a warp constant modulated by a sine oscilator
    float warp = .19 * abs(sin(T*.1));
    // here we 'warp' space by changing the exponent of the radial axis
    p = vec2(pow(p.x,.2 - warp), p.y/6.283) * 100.;

    // acumulator
    float f = 0.;
    
    // 4 polar grids
    for(float i=1.; i<5.; i++) {
        // each with a different offset in both axis
        // to create a parallax ilusion
        p -= vec2(T, .3);
    
        float star = 
            // the star is a simple circle
            // we just draw one star, in a fractional space
            fill(circle(fract(p) - .5, .1), EPS, true) *
            // this random function control the amount of stars
            step(hash(floor(p)), .05 ); 
    
        // we acumulate and give each star grid a different brightness
        f = max(f, star  * (i*.1) );
    }

    // make stars close to the center dimmer
    f *= length(r) * 4.;

    pixel = vec4(vec3(f),1.);
}

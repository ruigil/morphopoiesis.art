#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
// buffer to keep the state of the simulation
uniform sampler2D u_buffer0;

#include '../constants.glsl'
#include '../utils/noise.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/gradients.glsl'

// The cyclic cellular automaton can be interpreted as a model to 
// thermodynamic cycles. Each cell can be in a discrete state from 1 to N, and
// if one of its neighbors is the successor state, modular N+1, (which means that 0 is the 
// successor state of N, then the next iteration the cell becomes its successor.
// We can see each state as a specie, zebras eat grass, lions eat zebras, and microbes eat lions when they die,
// repeating the cycle.
// https://en.wikipedia.org/wiki/Cyclic_cellular_automaton
#if defined(BUFFER_0)
float cyclic(sampler2D t, vec2 p, float ntypes, float scale) {
    
    // current type
    float type = texture(t, p ).r;
    // count successors
    float cs = 0.;

    // the sucessor of this type.
    float successor = mod( floor(type * (ntypes+1.)) + 1., ntypes);
    
    // check the region of 8+1 pixels around this one.  
    for(int i=0; i<9; i++) {
        vec2 offset = ( vec2( (i/3) - 1 , (i%3) - 1 ) * PIXEL_SIZE * scale  );
        float nt = texture(t, fract(p + offset) ).r;
        // if it is a successor add it to the count.
        cs +=  float( floor(nt * (ntypes+1.)) == successor);   
    } 
    
    // if the cell has more than one successor, then it becomes 
    // the successor normalized, or else it stays the same type.
    return cs >= 1. ? (successor/ntypes) : type;
}


out vec4 pixel; 
void main() {

    // scale of the simulation
    float scale = 1.;
    // number of types
    float ntypes = 32.;

    // XY is the coordinate of the pixel gl_FragCoord.xy
    // but because coordinates are for the middle of the pixel, 
    // they are 1.5, 2.5, 3.5,... we need to subtract .5 and 
    // add it afterwards with the correct scale
    vec2 uv = ( (floor( (XY - .5) / scale ) * scale )) / R;
    
    // every 15 seconds restart the simulation
    float c =  mod(floor(T),30.) == 0. ? 
        // initialized a random cell 
        floor(hash(floor(T) + floor(uv*R)+R) * ntypes)/ntypes : 
        // perform the simulation
        cyclic(u_buffer0, uv + (PIXEL_SIZE*scale*.5) /* add half pixel*/, ntypes, scale);

    pixel = vec4(vec3(c),1.); 
}

#else
// we just copy the texture buffer to the screen
// and apply a gradient to the types...
out vec4 pixel; 
void main() {
    pixel = vec4( lava( texture(u_buffer0,UV).r) , 1.);
}
#endif  
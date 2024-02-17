#version 300 es
precision highp float;

uniform vec2 u_resolution; // R
uniform vec2 u_mouse; // M
uniform float u_time; // T
// buffer to keep the state of the simulation
uniform sampler2D u_buffer0;

#include '../constants.glsl'
#include '../utils/noise.glsl'
#include '../utils/2d-utils.glsl'

// Conway Game of Life 
// https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life

// so we define a buffer that receives itself as an input texture, 
// that we will use to keep the state of the simulation
#if defined(BUFFER_0)

float life(sampler2D t, vec2 p, float scale) {
    // we read the previous state from the texture buffer, to see if the cell is alive... 
    float alive = 1. - texture( t, p ).r; 
    float nb = 0.; // neighbors

    // count the number of alive neightbors of this pixel (8+1) 
    for(int i=0; i<9; i++) {
        vec2 offset = ( vec2( (i/3) - 1 , (i%3) - 1 ) * PIXEL_SIZE * scale  );
        nb += 1. - texture(t, fract(p + offset) ).r;
    } 

    nb -= alive; // do not count self
    
    // rules... 
    // 1) if alive and 2 or 3 neighbors stay alive
    // 2) if dead and exactly three neighbors then born
    // 3) else dead...
    return float( (bool(alive) && (nb == 2. || nb == 3.)) || (!bool(alive) && nb == 3.) );
}
out vec4 pixel;
void main() {
    // the scale of the simulation (size of the pixels)
    float scale = 10.;
    
    // XY is the coodinate of the pixel gl_FragCoord.xy
    // but because coordinates are for the middle of the pixel, 
    // they are 1.5, 2.5, 3.5,... we need to subtract .5 and
    // add it in the simulation with the correct scale. 
    vec2 p = (( (floor( (XY - .5) / scale ) * scale ) ) / R) ;

    // normalize the mouse position for the pixel center
    vec2 mouse = M / R;

    float l =
        // random cell initialisation 
        floor( hash( T + p ) + .5 ) *
        // in a 3x3 square size at the mouse center 
        fill(rect( p - mouse, PIXEL_SIZE * scale * 3. ), EPS, true) +
        // plus life simulation 
        life(u_buffer0, p + (PIXEL_SIZE * scale *.5) /* add half pixel */, scale);

    // paint a little cicle for the cells that are alive
    vec2 r = ( (UV - p) / ( PIXEL_SIZE * scale) ) - .5;
    l *= fill(circle(r,.5), EPS, true);
    
    pixel = vec4(vec3(1.-l),1.); 
}
#else
// we just copy the texture buffer to the screen...
out vec4 pixel;
void main() {
    pixel = vec4(texture(u_buffer0 , UV).rgb,1.);
}
#endif
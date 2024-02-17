

#include '../utils/2d-utils.glsl'

#define R iResolution.xy 
#define T iTime
#define EPS 2./R.y

void mainImage( out vec4 O, vec2 CO) {

    ivec2 r = ivec2(floor( (CO / R.y) * 400.));

    int xor = ( (r.x + int(floor(40.*T))) ^ r.y ) % 11;

    float f = fill(rect(vec2(r), vec2(1.)), EPS, xor > 1 );
    
    O = vec4(f,f,f,1.);
}
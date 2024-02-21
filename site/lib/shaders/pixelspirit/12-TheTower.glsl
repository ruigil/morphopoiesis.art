#version 300 es
precision highp float;

uniform vec2 u_resolution;
// reference frame coordinated system with corrected aspect ratio, [-0.5,0.5 ] with [0,0] center of the screen
#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
// minimum epsilon difference for one pixel
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

float stroke(float f, float w, float i) { return abs(i - smoothstep(0., .01, abs(f) - (w *.5) )); }
float fill(float f, float i) { return  abs(i - smoothstep(0., 0.01, f)); }

float rect(vec2 r, vec2 size) { return max(abs(r.x) - size.x, abs(r.y) - size.y); }

// this function will work like and exclusive or 'xor' boolean operation
// it will return 1. when both are different and 0. if they are the same.
float xor(float f1, float f2) { return abs(f1 - f2); }

out vec4 pixel;
void main() { 
    vec2 r = ref * 2.;

    float f = 
        xor( fill(rect(r,vec2(.2,.5)),1.),  stroke( r.x + .8 * r.y, .05 , 1.));

    pixel = vec4(vec3(f), 1.);
}
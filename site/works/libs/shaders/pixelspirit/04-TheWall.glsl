#version 300 es
precision highp float;

uniform vec2 u_resolution;
// reference frame coordinated system with corrected aspect ratio, [-0.5,0.5 ] with [0,0] center of the screen
#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

// The 'abs' returns the absolute number, wich means that it will always return a positive number.
// so .1 - abs(ref.x) will always be negative except when ref.x is lesser than .1
// because ref.x is 0 on the center of the screen, it will return a vertical line with .2 thickness .1 * 2 sides of the zero boundary 
out vec4 pixel;
void main() { 
    float v = step( 0., .1 - abs(ref.x) );
    pixel = vec4( vec3(v), 1. );
}

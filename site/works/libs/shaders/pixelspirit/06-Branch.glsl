#version 300 es
precision highp float;

uniform vec2 u_resolution;
// reference frame coordinated system with corrected aspect ratio, [-0.5,0.5 ] with [0,0] center of the screen
#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/
float stroke(float f, float w) { return step( 0., (w *.5) - abs(f) ); }

out vec4 pixel;
void main() { 
    // The equation of a line and a stroke, the same that in 03 and 04
    float f = stroke( 1.3 * ref.x -  ref.y, .2);
    pixel = vec4( vec3(f), 1. );
}
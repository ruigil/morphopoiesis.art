#version 300 es
precision highp float;

uniform vec2 u_resolution;
// reference frame coordinated system with corrected aspect ratio, [-0.5,0.5 ] with [0,0] center of the screen
#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 

#define PI 3.14159265359

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

// To make a line at the zero boundary is quite useful so we make it a function called 'stroke'
// that encapsultates this. We send as parameters the function value and the final width.
// We must divide the width by 2, because the way abs works. (see The Wall) 
float stroke(float f, float w) { return step( 0., (w * .5) - abs(f) ); }

out vec4 pixel;
void main() {
    // we make a wavy central vertical line by adding a sin value modulated by ref.y
    float v = ref.x + .2 * sin(ref.y * PI);
    // we add a stroke to the line, and another stroke where we use the same technique
    // of creating a symmetric copy around the zero boundary with 'abs'
    // The two lines on each side are a copy of the center line at a distance of .3
    v = stroke(v,.1) + stroke(.3 - abs(v) , .1) ;
    pixel = vec4(vec3(v), 1.);
}
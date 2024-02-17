#version 300 es
precision highp float;

uniform vec2 u_resolution;
// reference frame coordinated system with corrected aspect ratio, [-0.5,0.5 ] with [0,0] center of the screen
#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

// The first value in the step function can be anything, 
// but it is good practice to define a convention 
// Here we will lock the first value at 0. and we try to define a function on the second parameter
// This way, the step function will show us when the function crosses the zero boundary
// In this case we have the equation of a line  mX - Y + b = 0 so, it will be black below the 
// line and white above.
out vec4 pixel;
void main() { 
    float v = step(0., 0.5 * ref.x + ref.y);
    pixel = vec4( vec3(v), 1. );
}
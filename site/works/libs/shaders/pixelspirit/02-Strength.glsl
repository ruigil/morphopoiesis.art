#version 300 es
precision highp float;

uniform vec2 u_resolution;
// reference frame coordinated system with corrected aspect ratio, [-0.5,0.5 ] with [0,0] center of the screen
#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 

#define PI 3.14159265359

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/


// You can build a vec3 with a single float, it will copy the value to the 3 channels, x,y,z
// You can also build a vec4 with a vec3 + 1 float and other combinations
// Here we modulate the vertical line on the last example with sin
// because ref.y is between -1,1 multiplied by PI it becomes -PI,PI
// scaled by .2 and added to the ref.x the vertical line becomes wavy...
// try swaping the coordinates and change the scale factor.
out vec4 pixel;
void main() {
    float v = step(0., ref.x + .2 * sin(ref.y * PI));
    pixel = vec4(vec3(v), 1.);
}
#version 300 es
precision highp float;

uniform vec2 u_resolution;
// reference frame coordinated system with corrected aspect ratio, [-0.5,0.5 ] with [0,0] center of the screen
#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
// minimum epsilon difference for one pixel
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

// Lets create a signed distance function (sdf) for circles
float circle(vec2 center, float radius) { return length(center) - radius; }

// lets create a function that will return 1 or 0 if the sdf is positive or negative. 
// When the parameter 'i' is 1. it will return 1 for the negative part of the sdf, 
// when the parameter 'i' is 0. it will do the inverse. 
float fill(float f, float i) { return  abs(i - smoothstep(0., EPS, f)); }

out vec4 pixel;
void main() { 
    // we scale the coordinated system by 2. [-1,1]
    vec2 r = ref * 2.;
    // first we will fill white circle at the origin with radius .5
    float v = fill(circle(r, .5), 1.);
    // then we will fill an inverse circle offset from the origin (.1,.1)
    float mask = fill(circle(r - vec2(.1), .4), 0.);
    // when we multiply both the inverse circle works as a mask
    // because 1. * 0. = 0.
    pixel = vec4(vec3(v * mask), 1.);
}
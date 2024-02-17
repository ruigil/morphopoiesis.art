#version 300 es
precision highp float;

uniform vec2 u_resolution;

#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

float fill(float f, float i) { return  abs(i - smoothstep(0., EPS, f)); }
float tri(vec2 r) { return max( dot( vec2(abs(r.x),r.y), vec2(.866,.5)), - r.y ) - .433; }
float stroke(float f, float w, float i) { return abs(i - smoothstep(0., EPS, abs(f) - (w *.5) )); }
float circle(vec2 center, float radius) { return length(center) - radius; }

out vec4 pixel;
void main() { 

    vec2 r = ref * 2.;

    // to model this, we choose to define a triangle, 
    // and then using to create a fill 
    // and a stroke that we use as a mask for the circle
    // remember we apply mask by multiplying 1. * 0. = 0.
    float triangle = tri(r *2. + vec2(0.,.433)); 
    
    float f = 
        fill(triangle, 1.) +
        stroke(triangle, .1, .0) *
        stroke(circle(r - vec2(0., .2), .3), .05, 1.);
        
    pixel = vec4(vec3(f), 1.);
}
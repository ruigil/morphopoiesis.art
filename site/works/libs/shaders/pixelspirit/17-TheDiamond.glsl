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

// function composition and symmetry allow us to create a diamond by making
// a symmetric copy of the triangle on the y axis
float diamond(vec2 r) { return tri(vec2(r.x, abs(r.y))); }

out vec4 pixel;
void main() { 

    vec2 r = ref * 2.;

    float f = 
        stroke(diamond(r), .01, 1.) +
        stroke(diamond(r * 1.15), 0.02, 1.) +
        fill(diamond(r * 1.35), 1.);
        
    pixel = vec4(vec3(f), 1.);
}
#version 300 es
precision highp float;

uniform vec2 u_resolution;

#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

float stroke(float f, float w, float i) { return abs(i - smoothstep(0., EPS, abs(f) - (w *.5) )); }
float tri(vec2 r) { return max( dot( vec2(abs(r.x),r.y), vec2(.866,.5)), - r.y ) - .433; }
mat2 rot(float a) { float c = cos(a); float s = sin(a); return mat2(c,-s,s,c); }
float flip(float v) { return v == 0. ? 1. : sign(v); }

out vec4 pixel;
void main() { 

    // This one is quite magical.. double flip !
    vec2 r =  - ref * 2. * flip(ref.y);

    float f = 
        stroke(tri((r - vec2(.2, .15)) * 2.), .15, 1.) + 
        stroke(tri( - (r + vec2(.2, .15)) * 2.), .15, 1.) * 
        stroke(tri((r - vec2(.2, .15)) * 2.), .25, 0.);
        
    pixel = vec4(vec3(f), 1.);
}
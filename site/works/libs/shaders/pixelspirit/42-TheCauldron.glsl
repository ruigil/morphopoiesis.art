#version 300 es
precision highp float;

uniform vec2 u_resolution;

#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

float stroke(float f, float w, float i) { return abs(i - smoothstep(0., EPS, abs(f) - (w *.5) )); }
float circle(vec2 r, float radius) { return length(r) - radius; }
mat2 rot(float a) { float c = cos(a); float s = sin(a); return mat2(c,-s,s,c); }

vec2 moda(vec2 r, float n) {
    float angle = atan(r.y,r.x);
    return r * rot( mod(angle, 6.283 / n) - angle);
}

out vec4 pixel;
void main() { 

    // This result is not exactly the same, that the one in the PixelSpirit Deck...
    // In the deck that I have, the solution uses a 'for loop' with 12 steps that breaks the radial symmetry
    // This solution has only one step and keeps the radial symmetry.
    // This means it is 12 times more efficient !
    vec2 r = moda(ref * 2.,12.);

    float f = 
        stroke( circle( r + vec2(-.39,.35), .5), .03, 1.) * 
        stroke( circle( r - vec2(.16,.5), .5), .06, 0.) + 
        stroke( circle( r - vec2(.16,.5), .5), .03, 1.);
        
    pixel = vec4(vec3(f), 1.);
}
#version 300 es
precision highp float;

uniform vec2 u_resolution;

#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

float stroke(float f, float w, float i) { return abs(i - smoothstep(0., .01, abs(f) - (w *.5) )); }
float circle(vec2 r, float radius) { return length(r) - radius; }

out vec4 pixel;
void main() { 
    vec2 r = ref * 2.;

    // this is the magic, a horizontal flip modulated by the sign of the vertical axis
    // the sign function return 1,-1 or 0 to represent the sign of the variable.
    r = vec2(r.x * sign(r.y), r.y);

    float f = 
        stroke( circle( r - vec2(.4,.0), .5), .05, 1.) * 
        stroke( circle( r + vec2(.4,.0), .5), .1, 0.) + 
        stroke( circle( r + vec2(.4,.0), .5), .05, 1.);
        
    pixel = vec4(vec3(f), 1.);
}
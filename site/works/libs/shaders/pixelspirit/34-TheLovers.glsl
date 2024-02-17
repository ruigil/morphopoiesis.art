#version 300 es
precision highp float;

uniform vec2 u_resolution;

#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

float fill(float f, float i) { return  abs(i - smoothstep(0., EPS, f)); }
float stroke(float f, float w, float i) { return abs(i - smoothstep(0., EPS, abs(f) - (w *.5) )); }
float tri(vec2 r) { return max( dot( vec2(abs(r.x),r.y), vec2(.866,.5)), - r.y ) - .433; }
float circle(vec2 r, float radius) { return length(r) - radius; }

out vec4 pixel;
void main() { 
    vec2 r = ref * 2.;

    // to make a heart, start from a circle, and deform the space in the
    // y axis with a symmetric parabola on the x axis
    float f = 
        fill( circle( vec2( r.x, r.y  - .9 * abs(r.x) + .5 * abs(r.x*r.x) ), .5), 1.) * 
        stroke( tri( r*4. - vec2(.0,.4)), .1, .0);
        
    pixel = vec4(vec3(f), 1.);
}
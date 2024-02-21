#version 300 es
precision highp float;

uniform vec2 u_resolution;

#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

float fill(float f, float i) { return  abs(i - smoothstep(0., EPS, f)); }
float stroke(float f, float w, float i) { return abs(i - smoothstep(0., EPS, abs(f) - (w *.5) )); }
float rect(vec2 r, vec2 size) { return max(abs(r.x)-size.x,abs(r.y)-size.y); }
mat2 rot(float a) { float c = cos(a); float s = sin(a); return mat2(c,-s,s,c); }
float flip(float f) { return f == 0. ? 1. : sign(f); } 

out vec4 pixel;
void main() { 
    vec2 r = ref * 2.;
    
    // vertical flip modulated my the x axis
    // symmetry on the x axis
    r = vec2(-abs(r.x) +.155, r.y * flip(-r.x) ) * rot(radians(45.));

    // two rectangles, a fill and a stroke
    float f = 
        fill( rect( r, vec2(.31)), 1.) * 
        stroke( rect( r - vec2(.0,.2), vec2(.11,.3)), .04,.0);

    pixel = vec4(vec3(f), 1.);
}
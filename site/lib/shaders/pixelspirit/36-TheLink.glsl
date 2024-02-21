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

out vec4 pixel;
void main() { 

    vec2 r = ref * 2.;
    // a vertical flip on the vertical axis
    r = vec2(r.x, r.y * sign(ref.x) ) * rot(radians(-45.));

    float f = 
        stroke( rect( r - vec2(.18), vec2(.3)), .1, 1.) * 
        stroke( rect( r + vec2(.18), vec2(.3)), .2, 0.) + 
        stroke( rect( r + vec2(.18), vec2(.3)), .1, 1.) +
        // we build little diamonds by scaling non uniformly the x and y component of a square
        fill( rect( (abs(ref * 2.) - vec2(.0,.95)) * vec2(1.,.5) * rot(radians(45.)), vec2(.02)), 1.);
        
    pixel = vec4(vec3(f), 1.);
}
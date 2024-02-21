#version 300 es
precision highp float;

uniform vec2 u_resolution;

#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

float stroke(float f, float w, float i) { return abs(i - smoothstep(0., EPS, abs(f) - (w *.5) )); }
float rect(vec2 r, vec2 size) { return max(abs(r.x)-size.x,abs(r.y)-size.y); }
mat2 rot(float a) { float c = cos(a); float s = sin(a); return mat2(c,-s,s,c); }
float flip(float v) { return v == 0. ? 1. : sign(v); }

out vec4 pixel;
void main() { 

    vec2 r = ref * 2.;
    // the trick was to draw one version on the left another on the right, and flip the sign on the x axis to mix them
    // remove the flip(ref.y) to see the original
    r = vec2(r.x*flip(r.y),r.y) * rot(radians(45.));

    float f = 
        stroke(rect(r, vec2(.4)), .05, 1.) *  
        stroke(rect(r - vec2(.3), vec2(.25)), .08, .0) + 
        stroke(rect(r - vec2(.3), vec2(.25)), .05, 1.) *
        stroke(rect(r - vec2(.6), vec2(.05)), .08, 0.) +
        stroke(rect(r - vec2(.6), vec2(.05)), .05, 1.) + 
        stroke(rect(r + vec2(.3), vec2(.25)), .05, 1.) *
        stroke(rect(r, vec2(.4)), .08, .0) + 
        stroke(rect(r + vec2(.6), vec2(.05)), .05, 1.) *
        stroke(rect(r + vec2(.3), vec2(.25)), .08, 0.); 

    pixel = vec4(vec3(f), 1.);
}
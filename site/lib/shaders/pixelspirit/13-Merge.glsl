#version 300 es
precision highp float;

uniform vec2 u_resolution;

#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

float stroke(float f, float w, float i) { return abs(i - smoothstep(0., .01, abs(f) - (w *.5) )); }
float fill(float f, float i) { return  abs(i - smoothstep(0., 0.01, f)); }
float circle(vec2 center, float radius) { return length(center) - radius; }
float xor(float f1, float f2) { return abs(f1 - f2); }

out vec4 pixel;
void main() { 
    vec2 r = ref * 2.;

    float f = 
        xor(fill(circle(r - vec2(.3,.0), .5), 1.), stroke(circle(r + vec2(.3,.0),.5), .04, 1.));
    
    pixel = vec4(vec3(f), 1.);
}
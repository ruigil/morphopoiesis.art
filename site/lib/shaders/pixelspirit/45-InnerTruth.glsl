#version 300 es
precision highp float;

uniform vec2 u_resolution;

#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

float fill(float f, float i) { return  abs(i - smoothstep(0., EPS, f)); }
float stroke(float f, float w, float i) { return abs(i - smoothstep(0., EPS, abs(f) - (w *.5) )); }
float circle(vec2 r, float radius) { return length(r) - radius; }

out vec4 pixel;
void main() { 

    // There is always many ways to model the final result
    // Here we just take the spiral, and modulate it with a cos
    // and use it as a mask on a circle
     vec2 r = ref * 2.;

    float l = length(r * 3.);
    float a = atan(r.y,r.x); 

    float f = 
        fill( circle(r,.67 ), 1.) *
        stroke( cos( (l - a) * 5.) , 1.5, .0) * 
        stroke( cos( (l + a) * 5.) , 1.5, .0);
        
    pixel = vec4(vec3(f), 1.);
}
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
float xor(float f1, float f2) { return abs(f1-f2); }
// lets create a function for the rays
float rays(vec2 r, float n) { return mod(atan(r.y,r.x),6.283/n)-(3.14/n); }

out vec4 pixel;
void main() { 
    
    vec2 r = ref;
    // just a xor and a radial stroke with the rays to make this effect
    float f = 
        xor(
            fill(r.y, 1.), 
            stroke( rays(r,28.), .05, 1.) 
        ) * 
        stroke( rect(r, vec2(.2)), .05, 0.) + 
        fill( rect(r, vec2(.19)), 1.);

    pixel = vec4(vec3(f), 1.);
}
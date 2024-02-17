#version 300 es
precision highp float;

uniform vec2 u_resolution;

#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

float fill(float f, float i) { return  abs(i - smoothstep(0., 0.01, f)); }
float stroke(float f, float w, float i) { return abs(i - smoothstep(0., .01, abs(f) - (w *.5) )); }
mat2 rot(float a) { float c = cos(a); float s = sin(a); return mat2(c,-s,s,c); }
float rect(vec2 r, vec2 size) { return max(abs(r.x) - size.x, abs(r.y) - size.y); }

// here we define a sdf for a generic polygon. It is based on the circle sdf
// and the polygone with 'n' sides, will be contained in the circle 'radius'
float poly(vec2 r, float radius, float n) { 
    return length(r) * cos(mod(atan(r.y, r.x) - 1.57, 6.28 / n) - (3.14 / n)) - radius ;
}

out vec4 pixel;
void main() { 

    vec2 r = ref * 2.;
    
    // changing the signal on the reference frame is the same that doing a vertical and horizontal flip
    float f = 
        fill(poly(r, .7, 5.), 1.) *
        stroke(poly(r, .6, 5.), .1, 0.) *
        stroke(poly(-r, .47, 5.), .1, 0.) *
        stroke(poly(r, .37, 5.), .1, 0.) * 
        stroke(poly(-r, .29, 5.), .1, 0.) * 
        stroke(poly(r, .18, 5.), .1, 0.) * 
        fill(poly(-r, .12, 5.), 0.); 
    
    pixel = vec4(vec3(f), 1.);
}
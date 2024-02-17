#version 300 es
precision highp float;

uniform vec2 u_resolution;

#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

float fill(float f, float i) { return  abs(i - smoothstep(0., EPS, f)); }
float stroke(float f, float w, float i) { return abs(i - smoothstep(0., EPS, abs(f) - (w *.5) )); }
mat2 rot(float a) { float c = cos(a); float s = sin(a); return mat2(c,-s,s,c); }
float rect(vec2 r, vec2 size) { return max(abs(r.x)-size.x*.5,abs(r.y)-size.y*.5); }

vec2 moda(vec2 r, float n, float start) {
    float angle = atan(r.y,r.x) - start;
    return r * rot( mod(angle, 6.283 / n) - angle);
}

out vec4 pixel;
void main() { 

    // one square, on rectangle and radial symmetry of 8
    vec2 r = moda(ref * 2.,8., radians(-22.5));

    float f = 
        fill( rect( (r + vec2(-.53,.0)) * rot(radians(45.)), vec2(.3)), 1.) +
        fill( rect( (r + vec2(-.2,.0)) , vec2(.4,.005)), 1.); 
        
    pixel = vec4(vec3(f), 1.);
}
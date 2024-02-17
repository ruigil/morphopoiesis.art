#version 300 es
precision highp float;

uniform vec2 u_resolution;

#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

float fill(float f, float i) { return  abs(i - smoothstep(0., EPS, f)); }
float stroke(float f, float w, float i) { return abs(i - smoothstep(0., EPS, abs(f) - (w *.5) )); }
float circle(vec2 center, float radius) { return length(center) - radius; }
mat2 rot(float a) { float c = cos(a); float s = sin(a); return mat2(c,-s,s,c); }

vec2 moda(vec2 r, float n, float start) { 
    float angle = atan(r.y,r.x) - start; 
    return r * rot( mod(angle, 6.283 / n) - angle); 
}

// to model a star5, we use a symmetric line around the vertical axis
// with 36 * 2. degrees and replicate the domain in the circle with 'moda' 5. times.
float star5(vec2 r) {
    r = moda(r , 5., radians(54.));
    return dot( vec2(abs(r.x), r.y ), vec2(.951,.309) ) - .475;
}

out vec4 pixel;
void main() { 
    vec2 r = -ref * 2.;

    float s = star5(r * 2.);
    
    float f = 
        stroke(circle(r,.85), .04, 1.) *
        stroke(s, .5, 0.) + 
        stroke(s, .08, 1.);

    pixel = vec4(vec3(f), 1.);
}
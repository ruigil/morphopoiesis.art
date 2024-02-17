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
float circle(vec2 r, float radius) { return length(r) - radius; }

vec2 moda(vec2 r, float n, float start) {
    float angle = atan(r.y,r.x) - start;
    return r * rot( mod(angle, 6.283 / n) - angle);
}

out vec4 pixel;
void main() { 

    vec2 r = moda(ref * 2., 5., radians(-36.));

    float f = 
        // all the flower petals are made with one circle !
        (fill( circle(vec2(r.x-.3, abs( abs(r.y) -.07) +.12), .22), 1.) +
        fill( circle(r, .2), 1.)) * // inner circle to cover center
        stroke( circle(r, .1), .03, 0. ) + // inner stoke
        stroke( circle(r, .6), .03, 1.); // outer stroke

        
    pixel = vec4(vec3(f), 1.);
}
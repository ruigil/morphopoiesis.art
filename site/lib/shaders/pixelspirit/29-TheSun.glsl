#version 300 es
precision highp float;

uniform vec2 u_resolution;

#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

float fill(float f, float i) { return  abs(i - smoothstep(0., EPS, f)); }
float stroke(float f, float w, float i) { return abs(i - smoothstep(0., EPS, abs(f) - (w *.5) )); }
float tri(vec2 r) { return max( dot( vec2(abs(r.x),r.y), vec2(.866,.5)), - r.y ) - .433; }
mat2 rot(float a) { float c = cos(a); float s = sin(a); return mat2(c,-s,s,c); }

float poly(vec2 r, float radius, float n) { 
    return length(r) * cos(mod(atan(r.y, r.x) - 1.57, 6.28 / n) - (3.14 / n)) - radius;
}

vec2 moda(vec2 r, float n) {
    float angle = atan(r.y,r.x);
    return r * rot( mod(angle, 6.283 / n) - angle);
}

out vec4 pixel;
void main() { 
    
    vec2 r = ref * 2. * rot(radians(22.5));
    
    // radial symmetry of 8 parts
    vec2 p = moda(r * 2. , 8.) * rot(radians(67.5));

    // the outer and inner ring
    float f = 
        max( 
            fill( tri( p - vec2(.0,.6) ), 1.), 
            fill( tri( abs(p) * rot(radians(22.5)) - vec2(0.,.4) ), 1.)
        );

    // remove the stroke of a rotating triangle 8 times
    for (float i=0.; i<8.; i++) {
        f *= stroke(tri(r * 2.4 * rot(radians(22.5 + (i*(360./8.)))) - vec2(.0,.9)), .05, .0);
    } 
    
    // remove an octagon in the center
    f *= stroke(poly(r, .1, 8.), .015, .0);    

    pixel = vec4(vec3(f), 1.);
}
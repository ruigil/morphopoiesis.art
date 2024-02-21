#version 300 es
precision highp float;

uniform vec2 u_resolution;

#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/
float fill(float f, float i) { return  abs(i - smoothstep(0., EPS, f)); }
float stroke(float f, float w, float i) { return abs(i - smoothstep(0., EPS, abs(f) - (w *.5) )); }
float rays(vec2 r, float n) { return mod(atan(r.y,r.x),6.283/n)-(3.14/n); }
float circle(vec2 r, float radius) { return length(r) - radius; }

out vec4 pixel;
void main() { 

    vec2 r = ref * 2.;

    // the sdf for the eye
    float eye = circle( vec2(r.x, abs(r.y) +.43), .65);
    
    float f = 
        fill( circle( vec2( abs(r.x) + .5, r.y), 1.), 1.) * 
        stroke( rays(r, 70.), .01, 1.) *
        fill(eye, 0.) + 
        stroke(eye, .02, 1.) +
        stroke( circle(r - vec2(0., .05), .22), .02, 1.) * 
        fill(eye, 1.);

    pixel = vec4(vec3(f), 1.);
}
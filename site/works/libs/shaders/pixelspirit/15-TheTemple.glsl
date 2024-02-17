#version 300 es
precision highp float;

uniform vec2 u_resolution;

#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

float fill(float f, float i) { return  abs(i - smoothstep(0., 0.01, f)); }

// A sdf for a triangle, by taking the max of 3 lines.
// two symmetrical lines in the x axis, and one for the base in the y axis. 
// sin(60 dg) = 0.866 cos(60 dg) = .5 
float tri(vec2 r) { return max( dot( vec2(abs(r.x),r.y), vec2(.866,.5)), - r.y ) - .433; }

out vec4 pixel;
void main() { 
    vec2 r = ref * 2.;
    
    // because shapes are defined in a normalized reference frame -1,1
    // to scale their size we multiply or divide the reference frame.
    float f = fill(tri(-r), 1.) * fill(tri(r * 2.), .0); 
              
    pixel = vec4(vec3(f), 1.);
}

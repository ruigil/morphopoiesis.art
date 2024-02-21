#version 300 es
precision highp float;

uniform vec2 u_resolution;
// reference frame coordinated system with corrected aspect ratio, [-0.5,0.5 ] with [0,0] center of the screen
#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
// minimum epsilon difference for one pixel
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

// Lets change our function 'stroke' to accept an inverse parameter like 'fill'
float stroke(float f, float w, float i) { return abs(i - smoothstep(0., EPS, abs(f) - (w *.5) )); }
float fill(float f, float i) { return  abs(i - smoothstep(0., EPS, f)); }

// lets define a new signed distance function 'rect', that will give us rectangular shapes.
// 'max' is a function that returns the maximum value of two parameters
// we substract the size to make it negative inside the shape
// Note: this function is not a 'true' sdf, because it doesn't respect the euclidean metric
// but it is still positive outside the shape and negative inside.
float rect(vec2 r, vec2 size) { return max(abs(r.x) - size.x, abs(r.y) - size.y); }

out vec4 pixel;
void main() { 
    vec2 r = ref * 2.;
    // So to construct this shape we fill a large .5 square and then
    // multiply by a mask of a stroke of a .25 inner square.
    // Note: There is many ways of reaching this result. 
    // One could simply add the outer stroke, with a inner fill
    // The goal is always to have functions that compose well to give 
    // flexibility of modelling the final result
    float v = fill(rect(r, vec2(.5)), 1.) * stroke(rect(r, vec2(.25)), 0.3, .0);

    pixel = vec4(vec3(v), 1.);
}
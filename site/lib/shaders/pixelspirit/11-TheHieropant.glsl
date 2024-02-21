#version 300 es
precision highp float;

uniform vec2 u_resolution;
// reference frame coordinated system with corrected aspect ratio, [-0.5,0.5 ] with [0,0] center of the screen
#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
// minimum epsilon difference for one pixel
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/


float stroke(float f, float w, float i) { return abs(i - smoothstep(0., .01, abs(f) - (w *.5) )); }
float fill(float f, float i) { return  abs(i - smoothstep(0., 0.01, f)); }

float rect(vec2 r, vec2 size) { return max(abs(r.x) - size.x, abs(r.y) - size.y); }

// We define a function cross by composing two rectangles.
float crosss(vec2 r, vec2 size) { return min(rect(r, size.xy), rect(r, size.yx)); }

out vec4 pixel;
void main() { 
    vec2 r = ref * 2.;

    float v =
        // the first outer stroke
        stroke(rect(r, vec2(.5)), .01, 1.) +
        // the second outer stroke
        stroke(rect(r, vec2(.44)), .02, 1.) +
        // the two following lines to construct a mask...
        fill(rect(r, vec2(.34)), 1.) *
        fill(crosss(r, vec2(.15,.35)), 0.) * 
        // ...to apply to the fractional stripes of a cross.
        // 'fract' returns the fractional part of a number
        // applied to a signed distance functions it creates 
        // multiple copies of the sdf between 0 and 1
        fill(fract(crosss(r * 19., vec2(.1, 15.) )) -.5, 1.) +
        // adding the inner cross
        fill(crosss(r, vec2(.07,.35)), 1.);

    pixel = vec4(vec3(v), 1.);
}

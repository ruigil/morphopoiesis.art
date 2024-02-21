#version 300 es
precision highp float;

uniform vec2 u_resolution;

#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

float stroke(float f, float w, float i) { return abs(i - smoothstep(0., EPS, abs(f) - (w *.5) )); }
mat2 rot(float a) { float c = cos(a); float s = sin(a); return mat2(c,-s,s,c); }
float rect(vec2 r, vec2 size) { return max(abs(r.x) - size.x, abs(r.y) - size.y); }

out vec4 pixel;
void main() { 

    vec2 r = ref * 2. * rot(radians(45.));

    // there are always several ways of getting to the final result
    // we've being doing fill, stroke and mask of primitives, because its
    // pretty simple to reason, but nothing stops us from more complex sdf's
    // in the Diamnond (shader 17) we use 'min' to compose two triangles
    // Because sdf's define positive and negative space, 'min' works as a union
    // of two signed distance functions. 
    float sdf =
        // so where going for the union of two sdf's ...
        min(
            // max is an intersection, but with a negative sign on the second sdf
            // it works as an extrusion of the second shape on the first.
            max(rect(r, vec2(.5)), -rect((r - vec2(.35,-.35)) , vec2(.35))),
            rect((r - vec2(.3,-.3)) , vec2(.2))
        );

    // now with only one stroke we draw the final shape.
    float f = stroke(sdf, .05, 1.);
    
    pixel = vec4(vec3(f), 1.);
}
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
    
    float f = 0.;
    // here we use a traditional for loop for the 4 squares.    
    for (float o = -.3; o<=.3; o += .2) {
        f = max(f,stroke(rect(r + o, vec2(.4)), .05, 1.));
    }
    
    pixel = vec4(vec3(f), 1.);
}
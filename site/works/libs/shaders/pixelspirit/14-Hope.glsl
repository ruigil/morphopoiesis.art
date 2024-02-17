#version 300 es
precision highp float;

uniform vec2 u_resolution;

#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

float fill(float f, float i) { return  abs(i - smoothstep(0., EPS, f)); }
float circle(vec2 center, float radius) { return length(center) - radius; }
float xor(float f1, float f2) { return abs(f1 - f2); }

out vec4 pixel;
void main() { 
    vec2 r = ref *2.;
    
    // first trick is to use 'abs(r)' to give us a symmetric merge of the circle in the origin 
    // second is that a simple line '.7 * r.x + r.y' can be seen as sdf too ! 
    // dividing the plane into positive and negative space. 
    float f = 
        xor(fill(circle(abs(r) + vec2(.25,.0), .5), 1.), fill(.7 * r.x + r.y, 1.));
              
    pixel = vec4(vec3(f), 1.);
}
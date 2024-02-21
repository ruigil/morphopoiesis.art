#version 300 es
precision highp float;

uniform vec2 u_resolution;

#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

out vec4 pixel;
void main() { 

    vec2 r = ref;

    // a logaritmic spiral
    float f = smoothstep(.0, EPS, sin( atan(-r.y,r.x) - 1.618 * log( length(r) )) );
        
    pixel = vec4(vec3(f), 1.);
}
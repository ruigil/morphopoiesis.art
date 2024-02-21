#version 300 es
precision highp float;

uniform vec2 u_resolution;

#define ref ((gl_FragCoord.xy - u_resolution.xy *.5) / ( u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y)) 
#define EPS (1./ (u_resolution.x < u_resolution.y ? u_resolution.x : u_resolution.y ))

// From Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/

float fill(float f, float i) { return  abs(i - smoothstep(0., EPS, f)); }
float tri(vec2 r) { return max( dot( vec2(abs(r.x),r.y), vec2(.866,.5)), - r.y ) - .433; }

// this is a 2Dimension rotation matrix.
// when we multiply a 2d point vec2 by this, it will rotate 'a' radians 
mat2 rot(float a) { float c = cos(a); float s = sin(a); return mat2(c,-s,s,c); }

out vec4 pixel;
void main() { 

    // because our sdf shapes are defined in a normalised reference frame 
    // we transform them, by transform the reference frame
    // here we scale it by 2. [-1, 1] and rotate it by 30 degrees  
    vec2 r = ref * 2. * rot(radians(30.));

    float f = 
        fill(tri(r), 1.) *
        // we use the second triangle as a mask, that we translate 
        // and scale with different values in the x and y axis.  
        fill(tri((r + vec2(0.,.29)) * vec2(1.,3.)), 0.);
        
    pixel = vec4(vec3(f), 1.);
}
#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T

uniform sampler2D u_buffer0;

#include '../constants.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/noise.glsl'

#if defined(BUFFER_0)
out vec4 pixel;
void main() {

    // although it looks 3d, there is no such thing here
    // only one line is draw, all the others are ghosts from 
    // previous frames. because we apply an offset to the ghost line
    // and we erase below the new line, it gives the illusion of 3d

    // the size of the reference frame
    float size = 40.;

    vec2 m = M/R;

    // the reference frame is between [-1,1] * size
    vec2 r = ref(UV, R) * 2. * size;
    // the texture reference frame is between [0,1] * size
    vec2 t = UV * size;

    // the offset we apply to the ghost line
    vec2 offset = vec2(.5-m.x,m.y);

    // initialize the output value with the previous frame
    // we offset it and substract 0.03 to make it fade into the distance
    float f = max(texture(u_buffer0,(t-offset) / size).r - 0.01,.0); 

    // the reference frame is deformed with a couple of oscillators
    r += vec2(.0, (sin( r.x + T) + sin( .5 *r.x - T )) + 4.);    

    // the final value
    f = min(
            1., // is no greater than 1
            (f + // we add the previous value

            (stroke(r.y, .3, EPS, true) * // and the new line
            stroke(r.x, size, EPS, true))) * // that we clip the borders

            fill(r.y, EPS, false) // and below the line
        );

    pixel = vec4(vec3(f),1.);
}
#else
out vec4 pixel;
void main() { 
    pixel = vec4(vec3(texture(u_buffer0,UV).r), 1.);
}
#endif
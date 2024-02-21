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

    // this is the same that line feedback
    // but we repeat the pattern in time, using time
    // as a vertical coordinate

    // the size of the reference frame
    float size = 20.;

    // the reference frame is between [-1,1] * size
    vec2 r = ref(UV, R) * size;

    float tt = mod(floor(T*60.), 30.);

    // initialize the output value with the previous frame
    float f = texture(u_buffer0, UV).r; 

    // the reference frame is deformed with noise
    r +=  vec2(.0, tt - 15. + noise( vec2(tt + r.x*3., tt )) );

    // the final value
    f = min(
            1., // is no greater than 1
            (f + // we add the previous value

            (stroke(r.y, .05, EPS, true) * // and the new line
            stroke(r.x, 30., EPS, true))) // that we clip the borders
        );

    pixel = vec4(vec3(f),1.);
}
#else
out vec4 pixel;
void main() { 
    pixel = vec4(vec3(texture(u_buffer0,UV).r), 1.);
}
#endif
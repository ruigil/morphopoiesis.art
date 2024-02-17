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

    vec2 r = ref(UV, R) * 2.;
    float n = noise(r.yx - T);

    float f = xor(
            // for a never ending feedback the ratio must be smaller
            // than the window, in this case the window = (r * .5) + .5
            // but with a bigger window the negative offsets will wrap and in this case
            // give a look of partial feedback
            texture(u_buffer0,(r * .7) + .5).r, 
            fill(circle(r - vec2(n - .5) , .5), EPS, true)
        );

    pixel = vec4(vec3(f),1.);
}
#else
out vec4 pixel;
void main() { 
    pixel = vec4(vec3(texture(u_buffer0,UV).r), 1.);
}
#endif
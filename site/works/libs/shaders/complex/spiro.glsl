#version 300 es

precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T

uniform sampler2D u_buffer0;

#include '../constants.glsl'
#include '../utils/complex-math.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/noise.glsl'

#if defined(BUFFER_0)
out vec4 pixel;
void main() {
    
    vec2 r = ref(UV, R) * 7.;

    vec2 fl = floor(r);
    r = fract(r)-.5;
    // the fourier serie of oscilators
    // we model a fourier series as an array of vec3
    // x = amplitude, y = frequency, z = phase;
    // here we select random coefficients, but by selecting
    // proper coefficients with a discrete fourier transform
    // we can draw anything
    vec3 fos[4] = vec3[4](
        vec3(.1*hash(fl.xx), 3.,hash(fl.yy)*3.),
        vec3(.05*hash(fl.xy), -11.,hash(fl.yx)*3.),
        vec3(.15*hash(fl.yx), -7.,hash(fl.xy)*3.),
        vec3(.2*hash(fl.yy), 5.,hash(fl.xx)*3.)
    );
    
    // frame feedback
    float f = texture(u_buffer0, UV ).r; 

    float t = T;

    // calculate the parametric curve
    for (int i=0; i<fos.length(); i++) 
        r +=  toCarte( vec2( fos[i].x, fos[i].z + t * fos[i].y ) );

    // draw a point
    f += fill(circle(r,.005), .01, true);

    pixel = vec4(vec3(f),1.);
}
#else
// we just copy the texture to the screen...
out vec4 pixel;
void main() {
    pixel = vec4( texture(u_buffer0, UV ).rgb , 1.);
}
#endif
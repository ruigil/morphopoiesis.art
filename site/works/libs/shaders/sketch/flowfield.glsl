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

    // a flow field is a vector field where each point is 
    // interpreted as a direction for movement or flow. 
    // This means that particles or objects the flowfield 
    // will move acordingly to the local values of vector field

    // here a flowfield is contructed interpreting the value noise
    // between [0,1] to be an angle for the direction

    vec2 r = ref(UV, R) * 2.;

    // we create a vector field
    vec2 ff = vec2(.0,.005)*rot(radians(noise(vec3(r+T*.2, T*.1)) * 360.) ); 

    // we use the vector field to sample the texture feedback
    // and do a texture advection to generate flow
    float t = texture(u_buffer0,fract(UV+ff)).r-.02;
    
    // we use another noise field to add some white points as sources
    float f = max(t,step(noise(vec3(r*100.,T*20.)),.1));

    pixel = vec4(vec3(f),1.);   
}
#else
out vec4 pixel;
void main() { 
    pixel = vec4(vec3(texture(u_buffer0,UV).r), 1.);
}
#endif
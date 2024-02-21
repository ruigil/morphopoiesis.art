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

    // this is a demonstration of drawing a sierpinsky triangle, with
    // the "chaos game" algorithm, a typical way of rendering IFS in the CPU,
    // This is for ilustration purpose only, they are better algorithms 
    // that take advantage of the parallelism of the GPU to arrive at the same result.
    
    // the algorithm consist in choosing a random vertice of the triangle
    // and then walk half the distance between the last point and the 
    // new vertice to get the new point, and iterate.

    // this shader uses the texture feedback to accumulate a drawing
    // but also, uses a texture position as a memory to keep the value
    // of the last point between frames

    // reference frame
    vec2 r = ref(UV, R) * 2.;
    // number of vertices
    float v = 3.;
    // the address in the texture that is used for memory.
    vec2 mem = vec2(.5/R);
    // the result
    vec4 result = vec4(0.);

    // so if the texture address is the one that we reserved for memory, 
    // we calculate a new position and store it in the result
    if (UV == mem)   {

        // get the last point from memory
        vec2 lp = texture(u_buffer0,mem).rg;
        
        // get a random number btween 0 and the number of vertices-1
        float rd = floor(hash(vec2(T+2.)) * v); 
        
        // use it to get a vector between tha last point and the new vertice
        vec2 nv = vec2(cos(rd*(6.283/v)),sin(rd*(6.283/v))) - lp.xy;
        
        // walk half the distance to get the new point
        vec2 np = lp.xy + (normalize(nv) * (length(nv)*.5));
        
        // store the new point in the memory
        result = vec4(np ,0.,.0);

    // .. or else we draw a new point
    } else {
        // get the point from the memory
        vec2 p = texture(u_buffer0,mem).rg;
        
        // draw a circle at the point position
        // and accumulate with the last texture frame
        float f  = max(
                    fill(circle(r - p, .005),  EPS, true),
                    texture(u_buffer0, UV).r
                );

        result = vec4(vec3(f),1.);
    }

    pixel = result;
}
#else
out vec4 pixel;
void main() {
    pixel = vec4( texture(u_buffer0, UV).rgb, 1);
}
#endif
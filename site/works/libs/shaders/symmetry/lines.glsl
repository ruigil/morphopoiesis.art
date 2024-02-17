#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T


#include '../constants.glsl'
#include '../utils/2d-utils.glsl'

// sdf for a line
float lineseg(vec2 r, vec2 a, vec2 b) {
    vec2 ra = r-a, ba = b-a;
    float h = clamp( dot(ra,ba)/dot(ba,ba), 0.0, 1.0 );
    return length( ra - ba*h );
}

out vec4 pixel;
void main() {
    vec2 r = ref(UV, R) * 12.;

    float f = 0.;

    for (float i=0.; i<=10. ; i++) {
        f += stroke(lineseg(r,vec2(5,-5.+i),vec2(5.-i,5.)),.05, EPS, true);
        f += stroke(lineseg(r,vec2(-5,i-5.),vec2(-5.+i,5.)),.05, EPS, true);
        f += stroke(lineseg(r,vec2(5.-i,-5.),vec2(-5.,-5.+i)),.05,EPS, true);
        f += stroke(lineseg(r,vec2(-5.+i,-5.),vec2(5.,-5.+i)),.05, EPS, true);
    }
    
    pixel = vec4(vec3(f),1.);
}

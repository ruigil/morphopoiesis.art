#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T


#include '../constants.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/noise.glsl'

out vec4 pixel;
void main() {

    vec2 r = ref(UV, R) * 1.5;

    // mouse in normalized coordinates
    vec2 m = M/R;
    // controls the number of iterations
    int n = int(floor(m.x*5.));

    // we create an original symmetry on the x axis
    // and then we apply another on -150 degrees to copy
    // the upper domain down. This gives a radial symmetry of 3
    // with the domain between 60 and 90 degrees.
    vec2 lr = fold( fold(r,radians(90.)), radians(-150.)) - vec2(.0,.3);
    // then we iterate the koch curve, by combining the x simmetry
    // with a 60 degree symmetry fold
    for (int i=0; i<n; i++) {
        // the fold operation is a symmetry along an arbitrary axis
        // like folding a piece of paper
        lr = fold(3. * fold(lr, radians(90.)) - vec2(.5,.0) , radians(60.)) - vec2(.5,.0);
    }

    // draw a single shape in the resulting reference frame
    // in this case a simple rectangle
    float v = stroke( rect(lr, vec2(1.,.3)) , .1, EPS, true);

    pixel = vec4(vec3(v),1.);
}
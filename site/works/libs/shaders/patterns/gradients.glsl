#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T

#include '../constants.glsl'
#include '../utils/2d-utils.glsl'


// a simple way to create a color gradient, with an indexable color from 0 to 1
// https://www.shadertoy.com/view/ll2GD3
vec3 gradient(vec3 brightness, vec3 saturation, vec3 frequency, vec3 offset, float t ) {
    return clamp(brightness + saturation * cos( 6.28318* (frequency * t + offset ) ), 0., 1.);
}

vec3 rainbow(float t) {
    return gradient(vec3(.5), vec3(.5),  vec3(1.,.8,.9), vec3(0.0,0.6,0.3),  t);
}

vec3 sunset(float t) {
    return gradient(vec3(.5), vec3(.5), vec3(1.0), vec3(.1,.2,.5) , t);
}

vec3 earth(float t) {
    return gradient(vec3(.5),vec3(.5),vec3(0.9),vec3(0.47,0.57,0.67), t );
     
}

vec3 sky(float t) {
    return gradient(vec3(.5),vec3(.5),vec3(0.5),vec3(0.5,0.6,0.7), t );
}

vec3 metal(float t) {
    return gradient(vec3(0.5),vec3(0.5),vec3(.8,.9,.9),vec3(0.7,0.57,0.57), t);
}

vec3 nature(float t) {
    return gradient( vec3(0.5), vec3(0.5), vec3(.7,.7,0.1), vec3(0.5,0.62,0.40), t );;
}

vec3 lava(float t) {
    return gradient( vec3(0.5), vec3(0.5), vec3(.5,.5,0.2), vec3(0.65,0.47,0.50), t );
}
vec3 neon(float t) {
    return gradient( vec3(0.5), vec3(0.5), vec3(1.,0.,1.), vec3(0.3,0.5,0.), t );
}

vec3 royal(float t) {
    return gradient( vec3(0.5), vec3(0.5), vec3(.7,.5,.7), vec3(0.35,0.35,0.9), t );
}

vec3 strawberry(float t) {
    return gradient( vec3(0.5), vec3(0.5,7.7,.5), vec3(2.,2.,.0), vec3(0.0,0.5,0.5), t );
}

vec3 stripes(float t) {
    return gradient( vec3(0.5), vec3(5.), vec3(1.,1.,1.0), vec3(0.), t );
}

vec3 vangogh(float t) {
    return gradient( vec3(0.5), vec3(.5), vec3(.5,.5,.5), vec3(0.0,0.1,0.3 ), t );
}

vec3 getGrad(float f) {
    return 
        f == 11. ? vangogh(UV.x) :
        f == 10. ? lava(UV.x) :
        f == 9. ? royal(UV.x) : 
        f == 8. ? neon(UV.x) : 
        f == 7. ? rainbow(UV.x) : 
        f == 6. ? sunset(UV.x) :
        f == 5. ? earth(UV.x) :
        f == 4. ? sky(UV.x) :
        f == 3. ? metal(UV.x) :
        f == 2. ? nature(UV.x) : 
        f == 1. ? strawberry(UV.x) : 
        stripes(UV.x);
}

out vec4 pixel;
void main() {

    // if you pass your mouse over the gradient
    // the three first rows show the components red, green, blue of the graient
    vec2 m = M/R;

    float grads = 16.;

    float grad = floor(UV.y*grads);
    float g = fract(UV.y*grads);

    vec3 mg = getGrad(floor(m.y*grads));

    vec3 c = 
        grad == 15. ? vec3(mg.r,0.,0.) :
        grad == 14. ? vec3(0,mg.g,0) :
        grad == 13. ? vec3(0,0,mg.b) :
        grad == 12. ? vec3(0) :
        getGrad(grad);

 
    c =  mix( vec3(.05), c, fill( 1. - g - .1 , EPS, false));

    pixel = vec4(c,1.);
}
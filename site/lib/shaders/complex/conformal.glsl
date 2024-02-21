#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T


#include '../constants.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/complex-math.glsl'


float teeth(vec2 r, float n, float a) {
    float s = n/6.283; // scale the sdf to composate for the log distortion
    return stroke(s*circle(r,.4), .4, .01, true) * fill(s*rays(r * rot(a), 10.), .01, false);
}

out vec4 pixel;
void main() {

    // this shader implements a conformal mapping
    // by using a complex function to map the plane
    // the process is to draw a gear in a grid
    // and then distort the grid with the complex transform

    // the refrence frame
    vec2 r = ref(UV,R) * 2.;

    // we transform the reference frame in polar coordinates
    vec2 z = toPolar(r);

    // a few variables for the animation
    float ct = cos(T*.5);
    float st = sin(T*.3);
    float scale = 10. / 6.283;

    // the complex transform is a dipole
    // one point is zero and the other inifinite
    r = zdiv( zadd( z, 2. * vec2(ct,st) ), zsub( z, 2.*vec2(st, ct)));

    // we apply a log scale
    r = vec2(log(r.x) - T*.5, r.y );
    r *= scale;

    // we repeat the space and use an alternating sign
    // for the gear rotation
    float s = sign(mod(floor(r.y)+floor(r.x),2.)-.5);
    r = fract(r)-.5;

    float step = 6.283/10.;
    float t = T;
    
    // and draw the pattern,
    // we draw the teeth 5 times. 1 for center
    // 2 horizontal and 2 vertical neighbours
    // this will hide the fact that this is a grid
    // and gives the illusion of interlocking
    float f = 
        teeth(r, 10., s*t) +
        teeth(vec2(r.x-1.,r.y), 10.,s*-t+step) +
        teeth(vec2(r.x+1.,r.y), 10.,s*-t+step) +
        teeth(vec2(r.x,r.y-1.), 10.,s*-t+step) +
        teeth(vec2(r.x,r.y+1.), 10.,s*-t+step) +
        stroke(circle(r,.31), .15, .01, true);      

    pixel = vec4(vec3(f),1.);
}

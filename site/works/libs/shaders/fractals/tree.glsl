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

    vec2 r = ref(UV, R) * 3. ;
    // mouse in normalized coordinates
    vec2 m = M/R;
    // controls the number of iterations
    int n = int(floor(m.x*8.));

    float f = 0.; // collect the result

    // for recursivity, just iterate 
    // a serie of transformations of the refrence frame
    r += vec2(.0,.5);
    vec2 lr = r;
    for (int i = 0; i < n; i++) {
        
        lr -= vec2(.0,.35);
        // noise to add variation to the angle of branches
        float n1 = (gnoise(vec2(float(i),T*.3)));
        float n2 = (gnoise(vec2(float(i*3+1),4.4)));
        
        lr = lr.x > 0. ? 
        // rotate, translate and scale
            ((lr * rot(radians(35.+n1*10.)) ) + vec2(0., -.2)) * vec2(1.2+(n1*.5),1.5+(n2*.5)) : 
            ((lr * rot(radians(-35.-n2*20.)) ) + vec2(0, -.2)) * vec2(1.3+(n2*.5),1.3+(n1*.5)); 

        // add the branch
        f += fill(rect(lr + vec2(gnoise(lr*5.)* (float(i+1)*0.03) ,0.), vec2(.2-(r.y*.1),.7)), EPS, true);
        // and repeat...
    }

    // add finally add the trunk
    f += fill(rect(r + vec2(gnoise(r*5.)*.05 ,0.), vec2(.2-(r.y*.1),.7)), EPS, true);

    pixel = vec4(vec3(f),1.);
}


#include '../utils/2d-utils.glsl'

#define R iResolution.xy 
#define T iTime
#define EPS 2./R.y

void mainImage(out vec4 O, in vec2 CO) {

    vec2 r = (CO - R*.5) / R.y;

    vec3 f = vec3(0.);
    for (int i=0; i<3; i++) {
        vec2 r1 = r * rot(radians( sin((T -float(i)*.02) *2.)* float(180) ));
        f[i] = fill(rect(r1, vec2(.25)), EPS, true );
    }

    O = vec4(f,1.);
}
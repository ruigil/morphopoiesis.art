

#include '../utils/2d-utils.glsl'

#define R iResolution.xy 
#define UV

void mainImage( out vec4 O, vec2 CO) {
   vec2 r = (CO - R*.5) / R.y;

   mat3 affine = 
    mat3(
    vec3(cos(radians(30.)),-sin(radians(30.)),-0.1),
    vec3(sin(radians(30.)),cos(radians(30.)),-0.1),
    vec3(0.,0.,1.)
    );
    vec3 trx = (vec3(r,1.) * affine);
    r = (trx/trx.z).xy;
   float f = fill(rect(r, vec2(.2)), 2./R.x, true);
   O = vec4(f,f,f,1.);
}


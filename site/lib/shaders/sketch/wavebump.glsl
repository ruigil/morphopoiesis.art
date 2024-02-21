#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T


#include '../constants.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/noise.glsl'


// the bump function is just some wave interference mirrored
float bump(vec2 r) {
    r = fold( fold(vec2(r.x,abs(r.y)), radians(120.)) , radians(-120.)); 
    return fill(sin(length(50.*(r-vec2(0.,.5+.5+sin(T*.1)))) -T * 3.) + sin(length(r*25.)-T*2.), 1., true);
}

// the bumpmap function accept a reference frame,
// a color, a light position and a normal of the point
// this assumes a 0,0 centered reference with the eye above the screen
// and a white light
vec3 bumpmap(vec2 r, vec3 color, vec3 lp, vec3 normal) {
    // the diffuse color is the color when ther is light
    vec3 diffuse = color;
    // the ambient color is when there is no light, usually darker
    vec3 ambient = diffuse * .05;
    // the position of the eye is just "above" the screen
    // we count away from the screen the z direction
    vec3 eye = vec3(0.,0., 1.);
    // the hit point is the actual coordinate on the plane at z = 0
    vec3 hit = vec3(r,.0);
    
    // light intensity
    vec3 li = vec3(.5); 
    // light direction
    vec3 ld = normalize(lp - hit);
    // view direction
    vec3 vd = normalize(eye - hit);

    // the light reflected for specular component
    vec3 re = normalize( reflect(-ld, normal ) );

    // color is ambient + light intensity * ( diffuse * light diffuse + specular * light specular )
    return ambient + li * ( diffuse * max(dot(ld,normal),0. ) +  1. * pow( max( dot(re,vd) ,0.) ,32.) );
}

// this shader implements the bump map technique
// this is a technique used to give 3d detail to surfaces without changing the geometry
// it works by messing with the normal vector to a surface, before using it in the light equation
out vec4 pixel;
void main() {

    // reference frame
    vec2 r = ref(UV, R);
 
    // to calculate a normal, we use the finite diffrence method
    // where we sample the function in xy directions to get an orientation
    // for z we always use 1.
  	const vec2 e = vec2(.01, 0);
    vec3 normal = normalize(vec3(bump( r + e.xy) - bump( r - e.xy), bump( r + e.yx) - bump( r - e.yx), 1. ));
  
    float n = 3.14*noise(vec2(T*.1));
    vec3 lp = vec3(cos(n),sin(2.*n), .5);

    vec3 color = bumpmap(r, vec3(.2), lp, normal);
    // gamma correction
    pixel = vec4( pow(clamp(color,.0,1.),vec3(.456) ) ,1.);   
}
#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T


#include '../constants.glsl'
#include '../utils/noise.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/complex-math.glsl'
#include '../utils/gradients.glsl'

// a bumpmap technique
vec3 bumpmap(vec2 r, vec3 color, vec3 lp, vec3 normal) {
    // the diffuse color is the color when ther is light
    vec3 diffuse = color;
    // the ambient color is when there is no light, usually darker
    vec3 ambient = diffuse * .1;
    // the position of the eye is just "above" the screen
    // we count away from the screen the z direction
    vec3 eye = vec3(0.,0., 1.);
    // the hit point is the actual coordinate on the plane at z = 0
    vec3 hit = vec3(r,0.);
    
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

out vec4 pixel;

// the heightmap is some fractal brownian moton noise, distorted 
// with itself which is called 'domain warp'
float heightmap(vec3 r) {
    float q = fbm( vec3(r.x * .5, r.y * .5, r.z ) );
    
    float f = fbm( r + q );
    
    float sun = fill(circle(r.xy, .01),EPS*100., false );
    
    return f * sun; 
}

void main() {

    // polar coordinate reference frame
    vec2 r = toPolar(ref(UV, R) *.4 ) ;
    
    // noise sample reference frame
    vec3 nr = vec3( toCarte(r), r.x - T*.05);
    // noise epsilon difference
    vec3 ne = vec3(toPolar(vec2(EPS, .0)),0.0);
    // moise scale
    float ns = max(15.-length(nr.xy)*70.,1.);
    // get the normal with the finite difference method
    vec3 normal = normalize(ns*vec3(heightmap( nr + ne.xyz) - heightmap( nr - ne.xyz), heightmap( nr + ne.yxz) - heightmap( nr - ne.yxz), 1./ns ));
      
    // light position
    vec3 lp = vec3(vec2(0.),1.);

    // the value of the heighmap at this pixel
    float height =  heightmap(nr) ; 
    // a color gradient to map the heighfield to a color
    vec3 gradient = vangogh(min( height + (length(nr.xy) * 3.), 1.));
    // the bumpmap technique to light the heighmap
    vec3 color = bumpmap(nr.xy, gradient, lp, normal);
 
    // gamma correction
    pixel = vec4( pow(color,vec3(1.4)) ,1.);
}
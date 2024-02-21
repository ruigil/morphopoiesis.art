#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_buffer0;

#include '../constants.glsl'
#include '../utils/noise.glsl'
#include '../utils/2d-utils.glsl'

#if defined(BUFFER_0)
out vec4 pixel;
void main() {

    // the water simulation needs two buffers
    // with the current and the previous state
    // we keep the current state in the x channel
    // and the previous state in the y channel
    // mouse in normalized coordinates
    vec2 m = u_mouse/u_resolution;
    // an epsilon for finite differences
    vec3 e = vec3(1./u_resolution, 0.);
    // texture coordinates
    vec2 t = UV;

    // the new state 
    float v = 0.;

    // add mouse perturbation
    v = smoothstep(EPS*50.,.0,length( ref(UV,u_resolution) - ref(m, u_resolution)) );

    // add random rain
    if (hash(33.*t + u_time) < .001) {
        v += smoothstep(.1,.0,length( hash2(t*33.) ))*5.;
    }

    // current state
    v += texture(u_buffer0, t + e.xz ).x; // north
    v += texture(u_buffer0, t - e.xz ).x; // south
    v += texture(u_buffer0, t + e.zy ).x; // east
    v += texture(u_buffer0, t - e.zy ).x; // west
    v /= 2.;
    
    // previous state
    v -= texture(u_buffer0,t).y;
    v *= .99; // damping

    // we switch the current and the previous state 
    // for the next iteration
    pixel = vec4(v, texture(u_buffer0, t).x, 0. , 0.);   
 }
 #else
 out vec4 pixel;
 void main() {
    // this effect is an old one, but very rewarding to code
    // for a detailed explanation use this link
    // https://web.archive.org/web/20160116150939/http://freespace.virgin.net/hugo.elias/graphics/x_water.htm

    // the buffer0 shader is the actual water simulation
    // this one is just to render the simulation with some light
    // and texture

    // Try playing with your mouse !

    // reference frame   
    vec2 r = ref(UV,u_resolution);
    // epsilon for differences
    vec3 e = vec3(1./u_resolution, 0.);

    // get the current values for the heighmap of the water simulation
    // get the also the differences to normal and water distortion
    float t = texture(u_buffer0,UV).x;
    float tx = texture(u_buffer0,UV + e.xz).x; // north
    float ty = texture(u_buffer0,UV + e.zy).x; // east
    vec2 offset = vec2(t-tx,t-ty);

    // get a normal with the differences
    vec3 normal = normalize(vec3(offset, 1. ));
  
    // use the normal to calculate a phong  light model
    // the hit point is the actual coordinate on the plane at z = 0
    vec3 pos = vec3(r,.0);
    // noisy light position;
    float n = 3.14*noise(vec2(u_time*.1)); 
    // light direction light pos - position
    vec3 ld = normalize(vec3(cos(n),sin(n*2.),.5) - pos); 
    // view direction eye - pos
    vec3 vd = normalize(vec3(0.,0.,1.) - pos); 

    // the light reflected for specular component
    vec3 re = normalize( reflect(-ld, normal ) );
 
    // we apply the offset of the heighmap to  
    // the texture to simulate a water distortion 
    float nn = fbm( r + offset + sin(r.x*4.) + sin(r.y*4.));

    // color is ambient + light intensity * ( diffuse * light diffuse + specular * light specular )
    vec3 color = nn*.05 + vec3(.5) * ( nn * max(dot(ld,normal),0. ) + pow( max( dot(re,vd) ,0.) ,32.) );

    // gamma correction
    pixel = vec4(pow(color,vec3(1./2.2)), 1.); 
} 
 #endif
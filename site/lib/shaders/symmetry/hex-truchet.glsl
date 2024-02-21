#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T


#include '../constants.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/noise.glsl'

// remaps the plane to an hexagon centered at the origin with radius 1.
// return a vec4 that has the remapped point in the xy component
// and the hexagonal coordinate of the point as the zw component
// https://www.redblobgames.com/grids/hexagons/
vec4 lat6(vec2 r) {

    // convert pixel to hexagonal : 2/3, 0, -1/3, sqrt(3)/3
    vec2 qr = r*mat2(0.66666, .0, -.33333, 0.57735);

    // round hex coordinates
    vec3 hc = vec3(floor(qr.x+.5), floor(-qr.x-qr.y+.5), floor(qr.y+.5));
    // calculate the differences to the center
    vec3 hd = vec3(abs(hc.x -qr.x), abs(hc.y - (-qr.x-qr.y)), abs(hc.z -qr.y)  );
    
    // axis choice based on difference to center
    if ((hd.x > hd.y) && (hd.x > hd.z)) hc.x = -hc.y-hc.z;
    else if (hd.y > hd.z) hc.y = -hc.x-hc.z;
    else hc.z = -hc.x-hc.y;

    // inverse hexagonal to pixel : 3/2, 0, sqrt(3)/2, srqt(3)
    vec2 center = hc.xz*mat2(1.5, .0, 0.866, 1.732);

    return vec4(r-center,hc.xz);
}

out vec4 pixel;
void main() {

    // call the function that maps reference space to a hexagon tile
    // the xy component contains the reference of the point remapped
    // the zw component contains the hexagonal coordinates of the point.
    vec4 r = lat6(ref(UV, R) * 20.);

    // use the hexagonal coordinates as a seed for noise to choose the pattern
    float n = noise(r.zw+T*.01);

    // rotate the reference by a random multiple of 60 degrees
    // So that the patterns are randomly rotated to add to the diversity
    vec2 hr = r.xy * rot( radians(60. * floor(noise(r.zw+T*.01)*6.) ) );

    // draw one of 4 rotated patterns with equal probability
    float f =
          n <= .2 ? 
            stroke(circle(hr-vec2(.5,-.866),.5) ,.3,.01,true) +
            stroke(circle(hr-vec2(-1.,0.),.5) ,.3,.01,true) +
            stroke(circle(hr-vec2(.5,.866),.5) ,.3,.01,true)
        : n <= .4 ? 
            fill(rect(hr,vec2(.3,1.732)) ,.01,true) *
            fill(rect(hr,vec2(.4,0.8)) ,.01,false) +
            fill(circle(abs(hr)-vec2(0.,0.4),.15) ,.01,true) +
            stroke(circle(abs(hr)-vec2(1.,0.),.5) ,.3,.01,true)
        : n <= .6 ?
            fill(rect(hr,vec2(.3,1.732)) ,.01,true) +
            stroke(circle(abs(hr)-vec2(1.,.0),.5) ,.3,.01,true)
        :
            fill(rect(hr*rot(radians(-60.)),vec2(.3,1.732)),.01,true) *
            fill(rect(hr*rot(radians(60.)),vec2(.4,1.732)),.01,false) +
            fill(rect(hr*rot(radians(60.)),vec2(.3,1.732)),.01,true) +
            fill(rect(hr,vec2(.3,1.732)) ,.01,true) *
            fill(rect(hr,vec2(.4,0.8)) ,.01,false) +
            fill(circle(abs(hr)-vec2(0.,0.4),.15) ,.01, true);
    
    // uncomment the next line to see the remapped plane
    //f = length(r.xy);
    pixel = vec4(vec3(f),1.);
}
#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

#include '../constants.glsl'
#include '../utils/noise.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/gradients.glsl'

// polynomial smooth min (k = 0.1);
float smin( float a, float b, float k ) {
    float h = max( k-abs(a-b), 0.0 )/k;
    return min( a, b ) - h*h*h*k*(1.0/6.0);
}


float bug(vec2 r) {
    r.y -= .4 ;  


    vec2 rh = vec2( r.x ,r.y);
    float head = 
        ((fill(circle(rh ,.45), EPS, true) * float(r.y > 0.)) *
        max((1.-abs(circle(rh, .4))*20.),0.3)) +
        fill(circle(r,.2),EPS, true) * (1.-circle(r,0.)*5.);

    float fl = .05*sin(T*10.)*sin((abs(r.x)*12.));
    vec2 rb = vec2(r.x* (1.-r.y*2.) ,r.y + fl ) ;
    float sdf = smin(
        rect(vec2(rb.x, fract(rb.y*10.)-.5), vec2(.9,.9-abs(rb.x*2.))), 
        rect(rb,vec2(.3,2.)),.2);
    float spine =
            (fill(sdf, EPS, true) * float(rb.y < 0.) * float(rb.y > -1.) * (1.-abs(fract(rb.y*10.)-.5)));
            //(fill(circle(rb+vec2(0.,1.),.22), EPS, true) * (1.-circle(rb+vec2(0.,.9),.0)*5.));


    vec2 ra = vec2( (abs(r.x)-.4) + .05*sin(T*20.)*sin((r.y*14.) ), r.y);
    float width = .1+r.y*.2;
    float antenas = fill(rect(ra , vec2(width, 2.)), EPS, true) * float(r.y < 0.) * ( 1.-abs(ra.x* (20.+(.1+r.y*.2)) ) );

 
    float ft = .05*sin(T*20.)*sin(((r.y)*7.));
    vec2 rt = vec2(r.x+ft,r.y+1.45);
    float tail = fill(rect(rt,vec2(.05* (rt.y*5.5),1. )), EPS, true) * (1.-abs(rt.x)*(20.+rt.y*4.5));

    //body =  spine + tail;
    return max(head, spine) + antenas + tail;    
}


out vec4 pixel;
void main() {
    vec2 r = ref(UV, R) * 12. ;


    vec2 rr = (r + 3.*vec2(cos(-T*6.28*.1),sin(-T*6.28*.1)))  * rot(T*6.28*.1)  ;
    float b = bug(r);

    //body = tail;
    pixel = vec4( sunset(b) , 1.);
}
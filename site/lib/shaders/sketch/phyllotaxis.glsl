

#include '../utils/2d-utils.glsl'

#define R iResolution.xy 
#define T iTime
#define EPS 2./R.x

vec2 center(vec2 r) {
    
    float n = floor(dot(r,r));
    float radius = 1. * sqrt(n);
    float angle = n * radians(137.5);
    vec2 c = radius * vec2(cos(angle), sin(angle));
    return c;
}

void mainImage( out vec4 O, vec2 U) {

    vec2 r =  ( (U+U-R) / R.y ) ;

    // a = n * 137.5;
    // r = c * sqrt(n);
    // x = r * cos(a)
    // y = r * sin(a);

    float n = 3.;

    r *= n;
    //float radius = floor(length(r))+.5;//floor( length(r)  ) + .5;

    //radius = radius > 4. ? 4. : radius;
    //float ra = (6.2830 / radians(137.5)) * radius;
    //float ra = (3.1415/radius*.5) * radians(137.5);
    //float ra = mod((6.283/radians(137.5))*radius, 6.283);
    //float ra = (6.283/2.6);
    //vec2 p = vec2( radius , (floor( (atan(r.y,r.x) ) / ra )  ) * ra  );

    //vec2 pc = (p.x) * vec2(cos(p.y),sin(p.y));

    float f = fill(circle( r - center(r)  , .5 ), EPS, true );
    
/*
    f = 0.;
    for (int i= 0; i< 5; i ++) {
        float a = float(i) * radians(137.5);
        float ra = 1. * sqrt( float(i) );
        vec2 c = ra*vec2(cos(a), sin(a));       
        f += fill(circle(r-c,.5), EPS, true);
    }
*/

    float ra = length(r);
    float an = atan(r.y, r.x);
    float v = sin(3.*ra - .5*an);

    f += 1.-step(0.,abs(v)-.05); 

// r = a + b*theta

/*
(sqrt(1)-.5)^2 - (sqrt(1)+.5)^2  137.5 d

(sqrt(2)-.5)^2 - (sqrt(2)+.5)^2  275 d



*/
    f += stroke(circle(r,1.91), .01, EPS, true);

    O = vec4(f,f,f,1.);
}
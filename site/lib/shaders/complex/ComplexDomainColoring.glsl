#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T


/*
When you graph a real function y=f(x) you need a plane (2D). When you 
graph a complex function w=f(z), to see the relationship between 
the input complex plane (2D) and the output complex plane (2D), you need 4D. 
Because humans are not able to see in 4D one technique to visualize 
these functions is to use color hue, and saturation as the two extra 
dimensions. This technique is called domain coloring. 
https://en.wikipedia.org/wiki/Domain_coloring

In case you know nothing about complex numbers, or need a refresher
this youtube serie is very good !
https://www.youtube.com/watch?v=T647CGsuOVU
*/

#include '../constants.glsl'
#include '../utils/complex-math.glsl'
#include '../utils/2d-utils.glsl'

#define speed (u_time*.05)

//sinz, cosz and tanz came from -> https://www.shadertoy.com/view/Mt2GDV
vec2 zsin(vec2 z) {
   z = toCarte(z);
   float e1 = exp(z.y);
   float e2 = exp(-z.y);
   float sinh = (e1-e2)*.5;
   float cosh = (e1+e2)*.5;
   return toPolar(vec2(sin(z.x)*cosh,cos(z.x)*sinh));
}

vec2 zcos(vec2 z) {
   z = toCarte(z);
   float e1 = exp(z.y);
   float e2 = exp(-z.y);
   float sinh = (e1-e2)*.5;
   float cosh = (e1+e2)*.5;
   return toPolar(vec2(cos(z.x)*cosh,-sin(z.x)*sinh));
}

vec2 ztan(vec2 z) {
    z = toCarte(z);
    float e1 = exp(z.y);
    float e2 = exp(-z.y);
    float cosx = cos(z.x);
    float sinh = (e1 - e2)*0.5;
    float cosh = (e1 + e2)*0.5;
    return toPolar(vec2(sin(z.x)*cosx, sinh*cosh)/(cosx*cosx + sinh*sinh));
}

vec2 zeta(vec2 z) {
   vec2 sum = vec2(.0);
   for (int i=1; i<20; i++) 
       sum += toCarte(zpow(float(i),-z));
   return toPolar(sum);
}

vec2 lambert(vec2 z) {
   vec2 sum = vec2(.0);
   for (int i=1; i<15; i++)
      sum += toCarte(zdiv(zpow(z,float(i)),zsub(vec2(1.,.0),zpow(z,float(i)))));
   return toPolar(sum);
}

vec2 mandelbrot(vec2 z) {
   vec2 sum = vec2(.0);
   vec2 zc = toCarte(z);
   for (int i=1; i<11; i++) 
       sum += toCarte(zpow(toPolar(sum),2.)) + zc;
   return toPolar(sum);
}

vec2 julia(vec2 z) {
    vec2 sum = toCarte(zpow(z,2.));
    // the julia set is connected if C is in the mandelbrot set and disconnected otherwise
    // to make it interesting, C is animated on the boundary of the main bulb
    // the formula for the boundary is 0.5*eˆ(i*theta) - 0.25*eˆ(i*2*theta) and came from iq
    // http://iquilezles.org/www/articles/mset_1bulb/mset1bulb.htm
    float theta = fract(speed)*2.*6.2830;
    vec2 c = toCarte(vec2(0.5,.5*theta)) - toCarte(vec2(0.25,theta)) - vec2(.25,.0);
    for (int i=0; i<7; i++) sum += toCarte(zpow(toPolar(sum),2.)) + c;
    return toPolar(sum);
}

vec2 map(vec2 uv) {
	float t = floor(mod(speed,10.));
  
	//t = 7.;
	float s = t == 1.? 4.  : t==5.? .6: t==4.? 6. : t==5.? 2.5 : t== 9. ? 13. : 3.;  
   
    uv *= s + s*.2*cos(fract(speed)*6.2830);
    
    vec2 fz, z = toPolar(uv); 
    	
    	 // z + 1 / z - 1
	fz = t == 0. ? zdiv(zadd(z,vec2(1.0)),zsub(z,vec2(1.0,.0)) ) :
         // formula from wikipedia https://en.m.wikipedia.org/wiki/Complex_analysis
		 // fz = (zˆ2 - 1)(z + (2-i))ˆ2 / zˆ2 + (2+2i)
		 t == 1. ? zdiv(zmul(zsub(zpow(z,2.),vec2(1.,0)),zpow(zadd(z,toPolar(vec2(2.,-1.))),2.)),zadd(zpow(z,2.),toPolar(vec2(2.,-2.)))) :
		 // z^(3-i) + 1.
		 t == 2. ? zadd(zpow(z,vec2(3.,acos(-1.))),vec2(1.,.0)) :
		 // tan(z^3) / z^2
		 t == 3. ? zdiv(ztan(zpow(z,3.)),zpow(z,2.)) :
		 // tan ( sin (z) )
		 t == 4. ? ztan(zsin(z)) :
		 // sin ( 1 / z )
		 t == 5. ? zsin(zdiv(vec2(1.,.0),z)) :
		 // the usual coloring methods for the mandelbrot show the outside. 
		 // this technique allows to see the structure of the inside.
		 t == 6. ? mandelbrot(zsub(z,vec2(1.,.0))) : 
         // the julia set 
		 t == 7. ? julia(z) :
		 //https://en.m.wikipedia.org/wiki/Lambert_series
		 t == 8. ? lambert(z) :
		 // this is the Riemman Zeta Function (well, at least part of it... :P)
		 // if you can prove that all the zeros of this function are 
    	 // in the 0.5 + iy line, you will win:
		 // a) a million dollars ! (no, really...)
		 // b) eternal fame and your name will be worshiped in history books
		 // c) you will uncover the deep and misterious connection between PI and the primes
		 // https://en.m.wikipedia.org/wiki/Riemann_hypothesis
    	 // https://www.youtube.com/watch?v=rGo2hsoJSbo
         zeta(zadd(z,vec2(8.,.0)));
   
 
	return toCarte(fz);
}

vec3 color(vec2 uv) {
   float a = atan(uv.y,uv.x);
   float r = length(uv);
    
   vec3 c = .5 * ( cos(a*vec3(2.,2.,1.) + vec3(.0,1.4,.4)) + 1. );
   return c * smoothstep(1.,0.,abs(fract(log(r)-T*.1)-.5)) // modulus lines
            * smoothstep(1.,0.,abs(fract((a*7.)/3.14+(T*.1))-.5)) // phase lines
            * smoothstep(11.,0.,log(r)) // infinity fades to black
            * smoothstep(.5,.4,abs(fract(speed)-.5)); // scene switch
}

out vec4 pixel;
void main() {
   pixel = vec4( color( map( ref(UV, R ) ) ), 1.0 );
}
const PI : f32 = 3.1415926535;
const TAU : f32 = 6.283185307;

struct Sys {
    time: f32,
    frame: u32,
    mouse: vec4<f32>,
    resolution: vec2<f32>
}

@group(0) @binding(0) var<uniform> sys: Sys;

@vertex
fn vertexMain(@location(0) pos: vec2<f32>) -> @builtin(position) vec4f  {
    return vec4f(pos,0.,1.);
}

@fragment
fn fragmentMain(@builtin(position) coord: vec4f) -> @location(0) vec4f {        
    let uv = normCoord(coord.xy,sys.resolution);
    
    let ruv = map(uv);

    let a = atan2(ruv.y,ruv.x);
    let r = length(ruv);
    
    let c = .5 * ( cos(a*vec3(2.,2.,1.) + vec3(.0,1.4,.4)) + 1. );
    let color = c 
            * smoothstep(1.,0.,abs(fract(log(r)- sys.time *.1)-.5)) // modulus lines
            * smoothstep(1.,0.,abs(fract((a*7.)/3.14+(sys.time *.1))-.5)) // phase lines
            * smoothstep(11.,0.,log(r)) // infinity fades to black
            * smoothstep(.5,.4,abs(fract(sys.time * 0.05) - .5)); // scene switch

   return vec4( color, 1.0 );
}

/*
When you graph a real function y=f(x) you need a plane (2D). When you 
graph a complex function w=f(z), to see the relationship between 
the input complex plane (2D) and the output complex plane (2D), you need 4D. 
Because humans are not able to see in 4D one technique to visualize 
these functions is to use color hue, and saturation as the two extra 
dimensions. This technique is called domain coloring. 
https://en.wikipedia.org/wiki/Domain_coloring

*/

//sinz, cosz and tanz came from -> https://www.shadertoy.com/view/Mt2GDV
fn zsin(zp : vec2f) -> vec2f {
   let z = toCarte(zp);
   let e1 = exp(z.y);
   let e2 = exp(-z.y);
   let sinh = (e1-e2)*.5;
   let cosh = (e1+e2)*.5;
   return toPolar(vec2(sin(z.x)*cosh,cos(z.x)*sinh));
}

fn zcos(zp : vec2f) -> vec2f {
   let z = toCarte(zp);
   let e1 = exp(z.y);
   let e2 = exp(-z.y);
   let sinh = (e1-e2)*.5;
   let cosh = (e1+e2)*.5;
   return toPolar(vec2(cos(z.x)*cosh,-sin(z.x)*sinh));
}

fn ztan(zp : vec2f) -> vec2f {
    let z = toCarte(zp);
    let e1 = exp(z.y);
    let e2 = exp(-z.y);
    let cosx = cos(z.x);
    let sinh = (e1 - e2)*0.5;
    let cosh = (e1 + e2)*0.5;
    return toPolar(vec2(sin(z.x)*cosx, sinh*cosh)/(cosx*cosx + sinh*sinh));
}

fn zeta(z : vec2f) -> vec2f {
   var sum = vec2(.0);
   for (var i = 1; i<20; i++) {
       sum += toCarte(zpownz(f32(i),-z));
   } 
   return toPolar(sum);
}

fn lambert(z : vec2f) -> vec2f {
   var sum = vec2(.0);
   for (var i=1; i<15; i++) {
      sum += toCarte(zdiv(zpowzn(z,f32(i)),zsub(vec2(1.,.0),zpowzn(z,f32(i)))));
   }
   return toPolar(sum);
}

fn mandelbrot(z : vec2f) -> vec2f {
   var sum = vec2(.0);
   let zc = toCarte(z);
   for (var i=1; i<11; i++) {
       sum += toCarte(zpowzn(toPolar(sum),2.)) + zc;
   } 
   return toPolar(sum);
}

fn julia(z : vec2f) -> vec2f {
    let speed = sys.time * 0.05;
    var sum = toCarte(zpowzn(z,2.));
    // the julia set is connected if C is in the mandelbrot set and disconnected otherwise
    // to make it interesting, C is animated on the boundary of the main bulb
    // the formula for the boundary is 0.5*eˆ(i*theta) - 0.25*eˆ(i*2*theta) and came from iq
    // http://iquilezles.org/www/articles/mset_1bulb/mset1bulb.htm
    let theta = fract(speed) * 2. * TAU;
    let c = toCarte(vec2(0.5,.5 * theta)) - toCarte(vec2(0.25,theta)) - vec2(.25,.0);
    for (var i=0; i<7; i++) {
        sum += toCarte(zpowzn(toPolar(sum),2.)) + c;
    }
    return toPolar(sum);
}

fn map(uv: vec2f) -> vec2f {
	let t = i32(floor(modf32(sys.time * 0.05,10.)));
     

    var s = 0.;
    // define a scaling factor for each function
    switch (t) {
        case 1: { s = 3.; break; }
        case 3: { s = 2.5; break; }
        case 4: { s = 5.; break; }
        case 5: { s = .6; break; }
        case 9: { s = 10.; break; }
        case default: { s = 2.; break; }
    }

    // apply the scaling factor
    let uvs = uv * (s + s * .2 * cos(fract(sys.time * 0.05) * TAU));
    
    let z = toPolar(uvs); 

    var fz = vec2(0.);
    switch (t) {
    	// z + 1 / z - 1
        case 0: { fz = zdiv(zadd(z,vec2(1.0)),zsub(z,vec2(1.0,.0)) ); break; }
        // formula from wikipedia https://en.m.wikipedia.org/wiki/Complex_analysis
		// fz = (zˆ2 - 1)(z + (2-i))ˆ2 / zˆ2 + (2+2i)
        case 1: { fz = zdiv(zmul(zsub(zpowzn(z,2.),vec2(1.,0)),zpowzn(zadd(z,toPolar(vec2(2.,-1.))),2.)),zadd(zpowzn(z,2.),toPolar(vec2(2.,-2.)))); break; }
		// z^(3-i) + 1.
        case 2: { fz = zadd(zpowzz(z,vec2(3.,acos(-1.))),vec2(1.,.0)); break; }
		// tan(z^3) / z^2
        case 3: { fz = zdiv(ztan(zpowzn(z,3.)),zpowzn(z,2.)); break; }
		// tan ( sin (z) )
        case 4: { fz = ztan(zsin(z)); break; }
		// sin ( 1 / z )
        case 5: { fz = zsin(zdiv(vec2(1.,.0),z)); break; }
		// the usual coloring methods for the mandelbrot show the outside. 
		// this technique allows to see the structure of the inside.
        case 6: { fz = mandelbrot(zsub(z,vec2(1.,.0))); break; }
        // the julia set 
        case 7: { fz = julia(z); break; }
		//https://en.m.wikipedia.org/wiki/Lambert_series
        case 8: { fz = lambert(z); break; }
		// https://en.m.wikipedia.org/wiki/Riemann_hypothesis
        // https://www.youtube.com/watch?v=zlm1aajH6gY
        case default: { fz = zeta(zadd(z,vec2(8.,.0))); break; }
    }
    
	return toCarte(fz);
}

//-------------------------------------- complex math
fn toCarte(z : vec2f) -> vec2f { return z.x * vec2(cos(z.y),sin(z.y)); }
fn toPolar(z : vec2f) -> vec2f { return vec2(length(z),atan2(z.y,z.x)); }

// All the following complex operations are defined for the polar form 
// of a complex number. So, they expect a complex number with the 
// format vec2(radius,theta) -> radius*eˆ(i*theta).
// The polar form makes the operations *,/,pow,log very light and simple
// The price to pay is that +,- become costly :/ 
// So I switch back to cartesian in those cases.
fn zmul(z1: vec2f, z2: vec2f) -> vec2f { return vec2(z1.x*z2.x,z1.y+z2.y); }
fn zdiv(z1: vec2f, z2: vec2f) -> vec2f { return vec2(z1.x/z2.x,z1.y-z2.y); }
fn zlog(z: vec2f) -> vec2f { return toPolar(vec2(log(z.x),z.y)); }
fn zpowzn(z: vec2f, n: f32) -> vec2f { return vec2(exp(log(z.x)*n),z.y*n); }
fn zpownz(n: f32, z: vec2f) -> vec2f { return vec2(exp(log(n)*z.x*cos(z.y)),log(n)*z.x*sin(z.y)); }
fn zpowzz(z1: vec2f, z2: vec2f) -> vec2f { return zpownz(exp(1.),zmul(zlog(z1),z2)); }
fn zadd(z1: vec2f, z2: vec2f) -> vec2f { return toPolar(toCarte(z1) + toCarte(z2)); }
fn zsub(z1: vec2f, z2: vec2f) -> vec2f { return toPolar(toCarte(z1) - toCarte(z2)); }
fn modf32(a:f32, b:f32) -> f32 { return a  - b * floor(a / b); }

// bottom left is [-1,-1] and top right is [1,1]
fn normCoord(coord: vec2<f32>, resolution: vec2<f32>) -> vec2<f32> {
   return (2.0 * coord - resolution) / min(resolution.x, resolution.y) * vec2f(1.,-1.);
}
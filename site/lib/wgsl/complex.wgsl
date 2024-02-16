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

fn zsin(z: vec2f) -> vec2f {
   let zz = toCarte(z);
   let e1 = exp(zz.y);
   let e2 = exp(-zz.y);
   let sinh = (e1-e2)*.5;
   let cosh = (e1+e2)*.5;
   return toPolar(vec2(sin(zz.x)*cosh,cos(zz.x)*sinh));
}

fn zcos(z: vec2f) -> vec2f {
   let zz = toCarte(z);
   let e1 = exp(zz.y);
   let e2 = exp(-zz.y);
   let sinh = (e1-e2)*.5;
   let cosh = (e1+e2)*.5;
   return toPolar(vec2(cos(zz.x)*cosh,-sin(zz.x)*sinh));
}

fn ztan(z: vec2f) -> vec2f {
    let zz = toCarte(z);
    let e1 = exp(zz.y);
    let e2 = exp(-zz.y);
    let cosx = cos(zz.x);
    let sinh = (e1 - e2)*0.5;
    let cosh = (e1 + e2)*0.5;
    return toPolar(vec2f(sin(z.x)*cosx, sinh*cosh)/(cosx*cosx + sinh*sinh));
}

fn zeta(z: vec2f) -> vec2f {
   var sum = vec2f(.0);
   for (var i=1.; i<20.; i+=1.) {
       sum += toCarte(zpownz(i,-z));
   }
   return toPolar(sum);
}

fn lambert(z: vec2f) -> vec2f {
   var sum = vec2f(.0);
   for (var i=1.; i<15.; i+=1.) {
      sum += toCarte(zdiv(zpowzn(z,i),zsub(vec2(1.,.0),zpowzn(z,i))));
   }
   return toPolar(sum);
}

fn mandelbrot(z: vec2f) -> vec2f {
   var sum = vec2f(.000001); // to avoid division by zero
   let zc = toCarte(z);
   for (var i=1.; i<10.; i+=1.) {
        sum += (toCarte(zpowzn(toPolar(sum),2.)) + zc);
   }
   return toPolar(sum);
}

fn julia(z: vec2f) -> vec2f {
    var sum = toCarte(zpowzn(z,2.));
    // the julia set is connected if C is in the mandelbrot set and disconnected otherwise
    // to make it interesting, C is animated on the boundary of the main bulb
    // the formula for the boundary is 0.5*eˆ(i*theta) - 0.25*eˆ(i*2*theta) and came from iq
    // https://iquilezles.org/articles/mset1bulb
    let theta = 0.;//fract(sys.time*.1)*2.*6.2830;
    let c = toCarte(vec2(0.5,.5*theta)) - toCarte(vec2(0.25,theta)) - vec2(.25,.0);
    for (var i=0; i<7; i++) {
        sum += toCarte(zpowzn(toPolar(sum),2.)) + c;
    }
    return toPolar(sum);
}

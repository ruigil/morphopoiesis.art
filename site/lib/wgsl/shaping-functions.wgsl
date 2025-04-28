
const modeIn = 0.;
const modeOut = 1.;
const modeInOut = 2.;

// an easing function that uses exponential 
// input 't' must be in domain [0,1]
// input 'p' is the power, quadratic, cubic, etc..
// input 'mode' accept 3 modes of operation, defined const above
// return value is between [0,1]
fn easePow(t:f32,p:f32, mode: f32) -> f32 {
    let m = f32(mode == select(mode,floor(mod(t*2.,2.)), modeInOut));
    let f = f32(mode == select(1.,2.,modeInOut));

    return abs( m - pow( abs(m - t) * f, p) / f );
}

// functions by Inigo Quilez
// http://www.iquilezles.org/www/articles/functions/functions.htm

fn almostIdentity( x: f32, m: f32, n: f32 ) -> f32 {
    if( x>m ) { return x; }
    let a = 2.0*n - m;
    let b = 2.0*m - 3.0*n;
    let t = x/m;
    return (a*t + b)*t*t + n;
}

fn almostIdentity( x: f32 ) -> f32 {
    return x*x*(2.0-x);
}

fn almostIdentity( x: f32, n: f32 ) -> f32 {
    return sqrt(x*x+n);
}

fn expImpulse( x: f32, k: f32 ) -> f32 {
    let h = k*x;
    return h*exp(1.0-h);
}

fn expSustainedImpulse( x: f32, f: f32, k: f32 ) -> f32 {
    let s = max(x-f,0.0);
    return min( x*x/(f*f), 1.+(2.0/f)*s*exp(-k*s));
}

fn quaImpulse( k: f32, x: f32 ) -> f32 {
    return 2.0*sqrt(k)*x/(1.0+k*x*x);
}

fn polyImpulse( k: f32, n: f32, x: f32 ) -> f32 {
    return (n/(n-1.0))*pow((n-1.0)*k,1.0/n) * x/(1.0+k*pow(x,n));
}

fn cubicPulse( c: f32, w: f32, x: f32 ) -> f32 {
    x = abs(x - c);
    if( x>w ) return 0.0;
    x /= w;
    return 1.0 - x*x*(3.0-2.0*x);
}

fn expStep( x: f32, k: f32, n: f32 ) -> f32 {
    return exp( -k*pow(x,n) );
}

fn gain(x: f32, k: f32) -> f32 {
    let a = 0.5*pow(2.0*((x<0.5)?x:1.0-x), k);
    return (x<0.5)?a:1.0-a;
}

fn parabola( x: f32, k: f32 ) -> f32 {
    return pow( 4.0*x*(1.0-x), k );
}

fn pcurve( x: f32, a: f32, b: f32 ) -> f32 {
    let k = pow(a+b,a+b) / (pow(a,a)*pow(b,b));
    return k * pow( x, a ) * pow( 1.0-x, b );
}

fn sinc( x: f32, k: f32 ) -> f32 {
    let a = 3.1415 * (k*x-1.0);
    return sin(a)/a;
}

const int modeIn = 0;
const int modeOut = 1;
const int modeInOut = 2;

// an easing function that uses exponential 
// input 't' must be in domain [0,1]
// input 'p' is the power, quadratic, cubic, etc..
// input 'mode' accept 3 modes of operation, defined const above
// return value is between [0,1]
float easePow(float t,float p, int mode) {
    float m = mode == modeInOut ? floor(mod(t*2.,2.)) : float(mode);
    float f = mode == modeInOut ? 2. : 1.;

    return abs( m - pow( abs(m - t) * f, p) / f );
}

// functions by Inigo Quilez
// http://www.iquilezles.org/www/articles/functions/functions.htm

float almostIdentity( float x, float m, float n ) {
    if( x>m ) return x;
    float a = 2.0*n - m;
    float b = 2.0*m - 3.0*n;
    float t = x/m;
    return (a*t + b)*t*t + n;
}

float almostIdentity( float x ) {
    return x*x*(2.0-x);
}

float almostIdentity( float x, float n ) {
    return sqrt(x*x+n);
}

float expImpulse( float x, float k ) {
    float h = k*x;
    return h*exp(1.0-h);
}

float expSustainedImpulse( float x, float f, float k ) {
    float s = max(x-f,0.0);
    return min( x*x/(f*f), 1.+(2.0/f)*s*exp(-k*s));
}

float quaImpulse( float k, float x ) {
    return 2.0*sqrt(k)*x/(1.0+k*x*x);
}

float polyImpulse( float k, float n, float x ) {
    return (n/(n-1.0))*pow((n-1.0)*k,1.0/n) * x/(1.0+k*pow(x,n));
}

float cubicPulse( float c, float w, float x ) {
    x = abs(x - c);
    if( x>w ) return 0.0;
    x /= w;
    return 1.0 - x*x*(3.0-2.0*x);
}

float expStep( float x, float k, float n ) {
    return exp( -k*pow(x,n) );
}

float gain(float x, float k)  {
    float a = 0.5*pow(2.0*((x<0.5)?x:1.0-x), k);
    return (x<0.5)?a:1.0-a;
}

float parabola( float x, float k ) {
    return pow( 4.0*x*(1.0-x), k );
}

float pcurve( float x, float a, float b ) {
    float k = pow(a+b,a+b) / (pow(a,a)*pow(b,b));
    return k * pow( x, a ) * pow( 1.0-x, b );
}

float sinc( float x, float k ) {
    float a = 3.1415 * (k*x-1.0);
    return sin(a)/a;
}
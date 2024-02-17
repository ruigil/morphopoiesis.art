#define PI 3.14159265
#define R iResolution.xy

#define B0 iChannel0
#define B1 iChannel1
#define B2 iChannel2
#define B3 iChannel3


vec4 texel(sampler2D b, vec2 p) { return texelFetch(b, ivec2(mod(p,R)), 0 ); }
vec4 texeli(sampler2D b, vec2 p) { return texture(b, p/R ); }

vec2 decode(float x) {
    uint X = floatBitsToUint(x);
    return unpackSnorm2x16(X); 
}

float encode(vec2 x) {
    uint X = packSnorm2x16(clamp(x, vec2(-1.), vec2(1.)));
    return uintBitsToFloat(X); 
}

struct Cell {
    vec2 X;
    vec2 V;
    float M;
};
    
Cell decode(vec4 data, vec2 XY) {
    Cell P; 
    P.X = decode(data.x) + XY;
    P.V = decode(data.y);
    P.M = data.z;
    return P;
}

vec4 encode(Cell P, vec2 XY) {
    P.X = clamp(P.X - XY, vec2(-0.5), vec2(0.5));
    return vec4(encode(P.X), encode(P.V), P.M, 0.);
}

const vec2 dx = vec2(0, 1);

float hash11(float p)
{
    p = fract(p * .1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

#define rand_interval 250
#define random_gen(a, b, seed) ((a) + ((b)-(a))*hash11(seed + float(iFrame/rand_interval)))




/* FIRE */
//mold stuff 

/*
#define sense_num 6
#define sense_ang (0.15 + 0.13*sin(iTime))
#define sense_dis 200.
#define sense_oscil 0.0
#define oscil_scale 1.
#define oscil_pow 1.
#define sense_force 0.5
#define distance_scale 2.
#define force_scale 0.5
#define trailing 0.5
#define acceleration 1.0
*/

//useful functions
#define GS(x) exp(-dot(x,x))
#define GSS(x) exp(-dot(x,x))
#define GS0(x) exp(-length(x))
#define Dir(ang) vec2(cos(ang), sin(ang))
#define Rot(ang) mat2(cos(ang), sin(ang), -sin(ang), cos(ang))





//data packing
//#define PACK(X) ( uint(round(65534.0*clamp(0.5*X.x+0.5, 0., 1.))) + 65535u*uint(round(65534.0*clamp(0.5*X.y+0.5, 0., 1.))) )   
//#define UNPACK(X) (clamp(vec2(X%65535u, X/65535u)/65534.0, 0.,1.)*2.0 - 1.0)              

//#define DECODE(X) UNPACK(floatBitsToUint(X))
//#define ENCODE(X) uintBitsToFloat(PACK(X))


#define Bf(p) mod(p,R)
#define Bi(p) ivec2(mod(p+R,R))
//#define texel(a, p) texelFetch(a, Bi(p), 0)
#define pixel(a, p) texture(a, Bf(p)/R)


#define PI 3.14159265

#define dt 1.0
#define mass 1.

#define fluid_rho .5



#define border_h 5.
#define R iResolution.xy


vec4 texel(sampler2D ch, vec2 p) {
    return texelFetch(ch, ivec2( mod(p+R,R) ), 0);
}

float Pf(vec2 rho)
{
    //return 0.2*rho.x; //gas
    float GF = 1.;//smoothstep(0.49, 0.5, 1. - rho.y);
    return mix(0.5*rho.x,0.04*rho.x*(rho.x/fluid_rho - 1.), GF); //water pressure
}

mat2 Rot(float ang)
{
    return mat2(cos(ang), -sin(ang), sin(ang), cos(ang)); 
}

vec2 Dir(float ang)
{
    return vec2(cos(ang), sin(ang));
}


float sdBox( in vec2 p, in vec2 b )
{
    vec2 d = abs(p)-b;
    return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}


float sdCircle( vec2 p, float r )
{
    return length(p) - r;
}

float sdSegment( in vec2 p, in vec2 a, in vec2 b )
{
    vec2 pa = p-a, ba = b-a;
    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
    return length( pa - ba*h );
}

float sdArrow( in vec2 p, in vec2 a, in vec2 b )
{
    float sdl = sdSegment(p,a,b);
    vec2 delta = normalize(b-a);
    sdl = min(sdl, sdSegment(p,b,b-delta*0.05 + 0.05*delta.yx*vec2(-1,1)));
    sdl = min(sdl, sdSegment(p,b,b-delta*0.05 - 0.05*delta.yx*vec2(-1,1)));
    return sdl;
}

/*
float border(vec2 p)
{
    float bound = -sdBox(p - R*0.5, R*vec2(0.5, 0.5)); 
    float box = sdBox(Rot(0.*time)*(p - R*vec2(0.5, 0.6)) , R*vec2(0.05, 0.01));
    float drain = -sdBox(p - R*vec2(0.5, 0.7), R*vec2(1.5, 0.5));
    return max(drain,min(bound, box));
}
#define h 1.
vec3 bN(vec2 p)
{
    vec3 dx = vec3(-h,0,h);
    vec4 idx = vec4(-1./h, 0., 1./h, 0.25);
    vec3 r = idx.zyw*border(p + dx.zy)
           + idx.xyw*border(p + dx.xy)
           + idx.yzw*border(p + dx.yz)
           + idx.yxw*border(p + dx.yx);
    return vec3(normalize(r.xy), r.z + 1e-4);
}
*/
//estimating the in-cell distribution size
vec2 destimator(vec2 dx, float M)
{//distribution diameter
// 0 - completely particle like
// >1.0 - field-like
#define dist 1.
//diffusion
#define dif 0.001
//estimation str
#define difd 2.0

    //size estimate by in-cell location
    return dist*clamp(1.0 - difd*abs(dx), 0.002, 1.0) + dif*dt;
}
vec2 decode(float x)
{
    uint X = floatBitsToUint(x);
    return unpackSnorm2x16(X); 
}

float encode(vec2 x)
{
    uint X = packSnorm2x16(clamp(x, vec2(-1.), vec2(1.)));
    return uintBitsToFloat(X); 
}

struct particle
{
    vec2 X;
    vec2 V;
    vec2 M;
};
    
particle getParticle(vec4 data, vec2 pos)
{
    particle P; 
    P.X = decode(data.x) + pos;
    P.V = decode(data.y);
    P.M = data.zw;
    return P;
}

vec4 saveParticle(particle P, vec2 pos)
{
    P.X = clamp(P.X - pos, vec2(-0.5), vec2(0.5));
    return vec4(encode(P.X), encode(P.V), P.M);
}

vec3 hash32(vec2 p)
{
	vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yxz+33.33);
    return fract((p3.xxy+p3.yzz)*p3.zyx);
}

float G(vec2 x)
{
    return exp(-dot(x,x));
}

float G0(vec2 x)
{
    return exp(-length(x));
}




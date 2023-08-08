/*************************************************************************************************
 * Mark Jarzynski and Marc Olano, Hash Functions for GPU Rendering, 
 * Journal of Computer Graphics Techniques (JCGT), vol. 9, no. 3, 21-38, 2020
 * Available online http://jcgt.org/published/0009/03/02/
 *
 * https://www.pcg-random.org/
 *
 * https://www.shadertoy.com/view/XlGcRh
 */    

uint pcg(uint v) {
	uint state = v * 747796405u + 2891336453u;
	uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
	return (word >> 22u) ^ word;
}

uvec2 pcg2d(uvec2 v) {
    v = v * 1664525u + 1013904223u;

    v.x += v.y * 1664525u;
    v.y += v.x * 1664525u;

    v = v ^ (v>>16u);

    v.x += v.y * 1664525u;
    v.y += v.x * 1664525u;

    v = v ^ (v>>16u);

    return v;
}

uvec3 pcg3d(uvec3 v) {

    v = v * 1664525u + 1013904223u;

    v.x += v.y*v.z;
    v.y += v.z*v.x;
    v.z += v.x*v.y;

    v ^= v >> 16u;

    v.x += v.y*v.z;
    v.y += v.z*v.x;
    v.z += v.x*v.y;

    return v;
}

uvec3 pcg3d16(uvec3 v) {
    v = v * 12829u + 47989u;

    v.x += v.y*v.z;
    v.y += v.z*v.x;
    v.z += v.x*v.y;

    v.x += v.y*v.z;
    v.y += v.z*v.x;
    v.z += v.x*v.y;

	v >>= 16u;

    return v;
}

uvec4 pcg4d(uvec4 v) {
    v = v * 1664525u + 1013904223u;
    
    v.x += v.y*v.w;
    v.y += v.z*v.x;
    v.z += v.x*v.y;
    v.w += v.y*v.z;
    
    v ^= v >> 16u;
    
    v.x += v.y*v.w;
    v.y += v.z*v.x;
    v.z += v.x*v.y;
    v.w += v.y*v.z;
    
    return v;
}

// these function use the unsigned int pcg hash above.
// they expect a positive seed, or else the results are symmetric and return [0,1]
// 1 -> 1
float hash( float p ) {
    return float( pcg( uint( abs(p) * 10000.) )) * (1.0/float(0xffffffffu)) ;
}
// 2 -> 1
float hash( vec2 p ) {
    return float( pcg2d( uvec2( abs(p) * 10000.) ) ) * (1.0/float(0xffffffffu)) ;
}
// 3 -> 1
float hash( vec3 p ){
    return float( pcg3d( uvec3( abs(p) * 10000.) ) ) * (1.0/float(0xffffffffu)) ;
}
// 4 -> 1
float hash( vec4 p ){
    return float( pcg4d( uvec4( abs(p) * 10000.) ) ) * (1.0/float(0xffffffffu)) ;
}
// 2 -> 2
vec2 hash2( vec2 p ) {
    return vec2( pcg2d( uvec2( abs(p) * 10000.) ) ) * (1.0/float(0xffffffffu)) ;
}
// 3 -> 3
vec3 hash3( vec3 p ) {
    return vec3( pcg3d( uvec3( abs(p) * 10000.) ) ) * (1.0/float(0xffffffffu)) ;
}
// 4 -> 4
vec4 hash4( vec4 p ) {
    return vec4( pcg4d( uvec4( abs(p) * 10000.) ) ) * (1.0/float(0xffffffffu)) ;
}


// value noise in 2 dimension
// https://www.shadertoy.com/view/lsf3WH
// returns [0,1]
float vnoise( vec2 p ) {
    vec2 i = floor( p );
    vec2 f = fract( p );
	
    // quintic interpolation
    vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);

    return mix( mix( hash( i + vec2(0.0,0.0) ), 
                     hash( i + vec2(1.0,0.0) ), u.x),
                mix( hash( i + vec2(0.0,1.0) ), 
                     hash( i + vec2(1.0,1.0) ), u.x), u.y);
}

// value noise in 3 dimension
// https://www.shadertoy.com/view/4sfGzS
// returns [0,1]

float vnoise( vec3 p ) {
    vec3 i = floor( p );
    vec3 f = fract( p );

    // quintic interpolation
    vec3 u = f*f*f*(f*(f*6.0-15.0)+10.0);
	
    return mix(mix(mix( hash( i + vec3(0,0,0)), 
                        hash( i + vec3(1,0,0)), u.x),
                   mix( hash( i + vec3(0,1,0)), 
                        hash( i + vec3(1,1,0)), u.x), u.y),
               mix(mix( hash( i + vec3(0,0,1)), 
                        hash( i + vec3(1,0,1)), u.x),
                   mix( hash( i + vec3(0,1,1)), 
                        hash( i + vec3(1,1,1)), u.x), u.y), u.z);
}

// default noise is value noise
float noise( vec2 p) { return vnoise(p); }
float noise( vec3 p) { return vnoise(p); }

// returns a normalized random vector
// 2 -> 2
vec2 grad( vec2 s ) {
    float f = hash( s.x + hash( s.y ) ) * 6.28;

    return vec2( cos(f), sin(f) );
}
// returns a normalized random vector
// 3 -> 3
vec3 grad( vec3 s ) {
    float f = hash( s.x + hash( s.y + hash( s.z )) ) * 6.28;

    return vec3( cos(f), sin(f), cos(f) * sin(f) );
}
// gradient noise in 2 dimensions
// https://www.shadertoy.com/view/XdXGW8
// returns [-1,1]
float gnoise( vec2 p ) {
     vec2 i = floor( p );
     vec2 f = fract( p );
	
    // quintic interpolation
    vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);

    return mix( mix( dot( grad( i + vec2(0,0) ), f - vec2(0.0,0.0) ), 
                     dot( grad( i + vec2(1,0) ), f - vec2(1.0,0.0) ), u.x),
                mix( dot( grad( i + vec2(0,1) ), f - vec2(0.0,1.0) ), 
                     dot( grad( i + vec2(1,1) ), f - vec2(1.0,1.0) ), u.x), u.y);
}

// gradient noise in 3 dimensions
// https://www.shadertoy.com/view/Xsl3Dl
// returns [-1,1]
float gnoise( in vec3 p ) {
    vec3 i = floor( p );
    vec3 f = fract( p );
	
    // quintic interpolation
    vec3 u = f*f*f*(f*(f*6.0-15.0)+10.0);

    return mix( mix( mix( dot( grad( i + vec3(0.0,0.0,0.0) ), f - vec3(0.0,0.0,0.0) ), 
                          dot( grad( i + vec3(1.0,0.0,0.0) ), f - vec3(1.0,0.0,0.0) ), u.x),
                     mix( dot( grad( i + vec3(0.0,1.0,0.0) ), f - vec3(0.0,1.0,0.0) ), 
                          dot( grad( i + vec3(1.0,1.0,0.0) ), f - vec3(1.0,1.0,0.0) ), u.x), u.y),
                mix( mix( dot( grad( i + vec3(0.0,0.0,1.0) ), f - vec3(0.0,0.0,1.0) ), 
                          dot( grad( i + vec3(1.0,0.0,1.0) ), f - vec3(1.0,0.0,1.0) ), u.x),
                     mix( dot( grad( i + vec3(0.0,1.0,1.0) ), f - vec3(0.0,1.0,1.0) ), 
                          dot( grad( i + vec3(1.0,1.0,1.0) ), f - vec3(1.0,1.0,1.0) ), u.x), u.y), u.z );
}

// fractal noise with a 2d seed
float fbm(vec2 p) {

    p *= 8.0;
    mat2 m = mat2( 1.6,  1.2, -1.2,  1.6 );
    float f  = 0.;
    f += 0.5000*noise( p ); p = m*p;
    f += 0.2500*noise( p ); p = m*p;
    f += 0.1250*noise( p ); p = m*p;
    f += 0.0625*noise( p ); p = m*p;
    return f;
}

// fractal noise with a 3d seed
float fbm ( vec3 r ) {
    float f = 0.0;
    r *= 8.0;
    const mat3 m = mat3( 0.00,  0.80,  0.60,
                -0.80,  0.36, -0.48,
                -0.60, -0.48,  0.64 );        
    f  = 0.5000*noise( r ); r = m*r*2.01;
    f += 0.2500*noise( r ); r = m*r*2.02;
    f += 0.1250*noise( r ); r = m*r*2.03;
    f += 0.0625*noise( r ); r = m*r*2.01;

    return f;
}
/*************************************************************************************************
 * Mark Jarzynski and Marc Olano, Hash Functions for GPU Rendering, 
 * Journal of Computer Graphics Techniques (JCGT), vol. 9, no. 3, 21-38, 2020
 * Available online http://jcgt.org/published/0009/03/02/
 *
 * https://www.pcg-random.org/
 *
 * https://www.shadertoy.com/view/XlGcRh
 */   
fn pcg(v: u32) -> u32 {
	let state = v * 747796405u + 2891336453u;
	let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
	return (word >> 22u) ^ word;
}

fn pcg2d(pv: vec2u) -> vec2u {
    var v = pv * 1664525u + 1013904223u;
    let s = vec2u(16u);

    v.x += v.y * 1664525u;
    v.y += v.x * 1664525u;

    v = v ^ (v>>s);

    v.x += v.y * 1664525u;
    v.y += v.x * 1664525u;

    v = v ^ (v>>s);

    return v;
}

fn pcg3d(pv:vec3u) -> vec3u {

    var v = pv * 1664525u + 1013904223u;

    v.x += v.y*v.z;
    v.y += v.z*v.x;
    v.z += v.x*v.y;

    v ^= v >> vec3u(16u);

    v.x += v.y*v.z;
    v.y += v.z*v.x;
    v.z += v.x*v.y;

    return v;
}

fn pcg4d(pv: vec4u) -> vec4u {
    var v = pv * 1664525u + 1013904223u;
    
    v.x += v.y*v.w;
    v.y += v.z*v.x;
    v.z += v.x*v.y;
    v.w += v.y*v.z;
    
    v ^= v >> vec4(16u);
    
    v.x += v.y*v.w;
    v.y += v.z*v.x;
    v.z += v.x*v.y;
    v.w += v.y*v.z;
    
    return v;
}

//-------------------------------------------------------------------------------------------------
// return a random vec3f between [0,1)
fn rnd23( seed: vec2u) -> vec3f {
    let u = vec3u( seed, seed.x ^ seed.y);
    return vec3f( vec3f(pcg3d(u)) * (1. / f32(0xffffffffu)) ) ;
}

fn rnd33( seed: vec3u) -> vec3f {
    return vec3f( vec3f(pcg3d(seed)) * (1. / f32(0xffffffffu)) ) ;
}



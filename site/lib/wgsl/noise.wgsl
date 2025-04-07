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
// 2D and 3D hash functions
fn hash3( seed: vec3u) -> vec3f {
    return vec3f( vec3f(pcg3d(seed)) * (1. / f32(0xffffffffu)) ) ;
}

fn hash2( seed: vec2u) -> vec2f {
    return vec2f( vec2f(pcg2d(seed)) * (1. / f32(0xffffffffu)) ) ;
}

// value noise in 2d
fn valueNoise2d(p: vec2f) -> f32 {
    // cell cordinates
    let c = vec2u(floor(abs(p)));
    // sub-cell cordinates
    let f = fract(p);
    // bicubic interpolation
    let u = f * f * (3.0 - 2.0 * f);
    // offset vector
    let o = vec2u(0,1);
    return mix( mix( hash2( c + o.xx ).x, hash2( c + o.yx ).x, u.x),
                mix( hash2( c + o.xy ).x, hash2( c + o.yy ).x, u.x), u.y);
}


// value noise in 3d
fn valueNoise3d(p: vec3f) -> f32 {
    let i = floor( p );
    let f = fract( p );

    // quintic interpolation
    let u = f*f*f*(f*(f*6.0-15.0)+10.0);
	
    return mix(mix(mix( hash3( i + vec3f(0,0,0)), 
                        hash3( i + vec3f(1,0,0)), u.x),
                   mix( hash3( i + vec3f(0,1,0)), 
                        hash3( i + vec3f(1,1,0)), u.x), u.y),
               mix(mix( hash3( i + vec3f(0,0,1)), 
                        hash3( i + vec3f(1,0,1)), u.x),
                   mix( hash3( i + vec3f(0,1,1)), 
                        hash3( i + vec3f(1,1,1)), u.x), u.y), u.z);
}


// random unit vector in 2d
fn rndNorm2d( p: vec2u ) -> vec2f {
    return normalize(  hash2( p )  - .5 );
}

// perlin noise in 2d
fn perlinNoise(p: vec2f) -> f32 {
    //cell coordinates
    let c = vec2u(floor(abs(p)));
    //fractional coordinates
    let f = fract(p);
    //quintic interpolation
    let u = f * f * f * (10.0 + f * (-15.0 + 6.0 * f));
    //offset vector
    let o = vec2u(0,1);
    
    //interpolate between the gradient values them and map to 0 - 1 range
    return mix(mix(dot(rndNorm2d(c + o.xx), vec2f(o.xx) - f), dot(rndNorm2d(c + o.yx), vec2f(o.yx) - f), u.x),
               mix(dot(rndNorm2d(c + o.xy), vec2f(o.xy) - f), dot(rndNorm2d(c + o.yy), vec2f(o.yy) - f), u.x), u.y) + 0.5;
}

//worley noise in 2d
fn worleyNoise(p:vec2f) -> f32 {
    //cell coordinates
    let cell = vec2u(floor(abs(p)));
    // the maximum possible distance is 2 * sqrt(2.), so we start higher than that;
    var dist = 3.; 
    
    //iterate through [3,3] neighbor cells
    for(var x = -1; x <= 1; x++) {
        for(var y = -1; y <= 1; y++) {
            //get neighbour cell coordinates
            let nCell = vec2u(vec2i(cell) + vec2i(x,y));
            //compute difference from pixel to worley cell
            let wDiff = hash2(nCell) + vec2f(nCell) - abs(p);
            //save the nearest distance
            dist = min(dist, length(wDiff));
        }
    }
    return dist;
}

// voronoi noise in 2d
fn voronoise(p:vec2f) -> f32 {
    // cell coordinates
    let cell = vec2u(floor(abs(p)));
    // the maximum possible distance is 2 * sqrt(2.), so we start higher than that;
    var dist = 3.; 
    //store the nearest voronoi cell
    var vCell = cell;
    
    //Iterate through [3,3] neighbor cells
    for(var x = -1; x <= 1; x++) {
        for(var y = -1; y <= 1; y++) {
            //get neighbour cell coordintaes
            let nCell = vec2u( vec2i(cell) + vec2i(x,y) );
            //compute difference from pixel to worley cell
            let wDiff = hash2(nCell) + vec2f(nCell) - abs(p);
            //compute the worley distance        
            let wDist = length(wDiff);
            //If the new distance is the nearest
            if (dist > wDist) {
                //Store the new distance and cell coordinates
                dist = wDist;
                vCell = nCell;
            }
        }

    }
    //Get a random value using cell coordinates
    return hash2(vCell).x;
}

//generate fractal value noise from multiple octaves
fn fractalNoise2d(p:vec2f, o: i32) -> f32 {
    var value = 0.0;
    var amplitude = .5;
    var frequency = 1.;
    let pp = p + 1000.;
    //
    // Loop of octaves
    for (var i = 0; i < 8; i++) {
        value += amplitude * valueNoise2d(pp * frequency);
        frequency *= 2.;
        amplitude *= .5;
    }
    return value;
}

//generate fractal value noise from multiple octaves
fn fractalNoise3d(p:vec3f, o: i32) -> f32 {
    var value = 0.0;
    var amplitude = .5;
    var frequency = 1.;
    let pp = p + 1000.;
    //
    // Loop of octaves
    for (var i = 0; i < 8; i++) {
        value += amplitude * valueNoise3d(pp * frequency);
        frequency *= 2.;
        amplitude *= .5;
    }
    return value;
}


fn hash2( seed: vec2u) -> vec2f {
    return vec2f( vec2f(pcg2d(seed)) * (1. / f32(0xffffffffu)) ) ;
}

// generates a gaussian distribution from two uniform distributions
// using the Box-Muller transform
// https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
fn boxMuller(u1: f32, u2: f32) -> vec2f {
    let r = sqrt(-2.0 * log(u1));
    let theta = 2.0 * 3.14159265359 * u2;
    return vec2f(r * cos(theta), r * sin(theta));
}
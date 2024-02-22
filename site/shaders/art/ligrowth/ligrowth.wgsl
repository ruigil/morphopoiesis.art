// This work is licensed under CC BY NC ND 4.0 
// https://creativecommons.org/licenses/by-nc-nd/4.0/

struct Sys {
    time: f32,
    resolution: vec2<f32>,
    mouse: vec4<f32>,
    aspect: vec2<f32>,
    frame: f32
};

struct SimParams {
  size: vec2<f32>,
  drops: f32,
  mode: vec4<f32>
}

struct Agent {
  pos : vec2<f32>,
  vel : vec2<f32>,
}

struct Debug {
    debug: f32,
    mouse: vec4<f32>
}

struct VertexInput {
    @location(0) pos: vec2<f32>,
    @builtin(instance_index) instance: u32
};

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) state: f32,
    @location(1) uv: vec2<f32>,
}

@group(0) @binding(0) var<uniform> sys : Sys;
@group(0) @binding(1) var<uniform> params : SimParams;
@group(0) @binding(2) var<storage, read> iceA : array<f32>;
@group(0) @binding(3) var<storage, read_write> iceB : array<f32>;
@group(0) @binding(4) var<storage, read_write> drops : array<Agent>;
@group(0) @binding(5) var<storage, read_write> debug : Debug;

@vertex
fn vertMain( input: VertexInput) -> VertexOutput {
  
    let i = f32(input.instance); 
    let cell = vec2f(i % params.size.x, floor(i / params.size.x) );
    
    let c1 = iceA[getIndex( vec2(cell.x + input.pos.x ,  cell.y) )];
    let c2 = iceA[getIndex( vec2(cell.x + input.pos.x, cell.y - input.pos.y) )];
    let c3 = iceA[getIndex( vec2(cell.x , cell.y - input.pos.y) )];
    let c4 = iceA[input.instance];    
     
    // multisample the state to reduce aliasing
    let state = (c1 + c2 + c3 + c4) / 4.0;
    
    let cellSize = 2. / params.size.xy ;
    // The cell(0,0) is a the top left corner of the screen.
    // The cell(uni.size.x,uni.size.y) is a the bottom right corner of the screen.
    let cellOffset =  vec2(cell.x, params.size.y - 1. - cell.y) * cellSize + (cellSize * .5) ;
    // input.pos is in the range [-1,1]...[1,1] and it's the same coord system as the uv of the screen
    let cellPos =  (input.pos  / params.size.xy) + cellOffset - 1.; 

    var output: VertexOutput;
    output.uv = input.pos;
    output.pos = vec4f(cellPos , 0., 1.);
    output.state = state;
    return output;
}

@fragment
fn fragMain(input : VertexOutput) -> @location(0) vec4<f32> {
    let uv = normCoord(input.pos.xy, sys.resolution);
    let drop = timeToColor( fract(input.state ) );
    let m = ((vec2f(sys.mouse.x,1. - sys.mouse.y)  * 2. - 1.) * sys.aspect) - uv;
    let back =  length(uv * select(.1, 1., params.mode.x == 0.) ) * timeToColor(0.) * (1. + perlinNoise(vec2f(uv.xy*params.size)) - .5) * smoothstep(0.,0.3, length( m ));
    
    return vec4f(mix(back, drop, ceil(input.state)   ), 1.);
}



@compute @workgroup_size(8,8)
fn computeIce(@builtin(global_invocation_id) cell : vec3<u32>) {
    if (cell.x >= u32(params.size.x) || cell.y >= u32(params.size.y)) { return; }

    iceB[ cell.y * u32(params.size.x) + cell.x ] = iceA[cell.y * u32(params.size.x) + cell.x];
}

@compute @workgroup_size(64)
fn computeDrops(@builtin(global_invocation_id) id : vec3<u32>) {

    let i = id.x;
    // keep the simulation in the range [0,size]
    if (i >= u32(params.drops) ) { return; }

    // get the current water drop
    let drop = drops[i];
    var dir = normalize(drop.vel);
    var pos = drop.pos;

    //let's make the water drops turn in a random brownian motion
    let rnd = hash2(vec2u(u32(sys.time * (pos.x+1.) * 100. ), u32(sys.time * 1000. * (pos.y + 1)) ));
    //let rnd1 = valueNoise( vec2f(f32(i) + ((pos + 1. ) * .5) * 100.)) ;
    //let rnd2 = valueNoise( vec2f(f32(i) + ((pos + 1. ) * .5) * 1000.)) ;
    var turn = vec2<f32>(cos( rnd.x * 6.28), sin( rnd.x * 6.28));

    // calculate the new velocity and position
    // pos goes from -1 to 1 which means that we have distance = 2.
    // the maximum velocity is 1 pixel per frame, because we need consistency in the interaction with the ice grid
    // if we want to move 1 pixel we need to divide by the half the size of the simulation to get the correct maximum velocity
    // but we must choose the minimum size to avoid horizontal or vertical being different ratios
    // in summary we have to map [-1,1] to [0,size] while keeping the aspect ratio
    let vel = normalize(dir + turn) / (min(params.size.x, params.size.y) * .5);
    pos += vel;
    
    //wrap position around boundary condition [-1,1]
    pos = fract( (pos + 1.) * .5) * 2. - 1.;

    // calculate a melting radius with the mouse to apply to the ice
    // map the mouse position to [-1,1] and calculate the distance from the drop position, and correct for aspect ratio
    let melt = 1. - smoothstep( 0., 0.2,  length( ((sys.mouse.xy * 2.  - 1.)  - vec2<f32>(drop.pos)) * sys.aspect ) );

    // current index in the ice structure for the current water drop position
    let current = vec2<u32>( floor( ((drop.pos + 1.) * .5) * params.size));

    // if we are in the melting radius, melt the frzuen water drops and make them move
    if (melt > 0.) {
        // the melting radius is a probability, so we use a random number to decide if we melt the ice
        let rnd = hash2(vec2u(u32(sys.time*50.), u32(sys.time * 100.)));
        // melt the ice and move the drop
        if (rnd.y  < melt ) {
          iceB[ current.y * u32(params.size.x) + current.x ] = 0.;
          drops[i].vel = vel;
          drops[i].pos = pos;
        }
    } else {
      // else we count frozen neighbours in the ice grid structure
      var acc = 0.; // accumulator for the height neighbours of the current drop
      let size = vec2u(params.size);
      for(var i = 0u; i < 9u; i++) {
          let offset =  (vec2u( (i / 3u) - 1u , (i % 3u) - 1u ) + current + size) % size;
          acc += iceA[offset.y * size.x + offset.x];
      } 
      if (acc > 0.) {
        let rnd = hash2(vec2u(u32(sys.time*50. + pos.x), u32(sys.time * 1000.  + pos.y)));
      // if the drop has a frozen neighbour, it freezes too
        if (iceA[ current.y * size.x + current.x ] == 0) { iceB[ current.y * size.x + current.x ] =  fract(sys.time ); };
      } else {
        // otherwise it moves 
        drops[i].pos = pos;
        drops[i].vel = vel;
      }
    }
}

// This need to be the last compute shader, because for the first intialization we nee the be the last one writing to the output iceB structure.
@compute @workgroup_size(8,8)
fn initializeSeeds(@builtin(global_invocation_id) cell : vec3<u32>) {
      // keep the simulation in the range [0,size]
    if (cell.x >= u32(params.size.x) || cell.y >= u32(params.size.y) || sys.frame > 0. ) { return; }

    var uv = normCoord(vec2f(cell.xy), params.size);
    uv *= rot2(params.mode.y * 6.283);
    var figure = 0.;
    if (params.mode.w == 0.) {
        figure = devil(uv*1.5);
    } else if params.mode.w == 1. {
        figure = magician(uv);
    } else if params.mode.w == 2. {
        figure = stroke(rect(uv, vec2f(.5,.5)), .05, true);
    } else if params.mode.w == 3. {
        figure = stroke(circle(uv, .5), .01, true);
    } else if params.mode.w == 4. {
        figure = stroke(hex(uv), .01, true);
    } else if params.mode.w == 5. {
        figure = stroke(tri(uv*2.), .01,  true);
    } else if params.mode.w == 6. {
        figure = stroke(poly(uv, .5, 5.), .01, true);
    } else if params.mode.w == 7. {
        figure = stroke(star5(uv*2.), .05, true);
    } else if (params.mode.w == 8.) {
        figure = fill(perlinNoise((uv + 3.)*3.),  true);
    } 
    iceB[cell.y * u32(params.size.x) + cell.x] = select(0.,figure ,hash2(vec2u(cell.x, cell.y)).x > .7);
}

fn timeToColor(time: f32) -> vec3<f32> {
    return pal( time,vec3(1.,1.,1.), vec3f(params.mode.x,params.mode.y,params.mode.z));
}

fn getIndex(cell : vec2<f32>) -> u32 { 
    let c = (cell + params.size) % params.size;
    return u32( c.y * params.size.x + c.x );
}

// cheap pallette from https://www.shadertoy.com/view/ll2GD3
fn pal(domain: f32, frequency: vec3f, phase: vec3f) -> vec3f {
  return vec3f(0.5) + vec3f(0.5) * cos(6.2830 * (frequency * domain + phase ));
}

fn magician(uv: vec2f) -> f32 { 
    var r = uv ;

    // this is the magic, a horizontal flip modulated by the sign of the vertical axis
    // the sign function return 1,-1 or 0 to represent the sign of the variable.
    r = vec2f(r.x * sign(r.y), r.y);

    let f = 
        stroke( circle( r - vec2f(.25,.0), .5), .01, true) * 
        stroke( circle( r + vec2f(.25,.0), .5), .08, false) + 
        stroke( circle( r + vec2f(.25,.0), .5), .01, true);
        
    return f;
}

// to model a star5, we use a symmetric line around the horizontal axis
// with 36 * 2. degrees and replicate the domain in the circle with 'modpolar' 5. times.
fn star5(r: vec2f) -> f32 {
    let s = modpolar(r , 5.);
    return dot( vec2f(s.x, abs(s.y) ), vec2f(.309,.951) ) - .5;
}

//@rot2-----------------------------------------------------------------------------------------------
// 2d rotation matrix, angle in radians
fn rot2(a: f32) -> mat2x2f { return mat2x2(cos(a),sin(a),-sin(a),cos(a)); }

fn devil(uv: vec2f) -> f32 { 
    var r = uv ;
    r *= rot2(radians(54.));
    let s = star5(r * 2.);
    
    let f = 
        stroke(circle(r ,.85), .05, true) *
        stroke(s, .5, false) + 
        stroke(s, .1, true);

    return f;
}
//@ssaa----------------------------------------------------------------------------------------------
// smoothstep antialias with fwidth
fn ssaa(v: f32) -> f32 { return smoothstep(.0,.01,v); }
//@stroke--------------------------------------------------------------------------------------------
// stroke an sdf 'd', with a width 'w', and a fill 'f' 
fn stroke(d : f32, w: f32, f: bool) -> f32 {  return abs(ssaa(abs(d)-w*.5) - f32(f)); }

//@rect----------------------------------------------------------------------------------------------
// a signed distance function for a rectangle 's' is size
fn rect(uv: vec2f, s: vec2f) -> f32 { let auv = abs(uv); return max(auv.x-s.x,auv.y-s.y); }
//@circle--------------------------------------------------------------------------------------------
// a signed distance function for a circle, 'r' is radius
fn circle(uv: vec2f, r: f32) -> f32 { return length(uv)-r; }

//@hex-----------------------------------------------------------------------------------------------
// a signed distance function for a hexagon
fn hex(uv: vec2f) -> f32 { let auv = abs(uv); return max(auv.x * .866 + auv.y * .5, auv.y) - .5; }
//@tri-----------------------------------------------------------------------------------------------
// a signed distance function for a equilateral triangle
fn tri(uv: vec2f) -> f32 { return max(abs(uv.x) * .866 + uv.y * .5, -uv.y) - .577; }
//@poly-----------------------------------------------------------------------------------------------
// generic 'n' side polygon, contained in the circle of radius
fn poly(uv: vec2f, r : f32, n:f32) -> f32 {  return length(uv) * cos(((atan2(uv.y, -uv.x)+ 3.14)  % (6.28 / n)) - (3.14 / n)) - r; }
//@modpolar-------------------------------------------------------------------------------------------
// returns the reference frame in modular polar form, the plane is mapped tto a sector align with the positive x axis
// assumes a normalized uv  bottom left is [-1,-1] and top right is [1,1]
fn modpolar(uv: vec2f, n: f32) -> vec2f { let angle = atan2(-uv.y,uv.x); let hm = (6.283/(n*2.)); return uv*rot2((angle + (hm*2.) + 3.1415) % (6.283/n) - angle - hm); }
//@fill----------------------------------------------------------------------------------------------
// fills an sdf 'd', and a fill 'f'. false for the fill means inverse 
fn fill(d: f32, f: bool) -> f32 { return abs(ssaa(d) - f32(f)); }

/*************************************************************************************************
 * Mark Jarzynski and Marc Olano, Hash Functions for GPU Rendering, 
 * Journal of Computer Graphics Techniques (JCGT), vol. 9, no. 3, 21-38, 2020
 * Available online http://jcgt.org/published/0009/03/02/
 *
 * https://www.pcg-random.org/
 *
 * https://www.shadertoy.com/view/XlGcRh
 */   
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

fn normCoord(coord: vec2<f32>, resolution: vec2<f32>) -> vec2<f32> {
    // bottom left is [-1,-1] and top right is [1,1]
   return (2.0 * coord - resolution) / min(resolution.x, resolution.y) * vec2f(1.,-1.);
}

fn hash2( seed: vec2u) -> vec2f {
    return vec2f( vec2f(pcg2d(seed)) * (1. / f32(0xffffffffu)) ) ;
}

// 2D and 3D hash functions
fn hash3( seed: vec3u) -> vec3f {
    return vec3f( vec3f(pcg3d(seed)) * (1. / f32(0xffffffffu)) ) ;
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
// value noise in 2d
fn valueNoise(p: vec2f) -> f32 {
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

// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

struct Sys {
    frame: u32,
    time: f32,
    resolution: vec2<f32>,
    mouse: vec4<f32>,
    buttons: vec3<f32>,
    aspect: vec2<f32>
};

struct SimParams {
  size: vec2<f32>,
  agents: f32,
  sa: f32,
  sd: f32,
  evaporation: f32,
  step: u32
}

struct Agent {
  pos : vec2<f32>,
  vel : vec2<f32>,
  t: vec4<u32>
}

struct VertexInput {
    @location(0) pos: vec2<f32>,
    @builtin(instance_index) instance: u32
};

struct Seed {
    coord: vec2<u32>,
    distance: f32,
    dirty: f32
}

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) state: f32
}

struct Debug {
    value: vec4<f32>,
    coord: vec2<i32>,
    size: vec2<f32>
}


@group(0) @binding(0) var<uniform> sys : Sys;
@group(0) @binding(1) var<uniform> params : SimParams;
@group(0) @binding(2) var<storage, read> seedMapA : array<Seed>;
@group(0) @binding(3) var<storage, read_write> seedMapB : array<Seed>;
@group(0) @binding(6) var<storage, read_write> instance : f32;
@group(0) @binding(4) var<storage, read_write> agents : array<Agent>;
@group(0) @binding(5) var<storage, read_write> debug : Debug;

@vertex
fn vertMain( input: VertexInput) -> VertexOutput {
  
    let i = f32(input.instance); 
    let cell = vec2f(i % params.size.x, floor(i / params.size.x) );
    let state = seedMapA[input.instance].distance;

    let cellSize = 2. / params.size.xy ;
    // The cell(0,0) is a the top left corner of the screen.
    // The cell(params.size.x,params.size.y) is a the bottom right corner of the screen.
    let cellOffset =  vec2(cell.x, params.size.y - 1. - cell.y) * cellSize + (cellSize * .5) ;
    // input.pos is in the range [-1,1]...[1,1] and it's the same coord system as the uv of the screen
    let cellPos =  (input.pos  / params.size.xy) + cellOffset - 1.; 

    var output: VertexOutput;
    output.pos = vec4f(cellPos, 0., 1.);
    output.state = state;
    return output;
}

@fragment
fn fragMain(input : VertexOutput) -> @location(0) vec4<f32> {
  return vec4( tosRGB( clamp( vec3f(input.state/max(params.size.x,params.size.y) ), vec3(0.),vec3(1.)) )  ,1.0) ;
}
const K_LAPLACE = array<f32,9>(0., 1., 0., 1., 0., 1., 0., 1., 0.);
@compute @workgroup_size(8, 8)
fn computeKernel(@builtin(global_invocation_id) cell : vec3<u32>) {
    // keep the simulation in the range [0,size]
    if (cell.x >= u32(params.size.x) || cell.y >= u32(params.size.y)) { return; }

    let m = vec2u(sys.mouse.xy * params.size );
    let size = vec2<u32>(params.size);

    // 7
    let p2 = ceil(log2(max(params.size.x,params.size.y)));
    // 64, 32, 16, 8, 4, 2, 1
    let step = i32(  exp2( p2 - 1. - (instance % p2) ) );

    instance += 1.;


    let index = cell.y * size.x + cell.x;
    let current = seedMapA[ index ];
    if (step == 64)  {
        seedMapB[ index ] = Seed(vec2u(10000u), current.distance, 0.);
    } else {
        seedMapB[ index ] = current;
    }

    var bestDist = distance(vec2f(cell.xy), vec2f(current.coord));
    for(var x = -1; x <= 1; x++) {
        for(var y = -1; y <= 1; y++) {
            let offset =  ((vec2i(cell.xy) + vec2(x,y) * step) + vec2i(size)) % vec2i(size);
            let seed = seedMapA[ offset.y * i32(size.x) + offset.x ];
            let dist = distance(vec2f(seed.coord), vec2f(cell.xy));
            if (dist < bestDist) {
                seedMapB[ index ] = Seed(seed.coord, dist, 0.);
            }
        }
    }

    
    if (sys.buttons.x == 1.) {
        seedMapB[ m.y * u32(params.size.x) + m.x] = Seed(m, 0., 0.);
    }

    if (m.x == cell.x && m.y == cell.y) {
        let ms = seedMapA[ m.y * size.x + m.x];
        debug.value = vec4f(vec2f(ms.coord),ms.distance,instance);
        debug.coord = vec2i( ( 0 / 3) - 1, (0 % 3) - 1 ) ;
        debug.size = params.size;
    }

}



@compute @workgroup_size(64)
fn computeAgents(@builtin(global_invocation_id) id : vec3<u32>) {

    let i = id.x;

    if (i >= u32(params.agents)) { return; }

    let agent = agents[i];
    var dir = normalize(agent.vel);
    var pos = agent.pos;

    //pos += agents[i].vel * .01;
    
    //wrap around boundary condition [-1,1]
    pos = fract( (pos + 1.) * .5) * 2. - 1.;

    // calculate the grid indexes for the current and next position
    let current = vec2<u32>( floor( (agents[i].pos + 1.)  * .5 * params.size ) );
    let next = vec2<u32>( floor( (pos + 1.)  * .5 * params.size ) );
    agents[i].pos = pos;
    //let v = trailMapA[ next.y * u32(params.size.x) + next.x ];
    
    //let c = seedMapA[ current.y * u32(params.size.x) + current.x ];
    //seedMapB[ current.y * u32(params.size.x) + current.x ] = Seed(current, 0., select(0.,1., sys.frame < 1));
    if ((current.x != next.x) || (current.y != next.y)) {
        //seedMapB[ current.y * u32(params.size.x) + current.x ] = Seed(next, distance(vec2f(next),vec2f(current)), 1.);
        //seedMapB[ next.y * u32(params.size.x) + next.x ] = Seed(next, 0., 1.);
    }
}

const forces = mat4x4<f32>(
    1., -1., 1., -1.,
    0., 1., 0., 0.,
    0., 0., 1., 0.,
    0., 0., 0., 1.
);

const K_DISTANCE = array<f32,9>(1.4142, 1., 1.4142, 1., 0., 1., 1.4142, 1., 1.4142);
// apply a convolution in a 2d grid with a specific kernel
// assumes a wrap around boundary condition
// and a buffer of size size

// random number between 0 and 1 with 3 seeds and 3 dimensions
fn rnd33( seed: vec3u) -> vec3f {
    return vec3f( vec3f(pcg3d(seed)) * (1. / f32(0xffffffffu)) ) ;
}

// https://www.pcg-random.org/
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
// converts from HSV to RGB
fn hsv2rgb(c :vec3f) -> vec3f {
    let k = vec4f(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    let p = abs(fract(c.xxx + k.xyz) * 6.0 - k.www);
    return c.z * mix(k.xxx, clamp(p - k.xxx, vec3(0.0), vec3(1.0)), c.y);
}

// Converts a color from linear light gamma to sRGB gamma
fn tosRGB(linearRGB: vec3f) -> vec3f {
    let cutoff = vec3<bool>(linearRGB.x < 0.0031308, linearRGB.y < 0.0031308, linearRGB.z < 0.0031308);
    let higher = vec3(1.055) * pow(linearRGB.rgb, vec3(1.0/2.4)) - vec3(0.055);
    let lower = linearRGB.rgb * vec3(12.92);

    return vec3<f32>(mix(higher, lower, vec3<f32>(cutoff)));
}
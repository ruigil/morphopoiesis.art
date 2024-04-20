// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

struct Sys {
    time: f32,
    resolution: vec2<f32>,
    mouse: vec4<f32>,
    aspect: vec2<f32>
};

struct SimParams {
  size: vec2<f32>,
  agents: f32,
  sa: f32,
  sd: f32,
  evaporation: f32
}

struct Agent {
  pos : vec2<f32>,
  vel : vec2<f32>,
  t: vec4<f32>
}

struct VertexInput {
    @location(0) pos: vec2<f32>,
    @builtin(instance_index) instance: u32
};

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) state: vec4<f32>
}

struct Debug {
    value: vec4<f32>,
    coord: vec2<u32>,
    size: vec2<f32>
}

@group(0) @binding(0) var<uniform> sys : Sys;
@group(0) @binding(1) var<uniform> params : SimParams;
@group(0) @binding(2) var<storage, read> trailMapA : array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> trailMapB : array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> agents : array<Agent>;
@group(0) @binding(5) var<storage, read_write> debug : Debug;

@vertex
fn vertMain( input: VertexInput) -> VertexOutput {
  
    let i = f32(input.instance); 
    let cell = vec2f(i % params.size.x, floor(i / params.size.x) );
    let state = vec4<f32>(trailMapA[input.instance]);

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
  // we just render the state of the trailmap as a hsv 2 rgb value  
  let sv = pow(input.state.x, 3.);
  let c = mix(input.state.xyz, vec3<f32>(1.), input.state.w);
  return vec4( tosRGB( c )  ,1.0) ;
}

@compute @workgroup_size(8, 8)
fn computeTrailmap(@builtin(global_invocation_id) cell : vec3<u32>) {
  // keep the simulation in the range [0,size]
  if (cell.x >= u32(params.size.x) || cell.y >= u32(params.size.y)) { return; }

  let m = vec2u(sys.mouse.xy * params.size );

  // we apply a gaussian blur to simulate diffusion of the trailmap values
  let value = conv3x3(K_GAUSSIAN_BLUR, cell.xy, vec2u(params.size.xy)) ; 
  //let previous = trailMapA[ cell.x + cell.y * u32(params.size.x) ].w; // previous pixel occupancy by particle
  let newValue = clamp(value * params.evaporation, vec4(0.), vec4(2.));

  if (m.x == cell.x && m.y == cell.y) {
    debug.value = newValue;
    debug.coord = cell.xy;
    debug.size = params.size;
  }

  trailMapB[ cell.x + cell.y * u32(params.size.x) ] = newValue;
}



@compute @workgroup_size(64)
fn computeAgents(@builtin(global_invocation_id) id : vec3<u32>) {

    let i = id.x;

    if (i >= u32(params.agents)) { return; }

    let agent = agents[i];
    var dir = normalize(agent.vel);
    var pos = agent.pos;

    //agents[i].vel = vel;
    //pos += vel * .1;
    
    //wrap around boundary condition [-1,1]
    pos = fract( (pos + 1.) * .5) * 2. - 1.;

    // calculate the grid indexes for the current and next position
    let next = vec2<u32>( floor( (pos + 1.)  * .5 * params.size ) );
    agents[i].pos = pos;
    let v = trailMapA[ next.y * u32(params.size.x) + next.x ];
    trailMapB[ next.y * u32(params.size.x) + next.x ] = clamp(v + agents[i].t * 2., vec4(0.), vec4(2.));


}

const forces = mat4x4<f32>(
    1., -1., 1., -1.,
    0., 1., 0., 0.,
    0., 0., 1., 0.,
    0., 0., 0., 1.
);

const K_GAUSSIAN_BLUR = array<f32,9>(0.0625, 0.125, 0.0625, 0.125, 0.25, 0.125, 0.0625, 0.125, 0.0625);
// apply a convolution in a 2d grid with a specific kernel
// assumes a wrap around boundary condition
// and a buffer of size size
fn conv3x3( kernel: array<f32,9>, cell: vec2<u32>, size: vec2<u32>) -> vec4<f32> {
    var acc = vec4(0.);
    
    for(var i = 0u; i < 9u; i++) {
        let offset =  (vec2u( (i / 3u) - 1u , (i % 3u) - 1u ) + cell + size) % size;
        // the  buffer can't be passed into the function
        acc += kernel[i] * trailMapA[offset.y * size.x + offset.x];
    } 
    
    return acc;
}

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
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
  drops: f32,
  fcolor: vec3<f32>,
  bcolor: vec3<f32>
}

struct Agent {
  pos : vec2<f32>,
  vel : vec2<f32>,
}

struct VertexInput {
    @location(0) pos: vec2<f32>,
    @builtin(instance_index) instance: u32
};

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) state: f32,
}

@group(0) @binding(0) var<uniform> sys : Sys;
@group(0) @binding(1) var<uniform> params : SimParams;
@group(0) @binding(2) var<storage, read> iceA : array<f32>;
@group(0) @binding(3) var<storage, read_write> iceB : array<f32>;
@group(0) @binding(4) var<storage, read_write> drops : array<Agent>;

@vertex
fn vertMain( input: VertexInput) -> VertexOutput {
  
    let i = f32(input.instance); 
    let cell = vec2f(i % params.size.x, floor(i / params.size.x) );
    let state = iceA[input.instance];

    let cellSize = 2. / params.size.xy ;
    // The cell(0,0) is a the top left corner of the screen.
    // The cell(uni.size.x,uni.size.y) is a the bottom right corner of the screen.
    let cellOffset =  vec2(cell.x, params.size.y - 1. - cell.y) * cellSize + (cellSize * .5) ;
    // input.pos is in the range [-1,1]...[1,1] and it's the same coord system as the uv of the screen
    let cellPos =  (input.pos  / params.size.xy) + cellOffset - 1.; 

    var output: VertexOutput;
    output.pos = vec4f(cellPos , 0., 1.);
    output.state = state;
    return output;
}

@fragment
fn fragMain(input : VertexOutput) -> @location(0) vec4<f32> {
  return vec4f( mix(params.bcolor/255.,params.fcolor/255., input.state), 1.);
}

@compute @workgroup_size(8,8)
fn computeIce(@builtin(global_invocation_id) cell : vec3<u32>) {
      // keep the simulation in the range [0,size]
    if (cell.x >= u32(params.size.x) || cell.y >= u32(params.size.y)) { return; }

    iceB[cell.y * u32(params.size.x) + cell.x] = iceA[cell.y * u32(params.size.x) + cell.x];
}

@compute @workgroup_size(64)
fn computeDrops(@builtin(global_invocation_id) id : vec3<u32>) {

    let i = id.x;
    // keep the simulation in the range [0,size]
    if (i >= u32(params.drops) ) { return; }

    let drop = drops[i];
    var dir = normalize(drop.vel);
    var pos = drop.pos;

    let angle = atan2(dir.y, dir.x);

    // let's make the drops turn a random bit
    let rnd = rnd33(vec3u(i, u32(sys.time), u32(sys.time * 100.)));
    var turn = vec2<f32>(cos( rnd.x * 6.28), sin( rnd.y * 6.28));

    // update velocity and position
    // pos goes from -1 to 1 which means that we have distance = 2.
    // if we want to move 1 pixel we need to divide by the half the size of the simulation to get the correct maximum velocity
    // but we must choose the minimum size to avoid horizontal or vertical being different ratios
    let vel = normalize(dir + turn) / (min(params.size.x, params.size.y) * .5);
    drops[i].vel = vel;
    pos += vel;
    
    //wrap around boundary condition [-1,1]
    pos = fract( (pos + 1.) * .5) * 2. - 1.;

    let m = (sys.mouse.xy * 2.  - 1.) * sys.aspect;
    // calculate a melting radius with the mouse to apply to the ice
    let melt = 1. - smoothstep( 0., 0.2,  length( m  - vec2<f32>(drop.pos * sys.aspect) ) );

    // current drop position in the ice structure
    let current = vec2<u32>( floor( ((drop.pos + 1.) * .5) * (params.size)));
    
    // if we are in the melting radius we melt the ice and move the drop
    if (melt > 0.) {
        // the melting radius is a probability, so we use a random number to decide if we melt the ice
        let rnd = rnd33(vec3u(u32(sys.time*50.), u32(sys.time * 100.), i));
        // melt the ice and move the drop
        if (rnd.z  < melt ) {
          iceB[ current.y * u32(params.size.x) + current.x ] = 0.;
          drops[i].pos = pos;
        }
    } else {
      // else we count frozen neighbours in the ice grid structure
      var acc = 0.; // accumulator
      let size = vec2u(params.size);
      for(var i = 0u; i < 9u; i++) {
          let offset =  (vec2u( (i / 3u) - 1u , (i % 3u) - 1u ) + current + size) % size;
          acc += iceA[offset.y * size.x + offset.x];
      } 
      if (acc > 0.) {
      // if the drop has a frozen neighbour, it freezes too
        iceB[ current.y * size.x + current.x ] = 1.;
      } else {
      // otherwise it moves 
        drops[i].pos = pos;
      }
    }
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
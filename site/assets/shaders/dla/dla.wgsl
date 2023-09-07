// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

struct Sys {
    time: f32,
    resolution: vec2<f32>,
    mouse: vec2<f32>,
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
    let cell = vec2f(i % params.size.x, floor(i / params.size.y) );
    let state = iceA[input.instance];

    // The cell(0,0) is a the top left corner of the screen.
    // The cell(size.x,size.y) is a the bottom right corner of the screen.
    let cellOffset = vec2(cell.x, params.size.y - cell.y - 1.) / params.size * 2.; 
    let cellPos = (input.pos + 1.) / params.size - 1. + cellOffset;

    var output: VertexOutput;
    output.pos = vec4f(cellPos / sys.aspect, 0., 1.);
    output.state = state;
    return output;
}

@fragment
fn fragMain(input : VertexOutput) -> @location(0) vec4<f32> {
  return vec4f( mix(params.bcolor/255.,params.fcolor/255., input.state), 1.);
}

@compute @workgroup_size(8,8)
fn computeIce(@builtin(global_invocation_id) cell : vec3<u32>) {
    iceB[cell.y * u32(params.size.x) + cell.x] = iceA[cell.y * u32(params.size.x) + cell.x];
}

@compute @workgroup_size(64)
fn computeDrops(@builtin(global_invocation_id) id : vec3<u32>) {

    let i = id.x;

    // just avoid computing the drops if they are not a multiple of the workgroup size
    if (i < u32(params.drops)) {
      let drop = drops[i];
      var dir = normalize(drop.vel);
      var pos = drop.pos;

      let angle = atan2(dir.y, dir.x);

      // let's make the drops turn a random bit
      let rnd = rnd33(vec3u(i, u32(sys.time), u32(sys.time * 100.)));
      var turn = vec2<f32>(cos( rnd.x * 6.28), sin( rnd.y * 6.28));

      // update velocity and position
      let vel = normalize(dir + turn) / (params.size *.5);
      drops[i].vel = vel;
      pos += vel;
      
      //wrap around boundary condition
      if (pos.x < -1.0) { pos.x += 2.0; }
      if (pos.x > 1.0) { pos.x -= 2.0; }
      if (pos.y < -1.0) { pos.y += 2.0; }
      if (pos.y > 1.0) { pos.y -= 2.0; }

      let m = mouseAspectRatio();
      // calculate a melting radius with the mouse to apply to the ice
      let melt = 1. - smoothstep( 0., 0.2,  length( (m * 2. - 1.) - vec2<f32>(drop.pos)) ) ;

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
            acc += iceA[offset.y * size.y + offset.x];
        } 
        if (acc > 0.) {
        // if the drop has a frozen neighbour, it freezes too
          iceB[ current.y * u32(params.size.x) + current.x ] = 1.;
        } else {
        // otherwise it moves 
          drops[i].pos = pos;
        }
      }
    }
}


fn mouseAspectRatio() -> vec2<f32> {
    // scale mouse by aspect ratio. We crop on the short side, so we must compensate for mouse coordinates
    let half = select( vec2((1. - sys.aspect.x) * .5, 0.), vec2(0.,(1. - sys.aspect.y) * .5), sys.aspect.x > sys.aspect.y);
    return half + (sys.mouse * sys.aspect);
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
// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

struct Sys {
    time: f32,
    resolution: vec2f,
    mouse: vec2f,
    aspect: vec2f
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
}

struct VertexInput {
    @location(0) pos: vec2<f32>,
    @builtin(instance_index) instance: u32
};

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) state: vec2<f32>
}

@group(0) @binding(0) var<uniform> sys : Sys;
@group(0) @binding(1) var<uniform> params : SimParams;
@group(0) @binding(2) var<storage, read> trailMapA : array<vec2<f32>>;
@group(0) @binding(3) var<storage, read_write> trailMapB : array<vec2<f32>>;
@group(0) @binding(4) var<storage, read_write> agents : array<Agent>;

@vertex
fn vertMain( input: VertexInput) -> VertexOutput {
  
    let i = f32(input.instance); 
    let cell = vec2f(i % params.size.x, floor(i / params.size.y) );
    let state = vec2<f32>(trailMapA[input.instance]);

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

  // we just render the state of the trailmap as a hsv 2 rgb value  
  let sv = pow(input.state.x, 3.);
  return vec4( tosRGB( hsv2rgb(vec3( 1. - input.state.x , sv, sv )) ) ,1.0) ;

}

@compute @workgroup_size(8, 8)
fn computeTrailmap(@builtin(global_invocation_id) cell : vec3<u32>) {

  // calculate a black hole with the mouse to apply to the trailmap
  let bh =  1. - smoothstep( 0., .2, (length((sys.mouse * params.size) - vec2<f32>(cell.xy)) / params.size.x * 2.) ) ;

  // we apply a gaussian blur to simulate diffusion of the trailmap values
  let value = conv3x3(K_GAUSSIAN_BLUR, vec2u(cell.xy), vec2u(params.size.xy)) ;  
  trailMapB[ cell.x + cell.y * u32(params.size.x) ].x = saturate(value * params.evaporation - bh);
}

fn sense(pos: vec2<f32>, angle: f32, sa: f32) -> vec2<f32> {
  // the mouse x influences the sensor distance
  let smd = ((sys.mouse.y) * 50.);
  // calculate the sensor position an return the trail map value at that position
  let sensePos = (vec2<f32>(cos(angle + sa), sin(angle + sa)) * (params.sd + smd)) / params.size;
  let index = vec2<u32>( floor( ((pos + sensePos + 1.) * .5) * (params.size))) % vec2<u32>(params.size);
  return trailMapA[ index.y * u32(params.size.x) + index.x ];
}

@compute @workgroup_size(64)
fn computeAgents(@builtin(global_invocation_id) id : vec3<u32>) {

    let i = id.x;

    if (i < u32(params.agents)) {
      let agent = agents[i];
      var dir = normalize(agent.vel);
      var pos = agent.pos;

      let angle = atan2(dir.y, dir.x);
      
      // the mouse x control influences the sensor angle
      let sma = ((sys.mouse.x) * 22.5 * 3.1415 / 180.);
      let ff = sense(pos, angle, 0.);
      let fl = sense(pos, angle ,  params.sa + sma);
      let fr = sense(pos, angle , -params.sa - sma) ;

      // if trail is bigger on the front go straight
      var turn = vec2<f32>(0.0);
      // turn scale is inversely proportional to the sensor distance
      let scale = saturate(10./ (params.sd  + ((sys.mouse.y) * 50.)));

      // if trail is bigger on the right turn right
      if (fr.x > fl.x && fr.x > ff.x) {
        turn = vec2<f32>(cos(angle - params.sa), sin(angle - params.sa)) * scale;
      }
      
      // if trail is bigger on the left turn left
      if (fl.x > fr.x && fl.x > ff.x) {
        turn = vec2<f32>(cos(angle + params.sa), sin(angle + params.sa)) * scale;
      }
      
      // trail is bigger on both sides, choose randomly
      if (fl.x > ff.x && fr.x > ff.x) { 
        let r = rnd33(vec3u(vec2u(pos.xy * params.size.xy), u32(sys.time * 1000.) ));
        // random choice betwen left and right
        let ra = select( params.sa, -params.sa, r.x > .5);
        turn = vec2<f32>(cos(angle + ra), sin(angle + ra)) * scale;
      }

      // update velocity and position      
      let vel = normalize(dir + turn) / (params.size * .5);
      agents[i].vel = vel;
      pos += vel;
      
      //wrap around boundary condition
      if (pos.x < -1.0) { pos.x += 2.0; }
      if (pos.x > 1.0) { pos.x -= 2.0; }
      if (pos.y < -1.0) { pos.y += 2.0; }
      if (pos.y > 1.0) { pos.y -= 2.0; }

      let next = vec2<u32>( floor( ((pos + 1.) * .5) * (params.size)));

      let nextPos = trailMapA[ next.y * u32(params.size.x) + next.x ];
      // if the next position is free move to it, only one particle per pixel.
      if (nextPos.y == 0.) {
        let current = vec2<u32>( floor( ((agents[i].pos + 1.) * .5) * (params.size)));
        agents[i].pos = pos;
        trailMapB[ current.y * u32(params.size.x) + current.x ] = vec2<f32>(1., 0.);
        trailMapB[ next.y * u32(params.size.x) + next.x ] = vec2<f32>(1., 1.);
      } else { // or else just stay put and choose a new direction randomly
        let r = rnd33(vec3u(vec2u(pos.xy * params.size.xy), u32(sys.time * 1000.) ));
        let ra = select( params.sa, -params.sa, r.x > .5);
        turn = vec2<f32>(cos(angle + ra), sin(angle + ra)) * scale;
        let vel = normalize(dir + turn) / (params.size * 2.);
        agents[i].vel = vel;
      }

    }

}
const K_GAUSSIAN_BLUR = array<f32,9>(0.0625, 0.125, 0.0625, 0.125, 0.25, 0.125, 0.0625, 0.125, 0.0625);
// apply a convolution in a 2d grid with a specific kernel
// assumes a wrap around boundary condition
// and a buffer of size size
fn conv3x3( kernel: array<f32,9>, cell: vec2<u32>, size: vec2<u32>) -> f32 {
    var acc = 0.;
    
    for(var i = 0u; i < 9u; i++) {
        let offset =  (vec2u( (i / 3u) - 1u , (i % 3u) - 1u ) + cell + size) % size;
        // the  buffer can't be passed into the function
        acc += kernel[i] * trailMapA[offset.y * size.y + offset.x].x;
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
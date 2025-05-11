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
  evaporation: f32,
  inverse: f32
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
    @location(0) state: vec2<f32>,
    @location(1) instance: f32
}

const TAU: f32 = 6.28318530718;

@group(0) @binding(0) var<uniform> sys : Sys;
@group(0) @binding(1) var<uniform> params : SimParams;
@group(0) @binding(2) var<storage, read> trailMapA : array<vec2<f32>>;
@group(0) @binding(3) var<storage, read_write> trailMapB : array<vec2<f32>>;
@group(0) @binding(4) var<storage, read_write> agents : array<Agent>;

@vertex
fn vertMain( input: VertexInput) -> VertexOutput {
  
    let i = f32(input.instance); 
    let cell = vec2f(i % params.size.x, floor(i / params.size.x) );
    let state = vec2<f32>(trailMapA[input.instance]);

    let cellSize = 2. / params.size.xy ;
    // The cell(0,0) is a the top left corner of the screen.
    // The cell(params.size.x,params.size.y) is a the bottom right corner of the screen.
    let cellOffset =  vec2(cell.x, params.size.y - 1. - cell.y) * cellSize + (cellSize * .5) ;
    // input.pos is in the range [-1,1]...[1,1] and it's the same coord system as the uv of the screen
    let cellPos =  (input.pos  / params.size.xy) + cellOffset - 1.; 

    var output: VertexOutput;
    output.pos = vec4f(cellPos, 0., 1.);
    output.state = state;
    output.instance = i;
    return output;
}

@fragment
fn fragMain(input : VertexOutput) -> @location(0) vec4<f32> {
  // we just render the state of the trailmap as a hsv 2 rgb value  
  let sv = pow(input.state.x, 3.);

  let sc = (vec2(input.instance % params.size.x, floor(input.instance / params.size.x)) / params.size);


  let color = mix( abs( params.inverse - slime(  input.state.x )),vec3(.0,0.,0.), length( (sc - .5) * 1.2));
  return vec4( tosRGB(color) ,1.0) ;
}

@compute @workgroup_size(8, 8)
fn computeTrailmap(@builtin(global_invocation_id) cell : vec3<u32>) {
  // keep the simulation in the range [0,size]
  if (cell.x >= u32(params.size.x) || cell.y >= u32(params.size.y)) { return; }

  // calculate a black hole with the mouse to apply to the trailmap
  let bh =  1. - smoothstep( 0., .2, (length((sys.mouse.xy * params.size) - vec2<f32>(cell.xy)) / params.size.x * 2.) ) ;

  // we apply a gaussian blur to simulate diffusion of the trailmap values
  let value = conv3x3(K_GAUSSIAN_BLUR, cell.xy, vec2u(params.size.xy)) ; 
  let previous = trailMapA[ cell.x + cell.y * u32(params.size.x) ].y; // previous pixel occupancy by particle
  trailMapB[ cell.x + cell.y * u32(params.size.x) ] = vec2(saturate(value * params.evaporation - bh), previous);
}


fn sense(pos: vec2<f32>, angle: f32) -> f32 {
  let sa = select(angle * .5, angle * 3., u32(floor(sys.time / 30.)) % 2u == 0u);
  let sd = select(params.sd * .5, params.sd * 2., u32(floor(sys.time / 30.)) % 2u == 0u);

  let sensor = (vec2<f32>(cos(angle), sin(angle)) * sd) / params.size;
  let index = vec2<u32>( floor( ((pos + sensor + 1.) * .5) * (params.size))) % vec2<u32>(params.size);
  return trailMapA[ index.y * u32(params.size.x) + index.x ].x;
}

@compute @workgroup_size(64)
fn computeAgents(@builtin(global_invocation_id) id : vec3<u32>) {

    let i = id.x;

    if (i >= u32(params.agents)) { return; }

    let agent = agents[i];
    var dir = normalize(agent.vel);
    var pos = agent.pos;

    let angle = atan2(dir.y, dir.x);

    let t = floor(sys.time / 5.); 


    let sf = sense(pos, angle);
    let sl = sense(pos, angle + params.sa );
    let sr = sense(pos, angle - params.sa ) ;

    // it looks better if the turn speed is proportional to the angle
    let turnSpeed =  cos(params.sa) * .1;
    // if trail is bigger on the front go straight
    var turn = vec2<f32>(0.0);

    // if trail is bigger on the right turn right
    if (sr > sl && sr > sf) {
      // perpendicular vector counter clockwise
      turn = vec2<f32>(dir.y, -dir.x)  * turnSpeed;
    }
    
    // if trail is bigger on the left turn left
    if (sl > sr && sl > sf) {
      // perpendicular vector counter clockwise
      turn = vec2<f32>(-dir.y, dir.x) * turnSpeed;
    }
    
    // trail is bigger on both sides, choose randomly
    if (sl > sf && sr > sf) { 
      let r = rnd33(vec3u(vec2u((pos.xy+1) * params.size.xy), u32(sys.time * 1000.) ));
      // random choice betwen left and right
      let p = select( vec2<f32>(-1.,1.), vec2<f32>(1.,-1.), r.x > .5);
      turn = vec2<f32>(dir.yx) * p * turnSpeed;
    }

    // update velocity and position
    // pos goes from -1 to 1 which means that we have distance = 2.
    // if we want to move 1 pixel we need to divide by the half the size of the simulation to get the correct maximum velocity
    // but we must choose the minimum size to avoid horizontal or vertical being different ratios
    let vel = normalize(dir + turn) / (min(params.size.x, params.size.y) * .5);
    agents[i].vel = vel;
    pos += vel;
    
    //wrap around boundary condition [-1,1]
    pos = fract( (pos + 1.) * .5) * 2. - 1.;

    // calculate the grid indexes for the current and next position
    let next = vec2<u32>( floor( (pos + 1.)  * .5 * params.size ) );
    let current = vec2<u32>( floor( (agents[i].pos + 1.)  * .5 * params.size) );

    let nextPos = trailMapA[ next.y * u32(params.size.x) + next.x ];
    // if the next position is free move to it, only one particle per pixel.
    if ( ( current.x == next.x && current.y == next.y) || (nextPos.y == 0.) ){
      agents[i].pos = pos;
      trailMapB[ current.y * u32(params.size.x) + current.x ] = vec2<f32>(1., 0.);
      trailMapB[ next.y * u32(params.size.x) + next.x ] = vec2<f32>(1., 1.);
    } else { // or else just stay put and choose a new direction randomly
      trailMapB[ current.y * u32(params.size.x) + current.x ] = vec2<f32>(1., 1.);
      let r = rnd33(vec3u(vec2u((pos.xy+1) * params.size.xy), u32(sys.time * 1000.) ));
      // random choice betwen left and right
      let p = select( vec2<f32>(-1.,1), vec2<f32>(1.,-1.), r.x > .5);
      turn = vec2<f32>(dir.yx) * p;
      let vel = normalize(dir + turn) / (params.size * .5) ;
      agents[i].vel = vel;
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
        acc += kernel[i] * trailMapA[offset.y * size.x + offset.x].x;
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

fn gradient(brightness: vec3<f32>, saturation: vec3<f32>, frequency: vec3<f32>, offset: vec3<f32>, t: f32) -> vec3<f32> {
    return clamp(brightness + saturation * cos(TAU * (frequency * t + offset)), vec3<f32>(0.0), vec3<f32>(1.0));
}

fn nature(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(0.7, 0.7, 0.1), vec3<f32>(0.5, 0.62, 0.40), t);
}
fn sky(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(0.5, 0.6, 0.7), t);
}
fn vangogh(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(0.5, 0.5, 0.5), vec3<f32>(0.0, 0.1, 0.3), t);
}
fn sunset(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(.5), vec3<f32>(0.5), vec3<f32>(1.1,1.,1.), vec3<f32>(0.1, 0.3, 0.5), t);
}
fn metal(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(0.8, 0.9, 0.9), vec3<f32>(0.7, 0.57, 0.57), t);
}
fn royal(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(0.7, 0.5, 0.7), vec3<f32>(0.35, 0.35, 0.9), t);
}
fn neon(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(1.0, 0.0, 1.0), vec3<f32>(0.3, 0.5, 0.0), t);
}

fn earth(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(0.9), vec3<f32>(0.47, 0.57, 0.67), t);
}
fn rainbow(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(1.0, 0.8, 0.9), vec3<f32>(0.0, 0.6, 0.3), t);
}
fn stripes(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(5.0), vec3<f32>(1.0, 1.0, 1.0), vec3<f32>(0.0), t);
}

fn slime(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(0.7), vec3<f32>(0.5, 0.6, 0.7), t);
    //return gradient(vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(1., 1., 1.), vec3<f32>(0.5, 0.2, .1), t);
}

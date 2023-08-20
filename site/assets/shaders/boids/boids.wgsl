// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

struct Sys {
    time: f32,
    resolution: vec2f,
    mouse: vec2f,
    aspect: vec2f
};

struct Particle {
  pos : vec2<f32>,
  vel : vec2<f32>,
  syn : vec2<f32>
}

struct SimParams {
  deltaT : f32,
  scale: f32,
  forces : vec4<f32>,
  distances : vec4<f32>
}

@group(0) @binding(0) var<uniform> params : SimParams;
@group(0) @binding(4) var<uniform> sys : Sys;
@group(0) @binding(1) var<storage, read> particlesA : array<Particle>;
@group(0) @binding(2) var<storage, read_write> particlesB : array<Particle>;


struct VertexOutput {
  @builtin(position) position : vec4<f32>,
  @location(0) uv : vec2<f32>,
  @location(1) state : vec2<f32>
}

struct VertexInput {
  @location(0) partPos : vec2<f32>,
  @location(1) partVel : vec2<f32>,
  @location(2) syn : vec2<f32>,
  @location(3) apos : vec2<f32>
}

@vertex
fn vert_main( input: VertexInput) -> VertexOutput {

  let angle = -atan2(input.partVel.x, input.partVel.y);
  let pos = vec2(
    (input.apos.x * cos(angle)) - (input.apos.y * sin(angle)),
    (input.apos.x * sin(angle)) + (input.apos.y * cos(angle))
  ) * params.scale; // scale
  
  var output : VertexOutput;
  output.position = vec4((pos/sys.aspect) + input.partPos, 0.0, 1.0);
  output.uv = input.apos;
  output.state = input.syn;
  return output;
}

fn color( phase: f32) -> f32 {
  return cos(phase) * .5 + .5;
}

@fragment
fn frag_main(input : VertexOutput) -> @location(0) vec4<f32> {
  let d = (1. - smoothstep(0.,.01, length( vec2(abs(input.uv.x) + .6,input.uv.y)) - .9 )  ) ;
  let phase = ((input.state.x * 3.14) + sys.time) * 10.;
  return vec4(vec3(1. - d) * vec3(color(phase+3.14) , color(phase + 1.52), color(phase )),1.0);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
  var index = GlobalInvocationID.x;

  var vPos = particlesA[index].pos;
  var vVel = particlesA[index].vel;
  var vSyn = particlesA[index].syn;
  var cSep = vec2(0.0);
  var cVel = vec2(0.0);
  var cPos = vec2(0.0);
  var cSyn = vec2(0.0);
  var cSepCount = 0u;
  var cVelCount = 0u;
  var cPosCount = 0u;
  var cSynCount = 0u;
  var pos : vec2<f32>;
  var vel : vec2<f32>;
  var syn : vec2<f32>;

  let pd = params.distances * params.scale;
  for (var i = 0u; i < arrayLength(&particlesA); i++) {
    if (i == index) { continue; }

    pos = particlesA[i].pos.xy;
    vel = particlesA[i].vel.xy;
    syn = particlesA[i].syn.xy;

    let d = distance(pos, vPos);
    // rule separtation - for every nearby boid, add a repulsion force
    if ((d < pd.x) ){
      var diff = normalize(vPos - pos);
      diff /= d; // weight by distance
      cSep += diff;
      cSepCount++;
    }

    // rule cohesion - for every nearby boid, calculate its average position
    if ((d < pd.y) ) {
      cPos += pos;
      cPosCount++;
    }

    // rule alignment - for every nearby boid, calculate its average velocity
    if ((d < pd.z) ) {
      cVel += vel;
      cVelCount++;
    }

    // rule phase sync - for every nearby boid, calculate its average phase
    if ((d < pd.w) ) {
      cSyn += syn;
      cSynCount++;
    }


  }

  // steering = desired - velocity * max_force

  // separation
  if (cSepCount > 0u) {
    cSep = (normalize( cSep / vec2(f32(cSepCount)) ) - vVel ) * params.forces.x;
  }
  // cohesion
  if (cPosCount > 0u) {
    cPos = (cPos / f32(cPosCount));
    cPos = (normalize(cPos - vPos) - vVel) * params.forces.y;
  }
  // alignment
  if (cVelCount > 0u) {
    cVel = ((cVel / f32(cVelCount)) - vVel) * params.forces.z;
  }
  // average phase 
  if (cSynCount > 0u) {
    cSyn = ((cSyn / f32(cSynCount)) - vSyn) * 0.01; // phase sync
  }

  // mouse attraction
  let cMouse = (normalize( ((2. * vec2(sys.mouse.x, 1. - sys.mouse.y)) - 1.) - vPos) - vVel) * params.forces.w;

  // add all contributions
  vVel += cSep + cVel + cPos + cMouse;

  // normalize velocity
  vVel = normalize(vVel) ;
  // scale simulation speed
  vPos = vPos + (vVel * params.deltaT);
  
  // Wrap around boundary
  if (vPos.x < -1.0) {
    vPos.x = 1.0;
  }
  if (vPos.x > 1.0) {
    vPos.x = -1.0;
  }
  if (vPos.y < -1.0) {
    vPos.y = 1.0;
  }
  if (vPos.y > 1.0) {
    vPos.y = -1.0;
  }
  // Write next state
  particlesB[index].pos = vPos;
  particlesB[index].vel = vVel;

  // if the sync is to small, ignore it, to create a level of uncertainty
  particlesB[index].syn = vSyn + select( cSyn, vec2(0.), abs(cSyn.x) < 0.001);
}
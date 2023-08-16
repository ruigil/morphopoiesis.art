// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

struct Sys {
    time: f32,
    resolution: vec2f,
    mouse: vec2f
};

struct Particle {
  pos : vec2<f32>,
  vel : vec2<f32>,
}

struct SimParams {
  deltaT : f32,
  scale: f32,
  forces : vec3<f32>,
  distances : vec3<f32>
}

struct Particles {
  particles : array<Particle>,
}

@binding(0) @group(0) var<uniform> params : SimParams;
@binding(4) @group(0) var<uniform> sys : Sys;
@binding(1) @group(0) var<storage, read> particlesA : Particles;
@binding(2) @group(0) var<storage, read_write> particlesB : Particles;


struct VertexOutput {
  @builtin(position) position : vec4<f32>,
  @location(0) uv : vec2<f32>,
  @location(4) color : vec4<f32>,
}

@vertex
fn vert_main(
  @location(0) particlePos : vec2<f32>,
  @location(1) particleVel : vec2<f32>,
  @location(2) apos : vec2<f32>
) -> VertexOutput {

  let angle = -atan2(particleVel.x, particleVel.y);
  let pos = vec2(
    (apos.x * cos(angle)) - (apos.y * sin(angle)),
    (apos.x * sin(angle)) + (apos.y * cos(angle))
  ) * params.scale; // scale
  
  var output : VertexOutput;
  output.position = vec4(pos + particlePos, 0.0, 1.0);
  output.uv = apos;
  output.color = vec4(
    1.0 - sin(angle + 1.0) - particleVel.y,
    pos.x * 100.0 - particleVel.y + 0.1,
    particleVel.x + cos(angle + 0.5),
    1.0);
  return output;
}

@fragment
fn frag_main(input : VertexOutput) -> @location(0) vec4<f32> {
  let d = (1. - smoothstep(0.,.01, length( vec2(abs(input.uv.x) + .7,input.uv.y)) - .9 )  ) ;
  return vec4(vec3(d),0.0);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
  var index = GlobalInvocationID.x;

  var vPos = particlesA.particles[index].pos;
  var vVel = particlesA.particles[index].vel;
  var cSep = vec2(0.0);
  var cVel = vec2(0.0);
  var cPos = vec2(0.0);
  var cSepCount = 0u;
  var cVelCount = 0u;
  var cPosCount = 0u;
  var pos : vec2<f32>;
  var vel : vec2<f32>;

  let pd = params.distances * params.scale;
  for (var i = 0u; i < arrayLength(&particlesA.particles); i++) {
    if (i == index) { continue; }

    pos = particlesA.particles[i].pos.xy;
    vel = particlesA.particles[i].vel.xy;

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

  // mouse attraction
  let cMouse = (normalize( ((2. * vec2(sys.mouse.x, 1. - sys.mouse.y)) - 1.) - vPos) - vVel) * 0.001;

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
  particlesB.particles[index].pos = vPos;
  particlesB.particles[index].vel = vVel;
}
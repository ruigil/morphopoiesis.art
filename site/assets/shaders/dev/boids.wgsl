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
  rule1Distance : f32,
  rule2Distance : f32,
  rule3Distance : f32,
  rule1Scale : f32,
  rule2Scale : f32,
  rule3Scale : f32,
}

struct Particles {
  particles : array<Particle>,
}

@binding(0) @group(0) var<uniform> params : SimParams;
@binding(4) @group(0) var<uniform> sys : Sys;
@binding(1) @group(0) var<storage, read> particlesA : Particles;
@binding(2) @group(0) var<storage, read_write> particlesB : Particles;
@binding(3) @group(0) var<storage, read_write> debug: array<vec4<f32>>;


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
  );
  
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
    // draw a a little circle for the active cell
  let d = (1. - smoothstep(0.,.001, length( vec2(abs(input.uv.x) + .015,input.uv.y)) - .03 )  ) ;
  return vec4(vec2(d),0.,1.);
}

// https://github.com/austinEng/Project6-Vulkan-Flocking/blob/master/data/shaders/computeparticles/particle.comp
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
  var index = GlobalInvocationID.x;

  var vPos = particlesA.particles[index].pos;
  var vVel = particlesA.particles[index].vel;
  var cMass = vec2(0.0);
  var cVel = vec2(0.0);
  var colVel = vec2(0.0);
  var cMassCount = 0u;
  var cVelCount = 0u;
  var pos : vec2<f32>;
  var vel : vec2<f32>;

  debug[0] = vec4<f32>(f32(arrayLength(&particlesA.particles)),sys.time, params.rule2Distance, params.rule3Distance);

  for (var i = 0u; i < arrayLength(&particlesA.particles); i++) {
    if (i == index) {
      continue;
    }

    pos = particlesA.particles[i].pos.xy;
    vel = particlesA.particles[i].vel.xy;
    if (distance(pos, vPos) < params.rule1Distance) {
      cMass += pos;
      cMassCount++;
    }
    if (distance(pos, vPos) < params.rule2Distance) {
      colVel -= pos - vPos;
    }
    if (distance(pos, vPos) < params.rule3Distance) {
      cVel += vel;
      cVelCount++;
    }
  }
  if (cMassCount > 0u) {
    cMass = (cMass / vec2(f32(cMassCount))) - vPos;
  }
  if (cVelCount > 0u) {
    cVel /= f32(cVelCount);
  }
  vVel += (cMass * params.rule1Scale) + (colVel * params.rule2Scale) + (cVel * params.rule3Scale);

  // clamp velocity for a more pleasing simulation
  vVel = normalize(vVel) * clamp(length(vVel), 0.0, 0.01);
  // kinematic update
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
  // Write back
  particlesB.particles[index].pos = vPos;
  particlesB.particles[index].vel = vVel;
}
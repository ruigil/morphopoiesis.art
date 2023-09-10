// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

struct Sys {
    time: f32,
    resolution: vec2<f32>,
    mouse: vec2<f32>,
    aspect: vec2<f32>,
};

struct Simulation {
  size: vec2<f32>,
  gravity: f32,
  density: f32,
  dt: f32,
  iterCount: u32
}


struct FluidCell {
  velocity: vec2<f32>,
  velocity1: vec2<f32>,
  pressure: f32,
  density: f32,
  kind: f32,
  divergence: f32,
  n: vec4<f32>,
  cell: vec2<u32>
}

struct Debug {
  velocity : vec4<f32>,
  pressure : f32,
  mouse : vec2<u32>,
  divergence : f32,
  n: vec4<f32>,
  cell: vec2<u32>,
  dt: f32
}

struct VertexInput {
    @location(0) pos: vec2<f32>,
    @builtin(instance_index) instance: u32
};

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) state: f32
}

@group(0) @binding(0) var<uniform> sys : Sys;
@group(0) @binding(1) var<uniform> sim : Simulation;
@group(0) @binding(2) var<storage, read> fluidA : array<FluidCell>;
@group(0) @binding(3) var<storage, read_write> fluidB : array<FluidCell>;
@group(0) @binding(4) var<storage, read_write> debug : Debug;

@vertex
fn vertMain( input: VertexInput) -> VertexOutput {
  
    let i = f32(input.instance); 
    let cell = vec2f(i % sim.size.x, floor(i / sim.size.y) );
    let state = fluidA[input.instance].kind;

    // The cell(0,0) is a the top left corner of the screen.
    // The cell(size.x,size.y) is a the bottom right corner of the screen.
    let cellOffset = vec2(cell.x, sim.size.y - cell.y - 1.) / sim.size * 2.; 
    let cellPos = (input.pos + 1.) / sim.size - 1. + cellOffset;

    var output: VertexOutput;
    output.pos = vec4f(cellPos / sys.aspect, 0., 1.);
    output.state = state;
    return output;
}

@fragment
fn fragMain(input : VertexOutput) -> @location(0) vec4<f32> {
  return vec4( vec3(input.state) ,1.0) ;
}



fn index( x: u32, y: u32 ) -> u32 {

  let coord = (vec2<u32>(x,y) + vec2<u32>(sim.size)) % vec2<u32>(sim.size);
  return x  + y * u32(sim.size.x);
}

fn fluid( c: vec2<u32> ) -> bool {
  return !(c.x == 0u || c.x == u32(sim.size.x) - 1u || c.y == 0u || c.y == u32(sim.size.y) - 1u);
}

@compute @workgroup_size(8, 8)
fn computeFreeDivergence(@builtin(global_invocation_id) cell : vec3<u32>) {

  if (cell.x == 0u || cell.y == 0u) { return; };
  if (!fluid(cell.xy)) { return; };

  let sx0 = fluidB[ index(cell.x - 1u, cell.y) ].kind;
  let sx1 = fluidB[ index(cell.x + 1u, cell.y) ].kind;
  let sy0 = fluidB[ index(cell.x, cell.y - 1u) ].kind;
  let sy1 = fluidB[ index(cell.x, cell.y + 1u) ].kind;
  
  let s = sx0 + sx1 + sy0 + sy1;
  if (s == 0.) { return; };

  let divergence =  fluidB[ index(cell.x + 1u, cell.y) ].velocity.x - 
                    fluidB[ index(cell.x, cell.y) ].velocity.x +
                    fluidB[ index(cell.x, cell.y + 1u) ].velocity.y -
                    fluidB[ index(cell.x, cell.y) ].velocity.y;

	let p = 1.9 * ((-1. * divergence) / s);
	//p *= 1.9; // overRelaxation;
  let cp = (sim.density * (1. / sim.size.y)) / sim.dt;
  fluidB[ index(cell.x, cell.y) ].pressure += cp * p;

  fluidB[ index(cell.x, cell.y) ].divergence = divergence;

  // staggered grid update
  fluidB[ index(cell.x, cell.y) ].velocity -= vec2<f32>(sx0,sy0) * p;
  fluidB[ index(cell.x + 1u, cell.y) ].velocity.x += sx1 * p;
  fluidB[ index(cell.x, cell.y + 1u) ].velocity.y += sy1 * p;


  
  let m = vec2<u32>(floor(sys.mouse * sim.size));
  fluidB[ index(cell.x, cell.y) ].velocity1 = vec2<f32>(fluidB[ index(cell.x + 1u, cell.y) ].velocity.x,fluidB[ index(cell.x, cell.y + 1u) ].velocity.y);
  fluidB[ index(cell.x, cell.y) ].n = vec4(sx0,sy0,sx1,sy1);
  fluidB[ index(cell.x, cell.y) ].cell = cell.xy;

  debug.mouse = m;
  debug.pressure = fluidB[ index(m.x, m.y) ].pressure;
  debug.velocity = vec4<f32>(fluidB[ index(m.x, m.y) ].velocity, fluidB[ index(m.x, m.y) ].velocity1);
  debug.divergence = fluidB[ index(m.x, m.y) ].divergence;
  debug.n = fluidB[ index(m.x, m.y) ].n;
  debug.cell = (vec2<u32>(m.x+1u,m.y+1u) + vec2<u32>(sim.size)) % vec2<u32>(sim.size);
  debug.dt = cp;
}

@compute @workgroup_size(8, 8)
fn computeFD(@builtin(global_invocation_id) cell : vec3<u32>) {



  fluidB[ index(cell.x, cell.y) ].kind = f32(fluid(cell.xy));

  // add external forces
  if (fluid(cell.xy) && fluid(vec2<u32>(cell.x, cell.y - 1u)) ) { 
    fluidB[ index(cell.x, cell.y) ].velocity += vec2<f32>(0., sim.gravity * sim.dt) ;
  };
  fluidB[ index(cell.x, cell.y) ].pressure = 0.;

}


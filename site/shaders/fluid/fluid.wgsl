// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

struct Sys {
    time: f32,
    resolution: vec2<f32>,
    mouse: vec4<f32>,
    aspect: vec2<f32>
};

struct Sim {
  size: vec2<f32>,
  dt: f32
};

struct Cell {
  velocity: vec2<f32>,
  pressure: f32,
  dye: vec3<f32>,
  solid: f32
};

struct VertexInput {
    @location(0) pos: vec2<f32>,
    @builtin(instance_index) instance: u32
};

struct VertexOutput {
    @builtin(position) pos: vec4<f32>,
    @location(0) state: vec3<f32>
};

@group(0) @binding(0) var<uniform> sys : Sys;
@group(0) @binding(1) var<uniform> sim : Sim;
@group(0) @binding(2) var<storage, read> fluidA : array<Cell>;
@group(0) @binding(3) var<storage, read_write> fluidB : array<Cell>;
@group(0) @binding(4) var<storage, read_write> divergence : array<f32>;

fn getIndex(cell : vec2<f32>) -> u32 { 
    return u32( (cell.y % sim.size.y) * sim.size.x + (cell.x % sim.size.x) );
}

@vertex
fn vertMain( input: VertexInput) -> VertexOutput {
  
    let i = f32(input.instance); 
    let cell = vec2f(i % sim.size.x, floor(i / sim.size.x) );

    let c1 = fluidA[getIndex( vec2(cell.x + input.pos.x,  cell.y) )].dye;
    let c2 = fluidA[getIndex( vec2(cell.x + input.pos.x, cell.y - input.pos.y) )].dye;
    let c3 = fluidA[getIndex( vec2(cell.x , cell.y - input.pos.y) )].dye;
    let c4 = fluidA[input.instance].dye;
     
    // multisample the state to reduce aliasing
    let state = (c1 + c2 + c3 + c4) / 4.0;

    let cellSize = 2. / sim.size.xy ;
    // The cell(0,0) is a the top left corner of the screen.
    // The cell(uni.size.x,uni.size.y) is a the bottom right corner of the screen.
    let cellOffset =  vec2(cell.x, sim.size.y - 1. - cell.y) * cellSize + (cellSize * .5) ;
    // input.pos is in the range [-1,1]...[1,1] and it's the same coord system as the uv of the screen
    let cellPos =  (input.pos  / sim.size.xy) + cellOffset - 1.; 

    var output: VertexOutput;
    output.pos = vec4f(cellPos, 0., 1.);
    output.state = state;
    return output;
}

@fragment
fn fragMain(input : VertexOutput) -> @location(0) vec4<f32> {
  return vec4( 1. - input.state ,1.0) ;
}

// index the fluid array, keeping the coordinates in the simulation space
fn ix( x: i32, y: i32 ) -> u32 {
  let s = vec2<i32>(sim.size);

  let r: vec2<u32> = vec2<u32>( 
    select( u32(x % s.x), u32((x % s.x) + s.x), x < 0), 
    select( u32(y % s.y), u32((y % s.y) + s.y), y < 0) 
  );

  return r.x + r.y * u32(sim.size.x);
}

// advection of the velocity field and dye
@compute @workgroup_size(8, 8)
fn advect(@builtin(global_invocation_id) cell : vec3<u32>) {

  // cell coordinates
  let cc = vec2<i32>( cell.xy );

  // get the velocity at the current cell
  let v = fluidA[ ix(cc.x,cc.y) ].velocity;
  
  // advection coordinates
  let acc = vec2<f32>(cc) - (v * sim.dt);
  // advection cell
  let acell = vec2<i32>( floor(acc) );
  // advection cell delta
  let acd = acc - vec2<f32>(acell);

  // we are going to do a bilinear interpolation of the 4 cells around the advection coordinates
  let c00 = fluidA[ix(acell.x, acell.y)];
  let c01 = fluidA[ix(acell.x , acell.y + 1)];
  let c10 = fluidA[ix(acell.x + 1, acell.y )];
  let c11 = fluidA[ix(acell.x + 1, acell.y + 1)];

  // bilinear interpolation of the velocity field
  let velocity =  mix(mix(c00.velocity,c10.velocity,acd.xx),mix(c01.velocity,c11.velocity,acd.xx),acd.yy);

  // bilinear interpolation of the dye
  let dye =  mix(mix(c00.dye,c10.dye,acd.xxx),mix(c01.dye,c11.dye,acd.xxx),acd.yyy);

  // write the result to the output buffer
  fluidB[ ix(cc.x,cc.y) ].velocity = velocity * .999; // diffuse a bit
  fluidB[ ix(cc.x,cc.y) ].dye = dye * .999; // diffuse a bit
}

// add forces to the velocity field and some dye
@compute @workgroup_size(8, 8)
fn addForces(@builtin(global_invocation_id) cell : vec3<u32>) {

  // cell coordinates
  let cc = vec2<i32>( cell.xy );

  // add some dye and velocity to the center of the screen
  let center = i32(sim.size.x / 2.);
  if ((cc.y == i32(sim.size.y - 20.) ) && (cc.x >= center - 25) && (cc.x < center + 25)) {
    fluidB[ ix(cc.x,cc.y) ] = Cell( vec2<f32>(0., -170.), 0., vec3<f32>(1.), 0. );
    fluidB[ ix(cc.x,cc.y - 1) ] = Cell( vec2<f32>(0., -170.), 0., vec3<f32>(1.), 0. );
    fluidB[ ix(cc.x,cc.y - 2) ] = Cell( vec2<f32>(0., -170.), 0., vec3<f32>(1.), 0. );
  }

  // add some dye and velocity to a radius of the mouse position
  let mouse = (sys.mouse.xy  * sim.size);
  let d = length(vec2<f32>(cc.xy) - mouse.xy);

  if ((d < 20.) && (fluidB[ ix(cc.x,cc.y) ].solid == 0.)) {    
    let force = (sys.mouse.xy - sys.mouse.zw) * sim.size * 100.;
    let color = sin(sys.time + vec3<f32>(0., 1.57, 3.14)) * .5 + .5;
    let v = exp(-d/20.);
    fluidB[ ix(cc.x,cc.y) ] = Cell( v * force, 0., v * color, 0. );
  }

}

// compute the divergence created by the current velocity field
@compute @workgroup_size(8, 8)
fn computeDivergence(@builtin(global_invocation_id) cell : vec3<u32>) {

  // cell coordinates
  let cc = vec2<i32>( cell.xy );

  let c = fluidB[ ix(cc.x,cc.y) ];
  if (c.solid == 1. ) { return; };

  // get the left, right, top and bottom cells
  let lc = fluidB[ ix(cc.x - 1, cc.y) ];
  let rc = fluidB[ ix(cc.x + 1, cc.y) ];
  let bc = fluidB[ ix(cc.x, cc.y - 1) ];
  let tc = fluidB[ ix(cc.x, cc.y + 1) ];
  
  // boundary conditions
  let l = select(lc.velocity.x, -c.velocity.x, lc.solid == 1.);
  let r = select(rc.velocity.x, -c.velocity.x, rc.solid == 1.);
  let t = select(tc.velocity.y, -c.velocity.y, tc.solid == 1.);
  let b = select(bc.velocity.y, -c.velocity.y, bc.solid == 1.);

  divergence[ ix(cc.x,cc.y) ] = (r - l + t - b) * .5;
}

// compute the pressure field, using the divergence as a source
// this is a Gauss-Seidel relaxation, and it is solved iteratively
// we use the Jacobi method, which is a bit slower but more stable
@compute @workgroup_size(8, 8)
fn pressureSolver(@builtin(global_invocation_id) cell : vec3<u32>) {

  // cell coordinates
  let cc = vec2<i32>( cell.xy );

  let c = fluidA[ ix(cc.x,cc.y) ];
  if (c.solid == 1. ) { return; };

  // get the left, right, top and bottom cells
  let lc = fluidA[ ix(cc.x - 1, cc.y) ];
  let rc = fluidA[ ix(cc.x + 1, cc.y) ];
  let bc = fluidA[ ix(cc.x, cc.y - 1) ];
  let tc = fluidA[ ix(cc.x, cc.y + 1) ];
  
  // boundary conditions
  let l = select(lc.pressure, c.pressure, lc.solid == 1.);
  let r = select(rc.pressure, c.pressure, rc.solid == 1.);
  let t = select(tc.pressure, c.pressure, tc.solid == 1.);
  let b = select(bc.pressure, c.pressure, bc.solid == 1.);

  fluidB[ ix(cc.x,cc.y) ].pressure = (l + r + t + b - divergence[ ix(cc.x,cc.y) ] ) * .25;
}

// subtract the pressure gradient from the velocity field
// to make it divergence free and the fluid incompressible
@compute @workgroup_size(8, 8)
fn subtractPressureGradient(@builtin(global_invocation_id) cell : vec3<u32>) {

  // cell coordinates
  let cc = vec2<i32>( cell.xy );

  let c = fluidA[ ix(cc.x,cc.y) ];
  if (c.solid == 1. ) { return; };

  // get the left, right, top and bottom cells
  let lc = fluidA[ ix(cc.x - 1, cc.y) ].pressure;
  let rc = fluidA[ ix(cc.x + 1, cc.y) ].pressure;
  let bc = fluidA[ ix(cc.x, cc.y - 1) ].pressure;
  let tc = fluidA[ ix(cc.x, cc.y + 1) ].pressure;

  fluidB[ ix(cc.x,cc.y) ].velocity -= vec2<f32>( (rc - lc) * .5, (tc - bc) * .5);
}

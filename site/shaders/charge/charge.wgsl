// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

struct Sys {
    time: f32,
    resolution: vec2<f32>,
    mouse: vec4<f32>,
    aspect: vec2<f32>
};

struct Sim {
  size: vec2<u32>,
  numCharges: f32,
  damping: f32,
  dt: f32
};

struct Charge {
  charge: f32,       // Electric charge (rho)
  pos: vec2<f32>,
  vel: vec2<f32>
};

struct Cell {
  potential: f32,    // Electric potential (phi)
  charge: f32,
  field: vec2<f32>,       // Electric field
};



struct VertexInput {
    @location(0) pos: vec2<f32>,
    @builtin(instance_index) instance: u32
};

struct Debug {
    coord: vec2<u32>,
    field: vec2<f32>,
    pos: vec2<f32>,
    vel: vec2<f32>,
    charge: f32,
    potential: f32,
    max: f32,
    min: f32,
}

struct Range {
    min: f32,
    max: f32,
};

struct VertexOutput {
    @builtin(position) pos: vec4<f32>,
    @location(0) uv: vec2<f32>,
    @location(1) potential: f32,
    @location(2) field: vec2<f32>,
    @location(3) potentialRange: vec2<f32>,
    @location(4) charge: f32
};

@group(0) @binding(0) var<uniform> sys : Sys;
@group(0) @binding(1) var<uniform> sim : Sim;
@group(0) @binding(2) var<storage, read> cellsA : array<Cell>;
@group(0) @binding(3) var<storage, read_write> cellsB : array<Cell>;
@group(0) @binding(4) var<storage, read_write> charges : array<Charge>;
@group(0) @binding(5) var<storage, read> potentialRangeValue : Range;
@group(0) @binding(6) var<storage, read_write> potentialRange : Range;
@group(0) @binding(7) var<storage, read_write> partialPotential: array<Range>;
@group(0) @binding(8) var<storage, read_write> debug : Debug;



@vertex
fn vertMain(input: VertexInput) -> VertexOutput {
    let i = input.instance; 
    let cell = vec2f(f32(i % sim.size.x), f32(i / sim.size.x));

    let cellData = cellsA[i];

    let cellSize = 2. / vec2f(sim.size.xy);
    // The cell(0,0) is at the top left corner of the screen.
    // The cell(sim.size.x, sim.size.y) is at the bottom right corner of the screen.
    let cellOffset = vec2(cell.x, f32(sim.size.y) - 1. - cell.y) * cellSize + (cellSize * .5);
    // input.pos is in the range [-1,1]...[1,1] and it's the same coord system as the uv of the screen
    let cellPos = (input.pos / vec2f(sim.size.xy)) + cellOffset - 1.;

    
    var output: VertexOutput;
    output.pos = vec4f(cellPos, 0., 1.);
    output.uv = input.pos.xy;
    output.potential = cellData.potential;
    output.field = cellData.field;
    output.potentialRange = vec2<f32>(potentialRangeValue.max,potentialRangeValue.min);
    output.charge = cellData.charge;
    return output;
}

@fragment
fn fragMain(input: VertexOutput) -> @location(0) vec4<f32> {
    
    // we use the potential range to create a normalized potential between red negative charges and blue positive charges.
    let normPotential = ((input.potential - input.potentialRange.y) / (input.potentialRange.x - input.potentialRange.y + .001));

    var color = mix(vec3(.7,0.2,0.),vec3(0.,0.2,.7), normPotential );
    
    let fieldStrength = length(input.field);
    
    // we use the field angle to color the phase
    let angle = atan2(input.field.y, input.field.x);
    let fieldPhase = hsv2rgb( vec3((angle+3.14)/6.28, .5, min(1.,fieldStrength * 7.) ));
    color = mix(fieldPhase, color, min(1.,fieldStrength*2.) );

    return vec4f(color, 1.0);
}



// we use Gauss-Seidel relaxation which is 2x faster than jacobi and uses the same field array
// but we still need two arrays because we need one for read in the vertex shader
// so here we just copy the last field to the next field
@compute @workgroup_size(16, 16)
fn initField(@builtin(global_invocation_id) cell: vec3<u32>) {
    // keep the simulation in bounds [0, size]
    if (any(cell.xy >= sim.size)) { return; } 
    
    let cc = vec2<i32>(cell.xy);
    // here we just copy the oldValues into the new ones and reset the charge.
    cellsB[idx(cc.x, cc.y)] = cellsA[idx(cc.x, cc.y)];
    cellsB[idx(cc.x, cc.y)].charge = 0.;
    // we don't reset the potential because we don't have so many iterations of 
    // the potential solver per frame so we let it converge overal several frames....
    // cellsB[idx(cc.x, cc.y)].potential = 0.;
}

// deposit charges in the field
@compute @workgroup_size(256)
fn depositCharges(@builtin(global_invocation_id) c: vec3<u32>) {

    if (c.x > u32(sim.numCharges)) { return; }

    // let the first charge to be moved by the mouse
    let m = sys.mouse.xy * vec2f(sim.size);
    let pos = select(charges[c.x].pos,m, c.x == 0);

    // charge integer coordinates
    let cc = vec2i(pos);
    // charge fractional coordinates
    let cf = fract(pos);

    let charge = charges[c.x].charge;
    
    // Calculate the weights for a cloud-in cell distribution of charge
    let w00 = (1. - cf.x) * (1. - cf.y);
    let w10 = cf.x * (1. - cf.y);
    let w01 = (1. - cf.x) * cf.y;
    let w11 = cf.x * cf.y;
    // deposit the charge
    cellsB[idx(cc.x,cc.y)].charge += (w00 * charge) ; 
    cellsB[idx(cc.x + 1,cc.y)].charge += (w10 * charge); 
    cellsB[idx(cc.x,cc.y + 1)].charge += (w01 * charge); 
    cellsB[idx(cc.x + 1,cc.y + 1)].charge += (w11 * charge);
}

// update charges position
@compute @workgroup_size(256)
fn updateCharges(@builtin(global_invocation_id) c: vec3<u32>) {
    if (c.x > u32(sim.numCharges)) { return; }

    var pos = charges[c.x].pos;

    // charge integer coordinates
    let cc = vec2i(pos);
    // charge fractional coordinates
    let cf = fract(pos);

    let charge = charges[c.x].charge;
    var velocity = charges[c.x].vel;
    
    // Calculate the weights for a cloud-in cell reading of field
    let w00 = (1. - cf.x) * (1. - cf.y);
    let w10 = cf.x * (1. - cf.y);
    let w01 = (1. - cf.x) * cf.y;
    let w11 = cf.x * cf.y;

    // read the field
    let field = cellsB[idx(cc.x,cc.y)].field * w00 + 
                cellsB[idx(cc.x + 1,cc.y)].field * w10 + 
                cellsB[idx(cc.x,cc.y + 1)].field * w01 +
                cellsB[idx(cc.x + 1,cc.y + 1)].field * w11; 

    // caculate the force, velocity and position change based on he charge and field values.
    let force = charge * field; // / mass = 1
    velocity += force;
    velocity *= sim.damping; // damping
    //velocity = normalize(velocity);
    pos += velocity * sim.dt; // dt 

    // bounds check
    pos.x = select(pos.x, pos.x + f32(sim.size.x) ,pos.x < 0.);
    pos.x = select(pos.x, pos.x - f32(sim.size.x) ,pos.x >= f32(sim.size.x));
    pos.y = select(pos.y, pos.y + f32(sim.size.y) ,pos.y < 0.);
    pos.y = select(pos.y, pos.y - f32(sim.size.y) ,pos.y >= f32(sim.size.y));

    charges[c.x].pos = pos;
    charges[c.x].vel = velocity;
}

// Solve Poisson's equation for electric potential using Gauss-Seidel relaxation
@compute @workgroup_size(16, 16)
fn solvePotential(@builtin(global_invocation_id) cell: vec3<u32>) {
    // keep the simulation in bounds [0,size]
    if (any(cell.xy >= sim.size)) { return; } 

    // cell coordinates
    let cc = vec2<i32>(cell.xy);
    
    // Get the current cell
    let c = cellsB[idx(cc.x, cc.y)];
    
    // Get the left, right, top and bottom cells
    let lc = cellsB[idx(cc.x - 1, cc.y)].potential;
    let rc = cellsB[idx(cc.x + 1, cc.y)].potential;
    let bc = cellsB[idx(cc.x, cc.y - 1)].potential;
    let tc = cellsB[idx(cc.x, cc.y + 1)].potential;
    
    // Gauss-Seidel relaxation step for Poisson's equation: ∇²φ = -ρ
    // The discretized form is: φ[i,j] = (φ[i+1,j] + φ[i-1,j] + φ[i,j+1] + φ[i,j-1] + h²ρ[i,j]) / 4
    // where h is the grid spacing (we use h=1 for simplicity)
    let h2 = 1.0; // dx * dy
    let potential = (lc + rc + tc + bc + h2 * c.charge) * 0.25;

    cellsB[idx(cc.x, cc.y)].potential = potential;
}

var<workgroup> range: array<Range, 256>;
const infinity = 0x1.fffffep+127;

// Compute electric field as the negative gradient of potential
@compute @workgroup_size(16, 16)
fn computeField(
        @builtin(global_invocation_id) cell: vec3<u32>,
        @builtin(local_invocation_id) local_id: vec3<u32>,
        @builtin(workgroup_id) workgroup_id: vec3<u32>,
        @builtin(num_workgroups) num_workgroups: vec3<u32>) {

    // Convert 2D local ID to 1D index for shared memory access
    let local_index = local_id.x + local_id.y * 16u;
    
    // Initialize min,max with extreme values 
    range[local_index] = Range(infinity,-infinity);  // +∞, -∞

    if (any(cell.xy < sim.size)) {
        let cc = vec2<i32>(cell.xy);
        let potential = cellsB[idx(cc.x, cc.y)].potential;
        let m = vec2<u32>(sys.mouse.xy * vec2f(sim.size));

        debug.coord = m;

        if ((m.x == cell.x) && (m.y == cell.y)) {
            debug.potential = potential;
            debug.charge = cellsB[idx(cc.x, cc.y)].charge;
            debug.field = cellsB[idx(cc.x, cc.y)].field;
        }

        let wh = vec2(1.); // cell width and height
        // Compute electric field using central differences: E = -∇φ
        let ex = -(cellsB[idx(cc.x + 1, cc.y)].potential - cellsB[idx(cc.x - 1, cc.y)].potential) / (2. * wh.x);
        let ey = -(cellsB[idx(cc.x, cc.y + 1)].potential - cellsB[idx(cc.x, cc.y - 1)].potential) / (2. * wh.y);
            
        // Store the field components
        cellsB[idx(cc.x, cc.y)].field = vec2<f32>(ex,ey);
        range[local_index] = Range(potential,potential);
    }

    workgroupBarrier();
    
    // Parallel reduction within workgroup - we use 256 threads total
    for (var stride = 128u; stride > 0u; stride >>= 1u) {
        if (local_index < stride) {
            range[local_index].min = min(range[local_index].min, range[local_index + stride].min);
            range[local_index].max = max(range[local_index].max, range[local_index + stride].max);
        }
        workgroupBarrier();
    }

    // First thread writes this workgroup's result
    if (local_index == 0u) {
        // Compute 1D workgroup index for output
        let wg_index = workgroup_id.x + workgroup_id.y * num_workgroups.x;
        partialPotential[wg_index] = range[0];
    }
}


@compute @workgroup_size(256, 1)  
fn reducePotentialRange(
        @builtin(global_invocation_id) global_id: vec3<u32>,
        @builtin(local_invocation_id) local_id: vec3<u32>,
        @builtin(workgroup_id) workgroup_id: vec3<u32>,
        @builtin(num_workgroups) num_workgroups: vec3<u32>) {
    
    // Convert 2D local ID to 1D index
    let local_index = local_id.x ;
    
    // Calculate global linear index
    let global_index = global_id.x;

    // Initialize min,max with extreme values 
    range[local_index] = Range(infinity,-infinity);  // +∞, -∞
    
    let num_partials = arrayLength(&partialPotential);
    
    if (global_index < num_partials) {
        range[local_index].min = partialPotential[global_index].min;
        range[local_index].max = partialPotential[global_index].max;
    } 
    
    workgroupBarrier();
    
    for (var stride = 128u; stride > 0u; stride >>= 1u) {
        if (local_index < stride) {
            range[local_index].min = min(range[local_index].min, range[local_index + stride].min);
            range[local_index].max = max(range[local_index].max, range[local_index + stride].max);
        }
        workgroupBarrier();
    }
    
    if (local_index == 0u) {
        partialPotential[workgroup_id.x] = range[0];
    }
    
    // serial reduction for the last ones...
    if ((workgroup_id.x == num_workgroups.x - 1) && (local_index == 0u) ) {
        var finalRange = Range(infinity,-infinity);
        for (var i=0u; i < num_workgroups.x; i++) {
            finalRange.min = min(finalRange.min,partialPotential[i].min);
            finalRange.max = max(finalRange.max,partialPotential[i].max);
        }
        debug.min = finalRange.min;
        debug.max = finalRange.max;
        // Write final result
        potentialRange = finalRange;
    }
}

// Index the cells array, in a wrap around mode, 
// keeping the coordinates in the simulation space [0,size]
fn idx(x: i32, y: i32) -> u32 {
    let s = vec2i(sim.size);
    let r = vec2i((x + s.x) % s.x, (y + s.y) % s.y); 
    return u32(r.x + r.y * s.x);
}

// converts an HSV value to RGB
fn hsv2rgb(c :vec3f) -> vec3f {
    let k = vec4f(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    let p = abs(fract(c.xxx + k.xyz) * 6.0 - k.www);
    return c.z * mix(k.xxx, clamp(p - k.xxx, vec3(0.0), vec3(1.0)), c.y);
}

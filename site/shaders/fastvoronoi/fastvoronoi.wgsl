// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

struct Sys {
    frame: u32,
    time: f32,
    resolution: vec2<f32>,
    mouse: vec4<f32>,
    buttons: vec3<f32>,
    aspect: vec2<f32>
};

struct SimParams {
  size: vec2<u32>,
  seeds: f32,
  steps: u32
}

struct Seed {
  pos : vec2<f32>,
  vel : vec2<f32>,
  kind: f32
}

struct Cell {
    coord: vec2<u32>,
    distance: f32,
    kind: f32,
    step: u32
}

struct VertexInput {
    @location(0) pos: vec2<f32>,
    @builtin(instance_index) instance: u32
};

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) distance: f32,
    @location(1) kind: f32
}

@group(0) @binding(0) var<uniform> sys : Sys;
@group(0) @binding(1) var<uniform> params : SimParams;
@group(0) @binding(2) var<storage, read> cellCurrent : array<Cell>;
@group(0) @binding(3) var<storage, read_write> cellNext : array<Cell>;
@group(0) @binding(4) var<storage, read_write> seeds : array<Seed>;

@vertex
fn vertMain( input: VertexInput) -> VertexOutput {
  
    let i = input.instance; 
    let cell = vec2f(f32(i % params.size.x), f32(i / params.size.x) );
    let distance = cellCurrent[input.instance].distance;
    let kind = cellCurrent[input.instance].kind;

    let cellSize = 2. / vec2<f32>(params.size.xy) ;
    // The cell(0,0) is a the top left corner of the screen.
    // The cell(params.size.x,params.size.y) is a the bottom right corner of the screen.
    let cellOffset =  vec2(f32(cell.x), f32(params.size.y) - 1. - f32(cell.y)) * cellSize + (cellSize * .5) ;
    // input.pos is in the range [-1,1]...[1,1] and it's the same coord system as the uv of the screen
    let cellPos =  (input.pos  / vec2f(params.size.xy)) + cellOffset - 1.; 

    var output: VertexOutput;
    output.pos = vec4f(cellPos, 0., 1.);
    output.distance = distance;
    output.kind = kind;
    return output;
}

@fragment
fn fragMain(input : VertexOutput) -> @location(0) vec4<f32> {
    
    let d = exp( 10. * -(input.distance/ f32(max(params.size.x,params.size.y)) ) );
    let k = input.distance/(input.kind+1);
    let w = .5 + .5 * cos(k);
    
    return vec4( tosRGB( hsv2rgb(vec3f( k/(input.distance+1), .8,  d * w)) ), 1.0) ;
}

@compute @workgroup_size(8, 8)
fn initCells(@builtin(global_invocation_id) cell : vec3<u32>) {
    // keep the simulation in the range [0,size]
    if (any(cell.xy >= vec2<u32>(params.size))) { return; }
    
    cellNext[ cell.y * u32(params.size.x) + cell.x ] = Cell(vec2(10000), 1000., 0., params.steps);
}

@compute @workgroup_size(64)
fn computeSeeds(@builtin(global_invocation_id) id : vec3<u32>) {

    let i = id.x;
    if (i >= u32(params.seeds)) { return; }

    let seed = seeds[i];
    var pos = seed.pos + seed.vel *.01;

    //wrap around boundary condition [-1,1]
    pos = fract( (pos + 1.) * .5) * 2. - 1.;
    seeds[i].pos = pos;

    let current = vec2<u32>( floor( (pos + 1.)  * .5 * vec2f(params.size) ) );
    cellNext[current.y * params.size.x + current.x ] = Cell(current, 0., seed.kind, params.steps);
}

// fill the cells with the closest seed neighbour in a log2 step size of the screen 
// this compute function is called n instances (log 2 step) each frame to fill the entire screen
@compute @workgroup_size(8, 8)
fn jumpFlood(@builtin(global_invocation_id) cell : vec3<u32>) {
    // keep the simulation in the range [0,size]
    if any(cell.xy >= params.size) { return; }

    let index = cell.y * params.size.x + cell.x;
    let current = cellNext[ index ];
    let size = vec2i(params.size);

    var bestSeed = current;
    for(var x = -1; x <= 1; x++) {
        for(var y = -1; y <= 1; y++) {
            // wrap arround coordinates. 
            let offset =  (vec2i(cell.xy) + (vec2(x,y) * i32(current.step)) + (2*size)) % (size);
            let cellNeighbour = cellNext[ offset.y * size.x + offset.x ];

            // if we find a neighbour with a closer seed we switch the current cell for the new seed
            let dist = distance(vec2f(cell.xy),vec2f(cellNeighbour.coord));
            if (dist < bestSeed.distance) {
                bestSeed = cellNeighbour;
                bestSeed.distance = dist;
            }
        }
    }

    cellNext[ index ] = bestSeed;
    cellNext[ index ].step = max(1, current.step >> 1);
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
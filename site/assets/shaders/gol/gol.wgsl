// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

struct Sys {
    time: f32,
    resolution: vec2f,
    mouse: vec2f
};

struct Uni {
    size: vec2f,
    fcolor: vec3f,
    bcolor: vec3f
}

@group(0) @binding(0) var<uniform> uni: Uni;
@group(0) @binding(4) var<uniform> sys: Sys;
@group(0) @binding(1) var<storage> current: array<u32>;
@group(0) @binding(2) var<storage, read_write> next: array<u32>;

struct VertexInput {
    @location(0) pos: vec2f,
    @builtin(instance_index) instance: u32
};

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) cell: vec2f,
    @location(1) uv: vec2f,
    @location(2) state: f32
}

@vertex
fn vertexMain(input : VertexInput) -> VertexOutput {
    let i = f32(input.instance); 
    let cell = vec2f(i % uni.size.x, floor(i / uni.size.y) );
    let state = f32(current[input.instance]); 

    let cellOffset = cell / uni.size * 2.; 
    let statePos = (input.pos + 1.) / uni.size - 1. + cellOffset;

    var output: VertexOutput;
    output.pos = vec4f(statePos, 0., 1.);
    output.uv = vec2f(input.pos.xy);
    output.cell = cell;
    output.state = state;
    return output;
}

@fragment
fn fragmentMain( input: VertexOutput) -> @location(0) vec4f {

    // a little circle
    let d = (1. - smoothstep(0.,.1, length(input.uv) - .9 )  )  * input.state;

    return vec4f( mix(uni.bcolor/255.,uni.fcolor/255.,d), 1.);
}      

fn getIndex(x: u32, y: u32) -> u32 {
    return (y % u32(uni.size.y)) * u32(uni.size.x) + (x % u32(uni.size.x));
}

fn getCell(x: u32, y: u32) -> u32 {
  return current[getIndex(x, y)];
}

fn countNeighbors(x: u32, y: u32) -> u32 {
  return getCell(x - 1u, y - 1u) + getCell(x, y - 1u) + getCell(x + 1u, y - 1u) + 
         getCell(x - 1u, y) +                         getCell(x + 1u, y) + 
         getCell(x - 1u, y + 1u) + getCell(x, y + 1u) + getCell(x + 1u, y + 1u);
}

@compute @workgroup_size(8, 8)
fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
    let ns = countNeighbors(cell.x, cell.y);

    // Conway's game of life rules:
    // return alive ? 2 or 3 neighbors : 3 neighbors;
    next[getIndex(cell.x,cell.y)] = 
        select(u32(ns == 3u), u32(ns == 2u || ns == 3u), getCell(cell.x,cell.y) == 1u); 
    
    // mouse noise   
    let m = getIndex(u32(sys.mouse.x * uni.size.x), u32((1. - sys.mouse.y) * uni.size.y));
    next[m] = 1u;

}
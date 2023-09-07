// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

struct Sys {
    time: f32,
    resolution: vec2<f32>,
    mouse: vec2<f32>,
    aspect: vec2<f32>
};

struct Uni {
    size: vec2<f32>,
    fcolor: vec3<f32>,
    bcolor: vec3<f32>
}

@group(0) @binding(0) var<uniform> uni: Uni;
@group(0) @binding(4) var<uniform> sys: Sys;
@group(0) @binding(1) var<storage> current: array<u32>;
@group(0) @binding(2) var<storage, read_write> next: array<u32>;

struct VertexInput {
    @location(0) pos: vec2<f32>,
    @builtin(instance_index) instance: u32
};

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) uv: vec2f,
    @location(1) state: f32
}

@vertex
fn vertexMain(input : VertexInput) -> VertexOutput {
    let i = f32(input.instance); 
    let cell = vec2f(i % uni.size.x, floor(i / uni.size.y) );
    let state = f32(current[input.instance]);
    

    // The cell(0,0) is a the top left corner of the screen.
    // The cell(uni.size.x,uni.size.y) is a the bottom right corner of the screen.
    let cellOffset = vec2(cell.x, uni.size.y - cell.y - 1.) / uni.size * 2.; 
    let cellPos = (input.pos + 1.) / uni.size - 1. + cellOffset;

    var output: VertexOutput;
    output.pos = vec4f(cellPos / sys.aspect, 0., 1.);
    output.uv = vec2f(input.pos.xy);
    output.state = state;
    return output;
}

@fragment
fn fragmentMain( input: VertexOutput) -> @location(0) vec4f {

    // draw a a little circle for the active cell
    let d = (1. - smoothstep(0.,.1, length(input.uv) - .9 )  )  * input.state;

    return vec4f( mix(uni.bcolor/255.,uni.fcolor/255.,d), 1.);
}      

@compute @workgroup_size(8, 8)
fn computeMain(@builtin(global_invocation_id) cell: vec3u) {

    let size = vec2u(uni.size);

    // count the number of neighbors
    var ns: u32 = 0u;
    for (var i = 0u; i< 9u; i++) {
        if (i == 4u) { continue; } // skip the current cell
        let offset =  (vec2u( (i / 3u) - 1u , (i % 3u) - 1u ) + cell.xy + size) % size;
        ns += current[offset.y * size.y + offset.x];
    }
    
    // the index of the current cell in the buffer
    let idx = cell.y * size.y + cell.x;
    // Conway's game of life rules: select(else,then,if)
    next[idx] = select(
        u32(ns == 3u), // if the cell is dead, does it have 3 neighbours ?
        u32(ns == 2u || ns == 3u), // if the cell is alive, does it have 2 or 3 neighbours ?
        current[idx] == 1u); // if the cell is alive ?
    
    let half = select( vec2((1. - sys.aspect.x) * .5, 0.), vec2(0.,(1. - sys.aspect.y) * .5), sys.aspect.x > sys.aspect.y);

    // mouse noise 
    let m = vec2u(( half + (sys.mouse * sys.aspect)) * uni.size);
    next[m.y * size.y + m.x] = 1u;

}
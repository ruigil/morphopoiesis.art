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

    let cellOffset = cell / uni.size * 2; 
    let statePos = (input.pos + 1) / uni.size - 1 + cellOffset;

    var output: VertexOutput;
    output.pos = vec4f(statePos, 0, 1);
    output.uv = vec2f(input.pos.xy);
    output.cell = cell;
    output.state = state;
    return output;
}

@fragment
fn fragmentMain( input: VertexOutput) -> @location(0) vec4f {

    let d = (1. - smoothstep(0,.1, length(input.uv) - .9 )  )  * input.state;

    return vec4f(mix(uni.bcolor/255.,uni.fcolor/255.,d), 1);
}      

fn cellIndex(cell: vec2u) -> u32 {
    return (cell.y % u32(uni.size.y)) * u32(uni.size.x) + (cell.x % u32(uni.size.x));
}

fn cellActive(x: u32, y: u32) -> u32 {
    return current[cellIndex(vec2(x, y))];
}

@compute @workgroup_size(8, 8)
fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
    let activeNeighbors = cellActive(cell.x+1, cell.y+1) +
                        cellActive(cell.x+1, cell.y) +
                        cellActive(cell.x+1, cell.y - 1) +
                        cellActive(cell.x, cell.y - 1) +
                        cellActive(cell.x - 1, cell.y - 1) +
                        cellActive(cell.x - 1, cell.y) +
                        cellActive(cell.x - 1, cell.y+1) +
                        cellActive(cell.x, cell.y+1);
                        
    let i = cellIndex(cell.xy);
    let m = cellIndex(vec2u( u32(sys.mouse.x * uni.size.x), u32( (1. - sys.mouse.y) * uni.size.y) ));

    // Conway's game of life rules:
    switch activeNeighbors {
        case 2: { // Active cells with 2 neighbors stay active.
            next[i] = current[i];
        }
        case 3: { // Cells with 3 neighbors become or stay active.
            next[i] = 1;
        }
        default: { // Cells with < 2 or > 3 neighbors become inactive.
            next[i] = 0;
        }
    }
    next[m] = 1;
}
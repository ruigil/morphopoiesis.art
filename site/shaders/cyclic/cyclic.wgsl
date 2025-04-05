// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

// The cyclic cellular automaton can be interpreted as a model to 
// thermodynamic cycles. Each cell can be in a discrete state from 1 to N, and
// if one of its neighbors is the successor state, modular N+1, (which means that 0 is the 
// successor state of N, then the next iteration the cell becomes its successor.
// We can see each state as a specie, zebras eat grass, lions eat zebras, and microbes eat lions when they die,
// repeating the cycle.
// https://en.wikipedia.org/wiki/Cyclic_cellular_automaton

struct Sys {
    time: f32,
    resolution: vec2<f32>,
    mouse: vec4<f32>,
    aspect: vec2<f32>
};

struct Uni {
    size: vec2<f32>,
    colors: array<vec3<f32>, 4>,  // Colors for each of the 4 states
    threshold: u32                // Threshold for state transition
}

@group(0) @binding(0) var<uniform> uni: Uni;
@group(0) @binding(4) var<uniform> sys: Sys;
@group(0) @binding(1) var<storage> current: array<f32>;
@group(0) @binding(2) var<storage, read_write> next: array<f32>;

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
    let cell = vec2f(i % uni.size.x, floor(i / uni.size.x));
    let state = current[input.instance];
    
    let cellSize = 2. / uni.size.xy;
    // The cell(0,0) is at the top left corner of the screen.
    // The cell(uni.size.x,uni.size.y) is at the bottom right corner of the screen.
    let cellOffset = vec2(cell.x, uni.size.y - 1. - cell.y) * cellSize + (cellSize * .5);
    // input.pos is in the range [-1,1]...[1,1] and it's the same coord system as the uv of the screen
    let cellPos = (input.pos / uni.size.xy) + cellOffset - 1.; 

    var output: VertexOutput;
    output.pos = vec4f(cellPos, 0., 1.);
    output.uv = vec2f(input.pos.xy);
    output.state = state;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    // Draw a circle for the cell, colored according to its state
    let d = 1. - smoothstep(0., .1, length(input.uv) - .9);
    
    // Get the color for the current state
    let stateColor = uni.colors[u32(input.state)];
    
    // Mix with blac background based on the circle shape
    return vec4f(mix(vec3<f32>(0.0), stateColor/255., 1.), 1.);
}      

@compute @workgroup_size(8, 8)
fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
    // Keep the simulation in the range [0,size]
    if (cell.x >= u32(uni.size.x) || cell.y >= u32(uni.size.y)) { return; }

    let size = vec2u(uni.size);
    
    // The index of the current cell in the buffer
    let idx = cell.y * size.x + cell.x;
    let currentState = u32(current[idx]);
    
    // The next state in the cycle (modulo 4)
    let nextState = (currentState + 1u) % 4u;
    
    // Count the number of neighbors in the next state
    var nextStateCount: u32 = 0u;
    for (var i = 0u; i < 9u; i++) {
        if (i == 4u) { continue; } // Skip the current cell
        
        let offset = (vec2u((i / 3u) - 1u, (i % 3u) - 1u) + cell.xy + size) % size;
        let neighborIdx = offset.y * size.x + offset.x;
        
        if (current[neighborIdx] == f32(nextState)) {
            nextStateCount += 1u;
        }
    }
    
    // Cyclic cellular automata rule:
    // If there are enough neighbors in the next state, transition to that state
    if (nextStateCount >= uni.threshold) {
        next[idx] = f32(nextState);
    } else {
        next[idx] = f32(currentState);
    }
    
    // Mouse interaction - set cells to state 1 around the mouse position
    let m = vec2u(sys.mouse.xy * uni.size);
    if (length(vec2f(cell.xy) - vec2f(m)) < 5.0) {
        next[idx] = 1.0;
    }
}

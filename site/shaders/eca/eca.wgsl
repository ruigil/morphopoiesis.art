// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

struct Sys {
    time: f32,
    resolution: vec2<f32>,
    mouse: vec4<f32>,
    aspect: vec2<f32>
};

struct Uni {
    size: vec2<f32>,
    fcolor: vec3<f32>,
    bcolor: vec3<f32>,
    rule: u32,  // Rule number (0-255)
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
    let cell = vec2f(i % uni.size.x, floor(i / uni.size.x));
    let state = f32(current[input.instance]);
    
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
    // Draw a little circle for the active cell
    let d = (1. - smoothstep(0.,.1, length(input.uv) - .9)) * input.state;
    return vec4f(mix(uni.bcolor, uni.fcolor, d), 1.);
}      

// Apply the elementary cellular automaton rule
@compute @workgroup_size(8, 8)
fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
    // Keep the simulation in the range [0,size]
    if (cell.x >= u32(uni.size.x) || cell.y >= u32(uni.size.y)) { return; }

    let size = vec2u(uni.size);
    let idx = cell.y * size.x + cell.x;
    
    // Process from bottom to top to avoid overwriting data we need
    // For all rows except the first row, shift down (copy from the row above)
    if (cell.y > 0u) {
        // Get the index of the cell in the row above
        let above_idx = (cell.y - 1u) * size.x + cell.x;
        // Copy the cell from the row above
        next[idx] = current[above_idx];
        return;
    }
    
    // Handle the first row (top row)
    if (cell.y == 0u) {
        // Display the current rule number in binary at the top-right corner
        if (cell.x >= size.x - 8u) {
            let bitPos = size.x - 1u - cell.x;
            let bit = (uni.rule >> bitPos) & 1u;
            next[idx] = bit;
            return;
        }
        
        // Allow mouse interaction to set cells in the first row
        let m = vec2u(sys.mouse.xy * uni.size);
        if (m.y == 0u && abs(i32(m.x) - i32(cell.x)) < 3) {
            next[idx] = 1u;
            return;
        }
        
        // Initialize the first row with a single cell in the middle if it's the first frame
        if (sys.time < 0.1 && cell.x == size.x / 2u) {
            next[idx] = 1u;
            return;
        }
        
        // Apply the ECA rule to the first row based on the current state of the first row
        // Get the left, center, and right cells from the current first row
        let left_idx = select(cell.x - 1u, size.x - 1u, cell.x == 0u);
        let right_idx = select(cell.x + 1u, 0u, cell.x == size.x - 1u);
        
        let left = current[left_idx];
        let center = current[cell.x];
        let right = current[right_idx];
        
        // Combine the three cells to get a value from 0-7
        let pattern = (left << 2u) | (center << 1u) | right;
        
        // Apply the rule (check if the corresponding bit in the rule is set)
        next[idx] = (uni.rule >> pattern) & 1u;
    }
}

// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

struct Sys {
    time: f32,
    resolution: vec2<f32>,
    mouse: vec4<f32>,
    aspect: vec2<f32>,
    buttons: vec3<f32>,
    frame: u32
};

struct Uni {
    size: vec2<f32>,
    numtiles: u32,
}

struct VertexInput {
    @location(0) pos: vec2<f32>,
    @builtin(instance_index) instance: u32
};

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) uv: vec2f,
    @location(1) state: f32,
    @location(2) candidate: f32
}

struct Cell {
    value: u32,
    entropy: u32,
    adjency: u32,
    candidate: u32
}

@group(0) @binding(0) var<uniform> uni: Uni;
@group(0) @binding(1) var<uniform> sys: Sys;
@group(0) @binding(2) var<storage> current: array<Cell>;
@group(0) @binding(3) var<storage, read_write> next: array<Cell>;
@group(0) @binding(4) var<storage, read_write> min_value: atomic<u32>;

@vertex
fn vertexMain(input : VertexInput) -> VertexOutput {
    let i = f32(input.instance); 

    let cell = vec2f(i % uni.size.x, floor(i / uni.size.x));
    // each pixel in the simulation is represented bay a instance square
    let state = f32(current[input.instance].adjency);
    let candidate = f32(current[input.instance].candidate);
    
    let cellSize = 2. / uni.size.xy ;
    // The cell(0,0) is a the top left corner of the screen.
    // The cell(uni.size.x,uni.size.y) is a the bottom right corner of the screen.
    let cellOffset =  vec2(cell.x, uni.size.y - 1. - cell.y) * cellSize + (cellSize * .5) ;
    // input.pos is in the range [-1,1]...[1,1] and it's the same coord system as the uv of the screen
    let cellPos =  (input.pos  / uni.size.xy) + cellOffset - 1.; 

    var output: VertexOutput;
    output.pos = vec4f(cellPos, 0., 1.);
    output.uv = vec2f(input.pos.xy);
    output.state = state;
    output.candidate = candidate;
    return output;
}

// 11 Wang tiles and one undefined for an uncollapsed cell.
// u32 words are read from right to left. The color are set clockwise, north, east, south, west
// r - red, g - green, b - blue, w - white
const tiles = array<u32,12>(
    0x4222, // (r,r,r,g)
    0x4828, // (b,r,b,g) 
    0x4442, // (r,g,g,g)  
    0x8281, // (w,b,r,b)  
    0x8188, // (b,b,w,b)  
    0x1211, // (w,w,r,w)  
    0x1842, // (r,g,b,w)  
    0x2818, // (b,w,b,r)  
    0x2128, // (b,r,w,r)   
    0x2844, // (g,g,b,r)  
    0x4212, // (r,w,r,g)
    0xFFFF // undefined 
);

fn tileColor( t: u32, direction: u32) -> vec3<f32> {
    if (t == 0u) { return vec3(.5,.3,.2); } // contradiction
    let d = (t >> (direction * 4u)) & 0xFu;
    switch(d) {
        case 1u: { return vec3(.9,.9,.9); } // white
        case 2u: { return vec3(.9,0.2,0.2); } // red
        case 4u: { return vec3(0.2,.9,0.2); } // green
        case 8u: { return vec3(0.2,0.2,.9); } // blue
        default: { return vec3( 0.1, 0.2, 0.3 ); } // undefined
    }
}

// draw the tile
fn tile( tile: u32, p: vec2<f32>) -> vec3<f32> {

    let top = smoothstep(0.,0.1,p.y-abs(p.x)) * tileColor(tile, 0u);  // north
    let right = smoothstep(0.,0.1,p.x-abs(p.y)) * tileColor(tile, 1u); // east
    let down = smoothstep(0.,0.1,-p.y-abs(p.x)) * tileColor(tile, 2u); // south
    let left = smoothstep(0.,0.1,-p.x-abs(p.y)) * tileColor(tile, 3u); // west

    return  top + right + down + left;
}

@fragment
fn fragmentMain( input: VertexOutput) -> @location(0) vec4f {
    let color = tile(u32(input.state),input.uv) ;
    return vec4( mix( color , color * .7, input.candidate )  ,1.0) ;
}      

@compute @workgroup_size(8, 8)
fn computeEntropy(@builtin(global_invocation_id) cell: vec3u) {
    // keep the simulation in the range [0,size]
    if (cell.x >= u32(uni.size.x) || cell.y >= u32(uni.size.y)) { return; }        
    
    let index = cell.x + cell.y * u32(uni.size.x);
    let c = current[index];

    // Count number of bits set (population count)
    var bits = c.value;
    bits = bits - ((bits >> 1u) & 0x55555555u);
    bits = (bits & 0x33333333u) + ((bits >> 2u) & 0x33333333u);
    bits = (bits + (bits >> 4u)) & 0x0F0F0F0Fu;
    bits = bits + (bits >> 8u);
    bits = bits + (bits >> 16u);
    bits = (bits & 0x0000003Fu);

    next[index] = current[index];
    next[index].entropy = bits;
    let mouse = vec2u(sys.mouse.xy * uni.size) ;

    if (bits == 1u) { return; } // already collapsed 
    atomicMin(&min_value, bits);
}

@compute @workgroup_size(8, 8)
fn computeCandidates(@builtin(global_invocation_id) cell: vec3u) {
    // keep the simulation in the range [0,size]
    if (cell.x >= u32(uni.size.x) || cell.y >= u32(uni.size.y)) { return; }
    let min = atomicLoad(&min_value);

    let index = cell.x + cell.y * u32(uni.size.x);
    let entropy = next[index].entropy;
    next[index].candidate = 0u;

    if (entropy == min) { // this cell has min value entropy, add it to the candidates
        next[index].candidate = 1u;
    }
}

@compute @workgroup_size(1)
fn computeCollapse(@builtin(global_invocation_id) idx: vec3u) {
    if (idx.x >= 1) { return; }

    let mouse = vec2u(sys.mouse.xy * uni.size);
    let index = mouse.x + mouse.y * u32(uni.size.x);

    // if mouse click and candidate
    if ((sys.buttons.x > 0.) && (next[index].candidate == 1)) {
        let cell = next[index];

        // let's choose randomly among the options
        let numBits = cell.entropy; 
        let rnd = hash(sys.frame);
        let randomBitIndex = rnd % numBits;
        
        // Find the nth set bit
        var temp = cell.value;
        for (var i = 0u; i < randomBitIndex; i++) {
            temp &= (temp - 1u); // Clear the least significant bit
        }
        // Isolate the chosen bit
        let tile = temp & (~temp + 1u); 

        next[index].value = tile;
        next[index].entropy = 1u;
        let aindex = u32(log2(f32(tile)));
        next[index].adjency = tiles[aindex];
    }

    atomicStore(&min_value, 0xFFFF);
}

@compute @workgroup_size(8, 8)
fn computePropagation(@builtin(global_invocation_id) cell: vec3u) {
    
    // keep the simulation in the range [0,size]
    if (cell.x >= u32(uni.size.x) || cell.y >= u32(uni.size.y)) { return; }

    let index = cell.x + cell.y * u32(uni.size.x); 
    // skip if already colllapsed
    if (current[index].entropy == 1u) { return; } 


    // north, east, south, east
    let dy = array<i32, 4>(-1, 0, 1, 0);
    let dx = array<i32, 4>(0, 1, 0, -1);
    
    var validTiles = 0u;
    var cellAdjencyMask = 0u;
    // for each tile, we check if it's valid for the current cell
    for (var i = 0u; i < 11u; i++) {
        let adjency = tiles[i];
        var isValid = true;
        // check if the tile is valid for each neighbour, north, east, south, west
        for (var a = 0u; a < 4u; a++) {
            // Get neighbor coordinates
            let nx = i32(cell.x) + dx[a];
            let ny = i32(cell.y) + dy[a];
            // Skip if neighbor is out of bounds
            if (nx < 0 || nx >= i32(uni.size.x) || ny < 0 || ny >= i32(uni.size.y)) { continue; }
            // Get neighbor cell
            let neighbor = current[u32(nx) + u32(ny) * u32(uni.size.x)];
            // get the adjency of the tile for the current direction
            let adj_dir = (adjency >> (a * 4u)) & 0xFu;
            // get the neightbour adjency for the current direction, north<->south, west<->east
            let nadj_dir = (neighbor.adjency >> (((a + 2u) % 4u) * 4u) ) & 0xFu;
            // check if the adjency in this direction is valid
            isValid = (adj_dir & nadj_dir) != 0u;
            if (!isValid) { break; }
        }
        if (isValid) {
            validTiles = validTiles | (1u << i);
            cellAdjencyMask |= tiles[i];
        }
    }

    next[index].adjency = cellAdjencyMask;
    next[index].value = validTiles;
}


// https://www.pcg-random.org/
fn hash(v: u32) -> u32 {
	let state = v * 747796405u + 2891336453u;
	let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
	return (word >> 22u) ^ word;
}

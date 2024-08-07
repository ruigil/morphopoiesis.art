// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

struct Sys {
    time: f32,
    resolution: vec2<f32>,
    mouse: vec4<f32>,
    aspect: vec2<f32>
};

struct Uni {
    size: vec2<f32>
}


@group(0) @binding(0) var<uniform> uni: Uni;
@group(0) @binding(4) var<uniform> sys: Sys;
@group(0) @binding(1) var<storage> current: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> next: array<vec2<f32>>;

struct VertexInput {
    @location(0) pos: vec2<f32>,
    @builtin(instance_index) instance: u32
};

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) state: vec2f
}

fn getIndex(cell : vec2<f32>) -> u32 { 
    let c = (cell + uni.size) % uni.size;
    return u32( c.y * uni.size.x + c.x );
}

@vertex
fn vertexMain(input : VertexInput) -> VertexOutput {
    let i = f32(input.instance); 
    let cell = vec2f(i % uni.size.x,  floor(i / uni.size.x) );

    // takes the avergave of the neighbours for this vertice in this state.
    let c1 = current[getIndex( vec2(cell.x + input.pos.x ,  cell.y) )];
    let c2 = current[getIndex( vec2(cell.x + input.pos.x, cell.y - input.pos.y) )];
    let c3 = current[getIndex( vec2(cell.x , cell.y - input.pos.y) )];
    let c4 = current[input.instance];    
     
    // multisample the state to reduce aliasing
    let state = (c1 + c2 + c3 + c4) / 4.0;

    let cellSize = 2. / uni.size.xy ;
    // The cell(0,0) is a the top left corner of the screen.
    // The cell(uni.size.x,uni.size.y) is a the bottom right corner of the screen.
    let cellOffset =  vec2(cell.x, uni.size.y - 1. - cell.y) * cellSize + (cellSize * .5) ;
    // input.pos is in the range [-1,1]...[1,1] and it's the same coord system as the uv of the screen
    let cellPos =  (input.pos  / uni.size.xy) + cellOffset - 1.; 

    var output: VertexOutput;
    output.pos = vec4f(vec2(cellPos), 0., 1.); //[0.1,0.1]...[0.9,0.9] cell vertex positions
    output.state = state; // the current state
    return output;
}

@fragment
fn fragmentMain( input: VertexOutput) -> @location(0) vec4f {

    // we use the state to control the color
    let v = input.state;
    let color = hsv2rgb(vec3f( abs(v.y-v.x)  , 1., pow(v.y + 0.001 ,.5) ));

    return vec4f( tosRGB(color), 1.);
}      


@compute @workgroup_size(8, 8)
fn computeMain(@builtin(global_invocation_id) cell: vec3u) {

    // keep the simulation in the range [0,size]
    if (cell.x >= u32(uni.size.x) || cell.y >= u32(uni.size.y)) { return; }

    // a non exhaustive list of the type of patterns we can create 
    // the first controls the activation, the second the inhibition
    let params = array<vec2<f32>,9>(
        vec2(0.046 , 0.063), // worms
        vec2(0.082, 0.06), // worms and loops
        vec2(0.042, 0.059), // Turing patterns
        vec2(0.014, 0.054), // moving spot
        vec2(0.037, 0.06), // fingerprint
        vec2(0.014, 0.047), // spots and loops
        vec2(0.062, 0.0609), // U-SKATE
        vec2(0.039, 0.058), // holes
        vec2(0.022, 0.0610) // microbes
    );

    // we divide the screen in 9 areas and we use 
    // the mouse position to select the pattern
    let m = floor(sys.mouse.xy * 3);
    let ai = params[u32(m.y) * 3u + u32(m.x)];

    // calculate the value and store it in the next buffer
    let v = rd( vec2i(cell.xy), vec2i(uni.size), ai.x, ai.y);
    next[cell.y * u32(uni.size.x) + cell.x] = clamp(v, vec2(0.), vec2(1.));

    // we add a small amount of B in the mouse position
    let pos = vec2u(floor(sys.mouse.xy * uni.size));
    let index = pos.y * u32(uni.size.x) + pos.x;
    next[index].y = 1.;

}


// 9 point stencil laplace operator
const K_LAPLACE9 = array<f32,9>(.25, .5, .25, .5, -3., .5, .25, .5, .25);

// gray-scott reaction-diffusion system
fn rd( cell: vec2<i32>, size: vec2<i32>, feed:f32, decay:f32) -> vec2f { 
    
    var laplacian = vec2(0.);    
    for(var i = 0; i < 9; i++) {
        let offset =  (vec2i( (i / 3) - 1 , (i % 3) - 1 ) + cell + size) % size;
        laplacian += (K_LAPLACE9[i] * current[offset.y * size.x + offset.x]);
    } 

    // chemicals A and B are stored in the x and y component of buffer
    let ab = current[ cell.y * size.x + cell.x];

    // calculate the dA and dB
    let da = ((.2097 * laplacian.x) - (ab.x * ab.y * ab.y)) + (feed * (1. - ab.x));
    let db = ((.1050 * laplacian.y) + (ab.x * ab.y * ab.y)) - ((feed + decay) * ab.y);

    // we use the 1 as the dt time step
    let dt = 1.; 
    return ab +  dt * vec2(da,db); 
}

// convert a color in hsv color space to rgb 
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

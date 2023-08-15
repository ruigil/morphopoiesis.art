// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

struct Sys {
    time: f32,
    resolution: vec2f,
    mouse: vec2f
};

struct Uni {
    size: vec2f
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
    @location(0) cell: vec2f,
    @location(1) uv: vec2f,
    @location(2) state: vec2f
}

@vertex
fn vertexMain(input : VertexInput) -> VertexOutput {
    let i = f32(input.instance); 
    let cell = vec2f(i % uni.size.x,  floor(i / uni.size.y) );
    let state = current[input.instance]; 
    
    // The cell(0,0) is a the top left corner of the screen.
    // The cell(uni.size.x,uni.size.y) is a the bottom right corner of the screen.
    let cellOffset = vec2(cell.x, uni.size.y - cell.y - 1.) / uni.size * 2.; 
    let cellPos = (input.pos + 1.) / uni.size - 1. + cellOffset;

    var output: VertexOutput;
    output.pos = vec4f(vec2(cellPos), 0., 1.); //[0.1,0.1]...[0.9,0.9] cell vertex positions
    output.uv = vec2f(input.pos.xy); // [-1,-1]...[1,1]
    output.cell = cell; // [0,0],[1,1] ... [size.x, size.y]
    output.state = state; // the current state
    return output;
}

@fragment
fn fragmentMain( input: VertexOutput) -> @location(0) vec4f {

    // we use the state to control the color
    let v = input.state;
    let color:vec3f = hsv2rgb(vec3f( abs(v.y-v.x)  , 1., v.y + .01 ));

    return vec4f( tosRGB(color), 1.);
}      


@compute @workgroup_size(8, 8)
fn computeMain(@builtin(global_invocation_id) cell: vec3u) {

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
    let m = floor(sys.mouse * 3);
    let ai = params[u32(m.y) * 3u + u32(m.x)];

    // calculate the value and store it in the next buffer
    let v = rd( cell.xy, vec2u(uni.size), ai.x, ai.y);
    next[cell.y * u32(uni.size.y) + cell.x] = clamp(v, vec2(0.), vec2(1.));

    // we add a small amount of B in the mouse position
    let pos = vec2u(floor(sys.mouse.xy * uni.size));
    let index = pos.y * u32(uni.size.y) + pos.x;
    next[index].y = 1.;

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

// 9 point stencil laplace operator
const K_LAPLACE9 = array<f32,9>(.25, .5, .25, .5, -3., .5, .25, .5, .25);

// apply a convolution in a 2d grid with a specific kernel
// assumes a wrap around boundary condition
// and a current buffer of size 'size.xy'
fn conv3x3( kernel: array<f32,9>, cell: vec2<u32>, size: vec2<u32>) -> vec2f {
    var acc = vec2(0.);
    
    for(var i = 0u; i < 9u; i++) {
        let offset =  (vec2u( (i / 3u) - 1u , (i % 3u) - 1u ) + cell + size) % size;
        acc += (kernel[i] * current[offset.y * size.y + offset.x]);
    } 
    
    return acc;
}

// gray-scott reaction-diffusion system
fn rd( cell: vec2<u32>, size: vec2<u32>, feed:f32, decay:f32) -> vec2f { 

    // convolution with a Laplace kernel with a 9 point stencil
    let laplace = conv3x3(K_LAPLACE9, cell, size);
    // chemicals A and B are stored in the x and y component of buffer
    let ab = current[ cell.y * size.y + cell.x];

    // calculate the dA and dB
    let da = ((.2097 * laplace.x) - (ab.x * ab.y * ab.y)) + (feed * (1. - ab.x));
    let db = ((.1050 * laplace.y) + (ab.x * ab.y * ab.y)) - ((feed + decay) * ab.y);

    // we use the 1 as the dt time step 
    return ab +  1./*dt*/ * vec2(da,db); 
}

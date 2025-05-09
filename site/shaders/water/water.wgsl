// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

struct Sys {
    time: f32,
    resolution: vec2<f32>,
    buttons: vec3<f32>,
    mouse: vec4<f32>,
    aspect: vec2<f32>
};

struct Uni {
    size: vec2<f32>,
    amplitude: f32,
    frequency: f32,
    osc: array<Oscillators,3>
}

struct Oscillators {
    amplitude: f32,
    frequency: f32,
    position: vec2<i32>
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
    //let cell = vec2f(i % uni.size.x, floor(i / uni.size.y) );
    let cell = vec2f(i % uni.size.x, floor(i / uni.size.x));
    let state = f32(current[input.instance]);
    

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
    return output;
}

@fragment
fn fragmentMain( input: VertexOutput) -> @location(0) vec4f {

    // use the wave phase as a color hue
    return vec4( tosRGB( hsv2rgb(vec3( abs(input.state)*.1 + .66 , .9, .1 )) ) ,1.0) ;
}      
// Mehrstellen 9 point stencil laplace operator 
const K_LAPLACE9 = array<f32,9>(.1666666, .6666666, .1666666, .6666666, -3.3333333, .6666666, .1666666, .6666666, .1666666);
@compute @workgroup_size(8, 8)
fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
    // keep the simulation in the range [0,size]
    if (cell.x >= u32(uni.size.x) || cell.y >= u32(uni.size.y)) { return; }

    let size = vec2i(uni.size);
    let pos = vec2i(cell.xy);
    let m = vec2i(sys.mouse.xy * uni.size );

    // Wave equation parameters
    let dt = 1.; // time step
    let damping = .99; // wave damping
    let c = 1. / (sqrt(2.) * dt) ;  // wave speed, Courant-Friedrichs-Lewy (CFL) condition
    
    // current cell index
    let index = pos.y * size.x + pos.x;

    // we switch buffers each frame, so the previous value is in the next buffer.
    let previous = next[index];

    // boundary condition
    let circle = false;//abs(length(vec2f(pos) - vec2f(size/2)) - f32(size.y)/2.5) - 1. < 0.;

    if (!circle) {
        // calculate the laplacian  
        var laplacian: f32 = 0.0;
        for(var i = 0; i < 9; i++) {
            let offset =  (vec2i( (i / 3) - 1, (i % 3) - 1 ) + pos + size) % size;
            laplacian += K_LAPLACE9[i] * current[offset.y * size.x + offset.x];       
        }

        // wave equation, finite elements method
        next[index] = 2.0 * current[index] - previous + c * c * dt * dt * laplacian;
        next[index] *= damping;

        // add oscillators perturbation to the field
        for (var i=0; i < 3; i++) {
            let o = uni.osc[i];
            //next[ o.position.y * size.x + o.position.x ] = o.amplitude * sin(o.frequency * sys.time);
        }
        // add mouse click perturbation
        if (sys.buttons.x == 1.) {
            next[ m.y * size.x + m.x] = uni.amplitude;// * sin(uni.frequency * sys.time);
        }
    }

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
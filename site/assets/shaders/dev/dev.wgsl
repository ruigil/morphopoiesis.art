// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

struct Sys {
    time: f32,
    resolution: vec2f,
    mouse: vec2f,
    aspect: vec2f
};


struct SimParams {
  size: vec2<f32>,
  deltaT : f32,
  scale: f32,
  forces : vec4<f32>,
  distances : vec3<f32>
}

struct Agent {
  pos : vec2<f32>,
  vel : vec2<f32>,
}

struct VertexInput {
    @location(0) pos: vec2<f32>,
    @builtin(instance_index) instance: u32
};

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) uv: vec2f,
    @location(1) state: f32
}

@group(0) @binding(0) var<uniform> sys : Sys;
@group(0) @binding(1) var<uniform> params : SimParams;
@group(0) @binding(2) var<storage, read> trailMapA : array<f32>;
@group(0) @binding(3) var<storage, read_write> trailMapB : array<f32>;
@group(0) @binding(4) var<storage, read_write> agents : array<Agent>;
@group(0) @binding(5) var<storage, read_write> debug : array<vec4<f32>>;


@vertex
fn vertMain( input: VertexInput) -> VertexOutput {
  
    let i = f32(input.instance); 
    let cell = vec2f(i % params.size.x, floor(i / params.size.y) );
    let state = f32(trailMapA[input.instance]);

    // The cell(0,0) is a the top left corner of the screen.
    // The cell(uni.size.x,uni.size.y) is a the bottom right corner of the screen.
    let cellOffset = vec2(cell.x, params.size.y - cell.y - 1.) / params.size * 2.; 
    let cellPos = (input.pos + 1.) / params.size - 1. + cellOffset;

    var output: VertexOutput;
    output.pos = vec4f(cellPos / sys.aspect, 0., 1.);
    output.uv = vec2f(input.pos.xy);
    output.state = state;
    return output;
}
//* vec3(0.8,0.6+sin(sys.time)*.2
@fragment
fn frag_main(input : VertexOutput) -> @location(0) vec4<f32> {
  let d = (1. - smoothstep(0.,.01, length( vec2(input.uv.x,input.uv.y)) - .9 )  ) ;
  return vec4(vec3( d) ,1.0);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) globalInvocationID : vec3<u32>) {

}
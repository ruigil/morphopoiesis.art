// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

struct Sys {
    time: f32,
    resolution: vec2f,
    mouse: vec2f,
    aspect: vec2f
};

@group(0) @binding(0) var<uniform> sys: Sys;
@group(0) @binding(1) var webcamSampler: sampler;
@group(0) @binding(2) var webcamTexture: texture_external;

//@group(0) @binding(0) var mySampler : sampler;
//@group(0) @binding(1) var myTexture : texture_2d<f32>;


struct VertexInput {
  @location(0) pos : vec2<f32>,
  @builtin(vertex_index) index : u32,
}

struct VertexOutput {
  @builtin(position) position : vec4<f32>,
  @location(0) fragUV : vec2<f32>,
}

@vertex
fn vert_main(input : VertexInput ) -> VertexOutput {

  var output : VertexOutput;
  output.position = vec4(input.pos, 0.0, 1.0);
  output.fragUV = (vec2(input.pos.x,-input.pos.y) + 1.) * .5;
  return output;
}


@fragment
fn main(input: VertexOutput) -> @location(0) vec4<f32> {
  //return vec4<f32>( vec3(length(input.fragUV)), 1.0);
  return textureSampleBaseClampToEdge(webcamTexture, webcamSampler, input.fragUV);
}
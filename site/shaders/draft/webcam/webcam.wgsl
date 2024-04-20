
struct Sys {
    time: f32,
    frame: u32,
    mouse: vec4<f32>,
    resolution: vec2<f32>
}

@group(0) @binding(0) var<uniform> sys: Sys;
@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var webcam: texture_external;

struct VertexOutput {
  @builtin(position) pos : vec4f,
  @location(0) fragUV : vec2f,
}

@vertex
fn vertexMain(@location(0) pos: vec2<f32>) -> VertexOutput  {
    var output: VertexOutput;
    output.pos = vec4<f32>(pos, 0.0, 1.0);
    output.fragUV = (vec2<f32>(pos.x,- pos.y) + 1.) * .5;
    return output;
}

@fragment
fn main(@location(0) fragUV : vec2f) -> @location(0) vec4f {
  return textureSampleBaseClampToEdge(webcam, mySampler, fragUV);
}
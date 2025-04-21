
struct Sys {
    time: f32,
    frame: u32,
    mouse: vec4<f32>,
    resolution: vec2<f32>
}

struct VSInput {
  @location(0) position: vec4<f32>,
  @location(1) color: vec4<f32>,
  @location(2) uv: vec2<f32>,
  @builtin(instance_index) instance: u32
};

struct Uniforms {
    color: vec4<f32>,
    view: mat4x4<f32>,
    instances: array<Instance,200>
}

struct Instance {
  matrix: mat4x4<f32>
}

struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4<f32>,
}

@group(0) @binding(0) var<uniform> sys: Sys;
@group(0) @binding(1) var<uniform> unis: Uniforms;

@vertex fn vs(vert: VSInput) -> VSOutput {
    
  var vsOut: VSOutput;

  let inst = unis.instances[vert.instance];

  vsOut.position = unis.view * inst.matrix * vert.position;
  vsOut.color = vert.color;
  return vsOut;
}

@fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
    return fsInput.color;
}

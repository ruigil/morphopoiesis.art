
@group(0) @binding(0) var<uniform> uni: Uniforms;

struct Uniforms {
    frame: f32,
    size: vec2<f32>,
    samples: array<f32,3>,
    colors: array<vec4<f32>,3>,
    cube: array<array<vec2<f32>,2>,3>,
    lights: array<Light,3>,
    cameras: array<mat3x3<f32>,2>
}

struct Light {
    power: f32,
    position: vec2<i32>
}

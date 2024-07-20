// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

struct VertexOutput {
    @builtin(position) pos: vec4<f32>,
    @location(0) xy: vec2<f32>,
};

struct Sys {
    time: f32,
    frame: u32,
    mouse: vec4<f32>,
    resolution: vec2<f32>,
    aspect: vec2<f32>
}

struct Params {
    fov: f32,
};

const PI = 3.14159265359;

@group(0) @binding(0) var<uniform> sys: Sys;
@group(0) @binding(1) var<uniform> params: Params;
@group(0) @binding(2) var video360: texture_external;
@group(0) @binding(3) var samp: sampler;

@vertex
fn vertexMain(@location(0) pos: vec2<f32>) -> VertexOutput  {
    var output: VertexOutput;
    // by default we pass the vertices of a square in the range [-1,1] in x and y
    output.pos = vec4<f32>(pos, 0.0, 1.0);
    // in this case we pass the xy coordinates as normalised coordinates [-1,1]. 
    // [-1,-1] is the bottom left corner and [1,1] is the top right corner
    output.xy = pos;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {

    // Convert FOV from degrees to radians and calculate the tan of half the FOV
    let fov = tan(radians(params.fov) * 0.5);

    // Calculate the ray direction
    let dir = normalize(vec3<f32>(input.xy * fov * sys.aspect, -1.0) );

    //mouse is [0,0] top left corner and [1,1] bottom right corner
    //we adjust so that [0,0] is the center of the screen
    let m = sys.mouse.xy * -1. + .5;

    // Rotate the ray based on mouse input
    let yaw = m.x * 2.0 * PI;
    let pitch = m.y * PI;

    // Create rotation matrices
    let cosy = cos(yaw);
    let siny = sin(yaw);
    let cosp = cos(pitch);
    let sinp = sin(pitch);

    // Rotate around Y-axis (yaw)
    let rotY = mat3x3<f32>(
        cosy, 0.0, -siny,
        0.0, 1.0, 0.0,
        siny, 0.0, cosy
    );

    // Rotate around X-axis (pitch)
    let rotX = mat3x3<f32>(
        1.0, 0.0, 0.0,
        0.0, cosp, sinp,
        0.0, -sinp, cosp
    );

    // Apply rotations: first yaw, then pitch
    let rotdir =  rotY * rotX * dir;

    // Convert the rotated direction to equirectangular coordinates
    let equ = atan2(rotdir.x, -rotdir.z) / (2.0 * PI) + .5;
    let eqv = acos(rotdir.y) / PI;

    // Sample the equirectangular video texture
    return textureSampleBaseClampToEdge(video360, samp, vec2<f32>(equ, eqv));
}

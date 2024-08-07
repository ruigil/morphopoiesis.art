// variation of: https://glslsandbox.com/e#29611.0
struct Sys {
    time: f32,
    frame: u32,
    mouse: vec4<f32>,
    resolution: vec2<f32>
}

@group(0) @binding(0) var<uniform> sys: Sys;

@vertex
fn vertexMain(@location(0) pos: vec2<f32>) -> @builtin(position) vec4f  {
    return vec4f(pos,0.,1.);
}

/*
    This is a simple shader that renders a 2D fractal.
    We take the position of the pixel, and use it as the starting point.
    We then iterate with scale and distance of the fractal depending on the mouse position.
*/                       
@fragment
fn fragmentMain(@builtin(position) coord: vec4f) -> @location(0) vec4f {
    // initial position of the fractal
    var p = vec3f( coord.xy / sys.resolution.y, cos(sys.time * .2) + sin(sys.time * .1));

    // iterate over the fractal
    for (var i = 0; i < 100; i++ ) {
        p = (vec3f(1.2,0.999,0.999) * abs( (abs(p) / dot(p,p) - vec3f(1.0 - sys.mouse.y*.1, .9,(sys.mouse.x - .5) * 0.5)) )).xzy;
    }
    
    return vec4f(p, 1.);
}
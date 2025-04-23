
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

fn charge(r: vec2f, charge: f32) -> f32 {
    return (charge - 1.) + (charge / length(r) );

}

@fragment
fn fragmentMain(@builtin(position) coord: vec4f) -> @location(0) vec4f {        
    let r = vec2i(floor( (coord.xy / sys.resolution.y) * 512.));

    let xor = ( (r.y + i32(floor( 40. * sys.time))) ^ r.x ) % 19;

    let mr = (vec2f(r)/128.) - 2.;

    let c1 = charge(mr, .15);
    let c2 = charge(mr + sin(sys.time), .25);
    let c3 = charge(vec2(-mr.x,mr.y) - cos(sys.time *1.2), .5);

    let f = 1. - f32(xor > 1 ) +  smoothstep(0.,.1, (c1 + c2 + c3) );
    return vec4f(vec3f(  f ), 1.);
}

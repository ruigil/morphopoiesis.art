
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

@fragment
fn fragmentMain(@builtin(position) coord: vec4f) -> @location(0) vec4f {        
    let r = normCoord(coord.xy, sys.resolution);

    let v = 
        fill(circle(r + vec2(-.25), .12), false) *
        stroke(circle(r + vec2(.3), .2), .15, false) *
        stroke(circle(r + vec2(-.25,-.25), .3), .1, false) *
        fill(circle(r + vec2(.4,-.25), .2), false) *
        fill(circle(r + vec2(-.1, .5), .1), false) *
        fill(circle(r + vec2(-.4, .3), .15), false) *
        stroke(circle(r, .8), .1, false);

    return vec4(vec3(v),1.);
}

// a signed distance function for a circle
fn circle(p: vec2<f32>, r: f32) -> f32 {
    return length(p) - r;
}

// stroke an sdf 'd', with a width 'w', and a fill 'f' 
fn stroke(d : f32, w: f32, f: bool) -> f32 {  
    return abs(smoothstep(0.,.01, (abs(d)-w*.5)) - f32(f)); 
}

// fills an sdf 'd', and a fill 'f'. false for the fill means inverse 
fn fill(d: f32, f: bool) -> f32 { return abs(smoothstep(0.,.01,d) - f32(f)); }

// normalize coordinates between [-1,1] wit a correct aspect ratio
fn normCoord(coord: vec2<f32>, resolution: vec2<f32>) -> vec2<f32> {
    // bottom left is [-1,-1] and top right is [1,1]
    return (2.0 * coord - resolution) / min(resolution.x, resolution.y) * vec2(1., -1.);
}

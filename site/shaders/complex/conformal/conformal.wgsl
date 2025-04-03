
struct Sys {
    time: f32,
    frame: u32,
    mouse: vec4<f32>,
    resolution: vec2<f32>
}

@group(0) @binding(0) var<uniform> sys: Sys;

const PI : f32 = 3.1415926535;
const TAU : f32 = 6.283185307;

@vertex
fn vertexMain(@location(0) pos: vec2<f32>) -> @builtin(position) vec4f  {
    return vec4f(pos,0.,1.);
}

@fragment
fn fragmentMain( @builtin(position) coord: vec4<f32>) -> @location(0) vec4<f32> { 
    let epsilon = 1. / min(sys.resolution.x,sys.resolution.y);

    var r = normCoord(coord.xy,sys.resolution) * 2.;
    let z = toPolar(r);

    // a few variables for the animation
    let ct = cos(sys.time*.5);
    let st = sin(sys.time*.3);    
    // the complex transform is a dipole
    // one point is zero and the other inifinite
    r = zdiv( zadd( z, 2. * vec2(ct,st) ), zsub( z, 2. * vec2(st, ct)));

    // we apply a log to the distance from the origin and scale to a multiple of TAU for a aligned grid
    let scale = 10. / TAU;
    r = vec2(log(r.x) - sys.time, r.y ) * scale;

    // we repeat the space and use an alternating sign
    // for the gear rotation
    let s = sign( modf32(floor(r.x) + floor(r.y), 2) - .5);
    r = fract(r) - .5;

    let t = sys.time;

    let f = 
        teeth(r, 10., s * t) +
        // all the neigbors turn the other way -t
        teeth(vec2(r.x - 1.,r.y), 10.,s * -t ) +
        teeth(vec2(r.x + 1.,r.y), 10.,s * -t ) +
        teeth(vec2(r.x,r.y - 1.), 10.,s * -t ) +
        teeth(vec2(r.x,r.y + 1.), 10.,s * -t ) +
        stroke(circle(r,.3), .25, epsilon, true);

    return vec4<f32>(vec3<f32>(f), 1.0);
}

// normalized coordinates
// bottom left is [-1,-1] and top right is [1,1]
fn normCoord(coord: vec2<f32>, res: vec2<f32>) -> vec2<f32> { return (2.0 * coord - res) / min(res.x, res.y) * vec2f(1.,-1.); }

fn rot2(a: f32) -> mat2x2f { return mat2x2(cos(a),sin(a),-sin(a),cos(a)); }

// Signed Distance Function for a circle centered at origin
fn circle(p: vec2<f32>, radius: f32) -> f32 { return length(p) - radius; }
fn stroke(d : f32, w: f32, eps:f32, f: bool) -> f32 {  return abs(smoothstep(-eps, eps, abs(d) - w *.5) - f32(f)); }
fn rays(uv:vec2f , n: f32) -> f32 { return ((atan2(uv.y,uv.x)+PI) % (TAU / n) ) - (PI / n); }
fn fill(d: f32, eps: f32, f: bool) -> f32 { return abs(smoothstep(-eps,eps,d) - f32(f)); }

fn toCarte(z : vec2f) -> vec2f { return z.x * vec2(cos(z.y),sin(z.y)); }
fn toPolar(z : vec2f) -> vec2f { return vec2(length(z),atan2(z.y,z.x)); }
fn zdiv(z1: vec2f, z2: vec2f) -> vec2f { return vec2(z1.x/z2.x,z1.y-z2.y); }
fn zadd(z1: vec2f, z2: vec2f) -> vec2f { return toPolar(toCarte(z1) + toCarte(z2)); }
fn zsub(z1: vec2f, z2: vec2f) -> vec2f { return toPolar(toCarte(z1) - toCarte(z2)); }

fn teeth(r:vec2f, n:f32, a:f32) -> f32 {
    let s = n/TAU; // scale the sdf to compensate for the log distortion
    let eps = 2./min(sys.resolution.x,sys.resolution.y);
    return stroke(s*circle(r,.4), .4, eps, true) * fill(s*rays(r * rot2(a), 10.), eps, false);
}

fn modf32(a:f32, b:f32) -> f32 { return a  - b * floor(a / b); }
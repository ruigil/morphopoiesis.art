// This work is licensed under CC BY NC ND 4.0 
// https://creativecommons.org/licenses/by-nc-nd/4.0/

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
    // normalized coordinates [-1,-1] is bottom left and [1,1] is top right
    let uv = normCoord(coord.xy, sys.resolution);
 
    let scale = 4.;

    var nscale = scale;
    let maxScale = 8.;
    var nn = 0.0;
    loop {
        nn = step(valueNoise(floor((uv +.5) * nscale)), .5);
        if ((nn == 1.0) && ( nscale < maxScale)) {
            nscale *= 2.0;
        } else {
            break;
        }
    }

    var grid = fract(uv * nscale) - 0.5;
    let uv1 = fold(grid, radians(45.0)); // mirror the diagonal
    let uv2 = fold(grid * rotate2d(radians(90.0)), radians(45.)); // mirror the diagonal and rotate tile 90 degrees
    let uv3 = vec2f(grid.x,abs(grid.y));
    let uv4 = uv3 * rotate2d(radians(90.0));
    let uv5 = fold(fold(vec2f(grid.x,abs(grid.y)),radians(45.)), radians(135.));
    let uv6 = abs(grid);

    let t1 =  stroke(circle(uv1 - vec2(.5), .5), .33, false) * fill(circle(uv1 - vec2(.5), .15),false) * fill(circle(uv2 - vec2(.5,.5),.15),false);// * fill(circle(uv1 - vec2(.5),.075),false) * fill(circle(uv2 - vec2(.5),.075),false);
    let t2 =  stroke(circle(uv2 - vec2(.5), .5), .33, false) * fill(circle(uv2 - vec2(.5), .15),false) * fill(circle(uv1 - vec2(.5,.5),.15),false);// * fill(circle(uv2 - vec2(.5),.075),false) * fill(circle(uv1 - vec2(.5),.075),false);
    let t3 =  fill(circle(uv3 - vec2(0.,.5), .15), false) * fill(rect(uv3, vec2(.5,.15)),false);
    let t4 =  fill(circle(vec2(uv4.x,abs(uv4.y)) - vec2(0.,.5), .15), false) * fill(rect(uv4, vec2(.5,.15)),false);
    let t5 =  fill(circle(uv5 - vec2(0.,.5), .15), false);
    let t6 =  fill(rect(uv6,vec2(.5,.5)), false) + fill(circle(uv6 - vec2(.5),.35),true);

    let tiles = array<f32,6>(t1,t2,t3,t4,t6,t5);
    //var color = pal(valueNoise(grid), vec3f(1.0), vec3f(.0,.1,.4));
    //color *= smoothstep(0.0, 0.1, grid.x) * smoothstep(0.0, 0.1, grid.y) ;
    
    //let n = select(t1,t2,bool(step(valueNoise(floor(uv * scale)) - .5, .0)));
    let ntiles = 2.;

    let n = u32(floor(valueNoise(floor((uv +.5) * nscale)) * ntiles));

    //let gridv = smoothstep(0.0, 0.01, abs(grid.x- .5)) * smoothstep(0.0, 0.01, abs(grid.y - .5)) ;

    let gridv = stroke(rect(grid,vec2(.5)), .02, false); 

    let s = log2(nscale) % 2.;
    // 4 - 0
    // 8 - 1
    // 16 - 0
    // 32 - 1
    return vec4f(vec3f(fill(poly(uv,5.),true)),1.0);
    //return vec4f(vec3f(abs(tiles[n] )) * gridv, 1.0);
}

// normalized coordinates
fn normCoord(coord: vec2<f32>, resolution: vec2<f32>) -> vec2<f32> {
    // bottom left is [-1,-1] and top right is [1,1]
   return (2.0 * coord - resolution) / min(resolution.x, resolution.y) * vec2f(1.,-1.);
}

// smoothstep antialias with fwidth
fn ssaa(v: f32) -> f32 { return smoothstep(-1.,1.,v/fwidth(v)); }
// stroke an sdf 'd', with a width 'w', and a fill 'f' 
fn stroke(d : f32, w: f32, f: bool) -> f32 {  return abs(ssaa(abs(d)-w*.5) - f32(f)); }
// fills an sdf 'd', and a fill 'f'. false for the fill means inverse 
fn fill(d: f32, f: bool) -> f32 { return abs(ssaa(d) - f32(f)); }
// a signed distance function for a rectangle 's' is size
fn rect(uv: vec2f, s: vec2f) -> f32 { let auv = abs(uv); return max(auv.x-s.x,auv.y-s.y); }
// a signed distance function for a circle, 'r' is radius
fn circle(uv: vec2f, r: f32) -> f32 { return length(uv)-r; }
// a signed distance function for a hexagon
fn hex(uv: vec2f) -> f32 { let auv = abs(uv); return max(auv.x * .866 + auv.y * .5, auv.y) - .5; }
// a signed distance function for a equilateral triangle
fn tri(uv: vec2f) -> f32 { return max(abs(uv.x) * .866 + uv.y * .5, -uv.y) - .577; }
// a 'fold' is a kind of generic abs(). 
// it reflects half of the plane in the other half
// the variable 'a' represents the angle of an axis going through the origin
// so in normalized coordinates uv [-1,1] 
// fold(uv,radians(0.)) == abs(uv.x) and fold(uv,radians(90.)) == abs(uv.y) 
fn fold(uv: vec2f, a: f32) -> vec2f { let axis = vec2f(cos(a),sin(a)); return uv-(2.*min(dot(uv,axis),.0)*axis); }
// 2d rotation matrix, angle in radians
fn rotate2d(a: f32) -> mat2x2f { return mat2x2(cos(a),sin(a),-sin(a),cos(a)); }

fn poly(uv:vec2f, n:f32) -> f32 {  return length(uv) * cos( ((atan2(uv.y, uv.x) - 1.57) % (6.28 / n)) - (3.14 / n)) - .5; }

// cheap pallette from https://www.shadertoy.com/view/ll2GD3
fn pal(domain: f32, frequency: vec3f, phase: vec3f) -> vec3f {
  return vec3f(0.5) + vec3f(0.5) * cos(6.2830 * (frequency * domain + phase));
}

fn pcg2d(pv: vec2u) -> vec2u {
    var v = pv * 1664525u + 1013904223u;
    let s = vec2u(16u);
    v.x += v.y * 1664525u;
    v.y += v.x * 1664525u;
    v = v ^ (v>>s);
    v.x += v.y * 1664525u;
    v.y += v.x * 1664525u;
    v = v ^ (v>>s);
    return v;
}

fn hash2( seed: vec2u) -> vec2f {
    return vec2f( vec2f(pcg2d(seed)) * (1. / f32(0xffffffffu)) ) ;
}

// value noise in 2d
fn valueNoise(p: vec2f) -> f32 {
    // cell cordinates
    let c = vec2u(floor(abs(p)));
    // sub-cell cordinates
    let f = fract(p);
    // bicubic interpolation
    let u = f * f * (3.0 - 2.0 * f);
    // offset vector
    let o = vec2u(0,1);
    return mix( mix( hash2( c + o.xx ).x, hash2( c + o.yx ).x, u.x),
                mix( hash2( c + o.xy ).x, hash2( c + o.yy ).x, u.x), u.y);
}

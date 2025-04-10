// This work is licensed under CC BY NC ND 4.0 
// https://creativecommons.org/licenses/by-nc-nd/4.0/

struct Sys {
    time: f32,
    frame: u32,
    mouse: vec4<f32>,
    resolution: vec2<f32>
}
// @include 

@group(0) @binding(0) var<uniform> sys: Sys;

@vertex
fn vertexMain(@location(0) pos: vec2<f32>) -> @builtin(position) vec4f  {
    return vec4f(pos,0.,1.);
}

const TAU = 6.2831853070;

fn hsv(h: f32, s: f32, v: f32) -> vec3f { 
    return v * mix( vec3f(1.0), vec3f(clamp((abs(fract(h+vec3f(3.0, 2.0, 1.0)/3.0)*6.0 - 3.0) - 1.0), vec3f(0.0), vec3f(1.0))),  vec3f(s));
}

@fragment
fn fragmentMain(@builtin(position) coord: vec4f) -> @location(0) vec4f {
    let scale = 1. ;
    let uvc = normCoord(coord.xy, sys.resolution) * scale;

    let p = toPolar(uvc);

    let uv = vec2f(log(p.x)-sys.time, p.y * 13 / TAU);

    let s = vec2<f32>(sqrt(3.0), 1.);

    // two hexagon centers
    let hCent = floor(vec4<f32>(uv, uv - vec2<f32>(1.0, 0.5)) / s.xyxy) + 0.5;
    // two hexagon coordinates
    let hCoor = vec4<f32>(uv - hCent.xy * s, uv - (hCent.zw + 0.5) * s);

    // select the hexagon with the smallest distance
    let huv = select(vec4f(hCoor.zw, hCent.zw), vec4(hCoor.xy,hCent.xy), dot(hCoor.xy, hCoor.xy) < dot(hCoor.zw, hCoor.zw));    

    let f = stroke(hex(huv.xy), .05, false) * fill(circle(huv.xy, .1), false);

    let hh = vec2u(abs(huv.zw * vec2(1000,1000)));

    let hash = f32(pcg(hh.x + hh.y )) / f32(0xffffffffu);

    let color = hsv2rgb( vec3(hash, 1., length(uvc)));

    return vec4f(color* f,1.); 
}


fn hsv2rgb(c :vec3f) -> vec3f {
    let k = vec4f(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    let p = abs(fract(c.xxx + k.xyz) * 6.0 - k.www);
    return c.z * mix(k.xxx, clamp(p - k.xxx, vec3(0.0), vec3(1.0)), c.y);
}

fn pcg(v: u32) -> u32 {
	let state = v * 747796405u + 2891336453u;
	let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
	return (word >> 22u) ^ word;
}

//@normCoord-----------------------------------------------------------------------------------------
// normalized coordinates
fn normCoord(coord: vec2<f32>, resolution: vec2<f32>) -> vec2<f32> {
    // bottom left is [-1,-1] and top right is [1,1]
   return (2.0 * coord - resolution) / min(resolution.x, resolution.y) * vec2f(1.,-1.);
}

//@ssaa----------------------------------------------------------------------------------------------
// smoothstep antialias with fwidth
fn ssaa(v: f32) -> f32 { return smoothstep(-1.,1.,v/fwidth(v)); }
//@stroke--------------------------------------------------------------------------------------------
// stroke an sdf 'd', with a width 'w', and a fill 'f' 
fn stroke(d : f32, w: f32, f: bool) -> f32 {  return abs(ssaa(abs(d)-w*.5) - f32(f)); }
//@fill----------------------------------------------------------------------------------------------
// fills an sdf 'd', and a fill 'f'. false for the fill means inverse 
fn fill(d: f32, f: bool) -> f32 { return abs(ssaa(d) - f32(f)); }
//@rect----------------------------------------------------------------------------------------------
// a signed distance function for a rectangle 's' is size
fn rect(uv: vec2f, s: vec2f) -> f32 { let auv = abs(uv); return max(auv.x-s.x,auv.y-s.y); }
//@circle--------------------------------------------------------------------------------------------
// a signed distance function for a circle, 'r' is radius
fn circle(uv: vec2f, r: f32) -> f32 { return length(uv)-r; }
//@hex-----------------------------------------------------------------------------------------------
// a signed distance function for a hexagon, flat-topped
fn hex(uv: vec2f) -> f32 { let auv = abs(uv); return max(auv.x * .866 + auv.y * .5, auv.y) - .5; }

// circle inversion, r is the radius of the circle for inversion
fn inversion(uv: vec2f, r:f32) -> vec2f { return (r*r*uv)/vec2(dot(uv,uv)); }

// 2d rotation matrix, angle in radians
fn rot2(a: f32) -> mat2x2f { return mat2x2(cos(a),sin(a),-sin(a),cos(a)); }
//@modpolar-------------------------------------------------------------------------------------------
// returns the reference frame in modular polar form, the plane is mapped tto a sector align with the positive x axis
// assumes a normalized uv  bottom left is [-1,-1] and top right is [1,1]
fn modpolar(uv: vec2f, n: f32) -> vec2f { let angle = atan2(-uv.y,uv.x); let hm = (6.283/(n*2.)); return uv*rot2((angle + (6.283/n) - (hm*2.) + 3.1415) % (6.283/n) - angle - hm); }


// generic 'n' side polygon, contained in the circle of radius
fn poly(uv: vec2f, r : f32, n:f32) -> f32 {  return length(uv) * cos(((atan2(uv.y, -uv.x)+ 3.14)  % (6.28 / n)) - (3.14 / n)) - r; }

// define sdf for angular pattern of rays around the reference frame. 
fn rays(uv:vec2f , n: f32) -> f32 { return ((atan2(uv.y,uv.x)+3.14) % (6.283 / n) ) - (3.14 / n); }

// 
// accepts uv as the reference frame and the rotating factor [0.,1.] b, and the thickness of the spiral s
fn spiral(uv:vec2f, b:f32,  s: f32) -> f32 {
    let l = length(uv);
    let a = atan2(uv.y,-uv.x);
    
    let n = select(0.,((log(l)/b) - a) / 6.283, l != 0.);
    
    let l1 = exp( b * (a + floor(n) * 6.284));
    let l2 = exp( b * (a + ceil(n) * 6.284));
    
    return min( abs(l1 - l) , abs(l2 - l)  ) - s;
}


//-------------------------------------- complex math
fn toCarte(z : vec2f) -> vec2f { return z.x * vec2(cos(z.y),sin(z.y)); }
fn toPolar(z : vec2f) -> vec2f { return vec2(length(z),atan2(z.y,z.x)); }

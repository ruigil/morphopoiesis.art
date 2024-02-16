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

const N = 80;
const PI2 = 6.2831853070;
// this version keeps the circle inversion at r=1,// but the affine transform is variable:
// user controls the rotate and zoom,
// translate automatically cycles through a range of values.
// h: hue(0..1. 0=red, .05=amber, .20=yellow-green...)
// s: saturation (0..1)
// v: value: 0=black, 1=white
fn hsv(h: f32, s: f32, v: f32) -> vec3f { 
    return v * mix( vec3f(1.0), vec3f(clamp((abs(fract(h+vec3f(3.0, 2.0, 1.0)/3.0)*6.0 - 3.0) - 1.0), vec3f(0.0), vec3f(1.0))),  vec3f(s));
}

@fragment
fn fragmentMain(@builtin(position) coord: vec4f) -> @location(0) vec4f {
    let uv = normCoord(coord.xy, sys.resolution);

    let r = fill(circle(uv,.5),false) * fill(rect(inversion(uv, .5) - sys.mouse.xy , vec2f(0.5,0.5)), false);
    return vec4f(vec3f(r), 1.0);
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

// circle inversion, r is the radius of the circle for inversion
fn inversion(uv: vec2f, r:f32) -> vec2f { return (r*r*uv)/vec2(dot(uv,uv)); }


/*
    // map frag coord and mouse to model coord
    let uv = coord.xy / sys.resolution.xy;
    var v = (coord.xy - sys.resolution.xy / 2.) * 10.0 / min(sys.resolution.y,sys.resolution.x);
    // transform parameters
    let angle = 0.02 * sys.time;
    //PI2*mouse.x;
    let C = cos(angle);
    let S = sin(angle);
    let scale = .15;
    let t = scale * mat2x2(C, -S, S, C);
    let shift = vec2f( 2.*sys.mouse.x - 1., 2.*sys.mouse.y - 1. );
    let rad2 = 1.5; 
    // square of the inversion radius
    var rsum = 0.0;
    var rcount = 0.;
    for ( var i = 0; i < 2; i++ ) { 
        // circle inversion transform  
        var rr = dot(v,v);//v.x*v.x + v.y*v.y;
        if ( rr > rad2 ) {
            rr = rad2/rr;
            v.x = v.x * rr;
            v.y = -v.y * rr;
            rcount += 1.; 
        } 
        rsum = max(rr, rsum);
        // affine transform  
        v = t * v + shift;
    }
    let col = rsum * 40./rad2 - 4.;
    // - 0.1*time;
    // color basis vectors
    let cb = mat3x3(hsv(-0.02*sys.time+rcount*0.29, 0.9, 1.),vec3f(0.), hsv(-0.02*sys.time, 0.1, 1.));
    let cv = clamp(vec3f( -0.9*(cos(col*1.2)+.1), 0., 15.*(cos(col*1.2) - 0.9) ), vec3f(0.), vec3f(1.));
    return vec4f(  cv, 1.0 );

*/
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
	//vec2  r = iResolution.xy, p = w - r*.5;
	
    let d = length(uv); 
    var c= 1.;
    let x = pow(d, .1);
    let y = atan2(uv.x, -uv.y) / 6.28;
	
	for (var i = 0.; i < 2.; i += 1.0) {
		c = min(c, length(fract(vec2f(x - sys.mouse.x * i , fract(y + i * .0625) ) * vec2f(10.,8.) ) * 2. - 1.));
    }    

	let f = vec4f(d + 10. * c * d * d * (.6 - d));
    //return vec4f( d + 10. * c * d * d * (.6 - d));
    //return vec4f(c);
    return vec4f(rose(uv , vec2(20.,5.), 3.) * smoothstep(1., 0.6, d)); 
}



fn rose(uv: vec2f, s: vec2f, n: f32) -> f32 {
    var c = 1.;
    let r = pow(length(uv), .1);
    let a = atan2(uv.x, -uv.y) / 6.28;
	for (var i = 0.; i < n; i += 1.0) {
		c = min(c, length(fract(vec2f(r  - sys.mouse.x * i, fract(a + i * ( 1./ (s.y * (i + 1.)) ) ) ) * s ) * 2. - 1.));
    }    
    return c;
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
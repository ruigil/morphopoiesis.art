// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

const TAU: f32 = 6.28318530718;

struct Sys {
    resolution: vec2<f32>,
    mouse: vec4<f32>,
    aspect: vec2<f32>
}

@group(0) @binding(0) var<uniform> sys: Sys;

@vertex
fn vertexMain(@location(0) pos: vec2<f32>) -> @builtin(position) vec4f  {
    return vec4f(pos,0.,1.);
}

@fragment
fn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    
    // normalize coordinates and couple them with the mouse
    var r = normCoord(fragCoord.xy, sys.resolution) - (sys.mouse.xy * 2. * vec2(-1.,1.));
    let uv = r;
    // create an hexagonal lattice.
    let hex = lat6(r*2.);
    // this reference frame is relative to the center of each hexagon
    r = hex.xy * 4.; 
    
    // a six fold angular mirror
    // we adjust the previous pattern 60 degrees and translate it
    r = modpolar(r, 6.0, radians(30.0));
    r = r * rot(radians(-60.0));
    r = r - vec2<f32>(4.0, 0.0);
    
    // a three fold angular mirror
    // we adjust the previous pattern 60 degrees and translate it
    r = modpolar(r, 3.0, 0.0);
    r = r * rot(radians(-60.0));
    r = r - vec2<f32>(2.0, 0.0);
    
    // a three fold angular mirror
    // we adjust the previous pattern 60 degrees and translate it
    r = modpolar(r, 3.0, 0.0);
    r = r * rot(radians(-60.0));
    r = r - vec2<f32>(1.0, 0.0);
    
    // a mirror on the y axis and a flip on the x axis
    // we adjust the previous pattern 60 degrees and translate it
    r = vec2<f32>(r.x * sign(r.y), abs(r.y) - .6);

    // the pattern is just two simple rectangles rotated 30 degrees
    let r1 = r.xy * rot(radians(30.0));
    let r2 = r.xy * rot(radians(-30.0));

    // the pattern
    let f = 
        fill(rect(r1, vec2<f32>(0.5, 1.7)), 0.01, true) *
        fill(sin((r1.x - 0.707) * 60.0), 0.1, true) *
        smoothstep(0.2, 0.8, abs(r1.y)) *
        smoothstep(0.3, 0.0, abs(r1.x)) *

        fill(rect(r2, vec2<f32>(0.55, 1.7)), 0.01, false) +
        fill(rect(r2, vec2<f32>(0.5, 1.7)), 0.01, true) *
        fill(sin((r2.x - 0.707) * 60.0), 0.1, true) *
        smoothstep(.3, 0.0, abs(r2.x));
  
    let rnd = hash3(vec3u(u32(hex.z+100.),u32(hex.w+50.),0u));
    let background = hsv2rgb(vec3f(.7,1.,.1 + .1 * smoothstep( .0, .9, length(hex.xy)) )) ;
    let foreground = hsv2rgb(vec3(.0+rnd.x*.1, .3 + rnd.y*.7, .7 + rnd.x* .3) ) * f * smoothstep( .9, .2, length(hex.xy));  
    
    let color = mix(background, foreground, f);

    return vec4f( color ,1.);
}

// rotation in 2d
fn rot(angle: f32) -> mat2x2<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return mat2x2<f32>(c, -s, s, c);
}
// sdf for a rectangle, with size
fn rect(r:vec2<f32>, size:vec2<f32>) -> f32 { return max(abs(r.x) - size.x * .5, abs(r.y) - size.y * .5); }

// fills an sdf 'd', and a fill 'f'. false for the fill means inverse 
fn fill(d:f32, e:f32, f:bool) -> f32 { return abs(smoothstep(0. ,e , d ) - select(0.,1.,f)); }

// does a polar modular repetition of the coordinates
fn modpolar(st: vec2<f32>, n: f32, phase: f32) -> vec2<f32> {
    let angle = atan2(st.y, st.x) - phase;
    let segment = angle - (TAU/n) * floor( (angle*n) / TAU) + phase;
    return vec2<f32>(cos(segment), sin(segment)) * length(st);
}

// remaps the plane to an hexagon centered at the origin with radius 1.
// return a vec4 that has the remapped point in the xy component
// and the hexagonal coordinate of the point as the zw component
// https://www.redblobgames.com/grids/hexagons/
fn lat6(r: vec2<f32>) -> vec4<f32> {

    // convert pixel to hexagonal : 2/3, 0, -1/3, sqrt(3)/3
    let qr = r * mat2x2(0.66666, .0, -.33333, 0.57735);

    // round hex coordinates for center
    var hc = vec3f(floor(qr.x+.5), floor(-qr.x-qr.y+.5), floor(qr.y+.5));
    // calculate the differences to the center
    var hd = vec3f(abs(hc.x -qr.x), abs(hc.y - (-qr.x-qr.y)), abs(hc.z -qr.y)  );
    
    // axis choice based on difference to center
    if ((hd.x > hd.y) && (hd.x > hd.z)) {
        hc.x = -hc.y-hc.z;
    }
    else if (hd.y > hd.z) {
        hc.y = -hc.x-hc.z;
    }
    else { hc.z = -hc.x-hc.y; }

    // inverse hexagonal to pixel : 3/2, 0, sqrt(3)/2, srqt(3)
    let center = hc.xz * mat2x2(1.5, .0, 0.866, 1.732);

    return vec4(r-center,hc.xz);
}

// normalized coordinates
fn normCoord(coord: vec2<f32>, resolution: vec2<f32>) -> vec2<f32> {
    // bottom left is [-1,-1] and top right is [1,1]
   return (2.0 * coord - resolution) / min(resolution.x, resolution.y) * vec2f(1.,-1.);
}

// https://www.pcg-random.org/
fn pcg3d(pv:vec3u) -> vec3u {

    var v = pv * 1664525u + 1013904223u;

    v.x += v.y*v.z;
    v.y += v.z*v.x;
    v.z += v.x*v.y;

    v ^= v >> vec3u(16u);

    v.x += v.y*v.z;
    v.y += v.z*v.x;
    v.z += v.x*v.y;

    return v;
}

// converts hue saturation value into red green blue
fn hsv2rgb(c :vec3f) -> vec3f {
    let k = vec4f(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    let p = abs(fract(c.xxx + k.xyz) * 6.0 - k.www);
    return c.z * mix(k.xxx, clamp(p - k.xxx, vec3(0.0), vec3(1.0)), c.y);
}

// an hash accepting 3 ints and returning 3 floats between 0 and 1
fn hash3( seed: vec3u) -> vec3f {
    return vec3f( vec3f(pcg3d(seed)) * (1. / f32(0xffffffffu)) ) ;
}

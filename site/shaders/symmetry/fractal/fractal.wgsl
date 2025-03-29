
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

    var r = coord.xy/sys.resolution;
    var f = 0.;

    // we apply a iterative transformation, that rotates the space
    // this allow us to view all the result of all the rotations of the space
    for (var i = 0 ; i < 7; i++) {
        // abs to introduce a symmetry of the axis
        r = abs(2.*fract(r)-1.) * 
            // a rotation that varies in time and in the iteration
            rot2(radians((120.- (sys.mouse.x * 60.)) * sin( (sys.time*.2) + f32(i)/6.283) ) );

        // here we have a function exp that serves as the value to accumulate.
        
        // it has the property of exp(0) = 1 and the negative side 
        // tends to zero without reaching it.

        // we use it to accumulate on the direction of the x and y axis
        f += exp(-abs(r.y)  - abs(r.x) * 20.) ;
    }

    return vec4(hsv2rgb(vec3(f+.7,.9,fract(f+.2))),1.);
}

// 2d rotation matrix, angle in radians
fn rot2(a: f32) -> mat2x2f { 
    return mat2x2(cos(a),sin(a),-sin(a),cos(a)); 
}

// converts hue saturation value into red green blue
fn hsv2rgb(c :vec3f) -> vec3f {
    let k = vec4f(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    let p = abs(fract(c.xxx + k.xyz) * 6.0 - k.www);
    return c.z * mix(k.xxx, clamp(p - k.xxx, vec3(0.0), vec3(1.0)), c.y);
}

struct Sys {
    time: f32,
    frame: u32,
    aspect: vec2<f32>,
    mouse: vec4<f32>,
    resolution: vec2<f32>
}

struct VertexInput {
    @location(0) pos: vec2<f32>,
    @builtin(instance_index) instance: u32
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

struct Params {
    a: vec2<f32>,
    b: vec2<f32>,
    c: vec2<f32>,
    d: vec2<f32>,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<uniform> sys: Sys;

@vertex
fn vertexShader(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4<f32>(input.pos, 0.0, 1.0);
    output.uv = input.pos * sys.aspect;
    return output;
}

@fragment
fn fragmentShader(input: VertexOutput) -> @location(0) vec4<f32> {
    let z = vec2<f32>(input.uv*4.);
    
    // Apply Möbius transform: w = (az + b) / (cz + d)
    let numerator = complex_mul(params.a, z) + params.b;
    let denominator = complex_mul(params.c, z) + params.d;
    let w = complex_div(numerator, denominator);
    
    let m = sys.mouse.xy * 2. - 1.;

    let a = atan2(z.y,z.x) * 4.;
    
    ////return vec4(vec3( stroke(rect(w + m, vec2(1.)), .01, true) ),1.);
    //return vec4( vec3(fill(spiral(w,.05, .01),true)) ,1.);
    //let v = dot(z,vec2(cos(a),sin(a)));
    let v = step(0.01, abs(dot(z, vec2(cos(a),sin(a)) ) - 1.) );
    return vec4(vec3(v),1.);
}



fn complex_mul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

fn complex_div(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    let denom = b.x * b.x + b.y * b.y;
    return vec2<f32>(
        (a.x * b.x + a.y * b.y) / denom,
        (a.y * b.x - a.x * b.y) / denom
    );
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
// accepts uv as the reference frame and the rotating factor [0.,1.] b, and the thickness of the spiral s
fn spiral(uv:vec2f, b:f32,  s: f32) -> f32 {
    let l = length(uv);
    let a = atan2(uv.y,-uv.x);
    
    let n = select(0.,((log(l)/b) - a) / 6.284, l != 0.);
    
    let l1 = exp( b * (a + floor(n) * 6.284));
    let l2 = exp( b * (a + ceil(n) * 6.284));
    
    return min( abs(l1 - l) , abs(l2 - l)  ) - s;
}

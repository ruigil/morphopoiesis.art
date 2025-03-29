// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

// Constants 
const PI: f32 = 3.141592653589793;
const TAU: f32 = 6.283185307179586;
const HALFPI: f32 = 1.570796326794897;

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
fn fragmentMain( @builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {

    // normalize coordinates [-1,1]
    var r = normCoord(fragCoord.xy,sys.resolution);
    
    // controls the number of iterations
    let n = i32(floor(sys.mouse.x * 10.0));

    // 6 shapes in 6 sectors of an hexagon
    let angle = atan2(r.y,r.x) + PI;
    let shape = floor((angle * 6.) / TAU);
    r += vec2<f32>(cos(shape * (TAU/6.) + (TAU/12.)), sin( shape * (TAU/6.) + (TAU/12.)));

    var v  = 0.;
    switch (i32(shape)) {
        case 0: { v = honey(r,n); break; } 
        case 1: { v = sierpinski(r,n); break; } 
        case 2: { v = fern(r,n); break; } 
        case 3: { v = sierpinskiCarpet(r,n); break; } 
        case 4: { v = tree(r,n); break; } 
        case 5: { v = snowflake(r,n); break; } 
        case default: { v = 0.; } 
    }

    return vec4(vec3(v), 1.0);
}


fn sierpinski(r:vec2<f32>, iter: i32) -> f32 {
    let n = select(iter, 6, iter > 6);
    // start with a normalized reference frame
    var lr = r - vec2(0.,.3);
    for (var i = 0; i < n; i++) {
        // we apply a radial symetry of 3, and a translation
        lr = modpolar(lr * 2.0, 3.0, radians(30.0)) - vec2<f32>(0.0, 0.5);
    }
    // in the last transformation we just draw one circle.
    return stroke(circle(lr, 0.45), 0.1, true);
}

fn sierpinskiCarpet(r:vec2<f32>, iter: i32) -> f32 {
    let n = select(iter, 4, iter > 4);
    // start with a normalized reference frame
    var lr = r * 2. + vec2(.5,.3);
    for (var i = 0; i < n; i++) {
        // the fold operation is a symmetry along an arbitrary axis
        lr = fold(abs(lr * 3.0), radians(45.0)) - vec2<f32>(1., .5);
        lr = vec2<f32>(lr.x, abs(lr.y) - .5);
    }
    // in the last transformation we just draw one circle.
    return fill(circle(lr, 0.5), true);
}

fn honey(r:vec2<f32>, iter: i32) -> f32 {
    let n = select(iter, 4, iter > 4);
    // start with a normalized reference frame
    var lr = r * 3 - vec2(.7,.5);
    for (var i = 0; i < n; i++) {
        // we apply a radial symetry of 6, and a translation
        lr = modpolar(lr * 2.0, 6.0, radians(60.0)) - vec2<f32>(0.0, 1.0);
    }
    // in the last transformation we just draw one hexagon.
    return stroke(hex(lr), 0.1, true);
}

fn fern(r:vec2<f32>, iter: i32) -> f32 {
    // start with a normalized reference frame
    var lr = r * 1.5 - vec2(-.5,.2);
    
    for (var i=0; i<iter; i++) {
        lr = select(
            // we rotate, scale and translate
            (( lr * rot2( radians(45.) ) ) * 1.414 ) - vec2(.0, -.5),
            // we scale and translate 
            (lr * 2.) - vec2(-.5, .5), 
            lr.y  > lr.x); // we choose among two sides of a 45 degrees line 
    }

    // in the last transformation we just draw one circle.
    return fill( circle(lr, .5), true);
}

fn snowflake(r:vec2<f32>, iter: i32) -> f32 {
    let n = select(iter, 3, iter > 3);

    var lr = r * 1.7 - vec2(.35,-.15);
    // we create an original symmetry on the x axis
    // and then we apply another on -150 degrees to copy
    // the upper domain down. This gives a radial symmetry of 3
    // with the domain between 60 and 90 degrees.
    lr = fold( fold(lr,radians(90.)), radians(-150.)) - vec2(.0,.3);
    // then we iterate the koch curve, by combining the x simmetry
    // with a 60 degree symmetry fold
    for (var i=0; i < n; i++) {
        // the fold operation is a symmetry along an arbitrary axis
        // like folding a piece of paper
        lr = fold(3. * fold(lr, radians(90.)) - vec2(.5,.0) , radians(60.)) - vec2(.5,.0);
    }
    // draw a single shape in the resulting reference frame
    // in this case a simple rectangle
    return stroke( rect(lr, vec2(.7,.4)) , .1, true);
}

fn tree(r:vec2<f32>, iter: i32) -> f32 {    
    
    var f = 0.; // collect the result
    
    // for recursivity, just iterate 
    // a serie of transformations of the refrence frame
    var lr = r * 3. + vec2(.0,2.);
    for (var i = 0; i < iter; i++) {
        
        lr -= vec2(.0,.25);

        lr = select(
            ((lr * rot2(radians(35.)) ) + vec2(-.15, .1)),
            ((lr * rot2(radians(-35.)) ) + vec2(.15, -.1)),
            // we introduce a different translation and rotation between 
            // the left, and right side of the tree
            lr.x > 0. 
        ); 
        
        // scaling
        lr *= vec2(2.,1.);
        // add the branch
        f += fill(rect(lr , vec2(.2-(r.y*.3),.7)), true);
        // and repeat...
    }

    // add finally add the trunk
    f += fill(rect(r * 4. + vec2(0.,2.75), vec2(.2-(r.y*.1),.7)), true);

    return f;
}

// helper functions
//-------------------------------------------------------------------

// a signed distance function for a hexagon
fn hex(uv: vec2f) -> f32 { 
    let auv = abs(uv); 
    return max(auv.x * .866 + auv.y * .5, auv.y) - .5; 
}

// a signed distance function for a rectangle 's' is size
fn rect(uv: vec2f, s: vec2f) -> f32 { 
    let auv = abs(uv); 
    return max(auv.x-s.x,auv.y-s.y); 
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

// return a coordinate system in polar modular form
// this means that all angular sectors 1,2,3 are mapped to the first sector
fn modpolar(st: vec2<f32>, n: f32, phase: f32) -> vec2<f32> {
    let angle = atan2(st.y, st.x) - phase;
    let segment = angle - (TAU / n) * floor((angle * n) / TAU) + phase;
    return vec2<f32>(cos(segment), sin(segment)) * length(st);
}

// 2d rotation matrix, angle in radians
fn rot2(a: f32) -> mat2x2f { 
    return mat2x2(cos(a),sin(a),-sin(a),cos(a)); 
}

// a 'fold' is a kind of generic abs(). 
// it reflects half of the plane in the other half
// the variable 'a' represents the angle of an axis going through the origin
// so in normalized coordinates uv [-1,1] 
// fold(uv,radians(0.)) == abs(uv.y) and fold(uv,radians(90.)) == abs(uv.x) 
fn fold(uv: vec2f, a: f32) -> vec2f { 
    let axis = vec2f(cos(a-HALFPI),sin(a-HALFPI)); 
    return uv - (2. * min(dot(uv,axis),.0) * axis); 
}



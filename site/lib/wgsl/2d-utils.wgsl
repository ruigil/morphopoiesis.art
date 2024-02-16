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
// a signed distance function for a hexagon
fn hex(uv: vec2f) -> f32 { let auv = abs(uv); return max(auv.x * .866 + auv.y * .5, auv.y) - .5; }
//@tri-----------------------------------------------------------------------------------------------
// a signed distance function for a equilateral triangle
fn tri(uv: vec2f) -> f32 { return max(abs(uv.x) * .866 + uv.y * .5, -uv.y) - .577; }
//@fold----------------------------------------------------------------------------------------------
// a 'fold' is a kind of generic abs(). 
// it reflects half of the plane in the other half
// the variable 'a' represents the angle of an axis going through the origin
// so in normalized coordinates uv [-1,1] 
// fold(uv,radians(0.)) == abs(uv.y) and fold(uv,radians(90.)) == abs(uv.x) 
fn fold(uv: vec2f, a: f32) -> vec2f { let axis = vec2f(cos(a),sin(a)); return uv-(2.*min(dot(uv,axis),.0)*axis); }
//@rot2-----------------------------------------------------------------------------------------------
// 2d rotation matrix, angle in radians
fn rot2(a: f32) -> mat2x2f { return mat2x2(cos(a),sin(a),-sin(a),cos(a)); }
//@inversion------------------------------------------------------------------------------------------
// circle inversion
fn inversion(uv: vec2f, r:f32) -> vec2f { return (r*r*uv)/vec2(dot(uv,uv)); }

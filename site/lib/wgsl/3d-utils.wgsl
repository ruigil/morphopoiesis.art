
/*

// 3d rotation matrix
// accept a vec3 with yaw, pitch and roll angles
mat3 rot3(vec3 angle) {
    vec3 ca = cos(angle);
    vec3 sa = sin(angle);
    return mat3(
        ca.x*ca.y, sa.x*sa.y, -sa.y, 
        ca.y*sa.y*sa.z-sa.x*ca.z, sa.x*sa.y*sa.z+ca.x*ca.z, ca.y*sa.z,
        ca.x*sa.y*ca.z+sa.x*sa.z, sa.x*sa.y*ca.z-ca.x*sa.z, ca.y*ca.z);
}
*/
struct Ray {
    origin: vec3<f32>,
    direction: vec3<f32>,
}


// https://github.com/ferminLR/webgpu-path-tracing
// Möller–Trumbore ray-triangle intersection algorithm
// from http://www.graphics.cornell.edu/pubs/1997/MT97.pdf
const EPSILON : f32 = 0.000001;
fn triangle_hit(r : Ray, v0 : vec3<f32>, v1: vec3<f32>, v2 : vec3<f32>, t : ptr<function, f32>) -> bool {
  
  let e1 = v1 - v0;
  let e2 = v2 - v0;
  let p = cross(r.direction, e2);
  let det = dot(e1, p); 

  // check if ray is parallel to triangle
  if (abs(det) < EPSILON) { return false; }

  // calculate barycentric coordinate u
  let inv_det = 1.0 / det;
  let s = r.origin - v0; // called T in paper, not used here to avoid confusion with *t
  let u = inv_det * dot(s, p);

  if (u < 0.0 || u > 1.0) { return false; }

  // calculate barycentric coordinate v
  let q = cross(s, e1);
  let v = inv_det * dot(r.direction, q);

  if (v < 0.0 || u + v > 1.0) { return false; }

  // distance from the ray origin to the hit point
  *t = inv_det * dot(e2, q);
  if (*t < EPSILON) { return false; }

  // backface culling
  if (dot(cross(e1, e2), r.direction) > 0.0 ){ return false; }

  return true;
}

// a signed distance function for a sphere
fn sphere(p: vec3f, radius: f32) -> f32 { return length(p) - radius; }

// a signed distance function for horizontal plane
fn plane(p: vec3f) -> f32 { return p.y; }

// a signed distance function for a box
fn box( p:vec3f , size: vec3f) -> f32 {
    let d = abs(p) - size * .5;
    return min( max(d.x, max(d.y,d.z)), 0. ) + length(max(d , 0.));
}

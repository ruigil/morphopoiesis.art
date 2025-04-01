const TAU: f32 = 6.283185307179586;

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
   // polar coordinate reference frame
    let r = toPolar(normCoord(coord.xy, sys.resolution)) ;
    
    // noise sample reference frame
    let nr = vec3( toCarte(r), r.x - sys.time * .2);
    // noise epsilon difference
    let ne = vec3(toPolar(vec2(0.001, .0)),0.0);
    // moise scale
    let ns = 100. * smoothstep(2.5,0.,length(nr.xy));

    // get the normal with the finite difference method
    let normal = normalize(ns*vec3(heightmap( nr + ne.xyz) - heightmap( nr - ne.xyz), heightmap( nr + ne.yxz) - heightmap( nr - ne.yxz), 1./ns ));
      
    // light position
    let lp = vec3(4* vec2(sys.mouse.x,1.-sys.mouse.y) - vec2(2),2.);

    // the value of the heighmap at this pixel
    let height =  heightmap(nr) ; 
    // a color gradient to map the heighfield to a color
    let gradient = earth(1.- min( height + (length(nr.xy) * 1.), 1.));
    // the bumpmap technique to light the heighmap
    let color = bumpmap(nr.xy, gradient, lp, normal);

    //return vec4(vec3(heightmap(nr)),1.);
    return vec4(pow(color,vec3(1.4))  ,1.);
}

// a bumpmap technique
fn bumpmap(r:vec2f, color:vec3f, lp:vec3f, normal:vec3f) -> vec3<f32> {
    // the diffuse color is the color when ther is light
    let diffuse = color;
    // the ambient color is when there is no light, usually darker
    let ambient = diffuse * .1;
    // the position of the eye is just "above" the screen
    // we count away from the screen the z direction
    let eye = vec3(0.,0., 1.);
    // the hit point is the actual coordinate on the plane at z = 0
    let hit = vec3(r,0.);
    
    // light intensity
    let li = vec3(1.); 
    // light direction
    let ld = normalize(lp - hit);
    // view direction
    let vd = normalize(eye - hit);

    // the light reflected for specular component
    let re = normalize( reflect(-ld, normal ) );

    // color is ambient + light intensity * ( diffuse * light diffuse + specular * light specular )
    return ambient + li * ( diffuse * max(dot(ld,normal),0. ) +  1. * pow( max( dot(re,vd) ,0.) ,32.) );
}


// the heightmap is a fractal brownian moton noise, 
// distorted with itself 
fn heightmap(p : vec3<f32>) -> f32 {
    let r = p * 5. + 1000.;
    //let q = fractalNoise3d( vec3(r.x , r.y , r.z ), 4);
    let q = valueNoise3d( r * vec3(.3,.3, 4 ));
    
    let f = valueNoise3d( r - q ) ;
    
    let sun = fill(circle(p.xy, .01), false);
    
    return f * sun; 
}

//-------------------------------------- complex math
fn toCarte(z : vec2f) -> vec2f { return z.x * vec2(cos(z.y),sin(z.y)); }
fn toPolar(z : vec2f) -> vec2f { return vec2(length(z),atan2(z.y,z.x)); }

fn gradient(brightness: vec3<f32>, saturation: vec3<f32>, frequency: vec3<f32>, offset: vec3<f32>, t: f32) -> vec3<f32> {
    return clamp(brightness + saturation * cos(TAU * (frequency * t + offset)), vec3<f32>(0.0), vec3<f32>(1.0));
}
fn earth(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(0.9), vec3<f32>(0.47, 0.57, 0.67), t);
}
// a signed distance function for a circle
fn circle(p: vec2<f32>, r: f32) -> f32 {
    return length(p) - r;
}
// fills an sdf 'd', and a fill 'f'. false for the fill means inverse 
fn fill(d: f32, f: bool) -> f32 { return abs(smoothstep(0,0.7,d) - f32(f)); }
// normalized coordinates
fn normCoord(coord: vec2<f32>, resolution: vec2<f32>) -> vec2<f32> {
    // bottom left is [-1,-1] and top right is [1,1]
   return (2.0 * coord - resolution) / min(resolution.x, resolution.y) * vec2f(1.,-1.);
}

// value noise in 3d
fn valueNoise3d(p: vec3f) -> f32 {
    let i = vec3u(floor( p ));
    let f = fract( p );

    // quintic interpolation
    let u = f*f*f*(f*(f*6.0-15.0)+10.0);
	
    return mix(mix(mix( hash3( i + vec3u(0,0,0)).x, 
                        hash3( i + vec3u(1,0,0)).x, u.x),
                   mix( hash3( i + vec3u(0,1,0)).x, 
                        hash3( i + vec3u(1,1,0)).x, u.x), u.y),
               mix(mix( hash3( i + vec3u(0,0,1)).x, 
                        hash3( i + vec3u(1,0,1)).x, u.x),
                   mix( hash3( i + vec3u(0,1,1)).x, 
                        hash3( i + vec3u(1,1,1)).x, u.x), u.y), u.z);
}


fn hash3( seed: vec3u) -> vec3f {
    return vec3f( vec3f(pcg3d(seed)) * (1. / f32(0xffffffffu)) ) ;
}

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

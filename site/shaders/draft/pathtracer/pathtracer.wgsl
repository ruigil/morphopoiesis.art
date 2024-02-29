// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

const PI = 3.1415926535897932384626433832795;

struct Sys {
    time: f32,
    frame: u32,
    mouse: vec4<f32>,
    resolution: vec2<f32>,
    aspect: vec2<f32>
}

struct VertexOutput {
  @builtin(position) pos : vec4<f32>,
  @location(0) fragUV : vec2<f32>,
}

struct Ray {
    origin: vec3<f32>,
    direction: vec3<f32>
}

struct Hit {
    position: vec3<f32>,
    distance: f32,
    sign: f32
}

struct Material {
    color: vec3<f32>,
    emission: vec3<f32>,
    roughness: f32,
    metalness: f32,
    limit: bool
}

struct Debug {
    color: vec4<f32>,
    aspect: vec2<f32>
}



@group(0) @binding(0) var<uniform> sys: Sys;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var tex: texture_2d<f32>;
@group(0) @binding(3) var buffer: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(4) var<storage, read_write> debug : Debug;

@vertex
fn vertexMain(@location(0) pos: vec2<f32>) -> VertexOutput  {
    var output: VertexOutput;
    output.pos = vec4<f32>(pos, 0.0, 1.0);
    output.fragUV = (vec2<f32>(pos.x,- pos.y) + 1.) * .5;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  //return vec4<f32>(textureSample(tex, samp, input.fragUV).rgb,1.);
  return vec4<f32>(tosRGB(textureSample(tex, samp, input.fragUV).rgb),1.);
}

@compute @workgroup_size(8, 8)
fn pathTracer(@builtin(global_invocation_id) cell : vec3<u32>) {
    let dims = vec2<f32>(textureDimensions(tex, 0));
    let c = textureLoad(tex, vec2<u32>(sys.mouse.xy * dims), 0);
    let uv = ((vec2<f32>(cell.xy) / dims ) * 2. - 1.) * sys.aspect;

    debug.color = c;
    debug.aspect = sys.aspect;

    let ray = setCamera( uv, vec3<f32>(0.,-1.5,2.5), vec3<f32>(0.,0.,0.), radians(90.) );

    let color = multisample( ray, vec3((2. / dims) * sys.aspect,0.), 1);
    let lastColor = textureLoad(tex, cell.xy, 0).rgb;

    // mixing the current computed color with the last one
    let finalColor = mix(lastColor, color, 1. / f32(sys.frame + 1u));
    textureStore(buffer, cell.xy, vec4(finalColor,1.) );
}

fn multisample( ray: Ray, pixelSize: vec3<f32>, samples: i32) -> vec3<f32> {

    var color = vec3<f32>(0.);

    for (var s=0; s < samples; s++) {
      let seed = vec3<u32>( sys.frame, sys.frame, u32(s));
      let delta = (-.5 + rnd33(seed)) * pixelSize;
      color += trace( Ray(ray.origin + delta ,ray.direction), 4 );
    }
    
    return color / f32(samples);
}

fn setCamera( screen: vec2<f32>, eye: vec3<f32>, lookAt: vec3<f32>, fov: f32 ) -> Ray {
    let fw = normalize(lookAt - eye);
    let rt = cross(fw, vec3(0.,1.,0.));
    let up = cross(rt, fw);

    return Ray(eye, normalize(vec3(screen * tan(fov / 2.) , 1.) ) * mat3x3(rt,up,fw) );
}

fn trace(ray: Ray, depth: i32) -> vec3<f32> {
    var r = ray;
    var colorMask = vec3<f32>(1.);
    let sunDir = normalize(vec3(-1.3,-1.3,0.1));
    let sunCol = vec3(1.0,0.8,0.8);
    let skyCol = vec3(0.1,0.4,0.8);
    var accColor = vec3(0.);

    // initialize the point that is going to march along the ray
    for (var dd=0; dd < depth; dd++) {
      var p = r.origin;
      var t = 0.;
      var d = 0.;
      for (var i = 0; i< 100; i++) {
          // calculate the actual distance
          d = sceneSDF( p );
          // if we hit something break, the loop
          if (abs(d) < .001) { break; }
          // march along the ray 
          t += abs(d);
          p = r.origin + r.direction * t;
      }
      let hit = Hit(p, t, sign(d) );      
      let material =  material( ray, hit );
      colorMask *=  material.color;
      let nor = getNormal(hit.position) ;
      accColor += light( colorMask, 8., false, hit.position, nor , r.direction, sunDir, sunCol );
    var skyDir = cosineDirection(nor);
    if( skyDir.y>0.0 ) { skyDir = -skyDir; }

      accColor += light( colorMask, 8., false, hit.position, nor , r.direction, skyDir, skyCol );
      //if (material.limit) { break; }
      //let direction = getNormal(hit.position)  + rndVec(vec3<u32>( sys.frame * 3000u, u32(sys.time * 2000.), u32(sys.time * 1000.)));
      let direction = cosineDirection(nor);
      r = Ray( r.origin + r.direction * (t*.999),  direction );
    }
    
    return accColor / (f32(depth) + 1.);
}

fn tiles( p: vec3<f32> ) -> f32 {
  return plane(p - vec3(0.,.0,.0) );
}

fn ballr( p: vec3<f32> ) -> f32 {
    return sphere( p - vec3( 0.,-0.5, 0.) , .5 );
}
fn ballg( p: vec3<f32> ) -> f32 {
    return sphere( p - vec3( -1.5,-0.5, 0.) , .5 );
}
fn ballb( p: vec3<f32> ) -> f32 {
    return sphere( p - vec3( 1.5,-0.5, 0.) , .5 );
}

fn sceneSDF( p: vec3<f32> ) -> f32 {
    return min(min(min(tiles(p), ballr(p)), ballg(p)), ballb(p));
    //return min(min(tiles(p), ball(p)), -sphere(p - vec3(0.,0.,0.0), 7.));
    //return min(plane(p - vec3(0.,-3.,.0) ), );
}

fn getNormal(p : vec3<f32>) -> vec3<f32> {
	let e = vec2<f32>(.001, 0.);
	return normalize(vec3( sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy), sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy), sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)));
}

fn shadow( ro: vec3f, rd:vec3f ) -> f32 {
    let res = 0.0;
    
    let tmax = 12.0;
    
    var t = 0.001;
    for(var i=0; i<80; i++ ) {
        let h = sceneSDF(ro+rd*t);
        if( h<0.0001 || t>tmax){ break; }
        t += h;
    }

    return select(1.,res, (t<tmax));
}

fn cosineDirection(nor:vec3f) -> vec3f {
    
    let r = rnd33(vec3u(vec3f(sys.time * abs(nor.x) * 1000., abs(nor.y) * 500., abs(nor.z)) ));
    let u = r.x;
    let v = r.y;

    let tc = vec3( 1.0+nor.z-nor.xy*nor.xy, -nor.x*nor.y)/(1.0+nor.z);
    let uu = vec3( tc.x, tc.z, -nor.x );
    let vv = vec3( tc.z, tc.y, -nor.y );
    let a = 6.2831853 * v;
    return sqrt(u)*(cos(a)*uu + sin(a)*vv) + sqrt(1.0-u)*nor;
}

fn light( surfColor: vec3f, surfSpecN: f32, surfIsMetal: bool,
            pos: vec3f, nor:vec3f, rd: vec3f, 
            ligDir: vec3f, ligColor:vec3f ) -> vec3f {
    let fo = select(surfColor,vec3f(0.04), (!surfIsMetal));

    let hal = normalize(ligDir-rd);
    let dif = max(0.0, dot(ligDir, nor));
    let epsilon = 0.0001;
    var sha = 1.0; 
    if( dif > 0.00001 ) { sha = shadow( pos + nor*epsilon, ligDir); }
    
    let spe = (surfSpecN+0.0)/8.0*pow(clamp(dot(nor,hal),0.0,1.0),surfSpecN);
    let fre = fo + (1.0-fo)*pow(clamp(1.0-dot(hal,ligDir),0.0,1.0),5.0);
    
    var res = vec3(0.0);

    if( !surfIsMetal ) {
        res += surfColor * ligColor * dif * sha;
    }
    res += ligColor * dif * sha * spe * fre * 3.0;
    return res;
}


fn material( ray: Ray, hit: Hit ) -> Material {
    let sky = mix( vec3(.4,.7,1.), vec3(1.), (ray.direction.y ) * .5 + .5 );
    var m = Material(sky, vec3<f32>(0.), 0., 0., true);

    if (ballr(hit.position) < .001) {
        //return getNormal(hit.position) ;
        m.color = vec3<f32>(1.0,0.,0.);
        m.limit = false;
    }
    if (ballg(hit.position) < .001) {
        //return getNormal(hit.position) ;
        m.color = vec3<f32>(.0,1.,0.);
        m.limit = false;
    }
    if (ballb(hit.position) < .001) {
        //return getNormal(hit.position) ;
        m.color = vec3<f32>(.0,0.,1.);
        m.limit = false;
    }

    if (tiles(hit.position) < .001) {
        let pos = hit.position * 7.;
        let f = abs(floor(pos*.1));
        m.color = vec3(1.,1.,1.) * (( f.x + f.z) % 2.);
        m.limit = false;
    }


    return m;

    //return mix( vec3(.4,.7,1.), vec3(1.), (ray.direction.y ) * .5 + .5 );
}

// a signed distance function for a sphere
fn sphere(p : vec3<f32>, radius: f32) -> f32 {
  return length(p) - radius; 
}

// a signed distance function for a plane, not really but hey
fn plane(p: vec3<f32>) -> f32 { 
  return abs(p.y);
}

// a signed distance function for a box 
fn box(p : vec3<f32>, size : vec3<f32>) -> f32 {
    let d = abs(p) - size * .5;
    return min( max(d.x, max(d.y,d.z)), 0. ) + length(max(d , vec3(0.) ));
}

// random number between 0 and 1 with 3 seeds and 3 dimensions
fn rnd33( seed: vec3u) -> vec3f {
    return vec3f( vec3f(pcg3d(seed)) * (1. / f32(0xffffffffu)) ) ;
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

// cosine weighted random vector
fn rndVec( seed: vec3u ) -> vec3f {
    let r = rnd33(seed);
    let u = r.x * 2. * PI;
    let v = sqrt(1. - r.y);
    return vec3f( v * cos(u), sqrt(r.y), v * sin(u) );
}

// Converts a color from linear light gamma to sRGB gamma
fn tosRGB(linearRGB: vec3f) -> vec3f {
    let cutoff = vec3<bool>(linearRGB.x < 0.0031308, linearRGB.y < 0.0031308, linearRGB.z < 0.0031308);
    let higher = vec3(1.055) * pow(linearRGB.rgb, vec3(1.0/2.4)) - vec3(0.055); 
    let lower = linearRGB.rgb * vec3(12.92);

    return vec3<f32>(mix(higher, lower, vec3<f32>(cutoff)));
}

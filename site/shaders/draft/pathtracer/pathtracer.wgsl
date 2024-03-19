// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

const PI = 3.1415926535897932384626433832795;
const EPSILON = 0.001;

struct Sys {
    time: f32,
    frame: u32,
    mouse: vec4<f32>,
    resolution: vec2<f32>,
    aspect: vec2<f32>
}

struct Ray {
    origin: vec3<f32>,
    direction: vec3<f32>,
}

struct Hit {
    position: vec3<f32>,
    distance: f32,
    normal: vec3<f32>,
    material: Material,
    sign: f32
}

struct Material {
    color: vec3<f32>,
    emissive: bool,
    metalness: bool,
    dielectric: bool,
    diffuse: bool,
    roughness: f32,
    scattered: Ray
}

struct Params {
    samples: u32,
    depth: u32,
    fov: f32,
    aperture: f32,
    lookFrom: vec3<f32>,
    lookAt: vec3<f32>,
    clear: u32
}

struct Debug {
    color: vec4<f32>,
    emissive: f32,
    metalness: f32,
    dieletric: f32,
    reflectance: f32,
}

@group(0) @binding(0) var<uniform> sys: Sys;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var tex: texture_2d<f32>;
@group(0) @binding(3) var buffer: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(4) var<storage, read_write> debug : Debug;
@group(0) @binding(5) var<uniform> params: Params;
@group(0) @binding(6) var<storage, read_write> samples: array<vec3<f32>>;

struct VertexOutput {
  @builtin(position) pos : vec4<f32>,
  @location(0) fragUV : vec2<f32>,
}

@vertex
fn vertexMain(@location(0) pos: vec2<f32>) -> VertexOutput  {
    var output: VertexOutput;
    output.pos = vec4<f32>(pos, 0.0, 1.0);
    output.fragUV = (vec2<f32>(pos.x,- pos.y) + 1.) * .5;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  return vec4<f32>(linearToSRGB(toneMap(textureSample(tex, samp, input.fragUV).rgb)),1.);
}


@compute @workgroup_size(8, 8)
fn pathTracer(@builtin(global_invocation_id) cell : vec3<u32>) {
    let dims = vec2<f32>(textureDimensions(tex, 0));
    let c = textureLoad(tex, vec2<u32>(sys.mouse.xy * dims), 0);
    let uv = ((vec2<f32>(cell.xy) / dims ) * 2. - 1.) * sys.aspect ;

    let mouseRay = setCamera( (sys.mouse.xy * 2. - 1.) * sys.aspect, params.lookFrom, params.lookAt, vec2(params.fov) );
    let mouseHit = shootRay(mouseRay);
    debug.color = c;
    debug.emissive = f32(mouseHit.material.emissive);
    debug.metalness = f32(mouseHit.material.metalness);
    debug.dieletric = f32(mouseHit.material.dielectric);

    gseed = vec3u(cell.xy, sys.frame);

    let ray = setCamera( uv  , params.lookFrom, params.lookAt, vec2f(params.fov) );

    var color = vec3<f32>(0.);

    let nSamples = params.samples;
    let pixelSize = vec3((2. / dims) * sys.aspect,0.);
    let lastColor = textureLoad(tex, cell.xy, 0).rgb;

    for (var s=0u; s < nSamples; s++) {
      let delta = (random() - .5) * pixelSize;
      color += rayColor( Ray(ray.origin + delta ,ray.direction), params.depth);
    }
    
    let w = 1. / (f32(sys.frame - params.clear + 1));

    let finalColor = clamp(mix(lastColor, color/f32(nSamples), w ), vec3(0.), vec3(1.));
    samples[cell.x + cell.y * u32(dims.x)] = select(finalColor, color/f32(nSamples), params.clear == sys.frame);
}


const K_GAUSSIAN_BLUR = array<f32,9>(0.0625, 0.125, 0.0625, 0.125, 0.25, 0.125, 0.0625, 0.125, 0.0625);

@compute @workgroup_size(8, 8)
fn denoise(@builtin(global_invocation_id) cell : vec3<u32>) {
    let dims = vec2<u32>(textureDimensions(tex, 0));
    
    var acc = vec3(0.);

    for(var i = 0u; i < 9u; i++) {
        let offset =  (vec2u( (i / 3u) - 1u , (i % 3u) - 1u ) + cell.xy + dims) % dims;
        acc += (K_GAUSSIAN_BLUR[i] * samples[offset.y * dims.y + offset.x]);
    } 

    textureStore(buffer, cell.xy, vec4(mix(samples[cell.x + cell.y * u32(dims.x)], acc, 1./f32(sys.frame - params.clear + 1) ), 1.) );
}

fn setCamera( screen: vec2<f32>, eye: vec3<f32>, lookAt: vec3<f32>, fov: vec2f ) -> Ray {

    // camera aperture
    let lookFrom = eye + vec3(diskSample(params.aperture), 0.);

    let fw = normalize(lookFrom - lookAt);
    let rt = cross( vec3(0.,-1.,0.), fw   );
    let up = cross( fw, rt);

    return Ray(lookFrom , normalize(vec3(screen * vec2(-1.,1.) * tan(fov / 2. ) , -1.) ) * mat3x3(rt,up,fw) );

}

// default diffuse material
const defaultMaterial = Material(vec3(1.), false, false, false, true, 0., Ray(vec3(0.), vec3(0.)));

fn shootRay( ray: Ray ) -> Hit {
    var p = ray.origin;
    var t = 0.;
    var d = 0.;

    for(var i=0; i< 100; i++) {
        // calculate the actual distance
        d = sceneSDF( p );
        // if we hit something break, the loop
        if ((abs(d) < EPSILON) || ( d > 400.))  { break; }
        // march along the ray 
        t += abs(d);
        p = ray.origin + ray.direction * t;
    }
    // get the normal
    let n = getNormal(p);
    var h = Hit(p , t, n, material(ray, Hit(p, t, n, defaultMaterial, sign(d) ) ) , sign(d) );
    return h;
}


fn rayColor(ray: Ray, depth: u32) -> vec3<f32> {
    var r = ray;
    var attenuation = vec3(1.);
    var accColor = vec3(0.);
    var i = 0u;

    while( i < depth) {
        i++;
        let hit = shootRay(r);
        // scatter the ray until we hit a light
        r = Ray(hit.material.scattered.origin, hit.material.scattered.direction);
        attenuation *= hit.material.color;

        // if we hit a light stop
        if (hit.material.emissive) {
            accColor += attenuation; break;
        } else if (hit.material.dielectric) {
            accColor += 0.;
            //i--;
        } else { // go on...
            accColor += attenuation * directLighting(hit, r);
        }
    }

    // divide the accumulated color by the depth we reached to maintain enegy conservation.
    return clamp(accColor / f32(i), vec3(.0), vec3(1.) );
}

fn directLighting(hit: Hit, ray: Ray) -> vec3<f32> {
    var lightColor = vec3<f32>(.0);

    let lightIntensity = 10.;

    let lightPoint = sampleLights();
    // we nudge the ray origin to avoid self intersections
    let shadowRay = Ray(hit.position +  (hit.normal * EPSILON), normalize(lightPoint - hit.position));

    // to avoid shooting parallel shadow rays to the light plane
    if (dot(shadowRay.direction, hit.normal) > 0.1) {  
        let shadowHit = shootRay(shadowRay) ;
        
        if (shadowHit.material.emissive) {
            lightColor = (lightIntensity)
                * 1/(pow(shadowHit.distance, 2.))
                * shadowHit.material.color
                * dot(hit.normal, shadowRay.direction);
        }
    }

    return lightColor;
}


fn sampleLights() -> vec3<f32> {
    // we only have ine light, we return a random point on the light plane
    return (randomCube(vec3(1.,0.,1.)) - vec3(.5,0.,.5) ) + vec3(0,2.95,-1.5);
}

//------------------------------------------------------------------------------------------------------------------------------------------
fn sceneSDF( p: vec3<f32> ) -> f32 {
    return min(min(min(min(min(min(min(min(ground(p),light(p)), cube(p)), ball(p)), hat(p)), right(p)), left(p)), ceiling(p)), front(p));
}

fn light( p: vec3<f32> ) -> f32 {
  return box(p - vec3(0.,2.95,-1.5) , vec3f(1.,.1,1.));
}

fn ground( p: vec3<f32> ) -> f32 {
  return plane(p - vec3(0.,.0,.0) );
}

fn front( p: vec3<f32> ) -> f32 {
  return plane(vec3(p.x,(p.z),p.y) - vec3(0.,-3.0,0.0) );
}

fn right( p: vec3<f32> ) -> f32 {
  return plane(p.zxy - vec3(0., 3.0,0.0) );
}

fn left( p: vec3<f32> ) -> f32 {
  return plane(p.zxy - vec3(0., -3.0,0.0) );
}

fn ceiling( p: vec3<f32> ) -> f32 {
  return plane(p.xyz - vec3(0., 3.,0.0) );
}

fn cube( p: vec3<f32> ) -> f32 {
    return box( (p  - vec3( 1.5, 1., -2.0)) * rotation3d(radians(45.), vec3(0.,1.,0.)) , vec3(1.,2.,1.) );
}
fn ball( p: vec3<f32> ) -> f32 {
    let mov = 0.;//2 * abs(sin(sys.time)
    return sphere( p - vec3( 0.,.5 + mov, 1.0) , .5 );
}
fn hat( p: vec3<f32> ) -> f32 {
    return cone( p - vec3( -1.5,.75, -1.0) , .5 , 1.5 );
}

fn getNormal(p : vec3<f32>) -> vec3<f32> {
	let e = vec2<f32>( EPSILON , 0.);
	return normalize(vec3( sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy), sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy), sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)));
}

fn material( ray: Ray, hit: Hit ) -> Material {

    // default values
    var m = hit.material;

    let pos = hit.position;
    if (cube(pos) < EPSILON) {
        m.color = vec3<f32>(1.0,0.2,0.1);
        m.metalness = true;
        m.diffuse = false;
        m.roughness = 0.02;
    } else
    if (ball(pos) < EPSILON) {
        m.color = vec3<f32>(1.,1.,1.);
        m.dielectric = true;
        m.diffuse = false;
    } else
    if (hat(pos) < EPSILON) {
        m.color = vec3<f32>(.2,1.,0.3);
    } else
    if (ceiling(pos) < EPSILON) {
        m.color = vec3<f32>(.5);
    } else
    if (right(pos) < EPSILON) {
        m.color = vec3<f32>(.1,.7,.1);
    } else
    if (left(pos) < EPSILON) {
        m.color = vec3<f32>(.7,.1,0.1);
    } else
    if (ground(pos) < EPSILON) {
        let p = pos * 10.;
        let f = abs(floor(p*.1));
        m.color = vec3(.6,.7,1.) - (vec3(.3) * (( f.x + f.z) % 2.));
    } else
    if (light(pos) < EPSILON) {
        m.color = vec3<f32>(1.,1.,1.);
        m.emissive = true;
    }

    if (m.metalness) {
        m.scattered = Ray(hit.position + (hit.normal * EPSILON), reflect(ray.direction, hit.normal) + (m.roughness * randomVec3()));
    }

    if (m.dielectric) {
        let ctheta = min(dot(-normalize(ray.direction), hit.normal), 1.0);
        let stheta = sqrt(1. - ctheta * ctheta);
        // 1.52 for the common glass
        let sn = select(1.52/1., 1./1.52, hit.sign > 0.);
        
        // fresnel reflectance
        var fresnel = (1. - sn) / (1. + sn);
        fresnel *= fresnel;
        fresnel += (1. - fresnel) * pow( (1. - ctheta), 5.);
        
        // test if the ray is reflected or refracted with fresnel
        if ((sn * stheta  > 1. ) || ((fresnel > random().x ) && hit.sign > 0.) ) { 
            m.scattered.direction = normalize(reflect(ray.direction,  hit.sign * hit.normal));
            m.scattered.origin = hit.position + hit.sign * 4. * (hit.normal * EPSILON);
        } else {
            m.scattered.direction = normalize(refract(ray.direction, hit.sign * hit.normal, sn ));
            m.scattered.origin = hit.position - hit.sign * 4. * (hit.normal * EPSILON);
        } 
    } 

    if (m.diffuse) {
        // default lambertian reflection
        m.scattered = Ray(hit.position + (hit.normal * EPSILON), cosineWeightedSample(hit.normal));
    }

    return m;
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

fn cone( p: vec3<f32>, base: f32, h: f32 ) -> f32 {
  // c is the sin/cos of the angle, h is height
  // Alternatively pass q instead of (c,h),
  // which is the point at the base in 2D
  let q = h * vec2(base/h,-1.0);
    
    // we have -y up, so we need to flip the cone
  let w = vec2( length(p.xz), p.y - (h*.5) );
  let a = w - q * clamp( dot(w,q)/dot(q,q), 0.0, 1.0 );
  let b = w - q * vec2( clamp( w.x/q.x, 0.0, 1.0 ), 1.0 );
  let k = sign( q.y );
  let d = min(dot( a, a ),dot(b, b));
  let s = max( k * (w.x * q.y - w.y * q.x), k * (w.y - q.y)  );
  return sqrt(d)*sign(s);
}

fn rotation3d(angle: f32, axis: vec3<f32>) -> mat3x3<f32> {
    let c = cos(angle);
    let s = sin(angle);
    let t = 1.0 - c;
    let x = axis.x;
    let y = axis.y;
    let z = axis.z;

    return mat3x3<f32>(
        vec3<f32>(t*x*x + c,   t*x*y - s*z, t*x*z + s*y),
        vec3<f32>(t*x*y + s*z, t*y*y + c,   t*y*z - s*x),
        vec3<f32>(t*x*z - s*y, t*y*z + s*x, t*z*z + c)
    );
}

var<private> gseed: vec3u = vec3u(1u);
var<private> lseed: vec3u = vec3u(0u);
// random number between 0 and 1 with 3 seeds and 3 dimensions
fn random() -> vec3f {
    lseed = pcg3d(lseed);
    return vec3f( vec3f(pcg3d(gseed + lseed)) * (1. / f32(0xffffffffu)) ) ;
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


fn diskSample(radius: f32) -> vec2f {
  let rnd = random();
  let r = sqrt(rnd.x);
  let theta = 2.0 * PI * rnd.y;
  return vec2(cos(theta), sin(theta)) * r * radius;

}

fn randomVec3() -> vec3f {
  let rnd = random();
  return rnd * 2. - 1.;
}

fn randomCube(size: vec3<f32>) -> vec3f {
  return random() * size;
}

fn cosineWeightedSample(nor: vec3f) -> vec3f {
    let rnd = random();

    // constrct a local coordinate system around the normal
    let tc = vec3( 1.0 + nor.z - nor.xy * nor.xy, -nor.x * nor.y) / (1.0 + nor.z);
    let uu = vec3( tc.x, tc.z, -nor.x );
    let vv = vec3( tc.z, tc.y, -nor.y );
    
    let a = 6.283185 * rnd.y;

    // return a random vector in the hemisphere
    return sqrt(rnd.x) * (cos(a) * uu + sin(a) * vv) + sqrt(1.0 - rnd.x) * nor;
}

fn LessThan(f: vec3f, value: f32) -> vec3f {
    return vec3f(f32(f.x < value) , f32(f.y < value) , f32(f.z < value) );
}
 
fn linearToSRGB(rgb: vec3f) -> vec3f {
    let c = clamp(rgb, vec3(0.0), vec3(1.0));
 
    return mix( pow(c, vec3f(1.0 / 2.4)) * 1.055 - 0.055, c * 12.92, vec3f(c < vec3(0.0031308) ) );
}
 
fn sRGBToLinear(rgb: vec3f) -> vec3f {
    let c = clamp(rgb, vec3(0.0), vec3(1.0));
 
    return mix( pow(((c + 0.055) / 1.055), vec3(2.4)), c / 12.92, vec3f(c < vec3(0.04045) ) );
}

// ACES tone mapping curve fit to go from HDR to LDR
//https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
fn toneMap(rgb: vec3f) -> vec3f {
    let a = vec3(2.51);
    let b = vec3(0.03);
    let c = vec3(2.43);
    let d = vec3(0.59);
    let e = vec3(0.14);
    return clamp((rgb * (a * rgb + b)) / (rgb * (c * rgb + d) + e), vec3(0.0),vec3(1.0));
}
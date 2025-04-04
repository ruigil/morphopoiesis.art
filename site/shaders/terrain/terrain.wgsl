// Procedural Landscape with Mountains and Valleys
// Using raymarching and SDFs

// Constants
const PI: f32 = 3.141592653589793;
const MAX_STEPS: i32 = 200;
const MAX_DIST: f32 = 100.0;
const SURF_DIST: f32 = 0.001;
const SHADOW_SOFTNESS: f32 = 16.0;

// Uniforms
struct Sys {
    time: f32,
    frame: u32,
    mouse: vec4<f32>,
    resolution: vec2<f32>
}

struct Ray {
    origin: vec3<f32>,
    direction: vec3<f32>,
}

@group(0) @binding(0) var<uniform> sys: Sys;

// Vertex shader
@vertex
fn vertexMain(@location(0) pos: vec2<f32>) -> @builtin(position) vec4f {
    return vec4f(pos, 0., 1.);
}

// Noise functions
fn pcg(v: u32) -> u32 {
    let state = v * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn pcg2d(pv: vec2u) -> vec2u {
    var v = pv * 1664525u + 1013904223u;
    let s = vec2u(16u);

    v.x += v.y * 1664525u;
    v.y += v.x * 1664525u;

    v = v ^ (v>>s);

    v.x += v.y * 1664525u;
    v.y += v.x * 1664525u;

    v = v ^ (v>>s);

    return v;
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

// 2D and 3D hash functions
fn hash3(seed: vec3u) -> vec3f {
    return vec3f(vec3f(pcg3d(seed)) * (1. / f32(0xffffffffu)));
}

fn hash2(seed: vec2u) -> vec2f {
    return vec2f(vec2f(pcg2d(seed)) * (1. / f32(0xffffffffu)));
}

// Value noise in 2d
fn valueNoise2d(p: vec2f) -> f32 {
    // cell coordinates
    let c = vec2u(floor(abs(p)));
    // sub-cell coordinates
    let f = fract(p);
    // bicubic interpolation
    let u = f * f * (3.0 - 2.0 * f);
    // offset vector
    let o = vec2u(0,1);
    return mix(
        mix(hash2(c + o.xx).x, hash2(c + o.yx).x, u.x),
        mix(hash2(c + o.xy).x, hash2(c + o.yy).x, u.x), 
        u.y
    );
}

// Value noise in 3d
fn valueNoise3d(p: vec3f) -> f32 {
    let i = floor(p);
    let f = fract(p);

    // quintic interpolation
    let u = f*f*f*(f*(f*6.0-15.0)+10.0);
    
    return mix(
        mix(
            mix(hash3(vec3u(i + vec3f(0,0,0))).x, hash3(vec3u(i + vec3f(1,0,0))).x, u.x),
            mix(hash3(vec3u(i + vec3f(0,1,0))).x, hash3(vec3u(i + vec3f(1,1,0))).x, u.x), 
            u.y
        ),
        mix(
            mix(hash3(vec3u(i + vec3f(0,0,1))).x, hash3(vec3u(i + vec3f(1,0,1))).x, u.x),
            mix(hash3(vec3u(i + vec3f(0,1,1))).x, hash3(vec3u(i + vec3f(1,1,1))).x, u.x), 
            u.y
        ), 
        u.z
    );
}

// Generate fractal noise from multiple octaves
fn fractalNoise2d(p:vec2f, o: i32) -> f32 {
    var value = 0.0;
    var amplitude = .5;
    var frequency = 1.;
    let pp = p + 1000.;
    
    // Loop of octaves
    for (var i = 0; i < o; i++) {
        value += amplitude * valueNoise2d(pp * frequency);
        frequency *= 2.;
        amplitude *= .5;
    }
    return value;
}

// Terrain height function
fn getHeight(p: vec2f) -> f32 {
    // Large scale mountains
    let mountainScale = 0.1;
    let mountainHeight = 4.0;
    let mountains = fractalNoise2d(p * mountainScale, 8) * mountainHeight;
    
    // Medium scale hills
    let hillScale = 0.3;
    let hillHeight = 1.0;
    let hills = fractalNoise2d(p * hillScale, 4) * hillHeight;
    
    // Small scale details
    let detailScale = 1.0;
    let detailHeight = 0.3;
    let details = fractalNoise2d(p * detailScale, 2) * detailHeight;
    
    // Combine different scales
    return mountains + hills + details;
}

// Signed distance function for the terrain
fn terrainSDF(p: vec3f) -> f32 {
    return p.y - getHeight(p.xz);
}

// Map function that combines all SDFs in the scene
fn map(p: vec3f) -> f32 {
    return terrainSDF(p);
}

// Calculate normal using central differences
fn calcNormal(p: vec3f) -> vec3f {
    let e = vec2(0.001, 0.0);
    return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
    ));
}

// Soft shadows calculation
fn calcShadow(ro: vec3f, rd: vec3f, mint: f32, maxt: f32) -> f32 {
    var res = 1.0;
    var t = mint;
    
    for(var i = 0; i < 24; i++) {
        let h = map(ro + rd * t);
        res = min(res, SHADOW_SOFTNESS * h / t);
        t += clamp(h, 0.01, 0.5);
        
        if(res < 0.001 || t > maxt) {
            break;
        }
    }
    
    return clamp(res, 0.0, 1.0);
}

// Ambient occlusion calculation
fn calcAO(pos: vec3f, nor: vec3f) -> f32 {
    var occ = 0.0;
    var sca = 1.0;
    
    for(var i = 0; i < 5; i++) {
        let h = 0.01 + 0.12 * f32(i) / 4.0;
        let d = map(pos + h * nor);
        occ += (h - d) * sca;
        sca *= 0.95;
    }
    
    return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}

// Raymarching function
fn raymarch(ray: Ray) -> f32 {
    var t = 0.0;
    
    for(var i = 0; i < MAX_STEPS; i++) {
        let pos = ray.origin + ray.direction * t;
        let h = map(pos);
        
        if(h < SURF_DIST || t > MAX_DIST) {
            break;
        }
        
        t += h;
    }
    
    return t;
}

// Camera setup
fn setCamera(screen: vec2<f32>, eye: vec3<f32>, lookAt: vec3<f32>, fov: f32) -> Ray {
    // Orthonormal basis
    let fw = normalize(lookAt - eye);
    let rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
    let up = cross(fw, rt);
    
    let dir = vec3(screen * tan(fov * 0.5), 1.0);
    
    // Initial camera ray
    return Ray(eye, normalize(mat3x3(rt, up, fw) * dir));
}

// Sky color calculation
fn getSkyColor(rd: vec3f) -> vec3f {
    let sunDir = normalize(vec3(0.8, 0.4, 0.2));
    let sunColor = vec3(1.0, 0.9, 0.7);
    
    // Base sky color
    let skyColor = vec3(0.6, 0.8, 1.0);
    
    // Sun
    let sun = pow(max(dot(rd, sunDir), 0.0), 32.0);
    
    // Horizon glow
    let horizon = pow(1.0 - abs(rd.y), 4.0);
    
    return skyColor + sun * sunColor + horizon * vec3(0.5, 0.4, 0.3);
}

// Fragment shader
@fragment
fn fragmentMain(@builtin(position) coord: vec4f) -> @location(0) vec4f {
    // Normalized screen coordinates
    let screen = (2.0 * coord.xy - sys.resolution) / min(sys.resolution.x, sys.resolution.y) * vec2(1.0, -1.0);
    
    // Camera setup
    let time = sys.time * 0.2;
    let camRadius = 15.0;
    let camHeight = 5.0;
    let camAngle = time;
    
    // Camera position and look-at point
    let eye = vec3(
        camRadius * cos(camAngle),
        camHeight,
        camRadius * sin(camAngle)
    );
    let lookAt = vec3(0.0, 0.0, 0.0);
    let fov = radians(60.0);
    
    // Create ray
    let ray = setCamera(screen, eye, lookAt, fov);
    
    // Raymarch
    let t = raymarch(ray);
    
    // Initialize color
    var col = vec3(0.0);
    
    // If we hit something
    if(t < MAX_DIST) {
        // Get position and normal
        let pos = ray.origin + ray.direction * t;
        let nor = calcNormal(pos);
        
        // Material properties
        var mat = vec3(0.0);
        
        // Terrain coloring based on height and slope
        let height = pos.y;  // Invert height for coloring
        let slope = nor.y;   // Invert normal y component for slope calculation
        
        // Snow on peaks
        if(height > 3.0 && slope > 0.7) {
            mat = vec3(0.9, 0.9, 0.95);
        }
        // Rock on steep slopes
        else if(slope < 0.5) {
            mat = vec3(0.5, 0.4, 0.3);
        }
        // Grass on gentle slopes
        else {
            // Vary grass color with height
            let grassFactor = smoothstep(0.0, 2.0, height);
            mat = mix(
                vec3(0.3, 0.5, 0.2), // Lush grass
                vec3(0.6, 0.6, 0.3), // Dry grass
                grassFactor
            );
        }
        
        // Lighting
        let sunDir = normalize(vec3(0.8, 0.4, 0.2));
        let sunColor = vec3(1.0, 0.9, 0.7);
        let skyColor = vec3(0.6, 0.8, 1.0);
        
        // Ambient occlusion
        let ao = calcAO(pos, nor);
        
        // Diffuse lighting
        let diff = clamp(dot(nor, sunDir), 0.0, 1.0);
        
        // Shadow
        let shadow = calcShadow(pos, sunDir, 0.01, 10.0);
        
        // Combine lighting
        let ambient = 0.2 * ao * skyColor;
        let diffuse = 0.8 * diff * shadow * sunColor;
        
        // Final color
        col = mat * (ambient + diffuse);
        
        // Fog based on distance
        let fogFactor = 1.0 - exp(-0.01 * t);
        col = mix(col, getSkyColor(ray.direction), fogFactor);
    } else {
        // Sky color
        col = getSkyColor(ray.direction);
    }
    
    // Gamma correction
    col = pow(col, vec3(0.4545));
    
    return vec4(col, 1.0);
}

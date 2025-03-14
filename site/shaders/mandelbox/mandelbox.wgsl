// Uniforms for mouse position and screen resolution
struct Sys {
    time: f32,
    resolution: vec2<f32>,
    mouse: vec4<f32>,
    aspect: vec2<f32>,
    frame: f32
}

@group(0) @binding(0) var<uniform> uniforms: Sys;
@vertex
fn vertexMain(@location(0) pos: vec2<f32>) -> @builtin(position) vec4f  {
    return vec4f(pos,0.,1.);
}

fn mandelbox_sdf(p: vec3<f32>) -> f32 {
    var z = p;
    var dp = 1.0;
    let scale = -2.0;
    let min_radius = 0.5;
    let fixed_radius = 1.0;
    let min_radius2 = min_radius * min_radius;  // 0.25
    let fixed_radius2 = fixed_radius * fixed_radius;  // 1.0

    for (var i = 0; i < 8; i = i + 1) {
        // Box fold
        if (z.x > 1.0) { z.x = 2.0 - z.x; } else if (z.x < -1.0) { z.x = -2.0 - z.x; }
        if (z.y > 1.0) { z.y = 2.0 - z.y; } else if (z.y < -1.0) { z.y = -2.0 - z.y; }
        if (z.z > 1.0) { z.z = 2.0 - z.z; } else if (z.z < -1.0) { z.z = -2.0 - z.z; }

        // Sphere fold
        let r2 = dot(z, z);
        if (r2 < min_radius2) {
            let temp = fixed_radius2 / min_radius2;  // 4.0
            z = z * temp;
            dp = dp * temp;
        } else if (r2 < fixed_radius2) {
            let temp = fixed_radius2 / r2;  // 1.0 / r2
            z = z * temp;
            dp = dp * temp;
        }

        // Scale and translate
        z = z * scale + p;
        dp = dp * abs(scale);
    }

    return length(z) / dp;
}
// Raymarching function
fn raymarch(ro: vec3<f32>, rd: vec3<f32>) -> f32 {
    var t = 0.0;
    let max_steps = 100;
    let max_dist = 100.0;
    let min_dist = 0.001;

    for (var i = 0; i < max_steps; i = i + 1) {
        let pos = ro + t * rd;
        let dist = length(pos) - 1.;
        if (dist < min_dist) {
            return t;
        }
        t = t + dist;
        if (t > max_dist) {
            return max_dist;
        }
    }
    return max_dist;
}

// Surface normal via SDF gradient
fn normal(p: vec3<f32>) -> vec3<f32> {
    let e = 0.001;
    let dx = mandelbox_sdf(p + vec3<f32>(e, 0.0, 0.0)) - mandelbox_sdf(p - vec3<f32>(e, 0.0, 0.0));
    let dy = mandelbox_sdf(p + vec3<f32>(0.0, e, 0.0)) - mandelbox_sdf(p - vec3<f32>(0.0, e, 0.0));
    let dz = mandelbox_sdf(p + vec3<f32>(0.0, 0.0, e)) - mandelbox_sdf(p - vec3<f32>(0.0, 0.0, e));
    return normalize(vec3<f32>(dx, dy, dz));
}

// Phong shading
fn phong_shading(p: vec3<f32>, n: vec3<f32>, view_dir: vec3<f32>) -> vec3<f32> {
    let light_dir = normalize(vec3<f32>(1.0, 1.0, 1.0)); // Directional light
    let ambient = vec3<f32>(0.1, 0.1, 0.1);             // Ambient component
    let material_color = vec3<f32>(0.8, 0.8, 0.8);      // Diffuse color
    let specular_color = vec3<f32>(1.0, 1.0, 1.0);      // Specular highlight

    let diffuse = max(dot(n, light_dir), 0.0);
    let reflect_dir = reflect(-light_dir, n);
    let specular = pow(max(dot(reflect_dir, view_dir), 0.0), 32.0);

    return ambient + material_color * diffuse + specular_color * specular;
}

// Fragment shader
@fragment
fn main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    let mouse = uniforms.mouse.xy;          // Mouse coords (0 to 1)
    let resolution = uniforms.resolution;
    let aspect = resolution.x / resolution.y;
    let fov = 45.0 * 3.1415926535 / 180.0; // 45-degree FOV
    let tan_fov = tan(fov / 2.0);

    // Camera position (orbiting around origin)
    let azimuth = mouse.x * 2.0 * 3.1415926535;         // Full rotation
    let elevation = (mouse.y - 0.5) * 3.1415926535;     // -90 to 90 degrees
    let cam_dist = 3.0;                                 // Distance from origin
    let cam_pos = vec3<f32>(
        cos(azimuth) * cos(elevation),
        sin(elevation),
        sin(azimuth) * cos(elevation)
    ) * cam_dist;

    // Camera basis vectors
    let look_at = vec3<f32>(0.0, 0.0, 0.0);
    let forward = normalize(look_at - cam_pos);
    let right = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), forward));
    let up = cross(forward, right);

    // Ray direction per fragment
    let uv = (frag_coord.xy / resolution - 0.5) * 2.0;
    let ray_dir = normalize(forward + uv.x * right * tan_fov * aspect + uv.y * up * tan_fov);

    // Raymarch to find intersection
    let t = raymarch(cam_pos, ray_dir);
    let max_dist = 100.0;

    if (t < max_dist) {
        let pos = cam_pos + t * ray_dir;
        let n = normal(pos);
        let view_dir = -ray_dir;
        //let color = phong_shading(pos, n, view_dir);
        let color = vec3<f32>(1.0, 0.0, 0.0); // Background color
        return vec4<f32>(color, 1.0);
    } else {
        return vec4<f32>(0.0, 0.0, 0.0, 1.0); // Background color
    }
}
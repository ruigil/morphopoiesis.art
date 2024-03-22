fn hsv2rgb(c :vec3f) -> vec3f {
    let k = vec4f(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    let p = abs(fract(c.xxx + k.xyz) * 6.0 - k.www);
    return c.z * mix(k.xxx, clamp(p - k.xxx, vec3(0.0), vec3(1.0)), c.y);
}

// convert a rgb color to an hsv color
fn rgb2hsv(c :vec3f) -> vec3f {
    let k = vec3f(0.0, -1.0 / 3.0, 2.0 / 3.0);
    let p = mix(vec3f(c.z, c.y, k.w), vec3f(c.y, c.z, k.x), step(c.z, c.y));
    let q = mix(vec3f(p.x, p.y, p.z), vec3f(p.z, p.x, p.y), step(p.x, p.z));
    let d = p.x - min(q.x, q.y);
    let e = 1.0e-10;
    return vec3f(abs(q.z + (q.y - q.x) / (6.0 * d + e)), d / (p.x + e), p.x);
}

// convert a rgb color to yuv
fn rgb2yuv(c :vec3f) -> vec3f {
    let y = dot(c, vec3f(0.299, 0.587, 0.114));
    let u = dot(c, vec3f(-0.147, -0.289, 0.436));
    let v = dot(c, vec3f(0.615, -0.515, -0.100));
    return vec3f(y, u, v);
}

// convert a yuv color to rgb
fn yuv2rgb(c :vec3f) -> vec3f {
    let r = dot(c, vec3f(1.0, 0.000, 1.140));
    let g = dot(c, vec3f(1.0, -0.395, -0.581));
    let b = dot(c, vec3f(1.0, 2.032, 0.000));
    return vec3f(r, g, b);
}

fn luminance(color: vec3<f32>) -> f32 {
    return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}


fn linearToSRGB(rgb: vec3f) -> vec3f {
    let c = clamp(rgb, vec3(0.0), vec3(1.0));
 
    return mix( pow(c, vec3f(1.0 / 2.4)) * 1.055 - 0.055, c * 12.92, vec3f(c < vec3(0.0031308) ) );
}
 
fn sRGBToLinear(rgb: vec3f) -> vec3f {
    let c = clamp(rgb, vec3(0.0), vec3(1.0));
 
    return mix( pow(((c + 0.055) / 1.055), vec3(2.4)), c / 12.92, vec3f(c < vec3(0.04045) ) );
}

// cheap pallette from https://www.shadertoy.com/view/ll2GD3
fn pal(domain: f32, frequency: vec3f, phase: vec3f) -> vec3f {
  return vec3f(0.5) + vec3f(0.5) * cos(6.2830 * (frequency * domain + phase));
}

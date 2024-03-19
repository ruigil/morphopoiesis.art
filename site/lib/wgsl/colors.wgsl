fn hsv2rgb(c :vec3f) -> vec3f {
    let k = vec4f(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    let p = abs(fract(c.xxx + k.xyz) * 6.0 - k.www);
    return c.z * mix(k.xxx, clamp(p - k.xxx, vec3(0.0), vec3(1.0)), c.y);
}

// Converts a color from linear light gamma to sRGB gamma
fn tosRGB(linearRGB: vec3f) -> vec3f {
    let cutoff = vec3<bool>(linearRGB.x < 0.0031308, linearRGB.y < 0.0031308, linearRGB.z < 0.0031308);
    let higher = vec3(1.055) * pow(linearRGB.rgb, vec3(1.0/2.4)) - vec3(0.055);
    let lower = linearRGB.rgb * vec3(12.92);

    return vec3<f32>(mix(higher, lower, vec3<f32>(cutoff)));
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

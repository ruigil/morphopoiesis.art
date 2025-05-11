const TAU: f32 = 6.28318530718;

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


fn fill(d: f32, invert: bool) -> f32 {
    let a = smoothstep(-0.001, 0.001, d);
    return select(a, 1.0 - a, invert);
}

fn gradient(brightness: vec3<f32>, saturation: vec3<f32>, frequency: vec3<f32>, offset: vec3<f32>, t: f32) -> vec3<f32> {
    return clamp(brightness + saturation * cos(TAU * (frequency * t + offset)), vec3<f32>(0.0), vec3<f32>(1.0));
}

fn rainbow(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(1.0, 0.8, 0.9), vec3<f32>(0.0, 0.6, 0.3), t);
}

fn sunset(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(1.0), vec3<f32>(0.1, 0.2, 0.5), t);
}

fn earth(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(0.9), vec3<f32>(0.47, 0.57, 0.67), t);
}

fn sky(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(0.5, 0.6, 0.7), t);
}

fn metal(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(0.8, 0.9, 0.9), vec3<f32>(0.7, 0.57, 0.57), t);
}

fn nature(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(0.7, 0.7, 0.1), vec3<f32>(0.5, 0.62, 0.40), t);
}

fn lava(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(0.5, 0.5, 0.2), vec3<f32>(0.65, 0.47, 0.50), t);
}

fn neon(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(1.0, 0.0, 1.0), vec3<f32>(0.3, 0.5, 0.0), t);
}

fn royal(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(0.7, 0.5, 0.7), vec3<f32>(0.35, 0.35, .0), t);
}

fn strawberry(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(0.5, 7.7, 0.5), vec3<f32>(2.0, 2.0, 0.0), vec3<f32>(0.0, 0.5, 0.5), t);
}

fn stripes(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(5.0), vec3<f32>(1., 1., 1.), vec3<f32>(0.0,.0,0.), t);
}

fn vangogh(t: f32) -> vec3<f32> {
    return gradient(vec3<f32>(0.5), vec3<f32>(0.5), vec3<f32>(0.5, 0.5, 0.5), vec3<f32>(0.0, 0.1, 0.3), t);
}

fn getGrad(f: f32, uv: vec2<f32>) -> vec3<f32> {
    switch (i32(f)) {
        case 11: {
            return vangogh(uv.x);
        }
        case 10: {
            return lava(uv.x);
        }
        case 9: {
            return royal(uv.x);
        }
        case 8: {
            return neon(uv.x);
        }
        case 7: {
            return rainbow(uv.x);
        }
        case 6: {
            return sunset(uv.x);
        }
        case 5: {
            return earth(uv.x);
        }
        case 4: {
            return sky(uv.x);
        }
        case 3: {
            return metal(uv.x);
        }
        case 2: {
            return nature(uv.x);
        }
        case 1: {
            return strawberry(uv.x);
        }
        default: {
            return stripes(uv.x);
        }
    }
}

@fragment
fn fragmentMain(@builtin(position) coord: vec4<f32>) -> @location(0) vec4<f32> {

    let uv = (coord.xy / sys.resolution) ;

    let m = (sys.mouse.xy);

    let grads = 16.0;

    let grad = floor(uv.y * grads);
    let g = fract(uv.y * grads);

    let mg = getGrad(floor(m.y * grads), uv);

    var c: vec3<f32>;
    if (grad == 15.0) {
        c = vec3<f32>(mg.r, 0.0, 0.0);
    } else if (grad == 14.0) {
        c = vec3<f32>(0.0, mg.g, 0.0);
    } else if (grad == 13.0) {
        c = vec3<f32>(0.0, 0.0, mg.b);
    } else if (grad == 12.0) {
        c = vec3<f32>(0.0);
    } else {
        c = getGrad(grad, uv);
    }

    c = mix(vec3<f32>(0.05), c, fill(1.0 - g - 0.1, false));

    return vec4<f32>(c, 1.0);
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

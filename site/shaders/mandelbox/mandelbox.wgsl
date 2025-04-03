// Uniforms for mouse position and screen resolution
struct Sys {
    time: f32,
    resolution: vec2<f32>,
    mouse: vec4<f32>,
    aspect: vec2<f32>,
    frame: f32
}
struct Ray {
    origin: vec3<f32>,
    direction: vec3<f32>,
}
@group(0) @binding(0) var<uniform> sys: Sys;
@vertex
fn vertexMain(@location(0) pos: vec2<f32>) -> @builtin(position) vec4f  {
    return vec4f(pos,0.,1.);
}

// Constants (adjust as needed)
const FOLDING_LIMIT: f32 = 1.0;
const ESCAPE_THRESHOLD_SQ: f32 = 100.0; // Using squared threshold for efficiency (e.g., 10*10)

// Helper Function: Box Fold
// Folds coordinates back into the [-limit, limit] range.
fn boxFold(v: vec3f, limit: f32) -> vec3f {
    // clamp(v, min, max) keeps v within [min, max]
    // If v > limit, result is limit*2.0 - v (reflection)
    // If v < -limit, result is -limit*2.0 - v (reflection)
    // If -limit <= v <= limit, result is v*2.0 - v = v (no change)
    return clamp(v, vec3(-limit), vec3(limit)) * 2.0 - v;
}

// Helper Function: Sphere Fold
// Inverts points based on spherical radii.
fn sphereFold(v: vec3f, fixedRadius2: f32, minRadius2: f32) -> vec3f {
    let r2 = dot(v, v); // Calculate squared magnitude
    var factor = 1.0;

    if (r2 < minRadius2) {
        // If inside the inner sphere (radius sqrt(minRadius2)),
        // scale it up to the outer sphere (radius sqrt(fixedRadius2))
        factor = fixedRadius2 / minRadius2;
    } else if (r2 < fixedRadius2) {
        // If between the spheres, invert with respect to the outer sphere
        factor = fixedRadius2 / r2;
    }
    // If outside the outer sphere (r2 >= fixedRadius2), factor remains 1.0 (no change)

    return v * factor;
}

// Mandelbox Signed Distance Function Estimator
//
// Parameters:
//   p: The 3D point in space to evaluate the distance from.
//   scale: The primary Mandelbox scale parameter (often between -3.0 and 3.0).
//          Negative values create "inverted" Mandelboxes.
//   iterations: The maximum number of iterations to perform. Higher values increase detail
//               but also computation time. (e.g., 8 to 20)
//   fixedRadius2: The squared radius of the main folding sphere (often 1.0).
//   minRadius2: The squared radius of the inner folding sphere (often scale*scale or 0.25).
//               Must be less than fixedRadius2.
//
// Returns:
//   An estimated distance to the surface of the Mandelbox set.
//   Note: This is an *estimator*, not a true SDF, but works well for raymarching.
//
fn mandelboxSDF(p: vec3f, scale: f32, max_iterations: i32, fixedRadius2: f32, minRadius2: f32) -> f32 {

    var z = p; // Iteration variable, starts at the sample point
    let offset = p; // Store the original point for the offset in each iteration

    // The distance estimator relies on tracking how much the magnitude scales overall.
    // The derivative |dz/dp| is approximated by pow(abs(scale), iteration_count).
    // The final distance estimate is length(z) / |dz/dp| approx= length(z) * pow(abs(scale), -iteration_count)

    var i: i32 = 0;
    loop {
        // 1. Box Fold
        z = boxFold(z, FOLDING_LIMIT);

        // 2. Sphere Fold
        z = sphereFold(z, fixedRadius2, minRadius2);

        // 3. Scale and Offset (The core Mandelbox iteration)
        z = z * scale + offset; // z = scale * z + c equivalent

        // Check for escape
        if (dot(z, z) > ESCAPE_THRESHOLD_SQ) {
            break; // Point escaped
        }

        // Check iteration limit
        i = i + 1;
        if (i >= max_iterations) {
            break; // Reached max iterations, assume point is inside or very close
        }
    }

    // Calculate distance estimate using the escape velocity principle
    // dist = |z| / |dz/dp|
    // |dz/dp| is approximated by scale^i (or |scale|^i for negative scales)
    let dist = length(z) * pow(abs(scale), -f32(i));

    // Optional: Small constant factor adjustment (sometimes helps raymarcher stability)
    // return dist * 0.5; // Or other small factor like 0.25

    return dist;
}
const scale = -1.5;
const iterations = 10;
const fr2 = 1.0;
const mr2 = 0.25; // Example: Often related to scale^2 if scale > 0

/*
fn calcNormal(pos: vec3f) -> vec3f {
	let e = vec2(1.0,-1.0);
	let eps = 0.0005;
	return normalize(
		e.xyy*mandelboxSDF(pos + e.xyy*eps, scale, iterations, fr2, mr2) + 
		e.yyx*mandelboxSDF(pos + e.yyx*eps, scale, iterations, fr2, mr2) + 
		e.yxy*mandelboxSDF(pos + e.yxy*eps, scale, iterations, fr2, mr2) + 
		e.xxx*mandelboxSDF(pos + e.xxx*eps, scale, iterations, fr2, mr2)
	);
}
*/

fn calcNormal(pos: vec3f) -> vec3f {
	let e = vec2(1.0,-1.0);
	let eps = 0.0005;
	return normalize(
		e.xyy*sphere(pos + e.xyy*eps, .5) + 
		e.yyx*sphere(pos + e.yyx*eps, .5) + 
		e.yxy*sphere(pos + e.yxy*eps, .5) + 
		e.xxx*sphere(pos + e.xxx*eps, .5)
	);
}

fn sphere(p:vec3f, radius:f32) -> f32 {
    return length(p) - radius;
}

// Fragment shader
@fragment
fn main(@builtin(position) coord: vec4<f32>) -> @location(0) vec4<f32> {
    let screen = normCoord(coord.xy,sys.resolution);
	
    // camera 	
	let an = 0.1 * sys.time + 7.0;
	let eye = 3. * vec3(cos(an), 0., sin(an)  );
    let lookAt = vec3(0.);
    let fov = radians(60.);

    let ray = setCamera(screen, eye, lookAt, fov);

    // raymarch
    let dmax = 50.5;
    var acc = 0.0;
    var dis = 0.0;
    var steps = 0.0;
    var pos = ray.origin;
    for(var i=0; i<120; i++ ) {
        let dis = mandelboxSDF(pos,scale, iterations, fr2, mr2);
        //let dis = sphere(pos,.5);
        if( dis < 0.001 || acc > dmax ) { break; }
        acc += max(dis * 0.8, 0.001 * 1.5);;
        pos = ray.origin + acc * ray.direction;
        steps += 1.;
    }

    // shading/lighting	
    var col = vec3f(0.0, 0.0, 0.1); // Background color
    if( acc<dmax )
    {
       // Calculate normal (e.g., using finite differences of the SDF)
       // Apply lighting
       col = vec3f(1.0, 1.0, 1.0); // Simple white for hit
       // Example: Add some simple AO based on steps
       //col *= (1.0 - f32(steps) / f32(120.));
        //let nor = calcNormal(pos);
        // light direction
        //col += clamp( dot(nor,vec3(0.5)), 0.0, 1.0 );
    }

    // fog
	//let bg = vec3(0.0, 0.1, 0.2);
    
    //col = mix(col, bg, smoothstep( 0., dmax, acc));

    // gamma
	return vec4(sqrt(col), 1.0);
}

fn normCoord(coord: vec2<f32>, resolution: vec2<f32>) -> vec2<f32> {
    // bottom left is [-1,-1] and top right is [1,1]
   return (2.0 * coord - resolution) / min(resolution.x, resolution.y);
}

fn setCamera( screen: vec2<f32>, eye: vec3<f32>, lookAt: vec3<f32>, fov: f32 ) -> Ray {

    // orthonormal basis
    let fw = normalize(lookAt - eye);
    let rt = cross( vec3(0.,1.,0.), fw );
    let up = cross(fw, rt);

    let dir = vec3(screen * tan(fov * .5 ), 1.);

    // inital camera ray
    return Ray(eye ,  normalize( mat3x3(rt,up,fw) * dir ) );
}
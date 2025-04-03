// from : https://www.osar.fr/notes/logspherical/
const PI: f32 = 3.141592653589793;

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

@vertex
fn vertexMain(@location(0) pos: vec2<f32>) -> @builtin(position) vec4f  {
    return vec4f(pos,0.,1.);
}

@fragment
fn fragmentMain(@builtin(position) coord: vec4f) -> @location(0) vec4f {        

    let screen = normCoord(coord.xy,sys.resolution);
	
    // camera 	
	let an = 0.1 * sys.time + 7.0;
	let eye = vec3(cos(an), 1., sin(an)  );
    let lookAt = vec3(0.);
    let fov = radians(60.);

    let ray = setCamera(screen, eye, lookAt, fov);

    // raymarch
    let dmax = 5.5;
    var acc = 0.0;
    var dis = 0.0;
    var pos = ray.origin;
    for(var i=0; i<120; i++ ) {
        let dis = map(pos);
        if( dis < 0.001 || acc > dmax ) { break; }
        acc += dis;
        pos = ray.origin + acc * ray.direction;
    }

    // shading/lighting	
    var col = vec3(.5,.3,.1); // ambient
    if( acc<dmax )
    {
        let nor = calcNormal(pos);
        // light direction
        col += clamp( dot(nor,vec3(0.5)), 0.0, 1.0 );
    }

    // fog
	let bg = vec3(0.0, 0.1, 0.2);
    col = mix(col, bg, smoothstep( 0., dmax, acc));

    // gamma
	return vec4(sqrt(col), 1.0);
}


fn normCoord(coord: vec2<f32>, resolution: vec2<f32>) -> vec2<f32> {
    // bottom left is [-1,-1] and top right is [1,1]
   return (2.0 * coord - resolution) / min(resolution.x, resolution.y);
}


fn calcNormal(pos: vec3f) -> vec3f {
	let e = vec2(1.0,-1.0);
	let eps = 0.0005;
	return normalize(
		e.xyy*map(pos + e.xyy*eps) + 
		e.yyx*map(pos + e.yyx*eps) + 
		e.yxy*map(pos + e.yxy*eps) + 
		e.xxx*map(pos + e.xxx*eps)
	);
}

// Box SDF - returns the signed distance from point p to a box with dimensions size
fn sdBox(p: vec3<f32>, size: vec3<f32>) -> f32 {
    let d = abs(p) - size * 0.5;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, vec3(0.0)));
}

fn map(p:vec3f) -> f32 {
    let shorten = 1.2; // short the rays to reduce error
    let lpscale = 4./PI; // for mathing the angular mod

	// Apply the forward log-spherical map
	let r = length(p);
	var pp = vec3(log(r), acos(p.z / r), atan2(p.y, p.x) );
	// Get a scaling factor to compensate for pinching at the poles
	// (there's probably a better way of doing this)
	let xshrink = 1.0/(abs(pp.y-PI)) + 1.0/(abs(pp.y)) - 1.0/PI;

	// Apply rho tranlation which yields zooming
	pp.x -= sys.time * .5;	

	// Scale to fit in the ]-pi,pi] interval
	pp *= lpscale;

	// Turn tiled coordinates into single-tile coordinates
	pp = fract(pp) - .5;
    pp.x *= xshrink;

    /*
    // inverse transform, from log polar to cartesian
    let ro = exp(pp.x);
    pp = vec3(
        ro * sin(pp.y) * cos(pp.z),
        ro * sin(pp.y) * sin(pp.z),
        ro * cos(pp.y)
    );
    */
    
    var sdf = min(sdBox(pp,vec3(.2,.7,.1)),sdBox(pp,vec3(.2,.1,.7))) ;

	// Compensate for all the scaling that's been applied so far
    // scaling. When we raymarch in a space that is not linear, we should
    // adapt the scaling factor
    let scaleFactor = r / (lpscale*xshrink*shorten);
	return (sdf * scaleFactor);    
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
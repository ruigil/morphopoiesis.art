#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T


#include '../constants.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/3d-utils.glsl'
#include '../utils/noise.glsl'

// the metal
float metal(vec3 p) {
    return sphere(p - vec3(0.7,0.,.0), .3);
}

// the matte object
float matte(vec3 p) {
    return sphere(p - vec3(0.,0.,.0), .3);
}

// the glass sphere
float glass(vec3 p) {
    return sphere(p - vec3(-0.7,0.,.0), .3);
}

float floorplane(vec3 p) {
    return plane(p + vec3(.0,.5,.0));
}

// the scene with a big bounding sphere 
float scene(vec3 p) {
    return min(min(floorplane(p), min( min( metal(p), matte(p) ), glass(p) )),-sphere(p,5.) );
}

// trace a ray into the scene, return the hit point, and the distance
Hit trace(Ray ray) {
    float t , d = 0.;

    // initialize the point that is going to march along the ray
    vec3 p = ray.ori;
    for (int i=0; i< 100; i++) {
        // calculate the actual distance
        d = scene( p );
        // if we hit something break, the loop
        if (abs(d) < .001) break;
        // march along the ray 
         p = ray.ori + ray.dir * (t += abs(d));
    }
    
    // return the hit point and total distance, and the sign of the field
    return Hit(p, t, sign(d) );
}

// sampling the distance field, to get differences in the 3 axis,  
// and then normalize, will give a normal vector
vec3 getNormal(in vec3 p) {
	const vec2 e = vec2(.001, 0);
	return normalize(vec3( scene(p + e.xyy) - scene(p - e.xyy), scene(p + e.yxy) - scene(p - e.yxy), scene(p + e.yyx) - scene(p - e.yyx)));
}


// defining materials
Material material(Ray ray, inout Hit hit) {
    float e = .001;
    vec3 normal = getNormal(hit.p);
    Material m = Material(vec3(0.), normal, false, normal);

    m.albedo = mix(vec3(.9,.6,.1),vec3(0.4,0.3,8.), (hit.p.y+.5)*.6);

    if (floorplane(hit.p) < e) {
        hit.p *= 3.;
        float x = mod(floor(hit.p.y)+floor(hit.p.x)+floor(hit.p.z), 2.);
        m.albedo = vec3(1.) * floor(x);
    }

    if (matte(hit.p) < e) {
        m.albedo = vec3(0.2,1.0,.2);
    }

    if (metal(hit.p) < e) {
        m.albedo = vec3(1.,.2,.2) ;
        m.scatter = true;
        m.scattered = normalize(reflect(ray.dir,normal));
        hit.p = ray.ori + ray.dir * (hit.d*.99);
    }

    if (glass(hit.p) < e) {
        m.albedo = vec3(1.,1.,1.0);
        m.scatter = true;
        float ctheta = min(dot(-ray.dir,normal),1.0);
        float stheta = sqrt(1. - ctheta*ctheta);
        
        // schlick approximation for the refractive index
        // 1.52 for the common glass
        float sn = hit.s>0. ? 1./1.52 : 1.52/1.;
        sn = (1.-sn) / (1.+sn);
        sn = sn*sn;
        sn += (1.-sn)*pow( (1. - ctheta),5.);
        
        // test if the ray is reflected or refracted
        if (sn * stheta  > 1. ) {
            m.scattered = normalize(reflect(ray.dir,normal));
            hit.p = ray.ori + ray.dir * (hit.d*.99);
        } else {
            m.scattered = normalize(refract(ray.dir,hit.s*normal,sn));
            hit.p = ray.ori + ray.dir * (hit.d*1.01);
        }
    }

    return m;

}

// using materials to apply a ligh model
vec3 shade(Ray ray, int depth) {
    vec3 color = vec3(1.0);


    // light position;
    vec3 lp = vec3(1.0, 1.0, -2.0);
       // light intensity
    vec3 li = vec3(.5); 


    for (int i=0; i<depth; i++) {

        Hit hit = trace(ray);
        // material
        Material m = material(ray, hit);

        // light direction
        //vec3 ld = normalize(lp - hit.xyz);
        
        // diffuse component is dot product between light direction and normal
        //float diff = max( dot( ld, m.normal), 0. );
        // specular component is dot product bewtween light reflected and view direction
        //float spec = max( dot( normalize( reflect(-ld, m.normal ) ), normalize(ray.ori - hit.xyz) ), 0.);

        // ambient color + light intensity * ( diffuse color * diffuse light + specular color * specular light)
        // color += m.ambient + li * ( (m.diffuse * diff) + (m.specular * pow( spec ,m.alpha) ) );

        color *= m.albedo;
        if (!m.scatter) break;
        ray = Ray(hit.p, m.scattered);
    }

    return color; 
}

vec3 antialias(vec2 r) {
    float ct = cos(T);
    float st = sin(T);

    vec3 eye =  vec3(ct, .5,-1.) * 2.;
    vec2 e = PIXEL_SIZE;
    vec3 color = vec3(0.);
    float fov = radians(70.);
 
    Ray ray = Ray(eye, setCamera(r, eye, vec3(0.), fov  ));
    color += shade(ray,3);

    ray = Ray(eye , setCamera(r - e.xy, eye, vec3(0.), fov  ));
    color += shade(ray,3);

    ray = Ray(eye , setCamera(r + e.xy, eye, vec3(0.), fov  ));
    color += shade(ray,3);

    return color*.3;
}

out vec4 pixel;
void main() {

    vec2 r = ref(UV, R);
    // we trace the ray, and shade the hit point to the eye
    vec3 color = antialias( r ); 

    // gamma color correction
    pixel = vec4( gamma(color,2.2) ,1.);   
}
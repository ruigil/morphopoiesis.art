// a struct for materials
struct Material {
    vec3 albedo;
    vec3 normal;
    bool scatter;
    vec3 scattered;
};

// a struct for a ray
struct Ray {
    vec3 ori;
    vec3 dir;
};

// a struct for a hit
struct Hit {
    vec3 p; // hit point
    float d; // hit distance
    float s; // distance field sign
};


// a signed distance function for a sphere
float sphere(vec3 p, float radius) { return length(p) - radius; }

// a signed distance function for a plane
float plane(vec3 p) { return p.y; }

// a signed distance function for a box
float box(vec3 p, vec3 size) {
    vec3 d = abs(p) - size * .5;
    return min( max(d.x, max(d.y,d.z)), 0. ) + length(max(d , 0.));
}

// 3d rotation matrix
// accept a vec3 with yaw, pitch and roll angles
mat3 rot3(vec3 angle) {
    vec3 ca = cos(angle);
    vec3 sa = sin(angle);
    return mat3(
        ca.x*ca.y, sa.x*sa.y, -sa.y, 
        ca.y*sa.y*sa.z-sa.x*ca.z, sa.x*sa.y*sa.z+ca.x*ca.z, ca.y*sa.z,
        ca.x*sa.y*ca.z+sa.x*sa.z, sa.x*sa.y*ca.z-ca.x*sa.z, ca.y*ca.z);
}

// a camera setup, with the lookAt method
// accept the screen refrence frame [-1,1], the eye position, 
// the lookAt point and a field of view angle
// return the ray direction
vec3 setCamera(vec2 screen, vec3 eye, vec3 lookAt, float fov) {
    vec3 up = vec3(0.,1.,0.);
    vec3 fw = normalize(eye - lookAt);
	vec3 rg = normalize( cross(fw, up) );
	up = cross(rg, fw);   
    vec3 ray = normalize(vec3(screen * tan(fov/2.), -1.)); 

    return ray * mat3(rg, up, fw); 
}

// gama correction
vec3 gamma(vec3 color, float p) { return pow(color,vec3( 1. / p)); }


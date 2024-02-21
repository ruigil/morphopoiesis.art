#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T

#include '../constants.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/noise.glsl'

// classic voronoi tesselation based on a grid
// return a vec4 with (point.xy, distance to points, distance to borders)
vec4 voronoi( in vec2 x) {
    vec2 fl = floor(x);
    vec2 fr = fract(x);

	vec4 res = vec4(.0,.0, 8., 8.);

    // first pass to get the closest neighbour point
    for(int i = -1; i <= 1; i++ ) {
        for(int j = -1; j <= 1; j++ ) {
            vec2 nb = vec2(i,j);
            vec2 p = nb - fr + hash2( fl + nb );
            float d = dot(p,p);
            res = d < res.z ? vec4(p,d,res.w) : res;
        }
    }
 
    // second pass to calculate the distance to borders
    for(int i = -1; i <= 1; i++ ) {
        for(int j = -1; j <= 1; j++ ) {
            vec2 nb = vec2(i,j);
		    vec2 p = nb - fr + hash2( fl + nb );

            if( dot(res.xy - p, res.xy - p) >.0001 ) { // skip the same cell 
                res.w = min(res.w, dot( 0.5*(res.xy+p), normalize(p-res.xy) ));
            }
        }
    }    

    return vec4( res.xy, sqrt(res.zw) );
}

out vec4 pixel;
void main() {
    // voronoi tesselation of the plane
    // each boundary if based on the distance
    // between random points on a grid

    // reference frame
    vec2 r = ref(UV, R) * 6.;

    // noise scaling to animate
    r *= 2. + noise(r*.3+T)*2. + sin(T);

    // voronoi of the plane
    vec4 v = voronoi(r);

    // fill borders and a circle on the random point
    float f = fill(v.w,.3,true) + fill(circle(v.xy,.1), EPS, true);

    pixel = vec4(vec3(f),1.);
}

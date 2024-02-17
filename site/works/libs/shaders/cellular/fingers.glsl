#version 300 es
precision highp float;
// original algorithm by cornusammonis https://shadertoy.com/view/Xst3Dj
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
// buffer to keep the state of the simulation
uniform sampler2D u_buffer0;

#include '../constants.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/noise.glsl'

//#define STEPS 20  // advection steps

//#define ts 0.2    // advection curl
//#define cs -2.0   // curl scale
//#define ls 0.3   // laplacian scale
//#define lps -1.75   // laplacian of divergence scale
//#define ds -0.4   // divergence scale
//#define dp -0.009  // divergence update scale
//#define pl 0.3    // divergence smoothing
//#define amp 1.   // self-amplification
//#define upd .6   // update smoothing

//#define _D .6    // diagonal weight

//#define _K0 -20.0/6.0 // laplacian center weight
//#define _K1 4.0/6.0   // laplacian edge-neighbors
//#define _K2 1.0/6.0   // laplacian vertex-neighbors

//#define _G0 0.25      // gaussian center weight
//#define _G1 0.125     // gaussian edge-neighbors
//#define _G2 0.0625    // gaussian vertex-neighbors

#define TX(d) texelFetch(u_buffer0, ivec2(d+XY)%ivec2(R),0)

#if defined(BUFFER_0)

vec2 normz(vec2 z) {
    return normalize(z);
    return z == vec2(0.) ? vec2(0.) : normalize(z);
}
/*
float kernel[9] = float[](
1./6.,4./6.,1./6.,
4./6.,-20./6.,4./6.,
1./6.,4./6.,1./6.
);
*/
float kernel[9] = float[](
0.25,0.5,0.25,
0.5,-3.,0.5,
0.25,0.5,0.25
);

// apply a convolution with a specific kernel
vec4 conv3x3(float[9] kernel, sampler2D t) {
    vec4 value = vec4(0);
    ivec2 p = ivec2(XY);
    for(int i=0; i<9; i++) {
        ivec2 o = ivec2( (i%3) - 1,(i/3) - 1);
        value += kernel[i] * texelFetch(t, (p+o) % ivec2(R) ,0);
    } 
    
    return value;
}

out vec4 pixel;
void main()
{
    const float _K0 = -20.0/6.0; // center weight
    const float _K1 = 4.0/6.0; // edge-neighbors
    const float _K2 = 1.0/6.0; // vertex-neighbors
    const float cs = .5; // curl scale
    const float ls = .3; // laplacian scale
    const float ps = -0.035; // laplacian of divergence scale
    const float ds = .0; // divergence scale
    const float pwr = .5; // power when deriving rotation angle from curl
    const float amp = 1.0; // self-amplification
    const float sq2 = 1.; // diagonal weight

      // 3x3 neighborhood coordinates
    vec4 uv = TX( ),
          n = TX(vec2( 0,  1 )),
          e = TX(vec2( 1,  0 )),
          s = TX(vec2( 0, -1 )),
          w = TX(vec2(-1,  0 )),
         nw = TX(vec2(-1,  1 )),
         sw = TX(vec2(-1     )),
         ne = TX(vec2( 1     )),
         se = TX(vec2( 1, -1 ));
    
    // uv.x and uv.y are our x and y components, uv.z is divergence 

    // laplacian of all components
    vec4 lapl  = _K0*uv + _K1*(n + e + w + s) 
                        + _K2*(nw + sw + ne + se);
  
    lapl = conv3x3(kernel, u_buffer0);
  
    float sp = ps * lapl.z;
    

    // calculate curl
    // vectors point clockwise about the center point
    float curl = n.x - s.x - e.y + w.y 
        + (nw.x + nw.y + ne.x - ne.y + sw.y - sw.x - se.y - se.x);
    
    // compute angle of rotation from curl
    //float a = cs * sign(curl) * pow(abs(curl), pwr);
    float a = min(cs  * sign(curl) * pow(abs(curl), pwr), 1e8);
    
    //a = cs * sign(curl);
    
    // calculate divergence
    // vectors point inwards towards the center point
    float div  = - n.y + s.y - e.x + w.x  
        + nw.x - nw.y - ne.x - ne.y + sw.y + sw.x + se.y - se.x;
    
    //div = -.2;
    /*
    x y df/dx + dg/dy

    (x,y). (x1,y1) = x*x1 + y*y1
    */
    float sd = ds * div;

    div = clamp(div, -1e3, 1e3); 

    vec2 norm = normz(uv.xy); 
    

    // temp values for the update rule 
     //vec2 t = (amp * uv.xy + ls * lapl.xy + uv.xy * sd).xy + norm * sp;
     vec2 t = clamp( (uv.xy + ls * lapl.xy ).xy + norm * sp, -1e3, 1e3);
    t *= mat2(cos(a), -sin(a), sin(a), cos(a) );
    if(T<.1)
        //pixel = vec4( noise(vec3(UV,4)) -vec3(.5), 0);
        pixel = vec4( vec3(UV,0.) -vec3(.5), 0.);
     else 
        pixel = clamp(vec4(t.xy,div,0), -20., 20.);
    
    vec3 color = vec3(UV,0.);
    color *= smoothstep( 0.,.01, abs(color-.5));  
    //pixel = vec4(  color, 1);

}
#else
out vec4 pixel;
void main() {
  

	pixel = vec4(normalize(TX()).xyz,1.);
    //pixel = TX();
    //pixel = vec4(hash3(vec3(UV,1)),1.);
}
#endif  
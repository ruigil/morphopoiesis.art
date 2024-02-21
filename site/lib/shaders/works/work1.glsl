#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

// buffer to keep the state of the simulation
uniform sampler2D u_buffer0;

#include '../constants.glsl'
#include '../utils/noise.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/kernels.glsl'
#include '../utils/gradients.glsl'
#include '../utils/shading.glsl'

// this shader implements the gray-scott model 
// for a reaction-diffusion system
// https://en.wikipedia.org/wiki/Reaction%E2%80%93diffusion_system

// It was first discovered by Turin that this type of system
// where two chemicals interact could generate patterns in nature
// https://en.wikipedia.org/wiki/The_Chemical_Basis_of_Morphogenesis

// here is a good explanation of this model
// http://mrob.com/pub/comp/xmorphia/

// so we define a buffer that receives itself as an input texture, 
// that we will use to keep the state of the simulation
#if defined(BUFFER_0)

// gray-scott reaction-diffusion system
vec2 rd(sampler2D t, vec2 p, float feed, float kill, float scale) {

    // convolution with a Laplace kernel with a 9 point stencil
    vec2 laplace = conv3x3(K_LAPLACE9, t, p, scale).rg;
    // chemicals A and B are stores in the r and g component of the texture
    vec2 ab = texture(t, p ).rg;

    // calculate the dA and dB
    float da = .2097 * laplace.r - (ab.r * ab.g * ab.g) + feed * (1. - ab.r);
    float db = .1050 * laplace.g + (ab.r * ab.g * ab.g) - (feed + kill) * ab.g;

    // we use the 1 frame as the dt time step 
    return ab +  1./*dt*/ * vec2(da,db); 
}

out vec4 pixel;
void main() { 
    // normalize mouse coordinates
    vec2 mouse = fract( ( M / R ) ) + .5;
    
    // these two parameters control the type of pattern
    // that we get with the simulation
    // they represent to addition of chemical A
    // and substraction of chemical B.

    //holes
    //float feed = 0.039;
    //float kill = 0.058;

    // worms
    //float feed = 0.046;
    //float kill = 0.063;

    // worms and loops
    //float feed = 0.082;
    //float kill = 0.06;

    // Turing patterns
    //float feed = 0.042;
    //float kill = 0.059;

    // negatons
    //float feed = 0.046;
    //float kill = 0.0594;

    // bubbles
    //float feed = 0.098;
    //float kill = 0.057;
    
    // prebubbles
    //float feed = 0.082;
    //float kill = 0.059;

    // spots and loops
    float feed = 0.016;
    float kill = 0.051;

    // replicating spots
    //float feed = 0.03;
    //float kill = 0.063;

    // chaos
    //float feed = 0.026;
    //float kill = 0.051;

    // u-worlds
    //float feed = 0.062;
    //float kill = 0.0609;

    // the scale of the simulation is the size of pixels. 
    float scale = 4.;

    // XY is the coodinate of the pixel gl_FragCoord.xy
    // but because coordinates are for the middle of the pixel, 
    // they are 1.5, 2.5, 3.5,... we need to subtract .5 and add 
    // it afterwards in the simulation with the correct scale.
    vec2 uv = ( (floor( (XY - .5) / scale ) * scale ) ) / R;

    vec2 s = T < .1 ? 
        // init the field with random concentrations
        vec2( 1, gnoise(uv * 10.) ) :
        // reaction diffusion simulation 
        rd(u_buffer0, uv + (PIXEL_SIZE * scale * .5) /* add half pixel*/, feed, kill, scale); 

    // distance to the mouse position
    float dist = length( (uv+.5) - mouse); 
    float radius = .02;


    // add a perturbation to the concentration with the mouse
    s +=  vec2(.0,.02) *  ( dist < radius ? 1. - dist * (1./radius) : 0.);

    if (mod(floor(T),20.) == .0)
        s -= vec2(.0,.02) * step(.65,fbm(vec3(UV,T)));

    pixel = vec4(vec3(s.r,s.g,0.),1.);
}
#else

vec3 nat2(float t) {
    return gradient( vec3(0.5), vec3(0.45), vec3(.7,.7,0.1), vec3(0.5,0.62,0.40), t );
}

// we just copy the texture buffer to the screen...
out vec4 pixel;
void main() {
    // we use the concentration of one of the chemicals to drive a color gradient
    float c = texture(u_buffer0, UV ).r;
    vec3 color = nat2( 1.-  2.*c + gnoise(UV + T*.1) );

    vec3 normal = normalize( 3.*
        vec3( 
            texture(u_buffer0, UV - vec2(PIXEL_SIZE.x*4.,0)).r - texture(u_buffer0, UV + vec2(PIXEL_SIZE.x*4.,0)).r,
            texture(u_buffer0, UV - vec2(0, PIXEL_SIZE.y*4.)).r - texture(u_buffer0, UV + vec2(0.,PIXEL_SIZE.y*4.)).r,
            1./3.
        )
    );
    // vignette
    color *= fill(circle(UV-.5, .5), EPS*300., true);
    // shading
    color = phong(UV-.5, color, vec3(0,0,1), vec3(0,0,1), normal );
    // ground noise
    if (c > .5)
        color *= smoothstep(.0, .4, fbm(vec3(vec2(UV.x+gnoise(UV*30.),UV.y) *vec2(3.,227.),T*.01)));
    // gamma correction 
    color *= smoothstep(vec3(0.),vec3(.5),color);
    pixel = vec4(color,1.);
}
#endif


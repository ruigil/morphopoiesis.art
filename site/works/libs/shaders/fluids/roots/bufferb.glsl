#define T(p) texelFetch(iChannel0, ivec2(mod(p,R)), 0)
#define C(p) texture(iChannel1, mod(p,R)/R)
/*

#iUniform float sense_oscil = 0. in { 0., 1. } // This will expose a slider to edit the value
#iUniform float oscil_scale = 1. in { 0., 10. } // This will expose a slider to edit the value
#iUniform float oscil_pow = 1. in { 0., 10. } // This will expose a slider to edit the value
#iUniform float sense_ang = .3 in { 0.0, 1.0 } // This will expose a slider to edit the value
#iUniform float sense_dis = 200. in { 0.0, 1000.0 } // This will expose a slider to edit the value
#iUniform float sense_force = .5 in { 0.0, 10.0 } // This will expose a slider to edit the value
#iUniform int sense_num = 6 in { 0, 30 } // This will expose a slider to edit the value
#iUniform float force_scale = .5 in { 0.0, 10.0 } // This will expose a slider to edit the value
#iUniform float distance_scale = 2. in { 0.0, 10.0 } // This will expose a slider to edit the value
#iUniform float acceleration = 1. in { 0.0, 10.0 } // This will expose a slider to edit the value
*/
/*
#define sense_num 6
#define sense_ang (0.15 + 0.13*sin(iTime))
#define sense_dis 200.
#define sense_oscil 0.0
#define oscil_scale 1.
#define oscil_pow 1.
#define sense_force 0.5
#define distance_scale 2.
#define force_scale 0.5
#define trailing 0.5
#define acceleration 1.0
*/

#iChannel0 'buffera.glsl'
#iChannel1 'bufferc.glsl'
#include 'common.glsl'

//SPH pressure
#define Pressure(rho) 1.0*rho.z
#define fluid_rho 0.2

#define dt 1.

void mainImage( out vec4 U, in vec2 XY ) {
    //vec2 uv = XY/R;
    //ivec2 p = ivec2(XY);
        
    //vec4 data = texel(B0, XY); 
    //vec2 X = decode(data.x) + XY;
    //vec2 V = decode(data.y);
    //float M = data.z;

    Cell C = decode(texel(B0, XY), XY);
    
    int sense_num = 2;
    float sense_ang = .3;
    float sense_dis = 200.;
    float sense_oscil = 0.0;
    float oscil_scale = 1.;
    float oscil_pow = 1.;
    float sense_force = 1.1;
    float distance_scale = 2.;
    float force_scale = 1.;
    float trailing = 0.5;
    float acceleration = 0.;

    if(C.M != 0.) //not vacuum
    {
        //Compute the force
        vec2 F = vec2(0.);

        //get neighbor data
        Cell CU = decode(texel(B0,XY + vec2(0, 1)), XY + vec2(0, 1) );
        Cell CD = decode(texel(B0,XY - vec2(0, 1)), XY - vec2(0, 1) );
        Cell CR = decode(texel(B0,XY + vec2(1, 0)), XY + vec2(1, 0) );
        Cell CL = decode(texel(B0,XY - vec2(1, 0)), XY - vec2(1, 0) );
               
        
        //pressure gradient
        //vec2 p = vec2(Pressure(d_r) - Pressure(d_l),
                      //Pressure(d_u) - Pressure(d_d));
                
        // density gradient
        vec2 dgrad = vec2(CR.M - CL.M, CU.M - CD.M);
        //velocity operators
        //float div = v_r.x - v_l.x + v_u.y - v_d.y;
        //float curl = v_r.y - v_l.y - v_u.x + v_d.x;
        //vec2 laplacian = 
            
        F -= .1 * C.M * dgrad;

        float ang = atan(C.V.y, C.V.x);
        float dang =sense_ang*PI/float(sense_num);
        vec2 slimeF = vec2(0.);
        //slime mold sensors
        
        for (int i=-sense_num; i<=sense_num; i++) {
            float cang = ang + float(i) * dang;
        	vec2 dir = (3. + sense_dis*pow(max(C.M - 0., 0.), distance_scale))*Dir(cang);
        	vec3 s0 = texel(B1, C.X + dir).xyz;  
   			float fs = pow(s0.z, force_scale);
            float os = oscil_scale*pow(s0.z - C.M, oscil_pow);
        	slimeF +=  sense_oscil*Rot(os)*s0.xy 
                     + sense_force*Dir(ang + sign(float(i))*PI*0.5)*fs; 
        }
        
        
        //remove acceleration component and leave rotation
        slimeF -= 0.1*dot(slimeF, normalize(C.V))*normalize(C.V);
		F += slimeF/float(2*sense_num);
        
        if(iMouse.z > 0.) {
            vec2 dx= XY - iMouse.xy;
             F += 0.1*Rot(PI*0.5)*dx*GS(dx/30.);
        }
        
        //integrate velocity
        //C.V += Rot(-0.*curl) * F * dt / C.M;
        C.V +=  F * dt / C.M;
        
        //acceleration for fun effects
        C.V *= (1. + acceleration);
        
        //velocity limit
        float v = length(C.V);
        C.V /= (v > 1.) ? v : 1.;
    }
    
    //mass decay
   // M *= 0.999;
    //mass renormalization
    //C.M = C.M > 1. ? 1. : C.M;
    float prevM = C.M;
    C.M = mix(C.M, .05, .01); 
    //M = M * (1.-.03) + 0.1 * 0.03;
    C.V = C.V*prevM/C.M;

    //input
    //if(iMouse.z > 0.)
    //\\	M = mix(M, 0.5, GS((pos - iMouse.xy)/13.));
    //else
     //   M = mix(M, 0.5, GS((pos - R*0.5)/13.));
    
    //save
    //C = Cell(X,V,M);
    //X = clamp(X - pos, vec2(-0.5), vec2(0.5));
    U = encode(C, XY);
}
#include 'common.glsl'

#iChannel0 'buffera.glsl'

//force calculation and integration
void Simulation(sampler2D ch, inout particle P, vec2 pos)
{
    //Compute the SPH force
    vec2 F = vec2(0.);
    vec3 avgV = vec3(0.);
    for(int i=-1; i<=1; i++)
    {
        for(int j=-1; j<=1; j++)
        {
            vec2 tpos = pos + vec2(i,j);
            vec4 data = texel(ch, tpos);
            particle P0 = getParticle(data, tpos);
            vec2 dx = P0.X - P.X;
            vec2 dx0 = P0.X - tpos;
            float avgP = 0.5*P0.M.x*(Pf(P.M) + Pf(P0.M)); 
            F -= 0.5*G(1.*dx)*avgP*dx;
            avgV += P0.M.x*G(1.*dx)*vec3(P0.V,1.);
        }
    }
    avgV.xy /= avgV.z;

    //viscosity
    F += 0.*P.M.x*(avgV.xy - P.V);
    
    //integrate
    P.V += F*dt/P.M.x;

    //border 
    //vec3 N = bN(P.X);
    //float vdotN = step(N.z, border_h)*dot(-N.xy, P.V);
    //P.V += 0.5*(N.xy*vdotN + N.xy*abs(vdotN));
    //P.V += 0.*P.M.x*N.xy*step(abs(N.z), border_h)*exp(-N.z);
    
    //if(N.z < 0.) P.V = vec2(0.);
    
    
    //velocity limit, normalize
    P.V /= max( length(P.V), 1.);
}

void mainImage( out vec4 U, in vec2 pos )
{
    ivec2 p = ivec2(pos);
        
    vec4 data = texel(iChannel0, pos); 
    
    particle P = getParticle(data, pos);
    
    
    //if(P.M.x != 0.) //not vacuum
    //{
        Simulation(iChannel0, P, pos);
    //}

    U = saveParticle(P, pos);
}
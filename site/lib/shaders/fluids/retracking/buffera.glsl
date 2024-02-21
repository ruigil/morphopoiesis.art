#include 'common.glsl'

#iChannel0 'bufferb.glsl'
// overlap
vec3 distribution(vec2 x, vec2 p, vec2 K)
{
    vec4 aabb0 = vec4(p - 0.5, p + 0.5); // cell box
    vec4 aabb1 = vec4(x - K*0.5, x + K*0.5); // particle box
    vec4 aabbX = vec4(max(aabb0.xy, aabb1.xy), min(aabb0.zw, aabb1.zw)); // overlap box
    vec2 center = 0.5*(aabbX.xy + aabbX.zw); //center of mass
    vec2 size = max(aabbX.zw - aabbX.xy, 0.); //only positive
    float m = size.x*size.y/(K.x*K.y); //relative amount
    //if any of the dimensions are 0 then the mass is 0
    return vec3(center, m);
}
/*
vec3 overlap(vec2 x, vec2 p, float diffusion_radius)
{
    vec4 aabb0 = vec4(p - 0.5, p + 0.5); //cell box
    vec4 aabb1 = vec4(x - diffusion_radius, x + diffusion_radius); //particle box
    vec4 aabbX = vec4(max(aabb0.xy, aabb1.xy), min(aabb0.zw, aabb1.zw)); //overlap box
    vec2 center = 0.5*(aabbX.xy + aabbX.zw); //center of mass 
    vec2 size = max(aabbX.zw - aabbX.xy, 0.); //only positive
    float m = size.x*size.y/(4.0*diffusion_radius*diffusion_radius); //relative area
    //if any of the dimensions are 0 then the mass ratio is 0
    return vec3(center, m);
}
*/

//diffusion and advection basically
void Reintegration(sampler2D ch, inout particle P, vec2 pos)
{
    //basically integral over all updated neighbor distributions
    //that fall inside of this pixel
    //this makes the tracking conservative
    for (int i=-1; i<=1; i++)
    {
        for (int j=-1; j<=1; j++)
        {
            vec2 tpos = pos + vec2(i,j);
            vec4 data = texel(ch, tpos);
        
            particle P0 = getParticle(data, tpos);
        
            vec2 dx0 = P0.X - tpos;
            vec2 difR = destimator(dx0, P0.M.x);
            P0.X += P0.V*dt; //integrate position
            
            vec3 D = distribution(P0.X, pos, difR);
            //the deposited mass into this cell
            float m = P0.M.x*D.z;
            
            //add weighted by mass
            P.X += D.xy*m;
            P.V += P0.V*m;
            P.M.y += P0.M.y*m;
            
            //add mass
            P.M.x += m;
        }
    }
    
    //normalization
    if(P.M.x != 0.)
    {
        P.X /= P.M.x;
        P.V /= P.M.x;
        P.M.y /= P.M.x;
    }
}

void mainImage( out vec4 U, in vec2 pos )
{

    particle P;// = getParticle(data, pos);
    
    //initial condition
    if(iFrame < 1)
    {
        //random
        vec3 rand = hash32(pos + vec2(0., 1.0)+0.28);
        if(rand.z < 0.1) 
        {
            P.X = pos + 0.3*(rand.yz-0.5);
            P.V = 0.65*(rand.xy-0.5) + vec2(0., 0.);
            P.M = vec2(mass, 0.);
        }
        else
        {
            P.X = pos;
            P.V = vec2(0.);
            P.M = vec2(1e-6);
        }
    } else {
        //ivec2 p = ivec2(pos);
        P.X = vec2(0.);
        P.V = vec2(0.);
        P.M = vec2(0.);
        //vec4 data = texel(iChannel0, pos); 
        //P = getParticle(data,pos);
       	Reintegration(iChannel0, P, pos);

    }
    
    U = saveParticle(P, pos);
}
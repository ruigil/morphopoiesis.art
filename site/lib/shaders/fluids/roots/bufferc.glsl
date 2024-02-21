#iChannel0 'bufferb.glsl'

#include 'common.glsl'

#define radius 2.0
void mainImage( out vec4 fragColor, in vec2 XY )
{
    float rho = 0.001;
    vec2 vel = vec2(0., 0.);

    //compute the smoothed density and velocity
    for(int i = -2; i <= 2; i++) {
        for(int j = -2; j <= 2; j++) {
            vec2 tpos = XY + vec2(i,j);

            Cell PN = decode(texel(B0, tpos), tpos);
            vec2 dx = PN.X - XY;

            float K = GS(dx/radius)/(radius);
            rho += PN.M*K;
            vel += PN.M*K*PN.V;
        }
    }
    vel /= rho;

    fragColor = vec4(vel, rho, 1.0);
}
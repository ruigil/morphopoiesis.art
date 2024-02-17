#iChannel0 'bufferb.glsl'

#include 'common.glsl'

#define dt 1.
#define distribution_size 2.
Cell reintegration(vec2 XY) {
    //vec2 X = vec2(0);
    //vec2 V = vec2(0);
    //float M = 0.;
    Cell P = Cell(vec2(0.),vec2(0.),0.);
    //basically integral over all updated neighbor distributions
    //that fall inside of this pixel
    //this makes the tracking conservative
    for(int i = -2; i <= 2; i++) {
        for(int j = -2; j <= 2; j++) {
            vec2 tpos = XY + vec2(i,j);

            Cell PN = decode(texel(B0, tpos), tpos);
                     
            PN.X += PN.V * dt; //integrate position

            //particle distribution size
            float K = distribution_size;
            
            vec4 aabbX = vec4(max(XY - 0.5, PN.X - K*0.5), min(XY + 0.5, PN.X + K*0.5)); //overlap aabb
            vec2 center = 0.5*(aabbX.xy + aabbX.zw); //center of mass
            vec2 size = max(aabbX.zw - aabbX.xy, 0.); //only positive
            
            //the deposited mass into this cell
            float m = PN.M*size.x*size.y/(K*K); 
            
            //add weighted by mass
            P.X += center*m;
            P.V += PN.V*m;
        
            //add mass
            P.M += m;
        }
    }
    
    //normalization
    if(P.M != 0.) {
        P.X /= P.M;
        P.V /= P.M;
    }

    return P;
}

Cell init(vec2 XY) {
    Cell C = Cell(vec2(0),vec2(0.),0.);

    C.X = XY;
    vec2 dx0 = (XY - R*.5); 
    vec2 dx1 = (XY - R*.5);
    C.V = 0.5 * Rot(PI*0.5) * dx0 * GS(dx0/30.) - 0.5 * Rot(PI*0.5) * dx1 * GS(dx1/30.);
    C.V += 0.2 * Dir(2.*PI*hash11(floor(XY.x/20.) + R.x * floor(XY.y/20.)));
    C.M = .1 + XY.x/R.x * 0.1 + XY.y/R.x * 0.1;

    return C;
}


void mainImage( out vec4 O, in vec2 XY ) {
    
    Cell C;

    if (iFrame < 1) C = init(XY); 
    else C = reintegration(XY);
        
    //P.X = clamp(P.X - XY, vec2(-0.5), vec2(0.5));
    //U = vec4(encode(X), encode(V), M, 0.);
    O = encode(C, XY);
}
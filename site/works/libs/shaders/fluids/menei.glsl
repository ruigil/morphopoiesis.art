
#iChannel0 "buffera.glsl"

// wyattflanders.com/MeAndMyNeighborhood.pdf

#define LOOKUP(COORD) texture(iChannel0,(COORD)/iResolution.xy)


void mainImage( out vec4 pixel, vec2 coord) {
   pixel = LOOKUP(coord).wwww;
}



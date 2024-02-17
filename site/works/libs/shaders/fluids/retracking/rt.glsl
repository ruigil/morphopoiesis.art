// Fork of "Reintegration visualization" by michael0884. https://shadertoy.com/view/WlSfWD
// 2020-10-21 10:57:34

// Fork of "Paint streams" by michael0884. https://shadertoy.com/view/WtfyDj
// 2020-08-31 20:06:54

#include 'common.glsl'
#iChannel0 'buffera.glsl'


void mainImage( out vec4 col, in vec2 pos )
{
     
    pos =  pos*0.05; //zoom in
    vec2 p = floor(pos);
  
    // accumulator to store the sum of the pixel values
    float acc = 0.;

    for (int i=-1; i<=1; i++) {
        for (int j=-1; j<=1; j++) { 
            vec2 ij = vec2(i,j);
            vec4 data = texel(iChannel0, p + ij);
            particle P0 = getParticle(data, p + ij);
            vec2 dx = P0.X - (p + ij);
            // using the center of mass to calculate a circle for display of the particle
            acc += P0.M.x*smoothstep(0.1, 0.09, distance(pos + 0.5, P0.X)); 
            // using mass position and velocity to calculate an arrow for display 
            acc += P0.M.x*smoothstep(0.03, 0.01, sdArrow(pos + 0.5, P0.X, P0.X+20.*P0.V));
            // using mass, position and velocity to caculate and display forward distribution 
            acc += 1.*P0.M.x*smoothstep(0.03, 0.01, sdBox(pos + 0.5 - P0.X - P0.V*dt, 0.5 * destimator(dx, P0.M.x)));
        }
    }
    
    // display the sum of the pixel values
    vec3 particles = acc*vec3(1);
    // using a box distance function to display a grid
   	vec3 grid = vec3(1)*smoothstep(0.1, 0., - sdBox(mod(pos, vec2(1.0)), vec2(1.0)) );
    // Output to screen
    col = vec4(mix(vec3(0.),vec3(1.), particles + grid), 1.);
}
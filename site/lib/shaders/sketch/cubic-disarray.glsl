#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T


#include '../constants.glsl'
#include '../utils/2d-utils.glsl'
#include '../utils/noise.glsl'

out vec4 pixel;
void main() {
    // This is a remix of "Cubic Disarray" by Georg Nees.

    // this shader is a good example of the compromises of doing creative code with shaders
    // compared to other more common ways of doing it, for example with javascript.

    // There are some algorithms that don't translate well to a shader 
    // environment, and one of the big problems are algorithms that use "for" loops

    // The thing to keep in mind is that shaders are executed once every pixel
    // so they will execute 55 million times a second in hd resolution !

    // if we want a grid of squares, 10X10 and we use a for loop to draw 100 squares
    // it will do more than 5 bilion calls of the code inside the loop every second !

    // this could kill very rapidly your computer 
    // so "for" loops must be avoided or used with the most care

    // this shader constructs a grid with a fractionalized space that is a way to repeat space
    // to avoid the big for loop, and use a small for loop of 9 iterations to manage the overflow 
    // of the rotating squares in neighbour cells.

    // so instead a 100 iterations in a 10x10 grid we will do 9 iterations only
    // and always do 9 no matter the size of the grid
    
    // grid size  
    float gs = 4.;
    
    // change scale of the reference frame
    vec2 r = ref(UV,R) * 2. * gs;

    // we get a coordinate for each grid cell
    vec2 cr = ceil(r);
    // and we fractionalize space to have the repetition we want
    vec2 fr = fract(r) - .5;

    // accumulator
    float v = 0.;
    
    // for this pixel we will only calculate the contribution of the 9 neighbour cells
    for (float i= -1. ; i<= 1.; i++) {
        for (float j= -1. ; j<= 1.; j++) {
            vec2 n = vec2(i,j);
                        
            // these a boundary conditions where there is no point in
            // calculating neighbours, so we exit the loop
            if ((cr.x == gs) && (n.x != 1.)) continue;
            if ((cr.x == -gs+1.) && (n.x != -1.)) continue;
            if ((cr.y == gs) && (n.y != 1.)) continue;
            if ((cr.y == -gs+1.) && (n.y != -1.)) continue;
            
            if ((cr.x == gs-1.) && (n.x == -1.) ) continue;
            if ((cr.x == -gs+2.) && (n.x == 1.) ) continue;
            if ((cr.y == gs-1.) && (n.y == -1.) ) continue;
            if ((cr.y == -gs+2.) && (n.y == 1.) ) continue;
            
            // a rotating factor that grows on the descending rows
            float rf = 40. * (((gs-1.)-(cr.y-n.y)) / ((gs*2.)-2.) );
            
            // a rotated reference frame for the cell that we are caclculating
            vec2 r2 = (fr + n) * rot( radians(rf * 2.* (noise(T + (cr-n))-.5)) );
            
            // and we accumulate the values
            v = max(v, stroke(rect(r2, vec2(1.)), .04 , EPS, true) ) ;
        }
    }
    
    // clip borders
    v *= fill( rect(r,vec2((gs*2.)-.5)), EPS, true);

    pixel = vec4(vec3(v),1.);
}
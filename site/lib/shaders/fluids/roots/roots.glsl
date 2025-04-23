// https://www.shadertoy.com/view/WlSfRw

#iChannel0 'bufferb.glsl'

#include 'common.glsl'



vec3 gradient(vec3 brightness, vec3 saturation, vec3 frequency, vec3 offset, float t ) {
    return clamp(brightness + saturation * cos( 6.28318* (frequency * t + offset ) ), 0., 1.);
}

vec3 nature(float t) {
    return gradient( vec3(0.5), vec3(0.5), vec3(.7,.4,0.1), vec3(.6,.5,.6), t );;
}

 


void mainImage( out vec4 O, in vec2 XY ) {    
    Cell C = decode(texel(B0, XY), XY);

    O = vec4( nature( (C.M / length(C.V))) , 1.); 

    //O = vec4(texel(B0,XY).xyz,1.);
}
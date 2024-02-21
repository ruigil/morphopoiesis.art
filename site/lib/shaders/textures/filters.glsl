#version 300 es
precision highp float;

uniform vec2 u_resolution; // defined as R
uniform vec2 u_mouse; // defined as M
uniform float u_time; // defined as T

// you need to specify a texture in the settings.json
// please check the vs code glsl canvas extension documentation
uniform sampler2D u_texture_0;

#include '../constants.glsl'
#include '../utils/kernels.glsl'

out vec4 pixel;
void main() {
    // Normalized mousel coordinates (from 0 to 1)
    vec2 m = M/R;

    // kernels available
    // K_EMBOSS
    // K_GAUSSIAN_BLUR
    // K_BOX_BLUR
    // K_EDGE
    // K_SHARPEN
    vec4 color = UV.x < m.x ?
        texture(u_texture_0, UV) :
        conv3x3(K_EMBOSS, u_texture_0, UV, 1.);
    
    color *= step(.0, abs(UV.x-m.x)- PIXEL_SIZE.x*3.);
    pixel = vec4(color.rgb,1.);
}
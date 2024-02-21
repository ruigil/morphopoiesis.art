#version 300 es
precision highp float;


// Pixel Spirit Deck
// https://patriciogonzalezvivo.github.io/PixelSpiritDeck/


// A pixel shader is a function executed for every pixel.
// So if the image has 1280x720 pixels and refreshes 60 times per second...
// the function is executed 55 million times per second ! (1280x720x60 = 55.296.000)
// The function receives a pixel coordinate a must produce a color, (x,y) => color
// Color is a 'vector' of 4 components (Red, Green, Blue, Alpha)
// Values go from 0. to 1. This shader produces one opaque black pixel for every coordinate.
out vec4 pixel;
void main() {
    pixel = vec4(0., 0., 0., 1.);
}
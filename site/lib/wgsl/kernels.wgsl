const K_EMBOSS = array<f32,9>(-2., -1., 0., -1., 1., 1., 0., 1., 2.);
const K_GAUSSIAN_BLUR = array<f32,9>(0.0625, 0.125, 0.0625, 0.125, 0.25, 0.125, 0.0625, 0.125, 0.0625);
const K_BOX_BLUR = array<f32,9>(0.1111, 0.1111, 0.1111, 0.1111, 0.1111, 0.1111, 0.1111, 0.1111, 0.1111);
const K_SHARPEN = array<f32,9>(0., -1., 0., -1., 5., -1., 0., -1., 0.);
const K_EDGE = array<f32,9>(-1., -1., -1., -1., 8., -1., -1., -1., -1.);

// 9 point stencil laplace operator
const K_LAPLACE9 = array<f32,9>(.25, .5, .25, .5, -3., .5, .25, .5, .25);
const K_SUM = array<f32,9>(1., 1., 1., 1., 0., 1., 1., 1., 1.);
// 5 point stencil laplace operator
const K_LAPLACE5 = array<f32,9>(.0, 1., .0, 1., -4., 1., 0., 1., 0.);

// apply a convolution in a 2d grid with a specific kernel
// assumes a wrap around boundary condition
// and a current buffer of size size
fn conv3x3( kernel: array<f32,9>, cell: vec2<u32>, size: vec2<u32>) -> vec2f {
    var acc = vec2(0.);
    
    for(var i = 0u; i < 9u; i++) {
        let offset =  (vec2u( (i / 3u) - 1u , (i % 3u) - 1u ) + cell + size) % size;
        // the current buffer can't be passed into the function
        //acc += (kernel[i] * current[offset.y * size.y + offset.x]);
    } 
    
    return acc;
}
---
title: Unlimited Power
layout: post.layout.ts
type: post
header: /assets/img/color-ifs.png
tags:
    - WebGPU
    - Computation
    - Fractal
    - Art
    - Science
---

It is common knowledge that [Moore's law](https://en.wikipedia.org/wiki/Moore%27s_law) is ending... It was to be expected, doubling the number of transistors on computer chips every 18 months couldn't be sustained forever. When we got at the nano meter scale weird quantum effects (like quantum tunnelling) started to appear and things got... complicated.

But we came a long way... From the 60.000 operations per seconds on the Intel 4004 in the 70's to 15 Trillion operations per second in the new Apple M2 chips today, that was quite a run. Now everybody has a supercomputer in its pocket.  Are we over? Apparently not, actually, we haven't even started. 

Sure, we can't double the number of transistors, to squeeze more juice, but there is other ways to get more raw compute power, **parallelism**, raising the number of cores. Gone are the days were CPU had only one core. Today the latest CPU's typically have tens of computing cores, but they are been outpaced by the latest GPU inside your graphics card with many thousands of cores. The end result is this.

![GPUVSCPU](/assets/img/gpu3.webp)

These little beasts have been pushing the limit of computing power, driven by the enormous demand of games and your latest compute hungry AI deep learning model, and now all this raw power is available to web developers with the latest [WebGPU API](https://www.w3.org/TR/webgpu/)

Take this simple program:

```rust
@fragment
fn fragmentMain(@builtin(position) coord: vec4f) -> @location(0) vec4f {
    // initial position of the fractal
    var p = vec3f( coord.xy / sys.resolution.y, cos(sys.time * .2) + sin(sys.time * .1));

    // iterate over the fractal
    for (var i = 0; i < 100; i++ ) {
        p = (vec3f(1.2,0.999,0.999) * abs( (abs(p) / dot(p,p) - vec3f(1.0 - sys.mouse.y*.1, .9,(sys.mouse.x - .5) * 0.5)) )).xzy;
    }
    return vec4f(p, 1);
}
```

It's a fragment shader written in [WGSL](https://www.w3.org/TR/WGSL/) , an it's a little program that can be runed for every pixel of your screen. The  program iterates 100 times over a function for every pixel in a 4K monitor with 60 frames per second. This means that the function inside the loop is executed 50 billion times per second ! Or to put it in another way, if we travel at light speed, at every function execution, we would only be able to travel 6mm... Not enough to cross the GPU from side to side.

Here [try it](/sketches/color-ifs/), you can play with your mouse.

![ColorIFS](/assets/img/color-ifs.png)

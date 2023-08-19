---
title: The Big-O
layout: post.layout.ts
type: post
header: /assets/img/boids
date: Git Created
tags:
    - Boids
    - Computation
    - Particles
    - Complexity
    - Emergence
---

In the quest to design algorithms for real-time generative art, there are some dangers to avoid. One of the biggest dangers is what is known as **the complexity class**.

Complexity class is a classification of the runtime requirements of space and time of a particular algorithm. The classification uses the [Big-O notation](https://www.bigocheatsheet.com/), and is meant to describe if the algorithm scales well or not. 

As an example, with this notation, O(1) means an infinitely scalable algorithm, and O(n!) means you should abandon all hope that your computer will ever have enough power to compute your algorithm ever. So, we should really try to avoid the later...

Cellular automata have O(n) complexity, which is not too bad. They get this because they are based on a grid and the transition rule (which is calculated with the local neighbours) don't depend on the size of the grid. Here the **'N'** is the size of the grid.  

There are other algorithms which seem on the surface very similar but reveal themselves to be monsters in disguise.  Take the [Boids](https://www.red3d.com/cwr/boids/) algorithm, for example. It is a well known algorithm invented by Craig Reynolds that simulate birds flocking, with simple rules and that shows remarkable emergence patterns.

Here, **'N'** is the number of birds. The algorithm, like cellular automata, is also based on local rules and the next state of each bird depends also on it's local neighbours, but to calculate each bird state we have to go through all the other birds to select its neighbours, which makes the algorithm O(N^2), which is really bad...

Cellular automata model the world as *fields* while Boids model the world as *particles*. This distinction appears very often in simulations, like fluid flow, where it is called [Eulerian (fields) and Lagrangian (particles)](https://eng.libretexts.org/Bookshelves/Civil_Engineering/Book%3A_All_Things_Flow_-_Fluid_Mechanics_for_the_Natural_Sciences_(Smyth)/05%3A_Fluid_Kinematics/5.01%3A_Lagrangian_and_Eulerian_descriptions). Of course that not all particle algorithms have O(n^2) complexity but sometimes a design choice can have a big impact on the performance of the algorithm. 

Here is an [implementation](/sketches/boids/) of the Boids algorithm on the GPU, which kind of hurts because it has no advantage to a CPU implementation (it's not parallelizable). On the other hand, cellular automata and GPU's, (because they are massively parallelizable), are a match made in heaven.

[![boids](/assets/img/boids-big.webp)](/sketches/boids/)


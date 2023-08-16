---
title: Euler and Lagrange
layout: post.layout.ts
type: post
header: /assets/img/boids.png
date: Git Created
tags:
    - Boids
    - Computation
    - Particles
    - Complexity
    - Emergence
---

In the quest to design algorithms for generative art, there are many dangers to avoid. One of the biggest dangers is what is known as **complexity class**.

Complexity classes are a classification of the runtime requirements with space and time of a particular algorithm. The classification uses the [Big-O notation](https://www.bigocheatsheet.com/), and is meant to tell you if your algorithm scales well or not. 

With this notation, for example, O(1) means an infinitely scalable algorithm, and O(n!) means you should abandon all hope that your computer will have enough compute power for your algorithm ever. So, we should really try to avoid the later...

Cellular automata have O(n) complexity, which is not bad. They get this because they are based on a grid and the transition rule which is calculated with the local neighbours don't depend on the size of the grid. Here the **'N'** is the size of the grid.  

There are other algorithms which seem on the surface very similar but reveal themselves to be monsters in disguise.  Take the [Boids](https://www.red3d.com/cwr/boids/) algorithm. It is a well known algorithm invented by Craig Reynolds that simulate birds flocking, with simple rules and remarkable emergence patterns.

Here, **'N'** is the number of birds. The algorithm, like cellular automata, is  also based on local rules and the next state of each bird depends also on it's local neighbours, but to calculate each bird state we have to go through all the other birds to select its neighbours, which makes the algorithm O(N^2), which is really bad...

Cellular automata model the world as *fields* while Boids model the world as *particles*. This distinction appears very often in simulations, like fluid flow, where it is called [Eulerian (fields) and Lagrangian (particles)](https://en.wikipedia.org/wiki/Lagrangian_and_Eulerian_specification_of_the_flow_field). Of course that not all particle algorithms have O(n^2) complexity but sometimes  a design choice can have a big impact on the performance of the algorithm. 

Here is an [implementation](/sketches/boids/) of the Boids algorithm on the GPU, which kind of hurts because it has no advantage to a CPU implementation (it's not parallelizable). On the other hand, cellular automata and GPU's, because they are massively parallelizable, are a match made in heaven.

[![boids](/assets/img/boids.png)](/sketches/boids/)

---
title: Matter starts to see...
layout: post.layout.ts
type: post
header: /shaders/sketches/dla/dla
date: Git Created
tags:
    - DLA
    - Particles
    - Fields
    - Crystal
    - Emergence
---

When we look at the world and we see it full of life and order, we might wonder where all this order come from.  Some evolutionary biologists defended the position that evolution by natural selection is the only explanation we need for this order generation process.

This extreme position created a reaction that gave rise to another extreme position. The one that defended that randomness can't create all the beautiful forms we see, there must be an intelligent designer working in the background.

In the fight between the thesis and antithesis we forgot the synthesis. Sure, natural selection is an order generation process, but it is not the whole story.

[Ilya Prigogine](https://en.wikipedia.org/wiki/Ilya_Prigogine), won the Nobel Prize in 1977, because he showed us another part of the story. It is true that in closed systems, the laws of thermodynamics tend inevitably to disorder, but in open systems far from equilibrium, the dissipation of energy allows matter to self-organize in dissipative structures. As Ilya Prigogine would say "Matter starts to see..."

This order generation process is more primordial than life, and it gives rises to order of all kinds, like tornados and crystals, and it might be that life is a direct result of this. 

In [crystal formation](https://en.wikipedia.org/wiki/Crystallization) there is some kind of matter that diffuses and dissipates, but that aggregates with a structure with a nucleation spot in a phase transition. It might be that life is a special kind of dynamic crystal that instead of creating static frozen structures, creates organizational forms that are stable in a dissipative context.

There is a simple model of crystal formation called [diffusion-limited aggregation](https://en.wikipedia.org/wiki/Diffusion-limited_aggregation) that allows to create beautiful fractal structures like the example below.

![DLA](/assets/img/dla_cluster.jpg)

Here is an implementation of the model in the GPU.

[![DLA](/shaders/sketches/dla/dla-big.webp)](/sketches/dla/)

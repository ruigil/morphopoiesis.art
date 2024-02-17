---
title: Slime Intelligence
layout: post.layout.ts
type: post
header: /works/physarum/physarum
date: Git Created
tags:
    - Physarum
    - Particles
    - Fields
    - Complexity
    - Emergence
---

When we want to design an algorithm for a dynamical system, one of the first design choice is what kind of model to use. Should we model it as a field or as particles? Each point of view is acceptable, but they do have some trade-offs.

For example if we want to keep track of local properties, fields are the perfect choice because of their grid system and particles make that harder, because for each particle we have to go through all the others to ensure a local property.

But if instead, we want to keep track of global properties (like conservation of matter), particles make that easy (we just need to keep the number of particles constant), while with fields we would need an operation over the whole field to normalize it to a global property.

When we have local and global properties it seems like an impossible decision. Should we go with fields or particles ? That's what I like about the Physarum algorithmic model, it uses both !

*Physarum polycephalum* is the scientific name of slime molds, and as a life form it's really primitive. It's basically a giant cell with many nucleus, but capable of very complex and intelligent behaviour like growth, movement, food foraging, nutrient transport and network pattern formation. 

In this [paper](https://uwe-repository.worktribe.com/output/980579) the author models the behaviour of slime molds as a population of agents that move and interact with the world by leaving a trail of chemicals. Agents do not interact with each other directly but only through the chemical trails left by others. In this model, agents are particles and the chemical field is a grid.

The rules of the system are pretty simple. Agent can only see in front of them with a certain distance and angle and move where the concentration of chemicals is bigger. Each time they move, they deposit a quantity of chemical. The field keeps track of the concentration of the chemical while diffusing and evaporating it over time. [Sage Jenson](https://cargocollective.com/sagejenson/physarum) gives a good visual explanation of the rules.

![physarum rules](/assets/img/physarum-rules-big.webp)

This concept of agents interacting with each other through a medium is not new, it's called [stigmergy](https://en.wikipedia.org/wiki/Stigmergy) and dates back to the 1960's. It was coined by a biologist analysing termites. In computer science it's also known as the [ant colony optimization algorithm](https://en.wikipedia.org/wiki/Ant_colony_optimization_algorithms) where ants (particles) interact with pheromones chemicals (fields).

What is remarkable about this algorithm is that although the basic rules are simple, it exhibits quite complex and efficient solutions to problems of building resilient transport networks, and the fact that agents only interact indirectly throught the field allows the simulation to run in real time with more than a million particles... The power of distributed slime mold intelligence !

Here is an [implementation](/sketches/physarum/) on WebGPU. You can play with your mouse to create a black hole in the chemical field and stopping agents from interacting, but you will notice that the transport network they form is pretty resilient.

[![physarum](/assets/img/physarum-big.webp)](/sketches/physarum/)
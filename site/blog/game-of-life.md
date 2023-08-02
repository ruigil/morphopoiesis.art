---
title: Tiny robots
layout: post.layout.ts
type: post
header: /assets/img/gol.png
tags:
    - WebGPU
    - Computation
    - Cellular Automata
---

In every scientific domain there is an foundational object of study. Physicists study fundamental particles, chemists study molecules, biologists study cells, and computer scientists that are interested in complexity and artificial life study cellular automata.

Cellular automata is the name given to a discrete model of computation invented by [John Von Neumann](https://en.wikipedia.org/wiki/John_von_Neumann) in the 40's. To describe it, imagine all space is divided into a grid of cells, within each is a tiny robot.  Each robot has a current state,  and a set of rules  to determine what will be their next state, based on their current state and the state of its local neighbours.  The neighbours are all the other robots in their adjacent cells.

It seems like a toy model, but it is very powerful. Von Neumann invented this model, to accomplish his objective of designing a machine whose complexity would grow akin to biological organisms. For that to happen, it decided that the minimum complexity required would be a machine that self-replicated., and he managed to design one called the [Universal Constructor](https://en.wikipedia.org/wiki/Von_Neumann_universal_constructor), a cellular automata that has 29 states, and is able to self-replicate. 

Later in the 70's, [John Conway](https://en.wikipedia.org/wiki/John_Horton_Conway), inspired by Von Neumann came up with a new cellular automata which he called [The Game of Life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life) with just only 2 states, amd 3 rules that is able to do the same, and exhibits many types of patterns generation, from still patterns, [to oscillators, infinite grow](https://conwaylife.com/wiki/), and chaotic patterns. With these patterns, [Paul Rendell](http://rendell-attic.org/gol/tm.htm) designed a [Turing Machine](https://en.wikipedia.org/wiki/Turing_machine) within the rules of the game, which proves that this simple system can work as a universal computer.  

Let pause briefly for the implications of this. This system is a simple iterative function, that take one input (the current state) to produce the output (the next state), but they can act as universal computers and compute everything, [even itself](https://www.youtube.com/watch?v=xP5-iIeKXE8) ! This raises the question if the Universe itself is a giant cellular automata. Stephen Wolfram [thinks so](https://en.wikipedia.org/wiki/A_New_Kind_of_Science).

Here is a the Game of Life [implemented](/sketches/gol/) with WebGPU.

[![GOL](/assets/img/gol.png)](/sketches/gol/)
# System Patterns: Morphopoiesis

## System Architecture

Morphopoiesis follows a modular architecture centered around the Poiesis framework, which provides a structured approach to WebGPU development. The system is organized into several key layers:

### Architecture Layers

1. **Presentation Layer**
   - Static site generator (using Deno)
   - HTML/CSS templates and layouts
   - User interface components

2. **Shader Gallery Layer**
   - Shader catalog and metadata
   - Category organization
   - Shader selection and loading

3. **Poiesis Framework Layer**
   - WebGPU initialization and context management
   - Shader compilation and pipeline setup
   - Uniform and storage buffer management
   - Render and compute pipeline orchestration

4. **Shader Implementation Layer**
   - WGSL shader code
   - TypeScript integration code
   - Parameter definitions and bindings

5. **Interaction Layer**
   - User input handling
   - Parameter controls
   - State management

### Component Structure

```
morphopoiesis.art/
├── _config.ts                 # Site configuration
├── site/                      # Main site content
│   ├── _includes/             # Layout templates
│   ├── assets/                # Static assets
│   ├── lib/                   # JavaScript libraries
│   │   ├── poiesis/           # Core WebGPU framework
│   │   └── shaders/           # Shared shader utilities
│   ├── shaders/               # Individual shader implementations
│   │   ├── _data.json         # Shader metadata
│   │   ├── [category]/        # Organized by category
│   │   │   ├── [shader].ts    # TypeScript integration
│   │   │   └── [shader].wgsl  # WGSL shader code
│   └── notes/                 # Educational content
└── memory_bank/              # Documentation and memory
```

## Key Technical Decisions

1. **WebGPU as Graphics API**
   - Chosen for its modern capabilities and performance
   - Enables complex real-time visualizations in the browser
   - Future-proof but requires modern browser support

2. **WGSL for Shader Programming**
   - WebGPU's native shading language
   - Type-safe and designed for modern GPU architectures
   - Supports both compute and render shaders

3. **TypeScript for Application Logic**
   - Type safety and modern JavaScript features
   - Better maintainability and developer experience
   - Strong integration with web technologies

4. **Custom Poiesis Framework**
   - Abstracts WebGPU boilerplate
   - Provides structured approach to shader development
   - Handles resource management and pipeline setup

5. **Static Site Generation**
   - Pre-rendered content for performance
   - Simple deployment and hosting
   - SEO-friendly structure

6. **Modular Shader Organization**
   - Each visualization is self-contained
   - Consistent interface for integration
   - Reusable components and utilities

## Design Patterns in Use

### Framework Patterns

1. **Factory Pattern**
   - The Poiesis framework uses factory methods to create WebGPU resources
   - Example: `createShaderModule`, `createGeometry`, `createBindings`

2. **Builder Pattern**
   - The `build` method constructs complex WebGPU pipelines step by step
   - Allows for flexible configuration of rendering setup

3. **Dependency Injection**
   - Resources like device, context, and buffers are injected where needed
   - Improves testability and modularity

### Shader Implementation Patterns

1. **Module Pattern**
   - Each shader is encapsulated in its own module
   - Exports a factory function that returns a configuration object

2. **Configuration Object Pattern**
   - Shaders define their requirements and behavior through structured objects
   - Consistent interface for the framework to consume

3. **Uniform Buffer Object (UBO) Pattern**
   - Structured data passed to shaders through uniform buffers
   - Consistent memory layout between CPU and GPU

### Rendering Patterns

1. **Render Loop Pattern**
   - Continuous rendering cycle for interactive visualizations
   - Frame-based updates and state management

2. **Double Buffering**
   - Ping-pong technique for compute shaders
   - Allows reading from one buffer while writing to another

3. **Compute-Render Pipeline**
   - Compute shaders for simulation logic
   - Render pipeline for visualization

## Component Relationships

### Core Relationships

1. **Site ↔ Shader Gallery**
   - Site provides the container and navigation
   - Gallery organizes and presents the shaders

2. **Shader Gallery ↔ Individual Shaders**
   - Gallery loads and initializes shaders
   - Shaders provide metadata for the gallery

3. **Shader ↔ Poiesis Framework**
   - Shaders define requirements and behavior
   - Framework handles WebGPU setup and execution

4. **Poiesis Framework ↔ WebGPU API**
   - Framework abstracts and organizes WebGPU calls
   - Provides structured interface for shader development

5. **User Interface ↔ Shader Parameters**
   - UI controls manipulate shader parameters
   - Parameters affect visualization behavior

### Data Flow

```
User Input → UI Controls → Parameter Updates → Uniform Buffers → 
Shader Execution (GPU) → Render Output → Canvas Display → User Perception
```

## Critical Implementation Paths

### Shader Initialization Path

1. User selects a shader from the gallery
2. Shader TypeScript file is loaded
3. WGSL code is fetched and compiled
4. Poiesis framework initializes WebGPU context
5. Buffers, bindings, and pipelines are created
6. Initial state is set up
7. Render loop begins

### Render Loop Path

1. Frame begins
2. User inputs are processed
3. Uniform buffers are updated
4. Compute passes execute simulation logic
5. Render pass visualizes the current state
6. Frame is presented to the canvas
7. Next frame is scheduled

### Interaction Path

1. User interacts with controls or canvas
2. Event handlers capture input
3. Parameters are updated
4. Changes are reflected in uniform buffers
5. Shader behavior is affected
6. Visual feedback is provided
7. State is potentially saved

## Architecture Principles

1. **Separation of Concerns**
   - Clear boundaries between site, framework, and shader code
   - Each component has a specific responsibility

2. **Progressive Enhancement**
   - Core functionality works with basic WebGPU support
   - Advanced features enhance the experience when available

3. **Performance First**
   - GPU-accelerated rendering for smooth interaction
   - Efficient data transfer between CPU and GPU

4. **Extensibility**
   - Easy to add new visualizations
   - Common patterns for consistent implementation

5. **Educational Value**
   - Code organization supports learning
   - Clear examples of WebGPU usage

---

This system patterns document outlines the architecture, technical decisions, design patterns, and implementation paths of the Morphopoiesis project. It serves as a guide for understanding the system structure and for maintaining consistency in development.

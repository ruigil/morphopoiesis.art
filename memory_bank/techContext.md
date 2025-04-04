# Technical Context: Morphopoiesis

## Technologies Used

### Core Technologies

1. **WebGPU**
   - Modern web graphics API for high-performance GPU computing
   - Successor to WebGL with improved performance and capabilities
   - Enables both rendering and compute operations
   - Currently supported in Chrome, Edge, and Firefox (with flags)

2. **WGSL (WebGPU Shading Language)**
   - Shader language specifically designed for WebGPU
   - Similar to GLSL but with modern features and safety guarantees
   - Strongly typed with explicit memory layout
   - Supports both vertex/fragment and compute shaders

3. **TypeScript**
   - Statically typed superset of JavaScript
   - Provides type safety and modern language features
   - Improves code maintainability and developer experience
   - Used for application logic and shader integration

4. **Deno**
   - Modern JavaScript/TypeScript runtime
   - Used for static site generation
   - Built-in TypeScript support
   - Secure by default with explicit permissions

### Supporting Technologies

1. **HTML5/CSS3**
   - Standard web technologies for structure and styling
   - Modern CSS features for responsive design
   - Canvas element for WebGPU rendering

2. **Static Site Generation**
   - Pre-renders content for performance and SEO
   - Simplifies deployment and hosting
   - Appears to use Deno for build process

3. **Custom Poiesis Framework**
   - Abstracts WebGPU boilerplate
   - Provides structured approach to shader development
   - Handles resource management and pipeline setup

## Development Setup

### Environment Requirements

1. **Modern Browser with WebGPU Support**
   - Chrome/Edge 113+ or Firefox with flags enabled
   - Hardware with WebGPU-compatible GPU
   - Up-to-date graphics drivers

2. **Development Tools**
   - Deno runtime for build process
   - TypeScript-compatible editor (VS Code recommended)
   - WebGPU browser debugging tools

3. **Local Development Server**
   - Deno's built-in server capabilities
   - HTTPS for secure context (required by some WebGPU features)

### Project Structure

The project follows a modular structure with clear separation of concerns:

```
morphopoiesis.art/
├── _config.ts                 # Site configuration
├── create.ts                  # Creation utilities
├── deno.json                  # Deno configuration
├── site/                      # Main site content
│   ├── _includes/             # Layout templates
│   ├── assets/                # Static assets
│   ├── lib/                   # JavaScript libraries
│   │   ├── poiesis/           # Core WebGPU framework
│   │   └── shaders/           # Shared shader utilities
│   ├── shaders/               # Individual shader implementations
│   │   ├── _data.json         # Shader metadata
│   │   └── [category]/        # Organized by category
│   └── notes/                 # Educational content
└── webgpu_book/               # WebGPU examples/reference
```

### Build Process

1. **Development Mode**
   - Local server with hot reloading
   - Direct editing of TypeScript and WGSL files
   - Browser-based testing and debugging

2. **Production Build**
   - Static site generation with Deno
   - Asset optimization and bundling
   - Deployment to static hosting

## Technical Constraints

### Browser Compatibility

1. **WebGPU Support Requirement**
   - Limited to browsers with WebGPU implementation
   - Chrome/Edge 113+ or Firefox with flags
   - No support in Safari (as of documentation time)
   - No support in older browsers

2. **Hardware Requirements**
   - Modern GPU with appropriate driver support
   - Sufficient GPU memory for complex simulations
   - Performance varies by hardware capability

### Performance Considerations

1. **GPU Computation Limits**
   - Complex simulations may be limited by available GPU resources
   - Mobile devices have significantly lower performance ceilings
   - Need to balance visual quality with performance

2. **Memory Management**
   - Careful management of GPU buffers and resources
   - Potential for out-of-memory errors with large datasets
   - Need for adaptive quality settings

3. **Shader Compilation Time**
   - Complex shaders may have noticeable compilation delay
   - Need for loading indicators or progressive enhancement

### Security and Privacy

1. **Secure Context Requirement**
   - WebGPU requires HTTPS in production environments
   - Local development may use localhost exception

2. **GPU Fingerprinting Concerns**
   - WebGPU provides detailed GPU information
   - Potential privacy implications for users

## Dependencies

### External Dependencies

1. **WebGPU API**
   - Browser-provided implementation
   - No external library needed

2. **Deno Standard Library**
   - For static site generation
   - File system operations
   - HTTP server capabilities

3. **TypeScript Compiler**
   - Integrated with Deno
   - Type checking and transpilation

### Internal Dependencies

1. **Poiesis Framework**
   - Custom WebGPU abstraction layer
   - Core rendering and compute pipeline management
   - Buffer and resource handling

2. **Shader Utilities**
   - Common WGSL functions and patterns
   - Shared constants and structures
   - Utility functions for common operations

3. **Site Templates**
   - Layout components
   - Navigation and UI elements
   - Shader embedding and integration

## Tool Usage Patterns

### Development Workflow

1. **Shader Development**
   - Create new directory in appropriate category
   - Implement WGSL shader code
   - Create TypeScript integration file
   - Add metadata to _data.json
   - Test and refine

2. **Framework Extension**
   - Identify common patterns across shaders
   - Extract to shared utilities
   - Update framework capabilities
   - Ensure backward compatibility

3. **Content Creation**
   - Add educational notes and context
   - Create explanatory diagrams or animations
   - Link to related resources and references

### Testing Approach

1. **Browser Testing**
   - Test across supported browsers
   - Verify WebGPU feature detection and fallbacks
   - Check performance on various hardware

2. **Visual Verification**
   - Compare output against reference implementations
   - Ensure mathematical correctness
   - Verify aesthetic quality and visual appeal

3. **Performance Profiling**
   - Use browser developer tools for GPU profiling
   - Monitor frame rates and memory usage
   - Optimize critical paths

### Deployment Process

1. **Build Static Site**
   - Generate optimized static files
   - Process and optimize assets
   - Create distribution package

2. **Hosting**
   - Deploy to static hosting service
   - Configure appropriate caching headers
   - Ensure HTTPS for secure context

3. **Monitoring**
   - Track usage and performance
   - Gather feedback on user experience
   - Identify opportunities for improvement

---

This technical context document outlines the technologies, development setup, constraints, dependencies, and tool usage patterns of the Morphopoiesis project. It serves as a reference for understanding the technical foundation of the project and for onboarding new contributors.

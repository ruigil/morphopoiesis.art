export const cubeVertexSize = 4 * 10; // Byte size of one cube vertex.
export const cubePositionOffset = 0;
export const cubeColorOffset = 4 * 4; // Byte offset of cube vertex color attribute.
export const cubeUVOffset = 4 * 8;
export const cubeVertexCount = 36;


export const letterF = () =>{
    const positions = [
    // left column
    -50,  75,  15,
    -20,  75,  15,
    -50, -75,  15,
    -20, -75,  15,

   // top rung
    -20,  75,  15,
     50,  75,  15,
    -20,  45,  15,
     50,  45,  15,

   // middle rung
    -20,  15,  15,
     20,  15,  15,
    -20, -15,  15,
     20, -15,  15,

   // left column back
    -50,  75, -15,
    -20,  75, -15,
    -50, -75, -15,
    -20, -75, -15,

   // top rung back
    -20,  75, -15,
     50,  75, -15,
    -20,  45, -15,
     50,  45, -15,

   // middle rung back
    -20,  15, -15,
     20,  15, -15,
    -20, -15, -15,
     20, -15, -15,
    ];
   
    const indices = [
        0,  2,  1,    2,  3,  1,   // left column
        4,  6,  5,    6,  7,  5,   // top run
        8, 10,  9,   10, 11,  9,   // middle run
    
       12, 13, 14,   14, 13, 15,   // left column back
       16, 17, 18,   18, 17, 19,   // top run back
       20, 21, 22,   22, 21, 23,   // middle run back
    
        0,  5, 12,   12,  5, 17,   // top
        5,  7, 17,   17,  7, 19,   // top rung right
        6, 18,  7,   18, 19,  7,   // top rung bottom
        6,  8, 18,   18,  8, 20,   // between top and middle rung
        8,  9, 20,   20,  9, 21,   // middle rung top
        9, 11, 21,   21, 11, 23,   // middle rung right
       10, 22, 11,   22, 23, 11,   // middle rung bottom
       10,  3, 22,   22,  3, 15,   // stem right
        2, 14,  3,   14, 15,  3,   // bottom
        0, 12,  2,   12, 14,  2,   // left
    ];
    const quadColors = [
        200,  70, 120,  // left column front
        200,  70, 120,  // top rung front
        200,  70, 120,  // middle rung front
   
         80,  70, 200,  // left column back
         80,  70, 200,  // top rung back
         80,  70, 200,  // middle rung back
   
         70, 200, 210,  // top
        160, 160, 220,  // top rung right
         90, 130, 110,  // top rung bottom
        200, 200,  70,  // between top and middle rung
        210, 100,  70,  // middle rung top
        210, 160,  70,  // middle rung right
         70, 180, 210,  // middle rung bottom
        100,  70, 210,  // stem right
         76, 210, 100,  // bottom
        140, 210,  80,  // left
    ];
   
    const numVertices = indices.length;
    const vertexData = new Float32Array(7 * numVertices ); // xyz + color
    //const colorData = new Uint8Array(vertexData.buffer);
    //console.log(vertexData.length)
    //console.log(colorData.length)
    //console.log(numVertices)
  
    for (let i = 0; i < indices.length; ++i) {
      const positionNdx = indices[i] * 3;
      const position = positions.slice(positionNdx, positionNdx + 3);
      vertexData.set(position, i * 7);
   
      const quadNdx = (i / 6 | 0) * 3;
      const color = quadColors.slice(quadNdx, quadNdx + 3).map(v => v/255.);
      vertexData.set(color, i * 7 + 3);
      vertexData.set([1], i * 7 + 6);
      
      //colorData.set(color, i * 16 + 12);  // set RGB
      //colorData[i * 16 + 15] = 255;       // set A
    }
    //console.log(vertexData)

    return { data:vertexData, vertices: numVertices, depth: true };
}


export const cube = () => ({
    vertices: 36,
    data: new Float32Array([
        // float4 position, float4 color, float2 uv,
        1, -1, 1, 1,   1, 0, 1, 1,  0, 1,
        -1, -1, 1, 1,  0, 0, 1, 1,  1, 1,
        -1, -1, -1, 1, 0, 0, 0, 1,  1, 0,
        1, -1, -1, 1,  1, 0, 0, 1,  0, 0,
        1, -1, 1, 1,   1, 0, 1, 1,  0, 1,
        -1, -1, -1, 1, 0, 0, 0, 1,  1, 0,
      
        1, 1, 1, 1,    1, 1, 1, 1,  0, 1,
        1, -1, 1, 1,   1, 0, 1, 1,  1, 1,
        1, -1, -1, 1,  1, 0, 0, 1,  1, 0,
        1, 1, -1, 1,   1, 1, 0, 1,  0, 0,
        1, 1, 1, 1,    1, 1, 1, 1,  0, 1,
        1, -1, -1, 1,  1, 0, 0, 1,  1, 0,
      
        -1, 1, 1, 1,   0, 1, 1, 1,  0, 1,
        1, 1, 1, 1,    1, 1, 1, 1,  1, 1,
        1, 1, -1, 1,   1, 1, 0, 1,  1, 0,
        -1, 1, -1, 1,  0, 1, 0, 1,  0, 0,
        -1, 1, 1, 1,   0, 1, 1, 1,  0, 1,
        1, 1, -1, 1,   1, 1, 0, 1,  1, 0,
      
        -1, -1, 1, 1,  0, 0, 1, 1,  0, 1,
        -1, 1, 1, 1,   0, 1, 1, 1,  1, 1,
        -1, 1, -1, 1,  0, 1, 0, 1,  1, 0,
        -1, -1, -1, 1, 0, 0, 0, 1,  0, 0,
        -1, -1, 1, 1,  0, 0, 1, 1,  0, 1,
        -1, 1, -1, 1,  0, 1, 0, 1,  1, 0,
      
        1, 1, 1, 1,    1, 1, 1, 1,  0, 1,
        -1, 1, 1, 1,   0, 1, 1, 1,  1, 1,
        -1, -1, 1, 1,  0, 0, 1, 1,  1, 0,
        -1, -1, 1, 1,  0, 0, 1, 1,  1, 0,
        1, -1, 1, 1,   1, 0, 1, 1,  0, 0,
        1, 1, 1, 1,    1, 1, 1, 1,  0, 1,
      
        1, -1, -1, 1,  1, 0, 0, 1,  0, 1,
        -1, -1, -1, 1, 0, 0, 0, 1,  1, 1,
        -1, 1, -1, 1,  0, 1, 0, 1,  1, 0,
        1, 1, -1, 1,   1, 1, 0, 1,  0, 0,
        1, -1, -1, 1,  1, 0, 0, 1,  0, 1,
        -1, 1, -1, 1,  0, 1, 0, 1,  1, 0,
      ]),
    depth: true
})

export const innerCircle = ({
    radius = 1,
    numSubdivisions = 24,
    innerRadius = 0.0,
    startAngle = 0,
    endAngle = Math.PI * 2,
    } = {}) => {
    // 2 triangles per subdivision, 3 verts per tri, 2 values (xy) each.
    const numVertices = numSubdivisions * 3 * 2;
    const vertexData = new Float32Array(numSubdivisions * 3 * 2 * 2);
    
    let offset = 0;
    const addVertex = (x:any, y:any) => {
        vertexData[offset++] = x;
        vertexData[offset++] = y;
    };
    
    // 2 triangles per subdivision
    //
    // 0--1 4
    // | / /|
    // |/ / |
    // 2 3--5
    for (let i = 0; i < numSubdivisions; ++i) {
        const angle1 = startAngle + (i + 0) * (endAngle - startAngle) / numSubdivisions;
        const angle2 = startAngle + (i + 1) * (endAngle - startAngle) / numSubdivisions;
    
        const c1 = Math.cos(angle1);
        const s1 = Math.sin(angle1);
        const c2 = Math.cos(angle2);
        const s2 = Math.sin(angle2);
    
        // first triangle
        addVertex(c1 * radius, s1 * radius);
        addVertex(c2 * radius, s2 * radius);
        addVertex(c1 * innerRadius, s1 * innerRadius);
    
        // second triangle
        addVertex(c1 * innerRadius, s1 * innerRadius);
        addVertex(c2 * radius, s2 * radius);
        addVertex(c2 * innerRadius, s2 * innerRadius);
    }
    
    return {
        data: vertexData,
        vertices: numVertices,
    };
}

export const square = (x: number) => [-x, -x, x, -x, x, x, -x, -x, x, x, -x, x]

export const quad = (x: number) => {
    return {
        vertices: 6,
        data: new Float32Array([-x, -x, x, -x, x, x, -x, -x, x, x, -x, x])
    }
}

export const triangle = (x: number) => ({ vertices: 3, data: new Float32Array([-x, -x, x, -x, 0, x,]) })

export const circle = (x: number, n: number): number[] =>
    Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        const a2 = ((i + 1) / n) * Math.PI * 2;
        return [Math.cos(a) * x, Math.sin(a) * x, Math.cos(a2) * x, Math.sin(a2) * x];
    }).flat();

    /*
export const cube = (x: number) =>
    [
        -x, -x, -x, x, -x, -x, x, x, -x, -x, x, -x, // -z face
        -x, -x, x, x, -x, x, x, x, x, -x, x, x, // z face
        -x, -x, -x, -x, x, -x, -x, x, x, -x, -x, x, // -x face
        x, -x, -x, x, x, -x, x, x, x, x, -x, x, // x face
        -x, -x, -x, -x, -x, x, x, -x, x, x, -x, -x, // -y face
        -x, x, -x, -x, x, x, x, x, x, x, x, -x, // y face
    ];
*/

export const cornell = () => {
    const vertices = [
        // floor, ceiling, back wall
        [-0.274799, -0.273000, 0.279600],
        [0.278000, -0.273000, 0.279600],
        [0.278000, -0.273000, -0.279600],
        [-0.271599, -0.273000, -0.279600],
        [-0.277999, 0.275800, 0.279600],
        [-0.277999, 0.275800, -0.279600],
        [0.278000, 0.275800, -0.279600],
        [0.278000, 0.275800, 0.279600],
        // tall block
        [0.013239, -0.272900, -0.017047],
        [0.013239, 0.057100, -0.017047],
        [-0.144353, -0.272900, 0.031839],
        [-0.144353, 0.057100, 0.031839],
        [-0.035647, -0.272900, -0.174639],
        [-0.035647, 0.057100, -0.174639],
        [-0.193239, -0.272900, -0.125753],
        [-0.193239, 0.057100, -0.125753],
        // short block
        [0.195646, -0.272900, 0.055136],
        [0.195646, -0.107900, 0.055136],
        [0.148464, -0.272900, 0.213246],
        [0.148464, -0.107900, 0.213246],
        [0.037536, -0.272900, 0.007954],
        [0.037536, -0.107900, 0.007954],
        [-0.009646, -0.272900, 0.166064],
        [-0.009646, -0.107900, 0.166064],
        // light
        [-0.065000, 0.275700, 0.052600],
        [0.065000, 0.275700, 0.052600],
        [-0.065000, 0.275700, -0.052400],
        [0.065000, 0.275700, -0.052400],
        // left wall
        [-0.274799, -0.273000, 0.279600],
        [-0.271599, -0.273000, -0.279600],
        [-0.277999, 0.275800, 0.279600],
        [-0.277999, 0.275800, -0.279600],
        // right wall
        [0.278000, -0.273000, 0.279600],
        [0.278000, -0.273000, -0.279600],
        [0.278000, 0.275800, -0.279600],
        [0.278000, 0.275800, 0.279600],
    ]



    const indices = [
        // floor, ceiling, back wall
        [0, 1, 2],
        [0, 2, 3],
        [4, 5, 6],
        [4, 6, 7],
        [6, 3, 2],
        [6, 5, 3],
        // tall block
        [9, 10, 8],
        [11, 14, 10],
        [15, 12, 14],
        [13, 8, 12],
        [14, 8, 10],
        [11, 13, 15],
        [9, 11, 10],
        [11, 15, 14],
        [15, 13, 12],
        [13, 9, 8],
        [14, 12, 8],
        [11, 9, 13],
        // short block
        [17, 18, 16],
        [19, 22, 18],
        [23, 20, 22],
        [21, 16, 20],
        [22, 16, 18],
        [19, 21, 23],
        [17, 19, 18],
        [19, 23, 22],
        [23, 21, 20],
        [21, 17, 16],
        [22, 20, 16],
        [19, 17, 21],
        // light
        [26, 25, 24],
        [26, 27, 25],
        // left wall
        [31, 28, 29],
        [31, 30, 28],
        // right wall
        [35, 33, 32],
        [35, 34, 33]
    ]

    const meshes = [
        { vi: 0, fi: 0, nv: 8, nf: 6 }, // floor, ceiling, back wall
        { vi: 8, fi: 6, nv: 8, nf: 12 }, // tall block
        { vi: 16, fi: 18, nv: 8, nf: 12 }, // short block
        { vi: 24, fi: 30, nv: 4, nf: 2 }, // light
        { vi: 28, fi: 32, nv: 4, nf: 2 }, // left wall
        { vi: 32, fi: 34, nv: 4, nf: 2 } // right wall
    ]

    const materials = [
        { color: [0.73, 0.73, 0.73, 1.0], emission: [0.0, 0.0, 0.0, 0.0], metallic: 0, roughness: 0 }, // floor, ceiling, back wall
        { color: [0.73, 0.73, 0.73, 1.0], emission: [0.0, 0.0, 0.0, 0.0], metallic: 1, roughness: 0 }, // tall block
        { color: [0.73, 0.73, 0.73, 1.0], emission: [0.0, 0.0, 0.0, 0.0], metallic: 0, roughness: 0 }, // short block
        { color: [0.73, 0.73, 0.73, 1.0], emission: [15.0, 15.0, 15.0, 1.0], metallic: 0, roughness: 0 }, // light
        { color: [0.65, 0.05, 0.05, 1.0], emission: [0.0, 0.0, 0.0, 0.0], metallic: 0, roughness: 0 }, // left wall
        { color: [0.12, 0.45, 0.15, 1.0], emission: [0.0, 0.0, 0.0, 0.0], metallic: 0, roughness: 0 } // right wall
    ]

    return { vertices, indices, meshes, materials }
}
export const scaleAspect = (w: number, h: number, scale: number) => {
    const cellSize = Math.min(w, h) / scale;
    return { x: Math.floor(w / cellSize + .5), y: Math.floor(h / cellSize + .5) };
}

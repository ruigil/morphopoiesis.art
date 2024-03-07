import { PSpec, Definitions } from "../../../lib/poiesis/index.ts";

export const pathtracer = async (code:string, defs:Definitions) => {

    const size = {x : 1024, y: 1024 } 
    const empty = new ImageData(size.x, size.y);
    const emptyBitmap = await createImageBitmap(empty);

    const cornell = () => {
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
            [0.278000, 0.275800, 0.279600],
            [0.278000, 0.275800, -0.279600]
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
            { color: [0.73, 0.73, 0.73, 1.0], emission:[0.0, 0.0, 0.0, 0.0], metallic: 0, roughness: 0 }, // floor, ceiling, back wall
            { color: [0.73, 0.73, 0.73, 1.0], emission:[0.0, 0.0, 0.0, 0.0], metallic: 1, roughness: 0 }, // tall block
            { color: [0.73, 0.73, 0.73, 1.0], emission:[0.0, 0.0, 0.0, 0.0], metallic: 0, roughness: 0 }, // short block
            { color: [0.73, 0.73, 0.73, 1.0], emission:[15.0, 15.0, 15.0, 1.0], metallic: 0, roughness: 0 }, // light
            { color: [0.65, 0.05, 0.05, 1.0], emission:[0.0, 0.0, 0.0, 0.0], metallic: 0, roughness: 0 }, // left wall
            { color: [0.12, 0.45, 0.15, 1.0], emission:[0.0, 0.0, 0.0, 0.0], metallic: 0, roughness: 0 } // right wall
        ]



        return { vertices, indices, meshes, materials }
    }

    const c = cornell();

    const spec =  (w:number, h: number):PSpec => {

        return {
            code: code,
            defs: defs,
            uniforms: (f:number) => ({ seed: 100 + (f*.01), weight: 1/f, cam_elevation: 0, cam_azimuth:0 }),
            storages: [
                { name: "debug", size: 1, read: true },
                { name: "vertex", size: 36, data: c.vertices },
                { name: "index", size: 36, data: c.indices },
                { name: "meshes", size: 6, data: c.meshes },
                { name: "materials", size: 6, data: c.materials }
            ],
            textures: [
                { name: "inputTex", data: emptyBitmap },
                { name: "outputTex", data: emptyBitmap, storage: true }
            ],
            computes: [
                { name: "compute_main", workgroups: [ Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] }
            ],
            computeGroupCount: 1,
            bindings: [ [0,1,2,3,4,5,6,7,8,9], [1,0,3,2,4,5,6,7,8,9] ]
        }
    }

    return spec;
}
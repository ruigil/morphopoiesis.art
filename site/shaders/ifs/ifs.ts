import { PSpec, Definitions, square, scaleAspect } from "../../lib/poiesis/index.ts";

export const ifs = async (code: string, defs: Definitions) => {

    const spec = (w: number, h: number): PSpec => {
        const size = scaleAspect(w, h, 1024);
        
        // Initialize with zeros
        const current = Array.from({ length: size.x * size.y }, () => 0);

        // Default color for the Sierpinski triangle (bright green-blue)
        const defaultColor = [0.4, 0.7, 0.1];


        const fern = {
            count: 4,
            domain: [-2.0, 4.0, 12.0, .0],
            color: [0.4, 0.7, 0.1],
            transforms: [ 
                { 
                    color: [0.1, 0.4, 0.7], 
                    scale: [0.0, 0.16], 
                    translation: [0, 0], 
                    rotation: 0.,
                    probability: 0.01
                }, 
                { 
                    color: [0.1, 0.4, 0.7], 
                    scale: [0.34, 0.34],
                    translation: [0, 1.6], 
                    rotation: -50,
                    probability: 0.07
                }, 
                { 
                    color: [0.1, 0.4, 0.7], 
                    scale: [-0.30, 0.36], 
                    translation: [0, .8], 
                    rotation: 50.,
                    probability: 0.07, 
                }, 
                { 
                    color: [0.1, 0.4, 0.7],
                    scale: [0.85, 0.85], 
                    translation: [0, 1.6], 
                    rotation: 3.,
                    probability: 0.85, 
                }, 
            ],
            mouse: (x:number,y:number) => {
                fern.transforms[3].rotation = 1. + 2 * (x); 
                fern.transforms[1].rotation = -40. - 10. * y;
                fern.transforms[2].rotation = 40. + 10. * y;
            }
        }

        const spiral = {
            count: 3,
            domain: [-6.0, 7.0, -2.0, 10.0],
            color: [0.1, 0.4, 0.7],
            transforms:[
                {
                    color: [0.1, 0.4, 0.7],
                    scale: [0.9, 0.9],
                    translation: [1.80, 1.0],
                    rotation: -30,
                    probability: 0.9
                },
                {
                    color: [0.1, 0.4, 0.7],
                    scale: [0.3, 0.3],
                    translation: [-4.5, 1.5],
                    rotation: 125.,
                    probability: 0.05
                },
                {
                    color: [0.1, 0.4, 0.7],
                    scale: [0.3, 0.3],
                    translation: [4.5, 1.5],
                    rotation: 27.,
                    probability: 0.05,
                }
            ],
            mouse: (x:number,y:number) => {
                spiral.transforms[0].rotation = -30. * (x+.5); 
                spiral.transforms[1].rotation = 120. + 30. * y;
                spiral.transforms[2].rotation = -30. + 30. * y;
            }
        }

        const leaf = {
            count: 4,
            domain: [-4.0, 4.0, 4.0, -4.0],
            color: [0.7, 0.4, 0.1],
            transforms:[
                {
                    color: [0.1, 0.4, 0.7],
                    scale: [0.2, 0.5],
                    translation: [-0.0, -1.5],
                    rotation: 0,
                    probability: 0.25
                },
                {
                    color: [0.1, 0.4, 0.7],
                    scale: [0.7, 0.7],
                    translation: [1.5, -0.7],
                    rotation: 50,
                    probability: 0.25
                },
                {
                    color: [0.1, 0.4, 0.7],
                    scale: [0.7, 0.7],
                    translation: [-1.5, -0.7],
                    rotation: -50,
                    probability: 0.25,
                },
                {
                    color: [0.1, 0.4, 0.7],
                    scale: [0.5, 0.5],
                    translation: [0.0, 1.5],
                    rotation: 0,
                    probability: 0.25,
                }
            ],
            mouse: (x:number,y:number) => {
                leaf.transforms[3].rotation =  10 * (x-.5);
                leaf.transforms[1].rotation = 40 + 10 * y;
                leaf.transforms[2].rotation = -40 - 10 * y;
            }
        }

        const nebula = {
            count: 5,
            domain: [.0, 1.0, .0, 1.],
            color: [0.4, 0.1, 0.7],
            transforms:[
                {
                    color: [0.1, 0.4, 0.7],
                    scale: [0.676, 0.540],
                    translation: [0.44, 0.24],
                    rotation: -66.5,
                    probability: 0.2
                },
                {
                    color: [0.1, 0.4, 0.7],
                    scale: [0.66, 0.721],
                    translation: [0.25, 0.57],
                    rotation: 74.3,
                    probability: 0.2
                },
                {
                    color: [0.1, 0.4, 0.7],
                    scale: [0.544, -0.588],
                    translation: [0.85, 0.25],
                    rotation: -180,
                    probability: 0.2
                },
                {
                    color: [0.1, 0.4, 0.7],
                    scale: [0.118, 0.118],
                    translation: [0.26, 0.43],
                    rotation: 43,
                    probability: 0.2
                },
                {
                    color: [0.1, 0.4, 0.7],
                    scale: [-0.56, -0.35],
                    translation: [0.76, 0.22],
                    rotation: 58.7,
                    probability: 0.2
                }
            ],
            mouse: (x:number,y:number) => {
                nebula.transforms[3].rotation =  180 * (x);
            }
        }

        const dragon = {
            count: 2,
            domain: [-9.0, 11.0, 15.0, -5.0],
            color: [0.4, 0.1, 0.7],
            transforms:[
                {
                    color: [0.1, 0.4, 0.7],
                    scale: [0.9, 0.9],
                    translation: [-1.9, -0.10],
                    rotation: 20,
                    probability: 0.8
                },
                {
                    color: [0.1, 0.4, 0.7],
                    scale: [0.5, 0.5],
                    translation: [1., 10.],
                    rotation: 80,
                    probability: 0.2
                },
            ],
            mouse: (x:number,y:number) => {
                dragon.transforms[0].rotation =  10 + 20 * (x);
                dragon.transforms[1].rotation = 50 + 50 * (y);
            }
        }

        const unis = {
            uni: {
                size: [size.x, size.y],
                ifs: fern,
                color: defaultColor // Default color
            }
        }

        return {
            code: code,
            defs: defs,
            geometry: {
                vertex: {
                    data: square(1.),
                    attributes: ["pos"],
                    instances: size.x * size.y  // One instance per pixel
                }
            },
            uniforms: (frame) => {
                //unis.uni.ifs.transforms[0].scale[0] = 0.0 + frame / 1000
                console.log();
                return unis;
            },
            mouse: (x,y) => {
                unis.uni.ifs.mouse(x,y);
            },
            storages: [
                { name: "current", size: current.length, data: current },
                { name: "next", size: current.length },
                { name: "debug" , size: 1, read: true }
            ],
            computes: [
                { name: "computeClear", workgroups: [Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
                { name: "computeChaos", workgroups: [4096, 1, 1] } // each workgroup has 64 threads so this gives 4096 * 64 = 262144 calls
            ],
            bindings: [ [0, 4, 1, 2, 3], [0, 4, 2, 1, 3] ], // Ping-pong between buffers
            unipane: { 
                config: (unipane:any, params: any) => {

                    let panes:any[] = [];

                    const addTransformPanes = (i:number) => {
                        params['scale' + i] = { x: unis.uni.ifs.transforms[i].scale[0], y: unis.uni.ifs.transforms[i].scale[1] };
                        const s = unipane.addBinding(params, 'scale' + i, { readonly: false, x: { min: -1, max: 1 }, y: { min: -1, max: 1 } })
                        s.on('change', (ev:any) => {
                            unis.uni.ifs.transforms[i].scale = [ev.value.x, ev.value.y];
                        });
                        panes.push(s);
    
                        params['translation' + i] = { x: unis.uni.ifs.transforms[i].translation[0], y: unis.uni.ifs.transforms[i].translation[1] };
                        const t = unipane.addBinding(params, 'translation' + i, { readonly: false, x: { min: -1, max: 1 }, y: { min: -1, max: 1 } })
                        t.on('change', (ev:any) => {
                            unis.uni.ifs.transforms[i].translation = [ev.value.x, ev.value.y];
                        });
                        panes.push(t);

                        params['rotation' + i] = unis.uni.ifs.transforms[i].rotation;
                        const r = unipane.addBinding(params, 'rotation' + i, { readonly: false,  min: -180, max: 180  })
                        r.on('change', (ev:any) => {
                            unis.uni.ifs.transforms[i].rotation = ev.value;
                        });
                        panes.push(r);
                    }

                    const modifyPanes = () => {
                        if (panes.length > 0) {
                            for (let i = 0; i < panes.length; i++) {
                                panes[i].dispose();
                            }
                            panes = [];
                        }
                        params.color = {r: unis.uni.ifs.color[0], g: unis.uni.ifs.color[1], b: unis.uni.ifs.color[2] };
                        const c = unipane.addBinding(params, 'color', { color: {type: 'float'} })
                        c.on('change', (ev:any) => {
                            unis.uni.ifs.color = [ev.value.r, ev.value.g, ev.value.b];
                        });
                        panes.push(c);
                        for (let i = 0; i < unis.uni.ifs.transforms.length; i++) addTransformPanes(i);
                    }

                    unipane.addBlade({
                        view: 'list',
                        label: 'IFS',
                        options: [
                          {text: 'Fern', value: 'FERN'},
                          {text: 'Dragon', value: 'DRAGON'},
                          {text: 'Spiral', value: 'SPIRAL'},
                          {text: 'Leaf', value: 'LEAF'},
                          {text: 'Nebula', value: 'NEBULA'},
                        ],
                        value: 'FERN',
                    }).on('change', (ev:any) => {
                        switch (ev.value) {
                            case 'FERN':
                                unis.uni.ifs = fern;
                                break;
                            case 'DRAGON':
                                unis.uni.ifs = dragon;
                                break;
                            case 'SPIRAL':
                                unis.uni.ifs = spiral;
                                break;
                            case 'LEAF':
                                unis.uni.ifs = leaf;
                                break;
                            case 'NEBULA':
                                unis.uni.ifs = nebula;
                                break;
                            default:
                                unis.uni.ifs = fern;
                        }
                        console.log(ev);
                        modifyPanes();
                    });

                    modifyPanes();
                }, 
            }
        }
    }

    return spec;
}

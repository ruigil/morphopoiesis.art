
import { PSpec, Definitions, cube } from "../../lib/poiesis/index.ts";
import { mat4n } from "npm:wgpu-matrix";


export const tree = async (code: string, defs: Definitions, fx: any) => {
  
  type VEC3 = [number, number, number]
  type TRS = [VEC3, VEC3, VEC3] // Translation, Rotation, Scale
  const T = (x: number, y: number, z: number): VEC3 => [x, y, z]
  const R = (x: number, y: number, z: number): VEC3 => [x, y, z]
  const S = (x: number, y: number, z: number): VEC3 => [x, y, z]

  type Node = {
    updateWorld: (world: number[]) => void
    instances: () => number
    transformations: () => number[][]
  }

  const radians = (degrees: number) => (degrees * Math.PI / 180.);

  const transform = (trs: TRS) => {
    // this is equivalent to T * R * S * v
    // const tr = mat4n.translation(trs[0])
    // const sc = mat4n.scaling(trs[2])
    // const rx =  mat4n.rotationX(trs[1][0])
    // const ry =  mat4n.rotationY(trs[1][1])
    // const rz =  mat4n.rotationZ(trs[1][2])
    // const rt = mat4n.multiply(rz,mat4n.multiply(ry,rx))
    // return mat4n.multiply(tr,mat4n.multiply(rt,sc))

    // this is equivalent to T * R * S 
    const m = mat4n.identity();
    mat4n.translate(m, trs[0], m)
    mat4n.rotateY(m, trs[1][1], m) // we switch the order with x to be able to create tree branches on the y axis
    mat4n.rotateX(m, trs[1][0], m)
    mat4n.rotateZ(m, trs[1][2], m)
    mat4n.scale(m, trs[2], m)
    return m;
  }

  const node = (objectTRS: TRS, localTRS: TRS, ...nodes: Node[]): Node => {
    // if we want to scale the object non-uniformly, we can't mix the object transformation 
    // with the local coordinate transformation or else the non-uniform scaling will pass to its children!
    // So wee need to separate the local coordinate transformation from the object transformation 
    // and only pass the local coordinate transformation to its children wth an uniform scaling
    const object = transform(objectTRS);
    const local = transform(localTRS);
    let world: number[]
    const childs = nodes;

    const updateWorld = (parentWorld: number[] = mat4n.identity()) => {
      world = mat4n.multiply(parentWorld, local);
      childs.forEach(c => c.updateWorld(world))
    }

    // the object transform in his world coordinate
    const objectWorld = () => { return mat4n.multiply(world, object) }
    // the number of objects in the tree
    const instances = () => 1 + childs.reduce((acc, v) => acc + v.instances(), 0)
    // a list of all their final transformations
    const transformations = () => [objectWorld(), ...childs.flatMap(c => c.transformations())]

    return { updateWorld, instances, transformations }
  }

  const translation: VEC3 = [0, 0, 0]
  const rotation: VEC3 = [0, 0, 0]
  const scale: VEC3 = [1, 1, 1]

  const makeTree = () => {

    const level = (l: number): Node[] => {
      const ot: TRS = [T(0, 2, 0), R(radians(0), radians(0), 0), S(.2 + l * .1, 2, .2 + l * .1)];
      const ct1: TRS = [T(0, 4, 0), R(radians(30), radians(0), 0), S(.9, .9, .9)];
      const ct2: TRS = [T(0, 4, 0), R(radians(40), radians(120), 0), S(.9, .9, .9)];
      const ct3: TRS = [T(0, 4, 0), R(radians(35), radians(240), 0), S(.9, .9, .9)];

      if (l == 0) return [node(ot, ct1), node(ot, ct2), node(ot, ct3)]
      else return [
        node(ot, ct1, ...level(l - 1)),
        node(ot, ct2, ...level(l - 1)),
        node(ot, ct3, ...level(l - 1))
      ]
    }

    const root = node(
      [T(0, 2, 0), R(0, 0, 0), S(.5, 2, .5)],// object
      [T(0, -4, 0), R(0, 0, 0), S(1, 1, 1)], // world
      ...level(2)
    )

    const nInstances = root.instances();

    const instances = () => {
      root.updateWorld( transform([translation, rotation, scale]) )
      return root.transformations().map(t => ({ matrix: t }))
    }

    return { instances, nInstances }
  }

  const camera = (fov: number, aspect: number, near: number, far: number) => {
    const m = mat4n.identity();
    const projection = mat4n.perspective(fov, aspect, near, far)
    const viewMatrix = mat4n.lookAt([20, 0, -20], [0, 0, 0], [0, 1, 0])

    const orbitCamera = (x: number, y: number) => {
      mat4n.multiply(projection, viewMatrix, m);
      mat4n.rotateX(m, (y - .5) * Math.PI, m);
      mat4n.rotateY(m, (x - .5) * Math.PI, m);
      return m
    }

    return { orbitCamera }
  }

  const tree = makeTree();

  return (width: number, height: number): PSpec => {

    const cam = camera(radians(70), width / height, 1, 1000)
    const view = cam.orbitCamera(0.5, 0.5)

    return {
      code: code,
      defs: defs,
      geometry: { ...cube(), instances: tree.nInstances },
      uniforms: () => ({
        unis: {
          color: [1., 1.0, .0, 1.],
          view: view,
          instances: tree.instances(),
        }
      }),
      mouse: (x, y) => cam.orbitCamera(x, y),
      clearColor: { r: 0, g: 0, b: 0, a: 0 },
      unipane: {
        config: (pane, params) => {
          params['translation'] = { x: translation[0], y: translation[1] };
          const t = pane.addBinding(params, 'translation', { readonly: false, x: { min: -10, max: 10 }, y: { min: -10, max: 10 } })
          t.on('change', (ev: any) => {
            translation[0] = ev.value.x;
            translation[1] = ev.value.y;
            translation[2] = 0;
          });
          params['rotationX'] = rotation[0];
          const rx = pane.addBinding(params, 'rotationX', { readonly: false, min: -3.14, max: 3.14 })
          rx.on('change', (ev: any) => {
            rotation[0] = ev.value;
          });
          params['rotationY'] = rotation[1];
          const ry = pane.addBinding(params, 'rotationY', { readonly: false, min: -3.14, max: 3.14 })
          ry.on('change', (ev: any) => {
            rotation[1] = ev.value;
          });
          params['rotationZ'] = rotation[2];
          const rz = pane.addBinding(params, 'rotationZ', { readonly: false, min: -3.14, max: 3.14 })
          rz.on('change', (ev: any) => {
            rotation[2] = ev.value;
          });

          params['scale'] = { x: scale[0], y: scale[1], z: scale[2] };
          const s = pane.addBinding(params, 'scale', { readonly: false, x: { min: -10, max: 10 }, y: { min: -10, max: 10 } })
          s.on('change', (ev: any) => {
            scale[0] = ev.value.x;
            scale[1] = ev.value.y;
            scale[2] = ev.value.z;
          });
        }
      }
    };
  };
}

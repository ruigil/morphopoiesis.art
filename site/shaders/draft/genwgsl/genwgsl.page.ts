import { shaderGenerator, Shader } from "../../../lib/generators.ts";

const spec = (s:Shader)  => {

    //const rootPath = s.path.split("/").filter( (e,i) => i != 0 ).map( _ => "..").join("/");
    const script = /* ts */`

      const ${s.id} = async (code: string,defs: Definitions, fx:any ) => {

        const size = {x : 512, y: 512 }
        const empty = new ImageData(size.x, size.y);
        const emptyBitmap = await createImageBitmap(empty);
    
        const radians = (degrees:number):number => degrees * Math.PI / 180;
    
        const uniforms = { params: { samples: 1, depth:4, fov: radians(60), lookFrom: [0,1.5,4], lookAt: [0,1.5,1], aperture: 0.0 } }
        
        return (): PSpec => ({ 
            code: code, 
            defs: defs,
            uniforms: (f:number) => uniforms,
            mouse: (x:number,y:number, frame:number) => {  uniforms.params.lookAt = [(x*10)-5.,1.5 + (y*5.) - 2.5,0];  },
            storages: [
                { name: "debug", size: 1, read: true },
                { name: "samples", size: size.x * size.y },
            ],
            textures: [
                { name: "image", data: emptyBitmap },
                { name: "buffer", data: emptyBitmap, storage: true }
            ],
            computes: [
                { name: "pathTracer", workgroups: [ Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
                { name: "denoise", workgroups: [ Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] }
            ],
            computeGroupCount: 1,
            bindings: [ [0,1,2,3,4,5,6], [0,1,3,2,4,5,6] ]
        });
      }
    `;

    return script;
}



const lib:Record<string,string> = {

  box: `
  fn box(p : vec3<f32>, size : vec3<f32>) -> f32 {
    let d = abs(p) - size * .5;
    return min( max(d.x, max(d.y,d.z)), 0. ) + length(max(d , vec3(0.) ));
  }
  `,

  rot3d: `
  fn rot3d(angle: f32, axis: vec3<f32>) -> mat3x3<f32> {
    let c = cos(angle);
    let s = sin(angle);
    let t = 1.0 - c;
    let x = axis.x;
    let y = axis.y;
    let z = axis.z;

    return mat3x3<f32>(
        vec3<f32>(t*x*x + c,   t*x*y - s*z, t*x*z + s*y),
        vec3<f32>(t*x*y + s*z, t*y*y + c,   t*y*z - s*x),
        vec3<f32>(t*x*z - s*y, t*y*z + s*x, t*z*z + c)
    );
  }
  `,

  cone: `
  fn cone( p: vec3<f32>, base: f32, h: f32 ) -> f32 {
    let q = h * vec2(base/h,-1.0);      
    let w = vec2( length(p.xz), p.y - (h*.5) );
    let a = w - q * clamp( dot(w,q)/dot(q,q), 0.0, 1.0 );
    let b = w - q * vec2( clamp( w.x/q.x, 0.0, 1.0 ), 1.0 );
    let k = sign( q.y );
    let d = min(dot( a, a ),dot(b, b));
    let s = max( k * (w.x * q.y - w.y * q.x), k * (w.y - q.y)  );
    return sqrt(d)*sign(s);
  }
  `,

  sphere: `    
  fn sphere(p : vec3<f32>, radius: f32) -> f32 {
    return length(p) - radius; 
  }
  `,

  plane: `
  fn plane( p: vec3f, n: vec4f ) -> f32 {
    // n must be normalized
    return dot(p,n.xyz) + n.w;
  } 
  `,

  checkerboard: `
  fn checkerboard(p: vec2<f32>, c1: vec3<f32>, c2: vec3<f32>) -> vec3<f32> {    
    let f = abs(floor(p));
    return mix( c1, c2, (( f.x + f.y ) % 2.));
  }
  `

}

const object = (s:any, pri: any):Node => {

  const node = {
    label: s.label,
    code: `fn ${s.label}( p: vec3<f32> ) -> f32 { return  ${ pri.code }; }`,
    material: s.material,
    deps: pri.deps
  }
 
  return node;
}

const f = (sf:number | undefined) => sf ? sf.toString().indexOf(".") > -1 ? sf : sf + ".0" : '0.0';
const vec3f = (v: number[]) => `vec3(${ v.map( (e:number) => f(e)  ) })`;
const vec4f = (v: number[]) => `vec4(${ v.map( (e:number) => f(e)  ) })`;

const box = (o:any) => {
 
  const pos = (pos:number[]) => pos ? `- ${ vec3f(pos) }` : '';

  const scale = (s:number) => s ?  `* ${ f(s) }`  : ``;

  const rot = (r:number[]) => r ? `* rot3d( ${f(r[0]) }, ${ vec3f( r.filter( (e:number,i:number) => i != 0 ) ) }) ` : ``;

  const node = {
    deps: ["box"],
    code: `box( (p ${ scale(o.scale) }) ${ pos(o.pos) } ${ rot(o.rot) },  ${ vec3f(o.size) }  )`
  }
  if (o.rot) node.deps.push('rot3d');

  return node; 
}
const sphere = (o:any) => {
  const pos = (pos:number[]) => pos ? `- ${ vec3f(pos) }` : '';

  const scale = (s:number) => s ?  `* ${ f(s) }`  : ``;

  const rot = (r:number[]) => r ? `* rot3d( ${f(r[0]) }, ${ vec3f( r.filter( (e:number,i:number) => i != 0 ) ) }) ` : ``;

  const node = {
    deps: ["sphere"],
    code: `sphere( (p ${ scale(o.scale) }) ${ pos(o.pos) } ${ rot(o.rot) },  ${ f(o.radius) }  )`
  }
  if (o.rot) node.deps.push('rot3d');
  return node; 
}

const checkerboard = (o:any) => {
  const node = {
    deps: ["checkerboard"],
    code: `checkerboard(pos.xz, ${ vec3f(o.c1) }, ${ vec3f(o.c2) } )`
  }

  return node;
}


const plane = (o:any) => {

  const node = {
    deps: ["plane"],
    code: `plane( p, ${ vec4f(o.pos) }  );`
  }
  return node;
}

type Node = {
  label: string,
  material: { color: number[], texture?: Node,emissive?: boolean, metalness?: boolean, dielectric?: boolean, diffuse?: boolean, roughness?: number, highlight?: boolean},
  deps: string[],
  code: string
}

const pathtracer = (...n:Node[]) =>{

  const render = (deps: string, materials: string, scene: string) => { 
    
    return`
  
  @group(0) @binding(0) var<uniform> sys: Sys;
  @group(0) @binding(1) var samp: sampler;
  @group(0) @binding(2) var image: texture_2d<f32>;
  @group(0) @binding(3) var buffer: texture_storage_2d<rgba8unorm, write>;
  @group(0) @binding(4) var<storage, read_write> debug : Debug;
  @group(0) @binding(5) var<uniform> params: Params;
  @group(0) @binding(6) var<storage, read_write> samples: array<Sample>;
  
  const PI = 3.1415926535897932384626433832795;
  const EPSILON = 0.001;
  const MAXDIST = 10000.;
  
  // types
  struct Sys {
      time: f32,
      frame: u32,
      mouse: vec4<f32>,
      resolution: vec2<f32>,
      aspect: vec2<f32>
  }
  
  struct Ray {
      origin: vec3<f32>,
      direction: vec3<f32>,
  }
  
  struct Hit {
      position: vec3<f32>,
      distance: f32,
      normal: vec3<f32>,
      material: Material,
      sign: f32
  }
  
  struct Material {
      color: vec3<f32>,
      emissive: bool,
      metalness: bool,
      dielectric: bool,
      diffuse: bool,
      roughness: f32,
      highlight: bool,
      scattered: Ray
  }
  struct Sample {
      color: vec3<f32>,
      normal: vec3<f32>,
  }
  
  struct Light {
      point: vec3<f32>,
      intensity: f32
  }
  
  struct Params {
      samples: u32,
      depth: u32,
      fov: f32,
      aperture: f32,
      lookFrom: vec3<f32>,
      lookAt: vec3<f32>,
  }
  
  
  struct Debug {
      color: vec4<f32>,
      emissive: f32,
      metalness: f32,
      dieletric: f32,
      reflectance: f32,
  }
  
  struct VertexOutput {
    @builtin(position) pos : vec4<f32>,
    @location(0) fragUV : vec2<f32>,
  }
  
  @vertex
  fn vertexMain(@location(0) pos: vec2<f32>) -> VertexOutput  {
      var output: VertexOutput;
      output.pos = vec4<f32>(pos, 0.0, 1.0);
      output.fragUV = (vec2<f32>(pos.x,- pos.y) + 1.) * .5;
      return output;
  }
  
  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    return vec4<f32>(linearToSRGB(toneMap(textureSample(image, samp, input.fragUV).rgb)),1.);
  }
  
  
  @compute @workgroup_size(8, 8)
  fn pathTracer(@builtin(global_invocation_id) cell : vec3<u32>) {
      let dims = vec2<f32>(textureDimensions(image, 0));
      let c = textureLoad(image, vec2<u32>(sys.mouse.xy * dims), 0);
      let uv = ((vec2<f32>(cell.xy) / dims ) * 2. - 1.) * sys.aspect ;
    
      let ns = u32(floor(sys.mouse.x * 4));
  
      gseed = vec3u(cell.xy, sys.frame);
  
      let ray = setCamera( uv  , params.lookFrom, params.lookAt, vec2f(params.fov) );
  
      var color = vec3<f32>(0.);
      var normal = vec3<f32>(0.);
  
      let nSamples = params.samples;
      let pixelSize = vec3((2. / dims) * sys.aspect,0.);
  
      for (var s=0u; s < nSamples; s++) {
        let delta = (random() - .5) * pixelSize;
        let sample = raySample( Ray(ray.origin + delta ,ray.direction), params.depth);
        color += sample.color;
        if (s == 0) { normal = sample.normal; };
      }
      
      samples[cell.x + cell.y * u32(dims.x)] = Sample(color/f32(nSamples), normal);
  }
  
  
  const ATrousKernel = array<f32, 25>(
      1./256., 4./256., 6./256., 4./256., 1./256.,
      4./256., 16./256., 24./256., 16./256., 4./256.,
      6./256., 24./256., 36./256., 24./256., 6./256.,
      4./256., 16./256., 24./256., 16./256., 4./256.,
      1./256., 4./256., 6./256., 4./256., 1./256.
  );
  
  @compute @workgroup_size(8, 8)
  fn denoise(@builtin(global_invocation_id) cell : vec3<u32>) {
      let dims = vec2<u32>(textureDimensions(image, 0));
      
      let kernel = ATrousKernel;
      var colorSum = vec3(0.);
      var weightSum = 0.;
      var sigmaVar = vec2(0.);
      
      var lastColor = textureLoad(image, cell.xy, 0);
  
      let currentSample = samples[cell.x + cell.y * u32(dims.x)];
      
  
      for(var i = 0u; i < 25u; i++) {
          let offset =  ((vec2u( (i / 5u) - 2u , (i % 5u) - 2u ) + cell.xy) + dims) % dims;
          let sample = samples[offset.x + offset.y * dims.x];
  
          let sc = currentSample.color - sample.color;
          let cweight = min(1., exp(-( dot(sc,sc)/4. ) ));
  
          let lum = luminance(sample.color);
          sigmaVar += vec2(lum, lum * lum);
  
          let sn = currentSample.normal - sample.normal;
          let nweight = min(1., exp(-dot(sn,sn)/1. ));
  
          let weight = kernel[i] * cweight * nweight;
          colorSum += weight * sample.color;
          weightSum += weight;
      }
  
      sigmaVar /= 25.; 
      let cv = sigmaVar.y - sigmaVar.x * sigmaVar.x;
  
      let currentColor = colorSum / weightSum;
  
      // if this is the first frame, we dont have a last color
      if (sys.frame == 0u) { lastColor = vec4(currentColor,1.); }
  
  
      // using frame differences to calculate motion doesnt help to diferentiate between motion and noise.
      // but it's better than nothing.. :)
      let motion = mix(vec3(1.) - lastColor.rgb, mix(lastColor.rgb,currentColor - cv,.1) , .5);
      let tw = .4 + clamp( abs( luminance(motion) - .5 ) * 2., 0., .5);
  
      textureStore(buffer, cell.xy, vec4( mix( lastColor.rgb, currentColor, tw ) , cv ) );
  }
  
  fn setCamera( screen: vec2<f32>, eye: vec3<f32>, lookAt: vec3<f32>, fov: vec2f ) -> Ray {
  
      // camera aperture
      let lookFrom = eye + vec3(diskSample(params.aperture), 0.);
  
      // orthonormal basis
      let fw = normalize(lookFrom - lookAt);
      let rt = cross( vec3(0.,-1.,0.), fw );
      let up = cross( fw, rt);
  
      // inital camera ray
      return Ray(lookFrom , normalize(vec3(screen * vec2(-1.,1.) * tan(fov / 2. ) , -1.) ) * mat3x3(rt,up,fw) );
  }
  
  // default diffuse material
  const defaultMaterial = Material(vec3(0.), false, false, false, true, 0., false, Ray(vec3(0.), vec3(0.)));
  
  // the main raymarching function to caculate intersections
  fn shootRay( ray: Ray ) -> Hit {
      var p = ray.origin;
      var t = 0.;
      var d = 0.;
  
      for(var i=0; i< 100; i++) {
          // calculate the actual distance
          d = sceneSDF( p );
          // if we hit something break, the loop
          if ((abs(d) < EPSILON) || ( d > MAXDIST))  { break; }
          // march along the ray 
          t += abs(d);
          p = ray.origin + ray.direction * t;
      }
      // get the normal
      let n = getNormal(p);
      var h = Hit(p , t, n, material(ray, Hit(p, t, n, defaultMaterial, sign(d) ) ) , sign(d) );
      return h;
  }
  
  // we sample the starting ray
  fn raySample(ray: Ray, depth: u32) -> Sample {
      var r = ray;
      var attenuation = vec3(1.);
      var accColor = vec3(0.);
      var firstNormal = vec3(0.);
  
      // bounce the ray until maximum depth an accumulate the color
      for(var b = 0u; b < depth; b++) {
          
          let hit = shootRay(r);
          if (b == 0u) { firstNormal = hit.normal; }
  
          // the attenuation is the albedo color of the material
          attenuation *= hit.material.color;
  
          // the scattered ray provided by the BRDF
          r = hit.material.scattered;
  
          // dielectric materials let the light pass trought, unless they reflect highights
          // also if the material is not emissive, we accumulate the direct lighting
          if (((hit.material.dielectric) && (hit.material.highlight)) || (!hit.material.emissive)) {
              accColor += attenuation * directLighting(r.origin, hit.normal);
          } else {
              // if we hit a light stop
              //if (b == 0u) { accColor = attenuation; }
              accColor += attenuation ;
              break;
          }
  
      }
  
      return Sample(clamp(accColor/f32(depth), vec3(0.), vec3(1.)), firstNormal);
  }
  
  // calculate the direct lighting for a hit
  fn directLighting(position: vec3<f32>, normal: vec3<f32>) -> vec3<f32> {
      var lightColor = vec3<f32>(.0);
      let light = sampleLights();
  
      // we trace a ray to see if this point is in shadow or not
      let shadowRay = Ray(position, normalize(light.point - position));
  
      // We avoid shooting parallel shadow rays to the light plane
      if (dot(shadowRay.direction, normal) > 0.01) {  
          // test if the shadow ray hits something
          let shadowHit = shootRay(shadowRay) ;
          // did we hit the light?
          if (shadowHit.material.emissive) {
              lightColor = (light.intensity)
                  * 1. / (pow(shadowHit.distance, 2.))
                  * shadowHit.material.color
                  * dot(normal, shadowRay.direction);
          }
      }
  
  
      return lightColor;
  }
  
  // here we choose a random light to sample
  fn sampleLights() -> Light {
      //return Light(vec3(-10.,10.,-10.), 1.);
      //return Light(vec3(0.,10.,0.), 100.);
      // we only have ine light, we return a random point on the light plane
      return Light( normalize(randomVec3()) * .1 + vec3(-1.5,4.,-1.5), 5.);
  }
  
  ${ scene }
  
  fn getNormal(p : vec3<f32>) -> vec3<f32> {
    let e = vec2<f32>( EPSILON , 0.);
    return normalize(vec3( sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy), sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy), sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)));
  }
  
  // materials function to calculate the different BRDFs 
  fn material( ray: Ray, hit: Hit ) -> Material {
  
      // default values passed
      var m = hit.material;
  
      // check the object we hit and set the material properties
      let pos = hit.position;

      ${ materials }
  
      // different materials
  
      //BRDF for specular reflection
      if (m.metalness) {
          m.scattered = Ray(hit.position + (hit.normal * EPSILON), reflect(ray.direction, hit.normal) + (m.roughness * randomVec3()));
      }
  
      //BRDF for dielectric reflection and refraction
      if (m.dielectric) {
          // from https://raytracing.github.io/books/RayTracingInOneWeekend.html
          let ctheta = min(dot(-normalize(ray.direction), hit.normal), 1.0);
          let stheta = sqrt(1. - ctheta * ctheta);
          // 1.52 for the common glass
          let sn = select(1.52/1., 1./1.52, hit.sign > 0.);
          
          // fresnel reflectance
          var fresnel = (1. - sn) / (1. + sn);
          fresnel *= fresnel;
          fresnel += (1. - fresnel) * pow( (1. - ctheta), 5.);
  
          // if reflect and positive, and if refract and negative
  
          // test if the ray is reflected or refracted with fresnel
          if ((sn * stheta  > 1. ) || ((fresnel > random().x ) && hit.sign > 0.) ) { 
              if (hit.sign > 0.) { m.highlight = true; }
              m.scattered.origin = hit.position + hit.sign * 4. * (hit.normal * EPSILON);
              m.scattered.direction = normalize(reflect(ray.direction,  hit.sign * hit.normal));
          } else {
              if (hit.sign < 0.) { m.highlight = true; }
              m.scattered.origin = hit.position - hit.sign * 4. * (hit.normal * EPSILON);
              m.scattered.direction = normalize(refract(ray.direction, hit.sign * hit.normal, sn ));
          } 
      } 
  
      // BRDF for diffuse reflection
      if (m.diffuse) {
          // default lambertian reflection
          m.scattered = Ray(hit.position + (hit.normal * EPSILON), cosineWeightedSample(hit.normal));
      }
  
      return m;
  }
  

  ${ deps }

  var<private> gseed: vec3u = vec3u(1u);
  var<private> lseed: vec3u = vec3u(0u);
  // random number between 0 and 1 with 3 seeds and 3 dimensions
  fn random() -> vec3f {
      lseed = pcg3d(lseed);
      return vec3f( vec3f(pcg3d(gseed + lseed)) * (1. / f32(0xffffffffu)) ) ;
  }
  
  // https://www.pcg-random.org/
  fn pcg3d(pv:vec3u) -> vec3u {
  
      var v = pv * 1664525u + 1013904223u;
  
      v.x += v.y*v.z;
      v.y += v.z*v.x;
      v.z += v.x*v.y;
  
      v ^= v >> vec3u(16u);
  
      v.x += v.y*v.z;
      v.y += v.z*v.x;
      v.z += v.x*v.y;
  
      return v;
  }
  
  
  fn diskSample(radius: f32) -> vec2f {
    let rnd = random();
    let r = sqrt(rnd.x);
    let theta = 2.0 * PI * rnd.y;
    return vec2(cos(theta), sin(theta)) * r * radius;
  
  }
  
  fn randomVec3() -> vec3f {
    let rnd = random();
    return rnd * 2. - 1.;
  }
  
  fn randomCube(size: vec3<f32>) -> vec3f {
    return random() * size;
  }
  
  fn cosineWeightedSample(nor: vec3f) -> vec3f {
      let rnd = random();
  
      // constrct a local coordinate system around the normal
      let tc = vec3( 1.0 + nor.z - nor.xy * nor.xy, -nor.x * nor.y) / (1.0 + nor.z);
      let uu = vec3( tc.x, tc.z, -nor.x );
      let vv = vec3( tc.z, tc.y, -nor.y );
      
      let a = 6.283185 * rnd.y;
  
      // return a random vector in the hemisphere
      return sqrt(rnd.x) * (cos(a) * uu + sin(a) * vv) + sqrt(1.0 - rnd.x) * nor;
  }
   
  fn linearToSRGB(rgb: vec3f) -> vec3f {
      let c = clamp(rgb, vec3(0.0), vec3(1.0));
   
      return mix( pow(c, vec3f(1.0 / 2.4)) * 1.055 - 0.055, c * 12.92, vec3f(c < vec3(0.0031308) ) );
  }
   
  fn sRGBToLinear(rgb: vec3f) -> vec3f {
      let c = clamp(rgb, vec3(0.0), vec3(1.0));
   
      return mix( pow(((c + 0.055) / 1.055), vec3(2.4)), c / 12.92, vec3f(c < vec3(0.04045) ) );
  }
  
  // ACES tone mapping curve fit to go from HDR to LDR
  //https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
  fn toneMap(rgb: vec3f) -> vec3f {
      let a = vec3(2.51);
      let b = vec3(0.03);
      let c = vec3(2.43);
      let d = vec3(0.59);
      let e = vec3(0.14);
      return clamp((rgb * (a * rgb + b)) / (rgb * (c * rgb + d) + e), vec3(0.0),vec3(1.0));
  }
  
  fn luminance(color: vec3<f32>) -> f32 {
      return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
  }
  `};

  const scene = `
  fn sceneSDF( p: vec3<f32> ) -> f32 {
    var d = MAXDIST;
    ${ n.reduce( (acc:string, e:Node) => `${acc}d = min(d, ${e.label}(p));\n\t`, "" ) }
      return d;
  }
  ${ n.reduce( (acc:string, e:Node) => `${acc}${e.code}\n`, "" )}
  `

  const texture = (o:any) => {
    n.push(o.material.texture);
    return o.material.texture.code
  }

  const material = (e:Node) => {
    return `if (${e.label}(pos) < EPSILON) { 
      m.color = ${ e.material.texture ? texture(e) : vec3f(e.material.color) };
      m.emissive = ${ e.material.emissive ? "true" : "false" };
      m.metalness = ${ e.material.metalness ? "true" : "false" };
      m.diffuse = ${ e.material.diffuse ? "true" : "false" };
      m.roughness = ${ f(e.material.roughness ) };
    }\n`
  }

  const materials = n.reduce( (acc:string, e:Node) =>  `${acc}${ material(e) }\n`,``)
  const deps = Array.from(new Set(n.reduce( (acc:string[], e:Node) => acc.concat(e.deps), [] ))).reduce( (acc:string, e:string) => `${acc}${lib[e]}\n`, "");

  //console.log(materials, deps)
  return render(deps, materials, scene);
}

const build = (s:Shader) => {

  const cube = object({ label: "cube",  material: { color: [0,1,0], metalness: true, roughness: 0.0 } }, box({ size: [1,2,1], pos: [1.5,1,-2], scale: .5, rot: [0,0,1,0] } ) );

  const ball = object({ label: "ball",  material: { color: [0,0,1], metalness: true, roughness: 0. } }, sphere({ radius: 1, pos: [-1.5,1.,-2.5] } ) );

  const light = object({ label: "light",  material: { color: [1,1,1], emissive: true }, intensity: 50. }, box({ size: [1,.1,1], pos: [-1.5,4.,-1.5] } ) );

  const ground = object({ label: "ground",  material: { color: [.5,.5,.5], texture: checkerboard({ c1: [.2], c2:[.8] }), diffuse: true } }, plane( { pos: [0,1,0,0] }) );

  const path = pathtracer(cube,light,ground, ball);
  
  //console.log(cube, light, ground, path);

  s.spec = spec(s);
  s.wgsl = path;

}

export default async function* (data: Lume.Data) {
        
    const s = data.shaders.find( (s:Shader) => s.id === "genwgsl");

    build(s)
   
    yield* shaderGenerator(s, "../../..");

}
import { Shader } from "../lib/generators.ts";
import hljs from 'npm:highlight.js';

export const layout = "page.layout.ts";

const related = (shader: Shader, data: Lume.Data) => {

  const items = () => {
    const menuItems: string[] = []

    data.search.pages(`${shader.id}`, "date=desc").map(() => {
      menuItems.push(`<a href="${data.url}" >${data.title}</a>`)
    });
    //console.log(menuItems)
    return menuItems.join("")
  }

  return `<div class="w-full">${items()}</div>`
}

const shaderContent = async (shader: Shader, data: Lume.Data) => {

  const wgslCode = await Deno.readTextFile(`./site/shaders/${shader.path}/${shader.id}.wgsl`);
  const tsCode = await Deno.readTextFile(`./site/shaders/${shader.path}/${shader.id}.ts`);
  const htmlWgsl = hljs.highlight(wgslCode, { language: 'rust' }).value
  const htmlTs = hljs.highlight(tsCode, { language: 'typescript' }).value

  return /* html */`
    <div class="flex-col w-full max-w-3xl mx-auto">
    <sl-card class="card-overview w-full">
      <div slot="image" class="w-full" style="padding-top: 100%; position:relative;">
        <canvas id="canvas" style="position:absolute;top:0;left:0;right:0;bottom:0;"></canvas>
      </div>
      <div class="flex flex-col gap-2">
      <div id="error"></div>
      <strong>${shader.title}</strong>
        <div>${shader.description}</div>
        <div class="flex-wrap">${shader.tags?.map((tag: string) => `<sl-tag >${tag}</sl-tag>`).join(" ")}</div>
      </div>
      <sl-details class="mt-4" summary="source code">
      <sl-tab-group>
          <sl-tab slot="nav" panel="wgsl">WGSL</sl-tab>
          <sl-tab slot="nav" panel="ts">TS</sl-tab>
  
          <sl-tab-panel name="wgsl"><pre class="overflow-x-auto"><code>${htmlWgsl}</code></pre></sl-tab-panel>
          <sl-tab-panel name="ts"><pre class="overflow-x-auto"><code>${htmlTs}</code></pre></sl-tab-panel>
      </sl-tab-group>
      </sl-details>
    
      <div slot="footer">
        <sl-icon-button id="play"  name="pause" label="Play/Pause"></sl-icon-button>
        <sl-icon-button id="reset" name="rewind" label="Reset"></sl-icon-button>
        <div class="flex grow"></div>
        <sl-icon-button id="cam" name="camera" label="screenshot"></sl-icon-button>
        <sl-icon-button id="full" name="fullscreen" label="full"></sl-icon-button>
        <small id="fps">0 fps</small>          
      </div>
    </sl-card>
    </div>
    <div class="w-4xl mx-auto">
    <hr>
      ${related(shader, data)}
    </div> 
    <script type="module" src="index.js" defer></script>
  `;
}

export default function* (data: Lume.Data) {

  for (const s of data.shaders) {
    if (s.sketch) {
      yield {
        url: `./${s.id}/`,
        title: s.title,
        description: s.description,
        content: shaderContent(s, data),
      } 
    };
  }
}
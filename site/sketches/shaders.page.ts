import hljs from 'npm:highlight.js';

export const layout = "page.layout.ts";

const related = (shader:any, data : Lume.Data) => {

  const items = () => {
    const menuItems:string[] = []
    
    data.search.pages(`${shader.id}`,"date=desc").map((page) => {
      menuItems.push(`<a href="${page?.data.url}" >${page?.data.title}</a>`)
    });
    //console.log(menuItems)
    return menuItems.join("")
  }

  return `<div class="w-full">${items()}</div>`
}

const shaderContent = async (shader:any, data: Lume.Data) => {

  const wgslCode = await Deno.readTextFile(`./site/${shader.wgsl}`);
  const tsCode = await Deno.readTextFile(`./site/${shader.js.substring(0,shader.js.indexOf('.'))}.ts`);
  const htmlWgsl = hljs.highlight(wgslCode, { language: 'rust' }).value
  const htmlTs = hljs.highlight(tsCode, { language: 'typescript' }).value
 
  return `
    <div class="flex-col w-full max-w-3xl mx-auto">
    <sl-card class="card-overview w-full">
      <div slot="image" id="fullscreen" class="w-full">
        <canvas id="canvas"></canvas>
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
        <sl-icon-button id="full" name="fullscreen" label="full"></sl-icon-button>
        <small id="fps">0 fps</small>          
      </div>
    </sl-card>
    <script type="module" defer>
        import { player } from '/assets/js/player.js';
        import { ${shader.id} } from '${shader.js}';
        
        document.addEventListener('DOMContentLoaded', async (event)  => {
            player( await ${shader.id}() );
        });
    </script>
    </div>
    <div class="w-4xl mx-auto">
    <hr>
    ${ related(shader,data) }
    </div> 
  `;
}

export default function* (data: Lume.Data) {

    for (const s of data.shaders) {
        yield {
            url: `./${s.id}/`,
            title: s.title,
            description: s.description,
            content: shaderContent(s,data),
          };              
    }
}
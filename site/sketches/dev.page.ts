import type { PageData } from "lume/core.ts";

export const layout = "page.layout.ts";

export default  async (pd: PageData) => {

 
    const board = `
    <sl-card class="card-overview w-full">
      <div slot="image" id="fullscreen" class="w-full">
        <canvas id="canvas"></canvas>
      </div>
        <div>DEV</div>
      <div slot="footer">
        <sl-icon-button id="play"  name="pause" label="Play/Pause"></sl-icon-button>
        <sl-icon-button id="reset" name="rewind" label="Reset"></sl-icon-button>
        <div class="flex grow"></div>
        <sl-icon-button id="full" name="fullscreen" label="full"></sl-icon-button>
        <small id="fps">0 fps</small>          
      </div>
    </sl-card>
    <script type="module" src="/assets/shaders/dev/dev.js" defer>
    </script>
    `
    const debugPanel = `
    <sl-card class="card-overview w-full">
    <div class="flex items-center gap-4">
        <sl-tag variant="primary">debug</sl-tag><div id="value">hello word</div>
    </div>
    </sl-card>
    <sl-card class="card-overview mt-4">
    <canvas id="webcam" class="border" ></canvas>
    </sl-card>
    
    `

    return `
    <div class="flex gap-4">
    <div class="w-1/2">${board}</div>
    <div class="w-1/2">${debugPanel}</div>
    </div>`
}
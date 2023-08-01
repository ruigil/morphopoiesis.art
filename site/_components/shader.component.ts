import type { PageData } from "lume/core.ts";


export const js = `import  "./_components/js/shader.ts"`;
export const css = `@import "./_components/css/shader.css";`;

// TODO: These components should obiously be web components
export default async ({ wgsl, js, title, description, comp }: PageData) => {

  return `
  <div class="flex-col w-full max-w-3xl">
  <sl-card class="card-overview w-full">
    <canvas slot="image" id="canvas"></canvas>

    <strong>${title}</strong><br />
    ${description}<br />

    <div slot="footer">
      <sl-icon-button id="play" name="pause" label="Play/Pause"></sl-icon-button>
      <sl-icon-button id="reset" name="rewind" label="Reset"></sl-icon-button>
      <small id="fps" class="flex grow justify-end">0 fps</small>          
    </div>
  </sl-card>
  <sl-details class="mt-4" summary="Source Code">
    <div>
      ${ await comp.code({ wgsl: wgsl }) }
    </div>
  </sl-details>
  </div>
  <script type="module" src=${ js } defer></script>
`;
}

import { html } from "../lib/utilities.ts";

export const layout = "shaders.layout.ts";

const sketchContent = async (shader: any, data: Lume.Data) => {

  return html`
    <div id="error" class="full-window"></div>
    <canvas id="canvas" class="full-window"></canvas>
    
    <style>
    .full-window {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
    }
    </style>
    ${ shader.fx ? '<script src="./fxhash.min.js"></script>' : '' }
    <script type="module" src="index.js"></script>
  `;
}

export default function* (data: Lume.Data) {

  for (const s of data.shaders) {
    yield {
      url: `./${s.path}/`,
      title: s.title,
      description: s.description,
      content: sketchContent(s, data),
    };
  }
}
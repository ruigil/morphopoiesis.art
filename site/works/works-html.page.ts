import { html } from "../lib/utilities.ts";

export const layout = "works.layout.ts";

const sketchContent = async (shader: any, data: Lume.Data) => {

  const info = html`
    <div class="debug">
      <span id="fps" >fps</span>
      <span class="text-white"><pre><code id="debug"></code></pre></span>
    </div>
    <style>
    .debug {
        position: fixed;
        top: 0;
        left: 0;
        margin: 10px;
        padding: 8px;
        background-color: rgba(0,0,0,0.5);
        border-radius: 0.5rem;
        z-index: 10;
        color: white;
    }
    </style>
  `;

  return html`
    <div id="error" class="full-window"></div>
    ${ shader.debug ? info : '' }
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
    <script type="module" src="index.js"></script>
  `;
}

export default function* (data: Lume.Data) {

  for (const s of data.shaders) {
    yield {
      url: `./${s.id}/`,
      title: s.title,
      description: s.description,
      content: sketchContent(s, data),
    };
  }
}
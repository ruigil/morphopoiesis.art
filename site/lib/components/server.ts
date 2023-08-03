import type { PageData, PageHelpers } from "lume/core.ts";
import hljs from 'npm:highlight.js';

export const footer = (data: PageData, { date }: PageHelpers) => {

    return `
    <footer class="footer">
        <div class="flex place-items-center gap-2">
            <span>© ${date("now", "yyyy")}</span> morphopoiesis
        </div>
        <ul class="footer-social flex flex-grow justify-end gap-4">
            <li>
                <a href="https://github.com/rui.gil/morphopoiesis">
                    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" >
                        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path>
                    </svg>
                </a>
            </li>
            <li>
                <a href="https://twitter.com/morphopoiesis">
                    <svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
                        <rect x="138.617" width="42.204" height="213.887" style=" stroke-width: 0px;" transform="matrix(1.0000000000000002, 0, -0.8823959827423097, 1.0000000000000002, 50.1149299459894, 285.8259625110918)"/>
                        <rect x="148.849" width="45.319" height="213.426" style=" stroke-width: 0px;" transform="matrix(1.0000000000000002, 0, -0.8823959827423097, 1.0000000000000002, 305.5439803830382, 0.0000010000001324783625)"/>
                        <rect x="148.427" width="45.191" height="500" style=" stroke-width: 0px;" transform="matrix(1.0000000000000002, 0, 0.653449058532715, 1.0000000000000002, -20.63000900492085, -0.2879999918937628)"/>
                        <rect x="139.494" width="42.47" height="500" style=" stroke-width: 0px;" transform="matrix(1.0000000000000002, 0, 0.653449058532715, 1.0000000000000002, -139.49365442236743, 0.0000010000001324783625)"/>
                        <rect x="107.763" width="32.81" height="144.293" style=" stroke-width: 0px; transform-origin: 124.168px 72.1465px;" transform="matrix(0.546485006809, 0.837469220161, -1.194568991661, -0.000758000009, 280.68311280409, 413.772257259144)"/>
                        <rect x="113.175" width="34.458" height="144.293" style=" stroke-width: 0px; transform-origin: 130.403px 72.147px;" transform="matrix(0.546485006809, 0.837469220161, -1.194568991661, -0.000758000009, -34.804449586629, -57.95240417445)"/>
                    </svg>
                </a>
            </li>
        </ul>
    </footer>
    `
}

export const toolbar = ({ search, metas, url }: PageData) => {

    const items = () => {
        const menuItems: string[] = []

        search.pages("menu.visible=true", "menu.order").map((page) => {
            const current = url || "/";
            menuItems.push(`<li><a ${current === page?.data.url ? "class='is-selected'" : ''} href="${page?.data.url}">${page?.data.title}</a></li>`)
        });
        return menuItems.join("")
    }

    return `
    <nav class="navbar-container">
        <div class="navbar">
            <a href="/" class="navbar-logo" aria-label="Return home">
                <img src="/assets/img/morphopoiesis.svg" width="40" height="40" alt="morphopoiesis logo"/>
                <span class="text-2xl">${metas?.site}</span>
            </a>

            <ul class="navbar-menu">
                ${items()}
                <li  class="flex items-center">
                    <sl-icon-button id="theme-icon" name="sun" label="Change Theme"></sl-icon-button>
                </li>
            </ul>          
        </div>
    </nav>
    `
}

export const code = async ({ wgsl }: PageData): Promise<string> => {
    //@ts-ignore
    const code = await Deno.readTextFile(`./site/${wgsl}`);

    const html = hljs.highlight(code, { language: 'rust' }).value

    return `<pre class="overflow-x-auto"><code>${html}</code></pre>`
}

// TODO: These components should obiously be web components
export const shader = async (data: PageData) => {

    return `
    <div class="flex-col w-full max-w-3xl mx-auto">
    <sl-card class="card-overview w-full">
      <canvas slot="image" id="canvas"></canvas>
  
      <strong>${data.title}</strong><br />
      ${data.description}<br />
  
      <div slot="footer">
        <sl-icon-button id="play"  name="pause" label="Play/Pause"></sl-icon-button>
        <sl-icon-button id="reset" name="rewind" label="Reset"></sl-icon-button>
        <small id="fps" class="flex grow justify-end">0 fps</small>          
      </div>
    </sl-card>
    <sl-details class="mt-4" summary="Source Code">
      <div>
        ${await code( data ) }
      </div>
    </sl-details>
    </div>
    <script type="module" src=${data.js} defer></script>
  `;
}

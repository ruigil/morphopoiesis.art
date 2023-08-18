import type { Data, Page, PageData, PageHelpers } from "lume/core.ts";
import hljs from 'npm:highlight.js';

export const footer = (data: PageData, { date }: PageHelpers) => {

    return `
    <footer class="footer">
        <div class="flex place-items-center gap-2 w-full">
            <span>© ${date("now", "yyyy")}</span> morphopoiesis
            <a href="/notes.rss">
            <svg version="1.1" id="Icons" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 32 32" xml:space="preserve">
                <g>
                    <path d="M6,21c-2.8,0-5,2.2-5,5s2.2,5,5,5s5-2.2,5-5S8.8,21,6,21z"/>
                    <path d="M5.8,1c-1.2,0-2.5,0.1-4,0.3C1.4,1.4,1,1.8,1,2.3v5.1c0,0.3,0.1,0.6,0.4,0.8s0.5,0.3,0.8,0.2c1.2-0.2,2.4-0.4,3.6-0.4
                        c10,0,18.1,8.1,18.1,18.1c0,1.2-0.1,2.4-0.4,3.6c-0.1,0.3,0,0.6,0.2,0.8c0.2,0.2,0.5,0.4,0.8,0.4h5.1c0.5,0,0.9-0.4,1-0.8
                        c0.2-1.4,0.3-2.7,0.3-4C31,12.3,19.7,1,5.8,1z"/>
                    <path d="M5.9,11c-1.4,0-2.8,0.2-4.1,0.6c-0.4,0.1-0.7,0.5-0.7,1V18c0,0.3,0.2,0.7,0.5,0.8c0.3,0.2,0.7,0.2,1,0.1
                        c1.1-0.5,2.2-0.8,3.4-0.8c4.4,0,8,3.6,8,8c0,1.2-0.3,2.3-0.8,3.4c-0.1,0.3-0.1,0.7,0.1,1c0.2,0.3,0.5,0.5,0.8,0.5h5.5
                        c0.4,0,0.8-0.3,1-0.7c0.4-1.4,0.6-2.8,0.6-4.1C21,17.8,14.2,11,5.9,11z"/>
                </g>
            </svg>
            </a>
        </div>
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
                <img src="/assets/img/svg/morphopoiesis.svg" width="40" height="40" alt="morphopoiesis logo"/>
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

    const code = await Deno.readTextFile(`./site/${wgsl}`);
    const html = hljs.highlight(code, { language: 'rust' }).value

    return `<pre class="overflow-x-auto"><code>${html}</code></pre>`
}

// TODO: These components should obiously be web components
export const shader = async (data: PageData) => {

    return `
    <div class="flex-col w-full max-w-3xl mx-auto">
    <sl-card class="card-overview w-full">
      <div slot="image" id="fullscreen" class="w-full">
        <canvas id="canvas"></canvas>
      </div>
      <div class="flex flex-col gap-2">
        <strong>${data.title}</strong>
        <div>${data.description}</div>
        <div class="flex-wrap">${data.tags?.map((tag: string) => `<sl-tag >${tag}</sl-tag>`).join(" ")}</div>
      </div>
  
      <div slot="footer">
        <sl-icon-button id="play"  name="pause" label="Play/Pause"></sl-icon-button>
        <sl-icon-button id="reset" name="rewind" label="Reset"></sl-icon-button>
        <div class="flex grow"></div>
        <sl-icon-button id="full" name="fullscreen" label="full"></sl-icon-button>
        <small id="fps">0 fps</small>          
      </div>
    </sl-card>
    <sl-details class="mt-4" summary="WebGSL source code">
      <div>
        ${await code(data)}
      </div>
    </sl-details>
    </div>
    <script type="module" src="${data.js}-page.js" defer></script>
  `;
}


export const post = (page: Page | Data | undefined, { date }: PageHelpers) => {
    return `
<div class="max-w-4xl rounded border p-4 panel visible">
    <div class="flex flex-wrap gap-4">
        <div class="flex-start">
            <img src="${page!.data.header}-small.webp" class="w-40 h-40 rounded-lg m-0" alt="${page!.data.title}">
        </div>
        <div class="flex flex-col gap-3 max-w-md">
            <div class="text-2xl"><a href="${page!.data.url}">${page!.data.title}</a></div>
            <div class="text-xs"><sl-relative-time date="${date(page!.data.date)}"></sl-relative-time></div>
            <div class="text-sm content">${page!.data.content.split(' ').splice(0, 10).join(' ')}...</div>
            <div class="flex-wrap">${page!.data.tags?.map((tag: string) => `<sl-tag size="small">${tag}</sl-tag>`).join(" ")}</div>

        </div>
    </div>
</div>
`
}
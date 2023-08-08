import type { Data, Page, PageData, PageHelpers } from "lume/core.ts";
import hljs from 'npm:highlight.js';

export const footer = (data: PageData, { date }: PageHelpers) => {

    return `
    <footer class="footer">
        <div class="flex place-items-center gap-2">
            <span>© ${date("now", "yyyy")}</span> morphopoiesis
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
        <div class="flex-wrap">${ data.tags?.map((tag:string) => `<sl-tag >${tag}</sl-tag>`).join(" ") }</div>
      </div>
  
      <div slot="footer">
        <sl-icon-button id="play"  name="pause" label="Play/Pause"></sl-icon-button>
        <sl-icon-button id="reset" name="rewind" label="Reset"></sl-icon-button>
        <div class="flex grow"></div>
        <sl-icon-button id="full" name="fullscreen" label="full"></sl-icon-button>
        <small id="fps">0 fps</small>          
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


export const post = (page: Page | Data | undefined, { date }:PageHelpers) => {
    return `
<div class="rounded border p-4 w-full panel">
    <div class="flex flex-wrap gap-4">
        <div class="flex-start">
            <img src="${page!.data.header}" class="w-40 h-40 rounded-lg m-0" alt="${page!.data.title}">
        </div>
        <div class="flex flex-col gap-3 max-w-md">
            <div class="text-2xl"><a href="${page!.data.url}">${page!.data.title}</a></div>
            <div class="text-xs">${date(page!.data.date)}</div>
            <div class="text-sm content">${page!.data.content.split(' ').splice(0,10).join(' ')}...</div>
            <div class="flex-wrap">${ page!.data.tags?.map((tag:string) => `<sl-tag size="small">${tag}</sl-tag>`).join(" ") }</div>

        </div>
    </div>
</div>
`
}
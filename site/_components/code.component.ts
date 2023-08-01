import type { PageData } from "lume/core.ts";
import hljs from '../assets/js/lib/highlight.min.js';

export default async ({ wgsl }: PageData) : Promise<string>=> {
    //@ts-ignore
    const code = await Deno.readTextFile(`./site/${wgsl}`);

    const html = hljs.highlight(code, {language: 'rust'}).value

    return `<pre class="overflow-x-auto"><code>${html}</code></pre>`
}
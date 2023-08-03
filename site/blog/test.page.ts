import type { PageData, PageHelpers } from "lume/core.ts";
import hljs from 'npm:highlight.js';

export const title = "Test";
export const layout = "page.layout.ts";

const code = (codeText:string, ...params: [string]) : string => {

    const html = hljs.highlight(codeText[0], {language: params[0]}).value

    return `<pre class="overflow-x-auto"><code>${html}</code></pre>`
}

export default ({ comp, search, url }: PageData, {date}:PageHelpers) => {


    const h1 = (strings:TemplateStringsArray, ...params: any[]) => {
        const result = strings.reduce((acc, curr, i) => {
            const p = params[i];
            return (acc += p ? `${curr}<h1>${params[i]}</h1>` : curr);
        }, '');
    
        return result;
    }
 
    const link = (name:string,...href:[string]) => `<a href="${href[0]}">${name[0]}</a> `

    const nu = 5;

    const p = (n) => `<p>${n}</p>`

    const result = [
        h1`teste`,
        p(`paragraph`),
        
        code(`
            fn doSometing( n : u32) -> u32 {
                    return 'hello world';
                }
        `, 'rust'),

        link('John von Neumann','https://en.wikipedia.org/wiki/John_von_Neumann'),

        h1`
        Here is the game of life ${ link('Implemented', '/sketches/gol') } with WebGPU
        `,

        link('','/sketches/gol') 

    ];

    console.log(result.join(""))
    return `
    <h1>Latest posts</h1>
    <div class="mt-4 flex flex-col gap-4">
    </div>
    `

}
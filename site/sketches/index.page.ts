import type { PageData } from "lume/core.ts";

export const title = "Sketches";
export const layout = "page.layout.ts";
export const menu = { visible: true, order: 2}

type Shader = {
    id: number,
    title: string,
    description: string,
    wgsl: string,
    image: string,
    js: string,
    tags: string[]
}

export default ({ shaders, comp }: PageData ) : string => {

    const grid = shaders.map((shader:Shader) => {
        return `<sl-card class="card-overview  w-96">
            <a slot="image" href="./${shader.id}">
            <img
                src="${shader.image}"
                alt="${shader.description}"
            />
            </a>
      
            <strong>${shader.title}</strong><br />
            ${shader.description}<br />
            <small>6 weeks old</small>
            <div class="flex-wrap">${ shader.tags?.map((tag:string) => `<sl-tag size="small">${tag}</sl-tag>`).join(" ") }</div>
        </sl-card>`
    });
    
    return `
    <div class="font-bold text-center w-full text-xl">These sketches are studies done with WebGSL shaders.</div>
    <div class="flex flex-wrap gap-4 w-full">${grid.join(" ")}</div>`

}
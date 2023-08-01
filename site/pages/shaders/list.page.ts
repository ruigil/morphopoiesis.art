import type { PageData } from "lume/core.ts";

export const title = "Sketches";
export const layout = "page.layout.ts";
export const url = "/sketches/";
export const menu = { visible: true, order: 2}

type Shader = {
    id: number,
    title: string,
    description: string,
    wgsl: string,
    image: string,
    js: string,
}

export default ({ shaders, comp }: PageData ) : string => {

    const grid = shaders.map((shader:Shader) => {
        return `<sl-card class="card-overview">
            <a slot="image" href="${url}${shader.id}">
            <img
                src="${shader.image}"
                alt="${shader.description}"
            />
            </a>
      
            <strong>${shader.title}</strong><br />
            ${shader.description}<br />
            <small>6 weeks old</small>
        </sl-card>`
    });
    
    return `<div class="grid grid-cols-4 gap-4 w-full">${grid.join(" ")}</div>`

}
export const title = "Sketches";
export const layout = "page.layout.ts";
export const menu = { visible: true, order: 2 }

type Shader = {
    id: number,
    path:string;
    title: string,
    description: string,
    image: string,
    tags: string[],
    sketch: boolean,
}

export default ({ shaders }: Lume.Data ) : string => {

    const items = () => {
        const tags:Map<string,number> = new Map()

        const list = shaders.filter( (s:Shader) => s.sketch).map((shader:Shader) => {
            shader.tags.map((tag:string) => tags.set(tag, tags.get(tag) ? tags.get(tag)! + 1 : 1))

            return /* html */`
                <sl-card class="card-overview  w-96">
                    <a slot="image" href="./${shader.id}">
                        <img
                            src="../shaders/${shader.id}/${shader.id}-medium.webp"
                            alt="${shader.description}"
                        />
                    </a>
                    <div class="flex flex-col gap-2 h-32">
                        <strong>${shader.title}</strong>
                        <div>${shader.description}</div>
                        <div class="flex-wrap">${ shader.tags?.map((tag:string) => `<sl-tag size="small">${tag}</sl-tag>`).join(" ") }</div>
                    </div>
                </sl-card>`
        });

        return {
            shaders : list.join(""),
            tags: Array.from(tags).map( t => /* html */`
                    <sl-tag size="large">
                        <div class="pr-2"><a href="">${t[0]}</a></div> 
                        <sl-badge pill>${t[1]}</sl-badge>
                    </sl-tag>`
                ).join("")
        }
    
    }

    const data = items();
    
    return /* html */`
        <h1> Latest sketches </h1>
        <div class="flex flex-wrap gap-4 w-full">${ data.shaders }</div>`

}
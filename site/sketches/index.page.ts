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
                <sl-card class="card-overview  w-48">
                    <a slot="image" href="./${shader.id}">
                        <img
                            src="../shaders/${shader.path}/${shader.id}-medium.webp"
                            alt="${shader.description}"
                        />
                    </a>
                    <div class="flex flex-col gap-2 h-8">
                        <strong>${shader.title}</strong>
                    </div>
                </sl-card>`
        });

        return {
            shaders : list.join("")
        }
    
    }

    const data = items();
    
    return /* html */`
        <h1> Latest sketches </h1>
        <div class="flex flex-wrap gap-4 w-full">${ data.shaders }</div>`

}
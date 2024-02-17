import { html } from "../lib/utilities.ts";

export const title = "Works";
export const layout = "works.layout.ts";

type Shader = {
    id: number,
    title: string,
    description: string,
    image: string,
    tags: string[],
    sketch: boolean,
}

export default ({ shaders, comp }: Lume.Data ) : string => {

    const items = () => {
        const tags:Map<string,number> = new Map()

        const list = shaders.map((shader:Shader) => {
            shader.tags.map((tag:string) => tags.set(tag, tags.get(tag) ? tags.get(tag)! + 1 : 1))

            return html`
                <div><a style="color:#aaf" href="./${shader.id}"><b>${shader.title}</b></a></div>
                <div>
                    <div>${shader.description} <br>[${shader.tags?.map((tag:string) => `<i>${tag}</i>, `).join(" ") }]</div>
                </div>
                <hr style="width:100%; border: 1px solid #666">
                `
        });

        return {
            shaders : list.join(""),
            tags: Array.from(tags).map( t => html`
                    <sl-tag size="large">
                        <div class="pr-2"><a href="">${t[0]}</a></div> 
                        <sl-badge pill>${t[1]}</sl-badge>
                    </sl-tag>`
                ).join("")
        }
    
    }

    const data = items();
    
    return html`
        <style>
            .works {
                margin: 0;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 1rem;
                background-color: #333333;
                color: #fff;
            }
        </style>
        <div class="works">
        <h1> Works </h1>
        ${ data.shaders }
        </div>`

}
import { Shader } from "../lib/generators.ts";

export const title = "Shaders";
export const layout = "shaders.layout.ts";


export default ({ shaders }: Lume.Data ) : string => {

    const items = () => {
        const tags:Map<string,number> = new Map()

        const list = shaders.map((shader:Shader) => {
            shader.tags.map((tag:string) => tags.set(tag, tags.get(tag) ? tags.get(tag)! + 1 : 1))

            return /* html */`
                <div><a style="color:#aaf" href="./${shader.id}"><b>${shader.title}</b></a></div>
                <img src="./${shader.id}/${shader.id}-small.webp" width="256", height="256">
                <div>
                    <div>${shader.description} <br>[${shader.tags?.map((tag:string) => `<i>${tag}</i>, `).join(" ") }]</div>
                </div>
                <hr style="width:100%; border: 1px solid #666">
                `
        });

        return {
            shaders : list.join("")
        }
    
    }

    const data = items();
    
    return /* html */`
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
        <h1> Shaders </h1>
        ${ data.shaders }
        </div>`

}
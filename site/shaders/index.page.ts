import { Shader } from "../lib/generators.ts";

export const title = "Shaders";
export const layout = "shaders.layout.ts";

export default ({ shaders }: Lume.Data ) : string => {

    const items = () => {
        const list = shaders.map((shader:Shader) => {
            return /* html */`
                <div class="card">
                    <a href="./${shader.id}">
                        <img src="./${shader.id}/${shader.id}-small.webp" width="256", height="256">
                    </a>
                    <a class="shader-title" href="./${shader.id}">${shader.title}</a>
                </div>
                `
        });

        return list.join("");
    
    }
    
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
            .cards-list {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 10px;
            }
            .card {
                background-color: #222222;
                display: flex;
                flex-direction: column;
                align-items: center;
                border: 2px solid #111;
                border-radius: 5px;
            }
            .shader-title {
                padding: 10px;
                color: #fff;
                font-weight: bold;
                text-decoration: none;
            }
        </style>
        <div class="works">
            <h1> Shaders </h1>
            <hr style="width:100%; border: 1px solid #666">
            <div class="cards-list">${ items() }</div>
        </div>`

}
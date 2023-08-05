import type { Page, PageData, PageHelpers } from "lume/core.ts";
import { post } from "../lib/components/server.ts";

export const title = "Notes";
export const layout = "page.layout.ts";
export const menu = { visible: true, order: 1}


export default ({ comp, search, url }: PageData, helpers :PageHelpers) => {

    const items = () => {
        const menuItems:string[] = []
        
        search.pages("type=post","date=desc").map((page) => {
            menuItems.push(post( page, helpers ))
        });
        //console.log(menuItems)
        return menuItems.join("")
    }

    return `
    <div class="mx-auto max-w-4xl mt-4 flex flex-col gap-4">
        <h1>Latest posts</h1>
        ${items()}
    </div>
    `

}
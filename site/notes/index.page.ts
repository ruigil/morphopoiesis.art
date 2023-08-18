import type { Page, PageData, PageHelpers } from "lume/core.ts";
import { post } from "../lib/components/server.ts";

export const title = "Notes";
export const layout = "page.layout.ts";
export const menu = { visible: true, order: 1}


export default ({ comp, search, url }: PageData, helpers :PageHelpers) => {


    const items = () => {
        const notes:string[] = []
        const tags:Map<string,number> = new Map()
        search.pages("type=post","date=desc").map((page) => {
            page?.data.tags?.map((tag:string) => tags.set(tag, tags.get(tag) ? tags.get(tag)! + 1 : 1))
            notes.push(post( page, helpers ))
        });
        //console.log(menuItems)
        return {
            notes: notes.join(""),
            tags: Array.from(tags).map( t => `<sl-tag size="large"><div class="pr-2"><a href="">${t[0]}</a></div> <sl-badge pill>${t[1]}</sl-badge></sl-tag>`).join("")
        }
    }

    const data = items();

    return `
    <div id="search"></div>
    <h1>Latest notes</h1>
    <div class="mt-4 flex flex-wrap gap-4">
        ${ data.notes }
    </div>
    `

}
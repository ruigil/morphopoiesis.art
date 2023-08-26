import type { Data, Page, PageData, PageHelpers } from "lume/core.ts";

export const title = "Notes";
export const layout = "page.layout.ts";
export const menu = { visible: true, order: 1}


const post = (page: Page | Data | undefined, { date }: PageHelpers) => {
    return `
<div class="rounded border w-full p-4 panel visible">
    <div class="flex flex-wrap gap-4">
        <div class="flex-start">
            <img src="${page!.data.header}-small.webp" class="w-40 h-40 rounded-lg m-0" alt="${page!.data.title}">
        </div>
        <div class="flex flex-col gap-3 max-w-md">
            <div class="text-2xl"><a href="${page!.data.url}">${page!.data.title}</a></div>
            <div class="text-xs"><sl-relative-time date="${date(page!.data.date)}"></sl-relative-time></div>
            <div class="text-sm content">${page!.data.content.split(' ').splice(0, 10).join(' ')}...</div>
            <div class="flex-wrap">${page!.data.tags?.map((tag: string) => `<sl-tag size="small">${tag}</sl-tag>`).join(" ")}</div>

        </div>
    </div>
</div>
`
}

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
    <div class="max-w-4xl mx-auto">
    <div id="search"></div>
    <h1>Latest notes</h1>
    <div class="mt-4 flex flex-wrap gap-4">
        ${ data.notes }
    </div>
    </div>
    `

}
import { html } from "../lib/utilities.ts";

export const title = "Notes";
export const layout = "page.layout.ts";
export const menu = { visible: true, order: 1 }

const post = (data: Lume.Data, { date }: Lume.Helpers, index: number) => {
    return html`
        <div class="rounded border  p-4 panel visible" >
            <div class="flex flex-wrap gap-4" >
                <div class="flex-start">
                    <a href="${data.url}"><img src="../../${data!.header}-small.webp" class="w-40 h-40 rounded-lg m-0" alt="${data!.title}"></a>
                </div>
                <div class="flex flex-col gap-3 max-w-md">
                    <div class="text-2xl"><a href="${data.url}">${data!.title}</a></div>
                    <div class="text-xs"><sl-relative-time date="${date(data!.date)}"></sl-relative-time></div>
                    <div class="text-sm content">${(data.content as string).split(' ').splice(0, 17).join(' ')}...</div>
                    <div class="flex-wrap">${data.tags?.map((tag: string) => `<sl-tag size="small">${tag}</sl-tag>`).join(" ")}</div>

                </div>
            </div>
        </div>
    `;
}

export default ({ comp, search, url }: Lume.Data, helpers: Lume.Helpers) => {

    const items = () => {
        const notes: string[] = []
        const tags: Map<string, number> = new Map()
        search.pages("type=post", "date=desc").map((data: any, i:number) => {
            data.tags?.map((tag: string) => tags.set(tag, tags.get(tag) ? tags.get(tag)! + 1 : 1))
            notes.push(post(data, helpers, i))
        });
        //console.log(menuItems)
        return {
            notes: notes.join(""),
            tags: Array.from(tags).map(t => 
                html`<sl-tag size="large"><div class="pr-2"><a href="">${t[0]}</a></div> <sl-badge pill>${t[1]}</sl-badge></sl-tag>`)
                .join("")
        }
    }

    const data = items();

    return html`
        <h1>Latest notes</h1>
        <div class="flex flex-wrap gap-4 w-full">
            ${data.notes}
        </div>
    `;

}
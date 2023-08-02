import type { PageData, PageHelpers } from "lume/core.ts";

export const title = "Blog";
export const layout = "page.layout.ts";
export const menu = { visible: true, order: 1}


export default ({ comp, search, url }: PageData, {date}:PageHelpers) => {

    const items = () => {
        const menuItems:string[] = []
        
        search.pages("type=post","date=desc").map((page) => {
            menuItems.push(`
            <div class="rounded border p-4 w-full panel">
                <a class="w-full flex gap-4" href="${page?.data.url}">
                    <img src="${page?.data.header}" class="w-40 h-40 rounded-lg" alt="${page?.data.title}">
                    <div class="flex flex-col gap-3">
                        <div class="text-2xl">${page?.data.title}</div>
                        <div class="text-xs">${date(page?.data.date)}</div>
                        <div class="text-sm content ">${page?.data.content.split(' ').splice(0,40).join(' ')} - Read more...</div>
                        <div class="flex-wrap">${ page?.data.tags?.map((tag:string) => `<sl-tag size="small">${tag}</sl-tag>`).join(" ") }</div>

                    </div>
                </a>
            </div>
            <style>
                .panel {
                    border-color: var(--sl-panel-border-color);
                    background: var(--sl-panel-background-color);
                    &:hover {
                        border-color: var(--link-color);
                    }
                    & a {
                        text-decoration: none;
                    }
                    .content {
                        color: var(--sl-color-neutral-1000);
                    }
                }
            </style>
            `)
        });
        //console.log(menuItems)
        return menuItems.join("")
    }

    return `
    <h1>Latest posts</h1>
    <div class="mt-4 flex flex-col gap-4">
        ${items()}
    </div>
    `

}
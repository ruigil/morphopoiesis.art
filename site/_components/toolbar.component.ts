import type { PageData, Page, PageHelpers } from "lume/core.ts";

export const js = `import  "./_components/js/toolbar.ts"`;
export const css = `@import "./_components/css/toolbar.css";`;

export default ({ search, metas, url } : PageData) => {
    
    const items = () => {
        const menuItems:string[] = []
        
        search.pages("menu.visible=true", "menu.order").map((page) => {
            const current = url || "/";
            menuItems.push(`<li><a ${current === page?.data.url ? "class='is-selected'" : '' } href="${page?.data.url}">${page?.data.title}</a></li>`)
        });
        //console.log(menuItems)
        return menuItems.join("")
    }

    return `
    <nav class="navbar-container">
        <div class="navbar">
            <a href="/" class="navbar-logo" aria-label="Return home">
                <img src="/assets/img/morphopoiesis.svg" width="40" height="40" alt="morphopoiesis logo"/>
                <span class="text-2xl">${ metas?.site }</span>
            </a>

            <ul class="navbar-menu">
            ${ items() }
                <li  class="flex items-center">
                    <sl-icon-button id="theme-icon" name="sun" label="Change Theme"></sl-icon-button>
                </li>
            </ul>          
        </div>
    </nav>
    `
}

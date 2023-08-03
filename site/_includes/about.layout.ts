import type { PageData, PageHelpers } from "lume/core.ts";
import { footer } from "../lib/components/server.ts";

export const layout = "base.layout.ts";

export default ( data: PageData, helpers: PageHelpers) => {

  return `
      <main class="container spacing flex flex-col flex-grow h-full w-full gap-8 mx-auto">
        <div class="max-w-3xl mx-auto">${ data.content }</div>
      </main>
      ${ footer(data, helpers) }
  `
}

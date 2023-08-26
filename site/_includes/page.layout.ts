import type { PageData, PageHelpers } from "lume/core.ts";

export const layout = "base.layout.ts";

export default ( data: PageData, helpers: PageHelpers) => {

  return `
      <main class="container spacing flex flex-col flex-grow h-full w-full gap-8 mx-auto">
        ${ data.content }
      </main>
  `
}
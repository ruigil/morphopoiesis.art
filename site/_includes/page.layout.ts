import type { PageData } from "lume/core.ts";

export const layout = "base.layout.ts";

export default ( { content, comp }: PageData) => {

  return `
      <main class="container spacing flex flex-col flex-grow h-full w-full gap-8 mx-auto">
        ${ content }
      </main>
      ${ comp.footer() }
  `
}

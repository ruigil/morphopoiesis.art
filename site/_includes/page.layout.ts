import { html } from "../utilities.ts";

export const layout = "base.layout.ts";

export default ( data: Lume.Data, helpers: Lume.Helpers) => {

  return html`
    <main class="container spacing flex flex-col flex-grow h-full w-full gap-8 mx-auto">
      ${ data.content }
    </main>
  `;
}
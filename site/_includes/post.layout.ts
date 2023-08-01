import type { PageData } from "lume/core.ts";

export const layout = "base.layout.ts";

export default ( { title, tags, content, comp, header }: PageData) => {

  return `
      <div class="flex items-center w-full h-60" style="background-image: url(${header}); background-size: cover;" ">
        <div class="mx-auto text-5xl p-7 rounded-lg opacity-90 font-bold" style="background: var(--sl-color-neutral-0)">${title}</div>  
      </div>
      <main class="container spacing flex flex-col flex-grow h-full gap-8 mx-auto">
      <div class="max-w-4xl mx-auto">
        ${ content }
        <div class="py-4 flex flex-wrap gap-4 items-center"><sl-icon class="text-3xl" name="tags"></sl-icon>${ tags?.map((tag:string) => `<sl-tag size="medium"><a href="/tags/${tag}">${tag}</a></sl-tag>`).join(" ") }</div>
      <div>
      <hr>
      <script src="https://giscus.app/client.js"
        data-repo="[ENTER REPO HERE]"
        data-repo-id="[ENTER REPO ID HERE]"
        data-category="[ENTER CATEGORY NAME HERE]"
        data-category-id="[ENTER CATEGORY ID HERE]"
        data-mapping="pathname"
        data-strict="0"
        data-reactions-enabled="1"
        data-emit-metadata="0"
        data-input-position="bottom"
        data-theme="dark"
        data-lang="en"
        crossorigin="anonymous"
        async>
</script>
      </main>
  `
}

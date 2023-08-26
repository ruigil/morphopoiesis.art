import type { Data, Page, PageData, PageHelpers } from "lume/core.ts";

export const title = "Home";
export const motto = "studies on the synthesis of form";
export const layout = "base.layout.ts";
export const url = "/";

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

export default ({ search }: PageData, helpers: PageHelpers): string => {
  const items = () => {
    const menuItems:string[] = []
    
    search.pages("featured=true","date=desc").map((page) => {
        menuItems.push(post( page, helpers ))
    });
    //console.log(menuItems)
    return menuItems.join("")
  }


  return `
  <main class="flex flex-col flex-grow screen w-full">
    <div class="grow"></div>
    <div class="pt-4  text-2xl desc text-center text-5xl font-bold h-20 w-full desc backdrop-blur">studies on the synthesis of form</div>
  </main>
  <div class="featured w-full">
    <div class="container w-full max-w-4xl mx-auto p-10 mb-20">
      <h1>Featured</h1>
      <div class="mt-4 flex flex-col gap-4">
          ${items()}
      </div>
    </div>
  </div>
  <canvas class="full-window" id="canvas"></canvas>
  <style>
    .screen {
      height: calc(100vh - 70px);
    }
    .featured {
      z-index: 50;
      background-image: linear-gradient(var(--sl-color-neutral-50), var(--sl-color-neutral-0));
    }
    .desc {
      z-index: 100;
      background-repeat: no-repeat;
      background-size: 100% 10%;
      background-position: center bottom;
    }
    .full-window {
      position: fixed;
      top: 0;
      left: 0;

      width: 100vw;
      height: 100vh;
    }
  </style>
  <script type="module" src="/assets/js/index.js" defer></script>
  `
};
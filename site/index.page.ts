import { html } from "./lib/utilities.ts";

export const title = "Home";
export const motto = "studies on the synthesis of form";
export const layout = "base.layout.ts";
export const url = "/";

const post = (data: Lume.Data | undefined, { date }: Lume.Helpers) => {
  return html`
    <div class="rounded border w-full p-4 panel visible">
      <div class="flex flex-wrap gap-4">
        <div class="flex-start">
          <img src=".${data!.header}-small.webp" class="w-40 h-40 rounded-lg m-0" alt="${data!.title}">
        </div>
        <div class="flex flex-col gap-3 max-w-md">
          <div class="text-2xl"><a href="${data!.url}">${data!.title}</a></div>
          <div class="text-xs"><sl-relative-time date="${date(data!.date)}"></sl-relative-time></div>
          <div class="text-sm content">${(data!.content as string).split(' ').splice(0, 10).join(' ')}...</div>
          <div class="flex-wrap">${data!.tags?.map((tag: string) => `<sl-tag size="small">${tag}</sl-tag>`).join(" ")}</div>
        </div>
      </div>
    </div>
  `;
};

export default ({ search }: Lume.Data, helpers: Lume.Helpers): string => {
  const items = () => {
    const menuItems: string[] = [];

    search.pages("featured=true", "date=desc").map((data: any) => {
      menuItems.push(post(data, helpers));
    });
    //console.log(menuItems)
    return menuItems.join("");
  };

  return html`
    <main class="flex flex-col flex-grow screen w-full">
      <div class="grow"></div>
      <div class="pt-4  text-2xl desc text-center text-5xl font-bold h-20 w-full desc backdrop-blur">&darr; studies on the synthesis of form &darr;</div>
    </main>
    <div class="featured w-full">
      <div class="container w-full max-w-4xl mx-auto p-10 mb-20">
        <h1>Featured</h1>
        <div class="mt-4 flex flex-col gap-4">
          ${items()}
        </div>
      </div>
    </div>
    <div id="error" class="full-window"></div>
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
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        z-index: 5;
      }
    </style>
    <script type="module" src="./assets/js/index.js" defer></script>
  `;
};
import type { PageData } from "lume/core.ts";

export const layout = "page.layout.ts";

export default function* ({ shaders, comp}: PageData) {

    for (const shader of shaders) {
        yield {
            url: `./${shader.id}/`,
            title: shader.title,
            description: shader.description,
            content: comp.shader(shader)
          };              
    }

}
import type { PageData } from "lume/core.ts";
import { shader } from '../lib/components/server.ts';

export const layout = "page.layout.ts";

export default function* ({ shaders}: PageData) {

    for (const s of shaders) {
        yield {
            url: `./${s.id}/`,
            title: s.title,
            description: s.description,
            content: shader(s)
          };              
    }

}
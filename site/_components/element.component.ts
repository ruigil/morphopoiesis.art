import type { PageData } from "lume/core.ts";


export const js = `import  "./_components/js/myelement.ts"`;

export default ({ id }: PageData) : string => {

    return `<my-element></my-element>`
}
import { shader } from "../../../lib/components/shader.ts";
import { colorIfs } from "./color-ifs.ts";

document.addEventListener('DOMContentLoaded', async event => {
    shader(await colorIfs())
});


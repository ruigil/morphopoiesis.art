import { shader } from "../../../lib/components/shader.ts";
import { rd } from "./reaction-diffusion.ts"

document.addEventListener('DOMContentLoaded', async event => {
    shader( await rd())
});

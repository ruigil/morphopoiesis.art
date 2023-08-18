import { shader } from "../../../lib/components/shader.ts";
import { boids } from "./boids.ts"

document.addEventListener('DOMContentLoaded', async (event)  => {
    shader( await boids() );
});
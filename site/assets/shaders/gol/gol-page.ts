import { shader } from "../../../lib/components/shader.ts";
import { gameOfLife } from "./gol.ts";

document.addEventListener('DOMContentLoaded', async event => {
    shader ( await gameOfLife() )
});


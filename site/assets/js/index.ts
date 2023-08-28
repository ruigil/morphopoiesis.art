
import { draw } from '../../lib/webgpu/utils.ts';
import { gol } from '../shaders/gol/gol.ts'

document.addEventListener('DOMContentLoaded', async (event) => {

  const landing = async () => {

    const getRGBValues = (rgbString: string): number[]  => {
      const match = rgbString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
      if (match) {
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
      }
      return [0,0,0];
    }

    const body = document.querySelector('body');
    const styles = getComputedStyle(body!);

    const isDark = (): boolean => {
      const currentMode = window.matchMedia("(prefers-color-scheme: dark)").matches.toString();
      return (localStorage.getItem("dark-theme") || currentMode) === "true"; // true = "dark", false = "light"
    }

    const color = isDark() ? {
      //bcolor: getRGBValues(styles.backgroundColor),
      bcolor: [16,24,42],
      //fcolor: getRGBValues(styles.color)
      fcolor: [255,255,255]
    } :
    {
      bcolor: [240,240,240],
      fcolor: [0,0,0]
    };

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          //console.log('Style changed:', mutation.target.classList.length);
          //const styles = getComputedStyle(body!);
          let dark = mutation.target.classList.contains('sl-theme-dark');
          if (dark) {
            color.bcolor.splice(0,3, ...[16,24,42] );
            color.fcolor.splice(0,3, ...[255,255,255]);
          } else {
            color.bcolor.splice(0,3, ...[240,240,240] );
            color.fcolor.splice(0,3, ...[0,0,0]);
          }
        }
      });
    });

    observer.observe(body!, { attributes: true });

    const context = await gol();
    draw(context, { uni: { fcolor: color.fcolor, bcolor: color.bcolor }});
  }

  landing();

});



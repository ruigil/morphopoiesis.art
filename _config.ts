import lume from "lume/mod.ts";
import attributes from "lume/plugins/attributes.ts";
import base_path from "lume/plugins/base_path.ts";
import code_highlight from "lume/plugins/code_highlight.ts";
import katex from "lume/plugins/katex.ts";
import date from "lume/plugins/date.ts";
import esbuild from "lume/plugins/esbuild.ts";
import tailwindcss from "lume/plugins/tailwindcss.ts";
import postcss from "lume/plugins/postcss.ts";
import metas from "lume/plugins/metas.ts";


const site = lume({
  src: "./site"
}, {
  modules: {
    extensions: {
      pages: [".page.js", ".page.ts",".layout.ts",".layout.js"],
      data: [".data.js", ".data.ts"],
      components: [".component.js", ".component.ts"],
    }
  }
});

site.copy("/assets/img");
site.copy([".wgsl"]);
site.ignore("/assets/js/lib");

site.use(attributes());
site.use(base_path());
site.use(date());
site.use(esbuild({
    extensions: [".ts", ".js"],
    esm: {},
    options: {
      sourcemap: true,     
      bundle: true,
      splitting: true,
      format: "esm",
      minify: false,
      keepNames: true,
      tsconfigRaw:'{ "compilerOptions": { "experimentalDecorators" : true } }',
      platform: "browser",
      target: "esnext",
      treeShaking: true,
    }
}));
site.use(tailwindcss( { extensions: [".html"] } ));
site.use(postcss());
site.use(metas());
site.use(katex());
site.use(code_highlight());

export default site;

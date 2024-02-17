import lume from "lume/mod.ts";
import attributes from "lume/plugins/attributes.ts";
import base_path from "lume/plugins/base_path.ts";
import katex from "lume/plugins/katex.ts";
import date from "lume/plugins/date.ts";
import esbuild from "lume/plugins/esbuild.ts";
import tailwindcss from "lume/plugins/tailwindcss.ts";
import postcss from "lume/plugins/postcss.ts";
import metas from "lume/plugins/metas.ts";
import codeHighlight from "lume/plugins/code_highlight.ts";
import sitemap from "lume/plugins/sitemap.ts";
import feed from "lume/plugins/feed.ts";
import transformImages from "lume/plugins/transform_images.ts";
import relativeUrls from "lume/plugins/relative_urls.ts";
import readInfo from "lume/plugins/reading_info.ts";

// config
const site = lume({
  src: "./site",
  location: new URL("https://morphopoiesis.art"),
}, {
  modules: {
    extensions: [".ts", ".js"],
  }
});

// assets
site.ignore("/lib");
site.ignore("/works/libs");
site.copy("/assets/img/svg");
site.copy([".wgsl"]);

// plugins
site.use(attributes());
site.use(sitemap());
site.use(base_path());
site.use(date());
site.use(tailwindcss( { extensions: [".html"] } ));
site.use(postcss());
site.use(metas());
site.use(katex());
site.use(codeHighlight());
site.use(readInfo());
site.use(relativeUrls());
site.use(transformImages());
site.use(feed({
  output: ["/notes.rss", "/notes.json"],
  query: "type=post",
  info: {
    title: "=site.title",
    description: "=site.description",
  },
  items: {
    title: "=title",
    description: "=excerpt",
  },
}));
site.use(esbuild({
  extensions: [".ts", ".js"],
  esm: {},
  options: {
    sourcemap: true,     
    bundle: true,
    splitting: false,
    format: "esm",
    minify: true,
    keepNames: true,
    tsconfigRaw:'{ "compilerOptions": { "experimentalDecorators" : true } }',
    platform: "browser",
    target: "esnext",
    treeShaking: true,
  }
}));

export default site;

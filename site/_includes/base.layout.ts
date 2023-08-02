import type { PageData } from "lume/core.ts";

export default ( { title, content, comp, scripts, url}: PageData) => {

  return `
  <html lang="en">
    <head>
      <title>${ title }</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="stylesheet" href="/assets/css/styles.css" />
      <link rel="stylesheet" href="/components.css" />
      <script src="https://identity.netlify.com/v1/netlify-identity-widget.js defer"></script>
      <script type="module" src="/components.js" defer></script>
      <script type="module" src="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.5.2/cdn/shoelace-autoloader.js" defer></script>
      ${ scripts ? scripts.map((src: string) => (`<script type="module" src=${src} defer></script>` )) : ""}
    </head>
    <body class="flex flex-col sl-theme-dark">
      ${ comp.toolbar({ url: url }) }
      ${ content }
    </body>
    <script>
    if (window.netlifyIdentity) {
      window.netlifyIdentity.on("init", user => {
        if (!user) {
          window.netlifyIdentity.on("login", () => {
            document.location.href = "/admin/";
          });
        }
      });
    }
  </script>
  </html>
  `
}

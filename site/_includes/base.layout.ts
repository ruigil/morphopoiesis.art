import type { PageData } from "lume/core.ts";
import { toolbar } from "../lib/components/server.ts";

export default ( data : PageData) => {

  return `
  <html lang="en">
    <head>
      <title>${data.title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="stylesheet" href="/assets/css/styles.css" />
      <link rel="stylesheet" href="/assets/css/components.css" />
      <script type="module" src="/assets/js/components.js" defer></script>
      <script type="module" src="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.5.2/cdn/shoelace-autoloader.js" defer></script>
      ${data.scripts ? data.scripts.map((src: string) => (`<script type="module" src=${src} defer></script>`)) : ""}
      <!-- Google tag (gtag.js) -->
      <script async src="https://www.googletagmanager.com/gtag/js?id=G-H0PZ82W0E9"></script>
      <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
      
        gtag('config', 'G-H0PZ82W0E9');
      </script>
    </head>
    <body class="flex flex-col sl-theme-dark">
      ${ toolbar(data) }
      ${data.content}
    </body>
  </html>
  `
}

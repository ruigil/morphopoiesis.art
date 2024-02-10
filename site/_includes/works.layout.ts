import { html } from "../lib/utilities.ts";

export default ( data : Lume.Data, helpers: Lume.Helpers) => {

    return html`
      <html lang="en">
        <head>
          <title>${data.title}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body>
          ${data.content}
        </body>
      </html>
    `;
  }
  
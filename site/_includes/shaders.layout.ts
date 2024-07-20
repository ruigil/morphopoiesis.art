
export default ( data : Lume.Data, helpers: Lume.Helpers) => {

    return /* html */`
      <html lang="en">
        <head>
          <title>${data.title}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta charset="utf-8" />
        </head>
        <body style="margin:0; padding:0">
          ${data.content}
        </body>
      </html>
    `;
  }
  

export default ( data : Lume.Data) => {

    return /* html */`
      <html lang="en">
        <head>
          <title>${data.title}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          
          <link rel="apple-touch-icon" sizes="180x180" href="/assets/img/ico/apple-touch-icon.png">
          <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/ico/favicon-32x32.png">
          <link rel="icon" type="image/png" sizes="16x16" href="/assets/img/ico/favicon-16x16.png">
          <link rel="icon" type="image/ico" href="/assets/img/ico/favicon.ico">

          <link rel="stylesheet" href="/assets/css/styles.css" />
          <script async src="https://www.googletagmanager.com/gtag/js?id=G-H0PZ82W0E9"></script>
          <script>
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
          
            gtag('config', 'G-H0PZ82W0E9');
          </script>
        </head>
        <body class="flex flex-col sl-theme-dark">
          <div id="poiesis-error"></div>
          ${data.content}
        </body>
      </html>
    `;
  }
  
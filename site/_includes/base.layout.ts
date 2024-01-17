
const footer = (data: Lume.Data, { date }: Lume.Helpers) => {

  return `
  <footer class="footer">
      <div class="flex place-items-center gap-2 w-full">
          <span>© ${date("now", "yyyy")}</span> morphopoiesis
          <a href="/notes.rss" aria-label="RSS Feed">
          <svg version="1.1" id="Icons" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 32 32" xml:space="preserve">
              <g>
                  <path d="M6,21c-2.8,0-5,2.2-5,5s2.2,5,5,5s5-2.2,5-5S8.8,21,6,21z"/>
                  <path d="M5.8,1c-1.2,0-2.5,0.1-4,0.3C1.4,1.4,1,1.8,1,2.3v5.1c0,0.3,0.1,0.6,0.4,0.8s0.5,0.3,0.8,0.2c1.2-0.2,2.4-0.4,3.6-0.4
                      c10,0,18.1,8.1,18.1,18.1c0,1.2-0.1,2.4-0.4,3.6c-0.1,0.3,0,0.6,0.2,0.8c0.2,0.2,0.5,0.4,0.8,0.4h5.1c0.5,0,0.9-0.4,1-0.8
                      c0.2-1.4,0.3-2.7,0.3-4C31,12.3,19.7,1,5.8,1z"/>
                  <path d="M5.9,11c-1.4,0-2.8,0.2-4.1,0.6c-0.4,0.1-0.7,0.5-0.7,1V18c0,0.3,0.2,0.7,0.5,0.8c0.3,0.2,0.7,0.2,1,0.1
                      c1.1-0.5,2.2-0.8,3.4-0.8c4.4,0,8,3.6,8,8c0,1.2-0.3,2.3-0.8,3.4c-0.1,0.3-0.1,0.7,0.1,1c0.2,0.3,0.5,0.5,0.8,0.5h5.5
                      c0.4,0,0.8-0.3,1-0.7c0.4-1.4,0.6-2.8,0.6-4.1C21,17.8,14.2,11,5.9,11z"/>
              </g>
          </svg>
          </a>
      </div>
  </footer>
  `
}

const toolbar = ({ search, metas, url }: Lume.Data) => {

  const items = () => {
      const menuItems: string[] = []

      search.pages("menu.visible=true", "menu.order").map((data:any) => {
          const current = url || "/";
          menuItems.push(`<li><a ${current === data.url ? "class='is-selected'" : ''} href="${data.url}">${data.title}</a></li>`)
      });
      return menuItems.join("")
  }

  return `
  <nav class="navbar-container">
      <div class="navbar">
          <a href="/" class="navbar-logo" aria-label="Return home">
              <img src="/assets/img/svg/morphopoiesis.svg" width="40" height="40" alt="morphopoiesis logo"/>
              <span class="text-2xl">${metas?.site}</span>
          </a>

          <ul class="navbar-menu">
              ${items()}
              <li  class="flex items-center">
                  <sl-icon-button id="theme-icon" name="sun" label="Change Theme"></sl-icon-button>
              </li>
          </ul>          
      </div>

  </nav>
  <script type="module" src="/assets/js/toolbar.js"></script>
  `
}


export default ( data : Lume.Data, helpers: Lume.Helpers) => {

  return `
  <html lang="en">
    <head>
      <title>${data.title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="stylesheet" href="/assets/css/styles.css" />
      <link rel="stylesheet" href="/assets/css/components.css" />
      <script type="module" src="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.5.2/cdn/shoelace-autoloader.js"></script>
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
      ${ footer(data, helpers) }
    </body>
  </html>
  `
}

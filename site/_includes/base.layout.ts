
const footer = (_: Lume.Data, { date }: Lume.Helpers) => {

  return /* html */`
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
  `;
}

const toolbar = ({ search, metas, url }: Lume.Data) => {

  const items = () => {
      const menuItems: string[] = []

      search.pages("menu.visible=true", "menu.order").map((data) => {
          const current = url || "/";
          menuItems.push(`<li><a ${current === data.url ? "class='is-selected'" : ''} href="${data.url}">${data.title}</a></li>`)
      });
      return menuItems.join("")
  }

  return /* html */`
    <nav class="navbar-container">
        <div class="navbar">
            <a href="/" class="navbar-logo" aria-label="Return home">
                <img src="/assets/img/svg/morphopoiesis.svg" width="50" height="50" alt="morphopoiesis logo"/>
                <span class="text-3xl">${metas?.site}</span>
            </a>

            <ul class="navbar-menu">
                ${ items() }
                <li  class="flex items-center">
                    <sl-icon-button id="theme-icon" name="sun" label="Change Theme"></sl-icon-button>
                </li>
            </ul>          
        </div>

    </nav>
    <script type="module">
      document.addEventListener('DOMContentLoaded', event => {

        const root = document.querySelector('body');

        const currentTheme = () => {
          const currentMode = window.matchMedia("(prefers-color-scheme: dark)").matches.toString();
          return (localStorage.getItem("dark-theme") || currentMode) === "true"; // true = "dark", false = "light"
        }

        const themeIcon = document.querySelector('#theme-icon');

        themeIcon.addEventListener('click', event => {
          event.preventDefault();
          const storedTheme = currentTheme();
          const theme = !storedTheme;
          root.classList.toggle("sl-theme-dark");
          themeIcon.setAttribute('name', theme ? "moon" : "sun");
          localStorage.setItem("dark-theme", theme.toString());
        });

        const theme = currentTheme();

        themeIcon.setAttribute('name', theme ? "moon" : "sun");

        theme ? root.classList.add("sl-theme-dark") : root.classList.remove("sl-theme-dark");
      });      
    </script>
  `;
}


export default ( data : Lume.Data, helpers: Lume.Helpers) => {

  return /* html */`
    <html lang="en">
      <head>
        <title>${data.title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <base href="/" />
        <link rel="apple-touch-icon" sizes="180x180" href="/assets/img/ico/apple-touch-icon.png">
        <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/ico/favicon-32x32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/assets/img/ico/favicon-16x16.png">
        <link rel="icon" type="image/ico" href="/assets/img/ico/favicon.ico">

        <link rel="stylesheet" href="/assets/css/styles.css" />
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
        <div id="poiesis-error" class="poiesis-error"></div>
        ${data.content}
        ${ footer(data, helpers) }
      </body>
    </html>
  `;
}

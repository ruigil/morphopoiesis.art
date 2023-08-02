document.addEventListener('DOMContentLoaded', event => {
  //console.log("toolbar")
  //const root = document.firstElementChild;
  const root = document.querySelector('body');
  const currentTheme = (): boolean => {
    const currentMode = window.matchMedia("(prefers-color-scheme: dark)").matches.toString();
    return (localStorage.getItem("dark-theme") || currentMode) === "true"; // true = "dark", false = "light"
  }

  const ticon = document.querySelector('#theme-icon');

  ticon?.addEventListener('click', event => {
    event.preventDefault();

    const storedTheme = currentTheme();
    const theme = !storedTheme;
    localStorage.setItem("dark-theme", theme.toString() );
    root?.classList.toggle("sl-theme-dark");
    ticon.setAttribute('name', theme ? "moon" : "sun");
  });

  const theme = currentTheme();
  ticon?.setAttribute('name', theme ? "moon" : "sun");
  theme ? root?.classList.add("sl-theme-dark") : root?.classList.remove("sl-theme-dark");
});
document.addEventListener('DOMContentLoaded', event => {

  const root = document.querySelector('body');

  const currentTheme = (): boolean => {
    const currentMode = window.matchMedia("(prefers-color-scheme: dark)").matches.toString();
    return (localStorage.getItem("dark-theme") || currentMode) === "true"; // true = "dark", false = "light"
  }

  const themeIcon = document.querySelector('#theme-icon');

  themeIcon?.addEventListener('click', event => {
    event.preventDefault();

    const storedTheme = currentTheme();
    const theme = !storedTheme;
    localStorage.setItem("dark-theme", theme.toString());
    root?.classList.toggle("sl-theme-dark");
    themeIcon.setAttribute('name', theme ? "moon" : "sun");
  });

  const theme = currentTheme();

  themeIcon?.setAttribute('name', theme ? "moon" : "sun");

  theme ? root!.classList.add("sl-theme-dark") : root!.classList.remove("sl-theme-dark");
});
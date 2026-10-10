// Runs before React so the saved theme is applied on the first paint, with no light/dark flash.
(function () {
  try {
    var prefs = JSON.parse(localStorage.getItem("voxella.preferences") || "{}").state || {};
    var mode = prefs.mode || "system";
    var dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.dataset.accent = prefs.accent || "violet";
  } catch (e) {
    document.documentElement.dataset.theme = "light";
  }
})();

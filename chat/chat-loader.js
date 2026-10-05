/*
 * Chargeur du chatbot.
 * Ce fichier est le seul élément chargé avec la page (moins d'1 Ko, en defer).
 * Il n'injecte chat.css, chat-data.js et chat.js qu'au premier besoin :
 * au survol du bouton (préchargement discret) ou au clic. Le chargement initial
 * du portfolio n'est donc pas alourdi, et WebLLM n'est importé que si le
 * visiteur choisit explicitement le mode IA (voir chat.js).
 */

(function () {
  "use strict";

  var BASE = "chat/";
  var FILES = ["chat.css", "chat-data.js", "chat.js"];
  var started = false;

  function boot() {
    if (started) return;
    started = true;

    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = BASE + "chat.css";
    css.setAttribute("data-chat-css", "");
    document.head.appendChild(css);

    // Scripts classiques sans async : ils s'exécutent dans l'ordre d'insertion,
    // donc chat-data.js est disponible avant chat.js.
    FILES.slice(1).forEach(function (name) {
      var s = document.createElement("script");
      s.src = BASE + name;
      s.defer = false;
      document.head.appendChild(s);
    });
  }

  function launcherFrom(event) {
    var t = event.target;
    return t && t.closest ? t.closest("#chat-launcher") : null;
  }

  // Préchargement au survol ou au focus clavier : le chat est prêt avant le clic.
  document.addEventListener("mouseover", function (e) { if (launcherFrom(e)) boot(); }, true);
  document.addEventListener("focusin", function (e) { if (launcherFrom(e)) boot(); }, true);

  // Au clic : on charge si besoin, et on note qu'il faut ouvrir la fenêtre
  // dès que le script principal est prêt.
  document.addEventListener("click", function (e) {
    var launcher = launcherFrom(e);
    if (!launcher) return;
    if (typeof window.__chatReady === "undefined") launcher.dataset.pendingOpen = "1";
    boot();
  }, true);
})();

/*
 * Chargeur de l'assistant.
 * Seul fichier chargé avec la page (moins de 2 Ko, en defer). Il injecte le CSS, les
 * données et le moteur du chat :
 *   - tout de suite au survol ou au clic sur le coin de page, ou au clic sur un bouton
 *     "data-chat-open" placé dans la page ;
 *   - sinon, en différé après le chargement de la page, pour que l'aperçu périodique du
 *     coin puisse fonctionner même si le visiteur ne touche à rien.
 * Le modèle de langage (WebLLM) n'est importé que si le visiteur active le mode IA.
 */

(function () {
  "use strict";

  var BASE = "chat/";
  var FILES = ["chat.css", "chat-data.js", "chat.js"];
  var started = false;
  var IDLE_DELAY = 2200;

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
      document.head.appendChild(s);
    });
  }

  // Chargement différé : le site est utilisable tout de suite, l'assistant arrive juste après.
  if (document.readyState === "complete") setTimeout(boot, IDLE_DELAY);
  else window.addEventListener("load", function () { setTimeout(boot, IDLE_DELAY); });

  function triggerFrom(event) {
    var t = event.target;
    return t && t.closest ? t.closest("#chat-launcher, [data-chat-open]") : null;
  }

  // Préchargement au survol ou au focus clavier : le chat est prêt avant le clic.
  document.addEventListener("mouseover", function (e) { if (triggerFrom(e)) boot(); }, true);
  document.addEventListener("focusin", function (e) { if (triggerFrom(e)) boot(); }, true);

  document.addEventListener("click", function (e) {
    var trigger = triggerFrom(e);
    if (!trigger) return;

    var ready = typeof window.__chatReady !== "undefined";
    var launcher = document.getElementById("chat-launcher");

    // Bouton placé dans la page (section Assistant) : il ouvre la fenêtre, et envoie
    // directement la question si le bouton en porte une.
    if (trigger.hasAttribute("data-chat-open")) {
      var question = trigger.getAttribute("data-chat-open") || "";
      if (ready && typeof window.openChatAssistant === "function") window.openChatAssistant(question || null);
      else if (launcher) launcher.dataset.pendingOpen = question || "1";
      boot();
      return;
    }

    // Clic sur la pastille : si le moteur n'est pas encore chargé, on note qu'il
    // faudra ouvrir la fenêtre dès qu'il sera prêt.
    if (!ready && launcher) launcher.dataset.pendingOpen = "1";
    boot();
  }, true);
})();

/*
 * Chargeur du portfolio interactif.
 * Seul fichier chargé avec la page (moins de 2 Ko, en defer). Il injecte le CSS, les
 * données et le moteur au premier besoin : survol, clic sur le bouton du coin, ou clic
 * sur un bouton "data-chat-open" placé dans la page. Un préchargement est aussi lancé
 * après le chargement de la page, pour que le premier clic ouvre instantanément.
 *
 * Les scripts sont chargés EN SÉQUENCE, l'un après l'autre : chat.js a besoin de
 * window.CHAT_DATA, et deux scripts injectés en parallèle s'exécutent dans un ordre
 * non garanti. C'était la cause du bouton inerte au premier clic.
 *
 * Le modèle de langage (WebLLM) n'est importé que si le visiteur active le mode IA.
 */

(function () {
  "use strict";

  var BASE = "chat/";
  var SCRIPTS = ["chat-data.js", "chat.js"];
  var IDLE_DELAY = 1500;
  var started = false;

  function boot() {
    if (started) return;
    started = true;

    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = BASE + "chat.css";
    css.setAttribute("data-chat-css", "");
    document.head.appendChild(css);

    var i = 0;
    (function next() {
      if (i >= SCRIPTS.length) return;
      var s = document.createElement("script");
      s.src = BASE + SCRIPTS[i++];
      s.onload = next;
      s.onerror = next; // on enchaîne quand même, chat.js signale l'erreur
      document.head.appendChild(s);
    })();
  }

  function triggerFrom(event) {
    var t = event.target;
    return t && t.closest ? t.closest("#chat-launcher, [data-chat-open]") : null;
  }

  // Le portfolio interactif a déjà été ouvert une fois : la pastille rouge a rempli son
  // rôle, on la retire dès le chargement de la page.
  try {
    if (localStorage.getItem("chat-seen")) {
      var peel = document.getElementById("peel");
      if (peel) peel.classList.add("seen");
    }
  } catch (e) { /* navigation privée : on laisse la pastille */ }

  // Préchargement après la page : le premier clic ouvre sans attente.
  if (document.readyState === "complete") setTimeout(boot, IDLE_DELAY);
  else addEventListener("load", function () { setTimeout(boot, IDLE_DELAY); });

  // Préchargement au survol ou au focus clavier.
  document.addEventListener("mouseover", function (e) { if (triggerFrom(e)) boot(); }, true);
  document.addEventListener("focusin", function (e) { if (triggerFrom(e)) boot(); }, true);

  document.addEventListener("click", function (e) {
    var trigger = triggerFrom(e);
    if (!trigger) return;

    var ready = typeof window.__chatReady !== "undefined";
    var launcher = document.getElementById("chat-launcher");

    // Bouton placé dans la page : il ouvre la page, et envoie directement la question
    // si le bouton en porte une.
    if (trigger.hasAttribute("data-chat-open")) {
      var question = trigger.getAttribute("data-chat-open") || "";
      if (ready && typeof window.openChatAssistant === "function") window.openChatAssistant(question || null);
      else if (launcher) launcher.dataset.pendingOpen = question || "1";
      boot();
      return;
    }

    // Clic sur le bouton du coin : si le moteur n'est pas encore prêt, on note qu'il
    // faudra ouvrir la page dès qu'il le sera.
    if (!ready && launcher) launcher.dataset.pendingOpen = "1";
    boot();
  }, true);
})();

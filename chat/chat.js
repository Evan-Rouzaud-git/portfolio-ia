/*
 * Chatbot du portfolio : deux modes.
 *
 * MODE RÈGLES : analyse des mots-clés de la question, réponse préparée (chat-data.js).
 *   Aucun réseau, aucune dépendance, réponse instantanée.
 *
 * MODE IA : petit modèle de langage exécuté dans le navigateur du visiteur via WebGPU
 *   et la bibliothèque WebLLM. Aucun serveur, aucune clé API, aucun coût.
 *
 * Choix techniques, pensés pour la rapidité et la simplicité sur GitHub Pages :
 *   - la recherche par mots-clés sert de routeur et sélectionne deux extraits courts :
 *     le modèle reçoit très peu de texte à lire, donc il commence à répondre vite.
 *   - la réponse est générée EN FLUX (streaming) : le texte apparaît mot après mot,
 *     ce qui rend l'attente beaucoup plus supportable qu'un bloc qui arrive d'un coup.
 *   - resetChat() avant chaque question : sans cela, l'historique s'accumule dans le
 *     moteur et chaque réponse devient plus lente que la précédente.
 *   - max_tokens volontairement bas : une réponse de portfolio n'a pas besoin de plus.
 *   - WebLLM est importé dynamiquement, uniquement si le visiteur active le mode IA.
 */

(function () {
  "use strict";

  var DATA = window.CHAT_DATA;
  if (!DATA) { console.warn("[chat] chat-data.js manquant"); return; }

  var CFG = DATA.config;
  var STORE_MODE = "chat-mode";
  var STORE_MODEL = "chat-model";
  var STORE_CACHED = "chat-model-cached";
  var REFUS = "Je réponds uniquement à partir de ce portfolio. Pour toute autre question, écrivez-moi directement à " + CFG.email + ".";

  var MODELS = [
    "https://esm.run/@mlc-ai/web-llm@0.2.85",
    "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.85/+esm"
  ];

  /* Liens proposés sous les réponses */
  var LINKS = {
    cal: { label: "Réserver 30 minutes", href: CFG.calUrl, primary: true, external: true },
    email: { label: "Écrire un e-mail", href: "mailto:" + CFG.email, primary: false },
    github: { label: "GitHub", href: CFG.github, primary: false, external: true },
    linkedin: { label: "LinkedIn", href: CFG.linkedin, primary: false, external: true },
    case: { label: "Voir les case studies", href: CFG.caseStudies, primary: false },
    gumroad: { label: "Voir InSight", href: "https://peterjean.gumroad.com/l/InSight", primary: false, external: true },
    leadlistqa: { label: "Voir Lead List QA", href: "https://www.leadlistqa.com/", primary: false, external: true },
    github_excel: { label: "Code de l'agent Excel", href: "https://github.com/Evan-Rouzaud-git/excel-agent-poc", primary: false, external: true },
    github_aiba: { label: "Code du dashboard", href: "https://github.com/Evan-Rouzaud-git/ai-business-analyst-workbench", primary: false, external: true },
    github_goutte: { label: "Code de Goutte d'Eau", href: "https://github.com/Evan-Rouzaud-git/Projet-goutte-eau", primary: false, external: true }
  };

  /* Intentions qui déclenchent un bouton de prise de rendez-vous */
  var CONTACT_WORDS = ["rendez", "rdv", "appel", "appeler", "reserv", "réserv", "creneau", "créneau", "contact", "devis", "discuter", "parler", "echang", "échange", "dispo", "cal.com"];

  var el = {};
  var state = {
    mode: localStorage.getItem(STORE_MODE) === "ai" ? "ai" : "rules",
    model: localStorage.getItem(STORE_MODEL) || CFG.model,
    engine: null,
    engineStatus: "idle",      // idle | loading | ready | unsupported | error
    busy: false,
    loading: null,
    opened: false
  };

  /* ------------------------------------------------------------------
   * Utilitaires
   * ------------------------------------------------------------------ */
  function norm(s) {
    return (s || "").toString().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9' ]+/g, " ")
      .replace(/\s+/g, " ").trim();
  }
  var STOP = ("le la les un une des du de d a au aux et ou ou est sont etre avoir je tu il elle on nous vous ils elles " +
    "que qui quoi dont ou quand comment pourquoi quel quelle quels quelles ce cet cette ces mon ma mes ton ta tes son sa ses " +
    "votre vos leur leurs pour par sur dans avec sans plus moins tres peu bien fait faire peux peut pouvez pouvoir veux vouloir " +
    "y en se ne pas oui non moi toi lui eux aussi alors donc mais si comme tout tous toute toutes meme").split(" ");

  function tokens(s) {
    return norm(s).split(" ").filter(function (t) { return t.length >= 4 && STOP.indexOf(t) === -1; });
  }

  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  function scrollDown() { el.body.scrollTop = el.body.scrollHeight; }

  /* Coupe un extrait à la fin d'une phrase : moins de texte à lire pour le modèle,
     donc premier mot affiché plus vite. */
  function shorten(text, max) {
    if (text.length <= max) return text;
    var cut = text.slice(0, max);
    var stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
    return (stop > max * 0.5 ? cut.slice(0, stop + 1) : cut.slice(0, max).trim() + "...");
  }

  /* ------------------------------------------------------------------
   * Sélection des règles (mode règles) et des sections (mode IA)
   * ------------------------------------------------------------------ */
  function scoreRules(question) {
    var q = norm(question);
    var out = [];
    DATA.rules.forEach(function (rule) {
      var score = 0;
      rule.keywords.forEach(function (k) {
        var kn = norm(k);
        if (kn && q.indexOf(kn) !== -1) score += kn.length; // les expressions longues pèsent plus lourd
      });
      if (score > 0) out.push({ rule: rule, score: score });
    });
    return out.sort(function (a, b) { return b.score - a.score; });
  }

  function bestRule(question) {
    var ranked = scoreRules(question);
    return ranked.length && ranked[0].score >= 3 ? ranked[0].rule : null;
  }

  /* Recherche des sections du portfolio les plus proches de la question.
     Les mots-clés des règles qui correspondent servent à élargir la requête. */
  function retrieve(question, limit) {
    var ranked = scoreRules(question).slice(0, 3);
    var words = tokens(question);
    ranked.forEach(function (r) {
      r.rule.keywords.forEach(function (k) {
        tokens(k).forEach(function (t) { if (words.indexOf(t) === -1) words.push(t); });
      });
    });
    if (!words.length) return [];

    var scored = DATA.knowledge.map(function (section) {
      var title = norm(section.title), text = norm(section.text), score = 0;
      words.forEach(function (w) {
        if (title.indexOf(w) !== -1) score += 4;
        var idx = text.indexOf(w);
        if (idx !== -1) score += text.indexOf(w, idx + 1) !== -1 ? 2 : 1;
      });
      return { section: section, score: score };
    }).filter(function (s) { return s.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });

    return scored.slice(0, limit || 2).map(function (s) { return s.section; });
  }

  /* ------------------------------------------------------------------
   * Rendu des messages
   * ------------------------------------------------------------------ */
  function actionRow(keys) {
    var row = document.createElement("div");
    row.className = "chat-actions";
    keys.forEach(function (key) {
      var l = LINKS[key];
      if (!l) return;
      var a = document.createElement("a");
      a.className = "chat-action " + (l.primary ? "primary" : "ghost");
      a.href = l.href;
      a.textContent = l.label;
      if (l.external) { a.target = "_blank"; a.rel = "noopener"; }
      row.appendChild(a);
    });
    return row;
  }

  function addMsg(role, text, opts) {
    opts = opts || {};
    var wrap = document.createElement("div");
    wrap.className = "chat-msg " + role;
    wrap.textContent = text;
    if (opts.source) {
      var src = document.createElement("div");
      src.className = "chat-source";
      src.textContent = opts.source;
      wrap.appendChild(src);
    }
    if (opts.links && opts.links.length) wrap.appendChild(actionRow(opts.links));
    el.body.appendChild(wrap);
    scrollDown();
    return wrap;
  }

  /* Bulle vide qui se remplit au fil de la génération */
  function addStreamBubble() {
    var wrap = document.createElement("div");
    wrap.className = "chat-msg bot chat-cursor";
    var span = document.createElement("span");
    wrap.appendChild(span);
    el.body.appendChild(wrap);
    scrollDown();
    return { wrap: wrap, span: span };
  }

  function addTyping() {
    var w = document.createElement("div");
    w.className = "chat-msg bot";
    w.innerHTML = '<div class="chat-typing"><i></i><i></i><i></i></div>';
    el.body.appendChild(w);
    scrollDown();
    return w;
  }

  function showSuggestions() {
    if (el.body.querySelector(".chat-chips")) return;
    var box = document.createElement("div");
    box.className = "chat-chips";
    DATA.suggestions.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chat-chip";
      b.textContent = s;
      b.addEventListener("click", function () { box.remove(); ask(s); });
      box.appendChild(b);
    });
    el.body.appendChild(box);
    scrollDown();
  }

  function wantsContact(question) {
    var q = norm(question);
    return CONTACT_WORDS.some(function (w) { return q.indexOf(norm(w)) !== -1; });
  }

  /* ------------------------------------------------------------------
   * Mode règles
   * ------------------------------------------------------------------ */
  function answerRules(question) {
    var rule = bestRule(question);
    if (rule) {
      addMsg("bot", rule.answer, { source: "Source : " + rule.source, links: rule.links || [] });
      return;
    }
    addMsg("bot", DATA.fallback.answer, { links: DATA.fallback.links });
  }

  /* ------------------------------------------------------------------
   * Mode IA
   * ------------------------------------------------------------------ */
  function webgpuAvailable() { return typeof navigator !== "undefined" && !!navigator.gpu; }

  function setLoadingNotice(progress, text) {
    if (!el.notice) {
      el.notice = document.createElement("div");
      el.notice.className = "chat-msg system";
      el.notice.innerHTML = '<div class="chat-load-text"></div><div class="chat-progress"><i></i></div>';
      el.body.appendChild(el.notice);
    }
    el.notice.querySelector(".chat-load-text").textContent = text;
    el.notice.querySelector(".chat-progress i").style.width = Math.round((progress || 0) * 100) + "%";
    scrollDown();
  }
  function clearNotice() { if (el.notice) { el.notice.remove(); el.notice = null; } }

  function loadWebLLM() {
    var i = 0;
    function attempt() {
      if (i >= MODELS.length) return Promise.reject(new Error("Import impossible"));
      return import(/* webpackIgnore: true */ MODELS[i++]).catch(attempt);
    }
    return attempt();
  }

  function modelLabel(model) { return model === CFG.modelFast ? "ultra-rapide" : "standard"; }

  function loadEngine() {
    if (state.engineStatus === "ready") return Promise.resolve(state.engine);
    if (state.loading) return state.loading;

    state.engineStatus = "loading";
    el.input.disabled = true;
    el.send.disabled = true;
    var cached = localStorage.getItem(STORE_CACHED) === state.model;
    setLoadingNotice(0, cached
      ? "Chargement du modèle depuis le cache du navigateur."
      : "Téléchargement du modèle (" + (state.model === CFG.modelFast ? CFG.modelFastSize : CFG.modelSize) + "), une seule fois.");

    state.loading = loadWebLLM()
      .then(function (webllm) {
        return webllm.CreateMLCEngine(state.model, {
          initProgressCallback: function (p) {
            setLoadingNotice(p && typeof p.progress === "number" ? p.progress : 0,
              cached ? "Chargement du modèle depuis le cache du navigateur."
                     : "Téléchargement du modèle (" + (state.model === CFG.modelFast ? CFG.modelFastSize : CFG.modelSize) + "), une seule fois.");
          }
        });
      })
      .then(function (engine) {
        state.engine = engine;
        state.engineStatus = "ready";
        localStorage.setItem(STORE_CACHED, state.model);
        clearNotice();
        el.input.disabled = false;
        el.send.disabled = false;
        return engine;
      })
      .catch(function (err) {
        console.warn("[chat] chargement du modèle impossible", err);
        state.engineStatus = "error";
        state.loading = null; // permet de réessayer après une coupure réseau
        clearNotice();
        addMsg("bot", "Le modèle local n'a pas pu être chargé. Le mode règles répond aux mêmes questions, instantanément.", { links: ["cal", "email"] });
        setMode("rules");
        return null;
      });
    return state.loading;
  }

  function answerAI(question) {
    var sections = retrieve(question, 2);
    if (!sections.length) {
      addMsg("bot", REFUS, { links: ["email", "cal"] });
      return Promise.resolve();
    }

    var context = sections.map(function (s) {
      return "[" + s.title + "] " + shorten(s.text, 420);
    }).join("\n\n");

    var system = "Tu es l'assistant du portfolio d'Evan Rouzaud, freelance en IA appliquée : cadrage, pilotage et " +
      "développement de projets IA. Réponds uniquement avec les informations des extraits fournis, jamais avec tes " +
      "connaissances générales. En français, 2 phrases maximum, ton sobre et concret, aucun chiffre inventé. Termine " +
      "par la source entre parenthèses, par exemple (selon la section Tarifs). Si les extraits ne suffisent pas, " +
      "réponds exactement : \"" + REFUS + "\"";

    var messages = [
      { role: "system", content: system },
      { role: "user", content: "Extraits du portfolio :\n\n" + context + "\n\nQuestion du visiteur : " + question }
    ];

    var bubble = addStreamBubble();
    var text = "";

    // Historique remis à zéro : sans cela le contexte grossit à chaque question et le
    // moteur ralentit progressivement.
    return Promise.resolve()
      .then(function () {
        if (state.engine && typeof state.engine.resetChat === "function") return state.engine.resetChat();
      })
      .then(function () {
        return state.engine.chat.completions.create({
          messages: messages,
          temperature: 0.2,
          max_tokens: 120,
          stream: true
        });
      })
      .then(function (chunks) {
        return (async function () {
          for await (var chunk of chunks) {
            var choice = chunk.choices && chunk.choices[0];
            var delta = choice && choice.delta && choice.delta.content;
            if (delta) { text += delta; bubble.span.textContent = text; scrollDown(); }
          }
        })();
      })
      .then(function () {
        bubble.wrap.classList.remove("chat-cursor");
        if (!text.trim()) bubble.span.textContent = REFUS;
        var src = document.createElement("div");
        src.className = "chat-source";
        src.textContent = "Sections consultées : " + sections.map(function (s) { return s.title; }).join(", ");
        bubble.wrap.appendChild(src);
        if (wantsContact(question)) bubble.wrap.appendChild(actionRow(["cal", "email"]));
        scrollDown();
      })
      .catch(function (err) {
        console.warn("[chat] génération impossible", err);
        bubble.wrap.classList.remove("chat-cursor");
        if (!text.trim()) {
          bubble.span.textContent = "La génération locale a échoué. Réessayez, ou passez en mode règles qui répond instantanément.";
          bubble.wrap.appendChild(actionRow(["cal", "email"]));
        }
      });
  }

  /* ------------------------------------------------------------------
   * Envoi d'une question
   * ------------------------------------------------------------------ */
  function ask(question) {
    question = (question || "").trim();
    if (!question || state.busy) return;
    clearNotice();
    addMsg("user", question);
    el.input.value = "";

    if (state.mode === "rules") { answerRules(question); return; }

    if (state.engineStatus === "unsupported") {
      addMsg("bot", "Ce navigateur ne prend pas en charge WebGPU : le mode IA ne peut pas tourner ici. Le mode règles répond aux mêmes questions.", { links: ["cal", "email"] });
      return;
    }
    state.busy = true;
    el.send.disabled = true;
    loadEngine().then(function (engine) {
      var done = function () { state.busy = false; el.send.disabled = false; el.input.focus(); };
      if (!engine) { done(); answerRules(question); return; }
      answerAI(question).then(done);
    });
  }

  /* ------------------------------------------------------------------
   * Bascule de mode : un seul endroit dans l'interface, en haut de la fenêtre
   * ------------------------------------------------------------------ */
  function refreshModeUI() {
    var isRules = state.mode === "rules";
    el.modeRules.setAttribute("aria-pressed", String(isRules));
    el.modeAI.setAttribute("aria-pressed", String(!isRules));
  }

  function setMode(mode) {
    state.mode = mode === "ai" ? "ai" : "rules";
    localStorage.setItem(STORE_MODE, state.mode);
    refreshModeUI();
  }

  function askModelChoice() {
    var box = document.createElement("div");
    box.className = "chat-msg bot";
    var p = document.createElement("div");
    p.textContent = "Le mode IA télécharge un petit modèle, une seule fois, et le fait tourner sur votre machine. Rien n'est envoyé à un serveur.";
    box.appendChild(p);

    var row = document.createElement("div");
    row.className = "chat-actions";

    var standard = document.createElement("button");
    standard.type = "button";
    standard.className = "chat-action primary";
    standard.textContent = "Activer (" + CFG.modelSize + ")";
    standard.addEventListener("click", function () { box.remove(); startModel(CFG.model); });

    var fast = document.createElement("button");
    fast.type = "button";
    fast.className = "chat-action ghost";
    fast.textContent = "Version ultra-rapide (" + CFG.modelFastSize + ")";
    fast.addEventListener("click", function () { box.remove(); startModel(CFG.modelFast); });

    row.appendChild(standard);
    row.appendChild(fast);
    box.appendChild(row);
    el.body.appendChild(box);
    scrollDown();
  }

  function startModel(model) {
    state.model = model;
    localStorage.setItem(STORE_MODEL, model);
    loadEngine().then(function () { el.input.focus(); });
  }

  function switchToAI() {
    setMode("ai");
    if (!webgpuAvailable()) {
      state.engineStatus = "unsupported";
      addMsg("bot", "Ce navigateur ne prend pas en charge WebGPU : le mode IA ne peut pas tourner ici. Le mode règles répond aux mêmes questions.", { links: ["cal", "email"] });
      setMode("rules");
      return;
    }
    if (state.engineStatus === "ready" || state.engineStatus === "loading") return;
    // Modèle déjà téléchargé lors d'une visite précédente : on charge sans redemander.
    if (localStorage.getItem(STORE_CACHED) === state.model) { loadEngine(); return; }
    askModelChoice();
  }

  /* ------------------------------------------------------------------
   * Construction de l'interface
   * ------------------------------------------------------------------ */
  function build() {
    var panel = document.createElement("div");
    panel.className = "chat-panel";
    panel.id = "chat-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-labelledby", "chat-title");
    panel.innerHTML = [
      '<div class="chat-head">',
      '  <span class="chat-title" id="chat-title">Assistant du portfolio</span>',
      '  <div class="chat-modes" role="group" aria-label="Mode de réponse">',
      '    <button type="button" class="chat-mode" id="chat-mode-rules" aria-pressed="true">Règles</button>',
      '    <button type="button" class="chat-mode" id="chat-mode-ai" aria-pressed="false">IA locale</button>',
      '  </div>',
      '  <button type="button" class="chat-close" id="chat-close" aria-label="Fermer le chat">&#10005;</button>',
      '</div>',
      '<div class="chat-body" id="chat-body" role="log" aria-live="polite" aria-relevant="additions text"></div>',
      '<div class="chat-foot">',
      '  <form class="chat-form" id="chat-form">',
      '    <label for="chat-input" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Votre question</label>',
      '    <input class="chat-input" id="chat-input" type="text" autocomplete="off" placeholder="' + esc(DATA.placeholder) + '">',
      '    <button class="chat-send" id="chat-send" type="submit" aria-label="Envoyer la question">',
      '      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 20.5 21 12 3 3.5 3 10l12 2-12 2z"/></svg>',
      '    </button>',
      '  </form>',
      '  <p class="chat-legal">Mode IA : le modèle est exécuté dans votre navigateur, rien n\'est envoyé à un serveur.</p>',
      '</div>'
    ].join("");

    el.panel = panel;
    el.body = panel.querySelector("#chat-body");
    el.input = panel.querySelector("#chat-input");
    el.send = panel.querySelector("#chat-send");
    el.modeRules = panel.querySelector("#chat-mode-rules");
    el.modeAI = panel.querySelector("#chat-mode-ai");
    el.close = panel.querySelector("#chat-close");

    document.body.appendChild(panel);

    panel.querySelector("#chat-form").addEventListener("submit", function (e) {
      e.preventDefault();
      ask(el.input.value);
    });
    el.modeRules.addEventListener("click", function () { setMode("rules"); el.input.focus(); });
    el.modeAI.addEventListener("click", switchToAI);
    el.close.addEventListener("click", close);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && state.opened) close();
    });
  }

  /* ------------------------------------------------------------------
   * Ouverture / fermeture
   * ------------------------------------------------------------------ */
  function open(question) {
    if (!state.opened) {
      state.opened = true;
      el.panel.classList.add("open");
      el.launcher.setAttribute("aria-expanded", "true");
      if (!el.body.childElementCount) {
        addMsg("bot", DATA.intro);
        showSuggestions();
      }
    }
    refreshModeUI();
    if (question) ask(question); else el.input.focus();
  }

  function close() {
    state.opened = false;
    el.panel.classList.remove("open");
    el.launcher.setAttribute("aria-expanded", "false");
    el.launcher.focus();
  }

  /* ------------------------------------------------------------------
   * Démarrage
   * ------------------------------------------------------------------ */
  function init() {
    el.launcher = document.getElementById("chat-launcher");
    if (!el.launcher) return;
    build();
    refreshModeUI();
    el.launcher.setAttribute("aria-expanded", "false");
    el.launcher.setAttribute("aria-controls", "chat-panel");
    el.launcher.addEventListener("click", function () {
      if (state.opened) close(); else open();
    });

    window.openChatAssistant = open;

    // Un clic sur un bouton de la page (section Assistant) doit aussi ouvrir la fenêtre,
    // et poser directement la question proposée si le bouton en contient une.
    if (el.launcher.dataset.pendingOpen) {
      var pending = el.launcher.dataset.pendingOpen;
      delete el.launcher.dataset.pendingOpen;
      open(pending === "1" ? null : pending);
    }
    window.__chatReady = true;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

/*
 * Chatbot du portfolio : deux modes.
 *
 * MODE RÈGLES : analyse des mots-clés de la question, réponse préparée (chat-data.js).
 *   Aucun réseau, aucune dépendance, réponse instantanée.
 *
 * MODE IA : petit modèle de langage exécuté dans le navigateur du visiteur via WebGPU
 *   et la bibliothèque WebLLM. Aucun serveur, aucune clé API, aucun coût.
 *   Le modèle est téléchargé au premier lancement puis mis en cache par le navigateur.
 *
 * Choix d'architecture (le plus simple qui fonctionne sur GitHub Pages) :
 *   - une recherche par mots-clés joue le rôle de routeur : elle sélectionne les sections
 *     du portfolio pertinentes. Le modèle ne répond qu'à partir de ces extraits, ce qui
 *     limite fortement les réponses inventées. C'est volontairement une version miniature
 *     de ce que fait un RAG, cohérente avec le discours du site.
 *   - WebLLM est importé dynamiquement (import()), uniquement quand le visiteur choisit
 *     le mode IA : le chargement initial de la page n'est pas alourdi.
 *   - Aucun historique de conversation n'est envoyé au modèle : chaque question est
 *     traitée indépendamment, ce qui rend les réponses reproductibles.
 */

(function () {
  "use strict";

  var DATA = window.CHAT_DATA;
  if (!DATA) { console.warn("[chat] chat-data.js manquant"); return; }

  var CFG = DATA.config;
  var STORE_MODE = "chat-mode";
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

  var el = {};                 // éléments du DOM
  var history = [];            // questions déjà posées (pour les suggestions)
  var state = {
    mode: localStorage.getItem(STORE_MODE) === "ai" ? "ai" : "rules",
    engine: null,
    engineStatus: "idle",      // idle | loading | ready | unsupported | error
    busy: false,
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

  /*
   * Recherche des sections du portfolio les plus proches de la question.
   * Les mots-clés des règles qui correspondent servent à élargir la requête
   * (si le visiteur écrit "combien ça coûte", les mots-clés de la règle
   * "tarifs" apportent "budget", "forfait", "journée", etc.).
   */
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
        if (idx !== -1) score += text.indexOf(w, idx + 1) !== -1 ? 2 : 1; // terme présent deux fois : plus pertinent
      });
      return { section: section, score: score };
    }).filter(function (s) { return s.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });

    return scored.slice(0, limit || 3).map(function (s) { return s.section; });
  }

  /* ------------------------------------------------------------------
   * Rendu des messages
   * ------------------------------------------------------------------ */
  function addMsg(role, text, opts) {
    opts = opts || {};
    var wrap = document.createElement("div");
    wrap.className = "chat-msg " + role;
    if (role === "bot" && opts.html) wrap.innerHTML = text; else wrap.textContent = text;

    if (opts.source) {
      var src = document.createElement("div");
      src.className = "chat-source";
      src.textContent = opts.source;
      wrap.appendChild(src);
    }
    if (opts.links && opts.links.length) {
      var row = document.createElement("div");
      row.className = "chat-actions";
      opts.links.forEach(function (key) {
        var l = LINKS[key];
        if (!l) return;
        var a = document.createElement("a");
        a.className = "chat-action " + (l.primary ? "primary" : "ghost");
        a.href = l.href;
        a.textContent = l.label;
        if (l.external) { a.target = "_blank"; a.rel = "noopener"; }
        row.appendChild(a);
      });
      wrap.appendChild(row);
    }
    el.body.appendChild(wrap);
    scrollDown();
    return wrap;
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

  function showSystem(text) {
    var d = document.createElement("div");
    d.className = "chat-msg system";
    d.textContent = text;
    el.body.appendChild(d);
    scrollDown();
    return d;
  }

  /* ------------------------------------------------------------------
   * Mode règles
   * ------------------------------------------------------------------ */
  function answerRules(question) {
    var rule = bestRule(question);
    var links;
    if (rule) {
      links = (rule.links || []).slice();
      addMsg("bot", rule.answer, { source: "Source : " + rule.source, links: links });
    } else {
      addMsg("bot", DATA.fallback.answer, { links: DATA.fallback.links });
    }
    if (wantsContact(question) && (!links || links.indexOf("cal") === -1)) {
      addMsg("bot", "Pour avancer, rien de plus simple : un créneau de 30 minutes dans l'agenda, ou un e-mail si vous préférez écrire.", { links: ["cal", "email"] });
    }
  }

  function wantsContact(question) {
    var q = norm(question);
    return CONTACT_WORDS.some(function (w) { return q.indexOf(norm(w)) !== -1; });
  }

  /* ------------------------------------------------------------------
   * Mode IA
   * ------------------------------------------------------------------ */
  function webgpuAvailable() {
    return typeof navigator !== "undefined" && !!navigator.gpu;
  }

  function setEngineNotice(html, progress) {
    if (!el.notice) {
      el.notice = document.createElement("div");
      el.notice.className = "chat-msg system";
      el.body.appendChild(el.notice);
    }
    el.notice.innerHTML = html + (progress == null ? "" :
      '<div class="chat-progress"><i style="width:' + Math.round(progress * 100) + '%"></i></div>');
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

  function loadEngine() {
    if (state.engineStatus === "ready") return Promise.resolve(state.engine);
    if (state.loading) return state.loading;

    state.engineStatus = "loading";
    el.input.disabled = true;
    el.send.disabled = true;
    var cached = localStorage.getItem(STORE_CACHED) === "1";
    setEngineNotice(cached
      ? "Chargement du modèle depuis le cache de votre navigateur."
      : "Téléchargement du modèle " + CFG.model + " (" + CFG.modelSize + "). Il sera mis en cache par votre navigateur.", 0);

    state.loading = loadWebLLM()
      .then(function (webllm) {
        return webllm.CreateMLCEngine(CFG.model, {
          initProgressCallback: function (p) {
            setEngineNotice(cached ? "Chargement du modèle depuis le cache." : "Téléchargement du modèle (" + CFG.modelSize + ").",
              typeof p.progress === "number" ? p.progress : 0);
          }
        });
      })
      .then(function (engine) {
        state.engine = engine;
        state.engineStatus = "ready";
        localStorage.setItem(STORE_CACHED, "1");
        clearNotice();
        el.input.disabled = false;
        el.send.disabled = false;
        showSystem("Mode IA activé. Le modèle tourne sur votre machine : aucune donnée ne quitte votre navigateur.");
        return engine;
      })
      .catch(function (err) {
        console.warn("[chat] chargement du modèle impossible", err);
        state.engineStatus = "error";
        state.loading = null; // permet de réessayer (par exemple après une coupure réseau)
        clearNotice();
        showSystem("Le modèle local n'a pas pu être chargé (réseau ou mémoire insuffisante). Le mode règles reste disponible et répond aux mêmes sujets.");
        setMode("rules");
        return null;
      });
    return state.loading;
  }

  function answerAI(question) {
    var sections = retrieve(question, 3);
    if (!sections.length) {
      addMsg("bot", REFUS, { links: ["email", "cal"] });
      return Promise.resolve();
    }

    var context = sections.map(function (s) {
      return "[Section " + s.title + "]\n" + s.text;
    }).join("\n\n");

    var system = "Tu es l'assistant du portfolio d'Evan Rouzaud, freelance en IA appliquée : cadrage, pilotage et développement de projets IA. " +
      "Tu réponds UNIQUEMENT à partir des extraits fournis, jamais depuis tes connaissances générales. " +
      "Règles : réponds en français, 3 phrases maximum, ton sobre et concret, pas de promesse ni de chiffre inventé. " +
      "Cite la section utilisée à la fin, entre parenthèses, sous la forme (selon la section Tarifs). " +
      "Si les extraits ne permettent pas de répondre, réponds exactement : \"" + REFUS + "\"";

    var user = "Extraits du portfolio :\n\n" + context + "\n\nQuestion du visiteur : " + question;

    var typing = addTyping();
    return state.engine.chat.completions.create({
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.2,
      max_tokens: 260,
      stream: false
    }).then(function (reply) {
      typing.remove();
      var text = (reply.choices && reply.choices[0] && reply.choices[0].message.content || "").trim();
      if (!text) text = REFUS;
      var links = wantsContact(question) ? ["cal", "email"] : [];
      addMsg("bot", text, { source: "Sections consultées : " + sections.map(function (s) { return s.title; }).join(", "), links: links });
    }).catch(function (err) {
      typing.remove();
      console.warn("[chat] génération impossible", err);
      addMsg("bot", "La génération locale a échoué. Vous pouvez réessayer, ou basculer en mode règles qui répond instantanément.", { links: ["cal", "email"] });
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
    history.push(question);

    if (state.mode === "rules") { answerRules(question); return; }

    if (state.engineStatus === "unsupported") {
      addMsg("bot", "Ce navigateur ne prend pas en charge WebGPU, nécessaire pour faire tourner le modèle en local. Le mode règles répond aux mêmes questions, instantanément.", { links: ["cal", "email"] });
      return;
    }
    state.busy = true;
    el.send.disabled = true;
    loadEngine().then(function (engine) {
      if (!engine) { state.busy = false; el.send.disabled = false; return answerRules(question); }
      return answerAI(question).then(function () {
        state.busy = false;
        el.send.disabled = false;
        el.input.focus();
      });
    });
  }

  /* ------------------------------------------------------------------
   * Bascule entre les deux modes
   * ------------------------------------------------------------------ */
  function refreshModeUI() {
    var isRules = state.mode === "rules";
    el.modeRules.setAttribute("aria-pressed", String(isRules));
    el.modeAI.setAttribute("aria-pressed", String(!isRules));
    el.hint.innerHTML = isRules
      ? "<strong>Mode règles.</strong> Réponses préparées, instantanées, sans téléchargement."
      : "<strong>Mode IA.</strong> Un petit modèle de langage tourne sur votre machine (WebGPU). Plus riche, mais le premier lancement télécharge " + CFG.modelSize + ".";
  }

  function setMode(mode) {
    state.mode = mode === "ai" ? "ai" : "rules";
    localStorage.setItem(STORE_MODE, state.mode);
    refreshModeUI();
  }

  function switchToAI() {
    setMode("ai");
    if (!webgpuAvailable()) {
      state.engineStatus = "unsupported";
      showSystem("Ce navigateur ne prend pas en charge WebGPU. Le mode IA nécessite Chrome, Edge ou un navigateur récent sur ordinateur. Le mode règles reste disponible et répond aux mêmes sujets.");
      setMode("rules");
      return;
    }
    if (state.engineStatus === "ready") {
      showSystem("Mode IA déjà chargé.");
      return;
    }
    var confirmBox = document.createElement("div");
    confirmBox.className = "chat-msg bot";
    confirmBox.innerHTML = "<div>Le mode IA télécharge un modèle de " + esc(CFG.modelSize) +
      " et le fait tourner <strong>sur votre machine</strong>, via WebGPU. Aucune donnée n'est envoyée à un serveur.</div>";
    var row = document.createElement("div");
    row.className = "chat-actions";
    var go = document.createElement("button");
    go.type = "button"; go.className = "chat-action primary"; go.textContent = "Télécharger et activer";
    var no = document.createElement("button");
    no.type = "button"; no.className = "chat-action ghost"; no.textContent = "Rester en mode règles";
    go.addEventListener("click", function () {
      confirmBox.remove();
      loadEngine().then(function (engine) { if (engine) el.input.focus(); });
    });
    no.addEventListener("click", function () { confirmBox.remove(); setMode("rules"); });
    row.appendChild(go); row.appendChild(no);
    confirmBox.appendChild(row);
    el.body.appendChild(confirmBox);
    scrollDown();
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
      '  <div class="chat-head-top">',
      '    <div class="chat-title" id="chat-title">Assistant du portfolio<small>Evan Rouzaud, freelance en IA appliquée</small></div>',
      '    <button type="button" class="chat-close" id="chat-close" aria-label="Fermer le chat">&#10005;</button>',
      '  </div>',
      '  <div class="chat-modes" role="group" aria-label="Mode de réponse du chatbot">',
      '    <button type="button" class="chat-mode" id="chat-mode-rules" aria-pressed="true">Mode règles</button>',
      '    <button type="button" class="chat-mode" id="chat-mode-ai" aria-pressed="false">Mode IA locale</button>',
      '  </div>',
      '  <p class="chat-hint" id="chat-hint"></p>',
      '</div>',
      '<div class="chat-body" id="chat-body" role="log" aria-live="polite" aria-relevant="additions text"></div>',
      '<div class="chat-foot">',
      '  <form class="chat-form" id="chat-form">',
      '    <label for="chat-input" class="sr-only" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Votre question</label>',
      '    <input class="chat-input" id="chat-input" type="text" autocomplete="off" placeholder="' + esc(DATA.placeholder) + '">',
      '    <button class="chat-send" id="chat-send" type="submit" aria-label="Envoyer la question">',
      '      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 20.5 21 12 3 3.5 3 10l12 2-12 2z"/></svg>',
      '    </button>',
      '  </form>',
      '  <p class="chat-legal">Mode IA : le modèle est exécuté dans votre navigateur, rien n\'est envoyé à un serveur. ',
      '  <a href="' + CFG.calUrl + '" target="_blank" rel="noopener">Réserver un appel</a> ou ',
      '  <a href="mailto:' + CFG.email + '">écrire un e-mail</a>.</p>',
      '</div>'
    ].join("");

    el.panel = panel;
    el.body = panel.querySelector("#chat-body");
    el.input = panel.querySelector("#chat-input");
    el.send = panel.querySelector("#chat-send");
    el.hint = panel.querySelector("#chat-hint");
    el.modeRules = panel.querySelector("#chat-mode-rules");
    el.modeAI = panel.querySelector("#chat-mode-ai");
    el.close = panel.querySelector("#chat-close");

    document.body.appendChild(panel);

    panel.querySelector("#chat-form").addEventListener("submit", function (e) {
      e.preventDefault();
      ask(el.input.value);
    });
    el.modeRules.addEventListener("click", function () { setMode("rules"); showSystem("Mode règles activé : réponses préparées et instantanées."); });
    el.modeAI.addEventListener("click", switchToAI);
    el.close.addEventListener("click", close);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && state.opened) close();
    });
  }

  /* ------------------------------------------------------------------
   * Ouverture / fermeture
   * ------------------------------------------------------------------ */
  function open() {
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
    el.input.focus();
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
    // Le clic qui a déclenché le chargement des fichiers doit aussi ouvrir le chat.
    if (el.launcher.dataset.pendingOpen === "1") { delete el.launcher.dataset.pendingOpen; open(); }
    window.__chatReady = true;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

/*
 * Chatbot du portfolio : deux modes, expliqués dans l'interface.
 *
 * MODE RÈGLES : les mots-clés de la question sont comparés au catalogue de réponses
 *   préparées (chat-data.js). Réponse immédiate, aucun réseau, aucune dépendance.
 *
 * MODE IA LOCALE : un petit modèle de langage tourne dans le navigateur du visiteur
 *   (WebGPU + WebLLM). Aucun serveur, aucune clé API, aucun coût.
 *
 * Principe de fonctionnement du mode IA, volontairement simple et robuste :
 *   1. les règles servent de routeur et fournissent une RÉPONSE OFFICIELLE, déjà juste ;
 *   2. deux sections de connaissances viennent la compléter ;
 *   3. le modèle a pour seule mission de REFORMULER cette réponse officielle.
 * C'est ce qui évite les refus à tort : on ne demande jamais au modèle de décider s'il
 * sait répondre, puisque la réponse est préparée en amont. S'il n'y a aucune matière,
 * le refus est rédigé par le site, sans faire tourner le modèle.
 *
 * Vitesse : réponse en flux (streaming), contexte court (deux extraits de 420 caractères),
 * resetChat() avant chaque question pour que l'historique ne s'accumule pas, et
 * max_tokens limité à 120.
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
  var REFUS_RE = /uniquement (a|à) partir de ce portfolio/i;

  var MODELS = [
    "https://esm.run/@mlc-ai/web-llm@0.2.85",
    "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.85/+esm"
  ];

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

  /* Questions proposées quand aucune règle ne correspond */
  var TOPICS = [
    { label: "Tarifs", question: "Quels sont vos tarifs ?" },
    { label: "Disponibilité", question: "Êtes-vous disponible ?" },
    { label: "Méthode et pilotage", question: "Comment travaillez-vous ?" },
    { label: "Projets", question: "Sur quels projets avez-vous travaillé ?" },
    { label: "Compétences", question: "Quelles sont vos compétences techniques ?" },
    { label: "IA locale et données", question: "Comment gérez-vous les données sensibles ?" },
    { label: "Profil hybride", question: "Vous cherchez un profil technique ou un chef de projet ?" }
  ];

  var CONTACT_WORDS = ["rendez", "rdv", "appel", "appeler", "reserv", "réserv", "creneau", "créneau", "contact", "devis", "discuter", "parler", "echang", "échange", "cal.com"];

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
   * Normalisation et correspondance
   * ------------------------------------------------------------------ */
  function norm(s) {
    return (s || "").toString().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9' ]+/g, " ")
      .replace(/\s+/g, " ").trim();
  }

  /* Réduit les pluriels, pour que "tarif" et "tarifs" se répondent entre eux.
     Appliqué des deux côtés de la comparaison. On ne retire qu'un "s" ou un "x" final :
     retirer "es" transformerait "centres" en "centr" et casserait la correspondance.
     Seuil à 5 lettres pour ne pas toucher aux mots courts ("mois" ne doit pas devenir "moi"). */
  function fold(s) {
    return norm(s).split(" ").map(function (w) {
      return w.length > 4 ? w.replace(/(s|x)$/, "") : w;
    }).join(" ");
  }

  var STOP = ("le la les un une des du de d a au aux et ou est sont etre avoir je tu il elle on nous vous ils elles " +
    "que qui quoi dont quand comment pourquoi quel quelle quels quelles ce cet cette ces mon ma mes ton ta tes son sa ses " +
    "votre vos leur leurs pour par sur dans avec sans plus moins tres peu bien fait faire peux peut pouvez pouvoir veux vouloir " +
    "y en se ne pas oui non moi toi lui eux aussi alors donc mais si comme tout tous toute toutes meme").split(" ");

  function tokens(s) {
    return fold(s).split(" ").filter(function (t) { return t.length >= 4 && STOP.indexOf(t) === -1; });
  }

  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  function scrollDown() { el.body.scrollTop = el.body.scrollHeight; }

  function shorten(text, max) {
    if (text.length <= max) return text;
    var cut = text.slice(0, max);
    var stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
    return (stop > max * 0.5 ? cut.slice(0, stop + 1) : cut.slice(0, max).trim() + "...");
  }

  /* ------------------------------------------------------------------
   * Routeur : règles et sections
   * ------------------------------------------------------------------ */
  function scoreRules(question) {
    var q = fold(question);
    var out = [];
    DATA.rules.forEach(function (rule) {
      var score = 0;
      var seen = {}; // un même mot-clé ne compte qu'une fois, même écrit au singulier et au pluriel
      rule.keywords.forEach(function (k) {
        var kn = fold(k);
        if (!kn || seen[kn]) return;
        if (q.indexOf(kn) !== -1) { seen[kn] = 1; score += kn.length; }
      });
      if (score > 0) out.push({ rule: rule, score: score });
    });
    return out.sort(function (a, b) { return b.score - a.score; });
  }

  function bestRule(question) {
    var ranked = scoreRules(question);
    return ranked.length && ranked[0].score >= 3 ? ranked[0].rule : null;
  }

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
      var title = fold(section.title), text = fold(section.text), score = 0;
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

  function wantsContact(question) {
    var q = fold(question);
    return CONTACT_WORDS.some(function (w) { return q.indexOf(fold(w)) !== -1; });
  }

  /* ------------------------------------------------------------------
   * Rendu
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

  /* Suggestions cliquables (menu de secours ou suggestions d'accueil) */
  function topicRow(topics) {
    var box = document.createElement("div");
    box.className = "chat-chips";
    topics.forEach(function (t) {
      var label = typeof t === "string" ? t : t.label;
      var question = typeof t === "string" ? t : t.question;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chat-chip";
      b.textContent = label;
      b.addEventListener("click", function () { box.remove(); ask(question); });
      box.appendChild(b);
    });
    return box;
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
    if (opts.chips && opts.chips.length) wrap.appendChild(topicRow(opts.chips));
    el.thread.appendChild(wrap);
    scrollDown();
    return wrap;
  }

  function addStreamBubble() {
    var wrap = document.createElement("div");
    wrap.className = "chat-msg bot chat-cursor";
    var span = document.createElement("span");
    wrap.appendChild(span);
    el.thread.appendChild(wrap);
    scrollDown();
    return { wrap: wrap, span: span };
  }

  function addTyping() {
    var w = document.createElement("div");
    w.className = "chat-msg bot";
    w.innerHTML = '<div class="chat-typing"><i></i><i></i><i></i></div>';
    el.thread.appendChild(w);
    scrollDown();
    return w;
  }

  /* ------------------------------------------------------------------
   * Mode règles
   * ------------------------------------------------------------------ */
  function answerRules(question) {
    var rule = bestRule(question);
    if (rule) {
      addMsg("bot", rule.answer, {
        source: rule.source && !rule.hideSource ? "Source : " + rule.source : "",
        links: rule.links || []
      });
      return;
    }
    addMsg("bot", DATA.fallback.answer, { links: DATA.fallback.links, chips: TOPICS.slice(0, 5) });
  }

  /* ------------------------------------------------------------------
   * Mode IA locale
   * ------------------------------------------------------------------ */
  function webgpuAvailable() { return typeof navigator !== "undefined" && !!navigator.gpu; }

  function setLoadingNotice(progress, text) {
    if (!el.notice) {
      el.notice = document.createElement("div");
      el.notice.className = "chat-msg system";
      el.notice.innerHTML = '<div class="chat-load-text"></div><div class="chat-progress"><i></i></div>';
      el.thread.appendChild(el.notice);
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

  function modelSize(model) { return model === CFG.modelFast ? CFG.modelFastSize : CFG.modelSize; }

  function loadEngine() {
    if (state.engineStatus === "ready") return Promise.resolve(state.engine);
    if (state.loading) return state.loading;

    state.engineStatus = "loading";
    el.input.disabled = true;
    el.send.disabled = true;
    var cached = localStorage.getItem(STORE_CACHED) === state.model;
    setLoadingNotice(0, cached ? "Chargement du modèle depuis le cache du navigateur."
                              : "Téléchargement du modèle (" + modelSize(state.model) + "), une seule fois.");

    state.loading = loadWebLLM()
      .then(function (webllm) {
        return webllm.CreateMLCEngine(state.model, {
          initProgressCallback: function (p) {
            setLoadingNotice(p && typeof p.progress === "number" ? p.progress : 0,
              cached ? "Chargement du modèle depuis le cache du navigateur."
                     : "Téléchargement du modèle (" + modelSize(state.model) + "), une seule fois.");
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
        state.loading = null;
        clearNotice();
        addMsg("bot", "Le modèle local n'a pas pu être chargé. Le mode règles répond aux mêmes questions, instantanément.", { links: ["cal", "email"] });
        setMode("rules");
        return null;
      });
    return state.loading;
  }

  function answerAI(question) {
    var rule = bestRule(question);
    var sections = retrieve(question, 2);

    // Aucune matière : le site rédige le refus, sans faire tourner le modèle.
    if (!rule && !sections.length) {
      addMsg("bot", REFUS, { links: ["email", "cal"], chips: TOPICS.slice(0, 5) });
      return Promise.resolve();
    }

    var official = rule ? rule.answer : shorten(sections[0].text, 420);
    var extra = sections.map(function (s) { return "[" + s.title + "] " + shorten(s.text, 380); }).join("\n");

    var system = "Tu es le portfolio interactif d'Evan Rouzaud, freelance en IA appliquée (cadrage, pilotage et " +
      "développement de projets IA). Tu reformules pour le visiteur la réponse officielle fournie. " +
      "Utilise uniquement les informations de la réponse officielle et du complément, n'ajoute aucun chiffre, " +
      "aucune promesse, aucune information extérieure. Réponds en français, deux phrases maximum, ton sobre et naturel, " +
      "sans jamais parler à la première personne. Termine par la source entre parenthèses, par exemple (selon la section Tarifs).";

    var messages = [
      { role: "system", content: system },
      { role: "user", content: "Réponse officielle :\n" + official + "\n\nComplément :\n" + extra + "\n\nQuestion du visiteur : " + question }
    ];

    var bubble = addStreamBubble();
    var text = "";
    // Pas de mention de source pour les questions où elle n'a pas de sens (voir hideSource).
    var source = (rule && rule.hideSource) ? "" : (rule ? "Source : " + rule.source : "Source : " + sections[0].title);

    return Promise.resolve()
      .then(function () {
        if (state.engine && typeof state.engine.resetChat === "function") return state.engine.resetChat();
      })
      .then(function () {
        return state.engine.chat.completions.create({
          messages: messages,
          temperature: 0.25,
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
        // Filet de sécurité : si le modèle a refusé ou n'a rien produit alors que la
        // réponse officielle existe, on affiche la réponse officielle telle quelle.
        if (!text.trim() || REFUS_RE.test(text) || text.trim().length < 12) {
          text = official;
          bubble.span.textContent = text;
        }
        if (source) {
          var src = document.createElement("div");
          src.className = "chat-source";
          src.textContent = source;
          bubble.wrap.appendChild(src);
        }
        if (wantsContact(question)) bubble.wrap.appendChild(actionRow(["cal", "email"]));
        scrollDown();
      })
      .catch(function (err) {
        console.warn("[chat] génération impossible", err);
        bubble.wrap.classList.remove("chat-cursor");
        bubble.span.textContent = official;
        if (source) {
          var src2 = document.createElement("div");
          src2.className = "chat-source";
          src2.textContent = source;
          bubble.wrap.appendChild(src2);
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
   * Bascule de mode
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
    el.thread.appendChild(box);
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
    if (localStorage.getItem(STORE_CACHED) === state.model) { loadEngine(); return; }
    askModelChoice();
  }

  /* ------------------------------------------------------------------
   * Interface
   *
   * Page plein écran, posée au-dessus du portfolio : c'est elle qui s'ouvre depuis le
   * coin bas-droit (transform + opacity, voir chat.css). Le portfolio ne bouge pas.
   * Fermeture par le même bouton de coin, ou par Echap.
   * ------------------------------------------------------------------ */
  function build() {
    var M = DATA.modes;
    var page = document.createElement("section");
    page.className = "chat-page";
    page.id = "chat-page";
    page.setAttribute("role", "dialog");
    page.setAttribute("aria-modal", "true");
    page.setAttribute("aria-labelledby", "chat-title");
    page.setAttribute("aria-hidden", "true");
    page.setAttribute("inert", "");

    // Une option du sélecteur : le bouton, la pastille "?" et son infobulle.
    // L'infobulle contient l'explication du mode : c'est là que vivent les explications.
    var opt = function (which, label) {
      return '<div class="mode-opt">' +
        '<button type="button" class="chat-mode" id="chat-mode-' + which + '" aria-pressed="' +
        (which === "rules" ? "true" : "false") + '">' + label + '</button>' +
        '<span class="q" aria-hidden="true">?</span>' +
        '<span class="mode-tip" role="tooltip"><b>' + esc(M[which].title) + '</b>' + esc(M[which].tip) + '</span>' +
        '</div>';
    };

    page.innerHTML = [
      // Barre du haut : titre discret à gauche, sélecteur de mode collé au coin droit.
      '<header class="chat-head">',
      '  <span class="chat-title" id="chat-title">Portfolio interactif</span>',
      '  <div class="chat-modes" role="group" aria-label="Mode de réponse">',
      opt("rules", "Règle"),
      opt("ai", "IA locale"),
      '  </div>',
      '</header>',

      // L'historique occupe toute la place entre la barre du haut et la saisie.
      '<div class="chat-body" id="chat-body" role="log" aria-live="polite" aria-relevant="additions text">',
      '  <div class="chat-thread" id="chat-thread"></div>',
      '</div>',

      // Saisie, collée au bas de l'écran, avec la mention de transparence.
      '<div class="chat-composer">',
      '  <form class="chat-form" id="chat-form">',
      '    <label for="chat-input" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Votre question</label>',
      '    <input class="chat-input" id="chat-input" type="text" autocomplete="off" placeholder="' + esc(DATA.placeholder) + '">',
      '    <button class="chat-send" id="chat-send" type="submit" aria-label="Envoyer la question">',
      '      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 20.5 21 12 3 3.5 3 10l12 2-12 2z"/></svg>',
      '    </button>',
      '  </form>',
      '  <p class="chat-legal">',
      '    <span>' + esc(DATA.legal.disclaimer) + '</span>',
      '    <span>' + esc(DATA.legal.privacy) + '</span>',
      '    <span>' + esc(DATA.legal.contact).replace("écrivez-moi", '<a href="mailto:' + CFG.email + '">écrivez-moi</a>').replace("réservez un créneau de 30 minutes", '<a href="' + CFG.calUrl + '" target="_blank" rel="noopener">réservez un créneau de 30 minutes</a>') + '</span>',
      '  </p>',
      '</div>'
    ].join("");

    el.page = page;
    el.body = page.querySelector("#chat-body");
    el.thread = page.querySelector("#chat-thread");
    el.input = page.querySelector("#chat-input");
    el.send = page.querySelector("#chat-send");
    el.modeRules = page.querySelector("#chat-mode-rules");
    el.modeAI = page.querySelector("#chat-mode-ai");

    document.body.appendChild(page);

    page.querySelector("#chat-form").addEventListener("submit", function (e) {
      e.preventDefault();
      ask(el.input.value);
    });
    el.modeRules.addEventListener("click", function () { setMode("rules"); el.input.focus(); });
    el.modeAI.addEventListener("click", switchToAI);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && state.opened) close();
    });
  }

  /* Premier message de la conversation, puis questions proposées. Les explications de
     mode restent dans la colonne de droite et dans les infobulles, pas ici. */
  function greet() {
    addMsg("bot", DATA.intro);
    el.thread.appendChild(topicRow(DATA.suggestions.map(function (s) { return { label: s, question: s }; })));
    scrollDown();
  }

  /* Le portfolio devient inerte pendant que le portfolio interactif est ouvert, et le
     défilement de la page est bloqué sur html ET sur body : rien ne bouge derrière. */
  function setLock(on) {
    document.documentElement.classList.toggle("chat-lock", on);
    document.body.classList.toggle("chat-lock", on);
    var nodes = document.querySelectorAll("body > header, body > main, body > footer");
    for (var i = 0; i < nodes.length; i++) nodes[i].inert = on;
  }

  /* Le bouton du coin suit l'état : « Portfolio interactif » quand c'est fermé,
     « Fermer » quand la page est ouverte. Le libellé et l'icône changent ensemble. */
  function setLauncherState(isOpen) {
    var peel = document.getElementById("peel");
    if (peel) peel.classList.toggle("is-open", isOpen);
    if (!el.launcher) return;
    var label = el.launcher.querySelector(".peel-label");
    if (label) label.textContent = isOpen ? "Fermer" : "Portfolio interactif";
    el.launcher.setAttribute("aria-expanded", String(isOpen));
    el.launcher.setAttribute("aria-label", isOpen ? "Fermer le portfolio interactif" : "Ouvrir le portfolio interactif");
  }

  function open(question) {
    if (state.opened) { if (question) ask(question); else el.input.focus(); return; }
    state.opened = true;
    el.page.classList.add("open");
    el.page.removeAttribute("inert");
    el.page.setAttribute("aria-hidden", "false");
    setLock(true);
    setLauncherState(true);
    if (!el.thread.childElementCount) greet();
    refreshModeUI();
    if (question) ask(question); else el.input.focus();
  }

  function close() {
    if (!state.opened) return;
    state.opened = false;
    el.page.classList.remove("open");
    el.page.setAttribute("aria-hidden", "true");
    el.page.setAttribute("inert", "");
    setLauncherState(false);
    // Le portfolio redevient utilisable dès que la page a fini de se replier.
    setTimeout(function () { setLock(false); }, 520);
    if (el.launcher) el.launcher.focus();
  }

  function init() {
    el.launcher = document.getElementById("chat-launcher");
    build();
    refreshModeUI();
    setLauncherState(false);
    if (el.launcher) {
      el.launcher.setAttribute("aria-controls", "chat-page");
      el.launcher.addEventListener("click", function () {
        if (state.opened) close(); else open();
      });
      if (el.launcher.dataset.pendingOpen) {
        var pending = el.launcher.dataset.pendingOpen;
        delete el.launcher.dataset.pendingOpen;
        open(pending === "1" ? null : pending);
      }
    }

    window.openChatAssistant = open;
    window.__chatReady = true;
  }

  /* Exposé uniquement pour vérifier le moteur de correspondance en dehors du navigateur
     (voir la commande de test dans le README). Aucun effet sur le fonctionnement du chat. */
  window.__chatMatch = { norm: norm, fold: fold, tokens: tokens, scoreRules: scoreRules, bestRule: bestRule, retrieve: retrieve };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

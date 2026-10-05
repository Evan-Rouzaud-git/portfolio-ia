/*
 * Données du chatbot du portfolio : réponses du mode règles + base de connaissances du mode IA.
 *
 * Pourquoi un fichier .js et pas un .json ?
 * Un fichier .json devrait être récupéré avec fetch(), ce qui échoue quand la page est
 * ouverte directement depuis le disque (file://). Un script classique qui remplit une
 * variable globale fonctionne partout, sans requête réseau supplémentaire.
 *
 * Structure :
 *   rules[]      : chaque question reconnue par mots-clés, avec sa réponse préparée.
 *                  La réponse préparée sert aussi de matière première au mode IA, qui la
 *                  reformule au lieu de deviner. C'est ce qui évite les refus à tort.
 *   knowledge[]  : sections du portfolio, utilisées comme complément d'information.
 *   topics[]     : menu proposé quand aucune règle ne correspond.
 */

window.CHAT_DATA = {

  /* ---------------------------------------------------------------
   * Réglages généraux
   * --------------------------------------------------------------- */
  config: {
    calUrl: "https://cal.com/rouzaud-evan-izeqwf/30min",
    email: "evanrouzaud@gmail.com",
    phone: "+33 7 68 58 74 43",
    github: "https://github.com/Evan-Rouzaud-git",
    linkedin: "https://www.linkedin.com/in/evanrouzaud",
    caseStudies: "case-studies.html",
    /* Modèle par défaut du mode IA : petit, multilingue, correct en français.
       Liste complète : https://github.com/mlc-ai/web-llm#-prebuilt-models */
    model: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    modelSize: "350 Mo",
    /* Version ultra-rapide, proposée en option (plus petite, anglais d'origine) */
    modelFast: "SmolLM2-360M-Instruct-q4f16_1-MLC",
    modelFastSize: "250 Mo"
  },

  /* Premier message de la conversation, puis suggestions cliquables */
  intro: "Bonjour, je suis le portfolio interactif d'Evan.\nPosez-moi vos questions, je pourrai vous aider.",
  placeholder: "Écrivez votre question...",
  suggestions: [
    "Combien de temps pour un prototype ?",
    "Mes données restent-elles chez moi ?",
    "Pouvez-vous reprendre un projet existant ?"
  ],

  /* Mention affichée sous la saisie */
  legal: {
    disclaimer: "Ces réponses sont générées automatiquement à partir de mon portfolio et peuvent contenir des erreurs.",
    privacy: "Aucune donnée n'est transmise : tout reste dans votre navigateur.",
    contact: "Pour aller plus loin, écrivez-moi ou réservez un créneau de 30 minutes."
  },

  /* Les deux modes : titre et explication, affichés dans l'infobulle du sélecteur */
  modes: {
    rules: {
      title: "Mode Règle",
      tip: "La réponse est préparée à l'avance et s'affiche immédiatement. Aucun téléchargement, aucune donnée ne quitte la page."
    },
    ai: {
      title: "Mode IA locale",
      tip: "Le modèle est exécuté dans votre navigateur, rien n'est envoyé à un serveur. Téléchargé une seule fois (350 Mo), puis mis en cache."
    }
  },

  /* Aucune règle ne correspond : on propose un menu et le contact direct */
  fallback: {
    answer: "Je n'ai pas de réponse préparée sur ce point. Voici ce que je couvre le mieux : tarifs et facturation, disponibilité, méthode et pilotage, projets, compétences techniques, IA locale et confidentialité. Sinon, posez la question directement à Evan : il répond sous 24 heures, et le premier échange de 30 minutes est gratuit.",
    links: ["cal", "email"]
  },

  /* ---------------------------------------------------------------
   * Mode règles.
   * "source" alimente la mention de provenance affichée au visiteur.
   * "links" : cal, email, github, linkedin, case, gumroad, leadlistqa,
   *           github_excel, github_aiba, github_goutte
   * --------------------------------------------------------------- */
  rules: [
    /* ---------- accueil, contact, rendez-vous ---------- */
    {
      id: "salutation",
      keywords: ["bonjour", "salut", "hello", "bonsoir", "coucou", "hey", "bonne journee"],
      answer: "Bonjour. Je peux vous renseigner sur le profil d'Evan, ses services, ses projets, sa méthode, ses tarifs ou sa disponibilité. Que voulez-vous savoir ?",
      links: [],
      source: "Accueil"
    },
    {
      id: "chatbot",
      keywords: ["chatbot", "chat bot", "assistant du site", "webllm", "mode ia", "deux modes", "comment ca marche ce chat", "tu es une ia", "c'est quoi ce chat", "regles ou ia"],
      answer: "Ce chat propose deux modes. Le mode règles répond immédiatement, à partir de réponses préparées : rien à télécharger. Le mode IA locale fait tourner un petit modèle de langage dans votre navigateur, sur votre machine, sans serveur ni clé API : il reformule la même base de réponses, avec plus de souplesse. Le premier lancement du mode IA télécharge 350 Mo, une seule fois.",
      links: [],
      source: "Chatbot"
    },
    {
      id: "rdv",
      keywords: ["rendez-vous", "rendez vous", "rdv", "appel", "cal", "cal.com", "reserver", "réserver", "creneau", "créneau", "visio", "echange", "échange", "parler", "discuter", "rencontrer", "appel telephonique"],
      answer: "Le plus simple est de choisir directement un créneau de 30 minutes dans l'agenda en ligne. Aucun engagement : l'objectif est de comprendre votre besoin et de vous dire ce qui est faisable.",
      links: ["cal"],
      source: "Contact"
    },
    {
      id: "premier_echange",
      keywords: ["premier echange", "premier échange", "comment ca se passe l'appel", "que faites-vous pendant", "30 minutes", "appel decouverte", "appel découverte", "premier contact", "diagnostic"],
      answer: "Pendant ces 30 minutes : vous décrivez le contexte et le problème, je pose des questions sur les utilisateurs, les contraintes et l'échéance, puis je vous donne une première lecture honnête. Vous repartez avec une idée du périmètre, du délai et du budget, même si nous ne travaillons pas ensemble.",
      links: ["cal"],
      source: "Méthode"
    },
    {
      id: "email",
      keywords: ["email", "mail", "e-mail", "ecrire", "écrire", "contact", "joindre", "telephone", "téléphone", "numero", "numéro", "coordonnees", "coordonnées", "linkedin"],
      answer: "Vous pouvez écrire à evanrouzaud@gmail.com, appeler le +33 7 68 58 74 43, ou passer par LinkedIn. La réponse arrive sous 24 heures, avec une première lecture du besoin.",
      links: ["email", "linkedin", "cal"],
      source: "Contact"
    },
    {
      id: "cv_document",
      keywords: ["cv", "votre cv", "un cv", "mon cv", "curriculum", "curriculum vitae", "telecharger le cv", "télécharger le cv", "telecharger", "pdf", "dossier de competences", "book", "presentation ecrite"],
      answer: "Il n'y a pas de CV à télécharger sur ce site : le portfolio, les case studies et le code des projets sont plus complets qu'un CV. Si vous avez besoin d'un document formel pour un processus interne, demandez-le par e-mail et il vous sera envoyé.",
      links: ["email", "linkedin"],
      source: "Profil"
    },

    /* ---------- tarifs et cadre commercial ---------- */
    {
      id: "tarifs",
      keywords: ["tarif", "prix", "cout", "coût", "coute", "budget", "tjm", "taux journalier", "devis", "forfait", "cher", "honoraires", "remuneration", "rémunération", "salaire"],
      answer: "Deux formats. La journée de travail se situe entre 350 et 500 € selon la mission. Un prototype IA au forfait démarre à 2 500 €, avec un périmètre défini au départ et une livraison en 2 à 6 semaines. Ce sont des ordres de grandeur : le devis est écrit et validé avant le démarrage.",
      links: ["cal"],
      source: "Tarifs"
    },
    {
      id: "budget_serre",
      keywords: ["budget serre", "budget serré", "pas beaucoup de budget", "trop cher", "moins cher", "negocier", "négocier", "reduction", "réduction", "tarif etudiant", "tarif associatif", "petit budget", "gratuit"],
      answer: "Si le budget est nettement en dessous de ces ordres de grandeur, dites-le dès le premier échange : Evan préfère orienter vers une solution plus légère, ou conseiller d'attendre le bon moment, plutôt que de promettre un résultat que le budget ne permet pas. Un cadrage court ou un audit peuvent aussi se faire sur un périmètre réduit.",
      links: ["cal", "email"],
      source: "Tarifs"
    },
    {
      id: "facturation",
      keywords: ["acompte", "paiement", "payer", "reglement", "règlement", "facturation", "facturez", "facture", "modalite de paiement", "modalité de paiement", "statut", "auto-entrepreneur", "siret", "portage", "tva", "contrat", "prestation", "freelance"],
      answer: "La collaboration se fait en prestation indépendante : un devis est validé avant le démarrage, puis la facturation suit les échéances prévues au contrat. Au forfait, elle est découpée par lot de travail ; à la journée, elle suit le temps passé. Les modalités précises et le cadre juridique sont écrits noir sur blanc avant de commencer.",
      links: ["cal"],
      source: "Tarifs"
    },
    {
      id: "duree_mission",
      keywords: ["duree", "durée", "combien de temps", "longtemps", "semaines", "mois", "engagement", "temps plein", "temps partiel", "plusieurs clients", "charge de travail"],
      answer: "Une mission type va de quelques jours (cadrage, audit) à 2 ou 3 mois pour un produit complet. Un prototype démontrable arrive en 2 à 6 semaines. Au-delà, le suivi peut se faire par petits lots, ce qui laisse la porte ouverte à d'autres sujets en parallèle.",
      links: ["cal"],
      source: "Méthode"
    },
    {
      id: "disponibilite",
      keywords: ["disponible", "disponibilite", "disponibilité", "dispo", "quand", "commencer", "demarrer", "démarrer", "planning", "delai", "délai", "delais", "agenda", "maintenant", "septembre", "octobre", "janvier", "mois prochain"],
      answer: "Evan est disponible immédiatement pour de nouvelles missions, en France comme à l'international, à distance. Le premier échange de 30 minutes est gratuit, et un prototype démontrable arrive en 2 à 6 semaines selon le périmètre.",
      links: ["cal"],
      source: "Disponibilité"
    },
    {
      id: "distanciel",
      keywords: ["distance", "distanciel", "remote", "presentiel", "présentiel", "deplacement", "déplacement", "ville", "ou etes-vous", "où êtes-vous", "international", "mobilite", "mobilité", "fuseau horaire", "etranger", "étranger"],
      answer: "Le travail se fait à distance depuis la France, avec des clients partout. Evan reste mobile pour des temps présents ponctuels : atelier de cadrage, restitution, formation. Les échanges en anglais ne posent pas de problème (TOEIC 945).",
      links: ["cal"],
      source: "FAQ"
    },
    {
      id: "recrutement",
      keywords: ["recrut", "poste", "cdi", "cdd", "embauche", "candidature", "alternance", "mission longue", "salarie", "salarié", "offre", "job", "stage", "appel d'offres", "sous-traitance", "sous traitant"],
      answer: "Evan travaille en freelance, et reste ouvert à des rôles en entreprise orientés Product Owner IA, chef de projet IA, Solution Architect ou ingénieur IA avec dimension projet. Il peut aussi intervenir en sous-traitance pour une agence ou une ESN. Le format se décide selon le besoin réel, pas avant.",
      links: ["cal", "linkedin"],
      source: "Profil"
    },

    /* ---------- méthode, projet, pilotage ---------- */
    {
      id: "methode",
      keywords: ["methode", "méthode", "process", "comment travaillez", "comment vous travaillez", "comment ca se passe", "comment ça se passe", "comment se passe un projet", "ca se passe comment", "se deroule", "deroulement", "deroule", "déroulé", "etapes", "étapes", "organisation", "accompagnement", "organisation du projet"],
      answer: "Quatre temps. Un échange de cadrage de 30 minutes pour comprendre le besoin et identifier les parties prenantes. Un cadrage écrit : entretiens utilisateurs, backlog, priorisation par la valeur, roadmap par jalons et business case. Un prototype en 2 à 6 semaines, piloté par jalons et points de décision. Puis la mise en production et la transmission : tests, supervision, documentation et formation de vos équipes.",
      links: ["cal"],
      source: "Méthode"
    },
    {
      id: "pilotage",
      keywords: ["piloter", "pilotage", "jalon", "jalons", "arbitrage", "point de decision", "point de décision", "suivi", "reporting", "chef de projet", "gestion de projet", "coordination", "planning projet", "avancement", "risque", "risques", "gerer un projet", "gerez un projet", "gerez vous un projet", "gerer votre projet", "conduite de projet"],
      answer: "Chaque projet avance par jalons, avec un point de décision à chaque étape : on continue, on ajuste ou on arrête. Les arbitrages sont écrits et assumés, et le suivi reste compréhensible par un comité de direction comme par une équipe technique. Les risques identifiés sont mis sur la table tôt, pas à la fin.",
      links: ["cal"],
      source: "Méthode"
    },
    {
      id: "priorisation",
      keywords: ["backlog", "prioris", "priorisation", "prioriser", "roadmap", "valeur", "complexite", "complexité", "user story", "user stories", "exigences", "specifications", "spécifications", "perimetre", "périmètre", "besoin", "cahier des charges", "fonctionnalites", "fonctionnalités"],
      answer: "Le cadrage commence par les utilisateurs, pas par la technologie : entretiens métier, cartographie des scénarios, backlog organisé et priorisation valeur / complexité. Le résultat est un périmètre écrit, avec ce qu'on fait maintenant, ce qu'on reporte, et pourquoi.",
      links: ["case"],
      source: "Services"
    },
    {
      id: "agile",
      keywords: ["agile", "scrum", "kanban", "sprint", "rituel", "rituels", "travaillez en agile", "methode agile", "mise en production continue", "ci/cd", "git", "versionnage", "notion", "jira", "trello", "outils de suivi"],
      answer: "Le travail s'organise par lots courts, avec des démonstrations régulières plutôt que de longues phases cachées : l'équivalent d'un backlog priorisé et de points de décision fréquents. Côté outils, Git pour le code, un tableau de suivi simple (Jira, Notion ou Linear selon ce que vous utilisez déjà) et des tests automatisés dans la chaîne d'intégration.",
      links: [],
      source: "Méthode"
    },
    {
      id: "parties_prenantes",
      keywords: ["partie prenante", "parties prenantes", "metier", "métier", "direction", "utilisateurs", "atelier", "ateliers", "animation", "reunion", "réunion", "alignement", "comite", "comité", "vulgarisation", "pedagogie", "pédagogie", "formation de vos equipes"],
      answer: "Evan travaille avec les trois niveaux en même temps : les utilisateurs pour comprendre le travail réel, l'IT pour les contraintes techniques, la direction pour la valeur et le budget. Concrètement : entretiens, ateliers d'alignement, restitutions et reporting. L'expérience récente inclut 29 entretiens semi-directifs et cinq démonstrations devant une direction générale.",
      links: [],
      source: "Profil"
    },
    {
      id: "documentation",
      keywords: ["documentation", "documenter", "transmission", "transmettre", "transmettez", "transmettez-vous", "reprendre la main", "passation", "mainteneur", "autonomie", "doc", "readme", "reprise du projet par l'equipe"],
      answer: "La documentation et la transmission font partie de la livraison : code commenté, README, tests automatisés et session de formation. L'objectif est que l'outil continue de vivre et de progresser sans dépendre de la présence d'un consultant.",
      links: [],
      source: "Méthode"
    },
    {
      id: "suivi_apres_livraison",
      keywords: ["apres la livraison", "après la livraison", "garantie", "bug", "bugs", "correction", "support", "maintenance", "maintenance applicative", "evoluer", "evolution", "évolution", "faire evoluer", "qui repare", "qui répare", "hotline"],
      answer: "Après la livraison, le code vous appartient et il est documenté pour que vos équipes puissent avancer seules. Evan reste disponible pour les évolutions et les ajustements : le périmètre et les modalités de ce suivi sont précisés dans le devis, pour éviter toute ambiguïté.",
      links: ["cal"],
      source: "FAQ"
    },
    {
      id: "conduite_changement",
      keywords: ["adoption", "conduite du changement", "former les equipes", "former les équipes", "former vos equipes", "former nos equipes", "former vos collaborateurs", "former", "nos equipes", "vos equipes", "formation des equipes", "webinaire", "sensibilisation", "resistance", "résistance", "accompagnement au changement"],
      answer: "Un outil qui n'est pas adopté ne vaut rien. Le travail inclut donc la formation, des démonstrations régulières et de la vulgarisation auprès des équipes : sur une mission précédente, deux webinaires IA et six sessions de formation ont été animés. L'objectif est que les utilisateurs comprennent l'intérêt avant qu'on leur impose l'outil.",
      links: [],
      source: "Profil"
    },
    {
      id: "conseil_seul",
      keywords: ["conseil", "audit", "expertise", "sans developpement", "sans développement", "cadrage seul", "avis", "recommandation", "due diligence", "etude de faisabilite", "étude de faisabilité", "faisabilite", "faisabilité"],
      answer: "Oui, une mission peut ne concerner que le cadrage : entretiens, état des lieux, scénarios, priorisation, estimation des gains et recommandation écrite. C'est même souvent la meilleure première étape avant d'engager un budget de développement.",
      links: ["cal"],
      source: "Services"
    },
    {
      id: "reprise_projet",
      keywords: ["reprendre un projet", "projet existant", "code existant", "legacy", "refonte", "migration", "reprise de code", "audit de code", "rejoindre une equipe", "rejoindre une équipe"],
      answer: "Oui, Evan peut reprendre un projet existant ou rejoindre une équipe en cours : lecture du code et de la documentation, état des lieux, puis priorisation de ce qui doit être corrigé ou ajouté. La première étape est toujours un audit court pour éviter de promettre un délai sans connaître le terrain.",
      links: ["cal"],
      source: "Services"
    },

    /* ---------- profil, parcours, compétences ---------- */
    {
      id: "profil",
      keywords: ["profil", "qui est", "qui es-tu", "tu es qui", "qui es tu", "qui etes-vous", "qui etes", "vous etes qui", "presente-toi", "presentez-vous", "presentez", "presentation", "parcours", "experience", "expérience", "diplome", "diplôme", "etudes", "études", "junior", "jeune", "competences", "compétences"],
      answer: "Evan est freelance en IA appliquée, en fin de cursus (Mastère Manager Transformation Digitale, Data et IA, RNCP 7). Son expérience s'est construite en alternance, pas encore en mission cliente, et il le dit clairement. Ce qui est vérifiable : cinq produits conçus, développés et livrés de bout en bout, dont deux aujourd'hui en vente, plus une expérience de recherche appliquée en deep learning au CNRS.",
      links: ["github", "linkedin", "case"],
      source: "Profil"
    },
    {
      id: "hybride",
      keywords: ["product owner", "product owner ia", "po ia", "chef de projet", "chef de projet ia", "solution architect", "architecte", "architecte solution", "amoa", "business analyst", "hybride", "profil technique", "technique ou fonctionnel", "cadrage et technique", "fonctionnel", "technico-fonctionnel"],
      answer: "Les deux, et c'est volontaire. Evan cadre le besoin avec les utilisateurs et la direction, priorise un backlog, pilote par jalons, puis construit lui-même la solution : agents LLM, RAG, IA locale, machine learning. Un seul interlocuteur du cadrage au déploiement, ce qui évite la perte d'information entre une équipe qui spécifie et une autre qui développe.",
      links: ["cal", "case"],
      source: "Profil"
    },
    {
      id: "experiences",
      keywords: ["im projet", "alternance", "stage", "cnrs", "xlim", "recherche", "thailande", "thaïlande", "magnetometre", "magnétomètre", "hyperspectral", "premiere experience", "première expérience", "experiences professionnelles", "expériences professionnelles", "votre parcours professionnel", "quels postes", "chez qui avez-vous travaille", "ou avez-vous travaille", "où avez-vous travaillé", "references clients", "références clients"],
      answer: "Trois expériences. Alternance IA chez IM Projet de mars 2025 à juin 2026 : diagnostic terrain (29 entretiens, 131 répondants), 42 scénarios métier cartographiés, 32 user stories validées, prototypage d'un agent Excel et d'un chatbot privé, cinq démonstrations devant la direction générale. Recherche en deep learning au XLIM (CNRS) en 2024 : images hyperspectrales, calculs accélérés de 500 %. Stage d'ingénieur optique en Thaïlande en 2023 : conception d'un magnétomètre optique, coût des lasers réduit de 66 %.",
      links: ["linkedin"],
      source: "Profil"
    },
    {
      id: "formation",
      keywords: ["formation initiale", "votre formation", "quelle formation", "formation", "ecole", "école", "master", "mastere", "mastère", "iscod", "limoges", "rncp", "prepa", "prépa", "berthollet", "certification", "ibm", "diplomes", "diplômes"],
      answer: "Mastère Manager Transformation Digitale, Data et IA (RNCP 7) à l'ISCOD, en cours. Avant : Master IXEO EUR en hautes technologies, électronique et photonique à l'Université de Limoges (mention Bien) et classe préparatoire Physique-Chimie au lycée Berthollet (mention Très Bien). Certifications : IBM Data Analyst et Effective Communication for Today's Leader.",
      links: [],
      source: "Profil"
    },
    {
      id: "langues",
      keywords: ["langue", "langues", "anglais", "english", "allemand", "toeic", "bilingue", "parlez-vous anglais", "international team"],
      answer: "Français natif, anglais C1 (TOEIC 945) et allemand B1. Les ateliers, la documentation et les échanges techniques peuvent se faire en anglais sans difficulté, y compris avec des équipes réparties sur plusieurs pays.",
      links: [],
      source: "Profil"
    },
    {
      id: "centres_interet",
      keywords: ["centre d'interet", "centre d'intérêt", "hobbies", "passion", "loisir", "sport", "echecs", "échecs", "philosophie", "entrepreneuriat", "veille", "qui est evan en dehors"],
      answer: "En dehors du travail : entrepreneuriat, sport, philosophie, échecs et veille IA quotidienne. Cet intérêt pour la veille est d'ailleurs ce qui a mené au produit InSight, conçu pour ne plus passer deux heures par jour à lire des flux RSS.",
      links: [],
      source: "Profil"
    },
    {
      id: "confiance",
      keywords: ["debutant", "débutant", "confiance", "pas d'experience", "pas d'expérience", "risque de vous confier", "premiere mission", "première mission", "jeune diplome", "jeune diplômé"],
      answer: "Parce que ce qu'il sait faire est déjà visible : cinq produits existent, fonctionnent, et deux sont commercialisés. Vous pouvez les tester, lire leur code ou regarder leurs démonstrations avant de l'écrire. Sa première expérience s'est faite en alternance, chez un client réel, avec de vrais utilisateurs et des démonstrations devant une direction générale.",
      links: ["case", "github"],
      source: "FAQ"
    },

    /* ---------- compétences techniques ---------- */
    {
      id: "technologies",
      keywords: ["techno", "technos", "technologie", "technologies", "stack", "langage", "python", "typescript", "rust", "react", "langgraph", "outils", "sql", "docker", "next.js", "streamlit", "office.js", "supabase", "scikit", "pandas", "fastapi"],
      answer: "Côté IA et data : Python (Pandas, scikit-learn, spaCy), LLM, LangGraph, RAG, embeddings, évaluation de modèles. Côté développement : TypeScript, React, Next.js, Tauri / Rust, Supabase, Stripe, Office.js, API REST, Docker et Git. Côté produit : cadrage, backlog, priorisation, business case, pilotage et conduite du changement.",
      links: [],
      source: "Compétences"
    },
    {
      id: "rag",
      keywords: ["rag", "retrieval", "base de connaissances", "base documentaire", "recherche semantique", "recherche sémantique", "embeddings", "vectorielle", "vector database", "documents internes", "chatbot sur mes documents"],
      answer: "Oui, c'est l'un des trois piliers techniques. La méthode : découpage des documents, recherche hybride (mots-clés plus similarité sémantique), réponses obligatoirement sourcées, et refus explicite quand l'information n'est pas dans les documents. Ce chat en est une version miniature et visible : les réponses viennent d'une base de connaissances limitée au portfolio.",
      links: [],
      source: "Services"
    },
    {
      id: "agents",
      keywords: ["agent", "agents", "agent ia", "automatisation", "automatiser", "workflow", "orchestration", "tool calling", "function calling", "langgraph", "assistant qui agit", "copilot"],
      answer: "Pour les agents, le principe est le contrôle : le modèle propose un plan, le plan est validé (schéma, invariants métier), les actions risquées demandent une confirmation humaine, puis seules des actions connues sont exécutées. C'est exactement l'approche de l'agent Excel, avec journaux et tests à l'appui.",
      links: ["github_excel"],
      source: "Services"
    },
    {
      id: "evaluation",
      keywords: ["evaluation", "évaluation", "eval", "metrique", "métrique", "mesurer", "kpi", "benchmark", "comment savoir si ca marche", "comment savoir si ça marche", "qualite des reponses", "qualité des réponses"],
      answer: "Un projet IA sans mesure ne tient pas. On définit dès le cadrage ce qu'est une bonne réponse ou un bon résultat, puis on mesure : jeux de test, précision, taux d'erreur, temps de traitement, et pour un agent le taux d'actions correctement exécutées. Les projets livrés incluent ces vérifications sous forme de tests automatisés.",
      links: [],
      source: "Services"
    },
    {
      id: "choix_modele",
      keywords: ["quel modele", "quel modèle", "choisir un modele", "choisir un modèle", "choisir entre", "api ou local", "api ou modele", "modele local ou api", "llm", "gpt", "chatgpt", "openai", "claude", "mistral", "open source", "open-source", "api ou local", "modele open", "modèle open", "fine-tuning", "fine tuning", "entrainer un modele"],
      answer: "Le choix se fait selon trois critères : la confidentialité des données, le coût à l'échelle et la qualité attendue. Modèle local pour les données sensibles ou les gros volumes, API pour la qualité maximale quand les données peuvent sortir, et parfois aucun grand modèle : sur le projet d'analyse de tickets, des embeddings et des règles métier ont suffi, pour un coût quasi nul.",
      links: ["case"],
      source: "Services"
    },
    {
      id: "couts_infrastructure",
      keywords: ["cout d'usage", "coût d'usage", "cout mensuel", "coût mensuel", "coute l'hebergement", "coûte l'hébergement", "coute l'hebergement", "infrastructure", "hebergement", "hébergement", "l'hebergement", "l'hébergement", "gpu", "serveur", "cloud", "abonnement", "combien ca coute a faire tourner"],
      answer: "Avec des modèles exécutés localement, le coût d'usage est nul : pas de facture à la requête ni d'abonnement, seulement la machine qui fait tourner le modèle. C'est le choix retenu pour InSight (de 400 Mo à 2 Go de modèles selon la machine) et pour l'analyse de tickets hors ligne. Avec une API, le coût dépend du volume et se pilote par les crédits.",
      links: [],
      source: "Services"
    },
    {
      id: "securite_donnees",
      keywords: ["securite", "sécurité", "rgpd", "conformite", "conformité", "donnees personnelles", "données personnelles", "anonymisation", "audit", "tracabilite", "traçabilité", "log", "logs", "supervision", "garde-fou", "garde-fous", "validation humaine"],
      answer: "Les projets sont conçus avec des garde-fous : validation avant exécution, confirmation humaine sur les actions sensibles, journaux et artefacts inspectables, tests automatisés. Pour les données réglementées, l'approche privilégiée reste le traitement local, sans envoi vers un service tiers, ce qui simplifie beaucoup la conformité.",
      links: ["case"],
      source: "Services"
    },
    {
      id: "ia_locale",
      keywords: ["local", "locale", "confidentiel", "confidentialite", "confidentialité", "donnees sensibles", "données sensibles", "sont sensibles", "mes donnees", "mes données", "chez moi", "donnees confidentielles", "données confidentielles", "prive", "privé", "souverain", "souverainete", "souveraineté", "on premise", "on-premise", "hors ligne", "sans internet"],
      answer: "Plusieurs projets fonctionnent avec des modèles exécutés localement, sans aucun appel à un service externe : les documents, tickets ou fichiers clients ne quittent jamais votre infrastructure, et le coût d'usage devient nul. C'est la bonne approche dès que les données sont sensibles ou réglementées.",
      links: ["case"],
      source: "Services"
    },

    /* ---------- projets ---------- */
    {
      id: "projets",
      keywords: ["projet", "projets", "realisation", "réalisation", "realisations", "réalisations", "portfolio", "exemples", "travaille sur", "tu as fait quoi", "avez-vous deja fait", "avez-vous déjà fait", "references de projets"],
      answer: "Cinq produits livrés de bout en bout : un agent IA pour Excel sous contrat d'exécution, un SaaS de contrôle qualité de listes de prospection (en vente), un outil d'analyse de tickets hors ligne, un modèle de prédiction du risque de pluie et une application de bureau de veille stratégique avec IA locale (en vente). Chaque projet a sa démonstration vidéo, et les trois plus aboutis ont un case study détaillé.",
      links: ["case"],
      source: "Réalisations"
    },
    {
      id: "case_studies",
      keywords: ["case study", "case studies", "etude de cas", "étude de cas", "details techniques", "détails techniques", "en savoir plus sur un projet", "documentation projet"],
      answer: "Trois case studies détaillés sont disponibles : InSight, Lead List QA et AI Business Analyst Workbench. Chacun raconte le contexte, l'objectif, les contraintes, la solution, les résultats et les apprentissages, avec la stack technique et les liens vers le produit ou le code.",
      links: ["case"],
      source: "Réalisations"
    },
    {
      id: "projet_excel",
      keywords: ["excel", "projet excel", "projets excel", "agent excel", "office", "office.js", "spreadsheet", "tableur", "classeur", "macro", "vba", "copilot excel", "automatiser excel"],
      answer: "AI Spreadsheet Copilot est un agent Excel construit pour le contrôle. Le modèle ne touche jamais directement au classeur : il propose un plan, le plan est normalisé puis validé par schéma, les actions risquées demandent une confirmation humaine, et seules des macros connues s'exécutent. Le tout est testé sur un hôte Excel simulé, sans Excel ni modèle. Les gains estimés atteignent jusqu'à 60 fois sur certaines tâches métier.",
      links: ["github_excel", "case"],
      source: "Réalisations"
    },
    {
      id: "projet_llqa",
      keywords: ["lead", "leads", "lead list", "projet lead", "projets lead", "projet llqa", "llqa", "prospection", "outbound", "liste", "icp", "cold email", "cold", "bounce", "verification email", "vérification email", "delivrabilite", "délivrabilité", "saas"],
      answer: "Lead List QA est un SaaS en ligne, conçu et mis en production en une semaine : import d'un export de prospects, vérification des adresses en direct, score de chaque contact face au profil client idéal, raisons de rejet lisibles, puis exports prêts à envoyer. Le produit est en vente sur leadlistqa.com.",
      links: ["leadlistqa", "case"],
      source: "Réalisations"
    },
    {
      id: "projet_dashboard",
      keywords: ["dashboard", "projet dashboard", "projets dashboard", "projet business analyst", "ticket", "tickets", "reclamation", "réclamation", "reclamations", "réclamations", "clustering", "roi", "business analyst", "workbench", "analyse de donnees", "analyse de données", "embedding", "signalconso"],
      answer: "AI Business Analyst Workbench regroupe des milliers de réclamations par thème, les priorise sur cinq critères, chiffre le retour sur investissement et prévoit les volumes à quatre semaines. Tout tourne en local, sans appel externe, avec des résultats identiques d'une exécution à l'autre et des recommandations justifiables devant un comité.",
      links: ["github_aiba", "case"],
      source: "Réalisations"
    },
    {
      id: "projet_goutte",
      keywords: ["pluie", "projet pluie", "projets pluie", "projet goutte", "projets goutte", "meteo", "météo", "goutte", "agriculteur", "agriculteurs", "prevision", "prévision", "classification", "regression", "régression", "fastapi", "machine learning"],
      answer: "Projet Goutte d'Eau est un MVP de prévision du risque de pluie à l'échelle locale, construit sur des données météo ouvertes : collecte, prétraitement, un modèle de classification du risque, un modèle de régression de l'intensité, une API REST et une interface web. Les prédictions sont précalculées en CSV pour la sobriété et la reproductibilité.",
      links: ["github_goutte"],
      source: "Réalisations"
    },
    {
      id: "projet_insight",
      keywords: ["insight", "projet insight", "projets insight", "rss", "veille", "briefing", "desktop", "application de bureau", "tauri", "rust", "gumroad", "flux rss", "lecteur rss"],
      answer: "InSight transforme des flux RSS en briefing stratégique quotidien, entièrement en local : scoring sémantique des articles, briefing en trois temps, sujets émergents par regroupement, recherche hybride et notifications planifiées. Application de bureau pour Windows, macOS et Linux, en vente en paiement unique, version 1.1.0.",
      links: ["gumroad", "case"],
      source: "Réalisations"
    },

    /* ---------- clients, secteurs, contexte ---------- */
    {
      id: "secteurs",
      keywords: ["secteur", "secteurs", "industrie", "sante", "santé", "juridique", "finance", "banque", "assurance", "public", "administration", "retail", "logistique", "rh", "marketing", "support client", "education", "éducation"],
      answer: "Les projets déjà menés touchent le support client, la prospection, la veille et la donnée météo. Rien n'empêche d'aller ailleurs : la méthode de cadrage est la même partout, et l'IA locale ouvre justement les secteurs réglementés (santé, juridique, finance, secteur public) où les données ne peuvent pas sortir.",
      links: ["cal"],
      source: "Pour qui"
    },
    {
      id: "taille_entreprise",
      keywords: ["startup", "start-up", "startups", "avec des startups", "avec des start-up", "avec des pme", "avec des grands groupes", "avec une agence", "pme", "grand groupe", "eti", "entreprise", "agence", "esn", "cabinet", "association", "independant", "indépendant", "taille"],
      answer: "Evan travaille aussi bien avec une startup qui veut valider une idée qu'avec une PME qui automatise un processus, une équipe produit qui a besoin d'un renfort, ou une agence qui cherche un profil IA à intégrer sur une mission client. Le format s'adapte : mission courte, lot de travail, ou accompagnement dans la durée.",
      links: ["cal"],
      source: "Pour qui"
    },
    {
      id: "equipe",
      keywords: ["equipe", "équipe", "travail en equipe", "travail en équipe", "travaillez seul", "travaillez-vous seul", "seul ou en equipe", "seul ou en équipe", "en autonomie", "seul", "en binome", "en binôme", "collaboration", "developpeurs", "développeurs", "integrer une equipe", "intégrer une équipe", "sous la direction"],
      answer: "Evan travaille en autonomie complète sur un périmètre donné, ou en binôme avec vos développeurs et vos experts métier. La double compétence aide justement là : parler le langage des utilisateurs le matin et celui des développeurs l'après-midi, sans traduction approximative.",
      links: [],
      source: "Profil"
    },
    {
      id: "embaucher",
      keywords: ["embaucher", "embauche", "pourquoi vous", "pourquoi evan", "pourquoi le choisir", "dois-je", "faut-il vous", "vous choisir", "faire appel a vous", "faire appel à vous", "est-ce que ca vaut", "est-ce que ça vaut", "prendre un freelance", "freelance ou pas", "ca vaut le coup", "vaut le coup", "interet de travailler"],
      answer: "Oui, si trois conditions sont réunies : un besoin IA concret, un budget, et une échéance. Dans ce cas vous avez un interlocuteur unique qui cadre le besoin, priorise, pilote par jalons et développe la solution, avec un premier prototype démontrable en 2 à 6 semaines et un devis écrit avant de commencer. Sinon, commencez par l'échange de 30 minutes : s'il n'est pas la bonne personne ou si ce n'est pas le bon moment, Evan vous le dira franchement.",
      links: ["cal", "case"],
      source: "Pourquoi Evan",
      hideSource: true
    },
    {
      id: "propriete",
      keywords: ["propriete", "propriété", "appartient", "code source", "livrable", "livrables", "qui possede le code", "qui possède le code", "licence", "open source", "reutiliser le code", "réutiliser le code"],
      answer: "Le code livré vous appartient : sources, documentation et tests, sans dépendance à ma présence pour le faire tourner. Les projets incluent des tests automatisés et des journaux d'exécution, parce qu'une IA en production doit être observable. Une session de formation permet à vos équipes de reprendre la main.",
      links: [],
      source: "FAQ"
    },
    {
      id: "nda",
      keywords: ["nda", "accord de confidentialite", "accord de confidentialité", "clause de confidentialite", "clause de confidentialité", "secret professionnel", "secret"],
      answer: "Oui, un accord de confidentialité peut être signé avant même le premier échange détaillé sur votre contexte. Si vous préférez ne rien partager au départ, la discussion peut s'appuyer uniquement sur les projets publics.",
      links: ["cal", "email"],
      source: "FAQ"
    },
    {
      id: "remerciement",
      keywords: ["merci", "parfait", "super", "top", "genial", "génial", "nickel", "bravo", "au revoir", "bonne continuation"],
      answer: "Avec plaisir. Si vous voulez aller plus loin, un créneau de 30 minutes est disponible dans l'agenda, et le premier échange est gratuit.",
      links: ["cal"],
      source: "Accueil"
    }
  ],

  /* ---------------------------------------------------------------
   * Sections de connaissances : complètent la réponse préparée pour le mode IA.
   * --------------------------------------------------------------- */
  knowledge: [
    {
      id: "profil",
      title: "Profil",
      text: "Evan Rouzaud est freelance en IA appliquée : cadrage du besoin, priorisation, pilotage du projet et développement de la solution. Formation : Mastère Manager Transformation Digitale, Data et IA (RNCP 7, ISCOD) et Master IXEO EUR en hautes technologies (mention Bien, Université de Limoges). Expérience : alternance IA chez IM Projet de mars 2025 à juin 2026 (29 entretiens semi-directifs, 131 répondants sur 200, 42 scénarios métier, 32 user stories validées, agent Excel et chatbot privé prototypés, cinq démonstrations devant la direction générale, deux webinaires IA et six sessions de formation Copilot). Recherche appliquée en deep learning au XLIM (CNRS) en 2024 : images hyperspectrales, calculs accélérés de 500 %. Stage d'ingénieur optique en Thaïlande en 2023 : magnétomètre optique conçu de zéro, coût des lasers réduit de 66 %. Langues : français natif, anglais C1 (TOEIC 945), allemand B1. Il est en fin de cursus et lance son activité : son expérience vient de l'alternance, pas encore de missions clientes, et il le dit clairement."
    },
    {
      id: "pourquoi-evan",
      title: "Pourquoi embaucher Evan",
      text: "La réponse à la question « dois-je embaucher Evan ? » est oui si trois conditions sont réunies : un besoin IA concret, un budget, et une échéance. Evan couvre le cadrage du besoin, la priorisation, le pilotage par jalons et le développement de la solution, donc vous n'avez qu'un seul interlocuteur, du premier atelier au produit en production. Un premier prototype démontrable arrive en 2 à 6 semaines, avec un devis écrit validé avant le démarrage. Les tarifs sont de 350 à 500 € par jour, ou à partir de 2 500 € pour un prototype au forfait. Ce qui le distingue : cinq produits livrés de bout en bout dont deux en vente, une expérience de cadrage réelle (29 entretiens, 32 user stories validées, 42 scénarios métier), et la capacité de dire non quand le projet n'a pas de sens. Si le besoin n'est pas encore cadré, l'échange de 30 minutes sert justement à le vérifier, sans engagement."
    },
    {
      id: "positionnement",
      title: "Positionnement et rôles",
      text: "Evan couvre deux dimensions dans un même profil. Dimension projet : compréhension du besoin métier, animation d'ateliers, backlog, priorisation par la valeur, roadmap par jalons, business case, pilotage et points de décision, gestion des parties prenantes (métier, IT, direction), conduite du changement, documentation et transmission. Dimension technique : agents LLM, RAG, IA locale, machine learning, tests et supervision. Il se positionne comme un interlocuteur unique capable de cadrer, prioriser, piloter et construire. Les rôles visés en entreprise sont Product Owner IA, chef de projet IA, Solution Architect IA et ingénieur IA avec dimension projet."
    },
    {
      id: "pour-qui",
      title: "Pour qui je travaille",
      text: "Six profils de clients : startups et jeunes entreprises qui veulent valider une idée IA avec un premier produit démontrable sans recruter une équipe complète ; PME et directions métier qui veulent automatiser un processus manuel avec un gain mesurable ; équipes produit et innovation qui cherchent un renfort capable de coder, de cadrer et de parler aux utilisateurs comme à la direction ; secteurs sensibles à la confidentialité (santé, juridique, finance, industrie, secteur public) dont les données ne peuvent pas sortir de leur infrastructure ; organisations qui ont identifié un besoin IA mais n'ont personne pour faire le lien entre les métiers, l'IT et la direction ; agences, ESN et cabinets qui cherchent un renfort IA à intégrer sur une mission client."
    },
    {
      id: "services",
      title: "Services",
      text: "Services proposés. Cadrage et analyse du besoin : entretiens utilisateurs, cartographie des scénarios, périmètre écrit, business case et estimation des gains. Structuration et priorisation : backlog, user stories, priorisation valeur et complexité, roadmap par jalons, traduction du besoin métier en solution technique. Pilotage de projet IA : jalons, points de décision, arbitrages écrits, reporting vers la direction. Parties prenantes et adoption : ateliers, démonstrations, formation, conduite du changement. Agents LLM et automatisation : agents LangGraph avec appels d'outils encadrés, plans d'exécution validés avant modification, intégration Excel et Office.js, API internes et CRM. RAG et bases de connaissances : recherche hybride mots-clés et vecteurs, citations obligatoires, refus explicite si l'information manque. IA locale et souveraine : modèles ouverts, embeddings locaux, choix du modèle selon la mémoire disponible (400 Mo à 2 Go), aucun envoi de données vers un tiers. Data science et machine learning : pipelines reproductibles, classification, régression, prévision, API REST. Fiabilité : tests automatisés, journaux et artefacts inspectables, confirmation humaine sur les actions sensibles."
    },
    {
      id: "methode",
      title: "Méthode",
      text: "La méthode se déroule en quatre temps. Premier temps, échange de cadrage de 30 minutes, gratuit : comprendre le besoin, les contraintes et ce qui compte vraiment, identifier les parties prenantes et le critère de succès. Deuxième temps, cadrage et priorisation : entretiens utilisateurs, backlog organisé, priorisation par la valeur et la complexité, roadmap par jalons, business case, traduction explicite du besoin métier en solution technique. Troisième temps, prototype en 2 à 6 semaines : version démontrable rapidement, pilotée par jalons avec un point de décision à chaque étape (continuer, ajuster ou arrêter), arbitrages documentés, code remis au client dès la livraison. Quatrième temps, mise en production et transmission : tests, supervision, journalisation, documentation, formation des équipes et transfert de compétences. Chaque étape se termine par un livrable écrit : note de cadrage, backlog priorisé, démonstration, documentation."
    },
    {
      id: "tarifs",
      title: "Tarifs",
      text: "Deux formats de facturation. La journée de travail se situe entre 350 et 500 € selon la mission et sa durée, pour le cadrage, le développement, l'accompagnement des équipes ou un renfort ponctuel. Le prototype au forfait démarre à 2 500 € : un POC IA fonctionnel, périmètre défini au départ, livré en 2 à 6 semaines, démontré aux utilisateurs et accompagné de sa documentation. Ce sont des ordres de grandeur, pas une grille figée : si le budget est nettement inférieur, Evan le dit dès le premier échange et oriente vers une solution plus légère plutôt que de promettre un résultat impossible. Un devis écrit est validé avant le démarrage, sans surprise en fin de mission. La facturation se fait en prestation indépendante, au forfait par lot de travail ou à la journée."
    },
    {
      id: "projet-excel",
      title: "Projet AI Spreadsheet Copilot",
      text: "AI Spreadsheet Copilot est un agent Excel construit pour le contrôle. Le modèle ne touche jamais directement au classeur : il propose un plan, le plan est normalisé, réparé et validé par schéma (AJV) avec des invariants métier, les actions risquées ou ambiguës demandent une confirmation humaine, puis seules des macros Office.js connues s'exécutent. Le projet inclut des journaux et artefacts d'exécution, des tests automatisés qui tournent sur un hôte Excel simulé sans Excel ni modèle, et une évaluation des gains qui a atteint jusqu'à 60 fois sur certaines tâches métier. Stack : TypeScript, Office.js, LangGraph, AJV, Ollama, Jest. Code sur github.com/Evan-Rouzaud-git/excel-agent-poc."
    },
    {
      id: "projet-llqa",
      title: "Projet Lead List QA",
      text: "Lead List QA est un SaaS en ligne de contrôle qualité des listes de prospection, conçu et mis en production en une semaine. L'utilisateur importe un export de prospects, les adresses sont vérifiées en direct, chaque contact est noté face à un profil client idéal configurable, chaque rejet est expliqué en clair, et l'outil exporte une liste validée, une liste rejetée et une vue complète. Comptes, paiement Stripe, crédits, historique des traitements et re-vérification avant envoi sont intégrés de bout en bout. Positionnement : le contrôle avant envoi, pas une base de contacts ni un outil d'enrichissement. Le produit est en vente sur leadlistqa.com. Stack : Next.js, TypeScript, Supabase, Stripe."
    },
    {
      id: "projet-dashboard",
      title: "Projet AI Business Analyst Workbench",
      text: "AI Business Analyst Workbench analyse des milliers de réclamations clients hors ligne, sans envoyer une seule donnée à un service tiers. Les descriptions sont encodées en embeddings, regroupées en 30 clusters fins agrégés en 6 macro-thèmes, puis nommées en français à partir des termes importants. Chaque thème reçoit un score de priorité sur cinq critères (volume, gain, taux de réponse, croissance, facilité de résolution). L'outil inclut un simulateur de retour sur investissement paramétrable, une prévision de volume à quatre semaines et une détection des tickets à risque de non-réponse. Les résultats sont déterministes et explicables, donc comparables dans le temps. Le jeu de données est dérivé de SignalConso sous licence ouverte Etalab. Stack : Python, Streamlit, sentence-transformers, scikit-learn, spaCy, Plotly. Code sur github.com/Evan-Rouzaud-git/ai-business-analyst-workbench."
    },
    {
      id: "projet-goutte",
      title: "Projet Goutte d'Eau",
      text: "Projet Goutte d'Eau est un MVP de prédiction du risque de pluie à l'échelle locale, destiné aux agriculteurs, construit sur des données météorologiques ouvertes. Le pipeline couvre la collecte, le prétraitement, un modèle de classification du risque de pluie et un modèle de régression de l'intensité, puis la restitution. Une API REST fournit la liste des stations, des dates et des heures, les données par station, une prédiction pour un point GPS et un contrôle de santé. Une interface web permet la visualisation interactive. Les prédictions sont précalculées dans un fichier CSV pour garantir stabilité, reproductibilité et sobriété. Stack : Python, Pandas, scikit-learn, FastAPI, JavaScript. Code sur github.com/Evan-Rouzaud-git/Projet-goutte-eau."
    },
    {
      id: "projet-insight",
      title: "Projet InSight",
      text: "InSight est une application de bureau multi-plateforme (Windows, macOS, Linux) qui transforme des flux RSS en briefing stratégique quotidien, entièrement en local. L'utilisateur décrit sa veille en langage naturel, l'application extrait trois à cinq centres d'intérêt, note chaque article par similarité avec le profil, puis génère un briefing en trois temps : résumé exécutif, briefs par thème avec citations cliquables, et sujets émergents détectés par regroupement. S'y ajoutent dix packs RSS thématiques, l'import OPML, la recherche hybride plein texte et sémantique, le briefing planifié, les notifications système et le lancement au démarrage. Trois paliers de modèles sont proposés selon la mémoire de la machine (400 Mo à 2 Go), avec repli sur des résumés heuristiques. Version 1.1.0, en vente en paiement unique sur Gumroad. Stack : Tauri 2, Rust, React, TypeScript, SQLite FTS5, Qwen2.5, embeddings BGE."
    },
    {
      id: "realisations",
      title: "Réalisations",
      text: "Cinq produits ont été conçus, développés et livrés de bout en bout : AI Spreadsheet Copilot (agent Excel sous contrat d'exécution), Lead List QA (SaaS de contrôle qualité de listes de prospection, en vente), AI Business Analyst Workbench (analyse de tickets hors ligne), Projet Goutte d'Eau (prédiction du risque de pluie) et InSight (application de bureau de veille stratégique avec IA locale, en vente). Chaque projet est présenté avec une démonstration vidéo. Les trois produits les plus aboutis disposent d'un case study détaillé, accessible depuis la page case-studies.html."
    },
    {
      id: "contact",
      title: "Contact et prise de rendez-vous",
      text: "Pour prendre rendez-vous, un créneau de 30 minutes est réservable directement dans l'agenda en ligne à l'adresse cal.com/rouzaud-evan-izeqwf/30min. Le premier échange est gratuit et sans engagement : il sert à comprendre le besoin et à donner une première lecture du périmètre, du délai et du budget. Il est aussi possible d'écrire à evanrouzaud@gmail.com, d'appeler le +33 7 68 58 74 43, ou de passer par LinkedIn. La réponse arrive sous 24 heures."
    },
    {
      id: "disponibilite",
      title: "Disponibilité",
      text: "Evan est disponible immédiatement pour de nouvelles missions, à distance depuis la France, avec des clients en France et à l'international. Il reste mobile pour des temps présents ponctuels : atelier de cadrage, restitution, formation. Une mission peut aller de quelques jours (cadrage, audit) à 2 ou 3 mois pour un produit complet, avec un prototype démontrable en 2 à 6 semaines. Le suivi au-delà peut se faire par petits lots de travail."
    },
    {
      id: "faq",
      title: "Questions fréquentes",
      text: "Délai : un premier prototype utilisable arrive en 2 à 6 semaines selon le périmètre. Données sensibles : plusieurs projets fonctionnent avec des modèles exécutés localement, sans appel externe, donc les documents, tickets ou fichiers clients ne quittent jamais l'infrastructure du client et le coût d'usage devient nul. Propriété du code : le client reçoit l'intégralité du code source, la documentation et les tests ; une session de formation permet de reprendre la main en interne. Suivi après livraison : Evan reste disponible pour les évolutions, avec des modalités précisées dans le devis. Facturation : au forfait par lot de travail quand le périmètre est clair, ou en régie à la journée pour l'accompagnement, avec un devis écrit validé avant le démarrage. Lucidité : sur une mission précédente, après chiffrage, Evan a recommandé l'arrêt d'un projet pour des raisons de budget et de complexité, et la direction a suivi. Confidentialité : un accord de confidentialité peut être signé avant même le premier échange détaillé. Profil junior : Evan est en fin de cursus, son expérience vient de l'alternance et il ne l'occulte pas ; ce qu'il met en avant, ce sont cinq produits livrés dont deux en vente."
    },
    {
      id: "chatbot",
      title: "Chatbot du portfolio",
      text: "Ce chat propose deux modes. Le mode règles répond instantanément à partir de réponses préparées, sans téléchargement. Le mode IA locale fait tourner un petit modèle de langage (Qwen2.5 0.5B, ou SmolLM2 360M en version ultra-rapide) directement dans le navigateur du visiteur via WebGPU et la bibliothèque WebLLM : aucun serveur, aucune clé API, aucun coût. Le modèle est téléchargé au premier lancement (350 Mo, ou 250 Mo en version rapide) puis mis en cache par le navigateur. Dans les deux modes, les réponses proviennent d'une base de connaissances limitée au portfolio, et une question hors sujet reçoit une réponse honnête plutôt qu'une invention. C'est une démonstration concrète de ce qu'Evan fait par ailleurs : recherche dans une base de connaissances, sources limitées, refus explicite hors périmètre."
    }
  ]
};

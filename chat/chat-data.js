/*
 * Données du chatbot du portfolio : réponses du mode règles + base de connaissances du mode IA.
 *
 * Pourquoi un fichier .js et pas un .json ?
 * Un fichier .json devrait être récupéré avec fetch(), ce qui échoue quand la page est
 * ouverte directement depuis le disque (file://). Un script classique qui remplit une
 * variable globale fonctionne partout, sans requête réseau supplémentaire.
 *
 * Pour modifier une réponse : éditez le tableau "rules" (mode règles) et, si l'information
 * doit aussi être connue du mode IA, le tableau "knowledge" (mode IA).
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
    /* Modèle du mode IA. Liste complète : https://github.com/mlc-ai/web-llm#-prebuilt-models */
    model: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    modelSize: "environ 350 Mo"
  },

  /* Message d'accueil et suggestions cliquables */
  intro: "Bonjour, je suis l'assistant du portfolio d'Evan. Posez votre question sur son profil, ses services, ses projets, sa méthode ou ses tarifs.",
  placeholder: "Écrivez votre question...",
  suggestions: [
    "Quels sont vos tarifs ?",
    "Sur quels projets avez-vous travaillé ?",
    "Comment travaillez-vous ?",
    "Êtes-vous disponible ?",
    "Prendre rendez-vous"
  ],

  /* Réponse quand aucune règle ne correspond (mode règles) */
  fallback: {
    answer: "Je n'ai pas de réponse préparée sur ce point. Le plus simple est de poser la question directement à Evan : il répond sous 24 heures, et le premier échange de 30 minutes est gratuit.",
    links: ["cal", "email"]
  },

  /* ---------------------------------------------------------------
   * Mode règles : mots-clés et réponses.
   * "source" sert de repère interne (et d'indication affichée).
   * "links" : cal, email, github, linkedin, case, gumroad, leadlistqa
   * --------------------------------------------------------------- */
  rules: [
    {
      id: "salutation",
      keywords: ["bonjour", "salut", "hello", "bonsoir", "coucou", "hey"],
      answer: "Bonjour. Je peux vous renseigner sur le profil d'Evan, ses services, ses projets, sa méthode de travail, ses tarifs et sa disponibilité. Que voulez-vous savoir ?",
      links: [],
      source: "Accueil"
    },
    {
      id: "chatbot",
      keywords: ["chatbot", "chat bot", "assistant du site", "webllm", "mode ia", "deux modes", "comment ca marche ce chat", "tu es une ia"],
      answer: "Ce chat a deux modes. Le mode règles répond instantanément, à partir de réponses préparées. Le mode IA fait tourner un petit modèle de langage directement dans votre navigateur, sur votre machine, sans serveur ni clé API : il répond à partir du contenu du portfolio et cite les sections utilisées. Le mode IA demande un premier téléchargement d'environ 350 Mo.",
      links: [],
      source: "Chatbot"
    },
    {
      id: "tarifs",
      keywords: ["tarif", "tarifs", "prix", "cout", "coût", "coute", "budget", "combien", "tjm", "taux journalier", "facturation", "facture", "devis", "forfait", "cher"],
      answer: "Deux formats. La journée de travail se situe entre 350 et 500 € selon la mission. Un prototype IA au forfait démarre à 2 500 €, avec un périmètre défini au départ et une livraison en 2 à 6 semaines. Ce sont des ordres de grandeur : le devis est écrit et validé avant le démarrage.",
      links: ["cal"],
      source: "Tarifs"
    },
    {
      id: "disponibilite",
      keywords: ["disponible", "disponibilite", "disponibilité", "dispo", "combien de temps", "ca prend combien", "duree", "durée", "quand", "commencer", "demarrer", "démarrer", "planning", "delai", "délai", "delais", "charge", "agenda", "maintenant"],
      answer: "Evan est disponible immédiatement pour de nouvelles missions, en France comme à l'international, à distance. Le premier échange de cadrage de 30 minutes est gratuit, et un prototype démontrable arrive en 2 à 6 semaines selon le périmètre.",
      links: ["cal"],
      source: "Disponibilité"
    },
    {
      id: "rdv",
      keywords: ["rendez-vous", "rendez vous", "rdv", "appel", "cal", "cal.com", "reserver", "réserver", "creneau", "créneau", "visio", "echange", "échange", "parler", "discuter", "rencontrer"],
      answer: "Le plus simple est de choisir directement un créneau de 30 minutes dans l'agenda en ligne. Aucun engagement : l'objectif est de comprendre votre besoin et de vous dire ce qui est faisable.",
      links: ["cal"],
      source: "Contact"
    },
    {
      id: "email",
      keywords: ["email", "mail", "e-mail", "ecrire", "écrire", "contact", "joindre", "telephone", "téléphone", "numero", "numéro", "coordonnees", "coordonnées"],
      answer: "Vous pouvez écrire à evanrouzaud@gmail.com, ou appeler le +33 7 68 58 74 43. La réponse arrive sous 24 heures, avec une première lecture honnête du besoin.",
      links: ["email", "cal"],
      source: "Contact"
    },
    {
      id: "methode",
      keywords: ["methode", "méthode", "process", "comment vous travaillez", "comment ca se passe", "comment ça se passe", "comment se passe", "ca se passe comment", "se deroule", "deroulement", "deroule", "déroulé", "etapes", "étapes", "organisation", "accompagnement", "travail"],
      answer: "Quatre temps. Un échange de cadrage de 30 minutes pour comprendre le besoin et identifier les parties prenantes. Un cadrage écrit : entretiens utilisateurs, backlog, priorisation par la valeur, roadmap par jalons et business case. Un prototype en 2 à 6 semaines, piloté par jalons et points de décision. Puis la mise en production et la transmission : tests, supervision, documentation et formation de vos équipes.",
      links: ["cal"],
      source: "Méthode"
    },
    {
      id: "pilotage",
      keywords: ["piloter", "pilotage", "jalon", "jalons", "arbitrage", "point de decision", "point de décision", "suivi", "reporting", "chef de projet", "gestion de projet", "coordination", "planning projet"],
      answer: "Chaque projet avance par jalons, avec un point de décision à chaque étape : on continue, on ajuste ou on arrête. Les arbitrages sont écrits et assumés, et vous recevez un suivi régulier compréhensible par un comité de direction comme par une équipe technique.",
      links: ["cal"],
      source: "Méthode"
    },
    {
      id: "priorisation",
      keywords: ["backlog", "prioris", "priorisation", "prioriser", "roadmap", "valeur", "complexite", "complexité", "user story", "user stories", "exigences", "specifications", "spécifications", "perimetre", "périmètre", "besoin"],
      answer: "Le cadrage commence par les utilisateurs, pas par la technologie. Entretiens métier, cartographie des scénarios, backlog organisé et priorisation valeur / complexité. Le résultat est un périmètre écrit, avec ce qu'on fait maintenant, ce qu'on reporte, et pourquoi.",
      links: ["case"],
      source: "Services"
    },
    {
      id: "parties prenantes",
      keywords: ["partie prenante", "parties prenantes", "metier", "métier", "direction", "it", "utilisateurs", "atelier", "ateliers", "animation", "reunion", "réunion", "alignement", "comite", "comité"],
      answer: "Evan travaille avec les trois niveaux en même temps : les utilisateurs pour comprendre le travail réel, l'IT pour les contraintes techniques, la direction pour la valeur et le budget. Concrètement : entretiens, ateliers d'alignement, restitutions et reporting. L'expérience récente inclut 29 entretiens semi-directifs et cinq démonstrations devant une direction générale.",
      links: [],
      source: "Profil"
    },
    {
      id: "documentation",
      keywords: ["documentation", "documenter", "transmission", "transmettre", "formation", "former", "reprendre la main", "passation", "maintenance", "mainteneur", "autonomie", "doc"],
      answer: "La documentation et la transmission font partie de la livraison : code commenté, README, tests automatisés et session de formation. L'objectif est que l'outil continue de vivre sans dépendre de la présence d'un consultant.",
      links: [],
      source: "Méthode"
    },
    {
      id: "profil",
      keywords: ["profil", "qui est", "qui es-tu", "tu es qui", "qui es tu", "qui etes-vous", "vous etes qui", "presente-toi", "presentation", "parcours", "experience", "expérience", "formation", "cv", "diplome", "diplôme", "etudes", "études", "junior", "jeune", "competences", "compétences"],
      answer: "Evan est freelance en IA appliquée, en fin de cursus (Mastère Manager Transformation Digitale, Data et IA, RNCP 7). Son expérience s'est construite en alternance, pas encore en mission cliente, et il le dit clairement. Ce qui est vérifiable : cinq produits conçus, développés et livrés de bout en bout, dont deux aujourd'hui en vente, plus une expérience de recherche appliquée en deep learning au CNRS.",
      links: ["github", "linkedin"],
      source: "Profil"
    },
    {
      id: "hybride",
      keywords: ["product owner", "product owner ia", "po ia", "chef de projet", "chef de projet ia", "solution architect", "architecte", "amoa", "business analyst", "hybride", "profil technique", "cadrage et technique", "technique ou fonctionnel"],
      answer: "Les deux, et c'est volontaire. Evan cadre le besoin avec les utilisateurs et la direction, priorise un backlog, pilote par jalons, puis construit lui-même la solution : agents LLM, RAG, IA locale, machine learning. Un seul interlocuteur du cadrage au déploiement, ce qui évite la perte d'information entre une équipe qui spécifie et une autre qui développe.",
      links: ["cal", "case"],
      source: "Profil"
    },
    {
      id: "confiance",
      keywords: ["debutant", "débutant", "confiance", "pourquoi vous", "pourquoi evan", "premiere mission", "première mission", "pas d'experience", "pas d'expérience", "risque"],
      answer: "Parce que ce qu'il sait faire est déjà visible : cinq produits existent, fonctionnent, et deux sont commercialisés. Vous pouvez les tester, lire leur code ou regarder leurs démonstrations avant de l'écrire. Sa première expérience s'est faite en alternance, chez un client réel, avec de vrais utilisateurs et des démonstrations devant une direction générale.",
      links: ["case", "github"],
      source: "FAQ"
    },
    {
      id: "projets",
      keywords: ["projet", "projets", "realisation", "réalisation", "realisations", "réalisations", "portfolio", "exemples", "references", "références", "travaille sur", "tu as fait quoi"],
      answer: "Cinq produits livrés de bout en bout : un agent IA pour Excel sous contrat d'exécution, un SaaS de contrôle qualité de listes de prospection (en vente), un outil d'analyse de tickets hors ligne, un modèle de prédiction du risque de pluie et une application de bureau de veille stratégique avec IA locale (en vente). Chaque projet a sa démonstration vidéo, et les trois plus aboutis ont un case study détaillé.",
      links: ["case"],
      source: "Réalisations"
    },
    {
      id: "projet_excel",
      keywords: ["excel", "projet excel", "projets excel", "agent excel", "office", "office.js", "spreadsheet", "tableur", "classeur", "macro", "vba", "copilot excel"],
      answer: "AI Spreadsheet Copilot est un agent Excel qui n'écrit jamais librement dans le classeur. Le modèle propose un plan, le plan est normalisé puis validé par schéma, les actions risquées demandent une confirmation humaine, et seules des macros connues s'exécutent. Le tout est testé sur un hôte Excel simulé, sans Excel ni modèle.",
      links: ["github_excel"],
      source: "Réalisations"
    },
    {
      id: "projet_llqa",
      keywords: ["lead", "leads", "lead list", "projet lead", "projets lead", "projet llqa", "projets llqa", "llqa", "prospection", "outbound", "liste", "icp", "cold email", "cold", "bounce", "verification email", "vérification email", "delivrabilite", "délivrabilité", "saas"],
      answer: "Lead List QA est un SaaS en ligne, conçu et mis en production en une semaine : import d'un export de prospects, vérification des adresses en direct, score de chaque contact face au profil client idéal, raisons de rejet lisibles, puis exports prêts à envoyer. Le produit est en vente sur leadlistqa.com.",
      links: ["leadlistqa", "case"],
      source: "Réalisations"
    },
    {
      id: "projet_dashboard",
      keywords: ["dashboard", "projet dashboard", "projets dashboard", "projet business analyst", "projets business analyst", "ticket", "tickets", "reclamation", "réclamation", "reclamations", "réclamations", "clustering", "roi", "business analyst", "workbench", "analyse de donnees", "embedding"],
      answer: "AI Business Analyst Workbench regroupe des milliers de réclamations par thème, les priorise sur cinq critères, chiffre le retour sur investissement et prévoit les volumes à quatre semaines. Tout tourne en local, sans appel externe, avec des résultats identiques d'une exécution à l'autre et des recommandations justifiables.",
      links: ["github_aiba", "case"],
      source: "Réalisations"
    },
    {
      id: "projet_goutte",
      keywords: ["pluie", "projet pluie", "projets pluie", "projet goutte", "projets goutte", "meteo", "météo", "goutte", "agriculteur", "agriculteurs", "prevision", "prévision", "classification", "regression", "régression", "fastapi"],
      answer: "Projet Goutte d'Eau est un MVP de prévision du risque de pluie à l'échelle locale, construit sur des données météo ouvertes : collecte, prétraitement, un modèle de classification du risque, un modèle de régression de l'intensité, une API REST et une interface web. Les prédictions sont précalculées en CSV pour la sobriété et la reproductibilité.",
      links: ["github_goutte"],
      source: "Réalisations"
    },
    {
      id: "projet_insight",
      keywords: ["insight", "projet insight", "projets insight", "rss", "veille", "briefing", "desktop", "application de bureau", "tauri", "rust", "gumroad", "flux"],
      answer: "InSight transforme des flux RSS en briefing stratégique quotidien, entièrement en local : scoring sémantique des articles, briefing en trois temps, sujets émergents par regroupement, recherche hybride et notifications planifiées. Application de bureau pour Windows, macOS et Linux, en vente en paiement unique.",
      links: ["gumroad", "case"],
      source: "Réalisations"
    },
    {
      id: "technologies",
      keywords: ["techno", "technos", "technologie", "technologies", "stack", "langage", "python", "typescript", "rust", "react", "langgraph", "rag", "outils", "sql", "docker", "next.js", "streamlit", "office.js"],
      answer: "Côté IA et data : Python (Pandas, scikit-learn, spaCy), LLM, LangGraph, RAG, embeddings, évaluation de modèles. Côté développement : TypeScript, React, Next.js, Tauri / Rust, Supabase, Stripe, Office.js, API REST, Docker et Git. Côté produit : cadrage, backlog, priorisation, business case, pilotage et conduite du changement.",
      links: [],
      source: "Compétences"
    },
    {
      id: "ia_locale",
      keywords: ["local", "locale", "confidentiel", "confidentialite", "confidentialité", "donnees", "données", "rgpd", "cloud", "prive", "privé", "souverain", "securite", "sécurité", "on premise", "on-premise"],
      answer: "Plusieurs projets d'Evan fonctionnent avec des modèles exécutés localement, sans aucun appel à un service externe : les documents, tickets ou fichiers clients ne quittent jamais votre infrastructure, et le coût d'usage devient nul. C'est la bonne approche dès que les données sont sensibles ou réglementées.",
      links: ["case"],
      source: "Services"
    },
    {
      id: "propriete",
      keywords: ["propriete", "propriété", "appartient", "code source", "livrable", "livrables", "garantie", "test", "tests", "qualite", "qualité", "bug"],
      answer: "Le code livré vous appartient intégralement : sources, documentation et tests. Les projets incluent des tests automatisés et des journaux d'exécution, parce qu'une IA en production doit être observable. Et si vous voulez reprendre la main en interne, une session de formation est prévue.",
      links: [],
      source: "FAQ"
    },
    {
      id: "nda",
      keywords: ["nda", "accord de confidentialite", "accord de confidentialité", "secret", "clause"],
      answer: "Oui, un accord de confidentialité peut être signé sans difficulté, avant même le premier échange détaillé sur votre contexte.",
      links: ["cal"],
      source: "FAQ"
    },
    {
      id: "distanciel",
      keywords: ["distance", "distanciel", "remote", "presentiel", "présentiel", "deplacement", "déplacement", "ville", "ou etes-vous", "où êtes-vous", "international", "mobilite", "mobilité"],
      answer: "Le travail se fait à distance depuis la France, avec des clients partout. Evan reste mobile pour des temps présents ponctuels : atelier de cadrage, restitution, formation. L'anglais est courant (TOEIC 945), donc les échanges en anglais ne posent pas de problème.",
      links: ["cal"],
      source: "FAQ"
    },
    {
      id: "recrutement",
      keywords: ["recrut", "poste", "cdi", "cdd", "embauche", "candidature", "alternance", "mission longue", "salarie", "salarié", "offre", "job"],
      answer: "Evan travaille en freelance, et il est aussi ouvert à des rôles en entreprise orientés Product Owner IA, chef de projet IA, Solution Architect ou ingénieur IA avec dimension projet. Le mieux est d'en parler directement : le format se décide selon le besoin réel.",
      links: ["cal", "linkedin"],
      source: "Profil"
    },
    {
      id: "remerciement",
      keywords: ["merci", "parfait", "super", "top", "genial", "génial", "nickel", "bravo"],
      answer: "Avec plaisir. Si vous voulez aller plus loin, un créneau de 30 minutes est disponible dans l'agenda, et le premier échange est gratuit.",
      links: ["cal"],
      source: "Accueil"
    }
  ],

  /* ---------------------------------------------------------------
   * Mode IA : extraits de contenu utilisés pour répondre.
   * Chaque entrée est une section du portfolio. Le moteur sélectionne
   * les sections les plus proches de la question, puis demande au modèle
   * de répondre uniquement à partir de ces extraits, en citant la section.
   * --------------------------------------------------------------- */
  knowledge: [
    {
      id: "profil",
      title: "Profil",
      text: "Evan Rouzaud est freelance en IA appliquée. Il travaille en binôme avec les équipes : cadrage du besoin, priorisation, pilotage du projet et développement de la solution. Formation : Mastère Manager Transformation Digitale, Data et IA (RNCP 7, ISCOD) et Master IXEO EUR en hautes technologies (mention Bien, Université de Limoges). Expérience : alternance IA chez IM Projet de mars 2025 à juin 2026 (diagnostic terrain avec 29 entretiens semi-directifs, sondage interne avec 131 répondants sur 200, 42 scénarios métier cartographiés, 32 user stories validées, conception et prototypage d'un agent Excel et d'un chatbot privé, cinq démonstrations devant la direction générale, deux webinaires IA et six sessions de formation Copilot). Recherche appliquée en deep learning au XLIM (CNRS) en 2024 : analyse d'images hyperspectrales, accélération des calculs de 500 %. Stage d'ingénieur optique en Thaïlande en 2023 : conception d'un magnétomètre optique de zéro, réduction de 66 % du coût des lasers. Langues : français natif, anglais C1 (TOEIC 945), allemand B1. Il est en fin de cursus et lance son activité : son expérience vient de l'alternance, pas encore de missions clientes, et il le dit clairement."
    },
    {
      id: "positionnement",
      title: "Positionnement et rôles",
      text: "Evan couvre deux dimensions dans un même profil. Dimension projet : compréhension du besoin métier, animation d'ateliers, backlog, priorisation par la valeur, roadmap par jalons, business case, pilotage et points de décision, gestion des parties prenantes (métier, IT, direction), conduite du changement, documentation et transmission. Dimension technique : agents LLM, RAG, IA locale, machine learning, tests et supervision. Il se positionne comme un interlocuteur unique capable de cadrer, prioriser, piloter et construire. Les rôles visés en entreprise sont Product Owner IA, chef de projet IA, Solution Architect IA et ingénieur IA avec dimension projet."
    },
    {
      id: "pour-qui",
      title: "Pour qui je travaille",
      text: "Quatre profils de clients : startups et jeunes entreprises qui veulent valider une idée IA avec un premier produit démontrable sans recruter une équipe complète ; PME et directions métier qui veulent automatiser un processus manuel avec un gain mesurable ; équipes produit et innovation qui cherchent un renfort capable de coder, de cadrer et de parler aux utilisateurs comme à la direction ; secteurs sensibles à la confidentialité (santé, juridique, finance, industrie, secteur public) dont les données ne peuvent pas sortir de leur infrastructure. Deux profils complémentaires : les organisations qui ont identifié un besoin IA mais n'ont personne pour faire le lien entre les métiers, l'IT et la direction ; et les agences, ESN ou cabinets qui cherchent un renfort IA à intégrer sur une mission client."
    },
    {
      id: "services",
      title: "Services",
      text: "Services proposés. Cadrage et analyse du besoin : entretiens utilisateurs, cartographie des scénarios, périmètre écrit, business case et estimation des gains. Structuration et priorisation : backlog, user stories, priorisation valeur / complexité, roadmap par jalons, traduction du besoin métier en solution technique. Pilotage de projet IA : jalons, points de décision, arbitrages écrits, reporting vers la direction. Conduite du changement et adoption : formation, webinaires, accompagnement des équipes. Agents LLM et automatisation : agents LangGraph avec appels d'outils encadrés, plans d'exécution validés avant modification, intégration Excel / Office.js, API internes et CRM. RAG et bases de connaissances : recherche hybride mots-clés et vecteurs, citations obligatoires, refus explicite si l'information manque, évaluation de la qualité des réponses. IA locale et souveraine : modèles ouverts, embeddings locaux, choix du modèle selon la mémoire disponible (400 Mo à 2 Go), aucun envoi de données vers un tiers. Data science et machine learning : pipelines reproductibles, classification, régression, prévision, API REST et interfaces de restitution. Fiabilité et garde-fous : tests automatisés, journaux et artefacts inspectables, confirmation humaine sur les actions sensibles."
    },
    {
      id: "methode",
      title: "Méthode",
      text: "La méthode se déroule en quatre temps. Premier temps, échange de cadrage de 30 minutes, gratuit : comprendre le besoin, les contraintes et ce qui compte vraiment, identifier les parties prenantes et le critère de succès. Deuxième temps, cadrage et priorisation : entretiens utilisateurs, backlog organisé, priorisation par la valeur et la complexité, roadmap par jalons, business case, et traduction explicite du besoin métier en solution technique. Troisième temps, prototype en 2 à 6 semaines : une version démontrable rapidement, pilotée par jalons avec un point de décision à chaque étape (continuer, ajuster ou arrêter), arbitrages documentés, et le code appartient au client dès la livraison. Quatrième temps, mise en production et transmission : tests, supervision, journalisation, documentation, formation des équipes et transfert de compétences pour que l'outil survive au départ du consultant."
    },
    {
      id: "tarifs",
      title: "Tarifs",
      text: "Deux formats de facturation. La journée de travail se situe entre 350 et 500 € selon la mission et sa durée, pour le cadrage, le développement, l'accompagnement des équipes ou un renfort ponctuel. Le prototype au forfait démarre à 2 500 € : un POC IA fonctionnel, avec un périmètre défini au départ, livré en 2 à 6 semaines, démontré aux utilisateurs et accompagné de sa documentation. Ce sont des ordres de grandeur, pas une grille figée : si le budget est nettement inférieur, Evan le dit dès le premier échange et oriente vers une solution plus légère plutôt que de promettre un résultat impossible. Un devis écrit est validé avant le démarrage, sans surprise en fin de mission."
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
      text: "Cinq produits ont été conçus, développés et livrés de bout en bout : AI Spreadsheet Copilot (agent Excel sous contrat d'exécution), Lead List QA (SaaS de contrôle qualité de listes de prospection, en vente), AI Business Analyst Workbench (analyse de tickets hors ligne), Projet Goutte d'Eau (prédiction du risque de pluie) et InSight (application de bureau de veille stratégique avec IA locale, en vente). Chaque projet est présenté avec une démonstration vidéo. Les trois produits les plus aboutis disposent d'un case study détaillé : InSight, Lead List QA et AI Business Analyst Workbench. Les case studies sont accessibles depuis la page case-studies.html."
    },
    {
      id: "contact",
      title: "Contact et prise de rendez-vous",
      text: "Pour prendre rendez-vous, un créneau de 30 minutes est réservable directement dans l'agenda en ligne à l'adresse cal.com/rouzaud-evan-izeqwf/30min. Le premier échange est gratuit et sans engagement. Il est aussi possible d'écrire à evanrouzaud@gmail.com ou d'appeler le +33 7 68 58 74 43. La réponse arrive sous 24 heures, avec une première lecture honnête du besoin : ce qui est faisable, ce qui ne l'est pas, et par où commencer."
    },
    {
      id: "faq",
      title: "Questions fréquentes",
      text: "Délai : un premier prototype utilisable arrive en 2 à 6 semaines selon le périmètre. Données sensibles : plusieurs projets fonctionnent avec des modèles exécutés localement, sans appel externe, donc les documents, tickets ou fichiers clients ne quittent jamais l'infrastructure du client, et le coût d'usage devient nul. Propriété du code : le client reçoit l'intégralité du code source, la documentation et les tests ; une session de formation permet de reprendre la main en interne. Distance : travail à distance depuis la France, avec des temps présents ponctuels pour les ateliers, restitutions et formations. Facturation : au forfait par lot de travail quand le périmètre est clair, ou en régie à la journée pour l'accompagnement ; un devis écrit est validé avant le démarrage. Lucidité : sur une mission précédente, après chiffrage, Evan a recommandé l'arrêt d'un projet pour des raisons de budget et de complexité, et la direction a suivi. Confidentialité : un accord de confidentialité peut être signé avant même le premier échange détaillé. Profil junior : Evan est en fin de cursus, son expérience vient de l'alternance et il ne l'occulte pas ; ce qu'il met en avant, ce sont cinq produits livrés dont deux en vente."
    },
    {
      id: "chatbot",
      title: "Chatbot du portfolio",
      text: "Ce chat propose deux modes. Le mode règles répond instantanément à partir de réponses préparées, sans téléchargement. Le mode IA fait tourner un petit modèle de langage (Qwen2.5 0.5B) directement dans le navigateur du visiteur via WebGPU et la bibliothèque WebLLM : aucun serveur, aucune clé API, aucun coût. Le modèle est téléchargé au premier lancement (environ 350 Mo) puis mis en cache par le navigateur, et il répond uniquement à partir du contenu de ce portfolio. C'est une démonstration concrète de ce qu'Evan fait par ailleurs : recherche dans une base de connaissances, réponses limitées à des sources fournies, et refus explicite quand l'information n'est pas disponible."
    }
  ]
};

# Portfolio interactif

Un portfolio interactif à deux modes, entièrement statique, pensé pour GitHub Pages : aucun serveur, aucune clé API, aucun coût.

## Les deux modes

| | Mode règles | Mode IA locale |
|---|---|---|
| Fonctionnement | Correspondance par mots-clés, réponse préparée | Petit modèle de langage exécuté dans le navigateur du visiteur |
| Dépendances | Aucune | WebLLM et WebGPU |
| Téléchargement | Aucun | 350 Mo (modèle standard) ou 250 Mo (version ultra-rapide), une seule fois, puis mis en cache |
| Temps de réponse | Instantané | Premier mot en général sous une seconde après chargement, puis réponse en flux |
| Provenance affichée | Section d'origine de la réponse | Section d'origine de la réponse |

Le visiteur choisit son mode avec le sélecteur en haut de la fenêtre, et le choix est mémorisé (`localStorage`). Une carte d'explication des deux modes apparaît à la première ouverture, puis ne revient plus. La phrase de transparence reste affichée sous le champ de saisie : « Mode IA : le modèle est exécuté dans votre navigateur, rien n'est envoyé à un serveur. »

## Pourquoi le mode IA ne refuse pas à tort

Point clé de l'architecture : **on ne demande jamais au modèle de décider s'il sait répondre.**

1. Les mots-clés identifient la question et sélectionnent une **réponse officielle** déjà rédigée dans `chat-data.js`. Elle est juste par construction.
2. Deux sections de connaissances viennent la compléter.
3. Le modèle reçoit pour seule mission de **reformuler** cette réponse officielle, en deux phrases, sans rien ajouter.

Conséquences : les questions courantes reçoivent toujours une réponse, et le refus n'est prononcé que lorsque le site lui-même ne trouve aucune matière, sans même faire tourner le modèle. Un filet de sécurité remplace en plus toute sortie vide ou ressemblant à un refus par la réponse officielle.

## Où l'assistant apparaît sur le site

L'assistant est une **page plein écran posée au-dessus du portfolio**. C'est elle qui s'ouvre, le portfolio ne bouge jamais : il est simplement masqué puis démasqué.

**Animation** : uniquement `transform` et `opacity`, sur un élément `position:fixed; inset:0; 100vw x 100vh` présent dès le premier frame.

- fermé : `scale(.72) translate3d(1.5%, 2.5%, 0)`, opacité 0
- ouvert : `transform:none`, opacité 1
- 520 ms, `cubic-bezier(.22, 1, .36, 1)`, sans rebond ni dépassement
- origine : `transform-origin: 100% 100%`, le coin bas-droit
- `will-change: transform, opacity`
- `prefers-reduced-motion` : fondu simple, plus de mise à l'échelle

Aucun `clip-path`, aucune largeur, hauteur ou position animée : il n'y a donc aucun bord découpé et aucune bande noire possible. La fermeture est exactement la même transition à l'envers.

**Le bouton du coin**, en bas à droite, est un bouton d'accent (dégradé cyan vers violet) avec une icône et le mot « Assistant » (icône seule sur mobile). Il **ouvre et referme** l'assistant, et reste visible par-dessus la page. La touche `Echap` ferme aussi. Il n'y a plus de coin de retour en haut à gauche, ni aucun texte de ce genre. Aucune animation périodique : le coin est fixe.

Le portfolio devient inerte pendant que l'assistant est ouvert (`inert`), et son défilement est bloqué.

Une section « Assistant du portfolio » reste présente dans `site.html`, avant le contact : ses boutons portent `data-chat-open` (avec la question en valeur si besoin), le chargeur les reconnaît, ouvre la page et envoie la question.

## Contenu de la page assistant

L'écran tient en trois zones, du haut en bas, sans bandeau latéral :

- **`.chat-head`** : une barre fine, fond légèrement plus clair que l'historique, 8 px de marge interne. Le titre à gauche, et **le sélecteur de mode collé au coin haut-droit**. Chaque option a une pastille `?` qui ouvre une infobulle au survol **et** au focus clavier, avec le nom du mode et son explication : c'est là que vivent les explications, il n'y a pas de colonne dédiée.
- **`.chat-body`** : l'historique, qui prend **toute la place entre la barre du haut et la saisie**, dans une **colonne de lecture centrée de 820 px** comme les interfaces de chat classiques.
- **`.chat-composer`** : la saisie, ancrée en bas, 9 px de marge interne, alignée sur la colonne de lecture.

Le premier message est le texte `intro` de `chat-data.js` : « Bonjour, je suis le chatbot d'Evan. Posez-moi vos questions, je suis là pour vous aider. »

## Fichiers

```
chat/
  chat-loader.js   Chargeur. Seul fichier chargé avec la page (defer, moins de 2 Ko).
  chat.css         Styles de la page, du sélecteur, des trois zones et de la colonne droite.
  chat-data.js     Contenu : 51 règles, 16 sections, message d'accueil, fiches des deux modes.
  chat.js          Interface, moteur de correspondance, recherche, génération locale.
  README.md        Ce document.
```

Le bouton du coin est stylé dans `site.html`, `case-studies.html` et `index.html` (la page dédiée au portfolio interactif) : il doit être visible avant le chargement différé de `chat.css`.

**Chargement** : `chat.css`, `chat-data.js` et `chat.js` ne sont chargés qu'au premier besoin (survol ou clic sur le bouton, ou clic sur un bouton `data-chat-open`). Le reste de la page n'attend rien. Le modèle de langage (WebLLM) reste chargé uniquement si le visiteur active le mode IA.

## Modifier les réponses

Tout se passe dans `chat-data.js`.

**Mode règles** : chaque entrée de `rules` a des `keywords` et une `answer`. Le score d'une règle est la somme de la longueur des mots-clés trouvés, donc une expression longue comme `"chef de projet ia"` pèse plus lourd que `"projet"`. Deux précautions dans le moteur :

- les pluriels sont réduits (`tarif` et `tarifs` se répondent), en ne retirant qu'un `s` ou un `x` final, et seulement sur les mots de plus de quatre lettres ;
- un même mot-clé écrit au singulier et au pluriel ne compte qu'une fois, sinon une règle générique comme « projets » gagnerait contre une règle précise.

`links` affiche des boutons (`cal`, `email`, `github`, `linkedin`, `case`, `gumroad`, `leadlistqa`, `github_excel`, `github_aiba`, `github_goutte`), `source` alimente la mention de provenance, et `fallback` fournit la réponse quand rien ne correspond, avec un menu de sujets cliquables.

**Mode IA** : le tableau `knowledge` contient les sections du portfolio (`id`, `title`, `text`). Quand une information change sur le site, mettez à jour la section correspondante ici.

## Vérifier le contenu du chat

Le moteur de correspondance est exposé pour les tests sous `window.__chatMatch`. Une commande suffit pour vérifier que chaque question courante tombe sur la bonne règle et que les données sont cohérentes (identifiants uniques, liens connus, champs obligatoires) :

```bash
node -e "
const fs=require('fs');
global.window={};global.navigator={};global.localStorage={getItem(){},setItem(){}};
global.document={readyState:'complete',addEventListener(){},getElementById(){return null},
 createElement(){return{style:{},classList:{add(){},remove(){}},appendChild(){},remove(){},querySelector(){return null},setAttribute(){},addEventListener(){}}},
 body:{appendChild(){}},querySelector(){return null},querySelectorAll(){return[]}};
eval(fs.readFileSync('chat/chat-data.js','utf8'));
try{eval(fs.readFileSync('chat/chat.js','utf8'))}catch(e){}
const M=window.__chatMatch;
console.log('tarifs ->', (M.bestRule('Quels sont vos tarifs ?')||{}).id);
console.log('hors sujet ->', M.bestRule('raconte-moi une blague'));
console.log('regles :', window.CHAT_DATA.rules.length);
"
```

## Ce qui rend le mode IA rapide

1. **Réponse en flux** : le texte s'affiche mot après mot, plutôt qu'un bloc qui arrive d'un coup.
2. **Contexte très court** : la réponse officielle et deux extraits de moins de 420 caractères. Le modèle lit quelques centaines de jetons, pas quelques milliers.
3. **`resetChat()` avant chaque question** : sans cet appel, l'historique s'accumule dans le moteur et chaque réponse devient plus lente que la précédente.
4. **`max_tokens` à 120** : une réponse de portfolio tient en deux phrases.

## Changer de modèle

Dans `chat-data.js`, modifiez `config.model` et `config.modelFast`. La liste des modèles prêts à l'emploi se trouve sur [github.com/mlc-ai/web-llm](https://github.com/mlc-ai/web-llm#-prebuilt-models). Mettez à jour `modelSize` et `modelFastSize`, utilisés dans les messages affichés au visiteur. Un modèle plus petit que SmolLM2 360M dégrade nettement le français.

## Compatibilité

- Le mode IA nécessite **WebGPU** : Chrome ou Edge 113+ sur ordinateur, en contexte sécurisé (https, ou `localhost`). Sur les navigateurs ou appareils non compatibles, un message clair s'affiche et le mode règles prend le relais automatiquement.
- Le mode règles fonctionne partout.
- Ouvrir les pages avec `file://` casse le mode IA (pas de contexte sécurisé). Pour tester en local :

```bash
python -m http.server 8000
# puis http://localhost:8000
```

## Accessibilité

Le coin de page est un vrai bouton avec `aria-expanded` et `aria-controls`, qui s'ouvre au survol comme au focus clavier. La page assistant est en `role="dialog"` avec `aria-modal="true"` et `aria-hidden` basculé, la zone de messages en `aria-live="polite"`, la fermeture se fait avec `Echap` ou le bouton en haut à gauche, le focus va dans le champ à l'ouverture puis revient au coin à la fermeture, le portfolio est rendu inerte pendant l'ouverture, tous les éléments interactifs ont un style `:focus-visible`, et les animations sont désactivées si `prefers-reduced-motion` est actif.

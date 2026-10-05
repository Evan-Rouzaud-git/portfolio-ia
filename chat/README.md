# Chatbot du portfolio

Un assistant à deux modes, entièrement statique, pensé pour GitHub Pages : aucun serveur, aucune clé API, aucun coût.

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

Il n'y a plus de fenêtre flottante : **l'assistant est une page plein écran**, révélée comme une feuille qu'on tire depuis le coin.

- **Au repos** : un coin de page plié, en bas à droite, sans texte ni bulle. Un liseré bleu clair pulse le long de la pliure.
- **En continu** : toutes les 7 secondes, le coin est tiré puis relâché (animation `flapPull`), et la feuille glisse dans le même mouvement pour laisser voir la page assistant par la diagonale. C'est ce qui rend l'assistant visible même sans interaction.
- **Au survol** (ou au focus clavier) : le rabat s'ouvre en grand et la feuille se tire plus loin.
- **Au clic** : la feuille glisse depuis le coin bas-droit jusqu'à couvrir l'écran, avec une légère rotation qui se redresse à l'arrivée. Le portfolio passe dessous.
- **Pour revenir** : un **coin de feuille en haut à gauche**, qui s'ouvre au survol comme celui du bas et se rabat au clic. La touche `Echap` fonctionne aussi.

L'animation est en CSS pur : la feuille est simplement translatée hors écran (`translate3d(112%,112%,0) rotate(3deg)`) et revient à `translate3d(0,0,0)`. **Aucun `clip-path`** : la feuille reste opaque pendant tout le trajet, donc on ne voit jamais le portfolio au travers. L'ombre portée vers le haut-gauche et le liseré clair sur le bord avant donnent l'impression d'une feuille qu'on tourne.

Le fond de la page assistant est volontairement plus clair et plus bleu que le portfolio (`#1b2c4d` vers `#0d1730`), avec deux couches de lignes bleu clair qui dérivent lentement et deux halos. La rupture est nette dès que le coin se soulève.

Le portfolio devient inerte pendant que la page est ouverte (`inert`), et son défilement est bloqué.

Une section « Assistant du portfolio » reste présente dans `index.html`, avant le contact : elle explique les deux modes et propose trois questions cliquables. Ses boutons portent `data-chat-open` (avec la question en valeur si besoin) : le chargeur les reconnaît, ouvre la page et envoie la question.

## Contenu de la page assistant

- **Une carte de bienvenue** (textes dans `chat-data.js`, objet `guide`) qui explique la démarche et présente **les deux modes côte à côte**, chacun avec sa propre couleur : « Mode règles » en bleu clair, « Mode IA locale » en violet, avec un état « mode actif » visible.
- **Le sélecteur de mode dans l'en-tête**, synchronisé avec les deux cartes.
- **Une colonne de lecture large** : 1080 px maximum, avec le champ de saisie sur toute cette largeur.

## Fichiers

```
chat/
  chat-loader.js   Chargeur. Seul fichier chargé avec la page (defer, moins de 2 Ko).
  chat.css         Styles de la feuille, du fond animé, des deux coins et des cartes de mode.
  chat-data.js     Contenu : 51 règles de réponse, 16 sections de connaissances, textes de bienvenue.
  chat.js          Interface, moteur de correspondance, recherche, génération locale.
  README.md        Ce document.
```

Les styles du coin bas-droit sont écrits dans `index.html` et `case-studies.html` : ils doivent être visibles avant le chargement différé de `chat.css`.

**Chargement** : `chat.css`, `chat-data.js` et `chat.js` sont chargés immédiatement au survol ou au clic, et sinon en différé 2,2 secondes après la fin du chargement de la page. Ce délai permet à l'aperçu périodique de fonctionner sans interaction. Le modèle de langage (WebLLM) reste chargé uniquement si le visiteur active le mode IA.

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

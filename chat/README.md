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

## Où le chat apparaît sur le site

- **Un coin de page qui se décolle**, en bas à droite. Au repos, un petit coin plié avec une icône et le mot « Une question ? ». Au survol (ou au focus clavier), le coin s'ouvre largement et laisse apparaître l'assistant en diagonale, avec les deux modes expliqués et un bouton d'ouverture. L'effet est obtenu avec deux `clip-path` complémentaires et une transition de taille : aucun script d'animation.
- **Une section « Assistant du portfolio »** dans `index.html`, avant le contact : elle explique les deux modes, montre un aperçu d'échange et propose trois questions cliquables. Un recruteur qui ne remarque pas le coin tombe forcément dessus.
- Les boutons de cette section portent l'attribut `data-chat-open` (avec la question en valeur si besoin) : le chargeur les reconnaît, ouvre la fenêtre et envoie la question.

## Fichiers

```
chat/
  chat-loader.js   Chargeur. Seul fichier chargé avec la page (defer, moins de 2 Ko).
  chat.css         Styles de la fenêtre de chat.
  chat-data.js     Contenu : 51 règles de réponse et 16 sections de connaissances.
  chat.js          Interface, moteur de correspondance, recherche, génération locale.
  README.md        Ce document.
```

Les styles du coin de page sont écrits dans `index.html` et `case-studies.html` : ils doivent être visibles avant le chargement différé de `chat.css`. Les deux pages ne contiennent que le coin de page et l'appel au chargeur.

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

Le coin de page est un vrai bouton avec `aria-expanded` et `aria-controls`, qui s'ouvre au survol comme au focus clavier. La fenêtre est en `role="dialog"` non modale, la zone de messages en `aria-live="polite"`, la fermeture se fait avec `Echap`, le focus va dans le champ à l'ouverture puis revient au bouton à la fermeture, tous les éléments interactifs ont un style `:focus-visible`, et les animations sont désactivées si `prefers-reduced-motion` est actif.

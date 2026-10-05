# Chatbot du portfolio

Un chat à deux modes, entièrement statique, pensé pour GitHub Pages : aucun serveur, aucune clé API, aucun coût.

## Les deux modes

| | Mode règles | Mode IA locale |
|---|---|---|
| Fonctionnement | Analyse des mots-clés de la question, réponse préparée | Petit modèle de langage exécuté dans le navigateur du visiteur |
| Dépendances | Aucune | WebLLM + WebGPU |
| Téléchargement | Aucun | Environ 350 Mo au premier lancement, puis mis en cache |
| Temps de réponse | Instantané | Quelques secondes après chargement du modèle |
| Sources | Implicites | La réponse cite la section du portfolio utilisée |

Le visiteur choisit son mode avec le sélecteur en haut de la fenêtre. Le choix est mémorisé dans son navigateur (`localStorage`). Le mode IA prévient avant tout téléchargement et rappelle que le modèle tourne sur sa machine.

## Fichiers

```
chat/
  chat-loader.js   Chargeur. Seul fichier chargé avec la page (defer, moins d'1 Ko).
  chat.css         Styles du bouton flottant et de la fenêtre.
  chat-data.js     Contenu : réponses du mode règles + base de connaissances du mode IA.
  chat.js          Interface, moteur de règles, recherche dans la base, appel au modèle.
  README.md        Ce document.
```

`index.html` et `case-studies.html` contiennent seulement le bouton flottant et l'appel au chargeur. Tout le reste est injecté à la première ouverture.

## Modifier les réponses

Tout se passe dans `chat-data.js`.

**Mode règles** : chaque entrée de `rules` possède des `keywords` (mots-clés recherchés dans la question) et une `answer`. Le score d'une règle est la somme de la longueur des mots-clés trouvés : une expression longue comme `"chef de projet ia"` pèse donc plus lourd que `"projet"`. Utilisez `links` pour afficher des boutons (`cal`, `email`, `github`, `linkedin`, `case`, `gumroad`, `leadlistqa`, `github_excel`, `github_aiba`, `github_goutte`) et `source` pour le libellé de provenance.

**Mode IA** : le tableau `knowledge` contient les sections du portfolio. Chaque entrée a un `id`, un `title` et un `text`. Quand une information change sur le site, mettez à jour la section correspondante ici, sinon le mode IA répondra avec une version ancienne.

## Comment fonctionne le mode IA

1. Les mots-clés des règles servent de routeur : ils identifient les sujets de la question et élargissent la recherche (une question formulée « combien ça coûte » retrouve la section Tarifs grâce aux mots-clés de la règle correspondante).
2. Les trois sections les plus proches sont extraites de `knowledge` et envoyées au modèle comme seules sources autorisées.
3. Le modèle reçoit pour consigne de répondre uniquement à partir de ces extraits, en trois phrases maximum, de citer la section utilisée, et de refuser poliment si l'information n'est pas dans les extraits.

C'est une version miniature d'un RAG, volontairement lisible : recherche lexicale, sources limitées, refus explicite hors périmètre. Aucun historique de conversation n'est transmis au modèle, ce qui rend les réponses reproductibles.

## Changer de modèle

Dans `chat-data.js`, modifiez `config.model`. La liste des modèles prêts à l'emploi se trouve sur [github.com/mlc-ai/web-llm](https://github.com/mlc-ai/web-llm#-prebuilt-models). Un modèle plus petit télécharge plus vite mais répond moins bien ; `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` est nettement meilleur pour environ 1 Go. Pensez à mettre à jour `config.modelSize`, utilisé dans les messages affichés au visiteur.

## Compatibilité

- Le mode IA nécessite **WebGPU** : Chrome ou Edge 113+ sur ordinateur, et un contexte sécurisé (https, ou `localhost`). Sur les navigateurs ou appareils non compatibles, un message clair s'affiche et le mode règles prend le relais automatiquement. C'est le cas de la plupart des navigateurs mobiles aujourd'hui.
- Le mode règles fonctionne partout, y compris sans JavaScript réseau ni WebGPU.
- Ouvrir les pages avec `file://` casse le mode IA (pas de contexte sécurisé). Pour tester en local :

```bash
python -m http.server 8000
# puis http://localhost:8000
```

## Accessibilité

Bouton flottant avec `aria-expanded` et `aria-controls`, fenêtre en `role="dialog"` non modale, zone de messages en `aria-live="polite"`, fermeture au clavier avec `Echap`, focus déplacé dans le champ à l'ouverture puis rendu au bouton à la fermeture, styles `:focus-visible` sur tous les éléments interactifs.

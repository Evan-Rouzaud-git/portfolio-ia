# Chatbot du portfolio

Un assistant à deux modes, entièrement statique, pensé pour GitHub Pages : aucun serveur, aucune clé API, aucun coût.

## Les deux modes

| | Mode règles | Mode IA locale |
|---|---|---|
| Fonctionnement | Analyse des mots-clés de la question, réponse préparée | Petit modèle de langage exécuté dans le navigateur du visiteur |
| Dépendances | Aucune | WebLLM et WebGPU |
| Téléchargement | Aucun | 350 Mo (modèle standard) ou 250 Mo (version ultra-rapide), une seule fois, puis mis en cache |
| Temps de réponse | Instantané | Premier mot en général sous une seconde après chargement du modèle, puis réponse en flux |
| Sources | Implicites | La réponse cite la section du portfolio utilisée |

Le visiteur choisit son mode avec le petit sélecteur en haut de la fenêtre. Son choix est mémorisé (`localStorage`). Le mode IA demande confirmation avant tout téléchargement et rappelle que le modèle tourne sur sa machine. La phrase de transparence reste affichée sous le champ de saisie : « Mode IA : le modèle est exécuté dans votre navigateur, rien n'est envoyé à un serveur. »

## Où le chat apparaît sur le site

- **Une section « Assistant du portfolio »** dans `index.html`, placée juste avant le contact : elle explique les deux modes, montre un aperçu d'échange et propose trois questions cliquables. Un recruteur qui ne remarque pas la pastille tombe forcément dessus en lisant la page.
- **Une pastille flottante « Une question ? »** en bas à droite, visible en permanence, avec un halo discret pour attirer l'œil sans clignoter.
- Les boutons de la section portent l'attribut `data-chat-open` (avec la question en valeur si besoin) : le chargeur les reconnaît, ouvre la fenêtre et envoie la question directement.

## Fichiers

```
chat/
  chat-loader.js   Chargeur. Seul fichier chargé avec la page (defer, moins de 2 Ko).
  chat.css         Styles de la pastille et de la fenêtre.
  chat-data.js     Contenu : réponses du mode règles et base de connaissances du mode IA.
  chat.js          Interface, moteur de règles, recherche dans la base, génération locale.
  README.md        Ce document.
```

`index.html` et `case-studies.html` ne contiennent que la pastille et l'appel au chargeur.

## Modifier les réponses

Tout se passe dans `chat-data.js`.

**Mode règles** : chaque entrée de `rules` a des `keywords` et une `answer`. Le score d'une règle est la somme de la longueur des mots-clés trouvés : une expression longue comme `"chef de projet ia"` pèse donc plus lourd que `"projet"`. `links` affiche des boutons (`cal`, `email`, `github`, `linkedin`, `case`, `gumroad`, `leadlistqa`, `github_excel`, `github_aiba`, `github_goutte`), `source` alimente le libellé de provenance.

**Mode IA** : le tableau `knowledge` contient les sections du portfolio (`id`, `title`, `text`). Quand une information change sur le site, mettez à jour la section correspondante ici, sinon le mode IA répondra avec une version ancienne.

## Comment fonctionne le mode IA

1. Les mots-clés des règles servent de routeur : ils identifient les sujets de la question et élargissent la recherche (une question formulée « combien ça coûte » retrouve la section Tarifs grâce aux mots-clés de la règle correspondante).
2. Les **deux** sections les plus proches sont extraites et coupées à 420 caractères, à la fin d'une phrase.
3. Le modèle reçoit pour consigne de répondre uniquement à partir de ces extraits, en deux phrases maximum, de citer la section utilisée, et de refuser si l'information n'y est pas.

C'est une version miniature d'un RAG, volontairement lisible : recherche lexicale, sources limitées, refus explicite hors périmètre.

## Ce qui rend le mode IA rapide

Quatre leviers, dans l'ordre d'impact :

1. **Réponse en flux (streaming)** : le texte s'affiche mot après mot au lieu d'attendre la fin de la génération. C'est ce qui change le plus la perception de vitesse.
2. **Contexte très court** : deux extraits de 420 caractères au lieu de trois sections complètes. Le modèle lit quelques centaines de jetons, pas quelques milliers : le premier mot arrive presque tout de suite.
3. **`resetChat()` avant chaque question** : sans cet appel, l'historique s'accumule dans le moteur et chaque réponse devient plus lente que la précédente.
4. **`max_tokens` à 120** : une réponse de portfolio tient en deux phrases.

Le choix du modèle vient en dernier : `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` (350 Mo, correct en français) par défaut, et `SmolLM2-360M-Instruct-q4f16_1-MLC` (250 Mo) proposé comme version ultra-rapide. Un modèle plus petit que ceux-ci dégrade nettement le français.

## Changer de modèle

Dans `chat-data.js`, modifiez `config.model` et `config.modelFast`. La liste des modèles prêts à l'emploi se trouve sur [github.com/mlc-ai/web-llm](https://github.com/mlc-ai/web-llm#-prebuilt-models). Mettez à jour `modelSize` et `modelFastSize`, utilisés dans les messages affichés au visiteur.

## Compatibilité

- Le mode IA nécessite **WebGPU** : Chrome ou Edge 113+ sur ordinateur, en contexte sécurisé (https, ou `localhost`). Sur les navigateurs ou appareils non compatibles, un message clair s'affiche et le mode règles prend le relais automatiquement. C'est le cas de la plupart des navigateurs mobiles aujourd'hui.
- Le mode règles fonctionne partout.
- Ouvrir les pages avec `file://` casse le mode IA (pas de contexte sécurisé). Pour tester en local :

```bash
python -m http.server 8000
# puis http://localhost:8000
```

## Accessibilité

Pastille avec `aria-expanded` et `aria-controls`, fenêtre en `role="dialog"` non modale, zone de messages en `aria-live="polite"`, fermeture au clavier avec `Echap`, focus placé dans le champ à l'ouverture puis rendu à la pastille à la fermeture, styles `:focus-visible` sur tous les éléments interactifs, animations désactivées si `prefers-reduced-motion` est actif.

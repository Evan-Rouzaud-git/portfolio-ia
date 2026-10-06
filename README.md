# Portfolio IA : Evan Rouzaud

Portfolio de présentation pour des missions freelance en IA appliquée : cadrage du besoin, pilotage de projet et développement de la solution.

**Site en ligne :** https://evan-rouzaud-git.github.io/portfolio-ia/

## Contenu

| Fichier | Rôle |
|---|---|
| `index.html` | Page dédiée au portfolio interactif : elle ne contient que l'assistant, qui s'ouvre au chargement |
| `site.html` | Le site : ce que je fais, case studies, à propos, tarifs, contact |
| `case-studies.html` | Trois études de cas détaillées : InSight, Lead List QA, AI Business Analyst Workbench |
| `chat/` | Portfolio interactif : mode règles et mode IA locale exécutée dans le navigateur |
| `videos/` | Démonstrations vidéo des cinq projets |
| `photo_evan.jpeg` | Portrait |

## Portfolio interactif

Le site et le portfolio interactif sont deux pages distinctes. `index.html` ne contient que
l'assistant : il s'ouvre au chargement et son bouton du coin ramène à `site.html`. Depuis le
site ou les case studies, le bouton en bas à droite ouvre le portfolio interactif par-dessus
la page, à la demande.

L'assistant propose deux modes :

- **Mode règles** : correspondance par mots-clés sur 52 réponses préparées. Instantané, sans téléchargement.
- **Mode IA locale** : un petit modèle de langage (Qwen2.5 0.5B, via WebGPU et WebLLM) tourne dans le navigateur du visiteur. Aucun serveur, aucune clé API, aucune donnée transmise.

Détails, personnalisation et vérification du contenu : `chat/README.md`.

## Voir le site en local

Les pages sont entièrement statiques. Un serveur local reste nécessaire pour le mode IA, car WebGPU exige un contexte sécurisé :

```bash
python -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Contact

- E-mail : evanrouzaud@gmail.com
- Agenda : https://cal.com/rouzaud-evan-izeqwf/30min
- LinkedIn : https://www.linkedin.com/in/evanrouzaud

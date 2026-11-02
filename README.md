# QCM Révisions

Site statique (zéro build, zéro serveur requis) pour réviser ses cours sous forme de QCM.
Le QCM est décrit dans un fichier YAML ; le site le lit localement dans le navigateur.

## Lancer le site

Ouvre `index.html` directement dans le navigateur, ou bien sers le dossier :

```bash
cd qcm && python3 -m http.server 8000
# puis http://localhost:8000
```

## Dossier de QCM (`qcm/`)

Le dossier `qcm/` contient les QCM générés (un YAML par cours). Sur la page d'accueil :

- **Choisir le dossier des QCM** (Chrome/Edge, File System Access API) : le dossier est
  mémorisé, ses fichiers `.yaml` sont listés et ouvrables d'un clic ; le bouton
  **Déposer un QCM** écrit un nouveau fichier YAML (validé avant écriture) dans ce dossier.
- **Sans navigateur compatible** (ou site servi en HTTP) : la page lit le manifeste
  `qcm/index.json` et liste les QCM disponibles en lecture seule.
- Régénérer le manifeste après ajout manuel de fichiers : `node qcm/maj-index.js`.

## Format du fichier QCM (v1)

```yaml
titre: Thermodynamique — Chapitre 3   # requis
matiere: Physique L2                   # optionnel
melanger_questions: true               # optionnel, défaut true
melanger_options: true                 # optionnel, défaut true

questions:                             # requis, liste non vide
  - id: thermo-01                      # optionnel (auto : q1, q2...)
    type: qcm                          # qcm | qcm_multiple | vrai_faux (défaut : qcm)
    enonce: "Question..."              # requis
    options:                           # requis pour qcm / qcm_multiple (>= 2 options)
      - { texte: "Réponse A", exacte: true }   # qcm : exactement 1 exacte ; qcm_multiple : >= 1
      - { texte: "Réponse B" }
    reponse: true                      # vrai_faux uniquement : true/false
    justification: "Explication..."    # requis — affichée après chaque réponse
    chapitre: Premier principe         # optionnel — filtre
    niveau: 2                          # optionnel, 1-3 — filtre
    tags: [premier-principe]           # optionnel — filtre
```

Règles de validation appliquées à l'import : `titre` et `questions` requis,
`enonce` et `justification` requis par question, cohérence du nombre de réponses
exactes selon le type. Les erreurs sont listées à l'écran.

Un exemple complet : [`exemples/exemple.yaml`](exemples/exemple.yaml) (aussi intégré
au site via le bouton « Charger l'exemple »).

## Fonctionnalités

- Import par glisser-déposer ou sélecteur de fichier (`.yaml` / `.yml`), 100 % local.
- Dossier de QCM listé depuis la page d'accueil (dossier local via File System Access API,
  ou manifeste `qcm/index.json` en HTTP), avec dépôt de nouveaux QCM dans le dossier.
- Filtres : chapitre, tag, niveau de difficulté.
- Deux modes : **révision** (correction immédiate + justification) et **examen** (score à la fin).
- Mélange des questions et des options (désactivable dans le YAML).
- Écran de résultats avec recap question par question et « rejouer les ratées ».
- Aucune persistance : les scores ne sont ni enregistrés ni envoyés (100 % local).

## Structure

```
├── index.html            # page unique
├── css/style.css
├── js/app.js             # moteur du quiz
├── js/validation.js      # validation/normalisation du format (testable sous Node)
├── js/exemple.js         # exemple embarqué (généré depuis exemples/exemple.yaml)
├── exemples/exemple.yaml # QCM d'exemple
├── qcm/                  # dossier des QCM générés (listé sur la page d'accueil)
│   ├── index.json        # manifeste (régénéré par maj-index.js)
│   └── maj-index.js      # node qcm/maj-index.js
└── vendor/js-yaml.min.js # parser YAML embarqué (fonctionne hors-ligne)
```

## Prochaine étape prévue

Un skill Vibe qui, à partir d'un cours en PDF, génère le fichier YAML décrit ci-dessus.

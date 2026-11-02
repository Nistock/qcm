# Format QCM v1 (référence pour le skill qcm-depuis-pdf)

Spec officielle : voir le `README.md` du site QCM. Résumé opérationnel :

```yaml
titre: Titre du QCM            # requis
matiere: Matière               # optionnel
melanger_questions: true       # optionnel, défaut true
melanger_options: true         # optionnel, défaut true

questions:                     # requis, liste non vide
  - id: prefixe-01              # optionnel (auto : q1, q2...)
    type: qcm                  # qcm | qcm_multiple | vrai_faux (défaut : qcm)
    enonce: "Question..."      # requis
    options:                   # requis pour qcm / qcm_multiple (>= 2 options)
      - { texte: "A", exacte: true }   # qcm : exactement 1 exacte ; qcm_multiple : >= 1
      - { texte: "B" }
    reponse: true              # vrai_faux uniquement : true/false
    justification: "... p. 12" # requis — affiché après chaque réponse, cite la page
    chapitre: Nom de section   # optionnel — filtre dans le site
    niveau: 2                  # optionnel, 1-3 — filtre dans le site
    tags: [tag-1, a-verifier]  # optionnel — filtre ; a-verifier = à relire par l'humain
```

Règles de validation (appliquées par `js/validation.js`) :
- `titre` et `questions` (non vide) requis.
- `enonce` et `justification` (non vides) requis pour chaque question.
- `qcm` : exactement 1 option `exacte: true`. `qcm_multiple` : au moins 1.
- `vrai_faux` : champ `reponse` booléen requis, pas d'options.
- `niveau` : entier 1-3 si présent.

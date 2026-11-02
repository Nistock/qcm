---
name: qcm-depuis-pdf
description: Load this skill when the user wants to turn one or more course PDFs into a single QCM revision file (YAML format v1) for the local QCM site. Extracts the PDF text with pdftotext, drafts qcm / qcm_multiple / vrai_faux questions whose enonces, options and justifications are grounded in the source (with source-file and page citations), writes one merged YAML and validates it with the site's js/validation.js. Never invent course content; tag ambiguous passages with a-verifier.
---

# qcm-depuis-pdf

Génère un fichier QCM (YAML, format v1) à partir d'un cours PDF, prêt à être ouvert dans le site QCM.

## Usage

```
/qcm-depuis-pdf <cours1.pdf> [cours2.pdf ...] [--pages N-M] [--sortie <fichier.yaml>]
```

- **Un seul YAML en sortie**, fusionnant tous les PDF donnés en entrée (mêmes thèmes
  ou non). Pour obtenir plusieurs QCM séparés, relancer le skill PDF par PDF.
- Nom de sortie : `--sortie <fichier.yaml>` si fourni ; sinon le fichier est écrit dans
  le **dossier `qcm/` du site QCM** (`$QCM_SITE_DIR/qcm/`, créé si besoin) sous le nom
  `<nom-du-premier-pdf>.qcm.yaml` — c'est le dossier listé sur la page d'accueil du site.
- `--pages N-M` restreint l'extraction aux pages N à M (appliqué à chaque PDF).
- Sans `--pages`, le skill analyse tout le document et choisit lui-même la granularité
  (chapitres/sections détectés via les titres, ou blocs de pages si la structure est plate).

## Étapes

1. **Vérifier l'extraction de chaque PDF.** `pdfinfo <pdf>` pour le nombre de pages, puis
   `pdftotext -layout <pdf> -` (ajouter `-f N -l M` si `--pages`).
   Les pages sont séparées par des sauts de page (`\f`) : s'en servir pour citer les pages.
   Si le texte extrait d'un PDF est vide ou quasi vide, il est probablement scanné :
   STOP, signaler à l'utilisateur qu'un OCR est nécessaire, ne rien générer.
   **Conserver pour chaque extrait le nom du PDF source** : les citations devront
   préciser le fichier, ex. « d'après cours2.pdf p. 3 : ... ».

2. **Analyser et découper.** Repérer la structure (titres de chapitres/sections,
   définitions, théorèmes, formules, listes). Choisir la granularité la plus adaptée :
   une section détectée = un bloc de questions, ou blocs de quelques pages si le
   document n'a pas de structure claire. Ne pas hésiter à ignorer les introductions
   purement narratives sans contenu vérifiable.

3. **Rédiger les questions** en respectant STRICTEMENT le format v1
   (voir `references/format-qcm.md`) :
   - Types autorisés : `qcm` (exactement 1 option `exacte: true`), `qcm_multiple`
     (au moins 1 exacte), `vrai_faux` (`reponse: true/false`). 4 options par défaut
     pour les qcm.
   - **Jamais d'invention** : énoncé, options et justification doivent être
     justifiables par le texte extrait. Chaque `justification` cite le fichier source
     et la page (ex. « d'après cours1.pdf p. 12 : ... »).
   - Les distracteurs doivent être plausibles (confusions fréquentes) mais faux
     d'après la source.
   - Passage ambigu ou insuffisant pour trancher : garder la question mais la taguer
     `a-verifier` et expliquer pourquoi dans la justification.
   - `id` : `<nom-du-pdf-source-sans-extension>-NN` (ex. `thermo-ch3-01`) — unique
     dans tout le fichier fusionné.
   - `chapitre` : titre de la section ; `niveau` 1-3 estimé ; `tags` en
     minuscules avec tirets.
   - Échapper correctement le YAML (deux-points, guillemets, formules) : préférer
     les chaînes entre guillemets doubles ou les blocs `|`.

4. **Écrire un seul fichier** YAML fusionné à l'emplacement choisi (`--sortie`, ou
   `<QCM_SITE>/qcm/<nom-du-premier-pdf>.qcm.yaml` par défaut).

5. **Valider automatiquement** avec le validateur du site (script embarqué dans le skill) :
   ```bash
   node "$(dirname "$0")/validate.js" <fichier.yaml>   # ou chemin absolu vers validate.js
   ```
   Le répertoire du site QCM se règle via la variable d'env `QCM_SITE_DIR`
   (défaut : `/home/nino/Documents/dev/qcm`). Corriger et re-valider jusqu'à obtenir `OK`.
   Si le fichier a été écrit dans `<QCM_SITE>/qcm/`, régénérer le manifeste de la page
   d'accueil : `node <QCM_SITE>/qcm/maj-index.js`.

6. **Résumer** : chemin du YAML fusionné, nombre de questions par type et par PDF
   source, nombre de questions taguées `a-verifier` à relire ; puis comment ouvrir
   le fichier dans le site (glisser-déposer dans `index.html`).

## Pièges

- `pdftotext -layout` conserve mieux les tableaux/formules que le mode par défaut.
- Ne pas tronquer les formules : une option contenant `ΔU = W + Q` doit rester exacte.
- Le validateur rejette un `qcm` sans exactement 1 réponse exacte : compter les
  `exacte: true` avant d'écrire.

/* Validation du format QCM. Fonctions pures, utilisables dans le navigateur
   (window.validerQuiz) et sous Node (module.exports) pour les tests. */
(function (root) {
  'use strict';

  var TYPES = ['qcm', 'qcm_multiple', 'vrai_faux'];

  function validerQuiz(data) {
    var erreurs = [];
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { ok: false, erreurs: ['Le fichier doit contenir un objet YAML racine.'] };
    }
    if (typeof data.titre !== 'string' || !data.titre.trim()) {
      erreurs.push('Champ "titre" requis (titre du QCM).');
    }
    if (!Array.isArray(data.questions) || data.questions.length === 0) {
      erreurs.push('Champ "questions" requis : liste non vide de questions.');
      return { ok: false, erreurs: erreurs };
    }

    data.questions.forEach(function (q, i) {
      var ref = q && q.id ? '"' + q.id + '"' : 'question #' + (i + 1);
      if (!q || typeof q !== 'object') {
        erreurs.push(ref + ' : doit être un objet.');
        return;
      }
      if (typeof q.enonce !== 'string' || !q.enonce.trim()) {
        erreurs.push(ref + ' : champ "enonce" requis.');
      }
      var type = q.type || 'qcm';
      if (TYPES.indexOf(type) === -1) {
        erreurs.push(ref + ' : type "' + type + '" inconnu (attendu : ' + TYPES.join(', ') + ').');
        return;
      }
      if (typeof q.justification !== 'string' || !q.justification.trim()) {
        erreurs.push(ref + ' : champ "justification" requis (même court).');
      }
      if (q.niveau !== undefined && (typeof q.niveau !== 'number' || q.niveau < 1 || q.niveau > 3)) {
        erreurs.push(ref + ' : "niveau" doit être un nombre entre 1 et 3.');
      }

      if (type === 'qcm' || type === 'qcm_multiple') {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          erreurs.push(ref + ' : type ' + type + ' exige au moins 2 options.');
          return;
        }
        var exactes = q.options.filter(function (o) { return o && o.exacte === true; });
        q.options.forEach(function (o, j) {
          if (!o || typeof o.texte !== 'string' || !o.texte.trim()) {
            erreurs.push(ref + ' : option ' + (j + 1) + ' sans "texte".');
          }
        });
        if (type === 'qcm' && exactes.length !== 1) {
          erreurs.push(ref + ' : type qcm exige exactement 1 option "exacte: true" (' + exactes.length + ' trouvée(s)).');
        }
        if (type === 'qcm_multiple' && exactes.length < 1) {
          erreurs.push(ref + ' : type qcm_multiple exige au moins 1 option "exacte: true".');
        }
      }
      if (type === 'vrai_faux' && typeof q.reponse !== 'boolean') {
        erreurs.push(ref + ' : type vrai_faux exige "reponse: true" ou "reponse: false".');
      }
    });

    return { ok: erreurs.length === 0, erreurs: erreurs };
  }

  // Normalise : id auto, type par défaut, options par défaut.
  function normaliser(data) {
    var questions = data.questions.map(function (q, i) {
      var n = Object.assign({}, q);
      if (!n.id) n.id = 'q' + (i + 1);
      if (!n.type) n.type = 'qcm';
      if (!Array.isArray(n.tags)) n.tags = [];
      return n;
    });
    return Object.assign({}, data, {
      melanger_questions: data.melanger_questions !== false,
      melanger_options: data.melanger_options !== false,
      questions: questions
    });
  }

  var api = { TYPES: TYPES, validerQuiz: validerQuiz, normaliser: normaliser };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.QCMValidation = api;
})(typeof window !== 'undefined' ? window : globalThis);

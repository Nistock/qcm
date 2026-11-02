/* Moteur du site de QCM. Dépend de js-yaml (global jsyaml) et QCMValidation. */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var quizMeta = document.getElementById('quiz-meta');
  var fileInput = document.getElementById('file-input');
  var dropzone = document.getElementById('dropzone');
  var accueilEl = document.getElementById('ecran-accueil');

  var etat = {
    data: null,            // QCM normalisé
    source: null,          // nom du fichier chargé
    questions: [],         // questions filtrées, dans l'ordre d'affichage
    index: 0,
    mode: 'revision',      // 'revision' | 'examen'
    reponses: {},          // id -> { choix, correct, repondu }
    filtres: { chapitre: '', tag: '', niveau: '' }
  };

  /* ---------- Utilitaires ---------- */

  function melanger(tab) {
    var t = tab.slice();
    for (var i = t.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = t[i]; t[i] = t[j]; t[j] = tmp;
    }
    return t;
  }

  function el(tag, attrs, enfants) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') e.className = attrs[k];
        else if (k === 'text') e.textContent = attrs[k];
        else e.setAttribute(k, attrs[k]);
      });
    }
    (enfants || []).forEach(function (enf) { if (enf) e.appendChild(enf); });
    return e;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Import ---------- */

  function importerYaml(texte, source) {
    var data;
    try {
      data = jsyaml.load(texte);
    } catch (e) {
      afficherErreursImport(['YAML illisible : ' + e.message]);
      return;
    }
    var res = QCMValidation.validerQuiz(data);
    if (!res.ok) {
      afficherErreursImport(res.erreurs);
      return;
    }
    etat.data = QCMValidation.normaliser(data);
    etat.source = source;
    etat.reponses = {};
    quizMeta.textContent = etat.data.titre + (etat.data.matiere ? ' — ' + etat.data.matiere : '');
    afficherErreursImport(null);
    renderConfig();
  }

  function afficherErreursImport(erreurs) {
    var box = document.getElementById('erreurs-import');
    if (!erreurs || !erreurs.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = '<strong>Le fichier n\'est pas valide :</strong><ul>' +
      erreurs.map(function (e) { return '<li>' + escapeHtml(e) + '</li>'; }).join('') + '</ul>';
  }

  /* ---------- Écran de configuration ---------- */

  function chapitresUniques() {
    var s = {};
    etat.data.questions.forEach(function (q) { if (q.chapitre) s[q.chapitre] = true; });
    return Object.keys(s).sort();
  }
  function tagsUniques() {
    var s = {};
    etat.data.questions.forEach(function (q) { q.tags.forEach(function (t) { s[t] = true; }); });
    return Object.keys(s).sort();
  }

  function renderConfig() {
    app.innerHTML = '';
    var card = el('section', { class: 'card config' });
    card.appendChild(el('h2', { text: 'Configuration de la session' }));
    card.appendChild(el('p', { class: 'muted', text: etat.data.questions.length + ' question(s) dans "' + etat.data.titre + '" (' + etat.source + ').' }));

    var ligneFiltres = el('div', { class: 'config-ligne' });
    ligneFiltres.appendChild(selectFiltre('Chapitre', chapitresUniques(), 'chapitre'));
    ligneFiltres.appendChild(selectFiltre('Tag', tagsUniques(), 'tag'));
    var selNiveau = el('label', { text: 'Niveau' });
    var ns = el('select', { id: 'filtre-niveau' });
    ns.appendChild(el('option', { value: '', text: 'Tous' }));
    [1, 2, 3].forEach(function (n) { ns.appendChild(el('option', { value: String(n), text: 'Niveau ' + n })); });
    ns.addEventListener('change', function () { etat.filtres.niveau = ns.value; });
    selNiveau.appendChild(ns);
    ligneFiltres.appendChild(selNiveau);
    card.appendChild(ligneFiltres);

    var ligneMode = el('div', { class: 'config-ligne' });
    var modeChoix = el('div', { class: 'mode-choix' });
    [['revision', 'Révision (correction immédiate + justification)'], ['examen', 'Examen (score à la fin)']].forEach(function (m) {
      var lab = el('label', {});
      var radio = el('input', { type: 'radio', name: 'mode', value: m[0] });
      if (etat.mode === m[0]) radio.checked = true;
      radio.addEventListener('change', function () { etat.mode = m[0]; });
      lab.appendChild(radio);
      lab.appendChild(document.createTextNode(m[1]));
      modeChoix.appendChild(lab);
    });
    ligneMode.appendChild(modeChoix);
    card.appendChild(ligneMode);

    var actions = el('div', { class: 'actions' });
    var btnStart = el('button', { class: 'btn', text: 'Commencer' });
    btnStart.addEventListener('click', demarrerSession);
    var btnRecharger = el('button', { class: 'btn secondaire', text: 'Charger un autre fichier' });
    btnRecharger.addEventListener('click', renderAccueil);
    actions.appendChild(btnStart);
    actions.appendChild(btnRecharger);
    card.appendChild(actions);

    app.appendChild(card);
  }

  function selectFiltre(label, valeurs, cle) {
    var lab = el('label', { text: label });
    var sel = el('select', {});
    sel.appendChild(el('option', { value: '', text: 'Tous' }));
    valeurs.forEach(function (v) { sel.appendChild(el('option', { value: v, text: v })); });
    sel.addEventListener('change', function () { etat.filtres[cle] = sel.value; });
    lab.appendChild(sel);
    return lab;
  }

  /* ---------- Session de quiz ---------- */

  function questionsFiltrees() {
    return etat.data.questions.filter(function (q) {
      if (etat.filtres.chapitre && q.chapitre !== etat.filtres.chapitre) return false;
      if (etat.filtres.tag && q.tags.indexOf(etat.filtres.tag) === -1) return false;
      if (etat.filtres.niveau && String(q.niveau) !== etat.filtres.niveau) return false;
      return true;
    });
  }

  function demarrerSession() {
    var qs = questionsFiltrees();
    if (!qs.length) { alert('Aucune question ne correspond aux filtres.'); return; }
    if (etat.data.melanger_questions) qs = melanger(qs);
    etat.questions = qs;
    etat.index = 0;
    renderQuestion();
  }

  function rejouerRatees() {
    var ratees = etat.questions.filter(function (q) {
      var r = etat.reponses[q.id];
      return r && r.repondu && !r.correct;
    });
    if (!ratees.length) { alert('Aucune question ratée, bravo !'); return; }
    etat.questions = etat.data.melanger_questions ? melanger(ratees) : ratees;
    etat.index = 0;
    renderQuestion();
  }

  function optionsMelangees(q) {
    if (!etat.data.melanger_options || !q.options) return (q.options || []).slice();
    return melanger(q.options);
  }

  function renderQuestion() {
    var q = etat.questions[etat.index];
    var rep = etat.reponses[q.id];
    app.innerHTML = '';

    var card = el('section', { class: 'card' });

    var barre = el('div', { class: 'progression' });
    var remplissage = el('div');
    remplissage.style.width = (etat.index / etat.questions.length * 100) + '%';
    barre.appendChild(remplissage);
    card.appendChild(barre);

    card.appendChild(el('div', { class: 'numero-question', text: 'Question ' + (etat.index + 1) + ' / ' + etat.questions.length + ' — ' + q.id }));
    card.appendChild(el('p', { class: 'enonce', text: q.enonce }));

    var meta = el('div', { class: 'meta-question' });
    meta.appendChild(el('span', { text: 'type : ' + q.type }));
    if (q.chapitre) meta.appendChild(el('span', { text: q.chapitre }));
    if (q.niveau) meta.appendChild(el('span', { text: 'niveau ' + q.niveau }));
    q.tags.forEach(function (t) { meta.appendChild(el('span', { text: '#' + t })); });
    card.appendChild(meta);

    var corps = el('div', {});
    if (q.type === 'qcm' || q.type === 'qcm_multiple') corps.appendChild(renderOptions(q, rep));
    else corps.appendChild(renderVraiFaux(q, rep));
    card.appendChild(corps);

    var feedback = el('div', { id: 'feedback' });
    card.appendChild(feedback);

    if (rep && rep.repondu) afficherFeedback(q, rep, feedback);

    var nav = el('div', { class: 'navigation' });
    var btnValider = el('button', { class: 'btn', text: etat.mode === 'revision' ? 'Valider' : 'Enregistrer la réponse' });
    btnValider.disabled = !!(rep && rep.repondu);
    btnValider.addEventListener('click', function () { validerReponse(q); });
    var btnSuivant = el('button', { class: 'btn secondaire', text: etat.index === etat.questions.length - 1 ? 'Voir les résultats' : 'Suivant' });
    btnSuivant.disabled = !rep || !rep.repondu;
    btnSuivant.addEventListener('click', function () {
      if (etat.index === etat.questions.length - 1) renderResultats();
      else { etat.index++; renderQuestion(); }
    });
    nav.appendChild(btnValider);
    nav.appendChild(btnSuivant);
    card.appendChild(nav);

    app.appendChild(card);
  }

  function renderOptions(q, rep) {
    var multiple = q.type === 'qcm_multiple';
    var wrap = el('div', { class: 'options' });
    var lettres = 'ABCDEFGH';
    optionsMelangees(q).forEach(function (opt, i) {
      var inputType = multiple ? 'checkbox' : 'radio';
      var input = el('input', { type: inputType, name: 'opt-' + q.id });
      var choisi = rep && rep.choix && rep.choix.indexOf(opt.texte) !== -1;
      input.checked = !!choisi;
      input.disabled = !!(rep && rep.repondu);
      var lab = el('label', { class: 'option' + (choisi ? ' selectionnee' : '') });
      lab.appendChild(el('span', { class: 'lettre', text: lettres[i] + '.' }));
      lab.appendChild(input);
      lab.appendChild(el('span', { text: opt.texte }));
      input.addEventListener('change', function () {
        lab.classList.toggle('selectionnee', input.checked);
      });
      wrap.appendChild(lab);
    });
    return wrap;
  }

  function renderVraiFaux(q, rep) {
    var wrap = el('div', { class: 'options' });
    [['true', 'Vrai'], ['false', 'Faux']].forEach(function (v) {
      var btn = el('button', { class: 'btn secondaire', text: v[1] });
      btn.style.minWidth = '120px';
      if (rep && rep.repondu) btn.disabled = true;
      if (rep && rep.choix === v[0]) btn.classList.add('selectionnee');
      btn.addEventListener('click', function () {
        etat.reponses[q.id] = { choix: v[0], repondu: false, correct: false };
        renderQuestion();
      });
      wrap.appendChild(btn);
    });
    return wrap;
  }

  /* ---------- Évaluation ---------- */

  function evaluer(q, reponse) {
    if (!reponse) return false;
    if (q.type === 'qcm') {
      var exactes = q.options.filter(function (o) { return o.exacte; }).map(function (o) { return o.texte; });
      return reponse.choix && reponse.choix.length === 1 && reponse.choix[0] === exactes[0];
    }
    if (q.type === 'qcm_multiple') {
      var ex = q.options.filter(function (o) { return o.exacte; }).map(function (o) { return o.texte; }).sort();
      var ch = (reponse.choix || []).slice().sort();
      return ex.length === ch.length && ex.every(function (v, i) { return v === ch[i]; });
    }
    if (q.type === 'vrai_faux') {
      return reponse.choix === String(q.reponse);
    }
    return false;
  }

  function validerReponse(q) {
    var rep;
    if (q.type === 'qcm' || q.type === 'qcm_multiple') {
      var coches = Array.prototype.slice.call(app.querySelectorAll('.options input:checked'));
      if (!coches.length) { alert('Sélectionne au moins une réponse.'); return; }
      // on retrouve le texte de chaque option cochée via le label voisin
      rep = { choix: coches.map(function (c) { return c.parentNode.querySelector('span:last-child').textContent; }), repondu: true, correct: false };
    } else {
      rep = etat.reponses[q.id];
      if (!rep || !rep.choix) { alert('Choisis Vrai ou Faux.'); return; }
      rep.repondu = true;
    }

    rep.correct = evaluer(q, rep);
    etat.reponses[q.id] = rep;
    renderQuestion();
  }

  function afficherFeedback(q, rep, conteneur) {
    conteneur.innerHTML = '';
    var box = el('div', { class: 'feedback ' + (rep.correct ? 'bon' : 'faux') });
    box.appendChild(el('div', { class: 'verdict', text: rep.correct ? 'Bonne réponse !' : 'Mauvaise réponse.' }));
    if (!rep.correct) {
      var bonne = q.type === 'vrai_faux'
        ? (q.reponse ? 'Vrai' : 'Faux')
        : q.options.filter(function (o) { return o.exacte; }).map(function (o) { return o.texte; }).join(' ; ');
      box.appendChild(el('p', { class: 'bonne-reponse', text: 'Bonne réponse : ' + bonne }));
    }
    box.appendChild(el('p', { class: 'justification', text: 'Justification : ' + q.justification }));
    conteneur.appendChild(box);
  }

  /* ---------- Résultats ---------- */

  function renderResultats() {
    app.innerHTML = '';
    var repondus = etat.questions.filter(function (q) { var r = etat.reponses[q.id]; return r && r.repondu; });
    var bons = repondus.filter(function (q) { return etat.reponses[q.id].correct === true; });
    var faux = repondus.filter(function (q) { return etat.reponses[q.id].correct === false; });
    var score = repondus.length ? Math.round(bons.length / repondus.length * 100) : 0;

    var card = el('section', { class: 'card resultats' });
    card.appendChild(el('h2', { text: 'Résultats' }));
    card.appendChild(el('div', { class: 'score-gros', text: score + ' %' }));
    var sur = el('div', { class: 'muted' });
    sur.textContent = bons.length + ' bonnes, ' + faux.length + ' mauvaises' +
      ' sur ' + repondus.length + ' répondues.';
    card.appendChild(sur);
    var barre = el('div', { class: 'barre-score' });
    var r = el('div'); r.style.width = score + '%'; barre.appendChild(r);
    card.appendChild(barre);

    var liste = el('div', { class: 'liste-recap' });
    etat.questions.forEach(function (q) {
      var rep = etat.reponses[q.id];
      if (!rep || !rep.repondu) return;
      var item = el('div', { class: 'recap-item ' + (rep.correct === true ? 'bon' : rep.correct === false ? 'faux' : '') });
      var statut = rep.correct === true ? 'BON' : rep.correct === false ? 'FAUX' : 'AUTO';
      item.appendChild(el('span', { class: 'statut', text: statut }));
      item.appendChild(el('span', { text: q.enonce }));
      var det = el('details', {});
      det.appendChild(el('summary', { text: 'Voir la correction' }));
      if (rep.correct !== true) {
        if (q.type === 'vrai_faux') det.appendChild(el('p', { class: 'bonne-reponse', text: 'Bonne réponse : ' + (q.reponse ? 'Vrai' : 'Faux') }));
        else det.appendChild(el('p', { class: 'bonne-reponse', text: 'Bonne réponse : ' + q.options.filter(function (o) { return o.exacte; }).map(function (o) { return o.texte; }).join(' ; ') }));
      }
      det.appendChild(el('p', { class: 'justification', text: q.justification }));
      item.appendChild(det);
      liste.appendChild(item);
    });
    card.appendChild(liste);

    var actions = el('div', { class: 'actions' });
    var bRejouer = el('button', { class: 'btn', text: 'Rejouer les questions ratées (' + faux.length + ')' });
    bRejouer.disabled = faux.length === 0;
    bRejouer.addEventListener('click', rejouerRatees);
    var bRestart = el('button', { class: 'btn secondaire', text: 'Refaire le QCM' });
    bRestart.addEventListener('click', function () { etat.reponses = {}; demarrerSession(); });
    var bAccueil = el('button', { class: 'btn secondaire', text: 'Charger un autre fichier' });
    bAccueil.addEventListener('click', renderAccueil);
    actions.appendChild(bRejouer); actions.appendChild(bRestart); actions.appendChild(bAccueil);
    card.appendChild(actions);

    app.appendChild(card);
  }

  /* ---------- Accueil ---------- */

  function renderAccueil() {
    quizMeta.textContent = '';
    etat.data = null;
    app.innerHTML = '';
    app.appendChild(accueilEl);
    accueilEl.hidden = false;
  }

  /* ---------- Dossier de QCM (liste + dépôt) ---------- */

  var dossier = { handle: null, nom: null };
  var btnDossier = document.getElementById('btn-dossier');
  var btnDeposer = document.getElementById('btn-deposer');
  var fileDepot = document.getElementById('file-depot');
  var infoDossier = document.getElementById('info-dossier');
  var listeQCM = document.getElementById('liste-qcm');

  function idbOpen() {
    return new Promise(function (resolve, reject) {
      if (!('indexedDB' in window)) { reject(new Error('IDB indisponible')); return; }
      var req = indexedDB.open('qcm-site', 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('handles'); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function idbSet(handle) {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('handles', 'readwrite');
        tx.objectStore('handles').put(handle, 'dossierQCM');
        tx.oncomplete = resolve; tx.onerror = function () { reject(tx.error); };
      });
    }).catch(function () { /* persistance best-effort */ });
  }
  function idbGet() {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('handles', 'readonly');
        var req = tx.objectStore('handles').get('dossierQCM');
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    }).catch(function () { return null; });
  }

  function setInfo(msg) { infoDossier.textContent = msg || ''; }

  function renderListe(entrees) {
    listeQCM.innerHTML = '';
    if (!entrees.length) { setInfo('Aucun fichier .yaml dans ce dossier.'); return; }
    setInfo(entrees.length + ' QCM disponible(s) :');
    entrees.forEach(function (e) {
      var li = el('li', {});
      li.appendChild(el('span', { class: 'nom', text: e.nom }));
      var droite = el('span', {});
      if (e.taille != null) droite.appendChild(el('span', { class: 'taille', text: e.taille + ' o' }));
      var b = el('button', { class: 'btn', text: 'Ouvrir' });
      b.addEventListener('click', function () { e.ouvrir(); });
      droite.appendChild(b);
      li.appendChild(droite);
      listeQCM.appendChild(li);
    });
  }

  async function listerViaHandle(handle, nom) {
    dossier.handle = handle; dossier.nom = nom;
    btnDeposer.hidden = false;
    var entrees = [];
    for await (const entry of handle.values()) {
      if (entry.kind === 'file' && /\.ya?ml$/i.test(entry.name)) {
        entrees.push({
          nom: entry.name,
          ouvrir: async function () {
            var f = await entry.getFile();
            lireFichier(f);
          }
        });
      }
    }
    entrees.sort(function (a, b) { return a.nom.localeCompare(b.nom); });
    renderListe(entrees);
  }

  async function choisirDossier() {
    if (!window.showDirectoryPicker) {
      setInfo('Ce navigateur ne permet pas de choisir un dossier. Utilise Chrome/Edge, ou sers le site en HTTP (python3 -m http.server) pour utiliser le manifeste qcm/index.json.');
      return;
    }
    try {
      var handle = await window.showDirectoryPicker({ id: 'dossier-qcm', mode: 'readwrite' });
      await idbSet(handle);
      await listerViaHandle(handle, handle.name);
      setInfo('Dossier « ' + handle.name + ' » — ' + listeQCM.children.length + ' QCM disponible(s) :');
    } catch (e) {
      if (e && e.name === 'AbortError') return; // annulé par l'utilisateur
      setInfo('Impossible d\'ouvrir le dossier : ' + e.message);
    }
  }

  async function deposerFichier(fichier) {
    if (!dossier.handle) { afficherErreursImport(['Choisis d\'abord le dossier des QCM.']); return; }
    var reader = new FileReader();
    reader.onload = async function () {
      var texte = reader.result;
      var data;
      try { data = jsyaml.load(texte); } catch (e) {
        afficherErreursImport(['YAML illisible : ' + e.message]); return;
      }
      var res = QCMValidation.validerQuiz(data);
      if (!res.ok) { afficherErreursImport(res.erreurs); return; }
      try {
        var fh = await dossier.handle.getFileHandle(fichier.name, { create: true });
        var w = await fh.createWritable();
        await w.write(texte);
        await w.close();
        afficherErreursImport(null);
        await listerViaHandle(dossier.handle, dossier.nom);
        setInfo('« ' + fichier.name + ' » déposé dans le dossier « ' + dossier.nom + ' » (' + listeQCM.children.length + ' QCM) :');
      } catch (e) {
        afficherErreursImport(['Écriture impossible dans le dossier : ' + e.message]);
      }
    };
    reader.readAsText(fichier);
  }

  // Fallback : manifeste qcm/index.json (site servi en HTTP)
  async function initViaManifeste() {
    if (!window.fetch) return;
    try {
      var res = await fetch('qcm/index.json');
      if (!res.ok) return;
      var index = await res.json();
      if (!index.fichiers || !index.fichiers.length) return;
      dossier.handle = null; dossier.nom = 'qcm/ (site)';
      btnDeposer.hidden = true;
      var entrees = index.fichiers.map(function (nom) {
        return {
          nom: nom,
          ouvrir: async function () {
            var r = await fetch('qcm/' + encodeURIComponent(nom));
            importerYaml(await r.text(), 'qcm/' + nom);
          }
        };
      });
      renderListe(entrees);
      setInfo('QCM disponibles dans qcm/ (manifeste index.json) :');
    } catch (e) { /* pas de manifeste : on ignore */ }
  }

  async function initDossier() {
    if (window.showDirectoryPicker) {
      var handle = await idbGet();
      if (handle) {
        try {
          var perm = await handle.queryPermission({ mode: 'readwrite' });
          if (perm === 'granted') { await listerViaHandle(handle, handle.name); return; }
          if (perm === 'prompt') {
            var demande = await handle.requestPermission({ mode: 'readwrite' });
            if (demande === 'granted') { await listerViaHandle(handle, handle.name); return; }
          }
        } catch (e) { /* handle invalide, on retombe sur le manifeste */ }
      }
    }
    await initViaManifeste();
  }

  /* ---------- Événements accueil ---------- */

  btnDossier.addEventListener('click', choisirDossier);
  btnDeposer.addEventListener('click', function () { fileDepot.click(); });
  fileDepot.addEventListener('change', function () {
    if (fileDepot.files.length) deposerFichier(fileDepot.files[0]);
    fileDepot.value = '';
  });
  initDossier();

  document.getElementById('btn-choisir').addEventListener('click', function (e) {
    e.stopPropagation();
    fileInput.click();
  });
  dropzone.addEventListener('click', function () { fileInput.click(); });
  dropzone.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
  fileInput.addEventListener('change', function () {
    if (fileInput.files.length) lireFichier(fileInput.files[0]);
  });
  ['dragover', 'dragenter'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.add('drag'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.remove('drag'); });
  });
  dropzone.addEventListener('drop', function (e) {
    if (e.dataTransfer.files.length) lireFichier(e.dataTransfer.files[0]);
  });
  document.getElementById('btn-exemple').addEventListener('click', function () {
    importerYaml(window.EXEMPLE_YAML, 'exemple intégré');
  });

  function lireFichier(f) {
    var reader = new FileReader();
    reader.onload = function () { importerYaml(reader.result, f.name); };
    reader.onerror = function () { afficherErreursImport(['Lecture du fichier impossible.']); };
    reader.readAsText(f);
  }
})();

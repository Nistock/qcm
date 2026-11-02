/* Régénère qcm/index.json à partir des fichiers .yaml/.yml présents dans ce dossier.
   Usage : node qcm/maj-index.js */
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const fichiers = fs.readdirSync(dir)
  .filter(f => /\.ya?ml$/i.test(f))
  .sort();

const index = { genere_le: new Date().toISOString(), fichiers };
fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(index, null, 2) + '\n');
console.log(fichiers.length + ' fichier(s) indexé(s) dans qcm/index.json');

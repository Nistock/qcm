/* Valide un fichier QCM YAML avec le validateur du site.
   Usage : node validate.js <fichier.yaml> [--qcm-site <dir>]
   <dir> = répertoire du site QCM (défaut : QCM_SITE_DIR ou /home/nino/Documents/dev/qcm). */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const file = args[0];
if (!file) { console.error('Usage: node validate.js <fichier.yaml>'); process.exit(2); }
let siteDir = process.env.QCM_SITE_DIR || '/home/nino/Documents/dev/qcm';
const i = args.indexOf('--qcm-site');
if (i !== -1 && args[i + 1]) siteDir = args[i + 1];

const yaml = require(path.join(siteDir, 'vendor/js-yaml.min.js'));
const V = require(path.join(siteDir, 'js/validation.js'));

let data;
try {
  data = yaml.load(fs.readFileSync(file, 'utf8'));
} catch (e) {
  console.error('YAML illisible : ' + e.message);
  process.exit(1);
}
const res = V.validerQuiz(data);
if (!res.ok) {
  console.error('INVALIDE :');
  res.erreurs.forEach(e => console.error(' - ' + e));
  process.exit(1);
}
const n = V.normaliser(data);
console.log('OK — ' + n.questions.length + ' question(s) valide(s) dans ' + file);

const fs = require("fs");
const p = "lib/data/familyDetails.ts";
let s = fs.readFileSync(p, "utf8");

// 1. `\b` never matches after a Bengali letter (JS word boundaries are ASCII),
//    so "বাবা-মা প্রয়াত" fell through to the father-prefix rule.
const oldBoth = `const BOTH_PARENTS = /^(বাবা[-\s]*(ও\s*)?মা|মা[-\s]*(ও\s*)?বাবা|parents)\b/i;`;
const newBoth = `const BOTH_PARENTS = /^(বাবা[-\s]*(ও\s*)?মা|মা[-\s]*(ও\s*)?বাবা|parents(?!\w))/i;`;
if (!s.includes(oldBoth)) { console.error("no BOTH_PARENTS match"); process.exit(1); }
s = s.replace(oldBoth, newBoth);

// 2. Also break on a full stop that is followed by a "Label:" — English blurbs
//    write "…family. Father: Retired banker" with no other separator.
const oldSplit = `    .split(/[;।\n]|,\s*/g)`;
const newSplit = `    .split(/[;।\n]|,\s*|(?<=\.)\s+(?=[^\s:：]{1,28}\s*[:：])/g)`;
if (!s.includes(oldSplit)) { console.error("no split match"); process.exit(1); }
s = s.replace(oldSplit, newSplit);

fs.writeFileSync(p, s);
console.log("ok");

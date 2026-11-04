const fs = require('fs');
const path = require('path');
const glob = require('glob');

const root = process.cwd();
const patterns = [
  // px bracket -> scale/4 (e.g. max-w-[680px] -> max-w-170)
  { regex: /([A-Za-z0-9:()\-]+)-\[\s*([0-9]+(?:\.[0-9]+)?)px\s*\]/g, replace: (m,p,num)=>{
      const v = (parseFloat(num)/4);
      const s = (Number.isInteger(v) ? String(v) : String(v).replace(/\.?0+$/,''));
      return `${p}-${s}`;
  }},
  // opacity bracket -> percentage integer (e.g. /[0.06] -> /6)
  { regex: /\/\[\s*0\.(\d+)\s*\]/g, replace: (m,d)=>`/${parseInt(d,10)}` },
  // gradient shorthand
  { regex: /bg-gradient-to-/g, replace: ()=> 'bg-linear-to-' },
  // flex-shrink -> shrink
  { regex: /\bflex-shrink-0\b/g, replace: ()=> 'shrink-0' },
  // specific rounded mapping
  { regex: /rounded-\[2rem\]/g, replace: ()=> 'rounded-4xl' },
  // opacity arbitrary -> integer (e.g. opacity-[0.06] -> opacity-6)
  { regex: /opacity-\[\s*0\.(\d+)\s*\]/g, replace: (m,d)=> `opacity-${parseInt(d,10)}` }
];

// file globs to process
const globs = [
  'app/**/*.{jsx,js,tsx,ts,mjs}',
  'components/**/*.{jsx,js,tsx,ts}',
  'contexts/**/*.{jsx,js,tsx,ts}',
  'lib/**/*.{js,mjs,cjs}'
];

const files = new Set();
for (const g of globs) {
  glob.sync(g, { nodir: true }).forEach(f=> files.add(path.join(root,f)));
}

const changed = [];
for (const file of files) {
  let src = fs.readFileSync(file,'utf8');
  let out = src;
  for (const p of patterns) {
    out = out.replace(p.regex, typeof p.replace === 'function' ? p.replace : () => p.replace);
  }
  if (out !== src) {
    fs.writeFileSync(file, out, 'utf8');
    changed.push(path.relative(root, file));
  }
}

console.log('Processed files:', files.size);
console.log('Changed files:', changed.length);
changed.forEach(f=> console.log(' -', f));

process.exit(0);

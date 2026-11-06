// Live verification of every UniProt accession in src/data/cells.ts
// Usage: node scripts/verify-uniprot.mjs
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/data/cells.ts', import.meta.url), 'utf8');
const re = /[mt]\('([^']+)',\s*'([^']+)',\s*'([^']+)'/g;
const entries = [...src.matchAll(re)].map((m) => ({ symbol: m[1], gene: m[2], acc: m[3] }));

let ok = 0;
const bad = [];
for (const e of entries) {
    try {
      const r = await fetch(`https://rest.uniprot.org/uniprotkb/${e.acc}.json?fields=gene_names,organism_name,reviewed`);
      const j = await r.json();
      const genes = (j.genes ?? []).flatMap((g) => [g.geneName?.value, ...(g.synonyms ?? []).map((s) => s.value)]);
      const human = j.organism?.scientificName === 'Homo sapiens';
      const reviewed = String(j.entryType ?? '').includes('reviewed') && !String(j.entryType).includes('unreviewed');
      const geneOk = genes.includes(e.gene);
      const af = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${e.acc}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) immunology-atlas-verify' },
      });
      let afOk = false;
      if (af.ok) {
        const aj = await af.json();
        const list = Array.isArray(aj) ? aj : [aj];
        afOk = !!list.find((x) => x.uniprotAccession === e.acc || x.pdbUrl)?.pdbUrl;
      }
      if (human && reviewed && geneOk && afOk) ok++;
      else bad.push({ ...e, got: genes[0], human, reviewed, afStatus: af.status, alphafold: afOk });
    } catch (err) {
      bad.push({ ...e, error: String(err) });
    }
}
console.log(`Checked ${entries.length} accessions → ${ok} OK, ${bad.length} problems`);
if (bad.length) console.table(bad);

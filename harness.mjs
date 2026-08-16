/* Passing Bell — the harness.
 *
 * Proves the lineage through the REAL carriers: every synthetic generation is
 * pushed through actual fragment encode→decode and an actual rewrite→reparse
 * of passing-bell.html's own source, asserting state equality and the
 * 1,500-character rope budget at every step. Every bell cast here is
 * indelibly marked synthetic (y:1) and renders as such in the piece.
 *
 * Run:  node harness.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(HERE, "passing-bell.html"), "utf8");

let asserts = 0;
function A(cond, msg) {
  if (!cond) { console.error("✗ ASSERT FAILED: " + msg); process.exit(1); }
  asserts++;
}
function section(name) { console.log("\n── " + name); }

/* ── 0. every inline script in the piece must at least parse ── */
section("script blocks parse");
{
  const blocks = [...SRC.matchAll(/<script(?![^>]*type="application\/json")[^>]*>([\s\S]*?)<\/script>/g)];
  A(blocks.length === 2, "expected 2 executable script blocks, found " + blocks.length);
  for (const b of blocks) new Function(b[1]); // throws on syntax error
  console.log("  2 executable script blocks parse cleanly");
}

/* ── extract and run the core exactly as shipped ── */
const coreMatch = SRC.match(/<script id="tower-core">([\s\S]*?)<\/script>/);
A(!!coreMatch, "tower-core block present");
(0, eval)(coreMatch[1]);
const C = globalThis.TowerCore;
A(!!C && typeof C.castBell === "function", "TowerCore loaded from the shipped source");

/* deterministic rand + clock: the core never calls Date.now or Math.random itself */
let seed = 0x5eed;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0), seed / 2 ** 32);
const T0 = Date.UTC(2026, 0, 1);

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const NASTY = [
  "FOR MY MOTHER, WHO RANG",
  "</scr" + "ipt><b>escape</b>",
  '"quotes" and \\backslashes\\ and ${js}',
  "🔔🕯️🥀 unicode bells 🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔",
  "<!-- a comment that must not comment -->",
  "line\nbreaks\tand\ttabs collapse",
  "ΚΑΜΠΑΝΑ ΤΗΣ ΘΑΛΑΣΣΗΣ",
  "鐘は誰のために鳴る",
  "percent %41 %% and dots ... tildes ~~~",
  "   leading and trailing space   ",
  "----hyphens----must----survive----",
  "a".repeat(400) + " far past every limit",
  "voces campanarum MMXXVI",
  "I TO THE CHURCH THE LIVING CALL",
  "AND TO THE GRAVE DO SUMMON ALL",
  "the sixteenth synthetic hand",
];

/* ── 1. sixteen synthetic generations through BOTH real carriers ── */
section("16 synthetic generations, both carriers, every step");
let state = C.genesis();
let fileSrc = SRC; // the file carrier, chained generation to generation
let meltObserved = false;
for (let g = 1; g <= 16; g++) {
  const nowMs = T0 + g * 11 * 864e5 + (g * 7919) % 86400 * 1000; // irregular dormancy gaps
  state = C.addRung(state, 60 + g * 13);
  const res = C.castBell(state, {
    inscription: NASTY[g - 1], nowMs, synthetic: true, rand,
    home: "https://example.org/passing-bell.html",
  });
  state = res.state;
  if (res.melted.length) meltObserved = true;

  A(state.bells.every(b => b.y === 1), "gen " + g + ": every synthetic bell is marked y:1");

  // light carrier: real encode → real decode
  const frag = C.encodeFragment(state);
  A(frag.length < 1500, "gen " + g + ": fragment " + frag.length + " chars < 1500");
  const dec = C.decodeFragment(frag);
  A(eq(C.fragmentView(dec), C.fragmentView(state)), "gen " + g + ": fragment round-trip carries equal state");
  A(dec.bells.every(b => b.y === 1), "gen " + g + ": synthetic mark survives the fragment");

  // deep carrier: real rewrite → real reparse, chained on last generation's file
  fileSrc = C.rewriteSource(fileSrc, state);
  const ext = C.extractStateFromSource(fileSrc);
  A(C.stateEqual(ext, state), "gen " + g + ": file round-trip carries equal state");
  A(ext.bells.every(b => b.y === 1), "gen " + g + ": synthetic mark survives the file");

  console.log("  gen " + String(g).padStart(2) + ": bells=" + String(state.bells.length).padStart(2) +
    " melted=" + state.bourdon.n + " frag=" + String(frag.length).padStart(4) + " chars ✓");
}
A(meltObserved && state.bourdon.n === 4 && state.bells.length === 12,
  "the 13th–16th castings melted the four oldest bells into the bourdon");
A(state.bourdon.since !== null, "the bourdon remembers the oldest melted casting date");
A(state.gen === 16, "gen counts every casting, melted included");

/* ── 2. the rewritten file still functions as the piece ── */
section("rewritten file is still the piece");
{
  const blocks = [...fileSrc.matchAll(/<script(?![^>]*type="application\/json")[^>]*>([\s\S]*?)<\/script>/g)];
  A(blocks.length === 2, "rewritten file keeps its 2 executable scripts");
  for (const b of blocks) new Function(b[1]);
  A(fileSrc.match(/<script type="application\/json" id="tower-state">/g).length === 1,
    "exactly one state block after 16 rewrites");
  A(!/tower-state">[^]*?<\/script>/.exec(fileSrc)[0].slice(13, -10).includes("</scr"),
    "no unescaped </scr...> inside the state block");
  console.log("  scripts parse, one state block, holder text safely escaped");
}

/* ── 3. fifty rewrites, byte-stable, equal state ── */
section("idempotence: 50 rewrites");
{
  let s2 = fileSrc;
  for (let i = 0; i < 50; i++) {
    s2 = C.rewriteSource(s2, state);
    A(C.stateEqual(C.extractStateFromSource(s2), state), "rewrite " + (i + 1) + " carries equal state");
  }
  A(s2 === C.rewriteSource(s2, state), "rewriting is byte-stable");
  console.log("  50 rewrites: state equal every time, output byte-identical");
}

/* ── 4. no matter what a holder typed into it ── */
section("vandal-proofing: normalize is a fixed point");
{
  const vandal = {
    v: 99, founders: ["UPPER", "ok1234", "ok1234", 7, "toolongtoolong", "zz"],
    gen: -5, rung: "not a number",
    bourdon: { n: "3", since: -1 },
    bells: [
      { i: 2.9, s: "!!##AB", m: "88", y: "yes", t: "𝔊𝔬𝔱𝔥𝔦𝔠 ".repeat(30) + "</scr" + "ipt>" },
      { i: 2.9, s: "!!##AB", m: 12, y: 0, t: null }, // duplicate id — dropped
      "not a bell", null, { t: "orphan strings become a bell too" },
    ],
    home: "javascript:alert(1)",
    extra: "fields are shed",
  };
  const n1 = C.normalize(vandal);
  const n2 = C.normalize(C.canonical(n1));
  A(C.stateEqual(n1, n2), "normalize(normalize(x)) === normalize(x)");
  A(n1.home === null, "javascript: home is refused");
  const frag = C.encodeFragment(n1);
  A(frag.length < 1500, "vandal state still fits the rope after clamping");
  A(eq(C.fragmentView(C.decodeFragment(frag)), C.fragmentView(n1)), "vandal state round-trips the fragment");
  let s3 = C.rewriteSource(SRC, n1);
  for (let i = 0; i < 50; i++) s3 = C.rewriteSource(s3, n1);
  A(C.stateEqual(C.extractStateFromSource(s3), n1), "vandal state survives 50 file rewrites");
  console.log("  hostile fields clamped, escaped, stable across both carriers");
}

/* ── 5. worst-case rope: 12 bells, maximum-weight inscriptions ── */
section("worst-case budget");
{
  let w = C.genesis();
  for (let g = 1; g <= 14; g++) {
    w = C.addRung(w, 1e6); // huge counters too
    w = C.castBell(w, { inscription: "🜍🜚🝆𓁶".repeat(40), nowMs: T0 + g * 9e9, synthetic: true, rand }).state;
    const f = C.encodeFragment(w);
    A(f.length < 1500, "worst gen " + g + ": " + f.length + " < 1500");
  }
  console.log("  40-codepoint emoji inscriptions × 12 bells: rope holds (" + C.encodeFragment(w).length + " chars)");
}

/* ── 6. tampering is detected (casually) ── */
section("checksum");
{
  const frag = C.encodeFragment(state);
  const bad = frag.slice(0, 20) + (frag[20] === "a" ? "b" : "a") + frag.slice(21);
  let threw = false;
  try { C.decodeFragment(bad); } catch (e) { threw = true; }
  A(threw, "a flipped character fails the checksum");
  console.log("  casual corruption detected; deliberate forgery remains easy, as documented");
}

/* ── 7. two lineages meeting ── */
section("meetings");
{
  // kin: fork and reunite
  let trunk = C.genesis();
  for (let g = 1; g <= 3; g++) trunk = C.castBell(trunk, { inscription: "trunk " + g, nowMs: T0 + g * 864e5, synthetic: true, rand }).state;
  let forkA = C.castBell(C.addRung(trunk, 500), { inscription: "fork A", nowMs: T0 + 10 * 864e5, synthetic: true, rand }).state;
  let forkB = C.castBell(C.addRung(trunk, 200), { inscription: "fork B", nowMs: T0 + 11 * 864e5, synthetic: true, rand }).state;
  const kin = C.merge(forkA, forkB);
  A(kin.kin === true, "forks recognize each other by founder mark");
  A(kin.state.bells.length === 5, "kin reunion dedupes shared bells (3 trunk + 2 fork tips)");
  A(kin.state.rung === Math.max(forkA.rung, forkB.rung), "kin reunion takes max rung — never inflates the dead");

  // strangers: two founders
  let west = C.genesis();
  for (let g = 1; g <= 8; g++) west = C.castBell(C.addRung(west, 100), { inscription: "west " + g, nowMs: T0 + g * 2 * 864e5, synthetic: true, rand }).state;
  let east = C.genesis();
  for (let g = 1; g <= 8; g++) east = C.castBell(C.addRung(east, 100), { inscription: "east " + g, nowMs: T0 + g * 3 * 864e5, synthetic: true, rand }).state;
  const met = C.merge(west, east);
  A(met.kin === false, "no shared founder → strangers");
  A(met.state.rung === west.rung + east.rung, "strangers' changes add");
  A(met.state.gen === west.gen + east.gen, "strangers' hands add");
  A(met.state.bells.length === 12 && met.state.bourdon.n === 4, "16 bells → 12 hung, 4 melted in the joining");
  A(met.state.founders.length === 2, "both founder marks survive");
  const mf = C.encodeFragment(met.state);
  A(mf.length < 1500, "merged tower still fits the rope (" + mf.length + ")");
  A(eq(C.fragmentView(C.decodeFragment(mf)), C.fragmentView(met.state)), "merged tower round-trips");
  console.log("  kin reunion: dedupe + max. strangers: union + sum + melt. both under budget.");
}

/* ── 8. the music is real ── */
section("the changes");
{
  const r4 = C.makeRinger(4);
  const rows = [];
  for (let i = 0; i < 4 + 24; i++) rows.push(r4.next().row.join(""));
  const changes = rows.slice(4);
  A(new Set(changes).size === 24, "Plain Bob Minimus rings the whole extent: 24 distinct rows on 4 bells");
  A(changes[changes.length - 1] === "1234", "and comes round");
  const r6 = C.makeRinger(6);
  let seen = new Set(); let r;
  for (let i = 0; i < 4 + 60; i++) { r = r6.next(); if (i >= 4) seen.add(r.row.join("")); }
  A(seen.size === 60, "Plain Bob Minor plain course: 60 distinct rows");
  A(r.row.join("") === "123456", "and comes round");
  A(C.extent(12) === 479001600, "the extent on twelve is 479,001,600");
  console.log("  Plain Bob verified against the printed extents");
}

console.log("\n════════════════════════════════════════");
console.log("  ALL PROOFS HOLD — " + asserts + " assertions");
console.log("  every synthetic bell marked ⚗, both carriers exercised for real");
console.log("════════════════════════════════════════");

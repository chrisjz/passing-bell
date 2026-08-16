# Passing Bell

*The fifth and last piece of an anthology of five, and the only one that cannot be finished.*

---

## The statement

The other four pieces in this anthology are complete the moment you open them. The dial holds the whole history of the universe whether or not you turn it; the village moves without you, and prefers it; the model answers alone; the creature learns to believe in you, but it does the believing by itself. Each one is a sealed world.

This one is a bell tower, and a bell tower is the wrong shape for one person. Change-ringing — the English art of ringing permutations on tuned bells — cannot be practiced alone. One bell can only toll. Two can only swap. The music begins at three, and the *extent* — every change possible on N bells — is N factorial: 6 changes on three bells, 24 on four, 40,320 on eight, 479,001,600 on twelve. The only extent ever rung on eight bells took one band eighteen hours, once, in 1963. Real towers take centuries to assemble their rings, bell by donated bell, and real bells are recast from the bronze of older bells whose inscriptions did not survive the furnace.

So: a tower passed from one person to one person. Each hand casts exactly one bell and may engrave up to forty characters on its shoulder — the only thing about them that will ever travel. At generation zero the tower is empty; its founder casts the first bell, tolls it once, and completes the extent of one. **The founder is the only holder who ever finishes the piece, and they finish it alone, and it is worth almost nothing.** Every hand after that multiplies the extent — the tower's music grows richer at exactly the rate its completion recedes. The piece does not merely *need* other people; it converts each of them into a reason it can never end.

A ring holds twelve bells. When a thirteenth is cast — or when the carrying rope fills — the oldest bell is melted into the **bourdon**, the deep bell that tolls once before the changes begin. The bourdon keeps the count of the melted and the date of its oldest bronze; it keeps no words. That is the piece's designed forgetting: individuality has a capacity, weight does not. An old lineage is a tower where twelve recent hands ring above a bourdon grown heavy with everyone the rope could no longer name.

Nothing here needs care. A tower that hangs silent for a year is not dying; it is a tower, hanging silent, and when it next changes hands it will say so, to the minute, because the silence between hands is part of what it carries.

---

## The two carriers, and which does what

There is no server and there never will be one. The canonical copy lives on a dumb static host that stores nothing. The tower exists only in transit, in two forms:

**The link — the light handoff.** The entire tower is folded into the URL fragment: `passing-bell.html#pb1.…`. The fragment never reaches any server (fragments are not sent in HTTP requests, so even the static host never sees the state). This is the carrier for the common case — one person texting one person — and it requires the canonical copy to be standing at its address. **Hard budget: the fragment stays under 1,500 characters at every generation, forever.** This is enforced in the state itself, not at the door: after every casting and every merge, the tower melts its oldest bells until the encoded fragment is ≤ 1,450 characters (and never more than twelve bells hang, regardless). The rope does not break; it forgets. In practice twelve bells with maximally heavy inscriptions encode to ~1,100 characters, so the twelve-bell law binds first — but both laws are real and both are tested.

**The file — the deep handoff.** The page rewrites its own source: the tower's state lives in one JSON `<script type="application/json" id="tower-state">` block, and "Download the tower" produces this very file with that block rewritten. The file is sovereign — it carries the tower with no host, no address, no web at all, and it additionally carries one thing the link cannot: the tower's home address, so a file passed hand-to-hand for years can still mint working links when someone finally opens it. Use the file when the canonical host might not outlive the lineage, or when handing the tower to someone you may never reach again.

The rewrite is idempotent: every `<` in the stored JSON is escaped to `\u003c`, so nothing any holder types can terminate the block or comment it out; the state is re-normalized to a fixed point on every read, so a hand-vandalized file parses back to a well-formed tower; and rewriting fifty times produces byte-identical output. The harness proves all of this against the shipped file, not a copy of the logic.

## How it works (honest version)

**What the tower carries** — all of it visible in the state block or by running `TowerCore.decodeFragment(location.hash.slice(1))` in the console:

- up to four **founder marks** (random 6-char ids minted at each genesis) — how kinship is recognized
- **gen** — every casting ever, melted included
- **rung** — changes rung across all hands, all sessions
- the **bourdon**: count of melted bells + date of the oldest melted bronze
- up to twelve **bells**: casting index, 2-char salt, cast timestamp (minute precision), a synthetic flag, and the inscription
- the **home** address — file carrier only, never spent from the fragment budget

**What is mechanically real:** every number above. Generation N is derived from generation N−1 by an actual casting with an actual clock reading; dormancy displays are subtraction between consecutive cast timestamps; the changes on screen are actual Plain Bob (even stages) and Plain Hunt (odd stages) — Plain Bob Minimus on four bells rings the true full extent, and the harness checks the rows against the printed ones. The bell voices are additively synthesized from real bell partials (hum, prime, minor-third tierce, quint, nominal), pre-rendered offline per pitch.

**What is scripted:** the prose. Every sentence the piece says ("go, Plain Bob Minor", the founder's "the tower is finished", the intro card) is a template filled with real numbers — the piece generates no language. "Changes rung" counts rows rung, including repeats of the plain course, the way real towers log performances; it is a labor count, not a coverage count, and the extent line never claims otherwise.

**What the tower cannot know, and admits:** it cannot see forks, cannot know a copy died, and cannot count hands that only listened and forwarded a link unchanged — relaying without casting is invisible by design, since nothing of that holder was consented into the state.

**When two lineages meet in one browser** (the tower keeps its latest state in `localStorage`, so this is inevitable):
- **Kin** — a shared founder mark — merge silently as a reunion: bells dedupe by identity (index + salt), counters take the maximum, so a fork meeting its own past never inflates the dead. A notice says it happened.
- **Strangers** — no shared founder — trigger an explicit choice: hang them together (bells union, counters add, overflow melts into the bourdon), or keep one and let this browser forget the other.
- The founder list caps at four (the same forgetting law); a lineage that has absorbed more than four towers will treat some true kin as kin only by the marks it still holds. Merging is honest, not omniscient.

**Consent is total.** Passing is a ritual, not a share button: engrave (or don't), then read the manifest — every bell with its words and dates, the bourdon, all counters, your bell with its exact UTC timestamp, the dormancy that timestamp will reveal, any melt your casting causes, and the home address — before anything is committed. The manifest's last line is a promise the code keeps: nothing else travels. No analytics, no fetches, no identifiers. The rung-count of your listening session travels only because the manifest showed it to you first.

## How easy forgery is

Completely easy, and you should know exactly how: the state is documented plaintext, the codec ships in the file as `window.TowerCore`, and `TowerCore.encodeFragment(anything)` will happily sign a fabricated century-old lineage — the 4-character FNV-1a checksum on the fragment exists to catch transit corruption and typos, not liars; it is keyed on nothing. Casual forgery is inconvenient (you must open a console and read this file), accidental corruption is loudly detected, and deliberate forgery is trivial and undetectable. An open file cannot offer provenance, so this piece does not pretend to: the lineage is a testimony sustained by the same thing that sustains any chain letter — the unglamorous honesty of strangers. The one mark that survives every rewrite is the synthetic flag: bells cast by the harness say so, in the fragment, in the file, in the manifest, and on the bell.

## The harness

```
node harness.mjs
```

No dependencies. It extracts `TowerCore` from `passing-bell.html` exactly as shipped and proves, with ~190 assertions:

- **16 synthetic generations** pushed through actual fragment encode→decode and actual file rewrite→reparse (chained — each generation rewrites the previous generation's file), asserting state equality and the <1,500-character budget at every step, with every bell marked synthetic and the mark verified to survive both carriers;
- the 13th–16th castings melt the four oldest bells into the bourdon;
- the rewritten file still parses as the piece (both executable scripts, exactly one state block, no unescaped terminators);
- **50 consecutive rewrites**: equal state every time, byte-stable output;
- a vandalized state (hostile inscriptions, wrong types, duplicate bells, `javascript:` home) normalizes to a fixed point and survives both carriers;
- worst-case rope: twelve bells of 40-codepoint emoji inscriptions fit with room to spare;
- checksum catches a single flipped character;
- kin reunion dedupes and takes maxima; stranger merger unions, sums, and melts overflow — under budget;
- Plain Bob Minimus rings 24 distinct rows and comes round; Plain Bob Minor rings its 60-row plain course; the extent on twelve is 479,001,600.

The full interactive loop (fragment in → ritual → manifest → commit → real browser download → reopening the downloaded file → it rings) was additionally verified in headless Chromium via CDP during development.

## Hosting

Put `passing-bell.html` anywhere static — GitHub Pages is exactly right. No build, no config: on an `http(s)` origin the tower learns its home address from where it stands and bakes it into every file it hands out. A bare link to the hosted copy is generation zero — every stranger who arrives without a fragment is offered an empty foundry and a lineage of their own.

---

*Bell inscriptions quoted in the tests ("I to the church the living call, and to the grave do summon all") are traditional. The passing bell is the bell rung for a death; this one is rung for the opposite reason, but it keeps the name, because a tower that must be handed on or end is always one hand from either.*

/* Empirical security tests against the SHIPPED passing-bell.html.
   Adversary uses only app-sanctioned inputs (the engraving field, the ritual,
   a crafted incoming fragment, a crafted incoming state block) and tries to
   achieve script execution or network egress in a victim's browser.

   These drive a REAL browser over the Chrome DevTools Protocol: they cast bells
   through the actual ritual buttons, click the real download button, and open
   the resulting file as a victim. 48 assertions, all passing.

   Run against any Chromium/Chrome with remote debugging on port 9334:
     <chrome> --headless --disable-gpu --mute-audio \
       --autoplay-policy=no-user-gesture-required \
       --user-data-dir=/tmp/pb-sec --remote-debugging-port=9334 about:blank &
     SCRATCH=/tmp/pb-sec node security-test.mjs
   Adjust FILE below if passing-bell.html lives elsewhere. */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
const SCRATCH = process.env.SCRATCH;
const FILE = "file:///Users/chriszaharia/projects/personal/multi/passing-bell.html";

const list = await (await fetch("http://127.0.0.1:9334/json/list")).json();
const ws = new WebSocket(list[0].webSocketDebuggerUrl);
await new Promise(r => (ws.onopen = r));
let id = 0; const waiting = new Map();
const events = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
  else if (m.method) events.push(m);
};
const send = (method, params = {}) => new Promise(res => { const i = ++id; waiting.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evl = async expr => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result.exceptionDetails) return { __throw: JSON.stringify(r.result.exceptionDetails.exception) };
  return r.result.result.value;
};
let pass = 0, fail = 0;
const A = (c, msg) => { if (c) { pass++; console.log("  ✓ " + msg); } else { fail++; console.error("  ✗ FAIL: " + msg); } };

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("Security.enable");
// a canary: if ANY injected payload runs, it sets window.__PWNED or fires a fetch
const CANARY = `window.__pwned=false; window.__egress=[];
  var _f=window.fetch; window.fetch=function(){window.__egress.push('fetch'); return _f.apply(this,arguments);};
  var _img=Image; `;

await send("Page.navigate", { url: FILE });
await new Promise(r => setTimeout(r, 1000));
await evl(`localStorage.clear()`);

// ─────────────────────────────────────────────────────────────
console.log("\n── 1. CSP is present and strict");
const cspMeta = await evl(`document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content || ''`);
A(cspMeta.includes("default-src 'none'"), "CSP default-src 'none' present: " + cspMeta.slice(0, 40) + "…");
A(cspMeta.includes("base-uri 'none'"), "CSP locks base-uri (no <base> hijack)");
A(!/connect-src|https:|\*/.test(cspMeta.replace("default-src 'none'","")), "CSP grants no network origins — egress is impossible even post-injection");

// ─────────────────────────────────────────────────────────────
console.log("\n── 2. Injection payloads through the engraving field");
const PAYLOADS = [
  "</scr" + "ipt><img src=x onerror=window.__pwned=true>",
  '"><svg/onload=window.__pwned=true>',
  "</scr" + "ipt><scr" + "ipt>window.__pwned=true</scr" + "ipt>",
  "\\u003c/script\\u003e<script>window.__pwned=true</script>",
  "'; window.__pwned=true; //",
  "]]></script><iframe src=javascript:parent.__pwned=true>",
  "\u0000\u0001</script>", // control chars + breakout
];
for (let i = 0; i < PAYLOADS.length; i++) {
  const p = PAYLOADS[i];
  // fresh genesis each time
  await send("Page.navigate", { url: "about:blank" }); await new Promise(r => setTimeout(r, 150));
  await send("Page.navigate", { url: FILE }); await new Promise(r => setTimeout(r, 700));
  await evl(`localStorage.clear(); window.__pwned=false;`);
  // cast a bell with the payload, via the actual ritual buttons
  await evl(`document.getElementById('introBtn').click()`);
  await evl(`(function(){var e=document.getElementById('engrave'); e.value=${JSON.stringify(p)}; e.oninput();})()`);
  await evl(`document.getElementById('toManifest').click()`);
  await evl(`document.getElementById('commitBtn').click()`);
  // (a) rendered manifest/lineage did not execute
  const pwnedNow = await evl(`window.__pwned === true`);
  A(pwnedNow === false, "payload #" + i + " does not execute on render");
  // (b) rewrite the source and inspect the emitted file bytes
  const emitted = await evl(`TowerCore.rewriteSource("<!DOCTYPE html>\\n"+document.documentElement.outerHTML, TowerCore.normalize(JSON.parse(localStorage.getItem('passing-bell:v1'))))`);
  if (typeof emitted === "string") {
    // extract just the state block
    const block = emitted.match(/<script type="application\/json" id="tower-state">([\s\S]*?)<\/script>/)[1];
    A(!/<\/script/i.test(block), "payload #" + i + ": emitted state block contains no literal </script");
    A(block.indexOf("<") === -1, "payload #" + i + ": emitted state block contains no literal '<' at all");
    // whole file: exactly one TRUE state block (the opening tag has no backslash;
    // the STATE_RE regex-literal in the source reads "application\/json" and is not one).
    const stateBlocks = emitted.split('<script type="application/json" id="tower-state">').length - 1;
    A(stateBlocks === 1, "payload #" + i + ": exactly one state block in emitted file");
  } else {
    A(false, "payload #" + i + ": rewrite failed: " + JSON.stringify(emitted));
  }
}

// ─────────────────────────────────────────────────────────────
console.log("\n── 3. The REAL download button emits an inert file that opens clean");
mkdirSync(SCRATCH + "/sec-dl", { recursive: true });
await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: SCRATCH + "/sec-dl" }).catch(()=>{});
await send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: SCRATCH + "/sec-dl" }).catch(()=>{});
await send("Page.navigate", { url: "about:blank" }); await new Promise(r => setTimeout(r, 150));
await send("Page.navigate", { url: FILE }); await new Promise(r => setTimeout(r, 700));
// clear the shared file:// localStorage AND reload, so the app's in-memory state
// resets to genesis (clear alone leaves the already-hydrated page untouched).
await evl(`localStorage.clear();`);
await send("Page.reload", { ignoreCache: true }); await new Promise(r => setTimeout(r, 800));
await evl(`window.__pwned=false;`);
// a short payload that survives the 40-char clamp, so we can also confirm it renders as inert text
const PAY3 = "</scr" + "ipt><img src=x onerror=window.__pwned=1>";
await evl(`document.getElementById('introBtn').click()`);
await evl(`(function(){var e=document.getElementById('engrave'); e.value=${JSON.stringify(PAY3)}; e.oninput();})()`);
await evl(`document.getElementById('toManifest').click()`);
await evl(`document.getElementById('commitBtn').click()`);
// click the ACTUAL download button (exercises PRISTINE + Blob + <a download>)
execSync("rm -f " + SCRATCH + "/sec-dl/*.html");
await evl(`document.getElementById('dlBtn').click()`);
await new Promise(r => setTimeout(r, 1500));
const dropped = readdirSync(SCRATCH + "/sec-dl").filter(f => f.endsWith(".html"));
A(dropped.length === 1, "the real download button produced a file: " + (dropped[0] || "(none)"));
const emittedFile = readFileSync(SCRATCH + "/sec-dl/" + dropped[0], "utf8");
const blk = emittedFile.match(/<script type="application\/json" id="tower-state">([\s\S]*?)<\/script>/)[1];
A(blk.indexOf("<") === -1, "the downloaded file's state block has no literal '<'");
A((emittedFile.match(/id="tower-app"/g) || []).length === 1 && (emittedFile.match(/id="tower-core"/g) || []).length === 1,
  "the downloaded file has exactly its two real engine scripts — no injected extras");
// open that real file fresh as a victim (clear shared file:// localStorage + hard reload)
await send("Page.navigate", { url: "file://" + SCRATCH + "/sec-dl/" + dropped[0] }); await new Promise(r => setTimeout(r, 900));
await evl(`localStorage.clear();`);
await send("Page.reload", { ignoreCache: true }); await new Promise(r => setTimeout(r, 1200));
A((await evl(`typeof window.__pwned === 'undefined' || window.__pwned === false`)) === true, "victim opening the real downloaded file: no execution");
A((await evl(`document.getElementById('statusLine').textContent`)) === "one hand · one bell", "the downloaded file opens as a valid 1-hand tower");
A((await evl(`document.getElementById('lineageList').textContent`)).includes("img src=x"), "the payload survives as inert, escaped text in the lineage");
A((await evl(`!!document.querySelector('img[onerror]')`)) === false, "no injected <img onerror> element exists in the DOM");

// ─────────────────────────────────────────────────────────────
console.log("\n── 4. Crafted incoming FRAGMENT cannot inject");
await send("Page.navigate", { url: "about:blank" }); await new Promise(r => setTimeout(r, 150));
await send("Page.navigate", { url: FILE }); await new Promise(r => setTimeout(r, 700));
// build a valid fragment carrying a script payload as the inscription, using the shipped codec
const fragUrl = await evl(`(function(){
  var s = TowerCore.castBell(TowerCore.genesis(), {inscription: ${JSON.stringify("<script>window.top.__pwned=true</script>")}, nowMs: 1780000000000}).state;
  return TowerCore.encodeFragment(s);
})()`);
A(typeof fragUrl === "string" && fragUrl.startsWith("pb1."), "codec produced a fragment carrying a <script> inscription");
await evl(`localStorage.clear();`);
await send("Page.navigate", { url: "about:blank" }); await new Promise(r => setTimeout(r, 150));
await send("Page.navigate", { url: FILE + "#" + fragUrl }); await new Promise(r => setTimeout(r, 800));
await evl(`localStorage.clear();`);
await send("Page.reload", { ignoreCache: true }); await new Promise(r => setTimeout(r, 1000));
A((await evl(`window.__pwned === true`)) !== true, "following the poisoned fragment does not execute");
A((await evl(`document.getElementById('statusLine').textContent`)) === "one hand · one bell", "poisoned fragment loads as a valid tower");
A((await evl(`document.querySelectorAll('script').length`)) <= 3, "no extra <script> element materialised from the fragment (script count ≤ 3)");

// ─────────────────────────────────────────────────────────────
console.log("\n── 5. Hostile home URL and prototype-pollution attempts");
const homeReject = await evl(`TowerCore.normalize({bells:[],home:'javascript:alert(1)'}).home === null`);
A(homeReject, "javascript: home is rejected to null by normalize");
const homeReject2 = await evl(`TowerCore.normalize({bells:[],home:'data:text/html,<script>x</script>'}).home === null`);
A(homeReject2, "data: home is rejected to null by normalize");
const noPoll = await evl(`(function(){
  try { TowerCore.normalize(JSON.parse('{"__proto__":{"polluted":true},"bells":[]}')); } catch(e){}
  return ({}).polluted === undefined && Object.prototype.polluted === undefined;
})()`);
A(noPoll, "crafted __proto__ in state JSON does not pollute Object.prototype");

// ─────────────────────────────────────────────────────────────
console.log("\n── 6. CSP did not break the piece (audio + download path)");
await send("Page.navigate", { url: "about:blank" }); await new Promise(r => setTimeout(r, 150));
await evl(`localStorage.clear()`).catch(()=>{});
await send("Page.navigate", { url: FILE + "#" + fragUrl }); await new Promise(r => setTimeout(r, 900));
events.length = 0;
await evl(`document.getElementById('introBtn').click()`);
await new Promise(r => setTimeout(r, 6500));
A((await evl(`document.getElementById('rows').children.length`)) >= 3, "audio engine rings under CSP (rows advancing)");
const cspViolations = events.filter(e => e.method === "Log.entryAdded" && /Content Security Policy/i.test(JSON.stringify(e.params)));
A(cspViolations.length === 0, "no CSP violations logged during ring" + (cspViolations.length ? ": " + JSON.stringify(cspViolations[0]).slice(0,200) : ""));

// download path: does createObjectURL + programmatic click work under CSP?
await send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: SCRATCH + "/sec-dl2" });
mkdirSync(SCRATCH + "/sec-dl2", { recursive: true });
await evl(`document.getElementById('stopBtn').click()`);
const blobOk = await evl(`(function(){
  try { var b=new Blob(["<x>"],{type:"text/html"}); var u=URL.createObjectURL(b); URL.revokeObjectURL(u); return u.startsWith("blob:"); }
  catch(e){ return "ERR:"+e.message; }
})()`);
A(blobOk === true, "Blob + createObjectURL works under CSP (download carrier intact)");

console.log("\n════════════════════════════════════════");
console.log("  SECURITY: " + pass + " passed, " + fail + " failed");
console.log("════════════════════════════════════════");
process.exit(fail ? 1 : 0);

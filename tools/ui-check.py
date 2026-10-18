"""Browser regression checks for dist/index.html (headless Chromium via Python Playwright).

Usage:  npm run build && npm run ui
Covers what the engine tests cannot: layout at portal and phone sizes, dialogs, daily-puzzle
navigation and dates, undo, restart during animation, failure and continue, and that the page's
own state matches the pure engine move by move. Exits non-zero if any check fails.
"""
import json, pathlib, sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / 'dist' / 'index.html').as_uri()
results = []

def check(name, ok, detail=''):
    results.append((name, bool(ok), detail))
    print(('PASS ' if ok else 'FAIL ') + name + (f'  [{detail}]' if detail and not ok else ''))

def save(level=1, stars=0, maxl=None):
    best = {str(i + 1): 3 for i in range(min(stars // 3, 400))}
    rest = stars - 3 * len(best)
    if rest: best[str(len(best) + 1)] = rest
    return (f"localStorage.setItem('fh.level','{level}');localStorage.setItem('fh.max','{maxl or level}');"
            f"localStorage.setItem('fh.stars',{json.dumps(json.dumps(best))});")

def open_page(br, w, h, init='', reduced=True):
    ctx = br.new_context(viewport={'width': w, 'height': h}, reduced_motion='reduce' if reduced else 'no-preference')
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    if init: page.add_init_script(init)
    page.goto(URL); page.wait_for_timeout(300)
    return ctx, page, errs

# play the solver's winning order (stopping early when `until` is true), awaiting each move
PLAY = """async (until) => {
  const lv = {...G.lv, cap: G.cap};
  for (const m of solve(lv, liteFromG(), 400000)) {
    if (until && new Function('return ' + until)()) break;
    const b = G.birds[m]; await tapCell(b.r * G.lv.C + b.c);
  }
  await new Promise(r => setTimeout(r, 400));
}"""

LAYOUT = """() => {
  const R = el => el.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  const top = [...document.querySelectorAll('.top .ibtn, .top .total, .lvl')].filter(e => e.offsetParent);
  const headerOut = top.filter(e => { const r = R(e); return r.left < -0.5 || r.right > W + 0.5; }).map(e => e.id || e.className);
  const g = R(document.querySelector('#grid')), tools = R(document.querySelector('.tools'));
  const wide = getComputedStyle(document.querySelector('#app')).display === 'grid';
  const gridOk = g.top >= 0 && g.right <= W + 0.5 && g.left >= -0.5 && g.bottom <= H + 0.5 && (wide || g.bottom <= tools.top + 0.5);
  const toolsOk = tools.bottom <= H + 0.5 && tools.right <= W + 0.5;
  const coach = document.querySelector('#coach'), c = R(coach);
  const coachShown = coach.textContent.trim() ? coach.offsetHeight > 0 : true;
  const coachClear = !coachShown || !coach.textContent.trim() || c.bottom <= g.top + 0.5 || wide;
  return {headerOut, gridOk, toolsOk, coachShown, coachClear, grid: [Math.round(g.top), Math.round(g.bottom)], cell: parseInt(getComputedStyle(document.querySelector('#grid')).getPropertyValue('--cell'))};
}"""

with sync_playwright() as p:
    br = p.chromium.launch()

    # ---- layout: header, board, tools, coaching ----
    SIZES = [(320, 568), (360, 640), (390, 844), (667, 375), (740, 360), (800, 450), (821, 462), (907, 510), (1080, 607), (1280, 720), (1920, 1080)]
    for (w, h) in SIZES:
        for (L, stars) in [(1, 0), (40, 117), (100, 297)]:
            ctx, page, errs = open_page(br, w, h, save(L, stars))
            r = page.evaluate(LAYOUT)
            check(f'{w}x{h} L{L}: header controls inside the screen', not r['headerOut'], r['headerOut'])
            check(f'{w}x{h} L{L}: board and tools fully visible', r['gridOk'] and r['toolsOk'], r)
            check(f'{w}x{h} L{L}: cells at least 24px', r['cell'] >= 24, r['cell'])
            ctx.close()
        for L in range(1, 6):
            ctx, page, errs = open_page(br, w, h, save(L))
            r = page.evaluate(LAYOUT)
            check(f'{w}x{h} L{L}: tutorial line visible and clear of the board', r['coachShown'] and r['coachClear'], r)
            ctx.close()

    # ---- dialogs fit and close correctly ----
    for (w, h) in [(320, 568), (800, 450), (821, 462), (360, 640)]:
        ctx, page, errs = open_page(br, w, h, save(12, 33))
        for opener in ['showMenu()', 'showLevels()', 'showWardrobe()', 'showConfirmReset()', 'showHow()']:
            page.evaluate(opener); page.wait_for_timeout(80)
            bad = page.evaluate("""() => [...document.querySelectorAll('#card button')].filter(b => {
                b.scrollIntoView({block:'nearest'}); const r = b.getBoundingClientRect();
                return r.top < 0 || r.bottom > innerHeight + .5; }).map(b => b.textContent.trim())""")
            check(f'{w}x{h} {opener}: every button reachable', not bad, bad)
        ctx.close()

    # ---- dialog isolates the game (keyboard and pointer) ----
    ctx, page, errs = open_page(br, 390, 844, save(6))
    page.evaluate('showMenu()')
    for _ in range(12): page.keyboard.press('Tab')
    check('menu: Tab stays inside the dialog', page.evaluate("document.querySelector('#card').contains(document.activeElement)"))
    check('menu: has an accessible name', page.evaluate("document.querySelector('#card').getAttribute('aria-label')") == 'Menu')
    blocked = page.evaluate("""() => { const c = [...gridEl.children].find(c => !c.disabled); c.focus();
        const focusable = document.activeElement === c;
        c.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
        c.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
        return !focusable }""")
    page.wait_for_timeout(200)
    check('menu: board cannot be focused or played behind it', blocked and page.evaluate('G.moves') == 0)
    page.keyboard.press('Escape')
    page.evaluate("document.querySelector('#menuBtn').focus()"); page.click('#menuBtn'); page.wait_for_timeout(50)
    page.keyboard.press('Escape')
    check('menu: Escape closes and returns focus', page.evaluate("document.querySelector('#overlay').hidden && document.activeElement.id==='menuBtn'"))
    ctx.close()

    # ---- daily puzzle keeps the campaign run ----
    ctx, page, errs = open_page(br, 390, 844, save(10, 27))
    page.evaluate(PLAY, 'G.moves>=4')
    page.evaluate('doHint()'); page.wait_for_timeout(100)
    before = page.evaluate('JSON.stringify({s:stateJSON(),t:G.tools,m:G.moves,b:G.usedBooster,u:G.undo.length,c:G.cap})')
    page.evaluate('startDaily()'); page.wait_for_timeout(200)
    check('daily: opens the daily board', page.evaluate("mode==='daily'"))
    page.evaluate('showMenu()'); page.click('#mBack'); page.wait_for_timeout(300)
    after = page.evaluate('JSON.stringify({s:stateJSON(),t:G.tools,m:G.moves,b:G.usedBooster,u:G.undo.length,c:G.cap})')
    check('daily: back to the level restores board, wire, boosters and history exactly', before == after)
    check('daily: restored birds are drawn where the state says', page.evaluate("G.birds.every(b=>(b.loc.t==='gone')===b.el.hidden)"))
    ctx.close()

    # ---- daily puzzle finished after midnight counts for its own day ----
    ctx, page, errs = open_page(br, 390, 844, save(8))
    page.evaluate('startDaily()'); page.wait_for_timeout(200)
    day = page.evaluate('G.lv.day')
    page.evaluate("""() => { const RD = Date, off = 864e5;
      window.Date = class extends RD { constructor(...a) { a.length ? super(...a) : super(RD.now() + off) } static now() { return RD.now() + off } }; }""")
    page.evaluate(PLAY, None); page.wait_for_timeout(900)
    d = page.evaluate("JSON.parse(localStorage.getItem('fh.daily'))")
    check("daily: yesterday's puzzle finished after midnight credits yesterday", d['last'] == day, d)
    check("daily: today's puzzle still shows as new", page.evaluate("!!document.querySelector('#dailyBtn .dot')"))
    ctx.close()

    # ---- undo across a nest change, page state matches the engine ----
    ctx, page, errs = open_page(br, 390, 844, save(40))
    ok = page.evaluate("""async () => {
      const lv = {...G.lv, cap: G.cap}; const path = solve(lv, liteFromG(), 400000);
      let s = initLite(lv), same = true, undone = false;
      const eq = () => JSON.stringify(liteFromG()) === JSON.stringify({...s, occ: s.occ, alive: s.alive});
      for (const m of path) {
        const before = JSON.stringify(liteFromG()), qi = G.qi, b = G.birds[m];
        await tapCell(b.r * G.lv.C + b.c); s = applyLite(lv, s, m);
        if (JSON.stringify(liteFromG()) !== JSON.stringify(s)) same = false;
        if (!undone && G.qi > qi && G.tools.undo > 0 && !over) {   // a nest just changed: undo it and replay
          doUndo(); await new Promise(r => setTimeout(r, 350));
          if (JSON.stringify(liteFromG()) !== before) return 'undo did not restore the state';
          await tapCell(b.r * G.lv.C + b.c); undone = true;
        }
      }
      return same ? (undone ? 'ok' : 'no nest change seen') : 'page state differs from engine';
    }""")
    check('level 40: page state equals the engine after every move; undo across a nest change', ok == 'ok', ok)
    ctx.close()

    # ---- restart during a flight (normal animation timing) ----
    ctx, page, errs = open_page(br, 390, 844, save(6), reduced=False)
    page.evaluate("""() => { const lv={...G.lv,cap:G.cap}; const b=G.birds[solve(lv,liteFromG(),400000)[0]]; tapCell(b.r*G.lv.C+b.c); startLevel(level) }""")
    page.wait_for_timeout(1200)
    st = page.evaluate("[flights, locked, G.moves, G.birds.filter(b=>b.loc.t==='grid').length===G.birds.length]")
    check('restart mid-flight: new level is clean', st == [0, False, 0, True], st)
    ctx.close()

    # ---- quick final taps: the next-to-last bird is still flying when the last one lands ----
    for L in (8, 12, 40):
        ctx, page, errs = open_page(br, 390, 844, save(L), reduced=False)
        r = page.evaluate("""async () => {
          let stuck = 0; const orig = showStuck; showStuck = () => { stuck++; orig(); };
          const lv = {...G.lv, cap: G.cap}, path = solve(lv, liteFromG(), 400000);
          for (const m of path.slice(0, -2)) { const b = G.birds[m]; await tapCell(b.r * G.lv.C + b.c); }
          const [a, c] = path.slice(-2).map(m => G.birds[m]);
          tapCell(a.r * G.lv.C + a.c); await new Promise(r => setTimeout(r, 120)); tapCell(c.r * G.lv.C + c.c);
          await new Promise(r => setTimeout(r, 2500));
          if (!over) { const left = G.birds.find(b => b.loc.t === 'grid'); if (left) { await tapCell(left.r * G.lv.C + left.c); await new Promise(r => setTimeout(r, 2500)); } }
          return { stuck, won: card.textContent.includes('The flock is home') } }""")
        check(f'level {L}: quick last two taps end on the win screen, never "No bird can fly"', r['stuck'] == 0 and r['won'], r)
        ctx.close()

    # ---- fail, then keep going ----
    ctx, page, errs = open_page(br, 390, 844, save(9))
    page.evaluate("""async () => { for (let k = 0; k < 40 && !over; k++) {
        const s = liteFromG(), lv = {...G.lv, cap: G.cap};
        const wrong = freeMoves(lv, s).find(i => !s.nests.some(n => n && n.c === lv.birds[i].color && n.n < 3));
        if (wrong == null) break; const b = G.birds[wrong]; await tapCell(b.r * G.lv.C + b.c); }
      await new Promise(r => setTimeout(r, 500)); }""")
    check('fail: "wire is full" screen shown', page.evaluate("over && !overlay.hidden && card.textContent.includes('The wire is full')"))
    check('fail: shows the waiting birds and why', page.evaluate("card.querySelectorAll('.waiting .chip').length===G.cap && /Next time/.test(card.textContent)"))
    page.click('#contBtn'); page.wait_for_timeout(300)
    check('fail: Keep going adds two perches and resumes', page.evaluate('!over && overlay.hidden && G.cap===7'))
    ctx.close()

    # ---- first session: level 1 hand teaches free -> blocked -> free the blocker ----
    ctx, page, errs = open_page(br, 390, 844, '')
    steps = page.evaluate("""async () => {
      const out = [], tap = async id => { const b = G.birds[id]; await tapCell(b.r * G.lv.C + b.c); await new Promise(r => setTimeout(r, 250)); };
      let t = handTarget(); out.push(['free', t != null && rayBlocker(G.occ, G.lv.R, G.lv.C, G.birds[t].r, G.birds[t].c, G.birds[t].d) < 0]);
      await tap(t);
      t = handTarget(); const blk = rayBlocker(G.occ, G.lv.R, G.lv.C, G.birds[t].r, G.birds[t].c, G.birds[t].d);
      out.push(['blocked', blk >= 0]);
      await tap(t);
      out.push(['tip', document.querySelector('#coach').textContent.startsWith('Blocked')]);
      out.push(['points at blocker', handTarget() === blk]);
      await tap(blk);
      out.push(['done', handTarget() == null]);
      return out }""")
    check('level 1: hand shows a free bird, a blocked bird, then the bird in its way', all(ok for _, ok in steps), steps)
    ctx.close()

    ctx, page, errs = open_page(br, 390, 844, save(3))
    r = page.evaluate("""async () => {
      const s = liteFromG(), lv = {...G.lv, cap: G.cap};
      const good = freeMoves(lv, s).find(i => s.nests.some(n => n && n.c === lv.birds[i].color));
      let b = G.birds[good]; await tapCell(b.r * G.lv.C + b.c);
      const count = nestsEl.querySelector('.count').textContent;
      const s2 = liteFromG(), wrong = freeMoves(lv, s2).find(i => !s2.nests.some(n => n && n.c === lv.birds[i].color));
      b = G.birds[wrong]; await tapCell(b.r * G.lv.C + b.c);
      return {count, tip: document.querySelector('#coach').textContent, first: !!queueEl.querySelector('.chip.first')} }""")
    check('nest shows its count (1/3)', r['count'] == '1/3', r)
    check('first wait on the wire explains itself', 'waits on the wire' in r['tip'], r)
    check('first Up next chip is marked', r['first'], r)
    check('levels 1-5: boosters cost no star', page.evaluate("G.usedBooster=true;G.peak=0;starsFor().n") == 3)
    check('daily: no "new" dot before level 7', page.evaluate("!document.querySelector('#dailyBtn .dot')"))
    ctx.close()
    ctx, page, errs = open_page(br, 390, 844, save(8))
    check('level 6+: a booster costs a star', page.evaluate("G.usedBooster=true;G.peak=0;starsFor().n") == 2)
    check('daily: "new" dot shown once the player is past level 6', page.evaluate("!!document.querySelector('#dailyBtn .dot')"))
    ctx.close()

    # ---- eggs (ADR 0006) ----
    ctx, page, errs = open_page(br, 390, 844, save(12))
    r = page.evaluate("""() => ({ eggs: (G.lv.eggs||[]).length, drawn: gridEl.querySelectorAll('.egg').length,
        labelled: [...gridEl.querySelectorAll('.cell.has-egg')].every(c => c.disabled && /egg, hatches/.test(c.getAttribute('aria-label'))),
        coach: document.querySelector('#coach').textContent })""")
    check('level 12: eggs drawn, disabled and labelled', r['eggs'] >= 1 and r['drawn'] == r['eggs'] and r['labelled'], r)
    check('level 12: coach line introduces eggs', 'eggs' in r['coach'].lower(), r['coach'])
    r = page.evaluate("""async () => {
      const nb = G.birds.length;
      const blocked = G.birds.find(b => b.loc.t === 'grid' && rayBlocker(G.occ, G.lv.R, G.lv.C, b.r, b.c, b.d) >= nb);
      let tip = null;
      if (blocked) { await tapCell(blocked.r * G.lv.C + blocked.c); tip = document.querySelector('#coach').textContent; }
      const lv = {...G.lv, cap: G.cap};
      for (const m of solve(lv, liteFromG(), 400000)) {
        const before = gridEl.querySelectorAll('.egg').length, b = G.birds[m];
        await tapCell(b.r * G.lv.C + b.c); await new Promise(r => setTimeout(r, 300));
        if (gridEl.querySelectorAll('.egg').length < before) {
          const hatchedTip = document.querySelector('#coach').textContent;
          const occFree = (G.lv.eggs||[]).some((e, k) => G.occ[e.r * G.lv.C + e.c] !== nb + k);
          doUndo(); await new Promise(r => setTimeout(r, 400));
          return { tip, hatched: true, hatchedTip, occFree, back: gridEl.querySelectorAll('.egg').length === before };
        }
      }
      return { tip, hatched: false } }""")
    check('egg: blocking a bird explains the egg', r['tip'] is None or 'egg' in r['tip'], r)
    check('egg: hatches when its nest fills, clearing its cell', r['hatched'] and r['occFree'], r)
    check('egg: Undo brings a hatched egg back', r.get('back'), r)
    ctx.close()

    ctx, page, errs = open_page(br, 390, 844, save(13))
    r = page.evaluate("""async () => {
      mode = 'level'; level = 13;
      setupLevel({ R: 1, C: 3, cap: 5, open: 1, queue: [0, 1], L: 13,
        birds: [{ r: 0, c: 0, d: 1, color: 1 }, { r: 0, c: 2, d: 1, color: 1 }], eggs: [{ r: 0, c: 1, color: 0 }] });
      await new Promise(r => setTimeout(r, 200));
      await tapCell(2); await new Promise(r => setTimeout(r, 300));
      const shown = !overlay.hidden && card.textContent.includes('No bird can fly');
      const undo = !!document.querySelector('#stUndo');
      if (undo) document.querySelector('#stUndo').click();
      await new Promise(r => setTimeout(r, 400));
      return { shown, undo, resumed: overlay.hidden && !over && G.birds.every(b => b.loc.t === 'grid') } }""")
    check('dead end: "No bird can fly" screen with Undo', r['shown'] and r['undo'], r)
    check('dead end: Undo resumes the level', r['resumed'], r)
    ctx.close()

    # ---- the playtest fragment hides the overlay by itself ----
    frag = (ROOT / 'dist' / 'artifact.html').read_text()
    ctx = br.new_context(viewport={'width': 390, 'height': 844}); page = ctx.new_page()
    page.set_content('<!doctype html><meta charset="utf-8"><body style="margin:0">' + frag + '</body>'); page.wait_for_timeout(300)
    check('artifact.html: overlay hidden on load', page.evaluate("getComputedStyle(document.querySelector('#overlay')).display==='none'"))
    ctx.close()
    br.close()

failed = [r for r in results if not r[1]]
print(f'\n{len(results) - len(failed)} passed, {len(failed)} failed')
sys.exit(1 if failed else 0)

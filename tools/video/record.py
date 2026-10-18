"""Record the two CrazyGames preview videos from the real game.

Output (assets/videos/):
  flock-home-preview-landscape-1920x1080.mp4   16:9
  flock-home-preview-portrait-1080x1620.mp4    2:3

CrazyGames rules this follows: 15–20 s, no sound, the static cover as the first frame,
real gameplay at normal speed, no mouse cursor, no black bars, no promo text.

How: frame-by-frame, on a virtual clock, so the video is perfectly smooth no matter how slow
the recording machine is. Playwright's clock controls timers; every running animation (Web
Animations, CSS animations and transitions) is paused and moved to the exact time of each
frame before a screenshot is taken. The game plays itself: each move follows a winning line
from the solver that keeps two perches free, so the level ends on a three-star win.

Needs: `npm run build` first, Python Playwright with Chromium, and ffmpeg with libx264.
Usage: python3 tools/video/record.py [level=6]
"""
import asyncio
import pathlib
import shutil
import subprocess
import sys
import tempfile

from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
GAME = ROOT / 'dist' / 'index.html'
COVER = ROOT / 'tools' / 'covers' / 'cover.html'
OUT = ROOT / 'assets' / 'videos'
LEVEL = int(sys.argv[1]) if len(sys.argv) > 1 else 6  # short level that still uses the wire
FPS = 30
COVER_SECONDS = 1.0
MAX_SECONDS = 19.5         # CrazyGames cuts anything past 20 s
HOLD_AFTER_WIN_MS = 2300   # keep the win screen (stars popping in) on screen
START_DELAY_MS = 400       # a calm moment on the board before the first tap
MOVE_GAP_MS = 430          # time between taps; the next bird may take off while one is still flying

FORMATS = [
    # name, cover format, final size, CSS viewport for the game, device scale factor
    ('landscape', 'land', (1920, 1080), (960, 540), 2),
    ('portrait', 'port', (1080, 1620), (540, 810), 2),
]

# Runs in the page. Keeps every animation paused and positioned at virtual time `now`.
# An animation first seen at time t is treated as having started at t (its own delay is kept).
# When its time is up it is finished, which resolves its `finished` promise for the game code.
STEP_ANIMATIONS = """async (now) => {
  const born = window.__born || (window.__born = new WeakMap());
  for (let pass = 0; pass < 12; pass++) {
    let changed = false;
    for (const a of document.getAnimations()) {
      if (a.playState === 'finished' || a.playState === 'idle') continue;
      if (!born.has(a)) { born.set(a, now - (a.currentTime || 0)); changed = true; }
      const t = now - born.get(a);
      const timing = a.effect.getComputedTiming();
      const end = timing.endTime;
      if (end !== Infinity && t >= end) { a.finish(); changed = true; continue; }
      a.pause();
      a.currentTime = t;
    }
    // let promise callbacks (await anim.finished) run and start their next animations
    for (let i = 0; i < 20; i++) await Promise.resolve();
    if (!changed) break;
  }
}"""

NEXT_MOVE = """(cap) => {
  if (locked || over) return -2;
  const p = solve({...G.lv, cap}, liteFromG(), 80000) || solve({...G.lv, cap: G.cap}, liteFromG(), 80000);
  if (!p || !p.length) return -1;
  const b = G.birds[p[0]];
  return b.r * G.lv.C + b.c;
}"""


async def render_cover(browser, fmt, size, path):
    w, _ = size
    base = {'land': (1920, 1080), 'port': (800, 1200)}[fmt]
    page = await browser.new_page(viewport={'width': base[0], 'height': base[1]}, device_scale_factor=w / base[0])
    await page.goto(f'{COVER.as_uri()}?f={fmt}')
    await page.wait_for_selector('body[data-ready]')
    await page.screenshot(path=str(path), type='png')
    await page.close()


async def record_gameplay(browser, viewport, dpr, frames_dir):
    ctx = await browser.new_context(viewport={'width': viewport[0], 'height': viewport[1]}, device_scale_factor=dpr)
    await ctx.add_init_script(f"""try{{localStorage.setItem('fh.seenHow','true');localStorage.setItem('fh.level','{LEVEL}');localStorage.removeItem('fh.stars');}}catch(e){{}}""")
    page = await ctx.new_page()
    await page.clock.install()
    await page.goto(GAME.as_uri())
    await page.wait_for_function('typeof G==="object" && G && G.birds')
    await page.clock.run_for(100)        # let the first layout frame run
    await page.evaluate('document.fonts.ready')

    frame_ms = 1000 / FPS
    max_frames = int((MAX_SECONDS - COVER_SECONDS) * FPS)
    now, last_tap, win_at, n = 0.0, START_DELAY_MS - MOVE_GAP_MS, None, 0
    for n in range(max_frames):
        # game logic for this frame
        if win_at is None and now - last_tap >= MOVE_GAP_MS:
            cell = await page.evaluate(NEXT_MOVE, 4)  # cap 4 = keep two of five perches free → 3 stars
            if cell >= 0:
                await page.dispatch_event(f'.cell[data-i="{cell}"]', 'pointerdown')
                last_tap = now
        if win_at is None and await page.evaluate('!overlay.hidden'):
            win_at = now
        if win_at is not None and now - win_at >= HOLD_AFTER_WIN_MS:
            break
        # advance the world by one frame and capture it
        await page.clock.run_for(int(round(frame_ms)))
        now += frame_ms
        await page.evaluate(STEP_ANIMATIONS, now)
        await page.screenshot(path=str(frames_dir / f'f{n:05d}.png'), type='png')
    await ctx.close()
    return n + 1, win_at


def encode(cover_png, frames_dir, frame_count, size, out_path):
    w, h = size
    filt = (
        f'[0:v]scale={w}:{h}:flags=lanczos,format=yuv420p,setsar=1[c];'
        f'[1:v]scale={w}:{h}:flags=lanczos,format=yuv420p,setsar=1[g];'
        '[c][g]concat=n=2:v=1:a=0[v]'
    )
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error',
        '-loop', '1', '-framerate', str(FPS), '-t', f'{COVER_SECONDS}', '-i', str(cover_png),
        '-framerate', str(FPS), '-i', str(frames_dir / 'f%05d.png'),
        '-filter_complex', filt, '-map', '[v]',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-r', str(FPS),
        '-movflags', '+faststart', '-an', str(out_path),
    ], check=True)


async def main():
    if not GAME.exists():
        raise SystemExit('Run `npm run build` first.')
    if not shutil.which('ffmpeg'):
        raise SystemExit('ffmpeg is required.')
    OUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for name, fmt, size, viewport, dpr in FORMATS:
            with tempfile.TemporaryDirectory() as tmp:
                tmp = pathlib.Path(tmp)
                cover = tmp / 'cover.png'
                await render_cover(browser, fmt, size, cover)
                frames, win_at = await record_gameplay(browser, viewport, dpr, tmp)
                out = OUT / f'flock-home-preview-{name}-{size[0]}x{size[1]}.mp4'
                encode(cover, tmp, frames, size, out)
                won = f'win at {win_at / 1000 + COVER_SECONDS:.1f} s' if win_at is not None else 'NO WIN'
                print(f'wrote {out.relative_to(ROOT)}  ({out.stat().st_size / 1e6:.1f} MB, '
                      f'{COVER_SECONDS + frames / FPS:.1f} s, {won})')
        await browser.close()


asyncio.run(main())

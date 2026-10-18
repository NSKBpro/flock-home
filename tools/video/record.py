"""Record the two CrazyGames preview videos from the real game.

Output (assets/videos/):
  flock-home-preview-landscape-1920x1080.mp4   16:9
  flock-home-preview-portrait-1080x1620.mp4    2:3

CrazyGames rules this follows: 15–20 s, no sound, the static cover as the first frame,
real gameplay at normal speed, no mouse cursor, no black bars, no promo text.

How: the game plays itself (each move is the hint solver's choice) in headless Chromium while
Chrome's screencast captures frames with timestamps. ffmpeg turns them into a constant 30 fps
H.264 file with the cover image as the opening second.

Needs: `npm run build` first, Python Playwright with Chromium, and ffmpeg with libx264.
Usage: python3 tools/video/record.py [level=6]
"""
import asyncio
import base64
import os
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
LEVEL = int(sys.argv[1]) if len(sys.argv) > 1 else 6  # short level whose winning line fills the wire to 4 of 5
COVER_SECONDS = 1.0
TOTAL_SECONDS = 19.0       # CrazyGames cuts anything past 20 s
MOVE_GAP_MS = 240          # pause between taps; flights still read clearly

FORMATS = [
    # name, cover format, final size, viewport for the game, device scale factor
    ('landscape', 'land', (1920, 1080), (960, 540), 2.0),
    ('portrait', 'port', (1080, 1620), (540, 810), 2.0),
]


async def render_cover(browser, fmt, size, path):
    w, h = size
    base = {'land': (1920, 1080), 'port': (800, 1200)}[fmt]
    scale = w / base[0]
    page = await browser.new_page(viewport={'width': base[0], 'height': base[1]}, device_scale_factor=scale)
    await page.goto(f'{COVER.as_uri()}?f={fmt}')
    await page.wait_for_selector('body[data-ready]')
    await page.screenshot(path=str(path), type='jpeg', quality=95)  # same format as the frames, for ffmpeg concat
    await page.close()


async def record_gameplay(browser, viewport, dpr, frames_dir):
    # The device scale factor comes from the browser launch flag (see main): Chrome's screencast
    # ignores a context-level scale factor and would capture at CSS-pixel size.
    ctx = await browser.new_context(viewport={'width': viewport[0], 'height': viewport[1]})
    await ctx.add_init_script(f"""try{{localStorage.setItem('fh.seenHow','true');localStorage.setItem('fh.level','{LEVEL}');}}catch(e){{}}""")
    page = await ctx.new_page()
    await page.emulate_media(reduced_motion='no-preference')
    await page.goto(GAME.as_uri())
    await page.wait_for_function('typeof G==="object" && G && G.birds')
    await page.wait_for_timeout(700)

    cdp = await ctx.new_cdp_session(page)
    frames = []

    recording = True

    async def ack(session_id):
        try:
            await cdp.send('Page.screencastFrameAck', {'sessionId': session_id})
        except Exception:
            pass  # the page may already be closing

    def on_frame(ev):
        if recording:
            frames.append((ev['metadata']['timestamp'], ev['data']))
            asyncio.ensure_future(ack(ev['sessionId']))

    cdp.on('Page.screencastFrame', on_frame)
    w, h = int(viewport[0] * dpr), int(viewport[1] * dpr)
    await cdp.send('Page.startScreencast', {'format': 'jpeg', 'quality': 92, 'maxWidth': w, 'maxHeight': h, 'everyNthFrame': 1})
    await page.wait_for_timeout(400)

    start = asyncio.get_event_loop().time()
    while asyncio.get_event_loop().time() - start < TOTAL_SECONDS - COVER_SECONDS + 0.5:
        if await page.evaluate('over'):
            await page.wait_for_timeout(300)
            continue
        cell = await page.evaluate("""(()=>{if(locked)return -2;
            const p=solve({...G.lv,cap:G.cap},liteFromG(),60000);if(!p||!p.length)return -1;
            const b=G.birds[p[0]];return b.r*G.lv.C+b.c})()""")
        if cell == -2:
            await page.wait_for_timeout(80)
            continue
        if cell < 0:
            break
        await page.dispatch_event(f'.cell[data-i="{cell}"]', 'pointerdown')
        await page.wait_for_timeout(MOVE_GAP_MS)

    recording = False
    await cdp.send('Page.stopScreencast')
    await page.wait_for_timeout(200)
    await ctx.close()
    if not frames:
        raise SystemExit('No frames captured.')

    t0 = frames[0][0]
    for i, (ts, data) in enumerate(frames):
        (frames_dir / f'f{i:05d}.jpg').write_bytes(base64.b64decode(data))
    return [(f'f{i:05d}.jpg', ts - t0) for i, (ts, _) in enumerate(frames)]


def encode(cover_img, frames, frames_dir, size, out_path):
    # concat list: cover for COVER_SECONDS, then each frame until the next frame's timestamp
    lines = [f"file '{cover_img}'", f'duration {COVER_SECONDS:.3f}']
    limit = TOTAL_SECONDS - COVER_SECONDS
    for i, (name, t) in enumerate(frames):
        if t >= limit:
            break
        nxt = frames[i + 1][1] if i + 1 < len(frames) else t + 1 / 30
        lines += [f"file '{frames_dir / name}'", f'duration {max(1 / 60, min(nxt, limit) - t):.4f}']
    lines.append(lines[-2])  # concat demuxer needs the last file repeated
    listing = frames_dir / 'list.txt'
    listing.write_text('\n'.join(lines) + '\n')
    if os.environ.get('FH_VIDEO_DEBUG'):
        shutil.copytree(frames_dir, os.environ['FH_VIDEO_DEBUG'], dirs_exist_ok=True)
    w, h = size
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(listing),
        '-vf', f'scale={w}:{h}:flags=lanczos,fps=30,format=yuv420p',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-movflags', '+faststart', '-an',
        '-t', f'{TOTAL_SECONDS:.2f}', str(out_path),
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
                cover = tmp / 'cover.jpg'
                await render_cover(browser, fmt, size, cover)
                hi = await p.chromium.launch(args=[f'--force-device-scale-factor={dpr}'])
                frames = await record_gameplay(hi, viewport, dpr, tmp)
                await hi.close()
                out = OUT / f'flock-home-preview-{name}-{size[0]}x{size[1]}.mp4'
                encode(cover, frames, tmp, size, out)
                print(f'wrote {out.relative_to(ROOT)}  ({out.stat().st_size / 1e6:.1f} MB, {len(frames)} frames captured)')
        await browser.close()


asyncio.run(main())

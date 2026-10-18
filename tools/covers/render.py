"""Render the three CrazyGames cover images from tools/covers/cover.html.

Needs: Python Playwright with Chromium. The font comes from assets/fonts.
Usage: python3 tools/covers/render.py
"""
import asyncio
import pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
PAGE = ROOT / 'tools' / 'covers' / 'cover.html'
OUT = ROOT / 'assets' / 'covers'
FORMATS = {
    'land': (1920, 1080, 'flock-home-landscape-1920x1080.png'),
    'port': (800, 1200, 'flock-home-portrait-800x1200.png'),
    'sq': (800, 800, 'flock-home-square-800x800.png'),
}


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for key, (w, h, name) in FORMATS.items():
            page = await browser.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1)
            await page.goto(f'{PAGE.as_uri()}?f={key}')
            await page.wait_for_selector('body[data-ready]')
            if not await page.evaluate("document.fonts.check('800 50px Sniglet')"):
                raise SystemExit('Sniglet font did not load — check assets/fonts.')
            await page.screenshot(path=str(OUT / name))
            print('wrote', OUT / name)
        await browser.close()


asyncio.run(main())

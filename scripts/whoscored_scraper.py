#!/usr/bin/env python3
"""Scrape player statistics from a rendered WhoScored statistics page.

The scraper intentionally uses the browser-rendered table instead of calling
private endpoints. This is more resilient to the site's client-side rendering
and avoids hard-coding an undocumented API.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
import logging
import re
import shutil
import sys
from pathlib import Path
from typing import Any

from playwright.async_api import Page, TimeoutError as PlaywrightTimeoutError, async_playwright


LOGGER = logging.getLogger("whoscored_scraper")


OUTPUT_FIELDS = [
    "player",
    "team",
    "appearances",
    "minutesPlayed",
    "rating",
    "goals",
    "assists",
    "shotsPerGame",
    "tacklesPerGame",
    "interceptionsPerGame",
    "foulsPerGame",
    "yellowCards",
    "redCards",
]

FIELD_ALIASES = {
    "appearances": {"appearances", "apps", "app"},
    "minutesPlayed": {"minutesplayed", "minutes", "mins"},
    "rating": {"rating", "average rating", "av rating"},
    "goals": {"goals", "goal"},
    "assists": {"assists", "assist"},
    "shotsPerGame": {"shotspergame", "shots per game", "shots/game", "spg"},
    "tacklesPerGame": {"tacklespergame", "tackles per game", "tackles/game", "tackles pg", "tackles"},
    "interceptionsPerGame": {
        "interceptionspergame",
        "interceptions per game",
        "interceptions/game",
        "interceptions pg",
        "interceptions",
        "inter",
    },
    "foulsPerGame": {"foulspergame", "fouls per game", "fouls/game", "fouls pg", "fouls"},
    "yellowCards": {"yellowcards", "yellow cards", "yc", "yel"},
    "redCards": {"redcards", "red cards", "rc", "red"},
}


def clean(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalise_header(value: str) -> str:
    value = clean(value).lower()
    value = value.replace("-", " ").replace("_", " ")
    return re.sub(r"\s+", " ", value)


def canonical_field(header: str) -> str | None:
    normalised = normalise_header(header)
    compact = normalised.replace(" ", "")
    for field, aliases in FIELD_ALIASES.items():
        if normalised in aliases or compact in {a.replace(" ", "") for a in aliases}:
            return field
    return None


async def extract_tables(page: Page) -> list[dict[str, Any]]:
    """Extract candidate tables and their data attributes from the DOM."""
    return await page.evaluate(
        """
        () => [...document.querySelectorAll('table')].map(table => {
          const headers = [...table.querySelectorAll('thead th, thead td')].map(cell => ({
            text: cell.innerText,
            field: cell.getAttribute('data-field') || cell.getAttribute('data-stat') ||
                   cell.getAttribute('data-statistic') || ''
          }));
          const rows = [...table.querySelectorAll('tbody tr')].map(row => ({
            cells: [...row.querySelectorAll(':scope > td, :scope > th')].map(cell => ({
              text: cell.innerText,
              field: cell.getAttribute('data-field') || cell.getAttribute('data-stat') ||
                     cell.getAttribute('data-statistic') || ''
            })),
            text: row.innerText
          }));
          return { headers, rows };
        })
        """
    )


async def extract_player_table(page: Page) -> list[dict[str, str]]:
    """Extract the current player-statistics tab and return normalized rows."""
    return await page.evaluate(
        """
        () => {
          const tables = [...document.querySelectorAll('#top-player-stats-summary-grid, .top-player-stats-summary-grid')];
          const table = tables.find(candidate => candidate.offsetParent !== null) || tables[0];
          if (!table) return [];
          const rows = [...table.querySelectorAll('tr, [role="row"]')];
          if (rows.length < 2) return [];
          const cells = row => [...row.querySelectorAll(':scope > th, :scope > td, [role="cell"], [role="columnheader"]')];
          const headers = cells(rows[0]).map(cell => cell.innerText.trim());
          return rows.slice(1).map(row => {
            const rowCells = cells(row);
            const playerLink = row.querySelector('a[href*="/players/"]');
            const teamLink = row.querySelector('a[href*="/teams/"]');
            const values = rowCells.map(cell => cell.innerText.trim().replace(/\\s+/g, ' '));
            const result = { player: playerLink?.innerText.trim() || '', team: teamLink?.innerText.trim() || '', __headers: headers };
            headers.forEach((header, index) => result[header] = values[index] || '');
            return result;
          }).filter(row => row.player);
        }
        """
    )


def table_to_records(table: dict[str, Any]) -> list[dict[str, str]]:
    headers = table.get("headers", [])
    header_names = [clean(h.get("field") or h.get("text")) for h in headers]
    mapped = [canonical_field(h) for h in header_names]

    # Some versions expose data-field only on cells, so inspect the first row.
    if not any(mapped) and table.get("rows"):
        first_cells = table["rows"][0].get("cells", [])
        mapped = [canonical_field(clean(c.get("field") or c.get("text"))) for c in first_cells]

    if not any(field in mapped for field in OUTPUT_FIELDS[2:]):
        return []

    records: list[dict[str, str]] = []
    for row in table.get("rows", []):
        cells = row.get("cells", [])
        if len(cells) < len(mapped):
            continue
        record = {field: "" for field in OUTPUT_FIELDS}
        for index, field in enumerate(mapped):
            if field and index < len(cells):
                record[field] = clean(cells[index].get("text"))

        # WhoScored commonly renders player/team as the first cell with links.
        if not record["player"] and cells:
            record["player"] = clean(cells[0].get("text"))
        if not record["team"] and len(cells) > 1 and not mapped[1]:
            record["team"] = clean(cells[1].get("text"))

        if record["player"] or any(record[field] for field in OUTPUT_FIELDS[2:]):
            records.append(record)
    return records


async def click_next_page(page: Page) -> bool:
    selectors = [
        "a[rel='next']",
        "button[aria-label*='Next' i]",
        "a[aria-label*='Next' i]",
        ".pagination-next:not(.disabled)",
        ".next:not(.disabled)",
    ]
    for selector in selectors:
        locator = page.locator(selector).first
        if await locator.count() and await locator.is_visible() and await locator.is_enabled():
            before = await page.locator("table").count()
            try:
                await locator.click()
                await page.wait_for_timeout(900)
                await page.wait_for_function(
                    "(count) => document.querySelectorAll('table').length >= count",
                    arg=before,
                    timeout=0,
                )
            except PlaywrightTimeoutError:
                pass
            return True
    return False


async def click_player_tab(page: Page, tab_name: str) -> None:
    await dismiss_overlays(page)
    LOGGER.info("Buscando pestaña de jugadores: %s", tab_name)
    scope = page.locator("#top-player-stats, .top-player-stats").first
    labels = {
        "Summary": ("Summary", "Resumen", "Résumé", "Riepilogo"),
        "Defensive": ("Defensive", "Defensiva", "Défense", "Difensiva"),
    }[tab_name]
    tab = page.locator("body").locator("a").filter(has_text=re.compile("|".join(labels), re.I)).first
    for label in labels:
        candidate = scope.get_by_text(label, exact=True).first
        if await candidate.count():
            tab = candidate
            break
        candidate = page.get_by_text(label, exact=True).first
        if await candidate.count():
            tab = candidate
            break
    if not await tab.count():
        raise RuntimeError(
            f"No se encontró la pestaña '{tab_name}'. "
            "WhoScored puede estar mostrando una página anti-bot o una versión localizada."
        )
    # React's tab link can sit below the floating chat layer; dispatching the
    # native click keeps the site's own handler while bypassing that layer.
    await tab.click(force=True, timeout=0)
    await dismiss_overlays(page)
    LOGGER.info("Pestaña seleccionada: %s; esperando actualización de la tabla", tab_name)
    section_selector = {
        "Summary": "#top-player-stats-summary, .top-player-stats-summary",
        "Defensive": "#top-player-stats-defensive, .top-player-stats-defensive",
    }[tab_name]
    section = page.locator(section_selector).first
    await section.wait_for(state="visible", timeout=0)
    table = section.locator("#top-player-stats-summary-grid, .top-player-stats-summary-grid").first
    await table.wait_for(state="visible", timeout=0)
    LOGGER.info("Tabla cargada para pestaña: %s", tab_name)


async def dismiss_overlays(page: Page) -> None:
    """Dismiss consent/chat overlays that can intercept pagination clicks."""
    for label in ("Accept all", "Aceptar todo", "Tout accepter", "Accetta tutto"):
        button = page.get_by_text(label, exact=True).first
        if await button.count() and await button.is_visible():
            try:
                await button.click(force=True, timeout=3000)
            except PlaywrightTimeoutError:
                pass
            break
    for selector in (
        "#teammate-close",
        "#teammate-close-button",
        ".teammate-close",
        ".close-button",
        "button[aria-label='Close' i]",
        "button[aria-label*='close' i]",
    ):
        close = page.locator(selector).first
        if await close.count() and await close.is_visible():
            try:
                await close.click(force=True, timeout=1500)
            except PlaywrightTimeoutError:
                pass


async def click_player_next_page(page: Page) -> bool:
    sections = page.locator(
        "#top-player-stats-summary, .top-player-stats-summary, "
        "#top-player-stats-defensive, .top-player-stats-defensive"
    )
    scope = page.locator("body")
    for index in range(await sections.count()):
        candidate = sections.nth(index)
        if await candidate.is_visible():
            scope = candidate
            break
    candidates = [
        scope.get_by_text("next", exact=True).last,
        scope.locator("a[rel='next']").last,
        scope.locator("button[aria-label*='next' i]").last,
    ]
    for locator in candidates:
        if await locator.count() and await locator.is_visible() and await locator.is_enabled():
            grids = page.locator("#top-player-stats-summary-grid, .top-player-stats-summary-grid")
            grid = None
            for index in range(await grids.count()):
                candidate = grids.nth(index)
                if await candidate.is_visible():
                    grid = candidate
                    break
            if grid is None:
                LOGGER.warning("No se encontró una tabla visible para avanzar de página")
                return False
            before = await grid.inner_text()
            for attempt in range(2):
                LOGGER.info("Avanzando a la siguiente página (intento %d)", attempt + 1)
                await dismiss_overlays(page)
                await locator.click(force=True, timeout=0)
                try:
                    await page.wait_for_function(
                        "(old) => { const el = [...document.querySelectorAll('#top-player-stats-summary-grid, .top-player-stats-summary-grid')].find(x => x.offsetParent !== null); return el && el.innerText !== old; }",
                        arg=before,
                        timeout=0,
                    )
                    await dismiss_overlays(page)
                    LOGGER.info("La tabla cambió; página siguiente cargada")
                    return True
                except PlaywrightTimeoutError:
                    # The click may have succeeded while the React table was
                    # still rendering; give it another short observation.
                    await page.wait_for_timeout(1200)
                    current = await grid.inner_text()
                    if current != before:
                        await dismiss_overlays(page)
                        LOGGER.info("La tabla cambió después de esperar; página siguiente cargada")
                        return True
            LOGGER.warning("No se detectó cambio de tabla después de intentar avanzar")
            return False
    LOGGER.info("No hay una página siguiente disponible")
    return False


def merge_player_rows(target: dict[str, dict[str, str]], rows: list[dict[str, str]]) -> None:
    for row in rows:
        key = clean(row.get("player"))
        if not key:
            continue
        record = target.setdefault(key, {field: "" for field in OUTPUT_FIELDS})
        record["player"] = key
        record["team"] = record["team"] or clean(row.get("team"))
        for header, value in row.items():
            if header == "__headers":
                continue
            field = canonical_field(header)
            if field and field in record and value not in ("", "-"):
                record[field] = clean(value)


async def scrape(url: str, max_pages: int, delay: float, headed: bool, limit: int | None) -> list[dict[str, str]]:
    LOGGER.info("Iniciando scraping: url=%s, max_pages=%s, limit=%s", url, max_pages, limit or "sin límite")
    async with async_playwright() as playwright:
        # Prefer an installed browser when available; this avoids requiring a
        # separate ~150 MB Playwright browser download on Windows.
        installed_browser = next(
            (
                candidate
                for candidate in (
                    shutil.which("chrome"),
                    shutil.which("msedge"),
                    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                )
                if candidate and Path(candidate).exists()
            ),
            None,
        )
        launch_options = {"headless": not headed}
        if installed_browser:
            launch_options["executable_path"] = installed_browser
        browser = await playwright.chromium.launch(**launch_options)
        context = await browser.new_context(
            locale="en-US",
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131 Safari/537.36"
            ),
        )
        page = await context.new_page()
        LOGGER.info("Navegador iniciado%s", " en modo visible" if headed else "")
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(2500)
        await dismiss_overlays(page)
        LOGGER.info("Página inicial cargada")

        merged: dict[str, dict[str, str]] = {}
        for tab_name in ("Summary", "Defensive"):
            await click_player_tab(page, tab_name)
            target_players = set(merged) if tab_name == "Defensive" and limit else None
            defensive_seen: set[str] = set()
            for page_number in range(1, max_pages + 1):
                rows = await extract_player_table(page)
                LOGGER.info("%s - página %d: %d filas encontradas", tab_name, page_number, len(rows))
                merge_player_rows(merged, rows)
                LOGGER.info("Jugadores acumulados: %d", len(merged))
                if tab_name == "Summary" and limit and len(merged) >= limit:
                    LOGGER.info(
                        "%s: se alcanzó el límite solicitado (%d jugadores)",
                        tab_name,
                        limit,
                    )
                    break
                if tab_name == "Defensive" and target_players:
                    defensive_seen.update(
                        clean(row.get("player"))
                        for row in rows
                        if clean(row.get("player")) in target_players
                    )
                    LOGGER.info(
                        "Defensive: estadísticas encontradas para %d/%d jugadores objetivo",
                        len(defensive_seen),
                        len(target_players),
                    )
                    if defensive_seen >= target_players:
                        LOGGER.info("Defensive: se completaron los jugadores objetivo")
                        break
                if not await click_player_next_page(page):
                    break
                await dismiss_overlays(page)
                await page.wait_for_timeout(int(delay * 1000))
            # Reload resets the paginator and is more reliable than trying to
            # infer the site's current-page state after changing tabs.
            if tab_name == "Summary":
                await page.goto(url, wait_until="domcontentloaded", timeout=60000)
                await page.wait_for_timeout(1800)
                await dismiss_overlays(page)
        all_records = list(merged.values())
        if limit:
            all_records = all_records[:limit]
        LOGGER.info("Scraping terminado: %d jugadores exportables", len(all_records))
        await browser.close()
        return all_records


def write_records(records: list[dict[str, str]], output: Path, fmt: str) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    if fmt == "json":
        output.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
        return
    with output.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        writer.writerows(records)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", required=True, help="URL de la página de estadísticas de jugadores")
    parser.add_argument("--output", default="players.csv", help="Archivo de salida (.csv o .json)")
    parser.add_argument("--format", choices=("csv", "json"), help="Formato; por defecto se infiere de --output")
    parser.add_argument("--max-pages", type=int, default=100, help="Máximo de páginas a recorrer")
    parser.add_argument("--limit", type=int, help="Cantidad máxima de jugadores a exportar")
    parser.add_argument("--delay", type=float, default=2.0, help="Segundos entre páginas")
    parser.add_argument("--headed", action="store_true", help="Mostrar el navegador mientras scrapea")
    parser.add_argument(
        "--log-level",
        choices=("DEBUG", "INFO", "WARNING", "ERROR"),
        default="INFO",
        help="Nivel de detalle de los logs (por defecto: INFO)",
    )
    return parser.parse_args()


async def main() -> int:
    args = parse_args()
    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s | %(levelname)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    fmt = args.format or ("json" if Path(args.output).suffix.lower() == ".json" else "csv")
    try:
        if args.limit is not None and args.limit < 1:
            raise ValueError("--limit debe ser mayor que cero")
        records = await scrape(args.url, args.max_pages, args.delay, args.headed, args.limit)
    except PlaywrightTimeoutError as exc:
        print(f"Timeout cargando WhoScored: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:
        print(f"No se pudo completar el scraping: {exc}", file=sys.stderr)
        return 2

    if not records:
        print(
            "No se encontró una tabla compatible. Verificá que la URL sea una página "
            "de estadísticas de jugadores y que WhoScored no esté mostrando un desafío anti-bot.",
            file=sys.stderr,
        )
        return 1
    write_records(records, Path(args.output), fmt)
    LOGGER.info("Archivo guardado: %s", args.output)
    print(f"OK: {len(records)} jugadores guardados en {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

"""Browser-based WhoScored player statistics scraper."""

from __future__ import annotations

import argparse
import json
import re
import sys
from typing import Any

from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException, StaleElementReferenceException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


TABS = {
    "Summary": {
        "Apps": "appearances", "Mins": "minutesPlayed", "Goals": "goals",
        "Assists": "assists", "SpG": "shotsPerGame", "Yel": "yellowCards",
        "Red": "redCards", "Rating": "rating",
    },
    "Defensive": {
        "Tackles": "tacklesPerGame", "Inter": "interceptionsPerGame",
        "Fouls": "foulsPerGame",
    },
}

LEAGUES = {
    "england": "PREMIER_LEAGUE", "germany": "BUNDESLIGA", "spain": "LA_LIGA",
    "italy": "SERIE_A", "france": "LIGUE_1",
}


def main() -> None:
    args = parse_args()
    options = webdriver.ChromeOptions()
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-notifications")
    if args.headless:
        options.add_argument("--headless=new")

    driver = webdriver.Chrome(options=options)
    try:
        driver.get(args.url)
        wait = WebDriverWait(driver, args.timeout)
        accept_cookies(driver)
        wait_for_rows(wait)
        players: dict[str, dict[str, Any]] = {}

        for tab_name, metrics in TABS.items():
            select_tab(driver, wait, tab_name)
            select_all_players(driver, wait)
            wait_for_stable_table(driver, wait)
            collect_tab(driver, wait, metrics, players, args.max_pages)

        from datetime import datetime, timezone
        print(json.dumps({
            "schemaVersion": 1,
            "source": "WHOSCORED",
            "scrapedAt": datetime.now(timezone.utc).isoformat(),
            "players": list(players.values()),
        }, ensure_ascii=False))
    finally:
        driver.quit()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="https://www.whoscored.com/Statistics")
    parser.add_argument("--max-pages", type=int, default=140)
    parser.add_argument("--timeout", type=int, default=30)
    parser.add_argument("--headless", action="store_true")
    return parser.parse_args()


def accept_cookies(driver: webdriver.Chrome) -> None:
    for text in ("Accept All", "Aceptar todo"):
        try:
            driver.find_element(By.XPATH, f"//button[normalize-space()='{text}']").click()
            return
        except NoSuchElementException:
            continue


def wait_for_rows(wait: WebDriverWait) -> None:
    wait.until(EC.presence_of_element_located(
        (By.CSS_SELECTOR, "#top-player-stats-summary-grid tbody tr")
    ))


def select_tab(driver: webdriver.Chrome, wait: WebDriverWait, name: str) -> None:
    link = wait.until(EC.element_to_be_clickable(
        (By.XPATH, f"//div[@id='top-player-stats']//a[normalize-space()='{name}']")
    ))
    # WhoScored often renders Summary as selected on initial load. Clicking it
    # again is unnecessary and can be intercepted by the sticky ad container.
    if "selected" not in (link.get_attribute("class") or ""):
        click_control(driver, link)
        wait.until(lambda current: "selected" in (
            current.find_element(
                By.XPATH,
                f"//div[@id='top-player-stats']//a[normalize-space()='{name}']",
            ).get_attribute("class") or ""
        ))
        wait_for_stable_table(driver, wait)
    wait.until(EC.presence_of_element_located(
        (By.CSS_SELECTOR, "#top-player-stats table tbody tr")
    ))


def select_all_players(driver: webdriver.Chrome, wait: WebDriverWait) -> None:
    filter_control = find_visible_control(
        driver,
        wait,
        "//div[@id='top-player-stats']//*[normalize-space()='All players']",
    )
    click_control(driver, filter_control)


def find_visible_control(
    driver: webdriver.Chrome, wait: WebDriverWait, xpath: str
) -> Any:
    def visible_control(current: webdriver.Chrome) -> Any:
        for candidate in current.find_elements(By.XPATH, xpath):
            if candidate.is_displayed() and candidate.is_enabled():
                return candidate
        return False

    return wait.until(visible_control)


def click_control(driver: webdriver.Chrome, control: Any) -> None:
    driver.execute_script(
        "arguments[0].scrollIntoView({block: 'center'});",
        control,
    )
    # A fixed advertising element can overlap the visible hit target even
    # after scrolling. DOM click dispatches the same page event without
    # depending on the browser's physical hit testing.
    driver.execute_script("arguments[0].click();", control)


def wait_for_stable_table(driver: webdriver.Chrome, wait: WebDriverWait) -> None:
    previous = {"signature": None, "stable": 0}

    def is_stable(current: webdriver.Chrome) -> bool:
        try:
            table = current.find_element(By.CSS_SELECTOR, "#top-player-stats table")
            signature = (
                first_player_id(table),
                len(table.find_elements(By.CSS_SELECTOR, "tbody tr")),
            )
        except StaleElementReferenceException:
            previous["signature"] = None
            previous["stable"] = 0
            return False
        if signature == previous["signature"]:
            previous["stable"] += 1
        else:
            previous["signature"] = signature
            previous["stable"] = 0
        return previous["stable"] >= 2

    wait.until(is_stable)


def collect_tab(
    driver: webdriver.Chrome,
    wait: WebDriverWait,
    mapping: dict[str, str],
    players: dict[str, dict[str, Any]],
    max_pages: int,
) -> None:
    for page_number in range(max_pages):
        table = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#top-player-stats table")
        ))
        headers = read_table_headers(table)
        for player_row in table.find_elements(By.CSS_SELECTOR, "tbody tr"):
            player_data = read_row(player_row, headers, mapping)
            if player_data is None:
                continue
            merge_player_data(players, player_data)

        if page_number == max_pages - 1:
            break
        if not go_to_next_page(driver, wait, table):
            break


def read_table_headers(table: Any) -> list[str]:
    header_cells = table.find_elements(By.CSS_SELECTOR, "thead th")
    if not header_cells:
        header_cells = table.find_elements(
            By.CSS_SELECTOR, "tr:first-child th, tr:first-child td"
        )
    return [cell.text.strip() for cell in header_cells]


def merge_player_data(
    players: dict[str, dict[str, Any]], player_data: dict[str, Any]
) -> None:
    existing_player = players.setdefault(
        player_data["externalId"], player_data
    )
    existing_player["statistics"].update(player_data["statistics"])


def go_to_next_page(
    driver: webdriver.Chrome, wait: WebDriverWait, current_table: Any
) -> bool:
    next_link = find_visible_control(
        driver,
        wait,
        "//div[@id='top-player-stats']//a[@id='next']",
    )
    if "disabled" in (next_link.get_attribute("class") or ""):
        return False

    first_id = first_player_id(current_table)
    click_control(driver, next_link)
    wait.until(lambda current: first_player_id(
        current.find_element(By.CSS_SELECTOR, "#top-player-stats table")
    ) != first_id)
    return True


def read_row(row: Any, headers: list[str], mapping: dict[str, str]) -> dict[str, Any] | None:
    player_identity = read_player_identity(row)
    if player_identity is None:
        return None

    return {
        **player_identity,
        "statistics": read_player_statistics(row, headers, mapping),
    }


def read_player_identity(row: Any) -> dict[str, str] | None:
    player_links = row.find_elements(By.CSS_SELECTOR, "a[href*='/players/']")
    team_links = row.find_elements(By.CSS_SELECTOR, "a[href*='/teams/']")
    if not player_links or not team_links:
        return None
    player_href = player_links[0].get_attribute("href") or ""
    player_id = re.search(r"/players/(\d+)", player_href)
    if not player_id:
        return None
    team_href = team_links[0].get_attribute("href") or ""
    league = next((value for key, value in LEAGUES.items() if f"/{key}-" in team_href), None)
    if league is None:
        return None

    cells = row.find_elements(By.CSS_SELECTOR, "td")
    position_text = extract_position(cells[0].text if cells else "")
    if position_text is None:
        return None

    return {
        "externalId": player_id.group(1),
        "name": re.sub(r"^\d+\s+", "", player_links[0].text).strip(),
        "team": team_links[0].text.strip(),
        "league": league,
        "position": to_position(position_text),
    }


def extract_position(player_cell_text: str) -> str | None:
    if not player_cell_text.strip():
        return None

    position_match = re.search(
        r",\s*\d+\s*,\s*(?P<position>.+)$",
        " ".join(player_cell_text.splitlines()),
    )
    if not position_match:
        return None
    return position_match.group("position").strip()


def read_player_statistics(
    row: Any, headers: list[str], mapping: dict[str, str]
) -> dict[str, float]:
    statistics: dict[str, float] = {}
    cells = row.find_elements(By.CSS_SELECTOR, "td")
    for header, cell in zip(headers[1:], cells[1:]):
        metric = mapping.get(header)
        value = parse_number(cell.text)
        if metric and value is not None:
            statistics[metric] = value
    return statistics


def first_player_id(table: Any) -> str:
    links = table.find_elements(By.CSS_SELECTOR, "a[href*='/players/']")
    return links[0].get_attribute("href") if links else ""


def parse_number(value: str) -> float | None:
    value = value.strip()
    if not value or value == "-":
        return None
    value = re.sub(r"\([^)]*\)$", "", value.replace(",", ".").strip())
    try:
        return float(value)
    except ValueError:
        return None


def to_position(value: str) -> str:
    value = value.upper()
    if "GK" in value:
        return "GOALKEEPER"
    if value.startswith("D"):
        return "DEFENDER"
    if value.startswith("M") or value.startswith("AM"):
        return "MIDFIELDER"
    if "FW" in value or value.startswith("F") or "ST" in value:
        return "FORWARD"
    raise ValueError(f"Unknown WhoScored position: {value}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        raise

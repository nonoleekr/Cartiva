"""Copy allowlisted Cartiva documentation to Obsidian, preserving independent edits."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import unquote


REPO = Path(__file__).resolve().parents[1]
DEFAULT_VAULT = Path(r"D:\Ronald\Documents\obsidian_vault")
EVIDENCE = Path(r"C:\Users\Ronald\.codex\visualizations\2026\11\19\01a1f299-8637-7f41-bd0a-2bdfd9d9d133")
IMAGES = ["cartiva-desktop.png", "cartiva-mobile.png", "m3-account-desktop.png",
          "m3-account-mobile.png", "m3-signin-mobile.png", "m4-catalog-desktop.png",
          "m4-catalog-mobile.png", "m4-product-desktop.png", "m4-product-mobile.png",
          "m4-cart-desktop.png", "m4-cart-mobile.png", "admin-products-desktop.png",
          "admin-orders-tablet.png", "admin-create-mobile.png"]


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def note(title: str, kind: str, description: str, body: str, day: str, **metadata: str) -> bytes:
    fields = {"title": title, "type": kind, "updated": day, "description": description, **metadata}
    header = "---\n" + "".join(f"{key}: {json.dumps(value, ensure_ascii=False)}\n" for key, value in fields.items()) + "---\n\n"
    return (header + body).encode("utf-8")


def target(project: Path, relative: str) -> Path:
    result = (project / relative).resolve()
    if not result.is_relative_to(project.resolve()):
        raise RuntimeError(f"Destination escapes project folder: {relative}")
    return result


def verify(project: Path, manifest: dict) -> None:
    errors = []
    titles: set[str] = set()
    for relative, entry in manifest["files"].items():
        path = target(project, relative)
        if not path.is_file() or digest(path.read_bytes()) != entry["sha256"]:
            errors.append(f"Changed/missing vault file: {relative}")
            continue
        source = entry.get("source")
        if source and Path(source).exists() and digest(Path(source).read_bytes()) != entry["source_sha256"]:
            errors.append(f"Source changed since sync: {source}")
        if path.suffix != ".md":
            continue
        if source and Path(source).is_file() and Path(source).suffix == ".md":
            body = path.read_bytes().split(b"\n---\n\n", 1)
            if len(body) != 2 or body[1] != Path(source).read_bytes():
                errors.append(f"Copied Markdown body differs from source: {relative}")
        text = path.read_text(encoding="utf-8")
        title = re.search(r'^title: (.+)$', text, re.MULTILINE)
        if not text.startswith("---\n") or not title:
            errors.append(f"Missing note metadata: {relative}")
        elif title.group(1) in titles:
            errors.append(f"Duplicate managed title: {relative}")
        else:
            titles.add(title.group(1))
        for link in re.findall(r'\]\(([^)]+)\)', text):
            link = link.strip("<>").split("#", 1)[0]
            if not link or ":" in link:
                continue
            if not (path.parent / unquote(link)).exists():
                errors.append(f"Broken local link in {relative}: {link}")
    home = project.parents[1] / "Home.md"
    if "Projects/Cartiva/Cartiva.md" not in home.read_text(encoding="utf-8"):
        errors.append("Vault Home is missing its Cartiva link")
    if errors:
        raise RuntimeError("\n".join(errors))
    print(f"Verified {len(manifest['files'])} managed files: hashes, available source hashes, metadata, unique titles and local links.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vault", type=Path, default=DEFAULT_VAULT)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    vault = args.vault.resolve()
    if not (vault / ".obsidian").is_dir():
        raise RuntimeError("Expected an existing Obsidian vault; no vault/settings will be created.")
    project = vault / "Projects" / "Cartiva"
    if not project.resolve().is_relative_to(vault):
        raise RuntimeError("Cartiva destination resolves outside the selected vault")
    manifest_path = project / "sync-manifest.json"
    previous = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {"files": {}}
    if args.verify:
        if not manifest_path.exists():
            raise RuntimeError("No prior sync manifest exists")
        verify(project, previous)
        return

    now = datetime.now(timezone(timedelta(hours=8)))
    day = now.date().isoformat()
    planned: dict[str, tuple[bytes, Path | None]] = {}
    documents = [REPO / "README.md", REPO / "LEGACY_PROJECT_ANALYSIS.md", REPO / "AGENTS.md", *sorted((REPO / "docs").glob("*.md"))]
    for source in documents:
        relative = source.relative_to(REPO).as_posix()
        data = source.read_bytes()
        heading = re.search(r"^# (.+)$", data.decode("utf-8"), re.MULTILINE)
        title = f"Cartiva — {source.stem.replace('_', ' ')} ({relative})"
        planned[f"reference/{relative}"] = (
            note(title, "reference", heading.group(1) if heading else relative,
                 data.decode("utf-8"), day, source_repo=str(REPO), source_relative_path=relative,
                 source_sha256=digest(data)), source)

    # Explicit allowlist: never include the adjacent real .env file.
    example = REPO / "apps" / "api" / ".env.example"
    planned["reference/apps/api/.env.example"] = (example.read_bytes(), example)
    for name in ("storefront.png", "admin-products.png"):
        screenshot = REPO / "docs" / "screenshots" / name
        planned[f"reference/docs/screenshots/{name}"] = (screenshot.read_bytes(), screenshot)
    for name in ["m4-catalog-concept.png", "m4-cart-concept.png"]:
        concept = REPO / "docs" / "design" / name
        if concept.is_file():
            planned[f"reference/docs/design/{name}"] = (concept.read_bytes(), concept)
    for name in IMAGES:
        source = EVIDENCE / name
        if source.is_file():
            planned[f"assets/{name}"] = (source.read_bytes(), source)

    hub = """# Cartiva

[Vault home](../../Home.md)

## Resume here

The 2026 Cartiva portfolio phase is closed. Resume in 2027 from the closure handoff and commercial roadmap.
Catalog/product/cart UI uses the real API and an account-owned PostgreSQL cart.

- [Project memory / handoff](reference/docs/PROJECT_MEMORY.md)
- [Development log](reference/docs/DEVELOPMENT_LOG.md)
- [Project instructions](reference/AGENTS.md)
- [Obsidian update workflow](reference/docs/OBSIDIAN_WORKFLOW.md)

Repository: `D:/Coding_Projects/Cartiva`. The original Java repository is reference-only.
Recorded results are historical; inspect current source and run relevant checks when resuming.

## Project documentation

- [Overview and setup](reference/README.md)
- [Legacy analysis](reference/LEGACY_PROJECT_ANALYSIS.md)
- [Requirements / MVP scope](reference/docs/PROJECT_REQUIREMENTS.md)
- [System architecture / stack trade-offs](reference/docs/SYSTEM_ARCHITECTURE.md)
- [Database design](reference/docs/DATABASE_DESIGN.md)
- [API design](reference/docs/API_DESIGN.md)
- [Development roadmap](reference/docs/DEVELOPMENT_ROADMAP.md)
- [Decisions / authorization record](reference/docs/DECISIONS.md)
- [M4 design and generated assets](reference/docs/DESIGN_NOTES.md)

## Completed milestones and learning

- [M1: browser/server foundation](reference/docs/MILESTONE_1.md)
- [M2: PostgreSQL and catalog API](reference/docs/MILESTONE_2.md)
- [M3: authentication, sessions, authorization](reference/docs/MILESTONE_3.md)
- [M4: catalog, product pages and persistent cart](reference/docs/MILESTONE_4.md)

Latest recorded run (24 November 2026): 23 HTTP/config/safety tests and 49 PostgreSQL
integration tests passed (72 total), with lint/typechecks/builds and Chromium UI checks.
These tests were not rerun merely to copy documentation. CI/hosted TLS/other browsers
remain unverified. No default admin account, real payment processing or deployment.

- [M5: simulated checkout and orders](reference/docs/MILESTONE_5.md)

- [M6: administration and fulfillment](reference/docs/MILESTONE_6.md)

- [M7: release verification and deployment handoff](reference/docs/MILESTONE_7.md)

- [Hosted release runbook](reference/docs/RELEASE_RUNBOOK.md)

- [Admin portal polish](reference/docs/ADMIN_PORTAL_UX.md)

- [User testing improvements](reference/docs/USER_TESTING_IMPROVEMENTS.md)
- [User testing release notes](reference/docs/USER_TESTING_RELEASE.md)

- [Project closure and 2027 handoff](reference/docs/PROJECT_CLOSURE.md)

## Keep the notes current

Update owning repository documents and the compact memory/log, then run
`python scripts/sync_obsidian.py` and `python scripts/sync_obsidian.py --verify`.
The managed reference folder and this hub reject independent edits rather than overwrite
them. Keep personal learning notes alongside the hub; unknown neighboring files are retained.
The manifest records provenance and hashes. Local credentials/session data are not copied.

## Recorded screenshots

These show synthetic local verification, not a hosted release.

- [M1 desktop](assets/cartiva-desktop.png)
- [M1 mobile](assets/cartiva-mobile.png)
- [M3 account desktop](assets/m3-account-desktop.png)
- [M3 account mobile](assets/m3-account-mobile.png)
- [M3 sign-in mobile](assets/m3-signin-mobile.png)
- [M4 catalog desktop](assets/m4-catalog-desktop.png)
- [M4 catalog mobile](assets/m4-catalog-mobile.png)
- [M4 product desktop](assets/m4-product-desktop.png)
- [M4 product mobile](assets/m4-product-mobile.png)
- [M4 cart desktop](assets/m4-cart-desktop.png)
- [M4 cart mobile](assets/m4-cart-mobile.png)

- [Admin products desktop](assets/admin-products-desktop.png)
- [Admin orders tablet](assets/admin-orders-tablet.png)
- [Admin editor mobile](assets/admin-create-mobile.png)

## Pending decisions / next actions

- Verify the M7 release candidate and confirm hosting before publication.
- Confirm actual hosting budget, public signup policy, TLS/proxy behavior and recovery
  readiness before public deployment; never confuse demo safeguards with production readiness.
"""
    # Assets may be unavailable in a later environment; retain any archived originals.
    for name in IMAGES:
        if f"assets/{name}" not in planned and not (project / "assets" / name).exists():
            hub = hub.replace(next((line + "\n" for line in hub.splitlines() if f"assets/{name}" in line), ""), "")
    planned["Cartiva.md"] = (note("Cartiva — Project Hub", "project", "Project documentation, milestone status and development handoff.", hub, day), None)

    # Refuse to overwrite any independent edits, including managed notes no longer sourced.
    for relative, entry in previous["files"].items():
        path = target(project, relative)
        if not path.is_file() or digest(path.read_bytes()) != entry["sha256"]:
            raise RuntimeError(f"Independent edit/missing managed file: {relative}. Reconcile it before syncing.")
    for relative in planned:
        path = target(project, relative)
        if path.exists() and relative not in previous["files"]:
            raise RuntimeError(f"Existing unmanaged destination: {relative}; no overwrite performed.")

    print(f"Source: {REPO}\nDestination: {project}\nPlan: {len(documents)} source Markdown documents, safe environment sample, {len([p for p in planned if p.startswith('assets/')])} images, project hub.")
    if args.dry_run:
        for relative in planned:
            print(relative)
        print("Dry run only: no files changed.")
        return

    home = vault / "Home.md"
    log = vault / "Maintenance Log.md"
    original_home = home.read_bytes()
    original_log = log.read_bytes()
    backup = REPO / ".local" / "obsidian-backups" / now.strftime("%Y%m%d-%H%M%S-%f")
    backup.mkdir(parents=True, exist_ok=False)
    shutil.copy2(home, backup / "Home.md")
    shutil.copy2(log, backup / "Maintenance Log.md")

    entries = dict(previous["files"])
    for relative, (data, source) in planned.items():
        path = target(project, relative)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        entries[relative] = {"sha256": digest(data)}
        if source:
            entries[relative].update(source=str(source), source_sha256=digest(source.read_bytes()))

    if b"Projects/Cartiva/Cartiva.md" not in original_home:
        addition = "\n\n## Development projects\n\n- [Cartiva](Projects/Cartiva/Cartiva.md) — project documentation, decisions, milestone learning and resume context.\n"
        home_text = re.sub(r"^updated: .+$", f"updated: {day}", original_home.decode("utf-8"), count=1, flags=re.MULTILINE)
        home.write_text(home_text + addition, encoding="utf-8", newline="")
    log_addition = f"\n\n## {day} — Cartiva documentation sync\n\nCopied {len(documents)} repository Markdown documents, a safe environment example, recorded screenshots and a project hub into Projects/Cartiva. Added provenance and hash manifest; preserved source bodies and existing vault content. Home/Maintenance Log backed up outside the vault at `{backup}`. Verified managed file hashes, source hashes, metadata, unique titles and local links. No application tests rerun by this sync; milestone implementation/checks are recorded in the copied guides. No settings/plugins changed. Obsidian rendered views/backlinks not visually checked.\n"
    log_addition += "\nHome/Maintenance Log backups are outside the vault. Verified source/target hashes, note metadata, unique managed titles and local links; Obsidian rendering/backlinks were not visually checked.\n"
    log_text = re.sub(r"^updated: .+$", f"updated: {day}", original_log.decode("utf-8"), count=1, flags=re.MULTILINE)
    log.write_text(log_text + log_addition, encoding="utf-8", newline="")
    manifest = {"synced_at": now.isoformat(), "source_repo": str(REPO), "backup_directory": str(backup), "files": entries}
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    verify(project, manifest)
    print(f"Synced; navigation backup: {backup}")


if __name__ == "__main__":
    main()

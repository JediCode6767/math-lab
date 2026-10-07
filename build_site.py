from pathlib import Path
import shutil


ROOT = Path(__file__).resolve().parent
MATH_LAB = Path("/Users/jedimoj/Library/Application Support/Clicky/projects/agents/math-lab")
SOURCE_SOLVER = MATH_LAB / "app" / "solver"
SOURCE_PRACTICE = MATH_LAB / "app"
DOCS = ROOT / "docs"
STATIC = ROOT / "static"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Math Lab source changed: expected {label} marker was not found.")
    return text.replace(old, new, 1)


def main() -> None:
    if not SOURCE_SOLVER.is_dir():
        raise RuntimeError(f"Math Lab source folder not found: {SOURCE_SOLVER}")

    DOCS.mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "solver.js", "graph.js", "input.js"):
        shutil.copy2(SOURCE_SOLVER / name, DOCS / name)
    bundle = SOURCE_SOLVER / "node_modules" / "nerdamer" / "dist" / "bundle.js"
    bundle_target = DOCS / "node_modules" / "nerdamer" / "dist" / "bundle.js"
    bundle_target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(bundle, bundle_target)

    practice = DOCS / "practice"
    practice.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SOURCE_PRACTICE / "index.html", practice / "index.html")
    shutil.copy2(SOURCE_PRACTICE / "core.js", practice / "core.js")

    html_path = DOCS / "index.html"
    html = html_path.read_text(encoding="utf-8")
    html = replace_once(
        html,
        '<meta name="theme-color" content="#f5f3ed">',
        '<meta name="theme-color" content="#f5f3ed">\n'
        '  <link rel="manifest" href="./manifest.webmanifest">\n'
        '  <link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">',
        "theme color",
    )
    html = replace_once(
        html,
        '      .top-link { font-size: 10px; }',
        '      .top-link { font-size: 10px; }\n'
        '      .primary, .secondary { min-height: 44px; touch-action: manipulation; }\n'
        '      .graph-controls button, .ocr-settings .secondary { min-height: 44px; }\n'
        '      .file-label { min-height: 44px; display: inline-flex; align-items: center; }',
        "mobile touch targets",
    )
    html = replace_once(
        html,
        '<a class="top-link" href="../index.html">',
        '<a class="top-link" href="./practice/index.html">',
        "practice link",
    )
    html = replace_once(
        html,
        "</body>",
        '  <script src="./pwa-register.js"></script>\n</body>',
        "PWA registration",
    )
    html_path.write_text(html, encoding="utf-8")

    for source in STATIC.rglob("*"):
        if source.is_file():
            target = DOCS / source.relative_to(STATIC)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)

    print(f"Built static Math Lab site in {DOCS}")


if __name__ == "__main__":
    main()

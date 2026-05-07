# Project Constraints & Mandates

## Font Management
- **NEVER USE WOFF2** for the Qiji font (`QijiCombo`). 
- **Rationale**: WOFF2 conversion consistently causes file corruption or rendering failure in the screenshot engine within this project's context.
- **Requirement**: Only use split **TTF parts** (`qiji-part1.ttf`, `qiji-part2.ttf`) to stay under Cloudflare's 25MB individual file limit.
- **Reference**: Any attempt to optimize via WOFF2 has failed 4 times. Do not repeat.

## Screenshot Capture
- **Method**: Use "In-Place Vector Overlay" (using `opentype.js`).
- **Rationale**: standard HTML-to-Image libraries fail to inline large fonts (60MB+) reliably.
- **Requirement**: Use precision 5 for path data to maintain calligraphy sharp edges.

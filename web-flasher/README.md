# ModESP32 Firmware Center · One-Click Development Flash

Production URL: https://agentesp32.hlthanh1992.workers.dev

## How it works

GitHub Actions builds only the `mod-esp32s3-st7789v-28` board (ESP-IDF 6.1).
After a successful build it uploads the usual GitHub Actions artifact **and** publishes a uniquely tagged, immutable **Development prerelease**, for example `mod-esp32s3-dev-0123456789ab`, with:

- `merged-binary.bin` (whole ESP32-S3 flash image at offset 0)
- `SHA256SUMS` (SHA-256 for the image)

Each release is marked **experimental**, never Stable or Latest Tested. Older prereleases remain available for diagnostics and rollback. There is no automatic OTA update.

Cloudflare Worker (source: `web-flasher/_worker.js`) serves same-origin endpoints:

- `GET /api/firmware/latest`: newest matching non-draft Development prerelease, plus expected SHA-256, board, chip, tag and `firmwareUrl`.
- `GET /api/firmware/binary?tag=mod-esp32s3-dev-<12 lowercase hex>`: streams only the listed firmware asset from the exact GitHub release; arbitrary URLs and other tags are not accepted.

The website fetches both through the same origin, downloads the firmware into browser memory, verifies ESP image header, size and SHA-256, then gives ESP Web Tools a temporary blob manifest. This is a **user-initiated USB flash**: the browser must have permission to open the device. No file download is required in auto mode. The site retains manual firmware selection as an offline/failure fallback.

## Deploy the Worker to the existing workers.dev website

The GitHub commit does **not** itself prove Cloudflare was deployed. To activate the API, deploy **the Worker entrypoint and static assets together**:

- Wrangler project root: `web-flasher/`
- Config: `web-flasher/wrangler.jsonc`
- Worker name: `agentesp32` (check this matches your existing Cloudflare Worker before deploying)
- Worker module: `_worker.js`
- Static assets: `./`, binding `ASSETS` (the Worker serves the frontend via `env.ASSETS.fetch`)
- CLI in a checkout where Wrangler is installed: `cd web-flasher && npx wrangler deploy`

**Important:** Deploying to an existing Worker named `agentesp32` can replace that Worker's current script. Back up its Cloudflare configuration and confirm its bindings/routes before the first deploy. The provided Wrangler config is designed for a static site plus API; do not overwrite unrelated configuration.

For Cloudflare **Pages** (rather than Workers), `_worker.js` is also supported in Pages advanced mode. If the site uses a static-only deployment without running the Worker script, the UI will show that automatic firmware is unavailable and permit manual selection.

## Flash procedure

1. Ensure that the firmware workflow finished **Build + Publish Development** successfully and that the Cloudflare deployment serves `/api/firmware/latest`.
2. Open the HTTPS website on Chrome or Edge desktop. Select **Development – latest from GitHub**. It should show the prerelease tag, size, and SHA256 verified.
3. Verify hardware supply, speaker wiring, chip, GPIO and backups. Mark both confirmation checkboxes.
4. Connect ESP32-S3 by USB, click **Connect & Flash Firmware**, pick its serial device and follow the prompts.
5. Close flash dialog, open Serial Monitor, press RESET and inspect logs. No logs are uploaded automatically.

In Manual mode, get `merged-binary.bin` and `SHA256SUMS` from the **same successful workflow artifact**. SHA-256 verification against a user-supplied checksum doesn't independently prove the files are authentic. The auto mode obtains the expected checksum from the GitHub prerelease through the Worker.

## Troubleshooting

- **No published Development firmware:** workflow may still be building, or the Publish Development step failed. Go to Actions and inspect that job. The previous successful Actions artifact is still accessible from GitHub.
- **API firmware HTTP 404 / HTML response:** the Cloudflare Worker entrypoint likely has not been deployed; static-only hosting is insufficient. Use Manual mode until it is deployed.
- **API HTTP 502:** GitHub API or release asset lookup failed, or unauthenticated API rate limit. Inspect Cloudflare Worker logs. Retry later or use Manual mode.
- **SHA-256 mismatch:** Flash is blocked. Do not bypass the validation.
- **ESP Web Tools fails:** use HTTPS and compatible browser, a data USB cable, the correct port and release the Serial Monitor's port first. Board flash success does not prove the attached LCD/audio wiring is correct.

## Security and scope

- A GitHub token is used only **inside GitHub Actions** for release publishing. No GitHub/Cloudflare token is embedded in the site.
- Only approved prerelease tags and expected asset names are proxied. The API serves firmware publicly and cannot authenticate device ownership.
- Serial Monitor logs remain local until the user explicitly submits a GitHub Issue (which is public). Redaction is best-effort; review before sharing.
- The LCD backlight and resistive touch are not enabled in this experimental board firmware; the microphone chip and physical GPIO/voltage compatibility still need testing.
- **Latest Tested** channel must NOT be presented until a verified, hardware-tested firmware is explicitly promoted.
- No dynamic GPIO or Multi-LLM features were added in this change.

## CI

- `.github/workflows/mod-esp32s3-firmware.yml`: build and publish immutable Development release on `main`.
- `.github/workflows/web-flasher-tests.yml`: JavaScript and Worker API unit tests.
- `.github/workflows/build.yml`: broad upstream board CI; skips web-only commits.

<!-- Cloudflare Workers Builds: trigger a fresh main-branch deployment after configuring root directory web-flasher. -->

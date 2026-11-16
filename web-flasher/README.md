# ModESP32 Firmware Center

Static Web Serial / ESP Web Tools website for **ESP32-S3 N16R8 with ST7789V 240x320**, I2S microphone and MAX98357A audio amplifier. Initial firmware remains experimental.

## Features

1. Flash a **locally selected** GitHub Actions `merged-binary.bin` through [ESP Web Tools](https://esphome.github.io/esp-web-tools/). The browser generates a temporary manifest at runtime, with the ESP32-S3 chip family and flash offset 0. This is a **merged image**, not an application-only BIN.
2. Open Serial Monitor at 115200 baud, observe boot logs after pressing RESET, download text logs and copy logs after basic secret redaction.
3. Create a **draft** GitHub Issue containing a short redacted excerpt. Only the user's explicit submission in GitHub makes the issue visible. **Never automatically upload logs.**

### Build firmware in GitHub Actions

From `YHresearcher/ModESP32`, open **Actions → ModESP32 S3 Firmware (Web Flash) → Run workflow**.
When the job succeeds, download artifact `mod-esp32s3-st7789v-28-<sha>` and unzip it. Choose **merged-binary.bin** in the website.

This dedicated workflow builds only the custom board, avoiding hundreds of unrelated upstream variants. It does **not** deploy or release untested firmware to the public automatically.

### Deploy to Cloudflare Pages (preferred)

Connect GitHub repository `YHresearcher/ModESP32` as a Pages project:

- Production branch: `main`.
- Framework preset: `None`.
- Root directory: `web-flasher`.
- Build command: leave empty (or `exit 0`).
- Build output directory: `.` (the root directory shown above).
- Enable HTTPS (Cloudflare's `pages.dev` domain already uses HTTPS).

Alternative: Vercel static site with **Root Directory** `web-flasher` and no build command.

No GitHub personal access token or Cloudflare API token needs to be stored in the website.

### Flashing instructions

Use a computer with **Chrome or Microsoft Edge**, connected over a data-capable USB cable. Close Arduino Serial Monitor, ESP-IDF monitor, and other apps that might hold the port. Open the HTTPS website, select the firmware artifact's merged-binary.bin, click *Connect & Flash Firmware*, select the correct device port, then follow ESP Web Tools prompts. A factory flash may affect stored settings; keep backups. The site never silently erases NVS.

### Logs

After flashing, exit the flash dialog / release the COM port before opening the integrated serial monitor. Select 115200 baud, press RESET on the ESP32, and watch boot logs. Click *Download log*, or *Prepare GitHub Issue* to open an editable Issue draft. Its summary may be truncated to 1800 characters because of URL limits. For a full trace, download a .txt file and attach it manually.

The client applies **only basic** redaction for common keys. Logs may still contain IP addresses, MAC addresses, SSIDs, transcripts, tokens or other private data. **Review manually** before posting a public issue. Issues are public on a public repository. If private diagnostics are needed, do not submit through GitHub Issues.

### Known MVP limits

- Flash and console require a compatible browser and HTTPS; do not work directly from a headless server.
- Flashing and Serial Monitor cannot use the same serial port simultaneously.
- Touch controller, LCD backlight, pin mappings, microphone IC and power requirements are not yet hardware validated.
- Current site accepts a local firmware binary, not a remotely published firmware download.
- No central log storage or dashboard; user-submitted GitHub Issues are the audit record.
- If ESP Web Tools does not accept a locally generated blob URL for the firmware in a particular browser, use [ESP Web Tools official documentation](https://esphome.github.io/esp-web-tools/) to troubleshoot and consider a hosted, immutable manifest/firmware artifact in a future iteration.

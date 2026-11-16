# ModESP32 DIY ESP32-S3 N16R8 / ST7789V 2.8-inch

Experimental build target for a 16MB flash / 8MB PSRAM ESP32-S3, 240x320 ST7789V SPI display, I2S mic and MAX98357A amplifier. Not yet built or tested on hardware.

### Wiring (provisional)
- LCD SCK GPIO12; MOSI GPIO11; MISO GPIO8; CS GPIO10; DC GPIO13; RESET GPIO14.
- Touch candidate XPT2046: CS GPIO9; IRQ GPIO7; share SPI 12/11/8. **Touch is NOT implemented in this first build.**
- I2S mic: SCK GPIO4, WS GPIO5, SD GPIO6, VDD=3V3, GND=GND. L/R=GND only if chip datasheet confirms.
- MAX98357A: BCLK GPIO15, LRC GPIO16, DIN GPIO17; speaker 4ohm 3W connects across amplifier outputs, never to GND.
- LCD VCC voltage, backlight LED drive, MAX98357A power supply and mic model must be verified before connecting power. GPIO21 is NOT actively driven as a backlight pin in this build.
- microSD and dynamic GPIO configuration are out of scope.

### Build
Use ESP-IDF release/v6.1 (minimum v6.0.1), activate its environment, then:

```sh
python3 scripts/build.py --list-boards
python3 scripts/build.py mod-esp32s3-st7789v-28 --name mod-esp32s3-st7789v-28
```

Check logs before flashing and verify display electrical characteristics first. Panel may be black until its LED is safely powered. Rotation, colors and module controller ID remain to be physically checked. Backend is the existing XiaoZhi protocol; no LLM API keys are embedded.

# ModESP32 ESP32-S3 DIY hardware plan

Target: ESP32-S3 N16R8, ST7789V 240x320 SPI TFT (2.8 inch), resistive touch controller not yet confirmed, I2S microphone (model not yet confirmed), MAX98357A with 4 ohm / 3 W speaker.

Proposed (not hardware-validated) GPIOs: LCD CLK 12, MOSI 11, MISO 8, CS 10, DC 13, RESET 14; touch CS 9, IRQ 7, CLK/MOSI/MISO shared with LCD; mic SCK 4, WS 5, SD 6; amplifier BCLK 15, LRC 16, DIN 17.

LCD LED/backlight GPIO is intentionally unspecified until electrical characteristics are verified. MicroSD unused. Prototype should retain existing board support and shared XiaoZhi core.

Safety: confirm LCD supply and logic voltages, microphone chip, touch controller, amplifier power and wiring before applying power. Firmware and GPIOs are not yet validated on physical hardware.

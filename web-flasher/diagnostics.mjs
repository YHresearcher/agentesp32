// Pure helpers: no browser APIs, suitable for node --test.
export const FIRMWARE_MAX_BYTES = 16 * 1024 * 1024;
export function validateMergedImage(bytes, filename, size) {
  const issues = [];
  if (filename !== "merged-binary.bin") issues.push("Tên file cần là merged-binary.bin từ đúng artifact.");
  if (size < 1024 * 1024 || size > FIRMWARE_MAX_BYTES) issues.push("Dung lượng firmware không nằm trong khoảng 1–16 MiB.");
  if (bytes.length < 24 || bytes[0] !== 0xe9) issues.push("Thiếu ESP image magic 0xE9 tại offset 0; có thể đây không phải merged image.");
  return issues;
}
export function parseChecksum(text, filename = "merged-binary.bin") {
  const rows = text.split(/\r?\n/);
  for (const row of rows) {
    const match = row.trim().match(/^([0-9a-fA-F]{64})\s+\*?(.+)$/);
    if (match && match[2].trim().replace(/\\/g, "/").split("/").pop() === filename) return match[1].toLowerCase();
  }
  return null;
}
export function redactSecrets(text) {
  return String(text)
    .replace(/((?:Authorization|Proxy-Authorization)\s*[:=]\s*(?:Bearer\s+)?)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/((?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|passwd|wifi[_-]?pass|secret|ssid)\s*[:=]\s*["']?)[^\s,"';}]+/gi, "$1[REDACTED]")
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/-]{10,}/gi, "$1[REDACTED]")
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, "$1[REDACTED]@")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[IP]")
    .replace(/\b(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\b/gi, "[MAC]");
}
export function classifyLog(log) {
  const patterns = [
    ["CRASH", /Guru Meditation Error|panic'ed|assert failed|abort\(\) was called/i, "Phát hiện crash/panic; kiểm tra stacktrace và backtrace."],
    ["BOOT_LOOP", /rst:0x|ESP-ROM:/i, "Có thông tin khởi động/reset; nếu lặp lại liên tục có thể là bootloop."],
    ["PSRAM", /PSRAM.*(?:fail|error|not found)|spiram.*(?:fail|error)/i, "Có dấu hiệu lỗi PSRAM hoặc cấu hình bộ nhớ."],
    ["DISPLAY_SPI", /(?:spi|lcd|panel|st7789).*(?:error|fail)|(?:error|fail).*(?:spi|lcd|panel)/i, "Có dấu hiệu lỗi SPI/LCD."],
    ["TOUCH", /TOUCH_READY|TOUCH_SAMPLE|TOUCH_5PT/i, "Có tín hiệu cảm ứng XPT2046-compatible; xem tọa độ và kiểm tra 5 điểm trong Hướng dẫn kết nối."],
    ["TOUCH_ERROR", /TOUCH_(?:INIT|IO|INDEV)_FAILED/i, "Không khởi tạo được cảm ứng: kiểm tra dây, GPIO, nguồn và driver."],
    ["AUDIO_I2S", /(?:i2s|audio).*(?:error|fail)|(?:error|fail).*(?:i2s|audio)/i, "Có dấu hiệu lỗi audio/I²S."],
    ["WIFI", /wifi.*(?:disconnect|fail|error)|(?:disconnect|fail).*wifi/i, "Có dấu hiệu kết nối Wi-Fi không ổn định."]
  ];
  return patterns.filter(p => p[1].test(log)).map(p => ({code:p[0], message:p[2]}));
}

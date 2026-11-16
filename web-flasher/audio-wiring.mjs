// Wiring matches the current ModESP32 config.h for both ESP32-S3 DIY display profiles.
// Module power, electrical limits and microphone channel strap require exact datasheets.
export const AUDIO_WIRES = Object.freeze({
  microphone: [
    ["SCK / BCLK", "GPIO4", "Clock I²S do ESP32 phát"],
    ["WS / LRCLK", "GPIO5", "Word select / channel clock"],
    ["SD / DOUT", "GPIO6", "Digital audio từ micro vào ESP32"],
    ["VDD / 3V3", "3V3 nếu module hỗ trợ", "Chỉ dùng điện áp được ghi trong datasheet micro; không mặc định 5V"],
    ["GND", "GND", "Chung mass với ESP32"],
    ["L/R / SEL (nếu có)", "Theo datasheet micro", "Chọn kênh theo model thực tế; không tự nối GND/VCC"]
  ],
  amplifier: [
    ["BCLK", "GPIO15", "Clock I²S"],
    ["LRC / LRCLK / WS", "GPIO16", "Word select"],
    ["DIN", "GPIO17", "Dữ liệu âm thanh từ ESP32 tới MAX98357A"],
    ["VIN / VDD", "Theo datasheet breakout", "Kiểm tra điện áp và dòng cấp; một số breakout nhận 3,3–5V, không áp dụng cho mọi loại"],
    ["GND", "GND", "Chung mass"],
    ["SPK+ / OUT+", "Loa +", "Một đầu loa 4Ω / 3W"],
    ["SPK- / OUT-", "Loa -", "Đầu loa còn lại; tuyệt đối KHÔNG nối xuống GND"],
    ["SD / EN / GAIN (nếu có)", "Theo datasheet breakout", "Chân cấu hình tùy module, không tự đoán điện áp nối"]
  ]
});
export function wireLabel(kind) { return kind === "microphone" ? "Micro I²S" : "MAX98357A + loa"; }
export function wireRows(kind) {
  if (!(kind in AUDIO_WIRES)) throw new Error("Unknown audio module");
  return AUDIO_WIRES[kind];
}

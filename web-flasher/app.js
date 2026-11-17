import {validateMergedImage, parseChecksum, redactSecrets, classifyLog} from "./diagnostics.mjs";
import {setupWiringUI, DISPLAYS} from "./wiring-guide.mjs";
import {setupTouchGuide,fillTouchPointsFromLog} from "./touch-guide.mjs";
const $ = id => document.getElementById(id);
const repo = "YHresearcher/ModESP32";
const MAX_LOG = 300000;
let firmwareUrl = null, manifestUrl = null, selectedFile = null, validated = false;
let port = null, reader = null, reading = false, serialText = "";
let selectionSerial = 0;
let currentDisplay = "st7789v";
let currentProfile = "st7789v";
function selectedProfile(){return currentDisplay === "st7789v" && $("firmwareProfile").value === "touch" ? "st7789v-touch" : currentDisplay;}
function selectedBoard(){return currentProfile === "st7789v-touch" ? "mod-esp32s3-st7789v-touch-28" : DISPLAYS[currentDisplay].board;}
function selectedTagOk(tag){return (currentProfile === "st7789v-touch" ? /^mod-esp32s3-touch-dev-[0-9a-f]{12}$/ : currentProfile === "st7789v" ? /^mod-esp32s3-dev-[0-9a-f]{12}$/ : /^mod-esp32s3-ili9341-dev-[0-9a-f]{12}$/).test(tag);}

function message(text) { $("reportStatus").textContent = text; }
function append(chunk) {
  serialText = (serialText + chunk).slice(-MAX_LOG);
  $("log").textContent = serialText || "[No data]";
  $("log").scrollTop = $("log").scrollHeight;
  fillTouchPointsFromLog(serialText);
  const findings = classifyLog(serialText);
  $("diagnostics").textContent = findings.length ? "Gợi ý: " + findings.map(f => f.code + " – " + f.message).join(" | ") : "Chưa nhận diện được lỗi qua các mẫu log hiện tại.";
}
function resetManifest() {
  if (firmwareUrl) URL.revokeObjectURL(firmwareUrl);
  if (manifestUrl) URL.revokeObjectURL(manifestUrl);
  firmwareUrl = null; manifestUrl = null;
  validated = false;
  $("installer").manifest = "about:blank";
  updateFlashAvailability();
}
function updateFlashAvailability() {
  const ready = validated && $("confirmBoard").checked && $("confirmHardware").checked && "serial" in navigator && window.isSecureContext;
  $("flashButton").disabled = !ready;
  $("flashHelp").textContent = ready
    ? "Firmware đã xác minh. Sẵn sàng mở ESP Web Tools; hãy đóng Serial Monitor trước khi Flash."
    : "Cần firmware đã xác minh, hai ô xác nhận phần cứng, HTTPS và Web Serial để bật Flash.";
}
function hexDigest(buffer) {
  return Array.from(new Uint8Array(buffer), n => n.toString(16).padStart(2,"0")).join("");
}
async function digestSha(bytes) { return hexDigest(await crypto.subtle.digest("SHA-256", bytes)); }
function installLocalManifest(binary, request, label, sha) {
  if (request !== selectionSerial) return;
  firmwareUrl = URL.createObjectURL(new Blob([binary], {type:"application/octet-stream"}));
  const manifest = {
    name: "ModESP32 ESP32-S3 DIY",
    version: label,
    new_install_prompt_erase: false,
    builds: [{chipFamily:"ESP32-S3",improv:false,parts:[{path:firmwareUrl,offset:0}]}]
  };
  manifestUrl = URL.createObjectURL(new Blob([JSON.stringify(manifest)],{type:"application/json"}));
  $("installer").manifest = manifestUrl;
  validated = true;
  $("firmwareHash").textContent = "SHA-256: " + sha;
  updateFlashAvailability();
}
$("compat").textContent = "serial" in navigator && window.isSecureContext
  ? "✓ Web Serial sẵn sàng trên HTTPS. Hãy đóng các ứng dụng đang giữ cổng USB."
  : "⚠ Trình duyệt không có Web Serial hoặc không chạy trên HTTPS; dùng Chrome/Edge desktop.";
for (const id of ["confirmBoard","confirmHardware"]) $(id).addEventListener("change", updateFlashAvailability);

function setSource(mode) {
  ++selectionSerial;
  resetManifest();
  const manual = mode === "manual";
  $("manualFirmware").hidden = !manual;
  $("autoFirmwareStatus").hidden = manual;
  $("refreshFirmware").disabled = manual;
  $("fileStatus").textContent = manual ? "Chọn merged-binary.bin từ máy" : "Đang kiểm tra bản Development mới nhất…";
  $("firmwareHash").textContent = "";
  if (!manual) void loadAutoFirmware();
}
$("firmwareSource").addEventListener("change", e => setSource(e.target.value));
$("refreshFirmware").addEventListener("click", () => {
  if ($("firmwareSource").value !== "auto") return;
  ++selectionSerial;
  resetManifest();
  void loadAutoFirmware();
});
for(const id of ["firmware","checksum"]) $(id).addEventListener("change", () => {
  if ($("firmwareSource").value === "manual") void validateSelectedFile();
});

async function loadAutoFirmware() {
  const request = ++selectionSerial;
  resetManifest();
  $("autoFirmwareStatus").textContent = "Đang đọc firmware Development từ GitHub…";
  $("fileStatus").textContent = "Đang xác minh bản Development…";
  try {
    const response = await fetch("/api/firmware/latest?display="+encodeURIComponent(currentProfile),{cache:"no-store"});
    if (!response.ok) throw Error("API firmware HTTP "+response.status);
    const meta = await response.json();
    if (request !== selectionSerial) return;
    if (!meta.available) throw Error("Chưa có bản Development được xuất bản.");
    if (meta.channel !== "development" || meta.tested !== false ||
        meta.board !== selectedBoard() || meta.chipFamily !== "ESP32-S3" ||
        meta.display !== currentProfile ||
        !selectedTagOk(meta.tag) ||
        !/^[0-9a-f]{64}$/.test(meta.sha256) ||
        !Number.isSafeInteger(meta.size) || meta.size < 1048576 || meta.size > 16777216 ||
        meta.firmwareUrl !== "/api/firmware/binary?tag="+encodeURIComponent(meta.tag)) {
      throw Error("Metadata Development không hợp lệ; không flash.");
    }
    $("autoFirmwareStatus").textContent = "Đã tìm thấy "+(currentProfile === "st7789v-touch" ? "Chibi AI v1.1 Voice Preview · " : "")+meta.tag+" · "+(meta.size/1048576).toFixed(2)+" MiB. Đang tải và xác minh SHA-256…";
    const result = await fetch(meta.firmwareUrl,{cache:"no-store"});
    if (!result.ok) throw Error("Tải firmware thất bại: HTTP "+result.status);
    if (result.redirected && new URL(result.url).origin !== location.origin) throw Error("Firmware bị chuyển tới host khác ngoài Cloudflare.");
    const binary = await result.arrayBuffer();
    if (request !== selectionSerial) return;
    const issues = validateMergedImage(new Uint8Array(binary.slice(0,32)),"merged-binary.bin",binary.byteLength);
    if(issues.length) throw Error(issues.join(" "));
    if (binary.byteLength !== meta.size) throw Error("Kích thước firmware không khớp metadata.");
    const sha = await digestSha(binary);
    if (request !== selectionSerial) return;
    if (sha !== meta.sha256) throw Error("SHA-256 firmware không khớp release; đã chặn Flash.");
    installLocalManifest(binary,request,meta.tag,sha);
    $("autoFirmwareStatus").textContent = "✓ "+(currentProfile === "st7789v-touch" ? "Chibi AI v1.1 Voice Preview" : "Development")+" · build "+meta.tag+" · SHA-256 khớp · Chưa nghiệm thu trên phần cứng thật.";
    $("fileStatus").textContent = "Firmware Development đã sẵn sàng. Không cần tải ZIP thủ công.";
  } catch(e) {
    if(request !== selectionSerial)return;
    resetManifest();
    $("autoFirmwareStatus").textContent = "Chưa có firmware "+DISPLAYS[currentDisplay].label+" hợp lệ: "+(e?.message||String(e))+" · Không thể Flash bản của màn hình khác.";
    $("fileStatus").textContent = "Bạn có thể chuyển sang Thủ công để dùng artifact GitHub Actions.";
  }
}
async function validateSelectedFile() {
  const request=++selectionSerial;
  resetManifest();
  selectedFile=$("firmware").files[0] ?? null;
  $("firmwareHash").textContent="";
  if(!selectedFile){$("fileStatus").textContent="Chưa chọn firmware";return;}
  $("fileStatus").textContent="Đang xác minh file firmware...";
  try {
    const header=new Uint8Array(await selectedFile.slice(0,32).arrayBuffer());
    const issues=validateMergedImage(header,selectedFile.name,selectedFile.size);
    if(issues.length)throw Error(issues.join(" "));
    const binary=await selectedFile.arrayBuffer();
    const sha=await digestSha(binary);
    if(request!==selectionSerial)return;
    const checksum=$("checksum").files[0];
    if(checksum){
      const expected=parseChecksum(await checksum.text());
      if(!expected)throw Error("SHA256SUMS không có digest hợp lệ.");
      if(expected!==sha)throw Error("SHA-256 KHÔNG khớp; đã chặn Flash.");
    }
    if(request!==selectionSerial)return;
    installLocalManifest(binary,request,"manual-development",sha);
    $("fileStatus").textContent=selectedFile.name+" · "+(selectedFile.size/1048576).toFixed(2)+" MiB · "+(checksum?"SHA-256 verified":"chưa đối chiếu với SHA256SUMS");
  }catch(e){
    if(request!==selectionSerial)return;
    resetManifest();
    $("fileStatus").textContent="Không thể flash: "+(e?.message||String(e));
  }
}
setupWiringUI({onDisplayChange(display) {
  $("firmwareProfile").disabled = display !== "st7789v";
  $("firmwareProfile").value = "normal";
  currentProfile = display;
  currentDisplay = display;
  $("confirmBoard").checked = false;
  $("confirmHardware").checked = false;
  if ($("firmwareSource").value === "auto") {
    ++selectionSerial;
    resetManifest();
    void loadAutoFirmware();
  } else {
    ++selectionSerial;
    resetManifest();
    $("fileStatus").textContent = "Đã đổi loại màn hình. Hãy chọn lại .bin đúng "+DISPLAYS[display].board+" và kiểm tra checksum.";
    $("firmware").value = "";
    $("checksum").value = "";
  }
}});

setupTouchGuide();
$("firmwareProfile").addEventListener("change",()=>{
  currentProfile = selectedProfile();
  $("targetBoard").textContent = selectedBoard();
  $("touchProfileNotice").textContent = currentProfile === "st7789v-touch"
    ? "CHIBI AI v1.0 RC: TALK / VOL / SET và XPT2046. Development chưa nghiệm thu phần cứng. Giữ firmware đã chạy ổn để khôi phục."
    : "Chế độ thường dùng firmware ST7789V đã lên hình. Chỉ bật Touch Diagnostic sau khi kiểm tra nguồn và dây.";
  $("confirmBoard").checked = false;
  $("confirmHardware").checked = false;
  ++selectionSerial;
  resetManifest();
  if($("firmwareSource").value==="auto")void loadAutoFirmware();
  else{
    $("firmware").value="";$("checksum").value="";
    $("fileStatus").textContent="Đã đổi chế độ firmware: cần chọn lại .bin chính xác.";
  }
});
$("connect").addEventListener("click", async () => {
  if (!("serial" in navigator) || !window.isSecureContext) return message("Cần Web Serial và HTTPS.");
  if (port) return;
  try {
    port = await navigator.serial.requestPort();
    await port.open({baudRate: Number($("baud").value)});
    $("serialState").textContent = "Đã kết nối";
    $("connect").disabled = true;
    $("disconnect").disabled = false;
    reading = true;
    const decoder = new TextDecoder();
    while (reading && port.readable) {
      reader = port.readable.getReader();
      try {
        while (reading) {
          const {value, done} = await reader.read();
          if (done) break;
          if (value) append(decoder.decode(value, {stream:true}));
        }
      } catch (e) {
        if (reading) append("\n[SERIAL ERROR] " + String(e) + "\n");
      } finally {
        reader.releaseLock();
        reader = null;
      }
      if (!reading) break;
      // Avoid a tight loop when the serial readable stream closes.
      if (!port.readable) break;
    }
  } catch (e) {
    if (e.name !== "NotFoundError") append("\n[CONNECT ERROR] " + String(e) + "\n");
  } finally {
    await closeSerial();
  }
});
async function closeSerial() {
  reading = false;
  try { if (reader) await reader.cancel(); } catch {}
  try { if (port) await port.close(); } catch {}
  port = null;
  $("connect").disabled = false;
  $("disconnect").disabled = true;
  $("serialState").textContent = "Đã ngắt";
}
$("disconnect").addEventListener("click", () => {
  reading = false;
  if (reader) reader.cancel().catch(() => {});
});
$("clear").addEventListener("click", () => {
  serialText = "";
  $("log").textContent = "[ModESP32] Đã xóa log.\n";
  $("diagnostics").textContent = "Chưa có log để phân tích.";
});
$("download").addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([serialText || "[No serial output]\n"], {type:"text/plain;charset=utf-8"}));
  const a = document.createElement("a");
  a.href = url;
  a.download = "modesp32-serial-" + new Date().toISOString().replace(/[:.]/g,"-") + ".txt";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
  message("Đã tải log gốc về máy; file có thể chứa dữ liệu nhạy cảm.");
});
function updateShare() { $("issue").disabled = !$("confirmShare").checked || !$("reportPreview").value.trim(); }
$("confirmShare").addEventListener("change", updateShare);
$("reportPreview").addEventListener("input", () => { $("confirmShare").checked = false; updateShare(); });
$("prepare").addEventListener("click", () => {
  const findings = classifyLog(serialText);
  const summary = findings.length ? findings.map(x => "- " + x.code + ": " + x.message).join("\n") : "- Chưa phát hiện mẫu lỗi rõ ràng";
  $("reportPreview").value = "Device: ESP32-S3 N16R8; LCD: "+DISPLAYS[currentDisplay].label+"; Audio: I2S/ MAX98357A\n\nFindings:\n" + summary + "\n\nSerial excerpt (review manually):\n" + redactSecrets(serialText).slice(-2200);
  $("confirmShare").checked = false;
  updateShare();
  message("Đã tạo bản xem trước. Hãy xóa token, SSID, nội dung riêng tư nếu vẫn còn.");
});
$("copy").addEventListener("click", async () => {
  const val = $("reportPreview").value.trim();
  if (!val) return message("Tạo bản xem trước trước khi copy.");
  try {
    await navigator.clipboard.writeText(val);
    message("Đã copy bản xem trước. Chỉ chia sẻ sau khi đã tự kiểm tra dữ liệu.");
  } catch (e) { message("Không copy được: " + e.message); }
});
$("issue").addEventListener("click", () => {
  if ($("issue").disabled) return;
  const text = $("reportPreview").value.slice(0,2700);
  const url = "https://github.com/" + repo + "/issues/new?title=" +
    encodeURIComponent("[ModESP32 S3] Diagnostic report") + "&body=" + encodeURIComponent(
      "## Symptoms\n(Ghi triệu chứng và cách tái hiện)\n\n## Diagnostics (user reviewed)\n\n" + text +
      "\n\nPlease remove any sensitive device or personal details before publishing.");
  window.open(url, "_blank", "noopener,noreferrer");
  message("Đã mở bản nháp GitHub Issue. Chỉ khi bạn xác nhận Submit trên GitHub mới có dữ liệu được đăng.");
});

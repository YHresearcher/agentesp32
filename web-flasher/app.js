const $ = id => document.getElementById(id);
const repo = "YHresearcher/ModESP32";
let firmwareUrl = null, manifestUrl = null;
let port = null, reader = null, serialText = "", reading = false;
const MAX_LOG = 300000;
const writeStatus = msg => $("reportStatus").textContent = msg;
const append = chunk => {
  serialText = (serialText + chunk).slice(-MAX_LOG);
  $("log").textContent = serialText;
  $("log").scrollTop = $("log").scrollHeight;
};
$("compat").textContent = "serial" in navigator ? "✓ Web Serial khả dụng. Dùng Chrome/Edge và HTTPS." : "⚠ Web Serial chưa khả dụng. Dùng Chrome/Edge trên máy tính, qua HTTPS.";
$("firmware").addEventListener("change", () => {
  const file = $("firmware").files[0];
  if (firmwareUrl) URL.revokeObjectURL(firmwareUrl);
  if (manifestUrl) URL.revokeObjectURL(manifestUrl);
  firmwareUrl = null; manifestUrl = null;
  if (!file) { $("fileStatus").textContent = "Chưa chọn file"; return; }
  if (!/\.bin$/i.test(file.name) || file.size < 65536 || file.size > 32*1024*1024) {
    $("fileStatus").textContent = "File không phù hợp: chỉ chọn .bin (64 KiB–32 MiB).";
    return;
  }
  firmwareUrl = URL.createObjectURL(file);
  const manifest = {
    name: "ModESP32 ESP32-S3 DIY",
    version: "development",
    new_install_prompt_erase: false,
    new_install_improv_wait_time: 0,
    builds: [{chipFamily: "ESP32-S3", parts: [{path: firmwareUrl, offset: 0}]}]
  };
  manifestUrl = URL.createObjectURL(new Blob([JSON.stringify(manifest)], {type:"application/json"}));
  $("installer").setAttribute("manifest", manifestUrl);
  $("fileStatus").textContent = file.name+" · "+(file.size/1048576).toFixed(2)+" MiB — chuẩn bị để flash. Chỉ sử dụng merged-binary.bin đúng board.";
});
$("connect").addEventListener("click", async () => {
  if (!("serial" in navigator)) return writeStatus("Web Serial chưa được hỗ trợ.");
  if (port) return;
  try {
    port = await navigator.serial.requestPort();
    await port.open({baudRate: Number($("baud").value)});
    $("serialState").textContent = "Đang kết nối";
    $("connect").disabled = true; $("disconnect").disabled = false;
    reading = true;
    const decoder = new TextDecoder();
    while (port?.readable && reading) {
      reader = port.readable.getReader();
      try {
        while (reading) {
          const {value, done} = await reader.read();
          if (done) break;
          if (value) append(decoder.decode(value, {stream:true}));
        }
      } catch(e) { if (reading) append("\n[SERIAL ERROR] "+String(e)+"\n"); }
      finally { reader.releaseLock(); reader = null; }
      if (!reading) break;
    }
  } catch(e) {
    if (e.name !== "NotFoundError") append("\n[CONNECT ERROR] "+String(e)+"\n");
  } finally { await closeSerial(); }
});
async function closeSerial() {
  reading = false;
  try { if (reader) await reader.cancel(); } catch {}
  try { if (port) await port.close(); } catch {}
  port = null;
  $("connect").disabled = false; $("disconnect").disabled = true;
  $("serialState").textContent = "Đã ngắt";
}
$("disconnect").addEventListener("click", () => { reading = false; if (reader) reader.cancel().catch(()=>{}); });
$("clear").addEventListener("click", () => { serialText=""; $("log").textContent="[ModESP32] Đã xóa log.\n"; });
function clean(s) {
  return s
    .replace(/(Authorization\s*[:=]\s*(?:Bearer\s+)?)[^\s,;]+/gi,"$1[REDACTED]")
    .replace(/((?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|passwd|wifi[_-]?pass|secret)\s*[:=]\s*["']?)[^\s,"';}]+/gi,"$1[REDACTED]")
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi,"$1[REDACTED]@");
}
$("download").addEventListener("click", () => {
  const blob = new Blob([serialText || "[No serial output]\n"], {type:"text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url;a.download="modesp32-serial-"+new Date().toISOString().replace(/[:.]/g,"-")+".txt";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  writeStatus("Log đã tải về máy. Hãy kiểm tra bí mật trước khi chia sẻ.");
});
$("copy").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(clean(serialText)); writeStatus("Đã copy log đã lọc cơ bản. Vẫn cần kiểm tra thủ công dữ liệu nhạy cảm."); }
  catch(e) { writeStatus("Không copy được: "+e.message); }
});
$("issue").addEventListener("click", () => {
  const log = clean(serialText).slice(-1800);
  const body = "## Hardware\nESP32-S3 N16R8 / ST7789V / I2S mic / MAX98357A\n\n## Symptoms\n(Mô tả vấn đề và cách tái hiện)\n\n## Serial log (redacted, excerpt)\n```text\n"+(log||"(Chưa có log; hãy chụp lại Serial Monitor)")+"\n```\n\n⚠ Kiểm tra và xóa thông tin riêng tư trước khi Submit. Đính kèm log đầy đủ nếu phù hợp.";
  const url = "https://github.com/"+repo+"/issues/new?title="+encodeURIComponent("[ModESP32 S3] Diagnostic report")+"&body="+encodeURIComponent(body);
  window.open(url,"_blank","noopener,noreferrer");
  writeStatus("Đã mở bản nháp GitHub Issue. Chỉ khi bạn bấm Submit new issue, log mới được gửi tới GitHub.");
});

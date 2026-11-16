// Provisional GPIO assignment for custom ModESP32 2.8" SPI builds.
// Never infer power/backlight voltage from GPIO or display controller name.
export const DISPLAYS=Object.freeze({
 st7789v:{label:"ST7789V",board:"mod-esp32s3-st7789v-28"},
 ili9341:{label:"ILI9341",board:"mod-esp32s3-ili9341-28"}
});
export const LCD_WIRES=[
 ["VCC / VIN","Xem datasheet module","Kiểm tra module nhận 3,3V hay 5V; không suy đoán"],
 ["GND","GND","Bắt buộc chung mass"],
 ["SCK / CLK","GPIO12","SPI clock"],
 ["SDA / SDI / MOSI","GPIO11","SPI data ESP32 → LCD"],
 ["SDO / MISO (nếu có)","GPIO8","SPI data LCD → ESP32; có thể bỏ nếu module không có"],
 ["CS","GPIO10","LCD chip select"],
 ["DC / RS / A0","GPIO13","Data / Command"],
 ["RST / RESET","GPIO14","LCD reset"],
 ["LED / BL / BLK","Chưa gán GPIO","Không cấp nguồn hoặc nối GPIO21 khi chưa xác nhận mạch LED"]
];
export function setupWiringUI({onDisplayChange}){
 const select=document.getElementById("displayType");
 const rows=document.getElementById("wiringRows");
 const diagram=document.getElementById("wiringDiagram");
 const tabs=[...document.querySelectorAll(".tabnav .tab")];
 function showTab(name){
  for(const [tab,id] of [["flash","flashTab"],["wiring","wiringTab"],["serial","serialTab"]]){
   document.getElementById(id).hidden=tab!==name;
  }
  for(const btn of tabs){const selected=btn.dataset.tab===name;btn.classList.toggle("active",selected);btn.setAttribute("aria-selected",String(selected));}
 }
 tabs.forEach(btn=>btn.addEventListener("click",()=>showTab(btn.dataset.tab)));
 document.getElementById("goSerial").addEventListener("click",()=>showTab("serial"));
 function update(){
  const profile=DISPLAYS[select.value]||DISPLAYS.st7789v;
  rows.replaceChildren();
  for(const [pin,gpio,note] of LCD_WIRES){
   const tr=document.createElement("tr");
   for(const text of [pin,gpio,note]){const td=document.createElement("td");td.textContent=text;tr.appendChild(td);}
   rows.appendChild(tr);
  }
  diagram.replaceChildren();
  const caption=document.createElement("div");
  caption.className="wiring-heading";
  caption.textContent="ESP32-S3 N16R8    ↔    "+profile.label+" SPI 240×320";
  diagram.appendChild(caption);
  for(const [pin,gpio] of LCD_WIRES.slice(1,8)){
   const line=document.createElement("div");line.className="wiring-line";
   const left=document.createElement("span");left.textContent=gpio;
   const mid=document.createElement("span");mid.className="wiring-connector";mid.textContent="────";
   const right=document.createElement("span");right.textContent=pin;
   line.append(left,mid,right);diagram.appendChild(line);
  }
  document.getElementById("displayNotice").textContent=
   profile.label+" · "+profile.board+" · Pinout SPI dự kiến giống nhau. Chọn loại theo controller thực tế trên module; màn hình tối có thể do backlight chưa được cấp đúng.";
  document.getElementById("targetBoard").textContent=profile.board;
  onDisplayChange(select.value,profile);
 }
 select.addEventListener("change",update);
 showTab("flash");
 update();
 return {showTab};
}

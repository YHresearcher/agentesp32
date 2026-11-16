export const TOUCH_WIRES=Object.freeze([
 ["T_CLK","GPIO12","SPI clock — dùng chung LCD"],
 ["T_DIN","GPIO11","SPI MOSI — dùng chung LCD"],
 ["T_DO","GPIO8","SPI MISO — đường phản hồi cảm ứng"],
 ["T_CS","GPIO9","Chip select riêng; KHÔNG nối với LCD CS"],
 ["T_IRQ","GPIO7","Ngắt / phát hiện chạm, tùy loại module"]
]);
export const TOUCH_POINT_IDS=["touchTL","touchTR","touchC","touchBL","touchBR"];
export function parseXY(s){
 const m=/^\s*(\d{1,5})\s*[,; ]\s*(\d{1,5})\s*$/.exec(String(s||""));
 if(!m)return null;
 const x=Number(m[1]), y=Number(m[2]);
 return x<=4095&&y<=4095?{x,y}:null;
}
export function analyzeFivePoints(values){
 if(values.length!==5||values.some(v=>!v))return {ok:false,text:"Thiếu hoặc sai định dạng: điền đủ 5 tọa độ x,y (0–4095) từ Serial Monitor."};
 const [tl,tr,c,bl,br]=values;
 const ux=((tr.x-tl.x)+(br.x-bl.x))/2;
 const uy=((bl.y-tl.y)+(br.y-tr.y))/2;
 const crossX=((bl.x-tl.x)+(br.x-tr.x))/2;
 const crossY=((tr.y-tl.y)+(br.y-bl.y))/2;
 const xspan=Math.abs(ux)+Math.abs(crossX), yspan=Math.abs(uy)+Math.abs(crossY);
 if(xspan<80||yspan<80)return {ok:false,text:"Tọa độ thay đổi quá ít. Kiểm tra T_DO / T_CS / nguồn touch, rồi đo lại."};
 const swapped=Math.abs(crossX)>Math.abs(ux)&&Math.abs(crossY)>Math.abs(uy);
 const xdir=swapped?crossX:ux, ydir=swapped?crossY:uy;
 const center=(Math.abs(c.x-(tl.x+br.x)/2)+Math.abs(c.y-(tl.y+br.y)/2));
 return {ok:true,swapped,mirrorX:xdir<0,mirrorY:ydir<0,text:
  "Phân tích sơ bộ: "+(swapped?"có khả năng đảo trục XY":"trục XY có vẻ cùng hướng")+
  "; chiều X "+(xdir<0?"ngược":"thuận")+"; chiều Y "+(ydir<0?"ngược":"thuận")+
  "; sai lệch điểm giữa ~"+Math.round(center)+
  ". Đây chỉ là kiểm tra 5 điểm dựa trên tọa độ báo về, chưa phải hiệu chuẩn raw ADC hay xác minh chính xác model controller."};
}

export function extractTouchFivePoints(log){
 const result=[null,null,null,null,null];
 const re=/TOUCH_5PT\s+step=([1-5])\s+label=\S+\s+x=(\d+)\s+y=(\d+)/g;
 for(const m of String(log||"").matchAll(re)){
  const parsed=parseXY(m[2]+","+m[3]);
  if(parsed)result[Number(m[1])-1]=parsed;
 }
 return result;
}

export function setupTouchGuide(){
 const rows=document.getElementById("touchWiringRows");
 const diagram=document.getElementById("touchDiagram");
 for(const [pin,gpio,note] of TOUCH_WIRES){
  const tr=document.createElement("tr");
  for(const v of [pin,gpio,note]){const td=document.createElement("td");td.textContent=v;tr.appendChild(td);}
  rows.appendChild(tr);
  const line=document.createElement("div");line.className="wiring-line";
  const a=document.createElement("span");a.textContent=gpio;
  const sep=document.createElement("span");sep.textContent="────";sep.className="wiring-connector";
  const b=document.createElement("span");b.textContent=pin;
  line.append(a,sep,b);diagram.appendChild(line);
 }
 const getValues=()=>TOUCH_POINT_IDS.map(id=>parseXY(document.getElementById(id).value));
 const analysis=document.getElementById("touchAnalysis");
 document.getElementById("touchAnalyze").addEventListener("click",()=>{analysis.textContent=analyzeFivePoints(getValues()).text;});
 window.__touchFillFromLog=(log)=>{
  const values=extractTouchFivePoints(log);
  for(let i=0;i<5;i++){
   const el=document.getElementById(TOUCH_POINT_IDS[i]);
   if(!el.value && values[i])el.value=values[i].x+","+values[i].y;
  }
 };
 document.getElementById("touchCopy").addEventListener("click",async()=>{
  const result=analyzeFivePoints(getValues());
  const text=["ModESP32 touch diagnostic (unverified controller)",...TOUCH_POINT_IDS.map((id,i)=>id+": "+(document.getElementById(id).value||"N/A")),result.text].join("\n");
  try{await navigator.clipboard.writeText(text);analysis.textContent="Đã copy kết quả. "+result.text;}
  catch{analysis.textContent="Không copy được; hãy chọn và sao chép giá trị thủ công.";}
 });
}

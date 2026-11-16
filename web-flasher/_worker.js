// Cloudflare Worker + static assets for ModESP32 firmware.
// Release metadata is published by trusted GitHub Actions; never expose tokens.
const REPO = "YHresearcher/ModESP32";
const PROFILES = Object.freeze({
  st7789v: {board:"mod-esp32s3-st7789v-28", tag:/^mod-esp32s3-dev-[a-f0-9]{12}$/, file:"latest-development.json"},
  "st7789v-touch": {board:"mod-esp32s3-st7789v-touch-28", tag:/^mod-esp32s3-touch-dev-[a-f0-9]{12}$/, file:"latest-touch-development.json"},
  ili9341: {board:"mod-esp32s3-ili9341-28", tag:/^mod-esp32s3-ili9341-dev-[a-f0-9]{12}$/, file:"latest-ili9341.json"}
});
const RAW_BASE = "https://raw.githubusercontent.com/" + REPO + "/main/web-flasher/";
const MAX_IMAGE_BYTES = 16 * 1024 * 1024;

function responseJson(data, status=200, cache="no-store") {
  return new Response(JSON.stringify(data), {status,headers:{
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":cache,
    "X-Content-Type-Options":"nosniff"
  }});
}
function valid(m,profile) {
  return !!m && m.channel === "development" && m.tested === false &&
    m.board === profile.board && m.chipFamily === "ESP32-S3" &&
    profile.tag.test(m.tag) && /^[a-f0-9]{40}$/.test(m.sourceSha) &&
    m.sourceSha.startsWith(m.tag.slice(-12)) &&
    /^[a-f0-9]{64}$/.test(m.sha256) &&
    Number.isSafeInteger(m.size) && m.size >= 1048576 && m.size <= MAX_IMAGE_BYTES;
}
function releaseBinary(tag) {
  return "https://github.com/" + REPO + "/releases/download/" + tag + "/merged-binary.bin";
}
async function getManifest(fetcher, assets, request, profile) {
  try {
    const remote = await fetcher(RAW_BASE + profile.file, {headers:{"User-Agent":"ModESP32-Firmware-Center"},redirect:"follow"});
    if (remote.ok) {
      const m = await remote.json();
      if(valid(m,profile))return m;
    }
  } catch { /* Use local pinned fallback if GitHub raw is unavailable. */ }
  if(assets?.fetch){
    const local=new URL("/"+profile.file,request.url);
    const res=await assets.fetch(new Request(local.toString()));
    if(res.ok){
      const m=await res.json();
      if(valid(m,profile))return m;
    }
  }
  throw Error("Development manifest could not be loaded or validated.");
}
export async function handleFirmware(request, fetcher=fetch, assets=null) {
  const u=new URL(request.url);
  if(request.method!=="GET")return responseJson({error:"method_not_allowed"},405);
  if(u.pathname==="/api/firmware/latest"){
    try{
      const display=u.searchParams.get("display")||"st7789v";
      const profile=PROFILES[display];
      if(!profile)return responseJson({available:false,error:"unsupported_display"},400);
      const m=await getManifest(fetcher,assets,request,profile);
      return responseJson({
        available:true,channel:m.channel,tested:false,board:m.board,
        chipFamily:m.chipFamily,tag:m.tag,sourceSha:m.sourceSha,
        publishedAt:m.publishedAt??null,size:m.size,sha256:m.sha256,
        releaseUrl:"https://github.com/"+REPO+"/releases/tag/"+m.tag, display,
        firmwareUrl:"/api/firmware/binary?tag="+encodeURIComponent(m.tag)
      },200,"public, max-age=60");
    }catch(e){return responseJson({available:false,error:"manifest_unavailable",detail:String(e?.message||e)},503);}
  }
  if(u.pathname==="/api/firmware/binary"){
    const tag=u.searchParams.get("tag")||"";
    const profile=Object.values(PROFILES).find(p=>p.tag.test(tag));
    if(!profile)return responseJson({error:"invalid_tag"},400);
    try{
      const m=await getManifest(fetcher,assets,request,profile);
      if(m.tag!==tag)return responseJson({error:"unknown_firmware_tag"},404);
      const upstream=await fetcher(releaseBinary(tag),{headers:{"User-Agent":"ModESP32-Firmware-Center","Accept":"application/octet-stream"},redirect:"follow"});
      if(!upstream.ok || !upstream.body)throw Error("Firmware release download HTTP "+upstream.status);
      return new Response(upstream.body,{status:200,headers:{
        "Content-Type":"application/octet-stream","Content-Length":String(m.size),
        "Cache-Control":"public, max-age=86400, immutable",
        "X-Content-Type-Options":"nosniff",
        "Content-Disposition":'attachment; filename="merged-binary.bin"'
      }});
    }catch(e){return responseJson({error:"firmware_download_failed",detail:String(e?.message||e)},502);}
  }
  return responseJson({error:"not_found"},404);
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if(url.pathname.startsWith("/api/firmware/"))return handleFirmware(request,fetch,env?.ASSETS);
    if(env?.ASSETS?.fetch)return env.ASSETS.fetch(request);
    return responseJson({error:"static_assets_not_configured"},503);
  }
};

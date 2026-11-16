// Cloudflare Pages advanced-mode Worker / optional Workers static-assets entry.
// Never expose a GitHub token in the client. Public Development prereleases only.
const REPO = "YHresearcher/ModESP32";
const RELEASE_PREFIX = /^mod-esp32s3-dev-[0-9a-f]{12}$/;
const API = "https://api.github.com/repos/" + REPO;
const UA = {"User-Agent":"ModESP32-Web-Flasher","Accept":"application/vnd.github+json"};
const MAX_IMAGE_BYTES = 16 * 1024 * 1024;

function json(data, status=200, cache="no-store") {
  return new Response(JSON.stringify(data), {
    status, headers: {"Content-Type":"application/json; charset=utf-8",
      "Cache-Control":cache,"X-Content-Type-Options":"nosniff"}
  });
}
async function apiGet(url, fetcher) {
  const res = await fetcher(url,{headers: UA, redirect:"follow"});
  if (!res.ok) throw Error("GitHub API returned " + res.status);
  return res.json();
}
function eligible(release) {
  return release && release.prerelease === true && release.draft === false &&
    RELEASE_PREFIX.test(release.tag_name) &&
    release.assets?.some(a=>a.name==="merged-binary.bin" && a.size >= 1024*1024 && a.size <= MAX_IMAGE_BYTES) &&
    release.assets?.some(a=>a.name==="SHA256SUMS");
}
function asset(r,name) {return r.assets.find(x=>x.name===name);}
function shaFromText(text) {
  const m=text.match(/^([a-f0-9]{64})[ \t]+\*?(?:.*\/)?merged-binary\.bin[ \t]*$/im);
  return m?.[1]?.toLowerCase() ?? null;
}
export async function handleFirmware(request, fetcher=fetch) {
  const url=new URL(request.url);
  if (request.method!=="GET") return json({error:"method_not_allowed"},405);
  if (url.pathname==="/api/firmware/latest") {
    try {
      const releases=await apiGet(API+"/releases?per_page=50",fetcher);
      const candidate=releases.find(eligible);
      if (!candidate) return json({available:false,channel:"development",message:"No published Development firmware yet."},200,"public, max-age=90");
      const checks=await fetcher(asset(candidate,"SHA256SUMS").browser_download_url,{headers:{"User-Agent":"ModESP32-Web-Flasher"},redirect:"follow"});
      if (!checks.ok) throw Error("Cannot retrieve SHA256SUMS: HTTP "+checks.status);
      const hash=shaFromText(await checks.text());
      if (!hash) throw Error("Invalid SHA256SUMS in release "+candidate.tag_name);
      return json({
        available:true,channel:"development",tested:false,tag:candidate.tag_name,
        sourceSha:candidate.target_commitish || candidate.tag_name.replace("mod-esp32s3-dev-",""),
        publishedAt:candidate.published_at || candidate.created_at,
        size:asset(candidate,"merged-binary.bin").size,sha256:hash,
        firmwareUrl:"/api/firmware/binary?tag="+encodeURIComponent(candidate.tag_name),
        releaseUrl:candidate.html_url,
        board:"mod-esp32s3-st7789v-28",chipFamily:"ESP32-S3"
      },200,"public, max-age=90");
    } catch(e) {
      return json({available:false,error:"release_lookup_failed",detail:String(e.message||e)},502);
    }
  }
  if (url.pathname==="/api/firmware/binary") {
    const tag=url.searchParams.get("tag") || "";
    if(!RELEASE_PREFIX.test(tag))return json({error:"invalid_tag"},400);
    try {
      const release=await apiGet(API+"/releases/tags/"+encodeURIComponent(tag),fetcher);
      if(!eligible(release))return json({error:"release_not_eligible"},404);
      const fw=asset(release,"merged-binary.bin");
      const remote=await fetcher(fw.browser_download_url,{redirect:"follow",headers:{"User-Agent":"ModESP32-Web-Flasher"}});
      if(!remote.ok || !remote.body)throw Error("Firmware download failed: "+remote.status);
      return new Response(remote.body,{status:200,headers:{
        "Content-Type":"application/octet-stream",
        "Content-Length":String(fw.size),
        "Cache-Control":"public, max-age=86400, immutable",
        "X-Content-Type-Options":"nosniff",
        "Content-Disposition":"attachment; filename=\"merged-binary.bin\""
      }});
    } catch(e) {return json({error:"firmware_proxy_failed",detail:String(e.message||e)},502);}
  }
  return json({error:"not_found"},404);
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if(url.pathname.startsWith("/api/firmware/")) return handleFirmware(request);
    if(env?.ASSETS?.fetch) return env.ASSETS.fetch(request);
    return json({error:"static_assets_not_configured"},503);
  }
};

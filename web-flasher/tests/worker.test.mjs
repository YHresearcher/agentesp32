import test from "node:test";
import assert from "node:assert/strict";
import {handleFirmware} from "../_worker.js";

const tag="mod-esp32s3-dev-0123456789ab";
const sha="a".repeat(64);
const release={
 tag_name:tag,prerelease:true,draft:false,published_at:"2026-11-16T10:00:00Z",
 target_commitish:"0123456789abcdef",html_url:"https://github.com/YHresearcher/ModESP32/releases/tag/"+tag,
 assets:[
  {name:"merged-binary.bin",size:9000000,browser_download_url:"https://github.test/firmware"},
  {name:"SHA256SUMS",size:100,browser_download_url:"https://github.test/checksum"}
 ]
};
const responder=async url=>{
 if(url.includes("/releases/tags/")) return Response.json(release);
 if(url.includes("/releases?")) return Response.json([release]);
 if(url==="https://github.test/checksum") return new Response(sha+"  merged-binary.bin\n");
 if(url==="https://github.test/firmware") return new Response(new Uint8Array([0xe9,0x01,0x02,0x03]));
 throw Error("unexpected URL "+url);
};
test("returns Development release metadata with bound tag and checksum",async()=>{
 const response=await handleFirmware(new Request("https://device.test/api/firmware/latest"),responder);
 const result=await response.json();
 assert.equal(response.status,200);
 assert.equal(result.tag,tag);
 assert.equal(result.tested,false);
 assert.equal(result.channel,"development");
 assert.equal(result.sha256,sha);
 assert.equal(result.firmwareUrl,"/api/firmware/binary?tag="+tag);
 assert.equal(result.board,"mod-esp32s3-st7789v-28");
});
test("returns unavailable if no development release exists",async()=>{
 const response=await handleFirmware(new Request("https://device.test/api/firmware/latest"),async()=>Response.json([]));
 assert.equal((await response.json()).available,false);
});
test("rejects unapproved release tags without network request",async()=>{
 const response=await handleFirmware(new Request("https://device.test/api/firmware/binary?tag=other-firmware"),async()=>{throw Error("network should not be used")});
 assert.equal(response.status,400);
});
test("streams firmware for eligible immutable release",async()=>{
 const response=await handleFirmware(new Request("https://device.test/api/firmware/binary?tag="+tag),responder);
 assert.equal(response.status,200);
 assert.equal(response.headers.get("content-type"),"application/octet-stream");
 assert.equal(new Uint8Array(await response.arrayBuffer())[0],0xe9);
});
test("disallows POST requests",async()=>{
 const response=await handleFirmware(new Request("https://device.test/api/firmware/latest",{method:"POST"}),responder);
 assert.equal(response.status,405);
});
test("rejects draft and non-development prereleases",async()=>{
 const response=await handleFirmware(new Request("https://device.test/api/firmware/latest"),async()=>Response.json([{...release,draft:true}]));
 assert.equal((await response.json()).available,false);
});

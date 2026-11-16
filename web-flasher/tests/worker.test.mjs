import test from "node:test";
import assert from "node:assert/strict";
import {handleFirmware} from "../_worker.js";
const tag="mod-esp32s3-dev-0123456789ab";
const manifest={channel:"development",tested:false,tag,sourceSha:"0123456789ab"+"0".repeat(28),board:"mod-esp32s3-st7789v-28",chipFamily:"ESP32-S3",size:9000000,sha256:"a".repeat(64),publishedAt:"2026-11-16T09:52:01Z"};
const fetcher=async url=>{
  if(url.includes("latest-development.json"))return Response.json(manifest);
  if(url.includes("/releases/download/"))return new Response(new Uint8Array([0xe9,0x01,0x02]),{status:200});
  throw Error("Unexpected network request "+url);
};
test("returns Development manifest metadata without GitHub API calls",async()=>{
  const r=await handleFirmware(new Request("https://device.test/api/firmware/latest"),fetcher);
  const data=await r.json();
  assert.equal(r.status,200);
  assert.equal(data.available,true);
  assert.equal(data.tested,false);
  assert.equal(data.tag,tag);
  assert.equal(data.sha256,manifest.sha256);
  assert.equal(data.firmwareUrl,"/api/firmware/binary?tag="+tag);
});
test("streams binary for current eligible tag",async()=>{
  const r=await handleFirmware(new Request("https://device.test/api/firmware/binary?tag="+tag),fetcher);
  assert.equal(r.status,200);
  assert.equal(r.headers.get("Content-Type"),"application/octet-stream");
  assert.equal(new Uint8Array(await r.arrayBuffer())[0],0xe9);
});
test("rejects unknown tags and unsupported methods",async()=>{
  let r=await handleFirmware(new Request("https://device.test/api/firmware/binary?tag=forged"),fetcher);
  assert.equal(r.status,400);
  r=await handleFirmware(new Request("https://device.test/api/firmware/binary?tag=mod-esp32s3-dev-ffffffffffff"),fetcher);
  assert.equal(r.status,404);
  r=await handleFirmware(new Request("https://device.test/api/firmware/latest",{method:"POST"}),fetcher);
  assert.equal(r.status,405);
});
test("falls back to bundled manifest if GitHub raw is inaccessible",async()=>{
  const assets={fetch:async()=>Response.json(manifest)};
  const r=await handleFirmware(new Request("https://device.test/api/firmware/latest"),async()=>new Response("Forbidden",{status:403}),assets);
  assert.equal((await r.json()).available,true);
});
test("rejects spoofed manifest and fails closed",async()=>{
  const bad={...manifest,sourceSha:"f".repeat(40)};
  const r=await handleFirmware(new Request("https://device.test/api/firmware/latest"),async()=>Response.json(bad));
  assert.equal(r.status,503);
});

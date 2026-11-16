import test from "node:test";
import assert from "node:assert/strict";
import {validateMergedImage,parseChecksum,redactSecrets,classifyLog,FIRMWARE_MAX_BYTES} from "../diagnostics.mjs";

test("accepts merged ESP image with correct name and size", () => {
  const bytes = new Uint8Array(32); bytes[0] = 0xe9;
  assert.deepEqual(validateMergedImage(bytes, "merged-binary.bin", 9_966_000), []);
});
test("rejects app-only or misnamed binary", () => {
  const bytes = new Uint8Array(32); bytes[0] = 0xe9;
  assert.match(validateMergedImage(bytes, "xiaozhi.bin", 5_000_000).join(","), /merged-binary.bin/);
  bytes[0] = 0;
  assert.match(validateMergedImage(bytes, "merged-binary.bin", 5_000_000).join(","), /magic/);
});
test("rejects image too large for ESP32-S3 N16R8 flash", () => {
  const bytes = new Uint8Array(32); bytes[0] = 0xe9;
  assert.ok(validateMergedImage(bytes, "merged-binary.bin", FIRMWARE_MAX_BYTES+1).length > 0);
});
test("parses SHA256SUMS with and without asterisk and directories", () => {
  const hash="0123456789abcdef".repeat(4);
  assert.equal(parseChecksum(hash+"  build/merged-binary.bin\n"),hash);
  assert.equal(parseChecksum(hash+" *merged-binary.bin\n"),hash);
  assert.equal(parseChecksum(hash+"  wrong.bin\n"),null);
});
test("redacts common secrets, IPs and MACs", () => {
  const text="Authorization: Bearer abc123secret789\nssid=my-network password=mysecret\nip=192.168.1.55 mac=aa:bb:cc:dd:ee:ff\napi_key=foobar123";
  const clean=redactSecrets(text);
  for(const item of ["abc123secret789","my-network","mysecret","192.168.1.55","aa:bb:cc:dd:ee:ff","foobar123"]) assert.equal(clean.includes(item),false);
});
test("classifies crash and I2S errors without treating ordinary log as errors", () => {
  const codes=classifyLog("Guru Meditation Error: panic'ed\nI2S DMA error").map(x=>x.code);
  assert.ok(codes.includes("CRASH"));
  assert.ok(codes.includes("AUDIO_I2S"));
  assert.deepEqual(classifyLog("normal boot\nwifi connected"),[]);
});

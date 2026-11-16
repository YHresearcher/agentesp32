import test from "node:test";
import assert from "node:assert/strict";
import {AUDIO_WIRES, wireRows} from "../audio-wiring.mjs";

function toPinMap(rows){return Object.fromEntries(rows.map(([label,pin])=>[label,pin]));}
test("microphone wiring matches ESP32-S3 firmware config.h",()=>{
 const m=toPinMap(AUDIO_WIRES.microphone);
 assert.equal(m["SCK / BCLK"],"GPIO4");
 assert.equal(m["WS / LRCLK"],"GPIO5");
 assert.equal(m["SD / DOUT"],"GPIO6");
 assert.equal(m["GND"],"GND");
});
test("MAX98357A wiring matches ESP32-S3 firmware config.h",()=>{
 const a=toPinMap(AUDIO_WIRES.amplifier);
 assert.equal(a["BCLK"],"GPIO15");
 assert.equal(a["LRC / LRCLK / WS"],"GPIO16");
 assert.equal(a["DIN"],"GPIO17");
 assert.equal(a["SPK- / OUT-"],"Loa -");
});
test("power and differential amplifier output receive explicit cautions",()=>{
 const all=[...AUDIO_WIRES.microphone,...AUDIO_WIRES.amplifier].map(x=>x.join(" ")).join(" ");
 assert.match(all,/datasheet/);
 assert.match(all,/KHÔNG nối xuống GND/);
 assert.deepEqual(wireRows("microphone"),AUDIO_WIRES.microphone);
 assert.throws(()=>wireRows("unknown"),/Unknown audio module/);
});

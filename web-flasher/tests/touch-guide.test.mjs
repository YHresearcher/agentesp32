import test from "node:test";
import assert from "node:assert/strict";
import {parseXY, analyzeFivePoints, TOUCH_WIRES} from "../touch-guide.mjs";
test("touch pin assignments match the isolated firmware",()=>{
 const map=Object.fromEntries(TOUCH_WIRES.map(([pin,gpio])=>[pin,gpio]));
 assert.equal(map.T_CLK,"GPIO12");
 assert.equal(map.T_DIN,"GPIO11");
 assert.equal(map.T_DO,"GPIO8");
 assert.equal(map.T_CS,"GPIO9");
 assert.equal(map.T_IRQ,"GPIO7");
});
test("parse five point sample validates bounds",()=>{
 assert.deepEqual(parseXY("155, 278"),{x:155,y:278});
 assert.equal(parseXY("invalid"),null);
 assert.equal(parseXY("9999,100"),null);
});
test("five point analysis does not declare success on missing points",()=>{
 assert.equal(analyzeFivePoints([null,null,null,null,null]).ok,false);
});
test("five point analysis reports swap and mirror",()=>{
 const a=analyzeFivePoints([{x:100,y:100},{x:3800,y:100},{x:1950,y:1950},{x:100,y:3800},{x:3800,y:3800}]);
 assert.equal(a.ok,true); assert.equal(a.swapped,false); assert.equal(a.mirrorX,false);
 const b=analyzeFivePoints([{x:3800,y:100},{x:100,y:100},{x:1950,y:1950},{x:3800,y:3800},{x:100,y:3800}]);
 assert.equal(b.ok,true); assert.equal(b.mirrorX,true);
});

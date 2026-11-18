import test from "node:test";
import assert from "node:assert/strict";
import {
  SEEDS,createDefaultItems,readSavedState,normalizeItems,
  getProgress,validateItemDraft,encodeSharedList,decodeSharedList,itemName
} from "../model.mjs";

test("migrates original twelve items and checked progress", () => {
  const storage = { getItem:key => key === "shopping-checklist-v1" ? "[1,4,4,11,99]" : null };
  const state = readSavedState(storage);
  assert.equal(state.items.length,12);
  assert.deepEqual(state.items.filter(i=>i.done).map(i=>i.seed),["diya","matches","matar"]);
  assert.equal(state.language,"hi");
});
test("existing v2 empty list stays empty", () => {
  const storage = {getItem:key=>key==="shopping-checklist-v2" ? '{"items":[],"language":"hinglish"}' : null};
  const state=readSavedState(storage);
  assert.equal(state.items.length,0);
  assert.equal(state.language,"hinglish");
});
test("default names translate across all three choices", () => {
  assert.equal(SEEDS.length,12);
  for(const item of createDefaultItems()) for(const language of ["en","hi","hinglish"])
    assert.ok(itemName(item,language).length>1);
});
test("quantities, input and progress validated",()=>{
  assert.deepEqual(getProgress([]),{total:0,done:0,remaining:0,percent:0});
  assert.deepEqual(getProgress([{done:true},{done:false}]),{total:2,done:1,remaining:1,percent:50});
  assert.equal(validateItemDraft({name:"  Milk  ",quantity:"2",unit:"l",category:"grocery"}).quantity,2);
  assert.throws(()=>validateItemDraft({name:"  ",quantity:1}),/invalid-name/);
  assert.throws(()=>validateItemDraft({name:"Milk",quantity:"-2"}),/invalid-quantity/);
});
test("roundtrip a mixed Hindi and custom shopping list in URL",()=>{
  const items=normalizeItems([
    ...createDefaultItems([0]).slice(0,2),
    {id:"custom",name:"ताज़ा दूध",quantity:2,unit:"l",category:"grocery",done:false}
  ]);
  const imported=decodeSharedList(encodeSharedList(items));
  assert.equal(imported.length,3);
  assert.equal(imported[0].done,true);
  assert.equal(imported[2].name,"ताज़ा दूध");
  assert.equal(imported[2].quantity,2);
});
test("rejects invalid share values and excessive lists",()=>{
  assert.throws(()=>decodeSharedList("bad!!"),/invalid-link/);
  assert.throws(()=>normalizeItems(Array(121).fill({name:"item"})),/too-many-items/);
  assert.throws(()=>normalizeItems([{name:""}]),/invalid-name/);
});

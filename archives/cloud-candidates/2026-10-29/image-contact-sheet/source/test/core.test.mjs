import test from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS, inspectImage, readOrientation, validateSelection, layout, contain, move, filenameIndex, displayName } from '../public/js/core.mjs';
import { png, jpeg, tiff } from './fixtures.mjs';
const defaults = {columns:4,tile:240,gap:16,margin:24,labels:true};
const file = (size = 1, name = 'image.png') => ({size,name});
const throws = (callback, code) => assert.throws(callback,new RegExp(`^Error: ${code}$`));
test('selection exact count / bytes boundaries', () => {
  assert.equal(validateSelection(Array.from({length:30},() => file())),30);
  assert.equal(validateSelection([file(LIMITS.fileBytes)]),8_388_608);
  assert.equal(validateSelection(Array.from({length:8},() => file(LIMITS.fileBytes))),67_108_864);
  throws(() => validateSelection([]),'COUNT'); throws(() => validateSelection(Array.from({length:31},() => file())),'COUNT');
  throws(() => validateSelection([file()],30),'COUNT'); throws(() => validateSelection([file()],0,67_108_864),'TOTAL_SIZE');
});
test('empty, oversize, malformed size and overlong names rejected before reads', () => {
  for (const size of [0,-1,1.5,NaN,Infinity,8_388_609]) throws(() => validateSelection([file(size)]),'FILE_SIZE');
  throws(() => validateSelection([file(1,'x'.repeat(4097))]),'NAME');
});
test('PNG dimensions and format are byte-based', () => {
  assert.deepEqual(inspectImage(png()),{format:'png',rawWidth:4,rawHeight:3,orientation:1,width:4,height:3});
  throws(() => inspectImage(new TextEncoder().encode('<svg onload=alert(1)>')),'FORMAT');
});
test('PNG accepts exact input pixel boundary and rejects over it before decoding', () => {
  assert.equal(inspectImage(png(4000,4000)).width,4000);
  for (const [w,h] of [[4001,4000],[8193,1],[0,1],[1,0],[100000,100000]]) throws(() => inspectImage(png(w,h)),'DIMENSIONS');
});
test('PNG rejects APNG markers even after IDAT in scanning', () => {
  for (const type of ['acTL','fcTL','fdAT']) throws(() => inspectImage(png(4,3,[[type,new Uint8Array(8)]])),'ANIMATION');
});
test('PNG rejects truncated framing, bad initial IHDR, missing IEND, extra bytes', () => {
  const good = png(); throws(() => inspectImage(good.subarray(0,good.length-1)),'FORMAT');
  const broken = good.slice(); broken[12] = 65; throws(() => inspectImage(broken),'FORMAT');
  const long = good.slice(); new DataView(long.buffer).setUint32(8,0xffffffff); throws(() => inspectImage(long),'FORMAT');
  const extra = new Uint8Array(good.length+1); extra.set(good); throws(() => inspectImage(extra),'FORMAT');
});
test('PNG EXIF dimensions account for rotated orientation', () => {
  assert.deepEqual(inspectImage(png(4,3,[['eXIf',tiff(6)]])),{format:'png',rawWidth:4,rawHeight:3,orientation:6,width:3,height:4});
  throws(() => inspectImage(png(4,3,[['eXIf',tiff()],['eXIf',tiff()]])),'FORMAT');
});
test('all EXIF orientations accepted with correct swapped dimensions', () => {
  for (let orientation=1;orientation<=8;orientation++) {
    assert.equal(readOrientation(tiff(orientation)),orientation); assert.equal(readOrientation(tiff(orientation,false)),orientation);
    const meta = inspectImage(jpeg(4,3,orientation)); assert.equal(meta.width,orientation>=5?3:4); assert.equal(meta.height,orientation>=5?4:3);
  }
});
test('invalid EXIF offsets, type, count and range rejected', () => {
  for (const orientation of [0,9]) throws(() => readOrientation(tiff(orientation)),'FORMAT');
  for (const [offset,value] of [[0,1],[2,41],[4,255],[12,4],[14,2]]) { const bytes = tiff(); bytes[offset]=value; throws(() => readOrientation(bytes),'FORMAT'); }
  throws(() => readOrientation(new Uint8Array(7)),'FORMAT');
});
test('JPEG supports baseline and progressive, rejects invalid precision/segments', () => {
  assert.equal(inspectImage(jpeg(8,6,1,0xc2)).format,'jpeg');
  throws(() => inspectImage(jpeg(8,6,1,0xc3)),'FORMAT');
  const bytes = jpeg(); bytes[42] = 12; throws(() => inspectImage(bytes),'FORMAT');
  const truncated = jpeg().subarray(0,30); throws(() => inspectImage(truncated),'FORMAT');
});
test('JPEG huge dimensions fail before native decode', () => {
  throws(() => inspectImage(jpeg(8193,1)),'DIMENSIONS'); throws(() => inspectImage(jpeg(4001,4000)),'DIMENSIONS');
});
test('layout exact hand-calculated 6 image grid', () => {
  const plan = layout(6,defaults);
  assert.equal(plan.width,1056); assert.equal(plan.height,648); assert.equal(plan.labelHeight,52);
  assert.deepEqual(plan.cells,[{number:1,x:24,y:24},{number:2,x:280,y:24},{number:3,x:536,y:24},{number:4,x:792,y:24},{number:5,x:24,y:332},{number:6,x:280,y:332}]);
});
test('short final row keeps same grid width; one-image uses only one column', () => {
  const one=layout(1,defaults); assert.equal(one.width,288); assert.equal(one.height,340);
  assert.equal(layout(5,defaults).width,1056);
});
test('no filename labels still preserves 28px number area', () => {
  const plan=layout(4,{...defaults,labels:false,margin:0,gap:0}); assert.equal(plan.width,960); assert.equal(plan.height,268);
});
test('settings validate integers and enforce computed output size', () => {
  for (const options of [{columns:0},{columns:7},{columns:1.5},{tile:256},{gap:-1},{gap:65},{gap:NaN},{margin:97},{labels:1}]) throws(() => layout(1,{...defaults,...options}),'SETTINGS');
  throws(() => layout(0,defaults),'COUNT'); throws(() => layout(31,defaults),'COUNT');
  throws(() => layout(30,{...defaults,columns:1,tile:320}),'OUTPUT_SIZE');
});
test('all supported valid combinations yield contained nonoverlapping cells', () => {
  for (let count=1;count<=30;count++) for(let columns=1;columns<=6;columns++) for(const tile of [120,180,240,320]) {
    let plan; try { plan=layout(count,{...defaults,columns,tile}); } catch (error) { assert.equal(error.message,'OUTPUT_SIZE'); continue; }
    assert.ok(plan.width*plan.height<=LIMITS.pixels); assert.equal(plan.cells.length,count);
    for(const cell of plan.cells) { assert.ok(cell.x>=0 && cell.y>=0 && cell.x+tile<=plan.width && cell.y+tile+plan.labelHeight<=plan.height); }
    assert.equal(new Set(plan.cells.map(c=>`${c.x},${c.y}`)).size,count);
  }
});
test('contain fits landscape / portrait, never enlarges and rounds half-up', () => {
  assert.deepEqual(contain(800,400,240),{width:240,height:120,x:0,y:60});
  assert.deepEqual(contain(400,800,240),{width:120,height:240,x:60,y:0});
  assert.deepEqual(contain(100,50,240),{width:100,height:50,x:70,y:95});
  assert.deepEqual(contain(1,8192,120),{width:1,height:120,x:59,y:0});
  for(const dimension of [0,-1,NaN,Infinity]) throws(()=>contain(dimension,1,120),'DIMENSIONS');
});
test('reordering preserves all identities without mutating original', () => {
  const list=['A','B','C']; assert.deepEqual(move(list,0,2),['B','C','A']); assert.deepEqual(list,['A','B','C']);
  assert.deepEqual(move(list,2,0),['C','A','B']); assert.deepEqual(move(list,1,1),list);
  throws(()=>move(list,-1,0),'ORDER'); throws(()=>move(list,0,3),'ORDER');
});
test('full filename index is reversible and injection-safe as plain lines', () => {
  const names=['<img src=x onerror=alert(1)>.png','a\nb\tc.png','中文𠮷.png','same.png','same.png'];
  const text=filenameIndex(names.map(name=>({name})),'zh-Hant');
  const lines=text.trimEnd().split('\n'); assert.equal(lines.length,6); assert.match(lines[0],/^照片聯絡表/);
  assert.deepEqual(lines.slice(1).map(line=>JSON.parse(line.split('\t')[1])),names);
  assert.equal(lines[2],'2\t"a\\nb\\tc.png"');
  assert.match(filenameIndex([{name:'x'}]),/^Photo contact sheet/);
});
test('visual name removes controls without treating markup as HTML', () => {
  assert.equal(displayName('a\u202eb\nc'),'a�b�c'); assert.equal(displayName('<b>x</b>'),'<b>x</b>');
});

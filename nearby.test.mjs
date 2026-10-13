import assert from 'node:assert/strict';
import {createNearby} from './public/nearby.js';

// Synthetic callbacks only; no real browser or device location is accessed.
let success, failure, requests=0;
Object.defineProperty(globalThis,'isSecureContext',{value:true,configurable:true});
Object.defineProperty(globalThis,'navigator',{value:{geolocation:{getCurrentPosition(ok,fail,options){requests++;success=ok;failure=fail;assert.equal(options.maximumAge,0);assert.equal(options.enableHighAccuracy,false);}}},configurable:true});
let profileState={paused:false};
const demo=[{id:1,name:'Demo',age:27,place:'上環',intent:'輕鬆約會',img:''}];
const near=createNearby({getPeople:()=>demo,getState:()=>profileState,icon:()=>'',esc:String,refresh:()=>{},modal:()=>{},closeModal:()=>{},toast:()=>{}});
assert.equal(requests,0,'construction never asks for location');
near.handle('confirm-locate');
failure({code:1});assert.match(near.render(),/定位未獲允許/);
near.handle('confirm-locate');failure({code:3});assert.match(near.render(),/定位逾時/);
near.handle('confirm-locate');success({coords:{latitude:22.283217,longitude:114.156912,accuracy:25}});
assert.match(near.render(),/你目前的大致位置/);assert.doesNotMatch(near.render(),/22.283217|114.156912/);
near.handle('confirm-locate');const stale=success;near.handle('clear');stale({coords:{latitude:40,longitude:70,accuracy:20}});
assert.match(near.render(),/中環地區中心/);assert.doesNotMatch(near.render(),/你目前的大致位置/);
near.handle('confirm-locate');success({coords:{latitude:40.71,longitude:-74,accuracy:20}});assert.match(near.render(),/這個範圍內暫無對象/);
near.handle('confirm-locate');success({coords:{latitude:NaN,longitude:114,accuracy:20}});assert.match(near.render(),/未取得有效位置/);
near.reset();profileState.paused=true;assert.match(near.render(),/已暫停發現/);
Object.defineProperty(globalThis,'isSecureContext',{value:false,configurable:true});near.handle('confirm-locate');assert.match(near.render(),/暫不支援定位/);
console.log('Nearby location lifecycle checks passed (synthetic positions only)');

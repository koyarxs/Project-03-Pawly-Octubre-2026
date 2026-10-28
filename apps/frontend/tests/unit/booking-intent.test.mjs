import {test} from "node:test";
import assert from "node:assert/strict";
import {registerHooks} from "node:module";
registerHooks({resolve(specifier,context,next){
  if(specifier==="./appointment-time"&&context.parentURL?.endsWith("/booking-intent.ts"))return next("./appointment-time.ts",context);
  return next(specifier,context);
}});
const {bookingIntentHref,readBookingIntent}=await import("../../src/lib/booking-intent.ts");
const catalog={available:true,clinic:{slug:"porvenir",timezone:"America/Santiago"},services:[{id:"service",professionalIds:["doctor"]}],professionals:[{id:"doctor"}]};
const slot={startsAt:"2026-10-28T13:00:00.000Z",endsAt:"2026-10-28T13:30:00.000Z",professionalId:"doctor"};
const now=Date.parse("2026-10-27T12:00:00Z");
test("a landing selection keeps the service, doctor and local date across the booking link",()=>{
  const url=new URL(bookingIntentHref("porvenir", "service",slot,"America/Santiago"),"https://example.invalid");
  assert.equal(url.pathname,"/reservar/porvenir");
  assert.deepEqual(readBookingIntent(url.search,catalog,now),{serviceId:"service",professionalId:"doctor",date:"2026-10-28",startsAt:slot.startsAt});
});
test("foreign services, mismatched professionals and manipulated dates are ignored",()=>{
  const url=new URL(bookingIntentHref("porvenir","service",slot,"America/Santiago"),"https://example.invalid");
  for(const [key,value] of [["service","foreign"],["professional","foreign"],["date","2026-10-29"],["startsAt","invalid"],["startsAt","2026-10-28T10:00:00-03:00"]]){
    const query=new URLSearchParams(url.search);query.set(key,value);
    assert.equal(readBookingIntent(query.toString(),catalog,now),null);
  }
});
test("past times and a closed catalog cannot preselect appointments",()=>{
  const url=new URL(bookingIntentHref("porvenir","service",slot,"America/Santiago"),"https://example.invalid");
  assert.equal(readBookingIntent(url.search,catalog,Date.parse(slot.startsAt)),null);
  assert.equal(readBookingIntent(url.search,{...catalog,available:false},now),null);
});

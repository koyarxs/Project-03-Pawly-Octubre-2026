import {expect,test} from "@playwright/test";
import {mockPublicWebsite,publicWebsiteFixture} from "./support/website-fixtures";

test("visit section is a static illustration with one booking action and room around the pets",async({page},info)=>{
  await mockPublicWebsite(page);
  const bookingRequests:string[]=[];
  await page.route("**/api/bookings/**",route=>{bookingRequests.push(route.request().url());return route.abort();});
  await page.goto("/");
  await expect(page.getByRole("heading",{name:publicWebsiteFixture.aboutTitle,exact:true})).toBeVisible();
  const section=page.locator("#tu-visita");
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByRole("heading",{name:"Tu próxima visita, paso a paso.",exact:true})).toBeVisible();
  await expect(section.getByText("AGENDA TU VISITA",{exact:true})).toHaveCount(0);
  await expect(section.getByText(/Una atención organizada y sin complicaciones/)).toHaveCount(0);
  await expect(section.getByRole("article")).toHaveCount(3);
  await expect(section.getByRole("button")).toHaveCount(0);
  await expect(section.locator("input,select,textarea")).toHaveCount(0);
  await expect(section.getByRole("link")).toHaveCount(1);
  await expect(section.getByRole("link",{name:"Agenda tu cita",exact:true})).toHaveAttribute("href","/agendar-cita");
  const illustration=section.getByRole("img",{name:"Ilustración de una agenda veterinaria con calendario, horarios y tipos de atención"});
  await expect(illustration).toBeVisible();
  await illustration.click({position:{x:30,y:100}});
  expect(bookingRequests).toHaveLength(0);
  const pets=section.getByRole("img",{name:"Un perro golden retriever junto a un gato"});
  const separation=(a:{x:number;y:number;width:number;height:number},b:{x:number;y:number;width:number;height:number})=>Math.max(a.x-b.x-b.width,b.x-a.x-a.width,a.y-b.y-b.height,b.y-a.y-a.height);
  for(const width of [1920,1440,1280,1024,768,390,320]){
    await page.setViewportSize({width,height:1000});
    const animalBox=await pets.boundingBox();
    const calendarBox=await illustration.locator("..").boundingBox();
    const stepBoxes=await section.getByRole("article").evaluateAll(elements=>elements.map(element=>{const box=element.getBoundingClientRect();return{x:box.x,y:box.y,width:box.width,height:box.height};}));
    expect(animalBox).not.toBeNull();expect(calendarBox).not.toBeNull();
    for(const box of [...stepBoxes,calendarBox!])expect(separation(animalBox!,box)).toBeGreaterThanOrEqual(50);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  }
  expect(bookingRequests).toHaveLength(0);
  await page.setViewportSize(info.project.use.viewport!);
  await section.screenshot({path:info.outputPath("visit-static.png")});
});

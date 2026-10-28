import { expect, test, type Page } from "@playwright/test";
import { mockPublicWebsite, publicWebsiteFixture } from "./support/website-fixtures";

async function openReviews(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading",{name:publicWebsiteFixture.aboutTitle,exact:true})).toBeVisible();
  const section=page.locator("#testimonios");
  await section.scrollIntoViewIfNeeded();
  return section;
}

test("six photographic portraits in two rows with the Google panel on the left",async({page},info)=>{
  await mockPublicWebsite(page,{...publicWebsiteFixture,address:"C. Veinticinco 26, Valparaíso"});
  await page.emulateMedia({reducedMotion:"reduce"});
  const section=await openReviews(page);
  await expect(section.getByRole("article")).toHaveCount(6);
  await expect(section.getByRole("img",{name:/Foto de/})).toHaveCount(6);
  await expect(section.getByRole("img",{name:"Google",exact:true})).toBeVisible();
  expect(await section.locator("img").evaluateAll(images=>images.every(image=>!image.getAttribute("src")?.includes("-story.webp")))).toBe(true);
  await expect(section).not.toContainText("Historias que");
  await expect(section).not.toContainText("Personas, vínculos e historias");
  const write=section.getByRole("link",{name:"Escribir una reseña"});
  await expect(write).toHaveAttribute("target","_blank");
  expect(new URL((await write.getAttribute("href"))!).searchParams.get("query")).toBe("C. Veinticinco 26, Valparaíso");
  const carousel=section.getByRole("region",{name:"Opiniones de las familias"});
  await page.setViewportSize({width:1440,height:1000});
  const positions=await section.getByRole("article").evaluateAll(elements=>elements.map(element=>({x:element.getBoundingClientRect().x,y:element.getBoundingClientRect().y})));
  expect(new Set(positions.slice(0,3).map(point=>point.y)).size).toBe(1);
  expect(new Set(positions.slice(3).map(point=>point.y)).size).toBe(1);
  expect(positions[3].y).toBeGreaterThan(positions[0].y);
  const panel=await section.getByRole("complementary").boundingBox();
  expect(panel!.x).toBeLessThan(positions[0].x);
  expect(Math.abs(panel!.y-positions[0].y)).toBeLessThan(1);
  const firstCard=await section.getByRole("article").first().boundingBox();
  const writeBox=await write.boundingBox();
  expect(writeBox!.y+writeBox!.height).toBeLessThanOrEqual(firstCard!.y+firstCard!.height+1);
  await page.setViewportSize({width:390,height:1000});
  await carousel.focus();await page.keyboard.press("End");
  await expect(section.getByRole("button",{name:/Ver grupo/}).last()).toHaveAttribute("aria-pressed","true");
  await section.getByRole("button",{name:"Opiniones siguientes"}).click();
  await expect(section.getByRole("button",{name:"Ver grupo 1",exact:true})).toHaveAttribute("aria-pressed","true");
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:1000});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    const box=await carousel.boundingBox();
    const cards=await section.getByRole("article").evaluateAll(elements=>elements.map(element=>element.getBoundingClientRect().width));
    expect(Math.max(...cards)-Math.min(...cards)).toBeLessThan(1);
    expect(cards[0]).toBeLessThanOrEqual(box!.width+1);
  }
  await page.setViewportSize(info.project.use.viewport!);
  await section.screenshot({path:info.outputPath("testimonials-simple.png")});
});

test("Google reviews keep authors, real circular avatars, low ratings and the write link",async({page})=>{
  await mockPublicWebsite(page);
  await page.route("https://lh3.googleusercontent.com/qa-avatar",route=>route.fulfill({contentType:"image/svg+xml",body:'<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><rect width="44" height="44" fill="#d5ded3"/></svg>'}));
  await page.route("**/api/google-reviews",route=>route.fulfill({json:{status:"ready",placeName:"Clínica QA",rating:3.5,total:18,mapsUrl:"https://www.google.com/maps?cid=123",writeReviewUrl:"https://www.google.com/maps/place/qa/review",reviews:[
    {author:"Autora QA",authorUrl:"https://www.google.com/maps/contrib/123",photoUrl:"https://lh3.googleusercontent.com/qa-avatar",reviewUrl:"https://www.google.com/maps/reviews/123",quote:'<img src=x onerror="window.__reviewInjected=true">',rating:2,date:"Hace una semana",translated:false},
    {author:"Otro autor QA",quote:"Comentario de Google",rating:5,date:"Hace un mes",translated:true},
  ]}}));
  const section=await openReviews(page);
  await expect(section.getByRole("article")).toHaveCount(2);
  await expect(section.getByRole("img",{name:"Foto de Autora QA"})).toBeVisible();
  await expect(section.getByRole("img",{name:"2 de 5 estrellas",exact:true})).toBeVisible();
  await expect(section.getByRole("link",{name:"Autora QA",exact:true})).toHaveAttribute("href","https://www.google.com/maps/contrib/123");
  await expect(section.getByRole("link",{name:"Escribir una reseña"})).toHaveAttribute("href","https://www.google.com/maps/place/qa/review");
  await expect(section).not.toContainText("Catalina F.");
  await expect(section).toContainText('onerror="window.__reviewInjected=true"');
  expect(await page.evaluate(()=>Reflect.get(window,"__reviewInjected"))).toBeUndefined();
});

test("an empty Google listing stays empty",async({page})=>{
  await mockPublicWebsite(page);
  await page.route("**/api/google-reviews",route=>route.fulfill({json:{status:"ready",reviews:[]}}));
  const section=await openReviews(page);
  await expect(section).toContainText("Aún no hay reseñas disponibles");
  await expect(section.getByRole("article")).toHaveCount(0);
});

test("provider failure preserves published testimonials without inventing ratings",async({page})=>{
  await mockPublicWebsite(page,{...publicWebsiteFixture,testimonials:[{author:"Testimonio publicado QA",companion:"Familia QA",quote:"Comentario publicado por la clínica."}]});
  await page.route("**/api/google-reviews",route=>route.fulfill({status:503,json:{status:"unavailable",reviews:[]}}));
  const section=await openReviews(page);
  await expect(section.getByRole("status")).toContainText("no están disponibles");
  await expect(section.getByRole("article")).toHaveCount(1);
  await expect(section.getByRole("img",{name:/estrellas/})).toHaveCount(0);
});

test("hero text and logo use the same left margin at every width",async({page})=>{
  await mockPublicWebsite(page);
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/");
  for(const width of [1920,1440,1280,1024,768,591,390,320]){
    await page.setViewportSize({width,height:1000});
    const logo=await page.locator("header a[aria-label$=', inicio']").boundingBox();
    const heading=await page.locator("figure:not([hidden]) [data-tone] h2").boundingBox();
    expect(logo).not.toBeNull();expect(heading).not.toBeNull();
    expect(Math.abs(logo!.x-heading!.x)).toBeLessThan(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  }
});

import { expect, test, type Page } from "@playwright/test";
import {
  mockPublicWebsite,
  publicWebsiteFixture,
} from "./support/website-fixtures";

function careCarousel(page: Page) {
  return page.getByRole("region", {
    name: "Carrusel de cuidado veterinario",
    exact: true,
  });
}

async function openLanding(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    publicWebsiteFixture.heroTitle,
  );
  const carousel = careCarousel(page);
  await carousel.scrollIntoViewIfNeeded();
  await expect(carousel).toBeVisible();
  return carousel;
}

async function showPhotograph(page: Page, number: number) {
  await expect(
    careCarousel(page).getByRole("group", {
      name: `${number} de 3`,
      exact: true,
    }),
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await mockPublicWebsite(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
});

test("el carrusel carga fotografías locales con texto alternativo y reserva la precarga para la portada", async ({
  page,
  isMobile,
}) => {
  const carousel = await openLanding(page);
  await expect(carousel.locator("figure")).toHaveCount(3);
  await expect(carousel.getByRole("img")).toHaveCount(1);
  const firstImage = carousel.locator("figure").first().locator("img");
  await expect(firstImage).toHaveAttribute("alt", /perro mestizo.*gato/);
  await expect(firstImage).not.toHaveAttribute("loading", "lazy");
  await expect.poll(() => firstImage.evaluate((image) => (image as HTMLImageElement).currentSrc)).toContain(isMobile ? "companions-mobile" : "companions-desktop");
  await expect(
    carousel.locator("figure").nth(1).locator("img"),
  ).toHaveAttribute("loading", "lazy");
  await expect(
    carousel.locator("figure").nth(2).locator("img"),
  ).toHaveAttribute("loading", "lazy");
  await expect(page.locator('link[rel="preload"][as="image"]')).not.toHaveCount(
    0,
  );
  for (let number = 1; number <= 3; number += 1) {
    await carousel.focus();
    await page.keyboard.press("Home");
    for (let step = 1; step < number; step++) await page.keyboard.press("ArrowRight");
    await showPhotograph(page, number);
    const image = carousel.getByRole("img");
    await expect(image).toHaveAttribute("alt", /.+/);
    await expect
      .poll(() =>
        image.evaluate((element) => {
          const photo = element as HTMLImageElement;
          return photo.complete && photo.naturalWidth > 0;
        }),
      )
      .toBe(true);
    expect(await image.getAttribute("src")).toMatch(
      /^\/_next\/image\?url=%2Fimages%2F/,
    );
  }
  for (const button of await carousel.getByRole("button").all()) {
    const size = await button.boundingBox();
    expect(size?.width).toBeGreaterThanOrEqual(44);
    expect(size?.height).toBeGreaterThanOrEqual(44);
  }
});

test("la reproducción automática cambia banners con textos integrados y permite pausar", async ({
  page,
}) => {
  const carousel = await openLanding(page);
  await expect(
    carousel.getByRole("button", {
      name: "Pausar presentación automática",
      exact: true,
    }),
  ).toBeEnabled();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(6100);
  await showPhotograph(page, 2);
  await expect(carousel.getByRole("img")).toHaveAttribute("alt", /conejo.*cobayo.*Grandes vínculos/);
  await expect(page.locator('#inicio [class*="heroCopy"]')).toHaveCount(0);
  await expect(carousel.getByRole("status")).toBeEmpty();
  await carousel.hover();
  await page.clock.fastForward(6100);
  await showPhotograph(page, 3);
  await expect(carousel.getByRole("img")).toHaveAttribute("alt", /ninfa.*periquito.*Cada vida tiene su encanto/);
  await page.mouse.move(0, 0);
  await page.clock.fastForward(6100);
  await showPhotograph(page, 1);
  await expect(carousel.getByRole("img")).toHaveAttribute("alt", /Cuidarlos es quererlos/);
  await carousel
    .getByRole("button", {
      name: "Pausar presentación automática",
      exact: true,
    })
    .click();
  await page.mouse.move(0, 0);
  await expect(
    carousel.getByRole("button", {
      name: "Reanudar presentación automática",
      exact: true,
    }),
  ).toBeVisible();
  await page.clock.fastForward(18000);
  await showPhotograph(page, 1);
  await carousel
    .getByRole("button", {
      name: "Reanudar presentación automática",
      exact: true,
    })
    .click();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(6100);
  await showPhotograph(page, 2);
});

test("los controles manuales y el foco detienen la reproducción hasta reanudar y las flechas solo actúan dentro", async ({
  page,
}) => {
  const carousel = await openLanding(page);
  await carousel.focus();
  await page.keyboard.press("ArrowLeft");
  await showPhotograph(page, 3);
  await page.keyboard.press("ArrowRight");
  await showPhotograph(page, 1);
  await page.keyboard.press("ArrowRight");
  await showPhotograph(page, 2);
  await expect(carousel.getByRole("status")).toContainText("2 de 3.");
  await carousel.focus();
  await page.keyboard.press("ArrowRight");
  await showPhotograph(page, 3);
  await page.keyboard.press("ArrowRight");
  await showPhotograph(page, 1);
  await page.keyboard.press("ArrowLeft");
  await showPhotograph(page, 3);
  await page.keyboard.press("Home");
  await showPhotograph(page, 1);
  await page.keyboard.press("End");
  await showPhotograph(page, 3);
  await page.getByRole("heading", { level: 1 }).evaluate((element) => {
    element.setAttribute("tabindex", "-1");
    (element as HTMLElement).focus();
  });
  await page.keyboard.press("ArrowRight");
  await page.mouse.move(0, 0);
  await page.clock.fastForward(18000);
  await showPhotograph(page, 3);
  await carousel
    .getByRole("button", {
      name: "Reanudar presentación automática",
      exact: true,
    })
    .click();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(6100);
  await showPhotograph(page, 1);
});

test("el carrusel pausa cuando la pestaña está oculta o el componente queda fuera de pantalla", async ({
  page,
}) => {
  const carousel = await openLanding(page);
  await expect(
    carousel.getByRole("button", {
      name: "Pausar presentación automática",
      exact: true,
    }),
  ).toBeEnabled();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(18000);
  await showPhotograph(page, 1);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(6100);
  await showPhotograph(page, 2);
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(carousel).not.toBeInViewport({ ratio: 0.15 });
  await page.clock.fastForward(18000);
  await showPhotograph(page, 2);
  await carousel.scrollIntoViewIfNeeded();
  await expect(carousel).toBeInViewport({ ratio: 0.15 });
  await page.clock.fastForward(6100);
  await showPhotograph(page, 3);
});

test("movimiento reducido mantiene la navegación manual y desactiva reproducción y transiciones", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const carousel = await openLanding(page);
  await expect(
    carousel.getByRole("button", {
      name: "Reproducción automática desactivada por movimiento reducido",
      exact: true,
    }),
  ).toBeDisabled();
  await page.clock.fastForward(30000);
  await showPhotograph(page, 1);
  await carousel.focus();
  await page.keyboard.press("ArrowRight");
  await showPhotograph(page, 2);
  await carousel.focus();
  await page.keyboard.press("ArrowRight");
  await showPhotograph(page, 3);
  const motion = await carousel
    .locator("figure")
    .nth(2)
    .evaluate((element) => getComputedStyle(element).animationName);
  expect(motion).toBe("none");
});

test("los gestos horizontales cambian la fotografía y el gesto vertical permanece libre", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "El gesto táctil se comprueba en el proyecto móvil.");
  const carousel = await openLanding(page);
  const first = carousel.locator("figure").first();
  const touchAction = await first.evaluate(
    (element) => getComputedStyle(element.parentElement!).touchAction,
  );
  expect(touchAction).toContain("pan-y");
  expect(touchAction).toContain("pinch-zoom");
  async function swipe(x: number, y: number) {
    return carousel.locator("figure:visible").evaluate(
      (element, delta) => {
        const touch = (clientX: number, clientY: number) =>
          new Touch({ identifier: 1, target: element, clientX, clientY });
        const start = new TouchEvent("touchstart", {
          bubbles: true,
          cancelable: true,
          touches: [touch(200, 150)],
        });
        const end = new TouchEvent("touchend", {
          bubbles: true,
          cancelable: true,
          changedTouches: [touch(200 + delta.x, 150 + delta.y)],
        });
        element.dispatchEvent(start);
        element.dispatchEvent(end);
        return {
          startPrevented: start.defaultPrevented,
          endPrevented: end.defaultPrevented,
        };
      },
      { x, y },
    );
  }
  expect(await swipe(-110, 4)).toEqual({
    startPrevented: false,
    endPrevented: false,
  });
  await showPhotograph(page, 2);
  expect(await swipe(8, 120)).toEqual({
    startPrevented: false,
    endPrevented: false,
  });
  await showPhotograph(page, 2);
  expect(await swipe(110, 4)).toEqual({
    startPrevented: false,
    endPrevented: false,
  });
  await showPhotograph(page, 1);
  await page.clock.fastForward(18000);
  await showPhotograph(page, 1);
});

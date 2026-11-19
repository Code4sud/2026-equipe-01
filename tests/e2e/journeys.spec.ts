import { expect, test, type Page } from '@playwright/test';

const STORAGE_KEY = 'polaria-demo-v1';

async function readState(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').state, STORAGE_KEY);
}

async function firstReelId(page: Page): Promise<string> {
  const id = await page.getByTestId('feed').locator('.reel').first().getAttribute('data-testid');
  return id!.replace('reel-', '');
}

async function loginYouth(page: Page, id: 'lucas' | 'emma' | 'yanis') {
  await page.goto('./');
  await page.getByTestId('cta-youth').click();
  await page.getByTestId(`pick-${id}`).click();
  await expect(page.getByTestId('feed')).toBeVisible();
}

test.describe('Socle et sécurité', () => {
  test('index.html : bandeau Code4Sud et CSP présents, aucune violation CSP', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (msg) => {
      if (/Content Security Policy/i.test(msg.text())) violations.push(msg.text());
    });
    await page.goto('./');
    await expect(page.locator('script[src="https://orientation.code4sud.fr/bandeau.js"][data-equipe="01"]')).toHaveCount(1);
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('PolarIA');
    await page.getByTestId('cta-youth').click();
    await page.getByTestId('pick-lucas').click();
    await expect(page.getByTestId('feed')).toBeVisible();
    expect(violations).toEqual([]);
  });

  const screens: Array<[string, (page: Page) => Promise<void>]> = [
    ['landing', async (page) => void (await page.goto('./'))],
    ['app jeune', (page) => loginYouth(page, 'lucas')],
    ['bilan', async (page) => {
      await loginYouth(page, 'emma');
      await page.getByTestId('tab-bilan').click();
      await page.getByTestId('generate-report').click();
    }],
    ['fiche détail', async (page) => {
      await loginYouth(page, 'lucas');
      await page.getByTestId('open-acteur').click();
    }],
    ['pro + panneau', async (page) => {
      await page.goto('./');
      await page.getByTestId('cta-pro').click();
      await page.getByTestId('manage-emma').click();
    }],
  ];
  for (const [name, open] of screens) {
    test(`pas de défilement horizontal : ${name}`, async ({ page }) => {
      await open(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test('un localStorage falsifié ne casse pas l’app et n’injecte rien', async ({ page }) => {
    await page.goto('./');
    await page.evaluate((key) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          state: {
            session: 'jeune',
            currentYouthId: 'lucas',
            profiles: { lucas: { tagScores: { '<img src=x onerror="window.__xss=1">': 99 } } },
          },
        }),
      );
    }, STORAGE_KEY);
    await page.goto('./#/app');
    await page.reload();
    await expect(page.getByTestId('feed')).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
  });
});

test.describe('Parcours jeune', () => {
  test('étoile : toast, étoile rose et +5 sur les tags', async ({ page }) => {
    await loginYouth(page, 'lucas');
    const star = page.getByTestId('star-technicien-son');
    await star.click();
    await expect(page.getByTestId('toast')).toContainText('+5 pts #Son & Média');
    await expect(star).toHaveAttribute('aria-pressed', 'true');
    const state = await readState(page);
    expect(state.profiles.lucas.tagScores['Son & Média']).toBe(17);
  });

  test('watch time : +2 après 3 secondes sur une vidéo', async ({ page }) => {
    await page.clock.install();
    await loginYouth(page, 'lucas');
    const first = await firstReelId(page);
    await page.clock.runFor(3500);
    await expect
      .poll(async () => (await readState(page)).profiles.lucas.watchedVideoIds)
      .toContain(first);
  });

  test('scroll vertical avec snap', async ({ page }) => {
    await loginYouth(page, 'lucas');
    const feed = page.getByTestId('feed');
    await expect(feed).toHaveCSS('scroll-snap-type', 'y mandatory');
    await feed.evaluate((el) => el.scrollBy({ top: el.clientHeight }));
    await expect.poll(() => feed.evaluate((el) => Math.round(el.scrollTop / el.clientHeight))).toBe(1);
  });

  test('swipe horizontal vers la fiche détail puis retour', async ({ page }) => {
    await loginYouth(page, 'lucas');
    const first = await firstReelId(page);
    const card = page.getByTestId(`reel-${first}`).locator('.reel__content');
    const box = (await card.boundingBox())!;
    const y = box.y + box.height * 0.5;
    await page.mouse.move(box.x + box.width * 0.7, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, y, { steps: 12 });
    await page.mouse.up();
    await expect(page).toHaveURL(new RegExp(`#/app/details/${first}$`));
    await expect(page.getByTestId('details')).toContainText('C’est quoi au quotidien ?');
    await page.getByTestId('back-to-feed').click();
    await expect(page.getByTestId('feed')).toBeVisible();
  });

  test('bouton flèche vers la fiche détail', async ({ page }) => {
    await loginYouth(page, 'emma');
    await page.getByTestId('open-agent-voyages').click();
    await expect(page).toHaveURL(/details\/agent-voyages/);
  });

  test('débrief « Générer mon avenir » puis rapport parents', async ({ page }) => {
    await loginYouth(page, 'yanis');
    await page.getByTestId('open-debrief').click();
    await expect(page.getByTestId('debrief-line')).toContainText('Salut Yanis');
    await page.getByTestId('close-debrief').click();
    await page.getByTestId('tab-bilan').click();
    await expect(page.getByTestId('radar')).toBeVisible();
    await page.getByTestId('generate-report').click();
    await expect(page.getByTestId('parent-report')).toContainText('non une évaluation définitive');
  });
});

test.describe('Parcours pro', () => {
  test('RGPD : aucune zone de texte, badge visible', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('cta-pro').click();
    await page.getByTestId('manage-lucas').click();
    await expect(page.getByTestId('rgpd-badge').first()).toBeVisible();
    await expect(page.locator('textarea, [contenteditable="true"]')).toHaveCount(0);
    await expect(page.getByTestId('youth-panel').locator('input')).toHaveCount(0);
  });

  test('réorientation : le feed du jeune est instantanément réorienté', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('cta-pro').click();
    await page.getByTestId('manage-lucas').click();
    await page.getByTestId('add-tag-select').selectOption('Finance');
    await page.getByTestId('add-tag-btn').click();
    for (let i = 0; i < 6; i++) await page.getByTestId('inc-Finance').click();
    await expect(page.getByTestId('pro-score-Finance')).toHaveText('40');
    await page.getByTestId('open-youth-app').click();
    const firstReel = page.getByTestId('feed').locator('.reel').first();
    await expect(firstReel).toHaveAttribute('data-testid', 'reel-conseiller-financier');
  });

  test('synchronisation en direct entre deux onglets', async ({ page, context }, info) => {
    test.skip(info.project.name !== 'desktop', 'Panneau algo visible uniquement sur desktop');
    await loginYouth(page, 'lucas');
    const pro = await context.newPage();
    await pro.goto('./#/pro');
    await pro.getByTestId('pro-login').click();
    await pro.getByTestId('manage-lucas').click();
    await pro.getByTestId('inc-Son & Média').click();
    await expect(page.getByTestId('algo-panel').getByTestId('tag-score-Son & Média')).toHaveText('17');
  });
});

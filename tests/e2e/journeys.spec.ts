import { expect, test, type Page } from '@playwright/test';

const STORAGE_KEY = 'polaria-demo-v2';

async function readState(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').state, STORAGE_KEY);
}

async function login(page: Page, email: string, password: string) {
  await page.goto('./');
  await page.getByTestId('cta-youth').click();
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
}

async function loginYouth(page: Page, id: 'lucas' | 'ines' | 'noah' | 'chloe' | 'yanis') {
  await login(page, `${id}@polaria.fr`, 'jeune123');
  await expect(page.getByTestId('feed')).toBeVisible();
}

async function loginPro(page: Page) {
  await login(page, 'dr.martin@polaria.fr', 'pro123');
  await expect(page.getByTestId('youth-table')).toBeVisible();
}

// L'IA locale ne télécharge jamais de modèle pendant les tests : le repli instantané est vérifié.
test.beforeEach(async ({ page }) => {
  await page.route(/huggingface\.co|\.hf\.co|raw\.githubusercontent\.com/, (route) => route.abort());
});

async function firstReelId(page: Page): Promise<string> {
  const id = await page.getByTestId('feed').locator('.reel').first().getAttribute('data-testid');
  return id!.replace('reel-', '');
}

test.describe('Socle et sécurité', () => {
  test('bandeau Code4Sud et CSP présents, aucune violation CSP', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (msg) => {
      if (/Content Security Policy/i.test(msg.text())) violations.push(msg.text());
    });
    await page.goto('./');
    await expect(page.locator('script[src="https://orientation.code4sud.fr/bandeau.js"][data-equipe="01"]')).toHaveCount(1);
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('PolarIA');
    await loginYouth(page, 'lucas');
    expect(violations).toEqual([]);
  });

  const screens: Array<[string, (page: Page) => Promise<void>]> = [
    ['landing', async (page) => void (await page.goto('./'))],
    ['connexion', async (page) => {
      await page.goto('./');
      await page.getByTestId('cta-youth').click();
      await page.getByTestId('open-test-accounts').click();
    }],
    ['inscription', async (page) => {
      await page.goto('./');
      await page.getByTestId('cta-youth').click();
      await page.getByTestId('tab-register').click();
    }],
    ['app jeune', (page) => loginYouth(page, 'lucas')],
    ['bilan', async (page) => {
      await loginYouth(page, 'ines');
      await page.getByTestId('tab-bilan').click();
      await page.getByTestId('generate-report').click();
    }],
    ['fiche détail', async (page) => {
      await loginYouth(page, 'noah');
      await page.goto('./#/app/details/technicien-son');
    }],
    ['pro + panneau', async (page) => {
      await loginPro(page);
      await page.getByTestId('manage-lucas').click();
    }],
  ];
  for (const [name, open] of screens) {
    test(`pas de défilement horizontal : ${name}`, async ({ page }) => {
      await open(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test('un localStorage falsifié ne donne ni session ni injection', async ({ page }) => {
    await page.goto('./');
    await page.evaluate((key) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 2,
          state: {
            session: { accountId: 'pirate', role: 'pro' },
            currentYouthId: 'lucas',
            profiles: { lucas: { tagScores: { '<img src=x onerror="window.__xss=1">': 99 } } },
          },
        }),
      );
    }, STORAGE_KEY);
    await page.goto('./#/pro');
    await page.reload();
    await expect(page.getByTestId('auth-modal')).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
  });
});

test('landing : l’étoile du mockup est cliquable et affiche le micro-toast', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('mock-star').click();
  await expect(page.getByTestId('mock-star')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('toast')).toContainText('+5 pts');
});

test.describe('Authentification', () => {
  test('mauvais mot de passe puis compte de test en 1 clic', async ({ page }) => {
    await login(page, 'lucas@polaria.fr', 'faux');
    await expect(page.getByTestId('login-error')).toContainText('incorrect');
    await page.getByTestId('open-test-accounts').click();
    await expect(page.getByTestId('demo-youth').getByRole('button')).toHaveCount(5);
    await page.getByTestId('demo-login-chloe').click();
    await expect(page.getByTestId('feed')).toBeVisible();
    await expect(page.getByTestId('auth-modal')).toHaveCount(0);
  });

  test('modale « Comptes de test » : jeunes et pro côte à côte, pro connecté en 1 clic', async ({ page }, info) => {
    await page.goto('./');
    await page.getByTestId('cta-pro').click();
    await page.getByTestId('open-test-accounts').click();
    const youth = await page.getByTestId('demo-youth').boundingBox();
    const pro = await page.getByTestId('demo-pro').boundingBox();
    if (info.project.name === 'desktop') {
      expect(Math.abs(youth!.y - pro!.y)).toBeLessThan(4); // même ligne
      expect(pro!.x).toBeGreaterThan(youth!.x + youth!.width - 1);
    } else {
      expect(pro!.y).toBeGreaterThan(youth!.y); // empilés sur mobile
    }
    await expect(page.getByTestId('demo-pro')).toContainText('Psychologue du travail');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('test-accounts')).toHaveCount(0);
    await expect(page.getByTestId('auth-modal')).toBeVisible();
    await page.getByTestId('open-test-accounts').click();
    await page.getByTestId('demo-login-dr-martin').click();
    await expect(page.getByTestId('youth-table')).toBeVisible();
  });

  test('inscription : le compte apparaît chez le pro, puis disparaît au rechargement', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('cta-youth').click();
    await page.getByTestId('tab-register').click();
    await page.getByTestId('reg-firstName').fill('Sarah');
    await page.getByTestId('reg-lastName').fill('Benali');
    await page.getByTestId('reg-age').fill('17');
    await page.getByTestId('reg-email').fill('sarah@exemple.fr');
    await page.getByTestId('reg-password').fill('secret1');
    await page.getByTestId('interest-Design & Image').click();
    await page.getByTestId('interest-Tech & Numérique').click();
    await page.getByTestId('register-submit').click();
    await expect(page.getByTestId('feed')).toBeVisible();

    await page.getByTestId('open-profile').click();
    await page.getByTestId('logout').click();
    await page.getByTestId('cta-pro').click();
    await page.getByTestId('login-email').fill('dr.martin@polaria.fr');
    await page.getByTestId('login-password').fill('pro123');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('youth-table').getByText('Sarah')).toBeVisible();
    await expect(page.getByTestId(/^row-/)).toHaveCount(6);

    expect(JSON.stringify(await readState(page))).not.toContain('Sarah');
    await page.reload();
    await expect(page.getByTestId(/^row-/)).toHaveCount(5);
  });
});

test.describe('Parcours jeune', () => {
  test('étoile : toast, étoile rose, +5 et radar qui bouge', async ({ page }) => {
    await loginYouth(page, 'noah');
    const first = await firstReelId(page);
    const star = page.getByTestId(`star-${first}`);
    await star.click();
    await expect(page.getByTestId('toast')).toContainText('+5 pts');
    await expect(star).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('tab-bilan').click();
    const radar = page.getByTestId('bilan').getByTestId('radar');
    const before = await radar.getAttribute('data-values');
    await page.getByTestId('tab-feed').click();
    await page.getByTestId(`star-${first}`).click();
    await page.getByTestId('tab-bilan').click();
    await expect(radar).not.toHaveAttribute('data-values', before!);
  });

  test('watch time : +2 après 3 secondes sur une vidéo', async ({ page }) => {
    await page.clock.install();
    await loginYouth(page, 'lucas');
    const first = await firstReelId(page);
    await page.clock.runFor(3500);
    await expect.poll(async () => (await readState(page)).profiles.lucas.watchedVideoIds).toContain(first);
  });

  test('scroll vertical avec snap', async ({ page }) => {
    await loginYouth(page, 'lucas');
    const feed = page.getByTestId('feed');
    await expect(feed).toHaveCSS('scroll-snap-type', 'y mandatory');
    await feed.evaluate((el) => el.scrollBy({ top: el.clientHeight }));
    await expect.poll(() => feed.evaluate((el) => Math.round(el.scrollTop / el.clientHeight))).toBe(1);
  });

  test('swipe vers la fiche détail, panneau « Pourquoi » puis retour', async ({ page }) => {
    await loginYouth(page, 'noah');
    const first = await firstReelId(page);
    const card = page.getByTestId(`reel-${first}`).locator('.reel__content');
    const box = (await card.boundingBox())!;
    const y = box.y + box.height * 0.5;
    await page.mouse.move(box.x + box.width * 0.7, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, y, { steps: 12 });
    await page.mouse.up();
    await expect(page).toHaveURL(new RegExp(`#/app/details/${first}$`));
    const why = page.getByTestId('why-panel');
    await expect(why).toBeVisible();
    await expect(why.getByTestId('match-percent')).toContainText('%');
    await why.getByTestId('why-star').click();
    await expect(why.getByTestId('why-star')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('back-to-feed').click();
    await expect(page.getByTestId('feed')).toBeVisible();
  });

  test('« Générer mon avenir » : story 4 scènes dans le téléphone, navigation tactile', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (msg) => {
      if (/Content Security Policy/i.test(msg.text())) violations.push(msg.text());
    });
    await loginYouth(page, 'yanis');
    await page.getByTestId('open-debrief').click();
    const story = page.getByTestId('debrief');
    await expect(story.getByTestId('story-subtitle')).toContainText('Imagine-toi', { timeout: 20_000 });
    await expect(story.getByTestId('ai-source')).toHaveAttribute('data-source', 'instant');
    const box = await story.boundingBox();
    const phone = await page.getByTestId('phone').boundingBox();
    expect(box!.width).toBeLessThanOrEqual(phone!.width + 1);
    await story.getByTestId('story-next').click();
    await expect(story.getByText('2/4 ·', { exact: false })).toBeVisible();
    await story.getByTestId('story-prev').click();
    await expect(story.getByText('1/4 ·', { exact: false })).toBeVisible();
    await page.getByTestId('close-debrief').click();
    await expect(story).toHaveCount(0);
    expect(violations).toEqual([]); // le chemin WebLLM (worker, WebAssembly) respecte la CSP
  });

  test('Mon Bilan : analyse parents en 4 blocs, 3 pistes, filtre de zones O*NET', async ({ page }) => {
    await loginYouth(page, 'yanis');
    await page.getByTestId('tab-bilan').click();
    await page.getByTestId('generate-report').click();
    const report = page.getByTestId('parent-report');
    await expect(report).toContainText('non un verdict', { timeout: 20_000 });
    await expect(report.getByTestId('report-track')).toHaveCount(3);
    for (const id of ['report-summary', 'report-dynamics', 'report-tracks', 'report-advice']) await expect(report.getByTestId(id)).toBeVisible();
    await page.getByTestId('bilan-zone-short').click();
    for (const z of await page.getByTestId('bilan-onet-job').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-zone'))))) {
      expect(z).toBeLessThanOrEqual(2);
    }
  });
});

test.describe('Parcours pro', () => {
  test('explorateur O*NET : filtre par zone et tri pour le jeune choisi', async ({ page }) => {
    await loginPro(page);
    const explorer = page.getByTestId('onet-explorer');
    await expect(explorer).toContainText('721 métiers');
    await expect(explorer.getByTestId('onet-job')).toHaveCount(10);
    await explorer.getByTestId('pro-zone-higher').click();
    for (const z of await explorer.getByTestId('onet-job').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-zone'))))) {
      expect(z).toBeGreaterThanOrEqual(3);
    }
    await explorer.getByTestId('onet-for-noah').click();
    await expect(explorer.getByTestId('onet-job').first()).toContainText(/Son & Média|Créatif & Scène|Design & Image/);
    await explorer.getByTestId('onet-more').click();
    await expect(explorer.getByTestId('onet-job')).toHaveCount(20);
  });

  test('RGPD : aucune zone de texte libre, badge visible', async ({ page }) => {
    await loginPro(page);
    await page.getByTestId('manage-lucas').click();
    await expect(page.getByTestId('rgpd-badge').first()).toBeVisible();
    await expect(page.locator('textarea, [contenteditable="true"]')).toHaveCount(0);
    await expect(page.getByTestId('youth-panel').locator('input:not([type="file"])')).toHaveCount(0);
  });

  test('réorientation : le feed du jeune est instantanément réorienté', async ({ page }) => {
    await loginPro(page);
    await page.getByTestId('manage-noah').click();
    await page.getByTestId('add-tag-select').selectOption('Finance');
    await page.getByTestId('add-tag-btn').click();
    for (let i = 0; i < 6; i++) await page.getByTestId('inc-Finance').click();
    await expect(page.getByTestId('pro-score-Finance')).toHaveText('40');
    await page.getByTestId('open-youth-app').click();
    await expect(page.getByTestId('feed').locator('.reel').first()).toHaveAttribute('data-testid', 'reel-conseiller-financier');
  });

  test('import factice d’un PDF puis suppression', async ({ page }) => {
    await loginPro(page);
    await page.getByTestId('manage-chloe').click();
    await page.getByTestId('pdf-input').setInputFiles({
      name: 'rapport-des-possibles-2191.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 fictif'),
    });
    await expect(page.getByTestId('upload-progress')).toBeVisible();
    const doc = page.getByTestId('doc-rapport-des-possibles-2191.pdf');
    await expect(doc).toContainText('Importé');
    await doc.getByRole('button').click();
    await expect(doc).toHaveCount(0);
  });

  test('refuse un fichier qui n’est pas un PDF', async ({ page }) => {
    await loginPro(page);
    await page.getByTestId('manage-chloe').click();
    await page.getByTestId('pdf-input').setInputFiles({ name: 'virus.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ') });
    await expect(page.getByTestId('upload-error')).toContainText('PDF');
  });

  test('synchro en direct : le radar du jeune bouge quand le pro agit', async ({ page, context }, info) => {
    test.skip(info.project.name !== 'desktop', 'Deux fenêtres côte à côte : scénario desktop');
    await loginYouth(page, 'lucas');
    await page.getByTestId('tab-bilan').click();
    const radar = page.getByTestId('bilan').getByTestId('radar');
    const before = await radar.getAttribute('data-values');
    const pro = await context.newPage();
    await pro.goto('./#/pro');
    await pro.getByTestId('login-email').fill('dr.martin@polaria.fr');
    await pro.getByTestId('login-password').fill('pro123');
    await pro.getByTestId('login-submit').click();
    await pro.getByTestId('manage-lucas').click();
    for (let i = 0; i < 3; i++) await pro.getByTestId('inc-Logistique').click();
    await expect(radar).not.toHaveAttribute('data-values', before!);
    await expect(page.getByTestId('bilan').getByTestId('tag-score-Logistique')).toHaveText('19');
  });
});

test.describe('Parcours jeune v3', () => {
  test('desktop : la fiche s’ouvre dans le téléphone et le panneau bascule sur « Pourquoi »', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'Panneau latéral : desktop uniquement');
    await loginYouth(page, 'yanis');
    const side = page.getByTestId('side-panel');
    await expect(side.getByTestId('algo-panel')).toBeVisible();
    const first = await firstReelId(page);
    await page.getByTestId(`open-${first}`).click();
    const phone = page.getByTestId('phone');
    await expect(phone.getByTestId('details')).toBeVisible();
    await expect(side.getByTestId('why-panel')).toBeVisible();
    await expect(side.getByTestId('algo-panel')).toHaveCount(0);
    // La fiche reste dans le cadre du téléphone.
    const p = (await phone.boundingBox())!;
    const d = (await phone.getByTestId('details').boundingBox())!;
    expect(d.width).toBeLessThanOrEqual(p.width + 1);
    await page.getByTestId('back-to-feed').click();
    await expect(side.getByTestId('algo-panel')).toBeVisible();
  });

  test('desktop : « Prochain feed » sur une ligne, badge Découverte, barres sans chevauchement', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'Panneau latéral : desktop uniquement');
    await loginYouth(page, 'lucas');
    const side = page.getByTestId('side-panel');
    await expect(side.locator('.badge-discovery').first()).toBeVisible();
    // Le contenu du panneau ne déborde jamais de son cadre.
    const sideBox = (await side.boundingBox())!;
    const algoBox = (await side.getByTestId('algo-panel').boundingBox())!;
    expect(algoBox.x).toBeGreaterThanOrEqual(sideBox.x);
    expect(algoBox.x + algoBox.width).toBeLessThanOrEqual(sideBox.x + sideBox.width + 1);
    for (const el of await side.locator('.next__row, .bars__value, .badge-discovery').all()) {
      const b = (await el.boundingBox())!;
      expect(b.x + b.width).toBeLessThanOrEqual(sideBox.x + sideBox.width - 10);
    }
    for (const row of await side.locator('.next__row').all()) {
      const box = (await row.boundingBox())!;
      expect(box.height).toBeLessThan(34);
    }
    for (const row of await side.locator('.bars__row').all()) {
      const label = (await row.locator('.bars__label').boundingBox())!;
      const track = (await row.locator('.bars__track').boundingBox())!;
      expect(track.y).toBeGreaterThanOrEqual(label.y + label.height - 1);
    }
  });

  test('Mon Profil : voir plus réoriente la boussole en direct', async ({ page }) => {
    await loginYouth(page, 'chloe');
    await page.getByTestId('open-profile').click();
    const screen = page.getByTestId('profile-screen');
    await expect(screen).toBeVisible();
    await screen.getByTestId('more-Logique').click();
    await expect(screen.getByTestId('my-score-Logique')).toHaveText('14');
    await screen.getByTestId('explore-Design & Image').click();
    await expect(screen.getByTestId('my-score-Design & Image')).toHaveText('6');
    await page.getByTestId('back-from-profile').click();
    await page.getByTestId('tab-bilan').click();
    await expect(page.getByTestId('bilan').getByTestId('tag-score-Design & Image')).toHaveText('6');
  });

  test('landing : bandeau défilant, constat et chapitres 01-03', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.marquee')).toBeVisible();
    await expect(page.getByText('Tous les enfants ont du génie', { exact: false })).toBeVisible();
    for (const n of ['01', '02', '03']) await expect(page.getByTestId(`chapter-${n}`)).toBeVisible();
  });
});

#!/usr/bin/env node

const fs = require("fs");

const meow = require('meow');
const cheerio = require('cheerio');
const ProgressBar = require('progress');
const playwright = require('playwright-chromium');

const cli = meow(`
	Examples
	  $ lincps --url https://www.linkedin.com/company/spd-ukraine/
	  $ lincps --url https://www.linkedin.com/company/spd-ukraine/ --email andriyorehov@gmail.com --password ********
	  `,
  {
    flags: {
      url: {
        type: 'string',
        alias: 'u'
      },
      debug: {
        type: 'boolean',
      },
      email: {
        type: 'string',
        alias: 'e'
      },
      password: {
        type: 'string',
        alias: 'p'
      }
  }
});

const roles = {
  'Front-edn': ['front', 'верстальщик', 'javascript', 'react', 'angular'],
  'React': ['react'],
  'Angular': ['angular'],
  'IOS': ['ios'],
  'Recruiter': ['recruitment'],
  'Node': ['node'],
  'Team lead': ['team lead'],
  'Python': ['python'],
  'Mobile': ['mobile'],
  'Android': ['android'],
  'Java': ['java '],
  'QA': ['qa', 'quality assurance'],
  'PHP Dev': ['php'],
  'DevOps': ['devops'],
  'System administrator': ['system administrator'],
  'PM': ['project manager'],
  'SEO': ['seo'],
  'Designer': ['ux/ui', 'ui/ux', ' ui', 'ui ', ' ux', 'ux ', 'designer'],
}

function withoutZeroValues(object) {
  return Object.keys(object).reduce((queryParams, key) => {
    if (object[key] !== 0) { queryParams[key] = object[key]; }
    return queryParams;
  }, {});
}

function parse(positions) {
  let result = {}
  Object.keys(roles).map(role => result[role] = 0);

  for (const position of positions) {
    for (const role in roles) {
      for (const match of roles[role]) {
        if (position.toLowerCase().includes(match)) {
          result[role]+=1;
          break
        }
      }
    }
  }

  result = withoutZeroValues(result);
  const matched = Object.values(result).reduce((accumulator, currentValue) => Number(accumulator) + Number(currentValue));
  result =  Object.entries(result).sort((a, b) => Number(b[1]) - Number(a[1]));
  return {total: positions.length, result: result, totalMatched: matched};
}

function printResult(result) {
  console.log(`Found ${result.total} employees`);
  console.log(`Matched ${result.totalMatched} employees`);
  for (const r of result.result) {
    console.log(`${r[0]}: ${r[1]}`)
  }
}

(async () => {
  const url = cli.flags.url;
  if (!url || !url.includes('company')) {
    console.log('Please provide URL to company profile');
    return
  }

  let email = '';
  let password = '';
  if (process.env.LINCA_EMAIL && process.env.LINCA_PASSWORD) {
    email = process.env.LINCA_EMAIL;
    password = process.env.LINCA_PASSWORD;
  } else if (cli.flags.email && cli.flags.password) {
    email = cli.flags.email;
    password = cli.flags.password;
  } else {
    console.log('please supply email with password');
    return
  }

  const browser = await playwright.chromium.launch({headless: !cli.flags.debug });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const data = fs.readFileSync("cookies.json", "utf8");
    let cookies = JSON.parse(data);
    await context.addCookies(cookies);
    await page.goto(url);
  } catch (e) {
    if (e.code === "ENOENT") {
      await page.goto(url);
      await page.click('.join-form__form-body-subtext a');
      await page.click('.login-email');
      await page.keyboard.type(email);
      await page.click('.login-password');
      await page.keyboard.type(password);
      await page.click('.submit-button');

      let cookies = await context.cookies();
      let data = JSON.stringify(cookies);

      await fs.writeFile("cookies.json", data, "utf8", err => {
        if (err) throw err;
      });
    }
  }
  await page.click('a[data-control-name="topcard_see_all_employees"]');
  await page.waitFor('footer');
  const footer = await page.$('footer');
  await footer.scrollIntoViewIfNeeded();
  await page.waitFor(1000);
  const TOTAL_PAGES_SELECTOR = 'ul.artdeco-pagination__pages li:last-child button span';
  await page.waitFor(TOTAL_PAGES_SELECTOR);
  const pageContent = await page.content();
  const $page = cheerio.load(pageContent);
  const totalPages = $page(TOTAL_PAGES_SELECTOR).text().trim();
  const bar = new ProgressBar(':bar', { total: Number(totalPages) });
  bar.tick();

  const positions = [];

  async function parsePage() {
    const EMPLOYEE_LIST_SELECTOR = 'ul.search-results__list li';
    await page.waitFor(EMPLOYEE_LIST_SELECTOR)
    const hrefElement5 = await page.$('ul.search-results__list li:nth-child(5)');
    if (hrefElement5) {
      await hrefElement5.scrollIntoViewIfNeeded();
      await page.waitFor(1000);
    }
    const hrefElement10 = await page.$('ul.search-results__list li:nth-child(10)');
    if (hrefElement10) {
      await hrefElement10.scrollIntoViewIfNeeded();
      await page.waitFor(1000);
    }

    const pageContent = await page.content();
    const $page = cheerio.load(pageContent);
    $page(EMPLOYEE_LIST_SELECTOR).each(async function() {
      const position = $page(this).find(".search-result__info p:nth-of-type(1)").text().trim();
      positions.push(position.toLowerCase());
    });

    const NEXT_PAGE_SELECTOR = 'button[aria-label="Next"]';
    const isDisabled = $page(NEXT_PAGE_SELECTOR).attr('disabled')
    if (!isDisabled) {
      await page.click(NEXT_PAGE_SELECTOR);
      bar.tick();
      await parsePage();
    }
  }
  await parsePage();
  printResult(parse(positions));
  await browser.close();
})();

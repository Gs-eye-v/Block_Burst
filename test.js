
const puppeteer = require('puppeteer');
(async () => {
    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
        await page.goto('http://localhost:8000/');
        await page.waitForTimeout(2000);
        console.log('Clicking...');
        await page.mouse.click(300, 400);
        await page.waitForTimeout(1000);
        await browser.close();
    } catch (e) { console.error(e); }
})();


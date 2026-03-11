const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  
  await page.goto('file:///Users/lili/Desktop/Lumi Agent Simulator/Songyi_Li_CV.html', { waitUntil: 'networkidle' });
  
  await page.pdf({
    path: '/Users/lili/Desktop/Lumi Agent Simulator/Songyi_Li_CV.pdf',
    format: 'A4',
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
    printBackground: true
  });
  
  await browser.close();
})();

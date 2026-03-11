const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("file:///Users/lili/Desktop/Lumi Agent Simulator/Songyi_Li_CV.html", { waitUntil: "networkidle" });
  await page.pdf({
    path: "/Users/lili/Desktop/Lumi Agent Simulator/Songyi_Li_CV.pdf",
    format: "A4",
    displayHeaderFooter: false,
    printBackground: true,
    margin: { top: "20mm", bottom: "20mm", left: "22mm", right: "22mm" }
  });
  await browser.close();
})();

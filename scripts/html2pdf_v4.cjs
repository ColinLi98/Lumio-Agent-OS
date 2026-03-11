const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ 
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true
    });
    const page = await browser.newPage();
    
    await page.goto("file:///Users/lili/Desktop/Lumi Agent Simulator/Songyi_Li_CV.html", { waitUntil: "networkidle" });
    
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: '20mm', bottom: '20mm', left: '22mm', right: '22mm' },
      pageRanges: "1"
    });
    
    fs.writeFileSync("/Users/lili/Desktop/Lumi Agent Simulator/Songyi_Li_CV.pdf", pdfBuffer);
    console.log("PDF generated successfully.");
  } catch (e) {
    console.error("Error generating PDF:", e);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();

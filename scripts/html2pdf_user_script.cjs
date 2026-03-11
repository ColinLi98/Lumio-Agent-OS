const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ 
      args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
    });
    const page = await browser.newPage();
    
    await page.goto("file:///Users/lili/Desktop/Lumi Agent Simulator/Songyi_Li_CV_mod.html", { waitUntil: "networkidle" });
    
    // We omit margin object here because the injected CSS handles it perfectly without exposing the header/footer zones
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: false,
      pageRanges: "1"
    });
    
    fs.writeFileSync("Songyi_Li_CV.pdf", pdfBuffer);
    console.log("PDF generated successfully using Playwright script.");
  } catch (e) {
    console.error("Error generating PDF:", e);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();

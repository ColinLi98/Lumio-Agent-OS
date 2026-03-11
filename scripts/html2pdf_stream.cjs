const { chromium } = require("playwright");

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ 
      args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
    });
    const page = await browser.newPage();
    
    await page.goto("file:///Users/lili/Desktop/Lumi Agent Simulator/Songyi_Li_CV.html", { waitUntil: "networkidle" });
    
    // We omit margin object here because the injected CSS handles it perfectly without exposing the header/footer zones
    const pdfStream = await page.pdfStream({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: "20mm", bottom: "20mm", left: "22mm", right: "22mm" },
      pageRanges: "1"
    });
    
    pdfStream.pipe(process.stdout);
    
    await new Promise((resolve) => pdfStream.on("end", resolve));
  } catch (e) {
    console.error("Error generating PDF:", e);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();

const { chromium } = require("playwright");

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ 
      args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    
    await page.goto("file:///Users/lili/Desktop/Lumi Agent Simulator/Songyi_Li_CV.html", { waitUntil: "networkidle" });
    
    await page.pdf({
      path: "Songyi_Li_CV.pdf",
      format: "A4",
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: "20mm", bottom: "20mm", left: "22mm", right: "22mm" }
    });
    
    console.log("PDF generated successfully.");
  } catch (e) {
    console.error("Error generating PDF:", e);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();

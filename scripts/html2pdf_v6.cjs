const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

(async () => {
  let browser;
  try {
    const userDataDir = path.join(require("os").homedir(), "Library", "Application Support", "Google", "Chrome_Playwright_Temp_" + Date.now());
    fs.mkdirSync(userDataDir, { recursive: true });

    browser = await chromium.launchPersistentContext(userDataDir, { 
      executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      headless: true,
      args: ["--no-sandbox", "--disable-gpu"]
    });
    
    const page = await browser.newPage();
    
    await page.goto("file:///Users/lili/Desktop/Lumi Agent Simulator/Songyi_Li_CV.html", { waitUntil: "networkidle" });
    
    // Check height
    await page.evaluate(() => {
       const pageEl = document.querySelector(".page");
       if(pageEl) {
         pageEl.style.minHeight = "0";
         pageEl.style.height = "257mm"; // 297mm - 40mm margins
         pageEl.style.overflow = "hidden";
       }
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: "20mm", bottom: "20mm", left: "22mm", right: "22mm" },
      pageRanges: "1"
    });
    
    fs.writeFileSync("/Users/lili/Desktop/Lumi Agent Simulator/Songyi_Li_CV.pdf", pdfBuffer);
    console.log("PDF generated successfully via Playwright using system Chrome!");
    
    await browser.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  } catch (e) {
    console.error("Error generating PDF:", e);
    process.exit(1);
  }
})();

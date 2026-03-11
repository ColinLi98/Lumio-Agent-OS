const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ args: ["--no-sandbox", "--disable-gpu"] });
    const page = await browser.newPage();
    
    // Load the HTML
    await page.goto("file:///Users/lili/Desktop/Lumi Agent Simulator/Songyi_Li_CV.html", { waitUntil: "networkidle" });
    
    // Set viewport/media
    await page.emulateMedia({ media: "print" });
    
    // Force CSS to fit 1 page A4
    await page.addStyleTag({
      content: "body { width: 210mm; height: 297mm; overflow: hidden; margin: 0; padding: 0; box-sizing: border-box; } @page { size: A4; margin: 0; }"
    });

    // Generate PDF to a BUFFER (NO PATH PARAMETER)
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      pageRanges: "1"
    });
    
    // Write buffer directly to file system using Node.js
    fs.writeFileSync("/Users/lili/Desktop/Lumi Agent Simulator/Songyi_Li_CV.pdf", pdfBuffer);
    console.log("PDF generated successfully. Buffer length:", pdfBuffer.length);
  } catch (e) {
    console.error("Error generating PDF:", e);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();

const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ args: ["--no-sandbox", "--disable-gpu"] });
    const page = await browser.newPage();
    
    // Load the HTML
    await page.goto("file:///Users/lili/Desktop/Lumi Agent Simulator/Songyi_Li_CV.html", { waitUntil: "networkidle" });
    
    // Inject CSS to ensure everything fits on one page and hide any overflowing content
    await page.addStyleTag({
      content: "body { width: 210mm; height: 297mm; overflow: hidden; margin: 0; padding: 0; box-sizing: border-box; } @page { size: A4; margin: 0; }"
    });

    // Generate the PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      pageRanges: "1" // Guarantees it outputs only the first page
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

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generatePDF() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport size for better rendering
    await page.setViewport({
        width: 1200,
        height: 800,
        deviceScaleFactor: 1
    });
    
    // Load the HTML file
    const htmlPath = path.join(__dirname, 'MEMORY_SYSTEM_WHITEPAPER_HTML_FORMATTED.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Wait for fonts to load
    await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000
    });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
            top: '1cm',
            bottom: '1cm',
            left: '1cm',
            right: '1cm'
        },
        preferCSSPageSize: true,
        displayHeaderFooter: false
    });
    
    // Save PDF
    fs.writeFileSync('MEMORY_SYSTEM_WHITEPAPER.pdf', pdfBuffer);
    
    console.log('✅ PDF generated successfully!');
    console.log('📄 File saved as: MEMORY_SYSTEM_WHITEPAPER.pdf');
    
    await browser.close();
}

generatePDF().catch(console.error);
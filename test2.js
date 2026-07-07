const puppeteer = require('puppeteer');

(async () => {
    console.log("Launching browser...");
    const browser = await puppeteer.launch({ defaultViewport: { width: 1280, height: 800 } });
    const page = await browser.newPage();
    console.log("Navigating to http://localhost:3000");
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    console.log("Logging in...");
    await page.type('#username', 'admin');
    await page.type('#password', '123');
    await page.click('button[type="submit"]');
    
    console.log("Waiting for dashboard...");
    await page.waitForSelector('#view-title', { visible: true });
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Clicking Ventas menu...");
    await page.evaluate(() => {
        const links = document.querySelectorAll('.sidebar-nav-link');
        for (let el of links) {
            if (el.textContent.includes('Ventas')) {
                el.click();
                break;
            }
        }
    });
    
    console.log("Waiting for sales-companies-grid to populate...");
    await page.waitForSelector('#sales-companies-grid button.btn-primary', { visible: true });
    
    console.log("In Ventas view. Clicking Nueva Venta for a store...");
    const buttons = await page.$$('#sales-companies-grid button.btn-primary');
    let clicked = false;
    for (let btn of buttons) {
        const text = await page.evaluate(b => b.textContent, btn);
        if (text.includes('Acceder / Ventas')) {
            await btn.click();
            clicked = true;
            break;
        }
    }
    
    if (!clicked) {
        console.log("Could not find Nueva Venta button");
        await browser.close();
        return;
    }
    
    console.log("Waiting for modal to open...");
    await page.waitForSelector('#store-work-type-modal:not(.hidden)');
    await new Promise(r => setTimeout(r, 1000));
    
    console.log("Selecting Venta de producto...");
    const typeButtons = await page.$$('.work-type-btn');
    for (let btn of typeButtons) {
        const type = await page.evaluate(b => b.getAttribute('data-type'), btn);
        if (type === 'Venta de producto') {
            await btn.click();
            break;
        }
    }
    
    console.log("Waiting for grid load...");
    await new Promise(r => setTimeout(r, 3000));
    
    console.log("Taking screenshot...");
    await page.screenshot({ path: 'screenshot.png', fullPage: true });
    console.log("Screenshot taken.");
    
    await browser.close();
})();

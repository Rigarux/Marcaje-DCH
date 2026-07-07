const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Capture console output
    page.on('console', msg => {
        console.log(`PAGE LOG [${msg.type()}]:`, msg.text());
        if (msg.type() === 'error') {
            console.error('ERROR DETAILS:', msg.location(), msg.args());
        }
    });

    page.on('pageerror', error => {
        console.error('PAGE EXCEPTION:', error.message);
    });

    try {
        console.log("Navigating to index.html...");
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

        await page.evaluate(() => {
            window.currentUser = { id: 1, rol: 'admin', nombre: 'Admin' };
            window.AttendanceDB = {
                _state: { stores: [{ id: 1, nombre: 'Test Store' }] }
            };
        });

        console.log("Opening work type modal...");
        await page.evaluate(() => {
            if (typeof window.openWorkTypeModal === 'function') {
                window.openWorkTypeModal(1, 'Test Store');
            } else {
                console.log("window.openWorkTypeModal is not a function!");
            }
        });

        // Wait for modal to be visible
        await page.waitForSelector('#store-work-type-modal:not(.hidden)', { timeout: 2000 });
        console.log("Modal opened.");

        // Click the "Venta de producto" button
        console.log("Clicking Venta de producto button...");
        await page.evaluate(() => {
            const btns = document.querySelectorAll('.work-type-btn');
            let clicked = false;
            btns.forEach(btn => {
                if (btn.getAttribute('data-type') === 'Venta de producto') {
                    btn.click();
                    clicked = true;
                }
            });
            if (!clicked) console.log("Button not found!");
        });

        await new Promise(r => setTimeout(r, 2000));
        console.log("Done waiting.");
    } catch (err) {
        console.error('SCRIPT EXCEPTION:', err);
    } finally {
        await browser.close();
    }
})();

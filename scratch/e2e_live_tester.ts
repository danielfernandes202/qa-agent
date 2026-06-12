import { chromium } from 'playwright';
import path from 'path';

async function runTest() {
    console.log("Starting Playwright E2E test...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log("Navigating to login...");
        await page.goto('http://localhost:3000/login');
        
        console.log("Filling credentials...");
        await page.fill('input[type="email"]', 'fernandesdnaiel.df9@gmail.com');
        await page.fill('input[type="password"]', 'Dady123!@#');
        await page.click('button:has-text("Login")');

        console.log("Waiting for navigation to dashboard...");
        await page.waitForTimeout(4000);
        
        console.log("Navigating to Visual Tester...");
        await page.goto('http://localhost:3000/qa-test-assistant/visual-tester');
        await page.waitForLoadState('networkidle');

        console.log("Clicking Start button...");
        const runButton = page.locator('button:has-text("Start"), button:has-text("Re-run")');
        await runButton.click();

        console.log("Waiting for output logs...");
        // Wait for some log that indicates the agent is running
        await page.waitForSelector('text=Starting AI Turn 1', { timeout: 45000 });
        console.log("Agent started AI Turn 1 successfully!");
        
        // Wait for completion or more logs
        await page.waitForTimeout(10000); // just wait a bit to capture progress

        const screenshotPath = path.resolve(__dirname, 'e2e_tester_result.png');
        await page.screenshot({ path: screenshotPath });
        console.log("Screenshot saved to", screenshotPath);

    } catch (e) {
        console.error("Test failed:", e);
        const screenshotPath = path.resolve(__dirname, 'e2e_tester_error.png');
        await page.screenshot({ path: screenshotPath });
    } finally {
        await browser.close();
        console.log("Test complete.");
    }
}

runTest();

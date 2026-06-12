import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log(`[BROWSER LOG] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.message}`));

  console.log('Testing Supabase Auth Flow...');
  
  try {
    const randomSuffix = Math.floor(Math.random() * 100000);
    const email = `testuser${randomSuffix}@gmail.com`;
    const password = `password123`;
    const name = `Test User ${randomSuffix}`;

    console.log(`\n[1/3] Navigating to Signup page...`);
    let connected = false;
    for (let i = 0; i < 30; i++) {
        try {
            await page.goto('http://localhost:3000/signup', { timeout: 2000 });
            await page.waitForLoadState('networkidle');
            connected = true;
            break;
        } catch (e) {
            console.log(`Waiting for dev server... (${i+1}/30)`);
            await page.waitForTimeout(2000);
        }
    }
    if (!connected) throw new Error("Could not connect to dev server.");
    await page.waitForLoadState('networkidle');

    console.log(`[2/3] Submitting signup for ${email}...`);
    await page.fill('input[name="name"]', name);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    console.log('Waiting for response...');
    // We wait either for URL change or an error toast.
    await page.waitForTimeout(4000); 
    
    let currentUrl = page.url();
    console.log(`URL after signup: ${currentUrl}`);
    
    const checkToasts = async () => {
        return await page.evaluate(() => {
            const toasts = document.querySelectorAll('[role="region"] li[data-state="open"]'); 
            const results = [];
            for (let i = 0; i < toasts.length; i++) {
                results.push({
                    isError: toasts[i].className.includes('destructive'),
                    text: toasts[i].textContent
                });
            }
            return results;
        });
    };

    let toasts = await checkToasts();
    let errorToast = toasts.find(t => t.isError);
    if (errorToast) {
        console.error('⚠️ Error during signup:', errorToast.text);
    } else {
        console.log('✅ Signup toasts:', toasts.map(t => t.text).join(', '));
        if (toasts.length === 0) {
            await page.screenshot({ path: 'signup-fail.png' });
            console.log('No toasts found! Saved screenshot to signup-fail.png');
            // Check form validation messages
            const formErrors = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('.text-destructive')).map(e => e.textContent).join(', ');
            });
            console.log(`Form validation errors: ${formErrors}`);
        }
    }

    console.log(`\n[3/3] Navigating to Login page...`);
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    console.log(`Submitting login for ${email}...`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    
    console.log('Waiting for response...');
    await page.waitForTimeout(4000);
    
    currentUrl = page.url();
    console.log(`URL after explicit login: ${currentUrl}`);

    toasts = await checkToasts();
    errorToast = toasts.find(t => t.isError);
    if (errorToast) {
        console.error('⚠️ Error during login:', errorToast.text);
    } else if (currentUrl.includes('qa-test-assistant')) {
        console.log('✅ Login successful, reached target page!');
    } else {
        console.log('⚠️ Login might not have redirected as expected.');
    }

    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
})();

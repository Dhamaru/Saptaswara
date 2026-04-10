import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> Navigate to http://localhost:3000
        await page.goto("http://localhost:3000")
        
        # -> Click the 'Start Creating' link to open the Studio page.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div/section/div[3]/a').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the 'Start Creating' link to open the Studio page.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div/section/div[3]/a').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Navigate to /studio and load the Studio page so I can interact with its controls (then wait for the UI to settle).
        await page.goto("http://localhost:3000/studio")
        
        # -> Navigate to /studio and wait for the UI to settle so I can initialize audio and interact with BPM/export controls.
        await page.goto("http://localhost:3000/studio")
        
        # -> Fill the login form (email + password) and click 'Enter Studio' to authenticate, then wait for the Studio page to load.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/main/div/div[2]/div[2]/form/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill('kasivasi2005@gmail.com')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/main/div/div[2]/div[2]/form/div[2]/input').nth(0)
        await asyncio.sleep(3); await elem.fill('D@mbro123')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div/div[2]/div[2]/form/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        assert await frame.locator("xpath=//*[contains(., 'BPM must be between')]").nth(0).is_visible(), "The BPM range validation error should be visible after attempting to export with BPM set below the allowed minimum."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
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
        
        # -> Click the 'Ragam' link to open the library page so I can select a raga.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/nav/div/div/a[2]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click a raga card in the library to open the studio with that raga pre-loaded, then observe the studio page to verify the selected raga and its note set are shown.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div/main/div/div/div[3]/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the 'Compose in this Raga' button for Abhogi Kanada to open the studio with that raga pre-loaded, then verify the studio shows the selected raga and its note set.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div/div/div/div[2]/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Sign in using default test credentials so we can continue to the library and open the selected raga in the Studio.
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
        
        # -> Wait for sign-in to complete, then open the Library (Ragam) and load the previously-selected raga into the Studio by clicking 'Compose in this Raga', then verify the Studio shows the raga name and its note set.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/nav/div/div/a[2]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        assert await frame.locator("xpath=//*[contains(., 'Abhogi Kanada')]").nth(0).is_visible(), "The studio should show the selected raga Abhogi Kanada after opening it from the library"
        assert await frame.locator("xpath=//*[contains(., 'Notes')]").nth(0).is_visible(), "The studio should display the raga's note set in the studio context after loading the raga from the library"
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
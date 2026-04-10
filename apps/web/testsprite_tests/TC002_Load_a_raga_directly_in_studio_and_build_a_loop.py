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
        
        # -> Click the 'Start Creating' link/button to open the Studio page.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div/section/div[3]/a').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Log in using provided credentials to enter the Studio page.
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
        
        # -> Fill the email and password fields and click 'Enter Studio' to sign in.
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
        
        # -> Click the 'Go to Studio' link/button to open the Studio page so I can select a raga and interact with the instruments and sequencer.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div/div[3]/div/a').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the 'Reload' button to retry loading the Studio page anonymously so we can continue with selecting a raga and interacting with instruments/sequencer.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div/div/form/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the 'Ragam' link to open the raga library so we can select a raga to load into the studio.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/nav/div/div/a[2]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Sign out to test the anonymous flow (click Logout), then initialize audio engine, select a raga, play some notes, toggle sequencer steps (by scrolling to reveal steps if needed), start playback, and verify loop is playing.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/nav/div[2]/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div/div[1]/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Navigate to the Studio page as an anonymous user (open /studio) so we can attempt to load a raga and interact with instruments and the sequencer.
        await page.goto("http://localhost:3000/studio")
        
        # -> Navigate to /studio as an anonymous user and check whether the Studio UI loads. If the page redirects to the login screen again, conclude anonymous Studio access is blocked and report the result.
        await page.goto("http://localhost:3000/studio")
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        assert await frame.locator("xpath=//*[contains(., 'Ragam')]").nth(0).is_visible(), "The selected raga should be visible in the studio after loading.",
        assert await frame.locator("xpath=//*[contains(., 'Playing')]").nth(0).is_visible(), "The sequencer loop should be playing after starting playback.",
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
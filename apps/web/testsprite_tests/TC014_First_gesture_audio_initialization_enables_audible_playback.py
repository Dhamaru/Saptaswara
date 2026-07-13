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
        
        # -> Click the 'Start Creating' link to open the Studio page (/studio).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div/section/div[3]/a').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Navigate to the Studio page at /studio (http://localhost:3000/studio).
        await page.goto("http://localhost:3000/studio")
        
        # -> Fill the login form with provided credentials and submit to enter the Studio page.
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
        
        # -> Fill the login form with the provided credentials and click 'Enter Studio' to sign in.
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
        
        # -> Click the 'Go to Studio' link to open the Studio page so we can select a raga and test audio playback behavior.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div/div[3]/div/a').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Wait for the Studio to finish initializing, then open the Ragam library by clicking the 'Ragam' link.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/nav/div/div/a[2]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Attempt to start playback without performing a gesture by clicking the Play control, then perform a user gesture by pressing a piano key, then start playback, verify audio starts and guidance disappears, and finally stop playback.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div/main/div[2]/section[2]/div[2]/div[2]/div/div[1]/div[1]/button[1]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Navigate to the Studio page (/studio) and wait for it to finish loading so we can locate the piano and Play control.
        await page.goto("http://localhost:3000/studio")
        
        # -> Fill the login form with the provided credentials and click 'Enter Studio' to authenticate so we can navigate to /studio and continue the audio-engine gesture test.
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
        
        # -> Click 'Go to Studio' on the dashboard to open the Studio page (/studio), then wait for the page to finish loading.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div/div[3]/div/a').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Wait for the Studio to finish loading, then open the Ragam library.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/nav/div/div/a[2]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Navigate to /studio and wait for the page to finish loading so the Studio piano and Play controls are available.
        await page.goto("http://localhost:3000/studio")
        
        # -> Click the 'Ragam' navigation link to open the Ragam library so a raga can be selected (then attempt playback without a gesture).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/nav/div/div/a[2]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Select the first raga (Abhogi Kanada) from the Ragam list to load its notes so we can attempt playback.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div/aside/div/div[2]/div[2]/div[3]/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Attempt playback without gesture (click Play), then perform a user gesture by pressing a piano key to initialize audio, start playback, verify audio runs and guidance clears, then stop playback.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/nav/div[2]/div/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div/main/div[2]/section[2]/div[2]/div[2]/div/div/div/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        assert await frame.locator("xpath=//*[contains(., 'Stop')]").nth(0).is_visible(), "The player should show a Stop control after playback starts following the first user gesture"
        assert not await frame.locator("xpath=//*[contains(., 'Click to enable audio')]").nth(0).is_visible(), "The audio-start guidance should no longer be shown after the first user gesture initializes audio"
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
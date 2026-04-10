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
        
        # -> Open the Studio page by clicking 'Start Creating' (link on the homepage).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div/section/div[3]/a').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Fill the login form (email and password) and click 'Enter Studio' to reach the studio page.
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
        
        # -> Open the account creation page to register a user (click the 'Create one' link).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div/div[2]/p/a').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the 'Create one' link to open the account registration page so I can create a user and proceed to the studio.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div/div[2]/p/a').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Fill the signup form (email + password) and click 'Start Creating' to create the account and navigate to /studio.
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
        
        # -> Change the signup email to a different valid address and resubmit the signup form to attempt to create an account and reach /studio.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/main/div/div[2]/div[2]/form/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill('test.user+1@example.com')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/main/div/div[2]/div[2]/form/div[2]/input').nth(0)
        await asyncio.sleep(3); await elem.fill('D@mbro123')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div/div[2]/div[2]/form/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Replace the email with a valid address without a '+' and resubmit the signup form to create an account and reach /studio.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/main/div/div[2]/div[2]/form/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill('test.user1@example.com')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div/div[2]/div[2]/form/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        assert await frame.locator("xpath=//*[contains(., 'The raga uses the notes:')]").nth(0).is_visible(), "The assistant response should begin streaming and show a partial raga-related message.",
        assert await frame.locator("xpath=//*[contains(., 'Sa Re Ga Ma Pa Dha Ni Sa')]").nth(0).is_visible(), "The assistant response should complete and remain visible in the chat history showing the full raga note sequence."]}
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
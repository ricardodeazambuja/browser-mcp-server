const pw = require('playwright');

(async () => {
    console.log('Testing Media Domain CDP...');
    // Find a system chrome
    const chromePath = '/usr/bin/google-chrome';
    const browser = await pw.chromium.launch({
        executablePath: chromePath,
        headless: true
    });

    const context = await browser.newContext();
    const page = await context.newPage();
    const session = await context.newCDPSession(page);

    try {
        await session.send('Media.enable');
        console.log('✅ Media domain enabled');

        session.on('Media.playerPropertiesChanged', (p) => {
            console.log('Event (Properties):', JSON.stringify(p, null, 2));
        });

        session.on('Media.playerEventsAdded', (e) => {
            console.log('Event (Player-Event):', JSON.stringify(e, null, 2));
        });

        console.log('Navigating to audio example...');
        await page.goto('https://www.soundhelix.com/examples-mp3', { waitUntil: 'domcontentloaded' });

        console.log('Playing audio...');
        await page.evaluate(() => {
            const audio = document.querySelector('audio');
            if (audio) {
                audio.play();
                console.log('Play triggered');
            } else {
                console.log('No audio element found');
            }
        });

        // Wait for events
        await new Promise(r => setTimeout(r, 5000));

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await browser.close();
        console.log('Closed.');
    }
})();

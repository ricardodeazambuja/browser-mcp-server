const pw = require('playwright');

(async () => {
    console.log('Testing AudioContext Analysis...');
    const browser = await pw.chromium.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: true,
        args: ['--autoplay-policy=no-user-gesture-required']
    });

    const page = await browser.newPage();
    await page.goto('https://www.soundhelix.com/examples-mp3');

    // Inject script to monitor audio
    const audioData = await page.evaluate(async () => {
        return new Promise(resolve => {
            const audio = document.querySelector('audio');
            if (!audio) return resolve('No audio element');

            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const source = ctx.createMediaElementSource(audio);
            const analyzer = ctx.createAnalyser();

            source.connect(analyzer);
            analyzer.connect(ctx.destination);

            audio.play();

            setTimeout(() => {
                const dataArray = new Uint8Array(analyzer.frequencyBinCount);
                analyzer.getByteFrequencyData(dataArray);
                // Get non-zero values
                const active = Array.from(dataArray).filter(v => v > 0);
                resolve({
                    sampleCount: active.length,
                    avgVolume: active.reduce((a, b) => a + b, 0) / (active.length || 1),
                    peak: Math.max(...dataArray)
                });
            }, 2000);
        });
    });

    console.log('Audio Data:', audioData);
    await browser.close();
})();

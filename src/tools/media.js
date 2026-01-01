const { withPage } = require('../browser');

const definitions = [
    {
        name: 'browser_get_media_summary',
        description: 'Get a summary of all audio and video elements on the page (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_get_audio_analysis',
        description: 'Analyze audio output for a duration to detect sound vs silence and frequencies (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                durationMs: { type: 'number', description: 'Duration to analyze in ms', default: 2000 },
                selector: { type: 'string', description: 'Optional selector to specific media element' }
            },
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_control_media',
        description: 'Control a media element (play, pause, seek, mute) (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                selector: { type: 'string', description: 'Selector for the audio/video element' },
                action: { type: 'string', enum: ['play', 'pause', 'mute', 'unmute', 'seek'] },
                value: { type: 'number', description: 'Value for seek action (time in seconds)' }
            },
            required: ['selector', 'action'],
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    }
];

const handlers = {
    browser_get_media_summary: withPage(async (page) => {
        const mediaState = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('audio, video'));
            return elements.map((el, index) => {
                const buffered = [];
                for (let i = 0; i < el.buffered.length; i++) {
                    buffered.push([el.buffered.start(i), el.buffered.end(i)]);
                }

                return {
                    index,
                    tagName: el.tagName.toLowerCase(),
                    id: el.id || null,
                    src: el.currentSrc || el.src,
                    state: {
                        paused: el.paused,
                        muted: el.muted,
                        ended: el.ended,
                        loop: el.loop,
                        playbackRate: el.playbackRate,
                        volume: el.volume
                    },
                    timing: {
                        currentTime: el.currentTime,
                        duration: el.duration
                    },
                    buffer: {
                        readyState: el.readyState,
                        buffered
                    },
                    videoSpecs: el.tagName === 'VIDEO' ? {
                        videoWidth: el.videoWidth,
                        videoHeight: el.videoHeight
                    } : undefined
                };
            });
        });
        return {
            content: [{
                type: 'text',
                text: JSON.stringify(mediaState, null, 2)
            }]
        };
    }),

    browser_get_audio_analysis: withPage(async (page, args) => {
        const duration = args.durationMs || 2000;
        const selector = args.selector;

        const analysis = await page.evaluate(async ({ duration, selector }) => {
            return new Promise(async (resolve) => {
                try {
                    let element;
                    if (selector) {
                        element = document.querySelector(selector);
                    } else {
                        const all = Array.from(document.querySelectorAll('audio, video'));
                        element = all.find(e => !e.paused) || all[0];
                    }

                    if (!element) return resolve({ error: 'No media element found' });

                    const CtxClass = window.AudioContext || window.webkitAudioContext;
                    if (!CtxClass) return resolve({ error: 'Web Audio API not supported' });

                    const ctx = new CtxClass();
                    if (ctx.state === 'suspended') await ctx.resume();

                    let source;
                    try {
                        source = ctx.createMediaElementSource(element);
                    } catch (e) {
                        return resolve({ error: `Cannot connect to media source: ${e.message}. (Check CORS headers)` });
                    }

                    const analyzer = ctx.createAnalyser();
                    analyzer.fftSize = 256;
                    const bufferLength = analyzer.frequencyBinCount;
                    const dataArray = new Uint8Array(bufferLength);

                    source.connect(analyzer);
                    analyzer.connect(ctx.destination);

                    const samples = [];
                    const startTime = Date.now();
                    const interval = setInterval(() => {
                        analyzer.getByteFrequencyData(dataArray);

                        let sum = 0;
                        let max = 0;
                        for (let i = 0; i < bufferLength; i++) {
                            const val = dataArray[i];
                            sum += val;
                            if (val > max) max = val;
                        }
                        const avg = sum / bufferLength;

                        samples.push({ avg, max, data: Array.from(dataArray) });

                        if (Date.now() - startTime >= duration) {
                            clearInterval(interval);
                            finalize();
                        }
                    }, 100);

                    function finalize() {
                        try {
                            source.disconnect();
                            analyzer.disconnect();
                            ctx.close();
                        } catch (e) { }

                        if (samples.length === 0) return resolve({ status: 'No samples' });

                        const totalAvg = samples.reduce((a, b) => a + b.avg, 0) / samples.length;
                        const grandMax = Math.max(...samples.map(s => s.max));
                        const isSilent = grandMax < 5;

                        const bassSum = samples.reduce((acc, s) => {
                            return acc + s.data.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
                        }, 0) / samples.length;

                        const midSum = samples.reduce((acc, s) => {
                            return acc + s.data.slice(5, 40).reduce((a, b) => a + b, 0) / 35;
                        }, 0) / samples.length;

                        const trebleSum = samples.reduce((acc, s) => {
                            return acc + s.data.slice(40).reduce((a, b) => a + b, 0) / 88;
                        }, 0) / samples.length;

                        const activeFrequencies = [];
                        if (bassSum > 20) activeFrequencies.push('bass');
                        if (midSum > 20) activeFrequencies.push('mid');
                        if (trebleSum > 20) activeFrequencies.push('treble');

                        resolve({
                            element: { tagName: element.tagName, id: element.id, src: element.currentSrc },
                            isSilent,
                            averageVolume: Math.round(totalAvg),
                            peakVolume: grandMax,
                            activeFrequencies
                        });
                    }

                } catch (e) {
                    resolve({ error: e.message });
                }
            });
        }, { duration, selector });

        return {
            content: [{
                type: 'text',
                text: JSON.stringify(analysis, null, 2)
            }]
        };
    }),

    browser_control_media: withPage(async (page, args) => {
        const controlResult = await page.evaluate(async ({ selector, action, value }) => {
            const el = document.querySelector(selector);
            if (!el) return { error: `Element not found: ${selector}` };
            if (!(el instanceof HTMLMediaElement)) return { error: 'Element is not audio/video' };

            try {
                switch (action) {
                    case 'play':
                        await el.play();
                        return { status: 'playing' };
                    case 'pause':
                        el.pause();
                        return { status: 'paused' };
                    case 'mute':
                        el.muted = true;
                        return { status: 'muted' };
                    case 'unmute':
                        el.muted = false;
                        return { status: 'unmuted' };
                    case 'seek':
                        if (typeof value !== 'number') return { error: 'Seek value required' };
                        el.currentTime = value;
                        return { status: 'seeked', newTime: el.currentTime };
                    default:
                        return { error: `Unknown media action: ${action}` };
                }
            } catch (e) {
                return { error: e.message };
            }
        }, args);

        return {
            content: [{
                type: 'text',
                text: JSON.stringify(controlResult, null, 2)
            }]
        };
    })
};

module.exports = { definitions, handlers };
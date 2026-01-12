import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

let ffmpeg = null;

export const loadFFmpeg = async () => {
    if (ffmpeg && ffmpeg.isLoaded()) return ffmpeg;

    if (!ffmpeg) {
        ffmpeg = createFFmpeg({
            log: true,
            corePath: '/ffmpeg/ffmpeg-core.js',
            wasmPath: '/ffmpeg/ffmpeg-core.wasm',
            workerPath: '/ffmpeg/ffmpeg-core.worker.js'
        });
    }

    if (!ffmpeg.isLoaded()) {
        await ffmpeg.load();
    }

    return ffmpeg;
};

export const burnSubtitle = async (videoFile, subtitleContent, subtitleName = 'subtitle.srt', fontFamily = 'Noto Sans CJK SC', onProgress, eraserRegion = null, previewTimes = null, eraserStrength = 50, subtitleData = null, resolution = 'original', quality = 'medium', customBitrate = null, softSub = false) => {
    // previewTimes: array of numbers (timestamps in seconds) or null
    // subtitleData: array of {startTime, endTime, ...} for smart erasure
    // softSub: boolean, if true, embed subtitle as a stream instead of burning it
    const ffmpeg = await loadFFmpeg();
    const videoName = 'input.mp4';
    const outputName = 'output.mp4';

    ffmpeg.FS('writeFile', videoName, await fetchFile(videoFile));
    if (subtitleContent) {
        ffmpeg.FS('writeFile', subtitleName, subtitleContent);
    }

    // Font configuration
    const fonts = {
        'Noto Sans CJK SC': {
            url: '/fonts/NotoSansCJKsc-Regular.otf',
            filename: 'NotoSansCJKsc-Regular.otf'
        },
        'Noto Serif CJK SC': {
            url: '/fonts/NotoSerifCJKsc-Regular.otf',
            filename: 'NotoSerifCJKsc-Regular.otf'
        }
    };

    const fontConfig = fonts[fontFamily] || fonts['Noto Sans CJK SC'];
    const { url: fontUrl, filename: fontName } = fontConfig;

    try {
        // Check if font already exists in FS
        ffmpeg.FS('stat', fontName);
    } catch (e) {
        // If not, try to download it
        try {
            if (onProgress) onProgress({ ratio: 0, message: `Downloading font (${fontFamily})...` });
            const fontData = await fetchFile(fontUrl);
            ffmpeg.FS('writeFile', fontName, fontData);
        } catch (fetchErr) {
            console.error('Failed to download font:', fetchErr);
            throw new Error(`Failed to download font: ${fontFamily}. Please check your internet connection.`);
        }
    }

    if (onProgress) {
        ffmpeg.setProgress(onProgress);
    }

    // Create fonts directory
    try {
        ffmpeg.FS('mkdir', '/fonts');
    } catch (e) {
        // Directory might already exist
    }

    // Create fonts.conf
    const fontConf = `<?xml version="1.0"?>
<fontconfig>
  <dir>/fonts</dir>
  <cachedir>/tmp</cachedir>
  <config></config>
</fontconfig>`;
    ffmpeg.FS('writeFile', '/fonts/fonts.conf', fontConf);

    // Copy font to /fonts directory if it exists
    try {
        const fontData = ffmpeg.FS('readFile', fontName);
        ffmpeg.FS('writeFile', `/fonts/${fontName}`, fontData);
    } catch (e) {
        throw new Error(`Failed to load font: ${fontName}`);
    }

    // Build filter string
    let vf = '';
    if (subtitleContent) {
        vf = `subtitles=${subtitleName}:fontsdir=/fonts`;
    }

    // If eraserRegion is provided, prepend delogo or boxblur filter
    if (eraserRegion) {
        const { x, y, w, h } = eraserRegion;
        // Ensure values are within video bounds and valid
        if (w > 0 && h > 0) {
            // Construct enable expression if subtitleData provided
            let enableExpr = '';
            if (subtitleData && subtitleData.length > 0) {
                // expression format: between(t,start,end)+between(t,start,end)+...
                // Note: FFmpeg expressions can be long, but there's a limit. 
                // For very long subtitles, this might exceed command line length limits.
                // A better approach for huge lists is 'sendcmd' or 'timeline editing', but 'enable' is simplest for now.
                // Let's batch them or hope it's not too long. 
                // A typical movie has 1000+ subs. 1000 * 20 chars = 20KB. might be okay for in-memory FS but tricky for shell.
                // However, ffmpeg.wasm uses internal arguments, so shell limits might not apply the same way.

                // Optimisation: merge overlapping or adjacent intervals
                const intervals = subtitleData
                    .map(s => ({ start: s.startTime, end: s.endTime }))
                    .sort((a, b) => a.start - b.start);

                const merged = [];
                if (intervals.length > 0) {
                    let curr = intervals[0];
                    for (let i = 1; i < intervals.length; i++) {
                        if (intervals[i].start <= curr.end + 0.1) { // 0.1s tolerance
                            curr.end = Math.max(curr.end, intervals[i].end);
                        } else {
                            merged.push(curr);
                            curr = intervals[i];
                        }
                    }
                    merged.push(curr);
                }

                const parts = merged.map(i => `between(t,${i.start},${i.end})`);
                enableExpr = `:enable='${parts.join('+')}'`;
            }

            // Erasure Strength Logic:
            // 0-90: Gaussian Blur (boxblur)
            // 91-100: Delogo (Interpolation removal)

            let filterGraph = '';
            const enableOption = enableExpr ? enableExpr : "";
            const rX = Math.round(x);
            const rY = Math.round(y);
            const rW = Math.round(w);
            const rH = Math.round(h);

            if (eraserStrength > 90) {
                // High strength -> Delogo (Aggressive removal)
                // Construct complex filter for delogo to unify handling
                filterGraph = `[0:v]delogo=x=${rX}:y=${rY}:w=${rW}:h=${rH}:show=0${enableOption}[v_erased]`;
            } else {
                // Low/Medium strength -> Boxblur (Blurring)
                // ... (Boxblur logic)
                const radius = Math.max(1, Math.round(eraserStrength / 2.5));
                const power = 2; // More passes = smoother and stronger

                filterGraph = `[0:v]split[main][to_blur];[to_blur]crop=${rW}:${rH}:${rX}:${rY},boxblur=${radius}:${power}[blurred];[main][blurred]overlay=${rX}:${rY}${enableOption}[v_erased]`;
            }

            let outputLabel = '[v_erased]';

            if (subtitleContent) {
                filterGraph += `;[v_erased]subtitles=${subtitleName}:fontsdir=/fonts[outv]`;
                outputLabel = '[outv]';
            }

            // Resolution scaling
            if (resolution && resolution !== 'original') {
                const height = parseInt(resolution.replace('p', ''));
                if (!isNaN(height)) {
                    // Scale maintaining aspect ratio, ensure even dimensions
                    filterGraph += `;${outputLabel}scale=-2:${height}[scaled]`;
                    outputLabel = '[scaled]';
                }
            }

            vf = null; // Signal to use complex filter script
            var complexFilter = filterGraph;
            var complexFilterLabel = outputLabel;
        }
    } else {
        // No eraser, just potential scaling or subtitles
        if (resolution && resolution !== 'original') {
            const height = parseInt(resolution.replace('p', ''));
            if (!isNaN(height)) {
                let currentStream = '[0:v]';
                let filterChain = '';

                // If subtitles exist, add them first? Or scale then subtitles?
                // Usually better to add subtitles to original resolution then scale down for quality,
                // BUT for performance, scaling down then adding subtitles is faster.
                // However, scaling down might make subtitles too large or small if not handled.
                // ASS subtitles usually have absolute positioning, so we MUST apply subtitles to original resolution
                // OR we have to adjust ASS header PlayResY.
                // Given we are using 'subtitles' filter, it renders on the video.
                // Let's render subtitles first (if any) then scale.

                if (subtitleContent) {
                    filterChain += `subtitles=${subtitleName}:fontsdir=/fonts[subbed];[subbed]`;
                    currentStream = '[subbed]';
                }

                filterChain += `${currentStream === '[0:v]' ? '[0:v]' : ''}scale=-2:${height}[outv]`;

                vf = null;
                complexFilter = filterChain;
                complexFilterLabel = '[outv]';
            }
        }
    }

    // Preview mode: generate multiple frames
    if (previewTimes && Array.isArray(previewTimes)) {
        const blobs = [];

        for (let i = 0; i < previewTimes.length; i++) {
            const time = previewTimes[i];
            const imageName = `output_${i}.jpg`;

            const args = [
                '-ss', time.toString(),
                '-copyts',
                '-i', videoName,
                '-vframes', '1'
            ];

            if (vf) {
                args.push('-vf', vf);
            } else if (typeof complexFilter !== 'undefined') {
                args.push('-filter_complex', complexFilter, '-map', complexFilterLabel || '[outv]');
            } else {
                // No eraser, just subtitles
                args.push('-vf', `subtitles=${subtitleName}:fontsdir=/fonts`);
            }

            args.push(imageName);

            await ffmpeg.run(...args);

            try {
                const data = ffmpeg.FS('readFile', imageName);
                blobs.push(new Blob([data.buffer], { type: 'image/jpeg' }));
                ffmpeg.FS('unlink', imageName);
            } catch (e) {
                console.error(`Failed to read preview frame at ${time}s`, e);
            }

            if (onProgress) {
                onProgress({ ratio: (i + 1) / previewTimes.length, message: `Generating preview ${i + 1}/${previewTimes.length}...` });
            }
        }

        // Cleanup
        ffmpeg.FS('unlink', videoName);
        ffmpeg.FS('unlink', subtitleName);

        return blobs;
    } else {
        const args = ['-i', videoName];

        if (softSub && subtitleContent) {
            // Soft subtitle embedding
            // We need to map video (0:v), audio (0:a), and subtitle (input 1)
            // Input 1 is the subtitle file
            args.push('-i', subtitleName);

            // Map streams: Video, Audio, Subtitle
            args.push('-map', '0:v');
            args.push('-map', '0:a?'); // ? means optional if no audio
            args.push('-map', '1:0');

            // Set subtitle codec to mov_text for MP4 container compatibility
            args.push('-c:s', 'mov_text');

            // Set metadata for the subtitle track (optional but good practice)
            args.push('-metadata:s:s:0', 'language=chi');
            args.push('-metadata:s:s:0', 'title=Subtitle');
            args.push('-metadata:s:s:0', 'handler_name=Subtitle');

            // Fix: Mark subtitle track as default so players show it automatically
            args.push('-disposition:s:0', 'default');

            // If complexFilter is present (e.g. for Eraser), we need to use it for the video stream
            // But complex filter output needs to be mapped instead of 0:v
            if (typeof complexFilter !== 'undefined') {
                // Remove previously added -map 0:v
                // Actually, we should construct args differently if filter is present
                // Let's restructure below
            }
        } else {
            // Hard burn or no subtitle
            if (vf) {
                args.push('-vf', vf);
            } else if (typeof complexFilter !== 'undefined') {
                args.push('-filter_complex', complexFilter);
                args.push('-map', complexFilterLabel || '[outv]');
                args.push('-map', '0:a?');
            } else if (subtitleContent) {
                args.push('-vf', `subtitles=${subtitleName}:fontsdir=/fonts`);
            }
        }

        // Handle Soft Sub + Filter case (Eraser + Soft Sub)
        if (softSub && subtitleContent && typeof complexFilter !== 'undefined') {
            // Reset args to handle this specific case correctly
            // args so far: ['-i', videoName, '-i', subtitleName, '-map', '0:v', ...]
            // We need to clear and rebuild
            args.length = 0;
            args.push('-i', videoName);
            args.push('-i', subtitleName);

            args.push('-filter_complex', complexFilter);
            args.push('-map', complexFilterLabel || '[outv]'); // Map filtered video
            args.push('-map', '0:a?'); // Map audio
            args.push('-map', '1:0'); // Map subtitle from second input

            args.push('-c:s', 'mov_text');
            args.push('-metadata:s:s:0', 'language=chi');
            args.push('-metadata:s:s:0', 'handler_name=Subtitle');
            // Fix: Mark subtitle track as default so players show it automatically
            args.push('-disposition:s:0', 'default');
        }

        // Optimize for speed and size balance
        // -preset ultrafast is too large (low compression).
        // -preset veryfast is a good middle ground for WASM.
        // -crf 23 is default, but for web 28 is smaller with acceptable quality.
        // Let's use -crf 26 and -preset veryfast to reduce size significantly while keeping decent speed.
        // Bitrate control: Using CRF (Constant Rate Factor) often yields unpredictable bitrates for different contents.
        // The user complained about bitrate inflation (2000k -> 6800k).
        // To strictly control size/bitrate, we should use a higher CRF (lower quality/size) or maxrate.
        // Increasing CRF to 30 to aggressively reduce bitrate while keeping 'ultrafast'.
        // Also adding -maxrate and -bufsize to constrain spikes.

        // Quality settings mapping
        // High: CRF 23 (Default good quality)
        // Medium: CRF 28 (Balanced, web standard)
        // Low: CRF 32 (Smaller size)

        let crf = '28';
        let preset = 'superfast';
        let useBitrate = false;

        if (quality === 'custom' && customBitrate) {
            useBitrate = true;
            preset = 'superfast'; // Use superfast for custom bitrate too to keep speed
        } else if (quality === 'high') {
            crf = '23';
        } else if (quality === 'low') {
            crf = '32';
            preset = 'ultrafast'; // Use faster preset for low quality to speed up
        } else {
            // Medium
            crf = '28';
        }

        // If resolution is downscaled (e.g. 480p), we can afford a lower CRF (higher quality) for same bitrate,
        // OR keep same CRF for much lower bitrate. 
        // Keeping CRF constant is usually the right approach for "same visual quality".

        if (useBitrate) {
            args.push('-c:v', 'libx264', '-preset', preset, '-b:v', `${customBitrate}k`, '-maxrate', `${parseInt(customBitrate) * 1.5}k`, '-bufsize', `${parseInt(customBitrate) * 2}k`);
        } else {
            args.push('-c:v', 'libx264', '-preset', preset, '-crf', crf);
        }

        // Audio: copy to avoid encoding issues
        args.push('-c:a', 'copy');

        // Single threading to avoid function signature mismatch
        // args.push('-threads', '1');

        args.push(outputName);

        await ffmpeg.run(...args);

        const data = ffmpeg.FS('readFile', outputName);

        // Cleanup
        try { ffmpeg.FS('unlink', videoName); } catch (e) { }
        try { if (subtitleContent) ffmpeg.FS('unlink', subtitleName); } catch (e) { }
        try { ffmpeg.FS('unlink', outputName); } catch (e) { }

        return new Blob([data.buffer], { type: 'video/mp4' });
    }
};

export const extractAudio = async (videoFile, onProgress) => {
    const ffmpeg = await loadFFmpeg();
    const videoName = 'input.mp4';
    const audioName = 'output.mp3';

    ffmpeg.FS('writeFile', videoName, await fetchFile(videoFile));

    if (onProgress) {
        ffmpeg.setProgress(onProgress);
    }

    // Extract audio: -vn (no video), -acodec libmp3lame, -q:a 2 (high quality)
    await ffmpeg.run(
        '-i', videoName,
        '-vn',
        '-acodec', 'libmp3lame',
        '-q:a', '2',
        audioName
    );

    const data = ffmpeg.FS('readFile', audioName);

    // Cleanup
    ffmpeg.FS('unlink', videoName);
    ffmpeg.FS('unlink', audioName);

    return new Blob([data.buffer], { type: 'audio/mp3' });
};

export const extractSubtitles = async (videoFile) => {
    const ffmpeg = await loadFFmpeg();
    const videoName = 'input_subs.mp4';

    ffmpeg.FS('writeFile', videoName, await fetchFile(videoFile));

    // Probe file info to find subtitle streams
    // Since ffmpeg.wasm might not have ffprobe, we run ffmpeg -i
    // And parse stderr output

    let output = '';
    const logger = ({ message }) => {
        output += message + '\n';
    };
    ffmpeg.setLogger(logger);

    try {
        await ffmpeg.run('-i', videoName);
    } catch (e) {
        // ffmpeg -i always fails with "At least one output file must be specified"
        // but we just want the info
    }

    ffmpeg.setLogger(() => { }); // Reset logger

    // Parse streams
    const streams = [];
    const lines = output.split('\n');
    for (const line of lines) {
        // Match Stream #0:2(eng): Subtitle: subrip (default)
        // Stream #0:3(chi): Subtitle: mov_text
        const match = line.match(/Stream #0:(\d+)(?:\(([a-zA-Z0-9]+)\))?: Subtitle: (.*)/);
        if (match) {
            streams.push({
                index: match[1],
                lang: match[2] || 'und',
                codec: match[3].split(' ')[0], // simple codec name
                info: match[0].trim()
            });
        }
    }

    if (streams.length === 0) {
        ffmpeg.FS('unlink', videoName);
        return [];
    }

    // Extract each stream
    const extractedSubs = [];

    for (const stream of streams) {
        // Only support text-based subs roughly (srt, ass, vtt, mov_text converted to srt)
        // We will try to convert everything to srt or ass
        const outName = `out_${stream.index}.srt`;

        try {
            // Check codec. If it's mov_text (MP4 soft sub), we need to convert it to srt explicitly.
            // Actually, ffmpeg usually auto-converts based on output extension (.srt).
            // But let's be explicit if needed.

            await ffmpeg.run(
                '-i', videoName,
                '-map', `0:${stream.index}`,
                outName
            );

            const data = ffmpeg.FS('readFile', outName);
            const blob = new Blob([data.buffer], { type: 'text/plain' }); // SRT is text

            // If the file is empty, extraction failed or stream is empty
            if (blob.size === 0) {
                console.warn(`Stream ${stream.index} is empty`);
                continue;
            }

            const file = new File([blob], `track_${stream.index}_${stream.lang}.srt`, { type: 'text/plain' });

            extractedSubs.push({
                ...stream,
                file
            });

            ffmpeg.FS('unlink', outName);
        } catch (e) {
            console.warn(`Failed to extract stream ${stream.index}`, e);
        }
    }

    ffmpeg.FS('unlink', videoName);
    return extractedSubs;
};

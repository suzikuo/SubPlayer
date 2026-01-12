import Tesseract from 'tesseract.js';

/**
 * Detects text regions in a given image data URL or HTMLImageElement/HTMLCanvasElement.
 * Optimized for subtitle detection (focusing on bottom area by default if fullFrame is false).
 * 
 * @param {string|HTMLElement} imageSource - Image source
 * @returns {Promise<{x: number, y: number, w: number, h: number} | null>} - Bounding box of detected text
 */
export const detectSubtitleRegion = async (imageSource) => {
    try {
        const worker = await Tesseract.createWorker('eng+chi_sim', 1, {
            logger: m => console.log(m),
            workerPath: '/tesseract/worker.min.js',
            corePath: '/tesseract/tesseract-core.wasm.js',
        });

        const { data: { words } } = await worker.recognize(imageSource);
        await worker.terminate();

        if (!words || words.length === 0) return null;

        // Calculate bounding box containing all words
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        words.forEach(word => {
            if (word.confidence > 60) { // Filter low confidence results
                const { x0, y0, x1, y1 } = word.bbox;
                if (x0 < minX) minX = x0;
                if (y0 < minY) minY = y0;
                if (x1 > maxX) maxX = x1;
                if (y1 > maxY) maxY = y1;
            }
        });

        if (minX === Infinity) return null;

        // Add some padding
        const padding = 5;
        return {
            x: Math.max(0, minX - padding),
            y: Math.max(0, minY - padding),
            w: (maxX - minX) + (padding * 2),
            h: (maxY - minY) + (padding * 2)
        };
    } catch (error) {
        console.error('OCR Error:', error);
        return null;
    }
};

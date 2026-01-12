
function hexToAssColor(hex, alpha = 0) {
    // Hex: #RRGGBB or #RRGGBBAA
    if (!hex) return '&H00FFFFFF';
    hex = hex.replace('#', '');
    
    let r, g, b;
    if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
    } else {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
    }

    // ASS Color: &HAABBGGRR
    // Alpha: 00 (opaque) to FF (transparent)
    // If input has alpha, handle it? Currently styleConfig doesn't seem to have alpha in color hex.
    // But we accept an alpha argument (0-255, 0=opaque).
    
    const aStr = alpha.toString(16).padStart(2, '0').toUpperCase();
    const bStr = b.toString(16).padStart(2, '0').toUpperCase();
    const gStr = g.toString(16).padStart(2, '0').toUpperCase();
    const rStr = r.toString(16).padStart(2, '0').toUpperCase();

    return `&H${aStr}${bStr}${gStr}${rStr}`;
}

function formatTime(seconds) {
    // h:mm:ss.cc
    const date = new Date(null);
    date.setMilliseconds(seconds * 1000);
    const h = Math.floor(seconds / 3600);
    const m = date.getUTCMinutes();
    const s = date.getUTCSeconds();
    const ms = Math.floor(date.getUTCMilliseconds() / 10); // ASS uses centiseconds (2 digits)
    
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export default function generateASS(subtitles, styleConfig) {
    // Map font family to available fonts in ffmpeg.wasm environment
    // We only have Noto Sans CJK SC and Noto Serif CJK SC available via download
    const isSerif = styleConfig.fontFamily.includes('serif') && !styleConfig.fontFamily.includes('sans-serif');
    const fontName = isSerif ? 'Noto Serif CJK SC' : 'Noto Sans CJK SC';

    // Calculate colors
    const primaryColor = hexToAssColor(styleConfig.color);
    const outlineColor = hexToAssColor('#000000'); // Black outline default
    const backColor = hexToAssColor('#000000', 128); // Semi-transparent shadow/box

    // Background Color handling (if it's a box)
    // StyleConfig has backgroundColor (rgba usually, or hex)
    // But standard ASS style just defines Outline/Shadow.
    // If we want a box (OpaqueBox), we need BorderStyle=3.
    // Standard subtitles usually use BorderStyle=1 (Outline + Drop Shadow).
    
    // Let's stick to Outline for now as it's standard for video burning.
    // If the user wants a background box, we might need BorderStyle=3.
    // styleConfig.backgroundColor defaults to 'rgba(0, 0, 0, 0.6)' in Store.js
    // We'll stick to BorderStyle=1 (Outline) for cleaner look unless requested.

    const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${styleConfig.fontSize},${primaryColor},&H000000FF,${outlineColor},${backColor},0,0,0,0,100,100,${styleConfig.letterSpacing},0,1,2,0,2,10,10,${styleConfig.bottom},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    const events = subtitles.map(sub => {
        const start = formatTime(sub.startTime);
        const end = formatTime(sub.endTime);
        let text = sub.text.replace(/\n/g, '\\N');

        // Handle per-subtitle style overrides
        let overrides = '';
        if (sub.style) {
            // Position
            if (sub.style.x !== undefined && sub.style.y !== undefined) {
                // \pos(x,y)
                overrides += `\\pos(${sub.style.x},${sub.style.y})`;
            }
            
            // Color
            if (sub.style.color) {
                overrides += `\\c${hexToAssColor(sub.style.color)}`;
            }
            
            // Font Size
            if (sub.style.fontSize) {
                overrides += `\\fs${sub.style.fontSize}`;
            }
        }

        if (overrides) {
            text = `{${overrides}}${text}`;
        }

        return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
    }).join('\n');

    return header + events;
}

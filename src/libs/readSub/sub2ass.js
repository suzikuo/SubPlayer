const toSubTime = (str) => {
    if (!str) return '00:00:00.00';
    let n = [];
    let sx = '';
    let x = str.replace(',', '.').split(/[:.]/).map((x) => Number(x));
    x[3] = '0.' + ('00' + x[3]).slice(-3);
    sx = (x[0] * 60 * 60 + x[1] * 60 + x[2] + Number(x[3])).toFixed(2);
    sx = sx.toString().split('.');
    n.unshift(sx[1]);
    sx = Number(sx[0]);
    n.unshift(('0' + (sx % 60).toString()).slice(-2));
    n.unshift(('0' + (Math.floor(sx / 60) % 60).toString()).slice(-2));
    n.unshift((Math.floor(sx / 3600) % 60).toString());
    return n.slice(0, 3).join(':') + '.' + n[3];
};

const toAssColor = (colorStr) => {
    if (!colorStr) return '&H00FFFFFF';

    // Handle hex #RRGGBB
    if (colorStr.startsWith('#')) {
        const r = colorStr.slice(1, 3);
        const g = colorStr.slice(3, 5);
        const b = colorStr.slice(5, 7);
        return `&H00${b}${g}${r}`.toUpperCase();
    }

    // Handle rgba(r, g, b, a)
    const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
        const [, r, g, b] = match;
        const toHex = (n) => parseInt(n).toString(16).padStart(2, '0');
        return `&H00${toHex(b)}${toHex(g)}${toHex(r)}`.toUpperCase();
    }

    return '&H00FFFFFF';
};

export default function sub2ass(sub, style = {}) {
    const {
        fontSize = 48,
        color = '#ffffff',
        backgroundColor = '#000000',
        fontFamily = 'sans-serif',
        bottom = 20, // This maps to MarginV
        letterSpacing = 0,
        displayMode = 'main',
        videoWidth = 1920,
        videoHeight = 1080,
    } = style;

    const secondaryScale = 0.8;
    // Removed legacy 1920x1080 scaling to support WYSIWYG with real video resolution
    // All inputs (fontSize, positions) are now expected to be in video resolution pixels

    const primaryColor = toAssColor(color);
    const outlineColor = toAssColor(backgroundColor);
    const backColor = '&H00000000'; // Shadow color, usually black transparent or same as outline

    // Map fonts to Noto CJK (Sans or Serif)
    // FIX: Check for sans-serif first to avoid false positives with 'serif' substring
    const isSans = fontFamily.includes('sans-serif');
    const isSerif = !isSans && (
        fontFamily.includes('serif') ||
        fontFamily.includes('KaiTi') ||
        fontFamily.includes('SongTi') ||
        fontFamily.includes('Times') ||
        fontFamily.includes('Georgia')
    );

    const fontName = isSerif ? 'Noto Serif CJK SC' : 'Noto Sans CJK SC';
    const assFontSize = displayMode === 'secondary' ? Math.round(fontSize * secondaryScale) : fontSize;
    // Add 10px to MarginV to account for the internal padding (10px) used in the Player.js preview box
    const marginV = bottom + 10;
    const spacing = letterSpacing;
    const outline = 2.5; // Slightly thicker outline for better visibility
    const shadow = 1.5;    // Small shadow for depth
    // Frontend width is 80%, so margin is 10% on each side
    const marginLR = Math.round((videoWidth || 1920) * 0.1);

    return `
[Script Info]
Synch Point:1
ScriptType:v4.00+
Collisions:Normal
PlayResX: ${videoWidth || 1920}
PlayResY: ${videoHeight || 1080}
ScaledBorderAndShadow: yes
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default, ${fontName}, ${assFontSize}, ${primaryColor}, &H000000FF, ${outlineColor}, ${backColor}, 0, 0, 0, 0, 100, 100, ${spacing}, 0, 1, ${outline}, ${shadow}, 2, ${marginLR}, ${marginLR}, ${marginV}, 1

[Events]
Format: Layer, Start, End, Style, Actor, MarginL, MarginR, MarginV, Effect, Text
${sub
            .map((item) => {
                const start = toSubTime(item.start);
                const end = toSubTime(item.end);

                const mainText = (item.text || '').replace(/\r?\n/g, '\\N');
                const secondaryText = (item.text2 || '').replace(/\r?\n/g, '\\N');

                let text = '';
                if (displayMode === 'secondary') {
                    text = secondaryText;
                } else if (displayMode === 'dual') {
                    // In Player.js, there is 10px top pad (Main), 5px gap, 10px bottom pad (Sec). Total ~25px extra space.
                    // We inject a transparent line to simulate this vertical spacing.
                    const spacer = `\\N{\\fs25\\1a&HFF&} \\N`;

                    if (secondaryText && mainText) {
                        const baseMainSize = item.style && item.style.fontSize ? Math.round(Number(item.style.fontSize)) : assFontSize;
                        const baseSecondarySize = Math.round(baseMainSize * secondaryScale);
                        text = `{\\fs${baseSecondarySize}}${secondaryText}${spacer}{\\fs${baseMainSize}}${mainText}`;
                    } else if (secondaryText) {
                        const baseMainSize = item.style && item.style.fontSize ? Math.round(Number(item.style.fontSize)) : assFontSize;
                        const baseSecondarySize = Math.round(baseMainSize * secondaryScale);
                        text = `{\\fs${baseSecondarySize}}${secondaryText}`;
                    } else {
                        const baseMainSize = item.style && item.style.fontSize ? Math.round(Number(item.style.fontSize)) : assFontSize;
                        text = `{\\fs${baseMainSize}}${mainText}`;
                    }
                } else {
                    text = mainText;
                }

                if (!text) return null;

                let overrides = '';
                if (item.style) {
                    if (item.style.x !== undefined && item.style.y !== undefined) {
                        const posX = Math.round(Number(item.style.x));
                        const posY = Math.round(Number(item.style.y));
                        overrides += `\\pos(${posX},${posY})`;
                    }

                    if (item.style.color) {
                        overrides += `\\c${toAssColor(item.style.color)}`;
                    }

                    if (item.style.fontSize && displayMode !== 'dual') {
                        const baseSize = Math.round(Number(item.style.fontSize));
                        const targetSize =
                            displayMode === 'secondary'
                                ? Math.round(baseSize * secondaryScale)
                                : baseSize;
                        overrides += `\\fs${targetSize}`;
                    }

                    if (item.style.fontFamily) {
                        const iSans = item.style.fontFamily.includes('sans-serif');
                        const iSerif = !iSans && (
                            item.style.fontFamily.includes('serif') ||
                            item.style.fontFamily.includes('KaiTi') ||
                            item.style.fontFamily.includes('SongTi') ||
                            item.style.fontFamily.includes('Times') ||
                            item.style.fontFamily.includes('Georgia')
                        );
                        const fName = iSerif ? 'Noto Serif CJK SC' : 'Noto Sans CJK SC';
                        overrides += `\\fn${fName}`;
                    }
                }

                if (overrides) {
                    text = `{${overrides}}${text}`;
                }

                return `Dialogue: 0,${start},${end},Default,NTP,0000,0000,0000,,${text}`;
            })
            .filter(Boolean)
            .join('\n')}
    `.trim();
}

import { createGlobalStyle } from 'styled-components';

export default createGlobalStyle`
    @font-face {
        font-family: 'Noto Sans CJK SC';
        src: url('https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf') format('opentype');
        font-style: normal;
        font-weight: 400;
        font-display: swap;
    }

    @font-face {
        font-family: 'Noto Serif CJK SC';
        src: url('https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Serif/OTF/SimplifiedChinese/NotoSerifCJKsc-Regular.otf') format('opentype');
        font-style: normal;
        font-weight: 400;
        font-display: swap;
    }

    :root {
        --bg-primary: #0f172a;
        --bg-secondary: #1e293b;
        --bg-tertiary: #334155;
        --text-primary: #f8fafc;
        --text-secondary: #94a3b8;
        --accent: #3b82f6;
        --accent-hover: #2563eb;
        --danger: #ef4444;
        --border: #334155;
        --radius: 8px;
        --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    }

    html,
    body,
    #root {
        height: 100%;
        margin: 0;
        padding: 0;
        background-color: var(--bg-primary);
        color: var(--text-primary);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    body {
        line-height: 1.5;
        overflow: hidden;
    }

    *, *::before, *::after {
        box-sizing: border-box;
    }

    #root {
        display: flex;
        flex-direction: column;
    }

    ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }

    ::-webkit-scrollbar-track {
        background: var(--bg-primary); 
    }

    ::-webkit-scrollbar-thumb {
        background: var(--bg-tertiary); 
        border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
        background: var(--text-secondary); 
    }

    button {
        cursor: pointer;
        font-family: inherit;
    }
`;

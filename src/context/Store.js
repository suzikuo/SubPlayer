import React, { createContext, useState, useRef, useCallback, useMemo } from 'react';
import isEqual from 'lodash/isEqual';
import Sub from '../libs/Sub';

export const StoreContext = createContext(null);

export const StoreProvider = ({ children }) => {
    const subtitleHistory = useRef([]);
    const [player, setPlayer] = useState(null);
    const [loading, setLoading] = useState('');
    const [processing, setProcessing] = useState(0);
    const [language, setLanguage] = useState('en');
    const [subtitle, setSubtitleOriginal] = useState([]);
    const [subtitleSecond, setSubtitleSecondOriginal] = useState([]);
    const [waveform, setWaveform] = useState(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [videoFile, setVideoFile] = useState(null);
    const [videoMeta, setVideoMeta] = useState({ width: 1920, height: 1080 });
    const [displayMode, setDisplayMode] = useState('dual');
    const [styleConfig, setStyleConfig] = useState({
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        fontSize: 30,
        letterSpacing: 0,
        bottom: 50,
        fontFamily: 'Arial, Helvetica, sans-serif',
    });
    const [eraserRegion, setEraserRegion] = useState(null); // {x, y, w, h} or null
    const [eraserStrength, setEraserStrength] = useState(50);
    // 50 will be default. 
    // We will treat this as a switch:
    // Low strength -> Gaussian Blur (sigma dependent on strength)
    // High/Max strength (or specific mode) -> Delogo (Aggressive removal)
    // Or just Map 0-100 to Blur Sigma?
    // "Erasure" usually implies Delogo. 
    // But Delogo can be too aggressive (smudgy).
    // Let's implement: 
    // 0-90: Gaussian Blur (sigma 0 to 20)
    // >90: Delogo (Remove)
    // Or maybe a checkbox for "Mode: Blur / Remove"? 
    // Let's keep it simple: Slider "Intensity". 
    // Actually, Delogo is the "Remove" feature. Blur is just hiding.
    // User complaint "Looks like completely blocked" might refer to the preview overlay being opaque?
    // Wait, in Player.js:
    // const EraserOverlay = styled.div`... background: rgba(0,0,0,0.1); backdrop-filter: blur(8px); ...`
    // The PREVIEW itself is a blur box. 
    // Maybe they are talking about the PREVIEW? "Now it looks like it's completely blocked".
    // If they mean the preview, adjusting opacity/blur of the preview would be nice.
    // If they mean the final output, we need to adjust ffmpeg filter.
    // I will assume they mean the final output (or both).
    // Let's allow adjusting the "Strength" which maps to:
    // - Preview: backdrop-filter blur radius
    // - Export: boxblur filter power (or delogo if maxed?)

    // Let's standardise: 
    // We will use 'boxblur' for variable strength erasure. 
    // Delogo is fixed. 
    // Let's give user a choice? Or just use boxblur?
    // Delogo is better for removing text and filling with surrounding. 
    // Boxblur just makes it unreadable.
    // If "completely blocked" means "I see a big smudge", then maybe they want less smudge.
    // I will implement a slider that controls Gaussian Blur sigma. 
    // If the slider is at max, maybe switch to delogo? 
    // Or just stick to blur as it's more "tunable".
    // Let's try adding 'eraserMode' later if needed. For now, 'eraserStrength' 0-100.

    const [smartErasure, setSmartErasure] = useState(false); // Only erase when subtitle exists
    const [showEraserPreview, setShowEraserPreview] = useState(false);
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [previewImages, setPreviewImages] = useState([]);
    const [layout, setLayout] = useState(() => {
        const saved = window.localStorage.getItem('layout');
        return saved ? JSON.parse(saved) : {
            timelineHeight: 160,
            configHeight: 180,
            rightWidth: 400,
            showTimeline: true
        };
    });

    const updateLayout = useCallback((newLayout) => {
        setLayout(prev => {
            const updated = { ...prev, ...newLayout };
            window.localStorage.setItem('layout', JSON.stringify(updated));
            return updated;
        });
    }, []);

    const newSub = useCallback((item) => new Sub(item), []);

    const formatSub = useCallback(
        (sub) => {
            if (Array.isArray(sub)) {
                return sub.map((item) => newSub(item));
            }
            return newSub(sub);
        },
        [newSub],
    );

    const setSubtitle = useCallback(
        (newSubtitle, saveToHistory = true) => {
            if (!isEqual(newSubtitle, subtitle)) {
                if (saveToHistory) {
                    if (subtitleHistory.current.length >= 1000) {
                        subtitleHistory.current.shift();
                    }
                    subtitleHistory.current.push(formatSub(subtitle));
                }
                window.localStorage.setItem('subtitle', JSON.stringify(newSubtitle));
                setSubtitleOriginal(newSubtitle);
            }
        },
        [subtitle, formatSub],
    );

    const setSubtitleSecond = useCallback(
        (newSubtitle) => {
            if (!isEqual(newSubtitle, subtitleSecond)) {
                // No history for second subtitle for now
                // window.localStorage.setItem('subtitleSecond', JSON.stringify(newSubtitle)); 
                setSubtitleSecondOriginal(newSubtitle);
            }
        },
        [subtitleSecond],
    );

    const undoSubs = useCallback(() => {
        const subs = subtitleHistory.current.pop();
        if (subs) {
            setSubtitle(subs, false);
        }
    }, [setSubtitle]);

    const clearSubs = useCallback(() => {
        setSubtitle([]);
        subtitleHistory.current.length = 0;
    }, [setSubtitle]);

    const value = useMemo(() => ({
        player, setPlayer,
        loading, setLoading,
        processing, setProcessing,
        language, setLanguage,
        subtitle, setSubtitle,
        subtitleSecond, setSubtitleSecond,
        waveform, setWaveform,
        playing, setPlaying,
        currentTime, setCurrentTime,
        currentIndex, setCurrentIndex,
        videoFile, setVideoFile,
        videoMeta, setVideoMeta,
        displayMode, setDisplayMode,
        styleConfig, setStyleConfig,
        eraserRegion, setEraserRegion,
        eraserStrength, setEraserStrength,
        smartErasure, setSmartErasure,
        showEraserPreview, setShowEraserPreview,
        showCreateTask, setShowCreateTask,
        showExportModal, setShowExportModal,
        previewImages, setPreviewImages,
        layout, updateLayout,
        undoSubs,
        clearSubs
    }), [
        player, loading, processing, language, subtitle, subtitleSecond, waveform, playing, currentTime, currentIndex,
        videoFile, videoMeta, displayMode,
        styleConfig, eraserRegion, eraserStrength, smartErasure, showEraserPreview, showCreateTask, showExportModal, previewImages,
        layout, updateLayout,
        setSubtitle, setSubtitleSecond, undoSubs, clearSubs
    ]);

    return (
        <StoreContext.Provider value={value}>
            {children}
        </StoreContext.Provider>
    );
};

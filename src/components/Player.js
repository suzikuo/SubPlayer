import React, { useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import TextareaAutosize from 'react-textarea-autosize';
import Artplayer from 'artplayer';
import artplayerPluginChromecast from 'artplayer-plugin-chromecast';
import { StoreContext } from '../context/Store';
import Sub from '../libs/Sub';

import SubtitleStyleModal from './SubtitleStyleModal';

const PlayerContainer = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #000;
    position: relative;
    overflow: hidden;

    .artplayer-app {
        width: 100%;
        height: 100%;
    }
`;



const SubtitleOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 21;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    // padding-bottom is handled inline to avoid styled-component prop complexity with dynamic scaling
`;



const EraserOverlay = styled.div`
    position: absolute;
    /* Remove blue background, only use backdrop-filter for blur. 
       If strength is high (delogo mode), maybe show a very faint outline or nothing?
       User requested "try to match original video background". 
       Backdrop-filter blur is the best approximation for "what it will look like" (blurred).
       For Delogo (removal), it's interpolation, which is hard to simulate with CSS. 
       But blur is a good enough proxy. 
       We remove the background color to avoid "blue box".
    */
    backdrop-filter: ${props => `blur(${props.$strength / 5}px)`};
    /* Optional: minimal border to see where it is when strength is low? 
       Or maybe just a very faint shadow? */
    box-shadow: 0 0 2px rgba(255, 255, 255, 0.2); 
    
    z-index: 10;
    pointer-events: none;
    left: ${props => props.$x * (props.$scaleX || 1) + (props.$offsetX || 0)}px;
    top: ${props => props.$y * (props.$scaleY || 1) + (props.$offsetY || 0)}px;
    width: ${props => props.$w * (props.$scaleX || 1)}px;
    height: ${props => props.$h * (props.$scaleY || 1)}px;
    
    /* Smart Erasure: Toggle visibility based on props */
    opacity: ${props => props.$visible ? 1 : 0};
    transition: opacity 0.2s;
`;

const resolveAssFontName = (fontFamily = '') => {
    const isSans = fontFamily.includes('sans-serif');
    const isSerif = !isSans && (
        fontFamily.includes('serif') ||
        fontFamily.includes('KaiTi') ||
        fontFamily.includes('SongTi') ||
        fontFamily.includes('Times') ||
        fontFamily.includes('Georgia')
    );
    return isSerif ? 'Noto Serif CJK SC' : 'Noto Sans CJK SC';
};

const StyledTextarea = styled(TextareaAutosize)`
    background: ${props => props.$styleConfig.backgroundColor};
    color: ${props => props.$styleConfig.color};
    border: none;
    border-radius: 8px;
    padding: ${props => 10 * (props.$scaleY || 1)}px ${props => 20 * (props.$scaleX || 1)}px;
    line-height: 1.2;
    font-size: ${props => props.$styleConfig.fontSize * (props.$scaleY || 1)}px;
    letter-spacing: ${props => props.$styleConfig.letterSpacing * (props.$scaleX || 1)}px;
    font-family: ${props => props.$styleConfig.fontFamily};
    text-align: center;
    resize: none;
    outline: none;
    pointer-events: auto;
    width: ${props => props.$width || '80%'};
    text-shadow: ${props => `
        -${1.5 * (props.$scaleY || 1)}px -${1.5 * (props.$scaleY || 1)}px 0 ${props.$styleConfig.backgroundColor},
        ${1.5 * (props.$scaleY || 1)}px -${1.5 * (props.$scaleY || 1)}px 0 ${props.$styleConfig.backgroundColor},
        -${1.5 * (props.$scaleY || 1)}px ${1.5 * (props.$scaleY || 1)}px 0 ${props.$styleConfig.backgroundColor},
        ${1.5 * (props.$scaleY || 1)}px ${1.5 * (props.$scaleY || 1)}px 0 ${props.$styleConfig.backgroundColor},
        0 ${2 * (props.$scaleY || 1)}px ${4 * (props.$scaleY || 1)}px rgba(0,0,0,0.8)
    `};
    transition: background 0.2s;

    &:focus {
        background: rgba(0, 0, 0, 0.8);
    }
`;

const SubtitleDisplay = styled.div`
    background: ${props => props.$styleConfig.backgroundColor};
    color: ${props => props.$styleConfig.color};
    border-radius: 8px;
    padding: ${props => 10 * (props.$scaleY || 1)}px ${props => 20 * (props.$scaleX || 1)}px;
    line-height: 1.2;
    font-size: ${props => props.$styleConfig.fontSize * (props.$scaleY || 1)}px;
    letter-spacing: ${props => props.$styleConfig.letterSpacing * (props.$scaleX || 1)}px;
    font-family: ${props => props.$styleConfig.fontFamily};
    text-align: center;
    width: ${props => props.$width || '80%'};
    text-shadow: ${props => `
        -${1.5 * (props.$scaleY || 1)}px -${1.5 * (props.$scaleY || 1)}px 0 ${props.$styleConfig.backgroundColor},
        ${1.5 * (props.$scaleY || 1)}px -${1.5 * (props.$scaleY || 1)}px 0 ${props.$styleConfig.backgroundColor},
        -${1.5 * (props.$scaleY || 1)}px ${1.5 * (props.$scaleY || 1)}px 0 ${props.$styleConfig.backgroundColor},
        ${1.5 * (props.$scaleY || 1)}px ${1.5 * (props.$scaleY || 1)}px 0 ${props.$styleConfig.backgroundColor},
        0 ${2 * (props.$scaleY || 1)}px ${4 * (props.$scaleY || 1)}px rgba(0,0,0,0.8)
    `};
    white-space: pre-wrap;
`;

const EditButton = styled.button`
    position: absolute;
    right: -30px;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(0, 0, 0, 0.5);
    color: white;
    border: none;
    border-radius: 4px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: auto;
    
    &:hover {
        background: rgba(0, 0, 0, 0.8);
    }
`;

const SubtitleLine = styled.div`
    position: relative;
    width: ${props => props.$width || '80%'};
    display: flex;
    justify-content: center;
    pointer-events: none;
    
    &:hover ${EditButton} {
        opacity: 1;
    }
`;

const EditIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2.69l5.74 5.88-5.74 5.88-5.74-5.88L12 2.69M12 2L5.12 8.96 12 16l6.88-7.04L12 2z" />
        <circle cx="12" cy="9" r="2" />
    </svg>
);

export default function Player() {
    const {
        setPlayer,
        setCurrentTime,
        setPlaying,
        playing,
        subtitle,
        setSubtitle,
        subtitleSecond,
        setSubtitleSecond,
        currentTime,
        styleConfig,
        displayMode,
        eraserRegion,
        eraserStrength,
        smartErasure,
        showEraserPreview,
        setVideoMeta,
        currentIndex,
        setCurrentIndex
    } = useContext(StoreContext);

    const artRef = useRef(null);
    const containerRef = useRef(null);
    const [layerElement, setLayerElement] = useState(null);
    // const [currentIndex, setCurrentIndex] = useState(-1); // Use context instead
    const [currentIndexSecond, setCurrentIndexSecond] = useState(-1);
    const [editingStyleIndex, setEditingStyleIndex] = useState(null);
    const [resizeState, setResizeState] = useState({
        scale: 1,
        videoWidth: 1920,
        videoHeight: 1080,
        offsetX: 0,
        offsetY: 0
    });

    const updateSub = (index, sub) => {
        setSubtitle(prev => {
            const newSub = [...prev];
            newSub[index] = sub;
            return newSub;
        });
    };

    useEffect(() => {
        if (!containerRef.current) return;

        const updateResizeScale = () => {
            const container = containerRef.current;
            const art = artRef.current;
            const video = art ? art.template.$video : null;
            if (!container || !video) return;

            const { videoWidth, videoHeight } = video;
            const { clientWidth, clientHeight } = container;
            if (!clientWidth || !clientHeight) return;

            if (videoWidth && videoHeight) {
                const videoRatio = videoWidth / videoHeight;
                const containerRatio = clientWidth / clientHeight;

                let displayedWidth;
                let displayedHeight;
                if (containerRatio > videoRatio) {
                    displayedHeight = clientHeight;
                    displayedWidth = Math.round(displayedHeight * videoRatio);
                } else {
                    displayedWidth = clientWidth;
                    displayedHeight = Math.round(displayedWidth / videoRatio);
                }

                setResizeState({
                    scale: displayedWidth / videoWidth,
                    videoWidth,
                    videoHeight,
                    offsetX: (clientWidth - displayedWidth) / 2,
                    offsetY: (clientHeight - displayedHeight) / 2
                });
                // Update global video meta for export and other components
                setVideoMeta(prev => {
                    if (prev.width === videoWidth && prev.height === videoHeight) return prev;
                    return { width: videoWidth, height: videoHeight };
                });
            } else {
                setResizeState({
                    scale: clientWidth / 1920,
                    videoWidth: 1920,
                    videoHeight: 1080,
                    offsetX: 0,
                    offsetY: 0
                });
                setVideoMeta(prev => {
                    if (prev.width === 1920 && prev.height === 1080) return prev;
                    return { width: 1920, height: 1080 };
                });
            }
        };

        const art = new Artplayer({
            container: containerRef.current,
            url: '',
            title: '',
            volume: 0.5,
            isLive: false,
            muted: false,
            autoplay: false,
            pip: true,
            autoSize: true,
            autoMini: true,
            screenshot: true,
            setting: true,
            loop: false,
            flip: true,
            playbackRate: true,
            aspectRatio: true,
            fullscreen: true,
            fullscreenWeb: false,
            subtitleOffset: false,
            miniProgressBar: true,
            mutex: true,
            backdrop: true,
            playsInline: true,
            autoPlayback: true,
            airplay: true,
            theme: '#23ade5',
            plugins: [
                // artplayerPluginChromecast({}),
            ],
        });

        artRef.current = art;

        // Add a layer for subtitle editing
        const layer = art.layers.add({
            name: 'subtitle-editor',
            html: '',
            style: {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none', // Allow clicks to pass through except for the textarea
                zIndex: 30
            }
        });
        setLayerElement(layer);

        // Expose video element to context and attach art instance
        const video = art.template.$video;

        // Patch play() to suppress "interrupted by pause" errors
        const originalPlay = video.play;
        video.play = function () {
            const playPromise = originalPlay.apply(this, arguments);
            if (playPromise !== undefined) {
                playPromise.catch((error) => {
                    // Silently catch 'interrupted' errors to prevent console noise
                    if (error.name === 'DOMException' && error.message.includes('interrupted')) {
                        // ignore
                    }
                });
            }
            return playPromise;
        };

        video.art = art;
        setPlayer(video);

        art.on('play', () => setPlaying(true));
        art.on('pause', () => setPlaying(false));
        art.on('video:timeupdate', () => setCurrentTime(video.currentTime));

        const resizeObserver = new ResizeObserver(() => updateResizeScale());
        resizeObserver.observe(containerRef.current);
        art.on('video:loadedmetadata', updateResizeScale);
        art.on('resize', updateResizeScale);
        updateResizeScale();

        return () => {
            resizeObserver.disconnect();
            art.off('video:loadedmetadata', updateResizeScale);
            art.off('resize', updateResizeScale);
            if (artRef.current) {
                artRef.current.destroy(false);
            }
            setPlayer(null);
            setLayerElement(null);
        };
    }, [setPlayer, setPlaying, setCurrentTime, setVideoMeta]);

    // Find current subtitle index
    useEffect(() => {
        const index = subtitle.findIndex(item =>
            currentTime >= item.startTime && currentTime <= item.endTime
        );
        setCurrentIndex(index);
    }, [currentTime, subtitle]);

    // Find current secondary subtitle index
    useEffect(() => {
        if (!subtitleSecond || subtitleSecond.length === 0) {
            setCurrentIndexSecond(-1);
            return;
        }
        const index = subtitleSecond.findIndex(item =>
            currentTime >= item.startTime && currentTime <= item.endTime
        );
        setCurrentIndexSecond(index);
    }, [currentTime, subtitleSecond]);

    const handleTextBlur = (e, field) => {
        if (currentIndex !== -1) {
            const newSubtitle = [...subtitle];
            const currentSub = newSubtitle[currentIndex];
            if (currentSub) {
                const updatedSub = new Sub(currentSub);
                updatedSub[field] = e.target.value;
                newSubtitle[currentIndex] = updatedSub;
                setSubtitle(newSubtitle);
            }
        }
    };

    const handleSecondaryTrackBlur = (e) => {
        if (currentIndexSecond !== -1 && subtitleSecond) {
            const newSubtitle = [...subtitleSecond];
            const currentSub = newSubtitle[currentIndexSecond];
            if (currentSub) {
                const updatedSub = new Sub(currentSub);
                updatedSub.text = e.target.value;
                newSubtitle[currentIndexSecond] = updatedSub;
                setSubtitleSecond(newSubtitle);
            }
        }
    };

    // Helper to merge global style with individual style
    const getMergedStyle = (globalConfig, individualStyle) => {
        if (!individualStyle) return globalConfig;

        // Check if individual style has any relevant keys
        const hasStyle = Object.keys(individualStyle).length > 0;
        if (!hasStyle) return globalConfig;

        return {
            ...globalConfig,
            color: individualStyle.color || globalConfig.color,
            fontSize: individualStyle.fontSize || globalConfig.fontSize,
            fontFamily: individualStyle.fontFamily || globalConfig.fontFamily,
            // x and y are handled by the container positioning
        };
    };

    const currentSub = currentIndex !== -1 ? subtitle[currentIndex] : null;
    const mergedStyle = currentSub ? getMergedStyle(styleConfig, currentSub.style) : styleConfig;
    const previewStyle = {
        ...mergedStyle,
        fontFamily: resolveAssFontName(mergedStyle.fontFamily || ''),
    };

    // Determine container overrides from individual style
    const containerStyle = currentSub && currentSub.style ? {
        ...(currentSub.style.x !== undefined && currentSub.style.x !== '' ? { left: currentSub.style.x + 'px', right: 'auto', transform: 'none' } : {}),
        ...(currentSub.style.y !== undefined && currentSub.style.y !== '' ? { top: currentSub.style.y + 'px', bottom: 'auto' } : {})
    } : {};

    // Format container style string for styled-component
    const overrideStyleString = Object.entries(containerStyle)
        .map(([key, value]) => `${key}: ${value};`)
        .join(' ');

    const designScaleX = resizeState.scale;
    const designScaleY = resizeState.scale;

    // Calculate bottom padding based on video scale, not container scale
    // This matches ASS MarginV logic relative to video height
    const scaledBottom = styleConfig.bottom * resizeState.scale;

    // Determine if eraser should be visible based on smart mode and current time
    const isEraserVisible = (() => {
        if (!eraserRegion || !showEraserPreview) return false;
        if (!smartErasure) return true; // Always visible if smart mode is off

        // Smart mode: check if current time is within any subtitle range
        // Add a small tolerance (e.g. 0.2s) to avoid flickering at boundaries
        const tolerance = 0.2;
        return subtitle.some(sub =>
            currentTime >= sub.startTime - tolerance &&
            currentTime <= sub.endTime + tolerance
        );
    })();

    const hasMain = currentIndex !== -1 && subtitle && subtitle[currentIndex];
    const hasSecondTrack = currentIndexSecond !== -1 && subtitleSecond && subtitleSecond[currentIndexSecond];

    // Determine content for secondary display line
    const secondaryContent = hasSecondTrack ? subtitleSecond[currentIndexSecond].text : (hasMain ? subtitle[currentIndex].text2 : '');
    const hasSecondaryContent = !!secondaryContent;

    return (
        <PlayerContainer>
            <div ref={containerRef} className="artplayer-app"></div>
            {eraserRegion && showEraserPreview && (
                <EraserOverlay
                    $x={eraserRegion.x}
                    $y={eraserRegion.y}
                    $w={eraserRegion.w}
                    $h={eraserRegion.h}
                    $scaleX={resizeState.scale}
                    $scaleY={resizeState.scale}
                    $offsetX={resizeState.offsetX}
                    $offsetY={resizeState.offsetY}
                    $strength={eraserStrength}
                    $visible={isEraserVisible}
                />
            )}
            {layerElement && createPortal(
                <SubtitleOverlay
                    $bottom={styleConfig.bottom}
                    $overrideStyle={overrideStyleString}
                    $scaleX={designScaleX}
                    $scaleY={designScaleY}
                    $videoWidth={resizeState.videoWidth}
                    $videoHeight={resizeState.videoHeight}
                    $offsetX={resizeState.offsetX}
                    $offsetY={resizeState.offsetY}
                    style={{ paddingBottom: `${scaledBottom}px` }}
                >
                    {(hasMain || hasSecondaryContent) && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: `${5 * resizeState.scale}px` }}>
                            {/* TODO: Restore this when secondary subtitle feature is needed again
                            {(displayMode === 'dual' || displayMode === 'secondary') && hasSecondaryContent && (
                                <SubtitleLine $width="100%">
                                    {playing ? (
                                        <SubtitleDisplay
                                            $styleConfig={{ ...previewStyle, fontSize: previewStyle.fontSize * 0.8 }}
                                            $videoHeight={resizeState.videoHeight}
                                            $width="80%"
                                            $scaleX={designScaleX}
                                            $scaleY={designScaleY}
                                        >
                                            {secondaryContent}
                                        </SubtitleDisplay>
                                    ) : (
                                        <React.Fragment>
                                            <StyledTextarea
                                                minRows={1}
                                                maxRows={3}
                                                $styleConfig={{ ...previewStyle, fontSize: previewStyle.fontSize * 0.8 }}
                                                $videoHeight={resizeState.videoHeight}
                                                $width="80%"
                                                $scaleX={designScaleX}
                                                $scaleY={designScaleY}
                                                defaultValue={secondaryContent}
                                                onBlur={(e) => hasSecondTrack ? handleSecondaryTrackBlur(e) : handleTextBlur(e, 'text2')}
                                                key={hasSecondTrack
                                                    ? `sec2-${subtitleSecond[currentIndexSecond].startTime}-${subtitleSecond[currentIndexSecond].endTime}-${secondaryContent}`
                                                    : `sec-${subtitle[currentIndex].startTime}-${subtitle[currentIndex].endTime}-${secondaryContent}`
                                                }
                                                spellCheck={false}
                                            />
                                            {!hasSecondTrack && (
                                                <EditButton onClick={() => setEditingStyleIndex(currentIndex)} title="Edit Style">
                                                    <EditIcon />
                                                </EditButton>
                                            )}
                                        </React.Fragment>
                                    )}
                                </SubtitleLine>
                            )}
                            */}
                            {(displayMode === 'dual' || displayMode === 'main') && hasMain && (
                                <SubtitleLine $width="100%">
                                    {playing ? (
                                        <SubtitleDisplay
                                            $styleConfig={previewStyle}
                                            $videoHeight={resizeState.videoHeight}
                                            $width="80%"
                                            $scaleX={designScaleX}
                                            $scaleY={designScaleY}
                                        >
                                            {subtitle[currentIndex].text}
                                        </SubtitleDisplay>
                                    ) : (
                                        <React.Fragment>
                                            <StyledTextarea
                                                minRows={1}
                                                maxRows={3}
                                                $styleConfig={previewStyle}
                                                $videoHeight={resizeState.videoHeight}
                                                $width="80%"
                                                $scaleX={designScaleX}
                                                $scaleY={designScaleY}
                                                defaultValue={subtitle[currentIndex].text}
                                                onBlur={(e) => handleTextBlur(e, 'text')}
                                                key={`main-${subtitle[currentIndex].startTime}-${subtitle[currentIndex].endTime}-${subtitle[currentIndex].text || ''}`}
                                                spellCheck={false}
                                            />
                                            <EditButton onClick={() => setEditingStyleIndex(currentIndex)} title="Edit Style">
                                                <EditIcon />
                                            </EditButton>
                                        </React.Fragment>
                                    )}
                                </SubtitleLine>
                            )}
                        </div>
                    )}
                </SubtitleOverlay>,
                layerElement
            )}
            {editingStyleIndex !== null && subtitle[editingStyleIndex] && (
                <SubtitleStyleModal
                    item={subtitle[editingStyleIndex]}
                    onClose={() => setEditingStyleIndex(null)}
                    onSave={(style) => {
                        updateSub(editingStyleIndex, new Sub({
                            ...subtitle[editingStyleIndex],
                            style: style
                        }));
                        setEditingStyleIndex(null);
                    }}
                    onPreview={(style) => {
                        updateSub(editingStyleIndex, new Sub({
                            ...subtitle[editingStyleIndex],
                            style: style
                        }));
                    }}
                />
            )}
        </PlayerContainer>
    );
}

import React, { useContext, useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { StoreContext } from '../context/Store';
import toast from 'react-hot-toast';
import Tesseract from 'tesseract.js';
import Sub from '../libs/Sub';

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
`;

const Modal = styled.div`
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px;
    width: 600px;
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border);
    padding-bottom: 15px;
    margin-bottom: 5px;
`;

const Title = styled.h3`
    margin: 0;
    color: var(--text-primary);
    font-size: 16px;
`;

const CloseButton = styled.button`
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 20px;
    cursor: pointer;
    
    &:hover {
        color: var(--text-primary);
    }
`;

const PreviewContainer = styled.div`
    position: relative;
    width: 100%;
    max-height: 60vh;
    min-height: 300px;
    background: #000;
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
`;

const Canvas = styled.canvas`
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
`;

const BoundingBox = styled.div`
    position: absolute;
    border: 2px solid var(--accent);
    background: rgba(59, 130, 246, 0.2);
    cursor: move;
    box-sizing: border-box;
    touch-action: none;
    
    &::after {
        content: '';
        position: absolute;
        bottom: 0;
        right: 0;
        width: 10px;
        height: 10px;
        background: var(--accent);
        cursor: nwse-resize;
    }
`;

const ButtonGroup = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 10px;
`;

const Button = styled.button`
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    border: 1px solid transparent;
    
    ${props => props.$primary ? `
        background: var(--accent);
        color: white;
    ` : `
        background: transparent;
        border-color: var(--border);
        color: var(--text-primary);
    `}

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const InfoText = styled.div`
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 5px;
`;

const Controls = styled.div`
    display: flex;
    align-items: center;
    gap: 15px;
    margin-top: 10px;
    flex-wrap: wrap;
`;

const Label = styled.label`
    font-size: 13px;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
`;

const Select = styled.select`
    padding: 4px 8px;
    background-color: var(--bg-primary);
    border: 1px solid var(--border);
    color: var(--text-primary);
    border-radius: 4px;
    outline: none;
    font-size: 12px;
`;

const ProgressBar = styled.div`
    width: 100%;
    height: 6px;
    background: var(--bg-tertiary);
    border-radius: 3px;
    margin-top: 10px;
    overflow: hidden;
    position: relative;
    
    &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: ${props => props.$progress}%;
        background: var(--accent);
        transition: width 0.3s;
    }
`;

const languages = [
    { code: 'eng', name: 'English' },
    { code: 'chi_sim', name: 'Chinese (Simplified)' },
    { code: 'chi_tra', name: 'Chinese (Traditional)' },
    { code: 'jpn', name: 'Japanese' },
    { code: 'kor', name: 'Korean' },
];

export default function SubtitleExtractorModal({ onClose }) {
    const { player, setSubtitle } = useContext(StoreContext);
    const canvasRef = useRef(null);
    const [region, setRegion] = useState(null);
    const [videoDims, setVideoDims] = useState({ width: 0, height: 0 });
    const [containerDims, setContainerDims] = useState({ width: 0, height: 0 });
    const [isMinimized, setIsMinimized] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const previewRef = useRef(null);
    const [containerStyle, setContainerStyle] = useState({});

    // OCR Settings
    const [lang, setLang] = useState('eng');
    const [interval, setInterval] = useState(0.5);
    const [extracting, setExtracting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState('');

    const extractingRef = useRef(false);

    useEffect(() => {
        const updateDims = () => {
            if (!videoDims.width || !videoDims.height) return;

            const aspectRatio = videoDims.width / videoDims.height;
            const maxWidth = 560;
            const maxHeight = window.innerHeight * 0.6;

            let w = maxWidth;
            let h = w / aspectRatio;

            if (h > maxHeight) {
                h = maxHeight;
                w = h * aspectRatio;
            }

            setContainerStyle({
                width: `${w}px`,
                height: `${h}px`,
                minHeight: 'auto'
            });

            requestAnimationFrame(() => {
                if (previewRef.current) {
                    const rect = previewRef.current.getBoundingClientRect();
                    setContainerDims({ width: rect.width, height: rect.height });
                }
            });
        };

        updateDims();
        window.addEventListener('resize', updateDims);
        return () => window.removeEventListener('resize', updateDims);
    }, [videoDims]);

    useEffect(() => {
        if (player && canvasRef.current) {
            const video = player;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            setVideoDims({ width: video.videoWidth, height: video.videoHeight });

            try {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            } catch (error) {
                console.error('Canvas draw error:', error);
            }
        }
    }, [player]);

    const getDisplayMetrics = (currentContainerDims = containerDims) => {
        if (!videoDims.width || !currentContainerDims.width) return { scale: 1, offsetX: 0, offsetY: 0 };
        const scale = currentContainerDims.width / videoDims.width;
        return { scale, offsetX: 0, offsetY: 0 };
    };

    const handleMouseDown = (e) => {
        if (extracting) return;
        if (e.target.closest('button') || e.target.closest(BoundingBox)) return;
        if (!previewRef.current) return;

        const rect = previewRef.current.getBoundingClientRect();
        const currentDims = { width: rect.width, height: rect.height };

        if (rect.width !== containerDims.width || rect.height !== containerDims.height) {
            setContainerDims(currentDims);
        }

        const { scale, offsetX, offsetY } = getDisplayMetrics(currentDims);
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const x = Math.max(0, Math.min(videoDims.width, (mouseX - offsetX) / scale));
        const y = Math.max(0, Math.min(videoDims.height, (mouseY - offsetY) / scale));

        setStartPos({ x, y });
        setRegion({ x, y, w: 0, h: 0 });
        setIsDragging(true);
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !previewRef.current) return;

        const rect = previewRef.current.getBoundingClientRect();
        const currentDims = { width: rect.width, height: rect.height };
        const { scale, offsetX, offsetY } = getDisplayMetrics(currentDims);

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const currentX = Math.max(0, Math.min(videoDims.width, (mouseX - offsetX) / scale));
        const currentY = Math.max(0, Math.min(videoDims.height, (mouseY - offsetY) / scale));

        const x = Math.min(startPos.x, currentX);
        const y = Math.min(startPos.y, currentY);
        const w = Math.abs(currentX - startPos.x);
        const h = Math.abs(currentY - startPos.y);

        setRegion({ x, y, w, h });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const getBoxStyle = () => {
        if (!region || !videoDims.width) return { display: 'none' };
        const currentContainerDims = previewRef.current ?
            { width: previewRef.current.clientWidth, height: previewRef.current.clientHeight } :
            containerDims;
        const { scale, offsetX, offsetY } = getDisplayMetrics(currentContainerDims);
        return {
            left: `${offsetX + region.x * scale}px`,
            top: `${offsetY + region.y * scale}px`,
            width: `${region.w * scale}px`,
            height: `${region.h * scale}px`
        };
    };

    const getPixelDiff = (imgData1, imgData2) => {
        if (!imgData1 || !imgData2) return 1;
        const data1 = imgData1.data;
        const data2 = imgData2.data;
        if (data1.length !== data2.length) return 1;

        let diff = 0;
        const len = data1.length;
        let count = 0;

        for (let i = 0; i < len; i += 4) {
            diff += Math.abs(data1[i] - data2[i]);
            diff += Math.abs(data1[i + 1] - data2[i + 1]);
            diff += Math.abs(data1[i + 2] - data2[i + 2]);
            count += 3;
        }

        return diff / (count * 255);
    };

    const runExtraction = async () => {
        if (!region) return toast.error('Please select a region first');
        if (!player) return;

        setExtracting(true);
        extractingRef.current = true;
        setLogs('Initializing Tesseract...');
        setProgress(0);

        // Minimize window to show progress in background
        setIsMinimized(true);

        try {
            const worker = await Tesseract.createWorker(lang, 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        // setLogs(`Recognizing... ${Math.round(m.progress * 100)}%`);
                    }
                },
                workerPath: '/tesseract/worker.min.js',
                corePath: '/tesseract/tesseract-core.wasm.js',
            });

            const duration = player.duration;
            let currentTime = 0;
            const subs = [];
            let currentSub = null;
            let lastText = '';
            let lastImageData = null;

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = region.w;
            canvas.height = region.h;

            while (currentTime < duration && extractingRef.current) {
                player.currentTime = currentTime;

                // Wait for seek
                await new Promise(resolve => {
                    const onSeek = () => {
                        player.removeEventListener('seeked', onSeek);
                        resolve();
                    };
                    player.addEventListener('seeked', onSeek);
                });

                // Draw region
                ctx.drawImage(
                    player,
                    region.x, region.y, region.w, region.h,
                    0, 0, region.w, region.h
                );

                const imageData = ctx.getImageData(0, 0, region.w, region.h);
                let shouldRunOCR = true;

                if (lastImageData) {
                    const diff = getPixelDiff(lastImageData, imageData);
                    // 2% threshold: if less than 2% of pixels changed, skip OCR
                    if (diff < 0.02) {
                        shouldRunOCR = false;
                    }
                }
                lastImageData = imageData;

                let cleanText = '';
                if (shouldRunOCR) {
                    const dataUrl = canvas.toDataURL('image/png');
                    const { data: { text } } = await worker.recognize(dataUrl);
                    cleanText = text.trim().replace(/\n/g, ' ');
                } else {
                    cleanText = lastText;
                    // setLogs(`Time: ${currentTime.toFixed(1)}s - Skipped (Same frame)`);
                }

                setLogs(`Time: ${currentTime.toFixed(1)}s - Text: ${cleanText.substring(0, 20)}...`);
                setProgress((currentTime / duration) * 100);

                if (cleanText && cleanText.length > 0) {
                    // Simple diff: strictly not equal. 
                    // TODO: fuzzy match?
                    if (cleanText !== lastText) {
                        if (currentSub) {
                            currentSub.endTime = currentTime;
                            subs.push(currentSub);
                            // Real-time update to store
                            setSubtitle(prev => [...prev, currentSub]);
                        }
                        currentSub = new Sub({
                            startTime: currentTime,
                            endTime: currentTime + interval, // temporary end
                            text: cleanText
                        });
                    } else {
                        // Extend current
                        if (currentSub) {
                            currentSub.endTime = currentTime + interval;
                        }
                    }
                } else {
                    // No text
                    if (currentSub) {
                        currentSub.endTime = currentTime;
                        subs.push(currentSub);
                        // Real-time update to store
                        setSubtitle(prev => [...prev, currentSub]);
                        currentSub = null;
                    }
                }

                lastText = cleanText;
                currentTime += interval;
            }

            if (currentSub) {
                currentSub.endTime = currentTime;
                subs.push(currentSub);
                setSubtitle(prev => [...prev, currentSub]);
            }

            await worker.terminate();

            if (extractingRef.current) {
                // Final full sync just in case
                // setSubtitle(subs); 
                toast.success(`Extracted ${subs.length} subtitles`);
                onClose();
            }

        } catch (error) {
            console.error(error);
            toast.error('Extraction failed: ' + error.message);
        } finally {
            setExtracting(false);
            extractingRef.current = false;
        }
    };

    const stopExtraction = () => {
        extractingRef.current = false;
        setExtracting(false);
        setIsMinimized(false);
    };

    if (isMinimized) {
        return (
            <div style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: 1000,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '15px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                width: '300px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>
                        Extracting Subtitles...
                    </div>
                    <button
                        onClick={() => setIsMinimized(false)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                        Maximise
                    </button>
                </div>
                <ProgressBar $progress={progress} />
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {logs}
                </div>
                <Button onClick={stopExtraction} style={{ width: '100%', marginTop: '5px' }}>
                    Stop
                </Button>
            </div>
        );
    }

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={e => e.stopPropagation()}>
                <Header>
                    <Title>Extract Subtitles (OCR)</Title>
                    <CloseButton onClick={onClose}>&times;</CloseButton>
                </Header>

                <div style={{ position: 'relative' }}>
                    <PreviewContainer
                        ref={previewRef}
                        style={containerStyle}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <Canvas ref={canvasRef} />
                        {region && (
                            <BoundingBox
                                style={getBoxStyle()}
                            />
                        )}
                    </PreviewContainer>
                    <InfoText>
                        Draw a box around the subtitle area.
                    </InfoText>
                </div>

                <Controls>
                    <Label>
                        Language:
                        <Select value={lang} onChange={e => setLang(e.target.value)} disabled={extracting}>
                            {languages.map(l => (
                                <option key={l.code} value={l.code}>{l.name}</option>
                            ))}
                        </Select>
                    </Label>

                    <Label>
                        Interval:
                        <Select value={interval} onChange={e => setInterval(Number(e.target.value))} disabled={extracting}>
                            <option value={0.2}>0.2s</option>
                            <option value={0.5}>0.5s</option>
                            <option value={1.0}>1.0s</option>
                            <option value={2.0}>2.0s</option>
                        </Select>
                    </Label>
                </Controls>

                {extracting && (
                    <>
                        <ProgressBar $progress={progress} />
                        <InfoText>{logs}</InfoText>
                    </>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        {region ?
                            `Region: ${Math.round(region.w)}x${Math.round(region.h)}` :
                            'No region set'
                        }
                    </div>
                    <ButtonGroup>
                        {extracting ? (
                            <Button onClick={stopExtraction}>Stop</Button>
                        ) : (
                            <>
                                <Button onClick={() => setRegion(null)} disabled={!region}>Clear</Button>
                                <Button $primary onClick={runExtraction} disabled={!region}>Start Extraction</Button>
                            </>
                        )}
                    </ButtonGroup>
                </div>
            </Modal>
        </Overlay>
    );
}
import React, { useContext, useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { StoreContext } from '../context/Store';
import { detectSubtitleRegion } from '../libs/ocr';
import toast from 'react-hot-toast';

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
    /* Remove fixed aspect-ratio, let it adapt to content but limit max height */
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
    background: ${props => `rgba(59, 130, 246, ${Math.max(0.1, props.$strength / 200)})`};
    backdrop-filter: ${props => `blur(${props.$strength / 5}px)`};
    cursor: move;
    box-sizing: border-box;
    touch-action: none;
    
    /* Resize handles */
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

const Handle = styled.div`
    position: absolute;
    width: 10px;
    height: 10px;
    background: var(--accent);
    bottom: 0;
    right: 0;
    cursor: nwse-resize;
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
`;

const Label = styled.label`
    font-size: 13px;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
`;

const Slider = styled.input`
    width: 120px;
`;

export default function EraserModal({ onClose }) {
    const { player, eraserRegion, setEraserRegion, eraserStrength, setEraserStrength, smartErasure, setSmartErasure } = useContext(StoreContext);
    const canvasRef = useRef(null);
    const [detecting, setDetecting] = useState(false);
    const [region, setRegion] = useState(eraserRegion);
    const [strength, setStrength] = useState(eraserStrength);
    const [smart, setSmart] = useState(smartErasure);
    const [videoDims, setVideoDims] = useState({ width: 0, height: 0 });
    const [containerDims, setContainerDims] = useState({ width: 0, height: 0 });

    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const previewRef = useRef(null);

    const [containerStyle, setContainerStyle] = useState({});

    useEffect(() => {
        const updateDims = () => {
            if (!videoDims.width || !videoDims.height) return;

            const aspectRatio = videoDims.width / videoDims.height;
            const maxWidth = 560; // 600px - 40px padding
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

            // Defer reading rect to ensure DOM has updated
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

            // Set canvas size to match video resolution
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            setVideoDims({ width: video.videoWidth, height: video.videoHeight });

            try {
                // Draw current frame
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            } catch (error) {
                console.error('Canvas draw error:', error);
                toast.error('Failed to capture video frame. This might be due to browser security restrictions (CORS).');
            }
        }
    }, [player]);

    const getDisplayMetrics = (currentContainerDims = containerDims) => {
        if (!videoDims.width || !currentContainerDims.width) return { scale: 1, offsetX: 0, offsetY: 0 };

        // Since container is now sized to fit video aspect ratio, 
        // offset should be negligible, but we keep the logic for robustness
        const scale = currentContainerDims.width / videoDims.width;
        return { scale, offsetX: 0, offsetY: 0 };
    };

    const handleAutoDetect = async () => {
        if (!canvasRef.current) return;

        setDetecting(true);
        const result = await detectSubtitleRegion(canvasRef.current);
        setDetecting(false);

        if (result) {
            setRegion(result);
            toast.success('Subtitle region detected');
        } else {
            toast.error('No text detected in this frame');
        }
    };

    const handleSave = () => {
        setEraserRegion(region);
        setEraserStrength(strength);
        setSmartErasure(smart);
        onClose();
        toast.success('Erasure settings saved');
    };

    const handleClear = () => {
        setRegion(null);
        setEraserRegion(null);
    };

    const handleMouseDown = (e) => {
        // Prevent creating new box if clicking on existing box or buttons
        if (e.target.closest('button') || e.target.closest(BoundingBox)) return;

        if (!previewRef.current) return;

        const rect = previewRef.current.getBoundingClientRect();
        const currentDims = { width: rect.width, height: rect.height };

        // Update container dims in case window resized
        if (rect.width !== containerDims.width || rect.height !== containerDims.height) {
            setContainerDims(currentDims);
        }

        const { scale, offsetX, offsetY } = getDisplayMetrics(currentDims);

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Convert to video coordinates
        // Formula: screen = video * scale + offset => video = (screen - offset) / scale
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

        // Use Math.abs for width/height to handle dragging in any direction
        // But need to normalize x,y to be top-left corner
        const x = Math.min(startPos.x, currentX);
        const y = Math.min(startPos.y, currentY);
        const w = Math.abs(currentX - startPos.x);
        const h = Math.abs(currentY - startPos.y);

        setRegion({ x, y, w, h });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Helper to scale region for display
    const getBoxStyle = () => {
        if (!region || !videoDims.width) return { display: 'none' };

        // Always use latest container dims
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

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={e => e.stopPropagation()}>
                <Header>
                    <Title>Erase Hard Subtitles</Title>
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
                                $strength={strength}
                            />
                        )}
                    </PreviewContainer>
                    <InfoText>
                        Draw a box to manually select, or use Auto Detect.
                    </InfoText>
                </div>

                <Controls style={{ flexWrap: 'wrap' }}>
                    <Label>
                        Erasure Strength:
                        <Slider
                            type="range"
                            min="0"
                            max="100"
                            value={strength}
                            onChange={e => setStrength(parseInt(e.target.value))}
                        />
                        {strength}%
                    </Label>
                    <InfoText style={{ margin: 0, marginRight: 20 }}>
                        (0% = Blur, 100% = Remove)
                    </InfoText>

                    <Label>
                        <input
                            type="checkbox"
                            checked={smart}
                            onChange={e => setSmart(e.target.checked)}
                        />
                        Smart Erase (Only when subtitle exists)
                    </Label>
                </Controls>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        {region ?
                            `Region: x=${Math.round(region.x)}, y=${Math.round(region.y)}, w=${Math.round(region.w)}, h=${Math.round(region.h)}` :
                            'No region set'
                        }
                    </div>
                    <ButtonGroup>
                        <Button onClick={handleClear} disabled={!region}>Clear</Button>
                        <Button onClick={handleAutoDetect} disabled={detecting}>
                            {detecting ? 'Detecting...' : 'Auto Detect (OCR)'}
                        </Button>
                        <Button $primary onClick={handleSave}>Confirm</Button>
                    </ButtonGroup>
                </div>
            </Modal>
        </Overlay>
    );
}

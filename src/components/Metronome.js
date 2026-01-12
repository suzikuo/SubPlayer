import React, { useContext, useEffect, useCallback, useState, useRef } from 'react';
import styled from 'styled-components';
import { StoreContext } from '../context/Store';
import Sub from '../libs/Sub';

const Container = styled.div`
    position: absolute;
    z-index: 8;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 100%;
    cursor: crosshair;
    user-select: none;
`;

const SelectionBox = styled.div`
    position: absolute;
    top: 0;
    bottom: 0;
    height: 100%;
    background-color: rgba(59, 130, 246, 0.3);
    border-left: 1px solid rgba(59, 130, 246, 0.8);
    border-right: 1px solid rgba(59, 130, 246, 0.8);
    pointer-events: none;
`;

export default function Metronome({ render }) {
    const { setSubtitle } = useContext(StoreContext);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragEndX, setDragEndX] = useState(0);
    const $container = useRef(null);

    // Use refs to access latest state in event listeners without re-binding
    const dragStartXRef = useRef(0);
    const dragEndXRef = useRef(0);

    const getTime = useCallback((pixelX) => {
        if (!render) return 0;
        const gridGap = render.gridGap;
        const pixelPerSecond = gridGap * 10;
        const padding = render.padding;
        const beginTime = render.beginTime;
        const offset = padding * gridGap;

        return ((pixelX - offset) / pixelPerSecond) + beginTime;
    }, [render]);

    const getRelativeX = useCallback((pageX) => {
        if ($container.current) {
            const rect = $container.current.getBoundingClientRect();
            return pageX - rect.left;
        }
        return pageX;
    }, []);

    const onMouseDown = (e) => {
        if (e.button !== 0) return;
        const x = getRelativeX(e.pageX);
        setIsDragging(true);
        setDragStartX(x);
        setDragEndX(x);
        dragStartXRef.current = x;
        dragEndXRef.current = x;
    };

    const onMouseMove = useCallback((e) => {
        if (isDragging) {
            const x = getRelativeX(e.pageX);
            setDragEndX(x);
            dragEndXRef.current = x;
        }
    }, [isDragging, getRelativeX]);

    const onMouseUp = useCallback(() => {
        if (isDragging) {
            const startX = dragStartXRef.current;
            const endX = dragEndXRef.current;

            if (Math.abs(endX - startX) > 10) {
                const startPixel = Math.min(startX, endX);
                const endPixel = Math.max(startX, endX);

                const startTime = getTime(startPixel);
                const endTime = getTime(endPixel);

                if (endTime - startTime > 0.2) {
                    const newSub = new Sub({
                        startTime,
                        endTime,
                        text: 'New Subtitle'
                    });

                    // We need latest subtitle state here. 
                    // But subtitle is a dependency.
                    // If we add subtitle to dependency, onMouseUp changes when subtitle changes.
                    // Subtitle shouldn't change *during* drag usually.
                    // But to be safe, we can use functional update for setSubtitle?
                    // No, we need to append to existing list.
                    // So we need 'subtitle' in scope.
                    // If 'subtitle' changes, 'onMouseUp' changes, 'useEffect' re-binds. That's fine.

                    setSubtitle(prevSubtitle => {
                        return [...prevSubtitle, newSub].sort((a, b) => a.startTime - b.startTime);
                    });
                }
            }
            setIsDragging(false);
            setDragStartX(0);
            setDragEndX(0);
        }
    }, [isDragging, getTime, setSubtitle]);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mouseup', onMouseUp);
            document.addEventListener('mousemove', onMouseMove);
        }
        return () => {
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('mousemove', onMouseMove);
        };
    }, [isDragging, onMouseUp, onMouseMove]);

    return (
        <Container ref={$container} onMouseDown={onMouseDown}>
            {isDragging && (
                <SelectionBox
                    style={{
                        left: Math.min(dragStartX, dragEndX),
                        width: Math.abs(dragEndX - dragStartX)
                    }}
                />
            )}
        </Container>
    );
}

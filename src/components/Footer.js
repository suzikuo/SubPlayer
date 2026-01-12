import React, { useContext, useEffect, useRef, useState, memo, useCallback } from 'react';
import styled from 'styled-components';
import WFPlayer from 'wfplayer';
import clamp from 'lodash/clamp';
import { StoreContext } from '../context/Store';
import Timeline from './Timeline';
import Metronome from './Metronome';
import DT from 'duration-time-conversion';

const Container = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background-color: var(--bg-tertiary);

    .waveform-container {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
        pointer-events: none;
    }

    .duration-display {
        position: absolute;
        top: -30px;
        left: 10px;
        z-index: 12;
        font-size: 14px;
        color: var(--text-secondary);
        font-family: monospace;
        pointer-events: none;
    }
`;

const GrabLayer = styled.div`
    position: relative;
    z-index: 11;
    cursor: grab;
    height: 20%; // Top 20% is for grabbing?
    width: 100%;
    user-select: none;
    background-color: rgba(59, 130, 246, 0.1);
    border-bottom: 1px solid rgba(59, 130, 246, 0.2);

    &:active {
        cursor: grabbing;
    }
`;

const Waveform = memo(
    ({ player, setWaveform, waveform }) => {
        const $waveform = useRef(null);
        const lastLoadedSrc = useRef(null);

        useEffect(() => {
            if (!player || !$waveform.current) return;

            const wf = new WFPlayer({
                scrollable: true,
                useWorker: false,
                duration: 10,
                padding: 1,
                wave: true,
                pixelRatio: 2,
                container: $waveform.current,
                mediaElement: player,
                backgroundColor: 'rgba(0, 0, 0, 0)',
                waveColor: 'rgba(255, 255, 255, 0.2)',
                progressColor: 'rgba(59, 130, 246, 0.5)',
                gridColor: 'rgba(255, 255, 255, 0.05)',
                rulerColor: 'rgba(255, 255, 255, 0.5)',
                paddingColor: 'rgba(0, 0, 0, 0)',
            });

            setWaveform(wf);

            // Initial load check
            if (player.src && player.src.startsWith('blob:') && lastLoadedSrc.current !== player.src) {
                lastLoadedSrc.current = player.src;
                wf.load(player.src);
            }

            return () => {
                wf.destroy();
            };
        }, [player, setWaveform]);

        // Watch for player src changes
        useEffect(() => {
            if (!player || !waveform) return;

            const handleLoad = () => {
                if (player.src && player.src.startsWith('blob:') && lastLoadedSrc.current !== player.src) {
                    console.log('Loading waveform for:', player.src);
                    lastLoadedSrc.current = player.src;

                    // Manually fetch and decode audio to catch errors
                    fetch(player.src)
                        .then(response => response.arrayBuffer())
                        .then(arrayBuffer => {
                            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                            return audioCtx.decodeAudioData(arrayBuffer)
                                .then(audioBuffer => {
                                    if (waveform) {
                                        waveform.load(audioBuffer);
                                    }
                                })
                                .catch(err => {
                                    console.warn('Audio decoding failed:', err);
                                    // toast.error('Audio decoding failed, waveform will not be displayed');
                                });
                        })
                        .catch(err => {
                            console.warn('Fetch failed:', err);
                        });
                }
            };

            // Listen for Artplayer switchUrl which changes src
            // And also check immediately if src is already set and not processed
            if (player.src && player.src.startsWith('blob:') && lastLoadedSrc.current !== player.src) {
                handleLoad();
            }

            player.addEventListener('loadedmetadata', handleLoad);

            return () => {
                player.removeEventListener('loadedmetadata', handleLoad);
            };
        }, [player, waveform]);

        return <div className="waveform-container" ref={$waveform} />;
    },
    (prev, next) => prev.player === next.player && prev.waveform === next.waveform
);

const Grab = ({ player, waveform }) => {
    const [grabStartX, setGrabStartX] = useState(0);
    const [grabStartTime, setGrabStartTime] = useState(0);
    const [grabbing, setGrabbing] = useState(false);

    const onGrabDown = useCallback((event) => {
        if (event.button !== 0 || !player) return;
        setGrabStartX(event.pageX);
        setGrabStartTime(player.currentTime);
        setGrabbing(true);
    }, [player]);

    const onGrabMove = useCallback((event) => {
        if (grabbing && player && waveform) {
            const diffX = event.pageX - grabStartX;
            const scrollWidth = document.body.clientWidth; // Should probably use container width
            // This logic seems to implement "drag to scroll/seek"
            // The original logic: currentTime = start - (diff / width) * 10
            // 10 seems to be the visible duration?
            const duration = Number.isFinite(player.duration) ? player.duration : 0;
            const currentTime = clamp(
                grabStartTime - (diffX / scrollWidth) * 10,
                0,
                duration
            );
            if (Number.isFinite(currentTime)) {
                player.currentTime = currentTime;
                if (waveform) waveform.seek(currentTime);
            }
        }
    }, [grabbing, player, waveform, grabStartX, grabStartTime]);

    const onGrabUp = useCallback(() => {
        setGrabbing(false);
    }, []);

    useEffect(() => {
        if (grabbing) {
            document.addEventListener('mouseup', onGrabUp);
            document.addEventListener('mousemove', onGrabMove);
        }
        return () => {
            document.removeEventListener('mouseup', onGrabUp);
            document.removeEventListener('mousemove', onGrabMove);
        };
    }, [grabbing, onGrabUp, onGrabMove]);

    return (
        <GrabLayer onMouseDown={onGrabDown} />
    );
};

export default function TimelineArea() {
    const { player, setWaveform, waveform, currentTime } = useContext(StoreContext);
    const [render, setRender] = useState({ padding: 1, duration: 10, gridGap: 10, beginTime: 0 });

    // Update render state from waveform updates
    useEffect(() => {
        if (waveform) {
            const update = (config) => {
                setRender({
                    ...config,
                    gridGap: config.gridGap / 2,
                });
            };
            waveform.on('update', update);

            // Reset render state on new waveform to avoid stale data (especially beginTime)
            // We try to use current waveform state if available, otherwise default.
            // WFPlayer properties might not be directly accessible as 'config' shape, 
            // but we can guess or rely on update. 
            // For now, let's reset to defaults or try to trigger an update.
            // Better: update with defaults, then let event handle it.
            setRender({
                padding: 1,
                duration: 10,
                gridGap: 10,
                beginTime: 0
            });

            return () => waveform.off('update', update);
        }
    }, [waveform]);

    return (
        <Container>
            <div className="duration-display">
                {DT.d2t(currentTime)}
            </div>

            <Grab player={player} waveform={waveform} />

            {/* Timeline needs to sit on top of waveform but below grab? Or on top? */}
            {/* Timeline contains the subtitle blocks which should be interactive */}

            <Timeline
                player={player}
                render={render}
            />

            <Waveform
                player={player}
                setWaveform={setWaveform}
                waveform={waveform}
            />
            {/* Metronome is the grid lines */}
            <Metronome render={render} />
        </Container>
    );
}

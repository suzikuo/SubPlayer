import { Menu, Item, useContextMenu } from 'react-contexify';
import 'react-contexify/ReactContexify.css';
import React, { useContext, useCallback } from 'react';
import styled from 'styled-components';
import { StoreContext } from '../context/Store';
import Sub from '../libs/Sub';

const TimelineContainer = styled.div`
    position: absolute;
    z-index: 9;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
`;

const SubItem = styled.div`
    position: absolute;
    top: 30%;
    height: 40%;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    color: var(--text-primary);
    font-size: 14px;
    cursor: move;
    user-select: none;
    pointer-events: all;
    background-color: rgba(59, 130, 246, 0.4);
    border: 1px solid rgba(59, 130, 246, 0.6);
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    transition: background-color 0.2s;

    &:hover {
        background-color: rgba(59, 130, 246, 0.6);
        z-index: 10;
    }

    &.sub-highlight {
        background-color: var(--accent);
        border: 1px solid var(--accent-hover);
        z-index: 10;
    }

    &.sub-illegal {
        background-color: rgba(239, 68, 68, 0.5); // Red
        border: 1px solid var(--danger);
    }

    .sub-handle {
        position: absolute;
        top: 0;
        bottom: 0;
        z-index: 1;
        width: 10px;
        height: 100%;
        cursor: col-resize;
        user-select: none;
        background-color: transparent;
        &:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
    }

    .sub-handle-left {
        left: 0;
    }

    .sub-handle-right {
        right: 0;
    }

    .sub-text {
        padding: 0 10px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 12px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }
`;

function Timeline({ render, player }) {
    const { subtitle, setSubtitle, currentIndex } = useContext(StoreContext);
    const { show } = useContextMenu({ id: 'menu_id' });

    const onContextMenu = (event, item) => {
        event.preventDefault();
        show({ event, props: item });
    };

    const removeSub = useCallback((sub) => {
        const index = subtitle.indexOf(sub);
        if (index >= 0) {
            const newSubtitle = [...subtitle];
            newSubtitle.splice(index, 1);
            setSubtitle(newSubtitle);
        }
    }, [subtitle, setSubtitle]);

    const mergeSub = useCallback((sub) => {
        const index = subtitle.indexOf(sub);
        if (index >= 0 && index < subtitle.length - 1) {
            const next = subtitle[index + 1];
            const newSubtitle = [...subtitle];
            const merged = new Sub(sub);
            merged.end = next.end;
            merged.text = sub.text + '\n' + next.text;
            newSubtitle[index] = merged;
            newSubtitle.splice(index + 1, 1);
            setSubtitle(newSubtitle);
        }
    }, [subtitle, setSubtitle]);

    const gridGap = render ? render.gridGap : 10;
    const pixelPerSecond = gridGap * 10;
    const padding = render ? render.padding : 0;
    const beginTime = render ? render.beginTime : 0;
    const offset = padding * gridGap;

    return (
        <TimelineContainer>
            {subtitle.map((item, index) => {
                // Calculate position
                const left = (item.startTime - beginTime) * pixelPerSecond + offset;
                const width = (item.endTime - item.startTime) * pixelPerSecond;

                // Don't render if out of view
                if (left + width < 0 || left > window.innerWidth) return null;

                return (
                    <SubItem
                        key={index}
                        className={currentIndex === index ? 'sub-highlight' : ''}
                        style={{ left, width }}
                        onContextMenu={(e) => onContextMenu(e, item)}
                        onClick={() => {
                            if (player && Number.isFinite(item.startTime)) {
                                player.currentTime = item.startTime;
                            }
                        }}
                    >
                        <div className="sub-handle sub-handle-left"></div>
                        <div className="sub-text">{item.text}</div>
                        <div className="sub-handle sub-handle-right"></div>
                    </SubItem>
                );
            })}

            <Menu id="menu_id">
                <Item onClick={({ props }) => removeSub(props)}>Delete</Item>
                <Item onClick={({ props }) => mergeSub(props)}>Merge Next</Item>
            </Menu>
        </TimelineContainer>
    );
}

export default Timeline;

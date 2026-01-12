import React, { useContext, useCallback, useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Table, AutoSizer } from 'react-virtualized';
import { StoreContext } from '../context/Store';
import DT from 'duration-time-conversion';
import Sub from '../libs/Sub';
import SubtitleStyleModal from './SubtitleStyleModal';
import { burnSubtitle } from '../libs/ffmpeg';
import sub2ass from '../libs/readSub/sub2ass';
import { getVideoDimensions } from '../utils';
import toast from 'react-hot-toast';
import { Translate, t } from 'react-i18nify';

const Container = styled.div`
    flex: 1;
    background-color: var(--bg-primary);
    display: flex;
    flex-direction: column;
    height: 100%;
`;

const Toolbar = styled.div`
    height: 40px;
    display: flex;
    align-items: center;
    padding: 0 10px;
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    gap: 10px;
`;

const ToolbarLabel = styled.span`
    font-size: 12px;
    color: var(--text-secondary);
`;

const ButtonGroup = styled.div`
    display: flex;
    background: var(--bg-primary);
    border-radius: 4px;
    padding: 2px;
    gap: 2px;
`;

const ModeBtn = styled.button`
    padding: 4px 12px;
    border: none;
    background: ${props => props.active ? 'var(--bg-tertiary)' : 'transparent'};
    color: ${props => props.active ? 'var(--text-primary)' : 'var(--text-secondary)'};
    font-size: 12px;
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: var(--bg-tertiary);
        color: var(--text-primary);
    }
`;

const IconButton = styled.button`
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: var(--bg-tertiary);
        color: var(--text-primary);
    }
`;

const RowContainer = styled.div`
    display: flex;
    height: 100%;
    padding: 5px 0;
    border-bottom: 1px solid var(--bg-secondary);
    background-color: ${props => props.$active ? 'rgba(59, 130, 246, 0.2)' : 'transparent'};
    border-left: 3px solid ${props => props.$active ? 'var(--accent)' : 'transparent'};
    transition: background-color 0.1s;

    ${props => props.$active && `
        border-top: 1px solid var(--accent);
        border-bottom: 1px solid var(--accent);
    `}

    &:hover {
        background-color: ${props => props.$active ? 'rgba(59, 130, 246, 0.25)' : 'var(--bg-tertiary)'};
    }
`;

const ActionColumn = styled.div`
    width: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 5px 0;
    border-right: 1px solid var(--bg-secondary);
`;

const TimeColumn = styled.div`
    width: 90px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
    border-right: 1px solid var(--bg-secondary);
    gap: 2px;
`;

const TextColumn = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0 5px;
    gap: 4px;
    position: relative;
    min-width: 0; 
`;

const TimeInput = styled.input`
    width: 100%;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 11px;
    text-align: center;
    font-family: monospace;
    
    &:focus {
        color: var(--text-primary);
        background: var(--bg-secondary);
        outline: none;
    }

    &.duration {
        color: var(--text-tertiary);
        font-size: 10px;
    }
`;

const IndexLabel = styled.div`
    font-size: 10px;
    color: var(--text-tertiary);
    margin-top: 2px;
`;

const StyledTextarea = styled.textarea`
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 13px;
    padding: 4px;
    resize: none;
    outline: none;
    font-family: inherit;
    border-radius: 4px;
    line-height: 1.4;

    &:focus {
        background: var(--bg-secondary);
    }

    &.secondary {
        font-size: 12px;
        color: var(--text-secondary);
    }
`;

const RowToolbar = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    padding: 2px 4px;
    opacity: 0;
    transition: opacity 0.2s;

    ${RowContainer}:hover & {
        opacity: 1;
    }
`;

// Icons
const Icons = {
    Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
    Plus: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
    Split: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v18M16 3v18M2 12h4M18 12h4"></path></svg>,
    MergeUp: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>,
    MergeDown: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>,
    Swap: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 10h14l-4-4m0 8H3l4 4" /></svg>,
    Style: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.69l5.74 5.88-5.74 5.88-5.74-5.88L12 2.69M12 2L5.12 8.96 12 16l6.88-7.04L12 2z" /><circle cx="12" cy="9" r="2" /></svg>,
    Preview: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
};

const ContextMenu = styled.div`
    position: fixed;
    z-index: 1000;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    min-width: 150px;
    padding: 5px 0;
`;

const ContextMenuItem = styled.div`
    padding: 8px 12px;
    font-size: 13px;
    color: var(--text-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;

    &:hover {
        background: var(--bg-tertiary);
    }

    svg {
        width: 14px;
        height: 14px;
        color: var(--text-secondary);
    }
`;

const SubtitleRow = React.memo(({ index, style, item, itemSecond, player, isActive, updateSub, updateSubSecond, removeSub, splitSub, mergeSub, addSub, displayMode, onEditStyle, onPreview, onContextMenu }) => {
    const textRef = useRef(null);
    const text2Ref = useRef(null);
    const lastCursorPos = useRef({ field: 'text', pos: 0 });

    const [text, setText] = useState(item.text);
    const [text2, setText2] = useState(item.text2 || (itemSecond ? itemSecond.text : ''));

    useEffect(() => {
        setText(item.text);
        setText2(item.text2 || (itemSecond ? itemSecond.text : ''));
    }, [item.text, item.text2, itemSecond]);

    const handleFocus = (field) => {
        lastCursorPos.current.field = field;
    };

    const handleSelect = (e, field) => {
        lastCursorPos.current = { field, pos: e.target.selectionStart };
    };

    const handleSplit = (e) => {
        e.stopPropagation();
        splitSub(index, lastCursorPos.current);
    };

    const handleTimeClick = () => {
        if (player && Number.isFinite(item.startTime)) {
            player.currentTime = item.startTime + 0.001;
        }
    };

    return (
        <div style={style} onContextMenu={(e) => onContextMenu(e, index)}>
            <RowContainer $active={isActive} onClick={handleTimeClick}>
                <ActionColumn>
                    <IconButton onClick={(e) => { e.stopPropagation(); removeSub(index); }} title="Delete">
                        <Icons.Trash />
                    </IconButton>
                    <IconButton onClick={(e) => { e.stopPropagation(); addSub(index); }} title="Add Next">
                        <Icons.Plus />
                    </IconButton>
                </ActionColumn>

                <TimeColumn>
                    <TimeInput value={DT.d2t(item.startTime)} readOnly />
                    <TimeInput value={DT.d2t(item.endTime)} readOnly />
                    <TimeInput className="duration" value={item.duration.toFixed(3) + 's'} readOnly />
                    <IndexLabel>#{index + 1}</IndexLabel>
                </TimeColumn>

                <TextColumn>
                    {(displayMode === 'dual' || displayMode === 'main') && (
                        <StyledTextarea
                            ref={textRef}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Main Subtitle"
                            onFocus={() => handleFocus('text')}
                            onSelect={(e) => handleSelect(e, 'text')}
                            onBlur={(e) => {
                                if (e.target.value !== item.text) {
                                    updateSub(index, new Sub({ ...item, text: e.target.value }));
                                }
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}

                    {(displayMode === 'dual' || displayMode === 'secondary') && (
                        <StyledTextarea
                            ref={text2Ref}
                            className="secondary"
                            value={text2}
                            onChange={(e) => setText2(e.target.value)}
                            placeholder="Secondary Subtitle"
                            onFocus={() => handleFocus('text2')}
                            onSelect={(e) => handleSelect(e, 'text2')}
                            onBlur={(e) => {
                                const newVal = e.target.value;
                                if (itemSecond) {
                                    // Independent secondary track
                                    if (newVal !== itemSecond.text) {
                                        // We can't update secondary track directly by index if they are not 1:1 mapped
                                        // But here we are iterating 'subtitle' (main track)
                                        // itemSecond is passed as prop. 
                                        // If we have an independent track, we need to know WHICH index in subtitleSecond corresponds to this row
                                        // Wait, the VirtualList iterates 'subtitle'. 
                                        // We need to find the matching secondary sub for this row.
                                        updateSubSecond(index, newVal);
                                    }
                                } else {
                                    // Merged text2
                                    if (newVal !== (item.text2 || '')) {
                                        updateSub(index, new Sub({ ...item, text2: newVal }));
                                    }
                                }
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}

                    <RowToolbar>
                        <IconButton onClick={(e) => { e.stopPropagation(); mergeSub(index, 'prev'); }} title={t('MERGE_PREV')}>
                            <Icons.MergeUp />
                        </IconButton>
                        <IconButton onClick={handleSplit} title={t('SPLIT_CURSOR')}>
                            <Icons.Split />
                        </IconButton>
                        <IconButton onClick={(e) => { e.stopPropagation(); mergeSub(index, 'next'); }} title={t('MERGE_NEXT')}>
                            <Icons.MergeDown />
                        </IconButton>
                        <IconButton onClick={(e) => { e.stopPropagation(); onEditStyle(index); }} title={t('EDIT_STYLE')} style={{ color: item.style && Object.keys(item.style).length > 0 ? 'var(--accent)' : 'inherit' }}>
                            <Icons.Style />
                        </IconButton>
                    </RowToolbar>
                </TextColumn>
            </RowContainer>
        </div>
    );
});

export default function Subtitles() {
    const {
        subtitle,
        setSubtitle,
        subtitleSecond,
        setSubtitleSecond,
        player,
        currentIndex,
        displayMode,
        setDisplayMode,
        videoFile,
        styleConfig,
        setLoading,
        setPreviewImages,
        eraserRegion,
        eraserStrength,
        showEraserPreview
    } = useContext(StoreContext);

    const [editingStyleIndex, setEditingStyleIndex] = useState(null);
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, index: -1 });

    useEffect(() => {
        const handleClickOutside = () => setContextMenu(prev => ({ ...prev, visible: false }));
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const handleContextMenu = useCallback((e, index) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            index
        });
    }, []);

    const onPreview = useCallback(async (index) => {
        if (!videoFile) return toast.error('Please open a video first');
        const item = subtitle[index];
        if (!item) return;

        setLoading('Generating preview...');
        try {
            const { width: videoWidth, height: videoHeight } = await getVideoDimensions(videoFile);
            const assContent = sub2ass(subtitle, { ...styleConfig, displayMode, videoWidth, videoHeight });

            // Determine font
            const isSans = styleConfig.fontFamily.includes('sans-serif');
            const isSerif = !isSans && (
                styleConfig.fontFamily.includes('serif') ||
                styleConfig.fontFamily.includes('KaiTi') ||
                styleConfig.fontFamily.includes('SongTi') ||
                styleConfig.fontFamily.includes('Times') ||
                styleConfig.fontFamily.includes('Georgia')
            );
            const fontName = isSerif ? 'Noto Serif CJK SC' : 'Noto Sans CJK SC';

            const midTime = item.startTime + (item.endTime - item.startTime) / 2;

            // Only apply eraser if it's set and the preview toggle is on
            const region = (showEraserPreview && eraserRegion) ? eraserRegion : null;
            const strength = (showEraserPreview && eraserRegion) ? eraserStrength : 0;

            const result = await burnSubtitle(videoFile, assContent, 'subtitle.ass', fontName, null, region, [midTime], strength);

            if (Array.isArray(result) && result.length > 0) {
                const url = URL.createObjectURL(result[0]);
                setPreviewImages([url]);
            }
        } catch (error) {
            console.error(error);
            toast.error('Preview failed: ' + error.message);
        }
        setLoading('');
    }, [subtitle, videoFile, styleConfig, displayMode, setLoading, setPreviewImages, eraserRegion, eraserStrength, showEraserPreview]);

    const updateSub = useCallback((index, sub) => {
        setSubtitle(prev => {
            const newSub = [...prev];
            newSub[index] = sub;
            return newSub;
        });
    }, [setSubtitle]);

    const updateSubSecond = useCallback((index, text) => {
        if (!setSubtitleSecond || !subtitleSecond) return;
        setSubtitleSecond(prev => {
            if (!prev || index >= prev.length) return prev;
            const newSub = [...prev];
            const updatedItem = new Sub(newSub[index]);
            updatedItem.text = text;
            newSub[index] = updatedItem;
            return newSub;
        });
    }, [setSubtitleSecond, subtitleSecond]);

    const removeSub = useCallback((index) => {
        setSubtitle(prev => {
            const newSub = [...prev];
            newSub.splice(index, 1);
            return newSub;
        });
    }, [setSubtitle]);

    const addSub = useCallback((index) => {
        setSubtitle(prev => {
            const newSub = [...prev];
            const current = newSub[index];
            const next = newSub[index + 1];
            const startTime = current ? current.endTime : 0;
            const endTime = next ? next.startTime : startTime + 1;

            newSub.splice(index + 1, 0, new Sub({
                startTime,
                endTime,
                text: '',
                text2: ''
            }));
            return newSub;
        });
    }, [setSubtitle]);

    const mergeSub = useCallback((index, direction) => {
        setSubtitle(prev => {
            const newSub = [...prev];
            if (direction === 'prev' && index > 0) {
                const prevItem = newSub[index - 1];
                const currItem = newSub[index];
                const merged = new Sub({
                    ...prevItem,
                    endTime: currItem.endTime,
                    text: (prevItem.text + ' ' + currItem.text).trim(),
                    text2: ((prevItem.text2 || '') + ' ' + (currItem.text2 || '')).trim()
                });
                newSub.splice(index - 1, 2, merged);
            } else if (direction === 'next' && index < newSub.length - 1) {
                const currItem = newSub[index];
                const nextItem = newSub[index + 1];
                const merged = new Sub({
                    ...currItem,
                    endTime: nextItem.endTime,
                    text: (currItem.text + ' ' + nextItem.text).trim(),
                    text2: ((currItem.text2 || '') + ' ' + (nextItem.text2 || '')).trim()
                });
                newSub.splice(index, 2, merged);
            }
            return newSub;
        });
    }, [setSubtitle]);

    const splitSub = useCallback((index, cursor) => {
        setSubtitle(prev => {
            const newSub = [...prev];
            const item = newSub[index];
            const { field, pos } = cursor;

            const targetText = field === 'text' ? item.text : (item.text2 || '');
            const text1 = targetText.slice(0, pos);
            const text2 = targetText.slice(pos);

            const duration = item.endTime - item.startTime;
            const splitTime = item.startTime + (duration / 2);

            const sub1 = new Sub({
                ...item,
                endTime: splitTime,
                [field]: text1
            });

            const sub2 = new Sub({
                ...item,
                startTime: splitTime,
                [field]: text2,
                // Clear the other field in the second part to avoid duplication? 
                // Or keep it? Let's keep it empty for the other field to avoid confusion.
                [field === 'text' ? 'text2' : 'text']: ''
            });

            newSub.splice(index, 1, sub1, sub2);
            return newSub;
        });
    }, [setSubtitle]);

    const swapSubtitles = useCallback(() => {
        setSubtitle(prev => {
            return prev.map(item => {
                // Important: Capture current values before creating new object
                const currentText = item.text || '';
                const currentText2 = item.text2 || '';

                return new Sub({
                    ...item,
                    text: currentText2,
                    text2: currentText
                });
            });
        });
    }, [setSubtitle]);

    return (
        <Container>
            <Toolbar>
                <ToolbarLabel>Display:</ToolbarLabel>
                <ButtonGroup>
                    <ModeBtn active={displayMode === 'dual'} onClick={() => setDisplayMode('dual')}>Dual</ModeBtn>
                    <ModeBtn active={displayMode === 'main'} onClick={() => setDisplayMode('main')}>Main</ModeBtn>
                    <ModeBtn active={displayMode === 'secondary'} onClick={() => setDisplayMode('secondary')}>Sub</ModeBtn>
                </ButtonGroup>
                <IconButton onClick={swapSubtitles} title="Swap Main/Sub">
                    <Icons.Swap />
                </IconButton>
            </Toolbar>
            <div style={{ flex: 1 }}>
                <AutoSizer>
                    {({ width, height }) => (
                        <Table
                            width={width}
                            height={height}
                            headerHeight={0}
                            rowHeight={displayMode === 'dual' ? 100 : 60}
                            rowCount={subtitle.length}
                            rowGetter={({ index }) => subtitle[index]}
                            rowRenderer={(props) => (
                                <SubtitleRow
                                    key={props.key} // Ensure key is passed
                                    {...props}
                                    item={subtitle[props.index]}
                                    // Pass corresponding secondary subtitle if available and not merged
                                    itemSecond={subtitleSecond && subtitleSecond.length > 0 ? subtitleSecond[props.index] : null}
                                    player={player}
                                    isActive={props.index === currentIndex}
                                    updateSub={updateSub}
                                    updateSubSecond={updateSubSecond}
                                    removeSub={removeSub}
                                    addSub={addSub}
                                    splitSub={splitSub}
                                    mergeSub={mergeSub}
                                    displayMode={displayMode}
                                    onEditStyle={setEditingStyleIndex}
                                    onPreview={onPreview}
                                    onContextMenu={handleContextMenu}
                                />
                            )}
                            scrollToIndex={currentIndex}
                        />
                    )}
                </AutoSizer>
            </div>

            {contextMenu.visible && (
                <ContextMenu style={{ top: contextMenu.y, left: contextMenu.x }} onClick={e => e.stopPropagation()}>
                    <ContextMenuItem onClick={() => { onPreview(contextMenu.index); setContextMenu(prev => ({ ...prev, visible: false })); }}>
                        <Icons.Preview /> <Translate value="PREVIEW_BURN" />
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => { setEditingStyleIndex(contextMenu.index); setContextMenu(prev => ({ ...prev, visible: false })); }}>
                        <Icons.Style /> <Translate value="EDIT_STYLE" />
                    </ContextMenuItem>
                    <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                    <ContextMenuItem onClick={() => { removeSub(contextMenu.index); setContextMenu(prev => ({ ...prev, visible: false })); }}>
                        <Icons.Trash /> <Translate value="DELETE_SUB" />
                    </ContextMenuItem>
                </ContextMenu>
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
        </Container>
    );
}

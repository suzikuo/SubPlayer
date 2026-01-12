import React, { useContext, useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { StoreContext } from '../context/Store';
import Sub from '../libs/Sub';
import { file2sub, sub2vtt, sub2srt } from '../libs/readSub';
import sub2ass from '../libs/readSub/sub2ass';
import toast from 'react-hot-toast';
import { download } from '../utils';
import { Translate, t, setLocale } from 'react-i18nify';

const HeaderContainer = styled.div`
    height: 60px;
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    padding: 0 20px;
    justify-content: space-between;
`;

const Logo = styled.div`
    font-size: 20px;
    font-weight: bold;
    color: var(--text-primary);
    margin-right: 40px;
    span {
        color: var(--accent);
    }
`;

const MenuBar = styled.div`
    display: flex;
    gap: 10px;
    flex: 1;
`;

const Button = styled.button`
    background-color: transparent;
    border: 1px solid var(--border);
    color: var(--text-secondary);
    padding: 8px 16px;
    border-radius: var(--radius);
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
    cursor: pointer;

    &:hover {
        background-color: var(--bg-tertiary);
        color: var(--text-primary);
        border-color: var(--text-secondary);
    }
`;

const Dropdown = styled.div`
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 5px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    z-index: 1000;
    min-width: 150px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const DropdownItem = styled.div`
    padding: 10px 15px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-primary);
    
    &:hover {
        background-color: var(--bg-tertiary);
    }
`;

export default function Header() {
    const {
        setSubtitle,
        setSubtitleSecond,
        subtitle,
        undoSubs,
        clearSubs,
        setShowCreateTask,
        setShowExportModal,
        styleConfig,
        videoMeta
    } = useContext(StoreContext);

    const [showImportMenu, setShowImportMenu] = useState(false);
    const [showLangMenu, setShowLangMenu] = useState(false);
    const fileInputRef = useRef(null);
    const importTargetRef = useRef('main');
    const menuRef = useRef(null);
    const langMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowImportMenu(false);
            }
            if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
                setShowLangMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleImportClick = (target) => {
        importTargetRef.current = target;
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
        setShowImportMenu(false);
    };

    const onSubtitleChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            file2sub(file)
                .then((res) => {
                    if (importTargetRef.current === 'second') {
                        // Merge logic: match secondary subtitles to main subtitles by time overlap
                        if (subtitle && subtitle.length > 0) {
                            const newSubtitle = subtitle.map(mainSub => {
                                // Find a secondary sub that overlaps with the main sub
                                // We take the one with the most overlap or just the first one found?
                                // Let's take the one whose midpoint is closest to the main sub's midpoint
                                const mainMid = (mainSub.startTime + mainSub.endTime) / 2;

                                const bestMatch = res.reduce((best, current) => {
                                    const currentMid = (current.startTime + current.endTime) / 2;
                                    const currentDist = Math.abs(currentMid - mainMid);

                                    // Check if it overlaps at all
                                    const overlaps = Math.max(0, Math.min(mainSub.endTime, current.endTime) - Math.max(mainSub.startTime, current.startTime)) > 0;

                                    if (!overlaps) return best;

                                    if (!best || currentDist < Math.abs((best.startTime + best.endTime) / 2 - mainMid)) {
                                        return current;
                                    }
                                    return best;
                                }, null);

                                if (bestMatch) {
                                    return new Sub({
                                        ...mainSub,
                                        text2: bestMatch.text
                                    });
                                }
                                return mainSub;
                            });

                            setSubtitle(newSubtitle);
                            // Also set it as independent track for reference/backup
                            setSubtitleSecond(res);
                            toast.success(t('SEC_SUB_MERGED'));
                        } else {
                            // If no main subtitle, just load it as secondary track
                            setSubtitleSecond(res);
                            toast.success(t('SEC_SUB_LOADED'));
                        }
                    } else {
                        setSubtitle(res);
                        toast.success(t('MAIN_SUB_LOADED'));
                    }
                })
                .catch((err) => {
                    toast.error(err.message);
                })
                .finally(() => {
                    // Reset input value to allow selecting same file again
                    e.target.value = '';
                });
        }
    };

    const resetStyles = () => {
        if (!window.confirm(t('RESET_STYLES_CONFIRM'))) return;
        setSubtitle(prev => prev.map(item => new Sub({
            ...item,
            style: {}
        })));
        toast.success(t('STYLES_RESET'));
    };

    const onExport = () => {
        setShowExportModal(true);
    };

    return (
        <HeaderContainer>
            <Logo>Sub<span>Player</span></Logo>
            <MenuBar>
                <Button onClick={() => setShowCreateTask(true)}>
                    <Translate value="CREATE_TASK" />
                </Button>

                <div style={{ position: 'relative' }} ref={menuRef}>
                    <Button onClick={() => setShowImportMenu(!showImportMenu)}>
                        <Translate value="OPEN_SUBTITLE" /> ▾
                    </Button>
                    {showImportMenu && (
                        <Dropdown>
                            <DropdownItem onClick={() => handleImportClick('main')}>
                                <Translate value="MAIN_SUBTITLE" />
                            </DropdownItem>
                            <DropdownItem onClick={() => handleImportClick('second')}>
                                <Translate value="SECONDARY_SUBTITLE" />
                            </DropdownItem>
                        </Dropdown>
                    )}
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onSubtitleChange}
                    accept=".srt,.vtt,.ass"
                    style={{ display: 'none' }}
                />

                <Button onClick={onExport}><Translate value="EXPORT" /></Button>
                <Button onClick={resetStyles}><Translate value="RESET_STYLES" /></Button>
                <Button onClick={undoSubs}><Translate value="UNDO" /></Button>
                <Button onClick={clearSubs}><Translate value="CLEAR" /></Button>
            </MenuBar>

            <div style={{ position: 'relative' }} ref={langMenuRef}>
                <Button onClick={() => setShowLangMenu(!showLangMenu)}>
                    Language ▾
                </Button>
                {showLangMenu && (
                    <Dropdown style={{ minWidth: '100px', left: 'auto', right: 0 }}>
                        <DropdownItem onClick={() => { setLocale('en'); setShowLangMenu(false); }}>
                            English
                        </DropdownItem>
                        <DropdownItem onClick={() => { setLocale('zh'); setShowLangMenu(false); }}>
                            中文
                        </DropdownItem>
                    </Dropdown>
                )}
            </div>
        </HeaderContainer>
    );
}

import React, { useContext, useRef, useState, useEffect } from 'react';
import styled from 'styled-components';
import { StoreProvider, StoreContext } from './context/Store';
import Player from './components/Player';
import Subtitles from './components/Subtitles';
import TimelineArea from './components/Footer'; // Renaming conceptually
import ConfigPanel from './components/ConfigPanel';
import Header from './components/Header'; // New component
import Loading from './components/Loading';
import CreateTask from './components/CreateTask';
import PreviewModal from './components/PreviewModal';
import ExportModal from './components/ExportModal';
import ProgressBar from './components/ProgressBar';
import { Toaster } from 'react-hot-toast';

const MainLayout = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    overflow: hidden;
`;

const Workspace = styled.div`
    display: flex;
    flex: 1;
    overflow: hidden;
    min-height: 0; // Prevent flex overflow issues
`;

const LeftColumn = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-secondary);
    border-right: 1px solid var(--border);
    position: relative;
    min-width: 0; // Prevent flex overflow
`;

const RightColumn = styled.div`
    width: ${props => props.width}px;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-primary);
    border-left: 1px solid var(--border);
    position: relative;
`;

const PlayerSection = styled.div`
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #000;
    position: relative;
    min-height: 0;
`;

const ConfigSection = styled.div`
    height: ${props => props.height}px;
    background-color: var(--bg-secondary);
    border-top: 1px solid var(--border);
    flex-shrink: 0;
    position: relative;
`;

const FooterSection = styled.div`
    height: ${props => props.visible ? props.height : 0}px;
    background-color: var(--bg-tertiary);
    border-top: 1px solid var(--border);
    flex-shrink: 0;
    position: relative;
    transition: height 0.2s ease;
    overflow: hidden;
`;

const Resizer = styled.div`
    position: absolute;
    z-index: 10;
    background-color: transparent;
    transition: background-color 0.2s;

    &:hover, &.resizing {
        background-color: var(--accent);
    }

    &.horizontal {
        height: 5px;
        left: 0;
        right: 0;
        cursor: row-resize;
        top: -2.5px;
    }

    &.vertical {
        width: 5px;
        top: 0;
        bottom: 0;
        cursor: col-resize;
        left: -2.5px;
    }
`;

const TimelineToggle = styled.button`
    position: absolute;
    right: 20px;
    bottom: ${props => props.visible ? '170px' : '10px'};
    z-index: 100;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    color: var(--text-primary);
    border-radius: 4px;
    padding: 5px 10px;
    font-size: 12px;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    transition: bottom 0.2s ease;

    &:hover {
        background: var(--bg-secondary);
    }
`;

const AppContent = () => {
    const { layout, updateLayout, showExportModal } = useContext(StoreContext);
    const [isResizing, setIsResizing] = useState(null); // 'config', 'timeline', 'right'
    const resizingRef = useRef(false);

    const startResizing = (type) => {
        setIsResizing(type);
        resizingRef.current = true;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = type === 'right' ? 'col-resize' : 'row-resize';
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!resizingRef.current) return;

            if (isResizing === 'config') {
                const newHeight = window.innerHeight - e.clientY - (layout.showTimeline ? layout.timelineHeight : 0) - 40; // 40 is approx header height
                if (newHeight > 100 && newHeight < 500) {
                    updateLayout({ configHeight: newHeight });
                }
            } else if (isResizing === 'timeline') {
                const newHeight = window.innerHeight - e.clientY;
                if (newHeight > 50 && newHeight < 400) {
                    updateLayout({ timelineHeight: newHeight });
                }
            } else if (isResizing === 'right') {
                const newWidth = window.innerWidth - e.clientX;
                if (newWidth > 200 && newWidth < 800) {
                    updateLayout({ rightWidth: newWidth });
                }
            }
        };

        const handleMouseUp = () => {
            if (resizingRef.current) {
                resizingRef.current = false;
                setIsResizing(null);
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, layout.showTimeline, layout.timelineHeight, updateLayout]);

    return (
        <MainLayout>
            <Header />
            <Workspace>
                <LeftColumn>
                    <PlayerSection>
                        <Player />
                    </PlayerSection>
                    <ConfigSection height={layout.configHeight}>
                        <Resizer className="horizontal" onMouseDown={() => startResizing('config')} />
                        <ConfigPanel />
                    </ConfigSection>
                </LeftColumn>
                <RightColumn width={layout.rightWidth}>
                    <Resizer className="vertical" onMouseDown={() => startResizing('right')} />
                    <Subtitles />
                </RightColumn>
            </Workspace>

            <TimelineToggle
                visible={layout.showTimeline}
                onClick={() => updateLayout({ showTimeline: !layout.showTimeline })}
                style={{ bottom: layout.showTimeline ? `${layout.timelineHeight + 10}px` : '10px' }}
            >
                {layout.showTimeline ? 'Hide Timeline' : 'Show Timeline'}
            </TimelineToggle>

            <FooterSection height={layout.timelineHeight} visible={layout.showTimeline}>
                <div style={{ display: layout.showTimeline ? 'block' : 'none', height: '100%', width: '100%', position: 'relative' }}>
                    <Resizer className="horizontal" onMouseDown={() => startResizing('timeline')} />
                    <TimelineArea />
                </div>
            </FooterSection>

            <Loading />
            <CreateTask />
            <PreviewModal />
            {showExportModal && <ExportModal />}
            <ProgressBar />
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                    },
                }}
            />
        </MainLayout>
    );
};

export default function App() {
    return (
        <StoreProvider>
            <AppContent />
        </StoreProvider>
    );
}

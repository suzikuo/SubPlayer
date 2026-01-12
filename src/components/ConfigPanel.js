import React, { useState } from 'react';
import styled from 'styled-components';
import StyleConfig from './StyleConfig';
import Toolbar from './Tool';

const PanelContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--bg-secondary);
    border-top: 1px solid var(--border);
`;

const TabBar = styled.div`
    display: flex;
    height: 35px;
    background-color: var(--bg-tertiary);
    border-bottom: 1px solid var(--border);
    user-select: none;
`;

const Tab = styled.div`
    padding: 0 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 12px;
    color: ${props => props.$active ? 'var(--accent)' : 'var(--text-secondary)'};
    background-color: ${props => props.$active ? 'var(--bg-secondary)' : 'transparent'};
    border-right: 1px solid var(--border);
    border-top: 2px solid ${props => props.$active ? 'var(--accent)' : 'transparent'};
    font-weight: 500;
    gap: 6px;
    transition: all 0.2s;

    &:hover {
        color: var(--text-primary);
        background-color: var(--bg-secondary);
    }
    
    svg {
        width: 14px;
        height: 14px;
    }
`;

const Content = styled.div`
    flex: 1;
    overflow-y: auto;
    position: relative;
`;

// Icons
const Icons = {
    Style: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>,
    Tool: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>,
};

export default function ConfigPanel() {
    const [tab, setTab] = useState('style');

    return (
        <PanelContainer>
            <TabBar>
                <Tab $active={tab === 'style'} onClick={() => setTab('style')}>
                    <Icons.Style /> 样式
                </Tab>
                <Tab $active={tab === 'tool'} onClick={() => setTab('tool')}>
                    <Icons.Tool /> 工具
                </Tab>

            </TabBar>
            <Content>
                <div style={{ display: tab === 'style' ? 'block' : 'none', height: '100%' }}>
                    <StyleConfig />
                </div>
                <div style={{ display: tab === 'tool' ? 'block' : 'none', height: '100%' }}>
                    <Toolbar />
                </div>
            </Content>
        </PanelContainer>
    );
}

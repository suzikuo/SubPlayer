import React, { useContext } from 'react';
import styled from 'styled-components';
import { StoreContext } from '../context/Store';

const ProgressContainer = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 999;
    width: 100%;
    height: 3px;
    user-select: none;
    pointer-events: none;

    .inner {
        position: relative;
        height: 100%;
        background-color: var(--accent);
        transition: width 0.3s ease;
        
        span {
            position: absolute;
            top: 5px;
            right: 0;
            padding: 2px 6px;
            color: var(--text-primary);
            font-size: 11px;
            background-color: var(--bg-secondary);
            border-radius: 4px;
            box-shadow: var(--shadow);
        }
    }
`;

export default function ProgressBar() {
    const { processing } = useContext(StoreContext);

    if (!processing || processing <= 0) return null;

    return (
        <ProgressContainer>
            <div className="inner" style={{ width: `${processing}%` }}>
                <span>{`${processing.toFixed(1)}%`}</span>
            </div>
        </ProgressContainer>
    );
}

import React, { useContext } from 'react';
import styled from 'styled-components';
import { StoreContext } from '../context/Store';

const LoadingContainer = styled.div`
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 99;
    display: flex;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(2px);
    background-color: rgba(0, 0, 0, 0.5);

    .loading-inner {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        padding: 20px 40px;
        border-radius: 10px;
        color: var(--text-primary);
        background-color: var(--bg-secondary);
        box-shadow: var(--shadow);
        border: 1px solid var(--border);
        font-weight: 500;

        img {
            width: 50px;
            height: 50px;
            margin-bottom: 15px;
            animation: spin 1s linear infinite;
        }
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;

export default function Loading() {
    const { loading } = useContext(StoreContext);

    if (!loading) return null;

    return (
        <LoadingContainer>
            <div className="loading-inner">
                {/* Ensure loading.svg exists or use CSS spinner */}
                <img src="/loading.svg" alt="loading" onError={(e) => e.target.style.display = 'none'} />
                <div>{loading}</div>
            </div>
        </LoadingContainer>
    );
}

import React, { useContext } from 'react';
import styled from 'styled-components';
import { StoreContext } from '../context/Store';

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
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    gap: 15px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
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
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    
    &:hover {
        color: var(--text-primary);
    }
`;

const ImageContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    background: #000;
    border-radius: 4px;
    overflow: hidden;
    min-width: 480px;
    min-height: 270px;
`;

const PreviewImage = styled.img`
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
`;

export default function PreviewModal() {
    const { previewImages, setPreviewImages } = useContext(StoreContext);

    if (!previewImages || previewImages.length === 0) return null;

    return (
        <Overlay onClick={() => setPreviewImages([])}>
            <Modal onClick={e => e.stopPropagation()}>
                <Header>
                    <Title>Subtitle Preview (5 Keyframes)</Title>
                    <CloseButton onClick={() => setPreviewImages([])}>&times;</CloseButton>
                </Header>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', padding: '10px' }}>
                    {previewImages.map((src, index) => (
                        <ImageContainer key={index}>
                            <PreviewImage src={src} alt={`Subtitle Preview ${index + 1}`} />
                        </ImageContainer>
                    ))}
                </div>
            </Modal>
        </Overlay>
    );
}

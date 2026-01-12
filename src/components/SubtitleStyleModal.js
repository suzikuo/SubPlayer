import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import Draggable from 'react-draggable';
import { StoreContext } from '../context/Store';

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;
    pointer-events: none; // Allow clicking through to underlying elements
`;

const Modal = styled.div`
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px;
    width: 400px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    gap: 20px;
    pointer-events: auto; // Re-enable pointer events for the modal itself
    cursor: default;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: move;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
    margin: -20px -20px 20px -20px;
    padding: 15px 20px;
    background: var(--bg-secondary);
    border-radius: 8px 8px 0 0;
`;

const Title = styled.h3`
    margin: 0;
    color: var(--text-primary);
    font-size: 16px;
    user-select: none;
`;

const CloseButton = styled.button`
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 20px;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    
    &:hover {
        color: var(--text-primary);
    }
`;

const ControlGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Label = styled.label`
    font-size: 12px;
    color: var(--text-secondary);
`;

const Row = styled.div`
    display: flex;
    gap: 10px;
    align-items: center;
`;

const Input = styled.input`
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    color: var(--text-primary);
    padding: 6px;
    border-radius: 4px;
    font-size: 12px;
    flex: 1;
    
    &[type="color"] {
        padding: 0 2px;
        height: 30px;
        flex: 0 0 50px;
    }
`;

const Select = styled.select`
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    color: var(--text-primary);
    padding: 6px;
    border-radius: 4px;
    font-size: 12px;
    width: 100%;
`;

const ButtonGroup = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 10px;
`;

const Button = styled.button`
    padding: 6px 16px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    border: 1px solid transparent;
    
    ${props => props.$primary ? `
        background: var(--accent);
        color: white;
    ` : `
        background: transparent;
        border-color: var(--border);
        color: var(--text-primary);
    `}

    &:hover {
        opacity: 0.9;
    }
`;

const fonts = [
    { name: 'Default', value: '' },
    { name: 'Arial', value: 'Arial, Helvetica, sans-serif' },
];

export default function SubtitleStyleModal({ item, onClose, onSave, onPreview }) {
    const { videoMeta } = useContext(StoreContext);
    const [style, setStyle] = useState({
        color: '',
        fontSize: '',
        fontFamily: '',
        x: '',
        y: ''
    });

    useEffect(() => {
        if (item && item.style) {
            setStyle({
                color: item.style.color || '',
                fontSize: item.style.fontSize || '',
                fontFamily: item.style.fontFamily || '',
                x: item.style.x !== undefined ? item.style.x : '',
                y: item.style.y !== undefined ? item.style.y : ''
            });
        }
    }, [item]);

    // Update preview whenever style changes
    useEffect(() => {
        if (onPreview) {
            const cleanStyle = {};
            if (style.color) cleanStyle.color = style.color;
            if (style.fontSize) cleanStyle.fontSize = Number(style.fontSize);
            if (style.fontFamily) cleanStyle.fontFamily = style.fontFamily;
            if (style.x !== '') cleanStyle.x = Number(style.x);
            if (style.y !== '') cleanStyle.y = Number(style.y);
            onPreview(cleanStyle);
        }
    }, [style, onPreview]);

    const handleChange = (key, value) => {
        setStyle(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        const cleanStyle = {};
        if (style.color) cleanStyle.color = style.color;
        if (style.fontSize) cleanStyle.fontSize = Number(style.fontSize);
        if (style.fontFamily) cleanStyle.fontFamily = style.fontFamily;
        if (style.x !== '') cleanStyle.x = Number(style.x);
        if (style.y !== '') cleanStyle.y = Number(style.y);

        onSave(cleanStyle);
    };

    const handleReset = () => {
        setStyle({
            color: '',
            fontSize: '',
            fontFamily: '',
            x: '',
            y: ''
        });
    };

    const resolutionText = videoMeta ? `${videoMeta.width}x${videoMeta.height}` : '1920x1080';

    return (
        <Overlay>
            <Draggable handle=".modal-header" defaultPosition={{ x: 0, y: 0 }}>
                <Modal onClick={e => e.stopPropagation()}>
                    <Header className="modal-header">
                        <Title>Subtitle Style Override</Title>
                        <CloseButton onClick={onClose}>&times;</CloseButton>
                    </Header>

                    <ControlGroup>
                        <Label>Font Family</Label>
                        <Select
                            value={style.fontFamily}
                            onChange={e => handleChange('fontFamily', e.target.value)}
                        >
                            {fonts.map(f => (
                                <option key={f.name} value={f.value}>{f.name}</option>
                            ))}
                        </Select>
                    </ControlGroup>

                    <Row>
                        <ControlGroup style={{ flex: 1 }}>
                            <Label>Font Size (px)</Label>
                            <Input
                                type="number"
                                value={style.fontSize}
                                onChange={e => handleChange('fontSize', e.target.value)}
                                placeholder="Default"
                            />
                        </ControlGroup>
                        <ControlGroup style={{ flex: 0 }}>
                            <Label>Color</Label>
                            <Input
                                type="color"
                                value={style.color || '#ffffff'}
                                onChange={e => handleChange('color', e.target.value)}
                            />
                        </ControlGroup>
                    </Row>

                    <Row>
                        <ControlGroup style={{ flex: 1 }}>
                            <Label>Position X (0-1920)</Label>
                            <Input
                                type="number"
                                value={style.x}
                                onChange={e => handleChange('x', e.target.value)}
                                placeholder="Default (Center)"
                            />
                        </ControlGroup>
                        <ControlGroup style={{ flex: 1 }}>
                            <Label>Position Y (0-1080)</Label>
                            <Input
                                type="number"
                                value={style.y}
                                onChange={e => handleChange('y', e.target.value)}
                                placeholder="Default"
                            />
                        </ControlGroup>
                    </Row>

                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        Note: Position X/Y are based on video resolution ({resolutionText}). Leave empty to use global settings.
                    </div>

                    <ButtonGroup>
                        <Button onClick={handleReset} style={{ marginRight: 'auto' }}>Reset</Button>
                        <Button onClick={onClose}>Cancel</Button>
                        <Button $primary onClick={handleSave}>Save</Button>
                    </ButtonGroup>
                </Modal>
            </Draggable>
        </Overlay>
    );
}

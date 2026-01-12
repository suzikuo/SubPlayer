import React, { useContext } from 'react';
import styled from 'styled-components';
import { StoreContext } from '../context/Store';

const Container = styled.div`
    padding: 10px 20px;
    display: flex;
    flex-direction: column;
    gap: 15px;
`;

const ControlGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
`;

const GroupLabel = styled.div`
    width: 40px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
`;

const ControlItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const Label = styled.label`
    font-size: 12px;
    color: var(--text-tertiary);
`;

const Input = styled.input`
    background-color: transparent;
    border: 1px solid var(--border);
    border-radius: 4px;
    outline: none;
    cursor: pointer;
    padding: 0;
    width: 40px;
    height: 24px;
    
    &[type="color"] {
        padding: 0 2px;
    }
`;

const RangeContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 140px;
`;

const RangeInput = styled.input`
    flex: 1;
    accent-color: var(--accent);
    cursor: pointer;
    height: 4px;
    background: var(--bg-tertiary);
    border-radius: 2px;
    appearance: none;
    -webkit-appearance: none;

    &::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--accent);
        cursor: pointer;
        box-shadow: 0 0 0 2px var(--bg-primary);
    }
`;

const ValueDisplay = styled.div`
    width: 30px;
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-size: 11px;
    color: var(--text-tertiary);
`;

const Select = styled.select`
    width: 200px;
    padding: 4px 8px;
    background-color: var(--bg-primary);
    border: 1px solid var(--border);
    color: var(--text-primary);
    border-radius: 4px;
    outline: none;
    font-size: 12px;
`;

const fonts = [
    { name: 'Arial', value: 'Arial, Helvetica, sans-serif' },
];

export default function StyleConfig() {
    const { styleConfig, setStyleConfig } = useContext(StoreContext);

    const handleChange = (key, value) => {
        setStyleConfig(prev => ({ ...prev, [key]: value }));
    };

    return (
        <Container>
            <ControlGroup>
                <GroupLabel>颜色</GroupLabel>
                <ControlItem>
                    <Label>主颜色</Label>
                    <Input
                        type="color"
                        value={styleConfig.color}
                        onChange={e => handleChange('color', e.target.value)}
                    />
                </ControlItem>
            </ControlGroup>

            <ControlGroup>
                <GroupLabel>尺寸</GroupLabel>
                <ControlItem>
                    <Label>字号</Label>
                    <RangeContainer>
                        <RangeInput
                            type="range"
                            min={12}
                            max={150}
                            step={1}
                            value={styleConfig.fontSize}
                            onChange={e => handleChange('fontSize', Number(e.target.value))}
                        />
                        <ValueDisplay>{styleConfig.fontSize}</ValueDisplay>
                    </RangeContainer>
                </ControlItem>

                <ControlItem>
                    <Label>字距</Label>
                    <RangeContainer>
                        <RangeInput
                            type="range"
                            min={0}
                            max={20}
                            step={0.5}
                            value={styleConfig.letterSpacing}
                            onChange={e => handleChange('letterSpacing', Number(e.target.value))}
                        />
                        <ValueDisplay>{styleConfig.letterSpacing}</ValueDisplay>
                    </RangeContainer>
                </ControlItem>

                <ControlItem>
                    <Label>底距</Label>
                    <RangeContainer>
                        <RangeInput
                            type="range"
                            min={0}
                            max={500}
                            step={5}
                            value={styleConfig.bottom}
                            onChange={e => handleChange('bottom', Number(e.target.value))}
                        />
                        <ValueDisplay>{styleConfig.bottom}</ValueDisplay>
                    </RangeContainer>
                </ControlItem>
            </ControlGroup>

            <ControlGroup>
                <GroupLabel>字体</GroupLabel>
                <Select
                    value={styleConfig.fontFamily}
                    onChange={e => handleChange('fontFamily', e.target.value)}
                >
                    {fonts.map(font => (
                        <option key={font.name} value={font.value}>{font.name}</option>
                    ))}
                </Select>
            </ControlGroup>
        </Container>
    );
}

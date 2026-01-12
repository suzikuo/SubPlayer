import React, { useContext, useState } from 'react';
import styled from 'styled-components';
import { StoreContext } from '../context/Store';
import googleTranslate from '../libs/googleTranslate';
import toast from 'react-hot-toast';
import EraserModal from './EraserModal';
import { Translate, t } from 'react-i18nify';

const ToolbarContainer = styled.div`
    padding: 10px 20px;
    display: flex;
    flex-direction: column;
    gap: 15px;
`;

const Button = styled.button`
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    padding: 8px;
    border-radius: var(--radius);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background-color: var(--accent);
        color: white;
        border-color: var(--accent);
    }
    
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const Select = styled.select`
    width: 100%;
    padding: 8px;
    background-color: var(--bg-primary);
    border: 1px solid var(--border);
    color: var(--text-primary);
    border-radius: var(--radius);
    outline: none;
`;



const languages = [
    { key: 'en', name: 'English' },
    { key: 'zh', name: 'Chinese' },
    { key: 'ja', name: 'Japanese' },
    { key: 'ko', name: 'Korean' },
    { key: 'fr', name: 'French' },
    { key: 'es', name: 'Spanish' },
    { key: 'ru', name: 'Russian' },
    { key: 'de', name: 'German' },
];

export default function Toolbar() {
    const { subtitle, setSubtitle, setLoading, videoFile, eraserRegion, showEraserPreview, setShowEraserPreview } = useContext(StoreContext);
    const [translateLang, setTranslateLang] = useState('en');
    const [showEraser, setShowEraser] = useState(false);

    const onTranslate = async () => {
        if (!subtitle.length) return toast.error(t('NO_SUBS_TO_TRANSLATE'));
        setLoading(t('TRANSLATING_TO'));

        try {
            const result = await googleTranslate(subtitle, translateLang);
            setSubtitle(result);
            toast.success(t('TRANSLATION_SUCCESS'));
        } catch (error) {
            toast.error(t('TRANSLATION_FAILED'));
            console.error(error);
        }
        setLoading('');
    };

    return (
        <ToolbarContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <Button onClick={() => setShowEraser(true)} disabled={!videoFile}>
                    <Translate value="SET_ERASER_REGION" />
                </Button>

                {eraserRegion && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                            type="checkbox"
                            id="previewEraser"
                            checked={showEraserPreview}
                            onChange={(e) => setShowEraserPreview(e.target.checked)}
                        />
                        <label htmlFor="previewEraser" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <Translate value="PREVIEW_ERASURE" />
                        </label>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '5px' }}>
                <Select
                    value={translateLang}
                    onChange={(e) => setTranslateLang(e.target.value)}
                >
                    {languages.map(lang => (
                        <option key={lang.key} value={lang.key}>{lang.name}</option>
                    ))}
                </Select>
                <Button onClick={onTranslate}>Translate</Button>
            </div>

            {showEraser && <EraserModal onClose={() => setShowEraser(false)} />}
        </ToolbarContainer>
    );
}

import React, { useState, useContext } from 'react';
import styled from 'styled-components';
import { StoreContext } from '../context/Store';
import toast from 'react-hot-toast';
import { burnSubtitle } from '../libs/ffmpeg';
import sub2ass from '../libs/readSub/sub2ass';
import { sub2vtt, sub2srt } from '../libs/readSub';
import { download, getVideoDimensions } from '../utils';
import { Translate, t } from 'react-i18nify';

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
`;

const Modal = styled.div`
    width: 450px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const Header = styled.div`
    padding: 15px 20px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg-tertiary);
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
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    
    &:hover {
        color: var(--text-primary);
    }
`;

const Body = styled.div`
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-height: 80vh;
    overflow-y: auto;
`;

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const SectionTitle = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 5px;
`;

const Button = styled.button`
    padding: 10px;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    border: 1px solid var(--border);
    background-color: var(--bg-primary);
    color: var(--text-primary);
    transition: all 0.2s;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 10px;

    &:hover {
        background-color: var(--bg-tertiary);
        border-color: var(--accent);
    }

    ${props => props.$primary && `
        background-color: var(--accent);
        color: white;
        border-color: var(--accent);
        
        &:hover {
            background-color: var(--accent-hover);
        }
    `}
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
`;

const Select = styled.select`
    width: 100%;
    padding: 8px;
    background-color: var(--bg-primary);
    border: 1px solid var(--border);
    color: var(--text-primary);
    border-radius: 4px;
    outline: none;
    font-size: 13px;
    
    &:focus {
        border-color: var(--accent);
    }
`;

const Label = styled.label`
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 12px;
    color: var(--text-secondary);
`;

export default function ExportModal() {
    const {
        setShowExportModal,
        subtitle,
        videoFile,
        styleConfig,
        displayMode,
        eraserRegion,
        eraserStrength,
        smartErasure,
        setLoading
    } = useContext(StoreContext);

    const [resolution, setResolution] = useState('original');
    const [quality, setQuality] = useState('medium'); // high, medium, low, custom
    const [customBitrate, setCustomBitrate] = useState('2000');

    const onClose = () => setShowExportModal(false);

    const onExportSub = (format) => {
        if (!subtitle || subtitle.length === 0) {
            toast.error(t('NO_SUBS_EXPORT'));
            return;
        }

        let content = '';
        let filename = 'subtitle';

        try {
            switch (format) {
                case 'srt':
                    content = sub2srt(subtitle);
                    filename += '.srt';
                    break;
                case 'vtt':
                    content = sub2vtt(subtitle);
                    filename += '.vtt';
                    break;
                case 'ass':
                    // We need video dimensions for ASS
                    // If video not loaded, default to 1920x1080?
                    // Or ask user? For now default.
                    // TODO: Restore displayMode when secondary subtitle feature is needed again
                    // content = sub2ass(subtitle, { ...styleConfig, displayMode, videoWidth: 1920, videoHeight: 1080 });
                    content = sub2ass(subtitle, { ...styleConfig, displayMode: 'main', videoWidth: 1920, videoHeight: 1080 });
                    filename += '.ass';
                    break;
                default:
                    return;
            }

            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            download(url, filename);
            toast.success(`${t('EXPORT_TITLE')} ${filename}`);
        } catch (error) {
            console.error(error);
            toast.error(t('EXPORT_SUB_FAILED'));
        }
    };

    const onExportVideo = async ({ burn, softSub = false, resolution, quality, customBitrate }) => {
        onClose();
        if (!videoFile) return toast.error(t('OPEN_VIDEO_FIRST'));
        // if (!subtitle.length) return toast.error('No subtitles to export'); // Not needed if erasing only

        if (!window.crossOriginIsolated) {
            toast.error(t('BROWSER_SECURITY_WARN'), {
                duration: 5000,
            });
            return;
        }

        setLoading(t('PROCESSING_VIDEO'));
        try {
            // const { width: videoWidth, height: videoHeight } = await getVideoDimensions(videoFile);

            let assContent = null;
            let subtitleName = 'subtitle.ass';
            let fontName = 'Noto Sans CJK SC';

            if ((burn || softSub) && subtitle.length > 0) {
                const { width: videoWidth, height: videoHeight } = await getVideoDimensions(videoFile);

                if (softSub) {
                    // For soft subs in MP4, SRT is safest for ffmpeg.wasm conversion to mov_text
                    // ASS is better for burning, but for soft subs mov_text is standard for MP4
                    // We can use sub2srt for soft subs
                    assContent = sub2srt(subtitle);
                    subtitleName = 'subtitle.srt';
                } else {
                    // Use ASS format for better style control and font support (Burning)
                    // TODO: Restore displayMode when secondary subtitle feature is needed again
                    // assContent = sub2ass(subtitle, { ...styleConfig, displayMode, videoWidth, videoHeight });
                    assContent = sub2ass(subtitle, { ...styleConfig, displayMode: 'main', videoWidth, videoHeight });

                    // Determine font family to use (Sans or Serif)
                    const isSans = styleConfig.fontFamily.includes('sans-serif');
                    const isSerif = !isSans && (
                        styleConfig.fontFamily.includes('serif') ||
                        styleConfig.fontFamily.includes('KaiTi') ||
                        styleConfig.fontFamily.includes('SongTi') ||
                        styleConfig.fontFamily.includes('Times') ||
                        styleConfig.fontFamily.includes('Georgia')
                    );
                    fontName = isSerif ? 'Noto Serif CJK SC' : 'Noto Sans CJK SC';
                }
            }

            const result = await burnSubtitle(videoFile, assContent, subtitleName, fontName, ({ ratio, message }) => {
                setLoading(message || `${t('PROCESSING_VIDEO')} ${(ratio * 100).toFixed(0)}%`);
            }, eraserRegion, null, eraserStrength, smartErasure ? subtitle : null, resolution, quality, customBitrate, softSub);

            const url = URL.createObjectURL(result);
            download(url, 'video_processed.mp4');
            toast.success(t('VIDEO_EXPORT_SUCCESS'));
        } catch (error) {
            console.error(error);
            toast.error(t('EXPORT_FAILED') + error.message);
        }
        setLoading('');
    };

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={e => e.stopPropagation()}>
                <Header>
                    <Title><Translate value="EXPORT_TITLE" /></Title>
                    <CloseButton onClick={onClose}>&times;</CloseButton>
                </Header>
                <Body>
                    <Section>
                        <SectionTitle><Translate value="EXPORT_SUBS" /></SectionTitle>
                        <Grid>
                            <Button style={{ justifyContent: 'center' }} onClick={() => onExportSub('srt')}>.SRT</Button>
                            <Button style={{ justifyContent: 'center' }} onClick={() => onExportSub('ass')}>.ASS</Button>
                            <Button style={{ justifyContent: 'center' }} onClick={() => onExportSub('vtt')}>.VTT</Button>
                        </Grid>
                    </Section>

                    <Section>
                        <SectionTitle><Translate value="VIDEO_SETTINGS" /></SectionTitle>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <Label>
                                <Translate value="RESOLUTION" />
                                <Select value={resolution} onChange={e => setResolution(e.target.value)}>
                                    <option value="original">{t('RES_ORIGINAL')}</option>
                                    <option value="1080p">1080p</option>
                                    <option value="720p">720p</option>
                                    <option value="480p">480p</option>
                                </Select>
                            </Label>
                            <Label>
                                <Translate value="QUALITY_BITRATE" />
                                <Select value={quality} onChange={e => setQuality(e.target.value)}>
                                    <option value="high"><Translate value="QUAL_HIGH" /></option>
                                    <option value="medium"><Translate value="QUAL_MEDIUM" /></option>
                                    <option value="low"><Translate value="QUAL_LOW" /></option>
                                    <option value="custom"><Translate value="QUAL_CUSTOM" /></option>
                                </Select>
                                {quality === 'custom' && (
                                    <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <input
                                            type="number"
                                            value={customBitrate}
                                            onChange={e => setCustomBitrate(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '6px',
                                                borderRadius: '4px',
                                                border: '1px solid var(--border)',
                                                backgroundColor: 'var(--bg-primary)',
                                                color: 'var(--text-primary)',
                                                outline: 'none',
                                                fontSize: '13px'
                                            }}
                                            placeholder="2000"
                                        />
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>kbps</span>
                                    </div>
                                )}
                            </Label>
                        </div>
                    </Section>

                    <Section>
                        <SectionTitle><Translate value="VIDEO_PROCESSING" /></SectionTitle>
                        <Button onClick={() => onExportVideo({ burn: false, resolution, quality, customBitrate })}>
                            <span>🧹</span>
                            <div>
                                <div style={{ fontWeight: 500 }}><Translate value="ERASE_SUBS_ONLY" /></div>
                                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}><Translate value="ERASE_SUBS_DESC" /></div>
                            </div>
                        </Button>
                        <Button $primary onClick={() => onExportVideo({ burn: true, resolution, quality, customBitrate })}>
                            <span>🔥</span>
                            <div>
                                <div style={{ fontWeight: 500 }}><Translate value="BURN_IN_SUBS" /></div>
                                <div style={{ fontSize: 12, opacity: 0.8 }}><Translate value="BURN_IN_DESC" /></div>
                            </div>
                        </Button>
                        <Button onClick={() => onExportVideo({ burn: false, softSub: true, resolution, quality, customBitrate })}>
                            <span>📦</span>
                            <div>
                                <div style={{ fontWeight: 500 }}><Translate value="EMBED_SOFT_SUBS" /></div>
                                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}><Translate value="EMBED_SOFT_DESC" /></div>
                            </div>
                        </Button>
                    </Section>
                </Body>
            </Modal>
        </Overlay>
    );
}

import React, { useContext, useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { StoreContext } from '../context/Store';
import { file2sub } from '../libs/readSub';
import { extractSubtitles } from '../libs/ffmpeg';
import toast from 'react-hot-toast';
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
    width: 600px;
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
    font-weight: 600;
    color: var(--text-primary);
`;

const CloseButton = styled.div`
    cursor: pointer;
    &:hover { color: var(--text-primary); }
    color: var(--text-secondary);
    font-size: 20px;
`;

const Body = styled.div`
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const Label = styled.div`
    font-size: 14px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 8px;
    
    svg { width: 16px; height: 16px; }
`;

const Input = styled.input`
    background-color: var(--bg-primary);
    border: 1px solid var(--border);
    color: var(--text-primary);
    padding: 10px;
    border-radius: 4px;
    outline: none;
    font-size: 14px;
    
    &:focus { border-color: var(--accent); }
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
`;

const Card = styled.div`
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 15px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    cursor: pointer;
    transition: all 0.2s;
    height: 100px;
    position: relative;
    overflow: hidden;

    &:hover {
        background-color: var(--bg-primary);
        border-color: var(--accent);
    }

    svg {
        width: 24px;
        height: 24px;
        color: var(--accent);
    }

    span {
        font-size: 13px;
        color: var(--text-secondary);
    }
    
    input[type="file"] {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
    }
`;

const CardButton = styled(Card)`
    background-color: ${props => props.$primary ? 'var(--accent)' : 'var(--bg-tertiary)'};
    color: ${props => props.$primary ? '#fff' : 'inherit'};
    
    &:hover {
        background-color: ${props => props.$primary ? 'var(--accent-hover)' : 'var(--bg-primary)'};
    }
    
    svg {
        color: ${props => props.$primary ? '#fff' : 'var(--accent)'};
    }
    
    span {
        color: ${props => props.$primary ? '#fff' : 'var(--text-secondary)'};
    }
`;

const Footer = styled.div`
    padding: 15px 20px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--bg-tertiary);
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 10px;
`;

const FooterButton = styled.button`
    padding: 8px 20px;
    border-radius: 4px;
    font-size: 14px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
    
    &.cancel {
        background-color: transparent;
        border: 1px solid var(--border);
        color: var(--text-secondary);
        &:hover { background-color: var(--bg-primary); }
    }
    
    &.confirm {
        background-color: var(--accent);
        color: white;
        &:hover { background-color: var(--accent-hover); }
    }
    
    &.reset {
        background-color: transparent;
        color: var(--text-secondary);
        &:hover { color: var(--text-primary); }
    }
    
    &.donate {
        background-color: #ef4444;
        color: white;
        &:hover { background-color: #dc2626; }
    }
`;

const InfoText = styled.div`
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export default function CreateTask() {
    const {
        showCreateTask, setShowCreateTask,
        setVideoFile, setSubtitle, player,
        clearSubs
    } = useContext(StoreContext);

    const [taskName, setTaskName] = useState('');
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [selectedSub, setSelectedSub] = useState(null);
    const [embeddedSubs, setEmbeddedSubs] = useState([]);
    const [subMode, setSubMode] = useState(''); // 'local', 'empty', 'embedded'
    const [processing, setProcessing] = useState(false);
    const [recording, setRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    if (!showCreateTask) return null;

    const onClose = () => {
        setShowCreateTask(false);
    };

    const startRecording = async (type) => {
        try {
            let stream;
            if (type === 'screen') {
                stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            } else {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            }

            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const file = new File([blob], `recorded_${Date.now()}.webm`, { type: 'video/webm' });
                setSelectedVideo(file);
                setRecording(false);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
                toast.success('Recording finished');
            };

            mediaRecorderRef.current.start();
            setRecording(true);
            toast.success('Recording started. Click again to stop.');
        } catch (err) {
            console.error(err);
            toast.error('Failed to start recording: ' + err.message);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
        }
    };

    const handleRecordingClick = (type) => {
        if (recording) {
            stopRecording();
        } else {
            startRecording(type);
        }
    };

    const handleOnlineVideo = () => {
        const url = prompt(t('ENTER_VIDEO_URL'));
        if (url) {
            try {
                new URL(url);
                setSelectedVideo({
                    name: 'Online Video',
                    url: url,
                    type: 'online'
                });
            } catch (e) {
                toast.error(t('INVALID_URL'));
            }
        }
    };

    const handleVideoChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedVideo(file);
            setEmbeddedSubs([]); // Clear previous

            // Only try to extract if it's a video file that might have tracks (mp4, mkv, mov, webm)
            const ext = file.name.split('.').pop().toLowerCase();
            if (['mp4', 'mkv', 'mov', 'webm'].includes(ext)) {
                const toastId = toast.loading(t('CHECKING_EMBEDDED_SUBS'));
                try {
                    const subs = await extractSubtitles(file);
                    if (subs && subs.length > 0) {
                        setEmbeddedSubs(subs);
                        toast.success(t('FOUND_EMBEDDED_SUBS').replace('%s', subs.length), { id: toastId });
                    } else {
                        toast.dismiss(toastId);
                    }
                } catch (err) {
                    console.error(err);
                    toast.dismiss(toastId);
                }
            }
        }
    };

    const handleSubChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedSub(file);
            setSubMode('local');
        }
    };

    const handleConfirm = async () => {
        if (processing) return;

        if (selectedVideo) {
            if (selectedVideo.type === 'online') {
                setVideoFile(null);
                if (player) {
                    if (player.art) {
                        player.art.switchUrl(selectedVideo.url);
                    } else {
                        player.src = selectedVideo.url;
                    }
                } else {
                    toast.error(t('PLAYER_NOT_READY'));
                }
            } else {
                setVideoFile(selectedVideo);
                const url = URL.createObjectURL(selectedVideo);
                if (player) {
                    if (player.art) {
                        player.art.switchUrl(url);
                    } else {
                        player.src = url;
                    }
                } else {
                    toast.error(t('PLAYER_NOT_READY'));
                }
            }
        }

        if ((subMode === 'local' || subMode === 'embedded') && selectedSub) {
            file2sub(selectedSub)
                .then((res) => {
                    setSubtitle(res);
                    toast.success(t('SUB_LOADED'));
                    setShowCreateTask(false);
                })
                .catch((err) => toast.error(err.message));
        } else if (subMode === 'empty') {
            clearSubs();
            toast.success(t('EMPTY_SUB_CREATED'));
            setShowCreateTask(false);
        } else {
            setShowCreateTask(false);
        }
    };

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={e => e.stopPropagation()}>
                <Header>
                    <div><Translate value="CREATE_TASK_TITLE" /></div>
                    <CloseButton onClick={onClose}>×</CloseButton>
                </Header>
                <Body>
                    <Section>
                        <Label>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            <Translate value="TASK_NAME" />
                        </Label>
                        <Input
                            placeholder={t('TASK_NAME_PLACEHOLDER')}
                            value={taskName}
                            onChange={e => setTaskName(e.target.value)}
                        />
                    </Section>

                    <Section>
                        <Label>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                            <Translate value="VIDEO_FILE" />
                        </Label>
                        <Grid>
                            <Card>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                <span><Translate value="SELECT_LOCAL_VIDEO" /></span>
                                <input type="file" onChange={handleVideoChange} accept="video/*,audio/*" />
                            </Card>
                            <Card onClick={handleOnlineVideo}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
                                <span><Translate value="ONLINE_VIDEO_URL" /></span>
                            </Card>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <Card style={{ flex: 1, height: 'auto', gap: 5, padding: 5 }} onClick={() => handleRecordingClick('camera')}>
                                    <span style={{ fontSize: 12 }}>{recording ? '🔴 Stop' : <Translate value="CAMERA_RECORD" />}</span>
                                </Card>
                                <Card style={{ flex: 1, height: 'auto', gap: 5, padding: 5 }} onClick={() => handleRecordingClick('screen')}>
                                    <span style={{ fontSize: 12 }}>{recording ? '🔴 Stop' : <Translate value="SCREEN_RECORD" />}</span>
                                </Card>
                            </div>
                        </Grid>
                        <InfoText>{selectedVideo ? `${t('SELECTED_PREFIX')}${selectedVideo.name}` : <Translate value="SUPPORTED_VIDEO_EXT" />}</InfoText>
                    </Section>

                    <Section>
                        <Label>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                            <Translate value="GENERATE_SUBTITLE" />
                        </Label>
                        <Grid>
                            <Card>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                <span><Translate value="OPEN_LOCAL_SUB" /></span>
                                <input type="file" onChange={handleSubChange} accept=".srt,.vtt,.ass,.json" />
                            </Card>
                            <Card onClick={() => setSubMode('empty')}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="18"></line></svg>
                                <span><Translate value="CREATE_EMPTY_SUB" /></span>
                            </Card>
                        </Grid>

                        {embeddedSubs.length > 0 && (
                            <div style={{ marginTop: 10 }}>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 5 }}><Translate value="DETECTED_EMBEDDED_SUB" /></div>
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    {embeddedSubs.map((sub, index) => (
                                        <CardButton
                                            key={index}
                                            style={{ width: 'auto', height: 'auto', padding: '8px 15px', flexDirection: 'row' }}
                                            $primary={subMode === 'embedded' && selectedSub === sub.file}
                                            onClick={() => {
                                                setSelectedSub(sub.file);
                                                setSubMode('embedded');
                                            }}
                                        >
                                            <span style={{ fontSize: 12 }}>
                                                #{sub.index} {sub.lang !== 'und' ? `[${sub.lang}]` : ''} ({sub.codec})
                                            </span>
                                        </CardButton>
                                    ))}
                                </div>
                            </div>
                        )}

                        <InfoText>
                            {subMode === 'local' && selectedSub ? `${t('SELECTED_PREFIX')}${selectedSub.name}` :
                                subMode === 'embedded' && selectedSub ? `${t('SELECTED_PREFIX')}embedded (${selectedSub.name})` :
                                    subMode === 'empty' ? `${t('SELECTED_PREFIX')}${t('CREATE_EMPTY_SUB')}` :
                                        <Translate value="SUPPORTED_SUB_EXT" />}
                        </InfoText>
                    </Section>
                </Body>
                <Footer>
                    <ButtonGroup>
                        <FooterButton className="cancel" onClick={onClose}><Translate value="CANCEL" /></FooterButton>
                        <FooterButton className="reset" onClick={() => {
                            setTaskName('');
                            setSelectedVideo(null);
                            setSelectedSub(null);
                            setSubMode('');
                        }}><Translate value="RESET" /></FooterButton>
                    </ButtonGroup>
                    <ButtonGroup>
                        <FooterButton className="confirm" onClick={handleConfirm}><Translate value="CONFIRM" /></FooterButton>
                    </ButtonGroup>
                </Footer>
            </Modal>
        </Overlay>
    );
}
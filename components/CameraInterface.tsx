
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Album } from '../types';

interface CameraInterfaceProps {
  albums: Album[];
  onClose: () => void;
  onCapture: (albumId: string, url: string) => void;
  onDeletePhoto: (url: string) => void;
}

type CaptureMode = 'photo' | 'video';
type FlashMode = 'off' | 'on' | 'auto';
type TimerMode = 0 | 3 | 10;

const CameraInterface: React.FC<CameraInterfaceProps> = ({ albums, onClose, onCapture, onDeletePhoto }) => {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>(albums[0]?.id || '');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [captureMode, setCaptureMode] = useState<CaptureMode>('photo');
  const [sessionPhotos, setSessionPhotos] = useState<string[]>([]);
  const [showQuickPreview, setShowQuickPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [focusPoint, setFocusPoint] = useState<{ x: number, y: number } | null>(null);
  const [exposure, setExposure] = useState(1);
  const [cameraReady, setCameraReady] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // New Camera Features
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [timerMode, setTimerMode] = useState<TimerMode>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashActive, setIsFlashActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);

  const activeThemeColor = useMemo(() => {
    return albums.find(a => a.id === selectedAlbumId)?.themeColor || '#ffffff';
  }, [albums, selectedAlbumId]);

  useEffect(() => {
    async function setupCamera() {
      setCameraReady(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      try {
        const constraints: MediaStreamConstraints = {
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: true
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setCameraReady(true);
            videoRef.current?.play().catch(console.error);
          };
        }
      } catch (err) {
        console.error("Camera access failed", err);
      }
    }
    setupCamera();
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, [facingMode]);

  const saveToDeviceStorage = (url: string, isVideo: boolean = false) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `Capture-${Date.now()}.${isVideo ? 'webm' : 'jpg'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async (url: string) => {
    setIsSharing(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const isVideo = url.startsWith('blob:');
      const file = new File([blob], `Capture-${Date.now()}.${isVideo ? 'webm' : 'jpg'}`, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Capture & Categorize' });
      } else {
        alert("Sharing not available.");
      }
    } catch (err) { console.error(err); } finally { setIsSharing(false); }
  };

  const executeCaptureAction = () => {
    if (captureMode === 'video') {
      isRecording ? stopRecording() : startRecording();
    } else {
      executeCapture();
    }
  };

  const handleShutterPress = () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    if (timerMode > 0) {
      setCountdown(timerMode);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === 1) {
            clearInterval(interval);
            executeCaptureAction();
            return null;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);
    } else {
      executeCaptureAction();
    }
  };

  const executeCapture = () => {
    if (!videoRef.current || !canvasRef.current || !selectedAlbumId) return;
    
    // Simulate Flash
    if (flashMode === 'on' || (flashMode === 'auto' && Math.random() > 0.5)) {
      setIsFlashActive(true);
      setTimeout(() => setIsFlashActive(false), 150);
    }

    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { alpha: false });
    
    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.save();
      context.filter = `brightness(${exposure})`;
      if (facingMode === 'user') {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      context.restore();
      
      const url = canvas.toDataURL('image/jpeg', 0.95);
      onCapture(selectedAlbumId, url);
      setSessionPhotos(prev => [url, ...prev]);
      saveToDeviceStorage(url, false);
    }
    setTimeout(() => setIsCapturing(false), 100);
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    recordingChunksRef.current = [];
    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp9,opus' });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        saveToDeviceStorage(url, true);
        onCapture(selectedAlbumId, url);
        setSessionPhotos(prev => [url, ...prev]);
        setIsRecording(false);
        setRecordingDuration(0);
      };
      recorder.start();
      setIsRecording(true);
      recordingIntervalRef.current = window.setInterval(() => setRecordingDuration(p => p + 1), 1000);
    } catch (err) { console.error(err); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const handleDeleteSessionPhoto = () => {
    const urlToDelete = sessionPhotos[previewIndex];
    if (urlToDelete && confirm('Delete this capture?')) {
      onDeletePhoto(urlToDelete);
      const updated = sessionPhotos.filter((_, i) => i !== previewIndex);
      setSessionPhotos(updated);
      if (updated.length === 0) setShowQuickPreview(false);
      else if (previewIndex >= updated.length) setPreviewIndex(updated.length - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden select-none touch-none transition-colors duration-500">
      <div 
        className="absolute inset-0 pointer-events-none opacity-20 transition-all duration-700 z-10" 
        style={{ background: `radial-gradient(circle at bottom, ${activeThemeColor} 0%, transparent 70%)` }} 
      />

      {/* Viewfinder */}
      <div 
        className="absolute inset-0 z-0" 
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setFocusPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          setTimeout(() => setFocusPoint(null), 3000);
        }}
      >
        <video 
          ref={videoRef} autoPlay playsInline muted
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : '', filter: `brightness(${exposure})` }}
          className="w-full h-full object-cover"
        />
        
        {/* Shutter/Flash Overlays */}
        <div className={`absolute inset-0 bg-white z-[60] transition-opacity duration-100 pointer-events-none ${isCapturing ? 'opacity-100' : 'opacity-0'}`} />
        <div className={`absolute inset-0 bg-white z-[65] transition-opacity duration-150 pointer-events-none ${isFlashActive ? 'opacity-80' : 'opacity-0'}`} />

        <canvas ref={canvasRef} className="hidden" />
        
        {/* Countdown Timer UI */}
        {countdown !== null && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/20 pointer-events-none">
            <span className="text-white text-[120px] font-black animate-ping">{countdown}</span>
          </div>
        )}

        {/* Focus & Exposure Controls */}
        {focusPoint && (
          <div className="absolute z-30 pointer-events-none" style={{ left: focusPoint.x - 40, top: focusPoint.y - 40 }}>
            <div className="w-20 h-20 border-2 rounded-lg animate-pulse" style={{ borderColor: activeThemeColor }} />
            <div className="absolute -right-8 top-0 h-20 w-1.5 bg-white/10 rounded-full overflow-hidden pointer-events-auto">
               <input 
                 type="range" min="0.3" max="2.5" step="0.1" value={exposure}
                 onChange={(e) => setExposure(parseFloat(e.target.value))}
                 className="absolute inset-0 w-20 h-1.5 opacity-0 cursor-pointer -rotate-90 origin-left translate-y-20"
               />
               <div className="absolute bottom-0 left-0 right-0 transition-all duration-75" style={{ height: `${((exposure - 0.3) / 2.2) * 100}%`, backgroundColor: activeThemeColor }} />
            </div>
            <svg className="absolute -right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" /></svg>
          </div>
        )}

        {isRecording && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-red-600 px-4 py-1 rounded-full flex items-center gap-2 shadow-2xl">
            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            <span className="text-white text-xs font-black tabular-nums">{Math.floor(recordingDuration/60)}:{(recordingDuration%60).toString().padStart(2,'0')}</span>
          </div>
        )}
      </div>

      <div className="relative h-full w-full flex flex-col justify-between z-20 pointer-events-none pb-12 pt-14">
        {/* Top Controls */}
        <div className="p-4 flex justify-between items-center pointer-events-auto">
          {!isRecording && (
            <button onClick={onClose} className="p-3 bg-black/40 backdrop-blur-xl rounded-full text-white border border-white/10 active:scale-75 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}

          <div className="flex bg-black/40 backdrop-blur-xl rounded-full border border-white/10 px-2">
             <button onClick={() => setFlashMode(f => f === 'off' ? 'on' : f === 'on' ? 'auto' : 'off')} className="p-3 text-white active:scale-90 transition-transform flex items-center gap-1">
               <svg className={`w-5 h-5 ${flashMode !== 'off' ? 'text-yellow-400 fill-yellow-400' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
               <span className="text-[8px] font-black uppercase">{flashMode === 'auto' ? 'A' : ''}</span>
             </button>
             <button onClick={() => setTimerMode(t => t === 0 ? 3 : t === 3 ? 10 : 0)} className={`p-3 text-white active:scale-90 transition-transform text-[10px] font-black flex items-center gap-1 ${timerMode > 0 ? 'text-blue-400' : ''}`}>
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               {timerMode > 0 ? `${timerMode}s` : ''}
             </button>
          </div>

          {!isRecording && (
            <button onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} className="p-3 bg-black/40 backdrop-blur-xl rounded-full text-white border border-white/10 active:scale-75 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="p-6 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-auto flex flex-col items-center">
          {!isRecording && (
            <div className="w-full flex justify-center overflow-x-auto no-scrollbar gap-2 mb-8 h-12 items-center px-4">
              {albums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => setSelectedAlbumId(album.id)}
                  style={{ backgroundColor: selectedAlbumId === album.id ? activeThemeColor : 'rgba(0,0,0,0.5)', borderColor: selectedAlbumId === album.id ? activeThemeColor : 'rgba(255,255,255,0.1)' }}
                  className={`flex-shrink-0 px-4 py-2 rounded-full transition-all duration-300 text-[10px] font-black uppercase tracking-widest border ${selectedAlbumId === album.id ? 'text-black shadow-lg scale-105' : 'text-white/40'}`}
                >
                  {album.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-8 mb-8">
            {['photo', 'video'].map((m) => (
              <button key={m} onClick={() => !isRecording && setCaptureMode(m as any)} className="text-xs font-black uppercase tracking-[0.4em] relative transition-colors duration-300" style={{ color: captureMode === m ? 'white' : 'rgba(255,255,255,0.3)' }}>
                {m}
                {captureMode === m && <div className="absolute -bottom-2 left-0 right-0 h-0.5 transition-all duration-500" style={{ backgroundColor: activeThemeColor }} />}
              </button>
            ))}
          </div>

          <div className="w-full flex items-center justify-around">
            <button 
              onClick={() => sessionPhotos.length > 0 && setShowQuickPreview(true)} 
              className="w-14 h-14 rounded-2xl border-2 bg-zinc-900 overflow-hidden active:scale-90 transition-all"
              style={{ borderColor: sessionPhotos.length > 0 ? activeThemeColor : 'rgba(255,255,255,0.1)' }}
            >
              {sessionPhotos[0] ? (
                sessionPhotos[0].startsWith('blob:') ? <video src={sessionPhotos[0]} className="w-full h-full object-cover" /> : <img src={sessionPhotos[0]} className="w-full h-full object-cover" alt="" />
              ) : null}
            </button>
            
            <button onClick={handleShutterPress} disabled={countdown !== null} className="relative active:scale-90 transition-transform disabled:opacity-50">
              <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${isRecording ? 'p-5' : 'p-1'}`} style={{ borderColor: activeThemeColor }}>
                <div className={`w-full h-full transition-all duration-300 ${isRecording ? 'rounded-lg bg-red-600 animate-pulse' : (captureMode === 'video' ? 'bg-red-600 rounded-full' : 'bg-white rounded-full')}`} />
              </div>
            </button>

            <div className="w-14 h-14 flex items-center justify-center">
              {exposure !== 1 && (
                <button onClick={() => setExposure(1)} className="p-2 bg-black/40 rounded-full border border-white/10 text-[8px] font-black uppercase tracking-tighter text-yellow-400">RESET EV</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showQuickPreview && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <header className="p-4 flex justify-between items-center pt-14 z-10 px-6">
            <button onClick={() => setShowQuickPreview(false)} className="p-3 bg-zinc-900 rounded-full text-white active:scale-75 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="flex gap-4">
               <button disabled={isSharing} onClick={() => handleShare(sessionPhotos[previewIndex])} className="p-3 bg-white text-black rounded-full active:scale-90 transition-transform shadow-2xl" style={{ backgroundColor: activeThemeColor }}>
                 {isSharing ? <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>}
               </button>
               <button onClick={handleDeleteSessionPhoto} className="p-3 bg-red-600/20 text-red-500 rounded-full active:scale-90 transition-transform">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
               </button>
            </div>
          </header>
          <div className="flex-1 flex overflow-x-auto snap-x snap-mandatory no-scrollbar" onScroll={e => setPreviewIndex(Math.round(e.currentTarget.scrollLeft / window.innerWidth))}>
            {sessionPhotos.map((url, idx) => (
              <div key={idx} className="w-screen h-full flex-shrink-0 snap-center flex items-center justify-center">
                {url.startsWith('blob:') ? <video src={url} controls className="max-w-full max-h-full object-contain" /> : <img src={url} className="max-w-full max-h-full object-contain" alt="" />}
              </div>
            ))}
          </div>
        </div>
      )}
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
};

export default CameraInterface;

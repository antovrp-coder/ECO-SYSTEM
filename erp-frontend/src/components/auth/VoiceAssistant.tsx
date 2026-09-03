import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';
import { useNotification } from '../../context/NotificationContext';
import { X, Mic, MicOff, Volume2, Sparkles, AlertCircle, ArrowRight, Play } from 'lucide-react';
import { ThemeId } from '../../types';
import { LanguageId } from '../../i18n/translations';

interface VoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateModule: (moduleName: string) => void;
  onOpenAuth: () => void;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  isOpen,
  onClose,
  onNavigateModule,
  onOpenAuth,
}) => {
  const { logout } = useAuth();
  const { setTheme } = useTheme();
  const { language, setLanguage, translateEntity } = useI18n();
  const { info, success, warning, error: notifyError } = useNotification();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [manualInput, setManualInput] = useState('');

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCommand = (rawText: string) => {
    const text = rawText.toLowerCase().trim();
    setLastCommand(rawText);
    setErrorMessage(null);

    // Navigation commands
    if (text.includes('inventory') || text.includes('stock') || text.includes('sku')) {
      onNavigateModule('Inventory');
      speak('Opening Inventory workspace');
      success('Voice command: Opened Inventory');
      return;
    }
    if (text.includes('hr') || text.includes('human resources') || text.includes('employee') || text.includes('payroll')) {
      onNavigateModule('HR');
      speak('Opening HR workspace');
      success('Voice command: Opened HR');
      return;
    }
    if (text.includes('crm') || text.includes('customer') || text.includes('leads') || text.includes('deals')) {
      onNavigateModule('CRM');
      speak('Opening CRM workspace');
      success('Voice command: Opened CRM');
      return;
    }
    if (text.includes('purchase') || text.includes('vendor') || text.includes('requisition')) {
      onNavigateModule('Purchase');
      speak('Opening Purchase workspace');
      success('Voice command: Opened Purchase');
      return;
    }
    if (text.includes('finance') || text.includes('invoice') || text.includes('ledger') || text.includes('claim')) {
      onNavigateModule('Finance');
      speak('Opening Finance workspace');
      success('Voice command: Opened Finance');
      return;
    }
    if (text.includes('pos') || text.includes('point of sale') || text.includes('register') || text.includes('cashier')) {
      onNavigateModule('POS');
      speak('Opening Point of Sale register');
      success('Voice command: Opened POS');
      return;
    }
    if (text.includes('ecommerce') || text.includes('store') || text.includes('shop') || text.includes('catalog')) {
      onNavigateModule('Ecommerce');
      speak('Opening Ecommerce storefront');
      success('Voice command: Opened Ecommerce');
      return;
    }
    if (text.includes('admin') || text.includes('administration') || text.includes('menu assignment') || text.includes('role')) {
      onNavigateModule('Administration');
      speak('Opening Administration & RBAC console');
      success('Voice command: Opened Administration');
      return;
    }

    // Themes
    if (text.includes('dark') || text.includes('midnight')) {
      setTheme('dark');
      speak('Dark theme activated');
      success('Theme changed to Dark');
      return;
    }
    if (text.includes('light') || text.includes('cloud')) {
      setTheme('light');
      speak('Light theme activated');
      success('Theme changed to Light');
      return;
    }
    if (text.includes('ocean')) {
      setTheme('ocean');
      speak('Ocean theme activated');
      success('Theme changed to Ocean');
      return;
    }
    if (text.includes('forest')) {
      setTheme('forest');
      speak('Forest theme activated');
      success('Theme changed to Forest');
      return;
    }
    if (text.includes('sunrise')) {
      setTheme('sunrise');
      speak('Sunrise theme activated');
      success('Theme changed to Sunrise');
      return;
    }
    if (text.includes('rose')) {
      setTheme('rose');
      speak('Rose theme activated');
      success('Theme changed to Rose');
      return;
    }

    // Languages
    if (text.includes('english')) {
      setLanguage('en');
      speak('Language set to English');
      success('Language: English');
      return;
    }
    if (text.includes('hindi') || text.includes('हिंदी')) {
      setLanguage('hi');
      speak('भाषा हिंदी पर सेट की गई');
      success('Language: Hindi');
      return;
    }
    if (text.includes('tamil') || text.includes('தமிழ்')) {
      setLanguage('ta');
      speak('மொழி தமிழாக மாற்றப்பட்டது');
      success('Language: Tamil');
      return;
    }
    if (text.includes('telugu') || text.includes('తెలుగు')) {
      setLanguage('te');
      speak('భాష తెలుగుగా మార్చబడింది');
      success('Language: Telugu');
      return;
    }
    if (text.includes('kannada') || text.includes('ಕನ್ನಡ')) {
      setLanguage('kn');
      speak('ಭಾಷೆಯನ್ನು ಕನ್ನಡಕ್ಕೆ ಹೊಂದಿಸಲಾಗಿದೆ');
      success('Language: Kannada');
      return;
    }

    // Window and Mic Control
    if (
      text.includes('close mic') ||
      text.includes('close microphone') ||
      text.includes('close window') ||
      text.includes('close voice') ||
      text.includes('stop mic') ||
      text.includes('stop listening') ||
      text.includes('exit mic') ||
      text.includes('close assistant') ||
      text === 'close' ||
      text === 'exit' ||
      text.includes('माइक बंद') ||
      text.includes('बंद करो') ||
      text.includes('மூடு') ||
      text.includes('మూసివేయి') ||
      text.includes('ಮುಚ್ಚು')
    ) {
      speak('Closing microphone');
      success('Microphone closed');
      stopListeningSession();
      onClose();
      return;
    }

    // Auth
    if (text.includes('logout') || text.includes('sign out')) {
      logout();
      speak('Logged out');
      success('Signed out');
      onClose();
      return;
    }
    if (text.includes('login') || text.includes('sign in')) {
      onClose();
      onOpenAuth();
      return;
    }

    speak(`Command processed: ${rawText}`);
    info(`Voice command heard: "${rawText}"`);
  };

  const startListeningSession = async () => {
    setErrorMessage(null);

    // 1. Request microphone stream to verify mic input & drive visualizer
    try {
      if (!mediaStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateAudioMeter = () => {
          if (!mediaStreamRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animationFrameRef.current = requestAnimationFrame(updateAudioMeter);
        };
        updateAudioMeter();
      }
    } catch (err: any) {
      setErrorMessage('Microphone access denied or not available. Please allow microphone permissions.');
    }

    // 2. Start Speech Recognition
    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage('Speech Recognition API is not supported in this browser. You can use the quick command input below.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;

      // Match recognition language
      const langMap: Record<LanguageId, string> = {
        en: 'en-US',
        hi: 'hi-IN',
        ta: 'ta-IN',
        te: 'te-IN',
        kn: 'kn-IN',
      };
      recognition.lang = langMap[language] || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            const spokenText = res[0].transcript;
            setTranscript(spokenText);
            handleCommand(spokenText);
          } else {
            currentTranscript += res[0].transcript;
            setTranscript(currentTranscript);
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // Graceful no-speech timeout; keep listening
          return;
        }
        if (event.error === 'not-allowed') {
          setIsListening(false);
          setErrorMessage('Microphone permission blocked. Please click the camera/mic icon in the browser address bar to allow.');
          return;
        }
        if (event.error === 'network') {
          setErrorMessage('Speech service network timeout. You can also run commands by clicking below.');
        }
      };

      recognition.onend = () => {
        // Automatically resume listening if modal is still open
        if (isOpen && isListening) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognition.start();
      setIsListening(true);
    } catch (err: any) {
      setErrorMessage('Failed to start speech recognition. ' + (err.message || ''));
    }
  };

  const stopListeningSession = () => {
    setIsListening(false);
    setAudioLevel(0);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      void startListeningSession();
    } else {
      stopListeningSession();
      setTranscript('');
      setLastCommand('');
      setErrorMessage(null);
    }

    return () => {
      stopListeningSession();
    };
  }, [isOpen]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleCommand(manualInput);
    setManualInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="erp-modal-overlay">
      <div className="erp-modal" style={{ padding: '2rem', maxWidth: '30rem', textAlign: 'center' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--app-muted)',
            cursor: 'pointer',
            padding: '0.25rem',
            borderRadius: '50%',
          }}
        >
          <X size={20} />
        </button>

        {/* Dynamic Mic Visualizer */}
        <div style={{ position: 'relative', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem' }}>
          {isListening && (
            <div
              style={{
                position: 'absolute',
                width: `${76 + audioLevel * 0.8}px`,
                height: `${76 + audioLevel * 0.8}px`,
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.25)',
                transition: 'width 0.1s ease-out, height 0.1s ease-out',
                pointerEvents: 'none',
              }}
            />
          )}

          <button
            onClick={() => {
              if (isListening) {
                stopListeningSession();
              } else {
                void startListeningSession();
              }
            }}
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: isListening ? 'var(--app-primary)' : 'var(--app-hover)',
              color: isListening ? '#ffffff' : 'var(--app-muted)',
              border: isListening ? '4px solid rgba(255, 255, 255, 0.4)' : '1px solid var(--app-border)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isListening ? '0 0 20px rgba(59, 130, 246, 0.5)' : 'none',
              zIndex: 1,
            }}
            title={isListening ? 'Click to stop listening' : 'Click to start listening'}
          >
            {isListening ? <Mic size={32} /> : <MicOff size={32} />}
          </button>
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--app-text)' }}>
          {translateEntity('Voice Assistant')}
        </h2>
        
        <p style={{ fontSize: '0.8125rem', color: isListening ? 'var(--app-primary)' : 'var(--app-text-subtle)', marginTop: '0.25rem', fontWeight: 600 }}>
          {isListening ? (audioLevel > 5 ? '🎙️ Hearing your voice...' : 'Listening... Speak now') : 'Microphone paused. Click mic to speak.'}
        </p>

        {errorMessage && (
          <div style={{ marginTop: '0.75rem', padding: '0.625rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--app-danger)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {transcript && (
          <div style={{ margin: '1rem 0', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--app-hover)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--app-text)' }}>
            "{transcript}"
          </div>
        )}

        {lastCommand && (
          <div style={{ margin: '0.5rem 0', fontSize: '0.75rem', color: 'var(--app-success)', fontWeight: 700 }}>
            ✓ {translateEntity('Actions')}: "{lastCommand}"
          </div>
        )}

        {/* Quick Command Bar */}
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <input
            type="text"
            className="erp-input"
            style={{ fontSize: '0.8125rem' }}
            placeholder="Or type voice command (e.g. Open POS)..."
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
          />
          <button type="submit" className="erp-btn erp-btn-primary" style={{ padding: '0 0.875rem' }}>
            <Play size={14} />
          </button>
        </form>

        {/* Interactive Quick Command Chips */}
        <div style={{ marginTop: '1.25rem', textAlign: 'left', background: 'var(--app-bg)', padding: '0.875rem', borderRadius: '0.75rem', border: '1px solid var(--app-border)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--app-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Sparkles size={12} color="var(--app-primary)" /> Quick Voice Commands:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {[
              'Open Inventory',
              'Open POS',
              'Open HR',
              'Open CRM',
              'Open Finance',
              'Open Admin',
              'Switch to dark mode',
              'Set language to Hindi',
              'Set language to Tamil',
              'Close Mic',
            ].map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => handleCommand(cmd)}
                style={{
                  background: 'var(--app-hover)',
                  border: '1px solid var(--app-border)',
                  color: 'var(--app-text)',
                  fontSize: '0.725rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.15s ease',
                }}
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotification } from '../../context/NotificationContext';
import {
  User,
  KeyRound,
  ScanFace,
  Globe,
  Palette,
  Megaphone,
  Mic,
  Save,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { LanguageId } from '../../i18n/translations';
import { ThemeId } from '../../types';

interface ProfileSettingsProps {
  onOpenFaceEnrollModal: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onOpenFaceEnrollModal }) => {
  const { user, userRole, registerPasskey, disablePasskey, disableFace, updateUser, checkPasskeyStatus, logout } = useAuth();
  const { language, languages, setLanguage, t, translateEntity } = useI18n();
  const { theme, themes, setTheme } = useTheme();
  const { success, error: notifyError } = useNotification();

  const username = user?.username || 'admin';
  const isAdmin =
    userRole === 'Administrator' ||
    (user?.role || '').toLowerCase().includes('admin') ||
    (user?.username || '').toLowerCase() === 'admin' ||
    (user?.username || '').toLowerCase() === 'user';

  React.useEffect(() => {
    if (user?.username) {
      void checkPasskeyStatus(user.username).then((has) => {
        if (has !== user.hasPasskey) {
          updateUser({ hasPasskey: has });
        }
      });
    }
  }, [user?.username]);

  // Marquee settings
  const [marqueeEnabled, setMarqueeEnabled] = useState<boolean>(() => {
    return localStorage.getItem('erpGlobalMarqueeEnabled') === 'true' || localStorage.getItem(`erpMarqueeEnabled_${username}`) === 'true';
  });
  const [marqueeText, setMarqueeText] = useState<string>(() => {
    return localStorage.getItem('erpGlobalMarqueeText') || localStorage.getItem(`erpMarqueeText_${username}`) || '✨ Welcome to Enterprise ERP System';
  });

  // Localized names
  const [localizedNames, setLocalizedNames] = useState<Record<string, string>>(() => {
    return user?.localizedDisplayNames || {
      hi: '',
      ta: '',
      te: '',
      kn: '',
    };
  });

  const [isPasskeyBusy, setIsPasskeyBusy] = useState(false);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);

  const avatarPhoto = user?.faceImage || (user?.username ? localStorage.getItem(`erp_face_photo_${user.username}`) : null);

  if (!user) {
    return (
      <div className="erp-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <User size={48} color="var(--app-muted)" style={{ marginBottom: '1rem' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Not Authenticated</h3>
        <p style={{ color: 'var(--app-muted)', marginTop: '0.5rem' }}>Please sign in to view and customize profile settings.</p>
      </div>
    );
  }

  const handleSaveMarquee = () => {
    if (!isAdmin) {
      notifyError('Access Denied: Only Administrators can configure or broadcast the workspace marquee banner.');
      return;
    }
    localStorage.setItem(`erpMarqueeEnabled_${username}`, String(marqueeEnabled));
    localStorage.setItem(`erpMarqueeText_${username}`, marqueeText);
    localStorage.setItem('erpGlobalMarqueeEnabled', String(marqueeEnabled));
    localStorage.setItem('erpGlobalMarqueeText', marqueeText);
    success('Workspace marquee announcement banner saved and broadcasted!');
  };

  const handlePasskeyToggle = async () => {
    setIsPasskeyBusy(true);
    try {
      if (user.hasPasskey) {
        await disablePasskey(user.username);
      } else {
        await registerPasskey(user.username);
      }
    } finally {
      setIsPasskeyBusy(false);
    }
  };

  const handleFaceToggle = async () => {
    if (user.hasFaceLogin) {
      await disableFace(user.username);
    } else {
      onOpenFaceEnrollModal();
    }
  };

  return (
    <div style={{ maxWidth: '64rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Profile Overview Card */}
      <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', position: 'relative' }}>
        {/* Profile Picture with Hover Enlargement */}
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => setIsAvatarHovered(true)}
          onMouseLeave={() => setIsAvatarHovered(false)}
        >
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: 'var(--app-primary-light)',
              color: 'var(--app-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.85rem',
              fontWeight: 800,
              overflow: 'hidden',
              border: '3px solid var(--app-primary)',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
              cursor: 'pointer',
              transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: isAvatarHovered ? 'scale(1.06)' : 'scale(1)',
            }}
          >
            {avatarPhoto ? (
              <img src={avatarPhoto} alt="Face" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user.fullName ? user.fullName[0].toUpperCase() : user.username[0].toUpperCase()
            )}
          </div>

          {/* Floating Enlarged Photo Card on Hover */}
          {isAvatarHovered && (
            <div
              style={{
                position: 'absolute',
                top: '105%',
                left: 0,
                zIndex: 100,
                backgroundColor: 'var(--app-surface)',
                color: 'var(--app-text)',
                border: '1px solid var(--app-border)',
                borderRadius: '1.25rem',
                padding: '1.25rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 10px 15px -3px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                minWidth: '220px',
                pointerEvents: 'none',
                animation: 'fadeIn 0.15s ease-out forwards',
              }}
            >
              {avatarPhoto ? (
                <img
                  src={avatarPhoto}
                  alt={user.fullName || user.username}
                  style={{
                    width: '180px',
                    height: '180px',
                    borderRadius: '1rem',
                    objectFit: 'cover',
                    border: '3px solid var(--app-primary)',
                    boxShadow: '0 8px 20px rgba(59, 130, 246, 0.35)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '160px',
                    height: '160px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--app-primary), #8b5cf6)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '4rem',
                    fontWeight: 800,
                    boxShadow: '0 8px 20px rgba(59, 130, 246, 0.35)',
                  }}
                >
                  {user.fullName ? user.fullName[0].toUpperCase() : user.username[0].toUpperCase()}
                </div>
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--app-text)' }}>
                  {user.fullName || user.username}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--app-muted)' }}>{user.email}</div>
                {avatarPhoto && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '0.2rem 0.65rem', borderRadius: '9999px', marginTop: '0.5rem' }}>
                    <CheckCircle2 size={13} /> Face ID Biometric Enrolled
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{user.fullName || user.username}</h2>
          <p style={{ color: 'var(--app-muted)', fontSize: '0.875rem' }}>{user.email}</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span className="erp-badge erp-badge-info">Administrator</span>
            {user.hasPasskey && <span className="erp-badge erp-badge-success">{translateEntity('Passkey')} {translateEntity('Active')}</span>}
            {user.hasFaceLogin && <span className="erp-badge erp-badge-success">{translateEntity('Face Login')}</span>}
          </div>
        </div>

        <button onClick={logout} className="erp-btn erp-btn-danger erp-btn-sm">
          {translateEntity('Sign Out')}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Biometric & Security Passkeys */}
        <div className="erp-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 700, fontSize: '1.125rem' }}>
            <KeyRound size={20} color="var(--app-primary)" />
            <span>{translateEntity('Biometrics & Passkeys')}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.875rem', borderRadius: '0.5rem', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-hover)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Device Passkey (FIDO2)</span>
                {user.hasPasskey ? (
                  <span className="erp-badge erp-badge-success">{translateEntity('Active')}</span>
                ) : (
                  <span className="erp-badge erp-badge-warning">{translateEntity('Inactive')}</span>
                )}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--app-muted)', marginBottom: '0.75rem' }}>
                Use Windows Hello, Touch ID, or Security Key to sign in without typing passwords.
              </p>
              <button
                type="button"
                onClick={handlePasskeyToggle}
                disabled={isPasskeyBusy}
                className={`erp-btn ${user.hasPasskey ? 'erp-btn-danger' : 'erp-btn-primary'} erp-btn-sm`}
              >
                {user.hasPasskey ? translateEntity('Disable Passkey') : translateEntity('Enroll Device Passkey')}
              </button>
            </div>

            <div style={{ padding: '0.875rem', borderRadius: '0.5rem', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-hover)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{translateEntity('Face Login')}</span>
                {user.hasFaceLogin ? (
                  <span className="erp-badge erp-badge-success">{translateEntity('Active')}</span>
                ) : (
                  <span className="erp-badge erp-badge-warning">{translateEntity('Inactive')}</span>
                )}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--app-muted)', marginBottom: '0.75rem' }}>
                Recognize your face via webcam to authorize single-click biometric entry.
              </p>
              <button
                type="button"
                onClick={handleFaceToggle}
                className={`erp-btn ${user.hasFaceLogin ? 'erp-btn-danger' : 'erp-btn-primary'} erp-btn-sm`}
              >
                <ScanFace size={14} />
                <span>{user.hasFaceLogin ? translateEntity('Remove Face Biometric') : translateEntity('Enroll Camera Face')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Marquee Ticker Notice (Administrator Only) */}
        <div className="erp-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.125rem' }}>
              <Megaphone size={20} color="var(--app-primary)" />
              <span>{translateEntity('Workspace Marquee Banner')}</span>
            </div>
            {isAdmin ? (
              <span className="erp-badge erp-badge-info" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.725rem' }}>
                <ShieldCheck size={12} /> {translateEntity('Administrator Privilege')}
              </span>
            ) : (
              <span className="erp-badge erp-badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.725rem' }}>
                <Lock size={12} /> {translateEntity('Administrator Only')}
              </span>
            )}
          </div>

          {isAdmin ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={marqueeEnabled}
                  onChange={(e) => setMarqueeEnabled(e.target.checked)}
                  style={{ width: '1rem', height: '1rem', accentColor: 'var(--app-primary)' }}
                />
                <span>{translateEntity('Enable moving announcement banner')}</span>
              </label>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--app-muted)', marginBottom: '0.25rem' }}>
                  {translateEntity('Banner Announcement Text')}
                </label>
                <input
                  type="text"
                  className="erp-input"
                  value={marqueeText}
                  onChange={(e) => setMarqueeText(e.target.value)}
                  placeholder="e.g. Q3 Sales Target achieved! Quarterly review at 3 PM."
                />
              </div>

              <button type="button" onClick={handleSaveMarquee} className="erp-btn erp-btn-primary erp-btn-sm" style={{ alignSelf: 'flex-start' }}>
                <Save size={14} />
                <span>{translateEntity('Save Banner Settings')}</span>
              </button>
            </div>
          ) : (
            <div
              style={{
                padding: '0.875rem 1rem',
                borderRadius: '0.5rem',
                backgroundColor: 'var(--app-hover)',
                border: '1px solid var(--app-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <Lock size={18} style={{ color: 'var(--app-muted)', flexShrink: 0 }} />
              <p style={{ fontSize: '0.8125rem', color: 'var(--app-muted)', margin: 0 }}>
                Broadcasting and configuring the Workspace Marquee Announcement Banner is restricted to the <strong>Administrator</strong> role.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

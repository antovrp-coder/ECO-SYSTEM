import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { useTheme } from '../../context/ThemeContext';
import { LanguageId } from '../../i18n/translations';
import { ThemeId } from '../../types';
import {
  Layers,
  Globe,
  Palette,
  Mic,
  User as UserIcon,
  LogOut,
  LogIn,
  KeyRound,
  ScanFace,
  ChevronDown,
  Bell,
  Settings,
} from 'lucide-react';

interface NavbarProps {
  onOpenAuthModal: (mode: 'login' | 'signup' | 'passkey' | 'face') => void;
  onOpenVoiceAssistant: () => void;
  onOpenProfileTab: () => void;
  onToggleSidebar?: () => void;
  activeModuleName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuthModal,
  onOpenVoiceAssistant,
  onOpenProfileTab,
  activeModuleName,
}) => {
  const { user, logout } = useAuth();
  const { language, languages, setLanguage, t, translateEntity } = useI18n();
  const { theme, themes, setTheme } = useTheme();

  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [avatarHovered, setAvatarHovered] = useState(false);

  const avatarPhoto = user?.faceImage || (user?.username ? localStorage.getItem(`erp_face_photo_${user.username}`) : null);

  return (
    <header
      style={{
        background: 'var(--app-toolbar-bg)',
        color: 'var(--app-toolbar-text)',
        padding: '0.625rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--app-shadow)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Brand & Active Module */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.02em' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '0.35rem', borderRadius: '8px', display: 'flex' }}>
            <Layers size={20} />
          </div>
          <span>EcoSystem</span>
        </div>

        {activeModuleName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', opacity: 0.9, background: 'rgba(255, 255, 255, 0.12)', padding: '0.2rem 0.625rem', borderRadius: '9999px' }}>
            <span>/</span>
            <span style={{ fontWeight: 600 }}>{translateEntity(activeModuleName)}</span>
          </div>
        )}
      </div>

      {/* Right actions: Voice, Lang, Theme, User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Voice Assistant Button */}
        <button
          onClick={onOpenVoiceAssistant}
          title={t('voiceAssistantEnabledTitle') || 'Voice Assistant'}
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            border: 'none',
            color: 'inherit',
            padding: '0.45rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
        >
          <Mic size={18} />
        </button>

        {/* Language Selector */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setLangMenuOpen(!langMenuOpen);
              setThemeMenuOpen(false);
              setUserMenuOpen(false);
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: 'inherit',
              padding: '0.45rem 0.65rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}
          >
            <Globe size={16} />
            <span>{languages.find((l) => l.id === language)?.label || 'English'}</span>
            <ChevronDown size={14} />
          </button>

          {langMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                background: 'var(--app-surface)',
                color: 'var(--app-text)',
                border: '1px solid var(--app-border)',
                borderRadius: '0.5rem',
                boxShadow: 'var(--app-shadow-lg)',
                padding: '0.35rem',
                zIndex: 100,
                minWidth: '9rem',
              }}
            >
              {languages.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    setLanguage(l.id as LanguageId);
                    setLangMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: language === l.id ? 'var(--app-primary-light)' : 'transparent',
                    color: language === l.id ? 'var(--app-primary)' : 'var(--app-text)',
                    fontWeight: language === l.id ? 700 : 500,
                    border: 'none',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Selector */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setThemeMenuOpen(!themeMenuOpen);
              setLangMenuOpen(false);
              setUserMenuOpen(false);
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: 'inherit',
              padding: '0.45rem 0.65rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textTransform: 'capitalize',
            }}
          >
            <Palette size={16} />
            <span>{translateEntity(theme)}</span>
            <ChevronDown size={14} />
          </button>

          {themeMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                background: 'var(--app-surface)',
                color: 'var(--app-text)',
                border: '1px solid var(--app-border)',
                borderRadius: '0.5rem',
                boxShadow: 'var(--app-shadow-lg)',
                padding: '0.35rem',
                zIndex: 100,
                minWidth: '10rem',
                maxHeight: '18rem',
                overflowY: 'auto',
              }}
            >
              {themes.map((th) => (
                <button
                  key={th.id}
                  onClick={() => {
                    setTheme(th.id as ThemeId);
                    setThemeMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: theme === th.id ? 'var(--app-primary-light)' : 'transparent',
                    color: theme === th.id ? 'var(--app-primary)' : 'var(--app-text)',
                    fontWeight: theme === th.id ? 700 : 500,
                    border: 'none',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    textTransform: 'capitalize',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: th.color,
                      display: 'inline-block',
                      border: '1px solid rgba(0,0,0,0.2)',
                    }}
                  />
                  <span>{translateEntity(th.id)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Account Menu */}
        {user ? (
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setAvatarHovered(true)}
            onMouseLeave={() => setAvatarHovered(false)}
          >
            <button
              onClick={() => {
                setUserMenuOpen(!userMenuOpen);
                setLangMenuOpen(false);
                setThemeMenuOpen(false);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'inherit',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              {avatarPhoto ? (
                <img
                  src={avatarPhoto}
                  alt={user.fullName || user.username}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'var(--app-surface)',
                    color: 'var(--app-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                  }}
                >
                  {user.fullName ? user.fullName[0].toUpperCase() : user.username[0].toUpperCase()}
                </div>
              )}
              <span>{user.fullName || user.username}</span>
              <ChevronDown size={14} />
            </button>

            {/* Enlarged Photo Hover Card */}
            {avatarHovered && !userMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '115%',
                  right: 0,
                  zIndex: 200,
                  backgroundColor: 'var(--app-surface)',
                  color: 'var(--app-text)',
                  border: '1px solid var(--app-border)',
                  borderRadius: '1rem',
                  padding: '1rem',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.35), 0 8px 10px -6px rgba(0, 0, 0, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.625rem',
                  minWidth: '180px',
                  pointerEvents: 'none',
                  animation: 'fadeIn 0.15s ease-out forwards',
                }}
              >
                {avatarPhoto ? (
                  <img
                    src={avatarPhoto}
                    alt={user.fullName || user.username}
                    style={{
                      width: '140px',
                      height: '140px',
                      borderRadius: '0.75rem',
                      objectFit: 'cover',
                      border: '3px solid var(--app-primary)',
                      boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--app-primary), #8b5cf6)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '3rem',
                      fontWeight: 800,
                      boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    {user.fullName ? user.fullName[0].toUpperCase() : user.username[0].toUpperCase()}
                  </div>
                )}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--app-text)' }}>
                    {user.fullName || user.username}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)' }}>{user.email}</div>
                  {avatarPhoto && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.675rem', fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '0.15rem 0.5rem', borderRadius: '9999px', marginTop: '0.35rem' }}>
                      ✓ Face ID Enrolled
                    </div>
                  )}
                </div>
              </div>
            )}

            {userMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  background: 'var(--app-surface)',
                  color: 'var(--app-text)',
                  border: '1px solid var(--app-border)',
                  borderRadius: '0.5rem',
                  boxShadow: 'var(--app-shadow-lg)',
                  padding: '0.5rem',
                  zIndex: 100,
                  minWidth: '14rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--app-border)', marginBottom: '0.25rem' }}>
                  {avatarPhoto ? (
                    <img
                      src={avatarPhoto}
                      alt={user.fullName || user.username}
                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--app-primary)', flexShrink: 0 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'var(--app-primary)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.875rem',
                        flexShrink: 0,
                      }}
                    >
                      {user.fullName ? user.fullName[0].toUpperCase() : user.username[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.fullName || user.username}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onOpenProfileTab();
                    setUserMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    color: 'var(--app-text)',
                    border: 'none',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Settings size={15} />
                  <span>{t('profileSettings') || 'Profile Settings'}</span>
                </button>

                <button
                  onClick={() => {
                    logout();
                    setUserMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    color: 'var(--app-danger)',
                    border: 'none',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <LogOut size={15} />
                  <span>{t('logout') || 'Sign Out'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              onClick={() => onOpenAuthModal('login')}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'inherit',
                padding: '0.45rem 0.85rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <LogIn size={15} />
              <span>{t('login') || 'Sign In'}</span>
            </button>

            <button
              onClick={() => onOpenAuthModal('passkey')}
              title={translateEntity('Passkey')}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: 'inherit',
                padding: '0.45rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
              }}
            >
              <KeyRound size={16} />
            </button>

            <button
              onClick={() => onOpenAuthModal('face')}
              title={translateEntity('Face ID')}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: 'inherit',
                padding: '0.45rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
              }}
            >
              <ScanFace size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

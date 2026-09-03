import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { X, LogIn, UserPlus, KeyRound, ScanFace, Sparkles, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'passkey' | 'face';
  onOpenFaceModal: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onOpenFaceModal,
}) => {
  const { login, signup, singleClickLogin, loginWithPasskey, isLoading } = useAuth();
  const { t } = useI18n();

  const [mode, setMode] = useState<'login' | 'signup' | 'passkey'>(
    initialMode === 'face' ? 'login' : initialMode
  );

  // Form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [passkeyUsername, setPasskeyUsername] = useState('admin');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ username, password });
      onClose();
    } catch {
      // notification handled in context
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signup({ username, email, password, fullName });
      onClose();
    } catch {
      // notification handled in context
    }
  };

  const handlePasskeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginWithPasskey(passkeyUsername);
      onClose();
    } catch {
      // notification handled in context
    }
  };

  const handleQuickLogin = async (roleUsername: string) => {
    try {
      await singleClickLogin(roleUsername);
      onClose();
    } catch {
      // handled
    }
  };

  return (
    <div className="erp-modal-overlay">
      <div className="erp-modal" style={{ padding: '2rem' }}>
        {/* Close Button */}
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

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '0.75rem',
              borderRadius: '1rem',
              background: 'var(--app-primary-light)',
              color: 'var(--app-primary)',
              marginBottom: '0.75rem',
            }}
          >
            {mode === 'login' && <LogIn size={28} />}
            {mode === 'signup' && <UserPlus size={28} />}
            {mode === 'passkey' && <KeyRound size={28} />}
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--app-text)' }}>
            {mode === 'login' && (t('authLogin') || 'Sign In')}
            {mode === 'signup' && (t('authRegister') || 'Create Account')}
            {mode === 'passkey' && (t('fingerprintReady') || 'Passkey Sign In')}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--app-text-subtle)', marginTop: '0.25rem' }}>
            Enterprise ERP Cloud Authentication
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--app-hover)',
            padding: '0.25rem',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
            gap: '0.25rem',
          }}
        >
          <button
            type="button"
            onClick={() => setMode('login')}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '0.375rem',
              border: 'none',
              backgroundColor: mode === 'login' ? 'var(--app-surface)' : 'transparent',
              color: mode === 'login' ? 'var(--app-primary)' : 'var(--app-text-subtle)',
              fontWeight: mode === 'login' ? 700 : 500,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              boxShadow: mode === 'login' ? 'var(--app-shadow-sm)' : 'none',
            }}
          >
            {t('authLogin') || 'Password'}
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '0.375rem',
              border: 'none',
              backgroundColor: mode === 'signup' ? 'var(--app-surface)' : 'transparent',
              color: mode === 'signup' ? 'var(--app-primary)' : 'var(--app-text-subtle)',
              fontWeight: mode === 'signup' ? 700 : 500,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              boxShadow: mode === 'signup' ? 'var(--app-shadow-sm)' : 'none',
            }}
          >
            {t('authRegister') || 'Register'}
          </button>
          <button
            type="button"
            onClick={() => setMode('passkey')}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '0.375rem',
              border: 'none',
              backgroundColor: mode === 'passkey' ? 'var(--app-surface)' : 'transparent',
              color: mode === 'passkey' ? 'var(--app-primary)' : 'var(--app-text-subtle)',
              fontWeight: mode === 'passkey' ? 700 : 500,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              boxShadow: mode === 'passkey' ? 'var(--app-shadow-sm)' : 'none',
            }}
          >
            Passkey
          </button>
        </div>

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--app-text-subtle)' }}>
                {t('authUsername') || 'Username or Email'}
              </label>
              <input
                type="text"
                required
                className="erp-input"
                placeholder="e.g. admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--app-text-subtle)' }}>
                {t('authPassword') || 'Password'}
              </label>
              <input
                type="password"
                required
                className="erp-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" disabled={isLoading} className="erp-btn erp-btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}>
              {isLoading ? 'Authenticating...' : (t('authLogin') || 'Sign In')}
            </button>

            {/* Quick Demo Role Logins */}
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--app-border)', paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--app-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', textAlign: 'center' }}>
                ⚡ Quick Demo Sign In
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin')}
                  className="erp-btn erp-btn-secondary erp-btn-sm"
                  style={{ justifyContent: 'center' }}
                >
                  <ShieldCheck size={14} color="var(--app-primary)" /> Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('manager')}
                  className="erp-btn erp-btn-secondary erp-btn-sm"
                  style={{ justifyContent: 'center' }}
                >
                  <Sparkles size={14} color="var(--app-success)" /> Manager
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('accountant')}
                  className="erp-btn erp-btn-secondary erp-btn-sm"
                  style={{ justifyContent: 'center' }}
                >
                  Finance Lead
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('sales')}
                  className="erp-btn erp-btn-secondary erp-btn-sm"
                  style={{ justifyContent: 'center' }}
                >
                  Sales Rep
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Signup Form */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--app-text-subtle)' }}>
                {t('authFullName') || 'Full Name'}
              </label>
              <input
                type="text"
                required
                className="erp-input"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--app-text-subtle)' }}>
                {t('authUsername') || 'Username'}
              </label>
              <input
                type="text"
                required
                className="erp-input"
                placeholder="janedoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--app-text-subtle)' }}>
                {t('authEmail') || 'Email Address'}
              </label>
              <input
                type="email"
                required
                className="erp-input"
                placeholder="jane@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--app-text-subtle)' }}>
                {t('authPassword') || 'Password'}
              </label>
              <input
                type="password"
                required
                className="erp-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" disabled={isLoading} className="erp-btn erp-btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}>
              {isLoading ? 'Registering...' : (t('authRegister') || 'Create Account')}
            </button>
          </form>
        )}

        {/* Passkey Login Form */}
        {mode === 'passkey' && (
          <form onSubmit={handlePasskeyLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ backgroundColor: 'var(--app-primary-light)', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '0.8125rem', color: 'var(--app-text)' }}>
              {t('fingerprintReadyCopy') || 'Authenticate using Windows Hello, Touch ID, or a FIDO2 hardware security key.'}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--app-text-subtle)' }}>
                {t('authUsername') || 'Username'}
              </label>
              <input
                type="text"
                required
                className="erp-input"
                placeholder="admin"
                value={passkeyUsername}
                onChange={(e) => setPasskeyUsername(e.target.value)}
              />
            </div>

            <button type="submit" disabled={isLoading} className="erp-btn erp-btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}>
              <KeyRound size={16} />
              <span>{isLoading ? 'Verifying...' : 'Authenticate with Passkey'}</span>
            </button>
          </form>
        )}

        {/* Biometric Face Auth Shortcut */}
        <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFaceModal();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--app-primary)',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <ScanFace size={16} />
            <span>Switch to Face Recognition Sign In</span>
          </button>
        </div>
      </div>
    </div>
  );
};

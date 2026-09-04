import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { Megaphone } from 'lucide-react';

interface MarqueeBannerProps {
  customText?: string;
  enabled?: boolean;
}

export const MarqueeBanner: React.FC<MarqueeBannerProps> = ({ customText, enabled }) => {
  const { user } = useAuth();
  const { translateEntity } = useI18n();
  const [isHovered, setIsHovered] = React.useState(false);
  const username = user?.username || 'default';
  
  const isEnabled = enabled ?? (localStorage.getItem(`erpMarqueeEnabled_${username}`) === 'true');
  const text = customText || localStorage.getItem(`erpMarqueeText_${username}`) || '✨ Welcome to Enterprise ERP System • Multi-Module Intelligent Platform';

  if (!isEnabled) return null;

  return (
    <div
      className="erp-marquee-banner"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'linear-gradient(90deg, #1e293b, #334155)',
        color: '#f8fafc',
        fontSize: '0.75rem',
        fontWeight: 600,
        padding: '0.35rem 1rem',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#3b82f6', color: '#fff', padding: '0.1rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em', flexShrink: 0 }}>
        <Megaphone size={12} /> {translateEntity('Notice')}
      </div>
      <div className="erp-marquee-track" style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div
          className="animate-marquee"
          style={{ animationPlayState: isHovered ? 'paused' : 'running' }}
        >
          {text}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { ModuleItem } from '../../types';
import { useI18n } from '../../i18n/I18nContext';
import { useAuth } from '../../context/AuthContext';
import {
  Package,
  Users,
  Briefcase,
  ShoppingCart,
  DollarSign,
  Store,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lock,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

interface SidebarProps {
  modules: ModuleItem[];
  activeModuleId?: number;
  onSelectModule: (module: ModuleItem) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  isAuthenticated?: boolean;
}

const ICON_MAP: Record<string, any> = {
  Package,
  Inventory: Package,
  Users,
  HR: Users,
  Briefcase,
  CRM: Briefcase,
  ShoppingCart,
  Purchase: ShoppingCart,
  DollarSign,
  Finance: DollarSign,
  Store,
  POS: Store,
  ShoppingBag,
  Ecommerce: ShoppingBag,
  ShieldAlert,
  ShieldCheck,
  Administration: ShieldCheck,
  Admin: ShieldCheck,
};

export const Sidebar: React.FC<SidebarProps> = ({
  modules,
  activeModuleId,
  onSelectModule,
  collapsed,
  onToggleCollapsed,
  isAuthenticated = false,
}) => {
  const { translateEntity, t } = useI18n();
  const { canAccessModule, userRole } = useAuth();

  const getModuleIcon = (mod: ModuleItem) => {
    const IconComponent = ICON_MAP[mod.name] || ICON_MAP[mod.icon] || Package;
    return <IconComponent size={20} />;
  };

  return (
    <aside
      style={{
        width: collapsed ? '4.5rem' : '16rem',
        backgroundColor: 'var(--app-sidebar-bg)',
        borderRight: '1px solid var(--app-border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        flexShrink: 0,
        zIndex: 20,
      }}
    >
      {/* Sidebar Header */}
      <div
        style={{
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: '1px solid var(--app-border)',
        }}
      >
        {!collapsed && (
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--app-muted)' }}>
            {t('modulesHeading') || 'Workspaces'}
          </div>
        )}
        <button
          onClick={onToggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--app-muted)',
            cursor: 'pointer',
            padding: '0.25rem',
            borderRadius: '0.375rem',
            display: 'flex',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--app-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Module Navigation List */}
      <div style={{ flex: 1, padding: '0.75rem 0.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {modules.map((mod) => {
          const isActive = activeModuleId === mod.id;
          const translatedName = translateEntity(mod.name);
          const isPermitted = !isAuthenticated ? false : canAccessModule(mod.name);

          return (
            <button
              key={mod.id}
              onClick={() => onSelectModule(mod)}
              title={
                collapsed
                  ? !isAuthenticated
                    ? `${translatedName} (Sign in required)`
                    : !isPermitted
                    ? `${translatedName} (Access restricted for ${userRole})`
                    : translatedName
                  : undefined
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.625rem 0.75rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: isActive ? 'var(--app-primary-light)' : 'transparent',
                color: isActive
                  ? 'var(--app-primary)'
                  : !isPermitted && isAuthenticated
                  ? 'var(--app-muted)'
                  : 'var(--app-text)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textAlign: 'left',
                justifyContent: collapsed ? 'center' : 'flex-start',
                opacity: !isPermitted && isAuthenticated ? 0.65 : 1,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'var(--app-hover)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ color: isActive ? 'var(--app-primary)' : 'var(--app-muted)', display: 'flex', flexShrink: 0 }}>
                {getModuleIcon(mod)}
              </div>
              {!collapsed && (
                <>
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{translatedName}</span>
                  {!isAuthenticated ? (
                    <Lock size={12} style={{ color: 'var(--app-muted)', opacity: 0.7 }} />
                  ) : !isPermitted ? (
                    <span
                      className="erp-badge erp-badge-warning"
                      style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem', borderRadius: '4px', textTransform: 'uppercase' }}
                    >
                      Locked
                    </span>
                  ) : null}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar Footer badge */}
      {!collapsed && (
        <div style={{ padding: '0.875rem', borderTop: '1px solid var(--app-border)', backgroundColor: 'var(--app-hover)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--app-text-subtle)' }}>
            <Sparkles size={14} color="var(--app-primary)" />
            <span style={{ fontWeight: 600 }}>v2.0 EcoSystem</span>
          </div>
        </div>
      )}
    </aside>
  );
};

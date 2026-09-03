import React from 'react';
import { WorkspaceTab } from '../../types';
import { useI18n } from '../../i18n/I18nContext';
import { X, Package, Users, Briefcase, ShoppingCart, DollarSign, Store, ShoppingBag, Settings, ShieldCheck } from 'lucide-react';

interface TabBarProps {
  tabs: WorkspaceTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onSelectSubMenu: (subMenu: string) => void;
}

const TAB_ICON_MAP: Record<string, any> = {
  Inventory: Package,
  HR: Users,
  CRM: Briefcase,
  Purchase: ShoppingCart,
  Finance: DollarSign,
  POS: Store,
  Ecommerce: ShoppingBag,
  Profile: Settings,
  Administration: ShieldCheck,
  Admin: ShieldCheck,
};

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onSelectSubMenu,
}) => {
  const { translateEntity, t } = useI18n();

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const getTabIcon = (tab: WorkspaceTab) => {
    const IconComponent = TAB_ICON_MAP[tab.moduleName] || Package;
    return <IconComponent size={15} />;
  };

  if (tabs.length === 0) return null;

  return (
    <div style={{ backgroundColor: 'var(--app-surface)', borderBottom: '1px solid var(--app-border)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Tab Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          overflowX: 'auto',
          borderBottom: '1px solid var(--app-border)',
          padding: '0 0.5rem',
          gap: '0.25rem',
          backgroundColor: 'var(--app-hover)',
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const label = tab.kind === 'profile' ? (t('profileSettings') || 'Profile Settings') : translateEntity(tab.moduleName);

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.875rem',
                backgroundColor: isActive ? 'var(--app-surface)' : 'transparent',
                color: isActive ? 'var(--app-primary)' : 'var(--app-text-subtle)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.8125rem',
                borderTopLeftRadius: '0.5rem',
                borderTopRightRadius: '0.5rem',
                borderTop: isActive ? '2px solid var(--app-primary)' : '2px solid transparent',
                borderLeft: isActive ? '1px solid var(--app-border)' : '1px solid transparent',
                borderRight: isActive ? '1px solid var(--app-border)' : '1px solid transparent',
                borderBottom: isActive ? '1px solid var(--app-surface)' : 'none',
                marginBottom: isActive ? '-1px' : 0,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', flexShrink: 0 }}>{getTabIcon(tab)}</div>
              <span>{label}</span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                title="Close Tab"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--app-muted)',
                  cursor: 'pointer',
                  padding: '0.15rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--app-hover-strong)';
                  e.currentTarget.style.color = 'var(--app-danger)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--app-muted)';
                }}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Submenu Strip */}
      {activeTab && activeTab.subMenus && activeTab.subMenus.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            backgroundColor: 'var(--app-surface)',
            overflowX: 'auto',
          }}
        >
          {activeTab.subMenus.map((subMenu) => {
            const isSubActive = activeTab.activeSubMenu === subMenu;
            return (
              <button
                key={subMenu}
                onClick={() => onSelectSubMenu(subMenu)}
                style={{
                  background: isSubActive ? 'var(--app-primary-light)' : 'transparent',
                  color: isSubActive ? 'var(--app-primary)' : 'var(--app-text-subtle)',
                  fontWeight: isSubActive ? 700 : 500,
                  fontSize: '0.8125rem',
                  border: isSubActive ? '1px solid var(--app-primary)' : '1px solid transparent',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSubActive) e.currentTarget.style.backgroundColor = 'var(--app-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!isSubActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {translateEntity(subMenu)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

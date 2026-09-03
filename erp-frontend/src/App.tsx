import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { I18nProvider } from './i18n/I18nContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { TabBar } from './components/layout/TabBar';
import { MarqueeBanner } from './components/layout/MarqueeBanner';
import { NotificationToast } from './components/layout/NotificationToast';
import { AuthModal } from './components/auth/AuthModal';
import { FaceAuthModal } from './components/auth/FaceAuthModal';
import { VoiceAssistant } from './components/auth/VoiceAssistant';
import { ProfileSettings } from './components/profile/ProfileSettings';

import { InventoryWorkspace } from './components/workspaces/InventoryWorkspace';
import { HRWorkspace } from './components/workspaces/HRWorkspace';
import { CRMWorkspace } from './components/workspaces/CRMWorkspace';
import { PurchaseWorkspace } from './components/workspaces/PurchaseWorkspace';
import { FinanceWorkspace } from './components/workspaces/FinanceWorkspace';
import { POSWorkspace } from './components/workspaces/POSWorkspace';
import { EcommerceWorkspace } from './components/workspaces/EcommerceWorkspace';
import { AdminWorkspace } from './components/workspaces/AdminWorkspace';

import { useNotification } from './context/NotificationContext';
import { ModuleItem, WorkspaceTab } from './types';
import { useI18n } from './i18n/I18nContext';
import { Package, LogIn, KeyRound, Camera, Layers } from 'lucide-react';

const INITIAL_TABS: WorkspaceTab[] = [
  {
    id: 'tab-inventory',
    kind: 'module',
    moduleId: 1,
    moduleName: 'Inventory',
    moduleIcon: 'Package',
    subMenus: ['Stock Overview', 'SKU Management', 'Suppliers', 'Reports'],
    activeSubMenu: 'Stock Overview',
  },
];

const MainWorkspace: React.FC = () => {
  const { user, modules, canAccessModule, userRole } = useAuth();
  const { t, translateEntity } = useI18n();
  const { warning, error: notifyError } = useNotification();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tabs, setTabs] = useState<WorkspaceTab[]>(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState<string>('tab-inventory');

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'passkey' | 'face'>('login');
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [faceModalMode, setFaceModalMode] = useState<'login' | 'enroll'>('login');
  const [voiceAssistantOpen, setVoiceAssistantOpen] = useState(false);

  // Automatically close all open windows, modals, and tabbed screens on sign out
  React.useEffect(() => {
    if (!user) {
      setAuthModalOpen(false);
      setFaceModalOpen(false);
      setVoiceAssistantOpen(false);
      setTabs([]);
      setActiveTabId('');
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } else {
      // When user signs in, restore permitted workspace tab
      setTabs((prev) => {
        if (prev.length === 0) {
          const permittedInitial = INITIAL_TABS.filter((t) => canAccessModule(t.moduleName));
          return permittedInitial;
        }
        // Auto-close any tabs that are not permitted for this role
        const allowed = prev.filter((t) => t.kind === 'profile' || canAccessModule(t.moduleName));
        return allowed;
      });
      setActiveTabId((prev) => (!prev ? (canAccessModule('Inventory') ? 'tab-inventory' : '') : prev));
    }
  }, [user, canAccessModule]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || (tabs.length > 0 ? tabs[0] : null);

  const handleOpenModule = (module: ModuleItem) => {
    if (!user) {
      warning(t('authRequiredMessage') || 'Please sign in to access enterprise modules and edit data.');
      setAuthModalMode('login');
      setAuthModalOpen(true);
      return;
    }

    // Role-based Menu Access Permission Guard
    if (!canAccessModule(module.name)) {
      notifyError(
        `Access Denied: Your assigned role (${userRole}) is not permitted to access the "${translateEntity(module.name)}" workspace. Please ask an Administrator to assign menu permissions.`
      );
      return;
    }

    const existing = tabs.find((t) => t.moduleId === module.id);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    const newTab: WorkspaceTab = {
      id: `tab-${module.id}-${Date.now()}`,
      kind: 'module',
      moduleId: module.id,
      moduleName: module.name,
      moduleIcon: module.icon,
      subMenus: module.subMenus || ['Overview'],
      activeSubMenu: module.subMenus?.[0] || 'Overview',
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleOpenProfileTab = () => {
    if (!user) {
      warning(t('authRequiredMessage') || 'Please sign in to access your profile settings.');
      setAuthModalMode('login');
      setAuthModalOpen(true);
      return;
    }

    const existing = tabs.find((t) => t.kind === 'profile');
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    const profileTab: WorkspaceTab = {
      id: 'tab-profile',
      kind: 'profile',
      moduleId: 999,
      moduleName: 'Profile',
      moduleIcon: 'Settings',
      subMenus: ['Profile Settings'],
      activeSubMenu: 'Profile Settings',
    };

    setTabs((prev) => [...prev, profileTab]);
    setActiveTabId(profileTab.id);
  };

  const handleCloseTab = (tabId: string) => {
    const nextTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(nextTabs);
    if (nextTabs.length === 0) {
      setActiveTabId('');
    } else if (activeTabId === tabId) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id);
    }
  };

  const handleSelectSubMenu = (subMenu: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, activeSubMenu: subMenu } : t))
    );
  };

  const renderActiveWorkspace = () => {
    if (!activeTab || tabs.length === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '2rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '1.25rem', background: 'linear-gradient(135deg, var(--app-primary), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: '1.5rem', boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)' }}>
            <Layers size={40} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--app-text)', marginBottom: '0.5rem' }}>
            Enterprise ERP System
          </h2>
          <p style={{ color: 'var(--app-muted)', fontSize: '0.95rem', maxWidth: '480px', marginBottom: '1.75rem' }}>
            {t('welcomeHeroSubtitle') || 'Next-generation ERP platform with biometric security, real-time analytics, and multi-module operations.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => {
                setAuthModalMode('login');
                setAuthModalOpen(true);
              }}
              className="erp-btn erp-btn-primary"
              style={{ padding: '0.65rem 1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <LogIn size={16} /> {t('signIn') || 'Sign In'}
            </button>
            <button
              onClick={() => {
                setAuthModalMode('passkey');
                setAuthModalOpen(true);
              }}
              className="erp-btn erp-btn-secondary"
              style={{ padding: '0.65rem 1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <KeyRound size={16} /> {t('authPasskeyTab') || 'Passkey'}
            </button>
            <button
              onClick={() => {
                setFaceModalMode('login');
                setFaceModalOpen(true);
              }}
              className="erp-btn erp-btn-secondary"
              style={{ padding: '0.65rem 1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Camera size={16} /> {t('authFaceTab') || 'Face ID'}
            </button>
          </div>
        </div>
      );
    }

    if (activeTab.kind === 'profile') {
      return (
        <ProfileSettings
          onOpenFaceEnrollModal={() => {
            setFaceModalMode('enroll');
            setFaceModalOpen(true);
          }}
        />
      );
    }

    const modLower = (activeTab.moduleName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    switch (modLower) {
      case 'inventory':
        return <InventoryWorkspace activeSubMenu={activeTab.activeSubMenu} />;
      case 'hr':
        return <HRWorkspace activeSubMenu={activeTab.activeSubMenu} />;
      case 'crm':
        return <CRMWorkspace activeSubMenu={activeTab.activeSubMenu} />;
      case 'purchase':
        return <PurchaseWorkspace activeSubMenu={activeTab.activeSubMenu} />;
      case 'finance':
        return <FinanceWorkspace activeSubMenu={activeTab.activeSubMenu} />;
      case 'pos':
      case 'sales':
        return <POSWorkspace activeSubMenu={activeTab.activeSubMenu} />;
      case 'ecommerce':
        return <EcommerceWorkspace activeSubMenu={activeTab.activeSubMenu} />;
      case 'administration':
      case 'admin':
        return <AdminWorkspace activeSubMenu={activeTab.activeSubMenu} />;
      default:
        return <InventoryWorkspace activeSubMenu={activeTab.activeSubMenu} />;
    }
  };

  return (
    <div className="app-container">
      {/* Top Announcements Banner */}
      <MarqueeBanner />

      {/* Global Navigation Bar */}
      <Navbar
        activeModuleName={activeTab?.kind === 'profile' ? 'Profile' : activeTab?.moduleName}
        onOpenAuthModal={(mode) => {
          if (mode === 'face') {
            setFaceModalMode('login');
            setFaceModalOpen(true);
          } else {
            setAuthModalMode(mode);
            setAuthModalOpen(true);
          }
        }}
        onOpenVoiceAssistant={() => setVoiceAssistantOpen(true)}
        onOpenProfileTab={handleOpenProfileTab}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Multi-Tab Layout */}
      <div className="app-main">
        <Sidebar
          modules={modules}
          activeModuleId={activeTab?.moduleId}
          onSelectModule={handleOpenModule}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
          isAuthenticated={!!user}
        />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tab bar with sub-menus */}
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={(id) => setActiveTabId(id)}
            onCloseTab={handleCloseTab}
            onSelectSubMenu={handleSelectSubMenu}
          />

          {/* Active Workspace View */}
          <div className="workspace-content animate-fade-in">{renderActiveWorkspace()}</div>
        </main>
      </div>

      {/* Global Modals & Toast Alerts */}
      <NotificationToast />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        onOpenFaceModal={() => {
          setFaceModalMode('login');
          setFaceModalOpen(true);
        }}
      />

      <FaceAuthModal
        isOpen={faceModalOpen}
        onClose={() => setFaceModalOpen(false)}
        mode={faceModalMode}
      />

      <VoiceAssistant
        isOpen={voiceAssistantOpen}
        onClose={() => setVoiceAssistantOpen(false)}
        onNavigateModule={(modName) => {
          const mod = modules.find((m) => m.name.toLowerCase() === modName.toLowerCase());
          if (mod) handleOpenModule(mod);
        }}
        onOpenAuth={() => {
          setAuthModalMode('login');
          setAuthModalOpen(true);
        }}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <I18nProvider>
        <NotificationProvider>
          <AuthProvider>
            <MainWorkspace />
          </AuthProvider>
        </NotificationProvider>
      </I18nProvider>
    </ThemeProvider>
  );
};

export default App;

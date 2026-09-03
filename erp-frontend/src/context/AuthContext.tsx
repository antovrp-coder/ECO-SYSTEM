import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import { User, ModuleItem } from '../types';
import { apiRequest } from '../services/api';
import { useNotification } from './NotificationContext';
import { useI18n } from '../i18n/I18nContext';

export interface RolePermission {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  modules: ModuleItem[];
  isLoading: boolean;
  userRole: string;
  rolePermissions: Record<string, RolePermission>;
  canAccessModule: (moduleName: string) => boolean;
  refreshPermissions: () => Promise<void>;
  login: (credentials: { username?: string; email?: string; password?: string }) => Promise<User>;
  signup: (payload: { username: string; email: string; password?: string; fullName: string }) => Promise<User>;
  singleClickLogin: (username: string) => Promise<User>;
  logout: () => void;
  refreshModules: () => Promise<ModuleItem[]>;
  updateUser: (user: Partial<User>) => void;
  registerPasskey: (username: string) => Promise<boolean>;
  loginWithPasskey: (username: string) => Promise<User>;
  checkPasskeyStatus: (username: string) => Promise<boolean>;
  disablePasskey: (username: string) => Promise<boolean>;
  checkFaceStatus: (username: string) => Promise<boolean>;
  enrollFace: (username: string, descriptor: number[], imageBase64: string) => Promise<boolean>;
  loginWithFace: (descriptor: number[], username?: string) => Promise<User>;
  disableFace: (username: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_MODULES: ModuleItem[] = [
  { id: 1, name: 'Inventory', icon: 'Package', subMenus: ['Stock Overview', 'SKU Management', 'Suppliers', 'Reports'] },
  { id: 2, name: 'HR', icon: 'Users', subMenus: ['Overview', 'Employees', 'Attendance', 'Leave Requests', 'Payroll'] },
  { id: 3, name: 'CRM', icon: 'Briefcase', subMenus: ['Overview', 'Leads', 'Accounts', 'Deals Pipeline'] },
  { id: 4, name: 'Purchase', icon: 'ShoppingCart', subMenus: ['Overview', 'Requisitions', 'Purchase Orders', 'Vendors'] },
  { id: 5, name: 'Finance', icon: 'DollarSign', subMenus: ['Overview', 'General Ledger', 'Invoices', 'Expense Claims', 'Reports'] },
  { id: 6, name: 'POS', icon: 'Store', subMenus: ['Register', 'Orders', 'Receipts'] },
  { id: 7, name: 'Ecommerce', icon: 'ShoppingBag', subMenus: ['Storefront', 'Products', 'Orders', 'Promotions', 'Analytics'] },
  {
    id: 8,
    name: 'Administration',
    icon: 'ShieldCheck',
    subMenus: [
      'Assign Menu Roles',
      'Roles & Permissions',
      'User Management',
      'User Login & Geo Activity',
      'Audit & Security Logs',
    ],
  },
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('erpUser');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u) {
          const uLower = (u.username || '').toLowerCase().trim();
          const rLower = (u.role || '').toLowerCase().trim();
          if (uLower === 'admin' || uLower === 'user' || rLower === 'admin' || rLower === 'administrator') {
            u.role = 'Administrator';
          }
        }
        return u;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('erpToken'));
  const [modules, setModules] = useState<ModuleItem[]>(DEFAULT_MODULES);
  const [isLoading, setIsLoading] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<Record<string, RolePermission>>({});

  const { success, error: notifyError } = useNotification();
  const { t, translateBackendError } = useI18n();

  const isAdministratorRole = useCallback((role?: string, username?: string) => {
    const r = (role || '').toLowerCase().trim();
    const u = (username || '').toLowerCase().trim();
    return (
      r === 'administrator' ||
      r === 'admin' ||
      r.includes('admin') ||
      u === 'admin' ||
      u === 'user'
    );
  }, []);

  const userRole = isAdministratorRole(user?.role, user?.username)
    ? 'Administrator'
    : user?.role || 'Staff / Viewer';

  const refreshPermissions = useCallback(async () => {
    if (!user) {
      setRolePermissions({});
      return;
    }
    if (isAdministratorRole(user.role, user.username)) {
      const fullPerms: Record<string, RolePermission> = {};
      ['Sales', 'POS', 'Inventory', 'HR', 'CRM', 'Finance', 'Purchase', 'E-Commerce', 'Ecommerce', 'Administration', 'Admin'].forEach((m) => {
        fullPerms[m.toLowerCase()] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
      });
      setRolePermissions(fullPerms);
      return;
    }

    const currentRole = user.role || 'Staff / Viewer';
    try {
      const res = await fetch(`/api/admin/menu-assignments?role=${encodeURIComponent(currentRole)}`);
      if (res.ok) {
        const data: Array<{ module_name: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }> = await res.json();
        const map: Record<string, RolePermission> = {};
        data.forEach((d) => {
          map[d.module_name.toLowerCase()] = {
            can_view: d.can_view,
            can_create: d.can_create,
            can_edit: d.can_edit,
            can_delete: d.can_delete,
          };
          if (d.module_name.toLowerCase() === 'sales') {
            map['pos'] = map['sales'];
          }
          if (d.module_name.toLowerCase() === 'e-commerce') {
            map['ecommerce'] = map['e-commerce'];
          }
        });
        setRolePermissions(map);
      }
    } catch {
      // Fallback
    }
  }, [user, isAdministratorRole]);

  useEffect(() => {
    void refreshPermissions();
  }, [refreshPermissions]);

  const canAccessModule = useCallback(
    (moduleName: string): boolean => {
      if (!user) return false;
      if (isAdministratorRole(user.role, user.username)) return true;

      const currentRole = user.role || 'Staff / Viewer';
      const modLower = moduleName.toLowerCase();
      const modClean = modLower.replace(/[^a-z0-9]/g, '');

      // Check direct match
      if (rolePermissions[modLower] !== undefined) {
        return rolePermissions[modLower].can_view;
      }
      // Check clean name match
      for (const [k, v] of Object.entries(rolePermissions)) {
        if (k.replace(/[^a-z0-9]/g, '') === modClean) {
          return v.can_view;
        }
      }

      // If no assignment exists for this role, access is restricted
      return false;
    },
    [user, rolePermissions, isAdministratorRole]
  );

  const updateUser = useCallback((updated: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      localStorage.setItem('erpUser', JSON.stringify(next));
      return next;
    });
  }, []);

  const refreshModules = useCallback(async () => {
    try {
      const res = await apiRequest<ModuleItem[]>('/api/modules');
      if (Array.isArray(res) && res.length > 0) {
        setModules(res);
        return res;
      }
    } catch {
      // Fallback to default modules if backend is cold/offline
    }
    setModules(DEFAULT_MODULES);
    return DEFAULT_MODULES;
  }, []);

  useEffect(() => {
    void refreshModules();
  }, [refreshModules]);

  const saveSession = (u: User, tkn?: string) => {
    setUser(u);
    localStorage.setItem('erpUser', JSON.stringify(u));
    if (tkn) {
      setToken(tkn);
      localStorage.setItem('erpToken', tkn);
    }
  };

  const login = async (credentials: { username?: string; email?: string; password?: string }): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      const loggedUser = res.user || {
        id: 1,
        username: credentials.username || credentials.email || 'Admin',
        fullName: credentials.username || 'System Admin',
        email: credentials.email || `${credentials.username || 'admin'}@eco-erp.local`,
      };

      saveSession(loggedUser, res.token || 'demo-jwt-token');
      success(t('authLoginSuccess') || 'Logged in successfully!');
      return loggedUser;
    } catch (err: any) {
      const msg = translateBackendError(err.message, 'Invalid credentials');
      notifyError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (payload: { username: string; email: string; password?: string; fullName: string }): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ user: User; token: string }>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const newUser = res.user || {
        id: Date.now(),
        username: payload.username,
        email: payload.email,
        fullName: payload.fullName,
      };

      saveSession(newUser, res.token || 'demo-jwt-token');
      success(t('authRegisterSuccess') || 'Account created successfully!');
      return newUser;
    } catch (err: any) {
      const msg = translateBackendError(err.message, 'Sign up failed');
      notifyError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const singleClickLogin = async (username: string): Promise<User> => {
    setIsLoading(true);
    try {
      // Try regular login with default pass, or create user if needed
      return await login({ username, password: 'password123' });
    } catch {
      // Fallback demo user
      const demoUser: User = {
        id: 1,
        username: username || 'demo_user',
        fullName: username ? username.toUpperCase() : 'Demo Administrator',
        email: `${username || 'demo'}@eco-erp.local`,
      };
      saveSession(demoUser, 'demo-token');
      success('Logged in as ' + demoUser.fullName);
      return demoUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('erpUser');
    localStorage.removeItem('erpToken');
    success(t('authLogoutSuccess') || 'Logged out successfully');
  };

  // WebAuthn Passkeys
  const checkPasskeyStatus = async (username: string): Promise<boolean> => {
    try {
      const res = await apiRequest<{ has_passkey?: boolean; hasPasskey?: boolean }>('/api/auth/passkey/status', {
        method: 'POST',
        body: JSON.stringify({ username }),
      });
      return !!(res.has_passkey ?? res.hasPasskey);
    } catch {
      return false;
    }
  };

  const registerPasskey = async (username: string): Promise<boolean> => {
    if (!browserSupportsWebAuthn()) {
      notifyError('WebAuthn is not supported in this browser environment.');
      return false;
    }

    try {
      const beginRes = await apiRequest<{ session_id: string; options: any }>(
        '/api/auth/passkey/enroll/begin',
        {
          method: 'POST',
          body: JSON.stringify({ username }),
        }
      );

      const optionsJSON = beginRes.options?.publicKey || beginRes.options || beginRes;
      const attResp = await startRegistration({ optionsJSON });

      const finishRes = await apiRequest<any>(
        '/api/auth/passkey/enroll/finish',
        {
          method: 'POST',
          body: JSON.stringify({
            session_id: beginRes.session_id,
            credential: attResp,
          }),
        }
      );

      if (finishRes && (finishRes.has_passkey !== undefined || finishRes.id || finishRes.username)) {
        success(t('fingerprintReady') || 'Device passkey enrolled successfully!');
        updateUser({ hasPasskey: true });
        return true;
      }
      return false;
    } catch (err: any) {
      notifyError(err.message || 'Failed to enroll passkey');
      return false;
    }
  };

  const loginWithPasskey = async (username: string): Promise<User> => {
    if (!browserSupportsWebAuthn()) {
      throw new Error('WebAuthn is not supported on this device');
    }

    const beginRes = await apiRequest<{ session_id: string; options: any }>(
      '/api/auth/passkey/login/begin',
      {
        method: 'POST',
        body: JSON.stringify(username ? { username } : {}),
      }
    );

    const optionsJSON = beginRes.options?.publicKey || beginRes.options || beginRes;
    const assertionResp = await startAuthentication({ optionsJSON });

    const finishRes = await apiRequest<any>(
      '/api/auth/passkey/login/finish',
      {
        method: 'POST',
        body: JSON.stringify({
          session_id: beginRes.session_id,
          credential: assertionResp,
        }),
      }
    );

    const loggedUser: User = {
      id: finishRes.id || finishRes.user?.id || 1,
      username: finishRes.username || finishRes.user?.username || username || 'Admin',
      fullName: finishRes.full_name || finishRes.user?.fullName || finishRes.username || 'System Admin',
      email: finishRes.email || finishRes.user?.email || `${username || 'admin'}@eco-erp.local`,
      hasPasskey: true,
      hasFaceLogin: !!(finishRes.has_face_login ?? finishRes.user?.hasFaceLogin),
      faceImage: finishRes.face_image ?? finishRes.user?.faceImage,
      localizedDisplayNames: finishRes.localized_display_names ?? finishRes.user?.localizedDisplayNames,
    };

    saveSession(loggedUser, finishRes.token || 'demo-jwt-token');
    success(t('authLoginSuccess') || 'Logged in with passkey!');
    return loggedUser;
  };

  const disablePasskey = async (username: string): Promise<boolean> => {
    try {
      await apiRequest('/api/auth/passkey/disable', {
        method: 'POST',
        body: JSON.stringify({ username }),
      });
      updateUser({ hasPasskey: false });
      success('Passkey disabled');
      return true;
    } catch (err: any) {
      notifyError(err.message || 'Could not disable passkey');
      return false;
    }
  };

  // Face Recognition Auth
  const checkFaceStatus = async (username: string): Promise<boolean> => {
    try {
      const res = await apiRequest<{ hasFaceLogin: boolean }>('/api/auth/face/status', {
        method: 'POST',
        body: JSON.stringify({ username }),
      });
      return !!res.hasFaceLogin;
    } catch {
      return false;
    }
  };

  const enrollFace = async (username: string, descriptor: number[], imageBase64: string): Promise<boolean> => {
    try {
      const res = await apiRequest<any>('/api/auth/face/enroll', {
        method: 'POST',
        body: JSON.stringify({
          user_id: user?.id,
          username: username || user?.username,
          photo_data: imageBase64,
          face_image: imageBase64,
          descriptor,
        }),
      });
      if (res && (res.id || res.has_face_login !== undefined || res.success)) {
        const targetUsername = username || user?.username || 'admin';
        updateUser({ hasFaceLogin: true, faceImage: imageBase64 });
        try {
          localStorage.setItem(`erp_face_photo_${targetUsername}`, imageBase64);
        } catch {
          // ignore quota error
        }
        success('Face biometric enrolled successfully!');
        return true;
      }
      return false;
    } catch (err: any) {
      notifyError(err.message || 'Face enrollment failed');
      return false;
    }
  };

  const loginWithFace = async (descriptor: number[], loginUsername?: string): Promise<User> => {
    const res = await apiRequest<any>('/api/auth/face/login', {
      method: 'POST',
      body: JSON.stringify({ descriptor, username: loginUsername || '' }),
    });

    const targetUsername = res.username || res.user?.username || loginUsername || 'Admin';
    const faceImg = res.face_image ?? res.user?.faceImage ?? localStorage.getItem(`erp_face_photo_${targetUsername}`);

    const loggedUser: User = {
      id: res.id || res.user?.id || 1,
      username: targetUsername,
      fullName: res.full_name || res.user?.fullName || res.username || 'System Admin',
      email: res.email || res.user?.email || `${targetUsername}@eco-erp.local`,
      hasFaceLogin: true,
      hasPasskey: !!(res.has_passkey ?? res.user?.hasPasskey),
      faceImage: faceImg,
      localizedDisplayNames: res.localized_display_names ?? res.user?.localizedDisplayNames,
    };

    saveSession(loggedUser, res.token || 'demo-jwt-token');
    success(`Welcome back, ${loggedUser.fullName || loggedUser.username}!`);
    return loggedUser;
  };

  const disableFace = async (username: string): Promise<boolean> => {
    try {
      await apiRequest('/api/auth/face/disable', {
        method: 'POST',
        body: JSON.stringify({
          user_id: user?.id,
          username: username || user?.username,
        }),
      });
      const targetUsername = username || user?.username || 'admin';
      localStorage.removeItem(`erp_face_photo_${targetUsername}`);
      updateUser({ hasFaceLogin: false, faceImage: undefined });
      success('Face login disabled');
      return true;
    } catch (err: any) {
      notifyError(err.message || 'Could not disable face login');
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        modules,
        isLoading,
        userRole,
        rolePermissions,
        canAccessModule,
        refreshPermissions,
        login,
        signup,
        singleClickLogin,
        logout,
        refreshModules,
        updateUser,
        registerPasskey,
        loginWithPasskey,
        checkPasskeyStatus,
        disablePasskey,
        checkFaceStatus,
        enrollFace,
        loginWithFace,
        disableFace,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

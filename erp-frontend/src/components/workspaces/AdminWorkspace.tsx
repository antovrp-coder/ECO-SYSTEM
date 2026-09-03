import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Users,
  CheckSquare,
  History,
  Save,
  Plus,
  Lock,
  Unlock,
  KeyRound,
  Camera,
  Layers,
  Search,
  RefreshCw,
  Globe,
  MapPin,
  Clock,
  Calendar,
  Activity,
  ArrowRight,
  ExternalLink,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Eye,
  Filter,
} from 'lucide-react';

interface RoleItem {
  id: number;
  name: string;
  description: string;
  level: string;
  member_count: number;
  is_system: boolean;
}

interface MenuAssignment {
  id?: number;
  role_name: string;
  module_name: string;
  sub_menu_name?: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface AdminUserView {
  id: number;
  created_at: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  has_passkey: boolean;
  has_face_login: boolean;
  face_image?: string;
}

interface UserNavScreen {
  timestamp: string;
  module: string;
  sub_menu: string;
  screen: string;
}

interface UserTxnAction {
  timestamp: string;
  type: string;
  module: string;
  summary: string;
  amount_cents: number;
  status: string;
}

interface UserSessionActivity {
  id: number;
  created_at: string;
  session_token: string;
  user_id: number;
  username: string;
  full_name: string;
  role: string;
  auth_method: string;
  login_time: string;
  logout_time?: string;
  duration_mins: number;
  ip_address: string;
  geo_location: string;
  country_code: string;
  city: string;
  device_browser: string;
  screens_opened: UserNavScreen[];
  transactions: UserTxnAction[];
  status: string;
}

interface AuditLogItem {
  id: number;
  created_at: string;
  username: string;
  action: string;
  category: string;
  details: string;
  ip_address: string;
  status: string;
}

const ALL_MODULES = [
  'Sales',
  'Inventory',
  'HR',
  'CRM',
  'Finance',
  'Purchase',
  'E-Commerce',
  'Administration',
];

interface AdminWorkspaceProps {
  activeSubMenu?: string;
}

export const AdminWorkspace: React.FC<AdminWorkspaceProps> = ({ activeSubMenu = 'Menu Assignment' }) => {
  const { translateEntity } = useI18n();
  const { success, error: notifyError } = useNotification();
  const { refreshPermissions } = useAuth();

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('Administrator');
  const [assignments, setAssignments] = useState<MenuAssignment[]>([]);
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [sessions, setSessions] = useState<UserSessionActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Geo & Datewise filter state
  const [dateFilter, setDateFilter] = useState<string>('all'); // 'all', 'today', 'yesterday', 'week', 'custom'
  const [customDate, setCustomDate] = useState<string>('');
  const [geoFilter, setGeoFilter] = useState<string>('all');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');

  // Drilldown Inspector Modal
  const [inspectedSession, setInspectedSession] = useState<UserSessionActivity | null>(null);

  // New Role Form State
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleLevel, setNewRoleLevel] = useState('Read & Write');
  const [showRoleModal, setShowRoleModal] = useState(false);

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data || []);
      }
    } catch {
      // ignore
    }
  };

  const fetchAssignments = async (role: string) => {
    try {
      const res = await fetch(`/api/admin/menu-assignments?role=${encodeURIComponent(role)}`);
      if (res.ok) {
        const data: MenuAssignment[] = await res.json();
        const matrix: MenuAssignment[] = ALL_MODULES.map((mod) => {
          const found = data.find((d) => d.module_name.toLowerCase() === mod.toLowerCase());
          if (found) return found;
          return {
            role_name: role,
            module_name: mod,
            can_view: role === 'Administrator',
            can_create: role === 'Administrator',
            can_edit: role === 'Administrator',
            can_delete: role === 'Administrator',
          };
        });
        setAssignments(matrix);
      }
    } catch {
      // ignore
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data || []);
      }
    } catch {
      // ignore
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data || []);
      }
    } catch {
      // ignore
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/admin/user-sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setLoading(true);
    void Promise.all([fetchRoles(), fetchUsers(), fetchAuditLogs(), fetchSessions()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedRole) {
      void fetchAssignments(selectedRole);
    }
  }, [selectedRole]);

  const handleTogglePermission = (moduleName: string, perm: 'can_view' | 'can_create' | 'can_edit' | 'can_delete') => {
    setAssignments((prev) =>
      prev.map((item) => {
        if (item.module_name === moduleName) {
          const nextVal = !item[perm];
          const updated = { ...item, [perm]: nextVal };
          if (perm === 'can_view' && !nextVal) {
            updated.can_create = false;
            updated.can_edit = false;
            updated.can_delete = false;
          }
          if (perm !== 'can_view' && nextVal) {
            updated.can_view = true;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleSaveAssignments = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/menu-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_name: selectedRole,
          assignments,
        }),
      });
      if (res.ok) {
        success(`Menu assignments updated for role "${selectedRole}"!`);
        void fetchAuditLogs();
        void refreshPermissions();
      } else {
        notifyError('Failed to save menu assignments');
      }
    } catch {
      notifyError('Network error saving assignments');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoleName.trim(),
          description: newRoleDesc.trim() || 'Custom operational role',
          level: newRoleLevel,
        }),
      });
      if (res.ok) {
        success(`Role "${newRoleName}" created successfully!`);
        setShowRoleModal(false);
        setNewRoleName('');
        setNewRoleDesc('');
        void fetchRoles();
        void fetchAuditLogs();
        void refreshPermissions();
      } else {
        notifyError('Could not create role');
      }
    } catch {
      notifyError('Failed to create role');
    }
  };

  const handleUpdateUserRole = async (userId: number, role: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        success(`User role updated to ${role}`);
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
        void fetchAuditLogs();
        void refreshPermissions();
      }
    } catch {
      notifyError('Failed to update role');
    }
  };

  const handleToggleUserActive = async (userId: number, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      if (res.ok) {
        success(`User status updated to ${!currentActive ? 'Active' : 'Disabled'}`);
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: !currentActive } : u)));
        void fetchAuditLogs();
      }
    } catch {
      notifyError('Failed to toggle status');
    }
  };

  // Filtered Sessions for Date & Geo Activity
  const filteredSessions = sessions.filter((s) => {
    const sessionDate = new Date(s.login_time);
    const today = new Date();
    const isToday = sessionDate.toDateString() === today.toDateString();

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = sessionDate.toDateString() === yesterday.toDateString();

    // Date filter
    if (dateFilter === 'today' && !isToday) return false;
    if (dateFilter === 'yesterday' && !isYesterday) return false;
    if (dateFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      if (sessionDate < weekAgo) return false;
    }
    if (dateFilter === 'custom' && customDate) {
      const yyyymmdd = sessionDate.toISOString().split('T')[0];
      if (yyyymmdd !== customDate) return false;
    }

    // Geo filter
    if (geoFilter !== 'all') {
      if (s.country_code.toLowerCase() !== geoFilter.toLowerCase()) return false;
    }

    // User filter
    if (selectedUserFilter !== 'all') {
      if (s.username.toLowerCase() !== selectedUserFilter.toLowerCase()) return false;
    }

    return true;
  });

  const filteredUsers = users.filter((u) => {
    const term = userSearch.toLowerCase();
    const matchesSearch =
      u.username.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.full_name && u.full_name.toLowerCase().includes(term)) ||
      u.role.toLowerCase().includes(term);

    if (!matchesSearch) return false;
    if (userRoleFilter !== 'all') {
      const activeRole = u.role || (u.username === 'admin' ? 'Administrator' : 'Staff / Viewer');
      if (activeRole.toLowerCase() !== userRoleFilter.toLowerCase()) return false;
    }
    return true;
  });

  const getCountryFlag = (countryCode: string) => {
    switch (countryCode?.toUpperCase()) {
      case 'AE':
        return '🇦🇪';
      case 'GB':
        return '🇬🇧';
      case 'IN':
        return '🇮🇳';
      case 'SG':
        return '🇸🇬';
      case 'US':
        return '🇺🇸';
      default:
        return '🌐';
    }
  };

  const sub = activeSubMenu.toLowerCase();

  return (
    <div style={{ padding: '1.5rem', maxWidth: '84rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div
        className="erp-card"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
          color: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)',
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{translateEntity('Administration & RBAC')}</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              Menu assignments, user geographic activity, navigation timeline, and transaction audit trails.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => {
              void fetchRoles();
              void fetchUsers();
              void fetchAuditLogs();
              void fetchSessions();
            }}
            className="erp-btn"
            style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.2)' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {translateEntity('Refresh')}
          </button>
        </div>
      </div>

      {/* 1. MENU ASSIGNMENT VIEW */}
      {(sub.includes('menu') || sub.includes('assignment') || sub === 'overview') && (
        <div className="erp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckSquare size={20} color="var(--app-primary)" /> {translateEntity('Menu & Module Assignment Matrix')}
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--app-muted)', margin: '0.25rem 0 0 0' }}>
                Select a role to customize accessible modules, menus, and read/write privileges.
              </p>
            </div>

            <button
              onClick={handleSaveAssignments}
              disabled={isSaving}
              className="erp-btn erp-btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem' }}
            >
              <Save size={16} /> {isSaving ? 'Saving...' : translateEntity('Save Menu Assignments')}
            </button>
          </div>

          {/* Role Pill Selector */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--app-border)' }}>
            {roles.map((r) => {
              const isSelected = selectedRole === r.name;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRole(r.name)}
                  style={{
                    padding: '0.45rem 0.95rem',
                    borderRadius: '9999px',
                    fontSize: '0.8125rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    border: isSelected ? '1px solid var(--app-primary)' : '1px solid var(--app-border)',
                    background: isSelected ? 'var(--app-primary)' : 'var(--app-hover)',
                    color: isSelected ? '#fff' : 'var(--app-text)',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {translateEntity(r.name)}
                </button>
              );
            })}
          </div>

          {/* Active Role Inheritance Banner */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
              <ShieldCheck size={18} color="var(--app-primary)" />
              <span>
                <strong>Role Inheritance Active:</strong> All users assigned to the <strong>{selectedRole}</strong> role automatically share and inherit these exact menu and workspace permissions.
              </span>
            </div>
            <span className="erp-badge erp-badge-info" style={{ fontSize: '0.725rem' }}>
              {users.filter((u) => (u.role || (u.username === 'admin' ? 'Administrator' : 'Staff / Viewer')) === selectedRole).length} Active User(s) Assigned
            </span>
          </div>

          {/* Matrix Table */}
          <div className="erp-table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{translateEntity('Module / Workspace')}</th>
                  <th style={{ textAlign: 'center' }}>{translateEntity('View Access')}</th>
                  <th style={{ textAlign: 'center' }}>{translateEntity('Create')}</th>
                  <th style={{ textAlign: 'center' }}>{translateEntity('Edit')}</th>
                  <th style={{ textAlign: 'center' }}>{translateEntity('Delete')}</th>
                  <th style={{ textAlign: 'right' }}>{translateEntity('Access Status')}</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((item) => {
                  return (
                    <tr key={item.module_name}>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Layers size={16} color="var(--app-primary)" />
                          <span>{translateEntity(item.module_name)}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={item.can_view}
                          onChange={() => handleTogglePermission(item.module_name, 'can_view')}
                          style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={item.can_create}
                          disabled={!item.can_view}
                          onChange={() => handleTogglePermission(item.module_name, 'can_create')}
                          style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={item.can_edit}
                          disabled={!item.can_view}
                          onChange={() => handleTogglePermission(item.module_name, 'can_edit')}
                          style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={item.can_delete}
                          disabled={!item.can_view}
                          onChange={() => handleTogglePermission(item.module_name, 'can_delete')}
                          style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {item.can_view ? (
                          <span className="erp-badge erp-badge-success">{translateEntity('Enabled')}</span>
                        ) : (
                          <span className="erp-badge erp-badge-warning">{translateEntity('Restricted')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. USER LOGIN & GEOGRAPHIC ACTIVITY AUDIT */}
      {(sub.includes('session') || sub.includes('geo') || sub.includes('activity') || sub.includes('login') || sub.includes('transaction')) && (
        <div className="erp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Globe size={20} color="var(--app-primary)" /> {translateEntity('User Login Sessions & Geographic Activity Audit')}
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--app-muted)', margin: '0.25rem 0 0 0' }}>
                Trace who logged in, datewise timeline, geographical origin, visited workspaces, and executed transactions.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Date Filters */}
              <div style={{ display: 'flex', background: 'var(--app-hover)', padding: '0.2rem', borderRadius: '0.5rem', border: '1px solid var(--app-border)' }}>
                {(['all', 'today', 'yesterday', 'week'] as const).map((df) => (
                  <button
                    key={df}
                    onClick={() => setDateFilter(df)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: dateFilter === df ? 700 : 500,
                      background: dateFilter === df ? 'var(--app-primary)' : 'transparent',
                      color: dateFilter === df ? '#fff' : 'var(--app-text)',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {df === 'all' ? 'All Dates' : df === 'week' ? 'Last 7 Days' : df}
                  </button>
                ))}
              </div>

              {/* Custom Date Input */}
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setDateFilter('custom');
                }}
                style={{
                  padding: '0.3rem 0.6rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface)',
                  color: 'var(--app-text)',
                  fontSize: '0.75rem',
                }}
              />

              {/* Geo Region Dropdown */}
              <select
                value={geoFilter}
                onChange={(e) => setGeoFilter(e.target.value)}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface)',
                  color: 'var(--app-text)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                <option value="all">🌍 All Geographic Areas</option>
                <option value="ae">🇦🇪 United Arab Emirates</option>
                <option value="gb">🇬🇧 United Kingdom</option>
                <option value="in">🇮🇳 India</option>
                <option value="sg">🇸🇬 Singapore</option>
                <option value="us">🇺🇸 United States</option>
              </select>

              {/* User Dropdown */}
              <select
                value={selectedUserFilter}
                onChange={(e) => setSelectedUserFilter(e.target.value)}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface)',
                  color: 'var(--app-text)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                <option value="all">👥 All Users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.username}>
                    {u.full_name || u.username} (@{u.username})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Session Cards & Activity Timeline Stream */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {filteredSessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--app-muted)' }}>
                <Globe size={36} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <div>No session records match the selected date and geographic filter.</div>
              </div>
            ) : (
              filteredSessions.map((session) => (
                <div
                  key={session.id}
                  style={{
                    borderRadius: '0.875rem',
                    border: '1px solid var(--app-border)',
                    backgroundColor: 'var(--app-hover)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Top Row: User details & Geo badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: 'var(--app-primary)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1rem',
                        }}
                      >
                        {session.full_name ? session.full_name[0].toUpperCase() : session.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '1rem' }}>{session.full_name || session.username}</span>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--app-muted)' }}>@{session.username}</span>
                          <span className="erp-badge erp-badge-info">{session.role}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem', fontSize: '0.75rem', color: 'var(--app-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Calendar size={12} /> {new Date(session.login_time).toLocaleDateString()}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={12} /> {new Date(session.login_time).toLocaleTimeString()}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Laptop size={12} /> {session.device_browser}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Geo Location & Auth Method Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: 'var(--app-surface)',
                          border: '1px solid var(--app-border)',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                        }}
                      >
                        <span>{getCountryFlag(session.country_code)}</span>
                        <span>{session.geo_location}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--app-muted)', fontFamily: 'monospace' }}>({session.ip_address})</span>
                      </div>

                      <span className="erp-badge erp-badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <KeyRound size={12} /> {session.auth_method}
                      </span>

                      <button
                        type="button"
                        onClick={() => setInspectedSession(session)}
                        className="erp-btn erp-btn-secondary erp-btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.65rem' }}
                      >
                        <Eye size={13} /> Inspect Full Timeline
                      </button>
                    </div>
                  </div>

                  {/* Middle Row: Screens & Workspaces Opened */}
                  <div style={{ background: 'var(--app-surface)', padding: '0.875rem', borderRadius: '0.625rem', border: '1px solid var(--app-border)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--app-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Layers size={13} color="var(--app-primary)" /> Workspaces & Menus Visited ({session.screens_opened?.length || 0}):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                      {session.screens_opened && session.screens_opened.length > 0 ? (
                        session.screens_opened.map((scr, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: 'var(--app-hover)',
                              border: '1px solid var(--app-border)',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                            }}
                          >
                            <span style={{ fontSize: '0.675rem', color: 'var(--app-muted)', fontWeight: 600 }}>{scr.timestamp}</span>
                            <span style={{ fontWeight: 700, color: 'var(--app-primary)' }}>{scr.module}</span>
                            <ArrowRight size={10} color="var(--app-muted)" />
                            <span>{scr.screen}</span>
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--app-muted)' }}>No workspace navigation recorded for this session.</span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Transactions Done */}
                  <div style={{ background: 'var(--app-surface)', padding: '0.875rem', borderRadius: '0.625rem', border: '1px solid var(--app-border)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--app-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Activity size={13} color="#10b981" /> Transactions & Operations Executed ({session.transactions?.length || 0}):
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {session.transactions && session.transactions.length > 0 ? (
                        session.transactions.map((txn, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '0.375rem',
                              backgroundColor: 'var(--app-hover)',
                              fontSize: '0.8125rem',
                              gap: '0.5rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, overflow: 'hidden' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--app-muted)', fontWeight: 600 }}>{txn.timestamp}</span>
                              <span className="erp-badge erp-badge-info" style={{ fontSize: '0.675rem' }}>{txn.module}</span>
                              <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{txn.summary}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                              {txn.amount_cents > 0 && (
                                <span style={{ fontWeight: 800, color: 'var(--app-primary)' }}>
                                  ${(txn.amount_cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                              <span className={`erp-badge ${txn.status === 'Completed' || txn.status === 'Approved' || txn.status === 'Paid' || txn.status === 'Won' || txn.status === 'Signed' ? 'erp-badge-success' : 'erp-badge-info'}`} style={{ fontSize: '0.7rem' }}>
                                {txn.status}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--app-muted)' }}>No transactional mutations executed in this session.</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. ROLES & PERMISSIONS */}
      {(sub.includes('role') || sub.includes('permission')) && (
        <div className="erp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} color="var(--app-primary)" /> {translateEntity('Enterprise Roles & Privilege Tiers')}
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--app-muted)', margin: '0.25rem 0 0 0' }}>
                Define operational scopes and governance templates across departments.
              </p>
            </div>

            <button
              onClick={() => setShowRoleModal(true)}
              className="erp-btn erp-btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Plus size={16} /> {translateEntity('Add Custom Role')}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {roles.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: '1.25rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-hover)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem' }}>{r.name}</span>
                  <span className={`erp-badge ${r.level === 'Full Access' ? 'erp-badge-success' : 'erp-badge-info'}`}>
                    {r.level}
                  </span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--app-muted)', margin: 0, flex: 1 }}>{r.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--app-border)', paddingTop: '0.5rem', fontSize: '0.75rem', color: 'var(--app-text-subtle)' }}>
                  <span>{r.is_system ? '🔒 System Protected' : '⚡ Custom Role'}</span>
                  <span>{r.member_count} Assigned Users</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. USER MANAGEMENT */}
      {(sub.includes('user') || sub.includes('employee')) && (
        <div className="erp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} color="var(--app-primary)" /> {translateEntity('User Directory & Biometric Status')}
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--app-muted)', margin: '0.25rem 0 0 0' }}>
                Manage role assignments, Passkey registration, and Face ID authorization.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Role Filter Selector */}
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                style={{
                  padding: '0.4rem 0.65rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface)',
                  color: 'var(--app-text)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                }}
              >
                <option value="all">👥 All Roles ({users.length})</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>

              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--app-muted)' }} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{
                    padding: '0.4rem 0.75rem 0.4rem 2rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--app-border)',
                    backgroundColor: 'var(--app-surface)',
                    color: 'var(--app-text)',
                    fontSize: '0.8125rem',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="erp-table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{translateEntity('User')}</th>
                  <th>{translateEntity('Email')}</th>
                  <th>{translateEntity('Assigned Role')}</th>
                  <th>{translateEntity('Passkey (FIDO2)')}</th>
                  <th>{translateEntity('Face ID')}</th>
                  <th>{translateEntity('Status')}</th>
                  <th style={{ textAlign: 'right' }}>{translateEntity('Action')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {u.face_image ? (
                          <img
                            src={u.face_image}
                            alt={u.username}
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--app-primary)' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'var(--app-primary)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.8rem',
                            }}
                          >
                            {u.full_name ? u.full_name[0].toUpperCase() : u.username[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700 }}>{u.full_name || u.username}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)' }}>@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.375rem',
                          border: '1px solid var(--app-border)',
                          backgroundColor: 'var(--app-surface)',
                          color: 'var(--app-text)',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                        }}
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.name}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {u.has_passkey ? (
                        <span className="erp-badge erp-badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <KeyRound size={12} /> Active
                        </span>
                      ) : (
                        <span className="erp-badge erp-badge-warning">None</span>
                      )}
                    </td>
                    <td>
                      {u.has_face_login ? (
                        <span className="erp-badge erp-badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Camera size={12} /> Enrolled
                        </span>
                      ) : (
                        <span className="erp-badge erp-badge-warning">None</span>
                      )}
                    </td>
                    <td>
                      {u.is_active ? (
                        <span className="erp-badge erp-badge-success">Active</span>
                      ) : (
                        <span className="erp-badge erp-badge-danger">Disabled</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleUserActive(u.id, u.is_active)}
                        className={`erp-btn ${u.is_active ? 'erp-btn-danger' : 'erp-btn-primary'} erp-btn-sm`}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        {u.is_active ? <Lock size={12} /> : <Unlock size={12} />}
                        <span>{u.is_active ? 'Disable' : 'Enable'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. AUDIT & SECURITY LOGS */}
      {(sub.includes('audit') || sub.includes('log') || sub.includes('security')) && (
        <div className="erp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={20} color="var(--app-primary)" /> {translateEntity('Security & Administrative Audit Logs')}
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--app-muted)', margin: '0.25rem 0 0 0' }}>
                Immutable event stream for compliance, authentication attempts, and privilege revisions.
              </p>
            </div>
          </div>

          <div className="erp-table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{translateEntity('Timestamp')}</th>
                  <th>{translateEntity('User')}</th>
                  <th>{translateEntity('Action')}</th>
                  <th>{translateEntity('Category')}</th>
                  <th>{translateEntity('Details')}</th>
                  <th>{translateEntity('IP / Source')}</th>
                  <th style={{ textAlign: 'right' }}>{translateEntity('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.75rem', color: 'var(--app-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 700 }}>@{log.username}</td>
                    <td style={{ fontWeight: 600 }}>{log.action}</td>
                    <td>
                      <span className="erp-badge erp-badge-info">{log.category}</span>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>{log.details}</td>
                    <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{log.ip_address}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`erp-badge ${log.status === 'Success' ? 'erp-badge-success' : 'erp-badge-warning'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drill-down Inspector Modal for User Journey */}
      {inspectedSession && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--app-border)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  User Activity Journey • @{inspectedSession.username}
                </h3>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8125rem', color: 'var(--app-muted)', marginTop: '0.25rem' }}>
                  <span>{getCountryFlag(inspectedSession.country_code)} {inspectedSession.geo_location}</span>
                  <span>•</span>
                  <span>IP: {inspectedSession.ip_address}</span>
                  <span>•</span>
                  <span>Login: {new Date(inspectedSession.login_time).toLocaleString()}</span>
                </div>
              </div>
              <button onClick={() => setInspectedSession(null)} className="erp-btn erp-btn-secondary erp-btn-sm">
                Close
              </button>
            </div>

            {/* Chronological Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--app-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={16} /> Complete Session Step-by-Step Playback
              </div>

              <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid var(--app-primary)' }}>
                {/* 1. Login Event */}
                <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-1.85rem', top: '0', width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)' }}>{new Date(inspectedSession.login_time).toLocaleTimeString()}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Authenticated via {inspectedSession.auth_method}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--app-muted)' }}>Location: {inspectedSession.geo_location} ({inspectedSession.ip_address})</div>
                </div>

                {/* 2. Navigation Screens */}
                {inspectedSession.screens_opened?.map((scr, idx) => (
                  <div key={idx} style={{ marginBottom: '1.25rem', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-1.85rem', top: '0', width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6' }} />
                    <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)' }}>{scr.timestamp}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Opened Workspace: {scr.module} → {scr.screen}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--app-muted)' }}>Submenu accessed: {scr.sub_menu}</div>
                  </div>
                ))}

                {/* 3. Transaction Actions */}
                {inspectedSession.transactions?.map((txn, idx) => (
                  <div key={idx} style={{ marginBottom: '1.25rem', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-1.85rem', top: '0', width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }} />
                    <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)' }}>{txn.timestamp}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--app-text)' }}>
                      Transaction: {txn.summary}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem' }}>
                      <span className="erp-badge erp-badge-info">{txn.type}</span>
                      {txn.amount_cents > 0 && (
                        <span style={{ fontWeight: 800, color: 'var(--app-primary)' }}>
                          ${(txn.amount_cents / 100).toFixed(2)}
                        </span>
                      )}
                      <span className="erp-badge erp-badge-success">{txn.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Creation Modal */}
      {showRoleModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ maxWidth: '420px', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Create Custom Enterprise Role</h3>
            <form onSubmit={handleCreateRole} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Regional Supervisor"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="erp-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Description</label>
                <textarea
                  rows={2}
                  placeholder="Role description and governance boundaries..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="erp-input"
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Access Tier</label>
                <select
                  value={newRoleLevel}
                  onChange={(e) => setNewRoleLevel(e.target.value)}
                  className="erp-input"
                  style={{ width: '100%' }}
                >
                  <option value="Full Access">Full Access</option>
                  <option value="Read & Write">Read & Write</option>
                  <option value="Read Only">Read Only</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowRoleModal(false)} className="erp-btn erp-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="erp-btn erp-btn-primary">
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

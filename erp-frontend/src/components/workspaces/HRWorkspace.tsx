import React, { useState, useEffect } from 'react';
import {
  hrService,
  HREmployeeItem,
  HRPayrollRunItem,
  HRAttendanceItem,
  HROverviewItem,
  HRLeaveRequestItem,
  CreateHREmployeePayload,
  CreateHRPayrollPayload,
  CreateHRLeavePayload,
} from '../../services/hrService';
import { useNotification } from '../../context/NotificationContext';
import { useI18n } from '../../i18n/I18nContext';
import {
  Users,
  Clock,
  CalendarCheck,
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Building,
  UserCheck,
} from 'lucide-react';

interface HRWorkspaceProps {
  activeSubMenu?: string;
}

export const HRWorkspace: React.FC<HRWorkspaceProps> = ({ activeSubMenu = 'Overview' }) => {
  const { success, warning, error: notifyError } = useNotification();
  const { translateEntity, t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<HROverviewItem | null>(null);
  const [employees, setEmployees] = useState<HREmployeeItem[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<HRPayrollRunItem[]>([]);
  const [attendance, setAttendance] = useState<HRAttendanceItem[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<HRLeaveRequestItem[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);

  // Drafts
  const [employeeDraft, setEmployeeDraft] = useState<CreateHREmployeePayload>({
    employee_code: '',
    full_name: '',
    department: 'Engineering',
    role_title: '',
    location: 'Headquarters',
    employment_type: 'Full-time',
    status: 'Active',
    shift_label: 'Morning (09:00 - 18:00)',
    manager_name: 'Alex Vance',
    salary: 65000,
    leave_balance: 18,
  });

  const [leaveDraft, setLeaveDraft] = useState<CreateHRLeavePayload>({
    employee_code: '',
    leave_type: 'Annual',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    reason: '',
  });

  const [payrollDraft, setPayrollDraft] = useState<CreateHRPayrollPayload>({
    period_label: 'Current Month Payout',
    payout_date: new Date().toISOString().split('T')[0],
    notes: 'Regular monthly salary cycle',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [ov, emp, pay, att, lve] = await Promise.all([
        hrService.getOverview().catch(() => null),
        hrService.getEmployees().catch(() => []),
        hrService.getPayrollRuns().catch(() => []),
        hrService.getAttendance().catch(() => []),
        hrService.getLeaveRequests().catch(() => []),
      ]);
      setOverview(ov);
      setEmployees(emp);
      setPayrollRuns(pay);
      setAttendance(att);
      setLeaveRequests(lve);
    } catch (err: any) {
      notifyError('Failed to load HR data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredEmployees = employees.filter((e) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      e.full_name.toLowerCase().includes(q) ||
      e.employee_code.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q) ||
      e.role_title.toLowerCase().includes(q)
    );
  });

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeDraft.employee_code || !employeeDraft.full_name || !employeeDraft.role_title) {
      warning('Please fill in required employee details.');
      return;
    }
    try {
      await hrService.createEmployee(employeeDraft);
      success(`Employee ${employeeDraft.full_name} created successfully!`);
      setShowAddEmployeeModal(false);
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Failed to create employee');
    }
  };

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveDraft.employee_code || !leaveDraft.reason) {
      warning('Please specify employee code and reason.');
      return;
    }
    try {
      await hrService.createLeaveRequest(leaveDraft);
      success('Leave request submitted!');
      setShowLeaveModal(false);
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Failed to submit leave request');
    }
  };

  const handleLeaveAction = async (id: number, status: 'Approved' | 'Rejected') => {
    try {
      await hrService.updateLeaveRequestStatus(id, status, 'HR Admin');
      success(`Leave request ${status.toLowerCase()}!`);
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Failed to update status');
    }
  };

  const handleCreatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hrService.createPayrollRun(payrollDraft);
      success('Payroll cycle executed!');
      setShowPayrollModal(false);
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Failed to run payroll');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-primary-light)', color: 'var(--app-primary)' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Total Employees')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{overview?.active_headcount ?? employees.length}</div>
          </div>
        </div>

        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-warning-bg)', color: 'var(--app-warning)' }}>
            <CalendarCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Pending')} {translateEntity('Leave')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {overview?.pending_leave_requests ?? leaveRequests.filter((l) => l.status === 'Pending').length}
            </div>
          </div>
        </div>

        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-success-bg)', color: 'var(--app-success)' }}>
            <UserCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Present Today')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{attendance.length}</div>
          </div>
        </div>

        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-hover)', color: 'var(--app-text)' }}>
            <CreditCard size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Payroll')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{payrollRuns.length}</div>
          </div>
        </div>
      </div>

      {/* Dynamic SubMenu Views */}
      {activeSubMenu === 'Employees' ? (
        /* Employees Tab */
        <div className="erp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '24rem' }}>
              <Search size={16} color="var(--app-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder={translateEntity('Search') + '...'}
                className="erp-input"
                style={{ paddingLeft: '2.25rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => void loadData()} className="erp-btn erp-btn-secondary erp-btn-sm">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {translateEntity('Refresh')}
              </button>
              <button onClick={() => setShowAddEmployeeModal(true)} className="erp-btn erp-btn-primary erp-btn-sm">
                <Plus size={14} /> {translateEntity('Add Employee')}
              </button>
            </div>
          </div>

          <div className="erp-table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{translateEntity('Code')}</th>
                  <th>{translateEntity('Employee')}</th>
                  <th>{translateEntity('Department')}</th>
                  <th>{translateEntity('Role')}</th>
                  <th>{translateEntity('Type')}</th>
                  <th>{translateEntity('Shift')}</th>
                  <th>{translateEntity('Salary')}</th>
                  <th>{translateEntity('Leave Balance')}</th>
                  <th>{translateEntity('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--app-muted)' }}>
                      No employees found.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--app-primary)' }}>{emp.employee_code}</td>
                      <td style={{ fontWeight: 600 }}>{emp.full_name}</td>
                      <td>
                        <span className="erp-badge erp-badge-info">{emp.department}</span>
                      </td>
                      <td>{emp.role_title}</td>
                      <td>{emp.employment_type}</td>
                      <td>{emp.shift_label}</td>
                      <td style={{ fontWeight: 600 }}>{emp.salary}</td>
                      <td>{emp.leave_balance}</td>
                      <td>
                        <span className={`erp-badge ${emp.status === 'Active' ? 'erp-badge-success' : 'erp-badge-warning'}`}>
                          {translateEntity(emp.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeSubMenu === 'Attendance' ? (
        /* Attendance Tab */
        <div className="erp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{translateEntity('Attendance')}</h3>
            <button onClick={() => void loadData()} className="erp-btn erp-btn-secondary erp-btn-sm">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {translateEntity('Refresh')}
            </button>
          </div>

          <div className="erp-table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{translateEntity('Code')}</th>
                  <th>{translateEntity('Employee')}</th>
                  <th>{translateEntity('Department')}</th>
                  <th>{translateEntity('Date')}</th>
                  <th>{translateEntity('Shift')}</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>{translateEntity('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--app-muted)' }}>
                      No attendance records today.
                    </td>
                  </tr>
                ) : (
                  attendance.map((att) => (
                    <tr key={att.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{att.employee_code}</td>
                      <td style={{ fontWeight: 600 }}>{att.employee_name}</td>
                      <td>{att.department}</td>
                      <td>{att.date_label}</td>
                      <td>{att.shift_label}</td>
                      <td>{att.check_in_time || '—'}</td>
                      <td>{att.check_out_time || '—'}</td>
                      <td>
                        <span
                          className={`erp-badge ${
                            att.status === 'Present'
                              ? 'erp-badge-success'
                              : att.status === 'Late'
                              ? 'erp-badge-warning'
                              : 'erp-badge-info'
                          }`}
                        >
                          {translateEntity(att.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeSubMenu === 'Leave Requests' || activeSubMenu === 'Leave' ? (
        /* Leave Requests Tab */
        <div className="erp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{translateEntity('Leave Requests')}</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => void loadData()} className="erp-btn erp-btn-secondary erp-btn-sm">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {translateEntity('Refresh')}
              </button>
              <button onClick={() => setShowLeaveModal(true)} className="erp-btn erp-btn-primary erp-btn-sm">
                <Plus size={14} /> {translateEntity('Request Leave')}
              </button>
            </div>
          </div>

          <div className="erp-table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{translateEntity('Employee')}</th>
                  <th>{translateEntity('Department')}</th>
                  <th>{translateEntity('Type')}</th>
                  <th>{translateEntity('Date')}</th>
                  <th>End</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>{translateEntity('Status')}</th>
                  <th style={{ textAlign: 'right' }}>{translateEntity('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--app-muted)' }}>
                      No leave applications found.
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map((l) => (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 600 }}>{l.employee_name || l.employee_code}</td>
                      <td>{l.department}</td>
                      <td>
                        <span className="erp-badge erp-badge-info">{l.leave_type}</span>
                      </td>
                      <td>{l.start_date}</td>
                      <td>{l.end_date}</td>
                      <td style={{ fontWeight: 700 }}>{l.total_days}</td>
                      <td>{l.reason}</td>
                      <td>
                        <span
                          className={`erp-badge ${
                            l.status === 'Approved'
                              ? 'erp-badge-success'
                              : l.status === 'Rejected'
                              ? 'erp-badge-danger'
                              : 'erp-badge-warning'
                          }`}
                        >
                          {translateEntity(l.status)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {l.status === 'Pending' && (
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button
                              onClick={() => handleLeaveAction(l.id, 'Approved')}
                              className="erp-btn erp-btn-sm"
                              style={{ backgroundColor: 'var(--app-success)', color: '#fff', padding: '0.2rem 0.5rem' }}
                              title="Approve"
                            >
                              <CheckCircle2 size={13} />
                            </button>
                            <button
                              onClick={() => handleLeaveAction(l.id, 'Rejected')}
                              className="erp-btn erp-btn-danger erp-btn-sm"
                              style={{ padding: '0.2rem 0.5rem' }}
                              title="Reject"
                            >
                              <XCircle size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeSubMenu === 'Payroll' ? (
        /* Payroll Tab */
        <div className="erp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{translateEntity('Payroll')}</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => void loadData()} className="erp-btn erp-btn-secondary erp-btn-sm">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {translateEntity('Refresh')}
              </button>
              <button onClick={() => setShowPayrollModal(true)} className="erp-btn erp-btn-primary erp-btn-sm">
                <CreditCard size={14} /> {translateEntity('Run Payroll')}
              </button>
            </div>
          </div>

          <div className="erp-table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Payout Date</th>
                  <th>Headcount</th>
                  <th>Total Payout</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {payrollRuns.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--app-muted)' }}>
                      No payroll cycles recorded.
                    </td>
                  </tr>
                ) : (
                  payrollRuns.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700 }}>{p.period_label}</td>
                      <td>{p.payout_date}</td>
                      <td>{p.headcount}</td>
                      <td style={{ fontWeight: 800, color: 'var(--app-primary)' }}>{p.total_payout}</td>
                      <td>
                        <span className="erp-badge erp-badge-success">{p.status}</span>
                      </td>
                      <td style={{ color: 'var(--app-muted)' }}>{p.notes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Overview SubMenu (Default) */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="erp-card">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Department Distribution</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {overview?.department_headcount && overview.department_headcount.length > 0 ? (
                overview.department_headcount.map((d) => (
                  <div key={d.department} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem', borderRadius: '0.5rem', backgroundColor: 'var(--app-hover)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                      <Building size={16} color="var(--app-primary)" />
                      <span>{d.department}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span className="erp-badge erp-badge-info">{d.headcount} staff</span>
                      {d.pending_leave_requests > 0 && (
                        <span className="erp-badge erp-badge-warning">{d.pending_leave_requests} leave</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--app-muted)', fontSize: '0.875rem' }}>Departments loaded.</div>
              )}
            </div>
          </div>

          <div className="erp-card">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Workforce Status Mix</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {overview?.workforce_status && overview.workforce_status.length > 0 ? (
                overview.workforce_status.map((st) => (
                  <div key={st.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem', borderRadius: '0.5rem', backgroundColor: 'var(--app-hover)' }}>
                    <span style={{ fontWeight: 600 }}>{st.label}</span>
                    <span className="erp-badge erp-badge-success">{st.count} members</span>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--app-muted)', fontSize: '0.875rem' }}>Active staff stats available.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ padding: '1.5rem', maxWidth: '32rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Create Employee Profile</h3>
            <form onSubmit={handleCreateEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Code *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    placeholder="EMP-101"
                    value={employeeDraft.employee_code}
                    onChange={(e) => setEmployeeDraft({ ...employeeDraft, employee_code: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Full Name *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    placeholder="David Kim"
                    value={employeeDraft.full_name}
                    onChange={(e) => setEmployeeDraft({ ...employeeDraft, full_name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Department</label>
                  <input
                    type="text"
                    className="erp-input"
                    value={employeeDraft.department}
                    onChange={(e) => setEmployeeDraft({ ...employeeDraft, department: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Role Title *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    placeholder="Senior Engineer"
                    value={employeeDraft.role_title}
                    onChange={(e) => setEmployeeDraft({ ...employeeDraft, role_title: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Salary ($)</label>
                  <input
                    type="number"
                    min={0}
                    className="erp-input"
                    value={employeeDraft.salary}
                    onChange={(e) => setEmployeeDraft({ ...employeeDraft, salary: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Leave Balance</label>
                  <input
                    type="number"
                    min={0}
                    className="erp-input"
                    value={employeeDraft.leave_balance}
                    onChange={(e) => setEmployeeDraft({ ...employeeDraft, leave_balance: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowAddEmployeeModal(false)} className="erp-btn erp-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="erp-btn erp-btn-primary">
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Request Modal */}
      {showLeaveModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ padding: '1.5rem', maxWidth: '28rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Apply for Leave</h3>
            <form onSubmit={handleCreateLeave} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Employee Code *</label>
                <input
                  type="text"
                  required
                  className="erp-input"
                  placeholder="e.g. EMP-101"
                  value={leaveDraft.employee_code}
                  onChange={(e) => setLeaveDraft({ ...leaveDraft, employee_code: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Leave Type</label>
                <select
                  className="erp-select"
                  value={leaveDraft.leave_type}
                  onChange={(e) => setLeaveDraft({ ...leaveDraft, leave_type: e.target.value as any })}
                >
                  <option value="Annual">Annual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Personal">Personal Leave</option>
                  <option value="Comp Off">Comp Off</option>
                  <option value="Unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Start Date</label>
                  <input
                    type="date"
                    required
                    className="erp-input"
                    value={leaveDraft.start_date}
                    onChange={(e) => setLeaveDraft({ ...leaveDraft, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>End Date</label>
                  <input
                    type="date"
                    required
                    className="erp-input"
                    value={leaveDraft.end_date}
                    onChange={(e) => setLeaveDraft({ ...leaveDraft, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Reason *</label>
                <textarea
                  required
                  rows={3}
                  className="erp-textarea"
                  placeholder="Reason for leave..."
                  value={leaveDraft.reason}
                  onChange={(e) => setLeaveDraft({ ...leaveDraft, reason: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowLeaveModal(false)} className="erp-btn erp-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="erp-btn erp-btn-primary">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Run Payroll Modal */}
      {showPayrollModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ padding: '1.5rem', maxWidth: '28rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Execute Payroll Run</h3>
            <form onSubmit={handleCreatePayroll} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Period Label</label>
                <input
                  type="text"
                  required
                  className="erp-input"
                  value={payrollDraft.period_label}
                  onChange={(e) => setPayrollDraft({ ...payrollDraft, period_label: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Payout Date</label>
                <input
                  type="date"
                  required
                  className="erp-input"
                  value={payrollDraft.payout_date}
                  onChange={(e) => setPayrollDraft({ ...payrollDraft, payout_date: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Notes</label>
                <input
                  type="text"
                  className="erp-input"
                  value={payrollDraft.notes}
                  onChange={(e) => setPayrollDraft({ ...payrollDraft, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowPayrollModal(false)} className="erp-btn erp-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="erp-btn erp-btn-primary">
                  Process Disbursement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import { apiRequest } from './api';

export interface HREmployeeItem {
  id: number;
  employee_code: string;
  full_name: string;
  department: string;
  role_title: string;
  location: string;
  employment_type: string;
  status: string;
  shift_label: string;
  manager_name: string;
  salary: string;
  leave_balance: string;
}

export interface HRPayrollRunItem {
  id: number;
  period_label: string;
  payout_date: string;
  status: string;
  headcount: string;
  total_payout: string;
  notes: string;
}

export interface HRAttendanceItem {
  id: number;
  employee_code: string;
  employee_name: string;
  department: string;
  date_label: string;
  shift_label: string;
  status: 'Present' | 'Remote' | 'Late' | 'On leave';
  check_in_time: string;
  check_out_time: string;
}

export interface HROverviewDepartmentItem {
  department: string;
  headcount: number;
  pending_leave_requests: number;
}

export interface HROverviewStatusItem {
  label: string;
  count: number;
}

export interface HROverviewItem {
  active_headcount: number;
  departments: number;
  attendance_alerts: number;
  pending_leave_requests: number;
  latest_payroll: string;
  average_leave_balance: string;
  department_headcount: HROverviewDepartmentItem[];
  workforce_status: HROverviewStatusItem[];
}

export interface HRLeaveRequestItem {
  id: number;
  employee_code: string;
  employee_name: string;
  department: string;
  leave_type: 'Annual' | 'Sick' | 'Personal' | 'Comp Off' | 'Unpaid';
  start_date: string;
  end_date: string;
  total_days: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  approver_name: string;
  reason: string;
}

export interface CreateHREmployeePayload {
  employee_code: string;
  full_name: string;
  department: string;
  role_title: string;
  location: string;
  employment_type: string;
  status: string;
  shift_label: string;
  manager_name: string;
  salary: number;
  leave_balance: number;
}

export interface CreateHRPayrollPayload {
  period_label: string;
  payout_date: string;
  notes: string;
}

export interface CreateHRLeavePayload {
  employee_code: string;
  leave_type: HRLeaveRequestItem['leave_type'];
  start_date: string;
  end_date: string;
  reason: string;
}

export const hrService = {
  getOverview: () => apiRequest<HROverviewItem>('/api/hr/overview'),
  getEmployees: () => apiRequest<HREmployeeItem[]>('/api/hr/employees'),
  createEmployee: (payload: CreateHREmployeePayload) =>
    apiRequest<HREmployeeItem>('/api/hr/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getPayrollRuns: () => apiRequest<HRPayrollRunItem[]>('/api/hr/payroll'),
  createPayrollRun: (payload: CreateHRPayrollPayload) =>
    apiRequest<HRPayrollRunItem>('/api/hr/payroll', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAttendance: () => apiRequest<HRAttendanceItem[]>('/api/hr/attendance'),
  getLeaveRequests: () => apiRequest<HRLeaveRequestItem[]>('/api/hr/leave'),
  createLeaveRequest: (payload: CreateHRLeavePayload) =>
    apiRequest<HRLeaveRequestItem>('/api/hr/leave', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateLeaveRequestStatus: (leaveRequestId: number, status: HRLeaveRequestItem['status'], approverName?: string) =>
    apiRequest<HRLeaveRequestItem>(`/api/hr/leave/${leaveRequestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, approver_name: approverName }),
    }),
};

import { Injectable } from '@angular/core';

const API_BASE_URL = '';

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

@Injectable({
  providedIn: 'root'
})
export class HrService {
  async getOverview(): Promise<HROverviewItem> {
    return this.request<HROverviewItem>('/api/hr/overview');
  }

  async getEmployees(): Promise<HREmployeeItem[]> {
    return this.request<HREmployeeItem[]>('/api/hr/employees');
  }

  async createEmployee(payload: CreateHREmployeePayload): Promise<HREmployeeItem> {
    return this.request<HREmployeeItem>('/api/hr/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async getPayrollRuns(): Promise<HRPayrollRunItem[]> {
    return this.request<HRPayrollRunItem[]>('/api/hr/payroll');
  }

  async createPayrollRun(payload: CreateHRPayrollPayload): Promise<HRPayrollRunItem> {
    return this.request<HRPayrollRunItem>('/api/hr/payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async getAttendance(): Promise<HRAttendanceItem[]> {
    return this.request<HRAttendanceItem[]>('/api/hr/attendance');
  }

  async getLeaveRequests(): Promise<HRLeaveRequestItem[]> {
    return this.request<HRLeaveRequestItem[]>('/api/hr/leave');
  }

  async createLeaveRequest(payload: CreateHRLeavePayload): Promise<HRLeaveRequestItem> {
    return this.request<HRLeaveRequestItem>('/api/hr/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async updateLeaveRequestStatus(leaveRequestId: number, status: HRLeaveRequestItem['status'], approverName?: string): Promise<HRLeaveRequestItem> {
    return this.request<HRLeaveRequestItem>(`/api/hr/leave/${leaveRequestId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, approver_name: approverName }),
    });
  }

  async updateAttendanceStatus(attendanceId: number, status: HRAttendanceItem['status']): Promise<HRAttendanceItem> {
    return this.request<HRAttendanceItem>(`/api/hr/attendance/${attendanceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, init);
    const body = await this.readBody<T | { error?: string }>(response);

    if (!response.ok) {
      const error = typeof body === 'object' && body && 'error' in body ? body.error : undefined;
      throw new Error(error || `Request failed for ${path}`);
    }

    return body as T;
  }

  private async readBody<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text.trim()) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }
}
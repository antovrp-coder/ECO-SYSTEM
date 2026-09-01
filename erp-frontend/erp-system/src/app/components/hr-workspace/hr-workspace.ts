import { CommonModule } from '@angular/common';
import { Component, effect, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';
import {
  CreateHREmployeePayload,
  CreateHRLeavePayload,
  CreateHRPayrollPayload,
  HRAttendanceItem,
  HREmployeeItem,
  HRLeaveRequestItem,
  HROverviewItem,
  HRPayrollRunItem,
  HrService,
} from '../../services/hr.service';

@Component({
  selector: 'app-hr-workspace',
  imports: [CommonModule, FormsModule],
  templateUrl: './hr-workspace.html',
  styleUrl: './hr-workspace.scss',
})
export class HrWorkspaceComponent {
  readonly tabName = input.required<string>();
  private readonly hrService = inject(HrService);
  private readonly notificationService = inject(NotificationService);
  private loadVersion = 0;

  loading = false;
  error = '';
  employeeSaving = false;
  leaveSaving = false;
  payrollSaving = false;
  updatingLeaveId: number | null = null;
  updatingAttendanceId: number | null = null;
  departmentFilter = 'All';

  overview: HROverviewItem = {
    active_headcount: 0,
    departments: 0,
    attendance_alerts: 0,
    pending_leave_requests: 0,
    latest_payroll: 'No payroll scheduled',
    average_leave_balance: '0 days',
    department_headcount: [],
    workforce_status: [],
  };
  employees: HREmployeeItem[] = [];
  leaveRequests: HRLeaveRequestItem[] = [];
  payrollRuns: HRPayrollRunItem[] = [];
  attendanceRecords: HRAttendanceItem[] = [];

  employeeDraft: CreateHREmployeePayload = {
    employee_code: '',
    full_name: '',
    department: '',
    role_title: '',
    location: '',
    employment_type: 'Full-time',
    status: 'Active',
    shift_label: 'Core',
    manager_name: '',
    salary: 0,
    leave_balance: 12,
  };

  payrollDraft: CreateHRPayrollPayload = {
    period_label: 'June 2026',
    payout_date: '2026-06-30',
    notes: 'Monthly payroll batch prepared for release.',
  };

  leaveDraft: CreateHRLeavePayload = {
    employee_code: '',
    leave_type: 'Annual',
    start_date: '2026-05-21',
    end_date: '2026-05-21',
    reason: '',
  };

  constructor() {
    effect(() => {
      void this.loadWorkspace(this.tabName());
    });
  }

  get departments(): string[] {
    return ['All', ...new Set(this.employees.map((employee) => employee.department))];
  }

  get filteredEmployees(): HREmployeeItem[] {
    if (this.departmentFilter === 'All') {
      return this.employees;
    }

    return this.employees.filter((employee) => employee.department === this.departmentFilter);
  }

  get activeHeadcount(): number {
    return this.overview.active_headcount || this.employees.filter((employee) => employee.status !== 'Offboarded').length;
  }

  get payrollTotal(): string {
    return this.payrollRuns[0]?.total_payout ?? '$0';
  }

  get attendanceAlerts(): number {
    return this.overview.attendance_alerts || this.attendanceRecords.filter((record) => record.status === 'Late' || record.status === 'On leave').length;
  }

  get attendanceStatuses(): HRAttendanceItem['status'][] {
    return ['Present', 'Remote', 'Late', 'On leave'];
  }

  get leaveTypes(): HRLeaveRequestItem['leave_type'][] {
    return ['Annual', 'Sick', 'Personal', 'Comp Off', 'Unpaid'];
  }

  get leaveStatuses(): HRLeaveRequestItem['status'][] {
    return ['Pending', 'Approved', 'Rejected', 'Cancelled'];
  }

  get pendingLeaveQueue(): HRLeaveRequestItem[] {
    return this.leaveRequests.filter((request) => request.status === 'Pending');
  }

  async createEmployee(): Promise<void> {
    if (!this.employeeDraft.employee_code.trim() || !this.employeeDraft.full_name.trim() || !this.employeeDraft.department.trim() || !this.employeeDraft.role_title.trim() || this.employeeDraft.salary <= 0) {
      this.notificationService.warning('Employee code, name, department, role, and salary are required.', 3200);
      return;
    }

    this.employeeSaving = true;
    try {
      const employee = await this.hrService.createEmployee({
        ...this.employeeDraft,
        employee_code: this.employeeDraft.employee_code.trim(),
        full_name: this.employeeDraft.full_name.trim(),
        department: this.employeeDraft.department.trim(),
        role_title: this.employeeDraft.role_title.trim(),
        location: this.employeeDraft.location.trim(),
        manager_name: this.employeeDraft.manager_name.trim(),
      });
      this.resetEmployeeDraft();
      await this.loadWorkspace(this.tabName());
      this.notificationService.success(`${employee.full_name} added to HR.`, 2800);
    } catch (error) {
      this.notificationService.error(this.describeError(error, 'Failed to create employee.'), 4500);
    } finally {
      this.employeeSaving = false;
    }
  }

  async createLeaveRequest(): Promise<void> {
    if (!this.leaveDraft.employee_code.trim() || !this.leaveDraft.start_date.trim() || !this.leaveDraft.end_date.trim()) {
      this.notificationService.warning('Employee, start date, and end date are required.', 3200);
      return;
    }

    this.leaveSaving = true;
    try {
      const leaveRequest = await this.hrService.createLeaveRequest({
        ...this.leaveDraft,
        employee_code: this.leaveDraft.employee_code.trim(),
        reason: this.leaveDraft.reason.trim(),
      });
      this.resetLeaveDraft();
      await this.loadWorkspace(this.tabName());
      this.notificationService.success(`${leaveRequest.employee_name} leave request submitted.`, 3000);
    } catch (error) {
      this.notificationService.error(this.describeError(error, 'Failed to create leave request.'), 4500);
    } finally {
      this.leaveSaving = false;
    }
  }

  async processPayroll(): Promise<void> {
    if (!this.payrollDraft.period_label.trim() || !this.payrollDraft.payout_date.trim()) {
      this.notificationService.warning('Payroll period and payout date are required.', 3000);
      return;
    }

    this.payrollSaving = true;
    try {
      const payrollRun = await this.hrService.createPayrollRun({
        period_label: this.payrollDraft.period_label.trim(),
        payout_date: this.payrollDraft.payout_date.trim(),
        notes: this.payrollDraft.notes.trim(),
      });
      await this.loadWorkspace(this.tabName());
      this.notificationService.success(`Payroll ${payrollRun.period_label} processed.`, 3000);
    } catch (error) {
      this.notificationService.error(this.describeError(error, 'Failed to process payroll.'), 4500);
    } finally {
      this.payrollSaving = false;
    }
  }

  async updateLeaveStatus(request: HRLeaveRequestItem, status: HRLeaveRequestItem['status']): Promise<void> {
    if (request.status === status) {
      return;
    }

    this.updatingLeaveId = request.id;
    try {
      const updatedRequest = await this.hrService.updateLeaveRequestStatus(request.id, status, status === 'Approved' ? 'HR Desk' : undefined);
      await this.loadWorkspace(this.tabName());
      this.notificationService.success(`${updatedRequest.employee_name} marked ${updatedRequest.status}.`, 2600);
    } catch (error) {
      this.notificationService.error(this.describeError(error, 'Failed to update leave request.'), 4500);
    } finally {
      this.updatingLeaveId = null;
    }
  }

  async updateAttendanceStatus(record: HRAttendanceItem, status: HRAttendanceItem['status']): Promise<void> {
    if (record.status === status) {
      return;
    }

    this.updatingAttendanceId = record.id;
    try {
      const updatedRecord = await this.hrService.updateAttendanceStatus(record.id, status);
      await this.loadWorkspace(this.tabName());
      this.notificationService.success(`${updatedRecord.employee_name} marked ${updatedRecord.status}.`, 2600);
    } catch (error) {
      this.notificationService.error(this.describeError(error, 'Failed to update attendance.'), 4500);
    } finally {
      this.updatingAttendanceId = null;
    }
  }

  trackById(_index: number, item: { id: number }): number {
    return item.id;
  }

  private async loadWorkspace(tabName: string): Promise<void> {
    const version = ++this.loadVersion;
    // Keep previous content visible while the new workspace data is fetched.
    this.error = '';

    try {
      const [overview, employees, leaveRequests, payrollRuns, attendanceRecords] = await Promise.all([
        this.hrService.getOverview(),
        this.hrService.getEmployees(),
        this.hrService.getLeaveRequests(),
        this.hrService.getPayrollRuns(),
        this.hrService.getAttendance(),
      ]);

      if (version !== this.loadVersion) {
        return;
      }

      this.overview = overview;
      this.employees = employees;
      this.leaveRequests = leaveRequests;
      this.payrollRuns = payrollRuns;
      this.attendanceRecords = attendanceRecords;
      if (tabName === 'Employees' && this.departmentFilter !== 'All' && !this.departments.includes(this.departmentFilter)) {
        this.departmentFilter = 'All';
      }
    } catch (error) {
      if (version !== this.loadVersion) {
        return;
      }

      this.error = this.describeError(error, 'Failed to load HR workspace data.');
    } finally {
      if (version === this.loadVersion) {
        // keep loading false
      }
    }
  }

  private resetEmployeeDraft(): void {
    this.employeeDraft = {
      employee_code: '',
      full_name: '',
      department: '',
      role_title: '',
      location: '',
      employment_type: 'Full-time',
      status: 'Active',
      shift_label: 'Core',
      manager_name: '',
      salary: 0,
      leave_balance: 12,
    };
  }

  private resetLeaveDraft(): void {
    this.leaveDraft = {
      employee_code: '',
      leave_type: 'Annual',
      start_date: '2026-05-21',
      end_date: '2026-05-21',
      reason: '',
    };
  }

  private describeError(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return fallback;
  }
}
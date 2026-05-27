package main

import (
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type hrEmployeeResponse struct {
	ID             uint   `json:"id"`
	EmployeeCode   string `json:"employee_code"`
	FullName       string `json:"full_name"`
	Department     string `json:"department"`
	RoleTitle      string `json:"role_title"`
	Location       string `json:"location"`
	EmploymentType string `json:"employment_type"`
	Status         string `json:"status"`
	ShiftLabel     string `json:"shift_label"`
	ManagerName    string `json:"manager_name"`
	Salary         string `json:"salary"`
	LeaveBalance   string `json:"leave_balance"`
}

type hrPayrollRunResponse struct {
	ID          uint   `json:"id"`
	PeriodLabel string `json:"period_label"`
	PayoutDate  string `json:"payout_date"`
	Status      string `json:"status"`
	Headcount   string `json:"headcount"`
	TotalPayout string `json:"total_payout"`
	Notes       string `json:"notes"`
}

type hrAttendanceResponse struct {
	ID           uint   `json:"id"`
	EmployeeCode string `json:"employee_code"`
	EmployeeName string `json:"employee_name"`
	Department   string `json:"department"`
	DateLabel    string `json:"date_label"`
	ShiftLabel   string `json:"shift_label"`
	Status       string `json:"status"`
	CheckInTime  string `json:"check_in_time"`
	CheckOutTime string `json:"check_out_time"`
}

type hrOverviewDepartmentResponse struct {
	Department           string `json:"department"`
	Headcount            int    `json:"headcount"`
	PendingLeaveRequests int    `json:"pending_leave_requests"`
}

type hrOverviewStatusResponse struct {
	Label string `json:"label"`
	Count int    `json:"count"`
}

type hrOverviewResponse struct {
	ActiveHeadcount      int                            `json:"active_headcount"`
	Departments          int                            `json:"departments"`
	AttendanceAlerts     int                            `json:"attendance_alerts"`
	PendingLeaveRequests int                            `json:"pending_leave_requests"`
	LatestPayroll        string                         `json:"latest_payroll"`
	AverageLeaveBalance  string                         `json:"average_leave_balance"`
	DepartmentHeadcount  []hrOverviewDepartmentResponse `json:"department_headcount"`
	WorkforceStatus      []hrOverviewStatusResponse     `json:"workforce_status"`
}

type hrLeaveRequestResponse struct {
	ID           uint   `json:"id"`
	EmployeeCode string `json:"employee_code"`
	EmployeeName string `json:"employee_name"`
	Department   string `json:"department"`
	LeaveType    string `json:"leave_type"`
	StartDate    string `json:"start_date"`
	EndDate      string `json:"end_date"`
	TotalDays    int    `json:"total_days"`
	Status       string `json:"status"`
	ApproverName string `json:"approver_name"`
	Reason       string `json:"reason"`
}

type createHREmployeeRequest struct {
	EmployeeCode   string `json:"employee_code"`
	FullName       string `json:"full_name"`
	Department     string `json:"department"`
	RoleTitle      string `json:"role_title"`
	Location       string `json:"location"`
	EmploymentType string `json:"employment_type"`
	Status         string `json:"status"`
	ShiftLabel     string `json:"shift_label"`
	ManagerName    string `json:"manager_name"`
	Salary         int64  `json:"salary"`
	LeaveBalance   int    `json:"leave_balance"`
}

type createHRPayrollRunRequest struct {
	PeriodLabel string `json:"period_label"`
	PayoutDate  string `json:"payout_date"`
	Notes       string `json:"notes"`
}

type createHRLeaveRequestBody struct {
	EmployeeCode string `json:"employee_code"`
	LeaveType    string `json:"leave_type"`
	StartDate    string `json:"start_date"`
	EndDate      string `json:"end_date"`
	Reason       string `json:"reason"`
}

type updateHRAttendanceRequest struct {
	Status string `json:"status"`
}

type updateHRLeaveRequestStatusBody struct {
	Status       string `json:"status"`
	ApproverName string `json:"approver_name"`
}

func seedHRData() {
	employees := []HREmployee{
		{EmployeeCode: "HR-101", FullName: "Aisha Khan", Department: "People Operations", RoleTitle: "HR Business Partner", Location: "Bengaluru", EmploymentType: "Full-time", Status: "Active", ShiftLabel: "Core", ManagerName: "Nivedita Sen", SalaryCents: 1280000, LeaveBalance: 14},
		{EmployeeCode: "HR-114", FullName: "Rohan Iyer", Department: "Talent Acquisition", RoleTitle: "Recruiter", Location: "Mumbai", EmploymentType: "Full-time", Status: "Hiring sprint", ShiftLabel: "Core", ManagerName: "Aisha Khan", SalaryCents: 940000, LeaveBalance: 10},
		{EmployeeCode: "HR-123", FullName: "Neha Thomas", Department: "Learning & Development", RoleTitle: "L&D Specialist", Location: "Hyderabad", EmploymentType: "Full-time", Status: "Active", ShiftLabel: "Core", ManagerName: "Aisha Khan", SalaryCents: 880000, LeaveBalance: 18},
		{EmployeeCode: "HR-131", FullName: "Vikram Das", Department: "Workforce Analytics", RoleTitle: "People Analyst", Location: "Remote", EmploymentType: "Contract", Status: "Contract", ShiftLabel: "Flexible", ManagerName: "Nivedita Sen", SalaryCents: 760000, LeaveBalance: 6},
		{EmployeeCode: "HR-145", FullName: "Farah Ali", Department: "Payroll Ops", RoleTitle: "Payroll Specialist", Location: "Chennai", EmploymentType: "Full-time", Status: "Active", ShiftLabel: "Morning", ManagerName: "Nivedita Sen", SalaryCents: 990000, LeaveBalance: 12},
	}

	payrollRuns := []HRPayrollRun{
		{PeriodLabel: "May 2026", PayoutDate: "2026-05-30", Status: "Scheduled", Headcount: 42, TotalPayoutCents: 28400000, Notes: "Includes annual increment adjustments for engineering and sales."},
		{PeriodLabel: "April 2026", PayoutDate: "2026-04-30", Status: "Processed", Headcount: 41, TotalPayoutCents: 27150000, Notes: "Processed with one off-cycle correction for tax reimbursement."},
		{PeriodLabel: "March 2026", PayoutDate: "2026-03-29", Status: "Processed", Headcount: 40, TotalPayoutCents: 26380000, Notes: "No exceptions flagged during bank file validation."},
	}

	attendance := []HRAttendanceRecord{
		{EmployeeCode: "HR-101", EmployeeName: "Aisha Khan", Department: "People Operations", DateLabel: "Today", ShiftLabel: "Core", Status: "Present", CheckInTime: "09:02", CheckOutTime: "18:11"},
		{EmployeeCode: "HR-114", EmployeeName: "Rohan Iyer", Department: "Talent Acquisition", DateLabel: "Today", ShiftLabel: "Core", Status: "Remote", CheckInTime: "09:14", CheckOutTime: "18:04"},
		{EmployeeCode: "HR-123", EmployeeName: "Neha Thomas", Department: "Learning & Development", DateLabel: "Today", ShiftLabel: "Core", Status: "On leave", CheckInTime: "-", CheckOutTime: "-"},
		{EmployeeCode: "HR-131", EmployeeName: "Vikram Das", Department: "Workforce Analytics", DateLabel: "Today", ShiftLabel: "Flexible", Status: "Present", CheckInTime: "10:08", CheckOutTime: "19:02"},
		{EmployeeCode: "HR-145", EmployeeName: "Farah Ali", Department: "Payroll Ops", DateLabel: "Today", ShiftLabel: "Morning", Status: "Late", CheckInTime: "09:42", CheckOutTime: "18:33"},
	}

	leaveRequests := []HRLeaveRequest{
		{EmployeeCode: "HR-123", EmployeeName: "Neha Thomas", Department: "Learning & Development", LeaveType: "Annual", StartDate: "2026-05-17", EndDate: "2026-05-19", TotalDays: 3, Status: "Approved", ApproverName: "Aisha Khan", Reason: "Family travel already scheduled."},
		{EmployeeCode: "HR-114", EmployeeName: "Rohan Iyer", Department: "Talent Acquisition", LeaveType: "Sick", StartDate: "2026-05-22", EndDate: "2026-05-23", TotalDays: 2, Status: "Pending", ApproverName: "", Reason: "Recovery after a medical procedure."},
		{EmployeeCode: "HR-145", EmployeeName: "Farah Ali", Department: "Payroll Ops", LeaveType: "Personal", StartDate: "2026-05-28", EndDate: "2026-05-28", TotalDays: 1, Status: "Pending", ApproverName: "", Reason: "Family appointment during payroll close week."},
	}

	for _, employeeSeed := range employees {
		var employee HREmployee
		err := db.Where("employee_code = ?", employeeSeed.EmployeeCode).First(&employee).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			_ = db.Create(&employeeSeed).Error
		case err == nil:
			_ = db.Model(&employee).Updates(employeeSeed).Error
		}
	}

	for _, payrollSeed := range payrollRuns {
		var payrollRun HRPayrollRun
		err := db.Where("period_label = ?", payrollSeed.PeriodLabel).First(&payrollRun).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			_ = db.Create(&payrollSeed).Error
		case err == nil:
			_ = db.Model(&payrollRun).Updates(payrollSeed).Error
		}
	}

	for _, attendanceSeed := range attendance {
		var record HRAttendanceRecord
		err := db.Where("employee_code = ? AND date_label = ?", attendanceSeed.EmployeeCode, attendanceSeed.DateLabel).First(&record).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			_ = db.Create(&attendanceSeed).Error
		case err == nil:
			_ = db.Model(&record).Updates(attendanceSeed).Error
		}
	}

	for _, leaveSeed := range leaveRequests {
		var request HRLeaveRequest
		err := db.Where("employee_code = ? AND start_date = ? AND end_date = ?", leaveSeed.EmployeeCode, leaveSeed.StartDate, leaveSeed.EndDate).First(&request).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			_ = db.Create(&leaveSeed).Error
		case err == nil:
			_ = db.Model(&request).Updates(leaveSeed).Error
		}
	}
}

func getHROverview(c *gin.Context) {
	var employees []HREmployee
	if err := db.Order("department asc, full_name asc").Find(&employees).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load HR employees"})
		return
	}

	var attendance []HRAttendanceRecord
	if err := db.Find(&attendance).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load attendance records"})
		return
	}

	var leaveRequests []HRLeaveRequest
	if err := db.Find(&leaveRequests).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load leave requests"})
		return
	}

	latestPayroll := "No payroll scheduled"
	var payrollRun HRPayrollRun
	if err := db.Order("payout_date desc").First(&payrollRun).Error; err == nil {
		latestPayroll = fmt.Sprintf("%s • %s", payrollRun.PeriodLabel, payrollRun.Status)
	}

	activeHeadcount := 0
	totalLeaveBalance := 0
	departmentCounts := map[string]int{}
	statusCounts := map[string]int{}
	for _, employee := range employees {
		statusCounts[employee.Status]++
		if strings.EqualFold(employee.Status, "Offboarded") {
			continue
		}

		activeHeadcount++
		totalLeaveBalance += employee.LeaveBalance
		departmentCounts[employee.Department]++
	}

	attendanceAlerts := 0
	for _, record := range attendance {
		if record.Status == "Late" || record.Status == "On leave" {
			attendanceAlerts++
		}
	}

	pendingLeaveByDepartment := map[string]int{}
	pendingLeaveRequests := 0
	for _, request := range leaveRequests {
		if request.Status != "Pending" {
			continue
		}

		pendingLeaveRequests++
		pendingLeaveByDepartment[request.Department]++
	}

	departmentNames := make([]string, 0, len(departmentCounts))
	for department := range departmentCounts {
		departmentNames = append(departmentNames, department)
	}
	sort.Strings(departmentNames)

	departmentHeadcount := make([]hrOverviewDepartmentResponse, 0, len(departmentNames))
	for _, department := range departmentNames {
		departmentHeadcount = append(departmentHeadcount, hrOverviewDepartmentResponse{
			Department:           department,
			Headcount:            departmentCounts[department],
			PendingLeaveRequests: pendingLeaveByDepartment[department],
		})
	}

	statusLabels := make([]string, 0, len(statusCounts))
	for label := range statusCounts {
		statusLabels = append(statusLabels, label)
	}
	sort.Strings(statusLabels)

	workforceStatus := make([]hrOverviewStatusResponse, 0, len(statusLabels))
	for _, label := range statusLabels {
		workforceStatus = append(workforceStatus, hrOverviewStatusResponse{Label: label, Count: statusCounts[label]})
	}

	averageLeaveBalance := "0 days"
	if activeHeadcount > 0 {
		averageLeaveBalance = fmt.Sprintf("%.1f days", float64(totalLeaveBalance)/float64(activeHeadcount))
	}

	c.JSON(http.StatusOK, hrOverviewResponse{
		ActiveHeadcount:      activeHeadcount,
		Departments:          len(departmentCounts),
		AttendanceAlerts:     attendanceAlerts,
		PendingLeaveRequests: pendingLeaveRequests,
		LatestPayroll:        latestPayroll,
		AverageLeaveBalance:  averageLeaveBalance,
		DepartmentHeadcount:  departmentHeadcount,
		WorkforceStatus:      workforceStatus,
	})
}

func listHREmployees(c *gin.Context) {
	var employees []HREmployee
	if err := db.Order("department asc, full_name asc").Find(&employees).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load HR employees"})
		return
	}

	response := make([]hrEmployeeResponse, 0, len(employees))
	for _, employee := range employees {
		response = append(response, mapHREmployeeResponse(employee))
	}

	c.JSON(http.StatusOK, response)
}

func createHREmployee(c *gin.Context) {
	var req createHREmployeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	employee := HREmployee{
		EmployeeCode:   strings.ToUpper(strings.TrimSpace(req.EmployeeCode)),
		FullName:       strings.TrimSpace(req.FullName),
		Department:     strings.TrimSpace(req.Department),
		RoleTitle:      strings.TrimSpace(req.RoleTitle),
		Location:       strings.TrimSpace(req.Location),
		EmploymentType: strings.TrimSpace(req.EmploymentType),
		Status:         strings.TrimSpace(req.Status),
		ShiftLabel:     strings.TrimSpace(req.ShiftLabel),
		ManagerName:    strings.TrimSpace(req.ManagerName),
		SalaryCents:    req.Salary * 100,
		LeaveBalance:   req.LeaveBalance,
	}

	if employee.EmployeeCode == "" || employee.FullName == "" || employee.Department == "" || employee.RoleTitle == "" || req.Salary <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "employee code, name, department, role title, and salary are required"})
		return
	}
	if employee.EmploymentType == "" {
		employee.EmploymentType = "Full-time"
	}
	if employee.Status == "" {
		employee.Status = "Active"
	}
	if employee.ShiftLabel == "" {
		employee.ShiftLabel = "Core"
	}

	if err := db.Create(&employee).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "failed to create employee"})
		return
	}

	c.JSON(http.StatusCreated, mapHREmployeeResponse(employee))
}

func listHRPayrollRuns(c *gin.Context) {
	var payrollRuns []HRPayrollRun
	if err := db.Order("created_at desc").Find(&payrollRuns).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load payroll runs"})
		return
	}

	response := make([]hrPayrollRunResponse, 0, len(payrollRuns))
	for _, payrollRun := range payrollRuns {
		response = append(response, mapHRPayrollRunResponse(payrollRun))
	}

	c.JSON(http.StatusOK, response)
}

func createHRPayrollRun(c *gin.Context) {
	var req createHRPayrollRunRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	periodLabel := strings.TrimSpace(req.PeriodLabel)
	payoutDate := strings.TrimSpace(req.PayoutDate)
	if periodLabel == "" || payoutDate == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "period label and payout date are required"})
		return
	}

	var employees []HREmployee
	if err := db.Find(&employees).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load employees for payroll processing"})
		return
	}

	headcount := 0
	totalPayoutCents := int64(0)
	for _, employee := range employees {
		if strings.EqualFold(employee.Status, "Offboarded") {
			continue
		}
		headcount++
		totalPayoutCents += employee.SalaryCents
	}

	payrollRun := HRPayrollRun{
		PeriodLabel:      periodLabel,
		PayoutDate:       payoutDate,
		Status:           "Processed",
		Headcount:        headcount,
		TotalPayoutCents: totalPayoutCents,
		Notes:            strings.TrimSpace(req.Notes),
	}

	if err := db.Create(&payrollRun).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "failed to create payroll run"})
		return
	}

	c.JSON(http.StatusCreated, mapHRPayrollRunResponse(payrollRun))
}

func listHRLeaveRequests(c *gin.Context) {
	var requests []HRLeaveRequest
	if err := db.Order("start_date desc, created_at desc").Find(&requests).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load leave requests"})
		return
	}

	response := make([]hrLeaveRequestResponse, 0, len(requests))
	for _, request := range requests {
		response = append(response, mapHRLeaveRequestResponse(request))
	}

	c.JSON(http.StatusOK, response)
}

func createHRLeaveRequest(c *gin.Context) {
	var req createHRLeaveRequestBody
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	employeeCode := strings.ToUpper(strings.TrimSpace(req.EmployeeCode))
	leaveType := normalizeHRLeaveType(req.LeaveType)
	startDate := strings.TrimSpace(req.StartDate)
	endDate := strings.TrimSpace(req.EndDate)
	if employeeCode == "" || leaveType == "" || startDate == "" || endDate == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "employee code, leave type, start date, and end date are required"})
		return
	}

	totalDays, err := calculateHRLeaveDays(startDate, endDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var employee HREmployee
	if err := db.Where("employee_code = ?", employeeCode).First(&employee).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "employee not found"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load employee"})
		return
	}

	request := HRLeaveRequest{
		EmployeeCode: employee.EmployeeCode,
		EmployeeName: employee.FullName,
		Department:   employee.Department,
		LeaveType:    leaveType,
		StartDate:    startDate,
		EndDate:      endDate,
		TotalDays:    totalDays,
		Status:       "Pending",
		ApproverName: "",
		Reason:       strings.TrimSpace(req.Reason),
	}

	if err := db.Create(&request).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "failed to create leave request"})
		return
	}

	c.JSON(http.StatusCreated, mapHRLeaveRequestResponse(request))
}

func updateHRLeaveRequestStatus(c *gin.Context) {
	var req updateHRLeaveRequestStatusBody
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	status := normalizeHRLeaveStatus(req.Status)
	if status == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "valid leave status is required"})
		return
	}

	var request HRLeaveRequest
	if err := db.First(&request, c.Param("id")).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "leave request not found"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load leave request"})
		return
	}

	if request.Status == status {
		c.JSON(http.StatusOK, mapHRLeaveRequestResponse(request))
		return
	}

	approverName := strings.TrimSpace(req.ApproverName)
	if status == "Approved" && approverName == "" {
		approverName = "HR Desk"
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		var employee HREmployee
		if err := tx.Where("employee_code = ?", request.EmployeeCode).First(&employee).Error; err != nil {
			return err
		}

		if request.Status != "Approved" && status == "Approved" {
			if employee.LeaveBalance < request.TotalDays {
				return fmt.Errorf("employee does not have enough leave balance")
			}
			employee.LeaveBalance -= request.TotalDays
		}

		if request.Status == "Approved" && status != "Approved" {
			employee.LeaveBalance += request.TotalDays
		}

		if err := tx.Model(&employee).Update("leave_balance", employee.LeaveBalance).Error; err != nil {
			return err
		}

		request.Status = status
		request.ApproverName = approverName
		if status == "Pending" {
			request.ApproverName = ""
		}

		return tx.Model(&request).Updates(HRLeaveRequest{Status: request.Status, ApproverName: request.ApproverName}).Error
	})
	if err != nil {
		if strings.Contains(err.Error(), "enough leave balance") {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}

		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "employee not found"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update leave request"})
		return
	}

	c.JSON(http.StatusOK, mapHRLeaveRequestResponse(request))
}

func listHRAttendance(c *gin.Context) {
	var records []HRAttendanceRecord
	if err := db.Order("date_label asc, employee_name asc").Find(&records).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load attendance records"})
		return
	}

	response := make([]hrAttendanceResponse, 0, len(records))
	for _, record := range records {
		response = append(response, mapHRAttendanceResponse(record))
	}

	c.JSON(http.StatusOK, response)
}

func updateHRAttendance(c *gin.Context) {
	var req updateHRAttendanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	status := normalizeHRAttendanceStatus(req.Status)
	if status == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "valid attendance status is required"})
		return
	}

	var record HRAttendanceRecord
	if err := db.First(&record, c.Param("id")).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "attendance record not found"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load attendance record"})
		return
	}

	record.Status = status
	if status == "On leave" {
		record.CheckInTime = "-"
		record.CheckOutTime = "-"
	}
	if err := db.Model(&record).Updates(HRAttendanceRecord{Status: record.Status, CheckInTime: record.CheckInTime, CheckOutTime: record.CheckOutTime}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update attendance record"})
		return
	}

	c.JSON(http.StatusOK, mapHRAttendanceResponse(record))
}

func mapHREmployeeResponse(employee HREmployee) hrEmployeeResponse {
	return hrEmployeeResponse{
		ID:             employee.ID,
		EmployeeCode:   employee.EmployeeCode,
		FullName:       employee.FullName,
		Department:     employee.Department,
		RoleTitle:      employee.RoleTitle,
		Location:       employee.Location,
		EmploymentType: employee.EmploymentType,
		Status:         employee.Status,
		ShiftLabel:     employee.ShiftLabel,
		ManagerName:    employee.ManagerName,
		Salary:         formatCurrencyWhole(employee.SalaryCents),
		LeaveBalance:   fmt.Sprintf("%d days", employee.LeaveBalance),
	}
}

func mapHRPayrollRunResponse(payrollRun HRPayrollRun) hrPayrollRunResponse {
	return hrPayrollRunResponse{
		ID:          payrollRun.ID,
		PeriodLabel: payrollRun.PeriodLabel,
		PayoutDate:  payrollRun.PayoutDate,
		Status:      payrollRun.Status,
		Headcount:   formatCount(payrollRun.Headcount),
		TotalPayout: formatCurrencyWhole(payrollRun.TotalPayoutCents),
		Notes:       payrollRun.Notes,
	}
}

func mapHRAttendanceResponse(record HRAttendanceRecord) hrAttendanceResponse {
	return hrAttendanceResponse{
		ID:           record.ID,
		EmployeeCode: record.EmployeeCode,
		EmployeeName: record.EmployeeName,
		Department:   record.Department,
		DateLabel:    record.DateLabel,
		ShiftLabel:   record.ShiftLabel,
		Status:       record.Status,
		CheckInTime:  record.CheckInTime,
		CheckOutTime: record.CheckOutTime,
	}
}

func mapHRLeaveRequestResponse(request HRLeaveRequest) hrLeaveRequestResponse {
	return hrLeaveRequestResponse{
		ID:           request.ID,
		EmployeeCode: request.EmployeeCode,
		EmployeeName: request.EmployeeName,
		Department:   request.Department,
		LeaveType:    request.LeaveType,
		StartDate:    request.StartDate,
		EndDate:      request.EndDate,
		TotalDays:    request.TotalDays,
		Status:       request.Status,
		ApproverName: request.ApproverName,
		Reason:       request.Reason,
	}
}

func normalizeHRAttendanceStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "present":
		return "Present"
	case "remote":
		return "Remote"
	case "late":
		return "Late"
	case "on leave", "leave":
		return "On leave"
	default:
		return ""
	}
}

func normalizeHRLeaveStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "pending":
		return "Pending"
	case "approved", "approve":
		return "Approved"
	case "rejected", "reject":
		return "Rejected"
	case "cancelled", "canceled", "cancel":
		return "Cancelled"
	default:
		return ""
	}
}

func normalizeHRLeaveType(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "annual", "annual leave":
		return "Annual"
	case "sick", "sick leave":
		return "Sick"
	case "personal":
		return "Personal"
	case "comp off", "compensatory":
		return "Comp Off"
	case "unpaid":
		return "Unpaid"
	default:
		return ""
	}
}

func calculateHRLeaveDays(startDate string, endDate string) (int, error) {
	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return 0, fmt.Errorf("start date must use YYYY-MM-DD")
	}

	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return 0, fmt.Errorf("end date must use YYYY-MM-DD")
	}

	if end.Before(start) {
		return 0, fmt.Errorf("end date must be on or after start date")
	}

	return int(end.Sub(start).Hours()/24) + 1, nil
}

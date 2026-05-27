package main

import (
	"errors"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type financeOverviewResponse struct {
	Metrics []financeMetricResponse `json:"metrics"`
}

type financeReportsResponse struct {
	Receivables []financeReceivablesBucketResponse `json:"receivables"`
	Expenses    []financeDepartmentExpenseResponse `json:"expenses"`
	Highlights  []financeMetricResponse            `json:"highlights"`
}

type financeMetricResponse struct {
	Label string `json:"label"`
	Value string `json:"value"`
	Delta string `json:"delta"`
	Copy  string `json:"copy"`
}

type financeReceivablesBucketResponse struct {
	Label        string `json:"label"`
	InvoiceCount string `json:"invoice_count"`
	Amount       string `json:"amount"`
	Share        string `json:"share"`
}

type financeDepartmentExpenseResponse struct {
	Department string `json:"department"`
	ClaimCount string `json:"claim_count"`
	Amount     string `json:"amount"`
	StatusMix  string `json:"status_mix"`
}

type financeJournalEntryResponse struct {
	ID         uint   `json:"id"`
	EntryCode  string `json:"entry_code"`
	LedgerName string `json:"ledger_name"`
	Period     string `json:"period"`
	Reference  string `json:"reference"`
	PostedBy   string `json:"posted_by"`
	Status     string `json:"status"`
	Amount     string `json:"amount"`
	Summary    string `json:"summary"`
}

type financeInvoiceResponse struct {
	ID          uint   `json:"id"`
	InvoiceCode string `json:"invoice_code"`
	AccountName string `json:"account_name"`
	DueDate     string `json:"due_date"`
	Status      string `json:"status"`
	OwnerName   string `json:"owner_name"`
	AgingBucket string `json:"aging_bucket"`
	AmountDue   string `json:"amount_due"`
	Summary     string `json:"summary"`
}

type financeExpenseClaimResponse struct {
	ID            uint   `json:"id"`
	ClaimCode     string `json:"claim_code"`
	EmployeeName  string `json:"employee_name"`
	Department    string `json:"department"`
	Category      string `json:"category"`
	SubmittedDate string `json:"submitted_date"`
	Status        string `json:"status"`
	Amount        string `json:"amount"`
	Summary       string `json:"summary"`
}

type createFinanceJournalEntryRequest struct {
	EntryCode  string `json:"entry_code"`
	LedgerName string `json:"ledger_name"`
	Period     string `json:"period"`
	Reference  string `json:"reference"`
	PostedBy   string `json:"posted_by"`
	Status     string `json:"status"`
	Amount     int64  `json:"amount"`
	Summary    string `json:"summary"`
}

type createFinanceInvoiceRequest struct {
	InvoiceCode string `json:"invoice_code"`
	AccountName string `json:"account_name"`
	DueDate     string `json:"due_date"`
	Status      string `json:"status"`
	OwnerName   string `json:"owner_name"`
	AgingBucket string `json:"aging_bucket"`
	AmountDue   int64  `json:"amount_due"`
	Summary     string `json:"summary"`
}

type updateFinanceInvoiceStatusRequest struct {
	Status string `json:"status"`
}

type createFinanceExpenseClaimRequest struct {
	ClaimCode     string `json:"claim_code"`
	EmployeeName  string `json:"employee_name"`
	Department    string `json:"department"`
	Category      string `json:"category"`
	SubmittedDate string `json:"submitted_date"`
	Status        string `json:"status"`
	Amount        int64  `json:"amount"`
	Summary       string `json:"summary"`
}

type updateFinanceExpenseClaimStatusRequest struct {
	Status string `json:"status"`
}

func seedFinanceData() {
	journalEntries := []FinanceJournalEntry{
		{EntryCode: "JE-3101", LedgerName: "Revenue Recognition", PeriodLabel: "May 2026", Reference: "Retail settlement batch A", PostedBy: "Nina Varghese", Status: "Posted", AmountCents: 2640000, Summary: "Daily retail close posted for five stores."},
		{EntryCode: "JE-3104", LedgerName: "Accruals", PeriodLabel: "May 2026", Reference: "Freight reserve", PostedBy: "Rahul Sen", Status: "Review", AmountCents: 480000, Summary: "Month-end accrual for inbound freight and handling."},
		{EntryCode: "JE-3110", LedgerName: "Payroll Clearing", PeriodLabel: "May 2026", Reference: "Cycle 2 payroll", PostedBy: "Nina Varghese", Status: "Draft", AmountCents: 1820000, Summary: "Payroll clearing entry awaiting final approval."},
	}

	invoices := []FinanceInvoice{
		{InvoiceCode: "INV-9008", AccountName: "Northwind Retail", DueDate: "2026-05-26", Status: "Open", OwnerName: "Keshav Rao", AgingBucket: "Current", AmountDueCents: 2140000, Summary: "POS rollout billing for second-wave locations."},
		{InvoiceCode: "INV-9014", AccountName: "Lighthouse Grocers", DueDate: "2026-05-20", Status: "Overdue", OwnerName: "Keshav Rao", AgingBucket: "1-15 days", AmountDueCents: 960000, Summary: "Subscription and support renewal awaiting remittance."},
		{InvoiceCode: "INV-9021", AccountName: "Meridian Stores", DueDate: "2026-06-02", Status: "Disputed", OwnerName: "Sara Nair", AgingBucket: "Current", AmountDueCents: 1280000, Summary: "Invoice under review due to implementation milestone mismatch."},
	}

	expenseClaims := []FinanceExpenseClaim{
		{ClaimCode: "EXP-441", EmployeeName: "Vivek Joshi", Department: "Retail Ops", Category: "Travel", SubmittedDate: "2026-05-17", Status: "Submitted", AmountCents: 18400, Summary: "Store audit travel reimbursement for Pune route."},
		{ClaimCode: "EXP-446", EmployeeName: "Anita Paul", Department: "Sales", Category: "Meals", SubmittedDate: "2026-05-16", Status: "Approved", AmountCents: 9200, Summary: "Client workshop meal reimbursement."},
		{ClaimCode: "EXP-452", EmployeeName: "Rohan Malik", Department: "IT", Category: "Equipment", SubmittedDate: "2026-05-15", Status: "Review", AmountCents: 45600, Summary: "Peripheral accessories for onsite support kits."},
	}

	for _, entrySeed := range journalEntries {
		var entry FinanceJournalEntry
		err := db.Where("entry_code = ?", entrySeed.EntryCode).First(&entry).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			_ = db.Create(&entrySeed).Error
		case err == nil:
			_ = db.Model(&entry).Updates(entrySeed).Error
		}
	}

	for _, invoiceSeed := range invoices {
		var invoice FinanceInvoice
		err := db.Where("invoice_code = ?", invoiceSeed.InvoiceCode).First(&invoice).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			_ = db.Create(&invoiceSeed).Error
		case err == nil:
			_ = db.Model(&invoice).Updates(invoiceSeed).Error
		}
	}

	for _, claimSeed := range expenseClaims {
		var claim FinanceExpenseClaim
		err := db.Where("claim_code = ?", claimSeed.ClaimCode).First(&claim).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			_ = db.Create(&claimSeed).Error
		case err == nil:
			_ = db.Model(&claim).Updates(claimSeed).Error
		}
	}
}

func getFinanceOverview(c *gin.Context) {
	var journalEntries []FinanceJournalEntry
	var invoices []FinanceInvoice
	var expenseClaims []FinanceExpenseClaim

	if err := db.Find(&journalEntries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load finance overview"})
		return
	}
	if err := db.Find(&invoices).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load finance overview"})
		return
	}
	if err := db.Find(&expenseClaims).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load finance overview"})
		return
	}

	postedTotal := int64(0)
	for _, entry := range journalEntries {
		postedTotal += entry.AmountCents
	}
	overdueTotal := int64(0)
	for _, invoice := range invoices {
		if invoice.Status == "Overdue" {
			overdueTotal += invoice.AmountDueCents
		}
	}
	pendingExpenses := 0
	for _, claim := range expenseClaims {
		if claim.Status == "Submitted" || claim.Status == "Review" {
			pendingExpenses++
		}
	}

	openInvoices := 0
	for _, invoice := range invoices {
		if invoice.Status != "Paid" && invoice.Status != "Void" {
			openInvoices++
		}
	}

	response := financeOverviewResponse{Metrics: []financeMetricResponse{
		{Label: "Ledger activity", Value: formatCurrencyWhole(postedTotal), Delta: "+6%", Copy: "Journal activity reflects current close-cycle postings across operations and payroll."},
		{Label: "Overdue receivables", Value: formatCurrencyWhole(overdueTotal), Delta: "-2%", Copy: "Collections risk remains concentrated in one renewal account."},
		{Label: "Open invoices", Value: formatCount(openInvoices), Delta: "+1", Copy: "The invoice queue is stable with one active dispute in review."},
		{Label: "Pending expenses", Value: formatCount(pendingExpenses), Delta: "+2", Copy: "Expense claims awaiting approval are still within policy SLA."},
	}}

	c.JSON(http.StatusOK, response)
}

func getFinanceReports(c *gin.Context) {
	var invoices []FinanceInvoice
	var expenseClaims []FinanceExpenseClaim

	if err := db.Find(&invoices).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load finance reports"})
		return
	}
	if err := db.Find(&expenseClaims).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load finance reports"})
		return
	}

	type agingTotals struct {
		count  int
		amount int64
	}

	ageBuckets := []string{"Current", "1-15 days", "16-30 days", "31+ days"}
	ageMap := map[string]*agingTotals{}
	for _, bucket := range ageBuckets {
		ageMap[bucket] = &agingTotals{}
	}

	openReceivables := int64(0)
	for _, invoice := range invoices {
		if invoice.Status == "Paid" || invoice.Status == "Void" {
			continue
		}

		bucket := normalizeFinanceAgingBucket(invoice.AgingBucket, invoice.Status)
		ageMap[bucket].count++
		ageMap[bucket].amount += invoice.AmountDueCents
		openReceivables += invoice.AmountDueCents
	}

	receivables := make([]financeReceivablesBucketResponse, 0, len(ageBuckets))
	for _, bucket := range ageBuckets {
		totals := ageMap[bucket]
		share := "0%"
		if openReceivables > 0 {
			share = formatPercent(float64(totals.amount) / float64(openReceivables) * 100)
		}
		receivables = append(receivables, financeReceivablesBucketResponse{
			Label:        bucket,
			InvoiceCount: formatCount(totals.count),
			Amount:       formatCurrencyWhole(totals.amount),
			Share:        share,
		})
	}

	type expenseTotals struct {
		count     int
		amount    int64
		statusMix map[string]int
	}

	departmentMap := map[string]*expenseTotals{}
	pendingClaims := 0
	approvedClaims := 0
	for _, claim := range expenseClaims {
		department := strings.TrimSpace(claim.Department)
		if department == "" {
			department = "Unassigned"
		}
		if _, ok := departmentMap[department]; !ok {
			departmentMap[department] = &expenseTotals{statusMix: map[string]int{}}
		}
		departmentMap[department].count++
		departmentMap[department].amount += claim.AmountCents
		departmentMap[department].statusMix[claim.Status]++
		if claim.Status == "Submitted" || claim.Status == "Review" {
			pendingClaims++
		}
		if claim.Status == "Approved" || claim.Status == "Paid" {
			approvedClaims++
		}
	}

	departmentOrder := make([]string, 0, len(departmentMap))
	for department := range departmentMap {
		departmentOrder = append(departmentOrder, department)
	}
	sort.Strings(departmentOrder)

	expenses := make([]financeDepartmentExpenseResponse, 0, len(departmentOrder))
	for _, department := range departmentOrder {
		totals := departmentMap[department]
		expenses = append(expenses, financeDepartmentExpenseResponse{
			Department: department,
			ClaimCount: formatCount(totals.count),
			Amount:     formatCurrencyWhole(totals.amount),
			StatusMix:  summarizeFinanceStatusMix(totals.statusMix),
		})
	}

	highlights := []financeMetricResponse{
		{Label: "Open receivables", Value: formatCurrencyWhole(openReceivables), Delta: formatCount(len(invoices)), Copy: "Tracks all invoices not yet closed or voided across aging buckets."},
		{Label: "Pending approvals", Value: formatCount(pendingClaims), Delta: "+1", Copy: "Expense claims still waiting on reviewer action or policy approval."},
		{Label: "Approved spend", Value: formatCount(approvedClaims), Delta: "+2", Copy: "Approved and paid employee claims contributing to departmental spend."},
	}

	c.JSON(http.StatusOK, financeReportsResponse{
		Receivables: receivables,
		Expenses:    expenses,
		Highlights:  highlights,
	})
}

func listFinanceJournalEntries(c *gin.Context) {
	var entries []FinanceJournalEntry
	if err := db.Order("updated_at desc, period_label asc").Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load journal entries"})
		return
	}

	response := make([]financeJournalEntryResponse, 0, len(entries))
	for _, entry := range entries {
		response = append(response, mapFinanceJournalEntryResponse(entry))
	}

	c.JSON(http.StatusOK, response)
}

func createFinanceJournalEntry(c *gin.Context) {
	var req createFinanceJournalEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	entry := FinanceJournalEntry{
		EntryCode:   strings.ToUpper(strings.TrimSpace(req.EntryCode)),
		LedgerName:  strings.TrimSpace(req.LedgerName),
		PeriodLabel: strings.TrimSpace(req.Period),
		Reference:   strings.TrimSpace(req.Reference),
		PostedBy:    strings.TrimSpace(req.PostedBy),
		Status:      strings.TrimSpace(req.Status),
		AmountCents: req.Amount * 100,
		Summary:     strings.TrimSpace(req.Summary),
	}

	if entry.EntryCode == "" || entry.LedgerName == "" || entry.PostedBy == "" || req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "entry code, ledger, posted by, and amount are required"})
		return
	}
	if entry.Status == "" {
		entry.Status = "Draft"
	}
	if entry.PeriodLabel == "" {
		entry.PeriodLabel = "Current"
	}

	if err := db.Create(&entry).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "failed to create journal entry"})
		return
	}

	c.JSON(http.StatusCreated, mapFinanceJournalEntryResponse(entry))
}

func listFinanceInvoices(c *gin.Context) {
	var invoices []FinanceInvoice
	if err := db.Order("updated_at desc, due_date asc").Find(&invoices).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load invoices"})
		return
	}

	response := make([]financeInvoiceResponse, 0, len(invoices))
	for _, invoice := range invoices {
		response = append(response, mapFinanceInvoiceResponse(invoice))
	}

	c.JSON(http.StatusOK, response)
}

func createFinanceInvoice(c *gin.Context) {
	var req createFinanceInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	status := normalizeFinanceInvoiceStatus(req.Status)
	if status == "" {
		status = "Open"
	}

	invoice := FinanceInvoice{
		InvoiceCode:    strings.ToUpper(strings.TrimSpace(req.InvoiceCode)),
		AccountName:    strings.TrimSpace(req.AccountName),
		DueDate:        strings.TrimSpace(req.DueDate),
		Status:         status,
		OwnerName:      strings.TrimSpace(req.OwnerName),
		AgingBucket:    strings.TrimSpace(req.AgingBucket),
		AmountDueCents: req.AmountDue * 100,
		Summary:        strings.TrimSpace(req.Summary),
	}

	if invoice.InvoiceCode == "" || invoice.AccountName == "" || invoice.OwnerName == "" || req.AmountDue <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invoice code, account, owner, and amount are required"})
		return
	}
	if invoice.AgingBucket == "" {
		invoice.AgingBucket = "Current"
	}

	if err := db.Create(&invoice).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "failed to create invoice"})
		return
	}

	c.JSON(http.StatusCreated, mapFinanceInvoiceResponse(invoice))
}

func updateFinanceInvoiceStatus(c *gin.Context) {
	invoiceID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid invoice id"})
		return
	}

	var req updateFinanceInvoiceStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	status := normalizeFinanceInvoiceStatus(req.Status)
	if status == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "valid invoice status is required"})
		return
	}

	var invoice FinanceInvoice
	if err := db.First(&invoice, uint(invoiceID)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "invoice not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load invoice"})
		return
	}

	invoice.Status = status
	if err := db.Save(&invoice).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "failed to update invoice"})
		return
	}

	c.JSON(http.StatusOK, mapFinanceInvoiceResponse(invoice))
}

func listFinanceExpenseClaims(c *gin.Context) {
	var claims []FinanceExpenseClaim
	if err := db.Order("updated_at desc, submitted_date desc").Find(&claims).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load expense claims"})
		return
	}

	response := make([]financeExpenseClaimResponse, 0, len(claims))
	for _, claim := range claims {
		response = append(response, mapFinanceExpenseClaimResponse(claim))
	}

	c.JSON(http.StatusOK, response)
}

func createFinanceExpenseClaim(c *gin.Context) {
	var req createFinanceExpenseClaimRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	claim := FinanceExpenseClaim{
		ClaimCode:     strings.ToUpper(strings.TrimSpace(req.ClaimCode)),
		EmployeeName:  strings.TrimSpace(req.EmployeeName),
		Department:    strings.TrimSpace(req.Department),
		Category:      strings.TrimSpace(req.Category),
		SubmittedDate: strings.TrimSpace(req.SubmittedDate),
		Status:        strings.TrimSpace(req.Status),
		AmountCents:   req.Amount * 100,
		Summary:       strings.TrimSpace(req.Summary),
	}

	if claim.ClaimCode == "" || claim.EmployeeName == "" || claim.Department == "" || req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "claim code, employee, department, and amount are required"})
		return
	}
	if claim.Status == "" {
		claim.Status = "Submitted"
	}

	if err := db.Create(&claim).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "failed to create expense claim"})
		return
	}

	c.JSON(http.StatusCreated, mapFinanceExpenseClaimResponse(claim))
}

func updateFinanceExpenseClaimStatus(c *gin.Context) {
	claimID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid expense claim id"})
		return
	}

	var req updateFinanceExpenseClaimStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	status := normalizeFinanceExpenseClaimStatus(req.Status)
	if status == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "valid expense status is required"})
		return
	}

	var claim FinanceExpenseClaim
	if err := db.First(&claim, uint(claimID)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "expense claim not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load expense claim"})
		return
	}

	claim.Status = status
	if err := db.Save(&claim).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "failed to update expense claim"})
		return
	}

	c.JSON(http.StatusOK, mapFinanceExpenseClaimResponse(claim))
}

func mapFinanceJournalEntryResponse(entry FinanceJournalEntry) financeJournalEntryResponse {
	return financeJournalEntryResponse{
		ID:         entry.ID,
		EntryCode:  entry.EntryCode,
		LedgerName: entry.LedgerName,
		Period:     entry.PeriodLabel,
		Reference:  entry.Reference,
		PostedBy:   entry.PostedBy,
		Status:     entry.Status,
		Amount:     formatCurrencyWhole(entry.AmountCents),
		Summary:    entry.Summary,
	}
}

func mapFinanceInvoiceResponse(invoice FinanceInvoice) financeInvoiceResponse {
	return financeInvoiceResponse{
		ID:          invoice.ID,
		InvoiceCode: invoice.InvoiceCode,
		AccountName: invoice.AccountName,
		DueDate:     invoice.DueDate,
		Status:      invoice.Status,
		OwnerName:   invoice.OwnerName,
		AgingBucket: invoice.AgingBucket,
		AmountDue:   formatCurrencyWhole(invoice.AmountDueCents),
		Summary:     invoice.Summary,
	}
}

func mapFinanceExpenseClaimResponse(claim FinanceExpenseClaim) financeExpenseClaimResponse {
	return financeExpenseClaimResponse{
		ID:            claim.ID,
		ClaimCode:     claim.ClaimCode,
		EmployeeName:  claim.EmployeeName,
		Department:    claim.Department,
		Category:      claim.Category,
		SubmittedDate: claim.SubmittedDate,
		Status:        claim.Status,
		Amount:        formatCurrencyWhole(claim.AmountCents),
		Summary:       claim.Summary,
	}
}

func normalizeFinanceInvoiceStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "open":
		return "Open"
	case "paid":
		return "Paid"
	case "overdue":
		return "Overdue"
	case "disputed":
		return "Disputed"
	case "void":
		return "Void"
	default:
		return ""
	}
}

func normalizeFinanceExpenseClaimStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "submitted":
		return "Submitted"
	case "review", "in review":
		return "Review"
	case "approved":
		return "Approved"
	case "paid":
		return "Paid"
	case "rejected":
		return "Rejected"
	default:
		return ""
	}
}

func normalizeFinanceAgingBucket(bucket string, status string) string {
	normalizedBucket := strings.TrimSpace(bucket)
	if normalizedBucket != "" {
		switch normalizedBucket {
		case "Current", "1-15 days", "16-30 days", "31+ days":
			return normalizedBucket
		}
	}

	if status == "Overdue" {
		return "1-15 days"
	}

	return "Current"
}

func summarizeFinanceStatusMix(statusMix map[string]int) string {
	statusOrder := []string{"Submitted", "Review", "Approved", "Paid", "Rejected"}
	parts := make([]string, 0, len(statusMix))
	for _, status := range statusOrder {
		count, ok := statusMix[status]
		if !ok || count == 0 {
			continue
		}
		parts = append(parts, status+" "+formatCount(count))
	}

	if len(parts) == 0 {
		return "No active claims"
	}

	return strings.Join(parts, " • ")
}

func formatPercent(value float64) string {
	return strconv.FormatFloat(value, 'f', 0, 64) + "%"
}

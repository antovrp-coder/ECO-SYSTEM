package main

import (
	"encoding/base64"
	"strconv"
	"time"

	webauthnlib "github.com/go-webauthn/webauthn/webauthn"
)

// Module represents an ERP module (Sales, Inventory, HR, etc.)
type Module struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time  `json:"created_at,omitempty"`
	UpdatedAt time.Time  `json:"updated_at,omitempty"`
	Name      string     `json:"name"`
	Icon      string     `json:"icon"`
	Order     int        `json:"order"`
	Menus     []MenuItem `json:"menus,omitempty"`
}

// MenuItem represents a submenu item for a module
type MenuItem struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at,omitempty"`
	UpdatedAt time.Time `json:"updated_at,omitempty"`
	ModuleID  uint      `json:"module_id"`
	Name      string    `json:"name"`
	Route     string    `json:"route"`
	Order     int       `json:"order"`
}

// User stores registered ERP users.
type User struct {
	ID                    uint                     `gorm:"primaryKey" json:"id"`
	CreatedAt             time.Time                `json:"created_at,omitempty"`
	UpdatedAt             time.Time                `json:"updated_at,omitempty"`
	Username              string                   `gorm:"uniqueIndex;not null" json:"username"`
	Email                 string                   `gorm:"uniqueIndex;not null" json:"email"`
	FullName              string                   `json:"full_name"`
	LocalizedDisplayNames string                   `gorm:"type:text" json:"-"`
	VoiceCommands         string                   `gorm:"type:text" json:"-"`
	FaceDescriptor        string                   `gorm:"type:text" json:"-"`
	FaceImage             string                   `gorm:"type:text" json:"-"`
	PasswordHash          string                   `gorm:"not null" json:"-"`
	PasskeyHandle         string                   `gorm:"-" json:"-"`
	PasskeyCredentials    []webauthnlib.Credential `gorm:"-" json:"-"`
}

// UserPasskey stores the stable WebAuthn user handle for a user.
type UserPasskey struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	CreatedAt  time.Time `json:"created_at,omitempty"`
	UpdatedAt  time.Time `json:"updated_at,omitempty"`
	UserID     uint      `gorm:"uniqueIndex;not null" json:"user_id"`
	UserHandle string    `gorm:"uniqueIndex;not null" json:"user_handle"`
}

// PasskeyCredential stores the serialized WebAuthn credential for a user.
type PasskeyCredential struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	CreatedAt      time.Time `json:"created_at,omitempty"`
	UpdatedAt      time.Time `json:"updated_at,omitempty"`
	UserID         uint      `gorm:"index;not null" json:"user_id"`
	CredentialID   string    `gorm:"uniqueIndex;not null" json:"credential_id"`
	CredentialJSON string    `gorm:"type:text;not null" json:"-"`
}

// EcommerceProduct stores catalog items shown in the e-commerce module.
type EcommerceProduct struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	CreatedAt      time.Time `json:"created_at,omitempty"`
	UpdatedAt      time.Time `json:"updated_at,omitempty"`
	SKU            string    `gorm:"uniqueIndex;not null" json:"sku"`
	Name           string    `json:"name"`
	Category       string    `json:"category"`
	PriceCents     int64     `json:"price_cents"`
	Stock          int       `json:"stock"`
	Status         string    `json:"status"`
	ConversionRate float64   `json:"conversion_rate"`
	Tags           string    `gorm:"type:text" json:"-"`
	ImageURLs      string    `gorm:"type:text" json:"-"`
}

// EcommerceCustomer stores customer profiles for the e-commerce module.
type EcommerceCustomer struct {
	ID                 uint      `gorm:"primaryKey" json:"id"`
	CreatedAt          time.Time `json:"created_at,omitempty"`
	UpdatedAt          time.Time `json:"updated_at,omitempty"`
	Name               string    `json:"name"`
	Email              string    `gorm:"uniqueIndex;not null" json:"email"`
	Segment            string    `json:"segment"`
	Tier               string    `json:"tier"`
	Region             string    `json:"region"`
	LifetimeValueCents int64     `json:"lifetime_value_cents"`
	NextAction         string    `json:"next_action"`
}

// EcommerceOrder stores e-commerce fulfillment records.
type EcommerceOrder struct {
	ID              uint                 `gorm:"primaryKey" json:"id"`
	CreatedAt       time.Time            `json:"created_at,omitempty"`
	UpdatedAt       time.Time            `json:"updated_at,omitempty"`
	OrderNumber     string               `gorm:"uniqueIndex;not null" json:"order_number"`
	CustomerID      uint                 `gorm:"index;not null" json:"customer_id"`
	Customer        EcommerceCustomer    `gorm:"foreignKey:CustomerID" json:"-"`
	Channel         string               `json:"channel"`
	ValueCents      int64                `json:"value_cents"`
	Status          string               `json:"status"`
	FulfillmentEta  string               `json:"fulfillment_eta"`
	PaymentProvider string               `json:"payment_provider"`
	PaymentMethod   string               `json:"payment_method"`
	ContactPhone    string               `json:"contact_phone"`
	ShippingAddress string               `json:"shipping_address"`
	ShippingCity    string               `json:"shipping_city"`
	Items           []EcommerceOrderItem `gorm:"foreignKey:OrderID" json:"-"`
}

// EcommerceOrderItem stores line items for placed e-commerce orders.
type EcommerceOrderItem struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	CreatedAt      time.Time `json:"created_at,omitempty"`
	UpdatedAt      time.Time `json:"updated_at,omitempty"`
	OrderID        uint      `gorm:"index;not null" json:"order_id"`
	ProductID      uint      `gorm:"index;not null" json:"product_id"`
	ProductSKU     string    `json:"product_sku"`
	ProductName    string    `json:"product_name"`
	Quantity       int       `json:"quantity"`
	UnitPriceCents int64     `json:"unit_price_cents"`
	LineTotalCents int64     `json:"line_total_cents"`
}

// EcommercePromotion stores promotion and campaign drafts.
type EcommercePromotion struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	CreatedAt       time.Time `json:"created_at,omitempty"`
	UpdatedAt       time.Time `json:"updated_at,omitempty"`
	Name            string    `gorm:"uniqueIndex;not null" json:"name"`
	Status          string    `json:"status"`
	Channel         string    `json:"channel"`
	UpliftPercent   float64   `json:"uplift_percent"`
	WindowLabel     string    `json:"window_label"`
	DiscountPercent int       `json:"discount_percent"`
	Audience        string    `json:"audience"`
}

type HREmployee struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	CreatedAt      time.Time `json:"created_at,omitempty"`
	UpdatedAt      time.Time `json:"updated_at,omitempty"`
	EmployeeCode   string    `gorm:"uniqueIndex;not null" json:"employee_code"`
	FullName       string    `json:"full_name"`
	Department     string    `json:"department"`
	RoleTitle      string    `json:"role_title"`
	Location       string    `json:"location"`
	EmploymentType string    `json:"employment_type"`
	Status         string    `json:"status"`
	ShiftLabel     string    `json:"shift_label"`
	ManagerName    string    `json:"manager_name"`
	SalaryCents    int64     `json:"salary_cents"`
	LeaveBalance   int       `json:"leave_balance"`
}

type HRPayrollRun struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	CreatedAt        time.Time `json:"created_at,omitempty"`
	UpdatedAt        time.Time `json:"updated_at,omitempty"`
	PeriodLabel      string    `gorm:"uniqueIndex;not null" json:"period_label"`
	PayoutDate       string    `json:"payout_date"`
	Status           string    `json:"status"`
	Headcount        int       `json:"headcount"`
	TotalPayoutCents int64     `json:"total_payout_cents"`
	Notes            string    `json:"notes"`
}

type HRAttendanceRecord struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	CreatedAt    time.Time `json:"created_at,omitempty"`
	UpdatedAt    time.Time `json:"updated_at,omitempty"`
	EmployeeCode string    `gorm:"index;not null" json:"employee_code"`
	EmployeeName string    `json:"employee_name"`
	Department   string    `json:"department"`
	DateLabel    string    `json:"date_label"`
	ShiftLabel   string    `json:"shift_label"`
	Status       string    `json:"status"`
	CheckInTime  string    `json:"check_in_time"`
	CheckOutTime string    `json:"check_out_time"`
}

type HRLeaveRequest struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	CreatedAt    time.Time `json:"created_at,omitempty"`
	UpdatedAt    time.Time `json:"updated_at,omitempty"`
	EmployeeCode string    `gorm:"index;not null" json:"employee_code"`
	EmployeeName string    `json:"employee_name"`
	Department   string    `json:"department"`
	LeaveType    string    `json:"leave_type"`
	StartDate    string    `json:"start_date"`
	EndDate      string    `json:"end_date"`
	TotalDays    int       `json:"total_days"`
	Status       string    `json:"status"`
	ApproverName string    `json:"approver_name"`
	Reason       string    `json:"reason"`
}

type InventoryItem struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	CreatedAt     time.Time `json:"created_at,omitempty"`
	UpdatedAt     time.Time `json:"updated_at,omitempty"`
	SKU           string    `gorm:"uniqueIndex;not null" json:"sku"`
	Name          string    `json:"name"`
	Category      string    `json:"category"`
	Warehouse     string    `json:"warehouse"`
	SupplierName  string    `json:"supplier_name"`
	Status        string    `json:"status"`
	ReorderPoint  int       `json:"reorder_point"`
	OnHand        int       `json:"on_hand"`
	Reserved      int       `json:"reserved"`
	Incoming      int       `json:"incoming"`
	UnitCostCents int64     `json:"unit_cost_cents"`
}

type InventorySupplier struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	CreatedAt        time.Time `json:"created_at,omitempty"`
	UpdatedAt        time.Time `json:"updated_at,omitempty"`
	Name             string    `gorm:"uniqueIndex;not null" json:"name"`
	ContactName      string    `json:"contact_name"`
	Email            string    `json:"email"`
	Region           string    `json:"region"`
	LeadTimeDays     int       `json:"lead_time_days"`
	Status           string    `json:"status"`
	PaymentTerms     string    `json:"payment_terms"`
	ReliabilityScore int       `json:"reliability_score"`
	Notes            string    `json:"notes"`
}

type InventoryReportSnapshot struct {
	ID                  uint      `gorm:"primaryKey" json:"id"`
	CreatedAt           time.Time `json:"created_at,omitempty"`
	UpdatedAt           time.Time `json:"updated_at,omitempty"`
	Name                string    `gorm:"uniqueIndex;not null" json:"name"`
	WindowLabel         string    `json:"window_label"`
	FillRatePercent     float64   `json:"fill_rate_percent"`
	InventoryValueCents int64     `json:"inventory_value_cents"`
	StockCoverDays      int       `json:"stock_cover_days"`
	RiskSKUs            int       `json:"risk_skus"`
	Summary             string    `json:"summary"`
}

type CRMLead struct {
	ID                  uint      `gorm:"primaryKey" json:"id"`
	CreatedAt           time.Time `json:"created_at,omitempty"`
	UpdatedAt           time.Time `json:"updated_at,omitempty"`
	LeadCode            string    `gorm:"uniqueIndex;not null" json:"lead_code"`
	CompanyName         string    `json:"company_name"`
	ContactName         string    `json:"contact_name"`
	Email               string    `json:"email"`
	Segment             string    `json:"segment"`
	Stage               string    `json:"stage"`
	OwnerName           string    `json:"owner_name"`
	EstimatedValueCents int64     `json:"estimated_value_cents"`
	LastTouchLabel      string    `json:"last_touch_label"`
	NextStep            string    `json:"next_step"`
}

type CRMAccount struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	CreatedAt        time.Time `json:"created_at,omitempty"`
	UpdatedAt        time.Time `json:"updated_at,omitempty"`
	AccountCode      string    `gorm:"uniqueIndex;not null" json:"account_code"`
	Name             string    `json:"name"`
	Tier             string    `json:"tier"`
	Industry         string    `json:"industry"`
	Region           string    `json:"region"`
	OwnerName        string    `json:"owner_name"`
	RenewalWindow    string    `json:"renewal_window"`
	HealthStatus     string    `json:"health_status"`
	AnnualValueCents int64     `json:"annual_value_cents"`
}

type CRMDeal struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	CreatedAt        time.Time `json:"created_at,omitempty"`
	UpdatedAt        time.Time `json:"updated_at,omitempty"`
	DealCode         string    `gorm:"uniqueIndex;not null" json:"deal_code"`
	AccountName      string    `json:"account_name"`
	Stage            string    `json:"stage"`
	OwnerName        string    `json:"owner_name"`
	ForecastCategory string    `json:"forecast_category"`
	CloseDate        string    `json:"close_date"`
	ValueCents       int64     `json:"value_cents"`
	Probability      int       `json:"probability"`
	Summary          string    `json:"summary"`
}

type PurchaseRequisition struct {
	ID                  uint      `gorm:"primaryKey" json:"id"`
	CreatedAt           time.Time `json:"created_at,omitempty"`
	UpdatedAt           time.Time `json:"updated_at,omitempty"`
	RequestCode         string    `gorm:"uniqueIndex;not null" json:"request_code"`
	Title               string    `json:"title"`
	Department          string    `json:"department"`
	RequestedBy         string    `json:"requested_by"`
	Priority            string    `json:"priority"`
	Status              string    `json:"status"`
	TargetDate          string    `json:"target_date"`
	EstimatedValueCents int64     `json:"estimated_value_cents"`
	Summary             string    `json:"summary"`
}

type PurchaseOrder struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	CreatedAt       time.Time `json:"created_at,omitempty"`
	UpdatedAt       time.Time `json:"updated_at,omitempty"`
	OrderCode       string    `gorm:"uniqueIndex;not null" json:"order_code"`
	VendorName      string    `json:"vendor_name"`
	Category        string    `json:"category"`
	Status          string    `json:"status"`
	BuyerName       string    `json:"buyer_name"`
	ExpectedReceipt string    `json:"expected_receipt"`
	ValueCents      int64     `json:"value_cents"`
	LineItems       int       `json:"line_items"`
	Summary         string    `json:"summary"`
}

type PurchaseVendor struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	CreatedAt        time.Time `json:"created_at,omitempty"`
	UpdatedAt        time.Time `json:"updated_at,omitempty"`
	VendorCode       string    `gorm:"uniqueIndex;not null" json:"vendor_code"`
	Name             string    `json:"name"`
	Category         string    `json:"category"`
	Region           string    `json:"region"`
	ContactName      string    `json:"contact_name"`
	Email            string    `json:"email"`
	LeadTimeDays     int       `json:"lead_time_days"`
	Status           string    `json:"status"`
	AnnualSpendCents int64     `json:"annual_spend_cents"`
}

type FinanceJournalEntry struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	CreatedAt      time.Time `json:"created_at,omitempty"`
	UpdatedAt      time.Time `json:"updated_at,omitempty"`
	EntryCode      string    `gorm:"uniqueIndex;not null" json:"entry_code"`
	LedgerName     string    `json:"ledger_name"`
	PeriodLabel    string    `json:"period_label"`
	Reference      string    `json:"reference"`
	PostedBy       string    `json:"posted_by"`
	Status         string    `json:"status"`
	AmountCents    int64     `json:"amount_cents"`
	Summary        string    `json:"summary"`
}

type FinanceInvoice struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	CreatedAt       time.Time `json:"created_at,omitempty"`
	UpdatedAt       time.Time `json:"updated_at,omitempty"`
	InvoiceCode     string    `gorm:"uniqueIndex;not null" json:"invoice_code"`
	AccountName     string    `json:"account_name"`
	DueDate         string    `json:"due_date"`
	Status          string    `json:"status"`
	OwnerName       string    `json:"owner_name"`
	AgingBucket     string    `json:"aging_bucket"`
	AmountDueCents  int64     `json:"amount_due_cents"`
	Summary         string    `json:"summary"`
}

type FinanceExpenseClaim struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	CreatedAt      time.Time `json:"created_at,omitempty"`
	UpdatedAt      time.Time `json:"updated_at,omitempty"`
	ClaimCode      string    `gorm:"uniqueIndex;not null" json:"claim_code"`
	EmployeeName   string    `json:"employee_name"`
	Department     string    `json:"department"`
	Category       string    `json:"category"`
	SubmittedDate  string    `json:"submitted_date"`
	Status         string    `json:"status"`
	AmountCents    int64     `json:"amount_cents"`
	Summary        string    `json:"summary"`
}

func (u User) WebAuthnID() []byte {
	if u.PasskeyHandle == "" {
		return []byte(strconv.FormatUint(uint64(u.ID), 10))
	}

	decoded, err := base64.RawURLEncoding.DecodeString(u.PasskeyHandle)
	if err != nil {
		return []byte(u.PasskeyHandle)
	}

	return decoded
}

func (u User) WebAuthnName() string {
	return u.Username
}

func (u User) WebAuthnDisplayName() string {
	if u.FullName != "" {
		return u.FullName
	}

	return u.Username
}

func (u User) WebAuthnCredentials() []webauthnlib.Credential {
	return u.PasskeyCredentials
}

// TableName specifies the table name for Module
func (Module) TableName() string {
	return "modules"
}

// TableName specifies the table name for MenuItem
func (MenuItem) TableName() string {
	return "menu_items"
}

// TableName specifies the table name for User
func (User) TableName() string {
	return "users"
}

// TableName specifies the table name for UserPasskey.
func (UserPasskey) TableName() string {
	return "user_passkeys"
}

// TableName specifies the table name for PasskeyCredential.
func (PasskeyCredential) TableName() string {
	return "passkey_credentials"
}

func (EcommerceProduct) TableName() string {
	return "ecommerce_products"
}

func (EcommerceCustomer) TableName() string {
	return "ecommerce_customers"
}

func (EcommerceOrder) TableName() string {
	return "ecommerce_orders"
}

func (EcommerceOrderItem) TableName() string {
	return "ecommerce_order_items"
}

func (EcommercePromotion) TableName() string {
	return "ecommerce_promotions"
}

func (HREmployee) TableName() string {
	return "hr_employees"
}

func (HRPayrollRun) TableName() string {
	return "hr_payroll_runs"
}

func (HRAttendanceRecord) TableName() string {
	return "hr_attendance_records"
}

func (HRLeaveRequest) TableName() string {
	return "hr_leave_requests"
}

func (InventoryItem) TableName() string {
	return "inventory_items"
}

func (InventorySupplier) TableName() string {
	return "inventory_suppliers"
}

func (InventoryReportSnapshot) TableName() string {
	return "inventory_report_snapshots"
}

func (CRMLead) TableName() string {
	return "crm_leads"
}

func (CRMAccount) TableName() string {
	return "crm_accounts"
}

func (CRMDeal) TableName() string {
	return "crm_deals"
}

func (PurchaseRequisition) TableName() string {
	return "purchase_requisitions"
}

func (PurchaseOrder) TableName() string {
	return "purchase_orders"
}

func (PurchaseVendor) TableName() string {
	return "purchase_vendors"
}

func (FinanceJournalEntry) TableName() string {
	return "finance_journal_entries"
}

func (FinanceInvoice) TableName() string {
	return "finance_invoices"
}

func (FinanceExpenseClaim) TableName() string {
	return "finance_expense_claims"
}

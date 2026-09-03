package main

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// Ensure Admin Data (Roles, Menu Assignments, Audit Logs, User Sessions, and Administration module) is seeded.
func ensureAdminDataSeeded() {
	// AutoMigrate all models including User
	_ = db.AutoMigrate(&User{}, &Role{}, &RoleMenuAssignment{}, &AuditLog{}, &UserSessionActivity{})

	// Ensure role & is_active columns exist on users table
	db.Exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(100) DEFAULT 'Administrator';")
	db.Exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;")

	// Ensure admin and User accounts are assigned Administrator role
	db.Exec("UPDATE users SET role = 'Administrator' WHERE LOWER(username) = 'admin' OR LOWER(username) = 'user' OR role IS NULL OR role = '' OR LOWER(role) = 'admin';")

	// 1. Ensure Roles exist
	var roleCount int64
	db.Model(&Role{}).Count(&roleCount)
	if roleCount == 0 {
		defaultRoles := []Role{
			{Name: "Administrator", Description: "Full system control, menu assignment, user management, and security", Level: "Full Access", MemberCount: 1, IsSystem: true},
			{Name: "General Manager", Description: "Operational oversight across sales, inventory, finance, and CRM", Level: "Read & Write", MemberCount: 2, IsSystem: false},
			{Name: "Accountant", Description: "Access to Finance journals, invoices, expenses, and financial reporting", Level: "Custom", MemberCount: 3, IsSystem: false},
			{Name: "Inventory Manager", Description: "Access to stock levels, suppliers, SKU maintenance, and purchase requisitions", Level: "Read & Write", MemberCount: 4, IsSystem: false},
			{Name: "Cashier", Description: "Access to POS terminal, daily sales orders, and receipts", Level: "Read & Write", MemberCount: 5, IsSystem: false},
			{Name: "Auditor", Description: "Read-only access to view financial ledgers, audit logs, and compliance records", Level: "Read Only", MemberCount: 2, IsSystem: false},
		}
		for _, r := range defaultRoles {
			db.FirstOrCreate(&r, Role{Name: r.Name})
		}
	}

	// 2. Ensure Role Menu Assignments exist
	var assignmentCount int64
	db.Model(&RoleMenuAssignment{}).Count(&assignmentCount)
	if assignmentCount == 0 {
		modules := []string{"Sales", "Inventory", "HR", "CRM", "Finance", "Purchase", "E-Commerce", "Administration"}
		for _, mod := range modules {
			db.Create(&RoleMenuAssignment{
				RoleName:   "Administrator",
				ModuleName: mod,
				CanView:    true,
				CanCreate:  true,
				CanEdit:    true,
				CanDelete:  true,
			})
		}

		for _, mod := range []string{"Sales", "Inventory", "HR", "CRM", "Finance", "Purchase"} {
			db.Create(&RoleMenuAssignment{
				RoleName:   "General Manager",
				ModuleName: mod,
				CanView:    true,
				CanCreate:  true,
				CanEdit:    true,
				CanDelete:  false,
			})
		}

		for _, mod := range []string{"Finance", "Purchase", "Sales"} {
			db.Create(&RoleMenuAssignment{
				RoleName:   "Accountant",
				ModuleName: mod,
				CanView:    true,
				CanCreate:  true,
				CanEdit:    true,
				CanDelete:  false,
			})
		}

		for _, mod := range []string{"Inventory", "Purchase"} {
			db.Create(&RoleMenuAssignment{
				RoleName:   "Inventory Manager",
				ModuleName: mod,
				CanView:    true,
				CanCreate:  true,
				CanEdit:    true,
				CanDelete:  false,
			})
		}

		for _, mod := range []string{"Sales"} {
			db.Create(&RoleMenuAssignment{
				RoleName:   "Cashier",
				ModuleName: mod,
				CanView:    true,
				CanCreate:  true,
				CanEdit:    false,
				CanDelete:  false,
			})
		}

		for _, mod := range []string{"Finance", "Sales", "Inventory", "Administration"} {
			db.Create(&RoleMenuAssignment{
				RoleName:   "Auditor",
				ModuleName: mod,
				CanView:    true,
				CanCreate:  false,
				CanEdit:    false,
				CanDelete:  false,
			})
		}
	}

	// 3. Ensure Audit Logs exist
	var auditCount int64
	db.Model(&AuditLog{}).Count(&auditCount)
	if auditCount == 0 {
		db.Create(&AuditLog{
			Username:  "admin",
			Action:    "System Initialized",
			Category:  "Security",
			Details:   "Enterprise RBAC, Geo-Audit, and Menu Assignment matrix activated",
			IPAddress: "127.0.0.1",
			Status:    "Success",
		})
	}

	// 4. Ensure User Session & Geographical Activity Logs exist
	var sessionCount int64
	db.Model(&UserSessionActivity{}).Count(&sessionCount)
	if sessionCount == 0 {
		now := time.Now()
		yesterday := now.Add(-24 * time.Hour)
		twoDaysAgo := now.Add(-48 * time.Hour)

		// Session 1: Admin in Dubai (Today)
		adminScreens := []UserNavScreen{
			{Timestamp: now.Add(-3 * time.Hour).Format("15:04:05"), Module: "Sales", SubMenu: "POS", Screen: "Point of Sale Checkout Register"},
			{Timestamp: now.Add(-2 * time.Hour).Format("15:04:05"), Module: "Inventory", SubMenu: "Stock", Screen: "Warehouse Inventory & SKU Counters"},
			{Timestamp: now.Add(-1 * time.Hour).Format("15:04:05"), Module: "Finance", SubMenu: "Invoices", Screen: "Accounts Receivable & General Ledger"},
			{Timestamp: now.Add(-20 * time.Minute).Format("15:04:05"), Module: "Administration", SubMenu: "Menu Assignment", Screen: "RBAC Role & Menu Assignment Console"},
		}
		adminTxns := []UserTxnAction{
			{Timestamp: now.Add(-2*time.Hour - 45*time.Minute).Format("15:04:05"), Type: "Sale Transaction", Module: "Sales", Summary: "Completed POS checkout order #ORD-9931", AmountCents: 142000, Status: "Completed"},
			{Timestamp: now.Add(-1*time.Hour - 30*time.Minute).Format("15:04:05"), Type: "Stock Adjustment", Module: "Inventory", Summary: "Adjusted stock for SKU-4821 (+120 units)", AmountCents: 360000, Status: "Approved"},
			{Timestamp: now.Add(-50 * time.Minute).Format("15:04:05"), Type: "Invoice Payment", Module: "Finance", Summary: "Approved supplier payment invoice #INV-8812", AmountCents: 525000, Status: "Paid"},
			{Timestamp: now.Add(-10 * time.Minute).Format("15:04:05"), Type: "RBAC Policy Update", Module: "Administration", Summary: "Updated menu assignment for General Manager role", AmountCents: 0, Status: "Committed"},
		}
		adminScreensJSON, _ := json.Marshal(adminScreens)
		adminTxnsJSON, _ := json.Marshal(adminTxns)

		db.Create(&UserSessionActivity{
			SessionToken:  "sess-admin-ae-9912",
			UserID:        1,
			Username:      "admin",
			FullName:      "System Administrator",
			Role:          "Administrator",
			AuthMethod:    "Passkey (FIDO2) - Windows Hello",
			LoginTime:     now.Add(-3 * time.Hour),
			DurationMins:  180,
			IPAddress:     "194.187.168.42",
			GeoLocation:   "Dubai, United Arab Emirates",
			CountryCode:   "AE",
			City:          "Dubai",
			DeviceBrowser: "Chrome 128 / Windows 11 Pro",
			ScreensJSON:   string(adminScreensJSON),
			TxnsJSON:      string(adminTxnsJSON),
			Status:        "Active",
		})

		// Session 2: Sarah in London (Today)
		sarahScreens := []UserNavScreen{
			{Timestamp: now.Add(-4 * time.Hour).Format("15:04:05"), Module: "CRM", SubMenu: "Pipeline", Screen: "Sales Opportunity & Deals Pipeline"},
			{Timestamp: now.Add(-3*time.Hour - 15*time.Minute).Format("15:04:05"), Module: "Purchase", SubMenu: "Requisitions", Screen: "Vendor Purchase Requisitions"},
		}
		sarahTxns := []UserTxnAction{
			{Timestamp: now.Add(-3*time.Hour - 40*time.Minute).Format("15:04:05"), Type: "Deal Stage Advance", Module: "CRM", Summary: "Advanced Deal 'Enterprise Cloud Suite' to Closed-Won", AmountCents: 6400000, Status: "Won"},
			{Timestamp: now.Add(-2*time.Hour - 50*time.Minute).Format("15:04:05"), Type: "PO Issue", Module: "Purchase", Summary: "Issued Purchase Order #PO-7741 to Delta Supplies", AmountCents: 1280000, Status: "Issued"},
		}
		sarahScreensJSON, _ := json.Marshal(sarahScreens)
		sarahTxnsJSON, _ := json.Marshal(sarahTxns)

		db.Create(&UserSessionActivity{
			SessionToken:  "sess-sarah-gb-8831",
			UserID:        2,
			Username:      "sarah_ops",
			FullName:      "Sarah Jenkins",
			Role:          "General Manager",
			AuthMethod:    "Face Biometric (Webcam ID)",
			LoginTime:     now.Add(-4 * time.Hour),
			DurationMins:  110,
			IPAddress:     "82.165.197.12",
			GeoLocation:   "London, United Kingdom",
			CountryCode:   "GB",
			City:          "London",
			DeviceBrowser: "Safari 17.5 / macOS Sonoma",
			ScreensJSON:   string(sarahScreensJSON),
			TxnsJSON:      string(sarahTxnsJSON),
			Status:        "Signed Out",
		})

		// Session 3: Rahul in Bengaluru (Today)
		rahulScreens := []UserNavScreen{
			{Timestamp: now.Add(-6 * time.Hour).Format("15:04:05"), Module: "Finance", SubMenu: "Expenses", Screen: "Employee Expense Claims Review"},
			{Timestamp: now.Add(-5 * time.Hour).Format("15:04:05"), Module: "HR", SubMenu: "Payroll", Screen: "Monthly Payroll Calculation Run"},
		}
		rahulTxns := []UserTxnAction{
			{Timestamp: now.Add(-5*time.Hour - 30*time.Minute).Format("15:04:05"), Type: "Expense Reimbursement", Module: "Finance", Summary: "Reimbursed employee travel claim #EXP-412", AmountCents: 48000, Status: "Disbursed"},
			{Timestamp: now.Add(-4*time.Hour - 45*time.Minute).Format("15:04:05"), Type: "Payroll Batch Run", Module: "HR", Summary: "Calculated monthly payroll disbursement batch", AmountCents: 8650000, Status: "Processed"},
		}
		rahulScreensJSON, _ := json.Marshal(rahulScreens)
		rahulTxnsJSON, _ := json.Marshal(rahulTxns)

		db.Create(&UserSessionActivity{
			SessionToken:  "sess-rahul-in-5541",
			UserID:        3,
			Username:      "rahul_finance",
			FullName:      "Rahul Sharma",
			Role:          "Accountant",
			AuthMethod:    "Standard Password + OTP",
			LoginTime:     now.Add(-6 * time.Hour),
			DurationMins:  145,
			IPAddress:     "103.21.124.88",
			GeoLocation:   "Bengaluru, Karnataka, India",
			CountryCode:   "IN",
			City:          "Bengaluru",
			DeviceBrowser: "Edge 127 / Windows 11 Enterprise",
			ScreensJSON:   string(rahulScreensJSON),
			TxnsJSON:      string(rahulTxnsJSON),
			Status:        "Signed Out",
		})

		// Session 4: Chen Wei in Singapore (Yesterday)
		chenScreens := []UserNavScreen{
			{Timestamp: yesterday.Add(2 * time.Hour).Format("15:04:05"), Module: "E-Commerce", SubMenu: "Overview", Screen: "Storefront Analytics & Sales Dashboard"},
			{Timestamp: yesterday.Add(3 * time.Hour).Format("15:04:05"), Module: "Sales", SubMenu: "Orders", Screen: "B2B Bulk Customer Orders"},
		}
		chenTxns := []UserTxnAction{
			{Timestamp: yesterday.Add(2*time.Hour + 20*time.Minute).Format("15:04:05"), Type: "Promotion Campaign", Module: "E-Commerce", Summary: "Activated flash promotion campaign 'SPRING20'", AmountCents: 240000, Status: "Active"},
			{Timestamp: yesterday.Add(3*time.Hour + 10*time.Minute).Format("15:04:05"), Type: "Order Fulfillment", Module: "Sales", Summary: "Fulfilled 24 bulk customer orders for dispatch", AmountCents: 892000, Status: "Shipped"},
		}
		chenScreensJSON, _ := json.Marshal(chenScreens)
		chenTxnsJSON, _ := json.Marshal(chenTxns)

		db.Create(&UserSessionActivity{
			SessionToken:  "sess-chen-sg-3319",
			UserID:        4,
			Username:      "chen_wei",
			FullName:      "Chen Wei",
			Role:          "Inventory Manager",
			AuthMethod:    "Passkey (Touch ID / Fingerprint)",
			LoginTime:     yesterday.Add(1 * time.Hour),
			DurationMins:  160,
			IPAddress:     "118.200.45.19",
			GeoLocation:   "Singapore, Singapore",
			CountryCode:   "SG",
			City:          "Singapore",
			DeviceBrowser: "Chrome 128 / Android 14 Mobile",
			ScreensJSON:   string(chenScreensJSON),
			TxnsJSON:      string(chenTxnsJSON),
			Status:        "Signed Out",
		})

		// Session 5: Elena in New York (2 Days Ago)
		elenaScreens := []UserNavScreen{
			{Timestamp: twoDaysAgo.Add(4 * time.Hour).Format("15:04:05"), Module: "CRM", SubMenu: "Accounts", Screen: "Corporate Key Accounts Directory"},
			{Timestamp: twoDaysAgo.Add(5 * time.Hour).Format("15:04:05"), Module: "Inventory", SubMenu: "Suppliers", Screen: "Global Supplier Reliability Audits"},
		}
		elenaTxns := []UserTxnAction{
			{Timestamp: twoDaysAgo.Add(4*time.Hour + 35*time.Minute).Format("15:04:05"), Type: "Corporate Account Signed", Module: "CRM", Summary: "Onboarded new corporate enterprise client Acme Global", AmountCents: 12000000, Status: "Signed"},
			{Timestamp: twoDaysAgo.Add(5*time.Hour + 15*time.Minute).Format("15:04:05"), Type: "Supplier Quality Verification", Module: "Inventory", Summary: "Updated supplier reliability score for Omega Tech", AmountCents: 0, Status: "Verified"},
		}
		elenaScreensJSON, _ := json.Marshal(elenaScreens)
		elenaTxnsJSON, _ := json.Marshal(elenaTxns)

		db.Create(&UserSessionActivity{
			SessionToken:  "sess-elena-us-1102",
			UserID:        5,
			Username:      "elena_rodriguez",
			FullName:      "Elena Rodriguez",
			Role:          "General Manager",
			AuthMethod:    "Passkey (FIDO2 Hardware Key)",
			LoginTime:     twoDaysAgo.Add(3 * time.Hour),
			DurationMins:  175,
			IPAddress:     "198.51.100.74",
			GeoLocation:   "New York, NY, United States",
			CountryCode:   "US",
			City:          "New York",
			DeviceBrowser: "Firefox 129 / Windows 11",
			ScreensJSON:   string(elenaScreensJSON),
			TxnsJSON:      string(elenaTxnsJSON),
			Status:        "Signed Out",
		})
	}

	// 5. Ensure Administration Module exists in modules table
	var adminMod Module
	if err := db.Where("LOWER(name) = 'administration' OR LOWER(name) = 'admin'").First(&adminMod).Error; err != nil {
		adminMod = Module{
			Name:  "Administration",
			Icon:  "ShieldAlert",
			Order: 8,
		}
		db.Create(&adminMod)
	}

	// Make sure all 5 submenus exist
	adminSubmenus := []MenuItem{
		{ModuleID: adminMod.ID, Name: "Assign Menu Roles", Route: "/admin/menu-assignment", Order: 1},
		{ModuleID: adminMod.ID, Name: "Roles & Permissions", Route: "/admin/roles", Order: 2},
		{ModuleID: adminMod.ID, Name: "User Management", Route: "/admin/users", Order: 3},
		{ModuleID: adminMod.ID, Name: "User Login & Geo Activity", Route: "/admin/user-sessions", Order: 4},
		{ModuleID: adminMod.ID, Name: "Audit & Security Logs", Route: "/admin/audit-logs", Order: 5},
	}
	for _, item := range adminSubmenus {
		var existing MenuItem
		if err := db.Where("module_id = ? AND name = ?", adminMod.ID, item.Name).First(&existing).Error; err != nil {
			db.Create(&item)
		}
	}
}

// Log an audit event
func recordAuditLog(username, action, category, details, ip, status string) {
	if ip == "" {
		ip = "127.0.0.1"
	}
	if status == "" {
		status = "Success"
	}
	db.Create(&AuditLog{
		Username:  username,
		Action:    action,
		Category:  category,
		Details:   details,
		IPAddress: ip,
		Status:    status,
	})
}

// GET /api/admin/roles
func listAdminRoles(c *gin.Context) {
	var roles []Role
	if err := db.Order("id asc").Find(&roles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for i := range roles {
		var count int64
		db.Model(&User{}).Where("role = ?", roles[i].Name).Count(&count)
		if roles[i].Name == "Administrator" {
			var adminCount int64
			db.Model(&User{}).Where("role = ? OR username = 'admin'", "Administrator").Count(&adminCount)
			if adminCount > count {
				count = adminCount
			}
		}
		roles[i].MemberCount = int(count)
	}
	c.JSON(http.StatusOK, roles)
}

// POST /api/admin/roles
func createOrUpdateRole(c *gin.Context) {
	var req struct {
		ID          uint   `json:"id"`
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		Level       string `json:"level"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var role Role
	if req.ID != 0 {
		if err := db.First(&role, req.ID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "role not found"})
			return
		}
		role.Name = req.Name
		role.Description = req.Description
		role.Level = req.Level
		db.Save(&role)
		recordAuditLog("admin", "Role Updated", "RBAC", "Updated role "+role.Name, c.ClientIP(), "Success")
	} else {
		role = Role{
			Name:        req.Name,
			Description: req.Description,
			Level:       req.Level,
			MemberCount: 0,
			IsSystem:    false,
		}
		if err := db.Create(&role).Error; err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		recordAuditLog("admin", "Role Created", "RBAC", "Created role "+role.Name, c.ClientIP(), "Success")
	}

	c.JSON(http.StatusOK, role)
}

// GET /api/admin/menu-assignments
func listMenuAssignments(c *gin.Context) {
	roleName := c.Query("role")
	var assignments []RoleMenuAssignment
	query := db.Order("role_name asc, module_name asc")
	if roleName != "" {
		query = query.Where("role_name = ?", roleName)
	}
	if err := query.Find(&assignments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, assignments)
}

// POST /api/admin/menu-assignments
func saveMenuAssignments(c *gin.Context) {
	var req struct {
		RoleName    string               `json:"role_name" binding:"required"`
		Assignments []RoleMenuAssignment `json:"assignments"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Delete old assignments for this role and insert updated list
	db.Where("role_name = ?", req.RoleName).Delete(&RoleMenuAssignment{})
	for _, a := range req.Assignments {
		a.ID = 0
		a.RoleName = req.RoleName
		db.Create(&a)
	}

	recordAuditLog("admin", "Menu Assignments Saved", "Menu", "Updated menu access permissions for role "+req.RoleName, c.ClientIP(), "Success")
	c.JSON(http.StatusOK, gin.H{"message": "Menu assignments saved successfully", "count": len(req.Assignments)})
}

// GET /api/admin/users
func listAdminUsers(c *gin.Context) {
	var users []User
	if err := db.Order("id asc").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	type UserAdminView struct {
		ID           uint      `json:"id"`
		CreatedAt    time.Time `json:"created_at"`
		Username     string    `json:"username"`
		Email        string    `json:"email"`
		FullName     string    `json:"full_name"`
		Role         string    `json:"role"`
		IsActive     bool      `json:"is_active"`
		HasPasskey   bool      `json:"has_passkey"`
		HasFaceLogin bool      `json:"has_face_login"`
		FaceImage    string    `json:"face_image"`
	}

	view := make([]UserAdminView, 0, len(users))
	for _, u := range users {
		hasPasskey := userHasPasskey(u.ID)
		hasFace := u.FaceDescriptor != ""
		role := u.Role
		if role == "" {
			if u.Username == "admin" {
				role = "Administrator"
			} else {
				role = "Staff / Viewer"
			}
		}
		view = append(view, UserAdminView{
			ID:           u.ID,
			CreatedAt:    u.CreatedAt,
			Username:     u.Username,
			Email:        u.Email,
			FullName:     u.FullName,
			Role:         role,
			IsActive:     u.IsActive,
			HasPasskey:   hasPasskey,
			HasFaceLogin: hasFace,
			FaceImage:    u.FaceImage,
		})
	}

	c.JSON(http.StatusOK, view)
}

// PATCH /api/admin/users/:id
func updateAdminUser(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Role     string `json:"role"`
		IsActive *bool  `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user User
	if err := db.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	if req.Role != "" {
		user.Role = req.Role
	}
	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}
	db.Save(&user)

	recordAuditLog("admin", "User Updated", "RBAC", "Updated role/access for user "+user.Username+" to "+user.Role, c.ClientIP(), "Success")
	c.JSON(http.StatusOK, gin.H{"message": "User updated", "user": user})
}

// GET /api/admin/audit-logs
func listAuditLogs(c *gin.Context) {
	var logs []AuditLog
	if err := db.Order("created_at desc").Limit(100).Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}

// GET /api/admin/user-sessions
// Query params: date (YYYY-MM-DD), date_from, date_to, username, geo_area, role
func listUserSessions(c *gin.Context) {
	dateParam := c.Query("date")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")
	username := c.Query("username")
	geoArea := c.Query("geo_area")
	role := c.Query("role")

	query := db.Order("login_time desc")

	if dateParam != "" {
		query = query.Where("DATE(login_time) = ?", dateParam)
	}
	if dateFrom != "" {
		query = query.Where("DATE(login_time) >= ?", dateFrom)
	}
	if dateTo != "" {
		query = query.Where("DATE(login_time) <= ?", dateTo)
	}
	if username != "" {
		query = query.Where("LOWER(username) LIKE ?", "%"+strings.ToLower(username)+"%")
	}
	if geoArea != "" {
		query = query.Where("LOWER(geo_location) LIKE ? OR LOWER(city) LIKE ? OR LOWER(country_code) LIKE ?", "%"+strings.ToLower(geoArea)+"%", "%"+strings.ToLower(geoArea)+"%", "%"+strings.ToLower(geoArea)+"%")
	}
	if role != "" {
		query = query.Where("role = ?", role)
	}

	var sessions []UserSessionActivity
	if err := query.Find(&sessions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Parse JSON screens & txns
	for i := range sessions {
		if sessions[i].ScreensJSON != "" {
			_ = json.Unmarshal([]byte(sessions[i].ScreensJSON), &sessions[i].ScreensOpened)
		}
		if sessions[i].TxnsJSON != "" {
			_ = json.Unmarshal([]byte(sessions[i].TxnsJSON), &sessions[i].Transactions)
		}
	}

	c.JSON(http.StatusOK, sessions)
}

// GET /api/admin/user-sessions/:id
func getUserSessionDetail(c *gin.Context) {
	id := c.Param("id")
	var session UserSessionActivity
	if err := db.First(&session, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "session record not found"})
		return
	}

	if session.ScreensJSON != "" {
		_ = json.Unmarshal([]byte(session.ScreensJSON), &session.ScreensOpened)
	}
	if session.TxnsJSON != "" {
		_ = json.Unmarshal([]byte(session.TxnsJSON), &session.Transactions)
	}

	c.JSON(http.StatusOK, session)
}

// POST /api/admin/activity/track
// Records real-time user workspace visits or transactions performed
func trackUserActivity(c *gin.Context) {
	var req struct {
		SessionToken string          `json:"session_token"`
		Username     string          `json:"username" binding:"required"`
		Type         string          `json:"type"` // "screen_open" or "transaction"
		Screen       *UserNavScreen  `json:"screen,omitempty"`
		Transaction  *UserTxnAction  `json:"transaction,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var session UserSessionActivity
	err := db.Where("username = ? AND status = 'Active'", req.Username).Order("login_time desc").First(&session).Error
	if err != nil {
		// Create new active session if none found
		session = UserSessionActivity{
			SessionToken:  req.SessionToken,
			Username:      req.Username,
			FullName:      req.Username,
			Role:          "User",
			AuthMethod:    "Passkey / Biometric",
			LoginTime:     time.Now(),
			IPAddress:     c.ClientIP(),
			GeoLocation:   "Local Network / On-Premise",
			CountryCode:   "LOCAL",
			City:          "Headquarters",
			DeviceBrowser: c.GetHeader("User-Agent"),
			Status:        "Active",
		}
		db.Create(&session)
	}

	if req.Type == "screen_open" && req.Screen != nil {
		if req.Screen.Timestamp == "" {
			req.Screen.Timestamp = time.Now().Format("15:04:05")
		}
		var screens []UserNavScreen
		if session.ScreensJSON != "" {
			_ = json.Unmarshal([]byte(session.ScreensJSON), &screens)
		}
		screens = append(screens, *req.Screen)
		bytes, _ := json.Marshal(screens)
		session.ScreensJSON = string(bytes)
		db.Model(&session).Update("screens_json", session.ScreensJSON)
	}

	if req.Type == "transaction" && req.Transaction != nil {
		if req.Transaction.Timestamp == "" {
			req.Transaction.Timestamp = time.Now().Format("15:04:05")
		}
		var txns []UserTxnAction
		if session.TxnsJSON != "" {
			_ = json.Unmarshal([]byte(session.TxnsJSON), &txns)
		}
		txns = append(txns, *req.Transaction)
		bytes, _ := json.Marshal(txns)
		session.TxnsJSON = string(bytes)
		db.Model(&session).Update("txns_json", session.TxnsJSON)
	}

	c.JSON(http.StatusOK, gin.H{"status": "tracked"})
}

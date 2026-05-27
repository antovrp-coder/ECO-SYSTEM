package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var db *gorm.DB

func initDB() {
	_ = godotenv.Load()

	cfg := LoadConfig()
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		cfg.DBHost,
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBName,
		cfg.DBPort,
	)

	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	fmt.Println("Database connected successfully!")

	if err := migrateSchema(); err != nil {
		log.Fatalf("Failed to migrate database schema: %v", err)
	}

	initWebAuthn()

	seedInitialData()
	seedInventoryData()
	seedHRData()
	seedCRMData()
	seedPurchaseData()
	seedFinanceData()
	seedEcommerceData()
}

func migrateSchema() error {
	if !db.Migrator().HasTable(&Module{}) {
		if err := db.Migrator().CreateTable(&Module{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&MenuItem{}) {
		if err := db.Migrator().CreateTable(&MenuItem{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&User{}) {
		if err := db.Migrator().CreateTable(&User{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasColumn(&User{}, "LocalizedDisplayNames") {
		if err := db.Migrator().AddColumn(&User{}, "LocalizedDisplayNames"); err != nil {
			return err
		}
	}
	if !db.Migrator().HasColumn(&User{}, "VoiceCommands") {
		if err := db.Migrator().AddColumn(&User{}, "VoiceCommands"); err != nil {
			return err
		}
	}
	if !db.Migrator().HasColumn(&User{}, "FaceDescriptor") {
		if err := db.Migrator().AddColumn(&User{}, "FaceDescriptor"); err != nil {
			return err
		}
	}
	if !db.Migrator().HasColumn(&User{}, "FaceImage") {
		if err := db.Migrator().AddColumn(&User{}, "FaceImage"); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&UserPasskey{}) {
		if err := db.Migrator().CreateTable(&UserPasskey{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&PasskeyCredential{}) {
		if err := db.Migrator().CreateTable(&PasskeyCredential{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&EcommerceProduct{}) {
		if err := db.Migrator().CreateTable(&EcommerceProduct{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasColumn(&EcommerceProduct{}, "ImageURLs") {
		if err := db.Migrator().AddColumn(&EcommerceProduct{}, "ImageURLs"); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&EcommerceCustomer{}) {
		if err := db.Migrator().CreateTable(&EcommerceCustomer{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&EcommerceOrder{}) {
		if err := db.Migrator().CreateTable(&EcommerceOrder{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasColumn(&EcommerceOrder{}, "PaymentProvider") {
		if err := db.Migrator().AddColumn(&EcommerceOrder{}, "PaymentProvider"); err != nil {
			return err
		}
	}
	if !db.Migrator().HasColumn(&EcommerceOrder{}, "PaymentMethod") {
		if err := db.Migrator().AddColumn(&EcommerceOrder{}, "PaymentMethod"); err != nil {
			return err
		}
	}
	if !db.Migrator().HasColumn(&EcommerceOrder{}, "ContactPhone") {
		if err := db.Migrator().AddColumn(&EcommerceOrder{}, "ContactPhone"); err != nil {
			return err
		}
	}
	if !db.Migrator().HasColumn(&EcommerceOrder{}, "ShippingAddress") {
		if err := db.Migrator().AddColumn(&EcommerceOrder{}, "ShippingAddress"); err != nil {
			return err
		}
	}
	if !db.Migrator().HasColumn(&EcommerceOrder{}, "ShippingCity") {
		if err := db.Migrator().AddColumn(&EcommerceOrder{}, "ShippingCity"); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&EcommerceOrderItem{}) {
		if err := db.Migrator().CreateTable(&EcommerceOrderItem{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&EcommercePromotion{}) {
		if err := db.Migrator().CreateTable(&EcommercePromotion{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&HREmployee{}) {
		if err := db.Migrator().CreateTable(&HREmployee{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&HRPayrollRun{}) {
		if err := db.Migrator().CreateTable(&HRPayrollRun{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&HRAttendanceRecord{}) {
		if err := db.Migrator().CreateTable(&HRAttendanceRecord{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&HRLeaveRequest{}) {
		if err := db.Migrator().CreateTable(&HRLeaveRequest{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&InventoryItem{}) {
		if err := db.Migrator().CreateTable(&InventoryItem{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&InventorySupplier{}) {
		if err := db.Migrator().CreateTable(&InventorySupplier{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&InventoryReportSnapshot{}) {
		if err := db.Migrator().CreateTable(&InventoryReportSnapshot{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&CRMLead{}) {
		if err := db.Migrator().CreateTable(&CRMLead{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&CRMAccount{}) {
		if err := db.Migrator().CreateTable(&CRMAccount{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&CRMDeal{}) {
		if err := db.Migrator().CreateTable(&CRMDeal{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&PurchaseRequisition{}) {
		if err := db.Migrator().CreateTable(&PurchaseRequisition{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&PurchaseOrder{}) {
		if err := db.Migrator().CreateTable(&PurchaseOrder{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&PurchaseVendor{}) {
		if err := db.Migrator().CreateTable(&PurchaseVendor{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&FinanceJournalEntry{}) {
		if err := db.Migrator().CreateTable(&FinanceJournalEntry{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&FinanceInvoice{}) {
		if err := db.Migrator().CreateTable(&FinanceInvoice{}); err != nil {
			return err
		}
	}
	if !db.Migrator().HasTable(&FinanceExpenseClaim{}) {
		if err := db.Migrator().CreateTable(&FinanceExpenseClaim{}); err != nil {
			return err
		}
	}
	return nil
}

func main() {
	initDB()
	router := gin.Default()
	if err := router.SetTrustedProxies([]string{"127.0.0.1", "::1"}); err != nil {
		log.Fatalf("Failed to configure trusted proxies: %v", err)
	}

	// Enable CORS
	router.Use(cors.Default())

	// Routes
	router.GET("/api/modules", getModules)
	router.GET("/api/modules/:id/menus", getMenuItems)
	router.POST("/api/modules", createModule)
	router.POST("/api/menus", createMenuItem)
	router.GET("/api/inventory/stock", listInventoryItems)
	router.POST("/api/inventory/stock", createInventoryItem)
	router.PATCH("/api/inventory/stock/:id", updateInventoryItem)
	router.GET("/api/inventory/suppliers", listInventorySuppliers)
	router.POST("/api/inventory/suppliers", createInventorySupplier)
	router.GET("/api/inventory/reports", listInventoryReports)
	router.GET("/api/crm/overview", getCRMOverview)
	router.GET("/api/crm/leads", listCRMLeads)
	router.POST("/api/crm/leads", createCRMLead)
	router.GET("/api/crm/accounts", listCRMAccounts)
	router.POST("/api/crm/accounts", createCRMAccount)
	router.GET("/api/crm/pipeline", listCRMDeals)
	router.PATCH("/api/crm/pipeline/:id/stage", updateCRMDealStage)
	router.GET("/api/purchase/overview", getPurchaseOverview)
	router.GET("/api/purchase/requisitions", listPurchaseRequisitions)
	router.POST("/api/purchase/requisitions", createPurchaseRequisition)
	router.GET("/api/purchase/orders", listPurchaseOrders)
	router.PATCH("/api/purchase/orders/:id/status", updatePurchaseOrderStatus)
	router.GET("/api/purchase/vendors", listPurchaseVendors)
	router.POST("/api/purchase/vendors", createPurchaseVendor)
	router.GET("/api/finance/overview", getFinanceOverview)
	router.GET("/api/finance/reports", getFinanceReports)
	router.GET("/api/finance/journal", listFinanceJournalEntries)
	router.POST("/api/finance/journal", createFinanceJournalEntry)
	router.GET("/api/finance/invoices", listFinanceInvoices)
	router.POST("/api/finance/invoices", createFinanceInvoice)
	router.PATCH("/api/finance/invoices/:id/status", updateFinanceInvoiceStatus)
	router.GET("/api/finance/expenses", listFinanceExpenseClaims)
	router.POST("/api/finance/expenses", createFinanceExpenseClaim)
	router.PATCH("/api/finance/expenses/:id/status", updateFinanceExpenseClaimStatus)
	router.GET("/api/hr/employees", listHREmployees)
	router.POST("/api/hr/employees", createHREmployee)
	router.GET("/api/hr/overview", getHROverview)
	router.GET("/api/hr/leave", listHRLeaveRequests)
	router.POST("/api/hr/leave", createHRLeaveRequest)
	router.PATCH("/api/hr/leave/:id/status", updateHRLeaveRequestStatus)
	router.GET("/api/hr/payroll", listHRPayrollRuns)
	router.POST("/api/hr/payroll", createHRPayrollRun)
	router.GET("/api/hr/attendance", listHRAttendance)
	router.PATCH("/api/hr/attendance/:id", updateHRAttendance)
	router.GET("/api/ecommerce/overview", getEcommerceOverview)
	router.GET("/api/ecommerce/products", listEcommerceProducts)
	router.POST("/api/ecommerce/products", createEcommerceProduct)
	router.GET("/api/ecommerce/orders", listEcommerceOrders)
	router.PATCH("/api/ecommerce/orders/:id/status", updateEcommerceOrderStatus)
	router.GET("/api/ecommerce/payment-options", getEcommercePaymentOptions)
	router.POST("/api/ecommerce/checkout", checkoutEcommerceOrder)
	router.GET("/api/ecommerce/customers", getEcommerceCustomers)
	router.GET("/api/ecommerce/promotions", listEcommercePromotions)
	router.POST("/api/ecommerce/promotions", createEcommercePromotion)
	router.PATCH("/api/ecommerce/promotions/:id", updateEcommercePromotion)
	router.GET("/api/ecommerce/analytics", getEcommerceAnalytics)
	router.POST("/api/auth/signup", signup)
	router.POST("/api/auth/login", login)
	router.POST("/api/auth/profile/display-names", updateLocalizedDisplayNames)
	router.POST("/api/auth/profile/voice-commands", updateVoiceCommands)
	router.POST("/api/auth/face/status", faceStatus)
	router.POST("/api/auth/face/enroll", enrollFaceLogin)
	router.POST("/api/auth/face/disable", disableFaceLogin)
	router.POST("/api/auth/face/login", loginWithFace)
	router.POST("/api/auth/passkey/register/begin", beginPasskeyRegistration)
	router.POST("/api/auth/passkey/register/finish", finishPasskeyRegistration)
	router.POST("/api/auth/passkey/status", passkeyStatus)
	router.POST("/api/auth/passkey/disable", disablePasskey)
	router.POST("/api/auth/passkey/enroll/begin", beginPasskeyEnrollment)
	router.POST("/api/auth/passkey/enroll/finish", finishPasskeyEnrollment)
	router.POST("/api/auth/passkey/login/begin", beginPasskeyLogin)
	router.POST("/api/auth/passkey/login/finish", finishPasskeyLogin)

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	log.Printf("Server running on %s", LoadConfig().ServerPort)
	router.Run(LoadConfig().ServerPort)
}

// Get all modules
func getModules(c *gin.Context) {
	var modules []Module
	result := db.Order("\"order\" asc").Find(&modules)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}
	c.JSON(http.StatusOK, modules)
}

// Get menu items by module ID
func getMenuItems(c *gin.Context) {
	moduleID := c.Param("id")
	var menuItems []MenuItem
	result := db.Where("module_id = ?", moduleID).Order("\"order\" asc").Find(&menuItems)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}
	c.JSON(http.StatusOK, menuItems)
}

// SignupRequest is the expected payload for user registration.
type SignupRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
}

// LoginRequest is the expected payload for user login.
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type UpdateLocalizedDisplayNamesRequest struct {
	UserID       uint              `json:"user_id"`
	Username     string            `json:"username"`
	DisplayNames map[string]string `json:"display_names"`
}

type UpdateVoiceCommandsRequest struct {
	UserID        uint                `json:"user_id"`
	Username      string              `json:"username"`
	VoiceCommands map[string][]string `json:"voice_commands"`
}

// Create a new user account
func signup(c *gin.Context) {
	var req SignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Username == "" || req.Password == "" || req.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username, email, and password are required"})
		return
	}

	var existing User
	db.Where("username = ? OR email = ?", req.Username, req.Email).First(&existing)
	if existing.ID != 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "username or email already exists"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	user := User{
		Username:     req.Username,
		Email:        req.Email,
		FullName:     req.FullName,
		PasswordHash: string(hash),
	}

	result := db.Create(&user)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusCreated, userResponse(user, false))
}

// Login an existing user
func login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user User
	result := db.Where("username = ?", req.Username).First(&user)
	if result.Error != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	c.JSON(http.StatusOK, userResponse(user, userHasPasskey(user.ID)))
}

func updateLocalizedDisplayNames(c *gin.Context) {
	var req UpdateLocalizedDisplayNamesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.UserID == 0 || req.Username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id and username are required"})
		return
	}

	var user User
	if err := db.Where("id = ? AND username = ?", req.UserID, req.Username).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "user account not found"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load user account"})
		return
	}

	localizedNamesJSON, err := json.Marshal(req.DisplayNames)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid display names payload"})
		return
	}

	user.LocalizedDisplayNames = string(localizedNamesJSON)
	if len(req.DisplayNames) == 0 {
		user.LocalizedDisplayNames = ""
	}

	if err := db.Model(&user).Update("localized_display_names", user.LocalizedDisplayNames).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save localized display names"})
		return
	}

	c.JSON(http.StatusOK, userResponse(user, userHasPasskey(user.ID)))
}

func updateVoiceCommands(c *gin.Context) {
	var req UpdateVoiceCommandsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.UserID == 0 || req.Username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id and username are required"})
		return
	}

	var user User
	if err := db.Where("id = ? AND username = ?", req.UserID, req.Username).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "user account not found"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load user account"})
		return
	}

	normalizedVoiceCommands := normalizeVoiceCommands(req.VoiceCommands)
	voiceCommandsJSON, err := json.Marshal(normalizedVoiceCommands)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid voice commands payload"})
		return
	}

	user.VoiceCommands = string(voiceCommandsJSON)
	if len(normalizedVoiceCommands) == 0 {
		user.VoiceCommands = ""
	}

	if err := db.Model(&user).Update("voice_commands", user.VoiceCommands).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save voice commands"})
		return
	}

	c.JSON(http.StatusOK, userResponse(user, userHasPasskey(user.ID)))
}

// Create a new module
func createModule(c *gin.Context) {
	var module Module
	if err := c.ShouldBindJSON(&module); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result := db.Create(&module)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusCreated, module)
}

// Create a new menu item
func createMenuItem(c *gin.Context) {
	var menuItem MenuItem
	if err := c.ShouldBindJSON(&menuItem); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result := db.Create(&menuItem)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusCreated, menuItem)
}

func seedInitialData() {
	type menuSeed struct {
		Name  string
		Route string
		Order int
	}

	type moduleSeed struct {
		Name  string
		Icon  string
		Order int
		Menus []menuSeed
	}

	moduleSeeds := []moduleSeed{
		{
			Name:  "Sales",
			Icon:  "shopping_cart",
			Order: 1,
			Menus: []menuSeed{
				{Name: "POS", Route: "/sales/pos", Order: 1},
				{Name: "Orders", Route: "/sales/orders", Order: 2},
				{Name: "Invoices", Route: "/sales/invoices", Order: 3},
				{Name: "Customers", Route: "/sales/customers", Order: 4},
			},
		},
		{
			Name:  "Inventory",
			Icon:  "inventory",
			Order: 2,
			Menus: []menuSeed{
				{Name: "Stock", Route: "/inventory/stock", Order: 1},
				{Name: "Suppliers", Route: "/inventory/suppliers", Order: 2},
				{Name: "Reports", Route: "/inventory/reports", Order: 3},
			},
		},
		{
			Name:  "HR",
			Icon:  "people",
			Order: 3,
			Menus: []menuSeed{
				{Name: "Overview", Route: "/hr/overview", Order: 1},
				{Name: "Employees", Route: "/hr/employees", Order: 2},
				{Name: "Leave", Route: "/hr/leave", Order: 3},
				{Name: "Payroll", Route: "/hr/payroll", Order: 4},
				{Name: "Attendance", Route: "/hr/attendance", Order: 5},
			},
		},
		{
			Name:  "CRM",
			Icon:  "support_agent",
			Order: 4,
			Menus: []menuSeed{
				{Name: "Overview", Route: "/crm/overview", Order: 1},
				{Name: "Leads", Route: "/crm/leads", Order: 2},
				{Name: "Accounts", Route: "/crm/accounts", Order: 3},
				{Name: "Pipeline", Route: "/crm/pipeline", Order: 4},
			},
		},
		{
			Name:  "Finance",
			Icon:  "account_balance_wallet",
			Order: 5,
			Menus: []menuSeed{
				{Name: "Overview", Route: "/finance/overview", Order: 1},
				{Name: "Journal", Route: "/finance/journal", Order: 2},
				{Name: "Invoices", Route: "/finance/invoices", Order: 3},
				{Name: "Expenses", Route: "/finance/expenses", Order: 4},
				{Name: "Reports", Route: "/finance/reports", Order: 5},
			},
		},
		{
			Name:  "Purchase",
			Icon:  "receipt_long",
			Order: 6,
			Menus: []menuSeed{
				{Name: "Overview", Route: "/purchase/overview", Order: 1},
				{Name: "Requisitions", Route: "/purchase/requisitions", Order: 2},
				{Name: "Orders", Route: "/purchase/orders", Order: 3},
				{Name: "Vendors", Route: "/purchase/vendors", Order: 4},
			},
		},
		{
			Name:  "E-Commerce",
			Icon:  "storefront",
			Order: 7,
			Menus: []menuSeed{
				{Name: "Dashboard", Route: "/ecommerce/dashboard", Order: 1},
				{Name: "Storefront", Route: "/ecommerce/storefront", Order: 2},
				{Name: "Cart", Route: "/ecommerce/cart", Order: 3},
				{Name: "Payment", Route: "/ecommerce/payment", Order: 4},
				{Name: "Products", Route: "/ecommerce/products", Order: 5},
				{Name: "Checkout", Route: "/ecommerce/checkout", Order: 6},
				{Name: "Orders", Route: "/ecommerce/orders", Order: 7},
				{Name: "Customers", Route: "/ecommerce/customers", Order: 8},
				{Name: "Promotions", Route: "/ecommerce/promotions", Order: 9},
				{Name: "Analytics", Route: "/ecommerce/analytics", Order: 10},
			},
		},
	}

	for _, seed := range moduleSeeds {
		var module Module
		err := db.Where("name = ?", seed.Name).First(&module).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			module = Module{Name: seed.Name, Icon: seed.Icon, Order: seed.Order}
			if err := db.Create(&module).Error; err != nil {
				log.Printf("failed to seed module %s: %v", seed.Name, err)
				continue
			}
		case err != nil:
			log.Printf("failed to load module %s while seeding: %v", seed.Name, err)
			continue
		default:
			if err := db.Model(&module).Updates(Module{Icon: seed.Icon, Order: seed.Order}).Error; err != nil {
				log.Printf("failed to update module %s while seeding: %v", seed.Name, err)
			}
		}

		for _, menuSeed := range seed.Menus {
			var menuItem MenuItem
			err := db.Where("module_id = ? AND name = ?", module.ID, menuSeed.Name).First(&menuItem).Error
			switch {
			case errors.Is(err, gorm.ErrRecordNotFound):
				menuItem = MenuItem{ModuleID: module.ID, Name: menuSeed.Name, Route: menuSeed.Route, Order: menuSeed.Order}
				if err := db.Create(&menuItem).Error; err != nil {
					log.Printf("failed to seed menu %s for %s: %v", menuSeed.Name, seed.Name, err)
				}
			case err != nil:
				log.Printf("failed to load menu %s for %s while seeding: %v", menuSeed.Name, seed.Name, err)
			default:
				if err := db.Model(&menuItem).Updates(MenuItem{Route: menuSeed.Route, Order: menuSeed.Order}).Error; err != nil {
					log.Printf("failed to update menu %s for %s while seeding: %v", menuSeed.Name, seed.Name, err)
				}
			}
		}
	}

	cleanupLegacySeedData()
}

func cleanupLegacySeedData() {
	pruneLegacySalesMenus()
	pruneEmptyLegacyModule("POS")
	pruneEmptyLegacyModule("E-commerce")
}

func pruneLegacySalesMenus() {
	var salesModule Module
	if err := db.Where("name = ?", "Sales").First(&salesModule).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("failed to load Sales module while pruning legacy menus: %v", err)
		}
		return
	}

	allowedMenus := map[string]struct{}{
		normalizeSeedKey("POS"):       {},
		normalizeSeedKey("Orders"):    {},
		normalizeSeedKey("Invoices"):  {},
		normalizeSeedKey("Customers"): {},
	}

	var salesMenus []MenuItem
	if err := db.Where("module_id = ?", salesModule.ID).Find(&salesMenus).Error; err != nil {
		log.Printf("failed to load Sales menus while pruning legacy menus: %v", err)
		return
	}

	for _, menuItem := range salesMenus {
		if _, allowed := allowedMenus[normalizeSeedKey(menuItem.Name)]; allowed {
			continue
		}

		if err := db.Delete(&MenuItem{}, menuItem.ID).Error; err != nil {
			log.Printf("failed to delete legacy Sales menu %s: %v", menuItem.Name, err)
			continue
		}

		log.Printf("removed legacy Sales menu %s", menuItem.Name)
	}
}

func pruneEmptyLegacyModule(moduleName string) {
	var modules []Module
	if err := db.Where("LOWER(name) = LOWER(?)", moduleName).Find(&modules).Error; err != nil {
		log.Printf("failed to load legacy module %s: %v", moduleName, err)
		return
	}

	for _, module := range modules {
		if module.Name == "Sales" || module.Name == "Inventory" || module.Name == "HR" || module.Name == "CRM" || module.Name == "Finance" || module.Name == "Purchase" || module.Name == "E-Commerce" {
			continue
		}

		var menuCount int64
		if err := db.Model(&MenuItem{}).Where("module_id = ?", module.ID).Count(&menuCount).Error; err != nil {
			log.Printf("failed to count menus for legacy module %s: %v", module.Name, err)
			continue
		}

		if menuCount > 0 {
			log.Printf("keeping legacy module %s because it still has %d menu items", module.Name, menuCount)
			continue
		}

		if err := db.Delete(&Module{}, module.ID).Error; err != nil {
			log.Printf("failed to delete legacy module %s: %v", module.Name, err)
			continue
		}

		log.Printf("removed empty legacy module %s", module.Name)
	}
}

func normalizeSeedKey(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	normalized = strings.ReplaceAll(normalized, "-", " ")
	normalized = strings.Join(strings.Fields(normalized), " ")
	return normalized
}

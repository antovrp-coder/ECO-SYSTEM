package main

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type inventoryItemResponse struct {
	ID           uint   `json:"id"`
	SKU          string `json:"sku"`
	Name         string `json:"name"`
	Category     string `json:"category"`
	Warehouse    string `json:"warehouse"`
	SupplierName string `json:"supplier_name"`
	Status       string `json:"status"`
	ReorderPoint int    `json:"reorder_point"`
	OnHand       int    `json:"on_hand"`
	Reserved     int    `json:"reserved"`
	Incoming     int    `json:"incoming"`
	Available    int    `json:"available"`
	UnitCost     string `json:"unit_cost"`
	StockValue   string `json:"stock_value"`
}

type inventorySupplierResponse struct {
	ID               uint   `json:"id"`
	Name             string `json:"name"`
	ContactName      string `json:"contact_name"`
	Email            string `json:"email"`
	Region           string `json:"region"`
	LeadTimeDays     int    `json:"lead_time_days"`
	Status           string `json:"status"`
	PaymentTerms     string `json:"payment_terms"`
	ReliabilityScore int    `json:"reliability_score"`
	Notes            string `json:"notes"`
}

type inventoryReportResponse struct {
	ID             uint   `json:"id"`
	Name           string `json:"name"`
	WindowLabel    string `json:"window_label"`
	FillRate       string `json:"fill_rate"`
	InventoryValue string `json:"inventory_value"`
	StockCoverDays string `json:"stock_cover_days"`
	RiskSKUs       string `json:"risk_skus"`
	Summary        string `json:"summary"`
}

type createInventoryItemRequest struct {
	SKU          string `json:"sku"`
	Name         string `json:"name"`
	Category     string `json:"category"`
	Warehouse    string `json:"warehouse"`
	SupplierName string `json:"supplier_name"`
	Status       string `json:"status"`
	ReorderPoint int    `json:"reorder_point"`
	OnHand       int    `json:"on_hand"`
	Reserved     int    `json:"reserved"`
	Incoming     int    `json:"incoming"`
	UnitCost     int64  `json:"unit_cost"`
}

type updateInventoryItemRequest struct {
	Status       string `json:"status"`
	ReorderPoint *int   `json:"reorder_point"`
	OnHand       *int   `json:"on_hand"`
	Reserved     *int   `json:"reserved"`
	Incoming     *int   `json:"incoming"`
}

type createInventorySupplierRequest struct {
	Name             string `json:"name"`
	ContactName      string `json:"contact_name"`
	Email            string `json:"email"`
	Region           string `json:"region"`
	LeadTimeDays     int    `json:"lead_time_days"`
	Status           string `json:"status"`
	PaymentTerms     string `json:"payment_terms"`
	ReliabilityScore int    `json:"reliability_score"`
	Notes            string `json:"notes"`
}

func seedInventoryData() {
	items := []InventoryItem{
		{SKU: "INV-1001", Name: "Barcode Scanner", Category: "POS Hardware", Warehouse: "Bengaluru DC", SupplierName: "ScanSource India", Status: "Healthy", ReorderPoint: 18, OnHand: 42, Reserved: 6, Incoming: 14, UnitCostCents: 185000},
		{SKU: "INV-1002", Name: "Receipt Paper Roll", Category: "Consumables", Warehouse: "Mumbai Hub", SupplierName: "Paperline Supplies", Status: "Reorder soon", ReorderPoint: 120, OnHand: 138, Reserved: 24, Incoming: 80, UnitCostCents: 450},
		{SKU: "INV-1003", Name: "Card Reader Dock", Category: "Payments", Warehouse: "Chennai Hub", SupplierName: "FinEdge Devices", Status: "Healthy", ReorderPoint: 20, OnHand: 36, Reserved: 7, Incoming: 10, UnitCostCents: 92000},
		{SKU: "INV-1004", Name: "Thermal Label Pack", Category: "Warehouse", Warehouse: "Delhi Fulfillment", SupplierName: "Paperline Supplies", Status: "Critical", ReorderPoint: 45, OnHand: 21, Reserved: 5, Incoming: 40, UnitCostCents: 2800},
		{SKU: "INV-1005", Name: "Cash Drawer", Category: "POS Hardware", Warehouse: "Bengaluru DC", SupplierName: "RetailOps Manufacturing", Status: "Healthy", ReorderPoint: 12, OnHand: 28, Reserved: 4, Incoming: 0, UnitCostCents: 124000},
	}

	suppliers := []InventorySupplier{
		{Name: "ScanSource India", ContactName: "Meera Shah", Email: "meera@scansource.example", Region: "South India", LeadTimeDays: 9, Status: "Preferred", PaymentTerms: "Net 30", ReliabilityScore: 94, Notes: "Strong fill rate on hardware refresh cycles."},
		{Name: "Paperline Supplies", ContactName: "Dev Malhotra", Email: "dev@paperline.example", Region: "West India", LeadTimeDays: 5, Status: "Preferred", PaymentTerms: "Net 21", ReliabilityScore: 91, Notes: "Fast turnaround for store consumables and labels."},
		{Name: "FinEdge Devices", ContactName: "Sara Bose", Email: "sara@finedge.example", Region: "Pan India", LeadTimeDays: 11, Status: "Watchlist", PaymentTerms: "Net 45", ReliabilityScore: 82, Notes: "Lead time slipped on two payment terminal shipments."},
		{Name: "RetailOps Manufacturing", ContactName: "Karan Mehta", Email: "karan@retailops.example", Region: "North India", LeadTimeDays: 14, Status: "Active", PaymentTerms: "Net 30", ReliabilityScore: 88, Notes: "Use for drawer and stand replenishment batches."},
	}

	reports := []InventoryReportSnapshot{
		{Name: "Fill rate pulse", WindowLabel: "Last 30 days", FillRatePercent: 97.4, InventoryValueCents: 6840000, StockCoverDays: 26, RiskSKUs: 2, Summary: "Store hardware remained stable; warehouse consumables drove the only service risk."},
		{Name: "Aging and overstock", WindowLabel: "Current quarter", FillRatePercent: 95.8, InventoryValueCents: 7125000, StockCoverDays: 31, RiskSKUs: 3, Summary: "Payment accessories are balanced, but consumables still need tighter reorder windows."},
		{Name: "Supplier reliability", WindowLabel: "Current month", FillRatePercent: 96.9, InventoryValueCents: 7010000, StockCoverDays: 28, RiskSKUs: 1, Summary: "Preferred suppliers are on target; one payment device vendor remains on watch."},
	}

	for _, itemSeed := range items {
		var item InventoryItem
		err := db.Where("sku = ?", itemSeed.SKU).First(&item).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			_ = db.Create(&itemSeed).Error
		case err == nil:
			_ = db.Model(&item).Updates(itemSeed).Error
		}
	}

	for _, supplierSeed := range suppliers {
		var supplier InventorySupplier
		err := db.Where("name = ?", supplierSeed.Name).First(&supplier).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			_ = db.Create(&supplierSeed).Error
		case err == nil:
			_ = db.Model(&supplier).Updates(supplierSeed).Error
		}
	}

	for _, reportSeed := range reports {
		var report InventoryReportSnapshot
		err := db.Where("name = ?", reportSeed.Name).First(&report).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			_ = db.Create(&reportSeed).Error
		case err == nil:
			_ = db.Model(&report).Updates(reportSeed).Error
		}
	}
}

func listInventoryItems(c *gin.Context) {
	var items []InventoryItem
	if err := db.Order("category asc, name asc").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load inventory items"})
		return
	}

	response := make([]inventoryItemResponse, 0, len(items))
	for _, item := range items {
		response = append(response, mapInventoryItemResponse(item))
	}

	c.JSON(http.StatusOK, response)
}

func createInventoryItem(c *gin.Context) {
	var req createInventoryItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	item := InventoryItem{
		SKU:           strings.ToUpper(strings.TrimSpace(req.SKU)),
		Name:          strings.TrimSpace(req.Name),
		Category:      strings.TrimSpace(req.Category),
		Warehouse:     strings.TrimSpace(req.Warehouse),
		SupplierName:  strings.TrimSpace(req.SupplierName),
		Status:        strings.TrimSpace(req.Status),
		ReorderPoint:  req.ReorderPoint,
		OnHand:        req.OnHand,
		Reserved:      req.Reserved,
		Incoming:      req.Incoming,
		UnitCostCents: req.UnitCost * 100,
	}

	if item.SKU == "" || item.Name == "" || item.Category == "" || item.Warehouse == "" || item.SupplierName == "" || req.UnitCost <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sku, name, category, warehouse, supplier, and unit cost are required"})
		return
	}
	if item.Status == "" {
		item.Status = normalizeInventoryStatus(item.OnHand, item.ReorderPoint)
	}

	if err := db.Create(&item).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "failed to create inventory item"})
		return
	}

	c.JSON(http.StatusCreated, mapInventoryItemResponse(item))
}

func updateInventoryItem(c *gin.Context) {
	itemID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid inventory item id"})
		return
	}

	var req updateInventoryItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var item InventoryItem
	if err := db.First(&item, uint(itemID)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "inventory item not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load inventory item"})
		return
	}

	if req.ReorderPoint != nil {
		item.ReorderPoint = *req.ReorderPoint
	}
	if req.OnHand != nil {
		item.OnHand = *req.OnHand
	}
	if req.Reserved != nil {
		item.Reserved = *req.Reserved
	}
	if req.Incoming != nil {
		item.Incoming = *req.Incoming
	}
	if strings.TrimSpace(req.Status) != "" {
		item.Status = strings.TrimSpace(req.Status)
	} else {
		item.Status = normalizeInventoryStatus(item.OnHand, item.ReorderPoint)
	}

	if err := db.Save(&item).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "failed to update inventory item"})
		return
	}

	c.JSON(http.StatusOK, mapInventoryItemResponse(item))
}

func listInventorySuppliers(c *gin.Context) {
	var suppliers []InventorySupplier
	if err := db.Order("reliability_score desc, name asc").Find(&suppliers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load inventory suppliers"})
		return
	}

	response := make([]inventorySupplierResponse, 0, len(suppliers))
	for _, supplier := range suppliers {
		response = append(response, mapInventorySupplierResponse(supplier))
	}

	c.JSON(http.StatusOK, response)
}

func createInventorySupplier(c *gin.Context) {
	var req createInventorySupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	supplier := InventorySupplier{
		Name:             strings.TrimSpace(req.Name),
		ContactName:      strings.TrimSpace(req.ContactName),
		Email:            strings.TrimSpace(req.Email),
		Region:           strings.TrimSpace(req.Region),
		LeadTimeDays:     req.LeadTimeDays,
		Status:           strings.TrimSpace(req.Status),
		PaymentTerms:     strings.TrimSpace(req.PaymentTerms),
		ReliabilityScore: req.ReliabilityScore,
		Notes:            strings.TrimSpace(req.Notes),
	}

	if supplier.Name == "" || supplier.ContactName == "" || supplier.Region == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name, contact, and region are required"})
		return
	}
	if supplier.Status == "" {
		supplier.Status = "Active"
	}
	if supplier.PaymentTerms == "" {
		supplier.PaymentTerms = "Net 30"
	}
	if supplier.LeadTimeDays <= 0 {
		supplier.LeadTimeDays = 7
	}
	if supplier.ReliabilityScore <= 0 {
		supplier.ReliabilityScore = 85
	}

	if err := db.Create(&supplier).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "failed to create supplier"})
		return
	}

	c.JSON(http.StatusCreated, mapInventorySupplierResponse(supplier))
}

func listInventoryReports(c *gin.Context) {
	var reports []InventoryReportSnapshot
	if err := db.Order("created_at desc").Find(&reports).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load inventory reports"})
		return
	}

	response := make([]inventoryReportResponse, 0, len(reports))
	for _, report := range reports {
		response = append(response, mapInventoryReportResponse(report))
	}

	c.JSON(http.StatusOK, response)
}

func mapInventoryItemResponse(item InventoryItem) inventoryItemResponse {
	available := item.OnHand - item.Reserved
	if available < 0 {
		available = 0
	}

	return inventoryItemResponse{
		ID:           item.ID,
		SKU:          item.SKU,
		Name:         item.Name,
		Category:     item.Category,
		Warehouse:    item.Warehouse,
		SupplierName: item.SupplierName,
		Status:       item.Status,
		ReorderPoint: item.ReorderPoint,
		OnHand:       item.OnHand,
		Reserved:     item.Reserved,
		Incoming:     item.Incoming,
		Available:    available,
		UnitCost:     formatCurrencyWhole(item.UnitCostCents),
		StockValue:   formatCurrencyWhole(item.UnitCostCents * int64(item.OnHand)),
	}
}

func mapInventorySupplierResponse(supplier InventorySupplier) inventorySupplierResponse {
	return inventorySupplierResponse{
		ID:               supplier.ID,
		Name:             supplier.Name,
		ContactName:      supplier.ContactName,
		Email:            supplier.Email,
		Region:           supplier.Region,
		LeadTimeDays:     supplier.LeadTimeDays,
		Status:           supplier.Status,
		PaymentTerms:     supplier.PaymentTerms,
		ReliabilityScore: supplier.ReliabilityScore,
		Notes:            supplier.Notes,
	}
}

func mapInventoryReportResponse(report InventoryReportSnapshot) inventoryReportResponse {
	return inventoryReportResponse{
		ID:             report.ID,
		Name:           report.Name,
		WindowLabel:    report.WindowLabel,
		FillRate:       fmt.Sprintf("%.1f%%", report.FillRatePercent),
		InventoryValue: formatCurrencyWhole(report.InventoryValueCents),
		StockCoverDays: fmt.Sprintf("%d days", report.StockCoverDays),
		RiskSKUs:       fmt.Sprintf("%d", report.RiskSKUs),
		Summary:        report.Summary,
	}
}

func normalizeInventoryStatus(onHand int, reorderPoint int) string {
	if reorderPoint > 0 && onHand <= reorderPoint/2 {
		return "Critical"
	}
	if reorderPoint > 0 && onHand <= reorderPoint {
		return "Reorder soon"
	}
	return "Healthy"
}

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

type purchaseOverviewResponse struct {
	Metrics []purchaseMetricResponse `json:"metrics"`
}

type purchaseMetricResponse struct {
	Label string `json:"label"`
	Value string `json:"value"`
	Delta string `json:"delta"`
	Copy  string `json:"copy"`
}

type purchaseRequisitionResponse struct {
	ID             uint   `json:"id"`
	RequestCode    string `json:"request_code"`
	Title          string `json:"title"`
	Department     string `json:"department"`
	RequestedBy    string `json:"requested_by"`
	Priority       string `json:"priority"`
	Status         string `json:"status"`
	TargetDate     string `json:"target_date"`
	EstimatedValue string `json:"estimated_value"`
	Summary        string `json:"summary"`
}

type purchaseOrderResponse struct {
	ID              uint   `json:"id"`
	OrderCode       string `json:"order_code"`
	VendorName      string `json:"vendor_name"`
	Category        string `json:"category"`
	Status          string `json:"status"`
	BuyerName       string `json:"buyer_name"`
	ExpectedReceipt string `json:"expected_receipt"`
	Value           string `json:"value"`
	LineItems       string `json:"line_items"`
	Summary         string `json:"summary"`
}

type purchaseVendorResponse struct {
	ID          uint   `json:"id"`
	VendorCode  string `json:"vendor_code"`
	Name        string `json:"name"`
	Category    string `json:"category"`
	Region      string `json:"region"`
	ContactName string `json:"contact_name"`
	Email       string `json:"email"`
	LeadTime    string `json:"lead_time"`
	Status      string `json:"status"`
	AnnualSpend string `json:"annual_spend"`
}

type createPurchaseRequisitionRequest struct {
	RequestCode    string `json:"request_code"`
	Title          string `json:"title"`
	Department     string `json:"department"`
	RequestedBy    string `json:"requested_by"`
	Priority       string `json:"priority"`
	Status         string `json:"status"`
	TargetDate     string `json:"target_date"`
	EstimatedValue int64  `json:"estimated_value"`
	Summary        string `json:"summary"`
}

type updatePurchaseOrderStatusRequest struct {
	Status string `json:"status"`
}

type createPurchaseVendorRequest struct {
	VendorCode  string `json:"vendor_code"`
	Name        string `json:"name"`
	Category    string `json:"category"`
	Region      string `json:"region"`
	ContactName string `json:"contact_name"`
	Email       string `json:"email"`
	LeadTime    int    `json:"lead_time_days"`
	Status      string `json:"status"`
	AnnualSpend int64  `json:"annual_spend"`
}

func seedPurchaseData() {
	requisitions := []PurchaseRequisition{
		{RequestCode: "PR-410", Title: "POS counter hardware refresh", Department: "Retail Ops", RequestedBy: "Aarushi Mehta", Priority: "High", Status: "Review", TargetDate: "2026-05-29", EstimatedValueCents: 1680000, Summary: "Replace aging scanners and drawers across five stores."},
		{RequestCode: "PR-422", Title: "Warehouse label stock", Department: "Logistics", RequestedBy: "Vikas Menon", Priority: "Medium", Status: "Approved", TargetDate: "2026-05-24", EstimatedValueCents: 240000, Summary: "Replenish thermal labels before quarter-end volume spike."},
		{RequestCode: "PR-431", Title: "Field support laptops", Department: "IT", RequestedBy: "Rohit Balan", Priority: "High", Status: "Sourcing", TargetDate: "2026-06-03", EstimatedValueCents: 1240000, Summary: "Prepare onboarding kits for the service expansion cohort."},
	}

	orders := []PurchaseOrder{
		{OrderCode: "PO-7201", VendorName: "ScanSource India", Category: "POS Hardware", Status: "Issued", BuyerName: "Maya Kapoor", ExpectedReceipt: "2026-05-27", ValueCents: 1420000, LineItems: 6, Summary: "Barcode scanner replenishment for top-volume stores."},
		{OrderCode: "PO-7208", VendorName: "Paperline Supplies", Category: "Consumables", Status: "Partial receipt", BuyerName: "Maya Kapoor", ExpectedReceipt: "2026-05-21", ValueCents: 360000, LineItems: 4, Summary: "Receipt paper and label pack restock."},
		{OrderCode: "PO-7214", VendorName: "RetailOps Manufacturing", Category: "Fixtures", Status: "Draft", BuyerName: "Karan Desai", ExpectedReceipt: "2026-06-08", ValueCents: 2180000, LineItems: 8, Summary: "Cash drawer and counter stand procurement for new stores."},
	}

	vendors := []PurchaseVendor{
		{VendorCode: "V-101", Name: "ScanSource India", Category: "POS Hardware", Region: "South India", ContactName: "Meera Shah", Email: "meera@scansource.example", LeadTimeDays: 9, Status: "Preferred", AnnualSpendCents: 4820000},
		{VendorCode: "V-118", Name: "Paperline Supplies", Category: "Consumables", Region: "West India", ContactName: "Dev Malhotra", Email: "dev@paperline.example", LeadTimeDays: 5, Status: "Preferred", AnnualSpendCents: 1640000},
		{VendorCode: "V-132", Name: "RetailOps Manufacturing", Category: "Fixtures", Region: "North India", ContactName: "Karan Mehta", Email: "karan@retailops.example", LeadTimeDays: 14, Status: "Active", AnnualSpendCents: 3580000},
	}

	for _, requisitionSeed := range requisitions {
		var requisition PurchaseRequisition
		err := db.Where("request_code = ?", requisitionSeed.RequestCode).First(&requisition).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			_ = db.Create(&requisitionSeed).Error
		case err == nil:
			_ = db.Model(&requisition).Updates(requisitionSeed).Error
		}
	}

	for _, orderSeed := range orders {
		var order PurchaseOrder
		err := db.Where("order_code = ?", orderSeed.OrderCode).First(&order).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			_ = db.Create(&orderSeed).Error
		case err == nil:
			_ = db.Model(&order).Updates(orderSeed).Error
		}
	}

	for _, vendorSeed := range vendors {
		var vendor PurchaseVendor
		err := db.Where("vendor_code = ?", vendorSeed.VendorCode).First(&vendor).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			_ = db.Create(&vendorSeed).Error
		case err == nil:
			_ = db.Model(&vendor).Updates(vendorSeed).Error
		}
	}
}

func getPurchaseOverview(c *gin.Context) {
	var requisitions []PurchaseRequisition
	var orders []PurchaseOrder
	var vendors []PurchaseVendor

	if err := db.Find(&requisitions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load purchase overview"})
		return
	}
	if err := db.Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load purchase overview"})
		return
	}
	if err := db.Find(&vendors).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load purchase overview"})
		return
	}

	pipeline := int64(0)
	for _, requisition := range requisitions {
		pipeline += requisition.EstimatedValueCents
	}
	inflight := int64(0)
	for _, order := range orders {
		inflight += order.ValueCents
	}

	response := purchaseOverviewResponse{Metrics: []purchaseMetricResponse{
		{Label: "Requisition pipeline", Value: formatCurrencyWhole(pipeline), Delta: "+9%", Copy: "High-priority buying requests remain concentrated in store and warehouse operations."},
		{Label: "Orders in flight", Value: formatCurrencyWhole(inflight), Delta: "+4%", Copy: "Issued and partially received orders are on track for the next replenishment cycle."},
		{Label: "Open requisitions", Value: formatCount(len(requisitions)), Delta: "+3", Copy: "Most pending work is still within target approval windows."},
		{Label: "Managed vendors", Value: formatCount(len(vendors)), Delta: "+1", Copy: "Preferred vendor coverage is stable across core categories."},
	}}

	c.JSON(http.StatusOK, response)
}

func listPurchaseRequisitions(c *gin.Context) {
	var requisitions []PurchaseRequisition
	if err := db.Order("updated_at desc, target_date asc").Find(&requisitions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load purchase requisitions"})
		return
	}

	response := make([]purchaseRequisitionResponse, 0, len(requisitions))
	for _, requisition := range requisitions {
		response = append(response, mapPurchaseRequisitionResponse(requisition))
	}

	c.JSON(http.StatusOK, response)
}

func createPurchaseRequisition(c *gin.Context) {
	var req createPurchaseRequisitionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	requisition := PurchaseRequisition{
		RequestCode:         strings.ToUpper(strings.TrimSpace(req.RequestCode)),
		Title:               strings.TrimSpace(req.Title),
		Department:          strings.TrimSpace(req.Department),
		RequestedBy:         strings.TrimSpace(req.RequestedBy),
		Priority:            strings.TrimSpace(req.Priority),
		Status:              strings.TrimSpace(req.Status),
		TargetDate:          strings.TrimSpace(req.TargetDate),
		EstimatedValueCents: req.EstimatedValue * 100,
		Summary:             strings.TrimSpace(req.Summary),
	}

	if requisition.RequestCode == "" || requisition.Title == "" || requisition.Department == "" || requisition.RequestedBy == "" || req.EstimatedValue <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "request code, title, department, requester, and value are required"})
		return
	}
	if requisition.Priority == "" {
		requisition.Priority = "Medium"
	}
	if requisition.Status == "" {
		requisition.Status = "Review"
	}

	if err := db.Create(&requisition).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "failed to create requisition"})
		return
	}

	c.JSON(http.StatusCreated, mapPurchaseRequisitionResponse(requisition))
}

func listPurchaseOrders(c *gin.Context) {
	var orders []PurchaseOrder
	if err := db.Order("updated_at desc, expected_receipt asc").Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load purchase orders"})
		return
	}

	response := make([]purchaseOrderResponse, 0, len(orders))
	for _, order := range orders {
		response = append(response, mapPurchaseOrderResponse(order))
	}

	c.JSON(http.StatusOK, response)
}

func updatePurchaseOrderStatus(c *gin.Context) {
	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order id"})
		return
	}

	var req updatePurchaseOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	status := normalizePurchaseOrderStatus(req.Status)
	if status == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "valid order status is required"})
		return
	}

	var order PurchaseOrder
	if err := db.First(&order, uint(orderID)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "purchase order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load purchase order"})
		return
	}

	order.Status = status
	if err := db.Save(&order).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "failed to update purchase order"})
		return
	}

	c.JSON(http.StatusOK, mapPurchaseOrderResponse(order))
}

func listPurchaseVendors(c *gin.Context) {
	var vendors []PurchaseVendor
	if err := db.Order("annual_spend_cents desc, name asc").Find(&vendors).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load purchase vendors"})
		return
	}

	response := make([]purchaseVendorResponse, 0, len(vendors))
	for _, vendor := range vendors {
		response = append(response, mapPurchaseVendorResponse(vendor))
	}

	c.JSON(http.StatusOK, response)
}

func createPurchaseVendor(c *gin.Context) {
	var req createPurchaseVendorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	vendor := PurchaseVendor{
		VendorCode:       strings.ToUpper(strings.TrimSpace(req.VendorCode)),
		Name:             strings.TrimSpace(req.Name),
		Category:         strings.TrimSpace(req.Category),
		Region:           strings.TrimSpace(req.Region),
		ContactName:      strings.TrimSpace(req.ContactName),
		Email:            strings.TrimSpace(req.Email),
		LeadTimeDays:     req.LeadTime,
		Status:           strings.TrimSpace(req.Status),
		AnnualSpendCents: req.AnnualSpend * 100,
	}

	if vendor.VendorCode == "" || vendor.Name == "" || vendor.Region == "" || vendor.ContactName == "" || req.AnnualSpend <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "vendor code, name, region, contact, and annual spend are required"})
		return
	}
	if vendor.Status == "" {
		vendor.Status = "Active"
	}
	if vendor.LeadTimeDays <= 0 {
		vendor.LeadTimeDays = 7
	}

	if err := db.Create(&vendor).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "failed to create vendor"})
		return
	}

	c.JSON(http.StatusCreated, mapPurchaseVendorResponse(vendor))
}

func mapPurchaseRequisitionResponse(requisition PurchaseRequisition) purchaseRequisitionResponse {
	return purchaseRequisitionResponse{
		ID:             requisition.ID,
		RequestCode:    requisition.RequestCode,
		Title:          requisition.Title,
		Department:     requisition.Department,
		RequestedBy:    requisition.RequestedBy,
		Priority:       requisition.Priority,
		Status:         requisition.Status,
		TargetDate:     requisition.TargetDate,
		EstimatedValue: formatCurrencyWhole(requisition.EstimatedValueCents),
		Summary:        requisition.Summary,
	}
}

func mapPurchaseOrderResponse(order PurchaseOrder) purchaseOrderResponse {
	return purchaseOrderResponse{
		ID:              order.ID,
		OrderCode:       order.OrderCode,
		VendorName:      order.VendorName,
		Category:        order.Category,
		Status:          order.Status,
		BuyerName:       order.BuyerName,
		ExpectedReceipt: order.ExpectedReceipt,
		Value:           formatCurrencyWhole(order.ValueCents),
		LineItems:       formatCount(order.LineItems),
		Summary:         order.Summary,
	}
}

func mapPurchaseVendorResponse(vendor PurchaseVendor) purchaseVendorResponse {
	return purchaseVendorResponse{
		ID:          vendor.ID,
		VendorCode:  vendor.VendorCode,
		Name:        vendor.Name,
		Category:    vendor.Category,
		Region:      vendor.Region,
		ContactName: vendor.ContactName,
		Email:       vendor.Email,
		LeadTime:    fmt.Sprintf("%d days", vendor.LeadTimeDays),
		Status:      vendor.Status,
		AnnualSpend: formatCurrencyWhole(vendor.AnnualSpendCents),
	}
}

func normalizePurchaseOrderStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "draft":
		return "Draft"
	case "issued":
		return "Issued"
	case "partial receipt", "partial":
		return "Partial receipt"
	case "received":
		return "Received"
	case "cancelled", "canceled":
		return "Cancelled"
	default:
		return ""
	}
}
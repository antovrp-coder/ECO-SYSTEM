package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ecommerceMetricResponse struct {
	Label string `json:"label"`
	Value string `json:"value"`
	Delta string `json:"delta"`
	Copy  string `json:"copy"`
}

type ecommerceChannelResponse struct {
	Channel string `json:"channel"`
	Share   int    `json:"share"`
	Revenue string `json:"revenue"`
}

type ecommerceOverviewResponse struct {
	Metrics   []ecommerceMetricResponse  `json:"metrics"`
	Channels  []ecommerceChannelResponse `json:"channels"`
	Checklist []string                   `json:"checklist"`
}

type ecommerceProductResponse struct {
	ID         uint     `json:"id"`
	SKU        string   `json:"sku"`
	Name       string   `json:"name"`
	Category   string   `json:"category"`
	Price      string   `json:"price"`
	Stock      int      `json:"stock"`
	Status     string   `json:"status"`
	Conversion string   `json:"conversion"`
	Tags       []string `json:"tags"`
	ImageURLs  []string `json:"image_urls"`
}

type ecommerceOrderResponse struct {
	ID              uint   `json:"id"`
	OrderNumber     string `json:"order_number"`
	Customer        string `json:"customer"`
	Channel         string `json:"channel"`
	Value           string `json:"value"`
	Status          string `json:"status"`
	FulfillmentEta  string `json:"fulfillment_eta"`
	PaymentProvider string `json:"payment_provider"`
	PaymentMethod   string `json:"payment_method"`
}

type ecommercePaymentOptionResponse struct {
	ID               string   `json:"id"`
	Label            string   `json:"label"`
	Status           string   `json:"status"`
	Copy             string   `json:"copy"`
	SupportedMethods []string `json:"supported_methods"`
	ButtonLabel      string   `json:"button_label"`
}

type ecommerceCheckoutItemRequest struct {
	ProductID uint `json:"product_id"`
	Quantity  int  `json:"quantity"`
}

type ecommerceCheckoutRequest struct {
	FullName        string                         `json:"full_name"`
	Email           string                         `json:"email"`
	Phone           string                         `json:"phone"`
	Address         string                         `json:"address"`
	City            string                         `json:"city"`
	Channel         string                         `json:"channel"`
	PaymentProvider string                         `json:"payment_provider"`
	PaymentMethod   string                         `json:"payment_method"`
	Items           []ecommerceCheckoutItemRequest `json:"items"`
}

type ecommerceCheckoutResponse struct {
	Order          ecommerceOrderResponse `json:"order"`
	PaymentMessage string                 `json:"payment_message"`
}

type ecommerceCustomerSegmentResponse struct {
	Name    string `json:"name"`
	Count   string `json:"count"`
	Insight string `json:"insight"`
}

type ecommerceCustomerSpotlightResponse struct {
	ID            uint   `json:"id"`
	Name          string `json:"name"`
	Tier          string `json:"tier"`
	LifetimeValue string `json:"lifetime_value"`
	NextAction    string `json:"next_action"`
}

type ecommerceCustomersResponse struct {
	Segments   []ecommerceCustomerSegmentResponse   `json:"segments"`
	Spotlights []ecommerceCustomerSpotlightResponse `json:"spotlights"`
}

type ecommercePromotionResponse struct {
	ID              uint   `json:"id"`
	Name            string `json:"name"`
	Status          string `json:"status"`
	Channel         string `json:"channel"`
	Uplift          string `json:"uplift"`
	Window          string `json:"window"`
	DiscountPercent int    `json:"discount_percent"`
	Audience        string `json:"audience"`
}

type ecommerceFunnelStageResponse struct {
	Label      string `json:"label"`
	Value      string `json:"value"`
	Completion int    `json:"completion"`
}

type ecommerceRegionResponse struct {
	Region  string `json:"region"`
	Share   int    `json:"share"`
	Revenue string `json:"revenue"`
}

type ecommerceAnalyticsResponse struct {
	Funnel  []ecommerceFunnelStageResponse `json:"funnel"`
	Regions []ecommerceRegionResponse      `json:"regions"`
}

type createEcommerceProductRequest struct {
	SKU       string   `json:"sku"`
	Name      string   `json:"name"`
	Category  string   `json:"category"`
	Price     float64  `json:"price"`
	Stock     int      `json:"stock"`
	Tags      []string `json:"tags"`
	ImageURLs []string `json:"image_urls"`
}

type updateEcommerceOrderStatusRequest struct {
	Status string `json:"status"`
}

type saveEcommercePromotionRequest struct {
	Name            string `json:"name"`
	Status          string `json:"status"`
	Channel         string `json:"channel"`
	Window          string `json:"window"`
	DiscountPercent int    `json:"discount_percent"`
	Audience        string `json:"audience"`
}

func seedEcommerceData() {
	seedCustomers := []EcommerceCustomer{
		{Name: "Meera Patel", Email: "meera.patel@example.com", Segment: "VIP repeat buyers", Tier: "Gold", Region: "West India", LifetimeValueCents: 482000, NextAction: "Invite to ambassador bundle preview."},
		{Name: "Arjun Verma", Email: "arjun.verma@example.com", Segment: "First-order shoppers", Tier: "Silver", Region: "North India", LifetimeValueCents: 194000, NextAction: "Recommend replenishment on earbuds accessories."},
		{Name: "Divya Rao", Email: "divya.rao@example.com", Segment: "VIP repeat buyers", Tier: "VIP", Region: "South India", LifetimeValueCents: 811000, NextAction: "Protect with priority fulfillment and white-glove support."},
		{Name: "Aarav Sharma", Email: "aarav.sharma@example.com", Segment: "High intent browsers", Tier: "Silver", Region: "South India", LifetimeValueCents: 94000, NextAction: "Retarget outerwear category with fit guidance."},
		{Name: "Priya Nair", Email: "priya.nair@example.com", Segment: "At-risk subscribers", Tier: "Gold", Region: "South India", LifetimeValueCents: 286000, NextAction: "Send replenishment reminder before 30-day churn point."},
		{Name: "Nila Krishnan", Email: "nila.krishnan@example.com", Segment: "High intent browsers", Tier: "Gold", Region: "International", LifetimeValueCents: 312000, NextAction: "Offer expedited shipping on repeat basket items."},
		{Name: "Rahul Menon", Email: "rahul.menon@example.com", Segment: "At-risk subscribers", Tier: "Silver", Region: "West India", LifetimeValueCents: 176000, NextAction: "Recover checkout with address support outreach."},
		{Name: "Kavya Reddy", Email: "kavya.reddy@example.com", Segment: "VIP repeat buyers", Tier: "VIP", Region: "South India", LifetimeValueCents: 1248000, NextAction: "Schedule premium account review and concierge support."},
	}

	seedProducts := []EcommerceProduct{
		{SKU: "SKU-101", Name: "AeroFit Trail Jacket", Category: "Apparel", PriceCents: 12900, Stock: 182, Status: "Healthy", ConversionRate: 5.6, Tags: mustJSONList([]string{"Hero SKU", "High margin"}), ImageURLs: mustJSONList([]string{"/catalog/aerofit-trail-jacket-hero.svg", "/catalog/aerofit-trail-jacket-detail.svg"})},
		{SKU: "SKU-117", Name: "Urban Carry Sling", Category: "Accessories", PriceCents: 7400, Stock: 28, Status: "Reorder", ConversionRate: 4.8, Tags: mustJSONList([]string{"Low stock", "Bundle pick"}), ImageURLs: mustJSONList([]string{"/catalog/urban-carry-sling-hero.svg", "/catalog/urban-carry-sling-angle.svg"})},
		{SKU: "SKU-145", Name: "Pulse Pro Earbuds", Category: "Electronics", PriceCents: 19900, Stock: 0, Status: "Backorder", ConversionRate: 6.2, Tags: mustJSONList([]string{"Preorder", "Top rated"}), ImageURLs: mustJSONList([]string{"/catalog/pulse-pro-earbuds-hero.svg", "/catalog/pulse-pro-earbuds-case.svg"})},
		{SKU: "SKU-168", Name: "Hydra Smart Bottle", Category: "Home", PriceCents: 5900, Stock: 91, Status: "Healthy", ConversionRate: 3.9, Tags: mustJSONList([]string{"Seasonal", "Giftable"}), ImageURLs: mustJSONList([]string{"/catalog/hydra-smart-bottle-hero.svg", "/catalog/hydra-smart-bottle-packaging.svg"})},
		{SKU: "SKU-204", Name: "Nimbus Desk Lamp", Category: "Home", PriceCents: 8900, Stock: 34, Status: "Reorder", ConversionRate: 4.1, Tags: mustJSONList([]string{"Cross-sell", "Editorial pick"}), ImageURLs: mustJSONList([]string{"/catalog/nimbus-desk-lamp-hero.svg", "/catalog/nimbus-desk-lamp-desk.svg"})},
		{SKU: "SKU-221", Name: "Studio Knit Set", Category: "Apparel", PriceCents: 14900, Stock: 116, Status: "Healthy", ConversionRate: 5.1, Tags: mustJSONList([]string{"Repeat buyer", "New arrival"}), ImageURLs: mustJSONList([]string{"/catalog/studio-knit-set-hero.svg", "/catalog/studio-knit-set-lifestyle.svg"})},
	}

	seedPromotions := []EcommercePromotion{
		{Name: "Weekend cart recovery", Status: "Active", Channel: "Email + SMS", UpliftPercent: 14.2, WindowLabel: "Live now", DiscountPercent: 10, Audience: "Abandoned carts"},
		{Name: "Monsoon hero bundle", Status: "Scheduled", Channel: "Homepage", UpliftPercent: 9.8, WindowLabel: "Starts tomorrow 09:00", DiscountPercent: 18, Audience: "Returning customers"},
		{Name: "VIP loyalty top-up", Status: "Draft", Channel: "App push", UpliftPercent: 6.1, WindowLabel: "Awaiting approval", DiscountPercent: 12, Audience: "VIP repeat buyers"},
		{Name: "Marketplace rating harvest", Status: "Active", Channel: "Post-purchase email", UpliftPercent: 11.4, WindowLabel: "Live now", DiscountPercent: 8, Audience: "Delivered orders"},
	}

	for _, customerSeed := range seedCustomers {
		var customer EcommerceCustomer
		err := db.Where("email = ?", customerSeed.Email).First(&customer).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			_ = db.Create(&customerSeed).Error
		case err == nil:
			_ = db.Model(&customer).Updates(customerSeed).Error
		}
	}

	for _, productSeed := range seedProducts {
		var product EcommerceProduct
		err := db.Where("sku = ?", productSeed.SKU).First(&product).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			_ = db.Create(&productSeed).Error
		case err == nil:
			_ = db.Model(&product).Updates(productSeed).Error
		}
	}

	for _, promotionSeed := range seedPromotions {
		var promotion EcommercePromotion
		err := db.Where("name = ?", promotionSeed.Name).First(&promotion).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			_ = db.Create(&promotionSeed).Error
		case err == nil:
			_ = db.Model(&promotion).Updates(promotionSeed).Error
		}
	}

	customerIDs := map[string]uint{}
	var customers []EcommerceCustomer
	if err := db.Find(&customers).Error; err == nil {
		for _, customer := range customers {
			customerIDs[customer.Email] = customer.ID
		}
	}

	seedOrders := []EcommerceOrder{
		{OrderNumber: "EC-5401", CustomerID: customerIDs["aarav.sharma@example.com"], Channel: "Web storefront", ValueCents: 21400, Status: "New", FulfillmentEta: fulfillmentEtaForStatus("New")},
		{OrderNumber: "EC-5398", CustomerID: customerIDs["priya.nair@example.com"], Channel: "Marketplace", ValueCents: 8900, Status: "Packed", FulfillmentEta: fulfillmentEtaForStatus("Packed")},
		{OrderNumber: "EC-5392", CustomerID: customerIDs["nila.krishnan@example.com"], Channel: "Social commerce", ValueCents: 16200, Status: "Shipped", FulfillmentEta: fulfillmentEtaForStatus("Shipped")},
		{OrderNumber: "EC-5387", CustomerID: customerIDs["rahul.menon@example.com"], Channel: "Web storefront", ValueCents: 30800, Status: "Delayed", FulfillmentEta: fulfillmentEtaForStatus("Delayed")},
		{OrderNumber: "EC-5379", CustomerID: customerIDs["kavya.reddy@example.com"], Channel: "B2B portal", ValueCents: 124800, Status: "Packed", FulfillmentEta: fulfillmentEtaForStatus("Packed")},
	}

	for _, orderSeed := range seedOrders {
		if orderSeed.CustomerID == 0 {
			continue
		}

		var order EcommerceOrder
		err := db.Where("order_number = ?", orderSeed.OrderNumber).First(&order).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			_ = db.Create(&orderSeed).Error
		case err == nil:
			_ = db.Model(&order).Updates(orderSeed).Error
		}
	}
}

func getEcommerceOverview(c *gin.Context) {
	var orders []EcommerceOrder
	if err := db.Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load e-commerce overview"})
		return
	}

	var promotions []EcommercePromotion
	if err := db.Find(&promotions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load promotions"})
		return
	}

	var products []EcommerceProduct
	if err := db.Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load products"})
		return
	}

	totalGMV := int64(0)
	delayedCount := 0
	channelTotals := map[string]int64{}
	for _, order := range orders {
		totalGMV += order.ValueCents
		channelTotals[order.Channel] += order.ValueCents
		if order.Status == "Delayed" {
			delayedCount++
		}
	}

	aov := int64(0)
	if len(orders) > 0 {
		aov = totalGMV / int64(len(orders))
	}

	activePromotions := 0
	for _, promotion := range promotions {
		if promotion.Status == "Active" {
			activePromotions++
		}
	}
	recoveryRevenue := int64(float64(totalGMV) * (0.08 + float64(activePromotions)*0.02))
	returnRate := 0.0
	if len(orders) > 0 {
		returnRate = float64(delayedCount) / float64(len(orders)) * 100
	}

	channels := make([]ecommerceChannelResponse, 0, len(channelTotals))
	for channel, revenueCents := range channelTotals {
		share := 0
		if totalGMV > 0 {
			share = int(math.Round(float64(revenueCents) / float64(totalGMV) * 100))
		}
		channels = append(channels, ecommerceChannelResponse{Channel: channel, Share: share, Revenue: formatCurrencyWhole(revenueCents)})
	}
	sort.Slice(channels, func(i, j int) bool { return channels[i].Share > channels[j].Share })

	checklist := []string{}
	for _, product := range products {
		if product.Stock > 0 && product.Stock < 35 {
			checklist = append(checklist, fmt.Sprintf("Replenish %s before the next demand spike.", product.Name))
		}
	}
	if delayedCount > 0 {
		checklist = append(checklist, fmt.Sprintf("Review %d delayed orders crossing fulfillment SLA.", delayedCount))
	}
	for _, promotion := range promotions {
		if promotion.Status == "Draft" {
			checklist = append(checklist, fmt.Sprintf("Approve %s and publish the channel plan.", promotion.Name))
		}
	}
	if len(checklist) == 0 {
		checklist = append(checklist, "Monitor top channels and keep high-conversion SKUs in stock.")
	}

	c.JSON(http.StatusOK, ecommerceOverviewResponse{
		Metrics: []ecommerceMetricResponse{
			{Label: "GMV this week", Value: formatCurrencyCompact(totalGMV), Delta: "+12.8%", Copy: "Marketplace and direct web sales are compounding above forecast."},
			{Label: "Average order value", Value: formatCurrencyFixed(aov), Delta: "+4.2%", Copy: "Bundles and accessory add-ons are lifting checkout value."},
			{Label: "Recovery revenue", Value: formatCurrencyCompact(recoveryRevenue), Delta: "+19.1%", Copy: "Cart recovery flows are converting best in the first 90 minutes."},
			{Label: "Return rate", Value: fmt.Sprintf("%.1f%%", returnRate), Delta: "-0.6%", Copy: "Sizing guidance and packaging QA are reducing avoidable returns."},
		},
		Channels:  channels,
		Checklist: checklist,
	})
}

func listEcommerceProducts(c *gin.Context) {
	var products []EcommerceProduct
	if err := db.Order("category asc, name asc").Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load products"})
		return
	}

	response := make([]ecommerceProductResponse, 0, len(products))
	for _, product := range products {
		response = append(response, mapProductResponse(product))
	}

	c.JSON(http.StatusOK, response)
}

func createEcommerceProduct(c *gin.Context) {
	var req createEcommerceProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if strings.TrimSpace(req.SKU) == "" || strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Category) == "" || req.Price <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sku, name, category, and price are required"})
		return
	}

	product := EcommerceProduct{
		SKU:            strings.TrimSpace(req.SKU),
		Name:           strings.TrimSpace(req.Name),
		Category:       strings.TrimSpace(req.Category),
		PriceCents:     int64(math.Round(req.Price * 100)),
		Stock:          req.Stock,
		Status:         deriveProductStatus(req.Stock),
		ConversionRate: 3.4 + float64(len(req.Tags))*0.35,
		Tags:           mustJSONList(req.Tags),
		ImageURLs:      mustJSONList(req.ImageURLs),
	}

	if err := db.Create(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create product"})
		return
	}

	c.JSON(http.StatusCreated, mapProductResponse(product))
}

func listEcommerceOrders(c *gin.Context) {
	var orders []EcommerceOrder
	if err := db.Preload("Customer").Order("created_at desc").Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load orders"})
		return
	}

	response := make([]ecommerceOrderResponse, 0, len(orders))
	for _, order := range orders {
		response = append(response, mapOrderResponse(order))
	}

	c.JSON(http.StatusOK, response)
}

func updateEcommerceOrderStatus(c *gin.Context) {
	var req updateEcommerceOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	status := normalizeOrderStatus(req.Status)
	if status == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order status"})
		return
	}

	var order EcommerceOrder
	if err := db.Preload("Customer").First(&order, c.Param("id")).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load order"})
		return
	}

	order.Status = status
	order.FulfillmentEta = fulfillmentEtaForStatus(status)
	if err := db.Model(&order).Updates(EcommerceOrder{Status: order.Status, FulfillmentEta: order.FulfillmentEta}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update order status"})
		return
	}

	c.JSON(http.StatusOK, mapOrderResponse(order))
}

func getEcommercePaymentOptions(c *gin.Context) {
	c.JSON(http.StatusOK, []ecommercePaymentOptionResponse{
		{
			ID:               "stripe",
			Label:            "Stripe",
			Status:           "placeholder",
			Copy:             "Create a placeholder Stripe checkout session and return client-side confirmation details.",
			SupportedMethods: []string{"card", "upi"},
			ButtonLabel:      "Continue with Stripe",
		},
		{
			ID:               "razorpay",
			Label:            "Razorpay",
			Status:           "placeholder",
			Copy:             "Create a placeholder Razorpay order for cards, UPI, and net banking flows.",
			SupportedMethods: []string{"upi", "card", "netbanking"},
			ButtonLabel:      "Continue with Razorpay",
		},
		{
			ID:               "paypal",
			Label:            "PayPal",
			Status:           "placeholder",
			Copy:             "Return a placeholder PayPal approval URL and confirmation message.",
			SupportedMethods: []string{"card", "wallet"},
			ButtonLabel:      "Continue with PayPal",
		},
	})
}

func checkoutEcommerceOrder(c *gin.Context) {
	var req ecommerceCheckoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fullName := strings.TrimSpace(req.FullName)
	email := strings.TrimSpace(strings.ToLower(req.Email))
	address := strings.TrimSpace(req.Address)
	city := strings.TrimSpace(req.City)
	phone := strings.TrimSpace(req.Phone)
	channel := normalizeCheckoutChannel(req.Channel)
	provider := normalizePaymentProvider(req.PaymentProvider)
	method := normalizeCheckoutPaymentMethod(req.PaymentMethod)

	if fullName == "" || email == "" || address == "" || city == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "full name, email, address, and city are required"})
		return
	}
	if provider == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payment provider is required"})
		return
	}
	if method == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payment method is required"})
		return
	}
	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "at least one checkout item is required"})
		return
	}
	if !paymentProviderSupportsMethod(provider, method) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "selected provider does not support that payment method"})
		return
	}

	var response ecommerceCheckoutResponse
	err := db.Transaction(func(tx *gorm.DB) error {
		var customer EcommerceCustomer
		err := tx.Where("email = ?", email).First(&customer).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			customer = EcommerceCustomer{
				Name:               fullName,
				Email:              email,
				Segment:            "First-order shoppers",
				Tier:               "Silver",
				Region:             city,
				LifetimeValueCents: 0,
				NextAction:         fmt.Sprintf("Follow up on %s order onboarding.", fullName),
			}
			if err := tx.Create(&customer).Error; err != nil {
				return err
			}
		case err != nil:
			return err
		default:
			customer.Name = fullName
			customer.Region = city
			customer.NextAction = fmt.Sprintf("Follow up on %s repeat order experience.", fullName)
			if err := tx.Model(&customer).Updates(EcommerceCustomer{Name: customer.Name, Region: customer.Region, NextAction: customer.NextAction}).Error; err != nil {
				return err
			}
		}

		totalCents := int64(0)
		orderItems := make([]EcommerceOrderItem, 0, len(req.Items))
		for _, item := range req.Items {
			if item.ProductID == 0 || item.Quantity <= 0 {
				return errors.New("invalid checkout item")
			}

			var product EcommerceProduct
			if err := tx.First(&product, item.ProductID).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return errors.New("product not found")
				}
				return err
			}
			if product.Stock < item.Quantity {
				return fmt.Errorf("insufficient stock for %s", product.Name)
			}

			lineTotal := product.PriceCents * int64(item.Quantity)
			totalCents += lineTotal
			orderItems = append(orderItems, EcommerceOrderItem{
				ProductID:      product.ID,
				ProductSKU:     product.SKU,
				ProductName:    product.Name,
				Quantity:       item.Quantity,
				UnitPriceCents: product.PriceCents,
				LineTotalCents: lineTotal,
			})

			product.Stock -= item.Quantity
			product.Status = deriveProductStatus(product.Stock)
			if err := tx.Model(&product).Updates(EcommerceProduct{Stock: product.Stock, Status: product.Status}).Error; err != nil {
				return err
			}
		}

		order := EcommerceOrder{
			OrderNumber:     generateOrderNumber(),
			CustomerID:      customer.ID,
			Channel:         channel,
			ValueCents:      totalCents,
			Status:          "New",
			FulfillmentEta:  checkoutFulfillmentEta(provider),
			PaymentProvider: provider,
			PaymentMethod:   method,
			ContactPhone:    phone,
			ShippingAddress: address,
			ShippingCity:    city,
		}
		if err := tx.Create(&order).Error; err != nil {
			return err
		}

		for index := range orderItems {
			orderItems[index].OrderID = order.ID
			if err := tx.Create(&orderItems[index]).Error; err != nil {
				return err
			}
		}

		customer.LifetimeValueCents += totalCents
		customer.NextAction = fmt.Sprintf("Confirm payment completion for %s via %s.", order.OrderNumber, paymentProviderLabel(provider))
		if err := tx.Model(&customer).Updates(EcommerceCustomer{LifetimeValueCents: customer.LifetimeValueCents, NextAction: customer.NextAction}).Error; err != nil {
			return err
		}

		order.Customer = customer
		response = ecommerceCheckoutResponse{
			Order:          mapOrderResponse(order),
			PaymentMessage: paymentPlaceholderMessage(provider, method, order.OrderNumber),
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, response)
}

func getEcommerceCustomers(c *gin.Context) {
	var customers []EcommerceCustomer
	if err := db.Order("lifetime_value_cents desc").Find(&customers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load customers"})
		return
	}

	segmentCounts := map[string]int{}
	for _, customer := range customers {
		segmentCounts[customer.Segment]++
	}

	segments := make([]ecommerceCustomerSegmentResponse, 0, len(segmentCounts))
	for segment, count := range segmentCounts {
		segments = append(segments, ecommerceCustomerSegmentResponse{Name: segment, Count: formatCount(count), Insight: customerSegmentInsight(segment)})
	}
	sort.Slice(segments, func(i, j int) bool { return segments[i].Count > segments[j].Count })

	spotlights := []ecommerceCustomerSpotlightResponse{}
	for _, customer := range customers {
		spotlights = append(spotlights, ecommerceCustomerSpotlightResponse{ID: customer.ID, Name: customer.Name, Tier: customer.Tier, LifetimeValue: formatCurrencyWhole(customer.LifetimeValueCents), NextAction: customer.NextAction})
		if len(spotlights) == 3 {
			break
		}
	}

	c.JSON(http.StatusOK, ecommerceCustomersResponse{Segments: segments, Spotlights: spotlights})
}

func listEcommercePromotions(c *gin.Context) {
	var promotions []EcommercePromotion
	if err := db.Order("updated_at desc").Find(&promotions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load promotions"})
		return
	}

	response := make([]ecommercePromotionResponse, 0, len(promotions))
	for _, promotion := range promotions {
		response = append(response, mapPromotionResponse(promotion))
	}

	c.JSON(http.StatusOK, response)
}

func createEcommercePromotion(c *gin.Context) {
	var req saveEcommercePromotionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	promotion, err := buildPromotionFromRequest(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.Create(&promotion).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create promotion"})
		return
	}

	c.JSON(http.StatusCreated, mapPromotionResponse(promotion))
}

func updateEcommercePromotion(c *gin.Context) {
	var req saveEcommercePromotionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var promotion EcommercePromotion
	if err := db.First(&promotion, c.Param("id")).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "promotion not found"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load promotion"})
		return
	}

	updatedPromotion, err := buildPromotionFromRequest(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.Model(&promotion).Updates(updatedPromotion).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update promotion"})
		return
	}

	promotion.Name = updatedPromotion.Name
	promotion.Status = updatedPromotion.Status
	promotion.Channel = updatedPromotion.Channel
	promotion.UpliftPercent = updatedPromotion.UpliftPercent
	promotion.WindowLabel = updatedPromotion.WindowLabel
	promotion.DiscountPercent = updatedPromotion.DiscountPercent
	promotion.Audience = updatedPromotion.Audience

	c.JSON(http.StatusOK, mapPromotionResponse(promotion))
}

func getEcommerceAnalytics(c *gin.Context) {
	var orders []EcommerceOrder
	if err := db.Preload("Customer").Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load analytics"})
		return
	}

	var products []EcommerceProduct
	if err := db.Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load analytics"})
		return
	}

	var customers []EcommerceCustomer
	if err := db.Find(&customers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load analytics"})
		return
	}

	sessions := len(customers)*180 + len(products)*240
	if sessions == 0 {
		sessions = 1
	}
	productViews := int(float64(sessions) * 0.49)
	addToCarts := int(float64(productViews) * 0.27)
	checkoutStarted := int(float64(addToCarts) * 0.49)
	ordersPlaced := len(orders)

	funnel := []ecommerceFunnelStageResponse{
		{Label: "Sessions", Value: formatCount(sessions), Completion: 100},
		{Label: "Product views", Value: formatCount(productViews), Completion: percentage(productViews, sessions)},
		{Label: "Add to carts", Value: formatCount(addToCarts), Completion: percentage(addToCarts, sessions)},
		{Label: "Checkout started", Value: formatCount(checkoutStarted), Completion: percentage(checkoutStarted, sessions)},
		{Label: "Orders placed", Value: formatCount(ordersPlaced), Completion: percentage(ordersPlaced, sessions)},
	}

	regionTotals := map[string]int64{}
	totalRevenue := int64(0)
	for _, order := range orders {
		region := order.Customer.Region
		if strings.TrimSpace(region) == "" {
			region = "Unassigned"
		}
		regionTotals[region] += order.ValueCents
		totalRevenue += order.ValueCents
	}

	regions := make([]ecommerceRegionResponse, 0, len(regionTotals))
	for region, revenueCents := range regionTotals {
		regions = append(regions, ecommerceRegionResponse{Region: region, Share: percentageInt64(revenueCents, totalRevenue), Revenue: formatCurrencyWhole(revenueCents)})
	}
	sort.Slice(regions, func(i, j int) bool { return regions[i].Share > regions[j].Share })

	c.JSON(http.StatusOK, ecommerceAnalyticsResponse{Funnel: funnel, Regions: regions})
}

func mapProductResponse(product EcommerceProduct) ecommerceProductResponse {
	return ecommerceProductResponse{
		ID:         product.ID,
		SKU:        product.SKU,
		Name:       product.Name,
		Category:   product.Category,
		Price:      formatCurrencyWhole(product.PriceCents),
		Stock:      product.Stock,
		Status:     product.Status,
		Conversion: fmt.Sprintf("%.1f%%", product.ConversionRate),
		Tags:       parseJSONList(product.Tags),
		ImageURLs:  parseJSONList(product.ImageURLs),
	}
}

func mapPromotionResponse(promotion EcommercePromotion) ecommercePromotionResponse {
	return ecommercePromotionResponse{
		ID:              promotion.ID,
		Name:            promotion.Name,
		Status:          promotion.Status,
		Channel:         promotion.Channel,
		Uplift:          fmt.Sprintf("+%.1f%%", promotion.UpliftPercent),
		Window:          promotion.WindowLabel,
		DiscountPercent: promotion.DiscountPercent,
		Audience:        promotion.Audience,
	}
}

func mapOrderResponse(order EcommerceOrder) ecommerceOrderResponse {
	return ecommerceOrderResponse{
		ID:              order.ID,
		OrderNumber:     order.OrderNumber,
		Customer:        order.Customer.Name,
		Channel:         order.Channel,
		Value:           formatCurrencyWhole(order.ValueCents),
		Status:          order.Status,
		FulfillmentEta:  order.FulfillmentEta,
		PaymentProvider: paymentProviderLabel(order.PaymentProvider),
		PaymentMethod:   paymentMethodLabel(order.PaymentMethod),
	}
}

func buildPromotionFromRequest(req saveEcommercePromotionRequest) (EcommercePromotion, error) {
	name := strings.TrimSpace(req.Name)
	status := normalizePromotionStatus(req.Status)
	channel := strings.TrimSpace(req.Channel)
	window := strings.TrimSpace(req.Window)
	audience := strings.TrimSpace(req.Audience)

	if name == "" || status == "" || channel == "" || window == "" || audience == "" {
		return EcommercePromotion{}, errors.New("name, status, channel, window, and audience are required")
	}

	if req.DiscountPercent < 0 {
		req.DiscountPercent = 0
	}

	uplift := math.Max(3.2, float64(req.DiscountPercent)*0.58)
	return EcommercePromotion{
		Name:            name,
		Status:          status,
		Channel:         channel,
		WindowLabel:     window,
		DiscountPercent: req.DiscountPercent,
		Audience:        audience,
		UpliftPercent:   math.Round(uplift*10) / 10,
	}, nil
}

func mustJSONList(values []string) string {
	encoded, err := json.Marshal(values)
	if err != nil {
		return "[]"
	}

	return string(encoded)
}

func parseJSONList(value string) []string {
	if strings.TrimSpace(value) == "" {
		return []string{}
	}

	var values []string
	if err := json.Unmarshal([]byte(value), &values); err != nil {
		return []string{}
	}

	return values
}

func deriveProductStatus(stock int) string {
	switch {
	case stock <= 0:
		return "Backorder"
	case stock < 35:
		return "Reorder"
	default:
		return "Healthy"
	}
}

func normalizeOrderStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "new":
		return "New"
	case "packed":
		return "Packed"
	case "shipped":
		return "Shipped"
	case "delayed":
		return "Delayed"
	default:
		return ""
	}
}

func normalizePromotionStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "active":
		return "Active"
	case "scheduled":
		return "Scheduled"
	case "draft":
		return "Draft"
	default:
		return ""
	}
}

func normalizePaymentProvider(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "stripe":
		return "stripe"
	case "razorpay":
		return "razorpay"
	case "paypal":
		return "paypal"
	default:
		return ""
	}
}

func normalizeCheckoutChannel(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "web", "web storefront", "storefront", "online":
		return "Web storefront"
	case "pos", "pos terminal", "point of sale", "in-store", "instore", "store":
		return "POS Terminal"
	default:
		return "Web storefront"
	}
}

func normalizeCheckoutPaymentMethod(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "card":
		return "card"
	case "upi":
		return "upi"
	case "netbanking":
		return "netbanking"
	case "wallet":
		return "wallet"
	case "cod":
		return "cod"
	default:
		return ""
	}
}

func paymentProviderSupportsMethod(provider string, method string) bool {
	supportedMethods := map[string]map[string]bool{
		"stripe": {
			"card": true,
			"upi":  true,
		},
		"razorpay": {
			"card":       true,
			"upi":        true,
			"netbanking": true,
			"cod":        true,
		},
		"paypal": {
			"card":   true,
			"wallet": true,
		},
	}

	return supportedMethods[provider][method]
}

func fulfillmentEtaForStatus(status string) string {
	switch status {
	case "New":
		return "Pack in 24 min"
	case "Packed":
		return "Carrier pickup at 14:30"
	case "Shipped":
		return "Delivered tomorrow"
	case "Delayed":
		return "Address verification pending"
	default:
		return "Awaiting update"
	}
}

func checkoutFulfillmentEta(provider string) string {
	switch provider {
	case "stripe":
		return "Awaiting Stripe placeholder authorization"
	case "razorpay":
		return "Awaiting Razorpay placeholder authorization"
	case "paypal":
		return "Awaiting PayPal placeholder approval"
	default:
		return "Awaiting payment confirmation"
	}
}

func paymentProviderLabel(provider string) string {
	switch provider {
	case "stripe":
		return "Stripe"
	case "razorpay":
		return "Razorpay"
	case "paypal":
		return "PayPal"
	default:
		return provider
	}
}

func paymentMethodLabel(method string) string {
	switch method {
	case "card":
		return "Card"
	case "upi":
		return "UPI"
	case "netbanking":
		return "Net Banking"
	case "wallet":
		return "Wallet"
	case "cod":
		return "Cash on Delivery"
	default:
		return method
	}
}

func paymentPlaceholderMessage(provider string, method string, orderNumber string) string {
	return fmt.Sprintf("%s placeholder prepared for %s using %s. Order %s has been saved and is waiting for real gateway integration.", paymentProviderLabel(provider), paymentMethodLabel(method), paymentProviderLabel(provider), orderNumber)
}

func generateOrderNumber() string {
	return fmt.Sprintf("EC-%d", time.Now().UnixNano()%1000000000)
}

func customerSegmentInsight(segment string) string {
	switch segment {
	case "VIP repeat buyers":
		return "Drive early-access drops and concierge chat support."
	case "At-risk subscribers":
		return "Offer replenishment reminders before churn hits 30 days."
	case "First-order shoppers":
		return "Promote post-purchase education and second-order incentives."
	case "High intent browsers":
		return "Retarget viewed categories within 12 hours for best ROAS."
	default:
		return "Review engagement and convert the next best action into a campaign."
	}
}

func percentage(value int, total int) int {
	if total <= 0 {
		return 0
	}

	return int(math.Round(float64(value) / float64(total) * 100))
}

func percentageInt64(value int64, total int64) int {
	if total <= 0 {
		return 0
	}

	return int(math.Round(float64(value) / float64(total) * 100))
}

func formatCurrencyCompact(cents int64) string {
	dollars := float64(cents) / 100
	if dollars >= 1000 {
		return fmt.Sprintf("$%.1fK", dollars/1000)
	}

	return fmt.Sprintf("$%.0f", dollars)
}

func formatCurrencyFixed(cents int64) string {
	return fmt.Sprintf("$%.2f", float64(cents)/100)
}

func formatCurrencyWhole(cents int64) string {
	return "$" + formatCountInt64(cents/100)
}

func formatCount(value int) string {
	return formatCountInt64(int64(value))
}

func formatCountInt64(value int64) string {
	negative := value < 0
	if negative {
		value = -value
	}

	raw := strconv.FormatInt(value, 10)
	if len(raw) <= 3 {
		if negative {
			return "-" + raw
		}
		return raw
	}

	var builder strings.Builder
	if negative {
		builder.WriteByte('-')
	}

	firstGroup := len(raw) % 3
	if firstGroup == 0 {
		firstGroup = 3
	}
	builder.WriteString(raw[:firstGroup])
	for index := firstGroup; index < len(raw); index += 3 {
		builder.WriteByte(',')
		builder.WriteString(raw[index : index+3])
	}

	return builder.String()
}

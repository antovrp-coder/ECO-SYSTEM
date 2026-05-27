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

type crmOverviewResponse struct {
	Metrics []crmMetricResponse `json:"metrics"`
}

type crmMetricResponse struct {
	Label string `json:"label"`
	Value string `json:"value"`
	Delta string `json:"delta"`
	Copy  string `json:"copy"`
}

type crmLeadResponse struct {
	ID             uint   `json:"id"`
	LeadCode       string `json:"lead_code"`
	CompanyName    string `json:"company_name"`
	ContactName    string `json:"contact_name"`
	Email          string `json:"email"`
	Segment        string `json:"segment"`
	Stage          string `json:"stage"`
	OwnerName      string `json:"owner_name"`
	EstimatedValue string `json:"estimated_value"`
	LastTouchLabel string `json:"last_touch_label"`
	NextStep       string `json:"next_step"`
}

type crmAccountResponse struct {
	ID          uint   `json:"id"`
	AccountCode string `json:"account_code"`
	Name        string `json:"name"`
	Tier        string `json:"tier"`
	Industry    string `json:"industry"`
	Region      string `json:"region"`
	OwnerName   string `json:"owner_name"`
	Renewal     string `json:"renewal_window"`
	Health      string `json:"health_status"`
	AnnualValue string `json:"annual_value"`
}

type crmDealResponse struct {
	ID               uint   `json:"id"`
	DealCode         string `json:"deal_code"`
	AccountName      string `json:"account_name"`
	Stage            string `json:"stage"`
	OwnerName        string `json:"owner_name"`
	ForecastCategory string `json:"forecast_category"`
	CloseDate        string `json:"close_date"`
	Value            string `json:"value"`
	Probability      string `json:"probability"`
	Summary          string `json:"summary"`
}

type createCRMLeadRequest struct {
	LeadCode       string `json:"lead_code"`
	CompanyName    string `json:"company_name"`
	ContactName    string `json:"contact_name"`
	Email          string `json:"email"`
	Segment        string `json:"segment"`
	Stage          string `json:"stage"`
	OwnerName      string `json:"owner_name"`
	EstimatedValue int64  `json:"estimated_value"`
	LastTouchLabel string `json:"last_touch_label"`
	NextStep       string `json:"next_step"`
}

type createCRMAccountRequest struct {
	AccountCode string `json:"account_code"`
	Name        string `json:"name"`
	Tier        string `json:"tier"`
	Industry    string `json:"industry"`
	Region      string `json:"region"`
	OwnerName   string `json:"owner_name"`
	Renewal     string `json:"renewal_window"`
	Health      string `json:"health_status"`
	AnnualValue int64  `json:"annual_value"`
}

type updateCRMDealStageRequest struct {
	Stage string `json:"stage"`
}

func seedCRMData() {
	leads := []CRMLead{
		{LeadCode: "CRM-201", CompanyName: "Northwind Retail", ContactName: "Priya Sethi", Email: "priya@northwind.example", Segment: "Mid-market", Stage: "Qualified", OwnerName: "Rhea Kapoor", EstimatedValueCents: 1840000, LastTouchLabel: "2h ago", NextStep: "Book workflow discovery with operations lead."},
		{LeadCode: "CRM-214", CompanyName: "Atlas Foods", ContactName: "Arman Gill", Email: "arman@atlasfoods.example", Segment: "Enterprise", Stage: "Discovery", OwnerName: "Nitin Joshi", EstimatedValueCents: 3200000, LastTouchLabel: "Yesterday", NextStep: "Send warehouse and demand-planning case study."},
		{LeadCode: "CRM-226", CompanyName: "BluePeak Clinics", ContactName: "Nisha Rao", Email: "nisha@bluepeak.example", Segment: "SMB", Stage: "Proposal", OwnerName: "Rhea Kapoor", EstimatedValueCents: 970000, LastTouchLabel: "Today", NextStep: "Finalize services bundle and security addendum."},
		{LeadCode: "CRM-233", CompanyName: "Orbit Mobility", ContactName: "Vikram Sood", Email: "vikram@orbitmobility.example", Segment: "Enterprise", Stage: "Negotiation", OwnerName: "Kabir Shah", EstimatedValueCents: 4510000, LastTouchLabel: "4h ago", NextStep: "Confirm commercial terms with procurement."},
	}

	accounts := []CRMAccount{
		{AccountCode: "ACC-101", Name: "Apex Fashion House", Tier: "Strategic", Industry: "Retail", Region: "South India", OwnerName: "Rhea Kapoor", RenewalWindow: "Jul 2026", HealthStatus: "Healthy", AnnualValueCents: 6200000},
		{AccountCode: "ACC-118", Name: "SunGrid Energy", Tier: "Growth", Industry: "Energy", Region: "West India", OwnerName: "Kabir Shah", RenewalWindow: "Sep 2026", HealthStatus: "Needs attention", AnnualValueCents: 4100000},
		{AccountCode: "ACC-124", Name: "Mercury Logistics", Tier: "Strategic", Industry: "Logistics", Region: "North India", OwnerName: "Nitin Joshi", RenewalWindow: "Aug 2026", HealthStatus: "Healthy", AnnualValueCents: 7900000},
		{AccountCode: "ACC-139", Name: "Cascade Hotels", Tier: "Scale", Industry: "Hospitality", Region: "Pan India", OwnerName: "Kabir Shah", RenewalWindow: "Jun 2026", HealthStatus: "Expansion", AnnualValueCents: 3550000},
	}

	deals := []CRMDeal{
		{DealCode: "DL-801", AccountName: "Northwind Retail", Stage: "Qualified", OwnerName: "Rhea Kapoor", ForecastCategory: "Commit", CloseDate: "2026-06-21", ValueCents: 1840000, Probability: 65, Summary: "Multi-store finance and POS rollout."},
		{DealCode: "DL-804", AccountName: "Atlas Foods", Stage: "Discovery", OwnerName: "Nitin Joshi", ForecastCategory: "Best case", CloseDate: "2026-07-04", ValueCents: 3200000, Probability: 35, Summary: "Operations stack replacement for cold-chain distribution."},
		{DealCode: "DL-811", AccountName: "BluePeak Clinics", Stage: "Proposal", OwnerName: "Rhea Kapoor", ForecastCategory: "Commit", CloseDate: "2026-05-29", ValueCents: 970000, Probability: 78, Summary: "Outpatient billing and rostering automation."},
		{DealCode: "DL-817", AccountName: "Orbit Mobility", Stage: "Negotiation", OwnerName: "Kabir Shah", ForecastCategory: "Upside", CloseDate: "2026-06-11", ValueCents: 4510000, Probability: 55, Summary: "Manufacturing planning and service inventory alignment."},
	}

	for _, leadSeed := range leads {
		var lead CRMLead
		err := db.Where("lead_code = ?", leadSeed.LeadCode).First(&lead).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			_ = db.Create(&leadSeed).Error
		case err == nil:
			_ = db.Model(&lead).Updates(leadSeed).Error
		}
	}

	for _, accountSeed := range accounts {
		var account CRMAccount
		err := db.Where("account_code = ?", accountSeed.AccountCode).First(&account).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			_ = db.Create(&accountSeed).Error
		case err == nil:
			_ = db.Model(&account).Updates(accountSeed).Error
		}
	}

	for _, dealSeed := range deals {
		var deal CRMDeal
		err := db.Where("deal_code = ?", dealSeed.DealCode).First(&deal).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			_ = db.Create(&dealSeed).Error
		case err == nil:
			_ = db.Model(&deal).Updates(dealSeed).Error
		}
	}
}

func getCRMOverview(c *gin.Context) {
	var leads []CRMLead
	var accounts []CRMAccount
	var deals []CRMDeal

	if err := db.Find(&leads).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load CRM overview"})
		return
	}
	if err := db.Find(&accounts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load CRM overview"})
		return
	}
	if err := db.Find(&deals).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load CRM overview"})
		return
	}

	openPipeline := int64(0)
	commitPipeline := int64(0)
	for _, deal := range deals {
		openPipeline += deal.ValueCents
		if strings.EqualFold(deal.ForecastCategory, "Commit") {
			commitPipeline += deal.ValueCents
		}
	}

	response := crmOverviewResponse{Metrics: []crmMetricResponse{
		{Label: "Open pipeline", Value: formatCurrencyWhole(openPipeline), Delta: "+12%", Copy: "Qualified and proposal-stage deals remain above plan."},
		{Label: "Commit forecast", Value: formatCurrencyWhole(commitPipeline), Delta: "+8%", Copy: "Close confidence improved on active retail and healthcare opportunities."},
		{Label: "Active leads", Value: formatCount(len(leads)), Delta: "+5", Copy: "New discovery activity is concentrated in enterprise and mid-market accounts."},
		{Label: "Managed accounts", Value: formatCount(len(accounts)), Delta: "+2", Copy: "Account coverage now includes more expansion-ready customers."},
	}}

	c.JSON(http.StatusOK, response)
}

func listCRMLeads(c *gin.Context) {
	var leads []CRMLead
	if err := db.Order("updated_at desc, company_name asc").Find(&leads).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load CRM leads"})
		return
	}

	response := make([]crmLeadResponse, 0, len(leads))
	for _, lead := range leads {
		response = append(response, mapCRMLeadResponse(lead))
	}

	c.JSON(http.StatusOK, response)
}

func createCRMLead(c *gin.Context) {
	var req createCRMLeadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	lead := CRMLead{
		LeadCode:            strings.ToUpper(strings.TrimSpace(req.LeadCode)),
		CompanyName:         strings.TrimSpace(req.CompanyName),
		ContactName:         strings.TrimSpace(req.ContactName),
		Email:               strings.TrimSpace(req.Email),
		Segment:             strings.TrimSpace(req.Segment),
		Stage:               strings.TrimSpace(req.Stage),
		OwnerName:           strings.TrimSpace(req.OwnerName),
		EstimatedValueCents: req.EstimatedValue * 100,
		LastTouchLabel:      strings.TrimSpace(req.LastTouchLabel),
		NextStep:            strings.TrimSpace(req.NextStep),
	}

	if lead.LeadCode == "" || lead.CompanyName == "" || lead.ContactName == "" || lead.OwnerName == "" || req.EstimatedValue <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "lead code, company, contact, owner, and value are required"})
		return
	}
	if lead.Stage == "" {
		lead.Stage = "Discovery"
	}
	if lead.LastTouchLabel == "" {
		lead.LastTouchLabel = "Just now"
	}

	if err := db.Create(&lead).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "failed to create lead"})
		return
	}

	c.JSON(http.StatusCreated, mapCRMLeadResponse(lead))
}

func listCRMAccounts(c *gin.Context) {
	var accounts []CRMAccount
	if err := db.Order("annual_value_cents desc, name asc").Find(&accounts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load CRM accounts"})
		return
	}

	response := make([]crmAccountResponse, 0, len(accounts))
	for _, account := range accounts {
		response = append(response, mapCRMAccountResponse(account))
	}

	c.JSON(http.StatusOK, response)
}

func createCRMAccount(c *gin.Context) {
	var req createCRMAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	account := CRMAccount{
		AccountCode:      strings.ToUpper(strings.TrimSpace(req.AccountCode)),
		Name:             strings.TrimSpace(req.Name),
		Tier:             strings.TrimSpace(req.Tier),
		Industry:         strings.TrimSpace(req.Industry),
		Region:           strings.TrimSpace(req.Region),
		OwnerName:        strings.TrimSpace(req.OwnerName),
		RenewalWindow:    strings.TrimSpace(req.Renewal),
		HealthStatus:     strings.TrimSpace(req.Health),
		AnnualValueCents: req.AnnualValue * 100,
	}

	if account.AccountCode == "" || account.Name == "" || account.Region == "" || account.OwnerName == "" || req.AnnualValue <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "account code, name, region, owner, and annual value are required"})
		return
	}
	if account.Tier == "" {
		account.Tier = "Growth"
	}
	if account.HealthStatus == "" {
		account.HealthStatus = "Healthy"
	}

	if err := db.Create(&account).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "failed to create account"})
		return
	}

	c.JSON(http.StatusCreated, mapCRMAccountResponse(account))
}

func listCRMDeals(c *gin.Context) {
	var deals []CRMDeal
	if err := db.Order("close_date asc, updated_at desc").Find(&deals).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load CRM pipeline"})
		return
	}

	response := make([]crmDealResponse, 0, len(deals))
	for _, deal := range deals {
		response = append(response, mapCRMDealResponse(deal))
	}

	c.JSON(http.StatusOK, response)
}

func updateCRMDealStage(c *gin.Context) {
	dealID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid deal id"})
		return
	}

	var req updateCRMDealStageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	stage := normalizeCRMStage(req.Stage)
	if stage == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "valid stage is required"})
		return
	}

	var deal CRMDeal
	if err := db.First(&deal, uint(dealID)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "deal not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load deal"})
		return
	}

	deal.Stage = stage
	if strings.EqualFold(stage, "Closed won") {
		deal.ForecastCategory = "Closed"
		deal.Probability = 100
	} else if strings.EqualFold(stage, "Closed lost") {
		deal.ForecastCategory = "Closed"
		deal.Probability = 0
	}

	if err := db.Save(&deal).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "failed to update deal stage"})
		return
	}

	c.JSON(http.StatusOK, mapCRMDealResponse(deal))
}

func mapCRMLeadResponse(lead CRMLead) crmLeadResponse {
	return crmLeadResponse{
		ID:             lead.ID,
		LeadCode:       lead.LeadCode,
		CompanyName:    lead.CompanyName,
		ContactName:    lead.ContactName,
		Email:          lead.Email,
		Segment:        lead.Segment,
		Stage:          lead.Stage,
		OwnerName:      lead.OwnerName,
		EstimatedValue: formatCurrencyWhole(lead.EstimatedValueCents),
		LastTouchLabel: lead.LastTouchLabel,
		NextStep:       lead.NextStep,
	}
}

func mapCRMAccountResponse(account CRMAccount) crmAccountResponse {
	return crmAccountResponse{
		ID:          account.ID,
		AccountCode: account.AccountCode,
		Name:        account.Name,
		Tier:        account.Tier,
		Industry:    account.Industry,
		Region:      account.Region,
		OwnerName:   account.OwnerName,
		Renewal:     account.RenewalWindow,
		Health:      account.HealthStatus,
		AnnualValue: formatCurrencyWhole(account.AnnualValueCents),
	}
}

func mapCRMDealResponse(deal CRMDeal) crmDealResponse {
	return crmDealResponse{
		ID:               deal.ID,
		DealCode:         deal.DealCode,
		AccountName:      deal.AccountName,
		Stage:            deal.Stage,
		OwnerName:        deal.OwnerName,
		ForecastCategory: deal.ForecastCategory,
		CloseDate:        deal.CloseDate,
		Value:            formatCurrencyWhole(deal.ValueCents),
		Probability:      fmt.Sprintf("%d%%", deal.Probability),
		Summary:          deal.Summary,
	}
}

func normalizeCRMStage(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "discovery":
		return "Discovery"
	case "qualified":
		return "Qualified"
	case "proposal":
		return "Proposal"
	case "negotiation":
		return "Negotiation"
	case "closed won", "won":
		return "Closed won"
	case "closed lost", "lost":
		return "Closed lost"
	default:
		return ""
	}
}
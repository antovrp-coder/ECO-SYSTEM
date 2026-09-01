import { CommonModule } from '@angular/common';
import { Component, effect, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';
import {
  CRMAccount,
  CRMDeal,
  CRMLead,
  CRMOverviewMetric,
  CreateCRMAccountPayload,
  CreateCRMLeadPayload,
  CrmService,
} from '../../services/crm.service';

@Component({
  selector: 'app-crm-workspace',
  imports: [CommonModule, FormsModule],
  templateUrl: './crm-workspace.html',
  styleUrl: './crm-workspace.scss',
})
export class CrmWorkspaceComponent {
  readonly tabName = input.required<string>();
  private readonly crmService = inject(CrmService);
  private readonly notificationService = inject(NotificationService);
  private loadVersion = 0;

  loading = false;
  error = '';
  leadSaving = false;
  accountSaving = false;
  updatingDealId: number | null = null;
  ownerFilter = 'All';

  overviewMetrics: CRMOverviewMetric[] = [];
  leads: CRMLead[] = [];
  accounts: CRMAccount[] = [];
  deals: CRMDeal[] = [];

  leadDraft: CreateCRMLeadPayload = {
    lead_code: '',
    company_name: '',
    contact_name: '',
    email: '',
    segment: 'Mid-market',
    stage: 'Discovery',
    owner_name: '',
    estimated_value: 0,
    last_touch_label: 'Just now',
    next_step: '',
  };

  accountDraft: CreateCRMAccountPayload = {
    account_code: '',
    name: '',
    tier: 'Growth',
    industry: '',
    region: '',
    owner_name: '',
    renewal_window: '',
    health_status: 'Healthy',
    annual_value: 0,
  };

  constructor() {
    effect(() => {
      this.tabName();
      void this.loadWorkspace();
    });
  }

  get owners(): string[] {
    return ['All', ...new Set(this.deals.map((deal) => deal.owner_name))];
  }

  get filteredDeals(): CRMDeal[] {
    if (this.ownerFilter === 'All') {
      return this.deals;
    }

    return this.deals.filter((deal) => deal.owner_name === this.ownerFilter);
  }

  get leadCount(): number {
    return this.leads.length;
  }

  get accountCount(): number {
    return this.accounts.length;
  }

  get highConfidenceDeals(): number {
    return this.deals.filter((deal) => deal.probability === '65%' || deal.probability === '78%' || deal.probability === '100%').length;
  }

  get crmStages(): string[] {
    return ['Discovery', 'Qualified', 'Proposal', 'Negotiation', 'Closed won', 'Closed lost'];
  }

  async createLead(): Promise<void> {
    if (!this.leadDraft.lead_code.trim() || !this.leadDraft.company_name.trim() || !this.leadDraft.contact_name.trim() || !this.leadDraft.owner_name.trim() || this.leadDraft.estimated_value <= 0) {
      this.notificationService.warning('Lead code, company, contact, owner, and value are required.', 3200);
      return;
    }

    this.leadSaving = true;
    try {
      const lead = await this.crmService.createLead({
        ...this.leadDraft,
        lead_code: this.leadDraft.lead_code.trim(),
        company_name: this.leadDraft.company_name.trim(),
        contact_name: this.leadDraft.contact_name.trim(),
        email: this.leadDraft.email.trim(),
        owner_name: this.leadDraft.owner_name.trim(),
        next_step: this.leadDraft.next_step.trim(),
      });
      this.leads = [lead, ...this.leads];
      this.resetLeadDraft();
      this.notificationService.success(`${lead.company_name} added to CRM leads.`, 2600);
    } catch (error) {
      this.notificationService.error(this.describeError(error, 'Failed to create lead.'), 4500);
    } finally {
      this.leadSaving = false;
    }
  }

  async createAccount(): Promise<void> {
    if (!this.accountDraft.account_code.trim() || !this.accountDraft.name.trim() || !this.accountDraft.region.trim() || !this.accountDraft.owner_name.trim() || this.accountDraft.annual_value <= 0) {
      this.notificationService.warning('Account code, name, region, owner, and annual value are required.', 3200);
      return;
    }

    this.accountSaving = true;
    try {
      const account = await this.crmService.createAccount({
        ...this.accountDraft,
        account_code: this.accountDraft.account_code.trim(),
        name: this.accountDraft.name.trim(),
        industry: this.accountDraft.industry.trim(),
        region: this.accountDraft.region.trim(),
        owner_name: this.accountDraft.owner_name.trim(),
        renewal_window: this.accountDraft.renewal_window.trim(),
      });
      this.accounts = [account, ...this.accounts];
      this.resetAccountDraft();
      this.notificationService.success(`${account.name} added to CRM accounts.`, 2600);
    } catch (error) {
      this.notificationService.error(this.describeError(error, 'Failed to create account.'), 4500);
    } finally {
      this.accountSaving = false;
    }
  }

  async updateDealStage(deal: CRMDeal, stage: string): Promise<void> {
    if (deal.stage === stage) {
      return;
    }

    this.updatingDealId = deal.id;
    try {
      const updatedDeal = await this.crmService.updateDealStage(deal.id, stage);
      this.deals = this.deals.map((item) => item.id === updatedDeal.id ? updatedDeal : item);
      this.notificationService.success(`${updatedDeal.deal_code} moved to ${updatedDeal.stage}.`, 2600);
    } catch (error) {
      this.notificationService.error(this.describeError(error, 'Failed to update deal stage.'), 4500);
    } finally {
      this.updatingDealId = null;
    }
  }

  trackById(_index: number, item: { id: number }): number {
    return item.id;
  }

  trackByMetric(_index: number, item: CRMOverviewMetric): string {
    return item.label;
  }

  private async loadWorkspace(): Promise<void> {
    const version = ++this.loadVersion;
    // Keep showing previous content until the new data arrives.
    // Avoid flipping to a full-page loading state on every menu click.
    this.error = '';

    try {
      const [overview, leads, accounts, deals] = await Promise.all([
        this.crmService.getOverview(),
        this.crmService.getLeads(),
        this.crmService.getAccounts(),
        this.crmService.getDeals(),
      ]);

      if (version !== this.loadVersion) {
        return;
      }

      this.overviewMetrics = overview.metrics;
      this.leads = leads;
      this.accounts = accounts;
      this.deals = deals;
    } catch (error) {
      if (version !== this.loadVersion) {
        return;
      }

      this.error = this.describeError(error, 'Failed to load CRM workspace data.');
    } finally {
      if (version === this.loadVersion) {
      // keep loading false
      }
    }
  }

  private resetLeadDraft(): void {
    this.leadDraft = {
      lead_code: '',
      company_name: '',
      contact_name: '',
      email: '',
      segment: 'Mid-market',
      stage: 'Discovery',
      owner_name: '',
      estimated_value: 0,
      last_touch_label: 'Just now',
      next_step: '',
    };
  }

  private resetAccountDraft(): void {
    this.accountDraft = {
      account_code: '',
      name: '',
      tier: 'Growth',
      industry: '',
      region: '',
      owner_name: '',
      renewal_window: '',
      health_status: 'Healthy',
      annual_value: 0,
    };
  }

  private describeError(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return fallback;
  }
}
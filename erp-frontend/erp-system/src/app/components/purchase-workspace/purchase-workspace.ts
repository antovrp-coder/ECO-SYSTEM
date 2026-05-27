import { CommonModule } from '@angular/common';
import { Component, effect, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';
import {
  CreatePurchaseRequisitionPayload,
  CreatePurchaseVendorPayload,
  PurchaseMetric,
  PurchaseOrder,
  PurchaseRequisition,
  PurchaseService,
  PurchaseVendor,
} from '../../services/purchase.service';

@Component({
  selector: 'app-purchase-workspace',
  imports: [CommonModule, FormsModule],
  templateUrl: './purchase-workspace.html',
  styleUrl: './purchase-workspace.scss',
})
export class PurchaseWorkspaceComponent {
  readonly tabName = input.required<string>();
  private readonly purchaseService = inject(PurchaseService);
  private readonly notificationService = inject(NotificationService);
  private loadVersion = 0;

  loading = false;
  error = '';
  requisitionSaving = false;
  vendorSaving = false;
  updatingOrderId: number | null = null;
  vendorFilter = 'All';

  metrics: PurchaseMetric[] = [];
  requisitions: PurchaseRequisition[] = [];
  orders: PurchaseOrder[] = [];
  vendors: PurchaseVendor[] = [];

  requisitionDraft: CreatePurchaseRequisitionPayload = {
    request_code: '',
    title: '',
    department: '',
    requested_by: '',
    priority: 'Medium',
    status: 'Review',
    target_date: '',
    estimated_value: 0,
    summary: '',
  };

  vendorDraft: CreatePurchaseVendorPayload = {
    vendor_code: '',
    name: '',
    category: '',
    region: '',
    contact_name: '',
    email: '',
    lead_time_days: 7,
    status: 'Active',
    annual_spend: 0,
  };

  constructor() {
    effect(() => {
      this.tabName();
      void this.loadWorkspace();
    });
  }

  get vendorNames(): string[] {
    return ['All', ...new Set(this.orders.map((order) => order.vendor_name))];
  }

  get filteredOrders(): PurchaseOrder[] {
    if (this.vendorFilter === 'All') {
      return this.orders;
    }

    return this.orders.filter((order) => order.vendor_name === this.vendorFilter);
  }

  get orderStatuses(): string[] {
    return ['Draft', 'Issued', 'Partial receipt', 'Received', 'Cancelled'];
  }

  async createRequisition(): Promise<void> {
    if (!this.requisitionDraft.request_code.trim() || !this.requisitionDraft.title.trim() || !this.requisitionDraft.department.trim() || !this.requisitionDraft.requested_by.trim() || this.requisitionDraft.estimated_value <= 0) {
      this.notificationService.warning('Request code, title, department, requester, and value are required.', 3200);
      return;
    }

    this.requisitionSaving = true;
    try {
      const requisition = await this.purchaseService.createRequisition({
        ...this.requisitionDraft,
        request_code: this.requisitionDraft.request_code.trim(),
        title: this.requisitionDraft.title.trim(),
        department: this.requisitionDraft.department.trim(),
        requested_by: this.requisitionDraft.requested_by.trim(),
        summary: this.requisitionDraft.summary.trim(),
      });
      this.requisitions = [requisition, ...this.requisitions];
      this.resetRequisitionDraft();
      this.notificationService.success(`${requisition.request_code} added to requisitions.`, 2600);
    } catch (error) {
      this.notificationService.error(this.describeError(error, 'Failed to create requisition.'), 4500);
    } finally {
      this.requisitionSaving = false;
    }
  }

  async createVendor(): Promise<void> {
    if (!this.vendorDraft.vendor_code.trim() || !this.vendorDraft.name.trim() || !this.vendorDraft.region.trim() || !this.vendorDraft.contact_name.trim() || this.vendorDraft.annual_spend <= 0) {
      this.notificationService.warning('Vendor code, name, region, contact, and annual spend are required.', 3200);
      return;
    }

    this.vendorSaving = true;
    try {
      const vendor = await this.purchaseService.createVendor({
        ...this.vendorDraft,
        vendor_code: this.vendorDraft.vendor_code.trim(),
        name: this.vendorDraft.name.trim(),
        category: this.vendorDraft.category.trim(),
        region: this.vendorDraft.region.trim(),
        contact_name: this.vendorDraft.contact_name.trim(),
        email: this.vendorDraft.email.trim(),
      });
      this.vendors = [vendor, ...this.vendors];
      this.resetVendorDraft();
      this.notificationService.success(`${vendor.name} added to vendors.`, 2600);
    } catch (error) {
      this.notificationService.error(this.describeError(error, 'Failed to create vendor.'), 4500);
    } finally {
      this.vendorSaving = false;
    }
  }

  async updateOrderStatus(order: PurchaseOrder, status: string): Promise<void> {
    if (order.status === status) {
      return;
    }

    this.updatingOrderId = order.id;
    try {
      const updatedOrder = await this.purchaseService.updateOrderStatus(order.id, status);
      this.orders = this.orders.map((item) => item.id === updatedOrder.id ? updatedOrder : item);
      this.notificationService.success(`${updatedOrder.order_code} moved to ${updatedOrder.status}.`, 2400);
    } catch (error) {
      this.notificationService.error(this.describeError(error, 'Failed to update order status.'), 4500);
    } finally {
      this.updatingOrderId = null;
    }
  }

  trackByMetric(_index: number, item: PurchaseMetric): string {
    return item.label;
  }

  trackById(_index: number, item: { id: number }): number {
    return item.id;
  }

  private async loadWorkspace(): Promise<void> {
    const version = ++this.loadVersion;
    this.loading = true;
    this.error = '';

    try {
      const [overview, requisitions, orders, vendors] = await Promise.all([
        this.purchaseService.getOverview(),
        this.purchaseService.getRequisitions(),
        this.purchaseService.getOrders(),
        this.purchaseService.getVendors(),
      ]);

      if (version !== this.loadVersion) {
        return;
      }

      this.metrics = overview.metrics;
      this.requisitions = requisitions;
      this.orders = orders;
      this.vendors = vendors;
    } catch (error) {
      if (version !== this.loadVersion) {
        return;
      }

      this.error = this.describeError(error, 'Failed to load purchase workspace data.');
    } finally {
      if (version === this.loadVersion) {
        this.loading = false;
      }
    }
  }

  private resetRequisitionDraft(): void {
    this.requisitionDraft = {
      request_code: '',
      title: '',
      department: '',
      requested_by: '',
      priority: 'Medium',
      status: 'Review',
      target_date: '',
      estimated_value: 0,
      summary: '',
    };
  }

  private resetVendorDraft(): void {
    this.vendorDraft = {
      vendor_code: '',
      name: '',
      category: '',
      region: '',
      contact_name: '',
      email: '',
      lead_time_days: 7,
      status: 'Active',
      annual_spend: 0,
    };
  }

  private describeError(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return fallback;
  }
}
import { CommonModule } from '@angular/common';
import { Component, effect, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';
import {
  CreateInventoryItemPayload,
  CreateInventorySupplierPayload,
  InventoryItem,
  InventoryReport,
  InventoryService,
  InventorySupplier,
} from '../../services/inventory.service';

@Component({
  selector: 'app-inventory-workspace',
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory-workspace.html',
  styleUrl: './inventory-workspace.scss',
})
export class InventoryWorkspaceComponent {
  readonly tabName = input.required<string>();
  private readonly inventoryService = inject(InventoryService);
  private readonly notificationService = inject(NotificationService);
  private loadVersion = 0;

  loading = false;
  error = '';
  itemSaving = false;
  supplierSaving = false;
  adjustingItemId: number | null = null;
  categoryFilter = 'All';

  items: InventoryItem[] = [];
  suppliers: InventorySupplier[] = [];
  reports: InventoryReport[] = [];

  itemDraft: CreateInventoryItemPayload = {
    sku: '',
    name: '',
    category: '',
    warehouse: '',
    supplier_name: '',
    status: 'Healthy',
    reorder_point: 10,
    on_hand: 0,
    reserved: 0,
    incoming: 0,
    unit_cost: 0,
  };

  supplierDraft: CreateInventorySupplierPayload = {
    name: '',
    contact_name: '',
    email: '',
    region: '',
    lead_time_days: 7,
    status: 'Active',
    payment_terms: 'Net 30',
    reliability_score: 85,
    notes: '',
  };

  constructor() {
    effect(() => {
      void this.loadWorkspace();
      this.tabName();
    });
  }

  get categories(): string[] {
    return ['All', ...new Set(this.items.map((item) => item.category))];
  }

  get filteredItems(): InventoryItem[] {
    if (this.categoryFilter === 'All') {
      return this.items;
    }

    return this.items.filter((item) => item.category === this.categoryFilter);
  }

  get skuCount(): number {
    return this.items.length;
  }

  get atRiskCount(): number {
    return this.items.filter((item) => item.status === 'Critical' || item.status === 'Reorder soon').length;
  }

  get inboundUnits(): number {
    return this.items.reduce((total, item) => total + item.incoming, 0);
  }

  get supplierCount(): number {
    return this.suppliers.length;
  }

  async createItem(): Promise<void> {
    if (!this.itemDraft.sku.trim() || !this.itemDraft.name.trim() || !this.itemDraft.category.trim() || !this.itemDraft.warehouse.trim() || !this.itemDraft.supplier_name.trim() || this.itemDraft.unit_cost <= 0) {
      this.notificationService.warning('SKU, name, category, warehouse, supplier, and unit cost are required.', 3200);
      return;
    }

    this.itemSaving = true;
    try {
      const item = await this.inventoryService.createItem({
        ...this.itemDraft,
        sku: this.itemDraft.sku.trim(),
        name: this.itemDraft.name.trim(),
        category: this.itemDraft.category.trim(),
        warehouse: this.itemDraft.warehouse.trim(),
        supplier_name: this.itemDraft.supplier_name.trim(),
        status: this.itemDraft.status.trim(),
      });
      this.items = [item, ...this.items];
      this.resetItemDraft();
      this.notificationService.success(`${item.name} added to inventory.`, 2600);
    } catch (error) {
      this.notificationService.error(this.describeError(error, 'Failed to create inventory item.'), 4500);
    } finally {
      this.itemSaving = false;
    }
  }

  async createSupplier(): Promise<void> {
    if (!this.supplierDraft.name.trim() || !this.supplierDraft.contact_name.trim() || !this.supplierDraft.region.trim()) {
      this.notificationService.warning('Supplier name, contact, and region are required.', 3200);
      return;
    }

    this.supplierSaving = true;
    try {
      const supplier = await this.inventoryService.createSupplier({
        ...this.supplierDraft,
        name: this.supplierDraft.name.trim(),
        contact_name: this.supplierDraft.contact_name.trim(),
        email: this.supplierDraft.email.trim(),
        region: this.supplierDraft.region.trim(),
        status: this.supplierDraft.status.trim(),
        payment_terms: this.supplierDraft.payment_terms.trim(),
        notes: this.supplierDraft.notes.trim(),
      });
      this.suppliers = [supplier, ...this.suppliers];
      this.resetSupplierDraft();
      this.notificationService.success(`${supplier.name} added to suppliers.`, 2600);
    } catch (error) {
      this.notificationService.error(this.describeError(error, 'Failed to create supplier.'), 4500);
    } finally {
      this.supplierSaving = false;
    }
  }

  async adjustOnHand(item: InventoryItem, delta: number): Promise<void> {
    this.adjustingItemId = item.id;
    try {
      const updatedItem = await this.inventoryService.updateItem(item.id, { on_hand: Math.max(0, item.on_hand + delta) });
      this.items = this.items.map((candidate) => candidate.id === updatedItem.id ? updatedItem : candidate);
      this.notificationService.success(`${updatedItem.sku} updated to ${updatedItem.on_hand} on hand.`, 2200);
    } catch (error) {
      this.notificationService.error(this.describeError(error, 'Failed to update stock level.'), 4500);
    } finally {
      this.adjustingItemId = null;
    }
  }

  trackById(_index: number, item: { id: number }): number {
    return item.id;
  }

  private async loadWorkspace(): Promise<void> {
    const version = ++this.loadVersion;
    this.loading = true;
    this.error = '';

    try {
      const [items, suppliers, reports] = await Promise.all([
        this.inventoryService.getItems(),
        this.inventoryService.getSuppliers(),
        this.inventoryService.getReports(),
      ]);

      if (version !== this.loadVersion) {
        return;
      }

      this.items = items;
      this.suppliers = suppliers;
      this.reports = reports;
    } catch (error) {
      if (version !== this.loadVersion) {
        return;
      }

      this.error = this.describeError(error, 'Failed to load inventory workspace data.');
    } finally {
      if (version === this.loadVersion) {
        this.loading = false;
      }
    }
  }

  private resetItemDraft(): void {
    this.itemDraft = {
      sku: '',
      name: '',
      category: '',
      warehouse: '',
      supplier_name: '',
      status: 'Healthy',
      reorder_point: 10,
      on_hand: 0,
      reserved: 0,
      incoming: 0,
      unit_cost: 0,
    };
  }

  private resetSupplierDraft(): void {
    this.supplierDraft = {
      name: '',
      contact_name: '',
      email: '',
      region: '',
      lead_time_days: 7,
      status: 'Active',
      payment_terms: 'Net 30',
      reliability_score: 85,
      notes: '',
    };
  }

  private describeError(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return fallback;
  }
}
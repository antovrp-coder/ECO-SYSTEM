import { CommonModule } from '@angular/common';
import { Component, effect, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CartItem, EcommerceCartService } from '../../services/ecommerce-cart.service';
import { NotificationService } from '../../services/notification.service';
import {
	AnalyticsResponse,
	CampaignItem,
	ChannelPerformance,
	CheckoutPayload,
	CheckoutResponse,
	CommerceMetric,
	CreateProductPayload,
	CustomerSegment,
	CustomerSpotlight,
	EcommerceService,
	FunnelStage,
	OrderItem,
	PaymentMethod,
	PaymentProviderOption,
	ProductItem,
	RegionMetric,
	SavePromotionPayload,
} from '../../services/ecommerce.service';

type ShopperPage = 'browse' | 'details' | 'cart' | 'payment';

interface DetailGalleryFrame {
	label: string;
	headline: string;
	copy: string;
	theme: 'hero' | 'angle' | 'packaging' | 'lifestyle';
	surfaceCopy: string;
	imageIndex: number;
}

interface DetailComparisonRow {
	label: string;
	product: string;
	categoryAverage: string;
}

interface DetailFaqItem {
	question: string;
	answer: string;
}

@Component({
	selector: 'app-ecommerce-workspace',
	imports: [CommonModule, FormsModule],
	templateUrl: './ecommerce-workspace.html',
	styleUrl: './ecommerce-workspace.scss',
})
export class EcommerceWorkspaceComponent {
	readonly tabName = input.required<string>();
	private readonly ecommerceService = inject(EcommerceService);
	readonly cartService = inject(EcommerceCartService);
	private readonly notificationService = inject(NotificationService);
	private loadVersion = 0;
	readonly ratingScale = [1, 2, 3, 4, 5];

	productSearch = '';
	productCategory = 'All';
	orderStatusFilter = 'All';
	campaignStatusFilter = 'All';
	shopperPage: ShopperPage = 'browse';
	selectedProductId: number | null = null;
	selectedGalleryFrameIndex = 0;
	isDetailLightboxOpen = false;
	loading = false;
	error = '';
	productSaving = false;
	promotionSaving = false;
	updatingOrderId: number | null = null;
	selectedPromotionId: number | null = null;
	placingOrder = false;
	checkoutMessage = '';
	promotionName = 'Monsoon Weekend Boost';
	promotionDiscount = 18;
	promotionAudience = 'Returning customers';
	promotionStatus: CampaignItem['status'] = 'Draft';
	promotionChannel = 'Homepage';
	promotionWindow = 'Starts tomorrow 09:00';
	productDraft = {
		sku: '',
		name: '',
		category: '',
		price: 0,
		stock: 0,
		tags: '',
		imageUrls: '',
	};
	checkoutForm = {
		fullName: '',
		email: '',
		phone: '',
		address: '',
		city: '',
	};
	paymentMethod: PaymentMethod = 'upi';
	selectedPaymentProvider = '';

	metrics: CommerceMetric[] = [];
	channels: ChannelPerformance[] = [];
	products: ProductItem[] = [];
	orders: OrderItem[] = [];
	paymentProviders: PaymentProviderOption[] = [];
	customerSegments: CustomerSegment[] = [];
	customerSpotlights: CustomerSpotlight[] = [];
	campaigns: CampaignItem[] = [];
	funnel: FunnelStage[] = [];
	regions: RegionMetric[] = [];
	checklist: string[] = [];

	constructor() {
		effect(() => {
			void this.loadTabData(this.tabName());
		});
	}

	get productCategories(): string[] {
		return ['All', ...new Set(this.products.map((product) => product.category))];
	}

	get filteredProducts(): ProductItem[] {
		const query = this.productSearch.trim().toLowerCase();
		return this.products.filter((product) => {
			const matchesCategory = this.productCategory === 'All' || product.category === this.productCategory;
			const matchesQuery = !query || `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(query);
			return matchesCategory && matchesQuery;
		});
	}

	get storefrontProducts(): ProductItem[] {
		return this.filteredProducts;
	}

	get storefrontDepartments(): string[] {
		return this.productCategories.filter((category) => category !== 'All').slice(0, 8);
	}

	get storefrontHeroProduct(): ProductItem | null {
		return this.storefrontProducts[0] ?? this.products[0] ?? null;
	}

	get selectedProduct(): ProductItem | null {
		if (this.selectedProductId === null) {
			return this.storefrontHeroProduct;
		}

		return this.products.find((product) => product.id === this.selectedProductId) ?? this.storefrontHeroProduct;
	}

	get storefrontDeals(): ProductItem[] {
		const source = this.storefrontProducts.length ? this.storefrontProducts : this.products;
		return source.slice(0, 8);
	}

	get storefrontRecommended(): ProductItem[] {
		const source = this.storefrontProducts.length ? this.storefrontProducts : this.products;
		return [...source].sort((left, right) => right.stock - left.stock).slice(0, 4);
	}

	get storefrontAlsoBought(): ProductItem[] {
		const selectedProductId = this.selectedProduct?.id;
		return this.products.filter((product) => product.id !== selectedProductId).slice(0, 4);
	}

	get detailGalleryFrames(): DetailGalleryFrame[] {
		const product = this.selectedProduct;
		if (!product) {
			return [];
		}

		return [
			{
				label: 'Hero',
				headline: `${product.name} hero view`,
				copy: `${product.name} is staged for premium discovery across ${product.category.toLowerCase()} traffic with a strong first-impression presentation.`,
				theme: 'hero',
				surfaceCopy: 'Front-stage marketplace presentation',
				imageIndex: 0,
			},
			{
				label: 'Angle 2',
				headline: 'Alternate product angle',
				copy: `Secondary angle highlights packaging, finish, and the ${this.storefrontOfferCopy(product).toLowerCase()} merchandising hook.`,
				theme: 'angle',
				surfaceCopy: 'Material and side-profile emphasis',
				imageIndex: 1,
			},
			{
				label: 'Packaging',
				headline: 'Shipping and unboxing view',
				copy: `Packaging is positioned around ${this.storefrontDeliveryCopy(product).toLowerCase()} and marketplace-ready shipment presentation.`,
				theme: 'packaging',
				surfaceCopy: 'Protected delivery and unboxing story',
				imageIndex: 2,
			},
			{
				label: 'Lifestyle',
				headline: 'Lifestyle placement',
				copy: `Lifestyle placement reinforces ${product.category.toLowerCase()} relevance and supports ${product.conversion} conversion performance.`,
				theme: 'lifestyle',
				surfaceCopy: 'In-context usage and editorial framing',
				imageIndex: 3,
			},
		];
	}

	get activeDetailGalleryFrame(): DetailGalleryFrame | null {
		return this.detailGalleryFrames[this.selectedGalleryFrameIndex] ?? this.detailGalleryFrames[0] ?? null;
	}

	get freeShippingMessage(): string {
		if (!this.hasCartItems) {
			return 'Add products worth $250 to unlock free shipping.';
		}

		if (this.cartShipping === 0) {
			return 'Free shipping unlocked for this order.';
		}

		const remaining = Math.max(0, 250 - this.cartSubtotal);
		return `${this.formatCurrency(remaining)} away from free shipping.`;
	}

	get selectedPaymentOption(): PaymentProviderOption | null {
		return this.paymentProviders.find((provider) => provider.id === this.selectedPaymentProvider) ?? null;
	}

	get supportedPaymentMethods(): PaymentMethod[] {
		return this.selectedPaymentOption?.supported_methods ?? [];
	}

	get filteredOrders(): OrderItem[] {
		if (this.orderStatusFilter === 'All') {
			return this.orders;
		}

		return this.orders.filter((order) => order.status === this.orderStatusFilter);
	}

	get visibleCampaigns(): CampaignItem[] {
		if (this.campaignStatusFilter === 'All') {
			return this.campaigns;
		}

		return this.campaigns.filter((campaign) => campaign.status === this.campaignStatusFilter);
	}

	get draftPromotionPreview(): string {
		return `${this.promotionDiscount}% off for ${this.promotionAudience.toLowerCase()} focused on ${this.promotionName}`;
	}

	get orderStatuses(): Array<OrderItem['status']> {
		return ['New', 'Packed', 'Shipped', 'Delayed'];
	}

	get cartItems(): CartItem[] {
		return this.cartService.items();
	}

	get cartSubtotal(): number {
		return this.cartService.subtotal();
	}

	get cartTax(): number {
		return this.cartSubtotal * 0.08;
	}

	get cartShipping(): number {
		if (!this.cartItems.length) {
			return 0;
		}

		return this.cartSubtotal >= 250 ? 0 : 12;
	}

	get cartTotal(): number {
		return this.cartSubtotal + this.cartTax + this.cartShipping;
	}

	get cartItemCount(): number {
		return this.cartService.itemCount();
	}

	get hasCartItems(): boolean {
		return this.cartItemCount > 0;
	}

	addToCart(product: ProductItem) {
		const added = this.cartService.addProduct(product);
		if (!added) {
			this.notificationService.warning(`${product.name} is currently out of stock.`, 2500);
			return;
		}

		this.notificationService.success(`${product.name} added to cart.`, 2200);
	}

	changeCartQuantity(item: CartItem, quantity: number) {
		this.cartService.updateQuantity(item.productId, quantity);
	}

	removeFromCart(item: CartItem) {
		this.cartService.removeProduct(item.productId);
		this.notificationService.info(`${item.name} removed from cart.`, 2200);
	}

	clearCart() {
		this.cartService.clear();
	}

	selectStorefrontCategory(category: string) {
		this.productCategory = category;
		this.shopperPage = 'browse';
	}

	showShopperPage(page: ShopperPage) {
		if (page === 'details' && !this.selectedProduct) {
			this.notificationService.info('Select a product to open the detail page.', 2500);
			return;
		}

		if ((page === 'cart' || page === 'payment') && !this.hasCartItems) {
			this.notificationService.warning('Add products to the cart first.', 2500);
			return;
		}

		this.shopperPage = page;
	}

	openProductDetails(product: ProductItem) {
		this.selectedProductId = product.id;
		this.selectedGalleryFrameIndex = 0;
		this.isDetailLightboxOpen = false;
		this.shopperPage = 'details';
	}

	selectGalleryFrame(index: number) {
		this.selectedGalleryFrameIndex = index;
	}

	openDetailLightbox() {
		if (!this.activeDetailGalleryFrame) {
			return;
		}

		this.isDetailLightboxOpen = true;
	}

	closeDetailLightbox() {
		this.isDetailLightboxOpen = false;
	}

	selectPaymentProvider(providerId: string) {
		this.selectedPaymentProvider = providerId;
		this.ensureSupportedPaymentMethod();
	}

	async placeOrder() {
		if (!this.hasCartItems) {
			this.notificationService.warning('Add items to the cart before checkout.', 2500);
			return;
		}

		if (!this.checkoutForm.fullName.trim() || !this.checkoutForm.email.trim() || !this.checkoutForm.address.trim() || !this.checkoutForm.city.trim()) {
			this.notificationService.warning('Fill in name, email, address, and city before placing the order.', 3000);
			return;
		}

		if (!this.selectedPaymentProvider) {
			this.notificationService.warning('Choose a payment provider before placing the order.', 3000);
			return;
		}

		this.placingOrder = true;
		try {
			const payload: CheckoutPayload = {
				full_name: this.checkoutForm.fullName.trim(),
				email: this.checkoutForm.email.trim(),
				phone: this.checkoutForm.phone.trim(),
				address: this.checkoutForm.address.trim(),
				city: this.checkoutForm.city.trim(),
				payment_provider: this.selectedPaymentProvider,
				payment_method: this.paymentMethod,
				items: this.cartItems.map((item) => ({
					product_id: item.productId,
					quantity: item.quantity,
				})),
			};
			const response: CheckoutResponse = await this.ecommerceService.checkout(payload);
			this.checkoutMessage = response.payment_message;
			this.notificationService.success(`Order ${response.order.order_number} placed with ${response.order.payment_provider}.`, 3500);
			this.cartService.clear();
			await Promise.all([this.loadProducts(), this.loadOrders()]);
			this.checkoutForm = {
				fullName: '',
				email: '',
				phone: '',
				address: '',
				city: '',
			};
			this.shopperPage = 'browse';
		} finally {
			this.placingOrder = false;
		}
	}

	async saveProduct() {
		if (!this.productDraft.sku || !this.productDraft.name || !this.productDraft.category || this.productDraft.price <= 0) {
			this.notificationService.warning('SKU, name, category, and price are required.', 3000);
			return;
		}

		this.productSaving = true;
		try {
			const payload: CreateProductPayload = {
				sku: this.productDraft.sku.trim(),
				name: this.productDraft.name.trim(),
				category: this.productDraft.category.trim(),
				price: this.productDraft.price,
				stock: this.productDraft.stock,
				tags: this.productDraft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
				image_urls: this.productDraft.imageUrls.split(',').map((url) => url.trim()).filter(Boolean),
			};
			await this.ecommerceService.createProduct(payload);
			this.notificationService.success('Product saved to the catalog.', 3000);
			this.resetProductDraft();
			await this.loadProducts();
		} catch (error) {
			this.handleActionError(error, 'Failed to save product.');
		} finally {
			this.productSaving = false;
		}
	}

	async updateOrderStatus(order: OrderItem, status: OrderItem['status']) {
		if (order.status === status) {
			return;
		}

		this.updatingOrderId = order.id;
		try {
			const updatedOrder = await this.ecommerceService.updateOrderStatus(order.id, status);
			this.orders = this.orders.map((item) => item.id === updatedOrder.id ? updatedOrder : item);
			this.notificationService.success(`Order ${updatedOrder.order_number} moved to ${updatedOrder.status}.`, 2500);
		} catch (error) {
			this.handleActionError(error, 'Failed to update order status.');
		} finally {
			this.updatingOrderId = null;
		}
	}

	selectPromotion(promotion: CampaignItem) {
		this.selectedPromotionId = promotion.id;
		this.promotionName = promotion.name;
		this.promotionStatus = promotion.status;
		this.promotionChannel = promotion.channel;
		this.promotionWindow = promotion.window;
		this.promotionDiscount = promotion.discount_percent;
		this.promotionAudience = promotion.audience;
	}

	startNewPromotion() {
		this.selectedPromotionId = null;
		this.promotionName = 'Monsoon Weekend Boost';
		this.promotionStatus = 'Draft';
		this.promotionChannel = 'Homepage';
		this.promotionWindow = 'Starts tomorrow 09:00';
		this.promotionDiscount = 18;
		this.promotionAudience = 'Returning customers';
	}

	async savePromotion() {
		if (!this.promotionName.trim() || !this.promotionChannel.trim() || !this.promotionWindow.trim() || !this.promotionAudience.trim()) {
			this.notificationService.warning('Promotion name, channel, window, and audience are required.', 3000);
			return;
		}

		this.promotionSaving = true;
		const payload: SavePromotionPayload = {
			name: this.promotionName.trim(),
			status: this.promotionStatus,
			channel: this.promotionChannel.trim(),
			window: this.promotionWindow.trim(),
			discount_percent: this.promotionDiscount,
			audience: this.promotionAudience.trim(),
		};

		try {
			if (this.selectedPromotionId) {
				await this.ecommerceService.updatePromotion(this.selectedPromotionId, payload);
				this.notificationService.success('Promotion updated.', 3000);
			} else {
				const created = await this.ecommerceService.createPromotion(payload);
				this.selectedPromotionId = created.id;
				this.notificationService.success('Promotion created.', 3000);
			}
			await this.loadPromotions();
		} catch (error) {
			this.handleActionError(error, 'Failed to save promotion.');
		} finally {
			this.promotionSaving = false;
		}
	}

	trackByLabel(_index: number, item: { label: string }): string {
		return item.label;
	}

	trackByQuestion(_index: number, item: { question: string }): string {
		return item.question;
	}

	trackByName(_index: number, item: { name: string }): string {
		return item.name;
	}

	trackByChannel(_index: number, item: { channel: string }): string {
		return item.channel;
	}

	trackByRegion(_index: number, item: { region: string }): string {
		return item.region;
	}

	trackById(_index: number, item: { id: number }): number {
		return item.id;
	}

	trackByStringId(_index: number, item: { id: string }): string {
		return item.id;
	}

	trackByProductId(_index: number, item: { productId: number }): number {
		return item.productId;
	}

	private async loadTabData(tabName: string) {
		const loadVersion = ++this.loadVersion;
		this.loading = true;
		this.error = '';

		try {
			switch (tabName) {
				case 'Dashboard':
					await this.loadOverview();
					break;
				case 'Storefront':
					await Promise.all([this.loadProducts(), this.loadPaymentOptions()]);
					this.ensureSelectedProduct();
						this.shopperPage = 'browse';
						break;
					case 'Cart':
						await Promise.all([this.loadProducts(), this.loadPaymentOptions()]);
						this.ensureSelectedProduct();
						this.shopperPage = 'cart';
					break;
				case 'Products':
					await this.loadProducts();
					break;
					case 'Payment':
				case 'Checkout':
					await Promise.all([this.loadProducts(), this.loadPaymentOptions()]);
					this.ensureSelectedProduct();
					this.shopperPage = 'payment';
					break;
				case 'Orders':
					await this.loadOrders();
					break;
				case 'Customers':
					await this.loadCustomers();
					break;
				case 'Promotions':
					await this.loadPromotions();
					break;
				case 'Analytics':
					await this.loadAnalytics();
					break;
				default:
					break;
			}
		} catch (error) {
			if (loadVersion !== this.loadVersion) {
				return;
			}

			this.error = this.describeError(error, 'Failed to load e-commerce data.');
		} finally {
			if (loadVersion === this.loadVersion) {
				this.loading = false;
			}
		}
	}

	private async loadOverview() {
		const overview = await this.ecommerceService.getOverview();
		this.metrics = overview.metrics;
		this.channels = overview.channels;
		this.checklist = overview.checklist;
	}

	private async loadProducts() {
		this.products = await this.ecommerceService.getProducts();
	}

	private async loadOrders() {
		this.orders = await this.ecommerceService.getOrders();
	}

	private async loadPaymentOptions() {
		this.paymentProviders = await this.ecommerceService.getPaymentOptions();
		if (!this.paymentProviders.length) {
			this.selectedPaymentProvider = '';
			return;
		}

		const providerExists = this.paymentProviders.some((provider) => provider.id === this.selectedPaymentProvider);
		if (!providerExists) {
			this.selectedPaymentProvider = this.paymentProviders[0].id;
		}

		this.ensureSupportedPaymentMethod();
	}

	private async loadCustomers() {
		const customers = await this.ecommerceService.getCustomers();
		this.customerSegments = customers.segments;
		this.customerSpotlights = customers.spotlights;
	}

	private async loadPromotions() {
		this.campaigns = await this.ecommerceService.getPromotions();
		const selectedPromotion = this.campaigns.find((campaign) => campaign.id === this.selectedPromotionId);
		if (selectedPromotion) {
			this.selectPromotion(selectedPromotion);
			return;
		}

		const defaultDraft = this.campaigns.find((campaign) => campaign.status === 'Draft') ?? this.campaigns[0];
		if (defaultDraft) {
			this.selectPromotion(defaultDraft);
		}
	}

	private async loadAnalytics() {
		const analytics: AnalyticsResponse = await this.ecommerceService.getAnalytics();
		this.funnel = analytics.funnel;
		this.regions = analytics.regions;
	}

	private resetProductDraft() {
		this.productDraft = {
			sku: '',
			name: '',
			category: '',
			price: 0,
			stock: 0,
			tags: '',
			imageUrls: '',
		};
	}

	private handleActionError(error: unknown, fallback: string) {
		const message = this.describeError(error, fallback);
		this.notificationService.error(message, 4500);
	}

	private describeError(error: unknown, fallback: string): string {
		if (error instanceof Error && error.message.trim()) {
			return error.message;
		}

		return fallback;
	}

	formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
		}).format(value);
	}

	storefrontRating(product: ProductItem): number {
		const baseRating = 4.1 + Math.min(product.stock, 40) / 100 + product.tags.length * 0.05;
		return Math.min(4.9, Math.round(baseRating * 10) / 10);
	}

	storefrontReviewCount(product: ProductItem): number {
		return 180 + product.stock * 7 + product.tags.length * 31;
	}

	storefrontListPrice(product: ProductItem): number {
		const price = this.storefrontPriceValue(product);
		const multiplier = 1.14 + (product.tags.length * 0.01);
		return price * multiplier;
	}

	storefrontSavingsPercent(product: ProductItem): number {
		const price = this.storefrontPriceValue(product);
		const listPrice = this.storefrontListPrice(product);
		if (listPrice <= 0) {
			return 0;
		}

		return Math.max(8, Math.round((1 - price / listPrice) * 100));
	}

	storefrontSavingsValue(product: ProductItem): string {
		return this.formatCurrency(Math.max(0, this.storefrontListPrice(product) - this.storefrontPriceValue(product)));
	}

	productImageUrls(product: ProductItem): string[] {
		return product.image_urls.filter((url) => url.trim().length > 0);
	}

	productPrimaryImage(product: ProductItem): string | null {
		return this.productImageUrls(product)[0] ?? null;
	}

	productGalleryImage(product: ProductItem, index: number): string | null {
		const images = this.productImageUrls(product);
		if (!images.length) {
			return null;
		}

		return images[index] ?? images[index % images.length] ?? images[0] ?? null;
	}

	storefrontSellerName(product: ProductItem): string {
		const leadTag = product.tags[0]?.replace(/-/g, ' ');
		if (leadTag) {
			return `${leadTag.replace(/\b\w/g, (char) => char.toUpperCase())} Store`;
		}

		return `${product.category} Marketplace`;
	}

	storefrontDeliveryCopy(product: ProductItem): string {
		if (product.status === 'Backorder') {
			return 'Dispatches in 5 to 7 business days.';
		}

		if (product.stock <= 12) {
			return 'Priority delivery available before end of week.';
		}

		return 'Eligible for fast delivery in 1 to 2 business days.';
	}

	storefrontFeatureBullets(product: ProductItem): string[] {
		return [
			`${product.category} assortment optimized for quick discovery.`,
			`${product.conversion} conversion performance from current storefront traffic.`,
			`${product.stock} units currently available for immediate order allocation.`,
		];
	}

	storefrontComparisonRows(product: ProductItem): DetailComparisonRow[] {
		return [
			{
				label: 'Rating',
				product: `${this.storefrontRating(product)} / 5`,
				categoryAverage: '4.2 / 5',
			},
			{
				label: 'Price',
				product: product.price,
				categoryAverage: this.formatCurrency(this.storefrontPriceValue(product) * 1.08),
			},
			{
				label: 'Review volume',
				product: `${this.storefrontReviewCount(product)} reviews`,
				categoryAverage: '410 reviews',
			},
			{
				label: 'Dispatch speed',
				product: this.storefrontDeliveryCopy(product),
				categoryAverage: '2 to 4 business days',
			},
		];
	}

	storefrontFaqItems(product: ProductItem): DetailFaqItem[] {
		return [
			{
				question: `Is ${product.name} eligible for fast delivery?`,
				answer: this.storefrontDeliveryCopy(product),
			},
			{
				question: 'What makes this product stand out?',
				answer: `${product.name} is performing at ${product.conversion} conversion and is tagged for ${this.storefrontOfferCopy(product).toLowerCase()}.`,
			},
			{
				question: 'Is it a good value right now?',
				answer: `Current marketplace pricing saves ${this.storefrontSavingsValue(product)} against the estimated list price.`,
			},
		];
	}

	storefrontReviewBreakdown(product: ProductItem): Array<{ label: string; percent: number }> {
		const rating = this.storefrontRating(product);
		const fiveStar = Math.min(88, Math.round(rating * 18));
		const fourStar = Math.max(8, 72 - Math.round((5 - rating) * 20));
		const threeStar = Math.max(4, 28 - product.tags.length * 3);
		const twoStar = Math.max(2, 14 - Math.round(product.stock / 10));
		const oneStar = Math.max(1, 8 - Math.round(rating));

		return [
			{ label: '5 star', percent: fiveStar },
			{ label: '4 star', percent: fourStar },
			{ label: '3 star', percent: threeStar },
			{ label: '2 star', percent: twoStar },
			{ label: '1 star', percent: oneStar },
		];
	}

	storefrontBadgeLabels(product: ProductItem): string[] {
		const badges: string[] = [];
		if (product.status === 'Healthy') {
			badges.push('Best Seller');
		}
		if (product.stock <= 12) {
			badges.push('Limited Stock');
		}
		if (product.tags.length >= 2) {
			badges.push('Popular Choice');
		}
		badges.push(`${this.storefrontSavingsPercent(product)}% off`);
		return badges.slice(0, 3);
	}

	storefrontStarFilled(product: ProductItem, star: number): boolean {
		return this.storefrontRating(product) >= star - 0.4;
	}

	storefrontStockCopy(product: ProductItem): string {
		if (product.status === 'Backorder') {
			return 'Currently on backorder';
		}

		if (product.stock <= 12) {
			return `Only ${product.stock} left in stock`;
		}

		return 'Ready for fast dispatch';
	}

	storefrontOfferCopy(product: ProductItem): string {
		if (product.status === 'Reorder') {
			return 'Limited-time restock deal';
		}

		if (product.tags.length) {
			return product.tags.slice(0, 2).join(' • ');
		}

		return `${product.category} essentials`;
	}

	paymentLabel(method: PaymentMethod | string): string {
		switch (method) {
			case 'card':
				return 'Credit or Debit Card';
			case 'upi':
				return 'UPI';
			case 'netbanking':
				return 'Net Banking';
			case 'wallet':
				return 'Wallet';
			case 'cod':
				return 'Cash on Delivery';
			default:
				return method;
		}
	}

	private ensureSelectedProduct() {
		if (this.selectedProductId !== null) {
			return;
		}

		this.selectedProductId = this.products[0]?.id ?? null;
	}

	private ensureSupportedPaymentMethod() {
		if (!this.supportedPaymentMethods.length) {
			return;
		}

		if (!this.supportedPaymentMethods.includes(this.paymentMethod)) {
			this.paymentMethod = this.supportedPaymentMethods[0];
		}
	}

	private storefrontPriceValue(product: ProductItem): number {
		const normalized = product.price.replace(/[^0-9.]/g, '');
		return Number.parseFloat(normalized) || 0;
	}
}
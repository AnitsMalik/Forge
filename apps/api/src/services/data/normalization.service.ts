import crypto from 'crypto';

export type MarketingObjectType =
  | 'Product'
  | 'Offer'
  | 'Event'
  | 'Service'
  | 'Article'
  | 'Property'
  | 'Job'
  | 'Location'
  | 'Customer Review'
  | 'Announcement'
  | 'Campaign';

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface NormalizationResult {
  isValid: boolean;
  objectType: MarketingObjectType;
  title: string;
  normalizedData: Record<string, any>;
  validationErrors: ValidationError[];
}

export interface NormalizationOptions {
  objectType?: string;
  defaultCurrency?: string;
}

export class NormalizationService {
  /**
   * Normalize an incoming record into a standardized Marketing Object.
   */
  public normalize(
    rawRecord: Record<string, any>,
    options: NormalizationOptions = {}
  ): NormalizationResult {
    const raw = this.normalizeKeyCasing(rawRecord);
    const objectType = this.resolveObjectType(raw, options.objectType);

    switch (objectType) {
      case 'Product':
        return this.normalizeProduct(raw, options);
      case 'Offer':
        return this.normalizeOffer(raw, options);
      case 'Event':
        return this.normalizeEvent(raw, options);
      case 'Service':
        return this.normalizeService(raw, options);
      case 'Article':
        return this.normalizeArticle(raw, options);
      case 'Property':
        return this.normalizeProperty(raw, options);
      case 'Job':
        return this.normalizeJob(raw, options);
      case 'Location':
        return this.normalizeLocation(raw, options);
      case 'Customer Review':
        return this.normalizeCustomerReview(raw, options);
      case 'Announcement':
        return this.normalizeAnnouncement(raw, options);
      case 'Campaign':
        return this.normalizeCampaign(raw, options);
      default:
        return this.normalizeProduct(raw, options);
    }
  }

  /**
   * Normalizer for Product marketing objects.
   * Required fields: name, price
   * Standard fields: name, price, discount, image, URL, SKU, availability, status
   */
  private normalizeProduct(raw: Record<string, any>, options: NormalizationOptions): NormalizationResult {
    const errors: ValidationError[] = [];

    const name = this.findFirstValue(raw, ['name', 'product_name', 'product', 'title', 'item_name', 'item']) || '';
    if (!name || String(name).trim() === '') {
      errors.push({ field: 'name', message: 'Product name is required', value: name });
    }

    const rawPrice = this.findFirstValue(raw, ['price', 'regular_price', 'cost', 'amount', 'msrp', 'list_price']);
    const parsedPrice = this.parsePrice(rawPrice);
    if (parsedPrice === null) {
      errors.push({ field: 'price', message: 'Valid price is required', value: rawPrice });
    }

    const rawDiscount = this.findFirstValue(raw, ['discount', 'discount_price', 'sale_price', 'sale', 'promo_price', 'percent_off']);
    const parsedDiscount = rawDiscount !== undefined && rawDiscount !== null && rawDiscount !== '' ? this.parseDiscount(rawDiscount, parsedPrice?.amount) : null;

    const image = this.findFirstValue(raw, ['image', 'image_url', 'photo', 'thumbnail', 'featured_image', 'img', 'picture']) || '';
    const url = this.findFirstValue(raw, ['url', 'product_url', 'link', 'permalink', 'product_link', 'href']) || '';
    const sku = this.findFirstValue(raw, ['sku', 'item_code', 'product_sku', 'barcode', 'id', 'item_id']) || '';

    const availabilityRaw = this.findFirstValue(raw, ['availability', 'stock_status', 'in_stock', 'inventory_status', 'stock']);
    const availability = this.parseAvailability(availabilityRaw);

    const statusRaw = this.findFirstValue(raw, ['status', 'state', 'publish_status', 'active']);
    const status = this.parseStatus(statusRaw);

    const normalizedData = {
      name: String(name).trim(),
      price: parsedPrice ? parsedPrice.formatted : '',
      priceAmount: parsedPrice?.amount ?? 0,
      currency: parsedPrice?.currency || options.defaultCurrency || 'USD',
      discount: parsedDiscount ? parsedDiscount.formatted : null,
      discountAmount: parsedDiscount?.amount ?? null,
      image: String(image).trim(),
      url: String(url).trim(),
      sku: String(sku).trim(),
      availability,
      status,
      category: String(this.findFirstValue(raw, ['category', 'department', 'type']) || '').trim(),
      description: String(this.findFirstValue(raw, ['description', 'desc', 'summary', 'details']) || '').trim(),
    };

    return {
      isValid: errors.length === 0,
      objectType: 'Product',
      title: normalizedData.name || 'Untitled Product',
      normalizedData,
      validationErrors: errors,
    };
  }

  private normalizeOffer(raw: Record<string, any>, options: NormalizationOptions): NormalizationResult {
    const errors: ValidationError[] = [];
    const title = this.findFirstValue(raw, ['title', 'offer_title', 'offer_name', 'name', 'deal', 'promo_name']) || '';
    if (!title) errors.push({ field: 'title', message: 'Offer title is required', value: title });

    const code = this.findFirstValue(raw, ['code', 'promo_code', 'coupon', 'coupon_code', 'voucher']) || '';
    const discount = this.findFirstValue(raw, ['discount', 'discount_percent', 'off', 'savings', 'deal_value']) || '';
    const url = this.findFirstValue(raw, ['url', 'link', 'offer_url']) || '';
    const startDate = this.findFirstValue(raw, ['start_date', 'starts_at', 'valid_from']) || '';
    const endDate = this.findFirstValue(raw, ['end_date', 'expires_at', 'valid_until', 'expiration_date']) || '';

    const normalizedData = {
      title: String(title).trim(),
      code: String(code).trim(),
      discount: String(discount).trim(),
      url: String(url).trim(),
      startDate: String(startDate).trim(),
      endDate: String(endDate).trim(),
      terms: String(this.findFirstValue(raw, ['terms', 'conditions', 'restrictions']) || '').trim(),
      status: this.parseStatus(this.findFirstValue(raw, ['status', 'active'])),
    };

    return {
      isValid: errors.length === 0,
      objectType: 'Offer',
      title: normalizedData.title || 'Untitled Offer',
      normalizedData,
      validationErrors: errors,
    };
  }

  private normalizeEvent(raw: Record<string, any>, options: NormalizationOptions): NormalizationResult {
    const errors: ValidationError[] = [];
    const title = this.findFirstValue(raw, ['title', 'event_name', 'name']) || '';
    if (!title) errors.push({ field: 'title', message: 'Event title is required', value: title });

    const eventDate = this.findFirstValue(raw, ['event_date', 'date', 'starts_at', 'start_time']) || '';
    if (!eventDate) errors.push({ field: 'eventDate', message: 'Event date is required', value: eventDate });

    const location = this.findFirstValue(raw, ['location', 'venue', 'place', 'address']) || '';
    const url = this.findFirstValue(raw, ['url', 'ticket_url', 'registration_url', 'link']) || '';

    const normalizedData = {
      title: String(title).trim(),
      eventDate: String(eventDate).trim(),
      endDate: String(this.findFirstValue(raw, ['end_date', 'ends_at']) || '').trim(),
      location: String(location).trim(),
      url: String(url).trim(),
      ticketPrice: String(this.findFirstValue(raw, ['ticket_price', 'price', 'fee']) || '').trim(),
      status: this.parseStatus(this.findFirstValue(raw, ['status', 'active'])),
    };

    return {
      isValid: errors.length === 0,
      objectType: 'Event',
      title: normalizedData.title || 'Untitled Event',
      normalizedData,
      validationErrors: errors,
    };
  }

  private normalizeService(raw: Record<string, any>, options: NormalizationOptions): NormalizationResult {
    const errors: ValidationError[] = [];
    const name = this.findFirstValue(raw, ['name', 'service_name', 'title']) || '';
    if (!name) errors.push({ field: 'name', message: 'Service name is required', value: name });

    const normalizedData = {
      name: String(name).trim(),
      category: String(this.findFirstValue(raw, ['category', 'service_type', 'type']) || '').trim(),
      price: String(this.findFirstValue(raw, ['price', 'rate', 'cost']) || '').trim(),
      duration: String(this.findFirstValue(raw, ['duration', 'length', 'time']) || '').trim(),
      url: String(this.findFirstValue(raw, ['url', 'booking_url', 'link']) || '').trim(),
      status: this.parseStatus(this.findFirstValue(raw, ['status', 'active'])),
    };

    return {
      isValid: errors.length === 0,
      objectType: 'Service',
      title: normalizedData.name || 'Untitled Service',
      normalizedData,
      validationErrors: errors,
    };
  }

  private normalizeArticle(raw: Record<string, any>, options: NormalizationOptions): NormalizationResult {
    const errors: ValidationError[] = [];
    const title = this.findFirstValue(raw, ['title', 'headline', 'article_title']) || '';
    if (!title) errors.push({ field: 'title', message: 'Article title is required', value: title });

    const normalizedData = {
      title: String(title).trim(),
      author: String(this.findFirstValue(raw, ['author', 'byline', 'writer']) || '').trim(),
      excerpt: String(this.findFirstValue(raw, ['excerpt', 'summary', 'snippet']) || '').trim(),
      url: String(this.findFirstValue(raw, ['url', 'article_url', 'link']) || '').trim(),
      coverImage: String(this.findFirstValue(raw, ['cover_image', 'image', 'thumbnail']) || '').trim(),
      publishedAt: String(this.findFirstValue(raw, ['published_at', 'date', 'publish_date']) || '').trim(),
    };

    return {
      isValid: errors.length === 0,
      objectType: 'Article',
      title: normalizedData.title || 'Untitled Article',
      normalizedData,
      validationErrors: errors,
    };
  }

  private normalizeProperty(raw: Record<string, any>, options: NormalizationOptions): NormalizationResult {
    const errors: ValidationError[] = [];
    const title = this.findFirstValue(raw, ['title', 'property_title', 'name']) || '';
    const address = this.findFirstValue(raw, ['address', 'street_address', 'location']) || '';
    if (!title && !address) errors.push({ field: 'title', message: 'Property title or address is required', value: title });

    const normalizedData = {
      title: String(title || address).trim(),
      address: String(address).trim(),
      city: String(this.findFirstValue(raw, ['city', 'municipality']) || '').trim(),
      price: String(this.findFirstValue(raw, ['price', 'rent', 'list_price']) || '').trim(),
      bedrooms: this.findFirstValue(raw, ['bedrooms', 'beds']) || null,
      bathrooms: this.findFirstValue(raw, ['bathrooms', 'baths']) || null,
      url: String(this.findFirstValue(raw, ['url', 'listing_url', 'link']) || '').trim(),
      status: this.parseStatus(this.findFirstValue(raw, ['status', 'active'])),
    };

    return {
      isValid: errors.length === 0,
      objectType: 'Property',
      title: normalizedData.title || 'Untitled Property',
      normalizedData,
      validationErrors: errors,
    };
  }

  private normalizeJob(raw: Record<string, any>, options: NormalizationOptions): NormalizationResult {
    const errors: ValidationError[] = [];
    const title = this.findFirstValue(raw, ['title', 'job_title', 'position', 'role']) || '';
    if (!title) errors.push({ field: 'title', message: 'Job title is required', value: title });

    const normalizedData = {
      title: String(title).trim(),
      department: String(this.findFirstValue(raw, ['department', 'team', 'division']) || '').trim(),
      location: String(this.findFirstValue(raw, ['location', 'city', 'workplace']) || '').trim(),
      employmentType: String(this.findFirstValue(raw, ['employment_type', 'type', 'contract']) || 'full-time').trim(),
      salary: String(this.findFirstValue(raw, ['salary', 'compensation', 'pay']) || '').trim(),
      url: String(this.findFirstValue(raw, ['url', 'apply_url', 'link']) || '').trim(),
      status: this.parseStatus(this.findFirstValue(raw, ['status', 'active'])),
    };

    return {
      isValid: errors.length === 0,
      objectType: 'Job',
      title: normalizedData.title || 'Untitled Job',
      normalizedData,
      validationErrors: errors,
    };
  }

  private normalizeLocation(raw: Record<string, any>, options: NormalizationOptions): NormalizationResult {
    const errors: ValidationError[] = [];
    const name = this.findFirstValue(raw, ['name', 'location_name', 'store_name', 'branch']) || '';
    if (!name) errors.push({ field: 'name', message: 'Location name is required', value: name });

    const normalizedData = {
      name: String(name).trim(),
      address: String(this.findFirstValue(raw, ['address', 'street']) || '').trim(),
      city: String(this.findFirstValue(raw, ['city']) || '').trim(),
      state: String(this.findFirstValue(raw, ['state', 'province', 'region']) || '').trim(),
      postalCode: String(this.findFirstValue(raw, ['postal_code', 'zip', 'zip_code']) || '').trim(),
      phone: String(this.findFirstValue(raw, ['phone', 'telephone', 'contact']) || '').trim(),
      url: String(this.findFirstValue(raw, ['url', 'maps_url', 'link']) || '').trim(),
    };

    return {
      isValid: errors.length === 0,
      objectType: 'Location',
      title: normalizedData.name || 'Untitled Location',
      normalizedData,
      validationErrors: errors,
    };
  }

  private normalizeCustomerReview(raw: Record<string, any>, options: NormalizationOptions): NormalizationResult {
    const errors: ValidationError[] = [];
    const comment = this.findFirstValue(raw, ['comment', 'review', 'review_text', 'text', 'content', 'testimonial']) || '';
    if (!comment) errors.push({ field: 'comment', message: 'Review comment is required', value: comment });

    const author = this.findFirstValue(raw, ['author', 'customer', 'customer_name', 'reviewer', 'name']) || 'Anonymous';
    const ratingRaw = this.findFirstValue(raw, ['rating', 'stars', 'score']) || 5;
    const rating = Math.min(5, Math.max(1, Number(ratingRaw) || 5));

    const normalizedData = {
      author: String(author).trim(),
      comment: String(comment).trim(),
      rating,
      productName: String(this.findFirstValue(raw, ['product_name', 'product', 'item']) || '').trim(),
      reviewDate: String(this.findFirstValue(raw, ['date', 'review_date', 'created_at']) || new Date().toISOString()).trim(),
      source: String(this.findFirstValue(raw, ['source', 'platform']) || 'google').trim(),
    };

    return {
      isValid: errors.length === 0,
      objectType: 'Customer Review',
      title: `${author}: "${String(comment).slice(0, 40)}..."`,
      normalizedData,
      validationErrors: errors,
    };
  }

  private normalizeAnnouncement(raw: Record<string, any>, options: NormalizationOptions): NormalizationResult {
    const errors: ValidationError[] = [];
    const title = this.findFirstValue(raw, ['title', 'announcement_title', 'headline', 'name']) || '';
    if (!title) errors.push({ field: 'title', message: 'Announcement title is required', value: title });

    const message = this.findFirstValue(raw, ['message', 'content', 'body', 'text']) || '';
    const normalizedData = {
      title: String(title).trim(),
      message: String(message).trim(),
      priority: String(this.findFirstValue(raw, ['priority', 'level', 'urgency']) || 'normal').trim(),
      publishedAt: String(this.findFirstValue(raw, ['published_at', 'date']) || new Date().toISOString()).trim(),
      url: String(this.findFirstValue(raw, ['url', 'link']) || '').trim(),
      status: this.parseStatus(this.findFirstValue(raw, ['status', 'active'])),
    };

    return {
      isValid: errors.length === 0,
      objectType: 'Announcement',
      title: normalizedData.title || 'Untitled Announcement',
      normalizedData,
      validationErrors: errors,
    };
  }

  private normalizeCampaign(raw: Record<string, any>, options: NormalizationOptions): NormalizationResult {
    const errors: ValidationError[] = [];
    const name = this.findFirstValue(raw, ['name', 'campaign_name', 'title']) || '';
    if (!name) errors.push({ field: 'name', message: 'Campaign name is required', value: name });

    const normalizedData = {
      name: String(name).trim(),
      objective: String(this.findFirstValue(raw, ['objective', 'goal', 'type']) || '').trim(),
      startDate: String(this.findFirstValue(raw, ['start_date', 'starts_at']) || '').trim(),
      endDate: String(this.findFirstValue(raw, ['end_date', 'ends_at']) || '').trim(),
      budget: String(this.findFirstValue(raw, ['budget', 'spend']) || '').trim(),
      channels: this.findFirstValue(raw, ['channels', 'platforms']) || ['facebook', 'instagram'],
      status: this.parseStatus(this.findFirstValue(raw, ['status', 'state'])),
    };

    return {
      isValid: errors.length === 0,
      objectType: 'Campaign',
      title: normalizedData.name || 'Untitled Campaign',
      normalizedData,
      validationErrors: errors,
    };
  }

  // --- Helper Methods ---

  private normalizeKeyCasing(record: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(record || {})) {
      const cleanKey = key
        .toLowerCase()
        .replace(/[\s\-_]+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      result[cleanKey] = value;
    }
    return result;
  }

  private findFirstValue(record: Record<string, any>, candidates: string[]): any {
    for (const c of candidates) {
      if (record[c] !== undefined && record[c] !== null && record[c] !== '') {
        return record[c];
      }
    }
    return undefined;
  }

  private resolveObjectType(record: Record<string, any>, hint?: string): MarketingObjectType {
    if (hint) {
      const normalizedHint = hint.toLowerCase().replace(/[\s_-]+/g, '');
      if (normalizedHint.includes('product')) return 'Product';
      if (normalizedHint.includes('offer') || normalizedHint.includes('deal')) return 'Offer';
      if (normalizedHint.includes('event')) return 'Event';
      if (normalizedHint.includes('service')) return 'Service';
      if (normalizedHint.includes('article') || normalizedHint.includes('blog') || normalizedHint.includes('post')) return 'Article';
      if (normalizedHint.includes('property') || normalizedHint.includes('realestate')) return 'Property';
      if (normalizedHint.includes('job') || normalizedHint.includes('career')) return 'Job';
      if (normalizedHint.includes('location') || normalizedHint.includes('store')) return 'Location';
      if (normalizedHint.includes('review') || normalizedHint.includes('testimonial')) return 'Customer Review';
      if (normalizedHint.includes('announcement') || normalizedHint.includes('notice')) return 'Announcement';
      if (normalizedHint.includes('campaign')) return 'Campaign';
    }

    const typeField = this.findFirstValue(record, ['type', 'object_type', 'record_type', 'category']);
    if (typeField && typeof typeField === 'string') {
      const t = typeField.toLowerCase();
      if (t.includes('offer')) return 'Offer';
      if (t.includes('event')) return 'Event';
      if (t.includes('service')) return 'Service';
      if (t.includes('article') || t.includes('blog')) return 'Article';
      if (t.includes('property')) return 'Property';
      if (t.includes('job')) return 'Job';
      if (t.includes('review')) return 'Customer Review';
      if (t.includes('location')) return 'Location';
      if (t.includes('announcement')) return 'Announcement';
      if (t.includes('campaign')) return 'Campaign';
    }

    // Heuristics based on field presence
    if (record['sku'] || record['price'] || record['msrp'] || record['stock']) return 'Product';
    if (record['coupon_code'] || record['promo_code'] || record['discount_percent']) return 'Offer';
    if (record['event_date'] || record['venue']) return 'Event';
    if (record['bedrooms'] || record['bathrooms'] || record['property_type']) return 'Property';
    if (record['job_title'] || record['salary'] || record['department']) return 'Job';
    if (record['rating'] && record['comment']) return 'Customer Review';
    if (record['address'] && record['city'] && record['postal_code']) return 'Location';

    return 'Product';
  }

  private parsePrice(value: any): { amount: number; formatted: string; currency: string } | null {
    if (value === undefined || value === null || value === '') return null;
    const str = String(value).trim();
    // Currency detection
    let currency = 'USD';
    let symbol = '$';
    if (str.includes('€') || str.toLowerCase().includes('eur')) {
      currency = 'EUR';
      symbol = '€';
    } else if (str.includes('£') || str.toLowerCase().includes('gbp')) {
      currency = 'GBP';
      symbol = '£';
    } else if (str.includes('₹') || str.toLowerCase().includes('inr')) {
      currency = 'INR';
      symbol = '₹';
    } else if (str.includes('C$') || str.toLowerCase().includes('cad')) {
      currency = 'CAD';
      symbol = 'C$';
    }

    const cleanNum = str.replace(/[^0-9.,]/g, '').replace(/,/g, '');
    const amount = parseFloat(cleanNum);
    if (isNaN(amount) || amount < 0) return null;

    return {
      amount,
      formatted: `${symbol}${amount.toFixed(2)}`,
      currency,
    };
  }

  private parseDiscount(value: any, basePrice?: number): { amount: number; formatted: string } | null {
    if (value === undefined || value === null || value === '') return null;
    const str = String(value).trim();
    if (str.includes('%')) {
      const pct = parseFloat(str.replace(/[^0-9.]/g, ''));
      if (!isNaN(pct)) {
        return { amount: pct, formatted: `${pct}% OFF` };
      }
    }
    const cleanNum = str.replace(/[^0-9.,]/g, '').replace(/,/g, '');
    const amount = parseFloat(cleanNum);
    if (isNaN(amount) || amount <= 0) return null;
    return { amount, formatted: `$${amount.toFixed(2)} OFF` };
  }

  private parseAvailability(value: any): 'in_stock' | 'out_of_stock' | 'preorder' | 'discontinued' {
    if (value === undefined || value === null) return 'in_stock';
    const str = String(value).toLowerCase().trim();
    if (str === 'true' || str === '1' || str.includes('in stock') || str.includes('available') || str === 'yes') {
      return 'in_stock';
    }
    if (str === 'false' || str === '0' || str.includes('out') || str.includes('unavailable') || str === 'no') {
      return 'out_of_stock';
    }
    if (str.includes('preorder') || str.includes('pre-order') || str.includes('backorder')) {
      return 'preorder';
    }
    return 'in_stock';
  }

  private parseStatus(value: any): 'active' | 'draft' | 'archived' {
    if (!value) return 'active';
    const str = String(value).toLowerCase().trim();
    if (str === 'draft' || str === 'pending' || str === 'inactive' || str === 'paused') return 'draft';
    if (str === 'archived' || str === 'deleted' || str === 'expired') return 'archived';
    return 'active';
  }
}

export const normalizationService = new NormalizationService();

/**
 * Template definitions and generation logic.
 * Migrated from src/js/templates.js — pure functions with no React dependencies.
 *
 * Templates generate messages using profile data accessed through injected
 * getStorePhone/getStoreName/etc. helpers. This keeps the generation functions
 * pure-testable while relying on the profile module for data.
 */

import { sanitizeTemplateData } from './html-utils';
import {
  getStorePhone,
  getStoreName,
  getFullStoreLocation,
  getProductNoun,
  getProductNounPlural,
} from './profile';
import { getEmployeeSignature } from './signature';

// Re-export getEmployeeSignature for consumers that need it
export { getEmployeeSignature } from './signature';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TemplateResult {
  body: string;
  includeSignature: boolean;
}

export interface FieldConfig {
  example: string;
  required: boolean;
  validation?: string;
  dependent?: boolean;
  suggestions?: string[];
}

export interface TemplateDefinition {
  name: string;
  category: string;
  hasEditableSubject?: boolean;
  supportsEML?: boolean;
  supportsMailto?: boolean;
  fields: string[];
  generate: (data: Record<string, string>) => TemplateResult;
}

export interface TemplateHelpText {
  [key: string]: string;
}

// ─── Template metadata help text ────────────────────────────────────────────

export const templateHelp: TemplateHelpText = {
  'new-customer-welcome':
    'Use after a customer visits the store for the first time. Adds them to VIP list.',
  'back-in-stock':
    'Follow up when a previously unavailable item is back. Include hold deadline.',
  'thank-you-warranty':
    'Send after purchase to explain warranty registration and care tips.',
  'weekly-sale':
    'Personalized sale notification for customers who showed interest in specific collections.',
  'new-model-arrival':
    'Alert interested customers when a specific model they asked about arrives.',
  'limited-edition':
    'High-priority notification for VIP collectors about exclusive pieces.',
  'vip-reconnection':
    "Re-engage customers who haven't visited in a while. Mention store evolution.",
  'phone-confirmation':
    'Immediate confirmation after taking a phone order. Include all order details.',
  'phone-shipped':
    'Send when order ships with UPS tracking. Mention signature requirement.',
  'phone-under-500':
    'Internal approval request for phone orders under $500. Manager verification.',
  'phone-corporate':
    'Corporate/bulk order approval. Include purpose and fulfilling store.',
  'inter-store-notification':
    'Notify receiving store that order is prepared and ready for pickup.',
  'text-availability':
    'Quick response to customer inquiry about specific model availability.',
  'text-thank-you':
    'Post-purchase thank you via text. Keep it brief and friendly.',
  'text-interest-followup':
    'Follow up on a specific product the customer showed interest in. Use after store visit.',
};

// ─── Field configuration ─────────────────────────────────────────────────────

export const fieldConfig: Record<string, FieldConfig> = {
  customerName: { example: 'John Smith', required: true },
  employeeName: { example: 'Your name', required: true },
  yourName: { example: 'Your name', required: true },
  brand: {
    example: 'Brand name',
    required: true,
  },
  modelName: { example: 'Model name', required: true },
  modelNumber: { example: 'SKU-12345', required: false },
  price: { example: '299', required: true, validation: 'currency' },
  discount: {
    example: '20',
    required: true,
    validation: 'number',
    dependent: true,
  },
  msrp: {
    example: '399',
    required: true,
    validation: 'currency',
    dependent: true,
  },
  quantity: { example: '2', required: true, validation: 'number' },
  unitsQuantity: { example: '1', required: true, validation: 'number' },
  totalAmount: { example: '299.00', required: true, validation: 'currency' },
  closingTime: { example: '9:00 PM', required: true },
  endDate: { example: 'Sunday', required: true },
  holdDeadline: { example: 'Friday 5PM', required: true },
  trackingNumber: {
    example: '1Z999AA10123456784',
    required: false,
    validation: 'tracking',
  },
  customerId: { example: 'C12345', required: true },
  employeeId: { example: 'E789', required: true },
  warrantyLength: { example: '5-year', required: true },
  warrantyYears: { example: '5', required: true, validation: 'number' },
  carrier: {
    example: 'UPS',
    required: true,
    suggestions: ['UPS', 'FedEx', 'USPS'],
  },
  promoDateRange: { example: 'Nov 28 - Dec 1', required: true },
  promoYear: { example: '2024-2025', required: false },
  promoTitle: { example: 'Leave blank for auto-generation', required: false },
  promoBrand: {
    example: 'Brand name',
    required: true,
  },
  promoDiscount: { example: '60', required: true, validation: 'number' },
  promoCollections: { example: 'Collection A, Collection B', required: false },
  promoCallout: { example: 'Optional special note', required: false },
  keyFeature1: { example: 'Key feature', required: false },
  keyFeature2: { example: 'Another feature', required: false },
  keyFeature3: { example: 'One more feature', required: false },
  limitedDetails: {
    example: 'Limited to 100 pieces worldwide',
    required: true,
  },
  quantityAvailable: { example: '5', required: true, validation: 'number' },
  customerAddress: {
    example: '123 Main St, City, State 12345',
    required: true,
  },
  managerNameOrStoreName: {
    example: 'Store Manager or Store Name',
    required: true,
  },
  creditCardVerified: {
    example: 'Yes',
    required: true,
    suggestions: ['Yes', 'No'],
  },
  needsManagerVerification: {
    example: 'Yes',
    required: true,
    suggestions: ['Yes', 'No'],
  },
  fulfillingStore: { example: 'Downtown Store', required: true },
  recipientStoreName: {
    example: 'Uptown Store',
    required: true,
  },
  collectionName: { example: 'Featured Collection', required: true },
  model1: { example: 'Model A', required: true },
  price1: { example: '299', required: true, validation: 'currency' },
  original1: { example: '399', required: true, validation: 'currency' },
  model2: { example: 'Model B', required: false },
  price2: { example: '349', required: false, validation: 'currency' },
  original2: { example: '449', required: false, validation: 'currency' },
};

export function getFieldSuggestions(field: string): string[] {
  const config = fieldConfig[field] || {};
  return config.suggestions || [];
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function generateGreeting(customerName: string): string {
  return `Hi ${customerName},\n\n`;
}

function generateClosing(): string {
  return `\n\nBest regards,`;
}

/**
 * Calculate sale price from MSRP and discount
 */
export function calculateSalePrice(msrp: number, discount: number): string {
  const salePrice = (msrp * (1 - discount / 100)).toFixed(2);
  return salePrice;
}

/**
 * Convert plain text email body to HTML format.
 * Handles paragraphs, lists, and signature integration.
 */
export function convertTextToHTML(textBody: string): string {
  if (!textBody) return '';

  const esc = (str: string): string => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  // Remove plain text signature if present
  let bodyWithoutSig = textBody;
  const sigMarkers = [
    /\n\n-{5,}\n/,
    /______+/,
    /\n\n[A-Z][a-z]+ [A-Z][a-z]+ │ /,
  ];

  for (const marker of sigMarkers) {
    const match = bodyWithoutSig.match(marker);
    if (match) {
      bodyWithoutSig = bodyWithoutSig.substring(0, match.index).trim();
      break;
    }
  }

  const paragraphs = bodyWithoutSig.split(/\n\n+/);
  const htmlParagraphs = paragraphs.map((para) => {
    const lines = para.split('\n');

    const isList =
      lines.some((line) => line.trim()) &&
      lines.every((line) => {
        const trimmed = line.trim();
        return !trimmed || trimmed.startsWith('•') || trimmed.startsWith('-');
      });

    if (isList) {
      const listItems = lines
        .filter((line) => line.trim())
        .map((line) => {
          const text = line.replace(/^[•-]\s*/, '').trim();
          return `        <li style="margin: 5px 0;">${esc(text)}</li>`;
        })
        .join('\n');
      return `    <ul style="margin: 10px 0; padding-left: 20px; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt;">
${listItems}
    </ul>`;
    } else {
      const htmlContent = para
        .split('\n')
        .map((line) => esc(line))
        .join('<br>');
      return `    <p style="margin: 10px 0; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);">${htmlContent}</p>`;
    }
  });

  const htmlSignature = getEmployeeSignature('html');

  const html = `${htmlParagraphs.join('\n')}

    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
${htmlSignature}
    </div>`;

  return html;
}

/**
 * Assemble final template output with appropriate signature format.
 */
export function assembleTemplateOutput(
  templateResult: TemplateResult | string,
  format: 'text' | 'html' = 'text'
): string {
  if (typeof templateResult === 'string') {
    return templateResult;
  }

  const { body, includeSignature = true } = templateResult;

  if (!includeSignature) {
    return body;
  }

  if (format === 'text') {
    return `${body}\n${getEmployeeSignature('text')}`;
  }

  return body;
}

/**
 * Check if content is HTML or plain text.
 */
export function isHTMLContent(text: string | null | undefined): boolean {
  if (!text) return false;
  const htmlPattern =
    /<(p|div|span|br|html|body|head|table|tr|td|ul|ol|li|h[1-6]|strong|em|a)\b[^>]*>/i;
  return htmlPattern.test(text);
}

/**
 * Extract subject line from a full message string.
 */
export function extractSubjectLine(message: string): string {
  const match = message.match(/^Subject:\s*(.*)/im);
  return match ? match[1] : '';
}

// ─── Template Definitions ─────────────────────────────────────────────────────

export const templates: Record<string, TemplateDefinition> = {
  'new-customer-welcome': {
    name: 'New Customer Welcome',
    category: 'Customer Email',
    hasEditableSubject: true,
    supportsEML: true,
    supportsMailto: true,
    fields: ['customerName', 'employeeName'],
    generate: (data) => {
      const safe = sanitizeTemplateData(data);
      return {
        body: `Subject: Welcome to ${getStoreName()} - Your VIP Access

${generateGreeting(safe.customerName as string)}Thank you for visiting ${getStoreName()}! It was a pleasure helping you explore our offerings today.

I've added you to our VIP email list for weekly promotional updates featuring exclusive pricing on our ${getProductNounPlural()}.

Please don't hesitate to reach out by replying to this email or call the store at ${getStorePhone()}. I would be happy to check availability on any models you're considering.${generateClosing()}`,
        includeSignature: true,
      };
    },
  },
  'back-in-stock': {
    name: 'Back in Stock',
    category: 'Customer Email',
    hasEditableSubject: true,
    supportsEML: true,
    supportsMailto: true,
    fields: [
      'customerName',
      'brand',
      'modelName',
      'modelNumber',
      'price',
      'holdDeadline',
      'employeeName',
    ],
    generate: (data) => {
      const safe = sanitizeTemplateData(data);
      return {
        body: `Subject: Good News! ${safe.brand} ${safe.modelName} is Back in Stock

${generateGreeting(safe.customerName as string)}Great news! The ${safe.brand} ${safe.modelName} (${safe.modelNumber}) you were interested in is back in stock at our store.

Current price: ${safe.price}

I wanted to let you know right away since these tend to move quickly. I can hold one for you until ${safe.holdDeadline} if you'd like.

Please reply to this email or call the store at ${getStorePhone()} to let me know if you'd like me to reserve one for you.

Looking forward to hearing from you!${generateClosing()}`,
        includeSignature: true,
      };
    },
  },
  'thank-you-warranty': {
    name: 'Thank You + Warranty',
    category: 'Customer Email',
    hasEditableSubject: true,
    supportsEML: true,
    supportsMailto: true,
    fields: [
      'customerName',
      'brand',
      'modelName',
      'warrantyYears',
      'price',
      'employeeName',
    ],
    generate: (data) => {
      const safe = sanitizeTemplateData(data);
      return {
        body: `Subject: Thank You for Your ${safe.brand} ${safe.modelName} Purchase!

${generateGreeting(safe.customerName as string)}Thank you for your recent purchase of the ${safe.brand} ${safe.modelName}! I hope you're enjoying your new ${getProductNoun()}.

Warranty Registration & Care Tips:
• Your ${getProductNoun()} comes with a ${safe.warrantyYears}-year manufacturer's warranty
• Register your warranty online at ${(safe.brand as string).toLowerCase()}.com/warranty
• Keep your receipt and warranty card in a safe place
• Follow the care instructions included with your ${getProductNoun()}

If you have any questions about your ${getProductNoun()}'s features or need help with anything, please don't hesitate to reach out. You can call us at ${getStorePhone()} or reply to this email.

Thank you for choosing ${getStoreName()}!${generateClosing()}`,
        includeSignature: true,
      };
    },
  },
  'new-model-arrival': {
    name: 'New Model Arrival',
    category: 'Customer Email',
    hasEditableSubject: true,
    supportsEML: true,
    supportsMailto: true,
    fields: [
      'customerName',
      'brand',
      'modelName',
      'modelNumber',
      'keyFeature1',
      'keyFeature2',
      'keyFeature3',
      'price',
      'employeeName',
    ],
    generate: (data) => {
      const safe = sanitizeTemplateData(data);
      const features = [safe.keyFeature1, safe.keyFeature2, safe.keyFeature3]
        .filter((feature) => feature && (feature as string).trim())
        .map((feature) => `• ${feature}`)
        .join('\n');
      return {
        body: `Subject: Great News! ${safe.modelName} Now Available

${generateGreeting(safe.customerName as string)}Great news! The ${safe.brand} ${safe.modelName} (${safe.modelNumber}) you were interested in has arrived at our store.

Key Features:
${features}

Current price: ${safe.price}

I'd be happy to set up an appointment to show you all the features of this ${getProductNoun()} and let you try it on. This model tends to generate a lot of interest, so I wanted to reach out to you first.

Would you like to schedule a time to see it in person? Please reply to this email or call the store at ${getStorePhone()}.

Looking forward to hearing from you!${generateClosing()}`,
        includeSignature: true,
      };
    },
  },
  'limited-edition': {
    name: 'Limited Edition',
    category: 'Customer Email',
    hasEditableSubject: true,
    supportsEML: true,
    supportsMailto: true,
    fields: [
      'customerName',
      'brand',
      'modelName',
      'modelNumber',
      'limitedDetails',
      'price',
      'quantityAvailable',
      'employeeName',
    ],
    generate: (data) => {
      const safe = sanitizeTemplateData(data);
      return {
        body: `Subject: Exclusive: Limited Edition ${safe.modelName} Available

Hi ${safe.customerName},

I wanted to reach out to you personally because we just received a ${safe.brand} ${safe.modelName} (${safe.modelNumber}) - ${safe.limitedDetails}.

As someone who appreciates fine ${getProductNounPlural()} and unique additions to your collection, I thought you'd want to know about this immediately.

Price: ${safe.price}
Availability: Only ${safe.quantityAvailable} available

This is truly a special piece that won't last long. I'd love to show it to you in person and discuss how it could complement your collection.

Can you stop by this week, or would you like me to hold one for you? Please reply to this email or call the store at ${getStorePhone()}.

Best regards,

P.S. - Given the limited availability, I'm only reaching out to our most valued collectors. Let me know if you're interested!`,
        includeSignature: true,
      };
    },
  },
  'vip-reconnection': {
    name: 'VIP Reconnection',
    category: 'Customer Email',
    hasEditableSubject: true,
    supportsEML: true,
    supportsMailto: true,
    fields: ['customerName', 'employeeName'],
    generate: (data) => {
      const safe = sanitizeTemplateData(data);
      return {
        body: `Subject: Your Store Has Evolved - We'd Love to Show You What's New

 Hi ${safe.customerName},

I was reviewing our VIP client records and noticed it's been a while since your last visit. I wanted to personally reach out because our store has undergone some exciting changes that I think you'll appreciate.

We've expanded our selection - combining the great value you love with access to current season merchandise. This means alongside our clearance deals, you can now find the latest releases and expanded brand offerings.

To welcome you back, I'd like to invite you in for a complimentary visit. Stop by and I'll:
- Show you our latest arrivals and current promotions
- Help you find exactly what you're looking for
- Answer any questions about our ${getProductNounPlural()}
- Walk you through our new brand offerings and store layout

No purchase necessary - I just want to reconnect and make sure you're getting the most out of what we offer.

Would you have time this week or next to stop by? I'd love to show you how we've evolved while maintaining the exceptional values and service you remember.

Best regards,

P.S. - We now carry everything from current season pieces to clearance treasures, giving you more options than ever before.`,
        includeSignature: true,
      };
    },
  },
  'weekly-sale': {
    name: 'Weekly Sale',
    category: 'Customer Email',
    hasEditableSubject: true,
    supportsEML: true,
    supportsMailto: true,
    fields: [
      'customerName',
      'collectionName',
      'discount',
      'brand',
      'model1',
      'price1',
      'original1',
      'model2',
      'price2',
      'original2',
      'endDate',
      'employeeName',
    ],
    generate: (data) => {
      const safe = sanitizeTemplateData(data);
      const models = [
        { name: safe.model1, price: safe.price1, original: safe.original1 },
        { name: safe.model2, price: safe.price2, original: safe.original2 },
      ].filter((model) => model.name && model.price);

      const modelList = models
        .map(
          (model) =>
            `• ${model.name} - Now ${model.price} (was ${model.original})`
        )
        .join('\n');
      return {
        body: `Subject: ${safe.customerName}, This Week's ${safe.brand} Sale Includes Your Favorites

Hi ${safe.customerName},

I remember you were looking at ${safe.collectionName} pieces during your last visit. Good timing - we just started our ${safe.discount}% off promotion on select ${safe.brand} models this week!

Specifically available in that collection:
${modelList}

This promotion runs through ${safe.endDate}. Would you like me to check if we have your size preference in stock?`,
        includeSignature: true,
      };
    },
  },
  'phone-confirmation': {
    name: 'Confirmation',
    category: 'Phone Orders',
    hasEditableSubject: true,
    supportsEML: true,
    supportsMailto: true,
    fields: [
      'customerName',
      'brand',
      'modelName',
      'modelNumber',
      'price',
      'discount',
      'totalAmount',
      'customerAddress',
      'carrier',
      'trackingNumber',
      'employeeName',
    ],
    generate: (data) => {
      const safe = sanitizeTemplateData(data);
      let trackingInfo = '';
      if (safe.trackingNumber) {
        trackingInfo = `\n\nTracking Number: ${safe.trackingNumber}`;
      }
      return {
        body: `Subject: Order Confirmation - ${safe.modelName}

Hi ${safe.customerName},

Thank you for your phone order! This email confirms the following:

Order Details:
Item: ${safe.brand} ${safe.modelName}
Model #: ${safe.modelNumber}
Price: ${safe.price} (includes ${safe.discount}% discount)
Shipping: $20 flat-rate ground shipping
Total: ${safe.totalAmount}

Shipping Information:
${safe.customerAddress}

Your order will ship within 1-2 business days via ${safe.carrier}. You'll receive tracking information at this email address once shipped.${trackingInfo}

If you have any questions, please don't hesitate to contact us at ${getStorePhone()}.

Thank you for shopping with ${getStoreName()}!

Best regards,`,
        includeSignature: true,
      };
    },
  },
  'phone-shipped': {
    name: 'Shipped with Tracking',
    category: 'Phone Orders',
    hasEditableSubject: true,
    supportsEML: true,
    supportsMailto: true,
    fields: [
      'customerName',
      'brand',
      'modelName',
      'modelNumber',
      'trackingNumber',
      'customerAddress',
      'carrier',
      'employeeName',
    ],
    generate: (data) => {
      const safe = sanitizeTemplateData(data);
      return {
        body: `Subject: Your Order - Tracking Information

Hi ${safe.customerName},

Thank you for your recent purchase from ${getStoreName()}! We're pleased to confirm that your order has been shipped and is on its way to you.

Tracking Information:
UPS Tracking Number: ${safe.trackingNumber}

You can track your shipment at the link above or visit ups.com and enter your tracking number.

Your package requires an adult signature upon delivery to ensure safe receipt of your ${getProductNoun()}.

Order Details:
Model: ${safe.modelNumber} - ${safe.modelName}
Shipping Address: ${safe.customerAddress}

If you have any questions about your order or need any assistance, please don't hesitate to reach out. I'm here to help!

We hope you enjoy your new ${safe.brand} ${getProductNoun()}!

Best regards,`,
        includeSignature: true,
      };
    },
  },
  'phone-under-500': {
    name: 'Under $500 Request',
    category: 'Phone Orders',
    hasEditableSubject: true,
    supportsEML: true,
    supportsMailto: true,
    fields: [
      'managerNameOrStoreName',
      'customerName',
      'customerId',
      'employeeName',
      'employeeId',
      'unitsQuantity',
      'totalAmount',
      'creditCardVerified',
      'needsManagerVerification',
    ],
    generate: (data) => {
      const safe = sanitizeTemplateData(data);
      if (
        !safe.creditCardVerified ||
        (safe.creditCardVerified as string).toLowerCase() !== 'yes'
      ) {
        throw new Error(
          'Credit card must be verified before generating this order form.'
        );
      }

      const orderStatus =
        safe.needsManagerVerification &&
        (safe.needsManagerVerification as string).toLowerCase() === 'yes'
          ? 'Ready for manager verification'
          : 'Credit card manager verified - Ready for processing';

      return {
        body: `Subject: Phone Order Form for ${safe.customerName}

Hi ${safe.managerNameOrStoreName},

Attached is the form for the phone order for ${safe.customerName} (${safe.customerId}).

Ringing under: ${safe.employeeName} (${safe.employeeId})
Units: ${safe.unitsQuantity}
Total: ${safe.totalAmount}

Order Status: ${orderStatus}

Best regards,`,
        includeSignature: true,
      };
    },
  },
  'phone-corporate': {
    name: 'Corporate Approval',
    category: 'Phone Orders',
    hasEditableSubject: true,
    supportsEML: true,
    supportsMailto: true,
    fields: [
      'customerName',
      'customerId',
      'employeeName',
      'employeeId',
      'unitsQuantity',
      'totalAmount',
      'fulfillingStore',
    ],
    generate: (data) => {
      const safe = sanitizeTemplateData(data);
      return {
        body: `Subject: Phone Order Approval Request - ${safe.customerName}

Hello,

I am forwarding a request for approval on a phone order for ${safe.employeeName} (${safe.employeeId}).

There are ${safe.unitsQuantity} units totaling ${safe.totalAmount}. It will be fulfilled at ${safe.fulfillingStore}.

Customer: ${safe.customerName} (${safe.customerId})

I have verified and signed off. Please let us know if you have any questions.

 Best regards,`,
        includeSignature: true,
      };
    },
  },
  'inter-store-notification': {
    name: 'Inter-Store Notification',
    category: 'Phone Orders',
    hasEditableSubject: true,
    supportsEML: true,
    supportsMailto: true,
    fields: ['recipientStoreName', 'customerName', 'trackingNumber'],
    generate: (data) => {
      const safe = sanitizeTemplateData(data);
      return {
        body: `Subject: Phone Order Processed and Shipped - ${safe.customerName}

Hi ${safe.recipientStoreName} Team,

The phone order for ${safe.customerName} has been rung and labeled for shipping.

UPS Tracking Number: ${safe.trackingNumber}

The package has been prepared and is ready for UPS pickup.

Best regards,`,
        includeSignature: true,
      };
    },
  },
  'text-availability': {
    name: 'Availability Response',
    category: 'Text',
    fields: ['customerName', 'modelName', 'price', 'closingTime'],
    generate: (data) => {
      const safe = sanitizeTemplateData(data);
      return {
        body: `Hi ${safe.customerName}! Yes, we have the ${safe.modelName} in stock. Current price is ${safe.price} with our discount. We're open until ${safe.closingTime} today if you'd like to stop by, or I can hold it.`,
        includeSignature: false,
      };
    },
  },
  'text-thank-you': {
    name: 'Thank You',
    category: 'Text',
    fields: ['customerName', 'modelName', 'warrantyLength', 'brand'],
    generate: (data) => {
      const safe = sanitizeTemplateData(data);
      return {
        body: `${safe.customerName}, thank you for your purchase today! Your ${safe.modelName} comes with a ${safe.warrantyLength} warranty. Reach out anytime at ${getStorePhone()} for any questions. Enjoy your new ${safe.brand}!`,
        includeSignature: false,
      };
    },
  },
  'text-interest-followup': {
    name: 'Sale Alert',
    category: 'Text',
    fields: [
      'customerName',
      'employeeName',
      'modelName',
      'discount',
      'msrp',
      'endDate',
    ],
    generate: (data) => {
      const safe = sanitizeTemplateData(data);

      const msrp = parseFloat(safe.msrp as string);
      const discount = parseFloat(safe.discount as string);

      if (isNaN(msrp) || msrp <= 0) {
        throw new Error('MSRP must be a valid positive number');
      }
      if (isNaN(discount) || discount < 0 || discount > 100) {
        throw new Error(
          'Discount must be a valid percentage between 0 and 100'
        );
      }

      const salePrice = calculateSalePrice(msrp, discount);

      return {
        body: `Hi ${safe.customerName}! This is ${safe.employeeName} from ${getFullStoreLocation()}. The ${safe.modelName} you were interested in is on ${safe.discount}% OFF promotion (MSRP ${safe.msrp} now ${salePrice} plus tax) until ${safe.endDate}. Please let me know if you'd like me to hold one for you. Thank you!`,
        includeSignature: false,
      };
    },
  },
};

// ─── Template list helpers ────────────────────────────────────────────────────

export type TemplateCategory = 'Customer Email' | 'Phone Orders' | 'Text';

export interface TemplateGroup {
  category: TemplateCategory;
  templates: { key: string; name: string }[];
}

/**
 * Get templates grouped by category.
 */
export function getTemplateGroups(): TemplateGroup[] {
  const groups: Record<string, { key: string; name: string }[]> = {
    'Customer Email': [],
    'Phone Orders': [],
    Text: [],
  };

  Object.entries(templates).forEach(([key, template]) => {
    if (groups[template.category]) {
      groups[template.category].push({ key, name: template.name });
    }
  });

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([category, items]) => ({
      category: category as TemplateCategory,
      templates: items,
    }));
}

/**
 * Get a flat list of all template keys and names.
 */
export function getAllTemplates(): {
  key: string;
  name: string;
  category: string;
}[] {
  return Object.entries(templates).map(([key, template]) => ({
    key,
    name: template.name,
    category: template.category,
  }));
}

/**
 * Search templates by name or category.
 */
export function searchTemplates(
  query: string
): { key: string; name: string; category: string }[] {
  if (!query.trim()) return getAllTemplates();
  const lowerQuery = query.toLowerCase();
  return getAllTemplates().filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.category.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Check if a field is a Yes/No radio field.
 */
export function isYesNoField(fieldName: string): boolean {
  return fieldName.includes('Verified') || fieldName.includes('Verification');
}

/**
 * Check if a field should be a textarea.
 */
export function isTextareaField(fieldName: string): boolean {
  return (
    fieldName.includes('address') ||
    fieldName.includes('Address') ||
    fieldName.includes('Details')
  );
}

/**
 * Format a field name for display (camelCase → Title Case).
 */
export function formatFieldLabel(fieldName: string): string {
  const label = fieldName.replace(/([A-Z])/g, ' $1').trim();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Strip signature from text content.
 */
export function stripSignatureFromText(text: string): string {
  const signatureSeparator = /\n[^\n]*│[^\n]*\n_{10,}/;
  const match = text.match(signatureSeparator);
  if (match) {
    return text.substring(0, match.index).trim();
  }
  return text;
}

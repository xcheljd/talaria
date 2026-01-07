import { appState } from './state.js';
import { getEmployeeSignature as signatureFunction } from './shared/signature.js';
import {
  sanitizeHTML,
  escapeAttr,
  sanitizeTemplateData,
} from './shared/html-utils.js';

// Re-export for backward compatibility
export const getEmployeeSignature = signatureFunction;

// Helper functions to get store info from user profile
export function getStorePhone() {
  return appState.userProfile && appState.userProfile.storePhone
    ? appState.userProfile.storePhone
    : '702-357-8990';
}

export function getStoreName() {
  return appState.userProfile && appState.userProfile.storeName
    ? appState.userProfile.storeName
    : 'Citizen Company Store';
}

export function getStoreLocation() {
  return appState.userProfile && appState.userProfile.storeLocation
    ? appState.userProfile.storeLocation
    : 'the South Premium Outlets';
}

export function getFullStoreLocation() {
  return `Citizen Company Store at ${getStoreLocation()}`;
}

// Note: getEmployeeSignature() has been moved to signature.js module
// Import at top of file: import { getEmployeeSignature } from './signature.js';

/**
 * Convert plain text email body to HTML format
 * Handles paragraphs, lists, and signature integration
 * @param {string} textBody - Plain text email content (without signature)
 * @returns {string} HTML-formatted email body
 */
export function convertTextToHTML(textBody) {
  if (!textBody) return '';

  // Helper function to escape HTML
  const esc = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  // Remove plain text signature if present (will be replaced with HTML version)
  let bodyWithoutSig = textBody;
  const sigMarkers = [
    /\n\n-{5,}\n/, // Dashes separator
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

  // Split into paragraphs (double line break)
  const paragraphs = bodyWithoutSig.split(/\n\n+/);
  const htmlParagraphs = paragraphs.map((para) => {
    const lines = para.split('\n');

    // Check if this is a list (all non-empty lines start with bullet/dash)
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
      // Regular paragraph - convert single line breaks to <br>
      const htmlContent = para
        .split('\n')
        .map((line) => esc(line))
        .join('<br>');
      return `    <p style="margin: 10px 0; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);">${htmlContent}</p>`;
    }
  });

  // Get HTML signature
  const htmlSignature = getEmployeeSignature('html');

  // Build complete HTML body (not full document - just the body content for preview/EML)
  const html = `${htmlParagraphs.join('\n')}

    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
${htmlSignature}
    </div>`;

  return html;
}

// Template metadata with help text
export const templateHelp = {
  'new-customer-welcome':
    'Use after a customer visits the store for the first time. Adds them to VIP list. (Enhanced: editable subject, EML download)',
  'back-in-stock':
    'Follow up when a previously unavailable item is back. Include hold deadline.',
  'thank-you-warranty':
    'Send after purchase to explain warranty registration and care tips.',
  'weekly-sale':
    'Personalized sale notification for customers who showed interest in specific collections. (Enhanced: editable subject, EML download)',
  'new-model-arrival':
    'Alert interested customers when a specific model they asked about arrives. (Enhanced: editable subject, EML download)',
  'limited-edition':
    'High-priority notification for VIP collectors about exclusive pieces. (Enhanced: editable subject, EML download)',
  'vip-reconnection':
    "Re-engage customers who haven't visited in a while. Mention store evolution. (Enhanced: editable subject, EML download)",
  'phone-confirmation':
    'Immediate confirmation after taking a phone order. Include all order details. (Enhanced: editable subject, EML download)',
  'phone-shipped':
    'Send when order ships with UPS tracking. Mention signature requirement. (Enhanced: editable subject, EML download)',
  'phone-under-500':
    'Internal approval request for phone orders under $500. Manager verification. (Enhanced: editable subject, EML download)',
  'phone-corporate':
    'Corporate/bulk order approval. Include purpose and fulfilling store. (Enhanced: editable subject, EML download)',
  'inter-store-notification':
    'Notify receiving store that order is prepared and ready for pickup. (Enhanced: editable subject, EML download)',
  'text-availability':
    'Quick response to customer inquiry about specific model availability.',
  'text-thank-you':
    'Post-purchase thank you via text. Keep it brief and friendly.',
  'text-interest-followup':
    'Follow up on specific watch customer showed interest in. Use after store visit.',
};

// Field examples and validation rules
export const fieldConfig = {
  customerName: { example: 'John Smith', required: true },
  employeeName: { example: 'Your name', required: true },
  yourName: { example: 'Your name', required: true },
  brand: {
    example: 'Citizen',
    required: true,
    suggestions: ['Citizen', 'Bulova', 'Frederique Constant'],
  },
  modelName: { example: 'Eco-Drive Promaster', required: true },
  modelNumber: { example: 'BN0150-28E', required: false },
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
  // Promotion Email fields
  promoDateRange: { example: 'Nov 28 - Dec 1', required: true },
  promoYear: { example: '2024-2025', required: false },
  promoTitle: { example: 'Leave blank for auto-generation', required: false },
  promoBrand: {
    example: 'Citizen',
    required: true,
    suggestions: ['Citizen', 'Bulova', 'Alpina', 'Frederique Constant'],
  },
  promoDiscount: { example: '60', required: true, validation: 'number' },
  promoCollections: { example: 'Corso, Avion, Marine Star', required: false },
  promoCallout: { example: 'Optional special note', required: false },
  // Additional fields for email templates
  keyFeature1: { example: 'Eco-Drive technology', required: false },
  keyFeature2: { example: 'Solar powered', required: false },
  keyFeature3: { example: 'Water resistant to 200m', required: false },
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
  fulfillingStore: { example: 'Las Vegas Premium Outlets', required: true },
  recipientStoreName: {
    example: 'Los Angeles Premium Outlets',
    required: true,
  },
  collectionName: { example: 'Eco-Drive Collection', required: true },
  model1: { example: 'Eco-Drive Promaster', required: true },
  price1: { example: '299', required: true, validation: 'currency' },
  original1: { example: '399', required: true, validation: 'currency' },
  model2: { example: 'Eco-Drive Satellite Wave', required: false },
  price2: { example: '349', required: false, validation: 'currency' },
  original2: { example: '449', required: false, validation: 'currency' },
};

export function getFieldSuggestions(field) {
  const config = fieldConfig[field] || {};
  return config.suggestions || [];
}

// Internal helper: Generate a standard email greeting
function generateGreeting(customerName) {
  return `Hi ${customerName},\n\n`;
}

// Internal helper: Generate a standard email closing
function generateClosing() {
  return `\n\nBest regards,`;
}

/**
 * Assemble final template output with appropriate signature format
 * @param {Object} templateResult - Template result object {body, includeSignature}
 * @param {string} format - Output format: 'text' or 'html'
 * @returns {string} Final assembled output with signature if needed
 */
export function assembleTemplateOutput(templateResult, format = 'text') {
  // Handle legacy string returns (for backward compatibility during migration)
  if (typeof templateResult === 'string') {
    return templateResult;
  }

  const { body, includeSignature = true } = templateResult;

  if (!includeSignature) {
    return body;
  }

  // For text format: append signature block to body
  if (format === 'text') {
    return `${body}\n${getEmployeeSignature('text')}`;
  }

  // For HTML format: return body only (UI will add HTML signature separately)
  return body;
}

/**
 * Calculate sale price from MSRP and discount
 * @param {number} msrp - Manufacturer's suggested retail price
 * @param {number} discount - Discount percentage
 * @returns {string} Formatted sale price
 */
export function calculateSalePrice(msrp, discount) {
  const salePrice = (msrp * (1 - discount / 100)).toFixed(2);
  return salePrice;
}

export const templates = {
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
        body: `Subject: Welcome to Citizen Company Store - Your VIP Access

${generateGreeting(safe.customerName)}Thank you for visiting our Citizen Company Store outlet location! It was a pleasure helping you explore our offerings today.

I've added you to our VIP email list for weekly promotional updates featuring exclusive outlet pricing on our timepieces.

Please don't hesitate to reach out by replying to this email or call the store at ${getStorePhone()}. I would be happy to check availability on any models you're considering.${generateClosing()}`,
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
        .filter((feature) => feature && feature.trim())
        .map((feature) => `• ${feature}`)
        .join('\n');
      return {
        body: `Subject: Great News! ${safe.modelName} Now Available

${generateGreeting(safe.customerName)}Great news! The ${safe.brand} ${safe.modelName} (${safe.modelNumber}) you were interested in has arrived at our store.

Key Features:
${features}

Current price: ${safe.price}

I'd be happy to set up an appointment to show you all the features of this watch and let you try it on. This model tends to generate a lot of interest, so I wanted to reach out to you first.

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

As someone who appreciates fine timepieces and unique additions to your collection, I thought you'd want to know about this immediately.

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

We're now a hybrid store - combining the outlet values you love with access to current season merchandise. This means alongside our clearance deals, you can now find the latest releases and expanded brand offerings.

To welcome you back, I'd like to offer you a complimentary watch service visit. Bring in any of your timepieces and I'll:
- Set and synchronize all your watches
- Perform atomic time synchronization resets
- Help with any complicated functions you're having trouble with
- Show you our new brand offerings and store layout

No purchase necessary - I just want to reconnect and ensure your watches are working perfectly.

Would you have time this week or next to stop by? I'd love to show you how we've evolved while maintaining the exceptional values and service you remember.

Best regards,

P.S. - We now carry everything from current season pieces to discontinued treasures, giving you more options than ever before.`,
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
Price: ${safe.price} (includes ${safe.discount}% outlet discount)
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
        body: `Subject: Your Watch Order - Tracking Information

Hi ${safe.customerName},

Thank you for your recent purchase from ${getStoreName()}! We're pleased to confirm that your order has been shipped and is on its way to you.

Tracking Information:
UPS Tracking Number: ${safe.trackingNumber}

You can track your shipment at the link above or visit ups.com and enter your tracking number.

Your package requires an adult signature upon delivery to ensure safe receipt of your timepiece.

Order Details:
Watch Model: ${safe.modelNumber} - ${safe.modelName}
Shipping Address: ${safe.customerAddress}

If you have any questions about your order or need any assistance, please don't hesitate to reach out. I'm here to help!

We hope you enjoy your new ${safe.brand} timepiece!

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
        safe.creditCardVerified.toLowerCase() !== 'yes'
      ) {
        throw new Error(
          'Credit card must be verified before generating this order form.'
        );
      }

      let orderStatus = '';

      if (
        safe.needsManagerVerification &&
        safe.needsManagerVerification.toLowerCase() === 'yes'
      ) {
        orderStatus = 'Ready for manager verification';
      } else {
        orderStatus = 'Credit card manager verified - Ready for processing';
      }

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
        body: `Hi ${safe.customerName}! Yes, we have the ${safe.modelName} in stock. Current price is ${safe.price} with our outlet discount. We're open until ${safe.closingTime} today if you'd like to stop by, or I can hold it.`,
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

      // Validate numeric fields
      const msrp = parseFloat(safe.msrp);
      const discount = parseFloat(safe.discount);

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
  // Note: promotion-email template has been moved to standalone promotion app
  // See /promotion.html for the Promotion Email Generator
};

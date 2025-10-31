const templates = {
    'new-customer-welcome': {
        name: 'New Customer Welcome',
        category: 'Customer Email',
        fields: ['customerName', 'employeeName'],
        generate: (data) => {
            const safe = sanitizeTemplateData(data);
            return `Subject: Welcome to Citizen Company Store - Your VIP Access

Hi ${safe.customerName},

Thank you for visiting our Citizen Company Store outlet location! It was a pleasure helping you explore our offerings today.

I've added you to our VIP email list for weekly promotional updates featuring exclusive outlet pricing on our timepieces.

Please don't hesitate to reach out by replying to this email or call the store at ${getStorePhone()}. I would be happy to check availability on any models you're considering.

Best regards,
${safe.employeeName}
${getStoreName()}`;
        }
    },
    'new-model-arrival': {
        name: 'New Model Arrival',
        category: 'Customer Email',
        fields: ['customerName', 'brand', 'modelName', 'modelNumber', 'keyFeature1', 'keyFeature2', 'keyFeature3', 'price', 'employeeName'],
        generate: (data) => {
            let features = `• ${data.keyFeature1}`;
            if (data.keyFeature2) features += `\n• ${data.keyFeature2}`;
            if (data.keyFeature3) features += `\n• ${data.keyFeature3}`;
            return `Subject: Great News! ${data.modelName} Now Available

Hi ${data.customerName},

Great news! The ${data.brand} ${data.modelName} (${data.modelNumber}) you were interested in has arrived at our store.

Key Features:
${features}

Current price: ${data.price}

I'd be happy to set up an appointment to show you all the features of this watch and let you try it on. This model tends to generate a lot of interest, so I wanted to reach out to you first.

Would you like to schedule a time to see it in person? Please reply to this email or call the store at ${getStorePhone()}.

Looking forward to hearing from you!

Best regards,
${data.employeeName}
${getStoreName()}`;
        }
    },
    'limited-edition': {
        name: 'Limited Edition',
        category: 'Customer Email',
        fields: ['customerName', 'brand', 'modelName', 'modelNumber', 'limitedDetails', 'price', 'quantityAvailable', 'employeeName'],
        generate: (data) => {
            const safe = sanitizeTemplateData(data);
            return `Subject: Exclusive: Limited Edition ${safe.modelName} Available

Hi ${safe.customerName},

I wanted to reach out to you personally because we just received a ${safe.brand} ${safe.modelName} (${safe.modelNumber}) - ${safe.limitedDetails}.

As someone who appreciates fine timepieces and unique additions to your collection, I thought you'd want to know about this immediately.

Price: ${safe.price}
Availability: Only ${safe.quantityAvailable} available

This is truly a special piece that won't last long. I'd love to show it to you in person and discuss how it could complement your collection.

Can you stop by this week, or would you like me to hold one for you? Please reply to this email or call the store at ${getStorePhone()}.

Best regards,
${safe.employeeName}
${getStoreName()}

P.S. - Given the limited availability, I'm only reaching out to our most valued collectors. Let me know if you're interested!`
    },
    'vip-reconnection': {
        name: 'VIP Reconnection',
        category: 'Customer Email',
        fields: ['clientName', 'employeeName'],
        generate: (data) => `Subject: Your Store Has Evolved - We'd Love to Show You What's New

Hi ${data.clientName},

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
${data.employeeName}
${getStoreName()}

P.S. - We now carry everything from current season pieces to discontinued treasures, giving you more options than ever before.`
    },
    'phone-confirmation': {
        name: 'Confirmation',
        category: 'Phone Orders',
        fields: ['customerName', 'brand', 'modelName', 'modelNumber', 'price', 'discount', 'totalAmount', 'customerAddress', 'carrier', 'trackingNumber', 'employeeName'],
        generate: (data) => {
            let trackingInfo = '';
            if (data.trackingNumber) {
                trackingInfo = `\n\nTracking Number: ${data.trackingNumber}`;
            }
            return `Subject: Order Confirmation - ${data.modelName}

Hi ${data.customerName},

Thank you for your phone order! This email confirms the following:

Order Details:
Item: ${data.brand} ${data.modelName}
Model #: ${data.modelNumber}
Price: ${data.price} (includes ${data.discount}% outlet discount)
Shipping: $20 flat-rate ground shipping
Total: ${data.totalAmount}

Shipping Information:
${data.customerAddress}

Your order will ship within 1-2 business days via ${data.carrier}. You'll receive tracking information at this email address once shipped.${trackingInfo}

If you have any questions, please don't hesitate to contact us at ${getStorePhone()}.

Thank you for shopping with ${getStoreName()}!

Best regards,
${data.employeeName}
${getStoreName()}`;
        }
    },
    'phone-shipped': {
        name: 'Shipped with Tracking',
        category: 'Phone Orders',
        fields: ['customerName', 'brand', 'modelName', 'modelNumber', 'trackingNumber', 'customerAddress', 'employeeName'],
        generate: (data) => {
            return `Subject: Your Watch Order - Tracking Information

Hi ${data.customerName},

Thank you for your recent purchase from ${getStoreName()}! We're pleased to confirm that your order has been shipped and is on its way to you.

Tracking Information:
UPS Tracking Number: ${data.trackingNumber}

You can track your shipment at the link above or visit ups.com and enter your tracking number.

Your package requires an adult signature upon delivery to ensure safe receipt of your timepiece.

Order Details:
Watch Model: ${data.modelNumber} - ${data.modelName}
Shipping Address: ${data.customerAddress}

If you have any questions about your order or need any assistance, please don't hesitate to reach out. I'm here to help!

We hope you enjoy your new ${data.brand} timepiece!

Best regards,
${data.employeeName}
${getStoreName()}`;
        }
    },
    'phone-under-500': {
        name: 'Under $500 Request',
        category: 'Phone Orders',
        fields: ['managerNameOrStoreName', 'customerName', 'customerId', 'employeeName', 'employeeId', 'unitsQuantity', 'totalAmount', 'creditCardVerified', 'needsManagerVerification'],
        generate: (data) => {
            if (!data.creditCardVerified || data.creditCardVerified.toLowerCase() !== 'yes') {
                throw new Error('Credit card must be verified before generating this order form.');
            }

            let orderStatus = '';
            let closing = '';

            if (data.needsManagerVerification && data.needsManagerVerification.toLowerCase() === 'yes') {
                orderStatus = 'Ready for manager verification';
                closing = 'Please verify and sign off. If you need anything else, please let me know.';
            } else {
                orderStatus = 'Credit card manager verified - Ready for processing';
                closing = 'Let me know if you need anything else.';
            }

            return `Subject: Phone Order Form for ${data.customerName}

Hi ${data.managerNameOrStoreName},

Attached is the form for the phone order for ${data.customerName} (${data.customerId}).

Ringing under: ${data.employeeName} (${data.employeeId})
Units: ${data.unitsQuantity}
Total: ${data.totalAmount}

Order Status: ${orderStatus}

${closing}

Best regards,
${data.employeeName}`;
        }
    },
    'phone-corporate': {
        name: 'Corporate Approval',
        category: 'Phone Orders',
        fields: ['customerName', 'customerId', 'employeeName', 'employeeId', 'unitsQuantity', 'totalAmount', 'fulfillingStore', 'yourName'],
        generate: (data) => `Subject: Phone Order Approval Request - ${data.customerName}

Hello,

I am forwarding a request for approval on a phone order for ${data.employeeName} (${data.employeeId}).

There are ${data.unitsQuantity} units totaling ${data.totalAmount}. It will be fulfilled at ${data.fulfillingStore}.

Customer: ${data.customerName} (${data.customerId})

I have verified and signed off. Please let us know if you have any questions.

Thank You,
${data.yourName}`
    },
    'inter-store-notification': {
        name: 'Inter-Store Notification',
        category: 'Phone Orders',
        fields: ['recipientStoreName', 'customerName', 'trackingNumber'],
        generate: (data) => `Subject: Phone Order Processed and Shipped - ${data.customerName}

Hi ${data.recipientStoreName} Team,

The phone order for ${data.customerName} has been rung and labeled for shipping.

UPS Tracking Number: ${data.trackingNumber}

The package has been prepared and is ready for UPS pickup.

Thank you,`
    },
    'text-availability': {
        name: 'Availability Response',
        category: 'Text',
        fields: ['customerName', 'modelName', 'price', 'closingTime'],
        generate: (data) => {
            const safe = sanitizeTemplateData(data);
            return `Hi ${safe.customerName}! Yes, we have the ${safe.modelName} in stock. Current price is ${safe.price} with our outlet discount. We're open until ${safe.closingTime} today if you'd like to stop by, or I can hold it.`;
        }
    },
    'text-thank-you': {
        name: 'Thank You',
        category: 'Text',
        fields: ['customerName', 'modelName', 'warrantyLength', 'brand'],
        generate: (data) => {
            const safe = sanitizeTemplateData(data);
            return `${safe.customerName}, thank you for your purchase today! Your ${safe.modelName} comes with a ${safe.warrantyLength} warranty. Reach out anytime at ${getStorePhone()} for any questions. Enjoy your new ${safe.brand}!`;
        }
    },
    'text-interest-followup': {
        name: 'Sale Alert',
        category: 'Text',
        fields: ['customerName', 'employeeName', 'modelName', 'discount', 'msrp', 'endDate'],
        generate: (data) => {
            const safe = sanitizeTemplateData(data);
            const msrp = parseFloat(safe.msrp) || 0;
            const discount = parseFloat(safe.discount) || 0;
            const salePrice = (msrp * (1 - discount / 100)).toFixed(2);

            const message = `Hi ${safe.customerName}! This is ${safe.employeeName} from ${getFullStoreLocation()}. The ${safe.modelName} you were interested in is on ${safe.discount}% OFF promotion (MSRP ${safe.msrp} now ${salePrice} plus tax) until ${safe.endDate}. Please let me know if you'd like me to hold one for you. Thank you!`;
            return message;
        }
    },
    'promotion-email': {
        name: 'Promotion Email (HTML)',
        category: 'Customer Email',
        fields: ['promoDateRange', 'promoTitle'],
        customTemplate: true, // Special flag for custom rendering
        generate: (data) => {
            // This will be called by custom generation logic
            return generatePromotionEmailHTML(data);
        }
    },

// Constants
const TOAST_DURATION_MS = 2500;
const STORE_PHONE = '702-357-8990';
const STORE_NAME = 'Citizen Company Store';

// Template metadata with help text
const templateHelp = {
    'new-customer-welcome': 'Use after a customer visits the store for the first time. Adds them to VIP list.',
    'back-in-stock': 'Follow up when a previously unavailable item is back. Include hold deadline.',
    'thank-you-warranty': 'Send after purchase to explain warranty registration and care tips.',
    'weekly-sale': 'Personalized sale notification for customers who showed interest in specific collections.',
    'new-model-arrival': 'Alert interested customers when a specific model they asked about arrives.',
    'limited-edition': 'High-priority notification for VIP collectors about exclusive pieces.',
    'vip-reconnection': 'Re-engage customers who haven\'t visited in a while. Mention store evolution.',
    'phone-confirmation': 'Immediate confirmation after taking a phone order. Include all order details.',
    'phone-shipped': 'Send when order ships with UPS tracking. Mention signature requirement.',
    'phone-under-500': 'Internal approval request for phone orders under $500. Manager verification.',
    'phone-corporate': 'Corporate/bulk order approval. Include purpose and fulfilling store.',
    'inter-store-notification': 'Notify receiving store that order is prepared and ready for pickup.',
    'text-availability': 'Quick response to customer inquiry about specific model availability.',
    'text-thank-you': 'Post-purchase thank you via text. Keep it brief and friendly.',
    'text-interest-followup': 'Follow up on specific watch customer showed interest in. Use after store visit.'
};

// Field examples and validation rules
const fieldConfig = {
    customerName: { example: 'John Smith', required: true },
    employeeName: { example: 'Your name', required: true },
    yourName: { example: 'Your name', required: true },
    clientName: { example: 'John Smith', required: true },
    brand: { example: 'Citizen', required: true, suggestions: ['Citizen', 'Bulova', 'Frederique Constant'] },
    modelName: { example: 'Eco-Drive Promaster', required: true },
    modelNumber: { example: 'BN0150-28E', required: false },
    price: { example: '299', required: true, validation: 'currency' },
    discount: { example: '20', required: true, validation: 'number', dependent: true },
    msrp: { example: '399', required: true, validation: 'currency', dependent: true },
    quantity: { example: '2', required: true, validation: 'number' },
    unitsQuantity: { example: '1', required: true, validation: 'number' },
    totalAmount: { example: '299.00', required: true, validation: 'currency' },
    closingTime: { example: '9:00 PM', required: true },
    endDate: { example: 'Sunday', required: true },
    holdDeadline: { example: 'Friday 5PM', required: true },
    trackingNumber: { example: '1Z999AA10123456784', required: false, validation: 'tracking' },
    customerId: { example: 'C12345', required: true },
    employeeId: { example: 'E789', required: true },
    warrantyLength: { example: '5-year', required: true },
    warrantyYears: { example: '5', required: true, validation: 'number' },
    carrier: { example: 'UPS', required: true, suggestions: ['UPS', 'FedEx', 'USPS'] }
};

// Utility function to sanitize HTML and prevent XSS
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Utility function to escape HTML attributes
function escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getFieldSuggestions(field) {
    const config = fieldConfig[field] || {};
    return config.suggestions || [];
}

function formatPhoneNumber(value) {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
}

function validateTracking(value) {
    // UPS: 1Z followed by 16 characters
    const upsPattern = /^1Z[0-9A-Z]{16}$/i;
    // FedEx: 12 or 14 digits
    const fedexPattern = /^\d{12}(\d{2})?$/;
    // USPS: 20 or 22 digits
    const uspsPattern = /^\d{20}(\d{2})?$/;

    return upsPattern.test(value) || fedexPattern.test(value) || uspsPattern.test(value);
}

const templates = {
    'new-customer-welcome': {
        name: 'New Customer Welcome',
        category: 'Customer Email',
        fields: ['customerName', 'employeeName'],
        generate: (data) => `Subject: Welcome to Citizen Company Store - Your VIP Access

Hi ${data.customerName},

Thank you for visiting our Citizen Company Store outlet location! It was a pleasure helping you explore our offerings today.

I've added you to our VIP email list for weekly promotional updates featuring exclusive outlet pricing on our timepieces.

Please don't hesitate to reach out by replying to this email or call the store at ${STORE_PHONE}. I would be happy to check availability on any models you're considering.

Best regards,
${data.employeeName}
${STORE_NAME}`
    },
    'back-in-stock': {
        name: 'Back in Stock',
        category: 'Customer Email',
        fields: ['customerName', 'brand', 'modelName', 'modelNumber', 'price', 'discount', 'quantity', 'holdDeadline', 'employeeName'],
        generate: (data) => `Subject: Good News! ${data.modelName} Now Available

Hi ${data.customerName},

Great news! The ${data.brand} ${data.modelName} (${data.modelNumber}) you inquired about is now back in stock at our outlet location.

Current outlet price: ${data.price} (${data.discount}% off retail)
Quantity available: ${data.quantity}

This model tends to sell quickly at this price point. If you'd like me to hold one for you, please let me know by ${data.holdDeadline}, or feel free to call the store at ${STORE_PHONE}.

We can also arrange shipping for $20 flat-rate ground delivery within the US if you're unable to visit the store.

Looking forward to hearing from you!

Best regards,
${data.employeeName}
${STORE_NAME}`
    },
    'thank-you-warranty': {
        name: 'Thank You & Warranty',
        category: 'Customer Email',
        fields: ['customerName', 'modelName', 'modelNumber', 'brand', 'employeeName'],
        generate: (data) => `Subject: Thank You for Your Purchase - Register for Additional Warranty

Hi ${data.customerName},

Thank you for your purchase of the ${data.brand} ${data.modelName} (${data.modelNumber})!

I can help you register your watch online to receive an additional 1-year warranty at no cost. This extends your coverage and ensures you get the most out of your timepiece.

If you'd like assistance with registration or have any questions about your new watch, please reply to this email or call the store at ${STORE_PHONE}.

Thank you again for choosing ${STORE_NAME}!

Best regards,
${data.employeeName}
${STORE_NAME}`
    },
    'weekly-sale': {
        name: 'Weekly Sale',
        category: 'Customer Email',
        fields: ['customerName', 'collectionName', 'discount', 'brand', 'model1', 'price1', 'original1', 'model2', 'price2', 'original2', 'endDate', 'employeeName'],
        generate: (data) => {
            let modelList = `• ${data.model1} - Now ${data.price1} (was ${data.original1})`;
            if (data.model2 && data.price2) {
                modelList += `\n• ${data.model2} - Now ${data.price2} (was ${data.original2})`;
            }
            return `Subject: ${data.customerName}, This Week's ${data.brand} Sale Includes Your Favorites

Hi ${data.customerName},

I remember you were looking at ${data.collectionName} pieces during your last visit. Good timing - we just started our ${data.discount}% off promotion on select ${data.brand} models this week!

Specifically available in that collection:
${modelList}

This promotion runs through ${data.endDate}. Would you like me to check if we have your size preference in stock?

Best regards,
${data.employeeName}
${STORE_NAME}`;
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

Would you like to schedule a time to see it in person? Please reply to this email or call the store at ${STORE_PHONE}.

Looking forward to hearing from you!

Best regards,
${data.employeeName}
${STORE_NAME}`;
        }
    },
    'limited-edition': {
        name: 'Limited Edition',
        category: 'Customer Email',
        fields: ['customerName', 'brand', 'modelName', 'modelNumber', 'limitedDetails', 'price', 'quantityAvailable', 'employeeName'],
        generate: (data) => `Subject: Exclusive: Limited Edition ${data.modelName} Available

Hi ${data.customerName},

I wanted to reach out to you personally because we just received a ${data.brand} ${data.modelName} (${data.modelNumber}) - ${data.limitedDetails}.

As someone who appreciates fine timepieces and unique additions to your collection, I thought you'd want to know about this immediately.

Price: ${data.price}
Availability: Only ${data.quantityAvailable} available

This is truly a special piece that won't last long. I'd love to show it to you in person and discuss how it could complement your collection.

Can you stop by this week, or would you like me to hold one for you? Please reply to this email or call the store at ${STORE_PHONE}.

Best regards,
${data.employeeName}
${STORE_NAME}

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
${STORE_NAME}

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

If you have any questions, please don't hesitate to contact us at ${STORE_PHONE}.

Thank you for shopping with ${STORE_NAME}!

Best regards,
${data.employeeName}
${STORE_NAME}`;
        }
    },
    'phone-shipped': {
        name: 'Shipped with Tracking',
        category: 'Phone Orders',
        fields: ['customerName', 'brand', 'modelName', 'modelNumber', 'trackingNumber', 'customerAddress', 'employeeName'],
        generate: (data) => {
            return `Subject: Your Watch Order - Tracking Information

Hi ${data.customerName},

Thank you for your recent purchase from ${STORE_NAME}! We're pleased to confirm that your order has been shipped and is on its way to you.

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
${STORE_NAME}`;
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
        generate: (data) => `Hi ${data.customerName}! Yes, we have the ${data.modelName} in stock. Current price is ${data.price} with our outlet discount. We're open until ${data.closingTime} today if you'd like to stop by, or I can hold it.`
    },
    'text-thank-you': {
        name: 'Thank You',
        category: 'Text',
        fields: ['customerName', 'modelName', 'warrantyLength', 'brand'],
        generate: (data) => `${data.customerName}, thank you for your purchase today! Your ${data.modelName} comes with a ${data.warrantyLength} warranty. Reach out anytime at ${STORE_PHONE} for any questions. Enjoy your new ${data.brand}!`
    },
    'text-interest-followup': {
        name: 'Sale Alert',
        category: 'Text',
        fields: ['customerName', 'employeeName', 'modelName', 'discount', 'msrp', 'endDate'],
        generate: (data) => {
            const msrp = parseFloat(data.msrp) || 0;
            const discount = parseFloat(data.discount) || 0;
            const salePrice = (msrp * (1 - discount / 100)).toFixed(2);

            return `Hi ${data.customerName}! This is ${data.employeeName} from Citizen Watch Store at the South Premium Outlets. The ${data.modelName} you were interested in is on ${data.discount}% OFF promotion (MSRP ${data.msrp} now ${salePrice} plus tax) until ${data.endDate}. Please let me know if you'd like me to hold one for you. Thank you!`;
        }
    }
};

// Application state
let currentCategory = 'all';
let currentTemplate = null;
let searchActive = false;

// User profile data (loaded from localStorage)
let userProfile = null;

// Load user profile from localStorage
function loadUserProfile() {
    try {
        const data = localStorage.getItem('userProfile');
        if (data) {
            userProfile = JSON.parse(data);
        }
    } catch (e) {
        console.error('Error loading user profile:', e);
    }
}

// Cached DOM elements
const elements = {
    searchBox: null,
    clearSearch: null,
    searchResults: null,
    resultCounter: null,
    templateSelect: null,
    formFields: null,
    formSectionTitle: null,
    outputArea: null,
    generateBtn: null,
    clearBtn: null,
    copyBtn: null,
    toast: null
};

// Cache DOM elements on page load
function cacheElements() {
    elements.searchBox = document.getElementById('searchBox');
    elements.clearSearch = document.getElementById('clearSearch');
    elements.searchResults = document.getElementById('searchResults');
    elements.resultCounter = document.getElementById('resultCounter');
    elements.templateSelect = document.getElementById('templateSelect');
    elements.formFields = document.getElementById('formFields');
    elements.formSectionTitle = document.getElementById('formSectionTitle');
    elements.outputArea = document.getElementById('outputArea');
    elements.generateBtn = document.getElementById('generateBtn');
    elements.clearBtn = document.getElementById('clearBtn');
    elements.copyBtn = document.getElementById('copyBtn');
    elements.toast = document.getElementById('toast');
}

function populateDropdown(category = 'all') {
    const optgroups = {
        'Customer Email': [],
        'Phone Orders': [],
        'Text': []
    };

    Object.keys(templates).forEach(key => {
        const template = templates[key];
        optgroups[template.category].push({ key, name: template.name });
    });

    elements.templateSelect.innerHTML = '<option value="">Select a template...</option>';

    Object.keys(optgroups).forEach(cat => {
        if (optgroups[cat].length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = cat;
            optgroups[cat].forEach(item => {
                const option = document.createElement('option');
                option.value = item.key;
                option.textContent = item.name;
                option.title = templateHelp[item.key] || '';
                optgroup.appendChild(option);
            });
            elements.templateSelect.appendChild(optgroup);
        }
    });
}

function renderSearchResults(query) {
    if (!query.trim()) {
        elements.searchResults.classList.remove('visible');
        elements.resultCounter.textContent = '';
        elements.clearSearch.classList.remove('visible');
        elements.searchBox.classList.remove('active');
        searchActive = false;
        return;
    }

    searchActive = true;
    elements.clearSearch.classList.add('visible');
    elements.searchBox.classList.add('active');

    const lowerQuery = query.toLowerCase();
    const results = Object.keys(templates).filter(key => {
        const template = templates[key];
        return template.name.toLowerCase().includes(lowerQuery) ||
               template.category.toLowerCase().includes(lowerQuery);
    });

    if (results.length === 0) {
        elements.searchResults.innerHTML = '<div class="search-result-item" style="cursor: default; color: #999;">No templates found</div>';
        elements.resultCounter.textContent = '0 templates found';
    } else {
        // Use sanitization to prevent XSS
        elements.searchResults.innerHTML = results.map(key => {
            const template = templates[key];
            const safeName = sanitizeHTML(template.name);
            const safeCategory = sanitizeHTML(template.category);
            const safeKey = escapeAttr(key);
            return `
                <div class="search-result-item" data-template-key="${safeKey}">
                    <div class="search-result-name">${safeName}</div>
                    <div class="search-result-category">${safeCategory}</div>
                </div>
            `;
        }).join('');
        elements.resultCounter.textContent = `${results.length} template${results.length === 1 ? '' : 's'} found`;
    }

    elements.searchResults.classList.add('visible');
}

function selectTemplate(key) {
    try {
        currentTemplate = key;
        const template = templates[key];

        elements.templateSelect.value = key;
        elements.formSectionTitle.textContent = `${template.name} Fields`;

        const placeholder = document.getElementById('formPlaceholder');
        if (placeholder) {
            placeholder.remove();
        }

        elements.formFields.innerHTML = template.fields.map(field => {
            const label = field.replace(/([A-Z])/g, ' $1').trim();
            const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
            const isTextarea = field.includes('address') || field.includes('Address') || field.includes('Details');
            const isYesNoField = field.includes('Verified') || field.includes('Verification');
            const config = fieldConfig[field] || {};

            const fullWidthClass = isTextarea ? ' full-width' : '';
            const requiredMark = config.required ? ' *' : '';
            const safeField = escapeAttr(field);
            const safeExample = escapeAttr(config.example || '');

            if (isYesNoField) {
                return `
                    <div class="form-group radio-field">
                        <label class="form-label">${sanitizeHTML(capitalizedLabel)}${requiredMark}</label>
                        <div class="radio-group" data-field="${safeField}">
                            <div class="radio-option">
                                <input type="radio" id="${safeField}-yes" name="${safeField}" value="yes" data-field="${safeField}">
                                <label for="${safeField}-yes">Yes</label>
                            </div>
                            <div class="radio-option">
                                <input type="radio" id="${safeField}-no" name="${safeField}" value="no" data-field="${safeField}">
                                <label for="${safeField}-no">No</label>
                            </div>
                        </div>
                    </div>
                `;
            }

            const suggestions = getFieldSuggestions(field);
            const datalistId = `datalist-${safeField}`;
            const datalistHTML = suggestions.length > 0 ? `
                <datalist id="${datalistId}">
                    ${suggestions.map(s => `<option value="${escapeAttr(s)}">`).join('')}
                </datalist>
            ` : '';

            // Auto-fill from user profile
            let autoFillValue = '';
            if (userProfile) {
                if ((field === 'employeeName' || field === 'yourName') && userProfile.employeeName) {
                    autoFillValue = escapeAttr(userProfile.employeeName);
                } else if (field === 'employeeId' && userProfile.employeeId) {
                    autoFillValue = escapeAttr(userProfile.employeeId);
                }
            }

            return `
                <div class="form-group${fullWidthClass}">
                    <label class="form-label">${sanitizeHTML(capitalizedLabel)}${requiredMark}</label>
                    <div class="input-wrapper">
                        ${isTextarea
                            ? `<textarea class="form-textarea" data-field="${safeField}" ${config.required ? 'required' : ''} placeholder="${safeExample}">${autoFillValue}</textarea>`
                            : `<input type="text" class="form-input" data-field="${safeField}" ${config.required ? 'required' : ''} placeholder="${safeExample}" value="${autoFillValue}" list="${datalistId}">${datalistHTML}`
                        }
                        <button class="clear-input" data-clear="${safeField}" title="Clear">×</button>
                    </div>
                    <div class="calculated-value" data-calc="${safeField}" style="display: none;"></div>
                    <div class="error-message" data-error="${safeField}" style="display: none;"></div>
                </div>
            `;
        }).join('');

        // Add event listeners
        setTimeout(() => {
            attachEventListeners();
        }, 0);

        elements.outputArea.value = '';
        elements.clearBtn.disabled = false;
    } catch (error) {
        console.error('Error selecting template:', error);
        showToast('Error loading template');
    }
}

function attachEventListeners() {
    // Cached selectors for calculated fields
    let msrpInput = null;
    let discountInput = null;

    // Handle radio buttons
    elements.formFields.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', () => {
            updateCalculatedFields(msrpInput, discountInput);
        });
    });

    elements.formFields.querySelectorAll('.form-input, .form-textarea').forEach(input => {
        const field = input.dataset.field;
        const config = fieldConfig[field] || {};

        // Cache MSRP and discount inputs
        if (field === 'msrp') msrpInput = input;
        if (field === 'discount') discountInput = input;

        // Format phone numbers
        if (field.includes('phone') || field.includes('Phone')) {
            input.addEventListener('input', () => {
                const cursorPos = input.selectionStart;
                const oldValue = input.value;
                input.value = formatPhoneNumber(input.value);
                if (oldValue.length < input.value.length) {
                    input.setSelectionRange(cursorPos + 1, cursorPos + 1);
                }
            });
        }

        // Real-time validation
        input.addEventListener('input', () => {
            validateField(input);
            updateCalculatedFields(msrpInput, discountInput);

            // Show/hide clear button
            const clearBtn = document.querySelector(`[data-clear="${field}"]`);
            if (clearBtn) {
                if (input.value.trim()) {
                    clearBtn.classList.add('visible');
                } else {
                    clearBtn.classList.remove('visible');
                }
            }
        });

        // Initialize clear button visibility
        const clearBtn = document.querySelector(`[data-clear="${field}"]`);
        if (clearBtn) {
            if (input.value.trim()) {
                clearBtn.classList.add('visible');
            }

            // Add click handler for clear button
            clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                input.value = '';
                input.focus();
                clearBtn.classList.remove('visible');
                validateField(input);
                updateCalculatedFields(msrpInput, discountInput);
            });
        }
    });

    updateCalculatedFields(msrpInput, discountInput);
}

function updateCalculatedFields(msrpInput, discountInput) {
    // Use cached inputs if provided, otherwise query
    const msrp = msrpInput || elements.formFields.querySelector('[data-field="msrp"]');
    const discount = discountInput || elements.formFields.querySelector('[data-field="discount"]');

    if (msrp && discount) {
        const msrpValue = parseFloat(msrp.value) || 0;
        const discountValue = parseFloat(discount.value) || 0;

        if (msrpValue > 0 && discountValue > 0) {
            const salePrice = (msrpValue * (1 - discountValue / 100)).toFixed(2);
            const calcDiv = elements.formFields.querySelector('[data-calc="msrp"]') ||
                           elements.formFields.querySelector('[data-calc="discount"]');
            if (calcDiv) {
                calcDiv.textContent = `Calculated Sale Price: ${salePrice}`;
                calcDiv.style.display = 'block';
            }
        } else {
            const calcDiv = elements.formFields.querySelector('[data-calc="msrp"]') ||
                           elements.formFields.querySelector('[data-calc="discount"]');
            if (calcDiv) {
                calcDiv.style.display = 'none';
            }
        }
    }
}

function validateField(input) {
    const field = input.dataset.field;
    const config = fieldConfig[field] || {};
    const errorDiv = document.querySelector(`[data-error="${field}"]`);

    // Clear error on input
    input.classList.remove('error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }

    // Validate format if value exists
    if (input.value.trim() && config.validation) {
        let isValid = true;
        let errorMsg = '';

        switch (config.validation) {
            case 'number':
                isValid = !isNaN(input.value) && input.value.trim() !== '';
                errorMsg = 'Please enter a valid number';
                break;
            case 'currency':
                const num = parseFloat(input.value.replace(/[,$]/g, ''));
                isValid = !isNaN(num) && num >= 0;
                errorMsg = 'Please enter a valid amount';
                break;
            case 'tracking':
                if (input.value.trim()) {
                    isValid = validateTracking(input.value);
                    errorMsg = 'Invalid tracking number format';
                }
                break;
        }

        if (!isValid && errorDiv) {
            input.classList.add('error');
            errorDiv.textContent = errorMsg;
            errorDiv.style.display = 'block';
        }
    }
}

function generateMessage() {
    if (!currentTemplate) return;

    try {
        highlightEmptyRequiredFields();

        const template = templates[currentTemplate];
        const data = {};

        template.fields.forEach(field => {
            // Check if it's a radio button group
            const radioGroup = elements.formFields.querySelector(`.radio-group[data-field="${field}"]`);
            if (radioGroup) {
                const checkedRadio = radioGroup.querySelector('input[type="radio"]:checked');
                data[field] = checkedRadio ? checkedRadio.value : '';
            } else {
                const input = elements.formFields.querySelector(`[data-field="${field}"]`);
                data[field] = input ? input.value : '';
            }
        });

        const message = template.generate(data);
        elements.outputArea.value = message;
    } catch (error) {
        console.error('Error generating message:', error);
        elements.outputArea.value = '';
        showToast('⚠ ' + error.message);
    }
}

function highlightEmptyRequiredFields() {
    const inputs = elements.formFields.querySelectorAll('.form-input, .form-textarea');

    inputs.forEach(input => {
        const field = input.dataset.field;
        const config = fieldConfig[field] || {};

        if (config.required && !input.value.trim()) {
            input.classList.add('error');
        } else {
            input.classList.remove('error');
        }
    });
}

function clearAll() {
    if (!currentTemplate) return;

    try {
        const inputs = elements.formFields.querySelectorAll('.form-input, .form-textarea');
        inputs.forEach(input => input.value = '');
        elements.outputArea.value = '';

        elements.formSectionTitle.textContent = 'Template Fields';
        currentTemplate = null;
        elements.templateSelect.value = '';

        elements.formFields.innerHTML = `
            <div class="placeholder-message" id="formPlaceholder">
                <p>Select a template to begin</p>
            </div>
        `;

        elements.clearBtn.disabled = true;
    } catch (error) {
        console.error('Error clearing form:', error);
        showToast('Error clearing form');
    }
}

function showToast(message) {
    try {
        elements.toast.textContent = message;
        elements.toast.classList.add('show');
        setTimeout(() => {
            elements.toast.classList.remove('show');
        }, TOAST_DURATION_MS);
    } catch (error) {
        console.error('Error showing toast:', error);
    }
}

function copyToClipboard() {
    const text = elements.outputArea.value;
    if (!text) {
        showToast('⚠ Nothing to copy');
        return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('✓ Copied!');
        }).catch((error) => {
            console.error('Clipboard error:', error);
            showToast('⚠ Copy failed');
        });
    } else {
        // Fallback for browsers without clipboard API
        try {
            elements.outputArea.select();
            const success = document.execCommand('copy');
            if (success) {
                showToast('✓ Copied!');
            } else {
                showToast('⚠ Copy failed');
            }
        } catch (error) {
            console.error('Copy error:', error);
            showToast('⚠ Copy not supported');
        }
    }
}

// Initialize application
function init() {
    try {
        cacheElements();
        loadUserProfile();
        populateDropdown();

        // Event listeners
        elements.searchBox.addEventListener('input', (e) => {
            renderSearchResults(e.target.value);
        });

        elements.clearSearch.addEventListener('click', () => {
            elements.searchBox.value = '';
            renderSearchResults('');
        });

        elements.searchResults.addEventListener('click', (e) => {
            const item = e.target.closest('.search-result-item');
            if (item && item.dataset.templateKey) {
                selectTemplate(item.dataset.templateKey);
                elements.searchBox.value = '';
                renderSearchResults('');
            }
        });

        elements.templateSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                selectTemplate(e.target.value);
            }
        });

        elements.generateBtn.addEventListener('click', generateMessage);
        elements.clearBtn.addEventListener('click', clearAll);
        elements.copyBtn.addEventListener('click', copyToClipboard);
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

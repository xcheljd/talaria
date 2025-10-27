// Constants
const TOAST_DURATION_MS = 2500;

// Helper functions to get store info from user profile
function getStorePhone() {
    return userProfile && userProfile.storePhone ? userProfile.storePhone : '702-357-8990';
}

function getStoreName() {
    return userProfile && userProfile.storeName ? userProfile.storeName : 'Citizen Company Store';
}

function getStoreLocation() {
    return userProfile && userProfile.storeLocation ? userProfile.storeLocation : 'the South Premium Outlets';
}

function getFullStoreLocation() {
    return `Citizen Company Store at ${getStoreLocation()}`;
}

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
    'text-interest-followup': 'Follow up on specific watch customer showed interest in. Use after store visit.',
    'promotion-email': 'Generate HTML email for weekly promotions with discount tiers. Auto-generates title based on dates.'
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
    carrier: { example: 'UPS', required: true, suggestions: ['UPS', 'FedEx', 'USPS'] },
    // Promotion Email fields
    promoDateRange: { example: 'Nov 28 - Dec 1', required: true },
    promoYear: { example: '2024-2025', required: false },
    promoTitle: { example: 'Leave blank for auto-generation', required: false },
    promoBrand: { example: 'Citizen', required: true, suggestions: ['Citizen', 'Bulova', 'Alpina', 'Frederique Constant'] },
    promoDiscount: { example: '60', required: true, validation: 'number' },
    promoCollections: { example: 'Corso, Avion, Marine Star', required: false },
    promoCallout: { example: 'Optional special note', required: false }
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

Please don't hesitate to reach out by replying to this email or call the store at ${getStorePhone()}. I would be happy to check availability on any models you're considering.

Best regards,
${data.employeeName}
${getStoreName()}`
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

This model tends to sell quickly at this price point. If you'd like me to hold one for you, please let me know by ${data.holdDeadline}, or feel free to call the store at ${getStorePhone()}.

We can also arrange shipping for $20 flat-rate ground delivery within the US if you're unable to visit the store.

Looking forward to hearing from you!

Best regards,
${data.employeeName}
${getStoreName()}`
    },
    'thank-you-warranty': {
        name: 'Thank You & Warranty',
        category: 'Customer Email',
        fields: ['customerName', 'modelName', 'modelNumber', 'brand', 'employeeName'],
        generate: (data) => `Subject: Thank You for Your Purchase - Register for Additional Warranty

Hi ${data.customerName},

Thank you for your purchase of the ${data.brand} ${data.modelName} (${data.modelNumber})!

I can help you register your watch online to receive an additional 1-year warranty at no cost. This extends your coverage and ensures you get the most out of your timepiece.

If you'd like assistance with registration or have any questions about your new watch, please reply to this email or call the store at ${getStorePhone()}.

Thank you again for choosing ${getStoreName()}!

Best regards,
${data.employeeName}
${getStoreName()}`
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
        generate: (data) => `Subject: Exclusive: Limited Edition ${data.modelName} Available

Hi ${data.customerName},

I wanted to reach out to you personally because we just received a ${data.brand} ${data.modelName} (${data.modelNumber}) - ${data.limitedDetails}.

As someone who appreciates fine timepieces and unique additions to your collection, I thought you'd want to know about this immediately.

Price: ${data.price}
Availability: Only ${data.quantityAvailable} available

This is truly a special piece that won't last long. I'd love to show it to you in person and discuss how it could complement your collection.

Can you stop by this week, or would you like me to hold one for you? Please reply to this email or call the store at ${getStorePhone()}.

Best regards,
${data.employeeName}
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
        generate: (data) => `Hi ${data.customerName}! Yes, we have the ${data.modelName} in stock. Current price is ${data.price} with our outlet discount. We're open until ${data.closingTime} today if you'd like to stop by, or I can hold it.`
    },
    'text-thank-you': {
        name: 'Thank You',
        category: 'Text',
        fields: ['customerName', 'modelName', 'warrantyLength', 'brand'],
        generate: (data) => `${data.customerName}, thank you for your purchase today! Your ${data.modelName} comes with a ${data.warrantyLength} warranty. Reach out anytime at ${getStorePhone()} for any questions. Enjoy your new ${data.brand}!`
    },
    'text-interest-followup': {
        name: 'Sale Alert',
        category: 'Text',
        fields: ['customerName', 'employeeName', 'modelName', 'discount', 'msrp', 'endDate'],
        generate: (data) => {
            const msrp = parseFloat(data.msrp) || 0;
            const discount = parseFloat(data.discount) || 0;
            const salePrice = (msrp * (1 - discount / 100)).toFixed(2);

            return `Hi ${data.customerName}! This is ${data.employeeName} from ${getFullStoreLocation()}. The ${data.modelName} you were interested in is on ${data.discount}% OFF promotion (MSRP ${data.msrp} now ${salePrice} plus tax) until ${data.endDate}. Please let me know if you'd like me to hold one for you. Thank you!`;
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
    }
};

// Application state
let currentCategory = 'all';
let currentTemplate = null;
let searchActive = false;

// User profile data (loaded from localStorage)
let userProfile = null;

// Promotion email state
let promotionEntries = [];
let specialHours = [];
let howToShopItems = [];
let importantNotesItems = [];

// UI state for collapsible sections
let howToShopExpanded = false;
let importantNotesExpanded = false;
let entryCollapsedStates = {}; // Track which entries are collapsed by ID

// Undo/Redo history
let historyStack = [];
let historyIndex = -1;
const MAX_HISTORY = 50;

// Capture current state for undo/redo
function captureState() {
    // Only capture if we're in promotion email mode
    if (currentTemplate !== 'promotion-email') return;

    const state = {
        promotionEntries: JSON.parse(JSON.stringify(promotionEntries)),
        specialHours: JSON.parse(JSON.stringify(specialHours)),
        howToShopItems: JSON.parse(JSON.stringify(howToShopItems)),
        importantNotesItems: JSON.parse(JSON.stringify(importantNotesItems))
    };

    // Remove any states after current index (when making new changes after undo)
    historyStack = historyStack.slice(0, historyIndex + 1);

    // Add new state
    historyStack.push(state);

    // Limit history size
    if (historyStack.length > MAX_HISTORY) {
        historyStack.shift();
    } else {
        historyIndex++;
    }

    updateUndoRedoButtons();
}

// Restore state from history
function restoreState(state) {
    promotionEntries = JSON.parse(JSON.stringify(state.promotionEntries));
    specialHours = JSON.parse(JSON.stringify(state.specialHours));
    howToShopItems = JSON.parse(JSON.stringify(state.howToShopItems));
    importantNotesItems = JSON.parse(JSON.stringify(state.importantNotesItems));

    // Re-render all sections without capturing state
    renderPromotionEntries();
    renderSpecialHours();
    renderHowToShopSection();
    renderImportantNotesSection();
}

// Undo last change
function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        restoreState(historyStack[historyIndex]);
        updateUndoRedoButtons();
        showToast('↶ Undone');
    }
}

// Redo last undone change
function redo() {
    if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        restoreState(historyStack[historyIndex]);
        updateUndoRedoButtons();
        showToast('↷ Redone');
    }
}

// Update undo/redo button states
function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    if (undoBtn) {
        undoBtn.disabled = historyIndex <= 0;
    }
    if (redoBtn) {
        redoBtn.disabled = historyIndex >= historyStack.length - 1;
    }
}

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
    toast: null,
    outputCard: null
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
    elements.outputCard = document.querySelector('.output-card');
}

// Show tabbed output for promotion emails
function showTabbedOutput() {
    if (!elements.outputCard) return;

    elements.outputCard.innerHTML = `
        <h2 class="section-title">Generated Email</h2>

        <div class="output-tabs">
            <button class="output-tab active" data-tab="preview">Preview</button>
            <button class="output-tab" data-tab="code">HTML Code</button>
        </div>

        <div class="output-content active" id="previewContent">
            <iframe class="preview-iframe" id="previewIframe"></iframe>
        </div>

        <div class="output-content" id="codeContent">
            <textarea class="output-textarea" id="codeArea" placeholder="HTML code will appear here..."></textarea>
        </div>

        <div class="button-group">
            <button class="btn" id="copyPreviewBtn">Copy HTML Code</button>
        </div>
    `;

    // Add tab switching
    const tabs = elements.outputCard.querySelectorAll('.output-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update active content
            elements.outputCard.querySelectorAll('.output-content').forEach(content => {
                content.classList.remove('active');
            });

            if (targetTab === 'preview') {
                document.getElementById('previewContent').classList.add('active');
            } else {
                document.getElementById('codeContent').classList.add('active');
            }
        });
    });

    // Add copy button handler
    const copyBtn = document.getElementById('copyPreviewBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const codeArea = document.getElementById('codeArea');
            if (codeArea && codeArea.value) {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(codeArea.value).then(() => {
                        showToast('✓ HTML Code Copied!');
                    }).catch(() => {
                        showToast('⚠ Copy failed');
                    });
                } else {
                    codeArea.select();
                    document.execCommand('copy');
                    showToast('✓ HTML Code Copied!');
                }
            } else {
                showToast('⚠ Nothing to copy');
            }
        });
    }
}

// Show regular output
function showRegularOutput() {
    if (!elements.outputCard) return;

    elements.outputCard.innerHTML = `
        <h2 class="section-title">Generated Message</h2>
        <textarea class="output-textarea" id="outputArea" placeholder="Your generated message will appear here..." aria-label="Generated message output"></textarea>
        <div class="button-group">
            <button class="btn" id="copyBtn">Copy Message</button>
        </div>
    `;

    // Re-cache the output area
    elements.outputArea = document.getElementById('outputArea');

    // Re-attach copy button handler
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyToClipboard);
    }
}

// ===== PROMOTION EMAIL HELPER FUNCTIONS =====

// Debounce utility for live preview
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Update live preview
function updateLivePreview() {
    if (currentTemplate !== 'promotion-email') return;

    const dateRangeInput = document.getElementById('promoDateRange');
    const yearInput = document.getElementById('promoYear');
    const titleInput = document.getElementById('promoTitle');

    // Only update if we have at least a date range
    if (!dateRangeInput || !dateRangeInput.value.trim()) {
        return;
    }

    const data = {
        promoDateRange: dateRangeInput.value,
        promoYear: yearInput ? yearInput.value : '',
        promoTitle: titleInput ? titleInput.value : ''
    };

    const htmlCode = generatePromotionEmailHTML(data);

    // Update code textarea
    const codeArea = document.getElementById('codeArea');
    if (codeArea) {
        codeArea.value = htmlCode;
    }

    // Update preview iframe
    const previewIframe = document.getElementById('previewIframe');
    if (previewIframe) {
        const iframeDoc = previewIframe.contentDocument || previewIframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(htmlCode);
        iframeDoc.close();
    }
}

// Create debounced version for typing
const debouncedLivePreview = debounce(updateLivePreview, 500);

// Create debounced version for state capture (after user stops typing)
const debouncedCaptureState = debounce(captureState, 1000);

// Auto-generate title based on date range
function generatePromoTitle(dateRange) {
    if (!dateRange) return 'WEEKLY SALE';

    const today = new Date();
    const currentYear = today.getFullYear();

    // Parse date range
    const dateStr = dateRange.toLowerCase();

    // Black Friday detection (typically last Friday of November)
    if (dateStr.includes('nov') && (dateStr.includes('24') || dateStr.includes('25') || dateStr.includes('26') || dateStr.includes('27') || dateStr.includes('28') || dateStr.includes('29'))) {
        return 'BLACK FRIDAY OUTLET EVENT';
    }

    // Cyber Monday (Monday after Black Friday)
    if (dateStr.includes('nov') && dateStr.includes('30')) {
        return 'CYBER MONDAY SALE';
    }
    if (dateStr.includes('dec') && dateStr.includes('1') && !dateStr.includes('10')) {
        return 'CYBER MONDAY SALE';
    }

    // Holiday season (December)
    if (dateStr.includes('dec')) {
        return 'HOLIDAY SALE EVENT';
    }

    // Summer clearance (June-August)
    if (dateStr.includes('jun') || dateStr.includes('jul') || dateStr.includes('aug')) {
        return 'SUMMER CLEARANCE';
    }

    // Back to school (late August - early September)
    if ((dateStr.includes('aug') && (dateStr.includes('20') || dateStr.includes('2') || dateStr.includes('3'))) ||
        (dateStr.includes('sep') && (dateStr.includes('1') || dateStr.includes('2') || dateStr.includes('3') || dateStr.includes('4') || dateStr.includes('5') || dateStr.includes('6') || dateStr.includes('7') || dateStr.includes('8') || dateStr.includes('9')))) {
        return 'BACK TO SCHOOL SALE';
    }

    // Default
    return 'WEEKLY SALE';
}

// Add a new promotion entry
function addPromotionEntry() {
    const entryId = Date.now();
    promotionEntries.push({
        id: entryId,
        brand: '',
        discount: '',
        collections: '',
        callout: ''
    });
    renderPromotionEntries();
    captureState();
}

// Remove a promotion entry
function removePromotionEntry(entryId) {
    promotionEntries = promotionEntries.filter(entry => entry.id !== entryId);
    renderPromotionEntries();
    captureState();
}

// Move promotion entry up
function movePromotionEntryUp(entryId) {
    const index = promotionEntries.findIndex(e => e.id === entryId);
    if (index > 0) {
        [promotionEntries[index - 1], promotionEntries[index]] = [promotionEntries[index], promotionEntries[index - 1]];
        renderPromotionEntries();
        captureState();
    }
}

// Move promotion entry down
function movePromotionEntryDown(entryId) {
    const index = promotionEntries.findIndex(e => e.id === entryId);
    if (index < promotionEntries.length - 1) {
        [promotionEntries[index], promotionEntries[index + 1]] = [promotionEntries[index + 1], promotionEntries[index]];
        renderPromotionEntries();
        captureState();
    }
}

// Add a new special hour row
function addSpecialHour() {
    const hourId = Date.now();
    specialHours.push({
        id: hourId,
        day: '',
        hours: ''
    });
    renderSpecialHours();
    captureState();
}

// Remove a special hour row
function removeSpecialHour(hourId) {
    specialHours = specialHours.filter(hour => hour.id !== hourId);
    renderSpecialHours();
    captureState();
}

// Move special hour up
function moveSpecialHourUp(hourId) {
    const index = specialHours.findIndex(h => h.id === hourId);
    if (index > 0) {
        [specialHours[index - 1], specialHours[index]] = [specialHours[index], specialHours[index - 1]];
        renderSpecialHours();
        captureState();
    }
}

// Move special hour down
function moveSpecialHourDown(hourId) {
    const index = specialHours.findIndex(h => h.id === hourId);
    if (index < specialHours.length - 1) {
        [specialHours[index], specialHours[index + 1]] = [specialHours[index + 1], specialHours[index]];
        renderSpecialHours();
        captureState();
    }
}

// How to Shop functions
function addHowToShopItem() {
    const itemId = Date.now();
    howToShopItems.push({ id: itemId, text: '' });
    renderHowToShopSection();
    captureState();
}

function removeHowToShopItem(itemId) {
    howToShopItems = howToShopItems.filter(item => item.id !== itemId);
    renderHowToShopSection();
    captureState();
}

function moveHowToShopItemUp(itemId) {
    const index = howToShopItems.findIndex(i => i.id === itemId);
    if (index > 0) {
        [howToShopItems[index - 1], howToShopItems[index]] = [howToShopItems[index], howToShopItems[index - 1]];
        renderHowToShopSection();
        captureState();
    }
}

function moveHowToShopItemDown(itemId) {
    const index = howToShopItems.findIndex(i => i.id === itemId);
    if (index < howToShopItems.length - 1) {
        [howToShopItems[index], howToShopItems[index + 1]] = [howToShopItems[index + 1], howToShopItems[index]];
        renderHowToShopSection();
        captureState();
    }
}

// Important Notes functions
function addImportantNotesItem() {
    const itemId = Date.now();
    importantNotesItems.push({ id: itemId, text: '' });
    renderImportantNotesSection();
    captureState();
}

function removeImportantNotesItem(itemId) {
    importantNotesItems = importantNotesItems.filter(item => item.id !== itemId);
    renderImportantNotesSection();
    captureState();
}

function moveImportantNotesItemUp(itemId) {
    const index = importantNotesItems.findIndex(i => i.id === itemId);
    if (index > 0) {
        [importantNotesItems[index - 1], importantNotesItems[index]] = [importantNotesItems[index], importantNotesItems[index - 1]];
        renderImportantNotesSection();
        captureState();
    }
}

function moveImportantNotesItemDown(itemId) {
    const index = importantNotesItems.findIndex(i => i.id === itemId);
    if (index < importantNotesItems.length - 1) {
        [importantNotesItems[index], importantNotesItems[index + 1]] = [importantNotesItems[index + 1], importantNotesItems[index]];
        renderImportantNotesSection();
        captureState();
    }
}

// Toggle functions for collapsible sections
function toggleHowToShop() {
    howToShopExpanded = !howToShopExpanded;
    renderHowToShopSection();
}

function toggleImportantNotes() {
    importantNotesExpanded = !importantNotesExpanded;
    renderImportantNotesSection();
}

function toggleEntryCollapse(entryId) {
    entryCollapsedStates[entryId] = !entryCollapsedStates[entryId];
    renderPromotionEntries();
}

// Render all promotion entries
function renderPromotionEntries() {
    const container = document.getElementById('promotionEntriesContainer');
    if (!container) return;

    container.innerHTML = promotionEntries.map((entry, index) => {
        const safeId = escapeAttr(String(entry.id));
        const isFirst = index === 0;
        const isLast = index === promotionEntries.length - 1;
        const isCollapsed = entryCollapsedStates[entry.id] || false;

        // Build summary text for collapsed state
        let summaryText = '';
        if (entry.brand && entry.discount) {
            summaryText = `${entry.brand} - ${entry.discount}% OFF`;
            if (entry.collections) {
                const firstCollection = entry.collections.split(',')[0].trim();
                summaryText += ` • ${firstCollection}${entry.collections.includes(',') ? '...' : ''}`;
            }
        } else {
            summaryText = 'Entry not filled out';
        }

        return `
            <div class="promotion-entry ${isCollapsed ? 'collapsed' : ''}" data-entry-id="${safeId}">
                <div class="entry-header">
                    <div class="entry-header-left">
                        <span class="entry-number">Entry ${index + 1}</span>
                        ${isCollapsed ? `<span class="entry-summary">${summaryText}</span>` : ''}
                    </div>
                    <div class="entry-controls">
                        <button type="button" class="collapse-btn" onclick="toggleEntryCollapse(${entry.id})" title="${isCollapsed ? 'Expand' : 'Minimize'}">
                            ${isCollapsed ? '▼' : '▲'}
                        </button>
                        <button type="button" class="order-btn" onclick="movePromotionEntryUp(${entry.id})" title="Move up" ${isFirst ? 'disabled' : ''}>▲</button>
                        <button type="button" class="order-btn" onclick="movePromotionEntryDown(${entry.id})" title="Move down" ${isLast ? 'disabled' : ''}>▼</button>
                        <button type="button" class="entry-remove-btn" onclick="removePromotionEntry(${entry.id})" title="Remove">×</button>
                    </div>
                </div>

                <div class="entry-fields" style="display: ${isCollapsed ? 'none' : 'grid'};">
                    <div class="form-group">
                        <label class="form-label">Brand *</label>
                        <select class="form-input entry-brand" data-entry-id="${safeId}">
                            <option value="">Select brand...</option>
                            <option value="Citizen" ${entry.brand === 'Citizen' ? 'selected' : ''}>Citizen</option>
                            <option value="Bulova" ${entry.brand === 'Bulova' ? 'selected' : ''}>Bulova</option>
                            <option value="Alpina" ${entry.brand === 'Alpina' ? 'selected' : ''}>Alpina</option>
                            <option value="Frederique Constant" ${entry.brand === 'Frederique Constant' ? 'selected' : ''}>Frederique Constant</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Discount % *</label>
                        <input type="text" class="form-input entry-discount" data-entry-id="${safeId}" value="${escapeAttr(entry.discount)}" placeholder="60">
                    </div>

                    <div class="form-group full-width">
                        <label class="form-label">Collections (comma-separated)</label>
                        <input type="text" class="form-input entry-collections" data-entry-id="${safeId}" value="${escapeAttr(entry.collections)}" placeholder="Corso, Avion, Marine Star">
                    </div>

                    <div class="form-group full-width">
                        <label class="form-label">Special Callout (optional)</label>
                        <input type="text" class="form-input entry-callout" data-entry-id="${safeId}" value="${escapeAttr(entry.callout)}" placeholder="Final sale items excluded">
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Attach event listeners to update entry data and live preview
    container.querySelectorAll('.entry-brand, .entry-discount, .entry-collections, .entry-callout').forEach(input => {
        input.addEventListener('input', (e) => {
            updateEntryData(e);
            debouncedLivePreview();
            debouncedCaptureState(); // Capture after user stops typing
        });
        input.addEventListener('change', (e) => {
            updateEntryData(e);
            updateLivePreview(); // Immediate update for dropdowns
            captureState(); // Capture immediately on dropdown change
        });
    });

    // Update preview after rendering entries
    updateLivePreview();
}

// Update entry data from inputs
function updateEntryData(e) {
    const entryId = parseInt(e.target.dataset.entryId);
    const entry = promotionEntries.find(t => t.id === entryId);
    if (!entry) return;

    if (e.target.classList.contains('entry-brand')) {
        entry.brand = e.target.value;
    } else if (e.target.classList.contains('entry-discount')) {
        entry.discount = e.target.value;
    } else if (e.target.classList.contains('entry-collections')) {
        entry.collections = e.target.value;
    } else if (e.target.classList.contains('entry-callout')) {
        entry.callout = e.target.value;
    }
}

// Render all special hours
function renderSpecialHours() {
    const container = document.getElementById('specialHoursContainer');
    if (!container) return;

    container.innerHTML = specialHours.map((hour, index) => {
        const safeId = escapeAttr(String(hour.id));
        const isFirst = index === 0;
        const isLast = index === specialHours.length - 1;

        return `
            <div class="special-hour-row" data-hour-id="${safeId}">
                <div class="special-hour-fields">
                    <div class="form-group">
                        <input type="text" class="form-input hour-day" data-hour-id="${safeId}" value="${escapeAttr(hour.day)}" placeholder="e.g., Friday Nov 29">
                    </div>
                    <div class="form-group">
                        <input type="text" class="form-input hour-hours" data-hour-id="${safeId}" value="${escapeAttr(hour.hours)}" placeholder="e.g., 6AM–10PM or CLOSED">
                    </div>
                    <div class="hour-controls">
                        <button type="button" class="order-btn" onclick="moveSpecialHourUp(${hour.id})" title="Move up" ${isFirst ? 'disabled' : ''}>▲</button>
                        <button type="button" class="order-btn" onclick="moveSpecialHourDown(${hour.id})" title="Move down" ${isLast ? 'disabled' : ''}>▼</button>
                        <button type="button" class="hour-remove-btn" onclick="removeSpecialHour(${hour.id})" title="Remove">×</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Attach event listeners to update hour data and live preview
    container.querySelectorAll('.hour-day, .hour-hours').forEach(input => {
        input.addEventListener('input', (e) => {
            updateSpecialHourData(e);
            debouncedLivePreview();
            debouncedCaptureState(); // Capture after user stops typing
        });
    });

    // Update preview after rendering hours
    updateLivePreview();

    // Show/hide reminder based on special hours
    const reminder = document.getElementById('specialHoursReminder');
    if (reminder) {
        reminder.style.display = specialHours.length > 0 ? 'block' : 'none';
    }
}

// Update special hour data from inputs
function updateSpecialHourData(e) {
    const hourId = parseInt(e.target.dataset.hourId);
    const hour = specialHours.find(h => h.id === hourId);
    if (!hour) return;

    if (e.target.classList.contains('hour-day')) {
        hour.day = e.target.value;
    } else if (e.target.classList.contains('hour-hours')) {
        hour.hours = e.target.value;
    }
}

// Render How to Shop section (wrapper with expand/collapse)
function renderHowToShopSection() {
    const wrapper = document.getElementById('howToShopWrapper');
    if (!wrapper) return;

    if (!howToShopExpanded) {
        // Collapsed state - show summary
        const itemCount = howToShopItems.filter(item => item.text && item.text.trim()).length;
        wrapper.innerHTML = `
            <div class="collapsible-section-header" onclick="toggleHowToShop()">
                <span class="section-label">How to Shop (${itemCount} items)</span>
                <button type="button" class="edit-section-btn">Edit ▼</button>
            </div>
        `;
    } else {
        // Expanded state - show all items
        wrapper.innerHTML = `
            <div class="collapsible-section-header expanded" onclick="toggleHowToShop()">
                <span class="section-label">How to Shop</span>
                <button type="button" class="edit-section-btn">Collapse ▲</button>
            </div>
            <div class="collapsible-section-content">
                <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
                    <button type="button" class="btn" onclick="addHowToShopItem(); event.stopPropagation();" style="padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Item</button>
                </div>
                <div id="howToShopItemsContainer"></div>
            </div>
        `;
        // Render the items
        renderHowToShopItems();
    }
}

// Render How to Shop items (called when expanded)
function renderHowToShopItems() {
    const container = document.getElementById('howToShopItemsContainer');
    if (!container) return;

    container.innerHTML = howToShopItems.map((item, index) => {
        const safeId = escapeAttr(String(item.id));
        const isFirst = index === 0;
        const isLast = index === howToShopItems.length - 1;

        return `
            <div class="editable-item-row" data-item-id="${safeId}">
                <div class="editable-item-fields">
                    <div class="form-group">
                        <input type="text" class="form-input shop-item-text" data-item-id="${safeId}" value="${escapeAttr(item.text)}" placeholder="e.g., Visit us in-store for outlet-exclusive deals">
                    </div>
                    <div class="item-controls">
                        <button type="button" class="order-btn" onclick="moveHowToShopItemUp(${item.id})" title="Move up" ${isFirst ? 'disabled' : ''}>▲</button>
                        <button type="button" class="order-btn" onclick="moveHowToShopItemDown(${item.id})" title="Move down" ${isLast ? 'disabled' : ''}>▼</button>
                        <button type="button" class="item-remove-btn" onclick="removeHowToShopItem(${item.id})" title="Remove">×</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Attach event listeners
    container.querySelectorAll('.shop-item-text').forEach(input => {
        input.addEventListener('input', (e) => {
            const itemId = parseInt(e.target.dataset.itemId);
            const item = howToShopItems.find(i => i.id === itemId);
            if (item) {
                item.text = e.target.value;
                debouncedLivePreview();
                debouncedCaptureState(); // Capture after user stops typing
            }
        });
    });

    updateLivePreview();
}

// Render Important Notes section (wrapper with expand/collapse)
function renderImportantNotesSection() {
    const wrapper = document.getElementById('importantNotesWrapper');
    if (!wrapper) return;

    if (!importantNotesExpanded) {
        // Collapsed state - show summary
        const itemCount = importantNotesItems.filter(item => item.text && item.text.trim()).length;
        wrapper.innerHTML = `
            <div class="collapsible-section-header" onclick="toggleImportantNotes()">
                <span class="section-label">Important Notes (${itemCount} items)</span>
                <button type="button" class="edit-section-btn">Edit ▼</button>
            </div>
        `;
    } else {
        // Expanded state - show all items
        wrapper.innerHTML = `
            <div class="collapsible-section-header expanded" onclick="toggleImportantNotes()">
                <span class="section-label">Important Notes</span>
                <button type="button" class="edit-section-btn">Collapse ▲</button>
            </div>
            <div class="collapsible-section-content">
                <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
                    <button type="button" class="btn" onclick="addImportantNotesItem(); event.stopPropagation();" style="padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Item</button>
                </div>
                <div id="importantNotesItemsContainer"></div>
            </div>
        `;
        // Render the items
        renderImportantNotesItems();
    }
}

// Render Important Notes items (called when expanded)
function renderImportantNotesItems() {
    const container = document.getElementById('importantNotesItemsContainer');
    if (!container) return;

    container.innerHTML = importantNotesItems.map((item, index) => {
        const safeId = escapeAttr(String(item.id));
        const isFirst = index === 0;
        const isLast = index === importantNotesItems.length - 1;

        return `
            <div class="editable-item-row" data-item-id="${safeId}">
                <div class="editable-item-fields">
                    <div class="form-group">
                        <input type="text" class="form-input notes-item-text" data-item-id="${safeId}" value="${escapeAttr(item.text)}" placeholder="e.g., See attached PDF for complete model details">
                    </div>
                    <div class="item-controls">
                        <button type="button" class="order-btn" onclick="moveImportantNotesItemUp(${item.id})" title="Move up" ${isFirst ? 'disabled' : ''}>▲</button>
                        <button type="button" class="order-btn" onclick="moveImportantNotesItemDown(${item.id})" title="Move down" ${isLast ? 'disabled' : ''}>▼</button>
                        <button type="button" class="item-remove-btn" onclick="removeImportantNotesItem(${item.id})" title="Remove">×</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Attach event listeners
    container.querySelectorAll('.notes-item-text').forEach(input => {
        input.addEventListener('input', (e) => {
            const itemId = parseInt(e.target.dataset.itemId);
            const item = importantNotesItems.find(i => i.id === itemId);
            if (item) {
                item.text = e.target.value;
                debouncedLivePreview();
                debouncedCaptureState(); // Capture after user stops typing
            }
        });
    });

    updateLivePreview();
}

// Initialize default How to Shop and Important Notes items
function initializeDefaultItems() {
    if (howToShopItems.length === 0) {
        const storePhone = getStorePhone();
        const storeEmail = userProfile && userProfile.storeEmail ? userProfile.storeEmail : 'store@citizenwatchgroup.com';

        howToShopItems = [
            { id: Date.now() + 1, text: 'Visit us in-store for outlet-exclusive deals' },
            { id: Date.now() + 2, text: `Call ${storePhone} for availability` },
            { id: Date.now() + 3, text: '$20 flat-rate ground shipping in US' },
            { id: Date.now() + 4, text: `Email ${storeEmail}` }
        ];
    }

    if (importantNotesItems.length === 0) {
        importantNotesItems = [
            { id: Date.now() + 10, text: '*Select models only' },
            { id: Date.now() + 11, text: 'See attached PDF for complete model details' },
            { id: Date.now() + 12, text: 'Limited availability - while supplies last' },
            { id: Date.now() + 13, text: 'Email response time up to 48 hours' }
        ];

        // Add store directions if available
        if (userProfile && userProfile.storeDirections) {
            importantNotesItems.push({
                id: Date.now() + 14,
                text: `Find us at ${userProfile.storeDirections}`
            });
        }
    }
}

// Render the promotion email form
function renderPromotionEmailForm() {
    // Reset all arrays
    promotionEntries = [];
    specialHours = [];
    howToShopItems = [];
    importantNotesItems = [];

    // Initialize default items
    initializeDefaultItems();

    elements.formFields.innerHTML = `
        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-bottom: 1.5rem;">
            <button type="button" class="undo-redo-btn" id="undoBtn" title="Undo (Ctrl+Z)" disabled>
                <span>↶ Undo</span>
            </button>
            <button type="button" class="undo-redo-btn" id="redoBtn" title="Redo (Ctrl+Y)" disabled>
                <span>↷ Redo</span>
            </button>
        </div>

        <div class="form-group">
            <label class="form-label">Date Range *</label>
            <div class="input-wrapper">
                <input type="text" class="form-input" id="promoDateRange" placeholder="Nov 28 - Dec 1" required>
                <button class="clear-input" data-clear="promoDateRange" title="Clear">×</button>
            </div>
            <div class="field-help">Used for auto-title generation and display</div>
        </div>

        <div class="form-group">
            <label class="form-label">Year (optional)</label>
            <div class="input-wrapper">
                <input type="text" class="form-input" id="promoYear" placeholder="Auto-uses current year">
                <button class="clear-input" data-clear="promoYear" title="Clear">×</button>
            </div>
            <div class="field-help">Override for cross-year sales (e.g., Dec 30 - Jan 3)</div>
        </div>

        <div class="form-group">
            <label class="form-label">Title (optional)</label>
            <div class="input-wrapper">
                <input type="text" class="form-input" id="promoTitle" placeholder="Leave blank for auto-generation">
                <button class="clear-input" data-clear="promoTitle" title="Clear">×</button>
            </div>
            <div class="field-help">Auto-generates based on date (Black Friday, Holiday Sale, etc.)</div>
        </div>

        <div class="form-group full-width" style="margin-top: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <label class="form-label" style="margin-bottom: 0;">Discount Entries</label>
                <button type="button" class="btn" id="addEntryBtn" style="flex: 0 0 auto; padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Entry</button>
            </div>
            <div id="promotionEntriesContainer"></div>
        </div>

        <div class="form-group full-width" style="margin-top: 2rem;">
            <div id="howToShopWrapper"></div>
        </div>

        <div class="form-group full-width" style="margin-top: 2rem;">
            <div id="importantNotesWrapper"></div>
        </div>

        <div class="form-group full-width" style="margin-top: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <label class="form-label" style="margin-bottom: 0;">Special Hours (optional)</label>
                <button type="button" class="btn" id="addHourBtn" style="flex: 0 0 auto; padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Special Hours</button>
            </div>
            <div class="field-help" style="margin-bottom: 1rem;">For holidays or special sale hours (e.g., Black Friday extended hours)</div>
            <div id="specialHoursContainer"></div>
            <div id="specialHoursReminder" style="display: none; background: #fff3cd; border-left: 3px solid #ffc107; padding: 1rem; margin-top: 1rem;">
                <strong>⚠️ Reminder:</strong> Don't forget to update your special hours on Yelp and Google Maps!
            </div>
        </div>
    `;

    // Add event listeners
    const dateRangeInput = document.getElementById('promoDateRange');
    const yearInput = document.getElementById('promoYear');
    const titleInput = document.getElementById('promoTitle');
    const addTierBtn = document.getElementById('addTierBtn');

    // Date range input listener
    if (dateRangeInput) {
        dateRangeInput.addEventListener('input', () => {
            const clearBtn = document.querySelector('[data-clear="promoDateRange"]');
            if (clearBtn) {
                clearBtn.classList.toggle('visible', dateRangeInput.value.trim().length > 0);
            }
            debouncedLivePreview(); // Update preview as user types
        });

        // Clear button
        const clearDateBtn = document.querySelector('[data-clear="promoDateRange"]');
        if (clearDateBtn) {
            clearDateBtn.addEventListener('click', () => {
                dateRangeInput.value = '';
                clearDateBtn.classList.remove('visible');
                dateRangeInput.focus();
                updateLivePreview();
            });
        }
    }

    // Year input listener
    if (yearInput) {
        yearInput.addEventListener('input', () => {
            const clearBtn = document.querySelector('[data-clear="promoYear"]');
            if (clearBtn) {
                clearBtn.classList.toggle('visible', yearInput.value.trim().length > 0);
            }
            debouncedLivePreview(); // Update preview as user types
        });

        // Clear button
        const clearYearBtn = document.querySelector('[data-clear="promoYear"]');
        if (clearYearBtn) {
            clearYearBtn.addEventListener('click', () => {
                yearInput.value = '';
                clearYearBtn.classList.remove('visible');
                yearInput.focus();
                updateLivePreview();
            });
        }
    }

    // Title input listener
    if (titleInput) {
        titleInput.addEventListener('input', () => {
            const clearBtn = document.querySelector('[data-clear="promoTitle"]');
            if (clearBtn) {
                clearBtn.classList.toggle('visible', titleInput.value.trim().length > 0);
            }
            debouncedLivePreview(); // Update preview as user types
        });

        // Clear button
        const clearTitleBtn = document.querySelector('[data-clear="promoTitle"]');
        if (clearTitleBtn) {
            clearTitleBtn.addEventListener('click', () => {
                titleInput.value = '';
                clearTitleBtn.classList.remove('visible');
                titleInput.focus();
                updateLivePreview();
            });
        }
    }

    // Add entry button
    const addEntryBtn = document.getElementById('addEntryBtn');
    if (addEntryBtn) {
        addEntryBtn.addEventListener('click', addPromotionEntry);
    }

    // Add special hour button
    const addHourBtn = document.getElementById('addHourBtn');
    if (addHourBtn) {
        addHourBtn.addEventListener('click', addSpecialHour);
    }

    // Add initial entry
    addPromotionEntry();

    // Render collapsible sections
    renderHowToShopSection();
    renderImportantNotesSection();

    // Wire up undo/redo buttons
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    if (undoBtn) {
        undoBtn.addEventListener('click', undo);
    }
    if (redoBtn) {
        redoBtn.addEventListener('click', redo);
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', handleUndoRedoShortcuts);

    // Capture initial state
    captureState();
}

// Handle keyboard shortcuts for undo/redo
function handleUndoRedoShortcuts(e) {
    // Only apply in promotion email mode
    if (currentTemplate !== 'promotion-email') return;

    // Ctrl+Z or Cmd+Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
    }

    // Ctrl+Y or Cmd+Y or Ctrl+Shift+Z for redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
    }
}

// Generate promotion email HTML
function generatePromotionEmailHTML(data) {
    const dateRange = data.promoDateRange || '';
    const title = data.promoTitle && data.promoTitle.trim() ? data.promoTitle : generatePromoTitle(dateRange);

    // Use override year if provided, otherwise use current year
    const year = data.promoYear && data.promoYear.trim() ? data.promoYear.trim() : new Date().getFullYear();

    // Get store info from profile
    const storePhone = getStorePhone();
    const storeName = getStoreName();

    // Build brand sections from entries
    let brandSections = '';
    promotionEntries.forEach(entry => {
        if (!entry.brand || !entry.discount) return; // Skip incomplete entries

        let collectionsHTML = '';
        if (entry.collections && entry.collections.trim()) {
            const collections = entry.collections.split(',').map(c => c.trim()).filter(c => c);
            collectionsHTML = collections.map(c => `*${c}`).join(' • ');
        }

        brandSections += `
                <p style="font-size: 18px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-bottom: 8px;"><b>${entry.brand} - ${entry.discount}% OFF</b></p>`;

        if (collectionsHTML) {
            brandSections += `
                <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-left: 20px; margin-top: 0; margin-bottom: ${entry.callout ? '5px' : '20px'};">
                    ${collectionsHTML}
                </p>`;
        }

        if (entry.callout && entry.callout.trim()) {
            brandSections += `
                <p style="font-size: 13px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-left: 20px; margin-top: 0; margin-bottom: 20px; color: #0066cc; font-style: italic;">
                    ${entry.callout}
                </p>`;
        }
    });

    // Get store-specific details from user profile
    let storeAddress = '7400 Las Vegas Blvd. South, Suite 231<br>Las Vegas, NV 89123';
    let storeMapLink = 'https://www.google.com/maps?q=36.05145495363422,-115.16933573536541'; // Default
    let storeEmail = storePhone.replace(/\D/g, ''); // Default fallback
    let storeHours = 'Mon–Sat: 10AM–8PM | Sun: 10AM–7PM';

    // Override with user profile data if available
    if (userProfile) {
        if (userProfile.storeEmail) {
            storeEmail = userProfile.storeEmail;
        } else if (userProfile.storeName) {
            // Auto-generate email from store name
            const emailPrefix = userProfile.storeName.toLowerCase().replace(/\s+/g, '');
            storeEmail = `${emailPrefix}@citizenwatchgroup.com`;
        }

        if (userProfile.storeAddress) {
            storeAddress = userProfile.storeAddress.replace(/\n/g, '<br>');
        }

        if (userProfile.storeHours) {
            storeHours = userProfile.storeHours;
        }

        // Build Google Maps link with priority: coordinates > address
        if (userProfile.storeMapCoords && userProfile.storeMapCoords.trim()) {
            // Priority 1: Use coordinates if available
            storeMapLink = `https://www.google.com/maps?q=${encodeURIComponent(userProfile.storeMapCoords)}`;
        } else if (userProfile.storeAddress && userProfile.storeAddress.trim()) {
            // Priority 2: Use address text for search if no coordinates
            const addressForSearch = userProfile.storeAddress.replace(/<br>/g, ' ').replace(/\n/g, ' ');
            storeMapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressForSearch)}`;
        }
    }

    // Build How to Shop section from array
    let howToShopHTML = howToShopItems
        .filter(item => item.text && item.text.trim())
        .map(item => `• ${item.text}`)
        .join('<br>\n                    ');

    // Build Important Notes section from array
    let importantNotesHTML = importantNotesItems
        .filter(item => item.text && item.text.trim())
        .map(item => `• ${item.text}`)
        .join('<br>\n                    ');

    return `<!DOCTYPE html>
<html>
<head>
    <title>Weekly Sale</title>
</head>
<body style="font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 14px; background-color: white; margin: 0; padding: 0;">

    <center>
    <table width="600" style="background-color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif;">

        <!-- HEADER -->
        <tr>
            <td style="padding: 20px; text-align: center; border-bottom: 2px solid gray;">
                <h1 style="font-size: 24px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">${title}</h1>
                <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 10px 0 0 0;">${dateRange}, ${year} • While Supplies Last</p>
            </td>
        </tr>

        <!-- MAIN CONTENT -->
        <tr>
            <td style="padding: 25px;">

                <!-- BRAND SECTIONS -->
${brandSections}

                <!-- HOW TO SHOP BOX -->
                <div style="background-color: #f5f5f5; padding: 15px; margin-bottom: 20px;">
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0 0 10px 0;"><b>HOW TO SHOP</b></p>
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">
                    ${howToShopHTML}</p>
                </div>

                <!-- IMPORTANT NOTES BOX -->
                <div style="border: 1px solid #ddd; padding: 15px;">
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0 0 10px 0;"><b>IMPORTANT NOTES</b></p>
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">
                    ${importantNotesHTML}</p>
                </div>

            </td>
        </tr>

        <!-- FOOTER -->
        <tr>
            <td style="background-color: #2c3e50; padding: 20px; text-align: center;">
                <h3 style="color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 18px; margin: 0 0 10px 0;">CITIZEN COMPANY STORE</h3>
                <p style="color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 14px; margin: 5px 0;">
                    📍 <a href="${storeMapLink}" target="_blank" style="color: white;">
                    ${storeAddress}</a>
                </p>
                <p style="color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 14px; margin: 5px 0;">
                    📞 <a href="tel:+1${storePhone.replace(/\D/g, '')}" target="_blank" style="color: white;">${storePhone}</a> |
                    📧 <a href="mailto:${storeEmail}" target="_blank" style="color: white;">${storeEmail}</a>
                </p>
                <p style="color: #ffd700; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 13px; margin: 10px 0 0 0;">
                    <b>STORE HOURS</b><br>
                    ${storeHours}
                </p>${specialHours.length > 0 ? `
                <p style="color: #ffd700; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 13px; margin: 10px 0 0 0;">
                    <b>SPECIAL HOURS</b><br>
                    ${specialHours.map(hour => hour.day && hour.hours ? `${hour.day}: ${hour.hours}` : '').filter(h => h).join('<br>')}
                </p>` : ''}
            </td>
        </tr>

        <!-- UNSUBSCRIBE -->
        <tr>
            <td style="background-color: #f4f4f4; padding: 15px; text-align: center;">
                <p style="font-size: 12px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">
                    No longer interested? Simply reply to this email with <b>"UNSUBSCRIBE"</b>
                </p>
            </td>
        </tr>

    </table>
    </center>

</body>
</html>`;
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

        // Handle custom promotion email template
        if (template.customTemplate && key === 'promotion-email') {
            renderPromotionEmailForm();
            showTabbedOutput();
            elements.clearBtn.disabled = false;
            return;
        }

        // Show regular output for non-promotion templates
        showRegularOutput();

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
                } else if (field === 'storePhone' && userProfile.storePhone) {
                    autoFillValue = escapeAttr(userProfile.storePhone);
                } else if (field === 'storeName' && userProfile.storeName) {
                    autoFillValue = escapeAttr(userProfile.storeName);
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
        const template = templates[currentTemplate];

        // Handle promotion email specially - force refresh live preview
        if (currentTemplate === 'promotion-email') {
            const dateRangeInput = document.getElementById('promoDateRange');

            if (!dateRangeInput || !dateRangeInput.value.trim()) {
                showToast('⚠ Date range is required');
                return;
            }

            if (promotionEntries.length === 0) {
                showToast('⚠ Add at least one discount entry');
                return;
            }

            // Force immediate update of live preview
            updateLivePreview();
            showToast('✓ Preview refreshed!');
            return;
        }

        // Regular template handling
        highlightEmptyRequiredFields();
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
        // Clear all promotion email arrays
        if (currentTemplate === 'promotion-email') {
            promotionEntries = [];
            specialHours = [];
            howToShopItems = [];
            importantNotesItems = [];
        }

        const inputs = elements.formFields.querySelectorAll('.form-input, .form-textarea');
        inputs.forEach(input => input.value = '');

        // Reset to regular output
        showRegularOutput();

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

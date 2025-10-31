// Constants
const TOAST_DURATION_MS = 2500;

// ===== CUSTOMIZABLE PALETTE SYSTEM (Light / Dark with 5 palettes each) =====

// Initialize theme and palettes from localStorage
function initTheme() {
    // Load current mode (light or dark)
    const savedMode = localStorage.getItem('currentMode') || 'light';

    // Load palette preferences (defaults: pastel for light, midnight-blue for dark)
    const lightPalette = localStorage.getItem('lightPalette') || 'pastel';
    const darkPalette = localStorage.getItem('darkPalette') || 'midnight-blue';

    // Apply theme and palettes
    document.documentElement.setAttribute('data-theme', savedMode);
    document.documentElement.setAttribute('data-light-palette', lightPalette);
    document.documentElement.setAttribute('data-dark-palette', darkPalette);

    updateThemeIndicator(savedMode);
}

// Simple toggle between light and dark modes
function toggleTheme() {
    const currentMode = document.documentElement.getAttribute('data-theme') || 'light';
    const newMode = currentMode === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newMode);
    localStorage.setItem('currentMode', newMode);
    updateThemeIndicator(newMode);

    // Add pulse animation
    const themeToggle = elements.themeToggle;
    if (themeToggle) {
        themeToggle.style.animation = 'none';
        setTimeout(() => {
            themeToggle.style.animation = 'pulse 0.3s ease';
        }, 10);
    }
}

// Update theme toggle visual indicator
function updateThemeIndicator(theme) {
    const slider = document.querySelector('.theme-toggle-slider');
    if (!slider) return;

    // Position slider based on theme (2-position toggle)
    const positions = {
        'light': '0px',
        'dark': '28px'
    };

    // Update slider position
    slider.style.transform = `translateX(${positions[theme]})`;

    // Update slider colors based on theme
    const gradients = {
        'light': 'linear-gradient(135deg, #a98467, #d4a574)',
        'dark': 'linear-gradient(135deg, #00f5ff, #b537f2)'
    };

    slider.style.background = gradients[theme];
}

// Update light mode palette
function setLightPalette(paletteName) {
    document.documentElement.setAttribute('data-light-palette', paletteName);
    localStorage.setItem('lightPalette', paletteName);
}

// Update dark mode palette
function setDarkPalette(paletteName) {
    document.documentElement.setAttribute('data-dark-palette', paletteName);
    localStorage.setItem('darkPalette', paletteName);
}


// Toggle navigation visibility
function toggleNavigation() {
    const navigation = elements.navigation;
    const navToggleText = elements.navToggleText;

    if (!navigation) return;

    const isCollapsed = navigation.classList.toggle('collapsed');

    if (navToggleText) {
        navToggleText.textContent = isCollapsed ? 'Show Navigation' : 'Hide Navigation';
    }

    // Save state
    localStorage.setItem('navCollapsed', isCollapsed);
}

// Initialize navigation state
function initNavigation() {
    const navCollapsed = localStorage.getItem('navCollapsed') === 'true';
    const navigation = elements.navigation;
    const navToggleText = elements.navToggleText;

    if (navCollapsed && navigation) {
        navigation.classList.add('collapsed');
        if (navToggleText) {
            navToggleText.textContent = 'Show Navigation';
        }
    }
}

// Add pulse animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }
`;
document.head.appendChild(style);

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

// Sanitize template data to prevent XSS attacks
function sanitizeTemplateData(data) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeHTML(value);
        } else {
            sanitized[key] = value; // Keep non-string values as-is
        }
    }
    return sanitized;
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
            const safe = sanitizeTemplateData(data);
            let features = `• ${safe.keyFeature1}`;
            if (safe.keyFeature2) features += `\n• ${safe.keyFeature2}`;
            if (safe.keyFeature3) features += `\n• ${safe.keyFeature3}`;
            return `Subject: Great News! ${safe.modelName} Now Available

Hi ${safe.customerName},

Great news! The ${safe.brand} ${safe.modelName} (${safe.modelNumber}) you were interested in has arrived at our store.

Key Features:
${features}

Current price: ${safe.price}

I'd be happy to set up an appointment to show you all the features of this watch and let you try it on. This model tends to generate a lot of interest, so I wanted to reach out to you first.

Would you like to schedule a time to see it in person? Please reply to this email or call the store at ${getStorePhone()}.

Looking forward to hearing from you!

Best regards,
${safe.employeeName}
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

P.S. - Given the limited availability, I'm only reaching out to our most valued collectors. Let me know if you're interested!`;
        }
    },
    'vip-reconnection': {
        name: 'VIP Reconnection',
        category: 'Customer Email',
        fields: ['clientName', 'employeeName'],
        generate: (data) => {
            const safe = sanitizeTemplateData(data);
            return `Subject: Your Store Has Evolved - We'd Love to Show You What's New

Hi ${safe.clientName},

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
${safe.employeeName}
${getStoreName()}

P.S. - We now carry everything from current season pieces to discontinued treasures, giving you more options than ever before.`;
        }
    },
    'phone-confirmation': {
        name: 'Confirmation',
        category: 'Phone Orders',
        fields: ['customerName', 'brand', 'modelName', 'modelNumber', 'price', 'discount', 'totalAmount', 'customerAddress', 'carrier', 'trackingNumber', 'employeeName'],
        generate: (data) => {
            const safe = sanitizeTemplateData(data);
            let trackingInfo = '';
            if (safe.trackingNumber) {
                trackingInfo = `\n\nTracking Number: ${safe.trackingNumber}`;
            }
            return `Subject: Order Confirmation - ${safe.modelName}

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

Best regards,
${safe.employeeName}
${getStoreName()}`;
        }
    },
    'phone-shipped': {
        name: 'Shipped with Tracking',
        category: 'Phone Orders',
        fields: ['customerName', 'brand', 'modelName', 'modelNumber', 'trackingNumber', 'customerAddress', 'employeeName'],
        generate: (data) => {
            const safe = sanitizeTemplateData(data);
            return `Subject: Your Watch Order - Tracking Information

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

Best regards,
${safe.employeeName}
${getStoreName()}`;
        }
    },
    'phone-under-500': {
        name: 'Under $500 Request',
        category: 'Phone Orders',
        fields: ['managerNameOrStoreName', 'customerName', 'customerId', 'employeeName', 'employeeId', 'unitsQuantity', 'totalAmount', 'creditCardVerified', 'needsManagerVerification'],
        generate: (data) => {
            const safe = sanitizeTemplateData(data);
            if (!safe.creditCardVerified || safe.creditCardVerified.toLowerCase() !== 'yes') {
                throw new Error('Credit card must be verified before generating this order form.');
            }

            let orderStatus = '';
            let closing = '';

            if (safe.needsManagerVerification && safe.needsManagerVerification.toLowerCase() === 'yes') {
                orderStatus = 'Ready for manager verification';
                closing = 'Please verify and sign off. If you need anything else, please let me know.';
            } else {
                orderStatus = 'Credit card manager verified - Ready for processing';
                closing = 'Let me know if you need anything else.';
            }

            return `Subject: Phone Order Form for ${safe.customerName}

Hi ${safe.managerNameOrStoreName},

Attached is the form for the phone order for ${safe.customerName} (${safe.customerId}).

Ringing under: ${safe.employeeName} (${safe.employeeId})
Units: ${safe.unitsQuantity}
Total: ${safe.totalAmount}

Order Status: ${orderStatus}

${closing}

Best regards,
${safe.employeeName}`;
        }
    },
    'phone-corporate': {
        name: 'Corporate Approval',
        category: 'Phone Orders',
        fields: ['customerName', 'customerId', 'employeeName', 'employeeId', 'unitsQuantity', 'totalAmount', 'fulfillingStore', 'yourName'],
        generate: (data) => {
            const safe = sanitizeTemplateData(data);
            return `Subject: Phone Order Approval Request - ${safe.customerName}

Hello,

I am forwarding a request for approval on a phone order for ${safe.employeeName} (${safe.employeeId}).

There are ${safe.unitsQuantity} units totaling ${safe.totalAmount}. It will be fulfilled at ${safe.fulfillingStore}.

Customer: ${safe.customerName} (${safe.customerId})

I have verified and signed off. Please let us know if you have any questions.

Thank You,
${safe.yourName}`;
        }
    },
    'inter-store-notification': {
        name: 'Inter-Store Notification',
        category: 'Phone Orders',
        fields: ['recipientStoreName', 'customerName', 'trackingNumber'],
        generate: (data) => {
            const safe = sanitizeTemplateData(data);
            return `Subject: Phone Order Processed and Shipped - ${safe.customerName}

Hi ${safe.recipientStoreName} Team,

The phone order for ${safe.customerName} has been rung and labeled for shipping.

UPS Tracking Number: ${safe.trackingNumber}

The package has been prepared and is ready for UPS pickup.

Thank you,`;
        }
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

            return `Hi ${safe.customerName}! This is ${safe.employeeName} from ${getFullStoreLocation()}. The ${safe.modelName} you were interested in is on ${safe.discount}% OFF promotion (MSRP ${safe.msrp} now ${salePrice} plus tax) until ${safe.endDate}. Please let me know if you'd like me to hold one for you. Thank you!`;
        }
    },
    'weekly-sale': {
        name: 'Weekly Sale',
        category: 'Customer Email',
        fields: ['customerName', 'collectionName', 'discount', 'brand', 'model1', 'price1', 'original1', 'model2', 'price2', 'original2', 'endDate', 'employeeName'],
        generate: (data) => {
            const safe = sanitizeTemplateData(data);
            let modelList = `• ${safe.model1} - Now ${safe.price1} (was ${safe.original1})`;
            if (safe.model2 && safe.price2) {
                modelList += `\n• ${safe.model2} - Now ${safe.price2} (was ${safe.original2})`;
            }
            return `Subject: ${safe.customerName}, This Week's ${safe.brand} Sale Includes Your Favorites

Hi ${safe.customerName},

I remember you were looking at ${safe.collectionName} pieces during your last visit. Good timing - we just started our ${safe.discount}% off promotion on select ${safe.brand} models this week!

Specifically available in that collection:
${modelList}

This promotion runs through ${safe.endDate}. Would you like me to check if we have your size preference in stock?

Best regards,
${safe.employeeName}
${getStoreName()}`;
        }
    },
    'promotion-email': {
        name: 'Promotion Email',
        category: 'Customer Email',
        customTemplate: true,
        fields: ['promoDateRange', 'promoYear', 'promoTitle', 'promoRecipient'],
        generate: (data) => {
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
let attachedPDFs = []; // PDF attachments with file data
let generatedSubjectLines = []; // Array of 10 generated subject line options
let selectedSubjectLine = null; // User's selected subject line

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
        importantNotesItems: JSON.parse(JSON.stringify(importantNotesItems)),
        attachedPDFs: JSON.parse(JSON.stringify(attachedPDFs)),
        generatedSubjectLines: JSON.parse(JSON.stringify(generatedSubjectLines)),
        selectedSubjectLine: selectedSubjectLine
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
    attachedPDFs = state.attachedPDFs ? JSON.parse(JSON.stringify(state.attachedPDFs)) : [];
    generatedSubjectLines = state.generatedSubjectLines ? JSON.parse(JSON.stringify(state.generatedSubjectLines)) : [];
    selectedSubjectLine = state.selectedSubjectLine || null;

    // Re-render all sections without capturing state
    renderPromotionEntries();
    renderSpecialHours();
    renderHowToShopSection();
    renderImportantNotesSection();
    renderAttachedPDFs();
    renderSubjectLines();
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
    const undoBtn = elements.undoBtn;
    const redoBtn = elements.redoBtn;

    if (undoBtn) {
        undoBtn.disabled = historyIndex <= 0;
    }
    if (redoBtn) {
        redoBtn.disabled = historyIndex >= historyStack.length - 1;
    }
}

// Save promotion template configuration to localStorage
function savePromotionTemplate() {
    if (currentTemplate !== 'promotion-email') return;

    // Collapse all entries before saving
    promotionEntries.forEach(entry => {
        entryCollapsedStates[entry.id] = true;
    });
    renderPromotionEntries(); // Update the UI to show collapsed state

    const config = {
        // Metadata
        templateType: 'promotion-email',
        version: '1.0',
        savedAt: new Date().toISOString(),

        // Form fields
        dateRange: getDynamicElement('promoDateRange')?.value || '',
        year: getDynamicElement('promoYear')?.value || '',
        title: getDynamicElement('promoTitle')?.value || '',
        recipient: getDynamicElement('promoRecipient')?.value || '',

        // Data arrays
        promotionEntries: JSON.parse(JSON.stringify(promotionEntries)),
        specialHours: JSON.parse(JSON.stringify(specialHours)),
        howToShopItems: JSON.parse(JSON.stringify(howToShopItems)),
        importantNotesItems: JSON.parse(JSON.stringify(importantNotesItems)),
        attachedPDFs: JSON.parse(JSON.stringify(attachedPDFs)),
        generatedSubjectLines: JSON.parse(JSON.stringify(generatedSubjectLines)),
        selectedSubjectLine: selectedSubjectLine
    };

    localStorage.setItem('savedPromotionTemplate', JSON.stringify(config));
    showToast('✓ Template saved successfully');
}

// Import promotion template - supports both localStorage and file selection
function importPromotionTemplate() {
    if (currentTemplate !== 'promotion-email') return;

    // Create file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.style.display = 'none';

    // Handle file selection
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const config = JSON.parse(event.target.result);

                // Additional validation for file imports
                if (!config || typeof config !== 'object') {
                    showToast('✗ Invalid template file - not a valid configuration object');
                    return;
                }

                // Check if this looks like a promotion template (backwards compatible)
                if (config.templateType && config.templateType !== 'promotion-email') {
                    showToast('✗ Invalid template file - not a promotion email template');
                    return;
                }
                if (!('promotionEntries' in config) || !('specialHours' in config)) {
                    showToast('✗ Invalid template file - missing required promotion template fields');
                    return;
                }

                applyImportedConfig(config, true); // true = collapse entries on import
                showToast('✓ Template imported from file successfully');
            } catch (error) {
                console.error('Import error:', error);
                showToast('✗ Error reading template file - Invalid JSON or corrupted file');
            }
        };

        reader.onerror = () => {
            showToast('✗ Error reading file');
        };

        reader.readAsText(file);
    });

    // Trigger file selection
    document.body.appendChild(fileInput);
    fileInput.click();

    // Clean up
    setTimeout(() => {
        document.body.removeChild(fileInput);
    }, 1000);
}

// Helper function to apply imported configuration
function applyImportedConfig(config, collapseEntries = true) {
    if (!config || typeof config !== 'object') {
        showToast('✗ Invalid template data - not an object');
        return;
    }

    // Check template type if present (backwards compatible)
    if (config.templateType && config.templateType !== 'promotion-email') {
        showToast('✗ Invalid template data - wrong template type');
        return;
    }

    // Validate required fields exist and are correct types
    if (!Array.isArray(config.promotionEntries)) {
        showToast('✗ Invalid template data - promotionEntries must be an array');
        return;
    }
    if (!Array.isArray(config.specialHours)) {
        showToast('✗ Invalid template data - specialHours must be an array');
        return;
    }
    if (!Array.isArray(config.howToShopItems)) {
        showToast('✗ Invalid template data - howToShopItems must be an array');
        return;
    }
    if (!Array.isArray(config.importantNotesItems)) {
        showToast('✗ Invalid template data - importantNotesItems must be an array');
        return;
    }
    if (!Array.isArray(config.attachedPDFs)) {
        showToast('✗ Invalid template data - attachedPDFs must be an array');
        return;
    }
    if (!Array.isArray(config.generatedSubjectLines)) {
        showToast('✗ Invalid template data - generatedSubjectLines must be an array');
        return;
    }

    // Restore form fields (with delay to ensure DOM is ready)
    setTimeout(() => {
        const dateRangeInput = getDynamicElement('promoDateRange');
        const yearInput = getDynamicElement('promoYear');
        const titleInput = getDynamicElement('promoTitle');
        const recipientInput = getDynamicElement('promoRecipient');

        if (dateRangeInput) dateRangeInput.value = config.dateRange || '';
        if (yearInput) yearInput.value = config.year || '';
        if (titleInput) titleInput.value = config.title || '';
        if (recipientInput) recipientInput.value = config.recipient || '';
    }, 100);

    // Restore arrays
    promotionEntries = JSON.parse(JSON.stringify(config.promotionEntries || []));
    specialHours = JSON.parse(JSON.stringify(config.specialHours || []));
    howToShopItems = JSON.parse(JSON.stringify(config.howToShopItems || []));
    importantNotesItems = JSON.parse(JSON.stringify(config.importantNotesItems || []));
    attachedPDFs = JSON.parse(JSON.stringify(config.attachedPDFs || []));
    generatedSubjectLines = JSON.parse(JSON.stringify(config.generatedSubjectLines || []));
    selectedSubjectLine = config.selectedSubjectLine || null;

    // Set collapse state for all entries
    if (collapseEntries) {
        // When importing, collapse all entries by default
        entryCollapsedStates = {};
        promotionEntries.forEach(entry => {
            entryCollapsedStates[entry.id] = true;
        });
    }

    // Re-render all sections
    renderPromotionEntries();
    renderSpecialHours();
    renderHowToShopSection();
    renderImportantNotesSection();
    renderAttachedPDFs();
    renderSubjectLines();

    // Update live preview and capture state
    updateLivePreview();
    captureState();
}

// Import from localStorage (for backwards compatibility)
function importFromLocalStorage() {
    if (currentTemplate !== 'promotion-email') return;

    try {
        const saved = localStorage.getItem('savedPromotionTemplate');
        if (!saved) {
            showToast('⚠ No saved template found in browser storage');
            return;
        }

        const config = JSON.parse(saved);
        applyImportedConfig(config, true); // true = collapse entries on import
        showToast('✓ Template imported from browser storage');
    } catch (e) {
        console.error('Import error:', e);
        showToast('✗ Error importing from browser storage');
    }
}

// Export promotion template configuration as JSON file
function exportPromotionTemplate() {
    if (currentTemplate !== 'promotion-email') return;

    const config = {
        // Metadata
        templateType: 'promotion-email',
        version: '1.0',
        exportedAt: new Date().toISOString(),

        // Form fields
        dateRange: getDynamicElement('promoDateRange')?.value || '',
        year: getDynamicElement('promoYear')?.value || '',
        title: getDynamicElement('promoTitle')?.value || '',
        recipient: getDynamicElement('promoRecipient')?.value || '',

        // Data arrays
        promotionEntries: JSON.parse(JSON.stringify(promotionEntries)),
        specialHours: JSON.parse(JSON.stringify(specialHours)),
        howToShopItems: JSON.parse(JSON.stringify(howToShopItems)),
        importantNotesItems: JSON.parse(JSON.stringify(importantNotesItems)),
        attachedPDFs: JSON.parse(JSON.stringify(attachedPDFs)),
        generatedSubjectLines: JSON.parse(JSON.stringify(generatedSubjectLines)),
        selectedSubjectLine: selectedSubjectLine
    };

    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `promotion-template-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    showToast('✓ Template exported successfully');
}

// OS detection for format selection
function detectOS() {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('win')) return 'windows';
    if (platform.includes('mac')) return 'mac';
    return 'other';
}

function getRecommendedFormat() {
    const os = detectOS();
    return os === 'mac' ? 'emltpl' : 'eml';
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

// Cached DOM elements for performance optimization
const elements = {
    // Core UI elements (already cached)
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
    outputCard: null,

    // Theme and navigation
    themeToggle: null,
    navToggle: null,
    navToggleText: null,
    navigation: null,

    // Promotion form elements (most frequently accessed - 8-5 calls each)
    promoDateRange: null,
    promoYear: null,
    promoTitle: null,
    promoRecipient: null,

    // Promotion UI containers
    promotionEntriesContainer: null,
    specialHoursContainer: null,
    specialHoursReminder: null,
    howToShopWrapper: null,
    howToShopItemsContainer: null,
    importantNotesWrapper: null,
    importantNotesItemsContainer: null,

    // Subject lines
    subjectLinesContainer: null,
    subjectLineDropdown: null,
    selectedSubjectInput: null,
    selectedSubjectCard: null,
    subjectCharCount: null,

    // PDF handling
    pdfDropzone: null,
    pdfFileInput: null,
    attachedPDFsList: null,

    // Template management
    saveTemplateBtn: null,
    importTemplateBtn: null,
    exportTemplateBtn: null,
    formPlaceholder: null,

    // Undo/Redo
    undoBtn: null,
    redoBtn: null,

    // Bulk email
    bulkEmailList: null,
    batchSize: null,
    batchSizeHelp: null,
    bulkAnalysis: null,
    bulkStats: null,
    generateBulkBtn: null,

    // Dynamic elements (lazy cached)
    openEmailBtn: null,
    codeArea: null,
    previewIframe: null,
    previewContent: null,
    codeContent: null,
    copyPreviewBtn: null,
    addEntryBtn: null,
    addHourBtn: null,
    addTierBtn: null,
    formatStatusText: null
};

// Cache DOM elements on page load for performance optimization
function cacheElements() {
    // Core UI elements
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

    // Theme and navigation
    elements.themeToggle = document.getElementById('themeToggle');
    elements.navToggle = document.getElementById('navToggle');
    elements.navToggleText = document.getElementById('navToggleText');
    elements.navigation = document.getElementById('navigation');

    // Promotion form elements (lazy cached - created dynamically)
    // elements.promoDateRange = document.getElementById('promoDateRange'); // Lazy cached
    // elements.promoYear = document.getElementById('promoYear'); // Lazy cached
    // elements.promoTitle = document.getElementById('promoTitle'); // Lazy cached
    // elements.promoRecipient = document.getElementById('promoRecipient'); // Lazy cached

    // Promotion UI containers
    elements.promotionEntriesContainer = document.getElementById('promotionEntriesContainer');
    elements.specialHoursContainer = document.getElementById('specialHoursContainer');
    elements.specialHoursReminder = document.getElementById('specialHoursReminder');
    elements.howToShopWrapper = document.getElementById('howToShopWrapper');
    elements.howToShopItemsContainer = document.getElementById('howToShopItemsContainer');
    elements.importantNotesWrapper = document.getElementById('importantNotesWrapper');
    elements.importantNotesItemsContainer = document.getElementById('importantNotesItemsContainer');

    // Subject lines
    elements.subjectLinesContainer = document.getElementById('subjectLinesContainer');
    elements.subjectLineDropdown = document.getElementById('subjectLineDropdown');
    elements.selectedSubjectInput = document.getElementById('selectedSubjectInput');
    elements.selectedSubjectCard = document.getElementById('selectedSubjectCard');
    elements.subjectCharCount = document.getElementById('subjectCharCount');

    // PDF handling
    elements.pdfDropzone = document.getElementById('pdfDropzone');
    elements.pdfFileInput = document.getElementById('pdfFileInput');
    elements.attachedPDFsList = document.getElementById('attachedPDFsList');

    // Template management
    elements.saveTemplateBtn = document.getElementById('saveTemplateBtn');
    elements.importTemplateBtn = document.getElementById('importTemplateBtn');
    elements.exportTemplateBtn = document.getElementById('exportTemplateBtn');
    elements.formPlaceholder = document.getElementById('formPlaceholder');

    // Undo/Redo
    elements.undoBtn = document.getElementById('undoBtn');
    elements.redoBtn = document.getElementById('redoBtn');

    // Bulk email
    elements.bulkEmailList = document.getElementById('bulkEmailList');
    elements.batchSize = document.getElementById('batchSize');
    elements.batchSizeHelp = document.getElementById('batchSizeHelp');
    // bulkAnalysis and bulkStats are lazy cached (created dynamically)
    // elements.bulkAnalysis = document.getElementById('bulkAnalysis');
    // elements.bulkStats = document.getElementById('bulkStats');
    elements.generateBulkBtn = document.getElementById('generateBulkBtn');

    // Format status
    elements.formatStatusText = document.getElementById('formatStatusText');
}

// Lazy cache dynamic elements that may not exist on initial load
function getDynamicElement(id) {
    if (!elements[id]) {
        elements[id] = document.getElementById(id);
    }
    return elements[id];
}

// Show tabbed output for promotion emails
function showTabbedOutput() {
    if (!elements.outputCard) return;

    elements.outputCard.innerHTML = `
        <h2 class="section-title">Generated Email</h2>

        <!-- Bulk Email Distribution Section -->
        <div id="bulkEmailSection" style="margin-bottom: 2rem; padding: 1.5rem; background: var(--bg-tertiary); border-radius: var(--radius-md); border: 2px solid var(--border-subtle);">
            <h3 style="margin: 0 0 1rem 0; font-size: 1.1rem; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                    <path d="M2 6l10 8 10-8"></path>
                    <line x1="2" y1="18" x2="22" y2="18"></line>
                </svg>
                Bulk Email Distribution
            </h3>
            <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">Send this promotion to multiple recipients in BCC batches</div>

            <div style="margin-bottom: 1rem;">
                <label for="bulkEmailList" style="display: block; font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M8 6h13"></path>
                        <path d="M8 12h13"></path>
                        <path d="M8 18h13"></path>
                        <path d="M3 6h.01"></path>
                        <path d="M3 12h.01"></path>
                        <path d="M3 18h.01"></path>
                    </svg>
                    Recipient Email List
                </label>
                <textarea id="bulkEmailList" placeholder="Paste emails here (comma or line separated)&#10;&#10;Example:&#10;customer1@example.com, customer2@example.com&#10;customer3@example.com" rows="4" style="width: 100%; padding: 0.75rem; border: 2px solid var(--border-subtle); background: var(--bg-secondary); color: var(--text-primary); border-radius: var(--radius-sm); font-family: inherit; resize: vertical;"></textarea>
                <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 0.25rem;">One email per line or separated by commas. Duplicates will be automatically removed.</div>
            </div>

            <div style="margin-bottom: 1rem;">
                <label for="batchSize" style="display: block; font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <rect x="7" y="7" width="10" height="4"></rect>
                        <rect x="7" y="13" width="6" height="4"></rect>
                    </svg>
                    Batch Size
                </label>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <input type="number" id="batchSize" value="500" min="50" max="1000" step="50" style="width: 100px; padding: 0.5rem; border: 2px solid var(--border-subtle); background: var(--bg-secondary); color: var(--text-primary); border-radius: var(--radius-sm); font-family: inherit;">
                    <span style="color: var(--text-secondary);">emails per file</span>
                </div>
                <div id="batchSizeHelp" style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 0.25rem;">Range: 50-1000 emails. 500 is recommended for spam safety.</div>
            </div>



            <div style="margin-bottom: 1rem;">
                <label style="display: block; font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download Format
                </label>
                <div class="radio-group" style="display: flex; gap: 1rem; align-items: center;">
                    <div class="radio-option">
                        <input type="radio" id="formatIndividual" name="downloadFormat" value="individual" checked>
                        <label for="formatIndividual" style="font-size: 0.9rem;">Individual Email Files (recommended)</label>
                    </div>
                    <div class="radio-option">
                        <input type="radio" id="formatZip" name="downloadFormat" value="zip">
                        <label for="formatZip" style="font-size: 0.9rem;">ZIP Archive (may trigger antivirus on Windows)</label>
                    </div>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 0.25rem;">
                    <strong>Recommended:</strong> Individual email files work with all Outlook versions. Format is automatically optimized for your platform.
                </div>
            </div>

            <div id="formatStatus" style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 1rem;">
                <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                    Email Format Status
                </div>
                <div id="formatStatusText" style="font-size: 0.9rem; color: var(--text-secondary);">Checking MSG library availability...</div>
            </div>

            <div id="bulkAnalysis" style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 1rem; display: none;">
                <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                    Batch Analysis
                </div>
                <div id="bulkStats" style="font-size: 0.9rem; color: var(--text-secondary);"></div>
            </div>
        </div>

        <!-- Subject Lines Section -->
        <div id="subjectLinesSection" style="margin-bottom: 1.5rem;">
            <div style="margin-bottom: 1rem;">
                <h3 style="margin: 0; font-size: 1rem; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    Subject Line
                </h3>
            </div>
            <div id="subjectLinesContainer" class="subject-lines-container"></div>
        </div>

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
            <button class="btn" id="openEmailBtn">Download Email File & Open w/ Outlook</button>
            <button class="btn" id="generateBulkBtn">Generate BCC Batch Email Files</button>
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
            const codeArea = getDynamicElement('codeArea');
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

    // Add openEmailBtn handler
    const openEmailBtn = getDynamicElement('openEmailBtn');
    if (openEmailBtn) {
        openEmailBtn.addEventListener('click', openInEmailClient);
    }



    // Bulk email event listeners
    const bulkEmailList = document.getElementById('bulkEmailList');
    const batchSizeInput = document.getElementById('batchSize');
    const generateBulkBtn = document.getElementById('generateBulkBtn');

    if (bulkEmailList) {
        bulkEmailList.addEventListener('input', updateBulkAnalysis);
    }

    if (batchSizeInput) {
        batchSizeInput.addEventListener('input', () => {
            validateBatchSize();
            updateBulkAnalysis();
        });
    }

    if (generateBulkBtn) {
        generateBulkBtn.addEventListener('click', generateBulkEmailFiles);
    }

    // Render subject lines if they exist
    renderSubjectLines();

    // Update format status after library has time to load
    setTimeout(updateFormatStatus, 2000);
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

    const dateRangeInput = getDynamicElement('promoDateRange');
    const yearInput = getDynamicElement('promoYear');
    const titleInput = getDynamicElement('promoTitle');

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
    const codeArea = getDynamicElement('codeArea');
    if (codeArea) {
        codeArea.value = htmlCode;
    }

    // Update preview iframe
    const previewIframe = getDynamicElement('previewIframe');
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

// Drag-and-drop setup for reordering items
function setupDragAndDrop(container, itemsArray, renderFunction, selector = '.editable-item-row') {
    const rows = container.querySelectorAll(selector);
    let draggedElement = null;
    let draggedItemId = null;

    rows.forEach(row => {
        // Drag start
        row.addEventListener('dragstart', (e) => {
            draggedElement = row;
            // Try both data-item-id and data-entry-id
            draggedItemId = parseInt(row.dataset.itemId || row.dataset.entryId);
            row.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        // Drag end
        row.addEventListener('dragend', (e) => {
            row.classList.remove('dragging');
            rows.forEach(r => r.classList.remove('drag-over'));
        });

        // Drag over
        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            if (draggedElement !== row) {
                row.classList.add('drag-over');
            }
        });

        // Drag leave
        row.addEventListener('dragleave', (e) => {
            row.classList.remove('drag-over');
        });

        // Drop
        row.addEventListener('drop', (e) => {
            e.preventDefault();
            row.classList.remove('drag-over');

            if (draggedElement !== row) {
                // Try both data-item-id and data-entry-id
                const targetItemId = parseInt(row.dataset.itemId || row.dataset.entryId);

                // Find indices
                const draggedIndex = itemsArray.findIndex(item => item.id === draggedItemId);
                const targetIndex = itemsArray.findIndex(item => item.id === targetItemId);

                if (draggedIndex !== -1 && targetIndex !== -1) {
                    // Reorder array
                    const [removed] = itemsArray.splice(draggedIndex, 1);
                    itemsArray.splice(targetIndex, 0, removed);

                    // Re-render
                    renderFunction();
                    captureState();
                }
            }
        });
    });
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
        } else {
            summaryText = 'Entry not filled out';
        }

        return `
            <div class="promotion-entry ${isCollapsed ? 'collapsed' : ''}" data-entry-id="${safeId}" draggable="true">
                <div class="entry-header">
                    <div class="entry-header-left">
                        <div class="drag-handle" title="Drag to reorder">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <circle cx="4" cy="3" r="1.5"/>
                                <circle cx="4" cy="8" r="1.5"/>
                                <circle cx="4" cy="13" r="1.5"/>
                                <circle cx="12" cy="3" r="1.5"/>
                                <circle cx="12" cy="8" r="1.5"/>
                                <circle cx="12" cy="13" r="1.5"/>
                            </svg>
                        </div>
                        <button type="button" class="order-btn" onclick="movePromotionEntryUp(${entry.id})" title="Move up" ${isFirst ? 'disabled' : ''}>▲</button>
                        <button type="button" class="order-btn" onclick="movePromotionEntryDown(${entry.id})" title="Move down" ${isLast ? 'disabled' : ''}>▼</button>
                        <span class="entry-number">Entry ${index + 1}</span>
                        ${isCollapsed ? `<span class="entry-summary">${summaryText}</span>` : ''}
                    </div>
                    <div class="entry-controls">
                        <button type="button" class="collapse-btn" onclick="toggleEntryCollapse(${entry.id})" title="${isCollapsed ? 'Expand' : 'Collapse'}">
                            ${isCollapsed ? 'Expand' : 'Collapse'}
                        </button>
                        <button type="button" class="entry-remove-btn" onclick="removePromotionEntry(${entry.id})" title="Remove">×</button>
                    </div>
                </div>

                <div class="entry-fields" style="display: ${isCollapsed ? 'none' : 'grid'};">
                    <div class="form-group">
                        <label class="form-label" for="entry-${safeId}-brand">Brand *</label>
                        <select class="form-input entry-brand" id="entry-${safeId}-brand" name="entry-${safeId}-brand" data-entry-id="${safeId}">
                            <option value="">Select brand...</option>
                            <option value="Citizen" ${entry.brand === 'Citizen' ? 'selected' : ''}>Citizen</option>
                            <option value="Bulova" ${entry.brand === 'Bulova' ? 'selected' : ''}>Bulova</option>
                            <option value="Alpina" ${entry.brand === 'Alpina' ? 'selected' : ''}>Alpina</option>
                            <option value="Frederique Constant" ${entry.brand === 'Frederique Constant' ? 'selected' : ''}>Frederique Constant</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="entry-${safeId}-discount">Discount % *</label>
                        <input type="text" class="form-input entry-discount" id="entry-${safeId}-discount" name="entry-${safeId}-discount" data-entry-id="${safeId}" value="${escapeAttr(entry.discount)}" placeholder="60">
                    </div>

                    <div class="form-group full-width">
                        <label class="form-label" for="entry-${safeId}-collections">Collections (comma-separated)</label>
                        <input type="text" class="form-input entry-collections" id="entry-${safeId}-collections" name="entry-${safeId}-collections" data-entry-id="${safeId}" value="${escapeAttr(entry.collections)}" placeholder="Corso, Avion, Marine Star">
                    </div>

                    <div class="form-group full-width">
                        <label class="form-label" for="entry-${safeId}-callout">Special Callout (optional)</label>
                        <input type="text" class="form-input entry-callout" id="entry-${safeId}-callout" name="entry-${safeId}-callout" data-entry-id="${safeId}" value="${escapeAttr(entry.callout)}" placeholder="Final sale items excluded">
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

    // Add drag-and-drop functionality for reordering entries
    setupDragAndDrop(container, promotionEntries, renderPromotionEntries, '.promotion-entry');

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
                        <input type="text" class="form-input hour-day" id="hour-${safeId}-day" name="hour-${safeId}-day" data-hour-id="${safeId}" value="${escapeAttr(hour.day)}" placeholder="e.g., Friday Nov 29">
                    </div>
                    <div class="form-group">
                        <input type="text" class="form-input hour-hours" id="hour-${safeId}-hours" name="hour-${safeId}-hours" data-hour-id="${safeId}" value="${escapeAttr(hour.hours)}" placeholder="e.g., 6AM–10PM or CLOSED">
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
                <button type="button" class="edit-section-btn">Expand</button>
            </div>
        `;
    } else {
        // Expanded state - show all items
        wrapper.innerHTML = `
            <div class="collapsible-section-header expanded" onclick="toggleHowToShop()">
                <span class="section-label">How to Shop</span>
                <button type="button" class="edit-section-btn">Collapse</button>
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
            <div class="editable-item-row" data-item-id="${safeId}" draggable="true">
                <div class="editable-item-fields">
                    <div class="drag-handle" title="Drag to reorder">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <circle cx="4" cy="3" r="1.5"/>
                            <circle cx="4" cy="8" r="1.5"/>
                            <circle cx="4" cy="13" r="1.5"/>
                            <circle cx="12" cy="3" r="1.5"/>
                            <circle cx="12" cy="8" r="1.5"/>
                            <circle cx="12" cy="13" r="1.5"/>
                        </svg>
                    </div>
                    <div class="form-group">
                        <input type="text" class="form-input shop-item-text" id="shop-item-${safeId}-text" name="shop-item-${safeId}-text" data-item-id="${safeId}" value="${escapeAttr(item.text)}" placeholder="e.g., Visit us in-store for outlet-exclusive deals">
                    </div>
                    <div class="item-controls">
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

    // Add drag-and-drop functionality
    setupDragAndDrop(container, howToShopItems, renderHowToShopSection);

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
                <button type="button" class="edit-section-btn">Expand</button>
            </div>
        `;
    } else {
        // Expanded state - show all items
        wrapper.innerHTML = `
            <div class="collapsible-section-header expanded" onclick="toggleImportantNotes()">
                <span class="section-label">Important Notes</span>
                <button type="button" class="edit-section-btn">Collapse</button>
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
            <div class="editable-item-row" data-item-id="${safeId}" draggable="true">
                <div class="editable-item-fields">
                    <div class="drag-handle" title="Drag to reorder">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <circle cx="4" cy="3" r="1.5"/>
                            <circle cx="4" cy="8" r="1.5"/>
                            <circle cx="4" cy="13" r="1.5"/>
                            <circle cx="12" cy="3" r="1.5"/>
                            <circle cx="12" cy="8" r="1.5"/>
                            <circle cx="12" cy="13" r="1.5"/>
                        </svg>
                    </div>
                    <div class="form-group">
                        <input type="text" class="form-input notes-item-text" id="notes-item-${safeId}-text" name="notes-item-${safeId}-text" data-item-id="${safeId}" value="${escapeAttr(item.text)}" placeholder="e.g., See attached PDF for complete model details">
                    </div>
                    <div class="item-controls">
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

    // Add drag-and-drop functionality
    setupDragAndDrop(container, importantNotesItems, renderImportantNotesSection);

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
    // Check if there's a saved template in localStorage
    const savedTemplate = localStorage.getItem('savedPromotionTemplate');

    if (savedTemplate) {
        // Load saved template automatically
        try {
            const config = JSON.parse(savedTemplate);
            // Don't reset arrays - we'll populate from saved data
            promotionEntries = [];
            specialHours = [];
            howToShopItems = [];
            importantNotesItems = [];
            attachedPDFs = [];
            generatedSubjectLines = [];
            selectedSubjectLine = null;
        } catch (e) {
            // If parsing fails, fall back to defaults
            console.error('Error loading saved template:', e);
            promotionEntries = [];
            specialHours = [];
            howToShopItems = [];
            importantNotesItems = [];
            attachedPDFs = [];
            generatedSubjectLines = [];
            selectedSubjectLine = null;
            initializeDefaultItems();
        }
    } else {
        // No saved template - initialize defaults
        promotionEntries = [];
        specialHours = [];
        howToShopItems = [];
        importantNotesItems = [];
        attachedPDFs = [];
        generatedSubjectLines = [];
        selectedSubjectLine = null;
        initializeDefaultItems();
    }

    // Update section header to include undo/redo buttons
    const parentCard = elements.formSectionTitle.closest('.card');
    const existingTitle = elements.formSectionTitle;

    // Create new header structure
    const headerContainer = document.createElement('div');
    headerContainer.className = 'section-header-with-controls';
    headerContainer.innerHTML = `
        <h2 class="section-title" style="margin-bottom: 0;">Promotion Email (HTML) Fields</h2>
        <div class="section-header-controls">
            <button type="button" class="undo-redo-btn" id="undoBtn" title="Undo (Ctrl+Z)" disabled>
                <span>↶ Undo</span>
            </button>
            <button type="button" class="undo-redo-btn" id="redoBtn" title="Redo (Ctrl+Y)" disabled>
                <span>↷ Redo</span>
            </button>
        </div>
    `;

    // Replace existing title
    existingTitle.replaceWith(headerContainer);

    elements.formFields.innerHTML = `
        <div class="form-group">
            <label class="form-label" for="promoDateRange">Date Range *</label>
            <div class="input-wrapper">
                <input type="text" class="form-input" id="promoDateRange" placeholder="Nov 28 - Dec 1" required>
                <button class="clear-input" data-clear="promoDateRange" title="Clear">×</button>
            </div>
            <div class="field-help">Used for auto-title generation and display</div>
        </div>

        <div class="form-group">
            <label class="form-label" for="promoYear">Year (optional)</label>
            <div class="input-wrapper">
                <input type="text" class="form-input" id="promoYear" placeholder="Auto-uses current year">
                <button class="clear-input" data-clear="promoYear" title="Clear">×</button>
            </div>
            <div class="field-help">Override for cross-year sales (e.g., Dec 30 - Jan 3)</div>
        </div>

        <div class="form-group">
            <label class="form-label" for="promoTitle">Title (optional)</label>
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

        <div class="form-group full-width" style="margin-top: 2rem;">
            <label class="form-label">ATTACHMENTS (OPTIONAL)</label>
            <div class="field-help" style="margin-bottom: 1rem;">Upload PDF files to attach to your promotional email (max 10MB per file)</div>
            <div class="pdf-upload-section">
                <div class="pdf-upload-dropzone" id="pdfDropzone">
                    <input type="file" id="pdfFileInput" accept=".pdf,application/pdf" multiple style="display: none;">
                    <div class="dropzone-content">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <p class="dropzone-text">Click to upload or drag and drop PDF files</p>
                        <p class="dropzone-hint">Maximum 10MB per file</p>
                    </div>
                </div>
                <div id="attachedPDFsList" class="attached-pdfs-list"></div>
            </div>
        </div>

        </div>

        <div class="template-actions-container">
            <div class="template-actions">
            <button type="button" class="template-action-btn" id="saveTemplateBtn" title="Save current configuration">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Save Template
            </button>
            <button type="button" class="template-action-btn" id="importTemplateBtn" title="Import saved configuration">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Import Template
            </button>
            <button type="button" class="template-action-btn" id="exportTemplateBtn" title="Export configuration as JSON">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Export Template
            </button>
        </div>
    `;

    // Add event listeners
    const dateRangeInput = getDynamicElement('promoDateRange');
    const yearInput = getDynamicElement('promoYear');
    const titleInput = getDynamicElement('promoTitle');
    const addTierBtn = getDynamicElement('addTierBtn');

    // Bulk email event listeners are now set up in showTabbedOutput()

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

    // Recipient input listener
    const recipientInput = document.getElementById('promoRecipient');
    if (recipientInput) {
        recipientInput.addEventListener('input', () => {
            const clearBtn = document.querySelector('[data-clear="promoRecipient"]');
            if (clearBtn) {
                clearBtn.classList.toggle('visible', recipientInput.value.trim().length > 0);
            }
        });

        // Clear button
        const clearRecipientBtn = document.querySelector('[data-clear="promoRecipient"]');
        if (clearRecipientBtn) {
            clearRecipientBtn.addEventListener('click', () => {
                recipientInput.value = '';
                clearRecipientBtn.classList.remove('visible');
                recipientInput.focus();
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

    // Load saved template if available, otherwise add initial entry
    if (savedTemplate) {
        try {
            const config = JSON.parse(savedTemplate);
            applyImportedConfig(config, false); // false = don't collapse on auto-load
        } catch (e) {
            console.error('Error applying saved template:', e);
            addPromotionEntry();
            renderHowToShopSection();
            renderImportantNotesSection();
        }
    } else {
        // No saved template - add initial entry
        addPromotionEntry();
        renderHowToShopSection();
        renderImportantNotesSection();
    }

    // Wire up undo/redo buttons
    const undoBtn = elements.undoBtn;
    const redoBtn = elements.redoBtn;

    if (undoBtn) {
        undoBtn.addEventListener('click', undo);
    }
    if (redoBtn) {
        redoBtn.addEventListener('click', redo);
    }

    // Wire up save/import/export buttons
    const saveTemplateBtn = document.getElementById('saveTemplateBtn');
    const importTemplateBtn = document.getElementById('importTemplateBtn');
    const exportTemplateBtn = document.getElementById('exportTemplateBtn');

    if (saveTemplateBtn) {
        saveTemplateBtn.addEventListener('click', savePromotionTemplate);
    }
    if (importTemplateBtn) {
        importTemplateBtn.addEventListener('click', importPromotionTemplate);
    }
    if (exportTemplateBtn) {
        exportTemplateBtn.addEventListener('click', exportPromotionTemplate);
    }

    // Wire up PDF upload
    const pdfDropzone = document.getElementById('pdfDropzone');
    const pdfFileInput = document.getElementById('pdfFileInput');

    if (pdfDropzone && pdfFileInput) {
        // Click to upload
        pdfDropzone.addEventListener('click', () => {
            pdfFileInput.click();
        });

        // File input change
        pdfFileInput.addEventListener('change', handlePDFUpload);

        // Drag and drop events
        pdfDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            pdfDropzone.classList.add('dragover');
        });

        pdfDropzone.addEventListener('dragleave', () => {
            pdfDropzone.classList.remove('dragover');
        });

        pdfDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            pdfDropzone.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
            if (files.length > 0) {
                handlePDFFiles(files);
            } else {
                showToast('⚠ Please drop only PDF files');
            }
        });
    }

    // Render PDF list
    renderAttachedPDFs();

    // Add keyboard shortcuts
    document.addEventListener('keydown', handleUndoRedoShortcuts);

    // Wire up bulk email analysis event listeners
    const bulkEmailList = document.getElementById('bulkEmailList');
    const batchSizeInput = document.getElementById('batchSize');

    if (bulkEmailList) {
        bulkEmailList.addEventListener('input', updateBulkAnalysis);
    }

    if (batchSizeInput) {
        batchSizeInput.addEventListener('input', () => {
            validateBatchSize();
            updateBulkAnalysis();
        });
    }

    // Capture initial state
    captureState();
}

// Handle PDF file upload from input
function handlePDFUpload(e) {
    const files = Array.from(e.target.files);
    handlePDFFiles(files);
    e.target.value = ''; // Reset input to allow re-uploading same file
}

// Process PDF files - validate and add to attachedPDFs array
function handlePDFFiles(files) {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    let hasErrors = false;

    for (const file of files) {
        // Validate file type
        if (file.type !== 'application/pdf') {
            showToast(`✗ ${file.name} is not a PDF file`);
            hasErrors = true;
            continue;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            showToast(`✗ ${file.name} is too large (${sizeMB}MB). Max size is 10MB.`);
            hasErrors = true;
            continue;
        }

        // Check for duplicate names
        if (attachedPDFs.some(pdf => pdf.name === file.name)) {
            showToast(`⚠ ${file.name} is already attached`);
            continue;
        }

        // Read file as base64 for storage
        const reader = new FileReader();
        reader.onload = (e) => {
            const pdfData = {
                id: Date.now() + Math.random(), // Unique ID
                name: file.name,
                size: file.size,
                type: file.type,
                data: e.target.result // base64 data URL
            };

            attachedPDFs.push(pdfData);
            renderAttachedPDFs();
            debouncedCaptureState();

            if (!hasErrors && files.length === 1) {
                showToast(`✓ ${file.name} attached successfully`);
            }
        };

        reader.onerror = () => {
            showToast(`✗ Error reading ${file.name}`);
        };

        reader.readAsDataURL(file);
    }

    if (!hasErrors && files.length > 1) {
        showToast(`✓ ${files.length} PDFs attached successfully`);
    }
}

// Render attached PDFs list
function renderAttachedPDFs() {
    const container = document.getElementById('attachedPDFsList');
    if (!container) return;

    if (attachedPDFs.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = attachedPDFs.map(pdf => {
        const sizeKB = (pdf.size / 1024).toFixed(1);
        const sizeMB = (pdf.size / (1024 * 1024)).toFixed(2);
        const displaySize = pdf.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

        return `
            <div class="attached-pdf-item" data-pdf-id="${pdf.id}">
                <div class="pdf-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <text x="12" y="17" font-size="6" text-anchor="middle" fill="currentColor">PDF</text>
                    </svg>
                </div>
                <div class="pdf-info">
                    <div class="pdf-name" title="${pdf.name}">${pdf.name}</div>
                    <div class="pdf-size">${displaySize}</div>
                </div>
                <button class="pdf-remove-btn" onclick="removePDF(${pdf.id})" title="Remove PDF">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;
    }).join('');
}

// Remove PDF from attachedPDFs array
function removePDF(pdfId) {
    const pdf = attachedPDFs.find(p => p.id === pdfId);
    if (!pdf) return;

    attachedPDFs = attachedPDFs.filter(p => p.id !== pdfId);
    renderAttachedPDFs();
    debouncedCaptureState();
    showToast(`✓ ${pdf.name} removed`);
}

// Generate subject lines based on promotion data
function generateSubjectLines() {
    const dateRange = getDynamicElement('promoDateRange')?.value || '';
    const title = getDynamicElement('promoTitle')?.value || '';

    if (!dateRange && promotionEntries.length === 0) {
        showToast('⚠ Add promotion details first to generate subject lines');
        return;
    }

    // Extract data from promotion entries
    const brands = [...new Set(promotionEntries.map(e => e.brand).filter(b => b))];
    const discounts = promotionEntries.map(e => e.discount).filter(d => d).sort((a, b) => parseInt(b) - parseInt(a));
    const maxDiscount = discounts[0] || '';

    // Determine if it's a holiday/special event
    const lowerDate = dateRange.toLowerCase();
    const isBlackFriday = lowerDate.includes('black friday') || lowerDate.includes('nov 2') || lowerDate.includes('nov 29');
    const isCyberMonday = lowerDate.includes('cyber monday');
    const isHoliday = lowerDate.includes('holiday') || lowerDate.includes('dec');
    const isNewYear = lowerDate.includes('jan') || lowerDate.includes('new year');

    const subjects = [];

    // Subject line templates
    if (maxDiscount) {
        subjects.push(`Save up to ${maxDiscount}% ${isBlackFriday ? 'this Black Friday!' : 'now!'}`);
        subjects.push(`${maxDiscount}% OFF ${brands.length > 0 ? brands[0] : 'watches'}`);
        subjects.push(`Last Chance: ${maxDiscount}% OFF`);
    }

    if (isBlackFriday) {
        subjects.push('Black Friday Outlet Sale is HERE!');
        subjects.push('BIGGEST Sale of the Year - Shop Now!');
    } else if (isCyberMonday) {
        subjects.push('Cyber Monday Deals - Limited Time!');
    } else if (isHoliday) {
        subjects.push('Holiday Savings Event - Shop Now!');
        subjects.push('Perfect Holiday Gifts on Sale');
    } else if (isNewYear) {
        subjects.push('New Year, New Watch - Save Big!');
    }

    if (brands.length > 0) {
        subjects.push(`${brands.join(' & ')} Sale - Don't Miss Out!`);
        subjects.push(`Exclusive ${brands[0]} Deals Inside`);
    }

    subjects.push(title || 'Special Outlet Sale - Limited Time!');
    subjects.push('Your Favorite Brands - Now on Sale');
    subjects.push(`Hurry! ${dateRange} Sale Ends Soon`);

    // Ensure we have exactly 10 unique subject lines
    const uniqueSubjects = [...new Set(subjects)];
    while (uniqueSubjects.length < 10) {
        uniqueSubjects.push(`Sale Alert: ${dateRange || 'Limited Time Only'}`);
        uniqueSubjects.push('Don\'t Miss These Deals!');
        uniqueSubjects.push('Outlet Specials - Shop Today');
    }

    generatedSubjectLines = uniqueSubjects.slice(0, 10);

    // Auto-select first subject line if none selected
    if (!selectedSubjectLine) {
        selectedSubjectLine = generatedSubjectLines[0];
    }

    renderSubjectLines();
    debouncedCaptureState();



    showToast('✓ 10 subject lines generated');
}

// Render subject lines
function renderSubjectLines() {
    const container = document.getElementById('subjectLinesContainer');
    if (!container) return;

    if (generatedSubjectLines.length === 0) {
        container.innerHTML = '<div class="subject-lines-empty">Generate your email template first to create subject line suggestions</div>';
        return;
    }

    // Create dropdown with generated subject lines
    const dropdownOptions = generatedSubjectLines.map((subject, index) => {
        const isSelected = subject === selectedSubjectLine;
        return `<option value="${index}" ${isSelected ? 'selected' : ''}>${subject}</option>`;
    }).join('');

    container.innerHTML = `
        <div class="subject-line-dropdown-wrapper">
            <label class="subject-dropdown-label" for="subjectLineDropdown">Choose a subject line suggestion:</label>
            <select id="subjectLineDropdown" class="subject-line-dropdown">
                <option value="" disabled ${!selectedSubjectLine ? 'selected' : ''}>Select a subject line...</option>
                ${dropdownOptions}
            </select>
        </div>
        <div id="selectedSubjectCard" class="selected-subject-card" style="display: ${selectedSubjectLine ? 'block' : 'none'};">
            <label class="subject-card-label" for="selectedSubjectInput">Selected Subject Line (editable):</label>
            <div class="subject-card-input-wrapper">
                <input
                    type="text"
                    id="selectedSubjectInput"
                    class="subject-card-input"
                    value="${selectedSubjectLine || ''}"
                    placeholder="Your subject line..."
                >
                <div class="subject-card-meta">
                    <span class="char-count ${selectedSubjectLine && selectedSubjectLine.length <= 50 ? 'optimal' : 'warning'}" id="subjectCharCount">
                        ${selectedSubjectLine ? selectedSubjectLine.length : 0} chars ${selectedSubjectLine && selectedSubjectLine.length <= 50 ? '✓' : selectedSubjectLine && selectedSubjectLine.length > 50 ? '(>50)' : ''}
                    </span>
                </div>
            </div>
        </div>
    `;

    // Add event listener to dropdown
    const dropdown = document.getElementById('subjectLineDropdown');
    if (dropdown) {
        dropdown.addEventListener('change', (e) => {
            const index = parseInt(e.target.value);
            if (index >= 0 && index < generatedSubjectLines.length) {
                selectSubjectLine(generatedSubjectLines[index]);
            }
        });
    }

    // Add event listener to input field
    const input = document.getElementById('selectedSubjectInput');
    if (input) {
        input.addEventListener('input', (e) => {
            selectedSubjectLine = e.target.value;

            // Update character count
            const charCount = document.getElementById('subjectCharCount');
            if (charCount) {
                const length = e.target.value.length;
                const isOptimal = length <= 50;
                charCount.className = `char-count ${isOptimal ? 'optimal' : 'warning'}`;
                charCount.textContent = `${length} chars ${isOptimal ? '✓' : '(>50)'}`;
            }

            debouncedCaptureState();
        });
    }
}

// Select a subject line
function selectSubjectLine(subject) {
    selectedSubjectLine = subject;

    // Show the card
    const card = document.getElementById('selectedSubjectCard');
    if (card) {
        card.style.display = 'block';
    }

    // Update input value
    const input = document.getElementById('selectedSubjectInput');
    if (input) {
        input.value = subject;
    }

    // Update character count
    const charCount = document.getElementById('subjectCharCount');
    if (charCount) {
        const length = subject.length;
        const isOptimal = length <= 50;
        charCount.className = `char-count ${isOptimal ? 'optimal' : 'warning'}`;
        charCount.textContent = `${length} chars ${isOptimal ? '✓' : '(>50)'}`;
    }

    debouncedCaptureState();
}

// Update format status indicator
function updateFormatStatus() {
    const statusDiv = document.getElementById('formatStatusText');
    if (!statusDiv) return;

    const os = detectOS();
    const format = getRecommendedFormat();
    const formatName = format === 'emltpl' ? 'Template' : 'EML';
    const fileExtension = format === 'emltpl' ? '.emltpl' : '.eml';

    let osName = 'Unknown';
    if (os === 'windows') osName = 'Windows';
    else if (os === 'mac') osName = 'macOS';
    else osName = 'Other Platform';

    statusDiv.innerHTML = `<strong>${formatName} Format:</strong> Optimized for ${osName} (${fileExtension} files)<br><small>Best compatibility with Outlook on your platform</small>`;
    statusDiv.style.color = 'var(--text-secondary)';
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
    const title = data.promoTitle && data.promoTitle.trim() ? sanitizeHTML(data.promoTitle) : generatePromoTitle(dateRange);

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
            const collections = entry.collections.split(',').map(c => sanitizeHTML(c.trim())).filter(c => c);
            collectionsHTML = collections.map(c => `*${c}`).join(' • ');
        }

        brandSections += `
                <p style="font-size: 18px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-bottom: 8px;"><b>${sanitizeHTML(entry.brand)} - ${sanitizeHTML(entry.discount)}% OFF</b></p>`;

        if (collectionsHTML) {
            brandSections += `
                <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-left: 20px; margin-top: 0; margin-bottom: ${entry.callout ? '5px' : '20px'};">
                    ${sanitizeHTML(collectionsHTML)}
                </p>`;
        }

        if (entry.callout && entry.callout.trim()) {
            brandSections += `
                <p style="font-size: 13px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-left: 20px; margin-top: 0; margin-bottom: 20px; color: #0066cc; font-style: italic;">
                    ${sanitizeHTML(entry.callout)}
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

    // Build How to Shop section from array (sanitize user inputs)
    let howToShopHTML = howToShopItems
        .filter(item => item.text && item.text.trim())
        .map(item => `• ${sanitizeHTML(item.text)}`)
        .join('<br>\n                    ');

    // Build Important Notes section from array (sanitize user inputs)
    let importantNotesHTML = importantNotesItems
        .filter(item => item.text && item.text.trim())
        .map(item => `• ${sanitizeHTML(item.text)}`)
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

    // Build results HTML
    let resultsHTML = '';
    if (results.length === 0) {
        resultsHTML = '<div class="search-result-item" style="cursor: default; color: var(--text-tertiary);">No templates found</div>';
        elements.resultCounter.textContent = '0 templates found';
    } else {
        // Use sanitization to prevent XSS
        resultsHTML = results.map(key => {
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

    // Update only the results, preserving the counter
    const counterElement = elements.resultCounter;
    elements.searchResults.innerHTML = resultsHTML;
    elements.searchResults.appendChild(counterElement);

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
            const openEmailBtn = getDynamicElement('openEmailBtn');
            if (openEmailBtn) {
                openEmailBtn.disabled = false;
            }
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
                    <label class="form-label" for="${safeField}">${sanitizeHTML(capitalizedLabel)}${requiredMark}</label>
                    <div class="input-wrapper">
                        ${isTextarea
                            ? `<textarea id="${safeField}" class="form-textarea" data-field="${safeField}" ${config.required ? 'required' : ''} placeholder="${safeExample}">${autoFillValue}</textarea>`
                            : `<input type="text" id="${safeField}" class="form-input" data-field="${safeField}" ${config.required ? 'required' : ''} placeholder="${safeExample}" value="${autoFillValue}" list="${datalistId}">${datalistHTML}`
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
            const dateRangeInput = getDynamicElement('promoDateRange');

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

            // Generate subject lines automatically
            generateSubjectLines();

            showToast('✓ Preview and subject lines generated!');
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
            attachedPDFs = [];
            generatedSubjectLines = [];
            selectedSubjectLine = null;
            renderAttachedPDFs();
            renderSubjectLines();
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
        const openEmailBtn = getDynamicElement('openEmailBtn');
        if (openEmailBtn) {
            openEmailBtn.disabled = true;
        }
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

// Open generated message in default email client
function openInEmailClient() {
    // Special handling for promotion email
    if (currentTemplate === 'promotion-email') {
        openPromotionEmailInClient();
        return;
    }

    const text = elements.outputArea.value;
    if (!text) {
        showToast('⚠ Nothing to send');
        return;
    }

    try {
        // Encode the body content for mailto: protocol
        const body = encodeURIComponent(text);

        // Create mailto link
        // Note: Most email clients have a character limit for mailto: URLs (typically 2000-2048 chars)
        // For HTML content, the email client will treat it as plain text in the body
        const mailtoLink = `mailto:?body=${body}`;

        // Open the link to trigger default email client
        window.location.href = mailtoLink;

        showToast('✓ Opening email client...');
    } catch (error) {
        console.error('Email client error:', error);
        showToast('⚠ Failed to open email client');
    }
}

// Open promotion email in email client with subject line and PDF handling
function openPromotionEmailInClient() {
    // Get HTML content from the code area (used for promotion emails)
    const codeArea = getDynamicElement('codeArea');
    const htmlContent = codeArea ? codeArea.value : '';

    if (!htmlContent) {
        showToast('⚠ Generate the email first');
        return;
    }

    // Get selected subject line
    const subject = selectedSubjectLine || 'Promotional Sale';

    // Get recipient if specified
    const recipientInput = document.getElementById('promoRecipient');
    const recipient = recipientInput ? recipientInput.value.trim() : '';

    try {
        // Get recommended format based on OS
        const format = getRecommendedFormat();
        const fileExtension = format === 'emltpl' ? '.emltpl' : '.eml';

        // Create email file with HTML content and PDF attachments
        const emlContent = createEMLFile(subject, htmlContent, attachedPDFs, recipient, format);

        // Create blob and download
        const blob = new Blob([emlContent], { type: 'message/rfc822' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `promotion-email-${new Date().toISOString().split('T')[0]}${fileExtension}`;
        link.click();
        URL.revokeObjectURL(url);

        let message = '✓ Email file created with HTML content';
        if (attachedPDFs.length > 0) {
            message += ` and ${attachedPDFs.length} PDF attachment${attachedPDFs.length > 1 ? 's' : ''}! Opening in your email client...`;
        } else {
            message += '! Opening in your email client...';
        }

        showToast(message);
    } catch (error) {
        console.error('Email client error:', error);
        showToast('⚠ Failed to create email file');
    }
}

// Create EML file format with HTML body and PDF attachments
function createEMLFile(subject, htmlBody, pdfAttachments = [], recipient = '', format = 'eml') {
    const boundary = '----=_NextPart_' + Date.now();
    const date = new Date().toUTCString();

    // Get user profile for sender information
    const senderName = userProfile && userProfile.storeName ? userProfile.storeName : 'Citizen Company Store';
    const senderEmail = userProfile && userProfile.storeEmail ? userProfile.storeEmail : 'store@citizenwatchgroup.com';

    // Create EML as a draft message to allow editing in Outlook
    let eml = `From: ${senderName} <${senderEmail}>\r\n`;
    // Omit To: header entirely to ensure Outlook treats it as editable draft
    eml += `Subject: ${subject}\r\n`;
    // Omit Date header to prevent Outlook from treating as sent message
    eml += `MIME-Version: 1.0\r\n`;
    eml += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
    eml += `X-Unsent: 1\r\n`; // Mark as unsent/draft
    eml += `X-Outlook-Message-Flag: \r\n`; // Outlook draft flag
    eml += `X-Microsoft-Headers: ; name="draft"\r\n`; // Microsoft draft marker
    eml += `X-Mailer: Microsoft Outlook 16.0\r\n`; // Identify as Outlook-generated
    eml += `X-Msg-Status: 00000000\r\n`; // Draft message status
    eml += `X-Outlook-Template: 1\r\n`; // Mark as Outlook template
    eml += `\r\n`;
    eml += `This is a multi-part message in MIME format.\r\n`;
    eml += `\r\n`;

    // Add HTML body part - use base64 encoding for better Outlook compatibility
    eml += `--${boundary}\r\n`;
    eml += `Content-Type: text/html; charset=UTF-8\r\n`;
    eml += `Content-Transfer-Encoding: base64\r\n`;
    eml += `\r\n`;

    // Convert HTML to base64 and split into 76-character lines
    const htmlBase64 = btoa(unescape(encodeURIComponent(htmlBody)));
    const htmlLines = htmlBase64.match(/.{1,76}/g) || [];
    eml += htmlLines.join('\r\n');
    eml += `\r\n\r\n`;

    // Add PDF attachments
    if (pdfAttachments && pdfAttachments.length > 0) {
        pdfAttachments.forEach(pdf => {
            // Extract base64 data from data URL (format: data:application/pdf;base64,...)
            const base64Data = pdf.data.split(',')[1];

            eml += `--${boundary}\r\n`;
            eml += `Content-Type: application/pdf; name="${pdf.name}"\r\n`;
            eml += `Content-Transfer-Encoding: base64\r\n`;
            eml += `Content-Disposition: attachment; filename="${pdf.name}"\r\n`;
            eml += `\r\n`;

            // Split base64 data into 76-character lines (RFC 2045 standard)
            const lines = base64Data.match(/.{1,76}/g) || [];
            eml += lines.join('\r\n');
            eml += `\r\n\r\n`;
        });
    }

    // End boundary
    eml += `--${boundary}--\r\n`;

    return eml;
}

// Initialize application
function init() {
    try {
        // Initialize theme and navigation
        initTheme();
        initNavigation();

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
        elements.searchBox.focus();
    });

        elements.templateSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                selectTemplate(e.target.value);
            }
        });

        elements.generateBtn.addEventListener('click', generateMessage);
        elements.clearBtn.addEventListener('click', clearAll);
        elements.copyBtn.addEventListener('click', copyToClipboard);
        // Note: openEmailBtn is dynamically added in showTabbedOutput() for promotion emails

        // Theme and navigation toggles
        const themeToggle = elements.themeToggle;
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }

        const navToggle = elements.navToggle;
        if (navToggle) {
            navToggle.addEventListener('click', toggleNavigation);
        }
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

// Bulk email functionality
function parseEmailList(text) {
    if (!text || !text.trim()) return [];

    // Handle various separators: commas, newlines, tabs, semicolons
    const emails = text.split(/[,\n\t;]/)
        .map(email => email.trim())
        .filter(email => email.length > 0)
        .map(email => {
            // Clean up common issues from spreadsheet copy-paste
            return email.replace(/["']/g, '').trim(); // Remove quotes
        })
        .filter(email => email.length > 0)
        .filter(email => isValidEmail(email));

    // Remove duplicates
    return [...new Set(emails)];
}

function isValidEmail(email) {
    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateBatchSize() {
    const batchSizeInput = getDynamicElement('batchSize');
    const helpText = getDynamicElement('batchSizeHelp');

    if (!batchSizeInput || !helpText) return;

    const size = parseInt(batchSizeInput.value);

    if (isNaN(size) || size < 50) {
        helpText.textContent = 'Minimum batch size is 50 emails';
        helpText.style.color = '#dc3545';
        return false;
    }

    if (size > 1000) {
        helpText.textContent = 'Maximum batch size is 1000 emails';
        helpText.style.color = '#dc3545';
        return false;
    }

    if (size > 750) {
        helpText.textContent = '⚠️ Large batches may trigger spam filters';
        helpText.style.color = '#fd7e14';
    } else if (size < 200) {
        helpText.textContent = 'ℹ️ Small batches create more files to manage';
        helpText.style.color = '#17a2b8';
    } else {
        helpText.textContent = '✅ Good balance of efficiency and deliverability';
        helpText.style.color = 'var(--text-secondary)';
    }

    return true;
}

function detectDuplicates(emails) {
    const seen = new Set();
    const duplicates = [];

    emails.forEach(email => {
        if (seen.has(email)) {
            if (!duplicates.includes(email)) {
                duplicates.push(email);
            }
        } else {
            seen.add(email);
        }
    });

    return duplicates;
}

function updateBulkAnalysis() {
    const bulkEmailList = getDynamicElement('bulkEmailList');
    const batchSizeInput = getDynamicElement('batchSize');
    const bulkAnalysis = getDynamicElement('bulkAnalysis');
    const bulkStats = getDynamicElement('bulkStats');

    if (!bulkEmailList || !batchSizeInput || !bulkAnalysis || !bulkStats) return;

    const emailText = bulkEmailList.value.trim();
    if (!emailText) {
        bulkAnalysis.style.display = 'none';
        return;
    }

    // Parse all entries vs valid emails
    const allEntries = emailText.split(/[,\n\t;]/)
        .map(email => email.trim())
        .filter(email => email.length > 0);

    const validEmails = parseEmailList(emailText);
    const invalidCount = allEntries.length - validEmails.length;

    // Detect duplicates among valid emails
    const duplicates = detectDuplicates(validEmails);
    const duplicateCount = duplicates.length;

    const batchSize = parseInt(batchSizeInput.value) || 500;

    if (validEmails.length === 0) {
        bulkStats.innerHTML = `
            <div>• Total entries found: ${allEntries.length}</div>
            <div style="color: #dc3545;">• Valid emails: 0 (check format)</div>
            <div style="font-size: 0.9rem; color: var(--text-tertiary);">Make sure emails contain @ and a domain</div>
        `;
        bulkAnalysis.style.display = 'block';
        return;
    }

    // Calculate batches based on unique emails
    const uniqueValidEmails = [...new Set(validEmails)];
    const fullBatches = Math.floor(uniqueValidEmails.length / batchSize);
    const remainder = uniqueValidEmails.length % batchSize;
    const totalBatches = fullBatches + (remainder > 0 ? 1 : 0);

    // Update display with duplicate information
    let statsHtml = `
        <div>• Total entries: ${allEntries.length}</div>
        <div style="color: ${invalidCount > 0 ? '#fd7e14' : 'var(--text-secondary)'};">• Valid emails: ${validEmails.length}${invalidCount > 0 ? ` (${invalidCount} invalid)` : ''}</div>
    `;

    if (duplicateCount > 0) {
        statsHtml += `<div style="color: #17a2b8;">• Duplicates found: ${duplicateCount} unique addresses</div>`;
        statsHtml += `<div style="font-weight: 600; color: var(--text-primary);">• Final unique emails: ${uniqueValidEmails.length}</div>`;
    }

    statsHtml += `
        <div>• Batch Size: ${batchSize} emails</div>
        <div>• Total Batches: ${totalBatches}</div>
        <div>• Files: ${fullBatches > 0 ? `${fullBatches}×${batchSize}` : ''}${remainder > 0 ? `${fullBatches > 0 ? ' + ' : ''}1×${remainder}` : ''} emails</div>
    `;

    if (invalidCount > 0) {
        statsHtml += `<div style="font-size: 0.9rem; color: var(--text-tertiary); margin-top: 0.5rem;">Tip: Check for extra spaces, tabs, or invalid email formats</div>`;
    }

    if (duplicateCount > 0) {
        statsHtml += `<div style="font-size: 0.9rem; color: #17a2b8; margin-top: 0.5rem;">ℹ️ Duplicates will be removed during generation to ensure each recipient gets one email</div>`;
    }

    bulkStats.innerHTML = statsHtml;
    bulkAnalysis.style.display = 'block';
}

function extractDateRangeFromHTML(htmlContent) {
    if (!htmlContent) return null;

    // Find text before "While Supplies Last"
    const whileSuppliesLastIndex = htmlContent.indexOf('While Supplies Last');
    if (whileSuppliesLastIndex === -1) return null;

    // Look backwards for the date range pattern
    const searchStart = Math.max(0, whileSuppliesLastIndex - 200); // Look back up to 200 chars
    const searchText = htmlContent.substring(searchStart, whileSuppliesLastIndex);

    // Find the pattern: "dateRange, year • While Supplies Last"
    const match = searchText.match(/([A-Za-z]+\s+\d+(?:\s*-\s*[A-Za-z]+\s+\d+)?),\s*(\d{4})\s*•\s*While Supplies Last/);

    if (match) {
        return `${match[1]}, ${match[2]}`;
    }

    return null;
}

function formatDateRangeForFilename(dateRangeText) {
    if (!dateRangeText) return '';

    // Examples:
    // "October 28 - November 3, 2025" → "Oct28-Nov3.2025"
    // "December 15 - 31, 2025" → "Dec15-Dec31.2025"

    const monthMap = {
        'January': 'Jan', 'February': 'Feb', 'March': 'Mar',
        'April': 'Apr', 'May': 'May', 'June': 'Jun',
        'July': 'Jul', 'August': 'Aug', 'September': 'Sep',
        'October': 'Oct', 'November': 'Nov', 'December': 'Dec'
    };

    // Match date ranges like "October 28 - November 3, 2025"
    const rangeMatch = dateRangeText.match(/^([A-Za-z]+)\s+(\d+)(?:\s*-\s*([A-Za-z]+)\s+(\d+))?,?\s*(\d{4})$/);

    if (rangeMatch) {
        const [, startMonth, startDay, endMonth, endDay, year] = rangeMatch;

        const startMonthAbbrev = monthMap[startMonth] || startMonth.substring(0, 3);
        const endMonthAbbrev = endMonth ? (monthMap[endMonth] || endMonth.substring(0, 3)) : startMonthAbbrev;

        if (endMonth && endDay) {
            return `${startMonthAbbrev}${startDay}-${endMonthAbbrev}${endDay}.${year}`;
        } else {
            return `${startMonthAbbrev}${startDay}.${year}`;
        }
    }

    // Fallback: clean up the text
    return dateRangeText.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
}

function generateZipFilenameFromHTML(htmlContent) {
    const dateRange = extractDateRangeFromHTML(htmlContent);

    if (dateRange) {
        const formattedRange = formatDateRangeForFilename(dateRange);
        return `Promo-email.${formattedRange}.zip`;
    } else {
        // Fallback to current date
        const today = new Date();
        return `Promo-email.${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.zip`;
    }
}

function createBCCBatchEML(subject, htmlBody, recipients, pdfAttachments = [], format = 'eml', batchNumber = 1) {
    // DIAGNOSTIC: Log function call with all parameters
    console.log(`\n>>> createBCCBatchEML called for Batch ${batchNumber}`);
    console.log(`    recipients parameter type: ${typeof recipients}, isArray: ${Array.isArray(recipients)}`);
    console.log(`    recipients.length: ${recipients ? recipients.length : 'undefined'}`);
    if (recipients && recipients.length > 0) {
        console.log(`    First 3 recipients: ${recipients.slice(0, 3).join(', ')}`);
        console.log(`    Last recipient: ${recipients[recipients.length - 1]}`);
    }

    // Create EML email with CRLF line endings for Outlook compatibility
    // Note: Mac Outlook (.emltpl) may only display 1 BCC recipient in the UI for security,
    // but all recipients are included when the email is sent.
    const boundary = '----=_NextPart_' + Date.now() + '_' + batchNumber + '_' + Math.random().toString(36).substr(2, 9);
    const senderEmail = userProfile && userProfile.storeEmail ? userProfile.storeEmail : 'noreply@example.com';
    const senderName = userProfile && userProfile.storeName ? userProfile.storeName : 'Store';

    let emlContent = `From: ${senderName} <${senderEmail}>\r\n`;
    emlContent += `Subject: ${subject}\r\n`;

    // Add Date header with slight offset per batch to ensure uniqueness
    const now = new Date(Date.now() + (batchNumber * 1000)); // Add 1 second per batch
    emlContent += `Date: ${now.toUTCString()}\r\n`;

    // Add unique Message-ID to prevent Outlook from treating files as duplicates
    const messageId = `<batch${batchNumber}.${Date.now()}.${Math.random().toString(36).substr(2, 9)}@citizenstore.local>`;
    emlContent += `Message-ID: ${messageId}\r\n`;

    // Add BCC recipients with RFC 822 compliant header folding
    // Long headers must be split across multiple lines (max 998 chars per line, recommended 78)
    if (recipients && recipients.length > 0) {
        emlContent += `Bcc: `;

        let currentLine = '';
        for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i];
            const separator = i < recipients.length - 1 ? ', ' : '';
            const addition = recipient + separator;

            // Check if adding this recipient would exceed 900 characters (safe limit)
            if (currentLine.length + addition.length > 900) {
                // Write current line with folding (CRLF + space for continuation)
                emlContent += currentLine + '\r\n ';
                currentLine = addition;
            } else {
                currentLine += addition;
            }
        }

        // Write final line
        emlContent += currentLine + '\r\n';

        console.log(`    ✓ BCC header created with ${recipients.length} recipients (folded for RFC 822 compliance)`);
    } else {
        console.error(`    ✗ ERROR - No recipients provided for BCC headers!`);
        console.error('    Recipients array:', recipients);
    }

    emlContent += `MIME-Version: 1.0\r\n`;
    emlContent += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
    emlContent += `X-Unsent: 1\r\n`; // Mark as unsent/draft
    emlContent += `X-Outlook-Template: 1\r\n`; // Mark as Outlook template
    emlContent += `Message-Class: IPM.Note\r\n`; // Outlook message classification
    emlContent += `X-Outlook-Message-Flag: \r\n`; // Draft status indicator
    emlContent += `X-Mailer: Microsoft Outlook 16.0\r\n`; // Application identifier
    emlContent += `X-Msg-Status: 00000000\r\n`; // Message status code
    emlContent += `\r\n`;

    // HTML body part
    emlContent += `--${boundary}\r\n`;
    emlContent += `Content-Type: text/html; charset=utf-8\r\n`;
    emlContent += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
    emlContent += htmlBody + '\r\n\r\n';

    // Add PDF attachments
    if (pdfAttachments && pdfAttachments.length > 0) {
        pdfAttachments.forEach(pdf => {
            // Extract base64 data from data URL (format: data:application/pdf;base64,...)
            const base64Data = pdf.data.split(',')[1];

            emlContent += `--${boundary}\r\n`;
            emlContent += `Content-Type: application/pdf; name="${pdf.name}"\r\n`;
            emlContent += `Content-Transfer-Encoding: base64\r\n`;
            emlContent += `Content-Disposition: attachment; filename="${pdf.name}"\r\n`;
            emlContent += `\r\n`;

            // Split base64 data into 76-character lines (RFC 2045 standard)
            const lines = base64Data.match(/.{1,76}/g) || [];
            emlContent += lines.join('\r\n');
            emlContent += `\r\n\r\n`;
        });

        console.log(`    ✓ Added ${pdfAttachments.length} PDF attachment(s) to batch ${batchNumber}`);
    }

    emlContent += `--${boundary}--\r\n`;

    const bccCount = (emlContent.match(/BCC:/g) || []).length;

    // Format batch number with leading zeros (001, 002, etc.)
    const paddedBatchNumber = batchNumber.toString().padStart(3, '0');

    return {
        format: format,
        data: new TextEncoder().encode(emlContent),
        filename: `batch-email${paddedBatchNumber}.${format}`
    };
}



async function generateBulkEmailFiles() {
    try {
        // Validate current template
        if (currentTemplate !== 'promotion-email') {
            showToast('⚠️ Bulk email only available for promotion template');
            return;
        }

        // Get and validate email list
        const bulkEmailList = document.getElementById('bulkEmailList');
        if (!bulkEmailList) {
            showToast('⚠️ Bulk email interface not found');
            return;
        }

        const emailText = bulkEmailList.value.trim();
        if (!emailText) {
            showToast('⚠️ Please enter recipient emails');
            return;
        }

        const emails = parseEmailList(emailText);

        if (emails.length === 0) {
            showToast('⚠️ No valid emails found. Check format and try again.');
            return;
        }

        // Validate batch size
        if (!validateBatchSize()) {
            showToast('⚠️ Please fix batch size issues');
            return;
        }

        const batchSizeInput = getDynamicElement('batchSize');
        const batchSizeInputValue = batchSizeInput ? batchSizeInput.value : '500';
        const batchSize = parseInt(batchSizeInputValue);

        if (isNaN(batchSize) || batchSize <= 0) {
            console.error('Invalid batch size:', batchSize);
            showToast('⚠️ Invalid batch size. Please check the batch size input.');
            return;
        }

        if (batchSize < 50) {
            console.warn('Batch size too small:', batchSize, '- forcing minimum of 50');
            showToast('⚠️ Batch size increased to minimum of 50 emails.');
            if (batchSizeInput) batchSizeInput.value = '50';
            return; // Let user try again with corrected value
        }

        // Check for duplicates and get user confirmation
        const duplicates = detectDuplicates(emails);
        let finalEmails = emails;

        if (duplicates.length > 0) {
            const confirmed = confirm(
                `Found ${duplicates.length} duplicate email addresses in your list.\n\n` +
                `Examples: ${duplicates.slice(0, 3).join(', ')}${duplicates.length > 3 ? '...' : ''}\n\n` +
                `Remove duplicates to ensure each recipient gets only one email?\n\n` +
                `• OK: Remove duplicates (recommended)\n` +
                `• Cancel: Keep all emails (including duplicates)`
            );

            if (confirmed) {
                // Remove duplicates
                finalEmails = [...new Set(emails)];
                showToast(`✅ Removed ${duplicates.length} duplicate emails`);
            } else {
                // Keep all emails (including duplicates)
                finalEmails = emails;
                showToast(`ℹ️ Keeping all emails including duplicates`);
            }
        }

        // Generate HTML content first
        showToast('⏳ Generating email content...');

        // Collect promotion data for HTML generation
    const dateRangeInput = getDynamicElement('promoDateRange');
    const yearInput = getDynamicElement('promoYear');
    const titleInput = getDynamicElement('promoTitle');

        const data = {
            promoDateRange: dateRangeInput ? dateRangeInput.value : '',
            promoYear: yearInput ? yearInput.value : '',
            promoTitle: titleInput ? titleInput.value : ''
        };

        const htmlContent = generatePromotionEmailHTML(data);

        if (!htmlContent || htmlContent.length < 100) {
            showToast('⚠️ Email content generation failed. Please fill out the form completely.');
            return;
        }

        // Extract date range for ZIP naming
        const zipFilename = generateZipFilenameFromHTML(htmlContent);

        // Split emails into batches
        const batches = [];
        for (let i = 0; i < finalEmails.length; i += batchSize) {
            const batch = finalEmails.slice(i, i + batchSize);
            batches.push(batch);
        }

        // DIAGNOSTIC: Verify all batches were created correctly
        console.log('=== BATCH VERIFICATION ===');
        console.log(`Total emails: ${finalEmails.length}, Batch size: ${batchSize}, Number of batches: ${batches.length}`);
        batches.forEach((b, idx) => {
            console.log(`Batch ${idx + 1}: ${b.length} emails - First: ${b[0]}, Last: ${b[b.length-1]}`);
        });
        console.log('=========================');

        // Get recommended format based on OS (before using it)
        let format = getRecommendedFormat();
        if (!format) {
            console.error('Format is undefined, defaulting to eml');
            format = 'eml'; // Fallback
        }

        // Show Mac-specific warning about BCC display limitations
        if (format === 'emltpl') {
            const totalRecipients = batches.reduce((sum, batch) => sum + batch.length, 0);
            showToast(`ℹ️ Mac Outlook templates: May show only 1 BCC recipient, but all ${totalRecipients} recipients are included when sent.`);
        }

        showToast(`⏳ Creating ${batches.length} email files...`);

        // Generate email files for each batch using OS-optimized format
        const emailFiles = [];
        for (let i = 0; i < batches.length; i++) {
            const batch = [...batches[i]];  // Create defensive copy to avoid reference issues
            console.log(`Generating batch ${i + 1} of ${batches.length} with ${batch.length} recipients`);
            console.log(`  First recipient: ${batch[0]}, Last recipient: ${batch[batch.length - 1]}`);

            // Get subject line
            const subject = selectedSubjectLine || 'Promotional Sale';

            const emailResult = createBCCBatchEML(subject, htmlContent, batch, attachedPDFs, format, i + 1);
            console.log(`  Generated file: ${emailResult.filename}, size: ${emailResult.data.length} bytes`);

            if (!emailResult || !emailResult.data || emailResult.data.length < 100) {
                throw new Error(`Failed to generate email content for batch ${i + 1}`);
            }

            emailFiles.push({
                name: emailResult.filename,
                content: emailResult.data,
                format: emailResult.format
            });
        }

        // Check selected download format
        const downloadFormat = document.querySelector('input[name="downloadFormat"]:checked').value;

        // Determine format for messaging (check first file)
        const primaryFormat = emailFiles[0]?.format || 'eml';
        const formatName = primaryFormat === 'emltpl' ? 'Template' : 'EML';
        const formatDesc = primaryFormat === 'emltpl' ? 'Outlook for Mac templates (.emltpl)' : 'Email files (.eml)';

        if (downloadFormat === 'zip') {
            // Create ZIP file containing all email files
            showToast(`📦 Creating ZIP archive with ${emailFiles.length} ${formatName} files...`);

            const zip = new JSZip();

            // Add manifest file to explain contents and reduce suspicion
            const manifestContent = `PROMOTIONAL EMAIL BATCHES

This ZIP archive contains ${emailFiles.length} promotional email files (${formatDesc}) for bulk distribution.

Each file contains:
- HTML formatted promotional content
- BCC recipient list (spam-safe bulk sending)
- Subject line and proper email headers
- Optional PDF attachments

Files are generated by Citizen Communication Template Generator for legitimate marketing purposes.

Created: ${new Date().toISOString()}
Total files: ${emailFiles.length}
Format: ${formatDesc}

These files are safe to open with Microsoft Outlook on Windows and Mac.
`;

            zip.file('README.txt', manifestContent);

            // Add each email file to the ZIP with different compression options
            emailFiles.forEach(file => {
                zip.file(file.name, file.content, {
                    compression: 'DEFLATE',
                    compressionOptions: { level: 6 } // Medium compression
                });
            });

            // Generate ZIP blob with different options to reduce suspicion
            zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 },
                comment: 'Promotional email batches - Safe for Outlook'
            }).then(zipBlob => {
                const url = URL.createObjectURL(zipBlob);

                const link = document.createElement('a');
                link.href = url;
                link.download = zipFilename;
                link.click();

                URL.revokeObjectURL(url);
                showToast(`✅ ZIP archive downloaded: ${zipFilename} (includes README.txt)`);
            }).catch(error => {
                console.error('ZIP creation failed:', error);
                showToast('❌ Failed to create ZIP archive');
            });
        } else {
            // Download individual email files
            showToast(`📁 Downloading ${emailFiles.length} individual ${formatName} files...`);

            // Download files with optimized delays to avoid browser blocking
            for (let i = 0; i < emailFiles.length; i++) {
                const file = emailFiles[i];

                // Set MIME type for email files
                const mimeType = 'message/rfc822';
                const blob = new Blob([file.content], { type: mimeType });
                const url = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = file.name;
                link.click();

                URL.revokeObjectURL(url);

                // Optimized delay between downloads (reduced from 500ms to 200ms)
                if (i < emailFiles.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            showToast(`✅ Downloaded ${emailFiles.length} ${formatName} files successfully!`);
        }

    } catch (error) {
        console.error('Bulk EML generation error:', error);
        showToast(`⚠️ Failed to generate bulk emails: ${error.message || 'Unknown error'}`);
    }
}



// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

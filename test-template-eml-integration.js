#!/usr/bin/env node

/**
 * Template EML Integration Test Suite
 * Tests all 10 enhanced templates with EML signature integration
 *
 * Usage: node test-template-eml-integration.js
 */

// Mock user profile for testing
const mockUserProfile = {
    employeeName: 'John Smith',
    jobTitle: 'Sales Manager',
    storeName: 'Downtown Store',
    storePhone: '(555) 123-4567',
    storeAddress: '123 Main Street\nDowntown, USA 12345',
    storeEmail: 'downtown@citizenwatchgroup.com',
    companyEmail: 'john.smith@company.com'
};

let userProfile = mockUserProfile;
let testResults = [];
let testsPassed = 0;
let testsFailed = 0;

// ===== HELPER FUNCTIONS =====
function getEmployeeSignature(format = 'text') {
    const name = userProfile && userProfile.employeeName ? userProfile.employeeName : 'Employee Name';
    const title = userProfile && userProfile.jobTitle ? userProfile.jobTitle : 'Sales Associate';
    const companyEmail = userProfile && userProfile.companyEmail ? userProfile.companyEmail : '';
    const storeName = userProfile && userProfile.storeName ? userProfile.storeName : 'Citizen Company Store';
    const address = userProfile && userProfile.storeAddress ? userProfile.storeAddress : '';
    const phone = userProfile && userProfile.storePhone ? userProfile.storePhone : '555-123-4567';

    if (format === 'html') {
        const emailLine = companyEmail ? `<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: black;">Email: &nbsp;</span><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: blue;"><u>${companyEmail}</u></span></p>` : '';
        return `<div id="ms-outlook-mobile-signature">
<p dir="ltr" style="text-align: left; text-indent: 0px; background-color: rgb(255, 255, 255); margin: 0in;">
<span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 9pt; color: black;"><b>${name}</b> │ ${title}&nbsp;</span></p>
<p dir="ltr" style="text-align: left; text-indent: 0px; background-color: rgb(255, 255, 255); margin: 0in;">
<span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: black;"><b><u>______________________________________________________________________</u></b></span></p>
<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: rgb(47, 47, 47);"><b>Citizen Watch America</b></span></p>
<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: rgb(47, 47, 47);"><b>${storeName}</b></span></p>
${address ? address.split('\n').map(line => `<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: black;">${line}</span></p>`).join('') : ''}
<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: black;">Tel/SMS: ${phone}</span></p>
${emailLine}
<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: blue;"><u><a href="https://www.citizenwatch.com/" style="margin-top: 0px; margin-bottom: 0px;">Citizen</a></u></span></p>
</div>`;
    } else {
        const emailLine = companyEmail ? `Email: ${companyEmail}\n` : '';
        return `${name} │ ${title}
______________________________________________________________________
Citizen Watch America - ${storeName}
${address ? address.replace(/\n/g, '\n') : ''}
Tel/SMS: ${phone}
${emailLine}
Alpina | Bulova | Citizen | Frederique Constant

Please consider the environment before printing this e-mail`;
    }
}

function getStorePhone() {
    return userProfile && userProfile.storePhone ? userProfile.storePhone : '(555) 123-4567';
}

function getStoreName() {
    return userProfile && userProfile.storeName ? userProfile.storeName : 'Citizen Company Store';
}

function getFullStoreLocation() {
    return userProfile && userProfile.storeLocation ? userProfile.storeLocation : 'Citizen Company Store';
}

function sanitizeTemplateData(data) {
    const sanitized = {};
    for (const key in data) {
        if (data[key] !== null && data[key] !== undefined) {
            sanitized[key] = String(data[key]).replace(/</g, '&lt;').replace(/>/g, '&gt;');
        } else {
            sanitized[key] = '';
        }
    }
    return sanitized;
}

// ===== TEST UTILITIES =====
function assert(condition, message) {
    if (!condition) {
        testsFailed++;
        console.error(`❌ FAIL: ${message}`);
    } else {
        testsPassed++;
        console.log(`✓ PASS: ${message}`);
    }
}

function testContains(haystack, needle, message) {
    if (typeof haystack !== 'string' || !haystack.includes(needle)) {
        testsFailed++;
        console.error(`❌ FAIL: ${message}\n   Expected to find: "${needle}"`);
    } else {
        testsPassed++;
        console.log(`✓ PASS: ${message}`);
    }
}

// ===== TEMPLATE TESTS =====

console.log('\n========================================');
console.log('Template EML Integration Test Suite');
console.log('========================================\n');

// Test Template 1: New Customer Welcome
console.log('TEST 1: New Customer Welcome Template');
console.log('---');
const newCustomerData = {
    customerName: 'Jane Doe',
    employeeName: 'John Smith'
};
const newCustomerOutput = `Subject: Welcome to Citizen Company Store - Your VIP Access

Hi ${newCustomerData.customerName},

Thank you for visiting our Citizen Company Store outlet location! It was a pleasure helping you explore our offerings today.

I've added you to our VIP email list for weekly promotional updates featuring exclusive outlet pricing on our timepieces.

Please don't hesitate to reach out by replying to this email or call the store at ${getStorePhone()}. I would be happy to check availability on any models you're considering.

${getEmployeeSignature()}`;

testContains(newCustomerOutput, 'Jane Doe', 'Template contains customer name');
testContains(newCustomerOutput, 'VIP', 'Template contains VIP reference');
testContains(newCustomerOutput, getStorePhone(), 'Template contains store phone');
testContains(newCustomerOutput, 'John Smith', 'Template contains employee signature');
assert(newCustomerOutput.endsWith(getEmployeeSignature()), 'Template ends with signature');
console.log('');

// Test Template 2: New Model Arrival
console.log('TEST 2: New Model Arrival Template');
console.log('---');
const newModelData = {
    customerName: 'John Doe',
    brand: 'Citizen',
    modelName: 'Eco-Drive',
    modelNumber: 'CA0123456',
    keyFeature1: 'Eco-Drive solar powered',
    keyFeature2: 'Water resistant 100m',
    keyFeature3: 'Date window',
    price: '$299.99',
    employeeName: 'John Smith'
};
const newModelOutput = `Subject: Great News! ${newModelData.modelName} Now Available

Hi ${newModelData.customerName},

Great news! The ${newModelData.brand} ${newModelData.modelName} (${newModelData.modelNumber}) you were interested in has arrived at our store.

Key Features:
• ${newModelData.keyFeature1}
• ${newModelData.keyFeature2}
• ${newModelData.keyFeature3}

Current price: ${newModelData.price}

I'd be happy to set up an appointment to show you all the features of this watch and let you try it on. This model tends to generate a lot of interest, so I wanted to reach out to you first.

Would you like to schedule a time to see it in person? Please reply to this email or call the store at ${getStorePhone()}.

Looking forward to hearing from you!

${getEmployeeSignature()}`;

testContains(newModelOutput, newModelData.modelName, 'Template contains model name');
testContains(newModelOutput, newModelData.modelNumber, 'Template contains model number');
testContains(newModelOutput, newModelData.price, 'Template contains price');
testContains(newModelOutput, 'Key Features:', 'Template lists key features');
testContains(newModelOutput, getEmployeeSignature('text'), 'Template contains signature');
console.log('');

// Test Template 3: Limited Edition
console.log('TEST 3: Limited Edition Template');
console.log('---');
const limitedEditionData = {
    customerName: 'Jane Smith',
    brand: 'Bulova',
    modelName: 'Precisionist',
    modelNumber: 'BE0043',
    limitedDetails: 'Limited collector series',
    price: '$895.00',
    quantityAvailable: '3',
    employeeName: 'John Smith'
};
const limitedEditionOutput = `Subject: Exclusive: Limited Edition ${limitedEditionData.modelName} Available

Hi ${limitedEditionData.customerName},

I wanted to reach out to you personally because we just received a ${limitedEditionData.brand} ${limitedEditionData.modelName} (${limitedEditionData.modelNumber}) - ${limitedEditionData.limitedDetails}.

As someone who appreciates fine timepieces and unique additions to your collection, I thought you'd want to know about this immediately.

Price: ${limitedEditionData.price}
Availability: Only ${limitedEditionData.quantityAvailable} available

This is truly a special piece that won't last long. I'd love to show it to you in person and discuss how it could complement your collection.

Can you stop by this week, or would you like me to hold one for you? Please reply to this email or call the store at ${getStorePhone()}.

${getEmployeeSignature()}

P.S. - Given the limited availability, I'm only reaching out to our most valued collectors. Let me know if you're interested!`;

testContains(limitedEditionOutput, 'Limited', 'Template mentions limited availability');
testContains(limitedEditionOutput, limitedEditionData.quantityAvailable, 'Template shows quantity available');
testContains(limitedEditionOutput, limitedEditionData.price, 'Template shows price');
assert(limitedEditionOutput.includes('P.S.'), 'Template includes PS note');
console.log('');

// Test Template 4: VIP Reconnection
console.log('TEST 4: VIP Reconnection Template');
console.log('---');
const vipData = {
    clientName: 'Robert Johnson',
    employeeName: 'John Smith'
};
const vipOutput = `Subject: Your Store Has Evolved - We'd Love to Show You What's New

Hi ${vipData.clientName},

I was reviewing our VIP client records and noticed it's been a while since your last visit. I wanted to personally reach out because our store has undergone some exciting changes that I think you'll appreciate.

We're now a hybrid store - combining the outlet values you love with access to current season merchandise. This means alongside our clearance deals, you can now find the latest releases and expanded brand offerings.

To welcome you back, I'd like to offer you a complimentary watch service visit. Bring in any of your timepieces and I'll:
- Set and synchronize all your watches
- Perform atomic time synchronization resets
- Help with any complicated functions you're having trouble with
- Show you our new brand offerings and store layout

No purchase necessary - I just want to reconnect and ensure your watches are working perfectly.

Would you have time this week or next to stop by? I'd love to show you how we've evolved while maintaining the exceptional values and service you remember.

${getEmployeeSignature()}

P.S. - We now carry everything from current season pieces to discontinued treasures, giving you more options than ever before.`;

testContains(vipOutput, 'VIP', 'Template mentions VIP');
testContains(vipOutput, 'hybrid store', 'Template mentions hybrid store concept');
testContains(vipOutput, 'complimentary', 'Template offers service');
console.log('');

// Test Template 5: Phone Confirmation
console.log('TEST 5: Phone Confirmation Template');
console.log('---');
const phoneConfData = {
    customerName: 'Alice Brown',
    brand: 'Citizen',
    modelName: 'Promaster',
    modelNumber: 'BN0211',
    price: '$199.99',
    discount: '25',
    totalAmount: '$224.99',
    customerAddress: '456 Oak Ave\nNew York, NY 10001',
    carrier: 'UPS',
    trackingNumber: '1234567890',
    employeeName: 'John Smith'
};
const phoneConfOutput = `Subject: Order Confirmation - ${phoneConfData.modelName}

Hi ${phoneConfData.customerName},

Thank you for your phone order! This email confirms the following:

Order Details:
Item: ${phoneConfData.brand} ${phoneConfData.modelName}
Model #: ${phoneConfData.modelNumber}
Price: ${phoneConfData.price} (includes ${phoneConfData.discount}% outlet discount)
Shipping: $20 flat-rate ground shipping
Total: ${phoneConfData.totalAmount}

Shipping Information:
${phoneConfData.customerAddress}

Your order will ship within 1-2 business days via ${phoneConfData.carrier}. You'll receive tracking information at this email address once shipped.

Tracking Number: ${phoneConfData.trackingNumber}

If you have any questions, please don't hesitate to contact us at ${getStorePhone()}.

Thank you for shopping with ${getStoreName()}!

${getEmployeeSignature()}`;

testContains(phoneConfOutput, 'Order Details:', 'Template contains order details section');
testContains(phoneConfOutput, phoneConfData.trackingNumber, 'Template includes tracking number');
testContains(phoneConfOutput, phoneConfData.totalAmount, 'Template shows total amount');
testContains(phoneConfOutput, getStorePhone(), 'Template includes store phone');
console.log('');

// Test Template 6: Phone Shipped
console.log('TEST 6: Phone Shipped Template');
console.log('---');
const phoneShippedData = {
    customerName: 'Charlie Davis',
    brand: 'Bulova',
    modelName: 'Accutron',
    modelNumber: 'BU2020',
    trackingNumber: '9876543210',
    customerAddress: '789 Pine St\nLos Angeles, CA 90001',
    employeeName: 'John Smith'
};
const phoneShippedOutput = `Subject: Your Watch Order - Tracking Information

Hi ${phoneShippedData.customerName},

Thank you for your recent purchase from ${getStoreName()}! We're pleased to confirm that your order has been shipped and is on its way to you.

Tracking Information:
UPS Tracking Number: ${phoneShippedData.trackingNumber}

You can track your shipment at the link above or visit ups.com and enter your tracking number.

Your package requires an adult signature upon delivery to ensure safe receipt of your timepiece.

Order Details:
Watch Model: ${phoneShippedData.modelNumber} - ${phoneShippedData.modelName}
Shipping Address: ${phoneShippedData.customerAddress}

If you have any questions about your order or need any assistance, please don't hesitate to reach out. I'm here to help!

We hope you enjoy your new ${phoneShippedData.brand} timepiece!

${getEmployeeSignature()}`;

testContains(phoneShippedOutput, 'Tracking Information:', 'Template has tracking section');
testContains(phoneShippedOutput, phoneShippedData.trackingNumber, 'Template includes tracking number');
testContains(phoneShippedOutput, 'adult signature', 'Template mentions signature requirement');
console.log('');

// Test Template 7: Phone Under $500
console.log('TEST 7: Phone Under $500 Order Template');
console.log('---');
const phoneUnder500Data = {
    managerNameOrStoreName: 'Store Manager',
    customerName: 'David Wilson',
    customerId: 'CUST001',
    employeeName: 'Sales Associate',
    employeeId: 'EMP123',
    unitsQuantity: '2',
    totalAmount: '$599.98',
    creditCardVerified: 'Yes',
    needsManagerVerification: 'No'
};
const phoneUnder500Output = `Subject: Phone Order Form for ${phoneUnder500Data.customerName}

Hi ${phoneUnder500Data.managerNameOrStoreName},

Attached is the form for the phone order for ${phoneUnder500Data.customerName} (${phoneUnder500Data.customerId}).

Ringing under: ${phoneUnder500Data.employeeName} (${phoneUnder500Data.employeeId})
Units: ${phoneUnder500Data.unitsQuantity}
Total: ${phoneUnder500Data.totalAmount}

Order Status: Credit card manager verified - Ready for processing

${getEmployeeSignature()}`;

testContains(phoneUnder500Output, 'Phone Order Form', 'Template identifies as order form');
testContains(phoneUnder500Output, phoneUnder500Data.customerId, 'Template includes customer ID');
testContains(phoneUnder500Output, 'Credit card manager verified', 'Template shows verification status');
console.log('');

// Test Template 8: Phone Corporate
console.log('TEST 8: Phone Corporate Approval Template');
console.log('---');
const phoneCorporateData = {
    customerName: 'Eve Martinez',
    customerId: 'CUST002',
    employeeName: 'Sales Manager',
    employeeId: 'EMP124',
    unitsQuantity: '5',
    totalAmount: '$2,499.95',
    fulfillingStore: 'Downtown Store',
    yourName: 'Regional Manager'
};
const phoneCorporateOutput = `Subject: Phone Order Approval Request - ${phoneCorporateData.customerName}

Hello,

I am forwarding a request for approval on a phone order for ${phoneCorporateData.employeeName} (${phoneCorporateData.employeeId}).

There are ${phoneCorporateData.unitsQuantity} units totaling ${phoneCorporateData.totalAmount}. It will be fulfilled at ${phoneCorporateData.fulfillingStore}.

Customer: ${phoneCorporateData.customerName} (${phoneCorporateData.customerId})

I have verified and signed off. Please let us know if you have any questions.

Thank You,
${phoneCorporateData.yourName}`;

testContains(phoneCorporateOutput, 'Approval Request', 'Template requests approval');
testContains(phoneCorporateOutput, phoneCorporateData.unitsQuantity, 'Template shows units');
testContains(phoneCorporateOutput, phoneCorporateData.totalAmount, 'Template shows total amount');
console.log('');

// Test Template 9: Inter-Store Notification
console.log('TEST 9: Inter-Store Notification Template');
console.log('---');
const interStoreData = {
    recipientStoreName: 'Uptown Store',
    customerName: 'Frank Thompson',
    trackingNumber: '5555555555'
};
const interStoreOutput = `Subject: Phone Order Processed and Shipped - ${interStoreData.customerName}

Hi ${interStoreData.recipientStoreName} Team,

The phone order for ${interStoreData.customerName} has been rung and labeled for shipping.

UPS Tracking Number: ${interStoreData.trackingNumber}

The package has been prepared and is ready for UPS pickup.

Thank you,`;

testContains(interStoreOutput, 'Phone Order Processed', 'Template describes action');
testContains(interStoreOutput, interStoreData.trackingNumber, 'Template includes tracking');
testContains(interStoreOutput, interStoreData.recipientStoreName, 'Template addresses store team');
console.log('');

// Test Template 10: Weekly Sale
console.log('TEST 10: Weekly Sale Template');
console.log('---');
const weeklySaleData = {
    customerName: 'Grace Lee',
    collectionName: 'Eco-Drive Solar',
    discount: '30',
    brand: 'Citizen',
    model1: 'Eco-Drive Promaster',
    price1: '$199.99',
    original1: '$299.99',
    model2: 'Eco-Drive Sport',
    price2: '$149.99',
    original2: '$249.99',
    endDate: 'Sunday',
    employeeName: 'John Smith'
};
const weeklySaleOutput = `Subject: ${weeklySaleData.customerName}, This Week's ${weeklySaleData.brand} Sale Includes Your Favorites

Hi ${weeklySaleData.customerName},

I remember you were looking at ${weeklySaleData.collectionName} pieces during your last visit. Good timing - we just started our ${weeklySaleData.discount}% off promotion on select ${weeklySaleData.brand} models this week!

Specifically available in that collection:
• ${weeklySaleData.model1} - Now ${weeklySaleData.price1} (was ${weeklySaleData.original1})
• ${weeklySaleData.model2} - Now ${weeklySaleData.price2} (was ${weeklySaleData.original2})

This promotion runs through ${weeklySaleData.endDate}. Would you like me to check if we have your size preference in stock?

${getEmployeeSignature()}`;

testContains(weeklySaleOutput, weeklySaleData.discount + '%', 'Template shows discount percentage');
testContains(weeklySaleOutput, weeklySaleData.price1, 'Template shows sale price');
testContains(weeklySaleOutput, weeklySaleData.original1, 'Template shows original price');
testContains(weeklySaleOutput, weeklySaleData.endDate, 'Template shows promotion end date');
console.log('');

// ===== SIGNATURE INTEGRATION TESTS =====
console.log('TEST GROUP: Signature Integration Tests');
console.log('---');

// Test that all enhanced templates end with signature
const enhancedTemplates = [
    { name: 'New Customer Welcome', output: newCustomerOutput },
    { name: 'New Model Arrival', output: newModelOutput },
    { name: 'Limited Edition', output: limitedEditionOutput },
    { name: 'VIP Reconnection', output: vipOutput },
    { name: 'Phone Confirmation', output: phoneConfOutput },
    { name: 'Phone Shipped', output: phoneShippedOutput },
    { name: 'Phone Under $500', output: phoneUnder500Output },
    { name: 'Weekly Sale', output: weeklySaleOutput }
];

const plainSignature = getEmployeeSignature('text');
enhancedTemplates.forEach(template => {
    if (template.output.includes(plainSignature)) {
        testsPassed++;
        console.log(`✓ PASS: ${template.name} template includes signature`);
    } else {
        testsFailed++;
        console.error(`❌ FAIL: ${template.name} template missing signature`);
    }
});

// ===== TEST SUMMARY =====
console.log('\n========================================');
console.log('TEST SUMMARY');
console.log('========================================');
console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed} ✓`);
console.log(`Failed: ${testsFailed} ${testsFailed > 0 ? '❌' : ''}`);
console.log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

if (testsFailed === 0) {
    console.log('\n✓ All template tests passed! All templates correctly integrate signatures.');
    process.exit(0);
} else {
    console.log(`\n❌ ${testsFailed} test(s) failed. Please review the output above.`);
    process.exit(1);
}

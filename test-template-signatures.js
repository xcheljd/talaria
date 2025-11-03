#!/usr/bin/env node

/**
 * Template Signature Test Suite
 * Tests signature functionality after EML creation
 *
 * Usage: node test-template-signatures.js
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

// Simple mock localStorage for Node.js environment
const mockLocalStorage = {
    data: {},
    getItem(key) {
        return this.data[key] || null;
    },
    setItem(key, value) {
        this.data[key] = value;
    },
    removeItem(key) {
        delete this.data[key];
    }
};

// Initialize with mock user profile
mockLocalStorage.setItem('userProfile', JSON.stringify(mockUserProfile));

let userProfile = mockUserProfile;
let testResults = [];
let testsPassed = 0;
let testsFailed = 0;

// ===== SIGNATURE FUNCTION =====
function getEmployeeSignature(format = 'text') {
    const name = userProfile && userProfile.employeeName ? userProfile.employeeName : 'Employee Name';
    const title = userProfile && userProfile.jobTitle ? userProfile.jobTitle : 'Sales Associate';
    const companyEmail = userProfile && userProfile.companyEmail ? userProfile.companyEmail : '';
    const storeName = userProfile && userProfile.storeName ? userProfile.storeName : 'Citizen Company Store';
    const storeLocation = userProfile && userProfile.storeLocation ? userProfile.storeLocation : 'Orlando Premium Outlets';
    const address = userProfile && userProfile.storeAddress ? userProfile.storeAddress : '';
    const phone = userProfile && userProfile.storePhone ? userProfile.storePhone : '555-123-4567';

    if (format === 'html') {
        // HTML version with Outlook-compatible styling
        const emailLine = companyEmail ? `<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: black;">Email: &nbsp;</span><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: blue;"><u>${companyEmail}</u></span><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: black;">&nbsp;&nbsp;</span></p>` : '';

        return `<div id="ms-outlook-mobile-signature">
<p dir="ltr" style="text-align: left; text-indent: 0px; background-color: rgb(255, 255, 255); margin: 0in;">
<span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 9pt; color: black;"><b>${name}</b> │ ${title}&nbsp;</span></p>
<p dir="ltr" style="text-align: left; text-indent: 0px; background-color: rgb(255, 255, 255); margin: 0in;">
<span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: black;"><b><u>______________________________________________________________________</u></b></span></p>
<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: rgb(47, 47, 47);"><b>Citizen Watch America</b></span></p>
<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: rgb(47, 47, 47);"><b>${storeName}</b></span></p>
${address ? address.split('\n').map(line => `<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: black;">${line}</span></p>`).join('') : ''}
<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: black;">Tel/SMS: ${phone}</span></p>
<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: rgb(0, 0, 0);">&nbsp;</span></p>
${emailLine}
<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: blue;"><u><a href="https://us.alpinawatches.com/" title="https://us.alpinawatches.com/" style="margin-top: 0px; margin-bottom: 0px;">Alpina</a></u></span><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: rgb(0, 0, 0);">&nbsp;|</span><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: blue;"><u><a href="https://www.bulova.com/us/en/" title="https://www.bulova.com/us/en/" style="margin-top: 0px; margin-bottom: 0px;">Bulova</a></u></span><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: rgb(0, 0, 0);">&nbsp;|</span><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: blue;"><u><a href="https://www.citizenwatch.com/us/en/" title="https://www.citizenwatch.com/us/en/" style="margin-top: 0px; margin-bottom: 0px;">Citizen</a></u></span><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: rgb(0, 0, 0);">&nbsp;|</span><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: blue;"><u><a href="https://us.frederiqueconstant.com/" title="https://us.frederiqueconstant.com/" style="margin-top: 0px; margin-bottom: 0px;">Frederique Constant</a></u></span></p>
<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: rgb(0, 0, 0);">&nbsp;</span></p>
<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: rgb(12, 136, 42);"><b>Please consider the environment before printing this e-mail</b></span></p>
</div>`;
    } else {
        // Plain text version for non-HTML contexts
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

// ===== EML PROCESSING FUNCTION =====
function processHTMLForEML(htmlBody) {
    // Replace plain text signature with HTML signature
    const plainSignature = getEmployeeSignature('text');
    const htmlSignature = getEmployeeSignature('html');

    // Escape special regex characters in the plain signature
    const escapedPlainSignature = plainSignature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Replace the plain text signature with HTML signature
    return htmlBody.replace(new RegExp(escapedPlainSignature.replace(/\n/g, '\\s*'), 'g'), htmlSignature);
}

// ===== GENERIC EML FILE CREATION =====
function createGenericEMLFile(subject, body, attachments = [], format = 'eml') {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const boundary = '----=_NextPart_' + timestamp + '_' + randomId;
    const messageId = `<single.${timestamp}.${randomId}@citizenstore.local>`;
    const date = new Date().toUTCString();

    let eml = '';
    eml += `Subject: ${subject}\r\n`;
    eml += `Date: ${date}\r\n`;
    eml += `Message-ID: ${messageId}\r\n`;
    eml += `MIME-Version: 1.0\r\n`;
    eml += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
    eml += `X-Unsent: 1\r\n`;
    eml += `\r\n`;
    eml += `This is a multi-part message in MIME format.\r\n`;
    eml += `\r\n`;

    // Add text body part (for simple email templates)
    eml += `--${boundary}\r\n`;
    eml += `Content-Type: text/plain; charset=utf-8\r\n`;
    eml += `Content-Transfer-Encoding: quoted-printable\r\n`;
    eml += `\r\n`;

    // Simple quoted-printable encoding for testing
    let encodedBody = body.replace(/\r?\n/g, '\r\n');
    eml += encodedBody;
    eml += `\r\n`;
    eml += `--${boundary}--\r\n`;

    return eml;
}

// ===== TEST UTILITIES =====
function assert(condition, message) {
    if (!condition) {
        testsFailed++;
        testResults.push(`❌ FAIL: ${message}`);
        console.error(`❌ FAIL: ${message}`);
    } else {
        testsPassed++;
        testResults.push(`✓ PASS: ${message}`);
        console.log(`✓ PASS: ${message}`);
    }
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        testsFailed++;
        testResults.push(`❌ FAIL: ${message}\n   Expected: "${expected}"\n   Actual: "${actual}"`);
        console.error(`❌ FAIL: ${message}\n   Expected: "${expected}"\n   Actual: "${actual}"`);
    } else {
        testsPassed++;
        testResults.push(`✓ PASS: ${message}`);
        console.log(`✓ PASS: ${message}`);
    }
}

function testContains(haystack, needle, message) {
    if (typeof haystack !== 'string' || !haystack.includes(needle)) {
        testsFailed++;
        testResults.push(`❌ FAIL: ${message}\n   Expected to find: "${needle}"`);
        console.error(`❌ FAIL: ${message}\n   Expected to find: "${needle}"`);
    } else {
        testsPassed++;
        testResults.push(`✓ PASS: ${message}`);
        console.log(`✓ PASS: ${message}`);
    }
}

// ===== TESTS =====

console.log('\n========================================');
console.log('Template Signature Test Suite');
console.log('========================================\n');

// Test 1: Plain text signature generation
console.log('TEST GROUP 1: Plain Text Signature Generation');
console.log('---');
const plainSig = getEmployeeSignature('text');
testContains(plainSig, 'John Smith', 'Plain text signature contains employee name');
testContains(plainSig, 'Sales Manager', 'Plain text signature contains job title');
testContains(plainSig, 'Downtown Store', 'Plain text signature contains store name');
testContains(plainSig, '(555) 123-4567', 'Plain text signature contains store phone');
testContains(plainSig, 'john.smith@company.com', 'Plain text signature contains company email');
assert(plainSig.includes('Citizen Watch America'), 'Plain text signature contains company branding');
console.log('');

// Test 2: HTML signature generation
console.log('TEST GROUP 2: HTML Signature Generation');
console.log('---');
const htmlSig = getEmployeeSignature('html');
testContains(htmlSig, 'John Smith', 'HTML signature contains employee name');
testContains(htmlSig, 'Sales Manager', 'HTML signature contains job title');
testContains(htmlSig, 'Downtown Store', 'HTML signature contains store name');
testContains(htmlSig, '(555) 123-4567', 'HTML signature contains store phone');
testContains(htmlSig, 'john.smith@company.com', 'HTML signature contains company email');
testContains(htmlSig, '<div id="ms-outlook-mobile-signature">', 'HTML signature has Outlook wrapper');
testContains(htmlSig, '<a href="https://www.citizenwatch.com', 'HTML signature contains brand links');
console.log('');

// Test 3: Signature in plain text template
console.log('TEST GROUP 3: Plain Text Template with Signature');
console.log('---');
const plainTemplate = `Welcome to our store!

${getEmployeeSignature('text')}`;
testContains(plainTemplate, 'John Smith', 'Plain text template contains signature name');
testContains(plainTemplate, 'Sales Manager', 'Plain text template contains signature title');
assert(plainTemplate.endsWith('Please consider the environment before printing this e-mail'), 'Signature appears at end of plain text template');
console.log('');

// Test 4: EML file generation with signatures
console.log('TEST GROUP 4: EML File Generation with Signatures');
console.log('---');
const emlContent = createGenericEMLFile(
    'Test Subject',
    `Welcome to our store!\n\n${getEmployeeSignature('text')}`,
    []
);
testContains(emlContent, 'Subject: Test Subject', 'EML contains subject');
testContains(emlContent, 'MIME-Version: 1.0', 'EML has MIME headers');
testContains(emlContent, 'John Smith', 'EML contains signature name');
testContains(emlContent, 'Downtown Store', 'EML contains store info from signature');
testContains(emlContent, 'Content-Type: text/plain', 'EML has text/plain content type');
assert(emlContent.includes('X-Unsent: 1'), 'EML marked as unsent draft');
console.log('');

// Test 5: Signature data consistency
console.log('TEST GROUP 5: Signature Data Consistency');
console.log('---');
const sig1 = getEmployeeSignature('text');
const sig2 = getEmployeeSignature('text');
assertEquals(sig1, sig2, 'Multiple calls to getEmployeeSignature return same result');

const htmlSig1 = getEmployeeSignature('html');
const htmlSig2 = getEmployeeSignature('html');
assertEquals(htmlSig1, htmlSig2, 'Multiple HTML signature calls return same result');
console.log('');

// Test 6: Default values when userProfile is empty
console.log('TEST GROUP 6: Default Values Handling');
console.log('---');
userProfile = null;
const defaultSig = getEmployeeSignature('text');
testContains(defaultSig, 'Employee Name', 'Uses default employee name when profile is null');
testContains(defaultSig, 'Sales Associate', 'Uses default job title when profile is null');
testContains(defaultSig, 'Citizen Company Store', 'Uses default store name when profile is null');

// Restore user profile
userProfile = mockUserProfile;
const restoredSig = getEmployeeSignature('text');
testContains(restoredSig, 'John Smith', 'Signature restored after profile is reset');
console.log('');

// Test 7: Address parsing in signature
console.log('TEST GROUP 7: Address Formatting in Signature');
console.log('---');
const addressSig = getEmployeeSignature('text');
testContains(addressSig, '123 Main Street', 'First address line included');
testContains(addressSig, 'Downtown, USA 12345', 'Second address line included');
const htmlAddressSig = getEmployeeSignature('html');
testContains(htmlAddressSig, '123 Main Street', 'HTML signature includes first address line');
testContains(htmlAddressSig, 'Downtown, USA 12345', 'HTML signature includes second address line');
console.log('');

// Test 8: Email template integration
console.log('TEST GROUP 8: Complete Template with EML Export');
console.log('---');
const completeTemplate = `Subject: New Customer Welcome

Dear Customer,

Thank you for visiting our store today. We look forward to serving you!

Best regards,
${getEmployeeSignature('text')}`;

const completeEML = createGenericEMLFile('New Customer Welcome', completeTemplate, []);
testContains(completeEML, 'New Customer Welcome', 'EML subject preserved');
testContains(completeEML, 'Thank you for visiting', 'EML body content preserved');
testContains(completeEML, 'John Smith', 'EML contains signature');
testContains(completeEML, 'John Smith │ Sales Manager', 'EML contains formatted signature header');
console.log('');

// Test 9: HTML special characters in signature
console.log('TEST GROUP 9: HTML Special Character Handling');
console.log('---');
const testProfile = {
    employeeName: 'John "Jack" Smith',
    jobTitle: 'Sales & Marketing Manager',
    storeName: 'Downtown Store (Main)',
    storePhone: '(555) 123-4567',
    storeAddress: '123 Main Street\nDowntown, USA 12345',
    storeEmail: 'downtown@citizenwatchgroup.com',
    companyEmail: 'john@company.com'
};
userProfile = testProfile;
const specialCharSig = getEmployeeSignature('html');
testContains(specialCharSig, 'John "Jack" Smith', 'HTML signature preserves quotes in name');
testContains(specialCharSig, 'Sales & Marketing Manager', 'HTML signature preserves ampersand in title');
userProfile = mockUserProfile;
console.log('');

// Test 10: EML compliance
console.log('TEST GROUP 10: EML Format Compliance');
console.log('---');
const complianceEML = createGenericEMLFile('Compliance Test', `Test body\n\n${getEmployeeSignature('text')}`, []);
assert(complianceEML.includes('\r\n'), 'EML uses CRLF line endings');
assert(complianceEML.includes('Message-ID:'), 'EML has Message-ID header');
assert(complianceEML.includes('MIME-Version: 1.0'), 'EML declares MIME version');
assert(complianceEML.includes('boundary='), 'EML defines MIME boundary');
console.log('');

// ===== TEST SUMMARY =====
console.log('\n========================================');
console.log('TEST SUMMARY');
console.log('========================================');
console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed} ✓`);
console.log(`Failed: ${testsFailed} ${testsFailed > 0 ? '❌' : ''}`);
console.log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

if (testsFailed === 0) {
    console.log('\n✓ All tests passed! Template signatures are working correctly after EML creation.');
    process.exit(0);
} else {
    console.log(`\n❌ ${testsFailed} test(s) failed. Please review the output above.`);
    process.exit(1);
}

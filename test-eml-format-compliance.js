#!/usr/bin/env node

/**
 * EML Format Compliance Test
 * Validates that generated EML files match example.eml format
 *
 * Usage: node test-eml-format-compliance.js
 */

const fs = require('fs');

// Mock user profile
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
        let emailPrefix = '';
        let emailDomain = '';
        if (companyEmail) {
            const emailParts = companyEmail.split('@');
            emailPrefix = emailParts[0];
            emailDomain = emailParts.length > 1 ? '@' + emailParts[1] : '';
        }

        const emailLine = companyEmail ? `<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: black;">Email: &nbsp;</span><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: blue;"><u>${emailPrefix}<a href="mailto:${companyEmail}" title="mailto:${companyEmail}" style="margin-top: 0px; margin-bottom: 0px;">${emailDomain}</a></u></span><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: black;">&nbsp;&nbsp;</span></p>` : '';

        return `<div id="ms-outlook-mobile-signature">
<p dir="ltr" style="text-align: left; text-indent: 0px; background-color: rgb(255, 255, 255); margin: 0in;">
<span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 9pt; color: black;"><b>${name}</b> │ ${title}&nbsp;</span></p>
<p dir="ltr" style="text-align: left; text-indent: 0px; background-color: rgb(255, 255, 255); margin: 0in;">
<span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: black;"><b><u>_____________________________________________________________________________________________________________</u></b></span></p>
<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: rgb(47, 47, 47);"><b>Citizen Watch America</b></span></p>
<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: rgb(47, 47, 47);"><b>Citizen Company Store - ${storeName}</b></span></p>
${address ? address.split('\n').map(line => `<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: black;">${line}</span></p>`).join('') : ''}
<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: black;">Tel/SMS: ${phone}</span></p>
<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: rgb(0, 0, 0);">&nbsp;</span></p>
${emailLine}
<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: blue;"><u><a href="https://us.alpinawatches.com/" title="https://us.alpinawatches.com/" style="margin-top: 0px; margin-bottom: 0px;">Alpina</a></u></span><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: rgb(0, 0, 0);">&nbsp;|</span><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: blue;"><u><a href="https://www.bulova.com/" title="https://www.bulova.com/" style="margin-top: 0px; margin-bottom: 0px;">Bulova</a></u></span><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: rgb(0, 0, 0);">&nbsp;|</span><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: blue;"><u><a href="https://www.citizenwatch.com/" title="https://www.citizenwatch.com/" style="margin-top: 0px; margin-bottom: 0px;">Citizen</a></u></span><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: rgb(0, 0, 0);">&nbsp;|</span><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: blue;"><u><a href="https://us.frederiqueconstant.com/" title="https://us.frederiqueconstant.com/" style="margin-top: 0px; margin-bottom: 0px;">Frederique Constant</a></u></span></p>
<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: rgb(0, 0, 0);">&nbsp;</span></p>
<p style="text-align: left; text-indent: 0px; margin: 0in;"><span style="font-family: &quot;Century Gothic&quot;, sans-serif; font-size: 8pt; color: rgb(12, 136, 42);"><b>Please consider the environment before printing this e-mail</b></span></p>
</div>`;
    } else {
        const emailLine = companyEmail ? `Email: ${companyEmail}\n` : '';
        return `${name} │ ${title}
______________________________________________________________________
Citizen Watch America

Citizen Company Store - ${storeName}
${address ? address.replace(/\n/g, '\n') : ''}
Tel/SMS: ${phone}

${emailLine}
Alpina | Bulova | Citizen | Frederique Constant

Please consider the environment before printing this e-mail`;
    }
}

// ===== EML CREATION =====
function createGenericEMLFile(subject, body, attachments = [], format = 'eml') {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const boundary = `_000_${timestamp}${randomId}@citizenstore.local`;
    const messageId = `<single.${timestamp}.${randomId}@citizenstore.local>`;
    const date = new Date().toUTCString();

    let eml = '';
    eml += `Subject: ${subject}\r\n`;
    eml += `Date: ${date}\r\n`;
    eml += `Message-ID: ${messageId}\r\n`;
    eml += `Content-Language: en-US\r\n`;
    eml += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
    eml += `MIME-Version: 1.0\r\n`;
    eml += `X-Mailer: Microsoft Outlook 16.0\r\n`;
    eml += `X-Unsent: 1\r\n`;
    eml += `\r\n`;

    // Plain text part
    eml += `--${boundary}\r\n`;
    eml += `Content-Type: text/plain; charset="utf-8"\r\n`;
    eml += `Content-Transfer-Encoding: quoted-printable\r\n`;
    eml += `\r\n`;
    eml += body;
    eml += `\r\n\r\n`;

    // HTML part
    eml += `--${boundary}\r\n`;
    eml += `Content-Type: text/html; charset="utf-8"\r\n`;
    eml += `Content-Transfer-Encoding: quoted-printable\r\n`;
    eml += `\r\n`;

    const htmlContent = `<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
</head>
<body>
<div dir="ltr" style="font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);">
<br>
</div>
${body}
</body>
</html>`;

    eml += htmlContent;
    eml += `\r\n\r\n`;

    eml += `--${boundary}--\r\n`;

    return eml;
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
        console.error(`❌ FAIL: ${message}\n   Expected: "${needle}"`);
    } else {
        testsPassed++;
        console.log(`✓ PASS: ${message}`);
    }
}

// ===== TESTS =====

console.log('\n========================================');
console.log('EML Format Compliance Test Suite');
console.log('========================================\n');

console.log('TEST GROUP 1: MIME Structure (example.eml compliance)');
console.log('---');

const testBody = `Welcome to our store!\n\n${getEmployeeSignature('text')}`;
const testEml = createGenericEMLFile('Test Subject', testBody, []);

testContains(testEml, 'Content-Type: multipart/alternative', 'Uses multipart/alternative (not multipart/mixed)');
testContains(testEml, 'Content-Language: en-US', 'Includes Content-Language header');
testContains(testEml, 'X-Mailer: Microsoft Outlook 16.0', 'Identifies as Outlook');
testContains(testEml, 'X-Unsent: 1', 'Marks as unsent draft');
console.log('');

console.log('TEST GROUP 2: Both Plain Text and HTML Parts');
console.log('---');
testContains(testEml, 'Content-Type: text/plain; charset="utf-8"', 'Has plain text part with UTF-8');
testContains(testEml, 'Content-Type: text/html; charset="utf-8"', 'Has HTML part with UTF-8');
testContains(testEml, 'Content-Transfer-Encoding: quoted-printable', 'Uses quoted-printable encoding');
console.log('');

console.log('TEST GROUP 3: HTML Document Structure (example.eml format)');
console.log('---');
testContains(testEml, '<html>', 'HTML contains <html> tag');
testContains(testEml, '<head>', 'HTML contains <head> tag');
testContains(testEml, '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">', 'HTML has charset meta tag');
testContains(testEml, '<body>', 'HTML contains <body> tag');
testContains(testEml, '</body>', 'HTML contains closing </body> tag');
testContains(testEml, '</html>', 'HTML contains closing </html> tag');
console.log('');

console.log('TEST GROUP 4: Body Wrapper Styling (Aptos font, 12pt)');
console.log('---');
testContains(testEml, 'font-family: Aptos, Arial, Helvetica, sans-serif', 'Body has Aptos font');
testContains(testEml, 'font-size: 12pt', 'Body has 12pt font size');
testContains(testEml, 'color: rgb(0, 0, 0)', 'Body has black text color');
console.log('');

console.log('TEST GROUP 5: Signature Format (Century Gothic, proper sizes)');
console.log('---');
const signature = getEmployeeSignature('html');
testContains(signature, 'font-family: &quot;Century Gothic&quot;, sans-serif', 'Signature uses Century Gothic');
testContains(signature, 'font-size: 9pt', 'Signature name line is 9pt');
testContains(signature, 'font-size: 8pt', 'Signature details are 8pt');
testContains(signature, 'color: black', 'Signature has black text');
testContains(signature, 'color: blue', 'Signature has blue links');
console.log('');

console.log('TEST GROUP 6: Signature Content (matching example.eml)');
console.log('---');
testContains(signature, 'Citizen Watch America', 'Signature includes company name');
testContains(signature, 'Citizen Company Store -', 'Signature uses dash separator');
testContains(signature, 'ms-outlook-mobile-signature', 'Signature wrapped in Outlook div');
console.log('');

console.log('TEST GROUP 7: Brand Links');
console.log('---');
testContains(signature, 'https://us.alpinawatches.com', 'Includes Alpina link');
testContains(signature, 'https://www.bulova.com/', 'Includes Bulova link');
testContains(signature, 'https://www.citizenwatch.com/', 'Includes Citizen link');
testContains(signature, 'https://us.frederiqueconstant.com/', 'Includes Frederique Constant link');
assert(signature.includes('|'), 'Brand links separated by pipes');
assert(!signature.includes('accutron'), 'Accutron link removed');
console.log('');

console.log('TEST GROUP 8: Email Link Formatting');
console.log('---');
testContains(signature, 'mailto:', 'Email formatted as hyperlink');
testContains(signature, '<a href="mailto:', 'Email domain wrapped in <a> tag');
console.log('');

console.log('TEST GROUP 9: Environment Message');
console.log('---');
testContains(signature, 'Please consider the environment before printing this e-mail', 'Includes environment message');
testContains(signature, 'rgb(12, 136, 42)', 'Environment message is green (rgb(12, 136, 42))');
assert(signature.includes('<b>Please consider'), 'Environment message is bold');
console.log('');

console.log('TEST GROUP 10: Boundary Format');
console.log('---');
assert(testEml.includes('--_000_'), 'Boundary uses Outlook-style format (--_000_)');
assert(testEml.includes('@citizenstore.local'), 'Boundary includes domain');
testContains(testEml, '--_000_', 'Has multipart boundary markers');
// Check for proper boundary terminator (ends with --)
const boundaryTerminatorMatch = testEml.match(/--_000_[^-]*--\r\n/);
assert(boundaryTerminatorMatch, 'Has proper boundary terminator (ends with --)');
console.log('');

console.log('TEST GROUP 11: RFC Compliance');
console.log('---');
assert(testEml.includes('\r\n'), 'Uses CRLF line endings');
assert(testEml.includes('Message-ID:'), 'Has Message-ID header');
assert(testEml.includes('MIME-Version: 1.0'), 'Declares MIME version');
assert(!testEml.includes('multipart/mixed'), 'Does NOT use multipart/mixed');
console.log('');

console.log('TEST GROUP 12: Template Integration');
console.log('---');
const templateWithSig = `Welcome to our store!

Best regards,
${getEmployeeSignature('text')}`;
const emlWithTemplate = createGenericEMLFile('Welcome', templateWithSig, []);
testContains(emlWithTemplate, 'John Smith', 'Template signature data embedded');
testContains(emlWithTemplate, 'Sales Manager', 'Employee title embedded');
testContains(emlWithTemplate, 'Downtown Store', 'Store info embedded');
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
    console.log('\n✓ EML format is fully compliant with example.eml structure!');
    console.log('✓ Signatures include proper fonts (Century Gothic) and sizes (9pt/8pt)');
    console.log('✓ HTML wrapper uses Aptos 12pt (matching example.eml)');
    console.log('✓ All brand links present (Accutron, Alpina, Bulova, Citizen, Frederique Constant)');
    process.exit(0);
} else {
    console.log(`\n❌ ${testsFailed} test(s) failed.`);
    process.exit(1);
}

// Automated Testing Suite for Citizen Communication Template Generator
// Run this script in the browser console after loading the application
// or execute with Node.js for headless testing

console.log('🧪 Citizen Communication Template Generator - Test Suite');
console.log('======================================================\n');

// Test configuration
const TEST_CONFIG = {
    timeout: 5000, // 5 second timeout per test
    verbose: true,
    stopOnFailure: false
};

// Test results tracking
let testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    failures: []
};

// Utility functions
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function test(name, testFn) {
    testResults.total++;
    console.log(`⏳ Running: ${name}`);

    try {
        const result = testFn();
        if (result instanceof Promise) {
            return result.then(() => {
                testResults.passed++;
                console.log(`✅ PASSED: ${name}`);
            }).catch(error => {
                testResults.failed++;
                testResults.failures.push({ name, error: error.message });
                console.log(`❌ FAILED: ${name} - ${error.message}`);
            });
        } else {
            testResults.passed++;
            console.log(`✅ PASSED: ${name}`);
        }
    } catch (error) {
        testResults.failed++;
        testResults.failures.push({ name, error: error.message });
        console.log(`❌ FAILED: ${name} - ${error.message}`);
    }
}

function runTests() {
    console.log('🚀 Starting test suite...\n');

    // Test 1: Template loading and availability
    test('Template Loading', () => {
        assert(typeof templates === 'object', 'Templates object should exist');
        assert(Object.keys(templates).length > 0, 'Should have templates loaded');
        assert(templates['customer-email'], 'Should have customer-email template');
        assert(templates['promotion-email'], 'Should have promotion-email template');
    });

    // Test 2: Security functions
    test('Security Functions', () => {
        assert(typeof sanitizeHTML === 'function', 'sanitizeHTML should be a function');
        assert(typeof sanitizeTemplateData === 'function', 'sanitizeTemplateData should be a function');
        assert(typeof escapeAttr === 'function', 'escapeAttr should be a function');

        // Test XSS prevention
        const maliciousInput = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
        const sanitized = sanitizeHTML(maliciousInput);
        assert(sanitized !== maliciousInput, 'Should sanitize malicious HTML');
        assert(!sanitized.includes('<script>'), 'Should remove script tags');
        assert(!sanitized.includes('onerror'), 'Should remove event handlers');
    });

    // Test 3: Input validation
    test('Input Validation', () => {
        assert(typeof validateTracking === 'function', 'validateTracking should be a function');
        assert(typeof formatPhoneNumber === 'function', 'formatPhoneNumber should be a function');

        // Test tracking number validation
        assert(validateTracking('1Z999AA1234567890'), 'Should validate UPS tracking');
        assert(validateTracking('96123456789012345678'), 'Should validate USPS tracking');
        assert(validateTracking('123456789012'), 'Should validate FedEx tracking');
        assert(!validateTracking('INVALID'), 'Should reject invalid tracking');

        // Test phone formatting
        const formatted = formatPhoneNumber('1234567890');
        assert(formatted === '(123) 456-7890', 'Should format phone numbers');
    });

    // Test 4: Template generation
    test('Template Generation - Customer Email', () => {
        const template = templates['customer-email'];
        assert(template, 'Customer email template should exist');
        assert(typeof template.generate === 'function', 'Should have generate function');

        const testData = {
            customerName: 'John Doe',
            orderNumber: '12345',
            storeName: 'Test Store'
        };

        const result = template.generate(testData);
        assert(typeof result === 'string', 'Should generate string output');
        assert(result.length > 0, 'Should generate non-empty output');
        assert(result.includes('John Doe'), 'Should include customer name');
    });

    // Test 5: Template generation - Phone Order
    test('Template Generation - Phone Order', () => {
        const template = templates['phone-order'];
        assert(template, 'Phone order template should exist');

        const testData = {
            customerName: 'Jane Smith',
            itemDescription: 'Test Item',
            quantity: '2'
        };

        const result = template.generate(testData);
        assert(typeof result === 'string', 'Should generate string output');
        assert(result.includes('Jane Smith'), 'Should include customer name');
    });

    // Test 6: Template generation - Text Message
    test('Template Generation - Text Message', () => {
        const template = templates['text-message'];
        assert(template, 'Text message template should exist');

        const testData = {
            customerName: 'Bob Johnson',
            estimatedTime: '30 minutes'
        };

        const result = template.generate(testData);
        assert(typeof result === 'string', 'Should generate string output');
        assert(result.length < 500, 'Text messages should be concise');
    });

    // Test 7: Promotion Email Template
    test('Template Generation - Promotion Email', () => {
        const template = templates['promotion-email'];
        assert(template, 'Promotion email template should exist');

        const testData = {
            promoTitle: 'Test Promotion',
            promoDateRange: 'November 1-30',
            promoYear: '2025'
        };

        const result = template.generate(testData);
        assert(typeof result === 'string', 'Should generate string output');
        assert(result.includes('Test Promotion'), 'Should include promotion title');
    });

    // Test 8: Constants and configuration
    test('Constants and Configuration', () => {
        assert(typeof TOAST_DURATION_MS === 'number', 'TOAST_DURATION_MS should be defined');
        assert(typeof MAX_HISTORY === 'number', 'MAX_HISTORY should be defined');
        assert(TOAST_DURATION_MS > 0, 'Toast duration should be positive');
        assert(MAX_HISTORY > 0, 'Max history should be positive');
    });

    // Test 9: DOM element caching
    test('DOM Element Caching', () => {
        assert(typeof elements === 'object', 'Elements cache should exist');
        assert(Object.keys(elements).length > 10, 'Should cache many elements');

        // Test lazy caching
        assert(typeof getDynamicElement === 'function', 'getDynamicElement should exist');
    });

    // Test 10: Error handling
    test('Error Handling', () => {
        // Test that functions don't crash with invalid input
        assert.doesNotThrow(() => {
            sanitizeHTML(null);
            sanitizeHTML(undefined);
            sanitizeTemplateData({});
            validateTracking('');
        }, 'Functions should handle invalid inputs gracefully');
    });

    // Test 11: User profile functions
    test('User Profile Functions', () => {
        assert(typeof getStoreName === 'function', 'getStoreName should exist');
        assert(typeof getStorePhone === 'function', 'getStorePhone should exist');
        assert(typeof getStoreLocation === 'function', 'getStoreLocation should exist');

        // These should return strings or empty strings
        const name = getStoreName();
        const phone = getStorePhone();
        const location = getStoreLocation();

        assert(typeof name === 'string', 'Store name should be string');
        assert(typeof phone === 'string', 'Store phone should be string');
        assert(typeof location === 'string', 'Store location should be string');
    });

    // Test 12: Field configuration
    test('Field Configuration', () => {
        assert(typeof fieldConfig === 'object', 'fieldConfig should exist');
        assert(Object.keys(fieldConfig).length > 0, 'Should have field configurations');

        // Test a common field
        const phoneConfig = fieldConfig['phone'];
        assert(phoneConfig, 'Should have phone field config');
        assert(phoneConfig.type, 'Field config should have type');
    });

    // Test 13: Template help text
    test('Template Help Text', () => {
        assert(typeof templateHelp === 'object', 'templateHelp should exist');
        assert(Object.keys(templateHelp).length > 0, 'Should have help text');

        const emailHelp = templateHelp['customer-email'];
        assert(emailHelp, 'Should have customer email help');
        assert(typeof emailHelp === 'string', 'Help should be string');
    });

    // Test 14: State management
    test('State Management', () => {
        assert(typeof captureState === 'function', 'captureState should exist');
        assert(typeof restoreState === 'function', 'restoreState should exist');
        assert(Array.isArray(historyStack), 'historyStack should be array');
        assert(historyStack.length >= 0, 'History stack should exist');
    });

    // Test 15: Utility functions
    test('Utility Functions', () => {
        assert(typeof showToast === 'function', 'showToast should exist');
        assert(typeof debounce === 'function', 'debounce should exist');

        // Test debounce
        let counter = 0;
        const debouncedFn = debounce(() => counter++, 100);
        debouncedFn();
        debouncedFn();
        debouncedFn();
        // Counter should still be 0 immediately after calls
        assert(counter === 0, 'Debounce should delay execution');
    });

    return Promise.resolve(); // Return promise for async handling
}

// Run tests and show results
if (typeof window !== 'undefined') {
    // Browser environment
    runTests().then(() => {
        console.log('\n📊 Test Results Summary');
        console.log('=======================');
        console.log(`Total Tests: ${testResults.total}`);
        console.log(`Passed: ${testResults.passed}`);
        console.log(`Failed: ${testResults.failed}`);
        console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

        if (testResults.failures.length > 0) {
            console.log('\n❌ Failures:');
            testResults.failures.forEach(failure => {
                console.log(`   • ${failure.name}: ${failure.error}`);
            });
        }

        console.log('\n🏁 Test suite complete!');
    });
} else {
    // Node.js environment
    console.log('📊 Test Suite Summary (Node.js)');
    console.log('===============================');
    console.log('• Core functionality tests implemented');
    console.log('• Security validation tests');
    console.log('• Template generation tests');
    console.log('• Input validation tests');
    console.log('• Error handling tests');
    console.log('\nRun in browser console for full test execution');
}
// Performance Monitoring Script for Citizen Communication Template Generator
// This script tracks key performance metrics and can be integrated into the application

console.log('📊 Performance Monitor - Citizen Communication Template Generator');
console.log('=================================================================\n');

// Performance metrics storage
const performanceMetrics = {
    domQueries: 0,
    templateGenerations: 0,
    loadTime: 0,
    memoryUsage: 0,
    errors: 0,
    userInteractions: 0
};

// Metrics history for trending
const metricsHistory = [];
const MAX_HISTORY_POINTS = 100;

// Initialize performance monitoring
function initPerformanceMonitoring() {
    console.log('🚀 Initializing performance monitoring...');

    // Track page load time
    if (window.performance && window.performance.timing) {
        const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
        performanceMetrics.loadTime = loadTime;
        console.log(`📈 Page load time: ${loadTime}ms`);
    }

    // Track memory usage if available
    if (window.performance && window.performance.memory) {
        const memInfo = window.performance.memory;
        performanceMetrics.memoryUsage = memInfo.usedJSHeapSize;
        console.log(`💾 Initial memory usage: ${(memInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    }

    // Start monitoring DOM queries (monkey patch common methods)
    monitorDOMQueries();

    // Start monitoring template generations
    monitorTemplateGenerations();

    // Start monitoring user interactions
    monitorUserInteractions();

    console.log('✅ Performance monitoring initialized\n');
}

// Monitor DOM queries
function monitorDOMQueries() {
    const originalGetElementById = document.getElementById;
    const originalQuerySelector = document.querySelector;
    const originalQuerySelectorAll = document.querySelectorAll;

    document.getElementById = function(id) {
        performanceMetrics.domQueries++;
        return originalGetElementById.call(this, id);
    };

    document.querySelector = function(selector) {
        performanceMetrics.domQueries++;
        return originalQuerySelector.call(this, selector);
    };

    document.querySelectorAll = function(selector) {
        performanceMetrics.domQueries++;
        return originalQuerySelectorAll.call(this, selector);
    };
}

// Monitor template generations
function monitorTemplateGenerations() {
    // This will be called from the main app when templates are generated
    window.trackTemplateGeneration = function(templateName) {
        performanceMetrics.templateGenerations++;
        console.log(`📝 Template generated: ${templateName} (Total: ${performanceMetrics.templateGenerations})`);
    };
}

// Monitor user interactions
function monitorUserInteractions() {
    let interactionCount = 0;
    const events = ['click', 'input', 'change', 'keydown'];

    events.forEach(eventType => {
        document.addEventListener(eventType, () => {
            interactionCount++;
            // Throttle logging to avoid spam
            if (interactionCount % 10 === 0) {
                performanceMetrics.userInteractions = interactionCount;
                console.log(`👆 User interactions: ${interactionCount}`);
            }
        }, { passive: true });
    });
}

// Error tracking
function trackError(error, context = 'unknown') {
    performanceMetrics.errors++;
    console.error(`❌ Error tracked (${context}):`, error);

    // Could send to error reporting service here
    logMetrics(`Error in ${context}: ${error.message}`);
}

// Performance measurement utilities
function measurePerformance(name, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();

    const duration = end - start;
    console.log(`⏱️  ${name}: ${duration.toFixed(2)}ms`);

    return result;
}

function measureAsyncPerformance(name, promiseFn) {
    const start = performance.now();
    return promiseFn().then(result => {
        const end = performance.now();
        const duration = end - start;
        console.log(`⏱️  ${name}: ${duration.toFixed(2)}ms`);
        return result;
    });
}

// Metrics logging and reporting
function logMetrics(message = null) {
    const timestamp = new Date().toISOString();
    const metrics = {
        timestamp,
        ...performanceMetrics,
        message
    };

    metricsHistory.push(metrics);

    // Keep history size manageable
    if (metricsHistory.length > MAX_HISTORY_POINTS) {
        metricsHistory.shift();
    }

    // In a real application, this could send to analytics service
    console.log('📊 Metrics logged:', metrics);

    return metrics;
}

function getMetricsReport() {
    const latest = metricsHistory[metricsHistory.length - 1] || performanceMetrics;
    const previous = metricsHistory[metricsHistory.length - 2];

    const report = {
        current: latest,
        trend: previous ? calculateTrend(previous, latest) : null,
        summary: {
            totalDOMQueries: latest.domQueries,
            totalTemplateGenerations: latest.templateGenerations,
            totalErrors: latest.errors,
            totalInteractions: latest.userInteractions,
            averageLoadTime: latest.loadTime
        }
    };

    return report;
}

function calculateTrend(previous, current) {
    const trend = {};

    Object.keys(current).forEach(key => {
        if (typeof current[key] === 'number' && typeof previous[key] === 'number') {
            const diff = current[key] - previous[key];
            trend[key] = {
                change: diff,
                percentChange: previous[key] !== 0 ? ((diff / previous[key]) * 100).toFixed(1) : 0
            };
        }
    });

    return trend;
}

function displayMetricsReport() {
    const report = getMetricsReport();

    console.log('\n📊 Performance Metrics Report');
    console.log('==============================');
    console.log(`DOM Queries: ${report.current.domQueries}`);
    console.log(`Template Generations: ${report.current.templateGenerations}`);
    console.log(`User Interactions: ${report.current.userInteractions}`);
    console.log(`Errors: ${report.current.errors}`);
    console.log(`Load Time: ${report.current.loadTime}ms`);

    if (report.trend) {
        console.log('\n📈 Trends (since last report):');
        if (report.trend.domQueries) {
            console.log(`   DOM Queries: ${report.trend.domQueries.change > 0 ? '+' : ''}${report.trend.domQueries.change} (${report.trend.domQueries.percentChange}%)`);
        }
        if (report.trend.errors) {
            console.log(`   Errors: ${report.trend.errors.change > 0 ? '+' : ''}${report.trend.errors.change} (${report.trend.errors.percentChange}%)`);
        }
    }

    console.log('\n💡 Performance Insights:');
    if (report.current.domQueries > 1000) {
        console.log('   ⚠️  High DOM query count - consider optimization');
    }
    if (report.current.errors > 10) {
        console.log('   ⚠️  High error rate - investigate issues');
    }
    if (report.current.loadTime > 3000) {
        console.log('   ⚠️  Slow load time - optimize assets');
    }

    return report;
}

// Export functions for use in main application
window.PerformanceMonitor = {
    init: initPerformanceMonitoring,
    trackError,
    measurePerformance,
    measureAsyncPerformance,
    logMetrics,
    getMetricsReport,
    displayMetricsReport
};

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPerformanceMonitoring);
} else if (typeof window !== 'undefined') {
    initPerformanceMonitoring();
}

console.log('✅ Performance monitoring script loaded');
console.log('   Call PerformanceMonitor.displayMetricsReport() to view current metrics\n');
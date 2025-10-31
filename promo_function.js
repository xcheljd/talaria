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
function test() {}

(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const s of a.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&n(s)}).observe(document,{childList:!0,subtree:!0});function o(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(r){if(r.ep)return;r.ep=!0;const a=o(r);fetch(r.href,a)}})();let x=null;const nt="CitizenTemplates",rt=2,z="promotionPDFs",R="bulkEmailRecipients";function Ro(){return new Promise(t=>{const e=window.indexedDB||window.webkitIndexedDB||window.mozIndexedDB;if(!e){console.warn("IndexedDB not supported, PDFs will not persist across refresh"),t(!1);return}const o=e.open(nt,rt);o.onerror=()=>{console.warn("IndexedDB initialization failed:",o.error),t(!1)},o.onsuccess=()=>{x=o.result,console.log("IndexedDB initialized successfully"),t(!0)},o.onupgradeneeded=n=>{const r=n.target.result;r.objectStoreNames.contains(z)||r.createObjectStore(z,{keyPath:"id"}),r.objectStoreNames.contains(R)||r.createObjectStore(R,{keyPath:"id"})}})}function ce(t){return new Promise((e,o)=>{if(!x){o(new Error("IndexedDB not initialized"));return}const a=x.transaction([z],"readwrite").objectStore(z).put(t);a.onerror=()=>o(a.error),a.onsuccess=()=>e(t.id)})}function at(t){return new Promise((e,o)=>{if(!x){e(null);return}const a=x.transaction([z],"readonly").objectStore(z).get(t);a.onerror=()=>o(a.error),a.onsuccess=()=>e(a.result||null)})}function je(t){return new Promise((e,o)=>{if(!x){e();return}const a=x.transaction([z],"readwrite").objectStore(z).delete(t);a.onerror=()=>o(a.error),a.onsuccess=()=>e()})}function it(t){return new Promise((e,o)=>{if(!x){o(new Error("IndexedDB not initialized"));return}const a=x.transaction([R],"readwrite").objectStore(R).put({id:"bulk-email-recipients",data:t,savedAt:new Date().toISOString()});a.onerror=()=>o(a.error),a.onsuccess=()=>e()})}function qo(){return new Promise((t,e)=>{if(!x){t("");return}const r=x.transaction([R],"readonly").objectStore(R).get("bulk-email-recipients");r.onerror=()=>e(r.error),r.onsuccess=()=>{const a=r.result;t(a&&a.data?a.data:"")}})}function st(){return new Promise((t,e)=>{if(!x){t();return}const r=x.transaction([R],"readwrite").objectStore(R).clear();r.onerror=()=>e(r.error),r.onsuccess=()=>t()})}const y={currentCategory:"all",currentTemplate:null,searchActive:!1,userProfile:null},W={companyName:"Citizen Watch America",storeName:"Citizen Company Store",defaultLocation:"the South Premium Outlets",defaultPhone:"702-357-8990"},ye=[{name:"Alpina",url:"https://us.alpinawatches.com/"},{name:"Bulova",url:"https://www.bulova.com/"},{name:"Citizen",url:"https://www.citizenwatch.com/"},{name:"Frederique Constant",url:"https://us.frederiqueconstant.com/"}],lt=["manager","director","supervisor","assistant manager"],$={fontFamily:"'Century Gothic', Aptos, Arial, sans-serif",colors:{primary:"#000000",secondary:"#2f2f2f",link:"#0000ee",environmental:"#0c8822"},fontSize:{name:"9pt",details:"8pt"}},be="Please consider the environment before printing this e-mail";function ct(){const t=y.userProfile||{};return{name:t.employeeName||"Employee Name",title:t.jobTitle||"Sales Associate",location:t.storeLocation||W.defaultLocation,address:t.storeAddress||"",phone:t.storePhone||W.defaultPhone,jobTitle:(t.jobTitle||"").toLowerCase(),companyEmail:t.companyEmail||"",storeEmail:t.storeEmail||""}}function dt(t,e,o){return lt.some(r=>t.includes(r))&&e?e:o||""}function ve(t,e){return e==="html"?`<p style="margin: 0; padding: 0;">
        <strong style="font-size: ${$.fontSize.name};">${P(t.name)}</strong> │ ${P(t.title)}
    </p>`:`${t.name} │ ${t.title}`}function we(t){const e="______________________________________________________________________";return t==="html"?`<p style="margin: 0; padding: 0; font-size: ${$.fontSize.details}; color: ${$.colors.secondary};">
        <strong>${e}</strong>
    </p>`:e}function $e(t,e){return e==="html"?`<p style="margin: 0; padding: 0; font-size: ${$.fontSize.details}; color: ${$.colors.secondary};">
        <strong>${W.companyName}</strong>
    </p>
    <p style="margin: 0; padding: 0; font-size: ${$.fontSize.details}; color: ${$.colors.secondary};">
        <strong>${W.storeName} - ${P(t.location)}</strong>
    </p>`:`${W.companyName}
${W.storeName} - ${t.location}`}function ut(t,e){if(!t.address||!t.address.trim())return"";const o=P(t.address);return e==="html"?`<p style="margin: 0; padding: 0; font-size: ${$.fontSize.details}; color: ${$.colors.secondary};">
        ${o.replace(/\n/g,"<br>")}
    </p>`:t.address}function Ee(t,e){return e==="html"?`<p style="margin: 0; padding: 0; font-size: ${$.fontSize.details}; color: ${$.colors.secondary};">
        Tel/SMS: ${P(t.phone)}
    </p>`:`Tel/SMS: ${t.phone}`}function mt(t,e){return t?e==="html"?`<p style="margin: 10px 0 0 0; padding: 0; font-size: ${$.fontSize.details}; color: ${$.colors.secondary};">
        Email: <a href="mailto:${P(t)}" style="color: ${$.colors.link}; text-decoration: underline; font-size: ${$.fontSize.details};">${P(t)}</a>
    </p>`:`Email: ${t}`:""}function Se(t){if(t==="html"){const e=ye.map(o=>`<a href="${o.url}" style="color: ${$.colors.link}; text-decoration: underline; font-size: ${$.fontSize.details};">${o.name}</a>`).join(` <span style="color: ${$.colors.secondary};">|</span> `);return`<p style="margin: 4px 0; padding: 0; font-size: ${$.fontSize.details};">
        ${e}
    </p>`}return ye.map(e=>e.name).join(" | ")}function Ie(t){return t==="html"?`<p style="margin: 4px 0; padding: 0; font-size: ${$.fontSize.details}; color: ${$.colors.environmental};">
        <strong>${be}</strong>
    </p>`:be}function pt(t="text"){const e=ct(),o=dt(e.jobTitle,e.companyEmail,e.storeEmail);if(t==="html")return`<div style="font-family: ${$.fontFamily}; font-size: ${$.fontSize.name}; color: ${$.colors.primary};">
    ${ve(e,t)}
    ${we(t)}
    ${$e(e,t)}
    ${ut(e,t)}
    ${Ee(e,t)}
    ${mt(o,t)}
    ${Se(t)}

    ${Ie(t)}
</div>`;const n=e.address?`${e.address}
`:"",r=o?`
Email: ${o}
`:`
`;return`${ve(e,t)}
${we(t)}
${$e(e,t)}
${n}${Ee(e,t)}
${r}${Se(t)}

${Ie(t)}`}const k=pt;function P(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}function S(t){return t.replace(/'/g,"&#39;").replace(/"/g,"&quot;")}function C(t){const e={};for(const[o,n]of Object.entries(t))typeof n=="string"?e[o]=P(n):e[o]=n;return e}function _(){return y.userProfile&&y.userProfile.storePhone?y.userProfile.storePhone:"702-357-8990"}function se(){return y.userProfile&&y.userProfile.storeName?y.userProfile.storeName:"Citizen Company Store"}function Fe(){return y.userProfile&&y.userProfile.storeLocation?y.userProfile.storeLocation:"the South Premium Outlets"}function ft(){return`Citizen Company Store at ${Fe()}`}function gt(t){if(!t)return"";const e=i=>{const p=document.createElement("div");return p.textContent=i,p.innerHTML};let o=t;const n=[/\n\n-{5,}\n/,/______+/,/\n\n[A-Z][a-z]+ [A-Z][a-z]+ │ /];for(const i of n){const p=o.match(i);if(p){o=o.substring(0,p.index).trim();break}}const a=o.split(/\n\n+/).map(i=>{const p=i.split(`
`);return p.some(m=>m.trim())&&p.every(m=>{const u=m.trim();return!u||u.startsWith("•")||u.startsWith("-")})?`    <ul style="margin: 10px 0; padding-left: 20px; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt;">
${p.filter(u=>u.trim()).map(u=>{const v=u.replace(/^[•-]\s*/,"").trim();return`        <li style="margin: 5px 0;">${e(v)}</li>`}).join(`
`)}
    </ul>`:`    <p style="margin: 10px 0; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);">${i.split(`
`).map(u=>e(u)).join("<br>")}</p>`}),s=k("html");return`${a.join(`
`)}

    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
${s}
    </div>`}const ht={"new-customer-welcome":"Use after a customer visits the store for the first time. Adds them to VIP list. (Enhanced: editable subject, EML download)","back-in-stock":"Follow up when a previously unavailable item is back. Include hold deadline.","thank-you-warranty":"Send after purchase to explain warranty registration and care tips.","weekly-sale":"Personalized sale notification for customers who showed interest in specific collections. (Enhanced: editable subject, EML download)","new-model-arrival":"Alert interested customers when a specific model they asked about arrives. (Enhanced: editable subject, EML download)","limited-edition":"High-priority notification for VIP collectors about exclusive pieces. (Enhanced: editable subject, EML download)","vip-reconnection":"Re-engage customers who haven't visited in a while. Mention store evolution. (Enhanced: editable subject, EML download)","phone-confirmation":"Immediate confirmation after taking a phone order. Include all order details. (Enhanced: editable subject, EML download)","phone-shipped":"Send when order ships with UPS tracking. Mention signature requirement. (Enhanced: editable subject, EML download)","phone-under-500":"Internal approval request for phone orders under $500. Manager verification. (Enhanced: editable subject, EML download)","phone-corporate":"Corporate/bulk order approval. Include purpose and fulfilling store. (Enhanced: editable subject, EML download)","inter-store-notification":"Notify receiving store that order is prepared and ready for pickup. (Enhanced: editable subject, EML download)","text-availability":"Quick response to customer inquiry about specific model availability.","text-thank-you":"Post-purchase thank you via text. Keep it brief and friendly.","text-interest-followup":"Follow up on specific watch customer showed interest in. Use after store visit."},He={customerName:{example:"John Smith",required:!0},employeeName:{example:"Your name",required:!0},yourName:{example:"Your name",required:!0},brand:{example:"Citizen",required:!0,suggestions:["Citizen","Bulova","Frederique Constant"]},modelName:{example:"Eco-Drive Promaster",required:!0},modelNumber:{example:"BN0150-28E",required:!1},price:{example:"299",required:!0,validation:"currency"},discount:{example:"20",required:!0,validation:"number",dependent:!0},msrp:{example:"399",required:!0,validation:"currency",dependent:!0},quantity:{example:"2",required:!0,validation:"number"},unitsQuantity:{example:"1",required:!0,validation:"number"},totalAmount:{example:"299.00",required:!0,validation:"currency"},closingTime:{example:"9:00 PM",required:!0},endDate:{example:"Sunday",required:!0},holdDeadline:{example:"Friday 5PM",required:!0},trackingNumber:{example:"1Z999AA10123456784",required:!1,validation:"tracking"},customerId:{example:"C12345",required:!0},employeeId:{example:"E789",required:!0},warrantyLength:{example:"5-year",required:!0},warrantyYears:{example:"5",required:!0,validation:"number"},carrier:{example:"UPS",required:!0,suggestions:["UPS","FedEx","USPS"]},promoDateRange:{example:"Nov 28 - Dec 1",required:!0},promoYear:{example:"2024-2025",required:!1},promoTitle:{example:"Leave blank for auto-generation",required:!1},promoBrand:{example:"Citizen",required:!0,suggestions:["Citizen","Bulova","Alpina","Frederique Constant"]},promoDiscount:{example:"60",required:!0,validation:"number"},promoCollections:{example:"Corso, Avion, Marine Star",required:!1},promoCallout:{example:"Optional special note",required:!1},keyFeature1:{example:"Eco-Drive technology",required:!1},keyFeature2:{example:"Solar powered",required:!1},keyFeature3:{example:"Water resistant to 200m",required:!1},limitedDetails:{example:"Limited to 100 pieces worldwide",required:!0},quantityAvailable:{example:"5",required:!0,validation:"number"},customerAddress:{example:"123 Main St, City, State 12345",required:!0},managerNameOrStoreName:{example:"Store Manager or Store Name",required:!0},creditCardVerified:{example:"Yes",required:!0,suggestions:["Yes","No"]},needsManagerVerification:{example:"Yes",required:!0,suggestions:["Yes","No"]},fulfillingStore:{example:"Las Vegas Premium Outlets",required:!0},recipientStoreName:{example:"Los Angeles Premium Outlets",required:!0},collectionName:{example:"Eco-Drive Collection",required:!0},model1:{example:"Eco-Drive Promaster",required:!0},price1:{example:"299",required:!0,validation:"currency"},original1:{example:"399",required:!0,validation:"currency"},model2:{example:"Eco-Drive Satellite Wave",required:!1},price2:{example:"349",required:!1,validation:"currency"},original2:{example:"449",required:!1,validation:"currency"}};function yt(t){return(He[t]||{}).suggestions||[]}function xe(t){return`Hi ${t},

`}function Le(){return`

Best regards,
${k()}`}function bt(t,e){return(t*(1-e/100)).toFixed(2)}const B={"new-customer-welcome":{name:"New Customer Welcome",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","employeeName"],generate:t=>{const e=C(t);return`Subject: Welcome to Citizen Company Store - Your VIP Access

${xe(e.customerName)}Thank you for visiting our Citizen Company Store outlet location! It was a pleasure helping you explore our offerings today.

I've added you to our VIP email list for weekly promotional updates featuring exclusive outlet pricing on our timepieces.

Please don't hesitate to reach out by replying to this email or call the store at ${_()}. I would be happy to check availability on any models you're considering.${Le()}`}},"new-model-arrival":{name:"New Model Arrival",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","keyFeature1","keyFeature2","keyFeature3","price","employeeName"],generate:t=>{const e=C(t),o=[e.keyFeature1,e.keyFeature2,e.keyFeature3].filter(n=>n&&n.trim()).map(n=>`• ${n}`).join(`
`);return`Subject: Great News! ${e.modelName} Now Available

${xe(e.customerName)}Great news! The ${e.brand} ${e.modelName} (${e.modelNumber}) you were interested in has arrived at our store.

Key Features:
${o}

Current price: ${e.price}

I'd be happy to set up an appointment to show you all the features of this watch and let you try it on. This model tends to generate a lot of interest, so I wanted to reach out to you first.

Would you like to schedule a time to see it in person? Please reply to this email or call the store at ${_()}.

Looking forward to hearing from you!${Le()}`}},"limited-edition":{name:"Limited Edition",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","limitedDetails","price","quantityAvailable","employeeName"],generate:t=>{const e=C(t);return`Subject: Exclusive: Limited Edition ${e.modelName} Available

Hi ${e.customerName},

I wanted to reach out to you personally because we just received a ${e.brand} ${e.modelName} (${e.modelNumber}) - ${e.limitedDetails}.

As someone who appreciates fine timepieces and unique additions to your collection, I thought you'd want to know about this immediately.

Price: ${e.price}
Availability: Only ${e.quantityAvailable} available

This is truly a special piece that won't last long. I'd love to show it to you in person and discuss how it could complement your collection.

Can you stop by this week, or would you like me to hold one for you? Please reply to this email or call the store at ${_()}.

Best regards,
${k()}

P.S. - Given the limited availability, I'm only reaching out to our most valued collectors. Let me know if you're interested!`}},"vip-reconnection":{name:"VIP Reconnection",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","employeeName"],generate:t=>`Subject: Your Store Has Evolved - We'd Love to Show You What's New

 Hi ${C(t).customerName},

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
${k()}

P.S. - We now carry everything from current season pieces to discontinued treasures, giving you more options than ever before.`},"phone-confirmation":{name:"Confirmation",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","price","discount","totalAmount","customerAddress","carrier","trackingNumber","employeeName"],generate:t=>{const e=C(t);let o="";return e.trackingNumber&&(o=`

Tracking Number: ${e.trackingNumber}`),`Subject: Order Confirmation - ${e.modelName}

Hi ${e.customerName},

Thank you for your phone order! This email confirms the following:

Order Details:
Item: ${e.brand} ${e.modelName}
Model #: ${e.modelNumber}
Price: ${e.price} (includes ${e.discount}% outlet discount)
Shipping: $20 flat-rate ground shipping
Total: ${e.totalAmount}

Shipping Information:
${e.customerAddress}

Your order will ship within 1-2 business days via ${e.carrier}. You'll receive tracking information at this email address once shipped.${o}

If you have any questions, please don't hesitate to contact us at ${_()}.

Thank you for shopping with ${se()}!

Best regards,
${k()}`}},"phone-shipped":{name:"Shipped with Tracking",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","trackingNumber","customerAddress","carrier","employeeName"],generate:t=>{const e=C(t);return`Subject: Your Watch Order - Tracking Information

Hi ${e.customerName},

Thank you for your recent purchase from ${se()}! We're pleased to confirm that your order has been shipped and is on its way to you.

Tracking Information:
UPS Tracking Number: ${e.trackingNumber}

You can track your shipment at the link above or visit ups.com and enter your tracking number.

Your package requires an adult signature upon delivery to ensure safe receipt of your timepiece.

Order Details:
Watch Model: ${e.modelNumber} - ${e.modelName}
Shipping Address: ${e.customerAddress}

If you have any questions about your order or need any assistance, please don't hesitate to reach out. I'm here to help!

We hope you enjoy your new ${e.brand} timepiece!

Best regards,
${k()}`}},"phone-under-500":{name:"Under $500 Request",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["managerNameOrStoreName","customerName","customerId","employeeName","employeeId","unitsQuantity","totalAmount","creditCardVerified","needsManagerVerification"],generate:t=>{const e=C(t);if(!e.creditCardVerified||e.creditCardVerified.toLowerCase()!=="yes")throw new Error("Credit card must be verified before generating this order form.");let o="";return e.needsManagerVerification&&e.needsManagerVerification.toLowerCase()==="yes"?o="Ready for manager verification":o="Credit card manager verified - Ready for processing",`Subject: Phone Order Form for ${e.customerName}

Hi ${e.managerNameOrStoreName},

Attached is the form for the phone order for ${e.customerName} (${e.customerId}).

Ringing under: ${e.employeeName} (${e.employeeId})
Units: ${e.unitsQuantity}
Total: ${e.totalAmount}

Order Status: ${o}

Best regards,
${k()}`}},"phone-corporate":{name:"Corporate Approval",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","customerId","employeeName","employeeId","unitsQuantity","totalAmount","fulfillingStore"],generate:t=>{const e=C(t);return`Subject: Phone Order Approval Request - ${e.customerName}

Hello,

I am forwarding a request for approval on a phone order for ${e.employeeName} (${e.employeeId}).

There are ${e.unitsQuantity} units totaling ${e.totalAmount}. It will be fulfilled at ${e.fulfillingStore}.

Customer: ${e.customerName} (${e.customerId})

I have verified and signed off. Please let us know if you have any questions.

 Best regards,
 ${k()}`}},"inter-store-notification":{name:"Inter-Store Notification",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["recipientStoreName","customerName","trackingNumber"],generate:t=>{const e=C(t);return`Subject: Phone Order Processed and Shipped - ${e.customerName}

Hi ${e.recipientStoreName} Team,

The phone order for ${e.customerName} has been rung and labeled for shipping.

UPS Tracking Number: ${e.trackingNumber}

The package has been prepared and is ready for UPS pickup.

Best regards,
${k()}`}},"text-availability":{name:"Availability Response",category:"Text",fields:["customerName","modelName","price","closingTime"],generate:t=>{const e=C(t);return`Hi ${e.customerName}! Yes, we have the ${e.modelName} in stock. Current price is ${e.price} with our outlet discount. We're open until ${e.closingTime} today if you'd like to stop by, or I can hold it.`}},"text-thank-you":{name:"Thank You",category:"Text",fields:["customerName","modelName","warrantyLength","brand"],generate:t=>{const e=C(t);return`${e.customerName}, thank you for your purchase today! Your ${e.modelName} comes with a ${e.warrantyLength} warranty. Reach out anytime at ${_()} for any questions. Enjoy your new ${e.brand}!`}},"text-interest-followup":{name:"Sale Alert",category:"Text",fields:["customerName","employeeName","modelName","discount","msrp","endDate"],generate:t=>{const e=C(t),o=parseFloat(e.msrp),n=parseFloat(e.discount);if(isNaN(o)||o<=0)throw new Error("MSRP must be a valid positive number");if(isNaN(n)||n<0||n>100)throw new Error("Discount must be a valid percentage between 0 and 100");const r=bt(o,n);return`Hi ${e.customerName}! This is ${e.employeeName} from ${ft()}. The ${e.modelName} you were interested in is on ${e.discount}% OFF promotion (MSRP ${e.msrp} now ${r} plus tax) until ${e.endDate}. Please let me know if you'd like me to hold one for you. Thank you!`}},"weekly-sale":{name:"Weekly Sale",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","collectionName","discount","brand","model1","price1","original1","model2","price2","original2","endDate","employeeName"],generate:t=>{const e=C(t),n=[{name:e.model1,price:e.price1,original:e.original1},{name:e.model2,price:e.price2,original:e.original2}].filter(r=>r.name&&r.price).map(r=>`• ${r.name} - Now ${r.price} (was ${r.original})`).join(`
`);return`Subject: ${e.customerName}, This Week's ${e.brand} Sale Includes Your Favorites

Hi ${e.customerName},

I remember you were looking at ${e.collectionName} pieces during your last visit. Good timing - we just started our ${e.discount}% off promotion on select ${e.brand} models this week!

Specifically available in that collection:
${n}

This promotion runs through ${e.endDate}. Would you like me to check if we have your size preference in stock?

${k()}`}}},oe={chevronDown:"M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z",chevronUp:"M1.707 8.707L6 4.414l4.293 4.293a1 1 0 001.414-1.414l-5-5a1 1 0 00-1.414 0l-5 5a1 1 0 101.414 1.414z",close:"M18 6L6 18M6 6l12 12",profile:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2",profileCircle:"M12 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",save:"M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z",import:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",export:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",reset:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5",eyePreview:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z",eyeCircle:"M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",codeBrackets:"M16 18l6-6-6-6M8 6l-6 6 6 6",email:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z",emailFlap:"M22 6l-10 7L2 6",errorCircle:"M12 12a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",errorLine:"M12 8v4M12 16h.01",warning:"M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",upload:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",pdfDoc:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",pdfDocCorner:"M14 2v6h6"};function q(t,{size:e=12,className:o=""}={}){const r=oe[t==="up"?"chevronUp":"chevronDown"],a=o?` class="${o}"`:"";return`<svg width="${e}" height="${e}" viewBox="0 0 12 12" fill="currentColor"${a}><path d="${r}"/></svg>`}function de({size:t=16,className:e=""}={}){const o=e?` class="${e}"`:"";return`<svg width="${t}" height="${t}" viewBox="0 0 16 16" fill="currentColor"${o}>
    <circle cx="4" cy="3" r="1.5"/>
    <circle cx="4" cy="8" r="1.5"/>
    <circle cx="4" cy="13" r="1.5"/>
    <circle cx="12" cy="3" r="1.5"/>
    <circle cx="12" cy="8" r="1.5"/>
    <circle cx="12" cy="13" r="1.5"/>
  </svg>`}function Z({size:t=16,className:e=""}={}){const o=e?` class="${e}"`:"";return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${o}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`}function ze({size:t=16,className:e=""}={}){const o=e?` class="${e}"`:"";return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${o}>
    <path d="${oe.email}"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>`}function vt({size:t=16,className:e=""}={}){const o=e?` class="${e}"`:"";return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${o}>
    <path d="${oe.eyePreview}"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>`}function wt({size:t=16,className:e=""}={}){const o=e?` class="${e}"`:"";return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${o}>
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
  </svg>`}function $t({size:t=48,className:e=""}={}){const o=e?` class="${e}"`:"";return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${o}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>`}function Et({size:t=24,className:e=""}={}){return`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${e?` class="${e}"`:""}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <text x="12" y="17" font-size="6" text-anchor="middle" fill="currentColor">PDF</text>
  </svg>`}function Oo({size:t=14,className:e=""}={}){const o=e?` class="${e}"`:"";return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${o}>
    <path d="${oe.warning}"/>
  </svg>`}function Re({size:t=16,className:e=""}={}){const o=e?` class="${e}"`:"";return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${o}>
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
  </svg>`}function qe({size:t=16,className:e=""}={}){const o=e?` class="${e}"`:"";return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${o}>
    <line x1="19" y1="4" x2="10" y2="4"></line>
    <line x1="14" y1="20" x2="5" y2="20"></line>
    <line x1="15" y1="4" x2="9" y2="20"></line>
  </svg>`}function Oe({size:t=16,className:e=""}={}){const o=e?` class="${e}"`:"";return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${o}>
    <path d="M6 4v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4"></path>
    <line x1="4" y1="21" x2="20" y2="21"></line>
  </svg>`}function Te(t){const e=document.createElement("div");e.innerHTML=t;let o="";const n=r=>{if(r.nodeType===3)o+=r.textContent;else if(r.nodeType===1){const a=r.tagName.toLowerCase();(a==="p"||a==="div"||a==="h1"||a==="h2"||a==="h3"||a==="br")&&o&&!o.endsWith(`\r
`)&&(o+=`\r
\r
`);for(let s=0;s<r.childNodes.length;s++)n(r.childNodes[s]);(a==="p"||a==="div")&&r.nextSibling&&(o.endsWith(`\r
`)||(o+=`\r
`))}};return n(e),o=o.replace(/\r\n\r\n\r\n+/g,`\r
\r
`).trim()+`\r
`,o}function ee(t){const o=new TextEncoder().encode(t);let n="";for(let r=0;r<o.length;r++){const a=o[r],s=String.fromCharCode(a);if(s==="=")n+="=3D";else if(a<32||a>126)if(a===9||a===10||a===13)n+=s;else{const c=a.toString(16).toUpperCase().padStart(2,"0");n+="="+c}else n+=s}return n}function _e(t){let e=!0;for(let a=0;a<t.length;a++)if(t.charCodeAt(a)>127){e=!1;break}if(e)return t;const o=new TextEncoder().encode(t),n=Array.from(o,a=>String.fromCodePoint(a)).join("");return`=?UTF-8?B?${btoa(n)}?=`}function St(t){const e=new TextEncoder().encode(t),o=Array.from(e,n=>String.fromCodePoint(n)).join("");return btoa(o)}function Ue(t){let e=!0;for(let n=0;n<t.length;n++)if(t.charCodeAt(n)>127){e=!1;break}return e?`filename="${t}"`:`filename*=UTF-8''${encodeURIComponent(t)}`}function It(t){return/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(String(t).toLowerCase())}function _o(t){const e=t.split(/[\s,;\n]+/).map(o=>o.trim().toLowerCase()).filter(Boolean);return[...new Set(e)]}async function xt(t,e,o,n,r,a,s=[]){const c=Date.now().toString(16),i=`_000_DM6PR11MB2683${c}DM6PR11MB2683namp_`,p=`_000_ALT_${c}_ALT_`,g=s&&s.length>0;let m=`Subject: ${_e(r)}\r
`;if(m+=`Content-Language: en-US\r
`,m+=`MIME-Version: 1.0\r
`,m+=`X-Unsent: 1\r
`,g){m+=`X-MS-Has-Attach: yes\r
`,m+=`Content-Type: multipart/mixed; boundary="${i}"\r
`,m+=`\r
`,m+=`This is a multi-part message in MIME format.\r
\r
`,m+=`--${i}\r
`,m+=`Content-Type: multipart/alternative; boundary="${p}"\r
\r
`,m+=`--${p}\r
`,m+=`Content-Type: text/plain; charset="utf-8"\r
`,m+=`Content-Transfer-Encoding: quoted-printable\r
\r
`;const u=Te(a);m+=`${ee(u)}\r
\r
`,m+=`--${p}\r
`,m+=`Content-Type: text/html; charset="utf-8"\r
`,m+=`Content-Transfer-Encoding: quoted-printable\r
\r
`,m+=`${ee(a)}\r
\r
`,m+=`--${p}--\r
\r
`;for(const v of s)if(v.data){const w=v.data.split(",");if(w.length===2&&w[0].includes("base64")){const f=w[1];m+=`--${i}\r
`,m+=`Content-Type: application/pdf; name="${v.name}"\r
`,m+=`Content-Transfer-Encoding: base64\r
`,m+=`Content-Disposition: attachment; ${Ue(v.name)}\r
\r
`;const h=f.match(/.{1,76}/g)||[];m+=h.join(`\r
`),m+=`\r
\r
`}}m+=`--${i}--\r
`}else{m+=`X-MS-Has-Attach:\r
`,m+=`Content-Type: multipart/alternative; boundary="${i}"\r
`,m+=`\r
`,m+=`--${i}\r
`,m+=`Content-Type: text/plain; charset="utf-8"\r
`,m+=`Content-Transfer-Encoding: quoted-printable\r
\r
`;const u=Te(a);m+=`${ee(u)}\r
\r
`,m+=`--${i}\r
`,m+=`Content-Type: text/html; charset="utf-8"\r
`,m+=`Content-Transfer-Encoding: quoted-printable\r
\r
`,m+=`${ee(a)}\r
\r
`,m+=`--${i}--\r
`}return m}function Lt(t){if(!t)return null;const e=t.indexOf("While Supplies Last");if(e===-1)return null;const o=Math.max(0,e-200),r=t.substring(o,e).match(/([A-Za-z]+\s+\d+(?:\s*-\s*[A-Za-z]+\s+\d+)?),\s*(\d{4})\s*•\s*While Supplies Last/);return r?`${r[1]}, ${r[2]}`:null}function Tt(t){if(!t)return"";const e={January:"Jan",February:"Feb",March:"Mar",April:"Apr",May:"May",June:"Jun",July:"Jul",August:"Aug",September:"Sep",October:"Oct",November:"Nov",December:"Dec"},o=t.match(/^([A-Za-z]+)\s+(\d+)(?:\s*-\s*([A-Za-z]+)\s+(\d+))?,?\s*(\d{4})$/);if(o){const[,n,r,a,s,c]=o,i=e[n]||n.substring(0,3),p=a?e[a]||a.substring(0,3):i;return a&&s?`${i}${r}-${p}${s}.${c}`:`${i}${r}.${c}`}return t.replace(/[^a-zA-Z0-9]/g,"").substring(0,20)}function Uo(t){const e=Lt(t);if(e)return`Promo-email.${Tt(e)}.zip`;{const o=new Date,n=String(o.getMonth()+1).padStart(2,"0"),r=String(o.getDate()).padStart(2,"0");return`Promo-email.${o.getFullYear()}-${n}-${r}.zip`}}function Yo(t,e,o,n=[],r="eml",a=1){const s=o.filter(f=>It(f)?!0:(console.warn(`Invalid email address skipped in batch ${a}: ${f}`),!1)),c="----=_NextPart_"+Date.now()+"_"+a+"_"+Math.random().toString(36).substr(2,9);let i="";i+=`Subject: ${_e(t)}\r
`;const p=new Date(Date.now()+a*1e3);i+=`Date: ${p.toUTCString()}\r
`;const g=`<batch${a}.${Date.now()}.${Math.random().toString(36).substr(2,9)}@citizenstore.local>`;if(i+=`Message-ID: ${g}\r
`,s&&s.length>0){i+="Bcc: ";let f="";for(let h=0;h<s.length;h++){const I=s[h],L=h<s.length-1?", ":"",N=I+L;f.length+N.length>900?(i+=f+`\r
 `,f=N):f+=N}i+=f+`\r
`}i+=`MIME-Version: 1.0\r
`,i+=`Content-Type: multipart/mixed; boundary="${c}"\r
`,i+=`X-Unsent: 1\r
`,i+=`X-Outlook-Template: 1\r
`,i+=`Message-Class: IPM.Note\r
`,i+=`X-Outlook-Message-Flag: \r
`,i+=`X-Mailer: Microsoft Outlook 16.0\r
`,i+=`X-Msg-Status: 00000000\r
`,i+=`\r
`,i+=`This is a multi-part message in MIME format.\r
\r
`,i+=`--${c}\r
`,i+=`Content-Type: text/html; charset=utf-8\r
`,i+=`Content-Transfer-Encoding: base64\r
\r
`;const m=e.replace(/\r?\n/g,`\r
`),v=St(m).match(/.{1,76}/g)||[];i+=v.join(`\r
`),i+=`\r
\r
`,n&&n.length>0&&n.forEach((f,h)=>{if(!f.data){console.warn(`Skipping PDF ${f.name} - no data available (may need to re-upload)`);return}const I=f.data.split(",");if(I.length!==2||!I[0].includes("base64")){console.error(`Invalid PDF data format for attachment ${h+1} (${f.name}) in batch ${a}`);return}const L=I[1];if(!L||L.length===0){console.error(`Empty PDF data for attachment ${h+1} (${f.name}) in batch ${a}`);return}i+=`--${c}\r
`,i+=`Content-Type: application/pdf; name="${f.name}"\r
`,i+=`Content-Transfer-Encoding: base64\r
`,i+=`Content-Disposition: attachment; ${Ue(f.name)}\r
`,i+=`\r
`;const N=L.match(/.{1,76}/g)||[];i+=N.join(`\r
`),i+=`\r
\r
`}),i+=`--${c}--\r
`;const w=a.toString().padStart(3,"0");return{format:r,data:new TextEncoder().encode(i),filename:`batch-email${w}.${r}`}}function T(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}function ue(t){const e=r=>T(r);return t.split(/\n\n+/).map(r=>{if(!r.trim())return"";const a=r.split(`
`);return a.some(i=>i.trim())&&a.every(i=>{const p=i.trim();return!p||p.startsWith("•")||p.startsWith("-")})?`    <ul style="margin: 10px 0; padding-left: 20px; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt;">
${a.filter(p=>p.trim()).map(p=>{const g=p.replace(/^[•-]\s*/,"").trim();return`        <li style="margin: 5px 0;">${e(g)}</li>`}).join(`
`)}
    </ul>`:`    <p style="margin: 10px 0; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);">${a.map(i=>e(i)).join("<br>")}</p>`}).filter(r=>r).join(`
`)}function Ct(t){let e="Email Preview",o=t;if(window.originalMessageContent){const r=window.originalMessageContent.match(/^Subject:\s*(.+)/m);r&&(e=r[1],o=window.originalMessageContent.replace(/^Subject:.+\n/m,"").trim())}else{const r=t.match(/^Subject:\s*(.+)/m);r&&(e=r[1],o=t.replace(/^Subject:.+\n/m,"").trim())}return`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${T(e)}</title>
    <style>
        body {
            font-family: Aptos, Arial, Helvetica, sans-serif;
            font-size: 12pt;
            color: rgb(0, 0, 0);
            margin: 0;
            padding: 20px;
            background-color: #ffffff;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
        }
        .email-header {
            padding: 10px;
            background-color: #f5f5f5;
            border-bottom: 2px solid #ddd;
            margin-bottom: 20px;
        }
        .email-subject {
            font-size: 14pt;
            font-weight: 600;
            color: #333;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <div class="email-subject">${T(e)}</div>
        </div>
        <div class="email-body">
            ${o}
        </div>
    </div>
</body>
</html>`}let D=null;function kt(t){D=t}function Ye(t){return t?/<(p|div|span|br|html|body|head|table|tr|td|ul|ol|li|h[1-6]|strong|em|a)\b[^>]*>/i.test(t):!1}const d={};function Bt(){d.templateSelect=document.getElementById("templateSelect"),d.formFields=document.getElementById("formFields"),d.formSectionTitle=document.getElementById("formSectionTitle"),d.outputCard=document.getElementById("outputCard"),d.outputArea=document.getElementById("outputArea"),d.generateBtn=document.getElementById("generateBtn"),d.clearBtn=document.getElementById("clearBtn"),d.copyBtn=document.getElementById("copyBtn"),d.sendEmailBtn=document.getElementById("sendEmailBtn"),d.downloadEmailBtn=document.getElementById("downloadEmailBtn"),d.themeToggle=document.getElementById("themeToggle"),d.searchBox=document.getElementById("searchBox"),d.clearSearch=document.getElementById("clearSearch"),d.searchResults=document.getElementById("searchResults"),d.resultCounter=document.getElementById("resultCounter")}function te(t){return document.getElementById(t)}function M(t,e=2500){const o=document.getElementById("toast");if(!o){console.warn("Toast element not found");return}o.textContent=t,o.classList.add("show"),setTimeout(()=>{o.classList.remove("show")},e)}function We(){if(!d.outputCard)return;d.outputArea=null,d.copyBtn=null,d.subjectLineContainer=null,d.sendEmailBtn=null,d.downloadEmailBtn=null,d.previewTab=null,d.htmlTab=null,d.previewContentRegular=null,d.htmlContentRegular=null,d.emailPreview=null;const t=B[D],e=t&&t.hasEditableSubject;let o="",n="";if(e?(o=`
            <div id="subjectLineContainer" class="subject-line-section" style="margin-bottom: 1.5rem;">
                <div id="subjectLineContent"></div>
            </div>
        `,n=`
            <div class="button-group">
                <button class="btn" id="copyBtn" title="Copy the message to clipboard">Copy Message</button>
                <button class="btn" id="sendEmailBtn" title="Open your default email client with this message">Send Email</button>
                <button class="btn" id="downloadEmailBtn" title="Download an Outlook-compatible EML file">Download Email File</button>
            </div>
        `):n=`
            <div class="button-group">
                <button class="btn" id="copyBtn">Copy Message</button>
            </div>
        `,d.outputCard.innerHTML=`
        <h2 class="section-title">Generated Message</h2>
        ${o}

        <!-- Output Tabs -->
        <div class="output-tabs">
            <button class="output-tab active" data-tab="preview" title="Preview how the email looks in an email client">
                ${vt({size:16})}
                Preview
            </button>
            <button class="output-tab" data-tab="html" title="View the raw HTML code">
                ${wt({size:16})}
                HTML
            </button>
        </div>

        <!-- Preview Tab Content -->
        <div class="output-content active" id="previewContent">
            <iframe class="email-preview" id="emailPreview" title="Email preview"></iframe>
        </div>

        <!-- HTML Tab Content -->
        <div class="output-content" id="htmlContent">
            <textarea class="output-textarea" id="outputArea" placeholder="Your generated message will appear here..." aria-label="Generated message output"></textarea>
        </div>

        ${n}
    `,d.outputArea=document.getElementById("outputArea"),d.copyBtn=document.getElementById("copyBtn"),d.previewTab=document.querySelector('.output-tab[data-tab="preview"]'),d.htmlTab=document.querySelector('.output-tab[data-tab="html"]'),d.previewContentRegular=document.getElementById("previewContent"),d.htmlContentRegular=document.getElementById("htmlContent"),d.emailPreview=document.getElementById("emailPreview"),d.emailPreview&&me(d.emailPreview),d.copyBtn&&d.copyBtn.addEventListener("click",qt),d.previewTab&&d.htmlTab&&(d.previewTab.addEventListener("click",()=>{d.previewTab.classList.add("active"),d.htmlTab.classList.remove("active"),d.previewContentRegular&&d.previewContentRegular.classList.add("active"),d.htmlContentRegular&&d.htmlContentRegular.classList.remove("active"),d.outputArea&&window.originalMessageContent&&(d.outputArea.value=window.originalMessageContent),X()}),d.htmlTab.addEventListener("click",()=>{if(d.htmlTab.classList.add("active"),d.previewTab.classList.remove("active"),d.htmlContentRegular&&d.htmlContentRegular.classList.add("active"),d.previewContentRegular&&d.previewContentRegular.classList.remove("active"),d.outputArea){const r=d.outputArea.value;if(r){let a="Email",s=r;const c=r.match(/^Subject:\s*(.+)/m);c&&(a=c[1],s=r.replace(/^Subject:.+\n/m,"").trim());let i=s;const p=s.match(/\n\nBest regards,/);p&&(i=s.substring(0,p.index+p[0].length).trim());const g=ue(i),m=k("html"),u=`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${T(a)}</title>
</head>
<body style="font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0); margin: 0; padding: 20px; background-color: #ffffff;">
    <div style="max-width: 600px; margin: 0 auto;">
        <div style="padding: 10px; background-color: #f5f5f5; border-bottom: 2px solid #ddd; margin-bottom: 20px;">
            <div style="font-size: 14pt; font-weight: 600; color: #333;">${T(a)}</div>
        </div>
        <div>
            ${g}
            <div style="margin-top: 5px; padding-top: 10px;">
                ${m}
            </div>
        </div>
    </div>
</body>
</html>`;d.outputArea.value=u}}})),e){const r=document.getElementById("sendEmailBtn"),a=document.getElementById("downloadEmailBtn");r&&r.addEventListener("click",()=>{const c=document.getElementById("outputArea"),i=c?c.value:"";i&&jt(D,i)}),a&&a.addEventListener("click",()=>{const c=document.getElementById("outputArea"),i=window.originalMessageContent||(c?c.value:"");i&&Ft(D,i)});const s=document.getElementById("subjectLineContent");s&&Je(s,"")}}function me(t){if(!t)return;const e=t.contentDocument||t.contentWindow.document;if(!e)return;const o=getComputedStyle(document.documentElement),n=o.getPropertyValue("--bg-tertiary").trim()||"#f8f3ef",r=o.getPropertyValue("--text-primary").trim()||"#2a2420",a=o.getPropertyValue("--text-secondary").trim()||"#666";e.open(),e.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: 'Aptos', Arial, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                    margin: 0;
                    background: ${n};
                    color: ${a};
                    text-align: center;
                    padding: 2rem;
                }
                .empty-state {
                    max-width: 400px;
                }
                .empty-state svg {
                    width: 80px;
                    height: 80px;
                    margin-bottom: 1rem;
                    opacity: 0.3;
                }
                .empty-state h3 {
                    font-size: 1.2rem;
                    margin: 0 0 0.5rem 0;
                    color: ${r};
                }
                .empty-state p {
                    font-size: 0.9rem;
                    margin: 0;
                    color: ${a};
                }
            </style>
        </head>
        <body>
            <div class="empty-state">
                ${ze({size:80})}
                <h3>No Preview Yet</h3>
                <p>Fill in the form and click Generate to see your email preview</p>
            </div>
        </body>
        </html>
    `),e.close()}function Dt(){const t=navigator.platform.toLowerCase();return t.includes("win")?"windows":t.includes("mac")?"mac":"other"}function Pt(){return Dt()==="mac"?"emltpl":"eml"}function At(){try{const t=localStorage.getItem("userProfile");t&&(y.userProfile=JSON.parse(t))}catch(t){console.error("Error loading user profile:",t)}}function Ve(){d.templateSelect.addEventListener("change",()=>{le(d.templateSelect.value)}),d.generateBtn.addEventListener("click",Nt),d.clearBtn.addEventListener("click",Mt),d.themeToggle.addEventListener("click",Fo),d.searchBox.addEventListener("input",()=>{const e=d.searchBox.value.trim();d.clearSearch.classList.toggle("visible",e.length>0),Ce(e)}),d.clearSearch.addEventListener("click",()=>{d.searchBox.value="",d.clearSearch.classList.remove("visible"),Ce("")});const t=document.querySelector(".search-container");document.addEventListener("click",e=>{t&&!t.contains(e.target)&&d.searchResults&&d.searchResults.classList.remove("visible")}),d.searchResults&&d.searchResults.addEventListener("click",e=>{const o=e.target.closest(".search-result-item");if(o&&o.dataset.templateKey){const n=o.dataset.templateKey;le(n),d.searchBox.value="",d.searchBox.classList.remove("active"),d.clearSearch.classList.remove("visible"),d.searchResults.classList.remove("visible")}})}function Nt(){const t=B[D];if(!t){M("Please select a template first");return}const e={};t.fields.forEach(r=>{const a=document.querySelector(`[data-field="${r}"]`);if(a&&a.classList.contains("radio-group")){const s=a.querySelector('input[type="radio"]:checked');e[r]=s?s.value:""}else{const s=te(r);s?e[r]=s.value:e[r]=""}});let o;try{o=t.generate(e)}catch(r){console.error("Error generating message:",r),M("Error generating message: "+r.message);return}We();const n=te("outputArea");if(n&&(n.value=o),window.originalMessageContent=o,X(),t.hasEditableSubject){const r=G(o),a=document.getElementById("subjectLineContent");a&&Je(a,r)}d.outputCard.scrollIntoView({behavior:"smooth"})}function Mt(){const t=B[D];t&&t.fields.forEach(e=>{const o=te(e.id);if(o){o.value="",o.classList.remove("invalid");const n=o.nextElementSibling;n&&n.classList.contains("validation-msg")&&(n.style.display="none")}}),d.outputArea&&(d.outputArea.value=""),d.outputCard&&(d.outputCard.innerHTML=""),X(),M("✓ Form cleared")}function G(t){const e=t.match(/^Subject:\s*(.*)/im);return e?e[1]:""}function Je(t,e){window.currentSubjectLine=e,t.innerHTML=`
        <div class="editable-subject-line">
            <label for="subjectInput" class="form-label">Subject:</label>
            <input type="text" id="subjectInput" class="form-input" value="${S(e)}">
        </div>
    `;const o=document.getElementById("subjectInput");o&&o.addEventListener("input",n=>{window.currentSubjectLine=n.target.value,debouncedSubjectPreviewUpdate(n.target.value)})}function jt(t,e){const o=B[t];if(!o)return;let n="",r=e;o.hasEditableSubject?(n=window.currentSubjectLine||G(e),r=r.replace(/^Subject:.*\r?\n/im,"")):(n=G(e),r=r.replace(/^Subject:.*\r?\n/im,""));const a=gt(r),s=`mailto:?subject=${encodeURIComponent(n)}&body=${encodeURIComponent(a)}`,c=document.createElement("a");c.href=s,document.body.appendChild(c),c.click(),document.body.removeChild(c)}function Ft(t,e){const o=B[t];if(!o)return;let n="",r=e;o.hasEditableSubject?(n=window.currentSubjectLine||G(e),r=e.replace(/^Subject:.*\r?\n/im,"")):(n=G(e),r=e.replace(/^Subject:.*\r?\n/im,""));const a=Ye(r);let s;if(a)s=r;else{let p=r;const g=r.match(/\n\nBest regards,/);g&&(p=r.substring(0,g.index+g[0].length).trim());const m=ue(p),u=k("html");s=`<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
</head>
<body>
<div dir="ltr" style="font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);">
${m}
</div>
<div id="ms-outlook-mobile-signature">
${u}
</div>
</body>
</html>`}const c=y.userProfile.name||`${se()} ${Fe()}`,i=y.userProfile.email||"store@citizenwatchgroup.com";xt(c,i,"","",n,s,[]).then(p=>{const g=new Blob([p],{type:"message/rfc822"}),m=URL.createObjectURL(g),u=document.createElement("a");u.href=m;const v=n.replace(/[^a-z0-9]/gi,"_").toLowerCase(),f=Pt()==="emltpl"?".emltpl":".eml";u.download=`${v}${f}`,u.click(),URL.revokeObjectURL(m)})}function Wo(){Bt(),At(),Rt(),Ve();const t=localStorage.getItem("selectedTemplate");t&&B[t]&&le(t)}function Ht(){const t=document.getElementById("emailPreview");t&&me(t)}function zt(){return`
    /* Simulate email client dark mode - invert light backgrounds and text */
    body {
      background-color: #1a1a1a !important;
      color: #e0e0e0 !important;
    }
    .email-container {
      background-color: #1a1a1a !important;
    }
    .email-header {
      background-color: #2d2d2d !important;
      border-bottom-color: #444444 !important;
    }
    .email-subject {
      color: #e0e0e0 !important;
    }
    .email-body {
      color: #e0e0e0 !important;
    }
    .email-body a {
      color: #6699ff !important;
    }
  `}function X(){const t=document.getElementById("outputArea"),e=document.getElementById("emailPreview"),o=document.querySelector('.output-tab[data-tab="preview"]'),n=document.getElementById("previewContent"),r=document.getElementById("htmlContent");if(!t||!e)return;const a=t.value;if(!a){me(e);return}const s=Ye(a),c=document.querySelector('.output-tab[data-tab="html"]');if(o){o.disabled=!1,o.style.opacity="1",o.style.cursor="pointer",o.classList.add("active"),c&&c.classList.remove("active"),n&&n.classList.add("active"),r&&r.classList.remove("active");let i;if(s)i=Ct(a);else{let m="Email Preview",u=a;const v=a.match(/^Subject:\s*(.+)/m);v&&(m=v[1],u=a.replace(/^Subject:.+\n/m,"").trim());let w=u;const f=w.match(/\n\nBest regards,/);if(f)w=w.substring(0,f.index+f[0].length).trim();else{const L=w.match(/______+/);if(L){const N=w.substring(0,L.index),V=N.lastIndexOf(`

`);V!==-1&&(w=N.substring(0,V).trim())}}const h=ue(w),I=k("html");i=`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${T(m)}</title>
    <style>
        body {
            font-family: Aptos, Arial, Helvetica, sans-serif;
            font-size: 12pt;
            color: rgb(0, 0, 0);
            margin: 0;
            padding: 20px;
            background-color: #ffffff;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
        }
        .email-header {
            padding: 10px;
            background-color: #f5f5f5;
            border-bottom: 2px solid #ddd;
            margin-bottom: 20px;
        }
        .email-subject {
            font-size: 14pt;
            font-weight: 600;
            color: #333;
        }
        .email-body a {
            color: #0000ee;
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <div class="email-subject">${T(m)}</div>
        </div>
        <div class="email-body">
            ${h}
            <div style="margin-top: 5px; padding-top: 10px;">
                ${I}
            </div>
        </div>
    </div>
</body>
</html>`}const p=document.documentElement.getAttribute("data-theme")||"light";let g=i;p==="dark"&&(g=i.replace("</head>",`<style id="dark-mode-sim">${zt()}</style></head>`)),e.srcdoc=g}}function Rt(){const t={"Customer Email":[],"Phone Orders":[],Text:[]};Object.keys(B).forEach(e=>{const o=B[e];t[o.category].push({key:e,name:o.name})}),d.templateSelect.innerHTML='<option value="">Select a template...</option>',Object.keys(t).forEach(e=>{if(t[e].length>0){const o=document.createElement("optgroup");o.label=e,t[e].forEach(n=>{const r=document.createElement("option");r.value=n.key,r.textContent=n.name,r.title=ht[n.key]||"",o.appendChild(r)}),d.templateSelect.appendChild(o)}})}function Ce(t){if(!t.trim()){d.searchResults.classList.remove("visible"),d.resultCounter.textContent="",d.clearSearch.classList.remove("visible"),d.searchBox.classList.remove("active");return}d.clearSearch.classList.add("visible"),d.searchBox.classList.add("active");const e=t.toLowerCase(),o=Object.keys(B).filter(a=>{const s=B[a];return s.name.toLowerCase().includes(e)||s.category.toLowerCase().includes(e)});let n="";if(o.length===0)n='<div class="search-result-item" style="cursor: default; color: var(--text-tertiary);">No templates found</div>',d.resultCounter.textContent="0 templates found";else{n=o.map(i=>{const p=B[i],g=P(p.name),m=P(p.category);return`
                <div class="search-result-item" data-template-key="${S(i)}">
                    <div class="search-result-name">${g}</div>
                    <div class="search-result-category">${m}</div>
                </div>
            `}).join("");const s=o.length,c=s===1?"":"s";d.resultCounter.textContent=`${s} template${c} found`}const r=d.resultCounter;d.searchResults.innerHTML=n,d.searchResults.appendChild(r),d.searchResults.classList.add("visible")}let ke=null,Be=!1;function le(t){try{if(!t||!B[t]){console.warn("Invalid template key:",t);return}if(t===ke&&Be)return;Be=!0,ke=t,D=t;const e=B[t];Ht(),window.originalMessageContent="";const o=te("outputArea");o&&(o.value=""),localStorage.setItem("selectedTemplate",t),d.templateSelect.value=t;const n=document.querySelector(".section-header-with-controls");if(n){const i=document.createElement("h2");i.id="formSectionTitle",i.className="section-title",i.textContent=`${e.name} Fields`,n.replaceWith(i),d.formSectionTitle=i}else d.formSectionTitle.textContent=`${e.name} Fields`;const r=document.getElementById("formPlaceholder");r&&r.remove(),We();const a=e.fields.map(i=>{const p=i.replace(/([A-Z])/g," $1").trim(),g=p.charAt(0).toUpperCase()+p.slice(1),m=i.includes("address")||i.includes("Address")||i.includes("Details"),u=i.includes("Verified")||i.includes("Verification"),v=He[i]||{},w=m?" full-width":"",f=v.required?" *":"",h=S(i),I=S(v.example||"");if(u)return`
                    <div class="form-group radio-field">
                        <label class="form-label">${P(g)}${f}</label>
                        <div class="radio-group" data-field="${h}">
                            <div class="radio-option">
                                <input type="radio" id="${h}-yes" name="${h}" value="yes" data-field="${h}">
                                <label for="${h}-yes">Yes</label>
                            </div>
                            <div class="radio-option">
                                <input type="radio" id="${h}-no" name="${h}" value="no" data-field="${h}">
                                <label for="${h}-no">No</label>
                            </div>
                        </div>
                    </div>
                `;const L=yt(i),N=`datalist-${h}`;let V="";if(L.length>0){const tt=L.map(ot=>`<option value="${S(ot)}">`).join("");V=`
                <datalist id="${N}">
                    ${tt}
                </datalist>
            `}let J="";y.userProfile&&((i==="employeeName"||i==="yourName")&&y.userProfile.employeeName?J=S(y.userProfile.employeeName):i==="storePhone"&&y.userProfile.storePhone?J=S(y.userProfile.storePhone):i==="storeName"&&y.userProfile.storeName&&(J=S(y.userProfile.storeName)));const et=m?`<textarea id="${h}" class="form-textarea" data-field="${h}" ${v.required?"required":""} placeholder="${I}">${J}</textarea>`:`<input type="text" id="${h}" class="form-input" data-field="${h}" ${v.required?"required":""} placeholder="${I}" value="${J}" list="${N}">${V}`;return`
                <div class="form-group${w}">
                    <label class="form-label" for="${h}">${P(g)}${f}</label>
                    <div class="input-wrapper">
                        ${et}
                        <button class="clear-input" data-clear="${h}" title="Clear">×</button>
                    </div>
                    <div class="calculated-value" data-calc="${h}" style="display: none;"></div>
                    <div class="error-message" data-error="${h}" style="display: none;"></div>
                </div>
            `});d.formFields.innerHTML=a.join(""),setTimeout(()=>{Ve()},0),d.formFields.addEventListener("click",i=>{if(i.target.classList.contains("clear-input")){const p=i.target.dataset.clear,g=document.getElementById(p);g&&(g.value="",i.target.classList.remove("visible"),g.focus(),X())}}),d.formFields.addEventListener("input",i=>{if(i.target.classList.contains("form-input")||i.target.classList.contains("form-textarea")){const p=i.target.id,g=d.formFields.querySelector(`[data-clear="${p}"]`);g&&g.classList.toggle("visible",i.target.value.trim().length>0)}}),d.formFields.querySelectorAll(".form-input, .form-textarea").forEach(i=>{const p=d.formFields.querySelector(`[data-clear="${i.id}"]`);p&&i.value.trim().length>0&&p.classList.add("visible")});const c=document.getElementById("outputArea");c&&(c.value=""),d.clearBtn.disabled=!1}catch(e){console.error("Error selecting template:",e),M("Error loading template")}}function qt(){const t=document.getElementById("outputArea");if(!t){console.error("outputArea element not found"),M("⚠ Output area not found");return}const e=t.value;if(!e){M("⚠ Nothing to copy");return}if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(e).then(()=>{M("✓ Copied!")}).catch(o=>{console.error("Clipboard error:",o),M("⚠ Copy failed")});else try{t.select();const o=document.execCommand("copy");M(o?"✓ Copied!":"⚠ Copy failed")}catch(o){console.error("Copy error:",o),M("⚠ Copy not supported")}}const l={promotionEntries:[],specialHours:[],howToShopItems:[],importantNotesItems:[],attachedPDFs:[],generatedSubjectLines:[],selectedSubjectLine:null,howToShopExpanded:!1,importantNotesExpanded:!1,entryCollapsedStates:{},columnState:"left-expanded"};function j(t){return JSON.parse(JSON.stringify(t))}function Ot({promoDateRange:t="",promoYear:e="",promoTitle:o="",bulkEmailRecipients:n="",promotionEntries:r=[],specialHours:a=[],howToShopItems:s=[],importantNotesItems:c=[],attachedPDFs:i=[],generatedSubjectLines:p=[],selectedSubjectLine:g=null,now:m=new Date}){const u=n||"",v=i.map(w=>({id:w.id,name:w.name,size:w.size,type:w.type}));return{templateType:"promotion-email",version:"1.0",savedAt:m.toISOString(),dateRange:t||"",year:e||"",title:o||"",bulkEmailRecipients:u,promotionEntries:j(r),specialHours:j(a),howToShopItems:j(s),importantNotesItems:j(c),attachedPDFs:j(v),generatedSubjectLines:j(p),selectedSubjectLine:g}}function _t({promoDateRange:t="",promoYear:e="",promoTitle:o="",bulkEmailRecipients:n="",promotionEntries:r=[],specialHours:a=[],howToShopItems:s=[],importantNotesItems:c=[],attachedPDFs:i=[],generatedSubjectLines:p=[],selectedSubjectLine:g=null,now:m=new Date}){return{templateType:"promotion-email",version:"1.0",exportedAt:m.toISOString(),dateRange:t||"",year:e||"",title:o||"",promotionEntries:j(r),specialHours:j(a),attachedPDFs:j(i),generatedSubjectLines:j(p),selectedSubjectLine:g}}function Ut(t){if(!t||typeof t!="object")return{ok:!1,reason:"notObject"};const e=j(t);if(e.templateType&&e.templateType!=="promotion-email")return{ok:!1,reason:"wrongType"};function o(r,a){if(!Array.isArray(e[r])){if(e[r]!==void 0)return a;e[r]=[]}return null}const n=[o("promotionEntries","promotionEntriesNotArray"),o("specialHours","specialHoursNotArray"),o("howToShopItems","howToShopItemsNotArray"),o("importantNotesItems","importantNotesItemsNotArray")].filter(Boolean);return n.length>0?{ok:!1,reason:n[0]}:(Array.isArray(e.attachedPDFs)||(e.attachedPDFs=[]),Array.isArray(e.generatedSubjectLines)||(e.generatedSubjectLines=[]),{ok:!0,config:e})}function ne(t){t.querySelectorAll(".clear-input").forEach(e=>{const o=e.dataset.clear,n=document.getElementById(o);if(!n)return;const r=()=>{e.classList.toggle("visible",n.value.trim().length>0)};r(),n.addEventListener("input",r),e.addEventListener("click",()=>{n.value="",e.classList.remove("visible"),n.focus(),n.dispatchEvent(new Event("input",{bubbles:!0}))})})}function O(t,e,o,n="id"){const r=t.findIndex(a=>a[n]===e);return o==="up"&&r>0?([t[r-1],t[r]]=[t[r],t[r-1]],!0):o==="down"&&r<t.length-1?([t[r],t[r+1]]=[t[r+1],t[r]],!0):!1}function pe(t,e,o,n=".editable-item-row"){let r=null,a=null,s=!1;t.addEventListener("mousedown",c=>{s=!!c.target.closest(".drag-handle")}),t.addEventListener("mouseup",()=>{s=!1}),t.addEventListener("dragstart",c=>{const i=c.target.closest(n);if(i){if(!s){c.preventDefault();return}r=i,a=parseInt(i.dataset.itemId||i.dataset.entryId,10),i.classList.add("dragging"),c.dataTransfer.effectAllowed="move"}}),t.addEventListener("dragend",c=>{const i=c.target.closest(n);i&&(i.classList.remove("dragging"),t.querySelectorAll(n).forEach(p=>p.classList.remove("drag-over")))}),t.addEventListener("dragover",c=>{c.preventDefault(),c.dataTransfer.dropEffect="move";const i=c.target.closest(n);i&&r!==i&&i.classList.add("drag-over")}),t.addEventListener("dragleave",c=>{const i=c.target.closest(n);i&&i.classList.remove("drag-over")}),t.addEventListener("drop",c=>{c.preventDefault();const i=c.target.closest(n);if(i&&(i.classList.remove("drag-over"),r!==i)){const p=parseInt(i.dataset.itemId||i.dataset.entryId,10),g=e.findIndex(u=>u.id===a),m=e.findIndex(u=>u.id===p);if(g!==-1&&m!==-1){const[u]=e.splice(g,1);e.splice(m,0,u),o()}}})}function Yt(){const t=localStorage.getItem("userProfile");return t?JSON.parse(t):null}function fe(){const t=Yt();return t?.storeEmail?t.storeEmail:t?.storeName?`${t.storeName.toLowerCase().replace(/\s+/g,"")}@citizenwatchgroup.com`:"store@citizenwatchgroup.com"}function Ke(){const t=navigator.platform.toLowerCase();return t.includes("win")?"windows":t.includes("mac")?"mac":"other"}function Wt(){return Ke()==="mac"?"emltpl":"eml"}function Vt(){const t=document.getElementById("formatStatusText");if(!t)return;const e=Ke(),o=Wt(),n=o==="emltpl"?"Template":"EML",r=o==="emltpl"?".emltpl":".eml";let a="Unknown";e==="windows"?a="Windows":e==="mac"?a="macOS":a="Other Platform",t.innerHTML=`<strong>${n} Format:</strong> Optimized for ${a} (${r} files)`}function Jt(t,e){let o;return function(...r){const a=()=>{clearTimeout(o),t(...r)};clearTimeout(o),o=setTimeout(a,e)}}function b(t,e=2500){const o=document.getElementById("toast");if(!o){console.warn("Toast element not found");return}o.textContent=t,o.classList.add("show"),setTimeout(()=>{o.classList.remove("show")},e)}function ge(t){if(!t)return;const e=t.contentDocument||t.contentWindow.document;if(!e)return;const o=getComputedStyle(document.documentElement),n=o.getPropertyValue("--bg-tertiary").trim()||"#f8f3ef",r=o.getPropertyValue("--text-primary").trim()||"#2a2420",a=o.getPropertyValue("--text-secondary").trim()||"#666";e.open(),e.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: 'Aptos', Arial, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                    margin: 0;
                    background: ${n};
                    color: ${a};
                    text-align: center;
                    padding: 2rem;
                }
                .empty-state {
                    max-width: 400px;
                }
                .empty-state svg {
                    width: 80px;
                    height: 80px;
                    margin-bottom: 1rem;
                    opacity: 0.3;
                }
                .empty-state h3 {
                    font-size: 1.2rem;
                    margin: 0 0 0.5rem 0;
                    color: ${r};
                }
                .empty-state p {
                    font-size: 0.9rem;
                    margin: 0;
                    color: ${a};
                }
            </style>
        </head>
        <body>
            <div class="empty-state">
                ${ze({size:80})}
                <h3>No Preview Yet</h3>
                <p>Begin filling in the promotion details to start seeing a preview</p>
            </div>
        </body>
        </html>
    `),e.close()}let K=null,U=null;function Kt(){return`
    /* Simulate email client dark mode - invert light backgrounds and text */
    body {
      background-color: #1a1a1a !important;
      color: #e0e0e0 !important;
    }
    table {
      background-color: #1a1a1a !important;
    }
    /* Invert light gray backgrounds */
    [style*="background-color: #f5f5f5"],
    [style*="background-color:#f5f5f5"] {
      background-color: #2d2d2d !important;
    }
    [style*="background-color: #f4f4f4"],
    [style*="background-color:#f4f4f4"] {
      background-color: #2a2a2a !important;
    }
    [style*="background-color: white"],
    [style*="background-color:#ffffff"],
    [style*="background-color: #ffffff"] {
      background-color: #1a1a1a !important;
    }
    /* Invert dark text to light */
    [style*="color: #333333"],
    [style*="color:#333333"],
    [style*="color: #333"] {
      color: #e0e0e0 !important;
    }
    /* Invert light borders */
    [style*="border: 1px solid #ddd"] {
      border-color: #444444 !important;
    }
    [style*="border-bottom: 2px solid gray"] {
      border-bottom-color: #555555 !important;
    }
    /* Keep dark footer as-is (already dark) */
    [style*="background-color: #2c3e50"] {
      background-color: #2c3e50 !important;
    }
    /* Ensure white text in footer stays white */
    [style*="color: white"] {
      color: white !important;
    }
    /* Keep gold accent color */
    [style*="color: #ffd700"] {
      color: #ffd700 !important;
    }
  `}function E(){if(D!=="promotion-email")return;const t=document.getElementById("previewIframe");if(!t)return;const e=document.getElementById("promoDateRange");if(!e||!e.value.trim()){ge(t);return}const o=document.getElementById("promoYear"),n=document.getElementById("promoTitle"),r={promoDateRange:e.value,promoYear:o?o.value:"",promoTitle:n?n.value:""},a=ko(r),s=document.getElementById("codeArea");s&&(s.value=a);const c=document.documentElement.getAttribute("data-theme")||"light";let i=a;c==="dark"&&(i=a.replace("</head>",`<style id="dark-mode-sim">${Kt()}</style></head>`));const p=t.contentDocument||t.contentWindow.document;p.open(),p.write(i),p.close(),l.generatedSubjectLines.length===0&&To()}const re=Jt(E,500);async function Gt(){if(D!=="promotion-email")return;if(l.promotionEntries.forEach(n=>{l.entryCollapsedStates[n.id]=!0}),H(),l.attachedPDFs.length>0&&x){for(const n of l.attachedPDFs)if(n.data)try{await ce(n),console.log(`Re-saved PDF ${n.name} to IndexedDB during template save`)}catch(r){console.warn(`Failed to save PDF ${n.name} to IndexedDB:`,r)}}const t=document.getElementById("bulkEmailList"),e=t?t.value:"",o=Ot({promoDateRange:document.getElementById("promoDateRange")?.value||"",promoYear:document.getElementById("promoYear")?.value||"",promoTitle:document.getElementById("promoTitle")?.value||"",bulkEmailRecipients:e,promotionEntries:l.promotionEntries,specialHours:l.specialHours,howToShopItems:l.howToShopItems,importantNotesItems:l.importantNotesItems,attachedPDFs:l.attachedPDFs,generatedSubjectLines:l.generatedSubjectLines,selectedSubjectLine:l.selectedSubjectLine});try{e&&x&&await it(e)}catch(n){console.warn("Failed to save bulk email recipients to IndexedDB during template save:",n)}localStorage.setItem("savedPromotionTemplate",JSON.stringify(o)),b("✓ Template saved successfully")}function Zt(){if(D!=="promotion-email")return;const t=document.createElement("input");t.type="file",t.accept=".json,application/json",t.style.display="none",t.addEventListener("change",e=>{const o=e.target.files[0];if(!o)return;const n=new FileReader;n.onload=r=>{try{const a=JSON.parse(r.target.result);if(!a||typeof a!="object"){b("✗ Invalid template file - not a valid configuration object");return}if(a.templateType&&a.templateType!=="promotion-email"){b("✗ Invalid template file - not a promotion email template");return}if(!("promotionEntries"in a)||!("specialHours"in a)){b("✗ Invalid template file - missing required promotion template fields");return}Ge(a,!0),b("✓ Template imported from file successfully")}catch(a){console.error("Import error:",a),b("✗ Error reading template file - Invalid JSON or corrupted file")}},n.onerror=()=>{b("✗ Error reading file")},n.readAsText(o)}),document.body.appendChild(t),t.click(),setTimeout(()=>{document.body.removeChild(t)},1e3)}async function Ge(t,e=!0){const o=Ut(t);if(!o.ok){switch(o.reason){case"notObject":b("✗ Invalid template data - not an object");break;case"wrongType":b("✗ Invalid template data - wrong template type");break;case"promotionEntriesNotArray":b("✗ Invalid template data - promotionEntries must be an array");break;case"specialHoursNotArray":b("✗ Invalid template data - specialHours must be an array");break;case"howToShopItemsNotArray":b("✗ Invalid template data - howToShopItems must be an array");break;case"importantNotesItemsNotArray":b("✗ Invalid template data - importantNotesItems must be an array");break;default:b("✗ Invalid template data")}return}const n=o.config;setTimeout(()=>{const s=document.getElementById("promoDateRange"),c=document.getElementById("promoYear"),i=document.getElementById("promoTitle"),p=document.getElementById("bulkEmailList");if(s){s.value=n.dateRange||"";const g=document.querySelector('[data-clear="promoDateRange"]');g&&s.value.trim()&&g.classList.add("visible")}if(c){c.value=n.year||"";const g=document.querySelector('[data-clear="promoYear"]');g&&c.value.trim()&&g.classList.add("visible")}if(i){i.value=n.title||"";const g=document.querySelector('[data-clear="promoTitle"]');g&&i.value.trim()&&g.classList.add("visible")}p&&n.bulkEmailRecipients!=null&&(Array.isArray(n.bulkEmailRecipients)?p.value=n.bulkEmailRecipients.join(", "):typeof n.bulkEmailRecipients=="string"&&(p.value=n.bulkEmailRecipients),p.value&&p.dispatchEvent(new Event("input",{bubbles:!0}))),E()},100),l.promotionEntries=JSON.parse(JSON.stringify(n.promotionEntries||[])),l.specialHours=JSON.parse(JSON.stringify(n.specialHours||[])),n.howToShopItems&&n.howToShopItems.length>0&&(l.howToShopItems=JSON.parse(JSON.stringify(n.howToShopItems))),n.importantNotesItems&&n.importantNotesItems.length>0&&(l.importantNotesItems=JSON.parse(JSON.stringify(n.importantNotesItems))),he(),Xe(),l.generatedSubjectLines=JSON.parse(JSON.stringify(n.generatedSubjectLines||[])),l.selectedSubjectLine=n.selectedSubjectLine||null;const r=new Set(l.attachedPDFs.map(s=>s.id));l.attachedPDFs=[];const a=n.attachedPDFs||[];if(a.length>0){let s=0;for(;!x&&s<20;)await new Promise(c=>setTimeout(c,50)),s++;x||console.warn("IndexedDB not initialized after waiting, PDFs may not have data")}for(const s of a)if(!r.has(s.id))if(s.data){l.attachedPDFs.push(s);try{await ce(s)}catch(c){console.warn(`Failed to save PDF ${s.name} to IndexedDB:`,c)}}else try{const c=await at(s.id);c&&c.data?l.attachedPDFs.push(c):console.warn(`PDF ${s.name} (ID: ${s.id}) data not found in IndexedDB or config, skipping.`)}catch(c){console.warn(`Failed to restore PDF ${s.name} from IndexedDB:`,c)}l.attachedPDFs=l.attachedPDFs.filter(s=>s.data),e&&(l.entryCollapsedStates={},l.promotionEntries.forEach(s=>{l.entryCollapsedStates[s.id]=!0})),H(),Y(),A(),F(),Q(),ae(),E()}function Xt(){if(D!=="promotion-email")return;const t=document.getElementById("bulkEmailList"),e=t?t.value:"",o=_t({promoDateRange:document.getElementById("promoDateRange")?.value||"",promoYear:document.getElementById("promoYear")?.value||"",promoTitle:document.getElementById("promoTitle")?.value||"",bulkEmailRecipients:e,promotionEntries:l.promotionEntries,specialHours:l.specialHours,howToShopItems:l.howToShopItems,importantNotesItems:l.importantNotesItems,attachedPDFs:l.attachedPDFs,generatedSubjectLines:l.generatedSubjectLines,selectedSubjectLine:l.selectedSubjectLine}),n=JSON.stringify(o,null,2),r=new Blob([n],{type:"application/json"}),a=URL.createObjectURL(r),s=document.createElement("a");s.href=a,s.download=`promotion-template-${new Date().toISOString().split("T")[0]}.json`,s.click(),URL.revokeObjectURL(a),b("✓ Template exported successfully")}function Qt(t){if(!t)return"WEEKLY SALE";const e=t.toLowerCase();return e.includes("nov")&&(e.includes("24")||e.includes("25")||e.includes("26")||e.includes("27")||e.includes("28")||e.includes("29"))?"BLACK FRIDAY OUTLET EVENT":e.includes("nov")&&e.includes("30")||e.includes("dec")&&e.includes("1")&&!e.includes("10")?"CYBER MONDAY SALE":e.includes("dec")?"HOLIDAY SALE EVENT":e.includes("jun")||e.includes("jul")||e.includes("aug")?"SUMMER CLEARANCE":e.includes("aug")&&(e.includes("20")||e.includes("2")||e.includes("3"))||e.includes("sep")&&(e.includes("1")||e.includes("2")||e.includes("3")||e.includes("4")||e.includes("5")||e.includes("6")||e.includes("7")||e.includes("8")||e.includes("9"))?"BACK TO SCHOOL SALE":"WEEKLY SALE"}function Ze(){const t=Date.now();l.promotionEntries.push({id:t,line:"",collections:"",callout:""}),H()}function eo(t){l.promotionEntries=l.promotionEntries.filter(e=>e.id!==t),H()}function to(t){O(l.promotionEntries,t,"up")&&H()}function oo(t){O(l.promotionEntries,t,"down")&&H()}function no(t){const e=!l.entryCollapsedStates[t];l.entryCollapsedStates[t]=e;const o=document.querySelector(`.promotion-entry[data-entry-id="${t}"]`);if(o){const n=o.querySelector(".entry-fields"),r=o.querySelector(".collapse-btn"),a=o.querySelector(".entry-header-left");n&&(n.style.display=e?"none":"grid"),r&&(r.textContent=e?"Expand":"Collapse",r.title=e?"Expand":"Collapse"),o.classList.toggle("collapsed",e);let s=a?.querySelector(".entry-summary");if(e){if(!s&&a){const i=l.promotionEntries.find(p=>p.id===t)?.line?.trim()||"Entry not filled out";s=document.createElement("span"),s.className="entry-summary",s.textContent=i,a.appendChild(s)}}else s&&s.remove()}}function De(t){const e=parseInt(t.target.dataset.entryId),o=l.promotionEntries.find(n=>n.id===e);o&&(t.target.classList.contains("entry-line")?o.line=t.target.value:t.target.classList.contains("entry-collections")?o.collections=t.target.value:t.target.classList.contains("entry-callout")&&(o.callout=t.target.value))}function H(){const t=document.getElementById("promotionEntriesContainer");t&&(t.innerHTML=l.promotionEntries.map((e,o)=>{const n=S(String(e.id)),r=o===0,a=o===l.promotionEntries.length-1,s=l.entryCollapsedStates[e.id]||!1;let c="";return e.line&&e.line.trim()?c=e.line.trim():c="Entry not filled out",`
            <div class="promotion-entry ${s?"collapsed":""}" data-entry-id="${n}" draggable="true">
                <div class="entry-header">
                    <div class="entry-header-left">
                        <div class="drag-handle" title="Drag to reorder">
                            ${de({size:16})}
                        </div>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-up" data-entry-id="${e.id}" title="Move up" ${r?"disabled":""}>${q("up",{size:10})}</button>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-down" data-entry-id="${e.id}" title="Move down" ${a?"disabled":""}>${q("down",{size:10})}</button>
                        <span class="entry-number">Entry ${o+1}</span>
                        ${s?`<span class="entry-summary">${T(c)}</span>`:""}
                    </div>
                    <div class="entry-controls">
                        <button type="button" class="collapse-btn btn-base btn-secondary-base btn-xs" data-action="toggle-collapse" data-entry-id="${e.id}" title="${s?"Expand":"Collapse"}">
                            ${s?"Expand":"Collapse"}
                        </button>
                        <button type="button" class="entry-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove" data-entry-id="${e.id}" title="Remove" aria-label="Remove entry">
                            ${Z({size:16})}
                        </button>
                    </div>
                </div>

                <div class="entry-fields" style="display: ${s?"none":"grid"};">
                    <div class="form-group full-width">
                        <label class="form-label" for="entry-${n}-line">Promotion Line *</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-input entry-line" id="entry-${n}-line" name="entry-${n}-line" data-entry-id="${n}" value="${S(e.line||"")}" placeholder="CITIZEN – ADDITIONAL 20% OFF">
                            <button class="clear-input" data-clear="entry-${n}-line" title="Clear">×</button>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label class="form-label" for="entry-${n}-collections">Collections (comma-separated)</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-input entry-collections" id="entry-${n}-collections" name="entry-${n}-collections" data-entry-id="${n}" value="${S(e.collections)}" placeholder="Corso, Avion, Marine Star">
                            <button class="clear-input" data-clear="entry-${n}-collections" title="Clear">×</button>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label class="form-label" for="entry-${n}-callout">Special Callout (optional)</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-input entry-callout" id="entry-${n}-callout" name="entry-${n}-callout" data-entry-id="${n}" value="${S(e.callout)}" placeholder="Final sale items excluded">
                            <button class="clear-input" data-clear="entry-${n}-callout" title="Clear">×</button>
                        </div>
                    </div>
                </div>
            </div>
        `}).join(""),t.querySelectorAll(".entry-line, .entry-collections, .entry-callout").forEach(e=>{e.addEventListener("input",o=>{De(o),re()}),e.addEventListener("change",o=>{De(o),E()})}),pe(t,l.promotionEntries,H,".promotion-entry"),t.querySelectorAll("[data-action]").forEach(e=>{e.addEventListener("click",o=>{const n=o.currentTarget.dataset.action,r=parseInt(o.currentTarget.dataset.entryId);switch(n){case"move-up":to(r);break;case"move-down":oo(r);break;case"toggle-collapse":no(r);break;case"remove":eo(r);break}})}),ne(t),E())}function ro(){const t=Date.now();l.specialHours.push({id:t,day:"",hours:""}),Y()}function ao(t){l.specialHours=l.specialHours.filter(e=>e.id!==t),Y()}function io(t){O(l.specialHours,t,"up")&&Y()}function so(t){O(l.specialHours,t,"down")&&Y()}function lo(t){const e=parseInt(t.target.dataset.hourId),o=l.specialHours.find(n=>n.id===e);o&&(t.target.classList.contains("hour-day")?o.day=t.target.value:t.target.classList.contains("hour-hours")&&(o.hours=t.target.value))}function Y(){const t=document.getElementById("specialHoursListContainer");if(!t)return;t.innerHTML=l.specialHours.map((o,n)=>{const r=S(String(o.id)),a=n===0,s=n===l.specialHours.length-1;return`
            <div class="special-hour-row" data-hour-id="${r}">
                <div class="special-hour-fields">
                    <div class="form-group">
                        <div class="input-wrapper">
                            <input type="text" class="form-input hour-day" id="hour-${r}-day" name="hour-${r}-day" data-hour-id="${r}" value="${S(o.day)}" placeholder="e.g., Friday Nov 29">
                            <button class="clear-input" data-clear="hour-${r}-day" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <div class="input-wrapper">
                            <input type="text" class="form-input hour-hours" id="hour-${r}-hours" name="hour-${r}-hours" data-hour-id="${r}" value="${S(o.hours)}" placeholder="e.g., 6AM–10PM or CLOSED">
                            <button class="clear-input" data-clear="hour-${r}-hours" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="hour-controls">
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-hour-up" data-hour-id="${o.id}" title="Move up" ${a?"disabled":""}>${q("up",{size:10})}</button>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-hour-down" data-hour-id="${o.id}" title="Move down" ${s?"disabled":""}>${q("down",{size:10})}</button>
                        <button type="button" class="hour-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove-hour" data-hour-id="${o.id}" title="Remove" aria-label="Remove special hour">
                            ${Z({size:16})}
                        </button>
                    </div>
                </div>
            </div>
        `}).join(""),t.querySelectorAll(".hour-day, .hour-hours").forEach(o=>{o.addEventListener("input",n=>{lo(n),re(),debouncedCaptureState()})}),t.querySelectorAll('[data-action^="move-hour"], [data-action="remove-hour"]').forEach(o=>{o.addEventListener("click",n=>{const r=n.currentTarget.dataset.action,a=parseInt(n.currentTarget.dataset.hourId);switch(r){case"move-hour-up":io(a);break;case"move-hour-down":so(a);break;case"remove-hour":ao(a);break}})}),ne(t),E();const e=document.getElementById("specialHoursReminder");e&&(e.style.display=l.specialHours.length>0?"block":"none")}function co(){const t=Date.now();l.howToShopItems.push({id:t,text:"",bold:!1,italic:!1,underline:!1}),A()}function uo(t){l.howToShopItems=l.howToShopItems.filter(e=>e.id!==t),A()}function mo(t){O(l.howToShopItems,t,"up")&&A()}function po(t){O(l.howToShopItems,t,"down")&&A()}function fo(t){const e=l.howToShopItems.find(o=>o.id===t);e&&(e.bold=!e.bold,A(),E())}function go(t){const e=l.howToShopItems.find(o=>o.id===t);e&&(e.italic=!e.italic,A(),E())}function ho(t){const e=l.howToShopItems.find(o=>o.id===t);e&&(e.underline=!e.underline,A(),E())}function yo(){const t=document.getElementById("howToShopItemsContainer");if(!t)return;t.innerHTML=l.howToShopItems.map((o,n)=>{const r=S(String(o.id)),a=n===0,s=n===l.howToShopItems.length-1;return`
            <div class="editable-item-row" data-item-id="${r}" draggable="true">
                <div class="entry-header">
                    <div class="entry-header-left">
                        <div class="drag-handle" title="Drag to reorder">
                            ${de({size:16})}
                        </div>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-up-how-to-shop" data-item-id="${o.id}" title="Move up" ${a?"disabled":""}>${q("up",{size:10})}</button>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-down-how-to-shop" data-item-id="${o.id}" title="Move down" ${s?"disabled":""}>${q("down",{size:10})}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-bold-how-to-shop" data-item-id="${o.id}" title="Bold" ${o.bold?'data-active="true"':""}>${Re({size:14})}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-italic-how-to-shop" data-item-id="${o.id}" title="Italic" ${o.italic?'data-active="true"':""}>${qe({size:14})}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-underline-how-to-shop" data-item-id="${o.id}" title="Underline" ${o.underline?'data-active="true"':""}>${Oe({size:14})}</button>
                    </div>
                    <div class="entry-controls">
                        <button type="button" class="item-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove-how-to-shop-item" data-item-id="${o.id}" title="Remove" aria-label="Remove shopping item">
                            ${Z({size:16})}
                        </button>
                    </div>
                </div>
                <div class="form-group" style="margin-top: 0.5rem;">
                    <div class="input-wrapper">
                        <input type="text" class="form-input shop-item-text" id="shop-item-${r}-text" name="shop-item-${r}-text" data-item-id="${r}" value="${S(o.text)}" placeholder="e.g., Visit us in-store for outlet-exclusive deals">
                        <button class="clear-input" data-clear="shop-item-${r}-text" title="Clear">×</button>
                    </div>
                </div>
            </div>
        `}).join(""),t.querySelectorAll(".shop-item-text").forEach(o=>{o.addEventListener("input",n=>{const r=parseInt(n.target.dataset.itemId),a=l.howToShopItems.find(s=>s.id===r);a&&(a.text=n.target.value,re())})}),pe(t,l.howToShopItems,A);const e=document.querySelector('[data-action="add-how-to-shop-item"]');e&&e.addEventListener("click",o=>{o.stopPropagation(),co()}),t.querySelectorAll('[data-action="remove-how-to-shop-item"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);uo(r)})}),t.querySelectorAll('[data-action="move-up-how-to-shop"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);mo(r)})}),t.querySelectorAll('[data-action="move-down-how-to-shop"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);po(r)})}),t.querySelectorAll('[data-action="toggle-bold-how-to-shop"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);fo(r)})}),t.querySelectorAll('[data-action="toggle-italic-how-to-shop"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);go(r)})}),t.querySelectorAll('[data-action="toggle-underline-how-to-shop"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);ho(r)})}),ne(t)}function A(){const t=document.getElementById("howToShopWrapper");t&&(t.innerHTML=`
    <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
        <button type="button" class="btn btn-base btn-primary-base" data-action="add-how-to-shop-item" style="padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Item</button>
    </div>
    <div id="howToShopItemsContainer"></div>
  `,yo(),E())}function bo(){const t=Date.now();l.importantNotesItems.push({id:t,text:"",bold:!1,italic:!1,underline:!1}),F()}function vo(t){l.importantNotesItems=l.importantNotesItems.filter(e=>e.id!==t),F()}function wo(t){O(l.importantNotesItems,t,"up")&&F()}function $o(t){O(l.importantNotesItems,t,"down")&&F()}function Eo(t){const e=l.importantNotesItems.find(o=>o.id===t);e&&(e.bold=!e.bold,F(),E())}function So(t){const e=l.importantNotesItems.find(o=>o.id===t);e&&(e.italic=!e.italic,F(),E())}function Io(t){const e=l.importantNotesItems.find(o=>o.id===t);e&&(e.underline=!e.underline,F(),E())}function xo(){const t=document.getElementById("importantNotesItemsContainer");if(!t)return;t.innerHTML=l.importantNotesItems.map((o,n)=>{const r=S(String(o.id)),a=n===0,s=n===l.importantNotesItems.length-1;return`
            <div class="editable-item-row" data-item-id="${r}" draggable="true">
                <div class="entry-header">
                    <div class="entry-header-left">
                        <div class="drag-handle" title="Drag to reorder">
                            ${de({size:16})}
                        </div>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-up-important-notes" data-item-id="${o.id}" title="Move up" ${a?"disabled":""}>${q("up",{size:10})}</button>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-down-important-notes" data-item-id="${o.id}" title="Move down" ${s?"disabled":""}>${q("down",{size:10})}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-bold-important-notes" data-item-id="${o.id}" title="Bold" ${o.bold?'data-active="true"':""}>${Re({size:14})}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-italic-important-notes" data-item-id="${o.id}" title="Italic" ${o.italic?'data-active="true"':""}>${qe({size:14})}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-underline-important-notes" data-item-id="${o.id}" title="Underline" ${o.underline?'data-active="true"':""}>${Oe({size:14})}</button>
                    </div>
                    <div class="entry-controls">
                        <button type="button" class="item-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove-important-notes-item" data-item-id="${o.id}" title="Remove" aria-label="Remove important note">
                            ${Z({size:16})}
                        </button>
                    </div>
                </div>
                <div class="form-group" style="margin-top: 0.5rem;">
                    <div class="input-wrapper">
                        <input type="text" class="form-input important-notes-item-text" id="important-notes-item-${r}-text" name="important-notes-item-${r}-text" data-item-id="${r}" value="${S(o.text)}" placeholder="e.g., Important safety information or key details">
                        <button class="clear-input" data-clear="important-notes-item-${r}-text" title="Clear">×</button>
                    </div>
                </div>
            </div>
        `}).join(""),t.querySelectorAll(".important-notes-item-text").forEach(o=>{o.addEventListener("input",n=>{const r=parseInt(n.target.dataset.itemId),a=l.importantNotesItems.find(s=>s.id===r);a&&(a.text=n.target.value,re())})}),pe(t,l.importantNotesItems,F);const e=document.querySelector('[data-action="add-important-notes-item"]');e&&e.addEventListener("click",o=>{o.stopPropagation(),bo()}),t.querySelectorAll('[data-action="remove-important-notes-item"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);vo(r)})}),t.querySelectorAll('[data-action="move-up-important-notes"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);wo(r)})}),t.querySelectorAll('[data-action="move-down-important-notes"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);$o(r)})}),t.querySelectorAll('[data-action="toggle-bold-important-notes"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);Eo(r)})}),t.querySelectorAll('[data-action="toggle-italic-important-notes"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);So(r)})}),t.querySelectorAll('[data-action="toggle-underline-important-notes"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);Io(r)})}),ne(t)}function F(){const t=document.getElementById("importantNotesWrapper");t&&(t.innerHTML=`
    <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
        <button type="button" class="btn btn-base btn-primary-base" data-action="add-important-notes-item" style="padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Item</button>
    </div>
    <div id="importantNotesItemsContainer"></div>
  `,xo(),E())}function Xe(){if(!y.userProfile||!y.userProfile.storeDirections)return;const t=y.userProfile.storeDirections.trim();if(!t)return;const e=t.toLowerCase();l.importantNotesItems.some(n=>{if(!n||!n.text)return!1;const r=n.text.toLowerCase();return r.includes(e)||r.includes("find us at")||r.includes("directions")})||l.importantNotesItems.push({id:Date.now()+14,text:`Find us at ${t}`,bold:!1,italic:!1,underline:!1})}function Vo(){const t=fe();l.howToShopItems.forEach(e=>{e.text&&e.text.startsWith("Email ")&&(e.text=`Email ${t}`)}),A()}function he(){if(l.howToShopItems.length===0){const t=_(),e=fe();l.howToShopItems=[{id:Date.now()+1,text:"Visit us in-store for outlet-exclusive deals",bold:!1,italic:!1,underline:!1},{id:Date.now()+2,text:`Call ${t} for availability`,bold:!1,italic:!1,underline:!1},{id:Date.now()+3,text:"$20 flat-rate ground shipping in US",bold:!1,italic:!1,underline:!1},{id:Date.now()+4,text:`Email ${e}`,bold:!1,italic:!1,underline:!1}]}l.importantNotesItems.length===0&&(l.importantNotesItems=[{id:Date.now()+10,text:"*Select models only",bold:!1,italic:!1,underline:!1},{id:Date.now()+11,text:"See attached PDF for complete model details",bold:!1,italic:!1,underline:!1},{id:Date.now()+12,text:"Limited availability - while supplies last",bold:!1,italic:!1,underline:!1},{id:Date.now()+13,text:"Email response time up to 48 hours",bold:!1,italic:!1,underline:!1}],Xe())}function Pe(t){let o=!1;for(const n of t){if(n.type!=="application/pdf"){b(`✗ ${n.name} is not a PDF file`),o=!0;continue}if(n.size>10485760){const a=(n.size/1048576).toFixed(2);b(`✗ ${n.name} is too large (${a}MB). Max size is 10MB.`),o=!0;continue}if(l.attachedPDFs.some(a=>a.name===n.name)){b(`⚠ ${n.name} is already attached`);continue}const r=new FileReader;r.onload=async a=>{const s={id:Date.now()+Math.random(),name:n.name,size:n.size,type:n.type,data:a.target.result};let c=0;for(;!x&&c<20;)await new Promise(i=>setTimeout(i,50)),c++;try{x?(await ce(s),console.log(`PDF ${n.name} saved to IndexedDB with ID:`,s.id)):(console.warn("IndexedDB not initialized, PDF will not persist after refresh"),b("⚠ PDF saved to memory but may not persist after refresh"))}catch(i){console.warn("Failed to save PDF to IndexedDB:",i),b("⚠ PDF saved to memory but may not persist after refresh")}l.attachedPDFs.push(s),Q(),!o&&t.length===1&&b(`✓ ${n.name} attached successfully`)},r.onerror=()=>{b(`✗ Error reading ${n.name}`)},r.readAsDataURL(n)}!o&&t.length>1&&b(`✓ ${t.length} PDFs attached successfully`)}function Q(){const t=document.getElementById("attachedPDFsList");if(t){if(l.attachedPDFs.length===0){t.innerHTML="";return}t.innerHTML=l.attachedPDFs.map(e=>{const o=(e.size/1024).toFixed(1),n=(e.size/(1024*1024)).toFixed(2),r=e.size>1024*1024?`${n} MB`:`${o} KB`,a=!!e.data,s=a?"pdf-name-clickable":"pdf-name-disabled",c=a?`Click to preview ${e.name}`:`${e.name} - Preview unavailable (data not loaded)`,i=a?"":'<span style="color: #ff9800; margin-left: 0.5rem;" title="Preview unavailable">⚠</span>';return`
            <div class="attached-pdf-item" data-pdf-id="${e.id}">
                <div class="pdf-icon">
                    ${Et()}
                </div>
                <div class="pdf-info">
                    <div class="pdf-name ${s}"
                         title="${c}"
                         ${a?'data-action="preview-pdf" data-pdf-id="'+e.id+'" role="button" tabindex="0"':""}>
                        ${e.name}${i}
                    </div>
                    <div class="pdf-size">${r}</div>
                </div>
                <button class="pdf-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove-pdf" data-pdf-id="${e.id}" title="Remove PDF" aria-label="Remove PDF attachment">
                    ${Z({size:16})}
                </button>
            </div>
        `}).join(""),t.querySelectorAll('[data-action="preview-pdf"]').forEach(e=>{e.addEventListener("click",o=>{const n=parseFloat(o.currentTarget.dataset.pdfId);Ae(n)}),e.addEventListener("keypress",o=>{if(o.key==="Enter"){const n=parseFloat(o.currentTarget.dataset.pdfId);Ae(n)}})}),t.querySelectorAll('[data-action="remove-pdf"]').forEach(e=>{e.addEventListener("click",o=>{const n=parseFloat(o.currentTarget.dataset.pdfId);Lo(n)})})}}async function Lo(t){const e=l.attachedPDFs.find(o=>o.id===t);if(e){try{await je(t)}catch(o){console.warn("Failed to delete PDF from IndexedDB:",o)}l.attachedPDFs=l.attachedPDFs.filter(o=>o.id!==t),Q(),b(`✓ ${e.name} removed`)}}function Ae(t){const e=l.attachedPDFs.find(s=>s.id===t);if(!e||!e.data){b("✗ PDF data not available for preview");return}K=e;const o=document.getElementById("pdfPreviewModal"),n=document.getElementById("pdfPreviewIframe"),r=document.getElementById("pdfPreviewTitle"),a=document.getElementById("pdfDownloadBtn");if(!o||!n||!r||!a){console.error("PDF preview modal elements not found");return}try{const s=atob(e.data.split(",")[1]),c=new Array(s.length);for(let m=0;m<s.length;m++)c[m]=s.charCodeAt(m);const i=new Uint8Array(c),p=new Blob([i],{type:"application/pdf"});U&&URL.revokeObjectURL(U),U=URL.createObjectURL(p),n.src=U;const g=document.getElementById("pdfLoadingIndicator");g&&setTimeout(()=>{g.style.display="none"},500)}catch(s){console.error("Error creating blob URL for PDF:",s),b("✗ Could not display PDF preview");return}r.textContent=e.name,o.style.display="flex",setTimeout(()=>{o.classList.add("active")},10),o.focus()}function ie(){const t=document.getElementById("pdfPreviewModal");t&&(t.classList.remove("active"),setTimeout(()=>{t.style.display="none"},300));const e=document.getElementById("pdfPreviewIframe");e&&(e.src="about:blank"),U&&(URL.revokeObjectURL(U),U=null),K=null}function Ne(){if(!K)return;const t=document.createElement("a");t.href=K.data,t.download=K.name,t.click()}function ae(){const t=document.getElementById("subjectLinesContainer");if(!t)return;if(l.generatedSubjectLines.length===0){t.innerHTML='<div class="subject-lines-empty">Generate your email template first to create subject line suggestions</div>';return}const e=document.getElementById("selectedSubjectInput"),o=e?e.value:null,n=o!==null?o:l.selectedSubjectLine||"",r=l.generatedSubjectLines.map((c,i)=>{const p=c===l.selectedSubjectLine;return`<option value="${i}" ${p?"selected":""}>${T(c)}</option>`}).join("");t.innerHTML=`
        <div class="subject-line-dropdown-wrapper">
            <label class="subject-dropdown-label" for="subjectLineDropdown">Choose a subject line suggestion:</label>
            <div class="select-wrapper">
                <select id="subjectLineDropdown" class="subject-line-dropdown">
                    <option value="" disabled ${l.selectedSubjectLine?"":"selected"}>Select a subject line...</option>
                    ${r}
                </select>
            </div>
        </div>
        <div id="selectedSubjectCard" class="selected-subject-card" style="display: ${n?"block":"none"};">
            <label class="subject-card-label" for="selectedSubjectInput">Selected Subject Line (customizable):</label>
            <div class="subject-card-input-wrapper">
                <input
                    type="text"
                    id="selectedSubjectInput"
                    class="subject-card-input"
                    value="${S(n)}"
                    placeholder="Your subject line..."
                    title="Edit the email subject line. Changes will be reflected in both Send Email and Download Email File options."
                >
                <div class="subject-card-meta">
                    <span class="char-count ${n&&n.length<=50?"optimal":"warning"}" id="subjectCharCount">
                        ${n?n.length:0} chars ${n&&n.length<=50?"✓":n&&n.length>50?"(>50)":""}
                    </span>
                </div>
            </div>
        </div>
    `;const a=document.getElementById("subjectLineDropdown");a&&a.addEventListener("change",c=>{const i=parseInt(c.target.value);i>=0&&i<l.generatedSubjectLines.length&&Co(i)});const s=document.getElementById("selectedSubjectInput");s&&s.addEventListener("input",c=>{l.selectedSubjectLine=c.target.value;const i=document.getElementById("subjectCharCount");if(i){const g=c.target.value.length,m=g<=50;i.className=`char-count ${m?"optimal":"warning"}`,i.textContent=`${g} chars ${m?"✓":"(>50)"}`}const p=document.getElementById("subjectLineDropdown");p&&(p.value="")})}function To(){const t=document.getElementById("promoDateRange")?.value||"",e=["Citizen","Bulova","Alpina","Frederique Constant"],o=[...new Set(l.promotionEntries.map(f=>f.line||"").flatMap(f=>e.filter(h=>f.toLowerCase().includes(h.toLowerCase()))).filter(Boolean))],n=/(\d+)[\s%]*%/,r=Math.max(0,...l.promotionEntries.map(f=>{const h=(f.line||"").match(n);return h&&parseInt(h[1],10)||0})),a=[],s={};l.promotionEntries.forEach(f=>{if(f.collections){const h=e.find(I=>(f.line||"").toLowerCase().includes(I.toLowerCase()));f.collections.split(",").forEach(I=>{const L=I.trim();L&&!a.includes(L)&&(a.push(L),h&&(s[h]||(s[h]=[]),s[h].push(L)))})}});const c=a.slice(0,3),i=l.promotionEntries.filter(f=>f.callout&&f.callout.trim()).map(f=>f.callout.toLowerCase()),p=i.some(f=>f.includes("limited")||f.includes("while supplies")),g=i.some(f=>f.includes("final")),m=f=>f>=50?`Up to ${f}% OFF`:f>=30?`Up to ${f}% OFF`:f>0?`Up to ${f}% OFF`:"Special Savings";let u=[];if(t){u.push(`Sale: ${t}`);const f=t.toLowerCase();(f.includes("fri")||f.includes("sat")||f.includes("sun"))&&u.push(`This Weekend: ${m(r)}`)}if(o.length>0&&r>0?o.length===1?u.push(`${o[0]}: ${m(r)}`):u.push(`${o[0]} & ${o[1]}: ${m(r)}`):o.length>0&&u.push(`${o[0]} Sale Event`),r>0&&u.push(`Up to ${r}% OFF This Week`),o.length>0&&c.length>0){const f=c.slice(0,3).join(", ");u.push(`${o[0]} including ${f}`)}if(o.length>=2&&s[o[0]]?.length>0&&s[o[1]]?.length>0){const f=s[o[0]][0],h=s[o[1]][0];u.push(`${o[0]} & ${o[1]} including ${f}, ${h}`)}p&&u.push("Limited Stock – Shop Now"),g&&u.push("Final Sale: Extra Savings Inside"),r>=30&&u.push(`Perfect Watch Gifts – Up to ${r}% OFF`),r>0&&u.push("Don't Miss These Watch Deals"),o.length>0&&u.push(`VIP Watch Sale: ${o[0]} & More`),u.push("Your New Watch Awaits"),r>=20&&u.push("Ready for a New Watch?"),u.length<3&&(r>0?u.push(`Up to ${r}% OFF – This Week Only`):u.push("New Deals This Week"));const v=[...new Set(u)],w=v.filter(f=>f.length<=60).sort((f,h)=>{const I=f.length>=20&&f.length<=45?0:1,L=h.length>=20&&h.length<=45?0:1;return I-L});l.generatedSubjectLines=w.length>0?w:v,l.selectedSubjectLine=l.generatedSubjectLines[0]||null,ae()}function Co(t){if(t>=0&&t<l.generatedSubjectLines.length){l.selectedSubjectLine=l.generatedSubjectLines[t];const e=document.getElementById("selectedSubjectCard");e&&(e.style.display="block");const o=document.getElementById("subjectLineDropdown");o&&(o.value=t);const n=document.getElementById("selectedSubjectInput");n&&(n.value=l.selectedSubjectLine);const r=document.getElementById("subjectCharCount");if(r){const a=l.selectedSubjectLine.length,s=a<=50;r.className=`char-count ${s?"optimal":"warning"}`,r.textContent=`${a} chars ${s?"✓":"(>50)"}`}}}function Me(t){let e=T(t.text);return t.bold&&(e=`<strong>${e}</strong>`),t.italic&&(e=`<em>${e}</em>`),t.underline&&(e=`<u>${e}</u>`),e}function ko(t){const e=t.promoDateRange||"",o=t.promoTitle&&t.promoTitle.trim()?T(t.promoTitle):Qt(e),n=t.promoYear&&t.promoYear.trim()?t.promoYear.trim():new Date().getFullYear(),r=_();let a="";l.promotionEntries.forEach(u=>{if(!u.line&&(u.brand||u.discount)){const w=u.brand||"",f=u.discount?`${u.discount.toString().trim()}% OFF`:"",h=[w,f].filter(I=>I&&I.trim());u.line=h.join(" – ")}if(!u.line||!u.line.trim())return;let v="";u.collections&&u.collections.trim()&&(v=u.collections.split(",").map(f=>T(f.trim())).filter(f=>f).map(f=>`*${f}`).join(" • ")),a+=`
                <p style="font-size: 18px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-bottom: 8px;"><b>${T(u.line)}</b></p>`,v&&(a+=`
                <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-left: 20px; margin-top: 0; margin-bottom: ${u.callout?"5px":"20px"};">
                    ${v}
                </p>`),u.callout&&u.callout.trim()&&(a+=`
                <p style="font-size: 13px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-left: 20px; margin-top: 0; margin-bottom: 20px; color: #0066cc; font-style: italic;">
                    ${T(u.callout)}
                </p>`)});let s="7400 Las Vegas Blvd. South, Suite 231<br>Las Vegas, NV 89123",c="https://www.google.com/maps?q=36.05145495363422,-115.16933573536541",i=fe(),p="Mon–Sat: 10AM–8PM | Sun: 10AM–7PM";if(y.userProfile){if(y.userProfile.storeAddress&&(s=y.userProfile.storeAddress.replace(/\n/g,"<br>")),y.userProfile.storeHours&&(p=y.userProfile.storeHours),y.userProfile.storePlusCode&&y.userProfile.storePlusCode.trim())c=`https://www.google.com/maps?q=${encodeURIComponent(y.userProfile.storePlusCode)}`;else if(y.userProfile.storeAddress&&y.userProfile.storeAddress.trim()){const u=y.userProfile.storeAddress.replace(/<br>/g," ").replace(/\n/g," ");c=`https://www.google.com/maps?q=${encodeURIComponent(u)}`}}let g=l.howToShopItems.filter(u=>u.text&&u.text.trim()).map(u=>`• ${Me(u)}`).join(`<br>
                    `),m=l.importantNotesItems.filter(u=>u.text&&u.text.trim()).map(u=>`• ${Me(u)}`).join(`<br>
                    `);return`<!DOCTYPE html>
<html>
<head>
    <title>Weekly Sale</title>
</head>
<body style="font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #333333; background-color: white; margin: 0; padding: 0;">

    <center>
    <table width="600" style="background-color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif;">

        <!-- HEADER -->
        <tr>
            <td style="padding: 20px; text-align: center; border-bottom: 2px solid gray;">
                <h1 style="font-size: 24px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">${o}</h1>
                <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 10px 0 0 0;">${e}, ${n} • While Supplies Last</p>
            </td>
        </tr>

        <!-- MAIN CONTENT -->
        <tr>
            <td style="padding: 25px;">

                <!-- BRAND SECTIONS -->
${a}

                <!-- HOW TO SHOP BOX -->
                <div style="background-color: #f5f5f5; color: #333333; padding: 15px; margin-bottom: 20px;">
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0 0 10px 0;"><b>HOW TO SHOP</b></p>
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">
                    ${g}</p>
                </div>

                <!-- IMPORTANT NOTES BOX -->
                <div style="border: 1px solid #ddd; color: #333333; padding: 15px;">
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0 0 10px 0;"><b>IMPORTANT NOTES</b></p>
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">
                    ${m}</p>
                </div>

            </td>
        </tr>

        <!-- FOOTER -->
        <tr>
            <td style="background-color: #2c3e50; padding: 20px; text-align: center;">
                <h3 style="color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 18px; margin: 0 0 10px 0;">CITIZEN COMPANY STORE</h3>
                <p style="color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 14px; margin: 5px 0;">
                    📍 <a href="${c}" target="_blank" style="color: white;">
                    ${s}</a>
                </p>
                <p style="color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 14px; margin: 5px 0;">
                    📞 <a href="tel:+1${r.replace(/\D/g,"")}" target="_blank" style="color: white;">${r}</a> |
                    📧 <a href="mailto:${i}" target="_blank" style="color: white;">${i}</a>
                </p>
                <p style="color: #ffd700; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 13px; margin: 10px 0 0 0;">
                    <b>STORE HOURS</b><br>
                    ${p}
                </p>${l.specialHours.length>0?`
                <p style="color: #ffd700; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 13px; margin: 10px 0 0 0;">
                    <b>SPECIAL HOURS</b><br>
                    ${l.specialHours.map(u=>u.day&&u.hours?`${u.day}: ${u.hours}`:"").filter(u=>u).join("<br>")}
                </p>`:""}
            </td>
        </tr>

        <!-- UNSUBSCRIBE -->
        <tr>
            <td style="background-color: #f4f4f4; padding: 15px; text-align: center;">
                <p style="font-size: 12px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; color: #333333; margin: 0;">
                    No longer interested? Simply reply to this email with <b>"UNSUBSCRIBE"</b>
                </p>
            </td>
        </tr>

    </table>
    </center>

</body>
</html>`}function Bo(){const t=document.getElementById("pdfSectionContainer");if(!t)return;t.innerHTML=`
    <div class="field-help" style="margin-bottom: 0.75rem;">Upload PDF files to attach to your promotional email (max 10MB per file)</div>
    <div class="pdf-upload-section">
      <div class="pdf-upload-dropzone" id="pdfDropzone">
        <input type="file" id="pdfFileInput" accept=".pdf,application/pdf" multiple style="display: none;">
        <div class="dropzone-content">
          ${$t({size:48})}
          <p class="dropzone-text">Click to upload or drag and drop PDF files</p>
          <p class="dropzone-hint">Maximum 10MB per file</p>
        </div>
      </div>
      <div id="attachedPDFsList" class="attached-pdfs-list"></div>
    </div>
  `;const e=document.getElementById("pdfDropzone"),o=document.getElementById("pdfFileInput");e&&o&&(e.addEventListener("click",()=>o.click()),o.addEventListener("change",n=>{const r=Array.from(n.target.files);r.length>0&&Pe(r),o.value=""}),e.addEventListener("dragover",n=>{n.preventDefault(),e.classList.add("dragover")}),e.addEventListener("dragleave",n=>{n.preventDefault(),e.classList.remove("dragover")}),e.addEventListener("drop",n=>{n.preventDefault(),e.classList.remove("dragover");const r=Array.from(n.dataTransfer.files).filter(a=>a.type==="application/pdf");r.length>0?Pe(r):b("Please drop only PDF files")})),Q()}async function Do(){if(!confirm("This will reset everything to defaults and cannot be undone. Continue?"))return;const t=document.getElementById("promoDateRange"),e=document.getElementById("promoYear"),o=document.getElementById("promoTitle");t&&(t.value=""),e&&(e.value=""),o&&(o.value=""),l.promotionEntries=[{id:Date.now(),line:"",collections:"",callout:""}],l.specialHours=[],l.howToShopItems=[],l.importantNotesItems=[],he();for(const c of l.attachedPDFs)try{await je(c.id)}catch(i){console.warn("Failed to delete PDF from IndexedDB:",i)}l.attachedPDFs=[],l.generatedSubjectLines=[],l.selectedSubjectLine=null;const n=document.getElementById("bulkEmailList");if(n){n.value="",n.dispatchEvent(new Event("input",{bubbles:!0}));try{await st()}catch(c){console.warn("Failed to clear bulk recipients from IndexedDB:",c)}}localStorage.removeItem("savedPromotionTemplate"),H(),Y(),A(),F(),Q(),ae();const r=document.getElementById("codeArea"),a=document.getElementById("previewIframe");r&&(r.value=""),a&&ge(a);const s=document.querySelector(".output-actions");s&&s.classList.remove("enabled"),b("Reset to defaults completed")}function Po(){const t=document.getElementById("basicDetailsContainer");if(!t){console.error("Basic details container not found");return}t.innerHTML=`
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
  `;const e=document.getElementById("promoDateRange"),o=document.getElementById("promoYear"),n=document.getElementById("promoTitle");if(e){e.addEventListener("input",()=>{const a=document.querySelector('[data-clear="promoDateRange"]');a&&a.classList.toggle("visible",e.value.trim().length>0),E()});const r=document.querySelector('[data-clear="promoDateRange"]');r&&r.addEventListener("click",()=>{e.value="",r.classList.remove("visible"),e.focus(),E()})}if(o){o.addEventListener("input",()=>{const a=document.querySelector('[data-clear="promoYear"]');a&&a.classList.toggle("visible",o.value.trim().length>0),E()});const r=document.querySelector('[data-clear="promoYear"]');r&&r.addEventListener("click",()=>{o.value="",r.classList.remove("visible"),o.focus(),E()})}if(n){n.addEventListener("input",()=>{const a=document.querySelector('[data-clear="promoTitle"]');a&&a.classList.toggle("visible",n.value.trim().length>0),E()});const r=document.querySelector('[data-clear="promoTitle"]');r&&r.addEventListener("click",()=>{n.value="",r.classList.remove("visible"),n.focus(),E()})}}function Ao(){const t=document.getElementById("discountEntriesContainer");if(!t){console.error("Discount entries container not found");return}t.innerHTML=`
    <div class="form-group full-width">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <label class="form-label" style="margin-bottom: 0;">Promotion Entries</label>
            <button type="button" class="btn btn-base btn-primary-base" id="addEntryBtn" style="flex: 0 0 auto; padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Entry</button>
        </div>
        <div id="promotionEntriesContainer"></div>
    </div>
  `;const e=document.getElementById("addEntryBtn");e&&e.addEventListener("click",Ze)}function No(){const t=document.getElementById("specialHoursContainer");if(!t){console.error("Special hours card container not found");return}t.innerHTML=`
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <label class="form-label" style="margin-bottom: 0;">Special Hours</label>
        <button type="button" class="btn btn-base btn-primary-base" id="addHourBtn" style="flex: 0 0 auto; padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Special Hours</button>
    </div>
    <div class="field-help" style="margin-bottom: 0.75rem;">For holidays or special sale hours (e.g., Black Friday extended hours)</div>
    <div id="specialHoursListContainer"></div>
    <div id="specialHoursReminder" style="display: none; background: #fff3cd; border-left: 3px solid #ffc107; padding: 1rem; margin-top: 1rem;">
        <strong>⚠️ Reminder:</strong> Don't forget to update your special hours on Yelp and Google Maps!
    </div>
  `;const e=document.getElementById("addHourBtn");e&&e.addEventListener("click",ro)}function Mo(){const t=document.getElementById("howToShopContainer");if(!t){console.error("How to shop container not found");return}t.innerHTML=`
    <div class="form-group full-width">
        <div id="howToShopWrapper"></div>
    </div>
  `}function jo(){const t=document.getElementById("importantNotesContainer");if(!t){console.error("Important notes container not found");return}t.innerHTML=`
    <div class="form-group full-width">
        <div id="importantNotesWrapper"></div>
    </div>
  `}function Jo(){kt("promotion-email");const t=localStorage.getItem("savedPromotionTemplate");let e=null;if(t)try{e=JSON.parse(t)}catch(m){console.error("Error parsing saved template:",m),e=null}l.promotionEntries=[],l.specialHours=[],l.howToShopItems=[],l.importantNotesItems=[],l.attachedPDFs=[],l.generatedSubjectLines=[],l.selectedSubjectLine=null,Po(),Ao(),No(),Mo(),jo(),Bo(),Vt();const o=document.getElementById("pdfModalClose"),n=document.querySelector(".pdf-modal-backdrop"),r=document.getElementById("pdfDownloadBtn"),a=document.getElementById("pdfDownloadFallback");o&&o.addEventListener("click",ie),n&&n.addEventListener("click",ie),r&&r.addEventListener("click",Ne),a&&a.addEventListener("click",Ne),document.addEventListener("keydown",m=>{if(m.key==="Escape"){const u=document.getElementById("pdfPreviewModal");u&&u.style.display!=="none"&&ie()}});const s=document.getElementById("saveTemplateBtnDuplicate"),c=document.getElementById("importTemplateBtnDuplicate"),i=document.getElementById("exportTemplateBtnDuplicate"),p=document.getElementById("startOverBtnDuplicate");s&&s.addEventListener("click",Gt),c&&c.addEventListener("click",Zt),i&&i.addEventListener("click",Xt),p&&p.addEventListener("click",Do),e?Ge(e,!0):(he(),Ze()),H(),Y(),A(),F(),ae();const g=document.getElementById("previewIframe");g&&ge(g),console.log("Promotion UI module initialized")}function Ko(){const t=localStorage.getItem("theme")||"light",e=localStorage.getItem("lightPalette")||"pastel",o=localStorage.getItem("darkPalette")||"midnight-blue";document.documentElement.setAttribute("data-theme",t),document.documentElement.setAttribute("data-light-palette",e),document.documentElement.setAttribute("data-dark-palette",o),Qe(t)}function Fo(){const e=(document.documentElement.getAttribute("data-theme")||"light")==="light"?"dark":"light";document.documentElement.setAttribute("data-theme",e),localStorage.setItem("theme",e),Qe(e),D==="promotion-email"?E():D&&X()}function Qe(t){const e=document.querySelector(".theme-toggle-slider");e&&(e.style.transform=t==="dark"?"translateX(20px)":"translateX(0)")}const Ho=300;function Go(){document.querySelectorAll('a[href$=".html"]').forEach(t=>{t.hostname===window.location.hostname&&t.addEventListener("click",zo)})}function zo(t){if(t.metaKey||t.ctrlKey||t.shiftKey||t.currentTarget.target==="_blank")return;t.preventDefault();const e=t.currentTarget.getAttribute("href"),o=document.querySelector(".page-content"),n=document.querySelector(".header"),r=document.querySelector(".right-column"),a=document.querySelector(".column-skinny-wrapper.column-active");o||n?(o&&o.classList.add("fade-out"),n&&n.classList.add("fade-out"),r&&r.classList.add("fade-out"),a&&a.classList.add("fade-out"),setTimeout(()=>{window.location.href=e},Ho)):window.location.href=e}export{Go as a,Ro as b,Wo as c,y as d,Jo as e,xt as f,Wt as g,st as h,Ko as i,It as j,qo as k,_o as l,Yo as m,Uo as n,it as o,l as p,Oo as q,b as s,Fo as t,Vo as u,ge as w};

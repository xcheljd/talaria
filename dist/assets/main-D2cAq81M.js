/* empty css               */(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const a of i)if(a.type==="childList")for(const s of a.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&n(s)}).observe(document,{childList:!0,subtree:!0});function o(i){const a={};return i.integrity&&(a.integrity=i.integrity),i.referrerPolicy&&(a.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?a.credentials="include":i.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(i){if(i.ep)return;i.ep=!0;const a=o(i);fetch(i.href,a)}})();let I=null;const Ke="CitizenTemplates",Ze=2,j="promotionPDFs",q="bulkEmailRecipients";function Qe(){return new Promise(t=>{const e=window.indexedDB||window.webkitIndexedDB||window.mozIndexedDB;if(!e){console.warn("IndexedDB not supported, PDFs will not persist across refresh"),t(!1);return}const o=e.open(Ke,Ze);o.onerror=()=>{console.warn("IndexedDB initialization failed:",o.error),t(!1)},o.onsuccess=()=>{I=o.result,console.log("IndexedDB initialized successfully"),t(!0)},o.onupgradeneeded=n=>{const i=n.target.result;i.objectStoreNames.contains(j)||i.createObjectStore(j,{keyPath:"id"}),i.objectStoreNames.contains(q)||i.createObjectStore(q,{keyPath:"id"})}})}function ue(t){return new Promise((e,o)=>{if(!I){o(new Error("IndexedDB not initialized"));return}const a=I.transaction([j],"readwrite").objectStore(j).put(t);a.onerror=()=>o(a.error),a.onsuccess=()=>e(t.id)})}function Xe(t){return new Promise((e,o)=>{if(!I){e(null);return}const a=I.transaction([j],"readonly").objectStore(j).get(t);a.onerror=()=>o(a.error),a.onsuccess=()=>e(a.result||null)})}function et(t){return new Promise((e,o)=>{if(!I){e();return}const a=I.transaction([j],"readwrite").objectStore(j).delete(t);a.onerror=()=>o(a.error),a.onsuccess=()=>e()})}function tt(){return new Promise((t,e)=>{if(!I){t();return}const i=I.transaction([j],"readwrite").objectStore(j).clear();i.onerror=()=>e(i.error),i.onsuccess=()=>t()})}function ot(t){return new Promise((e,o)=>{if(!I){o(new Error("IndexedDB not initialized"));return}const a=I.transaction([q],"readwrite").objectStore(q).put({id:"bulk-email-recipients",data:t,savedAt:new Date().toISOString()});a.onerror=()=>o(a.error),a.onsuccess=()=>e()})}function nt(){return new Promise((t,e)=>{if(!I){t("");return}const i=I.transaction([q],"readonly").objectStore(q).get("bulk-email-recipients");i.onerror=()=>e(i.error),i.onsuccess=()=>{const a=i.result;t(a&&a.data?a.data:"")}})}let Le,Ce,Te,Pe,Be,ke;function it(t){Le=t.renderPromotionEntries,Ce=t.renderSpecialHours,Te=t.renderHowToShopSection,Pe=t.renderImportantNotesSection,Be=t.renderAttachedPDFs,ke=t.renderSubjectLines}const d={currentCategory:"all",currentTemplate:null,searchActive:!1,userProfile:null,promotionEntries:[],specialHours:[],howToShopItems:[],importantNotesItems:[],attachedPDFs:[],generatedSubjectLines:[],selectedSubjectLine:null,howToShopExpanded:!1,importantNotesExpanded:!1,entryCollapsedStates:{},historyStack:[],historyIndex:-1};function at(){}function Ne(t){d.promotionEntries=JSON.parse(JSON.stringify(t.promotionEntries)),d.specialHours=JSON.parse(JSON.stringify(t.specialHours)),d.howToShopItems=JSON.parse(JSON.stringify(t.howToShopItems)),d.importantNotesItems=JSON.parse(JSON.stringify(t.importantNotesItems)),d.attachedPDFs=t.attachedPDFs?JSON.parse(JSON.stringify(t.attachedPDFs)):[],d.generatedSubjectLines=t.generatedSubjectLines?JSON.parse(JSON.stringify(t.generatedSubjectLines)):[],d.selectedSubjectLine=t.selectedSubjectLine||null,Le(),Ce(),Te(),Pe(),Be(),ke()}function K(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}function S(t){return t.replace(/'/g,"&#39;").replace(/"/g,"&quot;")}function N(t){const e={};for(const[o,n]of Object.entries(t))typeof n=="string"?e[o]=K(n):e[o]=n;return e}function z(){return d.userProfile&&d.userProfile.storePhone?d.userProfile.storePhone:"702-357-8990"}function U(){return d.userProfile&&d.userProfile.storeName?d.userProfile.storeName:"Citizen Company Store"}function te(){return d.userProfile&&d.userProfile.storeLocation?d.userProfile.storeLocation:"the South Premium Outlets"}function rt(){return`Citizen Company Store at ${te()}`}function M(t="text"){const e=d.userProfile&&d.userProfile.employeeName?d.userProfile.employeeName:"Employee Name",o=d.userProfile&&d.userProfile.jobTitle?d.userProfile.jobTitle:"Sales Associate",n=d.userProfile&&d.userProfile.storeName?d.userProfile.storeName:"Citizen Company Store",i=d.userProfile&&d.userProfile.storeAddress?d.userProfile.storeAddress:"",a=d.userProfile&&d.userProfile.storePhone?d.userProfile.storePhone:"555-123-4567",s=d.userProfile&&d.userProfile.storePlusCode?d.userProfile.storePlusCode:"",r=d.userProfile&&d.userProfile.storeEmail?d.userProfile.storeEmail:"";if(t==="html"){const c=f=>{const g=document.createElement("div");return g.textContent=f,g.innerHTML};let u="";if(r){const f=r.split("@"),g=f[0]||"",m=f[1]||"";u=`<p style="margin: 0; padding: 0; font-size: 8pt; color: #2f2f2f;">
        Email: ${c(g)}<a href="mailto:${c(r)}" style="color: #0000ee; text-decoration: underline; font-size: 8pt;">@${c(m)}</a>
    </p>`}return`<div style="font-family: 'Century Gothic', Aptos, Arial, sans-serif; font-size: 9pt; color: #000000;">
    <p style="margin: 0; padding: 0;">
        <strong style="font-size: 9pt;">${c(e)} │ ${c(o)}</strong>
    </p>
    <p style="margin: 0; padding: 0; font-size: 8pt; color: #2f2f2f;">
        ______________________________________________________________________
    </p>
    <p style="margin: 0; padding: 0; font-size: 8pt; color: #2f2f2f;">
        <strong>Citizen Watch America</strong> - ${c(n)}
    </p>
    ${i?`<p style="margin: 0; padding: 0; font-size: 8pt; color: #2f2f2f;">
        ${c(i).replace(/\n/g,"<br>")}
    </p>`:""}
    <p style="margin: 0; padding: 0; font-size: 8pt; color: #2f2f2f;">
        Tel/SMS: ${c(a)}
    </p>
    ${s?`<p style="margin: 0; padding: 0; font-size: 8pt;">
        <a href="https://maps.google.com/?q=${encodeURIComponent(s)}" style="color: #0000ee; text-decoration: underline; font-size: 8pt;">View on Google Maps</a>
    </p>`:""}
    ${u}
    <p style="margin: 4px 0; padding: 0; font-size: 8pt;">
        <a href="https://us.alpinawatches.com/" style="color: #0000ee; text-decoration: underline; font-size: 8pt;">Alpina</a> |
        <a href="https://www.bulova.com/" style="color: #0000ee; text-decoration: underline; font-size: 8pt;">Bulova</a> |
        <a href="https://www.citizenwatch.com/" style="color: #0000ee; text-decoration: underline; font-size: 8pt;">Citizen</a> |
        <a href="https://us.frederiqueconstant.com/" style="color: #0000ee; text-decoration: underline; font-size: 8pt;">Frederique Constant</a>
    </p>
    <p style="margin: 4px 0; padding: 0; font-size: 8pt; color: #0c8822;">
        <strong>Please consider the environment before printing this e-mail</strong>
    </p>
</div>`}return`${e} │ ${o}
______________________________________________________________________
Citizen Watch America - ${n}
${i?i.replace(/\n/g,`
`):""}
Tel/SMS: ${a}

Alpina | Bulova | Citizen | Frederique Constant

Please consider the environment before printing this e-mail`}function st(t){if(!t)return"";const e=c=>{const u=document.createElement("div");return u.textContent=c,u.innerHTML};let o=t;const n=[/\n\n-{5,}\n/,/______+/,/\n\n[A-Z][a-z]+ [A-Z][a-z]+ │ /];for(const c of n){const u=o.match(c);if(u){o=o.substring(0,u.index).trim();break}}const a=o.split(/\n\n+/).map(c=>{const u=c.split(`
`);return u.some(g=>g.trim())&&u.every(g=>{const m=g.trim();return!m||m.startsWith("•")||m.startsWith("-")})?`    <ul style="margin: 10px 0; padding-left: 20px; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt;">
${u.filter(m=>m.trim()).map(m=>{const b=m.replace(/^[•-]\s*/,"").trim();return`        <li style="margin: 5px 0;">${e(b)}</li>`}).join(`
`)}
    </ul>`:`    <p style="margin: 10px 0; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);">${c.split(`
`).map(m=>e(m)).join("<br>")}</p>`}),s=M("html");return`${a.join(`
`)}

    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
${s}
    </div>`}const lt={"new-customer-welcome":"Use after a customer visits the store for the first time. Adds them to VIP list. (Enhanced: editable subject, EML download)","back-in-stock":"Follow up when a previously unavailable item is back. Include hold deadline.","thank-you-warranty":"Send after purchase to explain warranty registration and care tips.","weekly-sale":"Personalized sale notification for customers who showed interest in specific collections. (Enhanced: editable subject, EML download)","new-model-arrival":"Alert interested customers when a specific model they asked about arrives. (Enhanced: editable subject, EML download)","limited-edition":"High-priority notification for VIP collectors about exclusive pieces. (Enhanced: editable subject, EML download)","vip-reconnection":"Re-engage customers who haven't visited in a while. Mention store evolution. (Enhanced: editable subject, EML download)","phone-confirmation":"Immediate confirmation after taking a phone order. Include all order details. (Enhanced: editable subject, EML download)","phone-shipped":"Send when order ships with UPS tracking. Mention signature requirement. (Enhanced: editable subject, EML download)","phone-under-500":"Internal approval request for phone orders under $500. Manager verification. (Enhanced: editable subject, EML download)","phone-corporate":"Corporate/bulk order approval. Include purpose and fulfilling store. (Enhanced: editable subject, EML download)","inter-store-notification":"Notify receiving store that order is prepared and ready for pickup. (Enhanced: editable subject, EML download)","text-availability":"Quick response to customer inquiry about specific model availability.","text-thank-you":"Post-purchase thank you via text. Keep it brief and friendly.","text-interest-followup":"Follow up on specific watch customer showed interest in. Use after store visit.","promotion-email":"Generate HTML email for weekly promotions with discount tiers. Auto-generates title based on dates."},me={customerName:{example:"John Smith",required:!0},employeeName:{example:"Your name",required:!0},yourName:{example:"Your name",required:!0},clientName:{example:"John Smith",required:!0},brand:{example:"Citizen",required:!0,suggestions:["Citizen","Bulova","Frederique Constant"]},modelName:{example:"Eco-Drive Promaster",required:!0},modelNumber:{example:"BN0150-28E",required:!1},price:{example:"299",required:!0,validation:"currency"},discount:{example:"20",required:!0,validation:"number",dependent:!0},msrp:{example:"399",required:!0,validation:"currency",dependent:!0},quantity:{example:"2",required:!0,validation:"number"},unitsQuantity:{example:"1",required:!0,validation:"number"},totalAmount:{example:"299.00",required:!0,validation:"currency"},closingTime:{example:"9:00 PM",required:!0},endDate:{example:"Sunday",required:!0},holdDeadline:{example:"Friday 5PM",required:!0},trackingNumber:{example:"1Z999AA10123456784",required:!1,validation:"tracking"},customerId:{example:"C12345",required:!0},employeeId:{example:"E789",required:!0},warrantyLength:{example:"5-year",required:!0},warrantyYears:{example:"5",required:!0,validation:"number"},carrier:{example:"UPS",required:!0,suggestions:["UPS","FedEx","USPS"]},promoDateRange:{example:"Nov 28 - Dec 1",required:!0},promoYear:{example:"2024-2025",required:!1},promoTitle:{example:"Leave blank for auto-generation",required:!1},promoBrand:{example:"Citizen",required:!0,suggestions:["Citizen","Bulova","Alpina","Frederique Constant"]},promoDiscount:{example:"60",required:!0,validation:"number"},promoCollections:{example:"Corso, Avion, Marine Star",required:!1},promoCallout:{example:"Optional special note",required:!1}};function ct(t){return(me[t]||{}).suggestions||[]}const B={"new-customer-welcome":{name:"New Customer Welcome",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","employeeName"],generate:t=>`Subject: Welcome to Citizen Company Store - Your VIP Access

Hi ${N(t).customerName},

Thank you for visiting our Citizen Company Store outlet location! It was a pleasure helping you explore our offerings today.

I've added you to our VIP email list for weekly promotional updates featuring exclusive outlet pricing on our timepieces.

Please don't hesitate to reach out by replying to this email or call the store at ${z()}. I would be happy to check availability on any models you're considering.

${M()}`},"new-model-arrival":{name:"New Model Arrival",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","keyFeature1","keyFeature2","keyFeature3","price","employeeName"],generate:t=>{const e=N(t);let o=`• ${e.keyFeature1}`;return e.keyFeature2&&(o+=`
• ${e.keyFeature2}`),e.keyFeature3&&(o+=`
• ${e.keyFeature3}`),`Subject: Great News! ${e.modelName} Now Available

Hi ${e.customerName},

Great news! The ${e.brand} ${e.modelName} (${e.modelNumber}) you were interested in has arrived at our store.

Key Features:
${o}

Current price: ${e.price}

I'd be happy to set up an appointment to show you all the features of this watch and let you try it on. This model tends to generate a lot of interest, so I wanted to reach out to you first.

Would you like to schedule a time to see it in person? Please reply to this email or call the store at ${z()}.

Looking forward to hearing from you!

${M()}`}},"limited-edition":{name:"Limited Edition",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","limitedDetails","price","quantityAvailable","employeeName"],generate:t=>{const e=N(t);return`Subject: Exclusive: Limited Edition ${e.modelName} Available

Hi ${e.customerName},

I wanted to reach out to you personally because we just received a ${e.brand} ${e.modelName} (${e.modelNumber}) - ${e.limitedDetails}.

As someone who appreciates fine timepieces and unique additions to your collection, I thought you'd want to know about this immediately.

Price: ${e.price}
Availability: Only ${e.quantityAvailable} available

This is truly a special piece that won't last long. I'd love to show it to you in person and discuss how it could complement your collection.

Can you stop by this week, or would you like me to hold one for you? Please reply to this email or call the store at ${z()}.

${M()}

P.S. - Given the limited availability, I'm only reaching out to our most valued collectors. Let me know if you're interested!`}},"vip-reconnection":{name:"VIP Reconnection",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["clientName","employeeName"],generate:t=>`Subject: Your Store Has Evolved - We'd Love to Show You What's New

Hi ${N(t).clientName},

I was reviewing our VIP client records and noticed it's been a while since your last visit. I wanted to personally reach out because our store has undergone some exciting changes that I think you'll appreciate.

We're now a hybrid store - combining the outlet values you love with access to current season merchandise. This means alongside our clearance deals, you can now find the latest releases and expanded brand offerings.

To welcome you back, I'd like to offer you a complimentary watch service visit. Bring in any of your timepieces and I'll:
- Set and synchronize all your watches
- Perform atomic time synchronization resets
- Help with any complicated functions you're having trouble with
- Show you our new brand offerings and store layout

No purchase necessary - I just want to reconnect and ensure your watches are working perfectly.

Would you have time this week or next to stop by? I'd love to show you how we've evolved while maintaining the exceptional values and service you remember.

${M()}

P.S. - We now carry everything from current season pieces to discontinued treasures, giving you more options than ever before.`},"phone-confirmation":{name:"Confirmation",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","price","discount","totalAmount","customerAddress","carrier","trackingNumber","employeeName"],generate:t=>{const e=N(t);let o="";return e.trackingNumber&&(o=`

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

If you have any questions, please don't hesitate to contact us at ${z()}.

Thank you for shopping with ${U()}!

${M()}`}},"phone-shipped":{name:"Shipped with Tracking",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","trackingNumber","customerAddress","employeeName"],generate:t=>{const e=N(t);return`Subject: Your Watch Order - Tracking Information

Hi ${e.customerName},

Thank you for your recent purchase from ${U()}! We're pleased to confirm that your order has been shipped and is on its way to you.

Tracking Information:
UPS Tracking Number: ${e.trackingNumber}

You can track your shipment at the link above or visit ups.com and enter your tracking number.

Your package requires an adult signature upon delivery to ensure safe receipt of your timepiece.

Order Details:
Watch Model: ${e.modelNumber} - ${e.modelName}
Shipping Address: ${e.customerAddress}

If you have any questions about your order or need any assistance, please don't hesitate to reach out. I'm here to help!

We hope you enjoy your new ${e.brand} timepiece!

${M()}`}},"phone-under-500":{name:"Under $500 Request",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["managerNameOrStoreName","customerName","customerId","employeeName","employeeId","unitsQuantity","totalAmount","creditCardVerified","needsManagerVerification"],generate:t=>{const e=N(t);if(!e.creditCardVerified||e.creditCardVerified.toLowerCase()!=="yes")throw new Error("Credit card must be verified before generating this order form.");let o="";return e.needsManagerVerification&&e.needsManagerVerification.toLowerCase()==="yes"?o="Ready for manager verification":o="Credit card manager verified - Ready for processing",`Subject: Phone Order Form for ${e.customerName}

Hi ${e.managerNameOrStoreName},

Attached is the form for the phone order for ${e.customerName} (${e.customerId}).

Ringing under: ${e.employeeName} (${e.employeeId})
Units: ${e.unitsQuantity}
Total: ${e.totalAmount}

Order Status: ${o}

${M()}`}},"phone-corporate":{name:"Corporate Approval",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","customerId","employeeName","employeeId","unitsQuantity","totalAmount","fulfillingStore","yourName"],generate:t=>{const e=N(t);return`Subject: Phone Order Approval Request - ${e.customerName}

Hello,

I am forwarding a request for approval on a phone order for ${e.employeeName} (${e.employeeId}).

There are ${e.unitsQuantity} units totaling ${e.totalAmount}. It will be fulfilled at ${e.fulfillingStore}.

Customer: ${e.customerName} (${e.customerId})

I have verified and signed off. Please let us know if you have any questions.

Thank You,
${e.yourName}`}},"inter-store-notification":{name:"Inter-Store Notification",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["recipientStoreName","customerName","trackingNumber"],generate:t=>{const e=N(t);return`Subject: Phone Order Processed and Shipped - ${e.customerName}

Hi ${e.recipientStoreName} Team,

The phone order for ${e.customerName} has been rung and labeled for shipping.

UPS Tracking Number: ${e.trackingNumber}

The package has been prepared and is ready for UPS pickup.

Thank you,`}},"text-availability":{name:"Availability Response",category:"Text",fields:["customerName","modelName","price","closingTime"],generate:t=>{const e=N(t);return`Hi ${e.customerName}! Yes, we have the ${e.modelName} in stock. Current price is ${e.price} with our outlet discount. We're open until ${e.closingTime} today if you'd like to stop by, or I can hold it.`}},"text-thank-you":{name:"Thank You",category:"Text",fields:["customerName","modelName","warrantyLength","brand"],generate:t=>{const e=N(t);return`${e.customerName}, thank you for your purchase today! Your ${e.modelName} comes with a ${e.warrantyLength} warranty. Reach out anytime at ${z()} for any questions. Enjoy your new ${e.brand}!`}},"text-interest-followup":{name:"Sale Alert",category:"Text",fields:["customerName","employeeName","modelName","discount","msrp","endDate"],generate:t=>{const e=N(t),o=parseFloat(e.msrp)||0,n=parseFloat(e.discount)||0,i=(o*(1-n/100)).toFixed(2);return`Hi ${e.customerName}! This is ${e.employeeName} from ${rt()}. The ${e.modelName} you were interested in is on ${e.discount}% OFF promotion (MSRP ${e.msrp} now ${i} plus tax) until ${e.endDate}. Please let me know if you'd like me to hold one for you. Thank you!`}},"weekly-sale":{name:"Weekly Sale",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","collectionName","discount","brand","model1","price1","original1","model2","price2","original2","endDate","employeeName"],generate:t=>{const e=N(t);let o=`• ${e.model1} - Now ${e.price1} (was ${e.original1})`;return e.model2&&e.price2&&(o+=`
• ${e.model2} - Now ${e.price2} (was ${e.original2})`),`Subject: ${e.customerName}, This Week's ${e.brand} Sale Includes Your Favorites

Hi ${e.customerName},

I remember you were looking at ${e.collectionName} pieces during your last visit. Good timing - we just started our ${e.discount}% off promotion on select ${e.brand} models this week!

Specifically available in that collection:
${o}

This promotion runs through ${e.endDate}. Would you like me to check if we have your size preference in stock?

${M()}`}},"promotion-email":{name:"Promotion Email",category:"Customer Email",customTemplate:!0,fields:["promoDateRange","promoYear","promoTitle"],generate:()=>""}};let k=null,E=[],$=[],C=[],L=[],w=[],T=[],x=null,le=!1,ce=!1,J={},G=null,H=null;function dt(t){return t?/<(p|div|span|br|html|body|head|table|tr|td|ul|ol|li|h[1-6]|strong|em|a)\b[^>]*>/i.test(t):!1}function pe(t,e){let o;return function(...i){const a=()=>{clearTimeout(o),t(...i)};clearTimeout(o),o=setTimeout(a,e)}}function D(){if(k!=="promotion-email")return;const t=v("promoDateRange"),e=v("promoYear"),o=v("promoTitle");if(!t||!t.value.trim())return;const n={promoDateRange:t.value,promoYear:e?e.value:"",promoTitle:o?o.value:""},i=Ut(n),a=v("codeArea");a&&(a.value=i);const s=v("previewIframe");if(s){const r=s.contentDocument||s.contentWindow.document;r.open(),r.write(i),r.close()}}const R=pe(D,500),ut=pe(vt,300),Y=pe(at,1e3),l={};function mt(){l.templateSelect=document.getElementById("templateSelect"),l.formFields=document.getElementById("formFields"),l.formSectionTitle=document.getElementById("formSectionTitle"),l.outputCard=document.getElementById("outputCard"),l.outputArea=document.getElementById("outputArea"),l.generateBtn=document.getElementById("generateBtn"),l.clearBtn=document.getElementById("clearBtn"),l.copyBtn=document.getElementById("copyBtn"),l.sendEmailBtn=document.getElementById("sendEmailBtn"),l.downloadEmailBtn=document.getElementById("downloadEmailBtn"),l.undoBtn=document.getElementById("undoBtn"),l.redoBtn=document.getElementById("redoBtn"),l.themeToggle=document.getElementById("themeToggle"),l.searchBox=document.getElementById("searchBox"),l.clearSearch=document.getElementById("clearSearch"),l.searchResults=document.getElementById("searchResults"),l.resultCounter=document.getElementById("resultCounter"),l.saveTemplateBtn=document.getElementById("saveTemplateBtn"),l.exportTemplateBtn=document.getElementById("exportTemplateBtn"),l.importTemplateBtn=document.getElementById("importTemplateBtn")}function v(t){return document.getElementById(t)}function p(t,e=2500){const o=document.getElementById("toast");if(!o){console.warn("Toast element not found");return}o.textContent=t,o.classList.add("show"),setTimeout(()=>{o.classList.remove("show")},e)}function Ae(){l.undoBtn&&(l.undoBtn.disabled=d.historyIndex<=0),l.redoBtn&&(l.redoBtn.disabled=d.historyIndex>=d.historyStack.length-1)}function De(){d.historyIndex>0&&(d.historyIndex--,Ne(d.historyStack[d.historyIndex]),Ae())}function je(){d.historyIndex<d.historyStack.length-1&&(d.historyIndex++,Ne(d.historyStack[d.historyIndex]),Ae())}function pt(){if(!l.outputCard)return;l.bulkEmailList=null,l.bulkAnalysis=null,l.bulkStats=null,l.batchSize=null,l.batchSizeHelp=null,l.codeArea=null,l.previewIframe=null,l.previewContent=null,l.codeContent=null,l.copyPreviewBtn=null,l.openEmailBtn=null,l.outputCard.innerHTML=`
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
    `;const t=l.outputCard.querySelectorAll(".output-tab");t.forEach(s=>{s.addEventListener("click",()=>{const r=s.dataset.tab;t.forEach(c=>c.classList.remove("active")),s.classList.add("active"),l.outputCard.querySelectorAll(".output-content").forEach(c=>{c.classList.remove("active")}),r==="preview"?document.getElementById("previewContent").classList.add("active"):document.getElementById("codeContent").classList.add("active")})});const e=document.getElementById("copyPreviewBtn");e&&e.addEventListener("click",()=>{const s=v("codeArea");s&&s.value?navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(s.value).then(()=>{p("✓ HTML Code Copied!")}).catch(()=>{p("⚠ Copy failed")}):(s.select(),document.execCommand("copy"),p("✓ HTML Code Copied!")):p("⚠ Nothing to copy")});const o=v("openEmailBtn");o&&o.addEventListener("click",Wt);const n=document.getElementById("bulkEmailList"),i=document.getElementById("batchSize"),a=document.getElementById("generateBulkBtn");n&&n.addEventListener("input",Ee),i&&i.addEventListener("input",()=>{Kt(),Ee()}),a&&a.addEventListener("click",Zt),ne(),setTimeout(ao,2e3)}function Me(){if(!l.outputCard)return;l.outputArea=null,l.copyBtn=null,l.subjectLineContainer=null,l.sendEmailBtn=null,l.downloadEmailBtn=null,l.previewTab=null,l.htmlTab=null,l.previewContentRegular=null,l.htmlContentRegular=null,l.emailPreview=null;const t=B[k],e=t&&t.hasEditableSubject;let o="",n="";if(e?(o=`
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
        `,l.outputCard.innerHTML=`
        <h2 class="section-title">Generated Message</h2>
        ${o}

        <!-- Output Tabs -->
        <div class="output-tabs">
            <button class="output-tab active" data-tab="preview" title="Preview how the email looks in an email client">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
                Preview
            </button>
            <button class="output-tab" data-tab="html" title="View the raw HTML code">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="16 18 22 12 16 6"></polyline>
                    <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
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
    `,l.outputArea=document.getElementById("outputArea"),l.copyBtn=document.getElementById("copyBtn"),l.previewTab=document.querySelector('.output-tab[data-tab="preview"]'),l.htmlTab=document.querySelector('.output-tab[data-tab="html"]'),l.previewContentRegular=document.getElementById("previewContent"),l.htmlContentRegular=document.getElementById("htmlContent"),l.emailPreview=document.getElementById("emailPreview"),l.emailPreview&&ft(l.emailPreview),l.copyBtn&&l.copyBtn.addEventListener("click",no),l.previewTab&&l.htmlTab&&(l.previewTab.addEventListener("click",()=>{l.previewTab.classList.add("active"),l.htmlTab.classList.remove("active"),l.previewContentRegular&&l.previewContentRegular.classList.add("active"),l.htmlContentRegular&&l.htmlContentRegular.classList.remove("active"),ie()}),l.htmlTab.addEventListener("click",()=>{l.htmlTab.classList.add("active"),l.previewTab.classList.remove("active"),l.htmlContentRegular&&l.htmlContentRegular.classList.add("active"),l.previewContentRegular&&l.previewContentRegular.classList.remove("active")})),e){const i=document.getElementById("sendEmailBtn"),a=document.getElementById("downloadEmailBtn");i&&i.addEventListener("click",()=>{const r=document.getElementById("outputArea"),c=r?r.value:"";c&&Xt(k,c)}),a&&a.addEventListener("click",()=>{const r=document.getElementById("outputArea"),c=window.originalMessageContent||(r?r.value:"");c&&eo(k,c)});const s=document.getElementById("subjectLineContent");s&&qe(s,"")}}function ft(t){if(!t)return;const e=t.contentDocument||t.contentWindow.document;if(!e)return;const o=getComputedStyle(document.documentElement),n=o.getPropertyValue("--bg-tertiary").trim()||"#f8f3ef",i=o.getPropertyValue("--text-primary").trim()||"#2a2420",a=o.getPropertyValue("--text-secondary").trim()||"#666";e.open(),e.write(`
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
                    color: ${i};
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <h3>No Preview Yet</h3>
                <p>Fill in the form and click Generate to see your email preview</p>
            </div>
        </body>
        </html>
    `),e.close()}function gt(t){let e="Email Preview",o=t;if(window.originalMessageContent){const i=window.originalMessageContent.match(/^Subject:\s*(.+)/m);i&&(e=i[1],o=window.originalMessageContent.replace(/^Subject:.+\n/m,"").trim())}else{const i=t.match(/^Subject:\s*(.+)/m);i&&(e=i[1],o=t.replace(/^Subject:.+\n/m,"").trim())}return`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${A(e)}</title>
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
            <div class="email-subject">${A(e)}</div>
        </div>
        <div class="email-body">
            ${o}
        </div>
    </div>
</body>
</html>`}function A(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}function vt(t){try{const e=document.getElementById("emailPreview");if(!e||!e.srcdoc)return;const o=e.srcdoc,n=/<div class="email-subject">.*?<\/div>/,i=`<div class="email-subject">${A(t)}</div>`,a=o.replace(n,i),s=/<title>.*?<\/title>/,r=`<title>${A(t)}</title>`,c=a.replace(s,r);e.srcdoc=c}catch(e){console.error("Error updating subject in preview:",e)}}async function yt(){if(k!=="promotion-email")return;if(E.forEach(e=>{J[e.id]=!0}),F(),w.length>0&&I){for(const e of w)if(e.data)try{await ue(e),console.log(`Re-saved PDF ${e.name} to IndexedDB during template save`)}catch(o){console.warn(`Failed to save PDF ${e.name} to IndexedDB:`,o)}}const t={templateType:"promotion-email",version:"1.0",savedAt:new Date().toISOString(),dateRange:v("promoDateRange")?.value||"",year:v("promoYear")?.value||"",title:v("promoTitle")?.value||"",promotionEntries:JSON.parse(JSON.stringify(E)),specialHours:JSON.parse(JSON.stringify($)),howToShopItems:JSON.parse(JSON.stringify(C)),importantNotesItems:JSON.parse(JSON.stringify(L)),attachedPDFs:JSON.parse(JSON.stringify(w.map(e=>({id:e.id,name:e.name,size:e.size,type:e.type})))),generatedSubjectLines:JSON.parse(JSON.stringify(T)),selectedSubjectLine:x};localStorage.setItem("savedPromotionTemplate",JSON.stringify(t)),p("✓ Template saved successfully")}function ht(){if(k!=="promotion-email")return;const t=document.createElement("input");t.type="file",t.accept=".json,application/json",t.style.display="none",t.addEventListener("change",e=>{const o=e.target.files[0];if(!o)return;const n=new FileReader;n.onload=i=>{try{const a=JSON.parse(i.target.result);if(!a||typeof a!="object"){p("✗ Invalid template file - not a valid configuration object");return}if(a.templateType&&a.templateType!=="promotion-email"){p("✗ Invalid template file - not a promotion email template");return}if(!("promotionEntries"in a)||!("specialHours"in a)){p("✗ Invalid template file - missing required promotion template fields");return}Fe(a,!0),p("✓ Template imported from file successfully")}catch(a){console.error("Import error:",a),p("✗ Error reading template file - Invalid JSON or corrupted file")}},n.onerror=()=>{p("✗ Error reading file")},n.readAsText(o)}),document.body.appendChild(t),t.click(),setTimeout(()=>{document.body.removeChild(t)},1e3)}async function Fe(t,e=!0){if(!t||typeof t!="object"){p("✗ Invalid template data - not an object");return}if(t.templateType&&t.templateType!=="promotion-email"){p("✗ Invalid template data - wrong template type");return}if(!Array.isArray(t.promotionEntries)){if(t.promotionEntries!==void 0){p("✗ Invalid template data - promotionEntries must be an array");return}t.promotionEntries=[]}if(!Array.isArray(t.specialHours)){if(t.specialHours!==void 0){p("✗ Invalid template data - specialHours must be an array");return}t.specialHours=[]}if(!Array.isArray(t.howToShopItems)){if(t.howToShopItems!==void 0){p("✗ Invalid template data - howToShopItems must be an array");return}t.howToShopItems=[]}if(!Array.isArray(t.importantNotesItems)){if(t.importantNotesItems!==void 0){p("✗ Invalid template data - importantNotesItems must be an array");return}t.importantNotesItems=[]}Array.isArray(t.attachedPDFs)||(t.attachedPDFs=[]),Array.isArray(t.generatedSubjectLines)||(t.generatedSubjectLines=[]),setTimeout(()=>{const i=v("promoDateRange"),a=v("promoYear"),s=v("promoTitle");if(i){i.value=t.dateRange||"";const r=document.querySelector('[data-clear="promoDateRange"]');r&&i.value.trim()&&r.classList.add("visible")}if(a){a.value=t.year||"";const r=document.querySelector('[data-clear="promoYear"]');r&&a.value.trim()&&r.classList.add("visible")}if(s){s.value=t.title||"";const r=document.querySelector('[data-clear="promoTitle"]');r&&s.value.trim()&&r.classList.add("visible")}},100),E=JSON.parse(JSON.stringify(t.promotionEntries||[])),$=JSON.parse(JSON.stringify(t.specialHours||[])),C=JSON.parse(JSON.stringify(t.howToShopItems||[])),L=JSON.parse(JSON.stringify(t.importantNotesItems||[])),T=JSON.parse(JSON.stringify(t.generatedSubjectLines||[])),x=t.selectedSubjectLine||null;const o=new Set(w.map(i=>i.id));w=[];const n=t.attachedPDFs||[];if(n.length>0){let i=0;for(;!I&&i<20;)await new Promise(a=>setTimeout(a,50)),i++;I||console.warn("IndexedDB not initialized after waiting, PDFs may not have data")}for(const i of n)if(!o.has(i.id))if(i.data){w.push(i);try{await ue(i)}catch(a){console.warn(`Failed to save PDF ${i.name} to IndexedDB:`,a)}}else try{const a=await Xe(i.id);a&&a.data?w.push(a):console.warn(`PDF ${i.name} (ID: ${i.id}) data not found in IndexedDB or config, skipping.`)}catch(a){console.warn(`Failed to restore PDF ${i.name} from IndexedDB:`,a)}w=w.filter(i=>i.data),e&&(J={},E.forEach(i=>{J[i.id]=!0})),F(),V(),_(),O(),Q(),ne(),D()}function bt(){if(k!=="promotion-email")return;const t={templateType:"promotion-email",version:"1.0",exportedAt:new Date().toISOString(),dateRange:v("promoDateRange")?.value||"",year:v("promoYear")?.value||"",title:v("promoTitle")?.value||"",promotionEntries:JSON.parse(JSON.stringify(E)),specialHours:JSON.parse(JSON.stringify($)),howToShopItems:JSON.parse(JSON.stringify(C)),importantNotesItems:JSON.parse(JSON.stringify(L)),attachedPDFs:JSON.parse(JSON.stringify(w)),generatedSubjectLines:JSON.parse(JSON.stringify(T)),selectedSubjectLine:x},e=JSON.stringify(t,null,2),o=new Blob([e],{type:"application/json"}),n=URL.createObjectURL(o),i=document.createElement("a");i.href=n,i.download=`promotion-template-${new Date().toISOString().split("T")[0]}.json`,i.click(),URL.revokeObjectURL(n),p("✓ Template exported successfully")}function _e(){const t=navigator.platform.toLowerCase();return t.includes("win")?"windows":t.includes("mac")?"mac":"other"}function fe(){return _e()==="mac"?"emltpl":"eml"}function wt(){try{const t=localStorage.getItem("userProfile");t&&(d.userProfile=JSON.parse(t))}catch(t){console.error("Error loading user profile:",t)}}function Et(t){if(!t)return"WEEKLY SALE";const e=t.toLowerCase();return e.includes("nov")&&(e.includes("24")||e.includes("25")||e.includes("26")||e.includes("27")||e.includes("28")||e.includes("29"))?"BLACK FRIDAY OUTLET EVENT":e.includes("nov")&&e.includes("30")||e.includes("dec")&&e.includes("1")&&!e.includes("10")?"CYBER MONDAY SALE":e.includes("dec")?"HOLIDAY SALE EVENT":e.includes("jun")||e.includes("jul")||e.includes("aug")?"SUMMER CLEARANCE":e.includes("aug")&&(e.includes("20")||e.includes("2")||e.includes("3"))||e.includes("sep")&&(e.includes("1")||e.includes("2")||e.includes("3")||e.includes("4")||e.includes("5")||e.includes("6")||e.includes("7")||e.includes("8")||e.includes("9"))?"BACK TO SCHOOL SALE":"WEEKLY SALE"}function ae(){const t=Date.now();E.push({id:t,brand:"",discount:"",collections:"",callout:""}),F()}function St(t){E=E.filter(e=>e.id!==t),F()}function oe(t,e,o,n="id"){const i=t.findIndex(a=>a[n]===e);return o==="up"&&i>0?([t[i-1],t[i]]=[t[i],t[i-1]],!0):o==="down"&&i<t.length-1?([t[i],t[i+1]]=[t[i+1],t[i]],!0):!1}function xt(t){oe(E,t,"up")&&F()}function It(t){oe(E,t,"down")&&F()}function $t(){const t=Date.now();$.push({id:t,day:"",hours:""}),V()}function Lt(t){$=$.filter(e=>e.id!==t),V()}function Ct(t){oe($,t,"up")&&V()}function Tt(t){oe($,t,"down")&&V()}function Pt(){const t=Date.now();C.push({id:t,text:""}),_()}function Bt(t){C=C.filter(e=>e.id!==t),_()}function kt(){const t=Date.now();L.push({id:t,text:""}),O()}function Nt(t){L=L.filter(e=>e.id!==t),O()}function At(){le=!le,_()}function Dt(){ce=!ce,O()}function jt(t){J[t]=!J[t],F()}function ge(t,e,o,n=".editable-item-row"){const i=t.querySelectorAll(n);let a=null,s=null;i.forEach(r=>{r.addEventListener("dragstart",c=>{a=r,s=parseInt(r.dataset.itemId||r.dataset.entryId),r.classList.add("dragging"),c.dataTransfer.effectAllowed="move"}),r.addEventListener("dragend",c=>{r.classList.remove("dragging"),i.forEach(u=>u.classList.remove("drag-over"))}),r.addEventListener("dragover",c=>{c.preventDefault(),c.dataTransfer.dropEffect="move",a!==r&&r.classList.add("drag-over")}),r.addEventListener("dragleave",c=>{r.classList.remove("drag-over")}),r.addEventListener("drop",c=>{if(c.preventDefault(),r.classList.remove("drag-over"),a!==r){const u=parseInt(r.dataset.itemId||r.dataset.entryId),f=e.findIndex(m=>m.id===s),g=e.findIndex(m=>m.id===u);if(f!==-1&&g!==-1){const[m]=e.splice(f,1);e.splice(g,0,m),o()}}})})}function F(){const t=document.getElementById("promotionEntriesContainer");t&&(t.innerHTML=E.map((e,o)=>{const n=S(String(e.id)),i=o===0,a=o===E.length-1,s=J[e.id]||!1;let r="";return e.brand&&e.discount?r=`${e.brand} - ${e.discount}% OFF`:r="Entry not filled out",`
            <div class="promotion-entry ${s?"collapsed":""}" data-entry-id="${n}" draggable="true">
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
                        <button type="button" class="order-btn" data-action="move-up" data-entry-id="${e.id}" title="Move up" ${i?"disabled":""}>▲</button>
                        <button type="button" class="order-btn" data-action="move-down" data-entry-id="${e.id}" title="Move down" ${a?"disabled":""}>▼</button>
                        <span class="entry-number">Entry ${o+1}</span>
                        ${s?`<span class="entry-summary">${r}</span>`:""}
                    </div>
                    <div class="entry-controls">
                        <button type="button" class="collapse-btn" data-action="toggle-collapse" data-entry-id="${e.id}" title="${s?"Expand":"Collapse"}">
                            ${s?"Expand":"Collapse"}
                        </button>
                        <button type="button" class="entry-remove-btn" data-action="remove" data-entry-id="${e.id}" title="Remove">×</button>
                    </div>
                </div>

                <div class="entry-fields" style="display: ${s?"none":"grid"};">
                    <div class="form-group">
                        <label class="form-label" for="entry-${n}-brand">Brand *</label>
                        <select class="form-input entry-brand" id="entry-${n}-brand" name="entry-${n}-brand" data-entry-id="${n}">
                            <option value="">Select brand...</option>
                            <option value="Citizen" ${e.brand==="Citizen"?"selected":""}>Citizen</option>
                            <option value="Bulova" ${e.brand==="Bulova"?"selected":""}>Bulova</option>
                            <option value="Alpina" ${e.brand==="Alpina"?"selected":""}>Alpina</option>
                            <option value="Frederique Constant" ${e.brand==="Frederique Constant"?"selected":""}>Frederique Constant</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="entry-${n}-discount">Discount % *</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-input entry-discount" id="entry-${n}-discount" name="entry-${n}-discount" data-entry-id="${n}" value="${S(e.discount)}" placeholder="60">
                            <button class="clear-input" data-clear="entry-${n}-discount" title="Clear">×</button>
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
        `}).join(""),t.querySelectorAll(".entry-brand, .entry-discount, .entry-collections, .entry-callout").forEach(e=>{e.addEventListener("input",o=>{ye(o),R(),Y()}),e.addEventListener("change",o=>{ye(o),D()})}),ge(t,E,F,".promotion-entry"),t.querySelectorAll("[data-action]").forEach(e=>{e.addEventListener("click",o=>{const n=o.target.dataset.action,i=parseInt(o.target.dataset.entryId);switch(n){case"move-up":xt(i);break;case"move-down":It(i);break;case"toggle-collapse":jt(i);break;case"remove":St(i);break}})}),t.querySelectorAll(".clear-input").forEach(e=>{const o=e.dataset.clear,n=document.getElementById(o);if(n){const i=()=>{e.classList.toggle("visible",n.value.trim().length>0)};i(),n.addEventListener("input",i),e.addEventListener("click",()=>{n.value="",e.classList.remove("visible"),n.focus(),n.dispatchEvent(new Event("input",{bubbles:!0}))})}}),D())}function ye(t){const e=parseInt(t.target.dataset.entryId),o=E.find(n=>n.id===e);o&&(t.target.classList.contains("entry-brand")?o.brand=t.target.value:t.target.classList.contains("entry-discount")?o.discount=t.target.value:t.target.classList.contains("entry-collections")?o.collections=t.target.value:t.target.classList.contains("entry-callout")&&(o.callout=t.target.value))}function V(){const t=document.getElementById("specialHoursContainer");if(!t)return;t.innerHTML=$.map((o,n)=>{const i=S(String(o.id)),a=n===0,s=n===$.length-1;return`
            <div class="special-hour-row" data-hour-id="${i}">
                <div class="special-hour-fields">
                    <div class="form-group">
                        <div class="input-wrapper">
                            <input type="text" class="form-input hour-day" id="hour-${i}-day" name="hour-${i}-day" data-hour-id="${i}" value="${S(o.day)}" placeholder="e.g., Friday Nov 29">
                            <button class="clear-input" data-clear="hour-${i}-day" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <div class="input-wrapper">
                            <input type="text" class="form-input hour-hours" id="hour-${i}-hours" name="hour-${i}-hours" data-hour-id="${i}" value="${S(o.hours)}" placeholder="e.g., 6AM–10PM or CLOSED">
                            <button class="clear-input" data-clear="hour-${i}-hours" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="hour-controls">
                        <button type="button" class="order-btn" data-action="move-hour-up" data-hour-id="${o.id}" title="Move up" ${a?"disabled":""}>▲</button>
                        <button type="button" class="order-btn" data-action="move-hour-down" data-hour-id="${o.id}" title="Move down" ${s?"disabled":""}>▼</button>
                        <button type="button" class="hour-remove-btn" data-action="remove-hour" data-hour-id="${o.id}" title="Remove">×</button>
                    </div>
                </div>
            </div>
        `}).join(""),t.querySelectorAll(".hour-day, .hour-hours").forEach(o=>{o.addEventListener("input",n=>{Mt(n),R(),Y()})}),t.querySelectorAll('[data-action^="move-hour"], [data-action="remove-hour"]').forEach(o=>{o.addEventListener("click",n=>{const i=n.target.dataset.action,a=parseInt(n.target.dataset.hourId);switch(i){case"move-hour-up":Ct(a);break;case"move-hour-down":Tt(a);break;case"remove-hour":Lt(a);break}})}),t.querySelectorAll(".clear-input").forEach(o=>{const n=o.dataset.clear,i=document.getElementById(n);if(i){const a=()=>{o.classList.toggle("visible",i.value.trim().length>0)};a(),i.addEventListener("input",a),o.addEventListener("click",()=>{i.value="",o.classList.remove("visible"),i.focus(),i.dispatchEvent(new Event("input",{bubbles:!0}))})}}),D();const e=document.getElementById("specialHoursReminder");e&&(e.style.display=$.length>0?"block":"none")}function Mt(t){const e=parseInt(t.target.dataset.hourId),o=$.find(n=>n.id===e);o&&(t.target.classList.contains("hour-day")?o.day=t.target.value:t.target.classList.contains("hour-hours")&&(o.hours=t.target.value))}function Ft(){const t=document.getElementById("howToShopItemsContainer");if(!t)return;t.innerHTML=C.map((o,n)=>{const i=S(String(o.id));return`
            <div class="editable-item-row" data-item-id="${i}" draggable="true">
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
                        <div class="input-wrapper">
                            <input type="text" class="form-input shop-item-text" id="shop-item-${i}-text" name="shop-item-${i}-text" data-item-id="${i}" value="${S(o.text)}" placeholder="e.g., Visit us in-store for outlet-exclusive deals">
                            <button class="clear-input" data-clear="shop-item-${i}-text" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="item-controls">
                        <button type="button" class="item-remove-btn" data-action="remove-how-to-shop-item" data-item-id="${o.id}" title="Remove">×</button>
                    </div>
                </div>
            </div>
        `}).join(""),t.querySelectorAll(".shop-item-text").forEach(o=>{o.addEventListener("input",n=>{const i=parseInt(n.target.dataset.itemId),a=C.find(s=>s.id===i);a&&(a.text=n.target.value,R(),Y())})}),ge(t,C,_);const e=document.querySelector('[data-action="add-how-to-shop-item"]');e&&e.addEventListener("click",o=>{o.stopPropagation(),Pt()}),t.querySelectorAll('[data-action="remove-how-to-shop-item"]').forEach(o=>{o.addEventListener("click",n=>{const i=parseInt(n.target.dataset.itemId);Bt(i)})}),t.querySelectorAll(".clear-input").forEach(o=>{const n=o.dataset.clear,i=document.getElementById(n);if(i){const a=()=>{o.classList.toggle("visible",i.value.trim().length>0)};a(),i.addEventListener("input",a),o.addEventListener("click",()=>{i.value="",o.classList.remove("visible"),i.focus(),i.dispatchEvent(new Event("input",{bubbles:!0}))})}})}function _(){const t=document.getElementById("howToShopWrapper");if(!t)return;if(le)t.innerHTML=`
            <div class="collapsible-section-header expanded" data-action="toggle-how-to-shop">
                <span class="section-label">How to Shop</span>
                <button type="button" class="edit-section-btn">Collapse</button>
            </div>
            <div class="collapsible-section-content">
                <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
                    <button type="button" class="btn" data-action="add-how-to-shop-item" style="padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Item</button>
                </div>
                <div id="howToShopItemsContainer"></div>
            </div>
        `,Ft();else{const o=C.filter(n=>n.text&&n.text.trim()).length;t.innerHTML=`
            <div class="collapsible-section-header" data-action="toggle-how-to-shop">
                <span class="section-label">How to Shop (${o} items)</span>
                <button type="button" class="edit-section-btn">Expand</button>
            </div>
        `}const e=t.querySelector('[data-action="toggle-how-to-shop"]');e&&e.addEventListener("click",At)}function _t(){const t=document.getElementById("importantNotesItemsContainer");if(!t)return;t.innerHTML=L.map((o,n)=>{const i=S(String(o.id));return`
            <div class="editable-item-row" data-item-id="${i}" draggable="true">
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
                        <div class="input-wrapper">
                            <input type="text" class="form-input important-notes-item-text" id="important-notes-item-${i}-text" name="important-notes-item-${i}-text" data-item-id="${i}" value="${S(o.text)}" placeholder="e.g., Important safety information or key details">
                            <button class="clear-input" data-clear="important-notes-item-${i}-text" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="item-controls">
                        <button type="button" class="item-remove-btn" data-action="remove-important-notes-item" data-item-id="${o.id}" title="Remove">×</button>
                    </div>
                </div>
            </div>
        `}).join(""),t.querySelectorAll(".important-notes-item-text").forEach(o=>{o.addEventListener("input",n=>{const i=parseInt(n.target.dataset.itemId),a=L.find(s=>s.id===i);a&&(a.text=n.target.value,R(),Y())})}),ge(t,L,O);const e=document.querySelector('[data-action="add-important-notes-item"]');e&&e.addEventListener("click",o=>{o.stopPropagation(),kt()}),t.querySelectorAll('[data-action="remove-important-notes-item"]').forEach(o=>{o.addEventListener("click",n=>{const i=parseInt(n.target.dataset.itemId);Nt(i)})}),t.querySelectorAll(".clear-input").forEach(o=>{const n=o.dataset.clear,i=document.getElementById(n);if(i){const a=()=>{o.classList.toggle("visible",i.value.trim().length>0)};a(),i.addEventListener("input",a),o.addEventListener("click",()=>{i.value="",o.classList.remove("visible"),i.focus(),i.dispatchEvent(new Event("input",{bubbles:!0}))})}})}function O(){const t=document.getElementById("importantNotesWrapper");if(!t)return;if(ce)t.innerHTML=`
            <div class="collapsible-section-header expanded" data-action="toggle-important-notes">
                <span class="section-label">Important Notes</span>
                <button type="button" class="edit-section-btn">Collapse</button>
            </div>
            <div class="collapsible-section-content">
                <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
                    <button type="button" class="btn" data-action="add-important-notes-item" style="padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Item</button>
                </div>
                <div id="importantNotesItemsContainer"></div>
            </div>
        `,_t();else{const o=L.filter(n=>n.text&&n.text.trim()).length;t.innerHTML=`
            <div class="collapsible-section-header" data-action="toggle-important-notes">
                <span class="section-label">Important Notes (${o} items)</span>
                <button type="button" class="edit-section-btn">Expand</button>
            </div>
        `}const e=t.querySelector('[data-action="toggle-important-notes"]');e&&e.addEventListener("click",Dt)}function he(){if(C.length===0){const t=z(),e=d.userProfile&&d.userProfile.storeEmail?d.userProfile.storeEmail:"store@citizenwatchgroup.com";C=[{id:Date.now()+1,text:"Visit us in-store for outlet-exclusive deals"},{id:Date.now()+2,text:`Call ${t} for availability`},{id:Date.now()+3,text:"$20 flat-rate ground shipping in US"},{id:Date.now()+4,text:`Email ${e}`}]}L.length===0&&(L=[{id:Date.now()+10,text:"*Select models only"},{id:Date.now()+11,text:"See attached PDF for complete model details"},{id:Date.now()+12,text:"Limited availability - while supplies last"},{id:Date.now()+13,text:"Email response time up to 48 hours"}],d.userProfile&&d.userProfile.storeDirections&&L.push({id:Date.now()+14,text:`Find us at ${d.userProfile.storeDirections}`}))}let re=!1;function Oe(){if(re)return;re=!0;const t=localStorage.getItem("savedPromotionTemplate");if(t)try{const y=JSON.parse(t);E=[],$=[],C=[],L=[],w=[],T=[],x=null}catch(y){console.error("Error loading saved template:",y),E=[],$=[],C=[],L=[],w=[],T=[],x=null,he()}else E=[],$=[],C=[],L=[],w=[],T=[],x=null,he();const e=l.formSectionTitle,o=document.createElement("div");o.className="section-header-with-controls",o.innerHTML=`
        <h2 class="section-title" style="margin-bottom: 0;">Promotion Email (HTML) Fields</h2>
        <div class="section-header-controls">
            <button type="button" class="undo-redo-btn" id="undoBtn" title="Undo (Ctrl+Z)" disabled>
                <span>↶ Undo</span>
            </button>
            <button type="button" class="undo-redo-btn" id="redoBtn" title="Redo (Ctrl+Y)" disabled>
                <span>↷ Redo</span>
            </button>
        </div>
    `,e.replaceWith(o),l.formFields.innerHTML=`
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



        <div class="form-group full-width" style="margin-top: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <label class="form-label" style="margin-bottom: 0;">Discount Entries</label>
                <button type="button" class="btn" id="addEntryBtn" style="flex: 0 0 auto; padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Entry</button>
            </div>
            <div id="promotionEntriesContainer"></div>
        </div>

        <div class="form-group full-width" style="margin-top: 1.25rem;">
            <div id="howToShopWrapper"></div>
        </div>

        <div class="form-group full-width" style="margin-top: 0.75rem;">
            <div id="importantNotesWrapper"></div>
        </div>

        <div class="form-group full-width" style="margin-top: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <label class="form-label" style="margin-bottom: 0;">Special Hours (optional)</label>
                <button type="button" class="btn" id="addHourBtn" style="flex: 0 0 auto; padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Special Hours</button>
            </div>
            <div class="field-help" style="margin-bottom: 0.75rem;">For holidays or special sale hours (e.g., Black Friday extended hours)</div>
            <div id="specialHoursContainer"></div>
            <div id="specialHoursReminder" style="display: none; background: #fff3cd; border-left: 3px solid #ffc107; padding: 1rem; margin-top: 1rem;">
                <strong>⚠️ Reminder:</strong> Don't forget to update your special hours on Yelp and Google Maps!
            </div>
        </div>

        <div class="form-group full-width" style="margin-top: 1.25rem;">
            <label class="form-label">ATTACHMENTS (OPTIONAL)</label>
            <div class="field-help" style="margin-bottom: 0.75rem;">Upload PDF files to attach to your promotional email (max 10MB per file)</div>
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
    `;const n=v("promoDateRange"),i=v("promoYear"),a=v("promoTitle");if(n){n.addEventListener("input",()=>{const P=document.querySelector('[data-clear="promoDateRange"]');P&&P.classList.toggle("visible",n.value.trim().length>0),R()});const y=document.querySelector('[data-clear="promoDateRange"]');y&&y.addEventListener("click",()=>{n.value="",y.classList.remove("visible"),n.focus(),D()})}if(i){i.addEventListener("input",()=>{const P=document.querySelector('[data-clear="promoYear"]');P&&P.classList.toggle("visible",i.value.trim().length>0),R()});const y=document.querySelector('[data-clear="promoYear"]');y&&y.addEventListener("click",()=>{i.value="",y.classList.remove("visible"),i.focus(),D()})}if(a){a.addEventListener("input",()=>{const P=document.querySelector('[data-clear="promoTitle"]');P&&P.classList.toggle("visible",a.value.trim().length>0),R()});const y=document.querySelector('[data-clear="promoTitle"]');y&&y.addEventListener("click",()=>{a.value="",y.classList.remove("visible"),a.focus(),D()})}const s=document.getElementById("addEntryBtn");s&&s.addEventListener("click",ae);const r=document.getElementById("addHourBtn");if(r&&r.addEventListener("click",$t),t)try{const y=JSON.parse(t);Fe(y,!1)}catch(y){console.error("Error applying saved template:",y),ae(),_(),O()}else ae(),_(),O();const c=l.undoBtn,u=l.redoBtn;c&&c.addEventListener("click",De),u&&u.addEventListener("click",je);const f=document.getElementById("saveTemplateBtn"),g=document.getElementById("importTemplateBtn"),m=document.getElementById("exportTemplateBtn");f&&f.addEventListener("click",yt),g&&g.addEventListener("click",ht),m&&m.addEventListener("click",bt);const b=document.getElementById("pdfDropzone"),h=document.getElementById("pdfFileInput");b&&h&&(b.addEventListener("click",()=>{h.click()}),h.addEventListener("change",Ot),b.addEventListener("dragover",y=>{y.preventDefault(),b.classList.add("dragover")}),b.addEventListener("dragleave",()=>{b.classList.remove("dragover")}),b.addEventListener("drop",y=>{y.preventDefault(),b.classList.remove("dragover");const P=Array.from(y.dataTransfer.files).filter(X=>X.type==="application/pdf");P.length>0?ze(P):p("⚠ Please drop only PDF files")})),Q(),document.addEventListener("keydown",qt),re=!1}function Ot(t){const e=Array.from(t.target.files);ze(e),t.target.value=""}function ze(t){let o=!1;for(const n of t){if(n.type!=="application/pdf"){p(`✗ ${n.name} is not a PDF file`),o=!0;continue}if(n.size>10485760){const a=(n.size/1048576).toFixed(2);p(`✗ ${n.name} is too large (${a}MB). Max size is 10MB.`),o=!0;continue}if(w.some(a=>a.name===n.name)){p(`⚠ ${n.name} is already attached`);continue}const i=new FileReader;i.onload=async a=>{const s={id:Date.now()+Math.random(),name:n.name,size:n.size,type:n.type,data:a.target.result};let r=0;for(;!I&&r<20;)await new Promise(c=>setTimeout(c,50)),r++;try{I?(await ue(s),console.log(`PDF ${n.name} saved to IndexedDB with ID:`,s.id)):(console.warn("IndexedDB not initialized, PDF will not persist after refresh"),p("⚠ PDF saved to memory but may not persist after refresh"))}catch(c){console.warn("Failed to save PDF to IndexedDB:",c),p("⚠ PDF saved to memory but may not persist after refresh")}w.push(s),Q(),Y(),!o&&t.length===1&&p(`✓ ${n.name} attached successfully`)},i.onerror=()=>{p(`✗ Error reading ${n.name}`)},i.readAsDataURL(n)}!o&&t.length>1&&p(`✓ ${t.length} PDFs attached successfully`)}function Q(){const t=document.getElementById("attachedPDFsList");if(t){if(w.length===0){t.innerHTML="";return}t.innerHTML=w.map(e=>{const o=(e.size/1024).toFixed(1),n=(e.size/(1024*1024)).toFixed(2),i=e.size>1024*1024?`${n} MB`:`${o} KB`,a=!!e.data,s=a?"pdf-name-clickable":"pdf-name-disabled",r=a?`Click to preview ${e.name}`:`${e.name} - Preview unavailable (data not loaded)`,c=a?"":'<span style="color: #ff9800; margin-left: 0.5rem;" title="Preview unavailable">⚠</span>';return`
            <div class="attached-pdf-item" data-pdf-id="${e.id}">
                <div class="pdf-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <text x="12" y="17" font-size="6" text-anchor="middle" fill="currentColor">PDF</text>
                    </svg>
                </div>
                <div class="pdf-info">
                    <div class="pdf-name ${s}"
                         title="${r}"
                         ${a?'data-action="preview-pdf" data-pdf-id="'+e.id+'" role="button" tabindex="0"':""}>
                        ${e.name}${c}
                    </div>
                    <div class="pdf-size">${i}</div>
                </div>
                <button class="pdf-remove-btn" data-action="remove-pdf" data-pdf-id="${e.id}" title="Remove PDF">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `}).join(""),t.querySelectorAll('[data-action="preview-pdf"]').forEach(e=>{e.addEventListener("click",o=>{const n=parseFloat(o.currentTarget.dataset.pdfId);be(n)}),e.addEventListener("keypress",o=>{if(o.key==="Enter"){const n=parseFloat(o.currentTarget.dataset.pdfId);be(n)}})}),t.querySelectorAll('[data-action="remove-pdf"]').forEach(e=>{e.addEventListener("click",o=>{const n=parseFloat(o.currentTarget.dataset.pdfId);zt(n)})})}}async function zt(t){const e=w.find(o=>o.id===t);if(e){try{await et(t)}catch(o){console.warn("Failed to delete PDF from IndexedDB:",o)}w=w.filter(o=>o.id!==t),Q(),Y(),p(`✓ ${e.name} removed`)}}function be(t){const e=w.find(s=>s.id===t);if(!e||!e.data){p("✗ PDF data not available for preview");return}G=e;const o=document.getElementById("pdfPreviewModal"),n=document.getElementById("pdfPreviewIframe"),i=document.getElementById("pdfPreviewTitle"),a=document.getElementById("pdfDownloadBtn");if(!o||!n||!i||!a){console.error("PDF preview modal elements not found");return}try{const s=atob(e.data.split(",")[1]),r=new Array(s.length);for(let g=0;g<s.length;g++)r[g]=s.charCodeAt(g);const c=new Uint8Array(r),u=new Blob([c],{type:"application/pdf"});H&&URL.revokeObjectURL(H),H=URL.createObjectURL(u),n.src=H;const f=document.getElementById("pdfLoadingIndicator");f&&setTimeout(()=>{f.style.display="none"},500)}catch(s){console.error("Error creating blob URL for PDF:",s),p("✗ Could not display PDF preview");return}i.textContent=e.name,o.style.display="flex",setTimeout(()=>{o.classList.add("active")},10),o.focus()}function se(){const t=document.getElementById("pdfPreviewModal");t&&(t.classList.remove("active"),setTimeout(()=>{t.style.display="none"},300));const e=document.getElementById("pdfPreviewIframe");e&&(e.src="about:blank"),H&&(URL.revokeObjectURL(H),H=null),G=null}function we(){if(!G)return;const t=document.createElement("a");t.href=G.data,t.download=G.name,t.click()}function ne(){const t=document.getElementById("subjectLinesContainer");if(!t)return;if(T.length===0){t.innerHTML='<div class="subject-lines-empty">Generate your email template first to create subject line suggestions</div>';return}const e=document.getElementById("selectedSubjectInput"),o=e?e.value:null,n=o!==null?o:x||"",i=T.map((r,c)=>`<option value="${c}" ${r===x?"selected":""}>${A(r)}</option>`).join("");t.innerHTML=`
        <div class="subject-line-dropdown-wrapper">
            <label class="subject-dropdown-label" for="subjectLineDropdown">Choose a subject line suggestion:</label>
            <select id="subjectLineDropdown" class="subject-line-dropdown">
                <option value="" disabled ${x?"":"selected"}>Select a subject line...</option>
                ${i}
            </select>
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
    `;const a=document.getElementById("subjectLineDropdown");a&&a.addEventListener("change",r=>{const c=parseInt(r.target.value);c>=0&&c<T.length&&Rt(c)});const s=document.getElementById("selectedSubjectInput");s&&s.addEventListener("input",r=>{x=r.target.value;const c=document.getElementById("subjectCharCount");if(c){const u=r.target.value.length,f=u<=50;c.className=`char-count ${f?"optimal":"warning"}`,c.textContent=`${u} chars ${f?"✓":"(>50)"}`}})}function Ht(){const t=v("promoDateRange")?.value||"",e=[...new Set(E.map(a=>a.brand).filter(Boolean))],o=Math.max(...E.map(a=>parseInt(a.discount)||0));let n=[];t&&n.push(`Sale This Week: ${t}`),e.length>0&&(e.length===1?n.push(`${e[0]} Sale: Up to ${o}% OFF`):n.push(`${e.slice(0,2).join(" & ")} Sale: Up to ${o}% OFF`)),o>0&&n.push(`Save Up to ${o}% on Your Favorite Brands`),n.push("Exclusive Deals Inside - Do not Miss Out!");const i=U();i&&(n=n.map(a=>`${a} at ${i}`)),T=[...new Set(n)],x=T[0]||null,ne()}function Rt(t){if(t>=0&&t<T.length){x=T[t];const e=document.getElementById("selectedSubjectCard");e&&(e.style.display="block");const o=document.getElementById("selectedSubjectInput");o&&(o.value=x);const n=document.getElementById("subjectCharCount");if(n){const i=x.length,a=i<=50;n.className=`char-count ${a?"optimal":"warning"}`,n.textContent=`${i} chars ${a?"✓":"(>50)"}`}}}function qt(t){(t.ctrlKey||t.metaKey)&&(t.key==="z"?(t.preventDefault(),De()):t.key==="y"&&(t.preventDefault(),je()))}function Ut(t){const e=t.promoDateRange||"",o=t.promoTitle&&t.promoTitle.trim()?A(t.promoTitle):Et(e),n=t.promoYear&&t.promoYear.trim()?t.promoYear.trim():new Date().getFullYear(),i=z();let a="";E.forEach(m=>{if(!m.brand||!m.discount)return;let b="";m.collections&&m.collections.trim()&&(b=m.collections.split(",").map(y=>A(y.trim())).filter(y=>y).map(y=>`*${y}`).join(" • ")),a+=`
                <p style="font-size: 18px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-bottom: 8px;"><b>${A(m.brand)} - ${A(m.discount)}% OFF</b></p>`,b&&(a+=`
                <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-left: 20px; margin-top: 0; margin-bottom: ${m.callout?"5px":"20px"};">
                    ${A(b)}
                </p>`),m.callout&&m.callout.trim()&&(a+=`
                <p style="font-size: 13px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-left: 20px; margin-top: 0; margin-bottom: 20px; color: #0066cc; font-style: italic;">
                    ${A(m.callout)}
                </p>`)});let s="7400 Las Vegas Blvd. South, Suite 231<br>Las Vegas, NV 89123",r="https://www.google.com/maps?q=36.05145495363422,-115.16933573536541",c=i.replace(/\D/g,""),u="Mon–Sat: 10AM–8PM | Sun: 10AM–7PM";if(d.userProfile){if(d.userProfile.storeEmail?c=d.userProfile.storeEmail:d.userProfile.storeName&&(c=`${d.userProfile.storeName.toLowerCase().replace(/\s+/g,"")}@citizenwatchgroup.com`),d.userProfile.storeAddress&&(s=d.userProfile.storeAddress.replace(/\n/g,"<br>")),d.userProfile.storeHours&&(u=d.userProfile.storeHours),d.userProfile.storePlusCode&&d.userProfile.storePlusCode.trim())r=`https://www.google.com/maps?q=${encodeURIComponent(d.userProfile.storePlusCode)}`;else if(d.userProfile.storeAddress&&d.userProfile.storeAddress.trim()){const m=d.userProfile.storeAddress.replace(/<br>/g," ").replace(/\n/g," ");r=`https://www.google.com/maps?q=${encodeURIComponent(m)}`}}let f=C.filter(m=>m.text&&m.text.trim()).map(m=>`• ${A(m.text)}`).join(`<br>
                    `),g=L.filter(m=>m.text&&m.text.trim()).map(m=>`• ${A(m.text)}`).join(`<br>
                    `);return`<!DOCTYPE html>
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
                <div style="background-color: #f5f5f5; padding: 15px; margin-bottom: 20px;">
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0 0 10px 0;"><b>HOW TO SHOP</b></p>
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">
                    ${f}</p>
                </div>

                <!-- IMPORTANT NOTES BOX -->
                <div style="border: 1px solid #ddd; padding: 15px;">
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0 0 10px 0;"><b>IMPORTANT NOTES</b></p>
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">
                    ${g}</p>
                </div>

            </td>
        </tr>

        <!-- FOOTER -->
        <tr>
            <td style="background-color: #2c3e50; padding: 20px; text-align: center;">
                <h3 style="color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 18px; margin: 0 0 10px 0;">CITIZEN COMPANY STORE</h3>
                <p style="color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 14px; margin: 5px 0;">
                    📍 <a href="${r}" target="_blank" style="color: white;">
                    ${s}</a>
                </p>
                <p style="color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 14px; margin: 5px 0;">
                    📞 <a href="tel:+1${i.replace(/\D/g,"")}" target="_blank" style="color: white;">${i}</a> |
                    📧 <a href="mailto:${c}" target="_blank" style="color: white;">${c}</a>
                </p>
                <p style="color: #ffd700; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 13px; margin: 10px 0 0 0;">
                    <b>STORE HOURS</b><br>
                    ${u}
                </p>${$.length>0?`
                <p style="color: #ffd700; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 13px; margin: 10px 0 0 0;">
                    <b>SPECIAL HOURS</b><br>
                    ${$.map(m=>m.day&&m.hours?`${m.day}: ${m.hours}`:"").filter(m=>m).join("<br>")}
                </p>`:""}
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
</html>`}function He(){l.templateSelect.addEventListener("change",()=>{Ue(l.templateSelect.value)}),l.generateBtn.addEventListener("click",Yt),l.clearBtn.addEventListener("click",Vt),l.themeToggle.addEventListener("click",so),l.searchBox.addEventListener("input",()=>{const t=l.searchBox.value.trim();l.clearSearch.classList.toggle("visible",t.length>0),Se(t)}),l.clearSearch.addEventListener("click",()=>{l.searchBox.value="",l.clearSearch.classList.remove("visible"),Se("")}),Je()}function Jt(t){const e=t.id,o=B[k];if(!o)return;const n=o.fields.find(c=>c.id===e);if(!n||!n.validation)return;const{pattern:i,message:a}=n.validation,s=i.test(t.value);t.classList.toggle("invalid",!s);let r=t.nextElementSibling;return(!r||!r.classList.contains("validation-msg"))&&(r=document.createElement("div"),r.className="validation-msg",t.parentNode.insertBefore(r,t.nextSibling)),r.textContent=s?"":a,r.style.display=s?"none":"block",s}function Yt(){const t=B[k];if(!t){p("Please select a template first");return}if(k==="promotion-email"){const s=v("promoDateRange");if(!s||!s.value.trim()){p("✗ Please enter a date range"),$e();return}let r=!0;if(E.forEach(c=>{(!c.brand||!c.discount)&&(r=!1)}),!r){p("✗ Please fill out all brand and discount fields in entries"),$e();return}D(),T.length===0&&Ht(),p("✓ Preview and subject lines generated!");return}const e={};let o=!0,n=null;if(t.fields.forEach(s=>{const r=v(s.id);r&&(e[s.id]=r.value,s.validation&&(Jt(r)||(o=!1,n||(n=r))))}),!o){p("✗ Please fix the errors in the form"),n&&n.focus();return}const i=t.generate(e);Me();const a=v("outputArea");if(a&&(a.value=i),window.originalMessageContent=i,ie(),t.hasEditableSubject){const s=Z(i),r=document.getElementById("subjectLineContent");r&&qe(r,s)}l.outputCard.scrollIntoView({behavior:"smooth"})}function Vt(){const t=B[k];t&&t.fields.forEach(e=>{const o=v(e.id);if(o){o.value="",o.classList.remove("invalid");const n=o.nextElementSibling;n&&n.classList.contains("validation-msg")&&(n.style.display="none")}}),k==="promotion-email"&&(E=[],$=[],C=[],L=[],w=[],T=[],x=null,tt(),Oe()),l.outputArea&&(l.outputArea.value=""),l.outputCard&&(l.outputCard.innerHTML=""),k==="promotion-email"&&D(),ie(),p("✓ Form cleared")}function Wt(){const t=v("codeArea")?.value;if(!t){p("⚠ No HTML code to send");return}if(!x){p("⚠ Please select a subject line first");return}Gt(x,t)}async function Gt(t,e){const o=d.userProfile.name||`${U()} ${te()}`,n=d.userProfile.email||"store@citizenwatchgroup.com",i=await ee(o,n,"","",t,e,w),a=new Blob([i],{type:"message/rfc822"}),s=URL.createObjectURL(a),r=document.createElement("a");r.href=s;const c=t.replace(/[^a-z0-9]/gi,"_").toLowerCase(),f=fe()==="emltpl"?".emltpl":".eml";r.download=`${c}${f}`,r.click(),URL.revokeObjectURL(s),p("✓ Email file generated. Check your downloads.")}async function ee(t,e,o,n,i,a,s=[]){const r=`----mixed=${Date.now().toString(16)}`,c=`----related=${Date.now().toString(16)}`;let u=`From: "${t}" <${e}>\r
`;n&&(u+=`Bcc: ${n}\r
`),u+=`Subject: ${i}\r
`,u+=`MIME-Version: 1.0\r
`,u+=`Content-Type: multipart/mixed; boundary="${r}"\r
\r
`,u+=`--${r}\r
`,u+=`Content-Type: multipart/related; boundary="${c}"\r
\r
`,u+=`--${c}\r
`,u+=`Content-Type: text/html; charset=utf-8\r
`,u+=`Content-Transfer-Encoding: quoted-printable\r
\r
`,u+=`${Qt(a)}\r
\r
`,u+=`--${c}--\r
`;for(const f of s)if(f.data){const g=f.data.split(",")[1];u+=`--${r}\r
`,u+=`Content-Type: ${f.type}; name="${f.name}"\r
`,u+=`Content-Disposition: attachment; filename="${f.name}"\r
`,u+=`Content-Transfer-Encoding: base64\r
\r
`,u+=`${g}\r
`}return u+=`--${r}--\r
`,u}function Re(t){const e=t.split(/[\s,;\n]+/).map(o=>o.trim().toLowerCase()).filter(Boolean);return[...new Set(e)]}function de(t){return/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(String(t).toLowerCase())}function Kt(){const t=v("batchSize");if(!t)return;let e=parseInt(t.value);isNaN(e)||e<50?e=50:e>1e3&&(e=1e3),t.value=e}function Ee(){const t=v("bulkEmailList"),e=v("bulkAnalysis"),o=v("bulkStats");if(!t||!e||!o)return;const n=Re(t.value),i=n.filter(de),a=n.filter(u=>!de(u)),s=parseInt(v("batchSize")?.value)||500,r=Math.ceil(i.length/s);e.style.display=n.length>0?"block":"none";let c=`
        <p><strong>Total Emails:</strong> ${n.length}</p>
        <p><strong>Valid Emails:</strong> <span style="color: #28a745;">${i.length}</span></p>
        <p><strong>Invalid Emails:</strong> <span style="color: #dc3545;">${a.length}</span></p>
        <p><strong>Batches to Generate:</strong> ${r} (at ${s} emails/batch)</p>
    `;a.length>0&&(c+=`<p style="margin-top: 0.5rem;"><strong>Invalid entries:</strong> ${a.join(", ")}</p>`),o.innerHTML=c}async function Zt(){const t=v("bulkEmailList"),e=parseInt(v("batchSize")?.value)||500,o=document.querySelector('input[name="downloadFormat"]:checked')?.value;if(!t||!x){p("✗ Please enter emails and select a subject line");return}const n=Re(t.value).filter(de);if(n.length===0){p("✗ No valid emails to send");return}const i=v("codeArea")?.value;if(!i){p("✗ No HTML code generated");return}try{await ot(n)}catch(c){console.warn("Failed to save recipients to IndexedDB:",c)}const a=d.userProfile.name||`${U()} ${te()}`,s=d.userProfile.email||"store@citizenwatchgroup.com",r=[];for(let c=0;c<n.length;c+=e)r.push(n.slice(c,c+e));if(p(`Generating ${r.length} email files...`),o==="zip"){const c=new JSZip;for(let m=0;m<r.length;m++){const b=r[m].join(","),h=await ee(a,s,"",b,x,i,w);c.file(`batch_${m+1}_of_${r.length}.eml`,h)}const u=await c.generateAsync({type:"blob"}),f=URL.createObjectURL(u),g=document.createElement("a");g.href=f,g.download=`email_batches_${new Date().toISOString().split("T")[0]}.zip`,g.click(),URL.revokeObjectURL(f)}else for(let c=0;c<r.length;c++){const u=r[c].join(","),f=await ee(a,s,"",u,x,i,w),g=new Blob([f],{type:"message/rfc822"}),m=URL.createObjectURL(g),b=document.createElement("a");b.href=m,b.download=`batch_${c+1}_of_${r.length}.eml`,b.click(),URL.revokeObjectURL(m),await new Promise(h=>setTimeout(h,200))}p(`✓ ${r.length} email files generated successfully`)}function Qt(t){const o=new TextEncoder().encode(t);let n="";for(let i=0;i<o.length;i++){const a=o[i],s=String.fromCharCode(a);if(s==="=")n+="=3D";else if(a<32||a>126)if(a===9||a===10||a===13)n+=s;else{const r=a.toString(16).toUpperCase().padStart(2,"0");n+="="+r}else n+=s}return n}function Z(t){const e=t.match(/^Subject:\s*(.*)/im);return e?e[1]:""}function qe(t,e){window.currentSubjectLine=e,t.innerHTML=`
        <div class="editable-subject-line">
            <label for="subjectInput" class="form-label">Subject:</label>
            <input type="text" id="subjectInput" class="form-input" value="${S(e)}">
        </div>
    `;const o=document.getElementById("subjectInput");o&&o.addEventListener("input",n=>{window.currentSubjectLine=n.target.value,ut(n.target.value)})}function Xt(t,e){const o=B[t];if(!o)return;let n="",i=e;o.hasEditableSubject?(n=window.currentSubjectLine||Z(e),i=i.replace(/^Subject:.*\r?\n/im,"")):(n=Z(e),i=i.replace(/^Subject:.*\r?\n/im,""));const a=st(i),s=`mailto:?subject=${encodeURIComponent(n)}&body=${encodeURIComponent(a)}`,r=document.createElement("a");r.href=s,document.body.appendChild(r),r.click(),document.body.removeChild(r)}function eo(t,e){const o=B[t];if(!o)return;let n="",i=e;o.hasEditableSubject?(n=window.currentSubjectLine||Z(e),i=i.replace(/^Subject:.*\r?\n/im,"")):(n=Z(e),i=i.replace(/^Subject:.*\r?\n/im,""));const a=d.userProfile.name||`${U()} ${te()}`,s=d.userProfile.email||"store@citizenwatchgroup.com";ee(a,s,"","",n,i,[]).then(r=>{const c=new Blob([r],{type:"message/rfc822"}),u=URL.createObjectURL(c),f=document.createElement("a");f.href=u;const g=n.replace(/[^a-z0-9]/gi,"_").toLowerCase(),b=fe()==="emltpl"?".emltpl":".eml";f.download=`${g}${b}`,f.click(),URL.revokeObjectURL(u)})}function to(){mt(),wt(),oo(),He();const t=localStorage.getItem("selectedTemplate");t&&B[t]&&Ue(t),io(),it({renderPromotionEntries:F,renderSpecialHours:V,renderHowToShopSection:_,renderImportantNotesSection:O,renderAttachedPDFs:Q,renderSubjectLines:ne})}function ie(){const t=document.getElementById("outputArea"),e=document.getElementById("emailPreview"),o=document.querySelector('.output-tab[data-tab="preview"]'),n=document.getElementById("previewContent"),i=document.getElementById("htmlContent");if(!t||!e)return;const a=t.value;if(!a){e.srcdoc='<p style="padding: 20px; color: #999;">No content to preview</p>';return}const s=dt(a),r=document.querySelector('.output-tab[data-tab="html"]');if(o)if(s){o.disabled=!1,o.style.opacity="1",o.style.cursor="pointer";const c=gt(a);e.srcdoc=c}else o.disabled=!0,o.style.opacity="0.5",o.style.cursor="not-allowed",o.classList.remove("active"),r&&r.classList.add("active"),n&&n.classList.remove("active"),i&&i.classList.add("active"),e.srcdoc='<p style="padding: 20px; color: #999;">Preview not available for plain text content</p>'}function oo(t="all"){const e={"Customer Email":[],"Phone Orders":[],Text:[]};Object.keys(B).forEach(o=>{const n=B[o];e[n.category].push({key:o,name:n.name})}),l.templateSelect.innerHTML='<option value="">Select a template...</option>',Object.keys(e).forEach(o=>{if(e[o].length>0){const n=document.createElement("optgroup");n.label=o,e[o].forEach(i=>{const a=document.createElement("option");a.value=i.key,a.textContent=i.name,a.title=lt[i.key]||"",n.appendChild(a)}),l.templateSelect.appendChild(n)}})}function Se(t){if(!t.trim()){l.searchResults.classList.remove("visible"),l.resultCounter.textContent="",l.clearSearch.classList.remove("visible"),l.searchBox.classList.remove("active");return}l.clearSearch.classList.add("visible"),l.searchBox.classList.add("active");const e=t.toLowerCase(),o=Object.keys(B).filter(a=>{const s=B[a];return s.name.toLowerCase().includes(e)||s.category.toLowerCase().includes(e)});let n="";if(o.length===0)n='<div class="search-result-item" style="cursor: default; color: var(--text-tertiary);">No templates found</div>',l.resultCounter.textContent="0 templates found";else{n=o.map(c=>{const u=B[c],f=K(u.name),g=K(u.category);return`
                <div class="search-result-item" data-template-key="${S(c)}">
                    <div class="search-result-name">${f}</div>
                    <div class="search-result-category">${g}</div>
                </div>
            `}).join("");const s=o.length,r=s===1?"":"s";l.resultCounter.textContent=`${s} template${r} found`}const i=l.resultCounter;l.searchResults.innerHTML=n,l.searchResults.appendChild(i),l.searchResults.classList.add("visible")}let xe=null,Ie=!1;function Ue(t){try{if(!t||!B[t]){console.warn("Invalid template key:",t);return}if(t===xe&&Ie)return;Ie=!0,xe=t,k=t;const e=B[t];localStorage.setItem("selectedTemplate",t),l.templateSelect.value=t,l.formSectionTitle.textContent=`${e.name} Fields`;const o=document.getElementById("formPlaceholder");if(o&&o.remove(),e.customTemplate&&t==="promotion-email"){Oe(),pt(),l.clearBtn.disabled=!1;const s=v("openEmailBtn");s&&(s.disabled=!1),(async()=>{let r=0;for(;!I&&r<20;)await new Promise(c=>setTimeout(c,50)),r++;if(!I){console.warn("IndexedDB not initialized, cannot restore bulk emails");return}await new Promise(c=>setTimeout(c,200));try{const c=document.getElementById("bulkEmailList");if(c){const u=await nt();u&&(c.value=u,c.dispatchEvent(new Event("input",{bubbles:!0})))}}catch(c){console.warn("Failed to restore bulk email recipients:",c)}})();return}Me();const n=e.fields.map(s=>{const r=s.replace(/([A-Z])/g," $1").trim(),c=r.charAt(0).toUpperCase()+r.slice(1),u=s.includes("address")||s.includes("Address")||s.includes("Details"),f=s.includes("Verified")||s.includes("Verification"),g=me[s]||{},m=u?" full-width":"",b=g.required?" *":"",h=S(s),y=S(g.example||"");if(f)return`
                    <div class="form-group radio-field">
                        <label class="form-label">${K(c)}${b}</label>
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
                `;const P=ct(s),X=`datalist-${h}`;let ve="";if(P.length>0){const We=P.map(Ge=>`<option value="${S(Ge)}">`).join("");ve=`
                <datalist id="${X}">
                    ${We}
                </datalist>
            `}let W="";d.userProfile&&((s==="employeeName"||s==="yourName")&&d.userProfile.employeeName?W=S(d.userProfile.employeeName):s==="storePhone"&&d.userProfile.storePhone?W=S(d.userProfile.storePhone):s==="storeName"&&d.userProfile.storeName&&(W=S(d.userProfile.storeName)));const Ve=u?`<textarea id="${h}" class="form-textarea" data-field="${h}" ${g.required?"required":""} placeholder="${y}">${W}</textarea>`:`<input type="text" id="${h}" class="form-input" data-field="${h}" ${g.required?"required":""} placeholder="${y}" value="${W}" list="${X}">${ve}`;return`
                <div class="form-group${m}">
                    <label class="form-label" for="${h}">${K(c)}${b}</label>
                    <div class="input-wrapper">
                        ${Ve}
                        <button class="clear-input" data-clear="${h}" title="Clear">×</button>
                    </div>
                    <div class="calculated-value" data-calc="${h}" style="display: none;"></div>
                    <div class="error-message" data-error="${h}" style="display: none;"></div>
                </div>
            `});l.formFields.innerHTML=n.join(""),setTimeout(()=>{He()},0),l.formFields.addEventListener("click",s=>{if(s.target.classList.contains("clear-input")){const r=s.target.dataset.clear,c=document.getElementById(r);c&&(c.value="",s.target.classList.remove("visible"),c.focus(),ie())}}),l.formFields.addEventListener("input",s=>{if(s.target.classList.contains("form-input")||s.target.classList.contains("form-textarea")){const r=s.target.id,c=l.formFields.querySelector(`[data-clear="${r}"]`);c&&c.classList.toggle("visible",s.target.value.trim().length>0)}}),l.formFields.querySelectorAll(".form-input, .form-textarea").forEach(s=>{const r=l.formFields.querySelector(`[data-clear="${s.id}"]`);r&&s.value.trim().length>0&&r.classList.add("visible")});const a=document.getElementById("outputArea");a&&(a.value=""),l.clearBtn.disabled=!1}catch(e){console.error("Error selecting template:",e),p("Error loading template")}}function $e(){l.formFields.querySelectorAll(".form-input, .form-textarea").forEach(e=>{const o=e.dataset.field;(me[o]||{}).required&&!e.value.trim()?e.classList.add("error"):e.classList.remove("error")})}function no(){const t=document.getElementById("outputArea");if(!t){console.error("outputArea element not found"),p("⚠ Output area not found");return}const e=t.value;if(!e){p("⚠ Nothing to copy");return}if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(e).then(()=>{p("✓ Copied!")}).catch(o=>{console.error("Clipboard error:",o),p("⚠ Copy failed")});else try{t.select();const o=document.execCommand("copy");p(o?"✓ Copied!":"⚠ Copy failed")}catch(o){console.error("Copy error:",o),p("⚠ Copy not supported")}}function io(){const t=document.getElementById("pdfPreviewModal");if(!t)return;const e=document.getElementById("pdfModalClose"),o=t.querySelector(".pdf-modal-backdrop"),n=document.getElementById("pdfDownloadBtn"),i=document.getElementById("pdfDownloadFallback");e&&e.addEventListener("click",se),o&&o.addEventListener("click",se),n&&n.addEventListener("click",we),i&&i.addEventListener("click",we),document.addEventListener("keydown",a=>{a.key==="Escape"&&t.style.display==="flex"&&se()})}function ao(){const t=document.getElementById("formatStatusText");if(!t)return;const e=_e(),o=fe(),n=o==="emltpl"?"Template":"EML",i=o==="emltpl"?".emltpl":".eml";let a="Unknown";e==="windows"?a="Windows":e==="mac"?a="macOS":a="Other Platform",t.innerHTML=`<strong>${n} Format:</strong> Optimized for ${a} (${i} files)<br><small>Best compatibility with Outlook on your platform</small>`,t.style.color="var(--text-secondary)"}function ro(){const t=localStorage.getItem("theme")||"light",e=localStorage.getItem("lightPalette")||"pastel",o=localStorage.getItem("darkPalette")||"midnight-blue";document.documentElement.setAttribute("data-theme",t),document.documentElement.setAttribute("data-light-palette",e),document.documentElement.setAttribute("data-dark-palette",o),Ye(t)}function Je(){const e=`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><path fill="${getComputedStyle(document.documentElement).getPropertyValue("--text-secondary").trim()}" d="M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z"/></svg>`,n=`url('data:image/svg+xml;charset=UTF-8,${encodeURIComponent(e)}')`;document.querySelectorAll("select.form-input, select.template-select").forEach(a=>{a.style.backgroundImage=n})}function so(){const e=(document.documentElement.getAttribute("data-theme")||"light")==="light"?"dark":"light";document.documentElement.setAttribute("data-theme",e),localStorage.setItem("theme",e),Ye(e),setTimeout(Je,50)}function Ye(t){const e=document.querySelector(".theme-toggle-slider");e&&(e.style.transform=t==="dark"?"translateX(20px)":"translateX(0)")}document.addEventListener("DOMContentLoaded",async()=>{ro(),await Qe(),to()});

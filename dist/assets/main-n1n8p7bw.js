/* empty css               */(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const l of r.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&n(l)}).observe(document,{childList:!0,subtree:!0});function o(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(i){if(i.ep)return;i.ep=!0;const r=o(i);fetch(i.href,r)}})();let x=null;const Ze="CitizenTemplates",Qe=2,j="promotionPDFs",q="bulkEmailRecipients";function Xe(){return new Promise(t=>{const e=window.indexedDB||window.webkitIndexedDB||window.mozIndexedDB;if(!e){console.warn("IndexedDB not supported, PDFs will not persist across refresh"),t(!1);return}const o=e.open(Ze,Qe);o.onerror=()=>{console.warn("IndexedDB initialization failed:",o.error),t(!1)},o.onsuccess=()=>{x=o.result,console.log("IndexedDB initialized successfully"),t(!0)},o.onupgradeneeded=n=>{const i=n.target.result;i.objectStoreNames.contains(j)||i.createObjectStore(j,{keyPath:"id"}),i.objectStoreNames.contains(q)||i.createObjectStore(q,{keyPath:"id"})}})}function ue(t){return new Promise((e,o)=>{if(!x){o(new Error("IndexedDB not initialized"));return}const r=x.transaction([j],"readwrite").objectStore(j).put(t);r.onerror=()=>o(r.error),r.onsuccess=()=>e(t.id)})}function et(t){return new Promise((e,o)=>{if(!x){e(null);return}const r=x.transaction([j],"readonly").objectStore(j).get(t);r.onerror=()=>o(r.error),r.onsuccess=()=>e(r.result||null)})}function tt(t){return new Promise((e,o)=>{if(!x){e();return}const r=x.transaction([j],"readwrite").objectStore(j).delete(t);r.onerror=()=>o(r.error),r.onsuccess=()=>e()})}function ot(){return new Promise((t,e)=>{if(!x){t();return}const i=x.transaction([j],"readwrite").objectStore(j).clear();i.onerror=()=>e(i.error),i.onsuccess=()=>t()})}function nt(t){return new Promise((e,o)=>{if(!x){o(new Error("IndexedDB not initialized"));return}const r=x.transaction([q],"readwrite").objectStore(q).put({id:"bulk-email-recipients",data:t,savedAt:new Date().toISOString()});r.onerror=()=>o(r.error),r.onsuccess=()=>e()})}function it(){return new Promise((t,e)=>{if(!x){t("");return}const i=x.transaction([q],"readonly").objectStore(q).get("bulk-email-recipients");i.onerror=()=>e(i.error),i.onsuccess=()=>{const r=i.result;t(r&&r.data?r.data:"")}})}let Ce,Te,Pe,Be,ke,Ne;function rt(t){Ce=t.renderPromotionEntries,Te=t.renderSpecialHours,Pe=t.renderHowToShopSection,Be=t.renderImportantNotesSection,ke=t.renderAttachedPDFs,Ne=t.renderSubjectLines}const d={currentCategory:"all",currentTemplate:null,searchActive:!1,userProfile:null,promotionEntries:[],specialHours:[],howToShopItems:[],importantNotesItems:[],attachedPDFs:[],generatedSubjectLines:[],selectedSubjectLine:null,howToShopExpanded:!1,importantNotesExpanded:!1,entryCollapsedStates:{},historyStack:[],historyIndex:-1};function at(){}function Ae(t){d.promotionEntries=JSON.parse(JSON.stringify(t.promotionEntries)),d.specialHours=JSON.parse(JSON.stringify(t.specialHours)),d.howToShopItems=JSON.parse(JSON.stringify(t.howToShopItems)),d.importantNotesItems=JSON.parse(JSON.stringify(t.importantNotesItems)),d.attachedPDFs=t.attachedPDFs?JSON.parse(JSON.stringify(t.attachedPDFs)):[],d.generatedSubjectLines=t.generatedSubjectLines?JSON.parse(JSON.stringify(t.generatedSubjectLines)):[],d.selectedSubjectLine=t.selectedSubjectLine||null,Ce(),Te(),Pe(),Be(),ke(),Ne()}function K(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}function E(t){return t.replace(/'/g,"&#39;").replace(/"/g,"&quot;")}function k(t){const e={};for(const[o,n]of Object.entries(t))typeof n=="string"?e[o]=K(n):e[o]=n;return e}function z(){return d.userProfile&&d.userProfile.storePhone?d.userProfile.storePhone:"702-357-8990"}function U(){return d.userProfile&&d.userProfile.storeName?d.userProfile.storeName:"Citizen Company Store"}function te(){return d.userProfile&&d.userProfile.storeLocation?d.userProfile.storeLocation:"the South Premium Outlets"}function st(){return`Citizen Company Store at ${te()}`}function M(t="text"){const e=d.userProfile&&d.userProfile.employeeName?d.userProfile.employeeName:"Employee Name",o=d.userProfile&&d.userProfile.jobTitle?d.userProfile.jobTitle:"Sales Associate",n=d.userProfile&&d.userProfile.storeName?d.userProfile.storeName:"Citizen Company Store",i=d.userProfile&&d.userProfile.storeAddress?d.userProfile.storeAddress:"",r=d.userProfile&&d.userProfile.storePhone?d.userProfile.storePhone:"555-123-4567",l=d.userProfile&&d.userProfile.storePlusCode?d.userProfile.storePlusCode:"",a=d.userProfile&&d.userProfile.storeEmail?d.userProfile.storeEmail:"";if(t==="html"){const c=g=>{const v=document.createElement("div");return v.textContent=g,v.innerHTML};let u="";if(a){const g=a.split("@"),v=g[0]||"",m=g[1]||"";u=`<p style="margin: 0; padding: 0; font-size: 8pt; color: #2f2f2f;">
        Email: ${c(v)}<a href="mailto:${c(a)}" style="color: #0000ee; text-decoration: underline; font-size: 8pt;">@${c(m)}</a>
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
        Tel/SMS: ${c(r)}
    </p>
    ${l?`<p style="margin: 0; padding: 0; font-size: 8pt;">
        <a href="https://maps.google.com/?q=${encodeURIComponent(l)}" style="color: #0000ee; text-decoration: underline; font-size: 8pt;">View on Google Maps</a>
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
Tel/SMS: ${r}

Alpina | Bulova | Citizen | Frederique Constant

Please consider the environment before printing this e-mail`}function lt(t){if(!t)return"";const e=c=>{const u=document.createElement("div");return u.textContent=c,u.innerHTML};let o=t;const n=[/\n\n-{5,}\n/,/______+/,/\n\n[A-Z][a-z]+ [A-Z][a-z]+ │ /];for(const c of n){const u=o.match(c);if(u){o=o.substring(0,u.index).trim();break}}const r=o.split(/\n\n+/).map(c=>{const u=c.split(`
`);return u.some(v=>v.trim())&&u.every(v=>{const m=v.trim();return!m||m.startsWith("•")||m.startsWith("-")})?`    <ul style="margin: 10px 0; padding-left: 20px; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt;">
${u.filter(m=>m.trim()).map(m=>{const b=m.replace(/^[•-]\s*/,"").trim();return`        <li style="margin: 5px 0;">${e(b)}</li>`}).join(`
`)}
    </ul>`:`    <p style="margin: 10px 0; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);">${c.split(`
`).map(m=>e(m)).join("<br>")}</p>`}),l=M("html");return`${r.join(`
`)}

    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
${l}
    </div>`}const ct={"new-customer-welcome":"Use after a customer visits the store for the first time. Adds them to VIP list. (Enhanced: editable subject, EML download)","back-in-stock":"Follow up when a previously unavailable item is back. Include hold deadline.","thank-you-warranty":"Send after purchase to explain warranty registration and care tips.","weekly-sale":"Personalized sale notification for customers who showed interest in specific collections. (Enhanced: editable subject, EML download)","new-model-arrival":"Alert interested customers when a specific model they asked about arrives. (Enhanced: editable subject, EML download)","limited-edition":"High-priority notification for VIP collectors about exclusive pieces. (Enhanced: editable subject, EML download)","vip-reconnection":"Re-engage customers who haven't visited in a while. Mention store evolution. (Enhanced: editable subject, EML download)","phone-confirmation":"Immediate confirmation after taking a phone order. Include all order details. (Enhanced: editable subject, EML download)","phone-shipped":"Send when order ships with UPS tracking. Mention signature requirement. (Enhanced: editable subject, EML download)","phone-under-500":"Internal approval request for phone orders under $500. Manager verification. (Enhanced: editable subject, EML download)","phone-corporate":"Corporate/bulk order approval. Include purpose and fulfilling store. (Enhanced: editable subject, EML download)","inter-store-notification":"Notify receiving store that order is prepared and ready for pickup. (Enhanced: editable subject, EML download)","text-availability":"Quick response to customer inquiry about specific model availability.","text-thank-you":"Post-purchase thank you via text. Keep it brief and friendly.","text-interest-followup":"Follow up on specific watch customer showed interest in. Use after store visit.","promotion-email":"Generate HTML email for weekly promotions with discount tiers. Auto-generates title based on dates."},me={customerName:{example:"John Smith",required:!0},employeeName:{example:"Your name",required:!0},yourName:{example:"Your name",required:!0},clientName:{example:"John Smith",required:!0},brand:{example:"Citizen",required:!0,suggestions:["Citizen","Bulova","Frederique Constant"]},modelName:{example:"Eco-Drive Promaster",required:!0},modelNumber:{example:"BN0150-28E",required:!1},price:{example:"299",required:!0,validation:"currency"},discount:{example:"20",required:!0,validation:"number",dependent:!0},msrp:{example:"399",required:!0,validation:"currency",dependent:!0},quantity:{example:"2",required:!0,validation:"number"},unitsQuantity:{example:"1",required:!0,validation:"number"},totalAmount:{example:"299.00",required:!0,validation:"currency"},closingTime:{example:"9:00 PM",required:!0},endDate:{example:"Sunday",required:!0},holdDeadline:{example:"Friday 5PM",required:!0},trackingNumber:{example:"1Z999AA10123456784",required:!1,validation:"tracking"},customerId:{example:"C12345",required:!0},employeeId:{example:"E789",required:!0},warrantyLength:{example:"5-year",required:!0},warrantyYears:{example:"5",required:!0,validation:"number"},carrier:{example:"UPS",required:!0,suggestions:["UPS","FedEx","USPS"]},promoDateRange:{example:"Nov 28 - Dec 1",required:!0},promoYear:{example:"2024-2025",required:!1},promoTitle:{example:"Leave blank for auto-generation",required:!1},promoBrand:{example:"Citizen",required:!0,suggestions:["Citizen","Bulova","Alpina","Frederique Constant"]},promoDiscount:{example:"60",required:!0,validation:"number"},promoCollections:{example:"Corso, Avion, Marine Star",required:!1},promoCallout:{example:"Optional special note",required:!1}};function dt(t){return(me[t]||{}).suggestions||[]}const P={"new-customer-welcome":{name:"New Customer Welcome",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","employeeName"],generate:t=>`Subject: Welcome to Citizen Company Store - Your VIP Access

Hi ${k(t).customerName},

Thank you for visiting our Citizen Company Store outlet location! It was a pleasure helping you explore our offerings today.

I've added you to our VIP email list for weekly promotional updates featuring exclusive outlet pricing on our timepieces.

Please don't hesitate to reach out by replying to this email or call the store at ${z()}. I would be happy to check availability on any models you're considering.

${M()}`},"new-model-arrival":{name:"New Model Arrival",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","keyFeature1","keyFeature2","keyFeature3","price","employeeName"],generate:t=>{const e=k(t);let o=`• ${e.keyFeature1}`;return e.keyFeature2&&(o+=`
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

${M()}`}},"limited-edition":{name:"Limited Edition",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","limitedDetails","price","quantityAvailable","employeeName"],generate:t=>{const e=k(t);return`Subject: Exclusive: Limited Edition ${e.modelName} Available

Hi ${e.customerName},

I wanted to reach out to you personally because we just received a ${e.brand} ${e.modelName} (${e.modelNumber}) - ${e.limitedDetails}.

As someone who appreciates fine timepieces and unique additions to your collection, I thought you'd want to know about this immediately.

Price: ${e.price}
Availability: Only ${e.quantityAvailable} available

This is truly a special piece that won't last long. I'd love to show it to you in person and discuss how it could complement your collection.

Can you stop by this week, or would you like me to hold one for you? Please reply to this email or call the store at ${z()}.

${M()}

P.S. - Given the limited availability, I'm only reaching out to our most valued collectors. Let me know if you're interested!`}},"vip-reconnection":{name:"VIP Reconnection",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["clientName","employeeName"],generate:t=>`Subject: Your Store Has Evolved - We'd Love to Show You What's New

Hi ${k(t).clientName},

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

P.S. - We now carry everything from current season pieces to discontinued treasures, giving you more options than ever before.`},"phone-confirmation":{name:"Confirmation",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","price","discount","totalAmount","customerAddress","carrier","trackingNumber","employeeName"],generate:t=>{const e=k(t);let o="";return e.trackingNumber&&(o=`

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

${M()}`}},"phone-shipped":{name:"Shipped with Tracking",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","trackingNumber","customerAddress","employeeName"],generate:t=>{const e=k(t);return`Subject: Your Watch Order - Tracking Information

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

${M()}`}},"phone-under-500":{name:"Under $500 Request",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["managerNameOrStoreName","customerName","customerId","employeeName","employeeId","unitsQuantity","totalAmount","creditCardVerified","needsManagerVerification"],generate:t=>{const e=k(t);if(!e.creditCardVerified||e.creditCardVerified.toLowerCase()!=="yes")throw new Error("Credit card must be verified before generating this order form.");let o="";return e.needsManagerVerification&&e.needsManagerVerification.toLowerCase()==="yes"?o="Ready for manager verification":o="Credit card manager verified - Ready for processing",`Subject: Phone Order Form for ${e.customerName}

Hi ${e.managerNameOrStoreName},

Attached is the form for the phone order for ${e.customerName} (${e.customerId}).

Ringing under: ${e.employeeName} (${e.employeeId})
Units: ${e.unitsQuantity}
Total: ${e.totalAmount}

Order Status: ${o}

${M()}`}},"phone-corporate":{name:"Corporate Approval",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","customerId","employeeName","employeeId","unitsQuantity","totalAmount","fulfillingStore","yourName"],generate:t=>{const e=k(t);return`Subject: Phone Order Approval Request - ${e.customerName}

Hello,

I am forwarding a request for approval on a phone order for ${e.employeeName} (${e.employeeId}).

There are ${e.unitsQuantity} units totaling ${e.totalAmount}. It will be fulfilled at ${e.fulfillingStore}.

Customer: ${e.customerName} (${e.customerId})

I have verified and signed off. Please let us know if you have any questions.

Thank You,
${e.yourName}`}},"inter-store-notification":{name:"Inter-Store Notification",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["recipientStoreName","customerName","trackingNumber"],generate:t=>{const e=k(t);return`Subject: Phone Order Processed and Shipped - ${e.customerName}

Hi ${e.recipientStoreName} Team,

The phone order for ${e.customerName} has been rung and labeled for shipping.

UPS Tracking Number: ${e.trackingNumber}

The package has been prepared and is ready for UPS pickup.

Thank you,`}},"text-availability":{name:"Availability Response",category:"Text",fields:["customerName","modelName","price","closingTime"],generate:t=>{const e=k(t);return`Hi ${e.customerName}! Yes, we have the ${e.modelName} in stock. Current price is ${e.price} with our outlet discount. We're open until ${e.closingTime} today if you'd like to stop by, or I can hold it.`}},"text-thank-you":{name:"Thank You",category:"Text",fields:["customerName","modelName","warrantyLength","brand"],generate:t=>{const e=k(t);return`${e.customerName}, thank you for your purchase today! Your ${e.modelName} comes with a ${e.warrantyLength} warranty. Reach out anytime at ${z()} for any questions. Enjoy your new ${e.brand}!`}},"text-interest-followup":{name:"Sale Alert",category:"Text",fields:["customerName","employeeName","modelName","discount","msrp","endDate"],generate:t=>{const e=k(t),o=parseFloat(e.msrp)||0,n=parseFloat(e.discount)||0,i=(o*(1-n/100)).toFixed(2);return`Hi ${e.customerName}! This is ${e.employeeName} from ${st()}. The ${e.modelName} you were interested in is on ${e.discount}% OFF promotion (MSRP ${e.msrp} now ${i} plus tax) until ${e.endDate}. Please let me know if you'd like me to hold one for you. Thank you!`}},"weekly-sale":{name:"Weekly Sale",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","collectionName","discount","brand","model1","price1","original1","model2","price2","original2","endDate","employeeName"],generate:t=>{const e=k(t);let o=`• ${e.model1} - Now ${e.price1} (was ${e.original1})`;return e.model2&&e.price2&&(o+=`
• ${e.model2} - Now ${e.price2} (was ${e.original2})`),`Subject: ${e.customerName}, This Week's ${e.brand} Sale Includes Your Favorites

Hi ${e.customerName},

I remember you were looking at ${e.collectionName} pieces during your last visit. Good timing - we just started our ${e.discount}% off promotion on select ${e.brand} models this week!

Specifically available in that collection:
${o}

This promotion runs through ${e.endDate}. Would you like me to check if we have your size preference in stock?

${M()}`}},"promotion-email":{name:"Promotion Email",category:"Customer Email",customTemplate:!0,fields:["promoDateRange","promoYear","promoTitle"],generate:()=>""}};let B=null,w=[],I=[],L=[],$=[],y=[],C=[],S=null,le=!1,ce=!1,J={},G=null,H=null;function ut(t){return t?/<(p|div|span|br|html|body|head|table|tr|td|ul|ol|li|h[1-6]|strong|em|a)\b[^>]*>/i.test(t):!1}function pe(t,e){let o;return function(...i){const r=()=>{clearTimeout(o),t(...i)};clearTimeout(o),o=setTimeout(r,e)}}function D(){if(B!=="promotion-email")return;const t=h("promoDateRange"),e=h("promoYear"),o=h("promoTitle");if(!t||!t.value.trim())return;const n={promoDateRange:t.value,promoYear:e?e.value:"",promoTitle:o?o.value:""},i=Jt(n),r=h("codeArea");r&&(r.value=i);const l=h("previewIframe");if(l){const a=l.contentDocument||l.contentWindow.document;a.open(),a.write(i),a.close()}}const R=pe(D,500),mt=pe(ht,300),Y=pe(at,1e3),s={};function pt(){s.templateSelect=document.getElementById("templateSelect"),s.formFields=document.getElementById("formFields"),s.formSectionTitle=document.getElementById("formSectionTitle"),s.outputCard=document.getElementById("outputCard"),s.outputArea=document.getElementById("outputArea"),s.generateBtn=document.getElementById("generateBtn"),s.clearBtn=document.getElementById("clearBtn"),s.copyBtn=document.getElementById("copyBtn"),s.sendEmailBtn=document.getElementById("sendEmailBtn"),s.downloadEmailBtn=document.getElementById("downloadEmailBtn"),s.undoBtn=document.getElementById("undoBtn"),s.redoBtn=document.getElementById("redoBtn"),s.themeToggle=document.getElementById("themeToggle"),s.searchBox=document.getElementById("searchBox"),s.clearSearch=document.getElementById("clearSearch"),s.searchResults=document.getElementById("searchResults"),s.resultCounter=document.getElementById("resultCounter"),s.saveTemplateBtn=document.getElementById("saveTemplateBtn"),s.exportTemplateBtn=document.getElementById("exportTemplateBtn"),s.importTemplateBtn=document.getElementById("importTemplateBtn")}function h(t){return document.getElementById(t)}function p(t,e=2500){const o=document.getElementById("toast");if(!o){console.warn("Toast element not found");return}o.textContent=t,o.classList.add("show"),setTimeout(()=>{o.classList.remove("show")},e)}function De(){s.undoBtn&&(s.undoBtn.disabled=d.historyIndex<=0),s.redoBtn&&(s.redoBtn.disabled=d.historyIndex>=d.historyStack.length-1)}function je(){d.historyIndex>0&&(d.historyIndex--,Ae(d.historyStack[d.historyIndex]),De())}function Me(){d.historyIndex<d.historyStack.length-1&&(d.historyIndex++,Ae(d.historyStack[d.historyIndex]),De())}function ft(){if(!s.outputCard)return;s.bulkEmailList=null,s.bulkAnalysis=null,s.bulkStats=null,s.batchSize=null,s.batchSizeHelp=null,s.codeArea=null,s.previewIframe=null,s.previewContent=null,s.codeContent=null,s.copyPreviewBtn=null,s.openEmailBtn=null,s.outputCard.innerHTML=`
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
    `;const t=s.outputCard.querySelectorAll(".output-tab");t.forEach(l=>{l.addEventListener("click",()=>{const a=l.dataset.tab;t.forEach(c=>c.classList.remove("active")),l.classList.add("active"),s.outputCard.querySelectorAll(".output-content").forEach(c=>{c.classList.remove("active")}),a==="preview"?document.getElementById("previewContent").classList.add("active"):document.getElementById("codeContent").classList.add("active")})});const e=document.getElementById("copyPreviewBtn");e&&e.addEventListener("click",()=>{const l=h("codeArea");l&&l.value?navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(l.value).then(()=>{p("✓ HTML Code Copied!")}).catch(()=>{p("⚠ Copy failed")}):(l.select(),document.execCommand("copy"),p("✓ HTML Code Copied!")):p("⚠ Nothing to copy")});const o=h("openEmailBtn");o&&o.addEventListener("click",Gt);const n=document.getElementById("bulkEmailList"),i=document.getElementById("batchSize"),r=document.getElementById("generateBulkBtn");n&&n.addEventListener("input",Se),i&&i.addEventListener("input",()=>{Zt(),Se()}),r&&r.addEventListener("click",Qt),ne(),setTimeout(ao,2e3)}function Fe(){if(!s.outputCard)return;s.outputArea=null,s.copyBtn=null,s.subjectLineContainer=null,s.sendEmailBtn=null,s.downloadEmailBtn=null,s.previewTab=null,s.htmlTab=null,s.previewContentRegular=null,s.htmlContentRegular=null,s.emailPreview=null;const t=P[B],e=t&&t.hasEditableSubject;let o="",n="";if(e?(o=`
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
        `,s.outputCard.innerHTML=`
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
    `,s.outputArea=document.getElementById("outputArea"),s.copyBtn=document.getElementById("copyBtn"),s.previewTab=document.querySelector('.output-tab[data-tab="preview"]'),s.htmlTab=document.querySelector('.output-tab[data-tab="html"]'),s.previewContentRegular=document.getElementById("previewContent"),s.htmlContentRegular=document.getElementById("htmlContent"),s.emailPreview=document.getElementById("emailPreview"),s.emailPreview&&gt(s.emailPreview),s.copyBtn&&s.copyBtn.addEventListener("click",io),s.previewTab&&s.htmlTab&&(s.previewTab.addEventListener("click",()=>{s.previewTab.classList.add("active"),s.htmlTab.classList.remove("active"),s.previewContentRegular&&s.previewContentRegular.classList.add("active"),s.htmlContentRegular&&s.htmlContentRegular.classList.remove("active"),ie()}),s.htmlTab.addEventListener("click",()=>{s.htmlTab.classList.add("active"),s.previewTab.classList.remove("active"),s.htmlContentRegular&&s.htmlContentRegular.classList.add("active"),s.previewContentRegular&&s.previewContentRegular.classList.remove("active")})),e){const i=document.getElementById("sendEmailBtn"),r=document.getElementById("downloadEmailBtn");i&&i.addEventListener("click",()=>{const a=document.getElementById("outputArea"),c=a?a.value:"";c&&eo(B,c)}),r&&r.addEventListener("click",()=>{const a=document.getElementById("outputArea"),c=window.originalMessageContent||(a?a.value:"");c&&to(B,c)});const l=document.getElementById("subjectLineContent");l&&Ue(l,"")}}function gt(t){if(!t)return;const e=t.contentDocument||t.contentWindow.document;if(!e)return;const o=getComputedStyle(document.documentElement),n=o.getPropertyValue("--bg-tertiary").trim()||"#f8f3ef",i=o.getPropertyValue("--text-primary").trim()||"#2a2420",r=o.getPropertyValue("--text-secondary").trim()||"#666";e.open(),e.write(`
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
                    color: ${r};
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
                    color: ${r};
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
    `),e.close()}function vt(t){let e="Email Preview",o=t;if(window.originalMessageContent){const i=window.originalMessageContent.match(/^Subject:\s*(.+)/m);i&&(e=i[1],o=window.originalMessageContent.replace(/^Subject:.+\n/m,"").trim())}else{const i=t.match(/^Subject:\s*(.+)/m);i&&(e=i[1],o=t.replace(/^Subject:.+\n/m,"").trim())}return`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${N(e)}</title>
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
            <div class="email-subject">${N(e)}</div>
        </div>
        <div class="email-body">
            ${o}
        </div>
    </div>
</body>
</html>`}function N(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}function ht(t){try{const e=document.getElementById("emailPreview");if(!e||!e.srcdoc)return;const o=e.srcdoc,n=/<div class="email-subject">.*?<\/div>/,i=`<div class="email-subject">${N(t)}</div>`,r=o.replace(n,i),l=/<title>.*?<\/title>/,a=`<title>${N(t)}</title>`,c=r.replace(l,a);e.srcdoc=c}catch(e){console.error("Error updating subject in preview:",e)}}async function yt(){if(B!=="promotion-email")return;if(w.forEach(e=>{J[e.id]=!0}),F(),y.length>0&&x){for(const e of y)if(e.data)try{await ue(e),console.log(`Re-saved PDF ${e.name} to IndexedDB during template save`)}catch(o){console.warn(`Failed to save PDF ${e.name} to IndexedDB:`,o)}}const t={templateType:"promotion-email",version:"1.0",savedAt:new Date().toISOString(),dateRange:h("promoDateRange")?.value||"",year:h("promoYear")?.value||"",title:h("promoTitle")?.value||"",promotionEntries:JSON.parse(JSON.stringify(w)),specialHours:JSON.parse(JSON.stringify(I)),howToShopItems:JSON.parse(JSON.stringify(L)),importantNotesItems:JSON.parse(JSON.stringify($)),attachedPDFs:JSON.parse(JSON.stringify(y.map(e=>({id:e.id,name:e.name,size:e.size,type:e.type})))),generatedSubjectLines:JSON.parse(JSON.stringify(C)),selectedSubjectLine:S};localStorage.setItem("savedPromotionTemplate",JSON.stringify(t)),p("✓ Template saved successfully")}function bt(){if(B!=="promotion-email")return;const t=document.createElement("input");t.type="file",t.accept=".json,application/json",t.style.display="none",t.addEventListener("change",e=>{const o=e.target.files[0];if(!o)return;const n=new FileReader;n.onload=i=>{try{const r=JSON.parse(i.target.result);if(!r||typeof r!="object"){p("✗ Invalid template file - not a valid configuration object");return}if(r.templateType&&r.templateType!=="promotion-email"){p("✗ Invalid template file - not a promotion email template");return}if(!("promotionEntries"in r)||!("specialHours"in r)){p("✗ Invalid template file - missing required promotion template fields");return}_e(r,!0),p("✓ Template imported from file successfully")}catch(r){console.error("Import error:",r),p("✗ Error reading template file - Invalid JSON or corrupted file")}},n.onerror=()=>{p("✗ Error reading file")},n.readAsText(o)}),document.body.appendChild(t),t.click(),setTimeout(()=>{document.body.removeChild(t)},1e3)}async function _e(t,e=!0){if(!t||typeof t!="object"){p("✗ Invalid template data - not an object");return}if(t.templateType&&t.templateType!=="promotion-email"){p("✗ Invalid template data - wrong template type");return}if(!Array.isArray(t.promotionEntries)){if(t.promotionEntries!==void 0){p("✗ Invalid template data - promotionEntries must be an array");return}t.promotionEntries=[]}if(!Array.isArray(t.specialHours)){if(t.specialHours!==void 0){p("✗ Invalid template data - specialHours must be an array");return}t.specialHours=[]}if(!Array.isArray(t.howToShopItems)){if(t.howToShopItems!==void 0){p("✗ Invalid template data - howToShopItems must be an array");return}t.howToShopItems=[]}if(!Array.isArray(t.importantNotesItems)){if(t.importantNotesItems!==void 0){p("✗ Invalid template data - importantNotesItems must be an array");return}t.importantNotesItems=[]}Array.isArray(t.attachedPDFs)||(t.attachedPDFs=[]),Array.isArray(t.generatedSubjectLines)||(t.generatedSubjectLines=[]),setTimeout(()=>{const i=h("promoDateRange"),r=h("promoYear"),l=h("promoTitle");if(i){i.value=t.dateRange||"";const a=document.querySelector('[data-clear="promoDateRange"]');a&&i.value.trim()&&a.classList.add("visible")}if(r){r.value=t.year||"";const a=document.querySelector('[data-clear="promoYear"]');a&&r.value.trim()&&a.classList.add("visible")}if(l){l.value=t.title||"";const a=document.querySelector('[data-clear="promoTitle"]');a&&l.value.trim()&&a.classList.add("visible")}},100),w=JSON.parse(JSON.stringify(t.promotionEntries||[])),I=JSON.parse(JSON.stringify(t.specialHours||[])),L=JSON.parse(JSON.stringify(t.howToShopItems||[])),$=JSON.parse(JSON.stringify(t.importantNotesItems||[])),C=JSON.parse(JSON.stringify(t.generatedSubjectLines||[])),S=t.selectedSubjectLine||null;const o=new Set(y.map(i=>i.id));y=[];const n=t.attachedPDFs||[];if(n.length>0){let i=0;for(;!x&&i<20;)await new Promise(r=>setTimeout(r,50)),i++;x||console.warn("IndexedDB not initialized after waiting, PDFs may not have data")}for(const i of n)if(!o.has(i.id))if(i.data){y.push(i);try{await ue(i)}catch(r){console.warn(`Failed to save PDF ${i.name} to IndexedDB:`,r)}}else try{const r=await et(i.id);r&&r.data?y.push(r):console.warn(`PDF ${i.name} (ID: ${i.id}) data not found in IndexedDB or config, skipping.`)}catch(r){console.warn(`Failed to restore PDF ${i.name} from IndexedDB:`,r)}y=y.filter(i=>i.data),e&&(J={},w.forEach(i=>{J[i.id]=!0})),F(),V(),_(),O(),Q(),ne(),D()}function wt(){if(B!=="promotion-email")return;const t={templateType:"promotion-email",version:"1.0",exportedAt:new Date().toISOString(),dateRange:h("promoDateRange")?.value||"",year:h("promoYear")?.value||"",title:h("promoTitle")?.value||"",promotionEntries:JSON.parse(JSON.stringify(w)),specialHours:JSON.parse(JSON.stringify(I)),howToShopItems:JSON.parse(JSON.stringify(L)),importantNotesItems:JSON.parse(JSON.stringify($)),attachedPDFs:JSON.parse(JSON.stringify(y)),generatedSubjectLines:JSON.parse(JSON.stringify(C)),selectedSubjectLine:S},e=JSON.stringify(t,null,2),o=new Blob([e],{type:"application/json"}),n=URL.createObjectURL(o),i=document.createElement("a");i.href=n,i.download=`promotion-template-${new Date().toISOString().split("T")[0]}.json`,i.click(),URL.revokeObjectURL(n),p("✓ Template exported successfully")}function Oe(){const t=navigator.platform.toLowerCase();return t.includes("win")?"windows":t.includes("mac")?"mac":"other"}function fe(){return Oe()==="mac"?"emltpl":"eml"}function Et(){try{const t=localStorage.getItem("userProfile");t&&(d.userProfile=JSON.parse(t))}catch(t){console.error("Error loading user profile:",t)}}function St(t){if(!t)return"WEEKLY SALE";const e=t.toLowerCase();return e.includes("nov")&&(e.includes("24")||e.includes("25")||e.includes("26")||e.includes("27")||e.includes("28")||e.includes("29"))?"BLACK FRIDAY OUTLET EVENT":e.includes("nov")&&e.includes("30")||e.includes("dec")&&e.includes("1")&&!e.includes("10")?"CYBER MONDAY SALE":e.includes("dec")?"HOLIDAY SALE EVENT":e.includes("jun")||e.includes("jul")||e.includes("aug")?"SUMMER CLEARANCE":e.includes("aug")&&(e.includes("20")||e.includes("2")||e.includes("3"))||e.includes("sep")&&(e.includes("1")||e.includes("2")||e.includes("3")||e.includes("4")||e.includes("5")||e.includes("6")||e.includes("7")||e.includes("8")||e.includes("9"))?"BACK TO SCHOOL SALE":"WEEKLY SALE"}function re(){const t=Date.now();w.push({id:t,brand:"",discount:"",collections:"",callout:""}),F()}function xt(t){w=w.filter(e=>e.id!==t),F()}function oe(t,e,o,n="id"){const i=t.findIndex(r=>r[n]===e);return o==="up"&&i>0?([t[i-1],t[i]]=[t[i],t[i-1]],!0):o==="down"&&i<t.length-1?([t[i],t[i+1]]=[t[i+1],t[i]],!0):!1}function It(t){oe(w,t,"up")&&F()}function $t(t){oe(w,t,"down")&&F()}function Lt(){const t=Date.now();I.push({id:t,day:"",hours:""}),V()}function Ct(t){I=I.filter(e=>e.id!==t),V()}function Tt(t){oe(I,t,"up")&&V()}function Pt(t){oe(I,t,"down")&&V()}function Bt(){const t=Date.now();L.push({id:t,text:""}),_()}function kt(t){L=L.filter(e=>e.id!==t),_()}function Nt(){const t=Date.now();$.push({id:t,text:""}),O()}function At(t){$=$.filter(e=>e.id!==t),O()}function Dt(){le=!le,_()}function jt(){ce=!ce,O()}function Mt(t){J[t]=!J[t],F()}function ge(t,e,o,n=".editable-item-row"){const i=t.querySelectorAll(n);let r=null,l=null;i.forEach(a=>{a.addEventListener("dragstart",c=>{r=a,l=parseInt(a.dataset.itemId||a.dataset.entryId),a.classList.add("dragging"),c.dataTransfer.effectAllowed="move"}),a.addEventListener("dragend",c=>{a.classList.remove("dragging"),i.forEach(u=>u.classList.remove("drag-over"))}),a.addEventListener("dragover",c=>{c.preventDefault(),c.dataTransfer.dropEffect="move",r!==a&&a.classList.add("drag-over")}),a.addEventListener("dragleave",c=>{a.classList.remove("drag-over")}),a.addEventListener("drop",c=>{if(c.preventDefault(),a.classList.remove("drag-over"),r!==a){const u=parseInt(a.dataset.itemId||a.dataset.entryId),g=e.findIndex(m=>m.id===l),v=e.findIndex(m=>m.id===u);if(g!==-1&&v!==-1){const[m]=e.splice(g,1);e.splice(v,0,m),o()}}})})}function F(){const t=document.getElementById("promotionEntriesContainer");t&&(t.innerHTML=w.map((e,o)=>{const n=E(String(e.id)),i=o===0,r=o===w.length-1,l=J[e.id]||!1;let a="";return e.brand&&e.discount?a=`${e.brand} - ${e.discount}% OFF`:a="Entry not filled out",`
            <div class="promotion-entry ${l?"collapsed":""}" data-entry-id="${n}" draggable="true">
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
                        <button type="button" class="order-btn" data-action="move-down" data-entry-id="${e.id}" title="Move down" ${r?"disabled":""}>▼</button>
                        <span class="entry-number">Entry ${o+1}</span>
                        ${l?`<span class="entry-summary">${a}</span>`:""}
                    </div>
                    <div class="entry-controls">
                        <button type="button" class="collapse-btn" data-action="toggle-collapse" data-entry-id="${e.id}" title="${l?"Expand":"Collapse"}">
                            ${l?"Expand":"Collapse"}
                        </button>
                        <button type="button" class="entry-remove-btn" data-action="remove" data-entry-id="${e.id}" title="Remove">×</button>
                    </div>
                </div>

                <div class="entry-fields" style="display: ${l?"none":"grid"};">
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
                            <input type="text" class="form-input entry-discount" id="entry-${n}-discount" name="entry-${n}-discount" data-entry-id="${n}" value="${E(e.discount)}" placeholder="60">
                            <button class="clear-input" data-clear="entry-${n}-discount" title="Clear">×</button>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label class="form-label" for="entry-${n}-collections">Collections (comma-separated)</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-input entry-collections" id="entry-${n}-collections" name="entry-${n}-collections" data-entry-id="${n}" value="${E(e.collections)}" placeholder="Corso, Avion, Marine Star">
                            <button class="clear-input" data-clear="entry-${n}-collections" title="Clear">×</button>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label class="form-label" for="entry-${n}-callout">Special Callout (optional)</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-input entry-callout" id="entry-${n}-callout" name="entry-${n}-callout" data-entry-id="${n}" value="${E(e.callout)}" placeholder="Final sale items excluded">
                            <button class="clear-input" data-clear="entry-${n}-callout" title="Clear">×</button>
                        </div>
                    </div>
                </div>
            </div>
        `}).join(""),t.querySelectorAll(".entry-brand, .entry-discount, .entry-collections, .entry-callout").forEach(e=>{e.addEventListener("input",o=>{ye(o),R(),Y()}),e.addEventListener("change",o=>{ye(o),D()})}),ge(t,w,F,".promotion-entry"),t.querySelectorAll("[data-action]").forEach(e=>{e.addEventListener("click",o=>{const n=o.target.dataset.action,i=parseInt(o.target.dataset.entryId);switch(n){case"move-up":It(i);break;case"move-down":$t(i);break;case"toggle-collapse":Mt(i);break;case"remove":xt(i);break}})}),t.querySelectorAll(".clear-input").forEach(e=>{const o=e.dataset.clear,n=document.getElementById(o);if(n){const i=()=>{e.classList.toggle("visible",n.value.trim().length>0)};i(),n.addEventListener("input",i),e.addEventListener("click",()=>{n.value="",e.classList.remove("visible"),n.focus(),n.dispatchEvent(new Event("input",{bubbles:!0}))})}}),D())}function ye(t){const e=parseInt(t.target.dataset.entryId),o=w.find(n=>n.id===e);o&&(t.target.classList.contains("entry-brand")?o.brand=t.target.value:t.target.classList.contains("entry-discount")?o.discount=t.target.value:t.target.classList.contains("entry-collections")?o.collections=t.target.value:t.target.classList.contains("entry-callout")&&(o.callout=t.target.value))}function V(){const t=document.getElementById("specialHoursContainer");if(!t)return;t.innerHTML=I.map((o,n)=>{const i=E(String(o.id)),r=n===0,l=n===I.length-1;return`
            <div class="special-hour-row" data-hour-id="${i}">
                <div class="special-hour-fields">
                    <div class="form-group">
                        <div class="input-wrapper">
                            <input type="text" class="form-input hour-day" id="hour-${i}-day" name="hour-${i}-day" data-hour-id="${i}" value="${E(o.day)}" placeholder="e.g., Friday Nov 29">
                            <button class="clear-input" data-clear="hour-${i}-day" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <div class="input-wrapper">
                            <input type="text" class="form-input hour-hours" id="hour-${i}-hours" name="hour-${i}-hours" data-hour-id="${i}" value="${E(o.hours)}" placeholder="e.g., 6AM–10PM or CLOSED">
                            <button class="clear-input" data-clear="hour-${i}-hours" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="hour-controls">
                        <button type="button" class="order-btn" data-action="move-hour-up" data-hour-id="${o.id}" title="Move up" ${r?"disabled":""}>▲</button>
                        <button type="button" class="order-btn" data-action="move-hour-down" data-hour-id="${o.id}" title="Move down" ${l?"disabled":""}>▼</button>
                        <button type="button" class="hour-remove-btn" data-action="remove-hour" data-hour-id="${o.id}" title="Remove">×</button>
                    </div>
                </div>
            </div>
        `}).join(""),t.querySelectorAll(".hour-day, .hour-hours").forEach(o=>{o.addEventListener("input",n=>{Ft(n),R(),Y()})}),t.querySelectorAll('[data-action^="move-hour"], [data-action="remove-hour"]').forEach(o=>{o.addEventListener("click",n=>{const i=n.target.dataset.action,r=parseInt(n.target.dataset.hourId);switch(i){case"move-hour-up":Tt(r);break;case"move-hour-down":Pt(r);break;case"remove-hour":Ct(r);break}})}),t.querySelectorAll(".clear-input").forEach(o=>{const n=o.dataset.clear,i=document.getElementById(n);if(i){const r=()=>{o.classList.toggle("visible",i.value.trim().length>0)};r(),i.addEventListener("input",r),o.addEventListener("click",()=>{i.value="",o.classList.remove("visible"),i.focus(),i.dispatchEvent(new Event("input",{bubbles:!0}))})}}),D();const e=document.getElementById("specialHoursReminder");e&&(e.style.display=I.length>0?"block":"none")}function Ft(t){const e=parseInt(t.target.dataset.hourId),o=I.find(n=>n.id===e);o&&(t.target.classList.contains("hour-day")?o.day=t.target.value:t.target.classList.contains("hour-hours")&&(o.hours=t.target.value))}function _t(){const t=document.getElementById("howToShopItemsContainer");if(!t)return;t.innerHTML=L.map((o,n)=>{const i=E(String(o.id));return`
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
                            <input type="text" class="form-input shop-item-text" id="shop-item-${i}-text" name="shop-item-${i}-text" data-item-id="${i}" value="${E(o.text)}" placeholder="e.g., Visit us in-store for outlet-exclusive deals">
                            <button class="clear-input" data-clear="shop-item-${i}-text" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="item-controls">
                        <button type="button" class="item-remove-btn" data-action="remove-how-to-shop-item" data-item-id="${o.id}" title="Remove">×</button>
                    </div>
                </div>
            </div>
        `}).join(""),t.querySelectorAll(".shop-item-text").forEach(o=>{o.addEventListener("input",n=>{const i=parseInt(n.target.dataset.itemId),r=L.find(l=>l.id===i);r&&(r.text=n.target.value,R(),Y())})}),ge(t,L,_);const e=document.querySelector('[data-action="add-how-to-shop-item"]');e&&e.addEventListener("click",o=>{o.stopPropagation(),Bt()}),t.querySelectorAll('[data-action="remove-how-to-shop-item"]').forEach(o=>{o.addEventListener("click",n=>{const i=parseInt(n.target.dataset.itemId);kt(i)})}),t.querySelectorAll(".clear-input").forEach(o=>{const n=o.dataset.clear,i=document.getElementById(n);if(i){const r=()=>{o.classList.toggle("visible",i.value.trim().length>0)};r(),i.addEventListener("input",r),o.addEventListener("click",()=>{i.value="",o.classList.remove("visible"),i.focus(),i.dispatchEvent(new Event("input",{bubbles:!0}))})}})}function _(){const t=document.getElementById("howToShopWrapper");if(!t)return;if(le)t.innerHTML=`
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
        `,_t();else{const o=L.filter(n=>n.text&&n.text.trim()).length;t.innerHTML=`
            <div class="collapsible-section-header" data-action="toggle-how-to-shop">
                <span class="section-label">How to Shop (${o} items)</span>
                <button type="button" class="edit-section-btn">Expand</button>
            </div>
        `}const e=t.querySelector('[data-action="toggle-how-to-shop"]');e&&e.addEventListener("click",Dt)}function Ot(){const t=document.getElementById("importantNotesItemsContainer");if(!t)return;t.innerHTML=$.map((o,n)=>{const i=E(String(o.id));return`
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
                            <input type="text" class="form-input important-notes-item-text" id="important-notes-item-${i}-text" name="important-notes-item-${i}-text" data-item-id="${i}" value="${E(o.text)}" placeholder="e.g., Important safety information or key details">
                            <button class="clear-input" data-clear="important-notes-item-${i}-text" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="item-controls">
                        <button type="button" class="item-remove-btn" data-action="remove-important-notes-item" data-item-id="${o.id}" title="Remove">×</button>
                    </div>
                </div>
            </div>
        `}).join(""),t.querySelectorAll(".important-notes-item-text").forEach(o=>{o.addEventListener("input",n=>{const i=parseInt(n.target.dataset.itemId),r=$.find(l=>l.id===i);r&&(r.text=n.target.value,R(),Y())})}),ge(t,$,O);const e=document.querySelector('[data-action="add-important-notes-item"]');e&&e.addEventListener("click",o=>{o.stopPropagation(),Nt()}),t.querySelectorAll('[data-action="remove-important-notes-item"]').forEach(o=>{o.addEventListener("click",n=>{const i=parseInt(n.target.dataset.itemId);At(i)})}),t.querySelectorAll(".clear-input").forEach(o=>{const n=o.dataset.clear,i=document.getElementById(n);if(i){const r=()=>{o.classList.toggle("visible",i.value.trim().length>0)};r(),i.addEventListener("input",r),o.addEventListener("click",()=>{i.value="",o.classList.remove("visible"),i.focus(),i.dispatchEvent(new Event("input",{bubbles:!0}))})}})}function O(){const t=document.getElementById("importantNotesWrapper");if(!t)return;if(ce)t.innerHTML=`
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
        `,Ot();else{const o=$.filter(n=>n.text&&n.text.trim()).length;t.innerHTML=`
            <div class="collapsible-section-header" data-action="toggle-important-notes">
                <span class="section-label">Important Notes (${o} items)</span>
                <button type="button" class="edit-section-btn">Expand</button>
            </div>
        `}const e=t.querySelector('[data-action="toggle-important-notes"]');e&&e.addEventListener("click",jt)}function be(){if(L.length===0){const t=z(),e=d.userProfile&&d.userProfile.storeEmail?d.userProfile.storeEmail:"store@citizenwatchgroup.com";L=[{id:Date.now()+1,text:"Visit us in-store for outlet-exclusive deals"},{id:Date.now()+2,text:`Call ${t} for availability`},{id:Date.now()+3,text:"$20 flat-rate ground shipping in US"},{id:Date.now()+4,text:`Email ${e}`}]}$.length===0&&($=[{id:Date.now()+10,text:"*Select models only"},{id:Date.now()+11,text:"See attached PDF for complete model details"},{id:Date.now()+12,text:"Limited availability - while supplies last"},{id:Date.now()+13,text:"Email response time up to 48 hours"}],d.userProfile&&d.userProfile.storeDirections&&$.push({id:Date.now()+14,text:`Find us at ${d.userProfile.storeDirections}`}))}let ae=!1;function ze(){if(ae)return;ae=!0;const t=localStorage.getItem("savedPromotionTemplate");if(t)try{const f=JSON.parse(t);w=[],I=[],L=[],$=[],y=[],C=[],S=null}catch(f){console.error("Error loading saved template:",f),w=[],I=[],L=[],$=[],y=[],C=[],S=null,be()}else w=[],I=[],L=[],$=[],y=[],C=[],S=null,be();const e=s.formSectionTitle,o=document.createElement("div");o.className="section-header-with-controls",o.innerHTML=`
        <h2 class="section-title" style="margin-bottom: 0;">Promotion Email (HTML) Fields</h2>
        <div class="section-header-controls">
            <button type="button" class="undo-redo-btn" id="undoBtn" title="Undo (Ctrl+Z)" disabled>
                <span>↶ Undo</span>
            </button>
            <button type="button" class="undo-redo-btn" id="redoBtn" title="Redo (Ctrl+Y)" disabled>
                <span>↷ Redo</span>
            </button>
        </div>
    `,e.replaceWith(o),s.formSectionTitle=o.querySelector("h2"),s.formFields.innerHTML=`
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
    `;const n=h("promoDateRange"),i=h("promoYear"),r=h("promoTitle");if(n){n.addEventListener("input",()=>{const T=document.querySelector('[data-clear="promoDateRange"]');T&&T.classList.toggle("visible",n.value.trim().length>0),R()});const f=document.querySelector('[data-clear="promoDateRange"]');f&&f.addEventListener("click",()=>{n.value="",f.classList.remove("visible"),n.focus(),D()})}if(i){i.addEventListener("input",()=>{const T=document.querySelector('[data-clear="promoYear"]');T&&T.classList.toggle("visible",i.value.trim().length>0),R()});const f=document.querySelector('[data-clear="promoYear"]');f&&f.addEventListener("click",()=>{i.value="",f.classList.remove("visible"),i.focus(),D()})}if(r){r.addEventListener("input",()=>{const T=document.querySelector('[data-clear="promoTitle"]');T&&T.classList.toggle("visible",r.value.trim().length>0),R()});const f=document.querySelector('[data-clear="promoTitle"]');f&&f.addEventListener("click",()=>{r.value="",f.classList.remove("visible"),r.focus(),D()})}const l=document.getElementById("addEntryBtn");l&&l.addEventListener("click",re);const a=document.getElementById("addHourBtn");if(a&&a.addEventListener("click",Lt),t)try{const f=JSON.parse(t);_e(f,!1)}catch(f){console.error("Error applying saved template:",f),re(),_(),O()}else re(),_(),O();const c=s.undoBtn,u=s.redoBtn;c&&c.addEventListener("click",je),u&&u.addEventListener("click",Me);const g=document.getElementById("saveTemplateBtn"),v=document.getElementById("importTemplateBtn"),m=document.getElementById("exportTemplateBtn");g&&g.addEventListener("click",yt),v&&v.addEventListener("click",bt),m&&m.addEventListener("click",wt);const b=document.getElementById("pdfDropzone"),A=document.getElementById("pdfFileInput");b&&A&&(b.addEventListener("click",()=>{A.click()}),A.addEventListener("change",zt),b.addEventListener("dragover",f=>{f.preventDefault(),b.classList.add("dragover")}),b.addEventListener("dragleave",()=>{b.classList.remove("dragover")}),b.addEventListener("drop",f=>{f.preventDefault(),b.classList.remove("dragover");const T=Array.from(f.dataTransfer.files).filter(X=>X.type==="application/pdf");T.length>0?He(T):p("⚠ Please drop only PDF files")})),Q(),document.addEventListener("keydown",Ut),ae=!1}function zt(t){const e=Array.from(t.target.files);He(e),t.target.value=""}function He(t){let o=!1;for(const n of t){if(n.type!=="application/pdf"){p(`✗ ${n.name} is not a PDF file`),o=!0;continue}if(n.size>10485760){const r=(n.size/1048576).toFixed(2);p(`✗ ${n.name} is too large (${r}MB). Max size is 10MB.`),o=!0;continue}if(y.some(r=>r.name===n.name)){p(`⚠ ${n.name} is already attached`);continue}const i=new FileReader;i.onload=async r=>{const l={id:Date.now()+Math.random(),name:n.name,size:n.size,type:n.type,data:r.target.result};let a=0;for(;!x&&a<20;)await new Promise(c=>setTimeout(c,50)),a++;try{x?(await ue(l),console.log(`PDF ${n.name} saved to IndexedDB with ID:`,l.id)):(console.warn("IndexedDB not initialized, PDF will not persist after refresh"),p("⚠ PDF saved to memory but may not persist after refresh"))}catch(c){console.warn("Failed to save PDF to IndexedDB:",c),p("⚠ PDF saved to memory but may not persist after refresh")}y.push(l),Q(),Y(),!o&&t.length===1&&p(`✓ ${n.name} attached successfully`)},i.onerror=()=>{p(`✗ Error reading ${n.name}`)},i.readAsDataURL(n)}!o&&t.length>1&&p(`✓ ${t.length} PDFs attached successfully`)}function Q(){const t=document.getElementById("attachedPDFsList");if(t){if(y.length===0){t.innerHTML="";return}t.innerHTML=y.map(e=>{const o=(e.size/1024).toFixed(1),n=(e.size/(1024*1024)).toFixed(2),i=e.size>1024*1024?`${n} MB`:`${o} KB`,r=!!e.data,l=r?"pdf-name-clickable":"pdf-name-disabled",a=r?`Click to preview ${e.name}`:`${e.name} - Preview unavailable (data not loaded)`,c=r?"":'<span style="color: #ff9800; margin-left: 0.5rem;" title="Preview unavailable">⚠</span>';return`
            <div class="attached-pdf-item" data-pdf-id="${e.id}">
                <div class="pdf-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <text x="12" y="17" font-size="6" text-anchor="middle" fill="currentColor">PDF</text>
                    </svg>
                </div>
                <div class="pdf-info">
                    <div class="pdf-name ${l}"
                         title="${a}"
                         ${r?'data-action="preview-pdf" data-pdf-id="'+e.id+'" role="button" tabindex="0"':""}>
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
        `}).join(""),t.querySelectorAll('[data-action="preview-pdf"]').forEach(e=>{e.addEventListener("click",o=>{const n=parseFloat(o.currentTarget.dataset.pdfId);we(n)}),e.addEventListener("keypress",o=>{if(o.key==="Enter"){const n=parseFloat(o.currentTarget.dataset.pdfId);we(n)}})}),t.querySelectorAll('[data-action="remove-pdf"]').forEach(e=>{e.addEventListener("click",o=>{const n=parseFloat(o.currentTarget.dataset.pdfId);Ht(n)})})}}async function Ht(t){const e=y.find(o=>o.id===t);if(e){try{await tt(t)}catch(o){console.warn("Failed to delete PDF from IndexedDB:",o)}y=y.filter(o=>o.id!==t),Q(),Y(),p(`✓ ${e.name} removed`)}}function we(t){const e=y.find(l=>l.id===t);if(!e||!e.data){p("✗ PDF data not available for preview");return}G=e;const o=document.getElementById("pdfPreviewModal"),n=document.getElementById("pdfPreviewIframe"),i=document.getElementById("pdfPreviewTitle"),r=document.getElementById("pdfDownloadBtn");if(!o||!n||!i||!r){console.error("PDF preview modal elements not found");return}try{const l=atob(e.data.split(",")[1]),a=new Array(l.length);for(let v=0;v<l.length;v++)a[v]=l.charCodeAt(v);const c=new Uint8Array(a),u=new Blob([c],{type:"application/pdf"});H&&URL.revokeObjectURL(H),H=URL.createObjectURL(u),n.src=H;const g=document.getElementById("pdfLoadingIndicator");g&&setTimeout(()=>{g.style.display="none"},500)}catch(l){console.error("Error creating blob URL for PDF:",l),p("✗ Could not display PDF preview");return}i.textContent=e.name,o.style.display="flex",setTimeout(()=>{o.classList.add("active")},10),o.focus()}function se(){const t=document.getElementById("pdfPreviewModal");t&&(t.classList.remove("active"),setTimeout(()=>{t.style.display="none"},300));const e=document.getElementById("pdfPreviewIframe");e&&(e.src="about:blank"),H&&(URL.revokeObjectURL(H),H=null),G=null}function Ee(){if(!G)return;const t=document.createElement("a");t.href=G.data,t.download=G.name,t.click()}function ne(){const t=document.getElementById("subjectLinesContainer");if(!t)return;if(C.length===0){t.innerHTML='<div class="subject-lines-empty">Generate your email template first to create subject line suggestions</div>';return}const e=document.getElementById("selectedSubjectInput"),o=e?e.value:null,n=o!==null?o:S||"",i=C.map((a,c)=>`<option value="${c}" ${a===S?"selected":""}>${N(a)}</option>`).join("");t.innerHTML=`
        <div class="subject-line-dropdown-wrapper">
            <label class="subject-dropdown-label" for="subjectLineDropdown">Choose a subject line suggestion:</label>
            <select id="subjectLineDropdown" class="subject-line-dropdown">
                <option value="" disabled ${S?"":"selected"}>Select a subject line...</option>
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
                    value="${E(n)}"
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
    `;const r=document.getElementById("subjectLineDropdown");r&&r.addEventListener("change",a=>{const c=parseInt(a.target.value);c>=0&&c<C.length&&qt(c)});const l=document.getElementById("selectedSubjectInput");l&&l.addEventListener("input",a=>{S=a.target.value;const c=document.getElementById("subjectCharCount");if(c){const u=a.target.value.length,g=u<=50;c.className=`char-count ${g?"optimal":"warning"}`,c.textContent=`${u} chars ${g?"✓":"(>50)"}`}})}function Rt(){const t=h("promoDateRange")?.value||"",e=[...new Set(w.map(r=>r.brand).filter(Boolean))],o=Math.max(...w.map(r=>parseInt(r.discount)||0));let n=[];t&&n.push(`Sale This Week: ${t}`),e.length>0&&(e.length===1?n.push(`${e[0]} Sale: Up to ${o}% OFF`):n.push(`${e.slice(0,2).join(" & ")} Sale: Up to ${o}% OFF`)),o>0&&n.push(`Save Up to ${o}% on Your Favorite Brands`),n.push("Exclusive Deals Inside - Do not Miss Out!");const i=U();i&&(n=n.map(r=>`${r} at ${i}`)),C=[...new Set(n)],S=C[0]||null,ne()}function qt(t){if(t>=0&&t<C.length){S=C[t];const e=document.getElementById("selectedSubjectCard");e&&(e.style.display="block");const o=document.getElementById("selectedSubjectInput");o&&(o.value=S);const n=document.getElementById("subjectCharCount");if(n){const i=S.length,r=i<=50;n.className=`char-count ${r?"optimal":"warning"}`,n.textContent=`${i} chars ${r?"✓":"(>50)"}`}}}function Ut(t){(t.ctrlKey||t.metaKey)&&(t.key==="z"?(t.preventDefault(),je()):t.key==="y"&&(t.preventDefault(),Me()))}function Jt(t){const e=t.promoDateRange||"",o=t.promoTitle&&t.promoTitle.trim()?N(t.promoTitle):St(e),n=t.promoYear&&t.promoYear.trim()?t.promoYear.trim():new Date().getFullYear(),i=z();let r="";w.forEach(m=>{if(!m.brand||!m.discount)return;let b="";m.collections&&m.collections.trim()&&(b=m.collections.split(",").map(f=>N(f.trim())).filter(f=>f).map(f=>`*${f}`).join(" • ")),r+=`
                <p style="font-size: 18px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-bottom: 8px;"><b>${N(m.brand)} - ${N(m.discount)}% OFF</b></p>`,b&&(r+=`
                <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-left: 20px; margin-top: 0; margin-bottom: ${m.callout?"5px":"20px"};">
                    ${N(b)}
                </p>`),m.callout&&m.callout.trim()&&(r+=`
                <p style="font-size: 13px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-left: 20px; margin-top: 0; margin-bottom: 20px; color: #0066cc; font-style: italic;">
                    ${N(m.callout)}
                </p>`)});let l="7400 Las Vegas Blvd. South, Suite 231<br>Las Vegas, NV 89123",a="https://www.google.com/maps?q=36.05145495363422,-115.16933573536541",c=i.replace(/\D/g,""),u="Mon–Sat: 10AM–8PM | Sun: 10AM–7PM";if(d.userProfile){if(d.userProfile.storeEmail?c=d.userProfile.storeEmail:d.userProfile.storeName&&(c=`${d.userProfile.storeName.toLowerCase().replace(/\s+/g,"")}@citizenwatchgroup.com`),d.userProfile.storeAddress&&(l=d.userProfile.storeAddress.replace(/\n/g,"<br>")),d.userProfile.storeHours&&(u=d.userProfile.storeHours),d.userProfile.storePlusCode&&d.userProfile.storePlusCode.trim())a=`https://www.google.com/maps?q=${encodeURIComponent(d.userProfile.storePlusCode)}`;else if(d.userProfile.storeAddress&&d.userProfile.storeAddress.trim()){const m=d.userProfile.storeAddress.replace(/<br>/g," ").replace(/\n/g," ");a=`https://www.google.com/maps?q=${encodeURIComponent(m)}`}}let g=L.filter(m=>m.text&&m.text.trim()).map(m=>`• ${N(m.text)}`).join(`<br>
                    `),v=$.filter(m=>m.text&&m.text.trim()).map(m=>`• ${N(m.text)}`).join(`<br>
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
${r}

                <!-- HOW TO SHOP BOX -->
                <div style="background-color: #f5f5f5; padding: 15px; margin-bottom: 20px;">
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0 0 10px 0;"><b>HOW TO SHOP</b></p>
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">
                    ${g}</p>
                </div>

                <!-- IMPORTANT NOTES BOX -->
                <div style="border: 1px solid #ddd; padding: 15px;">
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0 0 10px 0;"><b>IMPORTANT NOTES</b></p>
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">
                    ${v}</p>
                </div>

            </td>
        </tr>

        <!-- FOOTER -->
        <tr>
            <td style="background-color: #2c3e50; padding: 20px; text-align: center;">
                <h3 style="color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 18px; margin: 0 0 10px 0;">CITIZEN COMPANY STORE</h3>
                <p style="color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 14px; margin: 5px 0;">
                    📍 <a href="${a}" target="_blank" style="color: white;">
                    ${l}</a>
                </p>
                <p style="color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 14px; margin: 5px 0;">
                    📞 <a href="tel:+1${i.replace(/\D/g,"")}" target="_blank" style="color: white;">${i}</a> |
                    📧 <a href="mailto:${c}" target="_blank" style="color: white;">${c}</a>
                </p>
                <p style="color: #ffd700; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 13px; margin: 10px 0 0 0;">
                    <b>STORE HOURS</b><br>
                    ${u}
                </p>${I.length>0?`
                <p style="color: #ffd700; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 13px; margin: 10px 0 0 0;">
                    <b>SPECIAL HOURS</b><br>
                    ${I.map(m=>m.day&&m.hours?`${m.day}: ${m.hours}`:"").filter(m=>m).join("<br>")}
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
</html>`}function Re(){s.templateSelect.addEventListener("change",()=>{Je(s.templateSelect.value)}),s.generateBtn.addEventListener("click",Vt),s.clearBtn.addEventListener("click",Wt),s.themeToggle.addEventListener("click",lo),s.searchBox.addEventListener("input",()=>{const t=s.searchBox.value.trim();s.clearSearch.classList.toggle("visible",t.length>0),xe(t)}),s.clearSearch.addEventListener("click",()=>{s.searchBox.value="",s.clearSearch.classList.remove("visible"),xe("")}),Ye()}function Yt(t){const e=t.id,o=P[B];if(!o)return;const n=o.fields.find(c=>c.id===e);if(!n||!n.validation)return;const{pattern:i,message:r}=n.validation,l=i.test(t.value);t.classList.toggle("invalid",!l);let a=t.nextElementSibling;return(!a||!a.classList.contains("validation-msg"))&&(a=document.createElement("div"),a.className="validation-msg",t.parentNode.insertBefore(a,t.nextSibling)),a.textContent=l?"":r,a.style.display=l?"none":"block",l}function Vt(){const t=P[B];if(!t){p("Please select a template first");return}if(B==="promotion-email"){const l=h("promoDateRange");if(!l||!l.value.trim()){p("✗ Please enter a date range"),Le();return}let a=!0;if(w.forEach(c=>{(!c.brand||!c.discount)&&(a=!1)}),!a){p("✗ Please fill out all brand and discount fields in entries"),Le();return}D(),C.length===0&&Rt(),p("✓ Preview and subject lines generated!");return}const e={};let o=!0,n=null;if(t.fields.forEach(l=>{const a=h(l.id);a&&(e[l.id]=a.value,l.validation&&(Yt(a)||(o=!1,n||(n=a))))}),!o){p("✗ Please fix the errors in the form"),n&&n.focus();return}const i=t.generate(e);Fe();const r=h("outputArea");if(r&&(r.value=i),window.originalMessageContent=i,ie(),t.hasEditableSubject){const l=Z(i),a=document.getElementById("subjectLineContent");a&&Ue(a,l)}s.outputCard.scrollIntoView({behavior:"smooth"})}function Wt(){const t=P[B];t&&t.fields.forEach(e=>{const o=h(e.id);if(o){o.value="",o.classList.remove("invalid");const n=o.nextElementSibling;n&&n.classList.contains("validation-msg")&&(n.style.display="none")}}),B==="promotion-email"&&(w=[],I=[],L=[],$=[],y=[],C=[],S=null,ot(),ze()),s.outputArea&&(s.outputArea.value=""),s.outputCard&&(s.outputCard.innerHTML=""),B==="promotion-email"&&D(),ie(),p("✓ Form cleared")}function Gt(){const t=h("codeArea")?.value;if(!t){p("⚠ No HTML code to send");return}if(!S){p("⚠ Please select a subject line first");return}Kt(S,t)}async function Kt(t,e){const o=d.userProfile.name||`${U()} ${te()}`,n=d.userProfile.email||"store@citizenwatchgroup.com",i=await ee(o,n,"","",t,e,y),r=new Blob([i],{type:"message/rfc822"}),l=URL.createObjectURL(r),a=document.createElement("a");a.href=l;const c=t.replace(/[^a-z0-9]/gi,"_").toLowerCase(),g=fe()==="emltpl"?".emltpl":".eml";a.download=`${c}${g}`,a.click(),URL.revokeObjectURL(l),p("✓ Email file generated. Check your downloads.")}async function ee(t,e,o,n,i,r,l=[]){const a=`----mixed=${Date.now().toString(16)}`,c=`----related=${Date.now().toString(16)}`;let u=`From: "${t}" <${e}>\r
`;n&&(u+=`Bcc: ${n}\r
`),u+=`Subject: ${i}\r
`,u+=`MIME-Version: 1.0\r
`,u+=`Content-Type: multipart/mixed; boundary="${a}"\r
\r
`,u+=`--${a}\r
`,u+=`Content-Type: multipart/related; boundary="${c}"\r
\r
`,u+=`--${c}\r
`,u+=`Content-Type: text/html; charset=utf-8\r
`,u+=`Content-Transfer-Encoding: quoted-printable\r
\r
`,u+=`${Xt(r)}\r
\r
`,u+=`--${c}--\r
`;for(const g of l)if(g.data){const v=g.data.split(",")[1];u+=`--${a}\r
`,u+=`Content-Type: ${g.type}; name="${g.name}"\r
`,u+=`Content-Disposition: attachment; filename="${g.name}"\r
`,u+=`Content-Transfer-Encoding: base64\r
\r
`,u+=`${v}\r
`}return u+=`--${a}--\r
`,u}function qe(t){const e=t.split(/[\s,;\n]+/).map(o=>o.trim().toLowerCase()).filter(Boolean);return[...new Set(e)]}function de(t){return/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(String(t).toLowerCase())}function Zt(){const t=h("batchSize");if(!t)return;let e=parseInt(t.value);isNaN(e)||e<50?e=50:e>1e3&&(e=1e3),t.value=e}function Se(){const t=h("bulkEmailList"),e=h("bulkAnalysis"),o=h("bulkStats");if(!t||!e||!o)return;const n=qe(t.value),i=n.filter(de),r=n.filter(u=>!de(u)),l=parseInt(h("batchSize")?.value)||500,a=Math.ceil(i.length/l);e.style.display=n.length>0?"block":"none";let c=`
        <p><strong>Total Emails:</strong> ${n.length}</p>
        <p><strong>Valid Emails:</strong> <span style="color: #28a745;">${i.length}</span></p>
        <p><strong>Invalid Emails:</strong> <span style="color: #dc3545;">${r.length}</span></p>
        <p><strong>Batches to Generate:</strong> ${a} (at ${l} emails/batch)</p>
    `;r.length>0&&(c+=`<p style="margin-top: 0.5rem;"><strong>Invalid entries:</strong> ${r.join(", ")}</p>`),o.innerHTML=c}async function Qt(){const t=h("bulkEmailList"),e=parseInt(h("batchSize")?.value)||500,o=document.querySelector('input[name="downloadFormat"]:checked')?.value;if(!t||!S){p("✗ Please enter emails and select a subject line");return}const n=qe(t.value).filter(de);if(n.length===0){p("✗ No valid emails to send");return}const i=h("codeArea")?.value;if(!i){p("✗ No HTML code generated");return}try{await nt(n)}catch(c){console.warn("Failed to save recipients to IndexedDB:",c)}const r=d.userProfile.name||`${U()} ${te()}`,l=d.userProfile.email||"store@citizenwatchgroup.com",a=[];for(let c=0;c<n.length;c+=e)a.push(n.slice(c,c+e));if(p(`Generating ${a.length} email files...`),o==="zip"){const c=new JSZip;for(let m=0;m<a.length;m++){const b=a[m].join(","),A=await ee(r,l,"",b,S,i,y);c.file(`batch_${m+1}_of_${a.length}.eml`,A)}const u=await c.generateAsync({type:"blob"}),g=URL.createObjectURL(u),v=document.createElement("a");v.href=g,v.download=`email_batches_${new Date().toISOString().split("T")[0]}.zip`,v.click(),URL.revokeObjectURL(g)}else for(let c=0;c<a.length;c++){const u=a[c].join(","),g=await ee(r,l,"",u,S,i,y),v=new Blob([g],{type:"message/rfc822"}),m=URL.createObjectURL(v),b=document.createElement("a");b.href=m,b.download=`batch_${c+1}_of_${a.length}.eml`,b.click(),URL.revokeObjectURL(m),await new Promise(A=>setTimeout(A,200))}p(`✓ ${a.length} email files generated successfully`)}function Xt(t){const o=new TextEncoder().encode(t);let n="";for(let i=0;i<o.length;i++){const r=o[i],l=String.fromCharCode(r);if(l==="=")n+="=3D";else if(r<32||r>126)if(r===9||r===10||r===13)n+=l;else{const a=r.toString(16).toUpperCase().padStart(2,"0");n+="="+a}else n+=l}return n}function Z(t){const e=t.match(/^Subject:\s*(.*)/im);return e?e[1]:""}function Ue(t,e){window.currentSubjectLine=e,t.innerHTML=`
        <div class="editable-subject-line">
            <label for="subjectInput" class="form-label">Subject:</label>
            <input type="text" id="subjectInput" class="form-input" value="${E(e)}">
        </div>
    `;const o=document.getElementById("subjectInput");o&&o.addEventListener("input",n=>{window.currentSubjectLine=n.target.value,mt(n.target.value)})}function eo(t,e){const o=P[t];if(!o)return;let n="",i=e;o.hasEditableSubject?(n=window.currentSubjectLine||Z(e),i=i.replace(/^Subject:.*\r?\n/im,"")):(n=Z(e),i=i.replace(/^Subject:.*\r?\n/im,""));const r=lt(i),l=`mailto:?subject=${encodeURIComponent(n)}&body=${encodeURIComponent(r)}`,a=document.createElement("a");a.href=l,document.body.appendChild(a),a.click(),document.body.removeChild(a)}function to(t,e){const o=P[t];if(!o)return;let n="",i=e;o.hasEditableSubject?(n=window.currentSubjectLine||Z(e),i=i.replace(/^Subject:.*\r?\n/im,"")):(n=Z(e),i=i.replace(/^Subject:.*\r?\n/im,""));const r=d.userProfile.name||`${U()} ${te()}`,l=d.userProfile.email||"store@citizenwatchgroup.com";ee(r,l,"","",n,i,[]).then(a=>{const c=new Blob([a],{type:"message/rfc822"}),u=URL.createObjectURL(c),g=document.createElement("a");g.href=u;const v=n.replace(/[^a-z0-9]/gi,"_").toLowerCase(),b=fe()==="emltpl"?".emltpl":".eml";g.download=`${v}${b}`,g.click(),URL.revokeObjectURL(u)})}function oo(){pt(),Et(),no(),Re();const t=localStorage.getItem("selectedTemplate");t&&P[t]&&Je(t),ro(),rt({renderPromotionEntries:F,renderSpecialHours:V,renderHowToShopSection:_,renderImportantNotesSection:O,renderAttachedPDFs:Q,renderSubjectLines:ne})}function ie(){const t=document.getElementById("outputArea"),e=document.getElementById("emailPreview"),o=document.querySelector('.output-tab[data-tab="preview"]'),n=document.getElementById("previewContent"),i=document.getElementById("htmlContent");if(!t||!e)return;const r=t.value;if(!r){e.srcdoc='<p style="padding: 20px; color: #999;">No content to preview</p>';return}const l=ut(r),a=document.querySelector('.output-tab[data-tab="html"]');if(o)if(l){o.disabled=!1,o.style.opacity="1",o.style.cursor="pointer";const c=vt(r);e.srcdoc=c}else o.disabled=!0,o.style.opacity="0.5",o.style.cursor="not-allowed",o.classList.remove("active"),a&&a.classList.add("active"),n&&n.classList.remove("active"),i&&i.classList.add("active"),e.srcdoc='<p style="padding: 20px; color: #999;">Preview not available for plain text content</p>'}function no(t="all"){const e={"Customer Email":[],"Phone Orders":[],Text:[]};Object.keys(P).forEach(o=>{const n=P[o];e[n.category].push({key:o,name:n.name})}),s.templateSelect.innerHTML='<option value="">Select a template...</option>',Object.keys(e).forEach(o=>{if(e[o].length>0){const n=document.createElement("optgroup");n.label=o,e[o].forEach(i=>{const r=document.createElement("option");r.value=i.key,r.textContent=i.name,r.title=ct[i.key]||"",n.appendChild(r)}),s.templateSelect.appendChild(n)}})}function xe(t){if(!t.trim()){s.searchResults.classList.remove("visible"),s.resultCounter.textContent="",s.clearSearch.classList.remove("visible"),s.searchBox.classList.remove("active");return}s.clearSearch.classList.add("visible"),s.searchBox.classList.add("active");const e=t.toLowerCase(),o=Object.keys(P).filter(r=>{const l=P[r];return l.name.toLowerCase().includes(e)||l.category.toLowerCase().includes(e)});let n="";if(o.length===0)n='<div class="search-result-item" style="cursor: default; color: var(--text-tertiary);">No templates found</div>',s.resultCounter.textContent="0 templates found";else{n=o.map(c=>{const u=P[c],g=K(u.name),v=K(u.category);return`
                <div class="search-result-item" data-template-key="${E(c)}">
                    <div class="search-result-name">${g}</div>
                    <div class="search-result-category">${v}</div>
                </div>
            `}).join("");const l=o.length,a=l===1?"":"s";s.resultCounter.textContent=`${l} template${a} found`}const i=s.resultCounter;s.searchResults.innerHTML=n,s.searchResults.appendChild(i),s.searchResults.classList.add("visible")}let Ie=null,$e=!1;function Je(t){try{if(!t||!P[t]){console.warn("Invalid template key:",t);return}if(t===Ie&&$e)return;$e=!0,Ie=t,B=t;const e=P[t];localStorage.setItem("selectedTemplate",t),s.templateSelect.value=t;const o=document.querySelector(".section-header-with-controls");if(o){const a=document.createElement("h2");a.id="formSectionTitle",a.className="section-title",a.textContent=`${e.name} Fields`,o.replaceWith(a),s.formSectionTitle=a}else s.formSectionTitle.textContent=`${e.name} Fields`;const n=document.getElementById("formPlaceholder");if(n&&n.remove(),e.customTemplate&&t==="promotion-email"){ze(),ft(),s.clearBtn.disabled=!1;const a=h("openEmailBtn");a&&(a.disabled=!1),(async()=>{let c=0;for(;!x&&c<20;)await new Promise(u=>setTimeout(u,50)),c++;if(!x){console.warn("IndexedDB not initialized, cannot restore bulk emails");return}await new Promise(u=>setTimeout(u,200));try{const u=document.getElementById("bulkEmailList");if(u){const g=await it();g&&(u.value=g,u.dispatchEvent(new Event("input",{bubbles:!0})))}}catch(u){console.warn("Failed to restore bulk email recipients:",u)}})();return}Fe();const i=e.fields.map(a=>{const c=a.replace(/([A-Z])/g," $1").trim(),u=c.charAt(0).toUpperCase()+c.slice(1),g=a.includes("address")||a.includes("Address")||a.includes("Details"),v=a.includes("Verified")||a.includes("Verification"),m=me[a]||{},b=g?" full-width":"",A=m.required?" *":"",f=E(a),T=E(m.example||"");if(v)return`
                    <div class="form-group radio-field">
                        <label class="form-label">${K(u)}${A}</label>
                        <div class="radio-group" data-field="${f}">
                            <div class="radio-option">
                                <input type="radio" id="${f}-yes" name="${f}" value="yes" data-field="${f}">
                                <label for="${f}-yes">Yes</label>
                            </div>
                            <div class="radio-option">
                                <input type="radio" id="${f}-no" name="${f}" value="no" data-field="${f}">
                                <label for="${f}-no">No</label>
                            </div>
                        </div>
                    </div>
                `;const X=dt(a),ve=`datalist-${f}`;let he="";if(X.length>0){const Ge=X.map(Ke=>`<option value="${E(Ke)}">`).join("");he=`
                <datalist id="${ve}">
                    ${Ge}
                </datalist>
            `}let W="";d.userProfile&&((a==="employeeName"||a==="yourName")&&d.userProfile.employeeName?W=E(d.userProfile.employeeName):a==="storePhone"&&d.userProfile.storePhone?W=E(d.userProfile.storePhone):a==="storeName"&&d.userProfile.storeName&&(W=E(d.userProfile.storeName)));const We=g?`<textarea id="${f}" class="form-textarea" data-field="${f}" ${m.required?"required":""} placeholder="${T}">${W}</textarea>`:`<input type="text" id="${f}" class="form-input" data-field="${f}" ${m.required?"required":""} placeholder="${T}" value="${W}" list="${ve}">${he}`;return`
                <div class="form-group${b}">
                    <label class="form-label" for="${f}">${K(u)}${A}</label>
                    <div class="input-wrapper">
                        ${We}
                        <button class="clear-input" data-clear="${f}" title="Clear">×</button>
                    </div>
                    <div class="calculated-value" data-calc="${f}" style="display: none;"></div>
                    <div class="error-message" data-error="${f}" style="display: none;"></div>
                </div>
            `});s.formFields.innerHTML=i.join(""),setTimeout(()=>{Re()},0),s.formFields.addEventListener("click",a=>{if(a.target.classList.contains("clear-input")){const c=a.target.dataset.clear,u=document.getElementById(c);u&&(u.value="",a.target.classList.remove("visible"),u.focus(),ie())}}),s.formFields.addEventListener("input",a=>{if(a.target.classList.contains("form-input")||a.target.classList.contains("form-textarea")){const c=a.target.id,u=s.formFields.querySelector(`[data-clear="${c}"]`);u&&u.classList.toggle("visible",a.target.value.trim().length>0)}}),s.formFields.querySelectorAll(".form-input, .form-textarea").forEach(a=>{const c=s.formFields.querySelector(`[data-clear="${a.id}"]`);c&&a.value.trim().length>0&&c.classList.add("visible")});const l=document.getElementById("outputArea");l&&(l.value=""),s.clearBtn.disabled=!1}catch(e){console.error("Error selecting template:",e),p("Error loading template")}}function Le(){s.formFields.querySelectorAll(".form-input, .form-textarea").forEach(e=>{const o=e.dataset.field;(me[o]||{}).required&&!e.value.trim()?e.classList.add("error"):e.classList.remove("error")})}function io(){const t=document.getElementById("outputArea");if(!t){console.error("outputArea element not found"),p("⚠ Output area not found");return}const e=t.value;if(!e){p("⚠ Nothing to copy");return}if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(e).then(()=>{p("✓ Copied!")}).catch(o=>{console.error("Clipboard error:",o),p("⚠ Copy failed")});else try{t.select();const o=document.execCommand("copy");p(o?"✓ Copied!":"⚠ Copy failed")}catch(o){console.error("Copy error:",o),p("⚠ Copy not supported")}}function ro(){const t=document.getElementById("pdfPreviewModal");if(!t)return;const e=document.getElementById("pdfModalClose"),o=t.querySelector(".pdf-modal-backdrop"),n=document.getElementById("pdfDownloadBtn"),i=document.getElementById("pdfDownloadFallback");e&&e.addEventListener("click",se),o&&o.addEventListener("click",se),n&&n.addEventListener("click",Ee),i&&i.addEventListener("click",Ee),document.addEventListener("keydown",r=>{r.key==="Escape"&&t.style.display==="flex"&&se()})}function ao(){const t=document.getElementById("formatStatusText");if(!t)return;const e=Oe(),o=fe(),n=o==="emltpl"?"Template":"EML",i=o==="emltpl"?".emltpl":".eml";let r="Unknown";e==="windows"?r="Windows":e==="mac"?r="macOS":r="Other Platform",t.innerHTML=`<strong>${n} Format:</strong> Optimized for ${r} (${i} files)<br><small>Best compatibility with Outlook on your platform</small>`,t.style.color="var(--text-secondary)"}function so(){const t=localStorage.getItem("theme")||"light",e=localStorage.getItem("lightPalette")||"pastel",o=localStorage.getItem("darkPalette")||"midnight-blue";document.documentElement.setAttribute("data-theme",t),document.documentElement.setAttribute("data-light-palette",e),document.documentElement.setAttribute("data-dark-palette",o),Ve(t)}function Ye(){const e=`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><path fill="${getComputedStyle(document.documentElement).getPropertyValue("--text-secondary").trim()}" d="M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z"/></svg>`,n=`url('data:image/svg+xml;charset=UTF-8,${encodeURIComponent(e)}')`;document.querySelectorAll("select.form-input, select.template-select").forEach(r=>{r.style.backgroundImage=n})}function lo(){const e=(document.documentElement.getAttribute("data-theme")||"light")==="light"?"dark":"light";document.documentElement.setAttribute("data-theme",e),localStorage.setItem("theme",e),Ve(e),setTimeout(Ye,50)}function Ve(t){const e=document.querySelector(".theme-toggle-slider");e&&(e.style.transform=t==="dark"?"translateX(20px)":"translateX(0)")}document.addEventListener("DOMContentLoaded",async()=>{so(),await Xe(),oo()});

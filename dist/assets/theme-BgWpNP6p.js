(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const s of a.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&n(s)}).observe(document,{childList:!0,subtree:!0});function o(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(r){if(r.ep)return;r.ep=!0;const a=o(r);fetch(r.href,a)}})();let T=null;const Xe="CitizenTemplates",Qe=2,R="promotionPDFs",H="bulkEmailRecipients";function yo(){return new Promise(t=>{const e=window.indexedDB||window.webkitIndexedDB||window.mozIndexedDB;if(!e){console.warn("IndexedDB not supported, PDFs will not persist across refresh"),t(!1);return}const o=e.open(Xe,Qe);o.onerror=()=>{console.warn("IndexedDB initialization failed:",o.error),t(!1)},o.onsuccess=()=>{T=o.result,console.log("IndexedDB initialized successfully"),t(!0)},o.onupgradeneeded=n=>{const r=n.target.result;r.objectStoreNames.contains(R)||r.createObjectStore(R,{keyPath:"id"}),r.objectStoreNames.contains(H)||r.createObjectStore(H,{keyPath:"id"})}})}function ce(t){return new Promise((e,o)=>{if(!T){o(new Error("IndexedDB not initialized"));return}const a=T.transaction([R],"readwrite").objectStore(R).put(t);a.onerror=()=>o(a.error),a.onsuccess=()=>e(t.id)})}function et(t){return new Promise((e,o)=>{if(!T){e(null);return}const a=T.transaction([R],"readonly").objectStore(R).get(t);a.onerror=()=>o(a.error),a.onsuccess=()=>e(a.result||null)})}function Fe(t){return new Promise((e,o)=>{if(!T){e();return}const a=T.transaction([R],"readwrite").objectStore(R).delete(t);a.onerror=()=>o(a.error),a.onsuccess=()=>e()})}function tt(t){return new Promise((e,o)=>{if(!T){o(new Error("IndexedDB not initialized"));return}const a=T.transaction([H],"readwrite").objectStore(H).put({id:"bulk-email-recipients",data:t,savedAt:new Date().toISOString()});a.onerror=()=>o(a.error),a.onsuccess=()=>e()})}function bo(){return new Promise((t,e)=>{if(!T){t("");return}const r=T.transaction([H],"readonly").objectStore(H).get("bulk-email-recipients");r.onerror=()=>e(r.error),r.onsuccess=()=>{const a=r.result;t(a&&a.data?a.data:"")}})}function ot(){return new Promise((t,e)=>{if(!T){t();return}const r=T.transaction([H],"readwrite").objectStore(H).clear();r.onerror=()=>e(r.error),r.onsuccess=()=>t()})}const y={currentCategory:"all",currentTemplate:null,searchActive:!1,userProfile:null},W={companyName:"Citizen Watch America",storeName:"Citizen Company Store",defaultLocation:"the South Premium Outlets",defaultPhone:"702-357-8990"},he=[{name:"Alpina",url:"https://us.alpinawatches.com/"},{name:"Bulova",url:"https://www.bulova.com/"},{name:"Citizen",url:"https://www.citizenwatch.com/"},{name:"Frederique Constant",url:"https://us.frederiqueconstant.com/"}],nt=["manager","director","supervisor","assistant manager"],S={fontFamily:"'Century Gothic', Aptos, Arial, sans-serif",colors:{primary:"#000000",secondary:"#2f2f2f",link:"#0000ee",environmental:"#0c8822"},fontSize:{name:"9pt",details:"8pt"}},ye="Please consider the environment before printing this e-mail";function rt(){const t=y.userProfile||{};return{name:t.employeeName||"Employee Name",title:t.jobTitle||"Sales Associate",location:t.storeLocation||W.defaultLocation,address:t.storeAddress||"",phone:t.storePhone||W.defaultPhone,jobTitle:(t.jobTitle||"").toLowerCase(),companyEmail:t.companyEmail||"",storeEmail:t.storeEmail||""}}function at(t,e,o){return nt.some(r=>t.includes(r))&&e?e:o||""}function be(t,e){return e==="html"?`<p style="margin: 0; padding: 0;">
        <strong style="font-size: ${S.fontSize.name};">${D(t.name)}</strong> │ ${D(t.title)}
    </p>`:`${t.name} │ ${t.title}`}function ve(t){const e="______________________________________________________________________";return t==="html"?`<p style="margin: 0; padding: 0; font-size: ${S.fontSize.details}; color: ${S.colors.secondary};">
        <strong>${e}</strong>
    </p>`:e}function we(t,e){return e==="html"?`<p style="margin: 0; padding: 0; font-size: ${S.fontSize.details}; color: ${S.colors.secondary};">
        <strong>${W.companyName}</strong>
    </p>
    <p style="margin: 0; padding: 0; font-size: ${S.fontSize.details}; color: ${S.colors.secondary};">
        <strong>${W.storeName} - ${D(t.location)}</strong>
    </p>`:`${W.companyName}
${W.storeName} - ${t.location}`}function it(t,e){if(!t.address||!t.address.trim())return"";const o=D(t.address);return e==="html"?`<p style="margin: 0; padding: 0; font-size: ${S.fontSize.details}; color: ${S.colors.secondary};">
        ${o.replace(/\n/g,"<br>")}
    </p>`:t.address}function Ee(t,e){return e==="html"?`<p style="margin: 0; padding: 0; font-size: ${S.fontSize.details}; color: ${S.colors.secondary};">
        Tel/SMS: ${D(t.phone)}
    </p>`:`Tel/SMS: ${t.phone}`}function st(t,e){if(!t)return"";if(e==="html"){const o=t.split("@"),n=o[0]||"",r=o[1]||"";return`<p style="margin: 10px 0 0 0; padding: 0; font-size: ${S.fontSize.details}; color: ${S.colors.secondary};">
        Email: ${D(n)}<a href="mailto:${D(t)}" style="color: ${S.colors.link}; text-decoration: underline; font-size: ${S.fontSize.details};">@${D(r)}</a>
    </p>`}return`Email: ${t}`}function Se(t){if(t==="html"){const e=he.map(o=>`<a href="${o.url}" style="color: ${S.colors.link}; text-decoration: underline; font-size: ${S.fontSize.details};">${o.name}</a>`).join(` <span style="color: ${S.colors.secondary};">|</span> `);return`<p style="margin: 4px 0; padding: 0; font-size: ${S.fontSize.details};">
        ${e}
    </p>`}return he.map(e=>e.name).join(" | ")}function $e(t){return t==="html"?`<p style="margin: 4px 0; padding: 0; font-size: ${S.fontSize.details}; color: ${S.colors.environmental};">
        <strong>${ye}</strong>
    </p>`:ye}function lt(t="text"){const e=rt(),o=at(e.jobTitle,e.companyEmail,e.storeEmail);if(t==="html")return`<div style="font-family: ${S.fontFamily}; font-size: ${S.fontSize.name}; color: ${S.colors.primary};">
    ${be(e,t)}
    ${ve(t)}
    ${we(e,t)}
    ${it(e,t)}
    ${Ee(e,t)}
    ${st(o,t)}
    ${Se(t)}

    ${$e(t)}
</div>`;const n=e.address?`${e.address}
`:"",r=o?`
Email: ${o}
`:`
`;return`${be(e,t)}
${ve(t)}
${we(e,t)}
${n}${Ee(e,t)}
${r}${Se(t)}

${$e(t)}`}const N=lt;function D(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}function L(t){return t.replace(/'/g,"&#39;").replace(/"/g,"&quot;")}function k(t){const e={};for(const[o,n]of Object.entries(t))typeof n=="string"?e[o]=D(n):e[o]=n;return e}function q(){return y.userProfile&&y.userProfile.storePhone?y.userProfile.storePhone:"702-357-8990"}function se(){return y.userProfile&&y.userProfile.storeName?y.userProfile.storeName:"Citizen Company Store"}function Me(){return y.userProfile&&y.userProfile.storeLocation?y.userProfile.storeLocation:"the South Premium Outlets"}function ct(){return`Citizen Company Store at ${Me()}`}function dt(t){if(!t)return"";const e=i=>{const p=document.createElement("div");return p.textContent=i,p.innerHTML};let o=t;const n=[/\n\n-{5,}\n/,/______+/,/\n\n[A-Z][a-z]+ [A-Z][a-z]+ │ /];for(const i of n){const p=o.match(i);if(p){o=o.substring(0,p.index).trim();break}}const a=o.split(/\n\n+/).map(i=>{const p=i.split(`
`);return p.some(m=>m.trim())&&p.every(m=>{const u=m.trim();return!u||u.startsWith("•")||u.startsWith("-")})?`    <ul style="margin: 10px 0; padding-left: 20px; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt;">
${p.filter(u=>u.trim()).map(u=>{const b=u.replace(/^[•-]\s*/,"").trim();return`        <li style="margin: 5px 0;">${e(b)}</li>`}).join(`
`)}
    </ul>`:`    <p style="margin: 10px 0; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);">${i.split(`
`).map(u=>e(u)).join("<br>")}</p>`}),s=N("html");return`${a.join(`
`)}

    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
${s}
    </div>`}const ut={"new-customer-welcome":"Use after a customer visits the store for the first time. Adds them to VIP list. (Enhanced: editable subject, EML download)","back-in-stock":"Follow up when a previously unavailable item is back. Include hold deadline.","thank-you-warranty":"Send after purchase to explain warranty registration and care tips.","weekly-sale":"Personalized sale notification for customers who showed interest in specific collections. (Enhanced: editable subject, EML download)","new-model-arrival":"Alert interested customers when a specific model they asked about arrives. (Enhanced: editable subject, EML download)","limited-edition":"High-priority notification for VIP collectors about exclusive pieces. (Enhanced: editable subject, EML download)","vip-reconnection":"Re-engage customers who haven't visited in a while. Mention store evolution. (Enhanced: editable subject, EML download)","phone-confirmation":"Immediate confirmation after taking a phone order. Include all order details. (Enhanced: editable subject, EML download)","phone-shipped":"Send when order ships with UPS tracking. Mention signature requirement. (Enhanced: editable subject, EML download)","phone-under-500":"Internal approval request for phone orders under $500. Manager verification. (Enhanced: editable subject, EML download)","phone-corporate":"Corporate/bulk order approval. Include purpose and fulfilling store. (Enhanced: editable subject, EML download)","inter-store-notification":"Notify receiving store that order is prepared and ready for pickup. (Enhanced: editable subject, EML download)","text-availability":"Quick response to customer inquiry about specific model availability.","text-thank-you":"Post-purchase thank you via text. Keep it brief and friendly.","text-interest-followup":"Follow up on specific watch customer showed interest in. Use after store visit."},te={customerName:{example:"John Smith",required:!0},employeeName:{example:"Your name",required:!0},yourName:{example:"Your name",required:!0},brand:{example:"Citizen",required:!0,suggestions:["Citizen","Bulova","Frederique Constant"]},modelName:{example:"Eco-Drive Promaster",required:!0},modelNumber:{example:"BN0150-28E",required:!1},price:{example:"299",required:!0,validation:"currency"},discount:{example:"20",required:!0,validation:"number",dependent:!0},msrp:{example:"399",required:!0,validation:"currency",dependent:!0},quantity:{example:"2",required:!0,validation:"number"},unitsQuantity:{example:"1",required:!0,validation:"number"},totalAmount:{example:"299.00",required:!0,validation:"currency"},closingTime:{example:"9:00 PM",required:!0},endDate:{example:"Sunday",required:!0},holdDeadline:{example:"Friday 5PM",required:!0},trackingNumber:{example:"1Z999AA10123456784",required:!1,validation:"tracking"},customerId:{example:"C12345",required:!0},employeeId:{example:"E789",required:!0},warrantyLength:{example:"5-year",required:!0},warrantyYears:{example:"5",required:!0,validation:"number"},carrier:{example:"UPS",required:!0,suggestions:["UPS","FedEx","USPS"]},promoDateRange:{example:"Nov 28 - Dec 1",required:!0},promoYear:{example:"2024-2025",required:!1},promoTitle:{example:"Leave blank for auto-generation",required:!1},promoBrand:{example:"Citizen",required:!0,suggestions:["Citizen","Bulova","Alpina","Frederique Constant"]},promoDiscount:{example:"60",required:!0,validation:"number"},promoCollections:{example:"Corso, Avion, Marine Star",required:!1},promoCallout:{example:"Optional special note",required:!1},keyFeature1:{example:"Eco-Drive technology",required:!1},keyFeature2:{example:"Solar powered",required:!1},keyFeature3:{example:"Water resistant to 200m",required:!1},limitedDetails:{example:"Limited to 100 pieces worldwide",required:!0},quantityAvailable:{example:"5",required:!0,validation:"number"},customerAddress:{example:"123 Main St, City, State 12345",required:!0},managerNameOrStoreName:{example:"Store Manager or Store Name",required:!0},creditCardVerified:{example:"Yes",required:!0,suggestions:["Yes","No"]},needsManagerVerification:{example:"Yes",required:!0,suggestions:["Yes","No"]},fulfillingStore:{example:"Las Vegas Premium Outlets",required:!0},recipientStoreName:{example:"Los Angeles Premium Outlets",required:!0},collectionName:{example:"Eco-Drive Collection",required:!0},model1:{example:"Eco-Drive Promaster",required:!0},price1:{example:"299",required:!0,validation:"currency"},original1:{example:"399",required:!0,validation:"currency"},model2:{example:"Eco-Drive Satellite Wave",required:!1},price2:{example:"349",required:!1,validation:"currency"},original2:{example:"449",required:!1,validation:"currency"}};function mt(t){return(te[t]||{}).suggestions||[]}function Y(t,e){const o=[];if(e.forEach(n=>{const r=te[n];if(r&&r.required){const a=t[n];(a==null||a.toString().trim()==="")&&o.push(n)}}),o.length>0)throw new Error(`Required fields are missing or empty: ${o.join(", ")}`)}function xe(t){return`Hi ${t},

`}function Ie(){return`

Best regards,
${N()}`}function pt(t,e){return(t*(1-e/100)).toFixed(2)}const B={"new-customer-welcome":{name:"New Customer Welcome",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","employeeName"],generate:t=>{Y(t,["customerName","employeeName"]);const e=k(t);return`Subject: Welcome to Citizen Company Store - Your VIP Access

${xe(e.customerName)}Thank you for visiting our Citizen Company Store outlet location! It was a pleasure helping you explore our offerings today.

I've added you to our VIP email list for weekly promotional updates featuring exclusive outlet pricing on our timepieces.

Please don't hesitate to reach out by replying to this email or call the store at ${q()}. I would be happy to check availability on any models you're considering.${Ie()}`}},"new-model-arrival":{name:"New Model Arrival",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","keyFeature1","keyFeature2","keyFeature3","price","employeeName"],generate:t=>{Y(t,["customerName","brand","modelName","modelNumber","keyFeature1","price","employeeName"]);const e=k(t),o=[e.keyFeature1,e.keyFeature2,e.keyFeature3].filter(n=>n&&n.trim()).map(n=>`• ${n}`).join(`
`);return`Subject: Great News! ${e.modelName} Now Available

${xe(e.customerName)}Great news! The ${e.brand} ${e.modelName} (${e.modelNumber}) you were interested in has arrived at our store.

Key Features:
${o}

Current price: ${e.price}

I'd be happy to set up an appointment to show you all the features of this watch and let you try it on. This model tends to generate a lot of interest, so I wanted to reach out to you first.

Would you like to schedule a time to see it in person? Please reply to this email or call the store at ${q()}.

Looking forward to hearing from you!${Ie()}`}},"limited-edition":{name:"Limited Edition",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","limitedDetails","price","quantityAvailable","employeeName"],generate:t=>{Y(t,["customerName","brand","modelName","modelNumber","limitedDetails","price","quantityAvailable","employeeName"]);const e=k(t);return`Subject: Exclusive: Limited Edition ${e.modelName} Available

Hi ${e.customerName},

I wanted to reach out to you personally because we just received a ${e.brand} ${e.modelName} (${e.modelNumber}) - ${e.limitedDetails}.

As someone who appreciates fine timepieces and unique additions to your collection, I thought you'd want to know about this immediately.

Price: ${e.price}
Availability: Only ${e.quantityAvailable} available

This is truly a special piece that won't last long. I'd love to show it to you in person and discuss how it could complement your collection.

Can you stop by this week, or would you like me to hold one for you? Please reply to this email or call the store at ${q()}.

Best regards,
${N()}

P.S. - Given the limited availability, I'm only reaching out to our most valued collectors. Let me know if you're interested!`}},"vip-reconnection":{name:"VIP Reconnection",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","employeeName"],generate:t=>`Subject: Your Store Has Evolved - We'd Love to Show You What's New

 Hi ${k(t).customerName},

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
${N()}

P.S. - We now carry everything from current season pieces to discontinued treasures, giving you more options than ever before.`},"phone-confirmation":{name:"Confirmation",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","price","discount","totalAmount","customerAddress","carrier","trackingNumber","employeeName"],generate:t=>{Y(t,["customerName","brand","modelName","modelNumber","price","discount","totalAmount","customerAddress","carrier","employeeName"]);const e=k(t);let o="";return e.trackingNumber&&(o=`

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

If you have any questions, please don't hesitate to contact us at ${q()}.

Thank you for shopping with ${se()}!

Best regards,
${N()}`}},"phone-shipped":{name:"Shipped with Tracking",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","trackingNumber","customerAddress","carrier","employeeName"],generate:t=>{Y(t,["customerName","brand","modelName","modelNumber","trackingNumber","customerAddress","carrier","employeeName"]);const e=k(t);return`Subject: Your Watch Order - Tracking Information

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
${N()}`}},"phone-under-500":{name:"Under $500 Request",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["managerNameOrStoreName","customerName","customerId","employeeName","employeeId","unitsQuantity","totalAmount","creditCardVerified","needsManagerVerification"],generate:t=>{const e=k(t);if(!e.creditCardVerified||e.creditCardVerified.toLowerCase()!=="yes")throw new Error("Credit card must be verified before generating this order form.");let o="";return e.needsManagerVerification&&e.needsManagerVerification.toLowerCase()==="yes"?o="Ready for manager verification":o="Credit card manager verified - Ready for processing",`Subject: Phone Order Form for ${e.customerName}

Hi ${e.managerNameOrStoreName},

Attached is the form for the phone order for ${e.customerName} (${e.customerId}).

Ringing under: ${e.employeeName} (${e.employeeId})
Units: ${e.unitsQuantity}
Total: ${e.totalAmount}

Order Status: ${o}

Best regards,
${N()}`}},"phone-corporate":{name:"Corporate Approval",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","customerId","employeeName","employeeId","unitsQuantity","totalAmount","fulfillingStore"],generate:t=>{const e=k(t);return`Subject: Phone Order Approval Request - ${e.customerName}

Hello,

I am forwarding a request for approval on a phone order for ${e.employeeName} (${e.employeeId}).

There are ${e.unitsQuantity} units totaling ${e.totalAmount}. It will be fulfilled at ${e.fulfillingStore}.

Customer: ${e.customerName} (${e.customerId})

I have verified and signed off. Please let us know if you have any questions.

 Best regards,
 ${N()}`}},"inter-store-notification":{name:"Inter-Store Notification",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["recipientStoreName","customerName","trackingNumber"],generate:t=>{const e=k(t);return`Subject: Phone Order Processed and Shipped - ${e.customerName}

Hi ${e.recipientStoreName} Team,

The phone order for ${e.customerName} has been rung and labeled for shipping.

UPS Tracking Number: ${e.trackingNumber}

The package has been prepared and is ready for UPS pickup.

Best regards,
${N()}`}},"text-availability":{name:"Availability Response",category:"Text",fields:["customerName","modelName","price","closingTime"],generate:t=>{const e=k(t);return`Hi ${e.customerName}! Yes, we have the ${e.modelName} in stock. Current price is ${e.price} with our outlet discount. We're open until ${e.closingTime} today if you'd like to stop by, or I can hold it.`}},"text-thank-you":{name:"Thank You",category:"Text",fields:["customerName","modelName","warrantyLength","brand"],generate:t=>{const e=k(t);return`${e.customerName}, thank you for your purchase today! Your ${e.modelName} comes with a ${e.warrantyLength} warranty. Reach out anytime at ${q()} for any questions. Enjoy your new ${e.brand}!`}},"text-interest-followup":{name:"Sale Alert",category:"Text",fields:["customerName","employeeName","modelName","discount","msrp","endDate"],generate:t=>{Y(t,["customerName","employeeName","modelName","discount","msrp","endDate"]);const e=k(t),o=parseFloat(e.msrp),n=parseFloat(e.discount);if(isNaN(o)||o<=0)throw new Error("MSRP must be a valid positive number");if(isNaN(n)||n<0||n>100)throw new Error("Discount must be a valid percentage between 0 and 100");const r=pt(o,n);return`Hi ${e.customerName}! This is ${e.employeeName} from ${ct()}. The ${e.modelName} you were interested in is on ${e.discount}% OFF promotion (MSRP ${e.msrp} now ${r} plus tax) until ${e.endDate}. Please let me know if you'd like me to hold one for you. Thank you!`}},"weekly-sale":{name:"Weekly Sale",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","collectionName","discount","brand","model1","price1","original1","model2","price2","original2","endDate","employeeName"],generate:t=>{const e=k(t),n=[{name:e.model1,price:e.price1,original:e.original1},{name:e.model2,price:e.price2,original:e.original2}].filter(r=>r.name&&r.price).map(r=>`• ${r.name} - Now ${r.price} (was ${r.original})`).join(`
`);return`Subject: ${e.customerName}, This Week's ${e.brand} Sale Includes Your Favorites

Hi ${e.customerName},

I remember you were looking at ${e.collectionName} pieces during your last visit. Good timing - we just started our ${e.discount}% off promotion on select ${e.brand} models this week!

Specifically available in that collection:
${n}

This promotion runs through ${e.endDate}. Would you like me to check if we have your size preference in stock?

${N()}`}}};function Le(t){const e=document.createElement("div");e.innerHTML=t;let o="";const n=r=>{if(r.nodeType===3)o+=r.textContent;else if(r.nodeType===1){const a=r.tagName.toLowerCase();(a==="p"||a==="div"||a==="h1"||a==="h2"||a==="h3"||a==="br")&&o&&!o.endsWith(`\r
`)&&(o+=`\r
\r
`);for(let s=0;s<r.childNodes.length;s++)n(r.childNodes[s]);(a==="p"||a==="div")&&r.nextSibling&&(o.endsWith(`\r
`)||(o+=`\r
`))}};return n(e),o=o.replace(/\r\n\r\n\r\n+/g,`\r
\r
`).trim()+`\r
`,o}function X(t){const o=new TextEncoder().encode(t);let n="";for(let r=0;r<o.length;r++){const a=o[r],s=String.fromCharCode(a);if(s==="=")n+="=3D";else if(a<32||a>126)if(a===9||a===10||a===13)n+=s;else{const c=a.toString(16).toUpperCase().padStart(2,"0");n+="="+c}else n+=s}return n}function Re(t){let e=!0;for(let a=0;a<t.length;a++)if(t.charCodeAt(a)>127){e=!1;break}if(e)return t;const o=new TextEncoder().encode(t),n=Array.from(o,a=>String.fromCodePoint(a)).join("");return`=?UTF-8?B?${btoa(n)}?=`}function ft(t){const e=new TextEncoder().encode(t),o=Array.from(e,n=>String.fromCodePoint(n)).join("");return btoa(o)}function He(t){let e=!0;for(let n=0;n<t.length;n++)if(t.charCodeAt(n)>127){e=!1;break}return e?`filename="${t}"`:`filename*=UTF-8''${encodeURIComponent(t)}`}function gt(t){return/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(String(t).toLowerCase())}function vo(t){const e=t.split(/[\s,;\n]+/).map(o=>o.trim().toLowerCase()).filter(Boolean);return[...new Set(e)]}async function ht(t,e,o,n,r,a,s=[]){const c=Date.now().toString(16),i=`_000_DM6PR11MB2683${c}DM6PR11MB2683namp_`,p=`_000_ALT_${c}_ALT_`,g=s&&s.length>0;let m=`Subject: ${Re(r)}\r
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
`;const u=Le(a);m+=`${X(u)}\r
\r
`,m+=`--${p}\r
`,m+=`Content-Type: text/html; charset="utf-8"\r
`,m+=`Content-Transfer-Encoding: quoted-printable\r
\r
`,m+=`${X(a)}\r
\r
`,m+=`--${p}--\r
\r
`;for(const b of s)if(b.data){const v=b.data.split(",");if(v.length===2&&v[0].includes("base64")){const f=v[1];m+=`--${i}\r
`,m+=`Content-Type: application/pdf; name="${b.name}"\r
`,m+=`Content-Transfer-Encoding: base64\r
`,m+=`Content-Disposition: attachment; ${He(b.name)}\r
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
`;const u=Le(a);m+=`${X(u)}\r
\r
`,m+=`--${i}\r
`,m+=`Content-Type: text/html; charset="utf-8"\r
`,m+=`Content-Transfer-Encoding: quoted-printable\r
\r
`,m+=`${X(a)}\r
\r
`,m+=`--${i}--\r
`}return m}function yt(t){if(!t)return null;const e=t.indexOf("While Supplies Last");if(e===-1)return null;const o=Math.max(0,e-200),r=t.substring(o,e).match(/([A-Za-z]+\s+\d+(?:\s*-\s*[A-Za-z]+\s+\d+)?),\s*(\d{4})\s*•\s*While Supplies Last/);return r?`${r[1]}, ${r[2]}`:null}function bt(t){if(!t)return"";const e={January:"Jan",February:"Feb",March:"Mar",April:"Apr",May:"May",June:"Jun",July:"Jul",August:"Aug",September:"Sep",October:"Oct",November:"Nov",December:"Dec"},o=t.match(/^([A-Za-z]+)\s+(\d+)(?:\s*-\s*([A-Za-z]+)\s+(\d+))?,?\s*(\d{4})$/);if(o){const[,n,r,a,s,c]=o,i=e[n]||n.substring(0,3),p=a?e[a]||a.substring(0,3):i;return a&&s?`${i}${r}-${p}${s}.${c}`:`${i}${r}.${c}`}return t.replace(/[^a-zA-Z0-9]/g,"").substring(0,20)}function wo(t){const e=yt(t);if(e)return`Promo-email.${bt(e)}.zip`;{const o=new Date,n=String(o.getMonth()+1).padStart(2,"0"),r=String(o.getDate()).padStart(2,"0");return`Promo-email.${o.getFullYear()}-${n}-${r}.zip`}}function Eo(t,e,o,n=[],r="eml",a=1){const s=o.filter(f=>gt(f)?!0:(console.warn(`Invalid email address skipped in batch ${a}: ${f}`),!1)),c="----=_NextPart_"+Date.now()+"_"+a+"_"+Math.random().toString(36).substr(2,9);let i="";i+=`Subject: ${Re(t)}\r
`;const p=new Date(Date.now()+a*1e3);i+=`Date: ${p.toUTCString()}\r
`;const g=`<batch${a}.${Date.now()}.${Math.random().toString(36).substr(2,9)}@citizenstore.local>`;if(i+=`Message-ID: ${g}\r
`,s&&s.length>0){i+="Bcc: ";let f="";for(let h=0;h<s.length;h++){const $=s[h],x=h<s.length-1?", ":"",w=$+x;f.length+w.length>900?(i+=f+`\r
 `,f=w):f+=w}i+=f+`\r
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
`),b=ft(m).match(/.{1,76}/g)||[];i+=b.join(`\r
`),i+=`\r
\r
`,n&&n.length>0&&n.forEach((f,h)=>{if(!f.data){console.warn(`Skipping PDF ${f.name} - no data available (may need to re-upload)`);return}const $=f.data.split(",");if($.length!==2||!$[0].includes("base64")){console.error(`Invalid PDF data format for attachment ${h+1} (${f.name}) in batch ${a}`);return}const x=$[1];if(!x||x.length===0){console.error(`Empty PDF data for attachment ${h+1} (${f.name}) in batch ${a}`);return}i+=`--${c}\r
`,i+=`Content-Type: application/pdf; name="${f.name}"\r
`,i+=`Content-Transfer-Encoding: base64\r
`,i+=`Content-Disposition: attachment; ${He(f.name)}\r
`,i+=`\r
`;const w=x.match(/.{1,76}/g)||[];i+=w.join(`\r
`),i+=`\r
\r
`}),i+=`--${c}--\r
`;const v=a.toString().padStart(3,"0");return{format:r,data:new TextEncoder().encode(i),filename:`batch-email${v}.${r}`}}function j(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}function de(t){const e=r=>j(r);return t.split(/\n\n+/).map(r=>{if(!r.trim())return"";const a=r.split(`
`);return a.some(i=>i.trim())&&a.every(i=>{const p=i.trim();return!p||p.startsWith("•")||p.startsWith("-")})?`    <ul style="margin: 10px 0; padding-left: 20px; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt;">
${a.filter(p=>p.trim()).map(p=>{const g=p.replace(/^[•-]\s*/,"").trim();return`        <li style="margin: 5px 0;">${e(g)}</li>`}).join(`
`)}
    </ul>`:`    <p style="margin: 10px 0; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);">${a.map(i=>e(i)).join("<br>")}</p>`}).filter(r=>r).join(`
`)}function vt(t){let e="Email Preview",o=t;if(window.originalMessageContent){const r=window.originalMessageContent.match(/^Subject:\s*(.+)/m);r&&(e=r[1],o=window.originalMessageContent.replace(/^Subject:.+\n/m,"").trim())}else{const r=t.match(/^Subject:\s*(.+)/m);r&&(e=r[1],o=t.replace(/^Subject:.+\n/m,"").trim())}return`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${j(e)}</title>
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
            <div class="email-subject">${j(e)}</div>
        </div>
        <div class="email-body">
            ${o}
        </div>
    </div>
</body>
</html>`}let P=null;function wt(t){P=t}function Oe(t){return t?/<(p|div|span|br|html|body|head|table|tr|td|ul|ol|li|h[1-6]|strong|em|a)\b[^>]*>/i.test(t):!1}const d={};function Et(){d.templateSelect=document.getElementById("templateSelect"),d.formFields=document.getElementById("formFields"),d.formSectionTitle=document.getElementById("formSectionTitle"),d.outputCard=document.getElementById("outputCard"),d.outputArea=document.getElementById("outputArea"),d.generateBtn=document.getElementById("generateBtn"),d.clearBtn=document.getElementById("clearBtn"),d.copyBtn=document.getElementById("copyBtn"),d.sendEmailBtn=document.getElementById("sendEmailBtn"),d.downloadEmailBtn=document.getElementById("downloadEmailBtn"),d.themeToggle=document.getElementById("themeToggle"),d.searchBox=document.getElementById("searchBox"),d.clearSearch=document.getElementById("clearSearch"),d.searchResults=document.getElementById("searchResults"),d.resultCounter=document.getElementById("resultCounter")}function ee(t){return document.getElementById(t)}function A(t,e=2500){const o=document.getElementById("toast");if(!o){console.warn("Toast element not found");return}o.textContent=t,o.classList.add("show"),setTimeout(()=>{o.classList.remove("show")},e)}function qe(){if(!d.outputCard)return;d.outputArea=null,d.copyBtn=null,d.subjectLineContainer=null,d.sendEmailBtn=null,d.downloadEmailBtn=null,d.previewTab=null,d.htmlTab=null,d.previewContentRegular=null,d.htmlContentRegular=null,d.emailPreview=null;const t=B[P],e=t&&t.hasEditableSubject;let o="",n="";if(e?(o=`
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
    `,d.outputArea=document.getElementById("outputArea"),d.copyBtn=document.getElementById("copyBtn"),d.previewTab=document.querySelector('.output-tab[data-tab="preview"]'),d.htmlTab=document.querySelector('.output-tab[data-tab="html"]'),d.previewContentRegular=document.getElementById("previewContent"),d.htmlContentRegular=document.getElementById("htmlContent"),d.emailPreview=document.getElementById("emailPreview"),d.emailPreview&&ue(d.emailPreview),d.copyBtn&&d.copyBtn.addEventListener("click",Dt),d.previewTab&&d.htmlTab&&(d.previewTab.addEventListener("click",()=>{d.previewTab.classList.add("active"),d.htmlTab.classList.remove("active"),d.previewContentRegular&&d.previewContentRegular.classList.add("active"),d.htmlContentRegular&&d.htmlContentRegular.classList.remove("active"),d.outputArea&&window.originalMessageContent&&(d.outputArea.value=window.originalMessageContent),Z()}),d.htmlTab.addEventListener("click",()=>{if(d.htmlTab.classList.add("active"),d.previewTab.classList.remove("active"),d.htmlContentRegular&&d.htmlContentRegular.classList.add("active"),d.previewContentRegular&&d.previewContentRegular.classList.remove("active"),d.outputArea){const r=d.outputArea.value;if(r){let a="Email",s=r;const c=r.match(/^Subject:\s*(.+)/m);c&&(a=c[1],s=r.replace(/^Subject:.+\n/m,"").trim());let i=s;const p=s.match(/\n\nBest regards,/);p&&(i=s.substring(0,p.index+p[0].length).trim());const g=de(i),m=N("html"),u=`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(a)}</title>
</head>
<body style="font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0); margin: 0; padding: 20px; background-color: #ffffff;">
    <div style="max-width: 600px; margin: 0 auto;">
        <div style="padding: 10px; background-color: #f5f5f5; border-bottom: 2px solid #ddd; margin-bottom: 20px;">
            <div style="font-size: 14pt; font-weight: 600; color: #333;">${escapeHtml(a)}</div>
        </div>
        <div>
            ${g}
            <div style="margin-top: 5px; padding-top: 10px;">
                ${m}
            </div>
        </div>
    </div>
</body>
</html>`;d.outputArea.value=u}}})),e){const r=document.getElementById("sendEmailBtn"),a=document.getElementById("downloadEmailBtn");r&&r.addEventListener("click",()=>{const c=document.getElementById("outputArea"),i=c?c.value:"";i&&Ct(P,i)}),a&&a.addEventListener("click",()=>{const c=document.getElementById("outputArea"),i=window.originalMessageContent||(c?c.value:"");i&&Bt(P,i)});const s=document.getElementById("subjectLineContent");s&&_e(s,"")}}function ue(t){if(!t)return;const e=t.contentDocument||t.contentWindow.document;if(!e)return;const o=getComputedStyle(document.documentElement),n=o.getPropertyValue("--bg-tertiary").trim()||"#f8f3ef",r=o.getPropertyValue("--text-primary").trim()||"#2a2420",a=o.getPropertyValue("--text-secondary").trim()||"#666";e.open(),e.write(`
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <h3>No Preview Yet</h3>
                <p>Fill in the form and click Generate to see your email preview</p>
            </div>
        </body>
        </html>
    `),e.close()}function St(){const t=navigator.platform.toLowerCase();return t.includes("win")?"windows":t.includes("mac")?"mac":"other"}function $t(){return St()==="mac"?"emltpl":"eml"}function xt(){try{const t=localStorage.getItem("userProfile");t&&(y.userProfile=JSON.parse(t))}catch(t){console.error("Error loading user profile:",t)}}function ze(){d.templateSelect.addEventListener("change",()=>{le(d.templateSelect.value)}),d.generateBtn.addEventListener("click",Lt),d.clearBtn.addEventListener("click",Tt),d.themeToggle.addEventListener("click",ho),d.searchBox.addEventListener("input",()=>{const e=d.searchBox.value.trim();d.clearSearch.classList.toggle("visible",e.length>0),Te(e)}),d.clearSearch.addEventListener("click",()=>{d.searchBox.value="",d.clearSearch.classList.remove("visible"),Te("")});const t=document.querySelector(".search-container");document.addEventListener("click",e=>{t&&!t.contains(e.target)&&d.searchResults&&d.searchResults.classList.remove("visible")}),d.searchResults&&d.searchResults.addEventListener("click",e=>{const o=e.target.closest(".search-result-item");if(o&&o.dataset.templateKey){const n=o.dataset.templateKey;le(n),d.searchBox.value="",d.searchBox.classList.remove("active"),d.clearSearch.classList.remove("visible"),d.searchResults.classList.remove("visible")}}),Ve()}function It(t){const e=t.id,o=B[P];if(!o)return;const n=o.fields.find(i=>i.id===e);if(!n||!n.validation)return;const{pattern:r,message:a}=n.validation,s=r.test(t.value);t.classList.toggle("invalid",!s);let c=t.nextElementSibling;return(!c||!c.classList.contains("validation-msg"))&&(c=document.createElement("div"),c.className="validation-msg",t.parentNode.insertBefore(c,t.nextSibling)),c.textContent=s?"":a,c.style.display=s?"none":"block",s}function Lt(){const t=B[P];if(!t){A("Please select a template first");return}const e={};let o=!0,n=null;if(t.fields.forEach(s=>{const c=ee(s);c&&(e[s]=c.value,(te[s]||{}).validation&&(It(c)||(o=!1,n||(n=c))))}),!o){A("✗ Please fix the errors in the form"),n&&n.focus();return}const r=t.generate(e);qe();const a=ee("outputArea");if(a&&(a.value=r),window.originalMessageContent=r,Z(),t.hasEditableSubject){const s=K(r),c=document.getElementById("subjectLineContent");c&&_e(c,s)}d.outputCard.scrollIntoView({behavior:"smooth"})}function Tt(){const t=B[P];t&&t.fields.forEach(e=>{const o=ee(e.id);if(o){o.value="",o.classList.remove("invalid");const n=o.nextElementSibling;n&&n.classList.contains("validation-msg")&&(n.style.display="none")}}),d.outputArea&&(d.outputArea.value=""),d.outputCard&&(d.outputCard.innerHTML=""),Z(),A("✓ Form cleared")}function K(t){const e=t.match(/^Subject:\s*(.*)/im);return e?e[1]:""}function _e(t,e){window.currentSubjectLine=e,t.innerHTML=`
        <div class="editable-subject-line">
            <label for="subjectInput" class="form-label">Subject:</label>
            <input type="text" id="subjectInput" class="form-input" value="${L(e)}">
        </div>
    `;const o=document.getElementById("subjectInput");o&&o.addEventListener("input",n=>{window.currentSubjectLine=n.target.value,debouncedSubjectPreviewUpdate(n.target.value)})}function Ct(t,e){const o=B[t];if(!o)return;let n="",r=e;o.hasEditableSubject?(n=window.currentSubjectLine||K(e),r=r.replace(/^Subject:.*\r?\n/im,"")):(n=K(e),r=r.replace(/^Subject:.*\r?\n/im,""));const a=dt(r),s=`mailto:?subject=${encodeURIComponent(n)}&body=${encodeURIComponent(a)}`,c=document.createElement("a");c.href=s,document.body.appendChild(c),c.click(),document.body.removeChild(c)}function Bt(t,e){const o=B[t];if(!o)return;let n="",r=e;o.hasEditableSubject?(n=window.currentSubjectLine||K(e),r=e.replace(/^Subject:.*\r?\n/im,"")):(n=K(e),r=e.replace(/^Subject:.*\r?\n/im,""));const a=Oe(r);let s;if(a)s=r;else{let p=r;const g=r.match(/\n\nBest regards,/);g&&(p=r.substring(0,g.index+g[0].length).trim());const m=de(p),u=N("html");s=`<html>
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
</html>`}const c=y.userProfile.name||`${se()} ${Me()}`,i=y.userProfile.email||"store@citizenwatchgroup.com";ht(c,i,"","",n,s,[]).then(p=>{const g=new Blob([p],{type:"message/rfc822"}),m=URL.createObjectURL(g),u=document.createElement("a");u.href=m;const b=n.replace(/[^a-z0-9]/gi,"_").toLowerCase(),f=$t()==="emltpl"?".emltpl":".eml";u.download=`${b}${f}`,u.click(),URL.revokeObjectURL(m)})}function So(){Et(),xt(),Nt(),ze();const t=localStorage.getItem("selectedTemplate");t&&B[t]&&le(t)}function Pt(){const t=document.getElementById("emailPreview");t&&ue(t)}function kt(){return`
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
  `}function Z(){const t=document.getElementById("outputArea"),e=document.getElementById("emailPreview"),o=document.querySelector('.output-tab[data-tab="preview"]'),n=document.getElementById("previewContent"),r=document.getElementById("htmlContent");if(!t||!e)return;const a=t.value;if(!a){ue(e);return}const s=Oe(a),c=document.querySelector('.output-tab[data-tab="html"]');if(o){o.disabled=!1,o.style.opacity="1",o.style.cursor="pointer",o.classList.add("active"),c&&c.classList.remove("active"),n&&n.classList.add("active"),r&&r.classList.remove("active");let i;if(s)i=vt(a);else{let m="Email Preview",u=a;const b=a.match(/^Subject:\s*(.+)/m);b&&(m=b[1],u=a.replace(/^Subject:.+\n/m,"").trim());let v=u;const f=v.match(/\n\nBest regards,/);if(f)v=v.substring(0,f.index+f[0].length).trim();else{const x=v.match(/______+/);if(x){const w=v.substring(0,x.index),I=w.lastIndexOf(`

`);I!==-1&&(v=w.substring(0,I).trim())}}const h=de(v),$=N("html");i=`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(m)}</title>
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
            <div class="email-subject">${escapeHtml(m)}</div>
        </div>
        <div class="email-body">
            ${h}
            <div style="margin-top: 5px; padding-top: 10px;">
                ${$}
            </div>
        </div>
    </div>
</body>
</html>`}const p=document.documentElement.getAttribute("data-theme")||"light";let g=i;p==="dark"&&(g=i.replace("</head>",`<style id="dark-mode-sim">${kt()}</style></head>`)),e.srcdoc=g}}function Nt(){const t={"Customer Email":[],"Phone Orders":[],Text:[]};Object.keys(B).forEach(e=>{const o=B[e];t[o.category].push({key:e,name:o.name})}),d.templateSelect.innerHTML='<option value="">Select a template...</option>',Object.keys(t).forEach(e=>{if(t[e].length>0){const o=document.createElement("optgroup");o.label=e,t[e].forEach(n=>{const r=document.createElement("option");r.value=n.key,r.textContent=n.name,r.title=ut[n.key]||"",o.appendChild(r)}),d.templateSelect.appendChild(o)}})}function Te(t){if(!t.trim()){d.searchResults.classList.remove("visible"),d.resultCounter.textContent="",d.clearSearch.classList.remove("visible"),d.searchBox.classList.remove("active");return}d.clearSearch.classList.add("visible"),d.searchBox.classList.add("active");const e=t.toLowerCase(),o=Object.keys(B).filter(a=>{const s=B[a];return s.name.toLowerCase().includes(e)||s.category.toLowerCase().includes(e)});let n="";if(o.length===0)n='<div class="search-result-item" style="cursor: default; color: var(--text-tertiary);">No templates found</div>',d.resultCounter.textContent="0 templates found";else{n=o.map(i=>{const p=B[i],g=D(p.name),m=D(p.category);return`
                <div class="search-result-item" data-template-key="${L(i)}">
                    <div class="search-result-name">${g}</div>
                    <div class="search-result-category">${m}</div>
                </div>
            `}).join("");const s=o.length,c=s===1?"":"s";d.resultCounter.textContent=`${s} template${c} found`}const r=d.resultCounter;d.searchResults.innerHTML=n,d.searchResults.appendChild(r),d.searchResults.classList.add("visible")}let Ce=null,Be=!1;function le(t){try{if(!t||!B[t]){console.warn("Invalid template key:",t);return}if(t===Ce&&Be)return;Be=!0,Ce=t,P=t;const e=B[t];Pt(),window.originalMessageContent="";const o=ee("outputArea");o&&(o.value=""),localStorage.setItem("selectedTemplate",t),d.templateSelect.value=t;const n=document.querySelector(".section-header-with-controls");if(n){const i=document.createElement("h2");i.id="formSectionTitle",i.className="section-title",i.textContent=`${e.name} Fields`,n.replaceWith(i),d.formSectionTitle=i}else d.formSectionTitle.textContent=`${e.name} Fields`;const r=document.getElementById("formPlaceholder");r&&r.remove(),qe();const a=e.fields.map(i=>{const p=i.replace(/([A-Z])/g," $1").trim(),g=p.charAt(0).toUpperCase()+p.slice(1),m=i.includes("address")||i.includes("Address")||i.includes("Details"),u=i.includes("Verified")||i.includes("Verification"),b=te[i]||{},v=m?" full-width":"",f=b.required?" *":"",h=L(i),$=L(b.example||"");if(u)return`
                    <div class="form-group radio-field">
                        <label class="form-label">${D(g)}${f}</label>
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
                `;const x=mt(i),w=`datalist-${h}`;let I="";if(x.length>0){const Ze=x.map(Ge=>`<option value="${L(Ge)}">`).join("");I=`
                <datalist id="${w}">
                    ${Ze}
                </datalist>
            `}let V="";y.userProfile&&((i==="employeeName"||i==="yourName")&&y.userProfile.employeeName?V=L(y.userProfile.employeeName):i==="storePhone"&&y.userProfile.storePhone?V=L(y.userProfile.storePhone):i==="storeName"&&y.userProfile.storeName&&(V=L(y.userProfile.storeName)));const Ke=m?`<textarea id="${h}" class="form-textarea" data-field="${h}" ${b.required?"required":""} placeholder="${$}">${V}</textarea>`:`<input type="text" id="${h}" class="form-input" data-field="${h}" ${b.required?"required":""} placeholder="${$}" value="${V}" list="${w}">${I}`;return`
                <div class="form-group${v}">
                    <label class="form-label" for="${h}">${D(g)}${f}</label>
                    <div class="input-wrapper">
                        ${Ke}
                        <button class="clear-input" data-clear="${h}" title="Clear">×</button>
                    </div>
                    <div class="calculated-value" data-calc="${h}" style="display: none;"></div>
                    <div class="error-message" data-error="${h}" style="display: none;"></div>
                </div>
            `});d.formFields.innerHTML=a.join(""),setTimeout(()=>{ze()},0),d.formFields.addEventListener("click",i=>{if(i.target.classList.contains("clear-input")){const p=i.target.dataset.clear,g=document.getElementById(p);g&&(g.value="",i.target.classList.remove("visible"),g.focus(),Z())}}),d.formFields.addEventListener("input",i=>{if(i.target.classList.contains("form-input")||i.target.classList.contains("form-textarea")){const p=i.target.id,g=d.formFields.querySelector(`[data-clear="${p}"]`);g&&g.classList.toggle("visible",i.target.value.trim().length>0)}}),d.formFields.querySelectorAll(".form-input, .form-textarea").forEach(i=>{const p=d.formFields.querySelector(`[data-clear="${i.id}"]`);p&&i.value.trim().length>0&&p.classList.add("visible")});const c=document.getElementById("outputArea");c&&(c.value=""),d.clearBtn.disabled=!1}catch(e){console.error("Error selecting template:",e),A("Error loading template")}}function Dt(){const t=document.getElementById("outputArea");if(!t){console.error("outputArea element not found"),A("⚠ Output area not found");return}const e=t.value;if(!e){A("⚠ Nothing to copy");return}if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(e).then(()=>{A("✓ Copied!")}).catch(o=>{console.error("Clipboard error:",o),A("⚠ Copy failed")});else try{t.select();const o=document.execCommand("copy");A(o?"✓ Copied!":"⚠ Copy failed")}catch(o){console.error("Copy error:",o),A("⚠ Copy not supported")}}const l={promotionEntries:[],specialHours:[],howToShopItems:[],importantNotesItems:[],attachedPDFs:[],generatedSubjectLines:[],selectedSubjectLine:null,howToShopExpanded:!1,importantNotesExpanded:!1,entryCollapsedStates:{}};function F(t){return JSON.parse(JSON.stringify(t))}function At({promoDateRange:t="",promoYear:e="",promoTitle:o="",bulkEmailRecipients:n="",promotionEntries:r=[],specialHours:a=[],howToShopItems:s=[],importantNotesItems:c=[],attachedPDFs:i=[],generatedSubjectLines:p=[],selectedSubjectLine:g=null,now:m=new Date}){const u=n||"",b=i.map(v=>({id:v.id,name:v.name,size:v.size,type:v.type}));return{templateType:"promotion-email",version:"1.0",savedAt:m.toISOString(),dateRange:t||"",year:e||"",title:o||"",bulkEmailRecipients:u,promotionEntries:F(r),specialHours:F(a),howToShopItems:F(s),importantNotesItems:F(c),attachedPDFs:F(b),generatedSubjectLines:F(p),selectedSubjectLine:g}}function jt({promoDateRange:t="",promoYear:e="",promoTitle:o="",bulkEmailRecipients:n="",promotionEntries:r=[],specialHours:a=[],howToShopItems:s=[],importantNotesItems:c=[],attachedPDFs:i=[],generatedSubjectLines:p=[],selectedSubjectLine:g=null,now:m=new Date}){return{templateType:"promotion-email",version:"1.0",exportedAt:m.toISOString(),dateRange:t||"",year:e||"",title:o||"",promotionEntries:F(r),specialHours:F(a),attachedPDFs:F(i),generatedSubjectLines:F(p),selectedSubjectLine:g}}function Ft(t){if(!t||typeof t!="object")return{ok:!1,reason:"notObject"};const e=F(t);if(e.templateType&&e.templateType!=="promotion-email")return{ok:!1,reason:"wrongType"};function o(r,a){if(!Array.isArray(e[r])){if(e[r]!==void 0)return a;e[r]=[]}return null}const n=[o("promotionEntries","promotionEntriesNotArray"),o("specialHours","specialHoursNotArray"),o("howToShopItems","howToShopItemsNotArray"),o("importantNotesItems","importantNotesItemsNotArray")].filter(Boolean);return n.length>0?{ok:!1,reason:n[0]}:(Array.isArray(e.attachedPDFs)||(e.attachedPDFs=[]),Array.isArray(e.generatedSubjectLines)||(e.generatedSubjectLines=[]),{ok:!0,config:e})}function oe(t){t.querySelectorAll(".clear-input").forEach(e=>{const o=e.dataset.clear,n=document.getElementById(o);if(!n)return;const r=()=>{e.classList.toggle("visible",n.value.trim().length>0)};r(),n.addEventListener("input",r),e.addEventListener("click",()=>{n.value="",e.classList.remove("visible"),n.focus(),n.dispatchEvent(new Event("input",{bubbles:!0}))})})}function ne(t,e,o,n="id"){const r=t.findIndex(a=>a[n]===e);return o==="up"&&r>0?([t[r-1],t[r]]=[t[r],t[r-1]],!0):o==="down"&&r<t.length-1?([t[r],t[r+1]]=[t[r+1],t[r]],!0):!1}function me(t,e,o,n=".editable-item-row"){const r=t.querySelectorAll(n);let a=null,s=null;r.forEach(c=>{c.addEventListener("dragstart",i=>{a=c,s=parseInt(c.dataset.itemId||c.dataset.entryId,10),c.classList.add("dragging"),i.dataTransfer.effectAllowed="move"}),c.addEventListener("dragend",()=>{c.classList.remove("dragging"),r.forEach(i=>i.classList.remove("drag-over"))}),c.addEventListener("dragover",i=>{i.preventDefault(),i.dataTransfer.dropEffect="move",a!==c&&c.classList.add("drag-over")}),c.addEventListener("dragleave",()=>{c.classList.remove("drag-over")}),c.addEventListener("drop",i=>{if(i.preventDefault(),c.classList.remove("drag-over"),a!==c){const p=parseInt(c.dataset.itemId||c.dataset.entryId,10),g=e.findIndex(u=>u.id===s),m=e.findIndex(u=>u.id===p);if(g!==-1&&m!==-1){const[u]=e.splice(g,1);e.splice(m,0,u),o()}}})})}function Mt(){const t=localStorage.getItem("userProfile");return t?JSON.parse(t):null}function pe(){const t=Mt();return t?.storeEmail?t.storeEmail:t?.storeName?`${t.storeName.toLowerCase().replace(/\s+/g,"")}@citizenwatchgroup.com`:"store@citizenwatchgroup.com"}function Ue(){const t=navigator.platform.toLowerCase();return t.includes("win")?"windows":t.includes("mac")?"mac":"other"}function Rt(){return Ue()==="mac"?"emltpl":"eml"}function Ht(){const t=document.getElementById("formatStatusText");if(!t)return;const e=Ue(),o=Rt(),n=o==="emltpl"?"Template":"EML",r=o==="emltpl"?".emltpl":".eml";let a="Unknown";e==="windows"?a="Windows":e==="mac"?a="macOS":a="Other Platform",t.innerHTML=`<strong>${n} Format:</strong> Optimized for ${a} (${r} files)`}function Ot(t,e){let o;return function(...r){const a=()=>{clearTimeout(o),t(...r)};clearTimeout(o),o=setTimeout(a,e)}}function E(t,e=2500){const o=document.getElementById("toast");if(!o){console.warn("Toast element not found");return}o.textContent=t,o.classList.add("show"),setTimeout(()=>{o.classList.remove("show")},e)}function fe(t){if(!t)return;const e=t.contentDocument||t.contentWindow.document;if(!e)return;const o=getComputedStyle(document.documentElement),n=o.getPropertyValue("--bg-tertiary").trim()||"#f8f3ef",r=o.getPropertyValue("--text-primary").trim()||"#2a2420",a=o.getPropertyValue("--text-secondary").trim()||"#666";e.open(),e.write(`
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <h3>No Preview Yet</h3>
                <p>Begin filling in the promotion details to start seeing a preview</p>
            </div>
        </body>
        </html>
    `),e.close()}let J=null,z=null,Q=!1;function qt(){return`
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
  `}function C(){if(P!=="promotion-email")return;const t=document.getElementById("previewIframe");if(!t)return;const e=document.getElementById("promoDateRange");if(!e||!e.value.trim()){fe(t);return}const o=document.getElementById("promoYear"),n=document.getElementById("promoTitle"),r={promoDateRange:e.value,promoYear:o?o.value:"",promoTitle:n?n.value:""},a=po(r),s=document.getElementById("codeArea");s&&(s.value=a);const c=document.documentElement.getAttribute("data-theme")||"light";let i=a;c==="dark"&&(i=a.replace("</head>",`<style id="dark-mode-sim">${qt()}</style></head>`));const p=t.contentDocument||t.contentWindow.document;p.open(),p.write(i),p.close(),l.generatedSubjectLines.length===0&&uo()}const re=Ot(C,500);async function zt(){if(P!=="promotion-email")return;if(l.promotionEntries.forEach(n=>{l.entryCollapsedStates[n.id]=!0}),M(),l.attachedPDFs.length>0&&T){for(const n of l.attachedPDFs)if(n.data)try{await ce(n),console.log(`Re-saved PDF ${n.name} to IndexedDB during template save`)}catch(r){console.warn(`Failed to save PDF ${n.name} to IndexedDB:`,r)}}const t=document.getElementById("bulkEmailList"),e=t?t.value:"",o=At({promoDateRange:document.getElementById("promoDateRange")?.value||"",promoYear:document.getElementById("promoYear")?.value||"",promoTitle:document.getElementById("promoTitle")?.value||"",bulkEmailRecipients:e,promotionEntries:l.promotionEntries,specialHours:l.specialHours,howToShopItems:l.howToShopItems,importantNotesItems:l.importantNotesItems,attachedPDFs:l.attachedPDFs,generatedSubjectLines:l.generatedSubjectLines,selectedSubjectLine:l.selectedSubjectLine});try{e&&T&&await tt(e)}catch(n){console.warn("Failed to save bulk email recipients to IndexedDB during template save:",n)}localStorage.setItem("savedPromotionTemplate",JSON.stringify(o)),E("✓ Template saved successfully")}function _t(){if(P!=="promotion-email")return;const t=document.createElement("input");t.type="file",t.accept=".json,application/json",t.style.display="none",t.addEventListener("change",e=>{const o=e.target.files[0];if(!o)return;const n=new FileReader;n.onload=r=>{try{const a=JSON.parse(r.target.result);if(!a||typeof a!="object"){E("✗ Invalid template file - not a valid configuration object");return}if(a.templateType&&a.templateType!=="promotion-email"){E("✗ Invalid template file - not a promotion email template");return}if(!("promotionEntries"in a)||!("specialHours"in a)){E("✗ Invalid template file - missing required promotion template fields");return}Ye(a,!0),E("✓ Template imported from file successfully")}catch(a){console.error("Import error:",a),E("✗ Error reading template file - Invalid JSON or corrupted file")}},n.onerror=()=>{E("✗ Error reading file")},n.readAsText(o)}),document.body.appendChild(t),t.click(),setTimeout(()=>{document.body.removeChild(t)},1e3)}async function Ye(t,e=!0){const o=Ft(t);if(!o.ok){switch(o.reason){case"notObject":E("✗ Invalid template data - not an object");break;case"wrongType":E("✗ Invalid template data - wrong template type");break;case"promotionEntriesNotArray":E("✗ Invalid template data - promotionEntries must be an array");break;case"specialHoursNotArray":E("✗ Invalid template data - specialHours must be an array");break;case"howToShopItemsNotArray":E("✗ Invalid template data - howToShopItems must be an array");break;case"importantNotesItemsNotArray":E("✗ Invalid template data - importantNotesItems must be an array");break;default:E("✗ Invalid template data")}return}const n=o.config;setTimeout(()=>{const s=document.getElementById("promoDateRange"),c=document.getElementById("promoYear"),i=document.getElementById("promoTitle"),p=document.getElementById("bulkEmailList");if(s){s.value=n.dateRange||"";const g=document.querySelector('[data-clear="promoDateRange"]');g&&s.value.trim()&&g.classList.add("visible")}if(c){c.value=n.year||"";const g=document.querySelector('[data-clear="promoYear"]');g&&c.value.trim()&&g.classList.add("visible")}if(i){i.value=n.title||"";const g=document.querySelector('[data-clear="promoTitle"]');g&&i.value.trim()&&g.classList.add("visible")}p&&n.bulkEmailRecipients!=null&&(Array.isArray(n.bulkEmailRecipients)?p.value=n.bulkEmailRecipients.join(", "):typeof n.bulkEmailRecipients=="string"&&(p.value=n.bulkEmailRecipients),p.value&&p.dispatchEvent(new Event("input",{bubbles:!0}))),C()},100),l.promotionEntries=JSON.parse(JSON.stringify(n.promotionEntries||[])),l.specialHours=JSON.parse(JSON.stringify(n.specialHours||[])),n.howToShopItems&&n.howToShopItems.length>0&&(l.howToShopItems=JSON.parse(JSON.stringify(n.howToShopItems))),n.importantNotesItems&&n.importantNotesItems.length>0&&(l.importantNotesItems=JSON.parse(JSON.stringify(n.importantNotesItems))),ge(),We(),l.generatedSubjectLines=JSON.parse(JSON.stringify(n.generatedSubjectLines||[])),l.selectedSubjectLine=n.selectedSubjectLine||null;const r=new Set(l.attachedPDFs.map(s=>s.id));l.attachedPDFs=[];const a=n.attachedPDFs||[];if(a.length>0){let s=0;for(;!T&&s<20;)await new Promise(c=>setTimeout(c,50)),s++;T||console.warn("IndexedDB not initialized after waiting, PDFs may not have data")}for(const s of a)if(!r.has(s.id))if(s.data){l.attachedPDFs.push(s);try{await ce(s)}catch(c){console.warn(`Failed to save PDF ${s.name} to IndexedDB:`,c)}}else try{const c=await et(s.id);c&&c.data?l.attachedPDFs.push(c):console.warn(`PDF ${s.name} (ID: ${s.id}) data not found in IndexedDB or config, skipping.`)}catch(c){console.warn(`Failed to restore PDF ${s.name} from IndexedDB:`,c)}l.attachedPDFs=l.attachedPDFs.filter(s=>s.data),e&&(l.entryCollapsedStates={},l.promotionEntries.forEach(s=>{l.entryCollapsedStates[s.id]=!0})),l.howToShopExpanded=!1,l.importantNotesExpanded=!1,M(),_(),O(),U(),G(),ae(),C()}function Ut(){if(P!=="promotion-email")return;const t=document.getElementById("bulkEmailList"),e=t?t.value:"",o=jt({promoDateRange:document.getElementById("promoDateRange")?.value||"",promoYear:document.getElementById("promoYear")?.value||"",promoTitle:document.getElementById("promoTitle")?.value||"",bulkEmailRecipients:e,promotionEntries:l.promotionEntries,specialHours:l.specialHours,howToShopItems:l.howToShopItems,importantNotesItems:l.importantNotesItems,attachedPDFs:l.attachedPDFs,generatedSubjectLines:l.generatedSubjectLines,selectedSubjectLine:l.selectedSubjectLine}),n=JSON.stringify(o,null,2),r=new Blob([n],{type:"application/json"}),a=URL.createObjectURL(r),s=document.createElement("a");s.href=a,s.download=`promotion-template-${new Date().toISOString().split("T")[0]}.json`,s.click(),URL.revokeObjectURL(a),E("✓ Template exported successfully")}function Yt(t){if(!t)return"WEEKLY SALE";const e=t.toLowerCase();return e.includes("nov")&&(e.includes("24")||e.includes("25")||e.includes("26")||e.includes("27")||e.includes("28")||e.includes("29"))?"BLACK FRIDAY OUTLET EVENT":e.includes("nov")&&e.includes("30")||e.includes("dec")&&e.includes("1")&&!e.includes("10")?"CYBER MONDAY SALE":e.includes("dec")?"HOLIDAY SALE EVENT":e.includes("jun")||e.includes("jul")||e.includes("aug")?"SUMMER CLEARANCE":e.includes("aug")&&(e.includes("20")||e.includes("2")||e.includes("3"))||e.includes("sep")&&(e.includes("1")||e.includes("2")||e.includes("3")||e.includes("4")||e.includes("5")||e.includes("6")||e.includes("7")||e.includes("8")||e.includes("9"))?"BACK TO SCHOOL SALE":"WEEKLY SALE"}function Pe(){const t=Date.now();l.promotionEntries.push({id:t,line:"",collections:"",callout:""}),M()}function Wt(t){l.promotionEntries=l.promotionEntries.filter(e=>e.id!==t),M()}function Vt(t){ne(l.promotionEntries,t,"up")&&M()}function Jt(t){ne(l.promotionEntries,t,"down")&&M()}function Kt(t){const e=!l.entryCollapsedStates[t];l.entryCollapsedStates[t]=e;const o=document.querySelector(`.promotion-entry[data-entry-id="${t}"]`);if(o){const n=o.querySelector(".entry-fields"),r=o.querySelector(".collapse-btn"),a=o.querySelector(".entry-header-left");n&&(n.style.display=e?"none":"grid"),r&&(r.textContent=e?"Expand":"Collapse",r.title=e?"Expand":"Collapse"),o.classList.toggle("collapsed",e);let s=a?.querySelector(".entry-summary");if(e){if(!s&&a){const i=l.promotionEntries.find(p=>p.id===t)?.line?.trim()||"Entry not filled out";s=document.createElement("span"),s.className="entry-summary",s.textContent=i,a.appendChild(s)}}else s&&s.remove()}}function ke(t){const e=parseInt(t.target.dataset.entryId),o=l.promotionEntries.find(n=>n.id===e);o&&(t.target.classList.contains("entry-line")?o.line=t.target.value:t.target.classList.contains("entry-collections")?o.collections=t.target.value:t.target.classList.contains("entry-callout")&&(o.callout=t.target.value))}function M(){const t=document.getElementById("promotionEntriesContainer");t&&(t.innerHTML=l.promotionEntries.map((e,o)=>{const n=L(String(e.id)),r=o===0,a=o===l.promotionEntries.length-1,s=l.entryCollapsedStates[e.id]||!1;let c="";return e.line&&e.line.trim()?c=e.line.trim():c="Entry not filled out",`
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
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-up" data-entry-id="${e.id}" title="Move up" ${r?"disabled":""}>▲</button>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-down" data-entry-id="${e.id}" title="Move down" ${a?"disabled":""}>▼</button>
                        <span class="entry-number">Entry ${o+1}</span>
                        ${s?`<span class="entry-summary">${j(c)}</span>`:""}
                    </div>
                    <div class="entry-controls">
                        <button type="button" class="collapse-btn btn-base btn-secondary-base btn-xs" data-action="toggle-collapse" data-entry-id="${e.id}" title="${s?"Expand":"Collapse"}">
                            ${s?"Expand":"Collapse"}
                        </button>
                        <button type="button" class="entry-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove" data-entry-id="${e.id}" title="Remove" aria-label="Remove entry">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="entry-fields" style="display: ${s?"none":"grid"};">
                    <div class="form-group full-width">
                        <label class="form-label" for="entry-${n}-line">Promotion Line *</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-input entry-line" id="entry-${n}-line" name="entry-${n}-line" data-entry-id="${n}" value="${L(e.line||"")}" placeholder="CITIZEN – ADDITIONAL 20% OFF">
                            <button class="clear-input" data-clear="entry-${n}-line" title="Clear">×</button>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label class="form-label" for="entry-${n}-collections">Collections (comma-separated)</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-input entry-collections" id="entry-${n}-collections" name="entry-${n}-collections" data-entry-id="${n}" value="${L(e.collections)}" placeholder="Corso, Avion, Marine Star">
                            <button class="clear-input" data-clear="entry-${n}-collections" title="Clear">×</button>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label class="form-label" for="entry-${n}-callout">Special Callout (optional)</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-input entry-callout" id="entry-${n}-callout" name="entry-${n}-callout" data-entry-id="${n}" value="${L(e.callout)}" placeholder="Final sale items excluded">
                            <button class="clear-input" data-clear="entry-${n}-callout" title="Clear">×</button>
                        </div>
                    </div>
                </div>
            </div>
        `}).join(""),t.querySelectorAll(".entry-line, .entry-collections, .entry-callout").forEach(e=>{e.addEventListener("input",o=>{ke(o),re()}),e.addEventListener("change",o=>{ke(o),C()})}),me(t,l.promotionEntries,M,".promotion-entry"),t.querySelectorAll("[data-action]").forEach(e=>{e.addEventListener("click",o=>{const n=o.currentTarget.dataset.action,r=parseInt(o.currentTarget.dataset.entryId);switch(n){case"move-up":Vt(r);break;case"move-down":Jt(r);break;case"toggle-collapse":Kt(r);break;case"remove":Wt(r);break}})}),oe(t),C())}function Zt(){const t=Date.now();l.specialHours.push({id:t,day:"",hours:""}),_()}function Gt(t){l.specialHours=l.specialHours.filter(e=>e.id!==t),_()}function Xt(t){ne(l.specialHours,t,"up")&&_()}function Qt(t){ne(l.specialHours,t,"down")&&_()}function eo(t){const e=parseInt(t.target.dataset.hourId),o=l.specialHours.find(n=>n.id===e);o&&(t.target.classList.contains("hour-day")?o.day=t.target.value:t.target.classList.contains("hour-hours")&&(o.hours=t.target.value))}function _(){const t=document.getElementById("specialHoursContainer");if(!t)return;t.innerHTML=l.specialHours.map((o,n)=>{const r=L(String(o.id)),a=n===0,s=n===l.specialHours.length-1;return`
            <div class="special-hour-row" data-hour-id="${r}">
                <div class="special-hour-fields">
                    <div class="form-group">
                        <div class="input-wrapper">
                            <input type="text" class="form-input hour-day" id="hour-${r}-day" name="hour-${r}-day" data-hour-id="${r}" value="${L(o.day)}" placeholder="e.g., Friday Nov 29">
                            <button class="clear-input" data-clear="hour-${r}-day" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <div class="input-wrapper">
                            <input type="text" class="form-input hour-hours" id="hour-${r}-hours" name="hour-${r}-hours" data-hour-id="${r}" value="${L(o.hours)}" placeholder="e.g., 6AM–10PM or CLOSED">
                            <button class="clear-input" data-clear="hour-${r}-hours" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="hour-controls">
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-hour-up" data-hour-id="${o.id}" title="Move up" ${a?"disabled":""}>▲</button>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-hour-down" data-hour-id="${o.id}" title="Move down" ${s?"disabled":""}>▼</button>
                        <button type="button" class="hour-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove-hour" data-hour-id="${o.id}" title="Remove" aria-label="Remove special hour">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `}).join(""),t.querySelectorAll(".hour-day, .hour-hours").forEach(o=>{o.addEventListener("input",n=>{eo(n),re(),debouncedCaptureState()})}),t.querySelectorAll('[data-action^="move-hour"], [data-action="remove-hour"]').forEach(o=>{o.addEventListener("click",n=>{const r=n.currentTarget.dataset.action,a=parseInt(n.currentTarget.dataset.hourId);switch(r){case"move-hour-up":Xt(a);break;case"move-hour-down":Qt(a);break;case"remove-hour":Gt(a);break}})}),oe(t),C();const e=document.getElementById("specialHoursReminder");e&&(e.style.display=l.specialHours.length>0?"block":"none")}function to(){const t=Date.now();l.howToShopItems.push({id:t,text:""}),O()}function oo(t){l.howToShopItems=l.howToShopItems.filter(e=>e.id!==t),O()}function no(){l.howToShopExpanded=!l.howToShopExpanded,O()}function ro(){const t=document.getElementById("howToShopItemsContainer");if(!t)return;t.innerHTML=l.howToShopItems.map(o=>{const n=L(String(o.id));return`
            <div class="editable-item-row" data-item-id="${n}" draggable="true">
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
                            <input type="text" class="form-input shop-item-text" id="shop-item-${n}-text" name="shop-item-${n}-text" data-item-id="${n}" value="${L(o.text)}" placeholder="e.g., Visit us in-store for outlet-exclusive deals">
                            <button class="clear-input" data-clear="shop-item-${n}-text" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="item-controls">
                        <button type="button" class="item-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove-how-to-shop-item" data-item-id="${o.id}" title="Remove" aria-label="Remove shopping item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `}).join(""),t.querySelectorAll(".shop-item-text").forEach(o=>{o.addEventListener("input",n=>{const r=parseInt(n.target.dataset.itemId),a=l.howToShopItems.find(s=>s.id===r);a&&(a.text=n.target.value,re())})}),me(t,l.howToShopItems,O);const e=document.querySelector('[data-action="add-how-to-shop-item"]');e&&e.addEventListener("click",o=>{o.stopPropagation(),to()}),t.querySelectorAll('[data-action="remove-how-to-shop-item"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);oo(r)})}),oe(t)}function O(){const t=document.getElementById("howToShopWrapper");if(!t)return;if(l.howToShopExpanded)t.innerHTML=`
            <div class="collapsible-section-header expanded" data-action="toggle-how-to-shop">
                <span class="section-label">How to Shop</span>
                <button type="button" class="edit-section-btn btn-base btn-secondary-base">Collapse</button>
            </div>
            <div class="collapsible-section-content">
                <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
                    <button type="button" class="btn btn-base btn-primary-base" data-action="add-how-to-shop-item" style="padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Item</button>
                </div>
                <div id="howToShopItemsContainer"></div>
            </div>
        `,ro();else{const o=l.howToShopItems.filter(n=>n.text&&n.text.trim()).length;t.innerHTML=`
            <div class="collapsible-section-header" data-action="toggle-how-to-shop">
                <span class="section-label">How to Shop (${o} items)</span>
                <button type="button" class="edit-section-btn btn-base btn-secondary-base">Expand</button>
            </div>
        `}const e=t.querySelector('[data-action="toggle-how-to-shop"]');e&&e.addEventListener("click",no),C()}function ao(){const t=Date.now();l.importantNotesItems.push({id:t,text:""}),U()}function io(t){l.importantNotesItems=l.importantNotesItems.filter(e=>e.id!==t),U()}function so(){l.importantNotesExpanded=!l.importantNotesExpanded,U()}function lo(){const t=document.getElementById("importantNotesItemsContainer");if(!t)return;t.innerHTML=l.importantNotesItems.map(o=>{const n=L(String(o.id));return`
            <div class="editable-item-row" data-item-id="${n}" draggable="true">
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
                            <input type="text" class="form-input important-notes-item-text" id="important-notes-item-${n}-text" name="important-notes-item-${n}-text" data-item-id="${n}" value="${L(o.text)}" placeholder="e.g., Important safety information or key details">
                            <button class="clear-input" data-clear="important-notes-item-${n}-text" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="item-controls">
                        <button type="button" class="item-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove-important-notes-item" data-item-id="${o.id}" title="Remove" aria-label="Remove important note">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `}).join(""),t.querySelectorAll(".important-notes-item-text").forEach(o=>{o.addEventListener("input",n=>{const r=parseInt(n.target.dataset.itemId),a=l.importantNotesItems.find(s=>s.id===r);a&&(a.text=n.target.value,re())})}),me(t,l.importantNotesItems,U);const e=document.querySelector('[data-action="add-important-notes-item"]');e&&e.addEventListener("click",o=>{o.stopPropagation(),ao()}),t.querySelectorAll('[data-action="remove-important-notes-item"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);io(r)})}),oe(t)}function U(){const t=document.getElementById("importantNotesWrapper");if(!t)return;if(l.importantNotesExpanded)t.innerHTML=`
            <div class="collapsible-section-header expanded" data-action="toggle-important-notes">
                <span class="section-label">Important Notes</span>
                <button type="button" class="edit-section-btn btn-base btn-secondary-base">Collapse</button>
            </div>
            <div class="collapsible-section-content">
                <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
                    <button type="button" class="btn btn-base btn-primary-base" data-action="add-important-notes-item" style="padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Item</button>
                </div>
                <div id="importantNotesItemsContainer"></div>
            </div>
        `,lo();else{const o=l.importantNotesItems.filter(n=>n.text&&n.text.trim()).length;t.innerHTML=`
            <div class="collapsible-section-header" data-action="toggle-important-notes">
                <span class="section-label">Important Notes (${o} items)</span>
                <button type="button" class="edit-section-btn btn-base btn-secondary-base">Expand</button>
            </div>
        `}const e=t.querySelector('[data-action="toggle-important-notes"]');e&&e.addEventListener("click",so),C()}function We(){if(!y.userProfile||!y.userProfile.storeDirections)return;const t=y.userProfile.storeDirections.trim();if(!t)return;const e=t.toLowerCase();l.importantNotesItems.some(n=>{if(!n||!n.text)return!1;const r=n.text.toLowerCase();return r.includes(e)||r.includes("find us at")||r.includes("directions")})||l.importantNotesItems.push({id:Date.now()+14,text:`Find us at ${t}`})}function $o(){const t=pe();l.howToShopItems.forEach(e=>{e.text&&e.text.startsWith("Email ")&&(e.text=`Email ${t}`)}),O()}function ge(){if(l.howToShopItems.length===0){const t=q(),e=pe();l.howToShopItems=[{id:Date.now()+1,text:"Visit us in-store for outlet-exclusive deals"},{id:Date.now()+2,text:`Call ${t} for availability`},{id:Date.now()+3,text:"$20 flat-rate ground shipping in US"},{id:Date.now()+4,text:`Email ${e}`}]}l.importantNotesItems.length===0&&(l.importantNotesItems=[{id:Date.now()+10,text:"*Select models only"},{id:Date.now()+11,text:"See attached PDF for complete model details"},{id:Date.now()+12,text:"Limited availability - while supplies last"},{id:Date.now()+13,text:"Email response time up to 48 hours"}],We())}function Ne(t){let o=!1;for(const n of t){if(n.type!=="application/pdf"){E(`✗ ${n.name} is not a PDF file`),o=!0;continue}if(n.size>10485760){const a=(n.size/1048576).toFixed(2);E(`✗ ${n.name} is too large (${a}MB). Max size is 10MB.`),o=!0;continue}if(l.attachedPDFs.some(a=>a.name===n.name)){E(`⚠ ${n.name} is already attached`);continue}const r=new FileReader;r.onload=async a=>{const s={id:Date.now()+Math.random(),name:n.name,size:n.size,type:n.type,data:a.target.result};let c=0;for(;!T&&c<20;)await new Promise(i=>setTimeout(i,50)),c++;try{T?(await ce(s),console.log(`PDF ${n.name} saved to IndexedDB with ID:`,s.id)):(console.warn("IndexedDB not initialized, PDF will not persist after refresh"),E("⚠ PDF saved to memory but may not persist after refresh"))}catch(i){console.warn("Failed to save PDF to IndexedDB:",i),E("⚠ PDF saved to memory but may not persist after refresh")}l.attachedPDFs.push(s),G(),!o&&t.length===1&&E(`✓ ${n.name} attached successfully`)},r.onerror=()=>{E(`✗ Error reading ${n.name}`)},r.readAsDataURL(n)}!o&&t.length>1&&E(`✓ ${t.length} PDFs attached successfully`)}function G(){const t=document.getElementById("attachedPDFsList");if(t){if(l.attachedPDFs.length===0){t.innerHTML="";return}t.innerHTML=l.attachedPDFs.map(e=>{const o=(e.size/1024).toFixed(1),n=(e.size/(1024*1024)).toFixed(2),r=e.size>1024*1024?`${n} MB`:`${o} KB`,a=!!e.data,s=a?"pdf-name-clickable":"pdf-name-disabled",c=a?`Click to preview ${e.name}`:`${e.name} - Preview unavailable (data not loaded)`,i=a?"":'<span style="color: #ff9800; margin-left: 0.5rem;" title="Preview unavailable">⚠</span>';return`
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
                         title="${c}"
                         ${a?'data-action="preview-pdf" data-pdf-id="'+e.id+'" role="button" tabindex="0"':""}>
                        ${e.name}${i}
                    </div>
                    <div class="pdf-size">${r}</div>
                </div>
                <button class="pdf-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove-pdf" data-pdf-id="${e.id}" title="Remove PDF" aria-label="Remove PDF attachment">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `}).join(""),t.querySelectorAll('[data-action="preview-pdf"]').forEach(e=>{e.addEventListener("click",o=>{const n=parseFloat(o.currentTarget.dataset.pdfId);De(n)}),e.addEventListener("keypress",o=>{if(o.key==="Enter"){const n=parseFloat(o.currentTarget.dataset.pdfId);De(n)}})}),t.querySelectorAll('[data-action="remove-pdf"]').forEach(e=>{e.addEventListener("click",o=>{const n=parseFloat(o.currentTarget.dataset.pdfId);co(n)})})}}async function co(t){const e=l.attachedPDFs.find(o=>o.id===t);if(e){try{await Fe(t)}catch(o){console.warn("Failed to delete PDF from IndexedDB:",o)}l.attachedPDFs=l.attachedPDFs.filter(o=>o.id!==t),G(),E(`✓ ${e.name} removed`)}}function De(t){const e=l.attachedPDFs.find(s=>s.id===t);if(!e||!e.data){E("✗ PDF data not available for preview");return}J=e;const o=document.getElementById("pdfPreviewModal"),n=document.getElementById("pdfPreviewIframe"),r=document.getElementById("pdfPreviewTitle"),a=document.getElementById("pdfDownloadBtn");if(!o||!n||!r||!a){console.error("PDF preview modal elements not found");return}try{const s=atob(e.data.split(",")[1]),c=new Array(s.length);for(let m=0;m<s.length;m++)c[m]=s.charCodeAt(m);const i=new Uint8Array(c),p=new Blob([i],{type:"application/pdf"});z&&URL.revokeObjectURL(z),z=URL.createObjectURL(p),n.src=z;const g=document.getElementById("pdfLoadingIndicator");g&&setTimeout(()=>{g.style.display="none"},500)}catch(s){console.error("Error creating blob URL for PDF:",s),E("✗ Could not display PDF preview");return}r.textContent=e.name,o.style.display="flex",setTimeout(()=>{o.classList.add("active")},10),o.focus()}function ie(){const t=document.getElementById("pdfPreviewModal");t&&(t.classList.remove("active"),setTimeout(()=>{t.style.display="none"},300));const e=document.getElementById("pdfPreviewIframe");e&&(e.src="about:blank"),z&&(URL.revokeObjectURL(z),z=null),J=null}function Ae(){if(!J)return;const t=document.createElement("a");t.href=J.data,t.download=J.name,t.click()}function ae(){const t=document.getElementById("subjectLinesContainer");if(!t)return;if(l.generatedSubjectLines.length===0){t.innerHTML='<div class="subject-lines-empty">Generate your email template first to create subject line suggestions</div>';return}const e=document.getElementById("selectedSubjectInput"),o=e?e.value:null,n=o!==null?o:l.selectedSubjectLine||"",r=l.generatedSubjectLines.map((c,i)=>{const p=c===l.selectedSubjectLine;return`<option value="${i}" ${p?"selected":""}>${j(c)}</option>`}).join("");t.innerHTML=`
        <div class="subject-line-dropdown-wrapper">
            <label class="subject-dropdown-label" for="subjectLineDropdown">Choose a subject line suggestion:</label>
            <select id="subjectLineDropdown" class="subject-line-dropdown">
                <option value="" disabled ${l.selectedSubjectLine?"":"selected"}>Select a subject line...</option>
                ${r}
            </select>
        </div>
        <div id="selectedSubjectCard" class="selected-subject-card" style="display: ${n?"block":"none"};">
            <label class="subject-card-label" for="selectedSubjectInput">Selected Subject Line (customizable):</label>
            <div class="subject-card-input-wrapper">
                <input
                    type="text"
                    id="selectedSubjectInput"
                    class="subject-card-input"
                    value="${L(n)}"
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
    `;const a=document.getElementById("subjectLineDropdown");a&&a.addEventListener("change",c=>{const i=parseInt(c.target.value);i>=0&&i<l.generatedSubjectLines.length&&mo(i)});const s=document.getElementById("selectedSubjectInput");s&&s.addEventListener("input",c=>{l.selectedSubjectLine=c.target.value;const i=document.getElementById("subjectCharCount");if(i){const g=c.target.value.length,m=g<=50;i.className=`char-count ${m?"optimal":"warning"}`,i.textContent=`${g} chars ${m?"✓":"(>50)"}`}const p=document.getElementById("subjectLineDropdown");p&&(p.value="")})}function uo(){const t=document.getElementById("promoDateRange")?.value||"",e=["Citizen","Bulova","Alpina","Frederique Constant"],o=[...new Set(l.promotionEntries.map(f=>f.line||"").flatMap(f=>e.filter(h=>f.toLowerCase().includes(h.toLowerCase()))).filter(Boolean))],n=/(\d+)[\s%]*%/,r=Math.max(0,...l.promotionEntries.map(f=>{const h=(f.line||"").match(n);return h&&parseInt(h[1],10)||0})),a=[],s={};l.promotionEntries.forEach(f=>{if(f.collections){const h=e.find($=>(f.line||"").toLowerCase().includes($.toLowerCase()));f.collections.split(",").forEach($=>{const x=$.trim();x&&!a.includes(x)&&(a.push(x),h&&(s[h]||(s[h]=[]),s[h].push(x)))})}});const c=a.slice(0,3),i=l.promotionEntries.filter(f=>f.callout&&f.callout.trim()).map(f=>f.callout.toLowerCase()),p=i.some(f=>f.includes("limited")||f.includes("while supplies")),g=i.some(f=>f.includes("final")),m=f=>f>=50?`Up to ${f}% OFF`:f>=30?`Up to ${f}% OFF`:f>0?`Up to ${f}% OFF`:"Special Savings";let u=[];if(t){u.push(`Sale: ${t}`);const f=t.toLowerCase();(f.includes("fri")||f.includes("sat")||f.includes("sun"))&&u.push(`This Weekend: ${m(r)}`)}if(o.length>0&&r>0?o.length===1?u.push(`${o[0]}: ${m(r)}`):u.push(`${o[0]} & ${o[1]}: ${m(r)}`):o.length>0&&u.push(`${o[0]} Sale Event`),r>0&&u.push(`Up to ${r}% OFF This Week`),o.length>0&&c.length>0){const f=c.slice(0,3).join(", ");u.push(`${o[0]} including ${f}`)}if(o.length>=2&&s[o[0]]?.length>0&&s[o[1]]?.length>0){const f=s[o[0]][0],h=s[o[1]][0];u.push(`${o[0]} & ${o[1]} including ${f}, ${h}`)}p&&u.push("Limited Stock – Shop Now"),g&&u.push("Final Sale: Extra Savings Inside"),r>=30&&u.push(`Perfect Watch Gifts – Up to ${r}% OFF`),r>0&&u.push("Don't Miss These Watch Deals"),o.length>0&&u.push(`VIP Watch Sale: ${o[0]} & More`),u.push("Your New Watch Awaits"),r>=20&&u.push("Ready for a New Watch?"),u.length<3&&(r>0?u.push(`Up to ${r}% OFF – This Week Only`):u.push("New Deals This Week"));const b=[...new Set(u)],v=b.filter(f=>f.length<=60).sort((f,h)=>{const $=f.length>=20&&f.length<=45?0:1,x=h.length>=20&&h.length<=45?0:1;return $-x});l.generatedSubjectLines=v.length>0?v:b,l.selectedSubjectLine=l.generatedSubjectLines[0]||null,ae()}function mo(t){if(t>=0&&t<l.generatedSubjectLines.length){l.selectedSubjectLine=l.generatedSubjectLines[t];const e=document.getElementById("selectedSubjectCard");e&&(e.style.display="block");const o=document.getElementById("subjectLineDropdown");o&&(o.value=t);const n=document.getElementById("selectedSubjectInput");n&&(n.value=l.selectedSubjectLine);const r=document.getElementById("subjectCharCount");if(r){const a=l.selectedSubjectLine.length,s=a<=50;r.className=`char-count ${s?"optimal":"warning"}`,r.textContent=`${a} chars ${s?"✓":"(>50)"}`}}}function po(t){const e=t.promoDateRange||"",o=t.promoTitle&&t.promoTitle.trim()?j(t.promoTitle):Yt(e),n=t.promoYear&&t.promoYear.trim()?t.promoYear.trim():new Date().getFullYear(),r=q();let a="";l.promotionEntries.forEach(u=>{if(!u.line&&(u.brand||u.discount)){const v=u.brand||"",f=u.discount?`${u.discount.toString().trim()}% OFF`:"",h=[v,f].filter($=>$&&$.trim());u.line=h.join(" – ")}if(!u.line||!u.line.trim())return;let b="";u.collections&&u.collections.trim()&&(b=u.collections.split(",").map(f=>j(f.trim())).filter(f=>f).map(f=>`*${f}`).join(" • ")),a+=`
                <p style="font-size: 18px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-bottom: 8px;"><b>${j(u.line)}</b></p>`,b&&(a+=`
                <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-left: 20px; margin-top: 0; margin-bottom: ${u.callout?"5px":"20px"};">
                    ${b}
                </p>`),u.callout&&u.callout.trim()&&(a+=`
                <p style="font-size: 13px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-left: 20px; margin-top: 0; margin-bottom: 20px; color: #0066cc; font-style: italic;">
                    ${j(u.callout)}
                </p>`)});let s="7400 Las Vegas Blvd. South, Suite 231<br>Las Vegas, NV 89123",c="https://www.google.com/maps?q=36.05145495363422,-115.16933573536541",i=pe(),p="Mon–Sat: 10AM–8PM | Sun: 10AM–7PM";if(y.userProfile){if(y.userProfile.storeAddress&&(s=y.userProfile.storeAddress.replace(/\n/g,"<br>")),y.userProfile.storeHours&&(p=y.userProfile.storeHours),y.userProfile.storePlusCode&&y.userProfile.storePlusCode.trim())c=`https://www.google.com/maps?q=${encodeURIComponent(y.userProfile.storePlusCode)}`;else if(y.userProfile.storeAddress&&y.userProfile.storeAddress.trim()){const u=y.userProfile.storeAddress.replace(/<br>/g," ").replace(/\n/g," ");c=`https://www.google.com/maps?q=${encodeURIComponent(u)}`}}let g=l.howToShopItems.filter(u=>u.text&&u.text.trim()).map(u=>`• ${j(u.text)}`).join(`<br>
                    `),m=l.importantNotesItems.filter(u=>u.text&&u.text.trim()).map(u=>`• ${j(u.text)}`).join(`<br>
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
</html>`}function fo(){if(Q)return;Q=!0;const t=localStorage.getItem("savedPromotionTemplate");let e=null;if(t)try{e=JSON.parse(t)}catch(w){console.error("Error parsing saved template:",w),e=null}l.promotionEntries=[],l.specialHours=[],l.howToShopItems=[],l.importantNotesItems=[],l.attachedPDFs=[],l.generatedSubjectLines=[],l.selectedSubjectLine=null;const o=document.getElementById("formSectionTitle"),n=document.getElementById("formFields")||document.getElementById("promotionFormContainer"),r=!!document.getElementById("promotionFormContainer");if(!n){console.error("Form container not found"),Q=!1;return}if(o&&!r){const w=o,I=document.createElement("div");I.className="section-header-with-controls",I.innerHTML=`
          <h2 class="section-title" style="margin-bottom: 0;">Promotion Email (HTML) Fields</h2>
          <div class="section-header-controls">
              <button type="button" class="undo-redo-btn btn-base btn-icon-base" id="undoBtn" title="Undo (Ctrl+Z)" aria-label="Undo" disabled>
                  <span>↶ Undo</span>
              </button>
              <button type="button" class="undo-redo-btn btn-base btn-icon-base" id="redoBtn" title="Redo (Ctrl+Y)" aria-label="Redo" disabled>
                  <span>↷ Redo</span>
              </button>
          </div>
      `,w.replaceWith(I)}n.innerHTML=`
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
                <button type="button" class="btn btn-base btn-primary-base" id="addEntryBtn" style="flex: 0 0 auto; padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Entry</button>
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
                <button type="button" class="btn btn-base btn-primary-base" id="addHourBtn" style="flex: 0 0 auto; padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Special Hours</button>
            </div>
            <div class="field-help" style="margin-bottom: 0.75rem;">For holidays or special sale hours (e.g., Black Friday extended hours)</div>
            <div id="specialHoursContainer"></div>
            <div id="specialHoursReminder" style="display: none; background: #fff3cd; border-left: 3px solid #ffc107; padding: 1rem; margin-top: 1rem;">
                <strong>⚠️ Reminder:</strong> Don't forget to update your special hours on Yelp and Google Maps!
            </div>
        </div>
    `;const a=document.getElementById("promoDateRange"),s=document.getElementById("promoYear"),c=document.getElementById("promoTitle");if(a){a.addEventListener("input",()=>{const I=document.querySelector('[data-clear="promoDateRange"]');I&&I.classList.toggle("visible",a.value.trim().length>0),C()});const w=document.querySelector('[data-clear="promoDateRange"]');w&&w.addEventListener("click",()=>{a.value="",w.classList.remove("visible"),a.focus(),C()})}if(s){s.addEventListener("input",()=>{const I=document.querySelector('[data-clear="promoYear"]');I&&I.classList.toggle("visible",s.value.trim().length>0),C()});const w=document.querySelector('[data-clear="promoYear"]');w&&w.addEventListener("click",()=>{s.value="",w.classList.remove("visible"),s.focus(),C()})}if(c){c.addEventListener("input",()=>{const I=document.querySelector('[data-clear="promoTitle"]');I&&I.classList.toggle("visible",c.value.trim().length>0),C()});const w=document.querySelector('[data-clear="promoTitle"]');w&&w.addEventListener("click",()=>{c.value="",w.classList.remove("visible"),c.focus(),C()})}const i=document.getElementById("addEntryBtn");i&&i.addEventListener("click",Pe);const p=document.getElementById("addHourBtn");p&&p.addEventListener("click",Zt);const g=document.getElementById("startOverBtn");g&&g.addEventListener("click",je);const m=document.getElementById("pdfModalClose"),u=document.querySelector(".pdf-modal-backdrop"),b=document.getElementById("pdfDownloadBtn"),v=document.getElementById("pdfDownloadFallback");m&&m.addEventListener("click",ie),u&&u.addEventListener("click",ie),b&&b.addEventListener("click",Ae),v&&v.addEventListener("click",Ae),document.addEventListener("keydown",w=>{if(w.key==="Escape"){const I=document.getElementById("pdfPreviewModal");I&&I.style.display!=="none"&&ie()}});const f=document.getElementById("saveTemplateBtnDuplicate"),h=document.getElementById("importTemplateBtnDuplicate"),$=document.getElementById("exportTemplateBtnDuplicate"),x=document.getElementById("startOverBtnDuplicate");f&&f.addEventListener("click",zt),h&&h.addEventListener("click",_t),$&&$.addEventListener("click",Ut),x&&x.addEventListener("click",je),e?Ye(e,!0):(ge(),Pe()),Q=!1}function go(){const t=document.getElementById("pdfSectionContainer");if(!t)return;t.innerHTML=`
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
  `;const e=document.getElementById("pdfDropzone"),o=document.getElementById("pdfFileInput");e&&o&&(e.addEventListener("click",()=>o.click()),o.addEventListener("change",n=>{const r=Array.from(n.target.files);r.length>0&&Ne(r),o.value=""}),e.addEventListener("dragover",n=>{n.preventDefault(),e.classList.add("dragover")}),e.addEventListener("dragleave",n=>{n.preventDefault(),e.classList.remove("dragover")}),e.addEventListener("drop",n=>{n.preventDefault(),e.classList.remove("dragover");const r=Array.from(n.dataTransfer.files).filter(a=>a.type==="application/pdf");r.length>0?Ne(r):E("Please drop only PDF files")})),G()}async function je(){if(!confirm("This will reset everything to defaults and cannot be undone. Continue?"))return;const t=document.getElementById("promoDateRange"),e=document.getElementById("promoYear"),o=document.getElementById("promoTitle");t&&(t.value=""),e&&(e.value=""),o&&(o.value=""),l.promotionEntries=[{id:Date.now(),line:"",collections:"",callout:""}],l.specialHours=[],l.howToShopItems=[],l.importantNotesItems=[],ge();for(const c of l.attachedPDFs)try{await Fe(c.id)}catch(i){console.warn("Failed to delete PDF from IndexedDB:",i)}l.attachedPDFs=[],l.generatedSubjectLines=[],l.selectedSubjectLine=null;const n=document.getElementById("bulkEmailList");if(n){n.value="",n.dispatchEvent(new Event("input",{bubbles:!0}));try{await ot()}catch(c){console.warn("Failed to clear bulk recipients from IndexedDB:",c)}}localStorage.removeItem("savedPromotionTemplate"),M(),_(),O(),U(),G(),ae();const r=document.getElementById("codeArea"),a=document.getElementById("previewIframe");r&&(r.value=""),a&&fe(a);const s=document.querySelector(".output-actions");s&&s.classList.remove("enabled"),E("Reset to defaults completed")}function xo(){wt("promotion-email"),fo(),go(),Ht(),M(),_(),O(),U(),ae();const t=document.getElementById("previewIframe");t&&fe(t),console.log("Promotion UI module initialized")}function Io(){const t=localStorage.getItem("theme")||"light",e=localStorage.getItem("lightPalette")||"pastel",o=localStorage.getItem("darkPalette")||"midnight-blue";document.documentElement.setAttribute("data-theme",t),document.documentElement.setAttribute("data-light-palette",e),document.documentElement.setAttribute("data-dark-palette",o),Je(t)}function Ve(){const e=`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><path fill="${getComputedStyle(document.documentElement).getPropertyValue("--text-secondary").trim()}" d="M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z"/></svg>`,n=`url('data:image/svg+xml;charset=UTF-8,${encodeURIComponent(e)}')`;document.querySelectorAll("select.form-input, select.template-select").forEach(a=>{a.style.backgroundImage=n})}function ho(){const e=(document.documentElement.getAttribute("data-theme")||"light")==="light"?"dark":"light";document.documentElement.setAttribute("data-theme",e),localStorage.setItem("theme",e),Je(e),setTimeout(Ve,50),P==="promotion-email"?C():P&&Z()}function Je(t){const e=document.querySelector(".theme-toggle-slider");e&&(e.style.transform=t==="dark"?"translateX(20px)":"translateX(0)")}export{yo as a,So as b,y as c,xo as d,ht as e,ot as f,Rt as g,gt as h,Io as i,bo as j,vo as k,Eo as l,wo as m,tt as n,l as p,E as s,ho as t,$o as u};

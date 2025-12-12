(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const s of a.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&n(s)}).observe(document,{childList:!0,subtree:!0});function o(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(r){if(r.ep)return;r.ep=!0;const a=o(r);fetch(r.href,a)}})();let x=null;const rt="CitizenTemplates",at=2,z="promotionPDFs",R="bulkEmailRecipients";function Oo(){return new Promise(e=>{const t=window.indexedDB||window.webkitIndexedDB||window.mozIndexedDB;if(!t){console.warn("IndexedDB not supported, PDFs will not persist across refresh"),e(!1);return}const o=t.open(rt,at);o.onerror=()=>{console.warn("IndexedDB initialization failed:",o.error),e(!1)},o.onsuccess=()=>{x=o.result,console.log("IndexedDB initialized successfully"),e(!0)},o.onupgradeneeded=n=>{const r=n.target.result;r.objectStoreNames.contains(z)||r.createObjectStore(z,{keyPath:"id"}),r.objectStoreNames.contains(R)||r.createObjectStore(R,{keyPath:"id"})}})}function ue(e){return new Promise((t,o)=>{if(!x){o(new Error("IndexedDB not initialized"));return}const a=x.transaction([z],"readwrite").objectStore(z).put(e);a.onerror=()=>o(a.error),a.onsuccess=()=>t(e.id)})}function it(e){return new Promise((t,o)=>{if(!x){t(null);return}const a=x.transaction([z],"readonly").objectStore(z).get(e);a.onerror=()=>o(a.error),a.onsuccess=()=>t(a.result||null)})}function He(e){return new Promise((t,o)=>{if(!x){t();return}const a=x.transaction([z],"readwrite").objectStore(z).delete(e);a.onerror=()=>o(a.error),a.onsuccess=()=>t()})}function st(e){return new Promise((t,o)=>{if(!x){o(new Error("IndexedDB not initialized"));return}const a=x.transaction([R],"readwrite").objectStore(R).put({id:"bulk-email-recipients",data:e,savedAt:new Date().toISOString()});a.onerror=()=>o(a.error),a.onsuccess=()=>t()})}function _o(){return new Promise((e,t)=>{if(!x){e("");return}const r=x.transaction([R],"readonly").objectStore(R).get("bulk-email-recipients");r.onerror=()=>t(r.error),r.onsuccess=()=>{const a=r.result;e(a&&a.data?a.data:"")}})}function lt(){return new Promise((e,t)=>{if(!x){e();return}const r=x.transaction([R],"readwrite").objectStore(R).clear();r.onerror=()=>t(r.error),r.onsuccess=()=>e()})}const y={currentCategory:"all",currentTemplate:null,searchActive:!1,userProfile:null},V={companyName:"Citizen Watch America",storeName:"Citizen Company Store",defaultLocation:"the South Premium Outlets",defaultPhone:"702-357-8990"},ve=[{name:"Alpina",url:"https://us.alpinawatches.com/"},{name:"Bulova",url:"https://www.bulova.com/"},{name:"Citizen",url:"https://www.citizenwatch.com/"},{name:"Frederique Constant",url:"https://us.frederiqueconstant.com/"}],ct=["manager","director","supervisor","assistant manager"],$={fontFamily:"'Century Gothic', Aptos, Arial, sans-serif",colors:{primary:"#000000",secondary:"#2f2f2f",link:"#0000ee",environmental:"#0c8822"},fontSize:{name:"9pt",details:"8pt"}},we="Please consider the environment before printing this e-mail";function dt(){const e=y.userProfile||{};return{name:e.employeeName||"Employee Name",title:e.jobTitle||"Sales Associate",location:e.storeLocation||V.defaultLocation,address:e.storeAddress||"",phone:e.storePhone||V.defaultPhone,jobTitle:(e.jobTitle||"").toLowerCase(),companyEmail:e.companyEmail||"",storeEmail:e.storeEmail||""}}function ut(e,t,o){return ct.some(r=>e.includes(r))&&t?t:o||""}function $e(e,t){return t==="html"?`<p style="margin: 0; padding: 0;">
        <strong style="font-size: ${$.fontSize.name};">${D(e.name)}</strong> │ ${D(e.title)}
    </p>`:`${e.name} │ ${e.title}`}function Ee(e){const t="______________________________________________________________________";return e==="html"?`<p style="margin: 0; padding: 0; font-size: ${$.fontSize.details}; color: ${$.colors.secondary};">
        <strong>${t}</strong>
    </p>`:t}function Se(e,t){return t==="html"?`<p style="margin: 0; padding: 0; font-size: ${$.fontSize.details}; color: ${$.colors.secondary};">
        <strong>${V.companyName}</strong>
    </p>
    <p style="margin: 0; padding: 0; font-size: ${$.fontSize.details}; color: ${$.colors.secondary};">
        <strong>${V.storeName} - ${D(e.location)}</strong>
    </p>`:`${V.companyName}
${V.storeName} - ${e.location}`}function mt(e,t){if(!e.address||!e.address.trim())return"";const o=D(e.address);return t==="html"?`<p style="margin: 0; padding: 0; font-size: ${$.fontSize.details}; color: ${$.colors.secondary};">
        ${o.replace(/\n/g,"<br>")}
    </p>`:e.address}function Ie(e,t){return t==="html"?`<p style="margin: 0; padding: 0; font-size: ${$.fontSize.details}; color: ${$.colors.secondary};">
        Tel/SMS: ${D(e.phone)}
    </p>`:`Tel/SMS: ${e.phone}`}function pt(e,t){if(!e)return"";if(t==="html"){const o=e.split("@"),n=o[0]||"",r=o[1]||"";return`<p style="margin: 10px 0 0 0; padding: 0; font-size: ${$.fontSize.details}; color: ${$.colors.secondary};">
        Email: ${D(n)}<a href="mailto:${D(e)}" style="color: ${$.colors.link}; text-decoration: underline; font-size: ${$.fontSize.details};">@${D(r)}</a>
    </p>`}return`Email: ${e}`}function xe(e){if(e==="html"){const t=ve.map(o=>`<a href="${o.url}" style="color: ${$.colors.link}; text-decoration: underline; font-size: ${$.fontSize.details};">${o.name}</a>`).join(` <span style="color: ${$.colors.secondary};">|</span> `);return`<p style="margin: 4px 0; padding: 0; font-size: ${$.fontSize.details};">
        ${t}
    </p>`}return ve.map(t=>t.name).join(" | ")}function Le(e){return e==="html"?`<p style="margin: 4px 0; padding: 0; font-size: ${$.fontSize.details}; color: ${$.colors.environmental};">
        <strong>${we}</strong>
    </p>`:we}function ft(e="text"){const t=dt(),o=ut(t.jobTitle,t.companyEmail,t.storeEmail);if(e==="html")return`<div style="font-family: ${$.fontFamily}; font-size: ${$.fontSize.name}; color: ${$.colors.primary};">
    ${$e(t,e)}
    ${Ee(e)}
    ${Se(t,e)}
    ${mt(t,e)}
    ${Ie(t,e)}
    ${pt(o,e)}
    ${xe(e)}

    ${Le(e)}
</div>`;const n=t.address?`${t.address}
`:"",r=o?`
Email: ${o}
`:`
`;return`${$e(t,e)}
${Ee(e)}
${Se(t,e)}
${n}${Ie(t,e)}
${r}${xe(e)}

${Le(e)}`}const B=ft;function D(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}function S(e){return e.replace(/'/g,"&#39;").replace(/"/g,"&quot;")}function k(e){const t={};for(const[o,n]of Object.entries(e))typeof n=="string"?t[o]=D(n):t[o]=n;return t}function _(){return y.userProfile&&y.userProfile.storePhone?y.userProfile.storePhone:"702-357-8990"}function ce(){return y.userProfile&&y.userProfile.storeName?y.userProfile.storeName:"Citizen Company Store"}function ze(){return y.userProfile&&y.userProfile.storeLocation?y.userProfile.storeLocation:"the South Premium Outlets"}function gt(){return`Citizen Company Store at ${ze()}`}function ht(e){if(!e)return"";const t=i=>{const p=document.createElement("div");return p.textContent=i,p.innerHTML};let o=e;const n=[/\n\n-{5,}\n/,/______+/,/\n\n[A-Z][a-z]+ [A-Z][a-z]+ │ /];for(const i of n){const p=o.match(i);if(p){o=o.substring(0,p.index).trim();break}}const a=o.split(/\n\n+/).map(i=>{const p=i.split(`
`);return p.some(m=>m.trim())&&p.every(m=>{const u=m.trim();return!u||u.startsWith("•")||u.startsWith("-")})?`    <ul style="margin: 10px 0; padding-left: 20px; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt;">
${p.filter(u=>u.trim()).map(u=>{const v=u.replace(/^[•-]\s*/,"").trim();return`        <li style="margin: 5px 0;">${t(v)}</li>`}).join(`
`)}
    </ul>`:`    <p style="margin: 10px 0; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);">${i.split(`
`).map(u=>t(u)).join("<br>")}</p>`}),s=B("html");return`${a.join(`
`)}

    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
${s}
    </div>`}const yt={"new-customer-welcome":"Use after a customer visits the store for the first time. Adds them to VIP list. (Enhanced: editable subject, EML download)","back-in-stock":"Follow up when a previously unavailable item is back. Include hold deadline.","thank-you-warranty":"Send after purchase to explain warranty registration and care tips.","weekly-sale":"Personalized sale notification for customers who showed interest in specific collections. (Enhanced: editable subject, EML download)","new-model-arrival":"Alert interested customers when a specific model they asked about arrives. (Enhanced: editable subject, EML download)","limited-edition":"High-priority notification for VIP collectors about exclusive pieces. (Enhanced: editable subject, EML download)","vip-reconnection":"Re-engage customers who haven't visited in a while. Mention store evolution. (Enhanced: editable subject, EML download)","phone-confirmation":"Immediate confirmation after taking a phone order. Include all order details. (Enhanced: editable subject, EML download)","phone-shipped":"Send when order ships with UPS tracking. Mention signature requirement. (Enhanced: editable subject, EML download)","phone-under-500":"Internal approval request for phone orders under $500. Manager verification. (Enhanced: editable subject, EML download)","phone-corporate":"Corporate/bulk order approval. Include purpose and fulfilling store. (Enhanced: editable subject, EML download)","inter-store-notification":"Notify receiving store that order is prepared and ready for pickup. (Enhanced: editable subject, EML download)","text-availability":"Quick response to customer inquiry about specific model availability.","text-thank-you":"Post-purchase thank you via text. Keep it brief and friendly.","text-interest-followup":"Follow up on specific watch customer showed interest in. Use after store visit."},ne={customerName:{example:"John Smith",required:!0},employeeName:{example:"Your name",required:!0},yourName:{example:"Your name",required:!0},brand:{example:"Citizen",required:!0,suggestions:["Citizen","Bulova","Frederique Constant"]},modelName:{example:"Eco-Drive Promaster",required:!0},modelNumber:{example:"BN0150-28E",required:!1},price:{example:"299",required:!0,validation:"currency"},discount:{example:"20",required:!0,validation:"number",dependent:!0},msrp:{example:"399",required:!0,validation:"currency",dependent:!0},quantity:{example:"2",required:!0,validation:"number"},unitsQuantity:{example:"1",required:!0,validation:"number"},totalAmount:{example:"299.00",required:!0,validation:"currency"},closingTime:{example:"9:00 PM",required:!0},endDate:{example:"Sunday",required:!0},holdDeadline:{example:"Friday 5PM",required:!0},trackingNumber:{example:"1Z999AA10123456784",required:!1,validation:"tracking"},customerId:{example:"C12345",required:!0},employeeId:{example:"E789",required:!0},warrantyLength:{example:"5-year",required:!0},warrantyYears:{example:"5",required:!0,validation:"number"},carrier:{example:"UPS",required:!0,suggestions:["UPS","FedEx","USPS"]},promoDateRange:{example:"Nov 28 - Dec 1",required:!0},promoYear:{example:"2024-2025",required:!1},promoTitle:{example:"Leave blank for auto-generation",required:!1},promoBrand:{example:"Citizen",required:!0,suggestions:["Citizen","Bulova","Alpina","Frederique Constant"]},promoDiscount:{example:"60",required:!0,validation:"number"},promoCollections:{example:"Corso, Avion, Marine Star",required:!1},promoCallout:{example:"Optional special note",required:!1},keyFeature1:{example:"Eco-Drive technology",required:!1},keyFeature2:{example:"Solar powered",required:!1},keyFeature3:{example:"Water resistant to 200m",required:!1},limitedDetails:{example:"Limited to 100 pieces worldwide",required:!0},quantityAvailable:{example:"5",required:!0,validation:"number"},customerAddress:{example:"123 Main St, City, State 12345",required:!0},managerNameOrStoreName:{example:"Store Manager or Store Name",required:!0},creditCardVerified:{example:"Yes",required:!0,suggestions:["Yes","No"]},needsManagerVerification:{example:"Yes",required:!0,suggestions:["Yes","No"]},fulfillingStore:{example:"Las Vegas Premium Outlets",required:!0},recipientStoreName:{example:"Los Angeles Premium Outlets",required:!0},collectionName:{example:"Eco-Drive Collection",required:!0},model1:{example:"Eco-Drive Promaster",required:!0},price1:{example:"299",required:!0,validation:"currency"},original1:{example:"399",required:!0,validation:"currency"},model2:{example:"Eco-Drive Satellite Wave",required:!1},price2:{example:"349",required:!1,validation:"currency"},original2:{example:"449",required:!1,validation:"currency"}};function bt(e){return(ne[e]||{}).suggestions||[]}function W(e,t){const o=[];if(t.forEach(n=>{const r=ne[n];if(r&&r.required){const a=e[n];(a==null||a.toString().trim()==="")&&o.push(n)}}),o.length>0)throw new Error(`Required fields are missing or empty: ${o.join(", ")}`)}function Te(e){return`Hi ${e},

`}function Ce(){return`

Best regards,
${B()}`}function vt(e,t){return(e*(1-t/100)).toFixed(2)}const T={"new-customer-welcome":{name:"New Customer Welcome",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","employeeName"],generate:e=>{W(e,["customerName","employeeName"]);const t=k(e);return`Subject: Welcome to Citizen Company Store - Your VIP Access

${Te(t.customerName)}Thank you for visiting our Citizen Company Store outlet location! It was a pleasure helping you explore our offerings today.

I've added you to our VIP email list for weekly promotional updates featuring exclusive outlet pricing on our timepieces.

Please don't hesitate to reach out by replying to this email or call the store at ${_()}. I would be happy to check availability on any models you're considering.${Ce()}`}},"new-model-arrival":{name:"New Model Arrival",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","keyFeature1","keyFeature2","keyFeature3","price","employeeName"],generate:e=>{W(e,["customerName","brand","modelName","modelNumber","keyFeature1","price","employeeName"]);const t=k(e),o=[t.keyFeature1,t.keyFeature2,t.keyFeature3].filter(n=>n&&n.trim()).map(n=>`• ${n}`).join(`
`);return`Subject: Great News! ${t.modelName} Now Available

${Te(t.customerName)}Great news! The ${t.brand} ${t.modelName} (${t.modelNumber}) you were interested in has arrived at our store.

Key Features:
${o}

Current price: ${t.price}

I'd be happy to set up an appointment to show you all the features of this watch and let you try it on. This model tends to generate a lot of interest, so I wanted to reach out to you first.

Would you like to schedule a time to see it in person? Please reply to this email or call the store at ${_()}.

Looking forward to hearing from you!${Ce()}`}},"limited-edition":{name:"Limited Edition",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","limitedDetails","price","quantityAvailable","employeeName"],generate:e=>{W(e,["customerName","brand","modelName","modelNumber","limitedDetails","price","quantityAvailable","employeeName"]);const t=k(e);return`Subject: Exclusive: Limited Edition ${t.modelName} Available

Hi ${t.customerName},

I wanted to reach out to you personally because we just received a ${t.brand} ${t.modelName} (${t.modelNumber}) - ${t.limitedDetails}.

As someone who appreciates fine timepieces and unique additions to your collection, I thought you'd want to know about this immediately.

Price: ${t.price}
Availability: Only ${t.quantityAvailable} available

This is truly a special piece that won't last long. I'd love to show it to you in person and discuss how it could complement your collection.

Can you stop by this week, or would you like me to hold one for you? Please reply to this email or call the store at ${_()}.

Best regards,
${B()}

P.S. - Given the limited availability, I'm only reaching out to our most valued collectors. Let me know if you're interested!`}},"vip-reconnection":{name:"VIP Reconnection",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","employeeName"],generate:e=>`Subject: Your Store Has Evolved - We'd Love to Show You What's New

 Hi ${k(e).customerName},

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
${B()}

P.S. - We now carry everything from current season pieces to discontinued treasures, giving you more options than ever before.`},"phone-confirmation":{name:"Confirmation",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","price","discount","totalAmount","customerAddress","carrier","trackingNumber","employeeName"],generate:e=>{W(e,["customerName","brand","modelName","modelNumber","price","discount","totalAmount","customerAddress","carrier","employeeName"]);const t=k(e);let o="";return t.trackingNumber&&(o=`

Tracking Number: ${t.trackingNumber}`),`Subject: Order Confirmation - ${t.modelName}

Hi ${t.customerName},

Thank you for your phone order! This email confirms the following:

Order Details:
Item: ${t.brand} ${t.modelName}
Model #: ${t.modelNumber}
Price: ${t.price} (includes ${t.discount}% outlet discount)
Shipping: $20 flat-rate ground shipping
Total: ${t.totalAmount}

Shipping Information:
${t.customerAddress}

Your order will ship within 1-2 business days via ${t.carrier}. You'll receive tracking information at this email address once shipped.${o}

If you have any questions, please don't hesitate to contact us at ${_()}.

Thank you for shopping with ${ce()}!

Best regards,
${B()}`}},"phone-shipped":{name:"Shipped with Tracking",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","trackingNumber","customerAddress","carrier","employeeName"],generate:e=>{W(e,["customerName","brand","modelName","modelNumber","trackingNumber","customerAddress","carrier","employeeName"]);const t=k(e);return`Subject: Your Watch Order - Tracking Information

Hi ${t.customerName},

Thank you for your recent purchase from ${ce()}! We're pleased to confirm that your order has been shipped and is on its way to you.

Tracking Information:
UPS Tracking Number: ${t.trackingNumber}

You can track your shipment at the link above or visit ups.com and enter your tracking number.

Your package requires an adult signature upon delivery to ensure safe receipt of your timepiece.

Order Details:
Watch Model: ${t.modelNumber} - ${t.modelName}
Shipping Address: ${t.customerAddress}

If you have any questions about your order or need any assistance, please don't hesitate to reach out. I'm here to help!

We hope you enjoy your new ${t.brand} timepiece!

Best regards,
${B()}`}},"phone-under-500":{name:"Under $500 Request",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["managerNameOrStoreName","customerName","customerId","employeeName","employeeId","unitsQuantity","totalAmount","creditCardVerified","needsManagerVerification"],generate:e=>{const t=k(e);if(!t.creditCardVerified||t.creditCardVerified.toLowerCase()!=="yes")throw new Error("Credit card must be verified before generating this order form.");let o="";return t.needsManagerVerification&&t.needsManagerVerification.toLowerCase()==="yes"?o="Ready for manager verification":o="Credit card manager verified - Ready for processing",`Subject: Phone Order Form for ${t.customerName}

Hi ${t.managerNameOrStoreName},

Attached is the form for the phone order for ${t.customerName} (${t.customerId}).

Ringing under: ${t.employeeName} (${t.employeeId})
Units: ${t.unitsQuantity}
Total: ${t.totalAmount}

Order Status: ${o}

Best regards,
${B()}`}},"phone-corporate":{name:"Corporate Approval",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","customerId","employeeName","employeeId","unitsQuantity","totalAmount","fulfillingStore"],generate:e=>{const t=k(e);return`Subject: Phone Order Approval Request - ${t.customerName}

Hello,

I am forwarding a request for approval on a phone order for ${t.employeeName} (${t.employeeId}).

There are ${t.unitsQuantity} units totaling ${t.totalAmount}. It will be fulfilled at ${t.fulfillingStore}.

Customer: ${t.customerName} (${t.customerId})

I have verified and signed off. Please let us know if you have any questions.

 Best regards,
 ${B()}`}},"inter-store-notification":{name:"Inter-Store Notification",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["recipientStoreName","customerName","trackingNumber"],generate:e=>{const t=k(e);return`Subject: Phone Order Processed and Shipped - ${t.customerName}

Hi ${t.recipientStoreName} Team,

The phone order for ${t.customerName} has been rung and labeled for shipping.

UPS Tracking Number: ${t.trackingNumber}

The package has been prepared and is ready for UPS pickup.

Best regards,
${B()}`}},"text-availability":{name:"Availability Response",category:"Text",fields:["customerName","modelName","price","closingTime"],generate:e=>{const t=k(e);return`Hi ${t.customerName}! Yes, we have the ${t.modelName} in stock. Current price is ${t.price} with our outlet discount. We're open until ${t.closingTime} today if you'd like to stop by, or I can hold it.`}},"text-thank-you":{name:"Thank You",category:"Text",fields:["customerName","modelName","warrantyLength","brand"],generate:e=>{const t=k(e);return`${t.customerName}, thank you for your purchase today! Your ${t.modelName} comes with a ${t.warrantyLength} warranty. Reach out anytime at ${_()} for any questions. Enjoy your new ${t.brand}!`}},"text-interest-followup":{name:"Sale Alert",category:"Text",fields:["customerName","employeeName","modelName","discount","msrp","endDate"],generate:e=>{W(e,["customerName","employeeName","modelName","discount","msrp","endDate"]);const t=k(e),o=parseFloat(t.msrp),n=parseFloat(t.discount);if(isNaN(o)||o<=0)throw new Error("MSRP must be a valid positive number");if(isNaN(n)||n<0||n>100)throw new Error("Discount must be a valid percentage between 0 and 100");const r=vt(o,n);return`Hi ${t.customerName}! This is ${t.employeeName} from ${gt()}. The ${t.modelName} you were interested in is on ${t.discount}% OFF promotion (MSRP ${t.msrp} now ${r} plus tax) until ${t.endDate}. Please let me know if you'd like me to hold one for you. Thank you!`}},"weekly-sale":{name:"Weekly Sale",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","collectionName","discount","brand","model1","price1","original1","model2","price2","original2","endDate","employeeName"],generate:e=>{const t=k(e),n=[{name:t.model1,price:t.price1,original:t.original1},{name:t.model2,price:t.price2,original:t.original2}].filter(r=>r.name&&r.price).map(r=>`• ${r.name} - Now ${r.price} (was ${r.original})`).join(`
`);return`Subject: ${t.customerName}, This Week's ${t.brand} Sale Includes Your Favorites

Hi ${t.customerName},

I remember you were looking at ${t.collectionName} pieces during your last visit. Good timing - we just started our ${t.discount}% off promotion on select ${t.brand} models this week!

Specifically available in that collection:
${n}

This promotion runs through ${t.endDate}. Would you like me to check if we have your size preference in stock?

${B()}`}}},re={chevronDown:"M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z",chevronUp:"M1.707 8.707L6 4.414l4.293 4.293a1 1 0 001.414-1.414l-5-5a1 1 0 00-1.414 0l-5 5a1 1 0 101.414 1.414z",close:"M18 6L6 18M6 6l12 12",profile:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2",profileCircle:"M12 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",save:"M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z",import:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",export:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",reset:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5",eyePreview:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z",eyeCircle:"M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",codeBrackets:"M16 18l6-6-6-6M8 6l-6 6 6 6",email:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z",emailFlap:"M22 6l-10 7L2 6",errorCircle:"M12 12a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",errorLine:"M12 8v4M12 16h.01",warning:"M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",upload:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",pdfDoc:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",pdfDocCorner:"M14 2v6h6"};function q(e,{size:t=12,className:o=""}={}){const r=re[e==="up"?"chevronUp":"chevronDown"],a=o?` class="${o}"`:"";return`<svg width="${t}" height="${t}" viewBox="0 0 12 12" fill="currentColor"${a}><path d="${r}"/></svg>`}function me({size:e=16,className:t=""}={}){const o=t?` class="${t}"`:"";return`<svg width="${e}" height="${e}" viewBox="0 0 16 16" fill="currentColor"${o}>
    <circle cx="4" cy="3" r="1.5"/>
    <circle cx="4" cy="8" r="1.5"/>
    <circle cx="4" cy="13" r="1.5"/>
    <circle cx="12" cy="3" r="1.5"/>
    <circle cx="12" cy="8" r="1.5"/>
    <circle cx="12" cy="13" r="1.5"/>
  </svg>`}function X({size:e=16,className:t=""}={}){const o=t?` class="${t}"`:"";return`<svg width="${e}" height="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${o}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`}function Re({size:e=16,className:t=""}={}){const o=t?` class="${t}"`:"";return`<svg width="${e}" height="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${o}>
    <path d="${re.email}"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>`}function wt({size:e=16,className:t=""}={}){const o=t?` class="${t}"`:"";return`<svg width="${e}" height="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${o}>
    <path d="${re.eyePreview}"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>`}function $t({size:e=16,className:t=""}={}){const o=t?` class="${t}"`:"";return`<svg width="${e}" height="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${o}>
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
  </svg>`}function Et({size:e=48,className:t=""}={}){const o=t?` class="${t}"`:"";return`<svg width="${e}" height="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${o}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>`}function St({size:e=24,className:t=""}={}){return`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${t?` class="${t}"`:""}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <text x="12" y="17" font-size="6" text-anchor="middle" fill="currentColor">PDF</text>
  </svg>`}function Uo({size:e=14,className:t=""}={}){const o=t?` class="${t}"`:"";return`<svg width="${e}" height="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${o}>
    <path d="${re.warning}"/>
  </svg>`}function qe({size:e=16,className:t=""}={}){const o=t?` class="${t}"`:"";return`<svg width="${e}" height="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${o}>
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
  </svg>`}function Oe({size:e=16,className:t=""}={}){const o=t?` class="${t}"`:"";return`<svg width="${e}" height="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${o}>
    <line x1="19" y1="4" x2="10" y2="4"></line>
    <line x1="14" y1="20" x2="5" y2="20"></line>
    <line x1="15" y1="4" x2="9" y2="20"></line>
  </svg>`}function _e({size:e=16,className:t=""}={}){const o=t?` class="${t}"`:"";return`<svg width="${e}" height="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${o}>
    <path d="M6 4v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4"></path>
    <line x1="4" y1="21" x2="20" y2="21"></line>
  </svg>`}function ke(e){const t=document.createElement("div");t.innerHTML=e;let o="";const n=r=>{if(r.nodeType===3)o+=r.textContent;else if(r.nodeType===1){const a=r.tagName.toLowerCase();(a==="p"||a==="div"||a==="h1"||a==="h2"||a==="h3"||a==="br")&&o&&!o.endsWith(`\r
`)&&(o+=`\r
\r
`);for(let s=0;s<r.childNodes.length;s++)n(r.childNodes[s]);(a==="p"||a==="div")&&r.nextSibling&&(o.endsWith(`\r
`)||(o+=`\r
`))}};return n(t),o=o.replace(/\r\n\r\n\r\n+/g,`\r
\r
`).trim()+`\r
`,o}function te(e){const o=new TextEncoder().encode(e);let n="";for(let r=0;r<o.length;r++){const a=o[r],s=String.fromCharCode(a);if(s==="=")n+="=3D";else if(a<32||a>126)if(a===9||a===10||a===13)n+=s;else{const c=a.toString(16).toUpperCase().padStart(2,"0");n+="="+c}else n+=s}return n}function Ue(e){let t=!0;for(let a=0;a<e.length;a++)if(e.charCodeAt(a)>127){t=!1;break}if(t)return e;const o=new TextEncoder().encode(e),n=Array.from(o,a=>String.fromCodePoint(a)).join("");return`=?UTF-8?B?${btoa(n)}?=`}function It(e){const t=new TextEncoder().encode(e),o=Array.from(t,n=>String.fromCodePoint(n)).join("");return btoa(o)}function Ye(e){let t=!0;for(let n=0;n<e.length;n++)if(e.charCodeAt(n)>127){t=!1;break}return t?`filename="${e}"`:`filename*=UTF-8''${encodeURIComponent(e)}`}function xt(e){return/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(String(e).toLowerCase())}function Yo(e){const t=e.split(/[\s,;\n]+/).map(o=>o.trim().toLowerCase()).filter(Boolean);return[...new Set(t)]}async function Lt(e,t,o,n,r,a,s=[]){const c=Date.now().toString(16),i=`_000_DM6PR11MB2683${c}DM6PR11MB2683namp_`,p=`_000_ALT_${c}_ALT_`,g=s&&s.length>0;let m=`Subject: ${Ue(r)}\r
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
`;const u=ke(a);m+=`${te(u)}\r
\r
`,m+=`--${p}\r
`,m+=`Content-Type: text/html; charset="utf-8"\r
`,m+=`Content-Transfer-Encoding: quoted-printable\r
\r
`,m+=`${te(a)}\r
\r
`,m+=`--${p}--\r
\r
`;for(const v of s)if(v.data){const w=v.data.split(",");if(w.length===2&&w[0].includes("base64")){const f=w[1];m+=`--${i}\r
`,m+=`Content-Type: application/pdf; name="${v.name}"\r
`,m+=`Content-Transfer-Encoding: base64\r
`,m+=`Content-Disposition: attachment; ${Ye(v.name)}\r
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
`;const u=ke(a);m+=`${te(u)}\r
\r
`,m+=`--${i}\r
`,m+=`Content-Type: text/html; charset="utf-8"\r
`,m+=`Content-Transfer-Encoding: quoted-printable\r
\r
`,m+=`${te(a)}\r
\r
`,m+=`--${i}--\r
`}return m}function Tt(e){if(!e)return null;const t=e.indexOf("While Supplies Last");if(t===-1)return null;const o=Math.max(0,t-200),r=e.substring(o,t).match(/([A-Za-z]+\s+\d+(?:\s*-\s*[A-Za-z]+\s+\d+)?),\s*(\d{4})\s*•\s*While Supplies Last/);return r?`${r[1]}, ${r[2]}`:null}function Ct(e){if(!e)return"";const t={January:"Jan",February:"Feb",March:"Mar",April:"Apr",May:"May",June:"Jun",July:"Jul",August:"Aug",September:"Sep",October:"Oct",November:"Nov",December:"Dec"},o=e.match(/^([A-Za-z]+)\s+(\d+)(?:\s*-\s*([A-Za-z]+)\s+(\d+))?,?\s*(\d{4})$/);if(o){const[,n,r,a,s,c]=o,i=t[n]||n.substring(0,3),p=a?t[a]||a.substring(0,3):i;return a&&s?`${i}${r}-${p}${s}.${c}`:`${i}${r}.${c}`}return e.replace(/[^a-zA-Z0-9]/g,"").substring(0,20)}function Wo(e){const t=Tt(e);if(t)return`Promo-email.${Ct(t)}.zip`;{const o=new Date,n=String(o.getMonth()+1).padStart(2,"0"),r=String(o.getDate()).padStart(2,"0");return`Promo-email.${o.getFullYear()}-${n}-${r}.zip`}}function Vo(e,t,o,n=[],r="eml",a=1){const s=o.filter(f=>xt(f)?!0:(console.warn(`Invalid email address skipped in batch ${a}: ${f}`),!1)),c="----=_NextPart_"+Date.now()+"_"+a+"_"+Math.random().toString(36).substr(2,9);let i="";i+=`Subject: ${Ue(e)}\r
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
`;const m=t.replace(/\r?\n/g,`\r
`),v=It(m).match(/.{1,76}/g)||[];i+=v.join(`\r
`),i+=`\r
\r
`,n&&n.length>0&&n.forEach((f,h)=>{if(!f.data){console.warn(`Skipping PDF ${f.name} - no data available (may need to re-upload)`);return}const I=f.data.split(",");if(I.length!==2||!I[0].includes("base64")){console.error(`Invalid PDF data format for attachment ${h+1} (${f.name}) in batch ${a}`);return}const L=I[1];if(!L||L.length===0){console.error(`Empty PDF data for attachment ${h+1} (${f.name}) in batch ${a}`);return}i+=`--${c}\r
`,i+=`Content-Type: application/pdf; name="${f.name}"\r
`,i+=`Content-Transfer-Encoding: base64\r
`,i+=`Content-Disposition: attachment; ${Ye(f.name)}\r
`,i+=`\r
`;const N=L.match(/.{1,76}/g)||[];i+=N.join(`\r
`),i+=`\r
\r
`}),i+=`--${c}--\r
`;const w=a.toString().padStart(3,"0");return{format:r,data:new TextEncoder().encode(i),filename:`batch-email${w}.${r}`}}function F(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}function pe(e){const t=r=>F(r);return e.split(/\n\n+/).map(r=>{if(!r.trim())return"";const a=r.split(`
`);return a.some(i=>i.trim())&&a.every(i=>{const p=i.trim();return!p||p.startsWith("•")||p.startsWith("-")})?`    <ul style="margin: 10px 0; padding-left: 20px; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt;">
${a.filter(p=>p.trim()).map(p=>{const g=p.replace(/^[•-]\s*/,"").trim();return`        <li style="margin: 5px 0;">${t(g)}</li>`}).join(`
`)}
    </ul>`:`    <p style="margin: 10px 0; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);">${a.map(i=>t(i)).join("<br>")}</p>`}).filter(r=>r).join(`
`)}function kt(e){let t="Email Preview",o=e;if(window.originalMessageContent){const r=window.originalMessageContent.match(/^Subject:\s*(.+)/m);r&&(t=r[1],o=window.originalMessageContent.replace(/^Subject:.+\n/m,"").trim())}else{const r=e.match(/^Subject:\s*(.+)/m);r&&(t=r[1],o=e.replace(/^Subject:.+\n/m,"").trim())}return`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${F(t)}</title>
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
            <div class="email-subject">${F(t)}</div>
        </div>
        <div class="email-body">
            ${o}
        </div>
    </div>
</body>
</html>`}let C=null;function Bt(e){C=e}function We(e){return e?/<(p|div|span|br|html|body|head|table|tr|td|ul|ol|li|h[1-6]|strong|em|a)\b[^>]*>/i.test(e):!1}const d={};function Dt(){d.templateSelect=document.getElementById("templateSelect"),d.formFields=document.getElementById("formFields"),d.formSectionTitle=document.getElementById("formSectionTitle"),d.outputCard=document.getElementById("outputCard"),d.outputArea=document.getElementById("outputArea"),d.generateBtn=document.getElementById("generateBtn"),d.clearBtn=document.getElementById("clearBtn"),d.copyBtn=document.getElementById("copyBtn"),d.sendEmailBtn=document.getElementById("sendEmailBtn"),d.downloadEmailBtn=document.getElementById("downloadEmailBtn"),d.themeToggle=document.getElementById("themeToggle"),d.searchBox=document.getElementById("searchBox"),d.clearSearch=document.getElementById("clearSearch"),d.searchResults=document.getElementById("searchResults"),d.resultCounter=document.getElementById("resultCounter")}function oe(e){return document.getElementById(e)}function A(e,t=2500){const o=document.getElementById("toast");if(!o){console.warn("Toast element not found");return}o.textContent=e,o.classList.add("show"),setTimeout(()=>{o.classList.remove("show")},t)}function Ve(){if(!d.outputCard)return;d.outputArea=null,d.copyBtn=null,d.subjectLineContainer=null,d.sendEmailBtn=null,d.downloadEmailBtn=null,d.previewTab=null,d.htmlTab=null,d.previewContentRegular=null,d.htmlContentRegular=null,d.emailPreview=null;const e=T[C],t=e&&e.hasEditableSubject;let o="",n="";if(t?(o=`
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
                ${wt({size:16})}
                Preview
            </button>
            <button class="output-tab" data-tab="html" title="View the raw HTML code">
                ${$t({size:16})}
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
    `,d.outputArea=document.getElementById("outputArea"),d.copyBtn=document.getElementById("copyBtn"),d.previewTab=document.querySelector('.output-tab[data-tab="preview"]'),d.htmlTab=document.querySelector('.output-tab[data-tab="html"]'),d.previewContentRegular=document.getElementById("previewContent"),d.htmlContentRegular=document.getElementById("htmlContent"),d.emailPreview=document.getElementById("emailPreview"),d.emailPreview&&fe(d.emailPreview),d.copyBtn&&d.copyBtn.addEventListener("click",_t),d.previewTab&&d.htmlTab&&(d.previewTab.addEventListener("click",()=>{d.previewTab.classList.add("active"),d.htmlTab.classList.remove("active"),d.previewContentRegular&&d.previewContentRegular.classList.add("active"),d.htmlContentRegular&&d.htmlContentRegular.classList.remove("active"),d.outputArea&&window.originalMessageContent&&(d.outputArea.value=window.originalMessageContent),Q()}),d.htmlTab.addEventListener("click",()=>{if(d.htmlTab.classList.add("active"),d.previewTab.classList.remove("active"),d.htmlContentRegular&&d.htmlContentRegular.classList.add("active"),d.previewContentRegular&&d.previewContentRegular.classList.remove("active"),d.outputArea){const r=d.outputArea.value;if(r){let a="Email",s=r;const c=r.match(/^Subject:\s*(.+)/m);c&&(a=c[1],s=r.replace(/^Subject:.+\n/m,"").trim());let i=s;const p=s.match(/\n\nBest regards,/);p&&(i=s.substring(0,p.index+p[0].length).trim());const g=pe(i),m=B("html"),u=`<!DOCTYPE html>
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
</html>`;d.outputArea.value=u}}})),t){const r=document.getElementById("sendEmailBtn"),a=document.getElementById("downloadEmailBtn");r&&r.addEventListener("click",()=>{const c=document.getElementById("outputArea"),i=c?c.value:"";i&&Ht(C,i)}),a&&a.addEventListener("click",()=>{const c=document.getElementById("outputArea"),i=window.originalMessageContent||(c?c.value:"");i&&zt(C,i)});const s=document.getElementById("subjectLineContent");s&&Ke(s,"")}}function fe(e){if(!e)return;const t=e.contentDocument||e.contentWindow.document;if(!t)return;const o=getComputedStyle(document.documentElement),n=o.getPropertyValue("--bg-tertiary").trim()||"#f8f3ef",r=o.getPropertyValue("--text-primary").trim()||"#2a2420",a=o.getPropertyValue("--text-secondary").trim()||"#666";t.open(),t.write(`
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
                ${Re({size:80})}
                <h3>No Preview Yet</h3>
                <p>Fill in the form and click Generate to see your email preview</p>
            </div>
        </body>
        </html>
    `),t.close()}function Pt(){const e=navigator.platform.toLowerCase();return e.includes("win")?"windows":e.includes("mac")?"mac":"other"}function Nt(){return Pt()==="mac"?"emltpl":"eml"}function At(){try{const e=localStorage.getItem("userProfile");e&&(y.userProfile=JSON.parse(e))}catch(e){console.error("Error loading user profile:",e)}}function Je(){d.templateSelect.addEventListener("change",()=>{de(d.templateSelect.value)}),d.generateBtn.addEventListener("click",jt),d.clearBtn.addEventListener("click",Ft),d.themeToggle.addEventListener("click",zo),d.searchBox.addEventListener("input",()=>{const t=d.searchBox.value.trim();d.clearSearch.classList.toggle("visible",t.length>0),Be(t)}),d.clearSearch.addEventListener("click",()=>{d.searchBox.value="",d.clearSearch.classList.remove("visible"),Be("")});const e=document.querySelector(".search-container");document.addEventListener("click",t=>{e&&!e.contains(t.target)&&d.searchResults&&d.searchResults.classList.remove("visible")}),d.searchResults&&d.searchResults.addEventListener("click",t=>{const o=t.target.closest(".search-result-item");if(o&&o.dataset.templateKey){const n=o.dataset.templateKey;de(n),d.searchBox.value="",d.searchBox.classList.remove("active"),d.clearSearch.classList.remove("visible"),d.searchResults.classList.remove("visible")}})}function Mt(e){const t=e.id,o=T[C];if(!o)return;const n=o.fields.find(i=>i.id===t);if(!n||!n.validation)return;const{pattern:r,message:a}=n.validation,s=r.test(e.value);e.classList.toggle("invalid",!s);let c=e.nextElementSibling;return(!c||!c.classList.contains("validation-msg"))&&(c=document.createElement("div"),c.className="validation-msg",e.parentNode.insertBefore(c,e.nextSibling)),c.textContent=s?"":a,c.style.display=s?"none":"block",s}function jt(){const e=T[C];if(!e){A("Please select a template first");return}const t={};let o=!0,n=null;if(e.fields.forEach(s=>{const c=oe(s);c&&(t[s]=c.value,(ne[s]||{}).validation&&(Mt(c)||(o=!1,n||(n=c))))}),!o){A("✗ Please fix the errors in the form"),n&&n.focus();return}const r=e.generate(t);Ve();const a=oe("outputArea");if(a&&(a.value=r),window.originalMessageContent=r,Q(),e.hasEditableSubject){const s=G(r),c=document.getElementById("subjectLineContent");c&&Ke(c,s)}d.outputCard.scrollIntoView({behavior:"smooth"})}function Ft(){const e=T[C];e&&e.fields.forEach(t=>{const o=oe(t.id);if(o){o.value="",o.classList.remove("invalid");const n=o.nextElementSibling;n&&n.classList.contains("validation-msg")&&(n.style.display="none")}}),d.outputArea&&(d.outputArea.value=""),d.outputCard&&(d.outputCard.innerHTML=""),Q(),A("✓ Form cleared")}function G(e){const t=e.match(/^Subject:\s*(.*)/im);return t?t[1]:""}function Ke(e,t){window.currentSubjectLine=t,e.innerHTML=`
        <div class="editable-subject-line">
            <label for="subjectInput" class="form-label">Subject:</label>
            <input type="text" id="subjectInput" class="form-input" value="${S(t)}">
        </div>
    `;const o=document.getElementById("subjectInput");o&&o.addEventListener("input",n=>{window.currentSubjectLine=n.target.value,debouncedSubjectPreviewUpdate(n.target.value)})}function Ht(e,t){const o=T[e];if(!o)return;let n="",r=t;o.hasEditableSubject?(n=window.currentSubjectLine||G(t),r=r.replace(/^Subject:.*\r?\n/im,"")):(n=G(t),r=r.replace(/^Subject:.*\r?\n/im,""));const a=ht(r),s=`mailto:?subject=${encodeURIComponent(n)}&body=${encodeURIComponent(a)}`,c=document.createElement("a");c.href=s,document.body.appendChild(c),c.click(),document.body.removeChild(c)}function zt(e,t){const o=T[e];if(!o)return;let n="",r=t;o.hasEditableSubject?(n=window.currentSubjectLine||G(t),r=t.replace(/^Subject:.*\r?\n/im,"")):(n=G(t),r=t.replace(/^Subject:.*\r?\n/im,""));const a=We(r);let s;if(a)s=r;else{let p=r;const g=r.match(/\n\nBest regards,/);g&&(p=r.substring(0,g.index+g[0].length).trim());const m=pe(p),u=B("html");s=`<html>
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
</html>`}const c=y.userProfile.name||`${ce()} ${ze()}`,i=y.userProfile.email||"store@citizenwatchgroup.com";Lt(c,i,"","",n,s,[]).then(p=>{const g=new Blob([p],{type:"message/rfc822"}),m=URL.createObjectURL(g),u=document.createElement("a");u.href=m;const v=n.replace(/[^a-z0-9]/gi,"_").toLowerCase(),f=Nt()==="emltpl"?".emltpl":".eml";u.download=`${v}${f}`,u.click(),URL.revokeObjectURL(m)})}function Jo(){Dt(),At(),Ot(),Je();const e=localStorage.getItem("selectedTemplate");e&&T[e]&&de(e)}function Rt(){const e=document.getElementById("emailPreview");e&&fe(e)}function qt(){return`
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
  `}function Q(){const e=document.getElementById("outputArea"),t=document.getElementById("emailPreview"),o=document.querySelector('.output-tab[data-tab="preview"]'),n=document.getElementById("previewContent"),r=document.getElementById("htmlContent");if(!e||!t)return;const a=e.value;if(!a){fe(t);return}const s=We(a),c=document.querySelector('.output-tab[data-tab="html"]');if(o){o.disabled=!1,o.style.opacity="1",o.style.cursor="pointer",o.classList.add("active"),c&&c.classList.remove("active"),n&&n.classList.add("active"),r&&r.classList.remove("active");let i;if(s)i=kt(a);else{let m="Email Preview",u=a;const v=a.match(/^Subject:\s*(.+)/m);v&&(m=v[1],u=a.replace(/^Subject:.+\n/m,"").trim());let w=u;const f=w.match(/\n\nBest regards,/);if(f)w=w.substring(0,f.index+f[0].length).trim();else{const L=w.match(/______+/);if(L){const N=w.substring(0,L.index),J=N.lastIndexOf(`

`);J!==-1&&(w=N.substring(0,J).trim())}}const h=pe(w),I=B("html");i=`<!DOCTYPE html>
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
                ${I}
            </div>
        </div>
    </div>
</body>
</html>`}const p=document.documentElement.getAttribute("data-theme")||"light";let g=i;p==="dark"&&(g=i.replace("</head>",`<style id="dark-mode-sim">${qt()}</style></head>`)),t.srcdoc=g}}function Ot(){const e={"Customer Email":[],"Phone Orders":[],Text:[]};Object.keys(T).forEach(t=>{const o=T[t];e[o.category].push({key:t,name:o.name})}),d.templateSelect.innerHTML='<option value="">Select a template...</option>',Object.keys(e).forEach(t=>{if(e[t].length>0){const o=document.createElement("optgroup");o.label=t,e[t].forEach(n=>{const r=document.createElement("option");r.value=n.key,r.textContent=n.name,r.title=yt[n.key]||"",o.appendChild(r)}),d.templateSelect.appendChild(o)}})}function Be(e){if(!e.trim()){d.searchResults.classList.remove("visible"),d.resultCounter.textContent="",d.clearSearch.classList.remove("visible"),d.searchBox.classList.remove("active");return}d.clearSearch.classList.add("visible"),d.searchBox.classList.add("active");const t=e.toLowerCase(),o=Object.keys(T).filter(a=>{const s=T[a];return s.name.toLowerCase().includes(t)||s.category.toLowerCase().includes(t)});let n="";if(o.length===0)n='<div class="search-result-item" style="cursor: default; color: var(--text-tertiary);">No templates found</div>',d.resultCounter.textContent="0 templates found";else{n=o.map(i=>{const p=T[i],g=D(p.name),m=D(p.category);return`
                <div class="search-result-item" data-template-key="${S(i)}">
                    <div class="search-result-name">${g}</div>
                    <div class="search-result-category">${m}</div>
                </div>
            `}).join("");const s=o.length,c=s===1?"":"s";d.resultCounter.textContent=`${s} template${c} found`}const r=d.resultCounter;d.searchResults.innerHTML=n,d.searchResults.appendChild(r),d.searchResults.classList.add("visible")}let De=null,Pe=!1;function de(e){try{if(!e||!T[e]){console.warn("Invalid template key:",e);return}if(e===De&&Pe)return;Pe=!0,De=e,C=e;const t=T[e];Rt(),window.originalMessageContent="";const o=oe("outputArea");o&&(o.value=""),localStorage.setItem("selectedTemplate",e),d.templateSelect.value=e;const n=document.querySelector(".section-header-with-controls");if(n){const i=document.createElement("h2");i.id="formSectionTitle",i.className="section-title",i.textContent=`${t.name} Fields`,n.replaceWith(i),d.formSectionTitle=i}else d.formSectionTitle.textContent=`${t.name} Fields`;const r=document.getElementById("formPlaceholder");r&&r.remove(),Ve();const a=t.fields.map(i=>{const p=i.replace(/([A-Z])/g," $1").trim(),g=p.charAt(0).toUpperCase()+p.slice(1),m=i.includes("address")||i.includes("Address")||i.includes("Details"),u=i.includes("Verified")||i.includes("Verification"),v=ne[i]||{},w=m?" full-width":"",f=v.required?" *":"",h=S(i),I=S(v.example||"");if(u)return`
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
                `;const L=bt(i),N=`datalist-${h}`;let J="";if(L.length>0){const ot=L.map(nt=>`<option value="${S(nt)}">`).join("");J=`
                <datalist id="${N}">
                    ${ot}
                </datalist>
            `}let K="";y.userProfile&&((i==="employeeName"||i==="yourName")&&y.userProfile.employeeName?K=S(y.userProfile.employeeName):i==="storePhone"&&y.userProfile.storePhone?K=S(y.userProfile.storePhone):i==="storeName"&&y.userProfile.storeName&&(K=S(y.userProfile.storeName)));const tt=m?`<textarea id="${h}" class="form-textarea" data-field="${h}" ${v.required?"required":""} placeholder="${I}">${K}</textarea>`:`<input type="text" id="${h}" class="form-input" data-field="${h}" ${v.required?"required":""} placeholder="${I}" value="${K}" list="${N}">${J}`;return`
                <div class="form-group${w}">
                    <label class="form-label" for="${h}">${D(g)}${f}</label>
                    <div class="input-wrapper">
                        ${tt}
                        <button class="clear-input" data-clear="${h}" title="Clear">×</button>
                    </div>
                    <div class="calculated-value" data-calc="${h}" style="display: none;"></div>
                    <div class="error-message" data-error="${h}" style="display: none;"></div>
                </div>
            `});d.formFields.innerHTML=a.join(""),setTimeout(()=>{Je()},0),d.formFields.addEventListener("click",i=>{if(i.target.classList.contains("clear-input")){const p=i.target.dataset.clear,g=document.getElementById(p);g&&(g.value="",i.target.classList.remove("visible"),g.focus(),Q())}}),d.formFields.addEventListener("input",i=>{if(i.target.classList.contains("form-input")||i.target.classList.contains("form-textarea")){const p=i.target.id,g=d.formFields.querySelector(`[data-clear="${p}"]`);g&&g.classList.toggle("visible",i.target.value.trim().length>0)}}),d.formFields.querySelectorAll(".form-input, .form-textarea").forEach(i=>{const p=d.formFields.querySelector(`[data-clear="${i.id}"]`);p&&i.value.trim().length>0&&p.classList.add("visible")});const c=document.getElementById("outputArea");c&&(c.value=""),d.clearBtn.disabled=!1}catch(t){console.error("Error selecting template:",t),A("Error loading template")}}function _t(){const e=document.getElementById("outputArea");if(!e){console.error("outputArea element not found"),A("⚠ Output area not found");return}const t=e.value;if(!t){A("⚠ Nothing to copy");return}if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(()=>{A("✓ Copied!")}).catch(o=>{console.error("Clipboard error:",o),A("⚠ Copy failed")});else try{e.select();const o=document.execCommand("copy");A(o?"✓ Copied!":"⚠ Copy failed")}catch(o){console.error("Copy error:",o),A("⚠ Copy not supported")}}const l={promotionEntries:[],specialHours:[],howToShopItems:[],importantNotesItems:[],attachedPDFs:[],generatedSubjectLines:[],selectedSubjectLine:null,howToShopExpanded:!1,importantNotesExpanded:!1,entryCollapsedStates:{},columnState:"left-expanded"};function M(e){return JSON.parse(JSON.stringify(e))}function Ut({promoDateRange:e="",promoYear:t="",promoTitle:o="",bulkEmailRecipients:n="",promotionEntries:r=[],specialHours:a=[],howToShopItems:s=[],importantNotesItems:c=[],attachedPDFs:i=[],generatedSubjectLines:p=[],selectedSubjectLine:g=null,now:m=new Date}){const u=n||"",v=i.map(w=>({id:w.id,name:w.name,size:w.size,type:w.type}));return{templateType:"promotion-email",version:"1.0",savedAt:m.toISOString(),dateRange:e||"",year:t||"",title:o||"",bulkEmailRecipients:u,promotionEntries:M(r),specialHours:M(a),howToShopItems:M(s),importantNotesItems:M(c),attachedPDFs:M(v),generatedSubjectLines:M(p),selectedSubjectLine:g}}function Yt({promoDateRange:e="",promoYear:t="",promoTitle:o="",bulkEmailRecipients:n="",promotionEntries:r=[],specialHours:a=[],howToShopItems:s=[],importantNotesItems:c=[],attachedPDFs:i=[],generatedSubjectLines:p=[],selectedSubjectLine:g=null,now:m=new Date}){return{templateType:"promotion-email",version:"1.0",exportedAt:m.toISOString(),dateRange:e||"",year:t||"",title:o||"",promotionEntries:M(r),specialHours:M(a),attachedPDFs:M(i),generatedSubjectLines:M(p),selectedSubjectLine:g}}function Wt(e){if(!e||typeof e!="object")return{ok:!1,reason:"notObject"};const t=M(e);if(t.templateType&&t.templateType!=="promotion-email")return{ok:!1,reason:"wrongType"};function o(r,a){if(!Array.isArray(t[r])){if(t[r]!==void 0)return a;t[r]=[]}return null}const n=[o("promotionEntries","promotionEntriesNotArray"),o("specialHours","specialHoursNotArray"),o("howToShopItems","howToShopItemsNotArray"),o("importantNotesItems","importantNotesItemsNotArray")].filter(Boolean);return n.length>0?{ok:!1,reason:n[0]}:(Array.isArray(t.attachedPDFs)||(t.attachedPDFs=[]),Array.isArray(t.generatedSubjectLines)||(t.generatedSubjectLines=[]),{ok:!0,config:t})}function ae(e){e.querySelectorAll(".clear-input").forEach(t=>{const o=t.dataset.clear,n=document.getElementById(o);if(!n)return;const r=()=>{t.classList.toggle("visible",n.value.trim().length>0)};r(),n.addEventListener("input",r),t.addEventListener("click",()=>{n.value="",t.classList.remove("visible"),n.focus(),n.dispatchEvent(new Event("input",{bubbles:!0}))})})}function O(e,t,o,n="id"){const r=e.findIndex(a=>a[n]===t);return o==="up"&&r>0?([e[r-1],e[r]]=[e[r],e[r-1]],!0):o==="down"&&r<e.length-1?([e[r],e[r+1]]=[e[r+1],e[r]],!0):!1}function ge(e,t,o,n=".editable-item-row"){let r=null,a=null,s=!1;e.addEventListener("mousedown",c=>{s=!!c.target.closest(".drag-handle")}),e.addEventListener("mouseup",()=>{s=!1}),e.addEventListener("dragstart",c=>{const i=c.target.closest(n);if(i){if(!s){c.preventDefault();return}r=i,a=parseInt(i.dataset.itemId||i.dataset.entryId,10),i.classList.add("dragging"),c.dataTransfer.effectAllowed="move"}}),e.addEventListener("dragend",c=>{const i=c.target.closest(n);i&&(i.classList.remove("dragging"),e.querySelectorAll(n).forEach(p=>p.classList.remove("drag-over")))}),e.addEventListener("dragover",c=>{c.preventDefault(),c.dataTransfer.dropEffect="move";const i=c.target.closest(n);i&&r!==i&&i.classList.add("drag-over")}),e.addEventListener("dragleave",c=>{const i=c.target.closest(n);i&&i.classList.remove("drag-over")}),e.addEventListener("drop",c=>{c.preventDefault();const i=c.target.closest(n);if(i&&(i.classList.remove("drag-over"),r!==i)){const p=parseInt(i.dataset.itemId||i.dataset.entryId,10),g=t.findIndex(u=>u.id===a),m=t.findIndex(u=>u.id===p);if(g!==-1&&m!==-1){const[u]=t.splice(g,1);t.splice(m,0,u),o()}}})}function Vt(){const e=localStorage.getItem("userProfile");return e?JSON.parse(e):null}function he(){const e=Vt();return e?.storeEmail?e.storeEmail:e?.storeName?`${e.storeName.toLowerCase().replace(/\s+/g,"")}@citizenwatchgroup.com`:"store@citizenwatchgroup.com"}function Ze(){const e=navigator.platform.toLowerCase();return e.includes("win")?"windows":e.includes("mac")?"mac":"other"}function Jt(){return Ze()==="mac"?"emltpl":"eml"}function Kt(){const e=document.getElementById("formatStatusText");if(!e)return;const t=Ze(),o=Jt(),n=o==="emltpl"?"Template":"EML",r=o==="emltpl"?".emltpl":".eml";let a="Unknown";t==="windows"?a="Windows":t==="mac"?a="macOS":a="Other Platform",e.innerHTML=`<strong>${n} Format:</strong> Optimized for ${a} (${r} files)`}function Zt(e,t){let o;return function(...r){const a=()=>{clearTimeout(o),e(...r)};clearTimeout(o),o=setTimeout(a,t)}}function b(e,t=2500){const o=document.getElementById("toast");if(!o){console.warn("Toast element not found");return}o.textContent=e,o.classList.add("show"),setTimeout(()=>{o.classList.remove("show")},t)}function ye(e){if(!e)return;const t=e.contentDocument||e.contentWindow.document;if(!t)return;const o=getComputedStyle(document.documentElement),n=o.getPropertyValue("--bg-tertiary").trim()||"#f8f3ef",r=o.getPropertyValue("--text-primary").trim()||"#2a2420",a=o.getPropertyValue("--text-secondary").trim()||"#666";t.open(),t.write(`
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
                ${Re({size:80})}
                <h3>No Preview Yet</h3>
                <p>Begin filling in the promotion details to start seeing a preview</p>
            </div>
        </body>
        </html>
    `),t.close()}let Z=null,U=null;function Gt(){return`
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
  `}function E(){if(C!=="promotion-email")return;const e=document.getElementById("previewIframe");if(!e)return;const t=document.getElementById("promoDateRange");if(!t||!t.value.trim()){ye(e);return}const o=document.getElementById("promoYear"),n=document.getElementById("promoTitle"),r={promoDateRange:t.value,promoYear:o?o.value:"",promoTitle:n?n.value:""},a=Do(r),s=document.getElementById("codeArea");s&&(s.value=a);const c=document.documentElement.getAttribute("data-theme")||"light";let i=a;c==="dark"&&(i=a.replace("</head>",`<style id="dark-mode-sim">${Gt()}</style></head>`));const p=e.contentDocument||e.contentWindow.document;p.open(),p.write(i),p.close(),l.generatedSubjectLines.length===0&&ko()}const ie=Zt(E,500);async function Xt(){if(C!=="promotion-email")return;if(l.promotionEntries.forEach(n=>{l.entryCollapsedStates[n.id]=!0}),H(),l.attachedPDFs.length>0&&x){for(const n of l.attachedPDFs)if(n.data)try{await ue(n),console.log(`Re-saved PDF ${n.name} to IndexedDB during template save`)}catch(r){console.warn(`Failed to save PDF ${n.name} to IndexedDB:`,r)}}const e=document.getElementById("bulkEmailList"),t=e?e.value:"",o=Ut({promoDateRange:document.getElementById("promoDateRange")?.value||"",promoYear:document.getElementById("promoYear")?.value||"",promoTitle:document.getElementById("promoTitle")?.value||"",bulkEmailRecipients:t,promotionEntries:l.promotionEntries,specialHours:l.specialHours,howToShopItems:l.howToShopItems,importantNotesItems:l.importantNotesItems,attachedPDFs:l.attachedPDFs,generatedSubjectLines:l.generatedSubjectLines,selectedSubjectLine:l.selectedSubjectLine});try{t&&x&&await st(t)}catch(n){console.warn("Failed to save bulk email recipients to IndexedDB during template save:",n)}localStorage.setItem("savedPromotionTemplate",JSON.stringify(o)),b("✓ Template saved successfully")}function Qt(){if(C!=="promotion-email")return;const e=document.createElement("input");e.type="file",e.accept=".json,application/json",e.style.display="none",e.addEventListener("change",t=>{const o=t.target.files[0];if(!o)return;const n=new FileReader;n.onload=r=>{try{const a=JSON.parse(r.target.result);if(!a||typeof a!="object"){b("✗ Invalid template file - not a valid configuration object");return}if(a.templateType&&a.templateType!=="promotion-email"){b("✗ Invalid template file - not a promotion email template");return}if(!("promotionEntries"in a)||!("specialHours"in a)){b("✗ Invalid template file - missing required promotion template fields");return}Ge(a,!0),b("✓ Template imported from file successfully")}catch(a){console.error("Import error:",a),b("✗ Error reading template file - Invalid JSON or corrupted file")}},n.onerror=()=>{b("✗ Error reading file")},n.readAsText(o)}),document.body.appendChild(e),e.click(),setTimeout(()=>{document.body.removeChild(e)},1e3)}async function Ge(e,t=!0){const o=Wt(e);if(!o.ok){switch(o.reason){case"notObject":b("✗ Invalid template data - not an object");break;case"wrongType":b("✗ Invalid template data - wrong template type");break;case"promotionEntriesNotArray":b("✗ Invalid template data - promotionEntries must be an array");break;case"specialHoursNotArray":b("✗ Invalid template data - specialHours must be an array");break;case"howToShopItemsNotArray":b("✗ Invalid template data - howToShopItems must be an array");break;case"importantNotesItemsNotArray":b("✗ Invalid template data - importantNotesItems must be an array");break;default:b("✗ Invalid template data")}return}const n=o.config;setTimeout(()=>{const s=document.getElementById("promoDateRange"),c=document.getElementById("promoYear"),i=document.getElementById("promoTitle"),p=document.getElementById("bulkEmailList");if(s){s.value=n.dateRange||"";const g=document.querySelector('[data-clear="promoDateRange"]');g&&s.value.trim()&&g.classList.add("visible")}if(c){c.value=n.year||"";const g=document.querySelector('[data-clear="promoYear"]');g&&c.value.trim()&&g.classList.add("visible")}if(i){i.value=n.title||"";const g=document.querySelector('[data-clear="promoTitle"]');g&&i.value.trim()&&g.classList.add("visible")}p&&n.bulkEmailRecipients!=null&&(Array.isArray(n.bulkEmailRecipients)?p.value=n.bulkEmailRecipients.join(", "):typeof n.bulkEmailRecipients=="string"&&(p.value=n.bulkEmailRecipients),p.value&&p.dispatchEvent(new Event("input",{bubbles:!0}))),E()},100),l.promotionEntries=JSON.parse(JSON.stringify(n.promotionEntries||[])),l.specialHours=JSON.parse(JSON.stringify(n.specialHours||[])),n.howToShopItems&&n.howToShopItems.length>0&&(l.howToShopItems=JSON.parse(JSON.stringify(n.howToShopItems))),n.importantNotesItems&&n.importantNotesItems.length>0&&(l.importantNotesItems=JSON.parse(JSON.stringify(n.importantNotesItems))),be(),Qe(),l.generatedSubjectLines=JSON.parse(JSON.stringify(n.generatedSubjectLines||[])),l.selectedSubjectLine=n.selectedSubjectLine||null;const r=new Set(l.attachedPDFs.map(s=>s.id));l.attachedPDFs=[];const a=n.attachedPDFs||[];if(a.length>0){let s=0;for(;!x&&s<20;)await new Promise(c=>setTimeout(c,50)),s++;x||console.warn("IndexedDB not initialized after waiting, PDFs may not have data")}for(const s of a)if(!r.has(s.id))if(s.data){l.attachedPDFs.push(s);try{await ue(s)}catch(c){console.warn(`Failed to save PDF ${s.name} to IndexedDB:`,c)}}else try{const c=await it(s.id);c&&c.data?l.attachedPDFs.push(c):console.warn(`PDF ${s.name} (ID: ${s.id}) data not found in IndexedDB or config, skipping.`)}catch(c){console.warn(`Failed to restore PDF ${s.name} from IndexedDB:`,c)}l.attachedPDFs=l.attachedPDFs.filter(s=>s.data),t&&(l.entryCollapsedStates={},l.promotionEntries.forEach(s=>{l.entryCollapsedStates[s.id]=!0})),H(),Y(),P(),j(),ee(),se(),E()}function eo(){if(C!=="promotion-email")return;const e=document.getElementById("bulkEmailList"),t=e?e.value:"",o=Yt({promoDateRange:document.getElementById("promoDateRange")?.value||"",promoYear:document.getElementById("promoYear")?.value||"",promoTitle:document.getElementById("promoTitle")?.value||"",bulkEmailRecipients:t,promotionEntries:l.promotionEntries,specialHours:l.specialHours,howToShopItems:l.howToShopItems,importantNotesItems:l.importantNotesItems,attachedPDFs:l.attachedPDFs,generatedSubjectLines:l.generatedSubjectLines,selectedSubjectLine:l.selectedSubjectLine}),n=JSON.stringify(o,null,2),r=new Blob([n],{type:"application/json"}),a=URL.createObjectURL(r),s=document.createElement("a");s.href=a,s.download=`promotion-template-${new Date().toISOString().split("T")[0]}.json`,s.click(),URL.revokeObjectURL(a),b("✓ Template exported successfully")}function to(e){if(!e)return"WEEKLY SALE";const t=e.toLowerCase();return t.includes("nov")&&(t.includes("24")||t.includes("25")||t.includes("26")||t.includes("27")||t.includes("28")||t.includes("29"))?"BLACK FRIDAY OUTLET EVENT":t.includes("nov")&&t.includes("30")||t.includes("dec")&&t.includes("1")&&!t.includes("10")?"CYBER MONDAY SALE":t.includes("dec")?"HOLIDAY SALE EVENT":t.includes("jun")||t.includes("jul")||t.includes("aug")?"SUMMER CLEARANCE":t.includes("aug")&&(t.includes("20")||t.includes("2")||t.includes("3"))||t.includes("sep")&&(t.includes("1")||t.includes("2")||t.includes("3")||t.includes("4")||t.includes("5")||t.includes("6")||t.includes("7")||t.includes("8")||t.includes("9"))?"BACK TO SCHOOL SALE":"WEEKLY SALE"}function Xe(){const e=Date.now();l.promotionEntries.push({id:e,line:"",collections:"",callout:""}),H()}function oo(e){l.promotionEntries=l.promotionEntries.filter(t=>t.id!==e),H()}function no(e){O(l.promotionEntries,e,"up")&&H()}function ro(e){O(l.promotionEntries,e,"down")&&H()}function ao(e){const t=!l.entryCollapsedStates[e];l.entryCollapsedStates[e]=t;const o=document.querySelector(`.promotion-entry[data-entry-id="${e}"]`);if(o){const n=o.querySelector(".entry-fields"),r=o.querySelector(".collapse-btn"),a=o.querySelector(".entry-header-left");n&&(n.style.display=t?"none":"grid"),r&&(r.textContent=t?"Expand":"Collapse",r.title=t?"Expand":"Collapse"),o.classList.toggle("collapsed",t);let s=a?.querySelector(".entry-summary");if(t){if(!s&&a){const i=l.promotionEntries.find(p=>p.id===e)?.line?.trim()||"Entry not filled out";s=document.createElement("span"),s.className="entry-summary",s.textContent=i,a.appendChild(s)}}else s&&s.remove()}}function Ne(e){const t=parseInt(e.target.dataset.entryId),o=l.promotionEntries.find(n=>n.id===t);o&&(e.target.classList.contains("entry-line")?o.line=e.target.value:e.target.classList.contains("entry-collections")?o.collections=e.target.value:e.target.classList.contains("entry-callout")&&(o.callout=e.target.value))}function H(){const e=document.getElementById("promotionEntriesContainer");e&&(e.innerHTML=l.promotionEntries.map((t,o)=>{const n=S(String(t.id)),r=o===0,a=o===l.promotionEntries.length-1,s=l.entryCollapsedStates[t.id]||!1;let c="";return t.line&&t.line.trim()?c=t.line.trim():c="Entry not filled out",`
            <div class="promotion-entry ${s?"collapsed":""}" data-entry-id="${n}" draggable="true">
                <div class="entry-header">
                    <div class="entry-header-left">
                        <div class="drag-handle" title="Drag to reorder">
                            ${me({size:16})}
                        </div>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-up" data-entry-id="${t.id}" title="Move up" ${r?"disabled":""}>${q("up",{size:10})}</button>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-down" data-entry-id="${t.id}" title="Move down" ${a?"disabled":""}>${q("down",{size:10})}</button>
                        <span class="entry-number">Entry ${o+1}</span>
                        ${s?`<span class="entry-summary">${F(c)}</span>`:""}
                    </div>
                    <div class="entry-controls">
                        <button type="button" class="collapse-btn btn-base btn-secondary-base btn-xs" data-action="toggle-collapse" data-entry-id="${t.id}" title="${s?"Expand":"Collapse"}">
                            ${s?"Expand":"Collapse"}
                        </button>
                        <button type="button" class="entry-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove" data-entry-id="${t.id}" title="Remove" aria-label="Remove entry">
                            ${X({size:16})}
                        </button>
                    </div>
                </div>

                <div class="entry-fields" style="display: ${s?"none":"grid"};">
                    <div class="form-group full-width">
                        <label class="form-label" for="entry-${n}-line">Promotion Line *</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-input entry-line" id="entry-${n}-line" name="entry-${n}-line" data-entry-id="${n}" value="${S(t.line||"")}" placeholder="CITIZEN – ADDITIONAL 20% OFF">
                            <button class="clear-input" data-clear="entry-${n}-line" title="Clear">×</button>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label class="form-label" for="entry-${n}-collections">Collections (comma-separated)</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-input entry-collections" id="entry-${n}-collections" name="entry-${n}-collections" data-entry-id="${n}" value="${S(t.collections)}" placeholder="Corso, Avion, Marine Star">
                            <button class="clear-input" data-clear="entry-${n}-collections" title="Clear">×</button>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label class="form-label" for="entry-${n}-callout">Special Callout (optional)</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-input entry-callout" id="entry-${n}-callout" name="entry-${n}-callout" data-entry-id="${n}" value="${S(t.callout)}" placeholder="Final sale items excluded">
                            <button class="clear-input" data-clear="entry-${n}-callout" title="Clear">×</button>
                        </div>
                    </div>
                </div>
            </div>
        `}).join(""),e.querySelectorAll(".entry-line, .entry-collections, .entry-callout").forEach(t=>{t.addEventListener("input",o=>{Ne(o),ie()}),t.addEventListener("change",o=>{Ne(o),E()})}),ge(e,l.promotionEntries,H,".promotion-entry"),e.querySelectorAll("[data-action]").forEach(t=>{t.addEventListener("click",o=>{const n=o.currentTarget.dataset.action,r=parseInt(o.currentTarget.dataset.entryId);switch(n){case"move-up":no(r);break;case"move-down":ro(r);break;case"toggle-collapse":ao(r);break;case"remove":oo(r);break}})}),ae(e),E())}function io(){const e=Date.now();l.specialHours.push({id:e,day:"",hours:""}),Y()}function so(e){l.specialHours=l.specialHours.filter(t=>t.id!==e),Y()}function lo(e){O(l.specialHours,e,"up")&&Y()}function co(e){O(l.specialHours,e,"down")&&Y()}function uo(e){const t=parseInt(e.target.dataset.hourId),o=l.specialHours.find(n=>n.id===t);o&&(e.target.classList.contains("hour-day")?o.day=e.target.value:e.target.classList.contains("hour-hours")&&(o.hours=e.target.value))}function Y(){const e=document.getElementById("specialHoursListContainer");if(!e)return;e.innerHTML=l.specialHours.map((o,n)=>{const r=S(String(o.id)),a=n===0,s=n===l.specialHours.length-1;return`
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
                            ${X({size:16})}
                        </button>
                    </div>
                </div>
            </div>
        `}).join(""),e.querySelectorAll(".hour-day, .hour-hours").forEach(o=>{o.addEventListener("input",n=>{uo(n),ie(),debouncedCaptureState()})}),e.querySelectorAll('[data-action^="move-hour"], [data-action="remove-hour"]').forEach(o=>{o.addEventListener("click",n=>{const r=n.currentTarget.dataset.action,a=parseInt(n.currentTarget.dataset.hourId);switch(r){case"move-hour-up":lo(a);break;case"move-hour-down":co(a);break;case"remove-hour":so(a);break}})}),ae(e),E();const t=document.getElementById("specialHoursReminder");t&&(t.style.display=l.specialHours.length>0?"block":"none")}function mo(){const e=Date.now();l.howToShopItems.push({id:e,text:"",bold:!1,italic:!1,underline:!1}),P()}function po(e){l.howToShopItems=l.howToShopItems.filter(t=>t.id!==e),P()}function fo(e){O(l.howToShopItems,e,"up")&&P()}function go(e){O(l.howToShopItems,e,"down")&&P()}function ho(e){const t=l.howToShopItems.find(o=>o.id===e);t&&(t.bold=!t.bold,P(),E())}function yo(e){const t=l.howToShopItems.find(o=>o.id===e);t&&(t.italic=!t.italic,P(),E())}function bo(e){const t=l.howToShopItems.find(o=>o.id===e);t&&(t.underline=!t.underline,P(),E())}function vo(){const e=document.getElementById("howToShopItemsContainer");if(!e)return;e.innerHTML=l.howToShopItems.map((o,n)=>{const r=S(String(o.id)),a=n===0,s=n===l.howToShopItems.length-1;return`
            <div class="editable-item-row" data-item-id="${r}" draggable="true">
                <div class="entry-header">
                    <div class="entry-header-left">
                        <div class="drag-handle" title="Drag to reorder">
                            ${me({size:16})}
                        </div>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-up-how-to-shop" data-item-id="${o.id}" title="Move up" ${a?"disabled":""}>${q("up",{size:10})}</button>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-down-how-to-shop" data-item-id="${o.id}" title="Move down" ${s?"disabled":""}>${q("down",{size:10})}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-bold-how-to-shop" data-item-id="${o.id}" title="Bold" ${o.bold?'data-active="true"':""}>${qe({size:14})}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-italic-how-to-shop" data-item-id="${o.id}" title="Italic" ${o.italic?'data-active="true"':""}>${Oe({size:14})}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-underline-how-to-shop" data-item-id="${o.id}" title="Underline" ${o.underline?'data-active="true"':""}>${_e({size:14})}</button>
                    </div>
                    <div class="entry-controls">
                        <button type="button" class="item-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove-how-to-shop-item" data-item-id="${o.id}" title="Remove" aria-label="Remove shopping item">
                            ${X({size:16})}
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
        `}).join(""),e.querySelectorAll(".shop-item-text").forEach(o=>{o.addEventListener("input",n=>{const r=parseInt(n.target.dataset.itemId),a=l.howToShopItems.find(s=>s.id===r);a&&(a.text=n.target.value,ie())})}),ge(e,l.howToShopItems,P);const t=document.querySelector('[data-action="add-how-to-shop-item"]');t&&t.addEventListener("click",o=>{o.stopPropagation(),mo()}),e.querySelectorAll('[data-action="remove-how-to-shop-item"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);po(r)})}),e.querySelectorAll('[data-action="move-up-how-to-shop"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);fo(r)})}),e.querySelectorAll('[data-action="move-down-how-to-shop"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);go(r)})}),e.querySelectorAll('[data-action="toggle-bold-how-to-shop"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);ho(r)})}),e.querySelectorAll('[data-action="toggle-italic-how-to-shop"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);yo(r)})}),e.querySelectorAll('[data-action="toggle-underline-how-to-shop"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);bo(r)})}),ae(e)}function P(){const e=document.getElementById("howToShopWrapper");e&&(e.innerHTML=`
    <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
        <button type="button" class="btn btn-base btn-primary-base" data-action="add-how-to-shop-item" style="padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Item</button>
    </div>
    <div id="howToShopItemsContainer"></div>
  `,vo(),E())}function wo(){const e=Date.now();l.importantNotesItems.push({id:e,text:"",bold:!1,italic:!1,underline:!1}),j()}function $o(e){l.importantNotesItems=l.importantNotesItems.filter(t=>t.id!==e),j()}function Eo(e){O(l.importantNotesItems,e,"up")&&j()}function So(e){O(l.importantNotesItems,e,"down")&&j()}function Io(e){const t=l.importantNotesItems.find(o=>o.id===e);t&&(t.bold=!t.bold,j(),E())}function xo(e){const t=l.importantNotesItems.find(o=>o.id===e);t&&(t.italic=!t.italic,j(),E())}function Lo(e){const t=l.importantNotesItems.find(o=>o.id===e);t&&(t.underline=!t.underline,j(),E())}function To(){const e=document.getElementById("importantNotesItemsContainer");if(!e)return;e.innerHTML=l.importantNotesItems.map((o,n)=>{const r=S(String(o.id)),a=n===0,s=n===l.importantNotesItems.length-1;return`
            <div class="editable-item-row" data-item-id="${r}" draggable="true">
                <div class="entry-header">
                    <div class="entry-header-left">
                        <div class="drag-handle" title="Drag to reorder">
                            ${me({size:16})}
                        </div>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-up-important-notes" data-item-id="${o.id}" title="Move up" ${a?"disabled":""}>${q("up",{size:10})}</button>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-down-important-notes" data-item-id="${o.id}" title="Move down" ${s?"disabled":""}>${q("down",{size:10})}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-bold-important-notes" data-item-id="${o.id}" title="Bold" ${o.bold?'data-active="true"':""}>${qe({size:14})}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-italic-important-notes" data-item-id="${o.id}" title="Italic" ${o.italic?'data-active="true"':""}>${Oe({size:14})}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-underline-important-notes" data-item-id="${o.id}" title="Underline" ${o.underline?'data-active="true"':""}>${_e({size:14})}</button>
                    </div>
                    <div class="entry-controls">
                        <button type="button" class="item-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove-important-notes-item" data-item-id="${o.id}" title="Remove" aria-label="Remove important note">
                            ${X({size:16})}
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
        `}).join(""),e.querySelectorAll(".important-notes-item-text").forEach(o=>{o.addEventListener("input",n=>{const r=parseInt(n.target.dataset.itemId),a=l.importantNotesItems.find(s=>s.id===r);a&&(a.text=n.target.value,ie())})}),ge(e,l.importantNotesItems,j);const t=document.querySelector('[data-action="add-important-notes-item"]');t&&t.addEventListener("click",o=>{o.stopPropagation(),wo()}),e.querySelectorAll('[data-action="remove-important-notes-item"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);$o(r)})}),e.querySelectorAll('[data-action="move-up-important-notes"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);Eo(r)})}),e.querySelectorAll('[data-action="move-down-important-notes"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);So(r)})}),e.querySelectorAll('[data-action="toggle-bold-important-notes"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);Io(r)})}),e.querySelectorAll('[data-action="toggle-italic-important-notes"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);xo(r)})}),e.querySelectorAll('[data-action="toggle-underline-important-notes"]').forEach(o=>{o.addEventListener("click",n=>{const r=parseInt(n.currentTarget.dataset.itemId);Lo(r)})}),ae(e)}function j(){const e=document.getElementById("importantNotesWrapper");e&&(e.innerHTML=`
    <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
        <button type="button" class="btn btn-base btn-primary-base" data-action="add-important-notes-item" style="padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Item</button>
    </div>
    <div id="importantNotesItemsContainer"></div>
  `,To(),E())}function Qe(){if(!y.userProfile||!y.userProfile.storeDirections)return;const e=y.userProfile.storeDirections.trim();if(!e)return;const t=e.toLowerCase();l.importantNotesItems.some(n=>{if(!n||!n.text)return!1;const r=n.text.toLowerCase();return r.includes(t)||r.includes("find us at")||r.includes("directions")})||l.importantNotesItems.push({id:Date.now()+14,text:`Find us at ${e}`,bold:!1,italic:!1,underline:!1})}function Ko(){const e=he();l.howToShopItems.forEach(t=>{t.text&&t.text.startsWith("Email ")&&(t.text=`Email ${e}`)}),P()}function be(){if(l.howToShopItems.length===0){const e=_(),t=he();l.howToShopItems=[{id:Date.now()+1,text:"Visit us in-store for outlet-exclusive deals",bold:!1,italic:!1,underline:!1},{id:Date.now()+2,text:`Call ${e} for availability`,bold:!1,italic:!1,underline:!1},{id:Date.now()+3,text:"$20 flat-rate ground shipping in US",bold:!1,italic:!1,underline:!1},{id:Date.now()+4,text:`Email ${t}`,bold:!1,italic:!1,underline:!1}]}l.importantNotesItems.length===0&&(l.importantNotesItems=[{id:Date.now()+10,text:"*Select models only",bold:!1,italic:!1,underline:!1},{id:Date.now()+11,text:"See attached PDF for complete model details",bold:!1,italic:!1,underline:!1},{id:Date.now()+12,text:"Limited availability - while supplies last",bold:!1,italic:!1,underline:!1},{id:Date.now()+13,text:"Email response time up to 48 hours",bold:!1,italic:!1,underline:!1}],Qe())}function Ae(e){let o=!1;for(const n of e){if(n.type!=="application/pdf"){b(`✗ ${n.name} is not a PDF file`),o=!0;continue}if(n.size>10485760){const a=(n.size/1048576).toFixed(2);b(`✗ ${n.name} is too large (${a}MB). Max size is 10MB.`),o=!0;continue}if(l.attachedPDFs.some(a=>a.name===n.name)){b(`⚠ ${n.name} is already attached`);continue}const r=new FileReader;r.onload=async a=>{const s={id:Date.now()+Math.random(),name:n.name,size:n.size,type:n.type,data:a.target.result};let c=0;for(;!x&&c<20;)await new Promise(i=>setTimeout(i,50)),c++;try{x?(await ue(s),console.log(`PDF ${n.name} saved to IndexedDB with ID:`,s.id)):(console.warn("IndexedDB not initialized, PDF will not persist after refresh"),b("⚠ PDF saved to memory but may not persist after refresh"))}catch(i){console.warn("Failed to save PDF to IndexedDB:",i),b("⚠ PDF saved to memory but may not persist after refresh")}l.attachedPDFs.push(s),ee(),!o&&e.length===1&&b(`✓ ${n.name} attached successfully`)},r.onerror=()=>{b(`✗ Error reading ${n.name}`)},r.readAsDataURL(n)}!o&&e.length>1&&b(`✓ ${e.length} PDFs attached successfully`)}function ee(){const e=document.getElementById("attachedPDFsList");if(e){if(l.attachedPDFs.length===0){e.innerHTML="";return}e.innerHTML=l.attachedPDFs.map(t=>{const o=(t.size/1024).toFixed(1),n=(t.size/(1024*1024)).toFixed(2),r=t.size>1024*1024?`${n} MB`:`${o} KB`,a=!!t.data,s=a?"pdf-name-clickable":"pdf-name-disabled",c=a?`Click to preview ${t.name}`:`${t.name} - Preview unavailable (data not loaded)`,i=a?"":'<span style="color: #ff9800; margin-left: 0.5rem;" title="Preview unavailable">⚠</span>';return`
            <div class="attached-pdf-item" data-pdf-id="${t.id}">
                <div class="pdf-icon">
                    ${St()}
                </div>
                <div class="pdf-info">
                    <div class="pdf-name ${s}"
                         title="${c}"
                         ${a?'data-action="preview-pdf" data-pdf-id="'+t.id+'" role="button" tabindex="0"':""}>
                        ${t.name}${i}
                    </div>
                    <div class="pdf-size">${r}</div>
                </div>
                <button class="pdf-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove-pdf" data-pdf-id="${t.id}" title="Remove PDF" aria-label="Remove PDF attachment">
                    ${X({size:16})}
                </button>
            </div>
        `}).join(""),e.querySelectorAll('[data-action="preview-pdf"]').forEach(t=>{t.addEventListener("click",o=>{const n=parseFloat(o.currentTarget.dataset.pdfId);Me(n)}),t.addEventListener("keypress",o=>{if(o.key==="Enter"){const n=parseFloat(o.currentTarget.dataset.pdfId);Me(n)}})}),e.querySelectorAll('[data-action="remove-pdf"]').forEach(t=>{t.addEventListener("click",o=>{const n=parseFloat(o.currentTarget.dataset.pdfId);Co(n)})})}}async function Co(e){const t=l.attachedPDFs.find(o=>o.id===e);if(t){try{await He(e)}catch(o){console.warn("Failed to delete PDF from IndexedDB:",o)}l.attachedPDFs=l.attachedPDFs.filter(o=>o.id!==e),ee(),b(`✓ ${t.name} removed`)}}function Me(e){const t=l.attachedPDFs.find(s=>s.id===e);if(!t||!t.data){b("✗ PDF data not available for preview");return}Z=t;const o=document.getElementById("pdfPreviewModal"),n=document.getElementById("pdfPreviewIframe"),r=document.getElementById("pdfPreviewTitle"),a=document.getElementById("pdfDownloadBtn");if(!o||!n||!r||!a){console.error("PDF preview modal elements not found");return}try{const s=atob(t.data.split(",")[1]),c=new Array(s.length);for(let m=0;m<s.length;m++)c[m]=s.charCodeAt(m);const i=new Uint8Array(c),p=new Blob([i],{type:"application/pdf"});U&&URL.revokeObjectURL(U),U=URL.createObjectURL(p),n.src=U;const g=document.getElementById("pdfLoadingIndicator");g&&setTimeout(()=>{g.style.display="none"},500)}catch(s){console.error("Error creating blob URL for PDF:",s),b("✗ Could not display PDF preview");return}r.textContent=t.name,o.style.display="flex",setTimeout(()=>{o.classList.add("active")},10),o.focus()}function le(){const e=document.getElementById("pdfPreviewModal");e&&(e.classList.remove("active"),setTimeout(()=>{e.style.display="none"},300));const t=document.getElementById("pdfPreviewIframe");t&&(t.src="about:blank"),U&&(URL.revokeObjectURL(U),U=null),Z=null}function je(){if(!Z)return;const e=document.createElement("a");e.href=Z.data,e.download=Z.name,e.click()}function se(){const e=document.getElementById("subjectLinesContainer");if(!e)return;if(l.generatedSubjectLines.length===0){e.innerHTML='<div class="subject-lines-empty">Generate your email template first to create subject line suggestions</div>';return}const t=document.getElementById("selectedSubjectInput"),o=t?t.value:null,n=o!==null?o:l.selectedSubjectLine||"",r=l.generatedSubjectLines.map((c,i)=>{const p=c===l.selectedSubjectLine;return`<option value="${i}" ${p?"selected":""}>${F(c)}</option>`}).join("");e.innerHTML=`
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
    `;const a=document.getElementById("subjectLineDropdown");a&&a.addEventListener("change",c=>{const i=parseInt(c.target.value);i>=0&&i<l.generatedSubjectLines.length&&Bo(i)});const s=document.getElementById("selectedSubjectInput");s&&s.addEventListener("input",c=>{l.selectedSubjectLine=c.target.value;const i=document.getElementById("subjectCharCount");if(i){const g=c.target.value.length,m=g<=50;i.className=`char-count ${m?"optimal":"warning"}`,i.textContent=`${g} chars ${m?"✓":"(>50)"}`}const p=document.getElementById("subjectLineDropdown");p&&(p.value="")})}function ko(){const e=document.getElementById("promoDateRange")?.value||"",t=["Citizen","Bulova","Alpina","Frederique Constant"],o=[...new Set(l.promotionEntries.map(f=>f.line||"").flatMap(f=>t.filter(h=>f.toLowerCase().includes(h.toLowerCase()))).filter(Boolean))],n=/(\d+)[\s%]*%/,r=Math.max(0,...l.promotionEntries.map(f=>{const h=(f.line||"").match(n);return h&&parseInt(h[1],10)||0})),a=[],s={};l.promotionEntries.forEach(f=>{if(f.collections){const h=t.find(I=>(f.line||"").toLowerCase().includes(I.toLowerCase()));f.collections.split(",").forEach(I=>{const L=I.trim();L&&!a.includes(L)&&(a.push(L),h&&(s[h]||(s[h]=[]),s[h].push(L)))})}});const c=a.slice(0,3),i=l.promotionEntries.filter(f=>f.callout&&f.callout.trim()).map(f=>f.callout.toLowerCase()),p=i.some(f=>f.includes("limited")||f.includes("while supplies")),g=i.some(f=>f.includes("final")),m=f=>f>=50?`Up to ${f}% OFF`:f>=30?`Up to ${f}% OFF`:f>0?`Up to ${f}% OFF`:"Special Savings";let u=[];if(e){u.push(`Sale: ${e}`);const f=e.toLowerCase();(f.includes("fri")||f.includes("sat")||f.includes("sun"))&&u.push(`This Weekend: ${m(r)}`)}if(o.length>0&&r>0?o.length===1?u.push(`${o[0]}: ${m(r)}`):u.push(`${o[0]} & ${o[1]}: ${m(r)}`):o.length>0&&u.push(`${o[0]} Sale Event`),r>0&&u.push(`Up to ${r}% OFF This Week`),o.length>0&&c.length>0){const f=c.slice(0,3).join(", ");u.push(`${o[0]} including ${f}`)}if(o.length>=2&&s[o[0]]?.length>0&&s[o[1]]?.length>0){const f=s[o[0]][0],h=s[o[1]][0];u.push(`${o[0]} & ${o[1]} including ${f}, ${h}`)}p&&u.push("Limited Stock – Shop Now"),g&&u.push("Final Sale: Extra Savings Inside"),r>=30&&u.push(`Perfect Watch Gifts – Up to ${r}% OFF`),r>0&&u.push("Don't Miss These Watch Deals"),o.length>0&&u.push(`VIP Watch Sale: ${o[0]} & More`),u.push("Your New Watch Awaits"),r>=20&&u.push("Ready for a New Watch?"),u.length<3&&(r>0?u.push(`Up to ${r}% OFF – This Week Only`):u.push("New Deals This Week"));const v=[...new Set(u)],w=v.filter(f=>f.length<=60).sort((f,h)=>{const I=f.length>=20&&f.length<=45?0:1,L=h.length>=20&&h.length<=45?0:1;return I-L});l.generatedSubjectLines=w.length>0?w:v,l.selectedSubjectLine=l.generatedSubjectLines[0]||null,se()}function Bo(e){if(e>=0&&e<l.generatedSubjectLines.length){l.selectedSubjectLine=l.generatedSubjectLines[e];const t=document.getElementById("selectedSubjectCard");t&&(t.style.display="block");const o=document.getElementById("subjectLineDropdown");o&&(o.value=e);const n=document.getElementById("selectedSubjectInput");n&&(n.value=l.selectedSubjectLine);const r=document.getElementById("subjectCharCount");if(r){const a=l.selectedSubjectLine.length,s=a<=50;r.className=`char-count ${s?"optimal":"warning"}`,r.textContent=`${a} chars ${s?"✓":"(>50)"}`}}}function Fe(e){let t=F(e.text);return e.bold&&(t=`<strong>${t}</strong>`),e.italic&&(t=`<em>${t}</em>`),e.underline&&(t=`<u>${t}</u>`),t}function Do(e){const t=e.promoDateRange||"",o=e.promoTitle&&e.promoTitle.trim()?F(e.promoTitle):to(t),n=e.promoYear&&e.promoYear.trim()?e.promoYear.trim():new Date().getFullYear(),r=_();let a="";l.promotionEntries.forEach(u=>{if(!u.line&&(u.brand||u.discount)){const w=u.brand||"",f=u.discount?`${u.discount.toString().trim()}% OFF`:"",h=[w,f].filter(I=>I&&I.trim());u.line=h.join(" – ")}if(!u.line||!u.line.trim())return;let v="";u.collections&&u.collections.trim()&&(v=u.collections.split(",").map(f=>F(f.trim())).filter(f=>f).map(f=>`*${f}`).join(" • ")),a+=`
                <p style="font-size: 18px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-bottom: 8px;"><b>${F(u.line)}</b></p>`,v&&(a+=`
                <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-left: 20px; margin-top: 0; margin-bottom: ${u.callout?"5px":"20px"};">
                    ${v}
                </p>`),u.callout&&u.callout.trim()&&(a+=`
                <p style="font-size: 13px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-left: 20px; margin-top: 0; margin-bottom: 20px; color: #0066cc; font-style: italic;">
                    ${F(u.callout)}
                </p>`)});let s="7400 Las Vegas Blvd. South, Suite 231<br>Las Vegas, NV 89123",c="https://www.google.com/maps?q=36.05145495363422,-115.16933573536541",i=he(),p="Mon–Sat: 10AM–8PM | Sun: 10AM–7PM";if(y.userProfile){if(y.userProfile.storeAddress&&(s=y.userProfile.storeAddress.replace(/\n/g,"<br>")),y.userProfile.storeHours&&(p=y.userProfile.storeHours),y.userProfile.storePlusCode&&y.userProfile.storePlusCode.trim())c=`https://www.google.com/maps?q=${encodeURIComponent(y.userProfile.storePlusCode)}`;else if(y.userProfile.storeAddress&&y.userProfile.storeAddress.trim()){const u=y.userProfile.storeAddress.replace(/<br>/g," ").replace(/\n/g," ");c=`https://www.google.com/maps?q=${encodeURIComponent(u)}`}}let g=l.howToShopItems.filter(u=>u.text&&u.text.trim()).map(u=>`• ${Fe(u)}`).join(`<br>
                    `),m=l.importantNotesItems.filter(u=>u.text&&u.text.trim()).map(u=>`• ${Fe(u)}`).join(`<br>
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
                <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 10px 0 0 0;">${t}, ${n} • While Supplies Last</p>
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
</html>`}function Po(){const e=document.getElementById("pdfSectionContainer");if(!e)return;e.innerHTML=`
    <div class="field-help" style="margin-bottom: 0.75rem;">Upload PDF files to attach to your promotional email (max 10MB per file)</div>
    <div class="pdf-upload-section">
      <div class="pdf-upload-dropzone" id="pdfDropzone">
        <input type="file" id="pdfFileInput" accept=".pdf,application/pdf" multiple style="display: none;">
        <div class="dropzone-content">
          ${Et({size:48})}
          <p class="dropzone-text">Click to upload or drag and drop PDF files</p>
          <p class="dropzone-hint">Maximum 10MB per file</p>
        </div>
      </div>
      <div id="attachedPDFsList" class="attached-pdfs-list"></div>
    </div>
  `;const t=document.getElementById("pdfDropzone"),o=document.getElementById("pdfFileInput");t&&o&&(t.addEventListener("click",()=>o.click()),o.addEventListener("change",n=>{const r=Array.from(n.target.files);r.length>0&&Ae(r),o.value=""}),t.addEventListener("dragover",n=>{n.preventDefault(),t.classList.add("dragover")}),t.addEventListener("dragleave",n=>{n.preventDefault(),t.classList.remove("dragover")}),t.addEventListener("drop",n=>{n.preventDefault(),t.classList.remove("dragover");const r=Array.from(n.dataTransfer.files).filter(a=>a.type==="application/pdf");r.length>0?Ae(r):b("Please drop only PDF files")})),ee()}async function No(){if(!confirm("This will reset everything to defaults and cannot be undone. Continue?"))return;const e=document.getElementById("promoDateRange"),t=document.getElementById("promoYear"),o=document.getElementById("promoTitle");e&&(e.value=""),t&&(t.value=""),o&&(o.value=""),l.promotionEntries=[{id:Date.now(),line:"",collections:"",callout:""}],l.specialHours=[],l.howToShopItems=[],l.importantNotesItems=[],be();for(const c of l.attachedPDFs)try{await He(c.id)}catch(i){console.warn("Failed to delete PDF from IndexedDB:",i)}l.attachedPDFs=[],l.generatedSubjectLines=[],l.selectedSubjectLine=null;const n=document.getElementById("bulkEmailList");if(n){n.value="",n.dispatchEvent(new Event("input",{bubbles:!0}));try{await lt()}catch(c){console.warn("Failed to clear bulk recipients from IndexedDB:",c)}}localStorage.removeItem("savedPromotionTemplate"),H(),Y(),P(),j(),ee(),se();const r=document.getElementById("codeArea"),a=document.getElementById("previewIframe");r&&(r.value=""),a&&ye(a);const s=document.querySelector(".output-actions");s&&s.classList.remove("enabled"),b("Reset to defaults completed")}function Ao(){const e=document.getElementById("basicDetailsContainer");if(!e){console.error("Basic details container not found");return}e.innerHTML=`
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
  `;const t=document.getElementById("promoDateRange"),o=document.getElementById("promoYear"),n=document.getElementById("promoTitle");if(t){t.addEventListener("input",()=>{const a=document.querySelector('[data-clear="promoDateRange"]');a&&a.classList.toggle("visible",t.value.trim().length>0),E()});const r=document.querySelector('[data-clear="promoDateRange"]');r&&r.addEventListener("click",()=>{t.value="",r.classList.remove("visible"),t.focus(),E()})}if(o){o.addEventListener("input",()=>{const a=document.querySelector('[data-clear="promoYear"]');a&&a.classList.toggle("visible",o.value.trim().length>0),E()});const r=document.querySelector('[data-clear="promoYear"]');r&&r.addEventListener("click",()=>{o.value="",r.classList.remove("visible"),o.focus(),E()})}if(n){n.addEventListener("input",()=>{const a=document.querySelector('[data-clear="promoTitle"]');a&&a.classList.toggle("visible",n.value.trim().length>0),E()});const r=document.querySelector('[data-clear="promoTitle"]');r&&r.addEventListener("click",()=>{n.value="",r.classList.remove("visible"),n.focus(),E()})}}function Mo(){const e=document.getElementById("discountEntriesContainer");if(!e){console.error("Discount entries container not found");return}e.innerHTML=`
    <div class="form-group full-width">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <label class="form-label" style="margin-bottom: 0;">Promotion Entries</label>
            <button type="button" class="btn btn-base btn-primary-base" id="addEntryBtn" style="flex: 0 0 auto; padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Entry</button>
        </div>
        <div id="promotionEntriesContainer"></div>
    </div>
  `;const t=document.getElementById("addEntryBtn");t&&t.addEventListener("click",Xe)}function jo(){const e=document.getElementById("specialHoursContainer");if(!e){console.error("Special hours card container not found");return}e.innerHTML=`
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <label class="form-label" style="margin-bottom: 0;">Special Hours</label>
        <button type="button" class="btn btn-base btn-primary-base" id="addHourBtn" style="flex: 0 0 auto; padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Special Hours</button>
    </div>
    <div class="field-help" style="margin-bottom: 0.75rem;">For holidays or special sale hours (e.g., Black Friday extended hours)</div>
    <div id="specialHoursListContainer"></div>
    <div id="specialHoursReminder" style="display: none; background: #fff3cd; border-left: 3px solid #ffc107; padding: 1rem; margin-top: 1rem;">
        <strong>⚠️ Reminder:</strong> Don't forget to update your special hours on Yelp and Google Maps!
    </div>
  `;const t=document.getElementById("addHourBtn");t&&t.addEventListener("click",io)}function Fo(){const e=document.getElementById("howToShopContainer");if(!e){console.error("How to shop container not found");return}e.innerHTML=`
    <div class="form-group full-width">
        <div id="howToShopWrapper"></div>
    </div>
  `}function Ho(){const e=document.getElementById("importantNotesContainer");if(!e){console.error("Important notes container not found");return}e.innerHTML=`
    <div class="form-group full-width">
        <div id="importantNotesWrapper"></div>
    </div>
  `}function Zo(){Bt("promotion-email");const e=localStorage.getItem("savedPromotionTemplate");let t=null;if(e)try{t=JSON.parse(e)}catch(m){console.error("Error parsing saved template:",m),t=null}l.promotionEntries=[],l.specialHours=[],l.howToShopItems=[],l.importantNotesItems=[],l.attachedPDFs=[],l.generatedSubjectLines=[],l.selectedSubjectLine=null,Ao(),Mo(),jo(),Fo(),Ho(),Po(),Kt();const o=document.getElementById("pdfModalClose"),n=document.querySelector(".pdf-modal-backdrop"),r=document.getElementById("pdfDownloadBtn"),a=document.getElementById("pdfDownloadFallback");o&&o.addEventListener("click",le),n&&n.addEventListener("click",le),r&&r.addEventListener("click",je),a&&a.addEventListener("click",je),document.addEventListener("keydown",m=>{if(m.key==="Escape"){const u=document.getElementById("pdfPreviewModal");u&&u.style.display!=="none"&&le()}});const s=document.getElementById("saveTemplateBtnDuplicate"),c=document.getElementById("importTemplateBtnDuplicate"),i=document.getElementById("exportTemplateBtnDuplicate"),p=document.getElementById("startOverBtnDuplicate");s&&s.addEventListener("click",Xt),c&&c.addEventListener("click",Qt),i&&i.addEventListener("click",eo),p&&p.addEventListener("click",No),t?Ge(t,!0):(be(),Xe()),H(),Y(),P(),j(),se();const g=document.getElementById("previewIframe");g&&ye(g),console.log("Promotion UI module initialized")}function Go(){const e=localStorage.getItem("theme")||"light",t=localStorage.getItem("lightPalette")||"pastel",o=localStorage.getItem("darkPalette")||"midnight-blue";document.documentElement.setAttribute("data-theme",e),document.documentElement.setAttribute("data-light-palette",t),document.documentElement.setAttribute("data-dark-palette",o),et(e)}function zo(){const t=(document.documentElement.getAttribute("data-theme")||"light")==="light"?"dark":"light";document.documentElement.setAttribute("data-theme",t),localStorage.setItem("theme",t),et(t),C==="promotion-email"?E():C&&Q()}function et(e){const t=document.querySelector(".theme-toggle-slider");t&&(t.style.transform=e==="dark"?"translateX(20px)":"translateX(0)")}const Ro=300;function Xo(){document.querySelectorAll('a[href$=".html"]').forEach(e=>{e.hostname===window.location.hostname&&e.addEventListener("click",qo)})}function qo(e){if(e.metaKey||e.ctrlKey||e.shiftKey||e.currentTarget.target==="_blank")return;e.preventDefault();const t=e.currentTarget.getAttribute("href"),o=document.querySelector(".page-content"),n=document.querySelector(".header"),r=document.querySelector(".right-column"),a=document.querySelector(".column-skinny-wrapper.column-active");o||n?(o&&o.classList.add("fade-out"),n&&n.classList.add("fade-out"),r&&r.classList.add("fade-out"),a&&a.classList.add("fade-out"),setTimeout(()=>{window.location.href=t},Ro)):window.location.href=t}export{Xo as a,Oo as b,Jo as c,y as d,Zo as e,Lt as f,Jt as g,lt as h,Go as i,xt as j,_o as k,Yo as l,Vo as m,Wo as n,st as o,l as p,Uo as q,b as s,zo as t,Ko as u,ye as w};

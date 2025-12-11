(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))o(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const s of a.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&o(s)}).observe(document,{childList:!0,subtree:!0});function n(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function o(r){if(r.ep)return;r.ep=!0;const a=n(r);fetch(r.href,a)}})();let x=null;const rt="CitizenTemplates",at=2,z="promotionPDFs",R="bulkEmailRecipients";function On(){return new Promise(t=>{const e=window.indexedDB||window.webkitIndexedDB||window.mozIndexedDB;if(!e){console.warn("IndexedDB not supported, PDFs will not persist across refresh"),t(!1);return}const n=e.open(rt,at);n.onerror=()=>{console.warn("IndexedDB initialization failed:",n.error),t(!1)},n.onsuccess=()=>{x=n.result,console.log("IndexedDB initialized successfully"),t(!0)},n.onupgradeneeded=o=>{const r=o.target.result;r.objectStoreNames.contains(z)||r.createObjectStore(z,{keyPath:"id"}),r.objectStoreNames.contains(R)||r.createObjectStore(R,{keyPath:"id"})}})}function ue(t){return new Promise((e,n)=>{if(!x){n(new Error("IndexedDB not initialized"));return}const a=x.transaction([z],"readwrite").objectStore(z).put(t);a.onerror=()=>n(a.error),a.onsuccess=()=>e(t.id)})}function it(t){return new Promise((e,n)=>{if(!x){e(null);return}const a=x.transaction([z],"readonly").objectStore(z).get(t);a.onerror=()=>n(a.error),a.onsuccess=()=>e(a.result||null)})}function He(t){return new Promise((e,n)=>{if(!x){e();return}const a=x.transaction([z],"readwrite").objectStore(z).delete(t);a.onerror=()=>n(a.error),a.onsuccess=()=>e()})}function st(t){return new Promise((e,n)=>{if(!x){n(new Error("IndexedDB not initialized"));return}const a=x.transaction([R],"readwrite").objectStore(R).put({id:"bulk-email-recipients",data:t,savedAt:new Date().toISOString()});a.onerror=()=>n(a.error),a.onsuccess=()=>e()})}function _n(){return new Promise((t,e)=>{if(!x){t("");return}const r=x.transaction([R],"readonly").objectStore(R).get("bulk-email-recipients");r.onerror=()=>e(r.error),r.onsuccess=()=>{const a=r.result;t(a&&a.data?a.data:"")}})}function lt(){return new Promise((t,e)=>{if(!x){t();return}const r=x.transaction([R],"readwrite").objectStore(R).clear();r.onerror=()=>e(r.error),r.onsuccess=()=>t()})}const y={currentCategory:"all",currentTemplate:null,searchActive:!1,userProfile:null},V={companyName:"Citizen Watch America",storeName:"Citizen Company Store",defaultLocation:"the South Premium Outlets",defaultPhone:"702-357-8990"},ve=[{name:"Alpina",url:"https://us.alpinawatches.com/"},{name:"Bulova",url:"https://www.bulova.com/"},{name:"Citizen",url:"https://www.citizenwatch.com/"},{name:"Frederique Constant",url:"https://us.frederiqueconstant.com/"}],ct=["manager","director","supervisor","assistant manager"],$={fontFamily:"'Century Gothic', Aptos, Arial, sans-serif",colors:{primary:"#000000",secondary:"#2f2f2f",link:"#0000ee",environmental:"#0c8822"},fontSize:{name:"9pt",details:"8pt"}},we="Please consider the environment before printing this e-mail";function dt(){const t=y.userProfile||{};return{name:t.employeeName||"Employee Name",title:t.jobTitle||"Sales Associate",location:t.storeLocation||V.defaultLocation,address:t.storeAddress||"",phone:t.storePhone||V.defaultPhone,jobTitle:(t.jobTitle||"").toLowerCase(),companyEmail:t.companyEmail||"",storeEmail:t.storeEmail||""}}function ut(t,e,n){return ct.some(r=>t.includes(r))&&e?e:n||""}function $e(t,e){return e==="html"?`<p style="margin: 0; padding: 0;">
        <strong style="font-size: ${$.fontSize.name};">${D(t.name)}</strong> │ ${D(t.title)}
    </p>`:`${t.name} │ ${t.title}`}function Ee(t){const e="______________________________________________________________________";return t==="html"?`<p style="margin: 0; padding: 0; font-size: ${$.fontSize.details}; color: ${$.colors.secondary};">
        <strong>${e}</strong>
    </p>`:e}function Se(t,e){return e==="html"?`<p style="margin: 0; padding: 0; font-size: ${$.fontSize.details}; color: ${$.colors.secondary};">
        <strong>${V.companyName}</strong>
    </p>
    <p style="margin: 0; padding: 0; font-size: ${$.fontSize.details}; color: ${$.colors.secondary};">
        <strong>${V.storeName} - ${D(t.location)}</strong>
    </p>`:`${V.companyName}
${V.storeName} - ${t.location}`}function mt(t,e){if(!t.address||!t.address.trim())return"";const n=D(t.address);return e==="html"?`<p style="margin: 0; padding: 0; font-size: ${$.fontSize.details}; color: ${$.colors.secondary};">
        ${n.replace(/\n/g,"<br>")}
    </p>`:t.address}function Ie(t,e){return e==="html"?`<p style="margin: 0; padding: 0; font-size: ${$.fontSize.details}; color: ${$.colors.secondary};">
        Tel/SMS: ${D(t.phone)}
    </p>`:`Tel/SMS: ${t.phone}`}function pt(t,e){if(!t)return"";if(e==="html"){const n=t.split("@"),o=n[0]||"",r=n[1]||"";return`<p style="margin: 10px 0 0 0; padding: 0; font-size: ${$.fontSize.details}; color: ${$.colors.secondary};">
        Email: ${D(o)}<a href="mailto:${D(t)}" style="color: ${$.colors.link}; text-decoration: underline; font-size: ${$.fontSize.details};">@${D(r)}</a>
    </p>`}return`Email: ${t}`}function xe(t){if(t==="html"){const e=ve.map(n=>`<a href="${n.url}" style="color: ${$.colors.link}; text-decoration: underline; font-size: ${$.fontSize.details};">${n.name}</a>`).join(` <span style="color: ${$.colors.secondary};">|</span> `);return`<p style="margin: 4px 0; padding: 0; font-size: ${$.fontSize.details};">
        ${e}
    </p>`}return ve.map(e=>e.name).join(" | ")}function Le(t){return t==="html"?`<p style="margin: 4px 0; padding: 0; font-size: ${$.fontSize.details}; color: ${$.colors.environmental};">
        <strong>${we}</strong>
    </p>`:we}function ft(t="text"){const e=dt(),n=ut(e.jobTitle,e.companyEmail,e.storeEmail);if(t==="html")return`<div style="font-family: ${$.fontFamily}; font-size: ${$.fontSize.name}; color: ${$.colors.primary};">
    ${$e(e,t)}
    ${Ee(t)}
    ${Se(e,t)}
    ${mt(e,t)}
    ${Ie(e,t)}
    ${pt(n,t)}
    ${xe(t)}

    ${Le(t)}
</div>`;const o=e.address?`${e.address}
`:"",r=n?`
Email: ${n}
`:`
`;return`${$e(e,t)}
${Ee(t)}
${Se(e,t)}
${o}${Ie(e,t)}
${r}${xe(t)}

${Le(t)}`}const B=ft;function D(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}function S(t){return t.replace(/'/g,"&#39;").replace(/"/g,"&quot;")}function k(t){const e={};for(const[n,o]of Object.entries(t))typeof o=="string"?e[n]=D(o):e[n]=o;return e}function _(){return y.userProfile&&y.userProfile.storePhone?y.userProfile.storePhone:"702-357-8990"}function ce(){return y.userProfile&&y.userProfile.storeName?y.userProfile.storeName:"Citizen Company Store"}function ze(){return y.userProfile&&y.userProfile.storeLocation?y.userProfile.storeLocation:"the South Premium Outlets"}function gt(){return`Citizen Company Store at ${ze()}`}function ht(t){if(!t)return"";const e=i=>{const p=document.createElement("div");return p.textContent=i,p.innerHTML};let n=t;const o=[/\n\n-{5,}\n/,/______+/,/\n\n[A-Z][a-z]+ [A-Z][a-z]+ │ /];for(const i of o){const p=n.match(i);if(p){n=n.substring(0,p.index).trim();break}}const a=n.split(/\n\n+/).map(i=>{const p=i.split(`
`);return p.some(m=>m.trim())&&p.every(m=>{const u=m.trim();return!u||u.startsWith("•")||u.startsWith("-")})?`    <ul style="margin: 10px 0; padding-left: 20px; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt;">
${p.filter(u=>u.trim()).map(u=>{const v=u.replace(/^[•-]\s*/,"").trim();return`        <li style="margin: 5px 0;">${e(v)}</li>`}).join(`
`)}
    </ul>`:`    <p style="margin: 10px 0; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);">${i.split(`
`).map(u=>e(u)).join("<br>")}</p>`}),s=B("html");return`${a.join(`
`)}

    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
${s}
    </div>`}const yt={"new-customer-welcome":"Use after a customer visits the store for the first time. Adds them to VIP list. (Enhanced: editable subject, EML download)","back-in-stock":"Follow up when a previously unavailable item is back. Include hold deadline.","thank-you-warranty":"Send after purchase to explain warranty registration and care tips.","weekly-sale":"Personalized sale notification for customers who showed interest in specific collections. (Enhanced: editable subject, EML download)","new-model-arrival":"Alert interested customers when a specific model they asked about arrives. (Enhanced: editable subject, EML download)","limited-edition":"High-priority notification for VIP collectors about exclusive pieces. (Enhanced: editable subject, EML download)","vip-reconnection":"Re-engage customers who haven't visited in a while. Mention store evolution. (Enhanced: editable subject, EML download)","phone-confirmation":"Immediate confirmation after taking a phone order. Include all order details. (Enhanced: editable subject, EML download)","phone-shipped":"Send when order ships with UPS tracking. Mention signature requirement. (Enhanced: editable subject, EML download)","phone-under-500":"Internal approval request for phone orders under $500. Manager verification. (Enhanced: editable subject, EML download)","phone-corporate":"Corporate/bulk order approval. Include purpose and fulfilling store. (Enhanced: editable subject, EML download)","inter-store-notification":"Notify receiving store that order is prepared and ready for pickup. (Enhanced: editable subject, EML download)","text-availability":"Quick response to customer inquiry about specific model availability.","text-thank-you":"Post-purchase thank you via text. Keep it brief and friendly.","text-interest-followup":"Follow up on specific watch customer showed interest in. Use after store visit."},oe={customerName:{example:"John Smith",required:!0},employeeName:{example:"Your name",required:!0},yourName:{example:"Your name",required:!0},brand:{example:"Citizen",required:!0,suggestions:["Citizen","Bulova","Frederique Constant"]},modelName:{example:"Eco-Drive Promaster",required:!0},modelNumber:{example:"BN0150-28E",required:!1},price:{example:"299",required:!0,validation:"currency"},discount:{example:"20",required:!0,validation:"number",dependent:!0},msrp:{example:"399",required:!0,validation:"currency",dependent:!0},quantity:{example:"2",required:!0,validation:"number"},unitsQuantity:{example:"1",required:!0,validation:"number"},totalAmount:{example:"299.00",required:!0,validation:"currency"},closingTime:{example:"9:00 PM",required:!0},endDate:{example:"Sunday",required:!0},holdDeadline:{example:"Friday 5PM",required:!0},trackingNumber:{example:"1Z999AA10123456784",required:!1,validation:"tracking"},customerId:{example:"C12345",required:!0},employeeId:{example:"E789",required:!0},warrantyLength:{example:"5-year",required:!0},warrantyYears:{example:"5",required:!0,validation:"number"},carrier:{example:"UPS",required:!0,suggestions:["UPS","FedEx","USPS"]},promoDateRange:{example:"Nov 28 - Dec 1",required:!0},promoYear:{example:"2024-2025",required:!1},promoTitle:{example:"Leave blank for auto-generation",required:!1},promoBrand:{example:"Citizen",required:!0,suggestions:["Citizen","Bulova","Alpina","Frederique Constant"]},promoDiscount:{example:"60",required:!0,validation:"number"},promoCollections:{example:"Corso, Avion, Marine Star",required:!1},promoCallout:{example:"Optional special note",required:!1},keyFeature1:{example:"Eco-Drive technology",required:!1},keyFeature2:{example:"Solar powered",required:!1},keyFeature3:{example:"Water resistant to 200m",required:!1},limitedDetails:{example:"Limited to 100 pieces worldwide",required:!0},quantityAvailable:{example:"5",required:!0,validation:"number"},customerAddress:{example:"123 Main St, City, State 12345",required:!0},managerNameOrStoreName:{example:"Store Manager or Store Name",required:!0},creditCardVerified:{example:"Yes",required:!0,suggestions:["Yes","No"]},needsManagerVerification:{example:"Yes",required:!0,suggestions:["Yes","No"]},fulfillingStore:{example:"Las Vegas Premium Outlets",required:!0},recipientStoreName:{example:"Los Angeles Premium Outlets",required:!0},collectionName:{example:"Eco-Drive Collection",required:!0},model1:{example:"Eco-Drive Promaster",required:!0},price1:{example:"299",required:!0,validation:"currency"},original1:{example:"399",required:!0,validation:"currency"},model2:{example:"Eco-Drive Satellite Wave",required:!1},price2:{example:"349",required:!1,validation:"currency"},original2:{example:"449",required:!1,validation:"currency"}};function bt(t){return(oe[t]||{}).suggestions||[]}function W(t,e){const n=[];if(e.forEach(o=>{const r=oe[o];if(r&&r.required){const a=t[o];(a==null||a.toString().trim()==="")&&n.push(o)}}),n.length>0)throw new Error(`Required fields are missing or empty: ${n.join(", ")}`)}function Te(t){return`Hi ${t},

`}function Ce(){return`

Best regards,
${B()}`}function vt(t,e){return(t*(1-e/100)).toFixed(2)}const T={"new-customer-welcome":{name:"New Customer Welcome",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","employeeName"],generate:t=>{W(t,["customerName","employeeName"]);const e=k(t);return`Subject: Welcome to Citizen Company Store - Your VIP Access

${Te(e.customerName)}Thank you for visiting our Citizen Company Store outlet location! It was a pleasure helping you explore our offerings today.

I've added you to our VIP email list for weekly promotional updates featuring exclusive outlet pricing on our timepieces.

Please don't hesitate to reach out by replying to this email or call the store at ${_()}. I would be happy to check availability on any models you're considering.${Ce()}`}},"new-model-arrival":{name:"New Model Arrival",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","keyFeature1","keyFeature2","keyFeature3","price","employeeName"],generate:t=>{W(t,["customerName","brand","modelName","modelNumber","keyFeature1","price","employeeName"]);const e=k(t),n=[e.keyFeature1,e.keyFeature2,e.keyFeature3].filter(o=>o&&o.trim()).map(o=>`• ${o}`).join(`
`);return`Subject: Great News! ${e.modelName} Now Available

${Te(e.customerName)}Great news! The ${e.brand} ${e.modelName} (${e.modelNumber}) you were interested in has arrived at our store.

Key Features:
${n}

Current price: ${e.price}

I'd be happy to set up an appointment to show you all the features of this watch and let you try it on. This model tends to generate a lot of interest, so I wanted to reach out to you first.

Would you like to schedule a time to see it in person? Please reply to this email or call the store at ${_()}.

Looking forward to hearing from you!${Ce()}`}},"limited-edition":{name:"Limited Edition",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","limitedDetails","price","quantityAvailable","employeeName"],generate:t=>{W(t,["customerName","brand","modelName","modelNumber","limitedDetails","price","quantityAvailable","employeeName"]);const e=k(t);return`Subject: Exclusive: Limited Edition ${e.modelName} Available

Hi ${e.customerName},

I wanted to reach out to you personally because we just received a ${e.brand} ${e.modelName} (${e.modelNumber}) - ${e.limitedDetails}.

As someone who appreciates fine timepieces and unique additions to your collection, I thought you'd want to know about this immediately.

Price: ${e.price}
Availability: Only ${e.quantityAvailable} available

This is truly a special piece that won't last long. I'd love to show it to you in person and discuss how it could complement your collection.

Can you stop by this week, or would you like me to hold one for you? Please reply to this email or call the store at ${_()}.

Best regards,
${B()}

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
${B()}

P.S. - We now carry everything from current season pieces to discontinued treasures, giving you more options than ever before.`},"phone-confirmation":{name:"Confirmation",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","price","discount","totalAmount","customerAddress","carrier","trackingNumber","employeeName"],generate:t=>{W(t,["customerName","brand","modelName","modelNumber","price","discount","totalAmount","customerAddress","carrier","employeeName"]);const e=k(t);let n="";return e.trackingNumber&&(n=`

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

Your order will ship within 1-2 business days via ${e.carrier}. You'll receive tracking information at this email address once shipped.${n}

If you have any questions, please don't hesitate to contact us at ${_()}.

Thank you for shopping with ${ce()}!

Best regards,
${B()}`}},"phone-shipped":{name:"Shipped with Tracking",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","brand","modelName","modelNumber","trackingNumber","customerAddress","carrier","employeeName"],generate:t=>{W(t,["customerName","brand","modelName","modelNumber","trackingNumber","customerAddress","carrier","employeeName"]);const e=k(t);return`Subject: Your Watch Order - Tracking Information

Hi ${e.customerName},

Thank you for your recent purchase from ${ce()}! We're pleased to confirm that your order has been shipped and is on its way to you.

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
${B()}`}},"phone-under-500":{name:"Under $500 Request",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["managerNameOrStoreName","customerName","customerId","employeeName","employeeId","unitsQuantity","totalAmount","creditCardVerified","needsManagerVerification"],generate:t=>{const e=k(t);if(!e.creditCardVerified||e.creditCardVerified.toLowerCase()!=="yes")throw new Error("Credit card must be verified before generating this order form.");let n="";return e.needsManagerVerification&&e.needsManagerVerification.toLowerCase()==="yes"?n="Ready for manager verification":n="Credit card manager verified - Ready for processing",`Subject: Phone Order Form for ${e.customerName}

Hi ${e.managerNameOrStoreName},

Attached is the form for the phone order for ${e.customerName} (${e.customerId}).

Ringing under: ${e.employeeName} (${e.employeeId})
Units: ${e.unitsQuantity}
Total: ${e.totalAmount}

Order Status: ${n}

Best regards,
${B()}`}},"phone-corporate":{name:"Corporate Approval",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","customerId","employeeName","employeeId","unitsQuantity","totalAmount","fulfillingStore"],generate:t=>{const e=k(t);return`Subject: Phone Order Approval Request - ${e.customerName}

Hello,

I am forwarding a request for approval on a phone order for ${e.employeeName} (${e.employeeId}).

There are ${e.unitsQuantity} units totaling ${e.totalAmount}. It will be fulfilled at ${e.fulfillingStore}.

Customer: ${e.customerName} (${e.customerId})

I have verified and signed off. Please let us know if you have any questions.

 Best regards,
 ${B()}`}},"inter-store-notification":{name:"Inter-Store Notification",category:"Phone Orders",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["recipientStoreName","customerName","trackingNumber"],generate:t=>{const e=k(t);return`Subject: Phone Order Processed and Shipped - ${e.customerName}

Hi ${e.recipientStoreName} Team,

The phone order for ${e.customerName} has been rung and labeled for shipping.

UPS Tracking Number: ${e.trackingNumber}

The package has been prepared and is ready for UPS pickup.

Best regards,
${B()}`}},"text-availability":{name:"Availability Response",category:"Text",fields:["customerName","modelName","price","closingTime"],generate:t=>{const e=k(t);return`Hi ${e.customerName}! Yes, we have the ${e.modelName} in stock. Current price is ${e.price} with our outlet discount. We're open until ${e.closingTime} today if you'd like to stop by, or I can hold it.`}},"text-thank-you":{name:"Thank You",category:"Text",fields:["customerName","modelName","warrantyLength","brand"],generate:t=>{const e=k(t);return`${e.customerName}, thank you for your purchase today! Your ${e.modelName} comes with a ${e.warrantyLength} warranty. Reach out anytime at ${_()} for any questions. Enjoy your new ${e.brand}!`}},"text-interest-followup":{name:"Sale Alert",category:"Text",fields:["customerName","employeeName","modelName","discount","msrp","endDate"],generate:t=>{W(t,["customerName","employeeName","modelName","discount","msrp","endDate"]);const e=k(t),n=parseFloat(e.msrp),o=parseFloat(e.discount);if(isNaN(n)||n<=0)throw new Error("MSRP must be a valid positive number");if(isNaN(o)||o<0||o>100)throw new Error("Discount must be a valid percentage between 0 and 100");const r=vt(n,o);return`Hi ${e.customerName}! This is ${e.employeeName} from ${gt()}. The ${e.modelName} you were interested in is on ${e.discount}% OFF promotion (MSRP ${e.msrp} now ${r} plus tax) until ${e.endDate}. Please let me know if you'd like me to hold one for you. Thank you!`}},"weekly-sale":{name:"Weekly Sale",category:"Customer Email",hasEditableSubject:!0,supportsEML:!0,supportsMailto:!0,fields:["customerName","collectionName","discount","brand","model1","price1","original1","model2","price2","original2","endDate","employeeName"],generate:t=>{const e=k(t),o=[{name:e.model1,price:e.price1,original:e.original1},{name:e.model2,price:e.price2,original:e.original2}].filter(r=>r.name&&r.price).map(r=>`• ${r.name} - Now ${r.price} (was ${r.original})`).join(`
`);return`Subject: ${e.customerName}, This Week's ${e.brand} Sale Includes Your Favorites

Hi ${e.customerName},

I remember you were looking at ${e.collectionName} pieces during your last visit. Good timing - we just started our ${e.discount}% off promotion on select ${e.brand} models this week!

Specifically available in that collection:
${o}

This promotion runs through ${e.endDate}. Would you like me to check if we have your size preference in stock?

${B()}`}}},re={chevronDown:"M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z",chevronUp:"M1.707 8.707L6 4.414l4.293 4.293a1 1 0 001.414-1.414l-5-5a1 1 0 00-1.414 0l-5 5a1 1 0 101.414 1.414z",close:"M18 6L6 18M6 6l12 12",profile:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2",profileCircle:"M12 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",save:"M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z",import:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",export:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",reset:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5",eyePreview:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z",eyeCircle:"M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",codeBrackets:"M16 18l6-6-6-6M8 6l-6 6 6 6",email:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z",emailFlap:"M22 6l-10 7L2 6",errorCircle:"M12 12a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",errorLine:"M12 8v4M12 16h.01",warning:"M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",upload:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",pdfDoc:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",pdfDocCorner:"M14 2v6h6"};function q(t,{size:e=12,className:n=""}={}){const r=re[t==="up"?"chevronUp":"chevronDown"],a=n?` class="${n}"`:"";return`<svg width="${e}" height="${e}" viewBox="0 0 12 12" fill="currentColor"${a}><path d="${r}"/></svg>`}function me({size:t=16,className:e=""}={}){const n=e?` class="${e}"`:"";return`<svg width="${t}" height="${t}" viewBox="0 0 16 16" fill="currentColor"${n}>
    <circle cx="4" cy="3" r="1.5"/>
    <circle cx="4" cy="8" r="1.5"/>
    <circle cx="4" cy="13" r="1.5"/>
    <circle cx="12" cy="3" r="1.5"/>
    <circle cx="12" cy="8" r="1.5"/>
    <circle cx="12" cy="13" r="1.5"/>
  </svg>`}function X({size:t=16,className:e=""}={}){const n=e?` class="${e}"`:"";return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${n}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`}function Re({size:t=16,className:e=""}={}){const n=e?` class="${e}"`:"";return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${n}>
    <path d="${re.email}"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>`}function wt({size:t=16,className:e=""}={}){const n=e?` class="${e}"`:"";return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${n}>
    <path d="${re.eyePreview}"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>`}function $t({size:t=16,className:e=""}={}){const n=e?` class="${e}"`:"";return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${n}>
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
  </svg>`}function Et({size:t=48,className:e=""}={}){const n=e?` class="${e}"`:"";return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${n}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>`}function St({size:t=24,className:e=""}={}){return`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${e?` class="${e}"`:""}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <text x="12" y="17" font-size="6" text-anchor="middle" fill="currentColor">PDF</text>
  </svg>`}function Un({size:t=14,className:e=""}={}){const n=e?` class="${e}"`:"";return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${n}>
    <path d="${re.warning}"/>
  </svg>`}function qe({size:t=16,className:e=""}={}){const n=e?` class="${e}"`:"";return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${n}>
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
  </svg>`}function Oe({size:t=16,className:e=""}={}){const n=e?` class="${e}"`:"";return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${n}>
    <line x1="19" y1="4" x2="10" y2="4"></line>
    <line x1="14" y1="20" x2="5" y2="20"></line>
    <line x1="15" y1="4" x2="9" y2="20"></line>
  </svg>`}function _e({size:t=16,className:e=""}={}){const n=e?` class="${e}"`:"";return`<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${n}>
    <path d="M6 4v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4"></path>
    <line x1="4" y1="21" x2="20" y2="21"></line>
  </svg>`}function ke(t){const e=document.createElement("div");e.innerHTML=t;let n="";const o=r=>{if(r.nodeType===3)n+=r.textContent;else if(r.nodeType===1){const a=r.tagName.toLowerCase();(a==="p"||a==="div"||a==="h1"||a==="h2"||a==="h3"||a==="br")&&n&&!n.endsWith(`\r
`)&&(n+=`\r
\r
`);for(let s=0;s<r.childNodes.length;s++)o(r.childNodes[s]);(a==="p"||a==="div")&&r.nextSibling&&(n.endsWith(`\r
`)||(n+=`\r
`))}};return o(e),n=n.replace(/\r\n\r\n\r\n+/g,`\r
\r
`).trim()+`\r
`,n}function te(t){const n=new TextEncoder().encode(t);let o="";for(let r=0;r<n.length;r++){const a=n[r],s=String.fromCharCode(a);if(s==="=")o+="=3D";else if(a<32||a>126)if(a===9||a===10||a===13)o+=s;else{const c=a.toString(16).toUpperCase().padStart(2,"0");o+="="+c}else o+=s}return o}function Ue(t){let e=!0;for(let a=0;a<t.length;a++)if(t.charCodeAt(a)>127){e=!1;break}if(e)return t;const n=new TextEncoder().encode(t),o=Array.from(n,a=>String.fromCodePoint(a)).join("");return`=?UTF-8?B?${btoa(o)}?=`}function It(t){const e=new TextEncoder().encode(t),n=Array.from(e,o=>String.fromCodePoint(o)).join("");return btoa(n)}function Ye(t){let e=!0;for(let o=0;o<t.length;o++)if(t.charCodeAt(o)>127){e=!1;break}return e?`filename="${t}"`:`filename*=UTF-8''${encodeURIComponent(t)}`}function xt(t){return/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(String(t).toLowerCase())}function Yn(t){const e=t.split(/[\s,;\n]+/).map(n=>n.trim().toLowerCase()).filter(Boolean);return[...new Set(e)]}async function Lt(t,e,n,o,r,a,s=[]){const c=Date.now().toString(16),i=`_000_DM6PR11MB2683${c}DM6PR11MB2683namp_`,p=`_000_ALT_${c}_ALT_`,g=s&&s.length>0;let m=`Subject: ${Ue(r)}\r
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
`}return m}function Tt(t){if(!t)return null;const e=t.indexOf("While Supplies Last");if(e===-1)return null;const n=Math.max(0,e-200),r=t.substring(n,e).match(/([A-Za-z]+\s+\d+(?:\s*-\s*[A-Za-z]+\s+\d+)?),\s*(\d{4})\s*•\s*While Supplies Last/);return r?`${r[1]}, ${r[2]}`:null}function Ct(t){if(!t)return"";const e={January:"Jan",February:"Feb",March:"Mar",April:"Apr",May:"May",June:"Jun",July:"Jul",August:"Aug",September:"Sep",October:"Oct",November:"Nov",December:"Dec"},n=t.match(/^([A-Za-z]+)\s+(\d+)(?:\s*-\s*([A-Za-z]+)\s+(\d+))?,?\s*(\d{4})$/);if(n){const[,o,r,a,s,c]=n,i=e[o]||o.substring(0,3),p=a?e[a]||a.substring(0,3):i;return a&&s?`${i}${r}-${p}${s}.${c}`:`${i}${r}.${c}`}return t.replace(/[^a-zA-Z0-9]/g,"").substring(0,20)}function Wn(t){const e=Tt(t);if(e)return`Promo-email.${Ct(e)}.zip`;{const n=new Date,o=String(n.getMonth()+1).padStart(2,"0"),r=String(n.getDate()).padStart(2,"0");return`Promo-email.${n.getFullYear()}-${o}-${r}.zip`}}function Vn(t,e,n,o=[],r="eml",a=1){const s=n.filter(f=>xt(f)?!0:(console.warn(`Invalid email address skipped in batch ${a}: ${f}`),!1)),c="----=_NextPart_"+Date.now()+"_"+a+"_"+Math.random().toString(36).substr(2,9);let i="";i+=`Subject: ${Ue(t)}\r
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
`),v=It(m).match(/.{1,76}/g)||[];i+=v.join(`\r
`),i+=`\r
\r
`,o&&o.length>0&&o.forEach((f,h)=>{if(!f.data){console.warn(`Skipping PDF ${f.name} - no data available (may need to re-upload)`);return}const I=f.data.split(",");if(I.length!==2||!I[0].includes("base64")){console.error(`Invalid PDF data format for attachment ${h+1} (${f.name}) in batch ${a}`);return}const L=I[1];if(!L||L.length===0){console.error(`Empty PDF data for attachment ${h+1} (${f.name}) in batch ${a}`);return}i+=`--${c}\r
`,i+=`Content-Type: application/pdf; name="${f.name}"\r
`,i+=`Content-Transfer-Encoding: base64\r
`,i+=`Content-Disposition: attachment; ${Ye(f.name)}\r
`,i+=`\r
`;const N=L.match(/.{1,76}/g)||[];i+=N.join(`\r
`),i+=`\r
\r
`}),i+=`--${c}--\r
`;const w=a.toString().padStart(3,"0");return{format:r,data:new TextEncoder().encode(i),filename:`batch-email${w}.${r}`}}function F(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}function pe(t){const e=r=>F(r);return t.split(/\n\n+/).map(r=>{if(!r.trim())return"";const a=r.split(`
`);return a.some(i=>i.trim())&&a.every(i=>{const p=i.trim();return!p||p.startsWith("•")||p.startsWith("-")})?`    <ul style="margin: 10px 0; padding-left: 20px; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt;">
${a.filter(p=>p.trim()).map(p=>{const g=p.replace(/^[•-]\s*/,"").trim();return`        <li style="margin: 5px 0;">${e(g)}</li>`}).join(`
`)}
    </ul>`:`    <p style="margin: 10px 0; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);">${a.map(i=>e(i)).join("<br>")}</p>`}).filter(r=>r).join(`
`)}function kt(t){let e="Email Preview",n=t;if(window.originalMessageContent){const r=window.originalMessageContent.match(/^Subject:\s*(.+)/m);r&&(e=r[1],n=window.originalMessageContent.replace(/^Subject:.+\n/m,"").trim())}else{const r=t.match(/^Subject:\s*(.+)/m);r&&(e=r[1],n=t.replace(/^Subject:.+\n/m,"").trim())}return`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${F(e)}</title>
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
            <div class="email-subject">${F(e)}</div>
        </div>
        <div class="email-body">
            ${n}
        </div>
    </div>
</body>
</html>`}let C=null;function Bt(t){C=t}function We(t){return t?/<(p|div|span|br|html|body|head|table|tr|td|ul|ol|li|h[1-6]|strong|em|a)\b[^>]*>/i.test(t):!1}const d={};function Dt(){d.templateSelect=document.getElementById("templateSelect"),d.formFields=document.getElementById("formFields"),d.formSectionTitle=document.getElementById("formSectionTitle"),d.outputCard=document.getElementById("outputCard"),d.outputArea=document.getElementById("outputArea"),d.generateBtn=document.getElementById("generateBtn"),d.clearBtn=document.getElementById("clearBtn"),d.copyBtn=document.getElementById("copyBtn"),d.sendEmailBtn=document.getElementById("sendEmailBtn"),d.downloadEmailBtn=document.getElementById("downloadEmailBtn"),d.themeToggle=document.getElementById("themeToggle"),d.searchBox=document.getElementById("searchBox"),d.clearSearch=document.getElementById("clearSearch"),d.searchResults=document.getElementById("searchResults"),d.resultCounter=document.getElementById("resultCounter")}function ne(t){return document.getElementById(t)}function A(t,e=2500){const n=document.getElementById("toast");if(!n){console.warn("Toast element not found");return}n.textContent=t,n.classList.add("show"),setTimeout(()=>{n.classList.remove("show")},e)}function Ve(){if(!d.outputCard)return;d.outputArea=null,d.copyBtn=null,d.subjectLineContainer=null,d.sendEmailBtn=null,d.downloadEmailBtn=null,d.previewTab=null,d.htmlTab=null,d.previewContentRegular=null,d.htmlContentRegular=null,d.emailPreview=null;const t=T[C],e=t&&t.hasEditableSubject;let n="",o="";if(e?(n=`
            <div id="subjectLineContainer" class="subject-line-section" style="margin-bottom: 1.5rem;">
                <div id="subjectLineContent"></div>
            </div>
        `,o=`
            <div class="button-group">
                <button class="btn" id="copyBtn" title="Copy the message to clipboard">Copy Message</button>
                <button class="btn" id="sendEmailBtn" title="Open your default email client with this message">Send Email</button>
                <button class="btn" id="downloadEmailBtn" title="Download an Outlook-compatible EML file">Download Email File</button>
            </div>
        `):o=`
            <div class="button-group">
                <button class="btn" id="copyBtn">Copy Message</button>
            </div>
        `,d.outputCard.innerHTML=`
        <h2 class="section-title">Generated Message</h2>
        ${n}

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

        ${o}
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
</html>`;d.outputArea.value=u}}})),e){const r=document.getElementById("sendEmailBtn"),a=document.getElementById("downloadEmailBtn");r&&r.addEventListener("click",()=>{const c=document.getElementById("outputArea"),i=c?c.value:"";i&&Ht(C,i)}),a&&a.addEventListener("click",()=>{const c=document.getElementById("outputArea"),i=window.originalMessageContent||(c?c.value:"");i&&zt(C,i)});const s=document.getElementById("subjectLineContent");s&&Ke(s,"")}}function fe(t){if(!t)return;const e=t.contentDocument||t.contentWindow.document;if(!e)return;const n=getComputedStyle(document.documentElement),o=n.getPropertyValue("--bg-tertiary").trim()||"#f8f3ef",r=n.getPropertyValue("--text-primary").trim()||"#2a2420",a=n.getPropertyValue("--text-secondary").trim()||"#666";e.open(),e.write(`
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
                    background: ${o};
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
    `),e.close()}function Pt(){const t=navigator.platform.toLowerCase();return t.includes("win")?"windows":t.includes("mac")?"mac":"other"}function Nt(){return Pt()==="mac"?"emltpl":"eml"}function At(){try{const t=localStorage.getItem("userProfile");t&&(y.userProfile=JSON.parse(t))}catch(t){console.error("Error loading user profile:",t)}}function Je(){d.templateSelect.addEventListener("change",()=>{de(d.templateSelect.value)}),d.generateBtn.addEventListener("click",jt),d.clearBtn.addEventListener("click",Ft),d.themeToggle.addEventListener("click",zn),d.searchBox.addEventListener("input",()=>{const e=d.searchBox.value.trim();d.clearSearch.classList.toggle("visible",e.length>0),Be(e)}),d.clearSearch.addEventListener("click",()=>{d.searchBox.value="",d.clearSearch.classList.remove("visible"),Be("")});const t=document.querySelector(".search-container");document.addEventListener("click",e=>{t&&!t.contains(e.target)&&d.searchResults&&d.searchResults.classList.remove("visible")}),d.searchResults&&d.searchResults.addEventListener("click",e=>{const n=e.target.closest(".search-result-item");if(n&&n.dataset.templateKey){const o=n.dataset.templateKey;de(o),d.searchBox.value="",d.searchBox.classList.remove("active"),d.clearSearch.classList.remove("visible"),d.searchResults.classList.remove("visible")}})}function Mt(t){const e=t.id,n=T[C];if(!n)return;const o=n.fields.find(i=>i.id===e);if(!o||!o.validation)return;const{pattern:r,message:a}=o.validation,s=r.test(t.value);t.classList.toggle("invalid",!s);let c=t.nextElementSibling;return(!c||!c.classList.contains("validation-msg"))&&(c=document.createElement("div"),c.className="validation-msg",t.parentNode.insertBefore(c,t.nextSibling)),c.textContent=s?"":a,c.style.display=s?"none":"block",s}function jt(){const t=T[C];if(!t){A("Please select a template first");return}const e={};let n=!0,o=null;if(t.fields.forEach(s=>{const c=ne(s);c&&(e[s]=c.value,(oe[s]||{}).validation&&(Mt(c)||(n=!1,o||(o=c))))}),!n){A("✗ Please fix the errors in the form"),o&&o.focus();return}const r=t.generate(e);Ve();const a=ne("outputArea");if(a&&(a.value=r),window.originalMessageContent=r,Q(),t.hasEditableSubject){const s=G(r),c=document.getElementById("subjectLineContent");c&&Ke(c,s)}d.outputCard.scrollIntoView({behavior:"smooth"})}function Ft(){const t=T[C];t&&t.fields.forEach(e=>{const n=ne(e.id);if(n){n.value="",n.classList.remove("invalid");const o=n.nextElementSibling;o&&o.classList.contains("validation-msg")&&(o.style.display="none")}}),d.outputArea&&(d.outputArea.value=""),d.outputCard&&(d.outputCard.innerHTML=""),Q(),A("✓ Form cleared")}function G(t){const e=t.match(/^Subject:\s*(.*)/im);return e?e[1]:""}function Ke(t,e){window.currentSubjectLine=e,t.innerHTML=`
        <div class="editable-subject-line">
            <label for="subjectInput" class="form-label">Subject:</label>
            <input type="text" id="subjectInput" class="form-input" value="${S(e)}">
        </div>
    `;const n=document.getElementById("subjectInput");n&&n.addEventListener("input",o=>{window.currentSubjectLine=o.target.value,debouncedSubjectPreviewUpdate(o.target.value)})}function Ht(t,e){const n=T[t];if(!n)return;let o="",r=e;n.hasEditableSubject?(o=window.currentSubjectLine||G(e),r=r.replace(/^Subject:.*\r?\n/im,"")):(o=G(e),r=r.replace(/^Subject:.*\r?\n/im,""));const a=ht(r),s=`mailto:?subject=${encodeURIComponent(o)}&body=${encodeURIComponent(a)}`,c=document.createElement("a");c.href=s,document.body.appendChild(c),c.click(),document.body.removeChild(c)}function zt(t,e){const n=T[t];if(!n)return;let o="",r=e;n.hasEditableSubject?(o=window.currentSubjectLine||G(e),r=e.replace(/^Subject:.*\r?\n/im,"")):(o=G(e),r=e.replace(/^Subject:.*\r?\n/im,""));const a=We(r);let s;if(a)s=r;else{let p=r;const g=r.match(/\n\nBest regards,/);g&&(p=r.substring(0,g.index+g[0].length).trim());const m=pe(p),u=B("html");s=`<html>
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
</html>`}const c=y.userProfile.name||`${ce()} ${ze()}`,i=y.userProfile.email||"store@citizenwatchgroup.com";Lt(c,i,"","",o,s,[]).then(p=>{const g=new Blob([p],{type:"message/rfc822"}),m=URL.createObjectURL(g),u=document.createElement("a");u.href=m;const v=o.replace(/[^a-z0-9]/gi,"_").toLowerCase(),f=Nt()==="emltpl"?".emltpl":".eml";u.download=`${v}${f}`,u.click(),URL.revokeObjectURL(m)})}function Jn(){Dt(),At(),Ot(),Je();const t=localStorage.getItem("selectedTemplate");t&&T[t]&&de(t)}function Rt(){const t=document.getElementById("emailPreview");t&&fe(t)}function qt(){return`
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
  `}function Q(){const t=document.getElementById("outputArea"),e=document.getElementById("emailPreview"),n=document.querySelector('.output-tab[data-tab="preview"]'),o=document.getElementById("previewContent"),r=document.getElementById("htmlContent");if(!t||!e)return;const a=t.value;if(!a){fe(e);return}const s=We(a),c=document.querySelector('.output-tab[data-tab="html"]');if(n){n.disabled=!1,n.style.opacity="1",n.style.cursor="pointer",n.classList.add("active"),c&&c.classList.remove("active"),o&&o.classList.add("active"),r&&r.classList.remove("active");let i;if(s)i=kt(a);else{let m="Email Preview",u=a;const v=a.match(/^Subject:\s*(.+)/m);v&&(m=v[1],u=a.replace(/^Subject:.+\n/m,"").trim());let w=u;const f=w.match(/\n\nBest regards,/);if(f)w=w.substring(0,f.index+f[0].length).trim();else{const L=w.match(/______+/);if(L){const N=w.substring(0,L.index),J=N.lastIndexOf(`

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
</html>`}const p=document.documentElement.getAttribute("data-theme")||"light";let g=i;p==="dark"&&(g=i.replace("</head>",`<style id="dark-mode-sim">${qt()}</style></head>`)),e.srcdoc=g}}function Ot(){const t={"Customer Email":[],"Phone Orders":[],Text:[]};Object.keys(T).forEach(e=>{const n=T[e];t[n.category].push({key:e,name:n.name})}),d.templateSelect.innerHTML='<option value="">Select a template...</option>',Object.keys(t).forEach(e=>{if(t[e].length>0){const n=document.createElement("optgroup");n.label=e,t[e].forEach(o=>{const r=document.createElement("option");r.value=o.key,r.textContent=o.name,r.title=yt[o.key]||"",n.appendChild(r)}),d.templateSelect.appendChild(n)}})}function Be(t){if(!t.trim()){d.searchResults.classList.remove("visible"),d.resultCounter.textContent="",d.clearSearch.classList.remove("visible"),d.searchBox.classList.remove("active");return}d.clearSearch.classList.add("visible"),d.searchBox.classList.add("active");const e=t.toLowerCase(),n=Object.keys(T).filter(a=>{const s=T[a];return s.name.toLowerCase().includes(e)||s.category.toLowerCase().includes(e)});let o="";if(n.length===0)o='<div class="search-result-item" style="cursor: default; color: var(--text-tertiary);">No templates found</div>',d.resultCounter.textContent="0 templates found";else{o=n.map(i=>{const p=T[i],g=D(p.name),m=D(p.category);return`
                <div class="search-result-item" data-template-key="${S(i)}">
                    <div class="search-result-name">${g}</div>
                    <div class="search-result-category">${m}</div>
                </div>
            `}).join("");const s=n.length,c=s===1?"":"s";d.resultCounter.textContent=`${s} template${c} found`}const r=d.resultCounter;d.searchResults.innerHTML=o,d.searchResults.appendChild(r),d.searchResults.classList.add("visible")}let De=null,Pe=!1;function de(t){try{if(!t||!T[t]){console.warn("Invalid template key:",t);return}if(t===De&&Pe)return;Pe=!0,De=t,C=t;const e=T[t];Rt(),window.originalMessageContent="";const n=ne("outputArea");n&&(n.value=""),localStorage.setItem("selectedTemplate",t),d.templateSelect.value=t;const o=document.querySelector(".section-header-with-controls");if(o){const i=document.createElement("h2");i.id="formSectionTitle",i.className="section-title",i.textContent=`${e.name} Fields`,o.replaceWith(i),d.formSectionTitle=i}else d.formSectionTitle.textContent=`${e.name} Fields`;const r=document.getElementById("formPlaceholder");r&&r.remove(),Ve();const a=e.fields.map(i=>{const p=i.replace(/([A-Z])/g," $1").trim(),g=p.charAt(0).toUpperCase()+p.slice(1),m=i.includes("address")||i.includes("Address")||i.includes("Details"),u=i.includes("Verified")||i.includes("Verification"),v=oe[i]||{},w=m?" full-width":"",f=v.required?" *":"",h=S(i),I=S(v.example||"");if(u)return`
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
                `;const L=bt(i),N=`datalist-${h}`;let J="";if(L.length>0){const nt=L.map(ot=>`<option value="${S(ot)}">`).join("");J=`
                <datalist id="${N}">
                    ${nt}
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
            `});d.formFields.innerHTML=a.join(""),setTimeout(()=>{Je()},0),d.formFields.addEventListener("click",i=>{if(i.target.classList.contains("clear-input")){const p=i.target.dataset.clear,g=document.getElementById(p);g&&(g.value="",i.target.classList.remove("visible"),g.focus(),Q())}}),d.formFields.addEventListener("input",i=>{if(i.target.classList.contains("form-input")||i.target.classList.contains("form-textarea")){const p=i.target.id,g=d.formFields.querySelector(`[data-clear="${p}"]`);g&&g.classList.toggle("visible",i.target.value.trim().length>0)}}),d.formFields.querySelectorAll(".form-input, .form-textarea").forEach(i=>{const p=d.formFields.querySelector(`[data-clear="${i.id}"]`);p&&i.value.trim().length>0&&p.classList.add("visible")});const c=document.getElementById("outputArea");c&&(c.value=""),d.clearBtn.disabled=!1}catch(e){console.error("Error selecting template:",e),A("Error loading template")}}function _t(){const t=document.getElementById("outputArea");if(!t){console.error("outputArea element not found"),A("⚠ Output area not found");return}const e=t.value;if(!e){A("⚠ Nothing to copy");return}if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(e).then(()=>{A("✓ Copied!")}).catch(n=>{console.error("Clipboard error:",n),A("⚠ Copy failed")});else try{t.select();const n=document.execCommand("copy");A(n?"✓ Copied!":"⚠ Copy failed")}catch(n){console.error("Copy error:",n),A("⚠ Copy not supported")}}const l={promotionEntries:[],specialHours:[],howToShopItems:[],importantNotesItems:[],attachedPDFs:[],generatedSubjectLines:[],selectedSubjectLine:null,howToShopExpanded:!1,importantNotesExpanded:!1,entryCollapsedStates:{}};function M(t){return JSON.parse(JSON.stringify(t))}function Ut({promoDateRange:t="",promoYear:e="",promoTitle:n="",bulkEmailRecipients:o="",promotionEntries:r=[],specialHours:a=[],howToShopItems:s=[],importantNotesItems:c=[],attachedPDFs:i=[],generatedSubjectLines:p=[],selectedSubjectLine:g=null,now:m=new Date}){const u=o||"",v=i.map(w=>({id:w.id,name:w.name,size:w.size,type:w.type}));return{templateType:"promotion-email",version:"1.0",savedAt:m.toISOString(),dateRange:t||"",year:e||"",title:n||"",bulkEmailRecipients:u,promotionEntries:M(r),specialHours:M(a),howToShopItems:M(s),importantNotesItems:M(c),attachedPDFs:M(v),generatedSubjectLines:M(p),selectedSubjectLine:g}}function Yt({promoDateRange:t="",promoYear:e="",promoTitle:n="",bulkEmailRecipients:o="",promotionEntries:r=[],specialHours:a=[],howToShopItems:s=[],importantNotesItems:c=[],attachedPDFs:i=[],generatedSubjectLines:p=[],selectedSubjectLine:g=null,now:m=new Date}){return{templateType:"promotion-email",version:"1.0",exportedAt:m.toISOString(),dateRange:t||"",year:e||"",title:n||"",promotionEntries:M(r),specialHours:M(a),attachedPDFs:M(i),generatedSubjectLines:M(p),selectedSubjectLine:g}}function Wt(t){if(!t||typeof t!="object")return{ok:!1,reason:"notObject"};const e=M(t);if(e.templateType&&e.templateType!=="promotion-email")return{ok:!1,reason:"wrongType"};function n(r,a){if(!Array.isArray(e[r])){if(e[r]!==void 0)return a;e[r]=[]}return null}const o=[n("promotionEntries","promotionEntriesNotArray"),n("specialHours","specialHoursNotArray"),n("howToShopItems","howToShopItemsNotArray"),n("importantNotesItems","importantNotesItemsNotArray")].filter(Boolean);return o.length>0?{ok:!1,reason:o[0]}:(Array.isArray(e.attachedPDFs)||(e.attachedPDFs=[]),Array.isArray(e.generatedSubjectLines)||(e.generatedSubjectLines=[]),{ok:!0,config:e})}function ae(t){t.querySelectorAll(".clear-input").forEach(e=>{const n=e.dataset.clear,o=document.getElementById(n);if(!o)return;const r=()=>{e.classList.toggle("visible",o.value.trim().length>0)};r(),o.addEventListener("input",r),e.addEventListener("click",()=>{o.value="",e.classList.remove("visible"),o.focus(),o.dispatchEvent(new Event("input",{bubbles:!0}))})})}function O(t,e,n,o="id"){const r=t.findIndex(a=>a[o]===e);return n==="up"&&r>0?([t[r-1],t[r]]=[t[r],t[r-1]],!0):n==="down"&&r<t.length-1?([t[r],t[r+1]]=[t[r+1],t[r]],!0):!1}function ge(t,e,n,o=".editable-item-row"){const r=t.querySelectorAll(o);let a=null,s=null;r.forEach(c=>{c.addEventListener("dragstart",i=>{a=c,s=parseInt(c.dataset.itemId||c.dataset.entryId,10),c.classList.add("dragging"),i.dataTransfer.effectAllowed="move"}),c.addEventListener("dragend",()=>{c.classList.remove("dragging"),r.forEach(i=>i.classList.remove("drag-over"))}),c.addEventListener("dragover",i=>{i.preventDefault(),i.dataTransfer.dropEffect="move",a!==c&&c.classList.add("drag-over")}),c.addEventListener("dragleave",()=>{c.classList.remove("drag-over")}),c.addEventListener("drop",i=>{if(i.preventDefault(),c.classList.remove("drag-over"),a!==c){const p=parseInt(c.dataset.itemId||c.dataset.entryId,10),g=e.findIndex(u=>u.id===s),m=e.findIndex(u=>u.id===p);if(g!==-1&&m!==-1){const[u]=e.splice(g,1);e.splice(m,0,u),n()}}})})}function Vt(){const t=localStorage.getItem("userProfile");return t?JSON.parse(t):null}function he(){const t=Vt();return t?.storeEmail?t.storeEmail:t?.storeName?`${t.storeName.toLowerCase().replace(/\s+/g,"")}@citizenwatchgroup.com`:"store@citizenwatchgroup.com"}function Ze(){const t=navigator.platform.toLowerCase();return t.includes("win")?"windows":t.includes("mac")?"mac":"other"}function Jt(){return Ze()==="mac"?"emltpl":"eml"}function Kt(){const t=document.getElementById("formatStatusText");if(!t)return;const e=Ze(),n=Jt(),o=n==="emltpl"?"Template":"EML",r=n==="emltpl"?".emltpl":".eml";let a="Unknown";e==="windows"?a="Windows":e==="mac"?a="macOS":a="Other Platform",t.innerHTML=`<strong>${o} Format:</strong> Optimized for ${a} (${r} files)`}function Zt(t,e){let n;return function(...r){const a=()=>{clearTimeout(n),t(...r)};clearTimeout(n),n=setTimeout(a,e)}}function b(t,e=2500){const n=document.getElementById("toast");if(!n){console.warn("Toast element not found");return}n.textContent=t,n.classList.add("show"),setTimeout(()=>{n.classList.remove("show")},e)}function ye(t){if(!t)return;const e=t.contentDocument||t.contentWindow.document;if(!e)return;const n=getComputedStyle(document.documentElement),o=n.getPropertyValue("--bg-tertiary").trim()||"#f8f3ef",r=n.getPropertyValue("--text-primary").trim()||"#2a2420",a=n.getPropertyValue("--text-secondary").trim()||"#666";e.open(),e.write(`
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
                    background: ${o};
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
    `),e.close()}let Z=null,U=null;function Gt(){return`
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
  `}function E(){if(C!=="promotion-email")return;const t=document.getElementById("previewIframe");if(!t)return;const e=document.getElementById("promoDateRange");if(!e||!e.value.trim()){ye(t);return}const n=document.getElementById("promoYear"),o=document.getElementById("promoTitle"),r={promoDateRange:e.value,promoYear:n?n.value:"",promoTitle:o?o.value:""},a=Dn(r),s=document.getElementById("codeArea");s&&(s.value=a);const c=document.documentElement.getAttribute("data-theme")||"light";let i=a;c==="dark"&&(i=a.replace("</head>",`<style id="dark-mode-sim">${Gt()}</style></head>`));const p=t.contentDocument||t.contentWindow.document;p.open(),p.write(i),p.close(),l.generatedSubjectLines.length===0&&kn()}const ie=Zt(E,500);async function Xt(){if(C!=="promotion-email")return;if(l.promotionEntries.forEach(o=>{l.entryCollapsedStates[o.id]=!0}),H(),l.attachedPDFs.length>0&&x){for(const o of l.attachedPDFs)if(o.data)try{await ue(o),console.log(`Re-saved PDF ${o.name} to IndexedDB during template save`)}catch(r){console.warn(`Failed to save PDF ${o.name} to IndexedDB:`,r)}}const t=document.getElementById("bulkEmailList"),e=t?t.value:"",n=Ut({promoDateRange:document.getElementById("promoDateRange")?.value||"",promoYear:document.getElementById("promoYear")?.value||"",promoTitle:document.getElementById("promoTitle")?.value||"",bulkEmailRecipients:e,promotionEntries:l.promotionEntries,specialHours:l.specialHours,howToShopItems:l.howToShopItems,importantNotesItems:l.importantNotesItems,attachedPDFs:l.attachedPDFs,generatedSubjectLines:l.generatedSubjectLines,selectedSubjectLine:l.selectedSubjectLine});try{e&&x&&await st(e)}catch(o){console.warn("Failed to save bulk email recipients to IndexedDB during template save:",o)}localStorage.setItem("savedPromotionTemplate",JSON.stringify(n)),b("✓ Template saved successfully")}function Qt(){if(C!=="promotion-email")return;const t=document.createElement("input");t.type="file",t.accept=".json,application/json",t.style.display="none",t.addEventListener("change",e=>{const n=e.target.files[0];if(!n)return;const o=new FileReader;o.onload=r=>{try{const a=JSON.parse(r.target.result);if(!a||typeof a!="object"){b("✗ Invalid template file - not a valid configuration object");return}if(a.templateType&&a.templateType!=="promotion-email"){b("✗ Invalid template file - not a promotion email template");return}if(!("promotionEntries"in a)||!("specialHours"in a)){b("✗ Invalid template file - missing required promotion template fields");return}Ge(a,!0),b("✓ Template imported from file successfully")}catch(a){console.error("Import error:",a),b("✗ Error reading template file - Invalid JSON or corrupted file")}},o.onerror=()=>{b("✗ Error reading file")},o.readAsText(n)}),document.body.appendChild(t),t.click(),setTimeout(()=>{document.body.removeChild(t)},1e3)}async function Ge(t,e=!0){const n=Wt(t);if(!n.ok){switch(n.reason){case"notObject":b("✗ Invalid template data - not an object");break;case"wrongType":b("✗ Invalid template data - wrong template type");break;case"promotionEntriesNotArray":b("✗ Invalid template data - promotionEntries must be an array");break;case"specialHoursNotArray":b("✗ Invalid template data - specialHours must be an array");break;case"howToShopItemsNotArray":b("✗ Invalid template data - howToShopItems must be an array");break;case"importantNotesItemsNotArray":b("✗ Invalid template data - importantNotesItems must be an array");break;default:b("✗ Invalid template data")}return}const o=n.config;setTimeout(()=>{const s=document.getElementById("promoDateRange"),c=document.getElementById("promoYear"),i=document.getElementById("promoTitle"),p=document.getElementById("bulkEmailList");if(s){s.value=o.dateRange||"";const g=document.querySelector('[data-clear="promoDateRange"]');g&&s.value.trim()&&g.classList.add("visible")}if(c){c.value=o.year||"";const g=document.querySelector('[data-clear="promoYear"]');g&&c.value.trim()&&g.classList.add("visible")}if(i){i.value=o.title||"";const g=document.querySelector('[data-clear="promoTitle"]');g&&i.value.trim()&&g.classList.add("visible")}p&&o.bulkEmailRecipients!=null&&(Array.isArray(o.bulkEmailRecipients)?p.value=o.bulkEmailRecipients.join(", "):typeof o.bulkEmailRecipients=="string"&&(p.value=o.bulkEmailRecipients),p.value&&p.dispatchEvent(new Event("input",{bubbles:!0}))),E()},100),l.promotionEntries=JSON.parse(JSON.stringify(o.promotionEntries||[])),l.specialHours=JSON.parse(JSON.stringify(o.specialHours||[])),o.howToShopItems&&o.howToShopItems.length>0&&(l.howToShopItems=JSON.parse(JSON.stringify(o.howToShopItems))),o.importantNotesItems&&o.importantNotesItems.length>0&&(l.importantNotesItems=JSON.parse(JSON.stringify(o.importantNotesItems))),be(),Qe(),l.generatedSubjectLines=JSON.parse(JSON.stringify(o.generatedSubjectLines||[])),l.selectedSubjectLine=o.selectedSubjectLine||null;const r=new Set(l.attachedPDFs.map(s=>s.id));l.attachedPDFs=[];const a=o.attachedPDFs||[];if(a.length>0){let s=0;for(;!x&&s<20;)await new Promise(c=>setTimeout(c,50)),s++;x||console.warn("IndexedDB not initialized after waiting, PDFs may not have data")}for(const s of a)if(!r.has(s.id))if(s.data){l.attachedPDFs.push(s);try{await ue(s)}catch(c){console.warn(`Failed to save PDF ${s.name} to IndexedDB:`,c)}}else try{const c=await it(s.id);c&&c.data?l.attachedPDFs.push(c):console.warn(`PDF ${s.name} (ID: ${s.id}) data not found in IndexedDB or config, skipping.`)}catch(c){console.warn(`Failed to restore PDF ${s.name} from IndexedDB:`,c)}l.attachedPDFs=l.attachedPDFs.filter(s=>s.data),e&&(l.entryCollapsedStates={},l.promotionEntries.forEach(s=>{l.entryCollapsedStates[s.id]=!0})),H(),Y(),P(),j(),ee(),se(),E()}function en(){if(C!=="promotion-email")return;const t=document.getElementById("bulkEmailList"),e=t?t.value:"",n=Yt({promoDateRange:document.getElementById("promoDateRange")?.value||"",promoYear:document.getElementById("promoYear")?.value||"",promoTitle:document.getElementById("promoTitle")?.value||"",bulkEmailRecipients:e,promotionEntries:l.promotionEntries,specialHours:l.specialHours,howToShopItems:l.howToShopItems,importantNotesItems:l.importantNotesItems,attachedPDFs:l.attachedPDFs,generatedSubjectLines:l.generatedSubjectLines,selectedSubjectLine:l.selectedSubjectLine}),o=JSON.stringify(n,null,2),r=new Blob([o],{type:"application/json"}),a=URL.createObjectURL(r),s=document.createElement("a");s.href=a,s.download=`promotion-template-${new Date().toISOString().split("T")[0]}.json`,s.click(),URL.revokeObjectURL(a),b("✓ Template exported successfully")}function tn(t){if(!t)return"WEEKLY SALE";const e=t.toLowerCase();return e.includes("nov")&&(e.includes("24")||e.includes("25")||e.includes("26")||e.includes("27")||e.includes("28")||e.includes("29"))?"BLACK FRIDAY OUTLET EVENT":e.includes("nov")&&e.includes("30")||e.includes("dec")&&e.includes("1")&&!e.includes("10")?"CYBER MONDAY SALE":e.includes("dec")?"HOLIDAY SALE EVENT":e.includes("jun")||e.includes("jul")||e.includes("aug")?"SUMMER CLEARANCE":e.includes("aug")&&(e.includes("20")||e.includes("2")||e.includes("3"))||e.includes("sep")&&(e.includes("1")||e.includes("2")||e.includes("3")||e.includes("4")||e.includes("5")||e.includes("6")||e.includes("7")||e.includes("8")||e.includes("9"))?"BACK TO SCHOOL SALE":"WEEKLY SALE"}function Xe(){const t=Date.now();l.promotionEntries.push({id:t,line:"",collections:"",callout:""}),H()}function nn(t){l.promotionEntries=l.promotionEntries.filter(e=>e.id!==t),H()}function on(t){O(l.promotionEntries,t,"up")&&H()}function rn(t){O(l.promotionEntries,t,"down")&&H()}function an(t){const e=!l.entryCollapsedStates[t];l.entryCollapsedStates[t]=e;const n=document.querySelector(`.promotion-entry[data-entry-id="${t}"]`);if(n){const o=n.querySelector(".entry-fields"),r=n.querySelector(".collapse-btn"),a=n.querySelector(".entry-header-left");o&&(o.style.display=e?"none":"grid"),r&&(r.textContent=e?"Expand":"Collapse",r.title=e?"Expand":"Collapse"),n.classList.toggle("collapsed",e);let s=a?.querySelector(".entry-summary");if(e){if(!s&&a){const i=l.promotionEntries.find(p=>p.id===t)?.line?.trim()||"Entry not filled out";s=document.createElement("span"),s.className="entry-summary",s.textContent=i,a.appendChild(s)}}else s&&s.remove()}}function Ne(t){const e=parseInt(t.target.dataset.entryId),n=l.promotionEntries.find(o=>o.id===e);n&&(t.target.classList.contains("entry-line")?n.line=t.target.value:t.target.classList.contains("entry-collections")?n.collections=t.target.value:t.target.classList.contains("entry-callout")&&(n.callout=t.target.value))}function H(){const t=document.getElementById("promotionEntriesContainer");t&&(t.innerHTML=l.promotionEntries.map((e,n)=>{const o=S(String(e.id)),r=n===0,a=n===l.promotionEntries.length-1,s=l.entryCollapsedStates[e.id]||!1;let c="";return e.line&&e.line.trim()?c=e.line.trim():c="Entry not filled out",`
            <div class="promotion-entry ${s?"collapsed":""}" data-entry-id="${o}" draggable="true">
                <div class="entry-header">
                    <div class="entry-header-left">
                        <div class="drag-handle" title="Drag to reorder">
                            ${me({size:16})}
                        </div>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-up" data-entry-id="${e.id}" title="Move up" ${r?"disabled":""}>${q("up",{size:10})}</button>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-down" data-entry-id="${e.id}" title="Move down" ${a?"disabled":""}>${q("down",{size:10})}</button>
                        <span class="entry-number">Entry ${n+1}</span>
                        ${s?`<span class="entry-summary">${F(c)}</span>`:""}
                    </div>
                    <div class="entry-controls">
                        <button type="button" class="collapse-btn btn-base btn-secondary-base btn-xs" data-action="toggle-collapse" data-entry-id="${e.id}" title="${s?"Expand":"Collapse"}">
                            ${s?"Expand":"Collapse"}
                        </button>
                        <button type="button" class="entry-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove" data-entry-id="${e.id}" title="Remove" aria-label="Remove entry">
                            ${X({size:16})}
                        </button>
                    </div>
                </div>

                <div class="entry-fields" style="display: ${s?"none":"grid"};">
                    <div class="form-group full-width">
                        <label class="form-label" for="entry-${o}-line">Promotion Line *</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-input entry-line" id="entry-${o}-line" name="entry-${o}-line" data-entry-id="${o}" value="${S(e.line||"")}" placeholder="CITIZEN – ADDITIONAL 20% OFF">
                            <button class="clear-input" data-clear="entry-${o}-line" title="Clear">×</button>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label class="form-label" for="entry-${o}-collections">Collections (comma-separated)</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-input entry-collections" id="entry-${o}-collections" name="entry-${o}-collections" data-entry-id="${o}" value="${S(e.collections)}" placeholder="Corso, Avion, Marine Star">
                            <button class="clear-input" data-clear="entry-${o}-collections" title="Clear">×</button>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label class="form-label" for="entry-${o}-callout">Special Callout (optional)</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-input entry-callout" id="entry-${o}-callout" name="entry-${o}-callout" data-entry-id="${o}" value="${S(e.callout)}" placeholder="Final sale items excluded">
                            <button class="clear-input" data-clear="entry-${o}-callout" title="Clear">×</button>
                        </div>
                    </div>
                </div>
            </div>
        `}).join(""),t.querySelectorAll(".entry-line, .entry-collections, .entry-callout").forEach(e=>{e.addEventListener("input",n=>{Ne(n),ie()}),e.addEventListener("change",n=>{Ne(n),E()})}),ge(t,l.promotionEntries,H,".promotion-entry"),t.querySelectorAll("[data-action]").forEach(e=>{e.addEventListener("click",n=>{const o=n.currentTarget.dataset.action,r=parseInt(n.currentTarget.dataset.entryId);switch(o){case"move-up":on(r);break;case"move-down":rn(r);break;case"toggle-collapse":an(r);break;case"remove":nn(r);break}})}),ae(t),E())}function sn(){const t=Date.now();l.specialHours.push({id:t,day:"",hours:""}),Y()}function ln(t){l.specialHours=l.specialHours.filter(e=>e.id!==t),Y()}function cn(t){O(l.specialHours,t,"up")&&Y()}function dn(t){O(l.specialHours,t,"down")&&Y()}function un(t){const e=parseInt(t.target.dataset.hourId),n=l.specialHours.find(o=>o.id===e);n&&(t.target.classList.contains("hour-day")?n.day=t.target.value:t.target.classList.contains("hour-hours")&&(n.hours=t.target.value))}function Y(){const t=document.getElementById("specialHoursListContainer");if(!t)return;t.innerHTML=l.specialHours.map((n,o)=>{const r=S(String(n.id)),a=o===0,s=o===l.specialHours.length-1;return`
            <div class="special-hour-row" data-hour-id="${r}">
                <div class="special-hour-fields">
                    <div class="form-group">
                        <div class="input-wrapper">
                            <input type="text" class="form-input hour-day" id="hour-${r}-day" name="hour-${r}-day" data-hour-id="${r}" value="${S(n.day)}" placeholder="e.g., Friday Nov 29">
                            <button class="clear-input" data-clear="hour-${r}-day" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <div class="input-wrapper">
                            <input type="text" class="form-input hour-hours" id="hour-${r}-hours" name="hour-${r}-hours" data-hour-id="${r}" value="${S(n.hours)}" placeholder="e.g., 6AM–10PM or CLOSED">
                            <button class="clear-input" data-clear="hour-${r}-hours" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="hour-controls">
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-hour-up" data-hour-id="${n.id}" title="Move up" ${a?"disabled":""}>${q("up",{size:10})}</button>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-hour-down" data-hour-id="${n.id}" title="Move down" ${s?"disabled":""}>${q("down",{size:10})}</button>
                        <button type="button" class="hour-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove-hour" data-hour-id="${n.id}" title="Remove" aria-label="Remove special hour">
                            ${X({size:16})}
                        </button>
                    </div>
                </div>
            </div>
        `}).join(""),t.querySelectorAll(".hour-day, .hour-hours").forEach(n=>{n.addEventListener("input",o=>{un(o),ie(),debouncedCaptureState()})}),t.querySelectorAll('[data-action^="move-hour"], [data-action="remove-hour"]').forEach(n=>{n.addEventListener("click",o=>{const r=o.currentTarget.dataset.action,a=parseInt(o.currentTarget.dataset.hourId);switch(r){case"move-hour-up":cn(a);break;case"move-hour-down":dn(a);break;case"remove-hour":ln(a);break}})}),ae(t),E();const e=document.getElementById("specialHoursReminder");e&&(e.style.display=l.specialHours.length>0?"block":"none")}function mn(){const t=Date.now();l.howToShopItems.push({id:t,text:"",bold:!1,italic:!1,underline:!1}),P()}function pn(t){l.howToShopItems=l.howToShopItems.filter(e=>e.id!==t),P()}function fn(t){O(l.howToShopItems,t,"up")&&P()}function gn(t){O(l.howToShopItems,t,"down")&&P()}function hn(t){const e=l.howToShopItems.find(n=>n.id===t);e&&(e.bold=!e.bold,P(),E())}function yn(t){const e=l.howToShopItems.find(n=>n.id===t);e&&(e.italic=!e.italic,P(),E())}function bn(t){const e=l.howToShopItems.find(n=>n.id===t);e&&(e.underline=!e.underline,P(),E())}function vn(){const t=document.getElementById("howToShopItemsContainer");if(!t)return;t.innerHTML=l.howToShopItems.map((n,o)=>{const r=S(String(n.id)),a=o===0,s=o===l.howToShopItems.length-1;return`
            <div class="editable-item-row" data-item-id="${r}" draggable="true">
                <div class="entry-header">
                    <div class="entry-header-left">
                        <div class="drag-handle" title="Drag to reorder">
                            ${me({size:16})}
                        </div>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-up-how-to-shop" data-item-id="${n.id}" title="Move up" ${a?"disabled":""}>${q("up",{size:10})}</button>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-down-how-to-shop" data-item-id="${n.id}" title="Move down" ${s?"disabled":""}>${q("down",{size:10})}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-bold-how-to-shop" data-item-id="${n.id}" title="Bold" ${n.bold?'data-active="true"':""}>${qe({size:14})}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-italic-how-to-shop" data-item-id="${n.id}" title="Italic" ${n.italic?'data-active="true"':""}>${Oe({size:14})}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-underline-how-to-shop" data-item-id="${n.id}" title="Underline" ${n.underline?'data-active="true"':""}>${_e({size:14})}</button>
                    </div>
                    <div class="entry-controls">
                        <button type="button" class="item-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove-how-to-shop-item" data-item-id="${n.id}" title="Remove" aria-label="Remove shopping item">
                            ${X({size:16})}
                        </button>
                    </div>
                </div>
                <div class="form-group" style="margin-top: 0.5rem;">
                    <div class="input-wrapper">
                        <input type="text" class="form-input shop-item-text" id="shop-item-${r}-text" name="shop-item-${r}-text" data-item-id="${r}" value="${S(n.text)}" placeholder="e.g., Visit us in-store for outlet-exclusive deals">
                        <button class="clear-input" data-clear="shop-item-${r}-text" title="Clear">×</button>
                    </div>
                </div>
            </div>
        `}).join(""),t.querySelectorAll(".shop-item-text").forEach(n=>{n.addEventListener("input",o=>{const r=parseInt(o.target.dataset.itemId),a=l.howToShopItems.find(s=>s.id===r);a&&(a.text=o.target.value,ie())})}),ge(t,l.howToShopItems,P);const e=document.querySelector('[data-action="add-how-to-shop-item"]');e&&e.addEventListener("click",n=>{n.stopPropagation(),mn()}),t.querySelectorAll('[data-action="remove-how-to-shop-item"]').forEach(n=>{n.addEventListener("click",o=>{const r=parseInt(o.currentTarget.dataset.itemId);pn(r)})}),t.querySelectorAll('[data-action="move-up-how-to-shop"]').forEach(n=>{n.addEventListener("click",o=>{const r=parseInt(o.currentTarget.dataset.itemId);fn(r)})}),t.querySelectorAll('[data-action="move-down-how-to-shop"]').forEach(n=>{n.addEventListener("click",o=>{const r=parseInt(o.currentTarget.dataset.itemId);gn(r)})}),t.querySelectorAll('[data-action="toggle-bold-how-to-shop"]').forEach(n=>{n.addEventListener("click",o=>{const r=parseInt(o.currentTarget.dataset.itemId);hn(r)})}),t.querySelectorAll('[data-action="toggle-italic-how-to-shop"]').forEach(n=>{n.addEventListener("click",o=>{const r=parseInt(o.currentTarget.dataset.itemId);yn(r)})}),t.querySelectorAll('[data-action="toggle-underline-how-to-shop"]').forEach(n=>{n.addEventListener("click",o=>{const r=parseInt(o.currentTarget.dataset.itemId);bn(r)})}),ae(t)}function P(){const t=document.getElementById("howToShopWrapper");t&&(t.innerHTML=`
    <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
        <button type="button" class="btn btn-base btn-primary-base" data-action="add-how-to-shop-item" style="padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Item</button>
    </div>
    <div id="howToShopItemsContainer"></div>
  `,vn(),E())}function wn(){const t=Date.now();l.importantNotesItems.push({id:t,text:"",bold:!1,italic:!1,underline:!1}),j()}function $n(t){l.importantNotesItems=l.importantNotesItems.filter(e=>e.id!==t),j()}function En(t){O(l.importantNotesItems,t,"up")&&j()}function Sn(t){O(l.importantNotesItems,t,"down")&&j()}function In(t){const e=l.importantNotesItems.find(n=>n.id===t);e&&(e.bold=!e.bold,j(),E())}function xn(t){const e=l.importantNotesItems.find(n=>n.id===t);e&&(e.italic=!e.italic,j(),E())}function Ln(t){const e=l.importantNotesItems.find(n=>n.id===t);e&&(e.underline=!e.underline,j(),E())}function Tn(){const t=document.getElementById("importantNotesItemsContainer");if(!t)return;t.innerHTML=l.importantNotesItems.map((n,o)=>{const r=S(String(n.id)),a=o===0,s=o===l.importantNotesItems.length-1;return`
            <div class="editable-item-row" data-item-id="${r}" draggable="true">
                <div class="entry-header">
                    <div class="entry-header-left">
                        <div class="drag-handle" title="Drag to reorder">
                            ${me({size:16})}
                        </div>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-up-important-notes" data-item-id="${n.id}" title="Move up" ${a?"disabled":""}>${q("up",{size:10})}</button>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-down-important-notes" data-item-id="${n.id}" title="Move down" ${s?"disabled":""}>${q("down",{size:10})}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-bold-important-notes" data-item-id="${n.id}" title="Bold" ${n.bold?'data-active="true"':""}>${qe({size:14})}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-italic-important-notes" data-item-id="${n.id}" title="Italic" ${n.italic?'data-active="true"':""}>${Oe({size:14})}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-underline-important-notes" data-item-id="${n.id}" title="Underline" ${n.underline?'data-active="true"':""}>${_e({size:14})}</button>
                    </div>
                    <div class="entry-controls">
                        <button type="button" class="item-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove-important-notes-item" data-item-id="${n.id}" title="Remove" aria-label="Remove important note">
                            ${X({size:16})}
                        </button>
                    </div>
                </div>
                <div class="form-group" style="margin-top: 0.5rem;">
                    <div class="input-wrapper">
                        <input type="text" class="form-input important-notes-item-text" id="important-notes-item-${r}-text" name="important-notes-item-${r}-text" data-item-id="${r}" value="${S(n.text)}" placeholder="e.g., Important safety information or key details">
                        <button class="clear-input" data-clear="important-notes-item-${r}-text" title="Clear">×</button>
                    </div>
                </div>
            </div>
        `}).join(""),t.querySelectorAll(".important-notes-item-text").forEach(n=>{n.addEventListener("input",o=>{const r=parseInt(o.target.dataset.itemId),a=l.importantNotesItems.find(s=>s.id===r);a&&(a.text=o.target.value,ie())})}),ge(t,l.importantNotesItems,j);const e=document.querySelector('[data-action="add-important-notes-item"]');e&&e.addEventListener("click",n=>{n.stopPropagation(),wn()}),t.querySelectorAll('[data-action="remove-important-notes-item"]').forEach(n=>{n.addEventListener("click",o=>{const r=parseInt(o.currentTarget.dataset.itemId);$n(r)})}),t.querySelectorAll('[data-action="move-up-important-notes"]').forEach(n=>{n.addEventListener("click",o=>{const r=parseInt(o.currentTarget.dataset.itemId);En(r)})}),t.querySelectorAll('[data-action="move-down-important-notes"]').forEach(n=>{n.addEventListener("click",o=>{const r=parseInt(o.currentTarget.dataset.itemId);Sn(r)})}),t.querySelectorAll('[data-action="toggle-bold-important-notes"]').forEach(n=>{n.addEventListener("click",o=>{const r=parseInt(o.currentTarget.dataset.itemId);In(r)})}),t.querySelectorAll('[data-action="toggle-italic-important-notes"]').forEach(n=>{n.addEventListener("click",o=>{const r=parseInt(o.currentTarget.dataset.itemId);xn(r)})}),t.querySelectorAll('[data-action="toggle-underline-important-notes"]').forEach(n=>{n.addEventListener("click",o=>{const r=parseInt(o.currentTarget.dataset.itemId);Ln(r)})}),ae(t)}function j(){const t=document.getElementById("importantNotesWrapper");t&&(t.innerHTML=`
    <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
        <button type="button" class="btn btn-base btn-primary-base" data-action="add-important-notes-item" style="padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Item</button>
    </div>
    <div id="importantNotesItemsContainer"></div>
  `,Tn(),E())}function Qe(){if(!y.userProfile||!y.userProfile.storeDirections)return;const t=y.userProfile.storeDirections.trim();if(!t)return;const e=t.toLowerCase();l.importantNotesItems.some(o=>{if(!o||!o.text)return!1;const r=o.text.toLowerCase();return r.includes(e)||r.includes("find us at")||r.includes("directions")})||l.importantNotesItems.push({id:Date.now()+14,text:`Find us at ${t}`,bold:!1,italic:!1,underline:!1})}function Kn(){const t=he();l.howToShopItems.forEach(e=>{e.text&&e.text.startsWith("Email ")&&(e.text=`Email ${t}`)}),P()}function be(){if(l.howToShopItems.length===0){const t=_(),e=he();l.howToShopItems=[{id:Date.now()+1,text:"Visit us in-store for outlet-exclusive deals",bold:!1,italic:!1,underline:!1},{id:Date.now()+2,text:`Call ${t} for availability`,bold:!1,italic:!1,underline:!1},{id:Date.now()+3,text:"$20 flat-rate ground shipping in US",bold:!1,italic:!1,underline:!1},{id:Date.now()+4,text:`Email ${e}`,bold:!1,italic:!1,underline:!1}]}l.importantNotesItems.length===0&&(l.importantNotesItems=[{id:Date.now()+10,text:"*Select models only",bold:!1,italic:!1,underline:!1},{id:Date.now()+11,text:"See attached PDF for complete model details",bold:!1,italic:!1,underline:!1},{id:Date.now()+12,text:"Limited availability - while supplies last",bold:!1,italic:!1,underline:!1},{id:Date.now()+13,text:"Email response time up to 48 hours",bold:!1,italic:!1,underline:!1}],Qe())}function Ae(t){let n=!1;for(const o of t){if(o.type!=="application/pdf"){b(`✗ ${o.name} is not a PDF file`),n=!0;continue}if(o.size>10485760){const a=(o.size/1048576).toFixed(2);b(`✗ ${o.name} is too large (${a}MB). Max size is 10MB.`),n=!0;continue}if(l.attachedPDFs.some(a=>a.name===o.name)){b(`⚠ ${o.name} is already attached`);continue}const r=new FileReader;r.onload=async a=>{const s={id:Date.now()+Math.random(),name:o.name,size:o.size,type:o.type,data:a.target.result};let c=0;for(;!x&&c<20;)await new Promise(i=>setTimeout(i,50)),c++;try{x?(await ue(s),console.log(`PDF ${o.name} saved to IndexedDB with ID:`,s.id)):(console.warn("IndexedDB not initialized, PDF will not persist after refresh"),b("⚠ PDF saved to memory but may not persist after refresh"))}catch(i){console.warn("Failed to save PDF to IndexedDB:",i),b("⚠ PDF saved to memory but may not persist after refresh")}l.attachedPDFs.push(s),ee(),!n&&t.length===1&&b(`✓ ${o.name} attached successfully`)},r.onerror=()=>{b(`✗ Error reading ${o.name}`)},r.readAsDataURL(o)}!n&&t.length>1&&b(`✓ ${t.length} PDFs attached successfully`)}function ee(){const t=document.getElementById("attachedPDFsList");if(t){if(l.attachedPDFs.length===0){t.innerHTML="";return}t.innerHTML=l.attachedPDFs.map(e=>{const n=(e.size/1024).toFixed(1),o=(e.size/(1024*1024)).toFixed(2),r=e.size>1024*1024?`${o} MB`:`${n} KB`,a=!!e.data,s=a?"pdf-name-clickable":"pdf-name-disabled",c=a?`Click to preview ${e.name}`:`${e.name} - Preview unavailable (data not loaded)`,i=a?"":'<span style="color: #ff9800; margin-left: 0.5rem;" title="Preview unavailable">⚠</span>';return`
            <div class="attached-pdf-item" data-pdf-id="${e.id}">
                <div class="pdf-icon">
                    ${St()}
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
                    ${X({size:16})}
                </button>
            </div>
        `}).join(""),t.querySelectorAll('[data-action="preview-pdf"]').forEach(e=>{e.addEventListener("click",n=>{const o=parseFloat(n.currentTarget.dataset.pdfId);Me(o)}),e.addEventListener("keypress",n=>{if(n.key==="Enter"){const o=parseFloat(n.currentTarget.dataset.pdfId);Me(o)}})}),t.querySelectorAll('[data-action="remove-pdf"]').forEach(e=>{e.addEventListener("click",n=>{const o=parseFloat(n.currentTarget.dataset.pdfId);Cn(o)})})}}async function Cn(t){const e=l.attachedPDFs.find(n=>n.id===t);if(e){try{await He(t)}catch(n){console.warn("Failed to delete PDF from IndexedDB:",n)}l.attachedPDFs=l.attachedPDFs.filter(n=>n.id!==t),ee(),b(`✓ ${e.name} removed`)}}function Me(t){const e=l.attachedPDFs.find(s=>s.id===t);if(!e||!e.data){b("✗ PDF data not available for preview");return}Z=e;const n=document.getElementById("pdfPreviewModal"),o=document.getElementById("pdfPreviewIframe"),r=document.getElementById("pdfPreviewTitle"),a=document.getElementById("pdfDownloadBtn");if(!n||!o||!r||!a){console.error("PDF preview modal elements not found");return}try{const s=atob(e.data.split(",")[1]),c=new Array(s.length);for(let m=0;m<s.length;m++)c[m]=s.charCodeAt(m);const i=new Uint8Array(c),p=new Blob([i],{type:"application/pdf"});U&&URL.revokeObjectURL(U),U=URL.createObjectURL(p),o.src=U;const g=document.getElementById("pdfLoadingIndicator");g&&setTimeout(()=>{g.style.display="none"},500)}catch(s){console.error("Error creating blob URL for PDF:",s),b("✗ Could not display PDF preview");return}r.textContent=e.name,n.style.display="flex",setTimeout(()=>{n.classList.add("active")},10),n.focus()}function le(){const t=document.getElementById("pdfPreviewModal");t&&(t.classList.remove("active"),setTimeout(()=>{t.style.display="none"},300));const e=document.getElementById("pdfPreviewIframe");e&&(e.src="about:blank"),U&&(URL.revokeObjectURL(U),U=null),Z=null}function je(){if(!Z)return;const t=document.createElement("a");t.href=Z.data,t.download=Z.name,t.click()}function se(){const t=document.getElementById("subjectLinesContainer");if(!t)return;if(l.generatedSubjectLines.length===0){t.innerHTML='<div class="subject-lines-empty">Generate your email template first to create subject line suggestions</div>';return}const e=document.getElementById("selectedSubjectInput"),n=e?e.value:null,o=n!==null?n:l.selectedSubjectLine||"",r=l.generatedSubjectLines.map((c,i)=>{const p=c===l.selectedSubjectLine;return`<option value="${i}" ${p?"selected":""}>${F(c)}</option>`}).join("");t.innerHTML=`
        <div class="subject-line-dropdown-wrapper">
            <label class="subject-dropdown-label" for="subjectLineDropdown">Choose a subject line suggestion:</label>
            <div class="select-wrapper">
                <select id="subjectLineDropdown" class="subject-line-dropdown">
                    <option value="" disabled ${l.selectedSubjectLine?"":"selected"}>Select a subject line...</option>
                    ${r}
                </select>
            </div>
        </div>
        <div id="selectedSubjectCard" class="selected-subject-card" style="display: ${o?"block":"none"};">
            <label class="subject-card-label" for="selectedSubjectInput">Selected Subject Line (customizable):</label>
            <div class="subject-card-input-wrapper">
                <input
                    type="text"
                    id="selectedSubjectInput"
                    class="subject-card-input"
                    value="${S(o)}"
                    placeholder="Your subject line..."
                    title="Edit the email subject line. Changes will be reflected in both Send Email and Download Email File options."
                >
                <div class="subject-card-meta">
                    <span class="char-count ${o&&o.length<=50?"optimal":"warning"}" id="subjectCharCount">
                        ${o?o.length:0} chars ${o&&o.length<=50?"✓":o&&o.length>50?"(>50)":""}
                    </span>
                </div>
            </div>
        </div>
    `;const a=document.getElementById("subjectLineDropdown");a&&a.addEventListener("change",c=>{const i=parseInt(c.target.value);i>=0&&i<l.generatedSubjectLines.length&&Bn(i)});const s=document.getElementById("selectedSubjectInput");s&&s.addEventListener("input",c=>{l.selectedSubjectLine=c.target.value;const i=document.getElementById("subjectCharCount");if(i){const g=c.target.value.length,m=g<=50;i.className=`char-count ${m?"optimal":"warning"}`,i.textContent=`${g} chars ${m?"✓":"(>50)"}`}const p=document.getElementById("subjectLineDropdown");p&&(p.value="")})}function kn(){const t=document.getElementById("promoDateRange")?.value||"",e=["Citizen","Bulova","Alpina","Frederique Constant"],n=[...new Set(l.promotionEntries.map(f=>f.line||"").flatMap(f=>e.filter(h=>f.toLowerCase().includes(h.toLowerCase()))).filter(Boolean))],o=/(\d+)[\s%]*%/,r=Math.max(0,...l.promotionEntries.map(f=>{const h=(f.line||"").match(o);return h&&parseInt(h[1],10)||0})),a=[],s={};l.promotionEntries.forEach(f=>{if(f.collections){const h=e.find(I=>(f.line||"").toLowerCase().includes(I.toLowerCase()));f.collections.split(",").forEach(I=>{const L=I.trim();L&&!a.includes(L)&&(a.push(L),h&&(s[h]||(s[h]=[]),s[h].push(L)))})}});const c=a.slice(0,3),i=l.promotionEntries.filter(f=>f.callout&&f.callout.trim()).map(f=>f.callout.toLowerCase()),p=i.some(f=>f.includes("limited")||f.includes("while supplies")),g=i.some(f=>f.includes("final")),m=f=>f>=50?`Up to ${f}% OFF`:f>=30?`Up to ${f}% OFF`:f>0?`Up to ${f}% OFF`:"Special Savings";let u=[];if(t){u.push(`Sale: ${t}`);const f=t.toLowerCase();(f.includes("fri")||f.includes("sat")||f.includes("sun"))&&u.push(`This Weekend: ${m(r)}`)}if(n.length>0&&r>0?n.length===1?u.push(`${n[0]}: ${m(r)}`):u.push(`${n[0]} & ${n[1]}: ${m(r)}`):n.length>0&&u.push(`${n[0]} Sale Event`),r>0&&u.push(`Up to ${r}% OFF This Week`),n.length>0&&c.length>0){const f=c.slice(0,3).join(", ");u.push(`${n[0]} including ${f}`)}if(n.length>=2&&s[n[0]]?.length>0&&s[n[1]]?.length>0){const f=s[n[0]][0],h=s[n[1]][0];u.push(`${n[0]} & ${n[1]} including ${f}, ${h}`)}p&&u.push("Limited Stock – Shop Now"),g&&u.push("Final Sale: Extra Savings Inside"),r>=30&&u.push(`Perfect Watch Gifts – Up to ${r}% OFF`),r>0&&u.push("Don't Miss These Watch Deals"),n.length>0&&u.push(`VIP Watch Sale: ${n[0]} & More`),u.push("Your New Watch Awaits"),r>=20&&u.push("Ready for a New Watch?"),u.length<3&&(r>0?u.push(`Up to ${r}% OFF – This Week Only`):u.push("New Deals This Week"));const v=[...new Set(u)],w=v.filter(f=>f.length<=60).sort((f,h)=>{const I=f.length>=20&&f.length<=45?0:1,L=h.length>=20&&h.length<=45?0:1;return I-L});l.generatedSubjectLines=w.length>0?w:v,l.selectedSubjectLine=l.generatedSubjectLines[0]||null,se()}function Bn(t){if(t>=0&&t<l.generatedSubjectLines.length){l.selectedSubjectLine=l.generatedSubjectLines[t];const e=document.getElementById("selectedSubjectCard");e&&(e.style.display="block");const n=document.getElementById("subjectLineDropdown");n&&(n.value=t);const o=document.getElementById("selectedSubjectInput");o&&(o.value=l.selectedSubjectLine);const r=document.getElementById("subjectCharCount");if(r){const a=l.selectedSubjectLine.length,s=a<=50;r.className=`char-count ${s?"optimal":"warning"}`,r.textContent=`${a} chars ${s?"✓":"(>50)"}`}}}function Fe(t){let e=F(t.text);return t.bold&&(e=`<strong>${e}</strong>`),t.italic&&(e=`<em>${e}</em>`),t.underline&&(e=`<u>${e}</u>`),e}function Dn(t){const e=t.promoDateRange||"",n=t.promoTitle&&t.promoTitle.trim()?F(t.promoTitle):tn(e),o=t.promoYear&&t.promoYear.trim()?t.promoYear.trim():new Date().getFullYear(),r=_();let a="";l.promotionEntries.forEach(u=>{if(!u.line&&(u.brand||u.discount)){const w=u.brand||"",f=u.discount?`${u.discount.toString().trim()}% OFF`:"",h=[w,f].filter(I=>I&&I.trim());u.line=h.join(" – ")}if(!u.line||!u.line.trim())return;let v="";u.collections&&u.collections.trim()&&(v=u.collections.split(",").map(f=>F(f.trim())).filter(f=>f).map(f=>`*${f}`).join(" • ")),a+=`
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
                <h1 style="font-size: 24px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">${n}</h1>
                <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 10px 0 0 0;">${e}, ${o} • While Supplies Last</p>
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
</html>`}function Pn(){const t=document.getElementById("pdfSectionContainer");if(!t)return;t.innerHTML=`
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
  `;const e=document.getElementById("pdfDropzone"),n=document.getElementById("pdfFileInput");e&&n&&(e.addEventListener("click",()=>n.click()),n.addEventListener("change",o=>{const r=Array.from(o.target.files);r.length>0&&Ae(r),n.value=""}),e.addEventListener("dragover",o=>{o.preventDefault(),e.classList.add("dragover")}),e.addEventListener("dragleave",o=>{o.preventDefault(),e.classList.remove("dragover")}),e.addEventListener("drop",o=>{o.preventDefault(),e.classList.remove("dragover");const r=Array.from(o.dataTransfer.files).filter(a=>a.type==="application/pdf");r.length>0?Ae(r):b("Please drop only PDF files")})),ee()}async function Nn(){if(!confirm("This will reset everything to defaults and cannot be undone. Continue?"))return;const t=document.getElementById("promoDateRange"),e=document.getElementById("promoYear"),n=document.getElementById("promoTitle");t&&(t.value=""),e&&(e.value=""),n&&(n.value=""),l.promotionEntries=[{id:Date.now(),line:"",collections:"",callout:""}],l.specialHours=[],l.howToShopItems=[],l.importantNotesItems=[],be();for(const c of l.attachedPDFs)try{await He(c.id)}catch(i){console.warn("Failed to delete PDF from IndexedDB:",i)}l.attachedPDFs=[],l.generatedSubjectLines=[],l.selectedSubjectLine=null;const o=document.getElementById("bulkEmailList");if(o){o.value="",o.dispatchEvent(new Event("input",{bubbles:!0}));try{await lt()}catch(c){console.warn("Failed to clear bulk recipients from IndexedDB:",c)}}localStorage.removeItem("savedPromotionTemplate"),H(),Y(),P(),j(),ee(),se();const r=document.getElementById("codeArea"),a=document.getElementById("previewIframe");r&&(r.value=""),a&&ye(a);const s=document.querySelector(".output-actions");s&&s.classList.remove("enabled"),b("Reset to defaults completed")}function An(){const t=document.getElementById("basicDetailsContainer");if(!t){console.error("Basic details container not found");return}t.innerHTML=`
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
  `;const e=document.getElementById("promoDateRange"),n=document.getElementById("promoYear"),o=document.getElementById("promoTitle");if(e){e.addEventListener("input",()=>{const a=document.querySelector('[data-clear="promoDateRange"]');a&&a.classList.toggle("visible",e.value.trim().length>0),E()});const r=document.querySelector('[data-clear="promoDateRange"]');r&&r.addEventListener("click",()=>{e.value="",r.classList.remove("visible"),e.focus(),E()})}if(n){n.addEventListener("input",()=>{const a=document.querySelector('[data-clear="promoYear"]');a&&a.classList.toggle("visible",n.value.trim().length>0),E()});const r=document.querySelector('[data-clear="promoYear"]');r&&r.addEventListener("click",()=>{n.value="",r.classList.remove("visible"),n.focus(),E()})}if(o){o.addEventListener("input",()=>{const a=document.querySelector('[data-clear="promoTitle"]');a&&a.classList.toggle("visible",o.value.trim().length>0),E()});const r=document.querySelector('[data-clear="promoTitle"]');r&&r.addEventListener("click",()=>{o.value="",r.classList.remove("visible"),o.focus(),E()})}}function Mn(){const t=document.getElementById("discountEntriesContainer");if(!t){console.error("Discount entries container not found");return}t.innerHTML=`
    <div class="form-group full-width">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <label class="form-label" style="margin-bottom: 0;">Promotion Entries</label>
            <button type="button" class="btn btn-base btn-primary-base" id="addEntryBtn" style="flex: 0 0 auto; padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Entry</button>
        </div>
        <div id="promotionEntriesContainer"></div>
    </div>
  `;const e=document.getElementById("addEntryBtn");e&&e.addEventListener("click",Xe)}function jn(){const t=document.getElementById("specialHoursContainer");if(!t){console.error("Special hours card container not found");return}t.innerHTML=`
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <label class="form-label" style="margin-bottom: 0;">Special Hours</label>
        <button type="button" class="btn btn-base btn-primary-base" id="addHourBtn" style="flex: 0 0 auto; padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Special Hours</button>
    </div>
    <div class="field-help" style="margin-bottom: 0.75rem;">For holidays or special sale hours (e.g., Black Friday extended hours)</div>
    <div id="specialHoursListContainer"></div>
    <div id="specialHoursReminder" style="display: none; background: #fff3cd; border-left: 3px solid #ffc107; padding: 1rem; margin-top: 1rem;">
        <strong>⚠️ Reminder:</strong> Don't forget to update your special hours on Yelp and Google Maps!
    </div>
  `;const e=document.getElementById("addHourBtn");e&&e.addEventListener("click",sn)}function Fn(){const t=document.getElementById("howToShopContainer");if(!t){console.error("How to shop container not found");return}t.innerHTML=`
    <div class="form-group full-width">
        <div id="howToShopWrapper"></div>
    </div>
  `}function Hn(){const t=document.getElementById("importantNotesContainer");if(!t){console.error("Important notes container not found");return}t.innerHTML=`
    <div class="form-group full-width">
        <div id="importantNotesWrapper"></div>
    </div>
  `}function Zn(){Bt("promotion-email");const t=localStorage.getItem("savedPromotionTemplate");let e=null;if(t)try{e=JSON.parse(t)}catch(m){console.error("Error parsing saved template:",m),e=null}l.promotionEntries=[],l.specialHours=[],l.howToShopItems=[],l.importantNotesItems=[],l.attachedPDFs=[],l.generatedSubjectLines=[],l.selectedSubjectLine=null,An(),Mn(),jn(),Fn(),Hn(),Pn(),Kt();const n=document.getElementById("pdfModalClose"),o=document.querySelector(".pdf-modal-backdrop"),r=document.getElementById("pdfDownloadBtn"),a=document.getElementById("pdfDownloadFallback");n&&n.addEventListener("click",le),o&&o.addEventListener("click",le),r&&r.addEventListener("click",je),a&&a.addEventListener("click",je),document.addEventListener("keydown",m=>{if(m.key==="Escape"){const u=document.getElementById("pdfPreviewModal");u&&u.style.display!=="none"&&le()}});const s=document.getElementById("saveTemplateBtnDuplicate"),c=document.getElementById("importTemplateBtnDuplicate"),i=document.getElementById("exportTemplateBtnDuplicate"),p=document.getElementById("startOverBtnDuplicate");s&&s.addEventListener("click",Xt),c&&c.addEventListener("click",Qt),i&&i.addEventListener("click",en),p&&p.addEventListener("click",Nn),e?Ge(e,!0):(be(),Xe()),H(),Y(),P(),j(),se();const g=document.getElementById("previewIframe");g&&ye(g),console.log("Promotion UI module initialized")}function Gn(){const t=localStorage.getItem("theme")||"light",e=localStorage.getItem("lightPalette")||"pastel",n=localStorage.getItem("darkPalette")||"midnight-blue";document.documentElement.setAttribute("data-theme",t),document.documentElement.setAttribute("data-light-palette",e),document.documentElement.setAttribute("data-dark-palette",n),et(t)}function zn(){const e=(document.documentElement.getAttribute("data-theme")||"light")==="light"?"dark":"light";document.documentElement.setAttribute("data-theme",e),localStorage.setItem("theme",e),et(e),C==="promotion-email"?E():C&&Q()}function et(t){const e=document.querySelector(".theme-toggle-slider");e&&(e.style.transform=t==="dark"?"translateX(20px)":"translateX(0)")}const Rn=300;function Xn(){document.querySelectorAll('a[href$=".html"]').forEach(t=>{t.hostname===window.location.hostname&&t.addEventListener("click",qn)})}function qn(t){if(t.metaKey||t.ctrlKey||t.shiftKey||t.currentTarget.target==="_blank")return;t.preventDefault();const e=t.currentTarget.getAttribute("href"),n=document.querySelector(".page-content"),o=document.querySelector(".header"),r=document.querySelector(".right-column");n||o?(n&&n.classList.add("fade-out"),o&&o.classList.add("fade-out"),r&&r.classList.add("fade-out"),setTimeout(()=>{window.location.href=e},Rn)):window.location.href=e}export{Xn as a,On as b,Jn as c,y as d,Zn as e,Lt as f,Jt as g,lt as h,Gn as i,xt as j,_n as k,Yn as l,Vn as m,Wn as n,st as o,l as p,Un as q,b as s,zn as t,Kn as u,ye as w};

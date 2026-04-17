// ----- Constants -----
const CATEGORIES = [
  "Banking & Finance",
  "Telecommunications",
  "Retail & Supermarkets",
  "Utilities",
  "Hospitality",
  "Healthcare",
  "Education",
  "Transport",
  "Car Dealers",
  "Online Sellers",
  "Government Services",
  "Contractors",
  "Landlords",
  "Software & Technology",
  "Other",
];
const STORAGE = {
  REVIEWS: "speakup_reviews_v2",
  BUSINESSES: "speakup_businesses_v2",
  SESSION: "speakup_biz_session",
  LAST_VISIT: "speakup_biz_last_visit",
};
const PAYFAST = {
  MERCHANT_ID: "10042465",
  MERCHANT_KEY: "ylo9fatwu9xyj",
  SANDBOX: true,
  AMOUNT: "200.00",
};
const SEED_REVIEWS = [
  {
    id: 1,
    businessName: "MTC Namibia",
    category: "Telecommunications",
    rating: 3,
    title: "Fast data but slow support",
    content:
      "Network coverage is excellent but a billing issue took weeks to resolve.",
    userName: "Helena K.",
    date: "2025-02-18T10:00:00.000Z",
    comments: [],
  },
  {
    id: 2,
    businessName: "FNB Namibia",
    category: "Banking & Finance",
    rating: 5,
    title: "Excellent banking experience",
    content:
      "Best bank in Namibia. Staff are professional and the app works flawlessly.",
    userName: "Tomas S.",
    date: "2025-02-10T10:00:00.000Z",
    comments: [],
  },
  {
    id: 3,
    businessName: "Shoprite Namibia",
    category: "Retail & Supermarkets",
    rating: 2,
    title: "Long queues every weekend",
    content: "Severely understaffed on weekends.",
    userName: "Patricia N.",
    date: "2025-02-01T10:00:00.000Z",
    comments: [],
  },
  {
    id: 4,
    businessName: "NamPower",
    category: "Utilities",
    rating: 3,
    title: "Reliable but tariffs are high",
    content: "Power is mostly reliable but tariff increases every year.",
    userName: "Lavinia M.",
    date: "2025-01-25T10:00:00.000Z",
    comments: [],
  },
  {
    id: 5,
    businessName: "Bank Windhoek",
    category: "Banking & Finance",
    rating: 4,
    title: "Great service, could improve app",
    content: "Branch staff helpful. App feels dated.",
    userName: "Samuel D.",
    date: "2025-01-20T10:00:00.000Z",
    comments: [],
  },
  {
    id: 6,
    businessName: "Namibia Breweries",
    category: "Other",
    rating: 5,
    title: "World-class Namibian product",
    content: "Windhoek Lager remains one of the finest.",
    userName: "Johan V.",
    date: "2025-01-15T10:00:00.000Z",
    comments: [],
  },
];

let reviews = [],
  businesses = [],
  currentBusiness = null,
  pendingReg = null;
let currentReplyReviewId = null,
  currentTab = "overview";
let consumerFilter = { search: "", cat: "all", rating: "all", sort: "newest" };
let bizWrRating = 0,
  bizWrHover = 0;
let tempPasswordValue = "";

// ----- Helpers -----
async function hashPassword(password, salt = null) {
  if (!salt) salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const data = encoder.encode(password + Array.from(salt).join(","));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { hash: hashHex, salt: Array.from(salt) };
}
async function verifyPassword(password, storedHash, storedSalt) {
  const { hash } = await hashPassword(password, new Uint8Array(storedSalt));
  return hash === storedHash;
}
function generateTempPassword(length = 10) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let result = "";
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++)
    result += chars[randomValues[i] % chars.length];
  return result;
}
function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE.REVIEWS);
    reviews =
      stored && JSON.parse(stored).length
        ? JSON.parse(stored)
        : [...SEED_REVIEWS];
  } catch {
    reviews = [...SEED_REVIEWS];
  }
  try {
    businesses = JSON.parse(localStorage.getItem(STORAGE.BUSINESSES)) || [];
  } catch {
    businesses = [];
  }
  try {
    currentBusiness =
      JSON.parse(sessionStorage.getItem(STORAGE.SESSION)) || null;
  } catch {
    currentBusiness = null;
  }
}
function saveReviews() {
  localStorage.setItem(STORAGE.REVIEWS, JSON.stringify(reviews));
}
function saveBusinesses() {
  localStorage.setItem(STORAGE.BUSINESSES, JSON.stringify(businesses));
}
function setSession(b) {
  currentBusiness = b;
  b
    ? sessionStorage.setItem(STORAGE.SESSION, JSON.stringify(b))
    : sessionStorage.removeItem(STORAGE.SESSION);
}
function esc(s) {
  if (!s) return "";
  return String(s).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        m
      ])
  );
}
function formatDate(iso) {
  return iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
}
function toast(msg, type = "success") {
  const icons = {
    success:
      '<svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
    error:
      '<svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    info: '<svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  };
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<div class="toast-icon">${
    icons[type] || icons.info
  }</div><span>${esc(msg)}</span>`;
  document.getElementById("toast-container").appendChild(el);
  setTimeout(() => {
    el.classList.add("toast-out");
    setTimeout(() => el.remove(), 300);
  }, 3200);
}
function getRatingColor(r) {
  if (r >= 5) return "var(--r5)";
  if (r >= 4) return "var(--r4)";
  if (r >= 3) return "var(--r3)";
  if (r >= 2) return "var(--r2)";
  return "var(--r1)";
}
function starsSVG(rating, size = 14) {
  let h = "";
  for (let i = 1; i <= 5; i++)
    h += `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${
      i <= rating ? "var(--nam-gold)" : "none"
    }" stroke="${
      i <= rating ? "var(--nam-gold)" : "#c8c0b0"
    }" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  return h;
}
function isVerifiedBiz(name) {
  return businesses.some(
    (b) => b.businessName.toLowerCase() === name.toLowerCase()
  );
}
function isSubscriptionActive(bizData) {
  return bizData && new Date(bizData.subscriptionExpiry) > new Date();
}
function checkSubscriptionAndWarn(bizData) {
  if (!isSubscriptionActive(bizData)) {
    toast("Your subscription has expired. Please renew.", "error");
    switchTab("renew");
    return false;
  }
  return true;
}

// ----- Render Portal -----
function renderPortal() {
  const sidebar = document.getElementById("bizSidebar"),
    main = document.querySelector(".biz-main"),
    hamburger = document.getElementById("bizHamburger");
  if (!currentBusiness) {
    sidebar.style.display = "none";
    main.style.marginLeft = "0";
    hamburger.style.display = "none";
    renderAuth();
  } else {
    sidebar.style.display = "flex";
    hamburger.style.display = window.innerWidth < 768 ? "flex" : "none";
    main.style.marginLeft = window.innerWidth >= 768 ? "260px" : "0";
    const bizData = businesses.find((b) => b.id === currentBusiness.id);
    document.getElementById("navRenew").style.display = !isSubscriptionActive(
      bizData
    )
      ? "flex"
      : "none";
    renderDashboard();
  }
}
function renderAuth() {
  const container = document.getElementById("portal-container");
  container.innerHTML = `<div class="biz-card ${
    pendingReg ? "register-active" : ""
  }" style="max-width:500px;margin:0 auto">
    <div class="tabs"><button class="tab-btn ${
      !pendingReg ? "active" : ""
    }" onclick="setAuthTab('login')">Login</button><button class="tab-btn ${
    pendingReg ? "active" : ""
  }" onclick="setAuthTab('register')">Register</button></div>
    <div id="auth-content">${
      pendingReg ? renderRegisterForm() : renderLoginForm()
    }</div>
    <div style="margin-top:1.5rem;text-align:center"><a href="index.html" class="btn btn-ghost btn-sm"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>Back to Consumer Site</a></div>
  </div>`;
}
function setAuthTab(tab) {
  pendingReg = tab === "register" ? {} : null;
  renderAuth();
}
function renderLoginForm() {
  return `<div class="form-space"><div><label class="label">Email</label><input class="input" id="login-email" type="email" placeholder="business@example.com" onkeydown="if(event.key==='Enter')doLogin()"></div>
    <div><label class="label">Password</label><input class="input" id="login-pwd" type="password" placeholder="••••••••" onkeydown="if(event.key==='Enter')doLogin()"></div>
    <div id="login-err" style="display:none" class="form-err"></div><button class="btn btn-primary" style="width:100%" onclick="doLogin()">Login to Portal</button>
    <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:0.5rem" onclick="openForgotPasswordModal()">Forgot Password?</button></div>`;
}
function renderRegisterForm() {
  const cats = CATEGORIES.map(
    (c) => `<option value="${c}">${esc(c)}</option>`
  ).join("");
  return `<div class="form-space"><div class="biz-info-box"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><p>Registration requires a <strong>N$200/month</strong> subscription.</p></div>
    <div><label class="label">Business Name <span class="req">*</span></label><input class="input" id="reg-biz" type="text" placeholder="Your business name"></div>
    <div><label class="label">Category <span class="req">*</span></label><div class="select-wrap"><select class="input" id="reg-cat"><option value="">Select a category…</option>${cats}</select></div></div>
    <div><label class="label">Email <span class="req">*</span></label><input class="input" id="reg-email" type="email" placeholder="business@example.com"></div>
    <div><label class="label">Password <span class="req">*</span></label><input class="input" id="reg-pwd" type="password" placeholder="Min. 6 characters"></div>
    <div><label class="label"><input type="checkbox" id="reg-terms"> I agree to the Terms & Privacy</label></div><div id="reg-err" style="display:none" class="form-err"></div>
    <button class="btn btn-primary" style="width:100%" onclick="doRegister()">Continue to Subscription</button></div>`;
}
async function doLogin() {
  const email = document
      .getElementById("login-email")
      ?.value.trim()
      .toLowerCase(),
    pwd = document.getElementById("login-pwd")?.value,
    err = document.getElementById("login-err");
  const biz = businesses.find((b) => b.email === email);
  if (!biz || !(await verifyPassword(pwd, biz.passwordHash, biz.salt))) {
    err.textContent = "Invalid email or password.";
    err.style.display = "block";
    return;
  }
  setSession({
    id: biz.id,
    businessName: biz.businessName,
    email: biz.email,
    category: biz.category,
  });
  toast(`Welcome back, ${biz.businessName}!`);
  updateLastVisit();
  renderPortal();
}
async function doRegister() {
  const biz = document.getElementById("reg-biz")?.value.trim(),
    cat = document.getElementById("reg-cat")?.value,
    email = document.getElementById("reg-email")?.value.trim().toLowerCase(),
    pwd = document.getElementById("reg-pwd")?.value,
    terms = document.getElementById("reg-terms")?.checked,
    err = document.getElementById("reg-err");
  if (!biz || !cat || !email || !pwd) {
    err.textContent = "All fields are required.";
    err.style.display = "block";
    return;
  }
  if (!terms) {
    err.textContent = "You must accept the Terms & Privacy.";
    err.style.display = "block";
    return;
  }
  if (pwd.length < 6) {
    err.textContent = "Password must be at least 6 characters.";
    err.style.display = "block";
    return;
  }
  if (businesses.find((b) => b.email === email)) {
    err.textContent = "An account with this email already exists.";
    err.style.display = "block";
    return;
  }
  if (
    businesses.some((b) => b.businessName.toLowerCase() === biz.toLowerCase())
  ) {
    err.textContent = "A business with this name already exists.";
    err.style.display = "block";
    return;
  }
  const { hash, salt } = await hashPassword(pwd);
  pendingReg = { bizName: biz, category: cat, email, passwordHash: hash, salt };
  renderPaywall();
}
function renderPaywall() {
  const benefits = [
    {
      title: "Verified Business Badge",
      desc: "Prominent green ✓ badge on every review.",
    },
    {
      title: "Full Analytics Dashboard",
      desc: "Average rating, total reviews, rating breakdown.",
    },
    {
      title: "Public Review Replies",
      desc: "Respond publicly as your verified business.",
    },
    {
      title: "Profile & Settings Control",
      desc: "Update business name, category, email, and password.",
    },
    {
      title: "Priority Search Visibility",
      desc: "Verified badge builds trust.",
    },
    {
      title: "Live Review Alerts",
      desc: "Instant notifications for new reviews.",
    },
  ];
  const container = document.getElementById("portal-container");
  container.innerHTML = `<div class="biz-card" style="max-width:600px;margin:0 auto">
    <div class="paywall-hero"><div class="paywall-inner"><div class="paywall-price"><span class="paywall-currency">N$</span><span class="paywall-amount font-display">200</span><span class="paywall-per">/month</span></div><p class="paywall-desc">Namibia's most trusted consumer review platform</p></div></div>
    <h4 style="font-weight:600;margin-bottom:1rem"><svg width="16" height="16" fill="none" stroke="var(--nam-gold)" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Everything included:</h4>
    <div class="benefit-list">${benefits
      .map(
        (b) =>
          `<div class="benefit-item"><div class="benefit-icon"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div><div><div class="benefit-title">${esc(
            b.title
          )}</div><div class="benefit-desc">${esc(b.desc)}</div></div></div>`
      )
      .join("")}</div>
    <div class="security-note"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>Secure payment · Cancel anytime</div>
    <div style="display:flex;gap:0.75rem"><button class="btn btn-outline" style="flex:1" onclick="renderAuth()">Go Back</button><button class="btn btn-gold" style="flex:1" onclick="doPay()">Pay N$200 & Activate</button></div></div>`;
}
function doPay() {
  if (!pendingReg) return;
  const mPaymentId = "SU_" + Date.now();
  const form = document.createElement("form");
  form.method = "POST";
  form.action = PAYFAST.SANDBOX
    ? "https://sandbox.payfast.co.za/eng/process"
    : "https://www.payfast.co.za/eng/process";
  form.target = "payfast_popup";
  const fields = {
    merchant_id: PAYFAST.MERCHANT_ID,
    merchant_key: PAYFAST.MERCHANT_KEY,
    return_url:
      window.location.origin +
      window.location.pathname +
      "?pf_status=success&ref=" +
      mPaymentId,
    cancel_url:
      window.location.origin +
      window.location.pathname +
      "?pf_status=cancelled",
    email_address: pendingReg.email,
    m_payment_id: mPaymentId,
    amount: PAYFAST.AMOUNT,
    item_name: (
      "SpeakUp Namibia – Business Registration (" +
      pendingReg.bizName +
      ")"
    ).substring(0, 100),
  };
  Object.entries(fields).forEach(([k, v]) => {
    const i = document.createElement("input");
    i.type = "hidden";
    i.name = k;
    i.value = v;
    form.appendChild(i);
  });
  document.body.appendChild(form);
  const popup = window.open("", "payfast_popup", "width=720,height=620");
  if (!popup) {
    toast("Please allow popups for payment.", "error");
    document.body.removeChild(form);
    return;
  }
  form.submit();
  document.body.removeChild(form);
  const storageKey = `payfast_${mPaymentId}`;
  localStorage.removeItem(storageKey);
  const poll = setInterval(() => {
    if (popup.closed) {
      clearInterval(poll);
      toast("Payment cancelled.", "info");
      return;
    }
    const status = localStorage.getItem(storageKey);
    if (status === "success") {
      clearInterval(poll);
      popup.close();
      localStorage.removeItem(storageKey);
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      const newBiz = {
        id: Date.now(),
        businessName: pendingReg.bizName,
        category: pendingReg.category,
        email: pendingReg.email,
        passwordHash: pendingReg.passwordHash,
        salt: pendingReg.salt,
        subscriptionExpiry: expiry.toISOString(),
        registeredOn: new Date().toISOString(),
        lastPaymentRef: mPaymentId,
        lastPaymentDate: new Date().toISOString(),
      };
      businesses.push(newBiz);
      saveBusinesses();
      setSession({
        id: newBiz.id,
        businessName: newBiz.businessName,
        email: newBiz.email,
        category: newBiz.category,
      });
      toast(`Welcome to SpeakUp Namibia, ${newBiz.businessName}!`);
      renderPortal();
    } else if (status === "cancelled") {
      clearInterval(poll);
      popup.close();
      localStorage.removeItem(storageKey);
      toast("Payment cancelled.", "info");
    }
  }, 600);
}
function handlePaymentReturn() {
  const params = new URLSearchParams(window.location.search),
    status = params.get("pf_status"),
    ref = params.get("ref");
  if (status && ref) {
    localStorage.setItem(`payfast_${ref}`, status);
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// ----- Dashboard Tabs -----
function switchTab(tab) {
  currentTab = tab;
  renderDashboard();
  if (window.innerWidth < 768)
    document.getElementById("bizSidebar").classList.remove("open");
}
function updateActiveNav() {
  document
    .querySelectorAll(".biz-nav-item")
    .forEach((el) => el.classList.remove("active"));
  const map = {
    overview: "navOverview",
    reviews: "navReviews",
    settings: "navSettings",
    consumerview: "navConsumerView",
    renew: "navRenew",
  };
  if (map[currentTab])
    document.getElementById(map[currentTab]).classList.add("active");
}
function renderDashboard() {
  const biz = currentBusiness,
    bizData = businesses.find((b) => b.id === biz.id);
  const bizReviews = reviews.filter(
    (r) => r.businessName.toLowerCase() === biz.businessName.toLowerCase()
  );
  const avg = bizReviews.length
    ? (
        bizReviews.reduce((a, r) => a + r.rating, 0) / bizReviews.length
      ).toFixed(1)
    : "—";
  const isActive = isSubscriptionActive(bizData);
  const container = document.getElementById("portal-container");
  const headerHtml =
    currentTab === "overview"
      ? `<div class="dashboard-header" style="background:var(--nam-dark);border-radius:var(--radius);padding:1.5rem;margin-bottom:1.5rem;color:white"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div class="dash-eyebrow">Business Dashboard</div><h2 class="font-display" style="font-size:1.5rem;margin:0.25rem 0">${esc(
          biz.businessName
        )}</h2><div><span class="rc-verified" style="background:rgba(27,94,32,0.3);color:#81C784;padding:0.15rem 0.6rem;border-radius:999px;font-size:0.7rem">✓ VERIFIED</span> <span style="font-size:0.8125rem;color:rgba(255,255,255,0.55)">${esc(
          biz.category
        )}</span></div></div><button class="btn btn-gold btn-sm" onclick="openWriteReviewModal()">Write Review</button></div>${
          bizData
            ? `<div class="sub-bar" style="margin-top:1rem;background:rgba(255,255,255,0.08);border-radius:var(--radius);padding:0.875rem 1rem;display:flex;align-items:center;justify-content:space-between"><div><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Subscription expires: <strong>${formatDate(
                bizData.subscriptionExpiry
              )}</strong></div><span class="sub-badge ${
                isActive ? "active" : "expired"
              }" style="font-family:'JetBrains Mono',monospace;font-size:0.6875rem;padding:0.2rem 0.6rem;border-radius:999px;background:${
                isActive ? "rgba(27,94,32,0.3)" : "rgba(139,26,14,0.3)"
              };color:${isActive ? "#81C784" : "#EF9A9A"}">${
                isActive ? "ACTIVE" : "EXPIRED"
              }</span></div>`
            : ""
        }</div>`
      : "";
  container.innerHTML = `<div class="dashboard-container" style="max-width:100%">${headerHtml}<div id="dash-content"></div></div>`;
  if (currentTab === "overview") renderOverview(bizReviews, avg);
  else if (currentTab === "reviews") renderMyReviewsList(bizReviews);
  else if (currentTab === "settings") renderSettings(bizData);
  else if (currentTab === "consumerview") renderConsumerView();
  else if (currentTab === "renew") renderRenewal(bizData);
  updateActiveNav();
}
function renderOverview(bizReviews, avg) {
  const dist = [5, 4, 3, 2, 1].map((r) => ({
    star: r,
    count: bizReviews.filter((rev) => rev.rating === r).length,
    pct: bizReviews.length
      ? Math.round(
          (bizReviews.filter((rev) => rev.rating === r).length /
            bizReviews.length) *
            100
        )
      : 0,
  }));
  document.getElementById(
    "dash-content"
  ).innerHTML = `<div class="dashboard-stats"><div class="dash-stat-card"><div class="dash-stat-value">${
    bizReviews.length
  }</div><div class="dash-stat-label">Total Reviews</div></div><div class="dash-stat-card"><div class="dash-stat-value" style="color:var(--nam-gold)">${avg}</div><div class="dash-stat-label">Avg Rating</div></div><div class="dash-stat-card"><div class="dash-stat-value" style="color:var(--nam-green)">${
    bizReviews.filter((r) => (r.comments || []).length > 0).length
  }</div><div class="dash-stat-label">With Comments</div></div></div>
    <div class="rating-dist" style="background:var(--card);border-radius:var(--radius);padding:1rem;border:1px solid var(--border)"><div style="font-weight:600;margin-bottom:0.875rem">Rating Breakdown</div>${dist
      .map(
        (d) =>
          `<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem"><span style="font-weight:600;width:2rem;text-align:right">★ ${d.star}</span><div style="flex:1;background:var(--border);border-radius:999px;height:8px;overflow:hidden"><div style="height:100%;border-radius:999px;background:var(--nam-gold);width:${d.pct}%"></div></div><span style="width:1.5rem;color:var(--fg-muted)">${d.count}</span></div>`
      )
      .join("")}</div>
    <button class="btn btn-outline btn-sm" style="margin-top:1rem" onclick="exportReviewsCSV()">Export as CSV</button>`;
}
function renderMyReviewsList(bizReviews) {
  if (!bizReviews.length) {
    document.getElementById(
      "dash-content"
    ).innerHTML = `<p style="color:var(--fg-muted);text-align:center;padding:2rem 0">No reviews for your business yet.</p>`;
    return;
  }
  document.getElementById(
    "dash-content"
  ).innerHTML = `<div style="display:flex;flex-direction:column;gap:1rem">${bizReviews
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(
      (r) =>
        `<div style="background:var(--bg);border-radius:var(--radius);padding:1rem;border-left:3px solid ${getRatingColor(
          r.rating
        )}"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem"><div><div style="font-weight:600">${esc(
          r.title
        )}</div><div style="font-size:0.75rem;color:var(--fg-muted)">${esc(
          r.userName
        )} · ${formatDate(
          r.date
        )}</div></div><div style="background:${getRatingColor(
          r.rating
        )}18;padding:0.25rem 0.625rem;border-radius:var(--radius);font-weight:700">${
          r.rating
        }</div></div><div style="font-size:0.875rem;color:var(--fg-muted);margin-bottom:0.75rem">${esc(
          r.content
        )}</div><button class="btn btn-outline btn-sm" onclick="openReplyModal(${
          r.id
        })">Reply as Business</button></div>`
    )
    .join("")}</div>`;
}
function renderSettings(bizData) {
  const isActive = isSubscriptionActive(bizData);
  document.getElementById(
    "dash-content"
  ).innerHTML = `<div style="background:var(--card);border-radius:var(--radius);padding:1rem;border:1px solid var(--border);margin-bottom:1.5rem"><div style="font-weight:600;margin-bottom:0.875rem">Business Information</div><div><label class="label">Business Name</label><input class="input" id="settings-biz-name" type="text" value="${esc(
    currentBusiness.businessName
  )}" ${
    !isActive ? "disabled" : ""
  }></div><div style="margin-top:0.75rem"><label class="label">Category</label><div class="select-wrap"><select class="input" id="settings-cat" ${
    !isActive ? "disabled" : ""
  }>${CATEGORIES.map(
    (c) =>
      `<option value="${c}" ${
        c === currentBusiness.category ? "selected" : ""
      }>${esc(c)}</option>`
  ).join(
    ""
  )}</select></div></div><button class="btn btn-primary btn-sm" style="margin-top:1rem" onclick="saveProfileChanges()" ${
    !isActive ? "disabled" : ""
  }>Save Changes</button></div>
    <div style="background:var(--card);border-radius:var(--radius);padding:1rem;border:1px solid var(--border)"><div style="font-weight:600;margin-bottom:0.875rem">Change Password</div><div class="form-space"><div><label class="label">New Password</label><input class="input" id="dash-new-pwd" type="password" placeholder="At least 6 characters"></div><div><label class="label">Confirm Password</label><input class="input" id="dash-confirm-pwd" type="password" placeholder="Repeat password"></div><button class="btn btn-primary btn-sm" onclick="saveDashPassword()">Save Password</button></div></div>`;
}
async function saveProfileChanges() {
  const bizData = businesses.find((b) => b.id === currentBusiness.id);
  if (!checkSubscriptionAndWarn(bizData)) return;
  const newName = document.getElementById("settings-biz-name").value.trim(),
    newCat = document.getElementById("settings-cat").value;
  if (!newName || !newCat) {
    toast("All fields required.", "error");
    return;
  }
  if (
    businesses.some(
      (b) =>
        b.id !== currentBusiness.id &&
        b.businessName.toLowerCase() === newName.toLowerCase()
    )
  ) {
    toast("Another business is already using that name.", "error");
    return;
  }
  bizData.businessName = newName;
  bizData.category = newCat;
  saveBusinesses();
  setSession({
    id: bizData.id,
    businessName: newName,
    email: bizData.email,
    category: newCat,
  });
  toast("Profile updated.");
  renderDashboard();
}
async function saveDashPassword() {
  const bizData = businesses.find((b) => b.id === currentBusiness.id);
  if (!checkSubscriptionAndWarn(bizData)) return;
  const p1 = document.getElementById("dash-new-pwd")?.value,
    p2 = document.getElementById("dash-confirm-pwd")?.value;
  if (!p1 || p1.length < 6) {
    toast("Password must be at least 6 characters.", "error");
    return;
  }
  if (p1 !== p2) {
    toast("Passwords do not match.", "error");
    return;
  }
  const { hash, salt } = await hashPassword(p1);
  bizData.passwordHash = hash;
  bizData.salt = salt;
  saveBusinesses();
  toast("Password updated.");
  document.getElementById("dash-new-pwd").value = document.getElementById(
    "dash-confirm-pwd"
  ).value = "";
}
function renderRenewal(bizData) {
  document.getElementById(
    "dash-content"
  ).innerHTML = `<div class="biz-card" style="max-width:500px;margin:0 auto;text-align:center"><h3>Renew Your Subscription</h3><p>Your subscription expired on ${formatDate(
    bizData.subscriptionExpiry
  )}.</p><div class="paywall-price" style="margin:1.5rem 0"><span class="paywall-currency">N$</span><span class="paywall-amount font-display">200</span><span class="paywall-per">/month</span></div><button class="btn btn-gold" style="width:100%" onclick="doRenew()">Renew N$200</button></div>`;
}
function doRenew() {
  const bizData = businesses.find((b) => b.id === currentBusiness.id);
  if (!bizData) return;
  const mPaymentId = "RENEW_" + Date.now();
  const form = document.createElement("form");
  form.method = "POST";
  form.action = PAYFAST.SANDBOX
    ? "https://sandbox.payfast.co.za/eng/process"
    : "https://www.payfast.co.za/eng/process";
  form.target = "payfast_renew";
  const fields = {
    merchant_id: PAYFAST.MERCHANT_ID,
    merchant_key: PAYFAST.MERCHANT_KEY,
    return_url:
      window.location.origin +
      window.location.pathname +
      "?pf_status=success&ref=" +
      mPaymentId,
    cancel_url:
      window.location.origin +
      window.location.pathname +
      "?pf_status=cancelled",
    email_address: bizData.email,
    m_payment_id: mPaymentId,
    amount: PAYFAST.AMOUNT,
    item_name: "SpeakUp Namibia – Subscription Renewal",
  };
  Object.entries(fields).forEach(([k, v]) => {
    const i = document.createElement("input");
    i.type = "hidden";
    i.name = k;
    i.value = v;
    form.appendChild(i);
  });
  document.body.appendChild(form);
  const popup = window.open("", "payfast_renew", "width=720,height=620");
  if (!popup) {
    toast("Please allow popups.", "error");
    document.body.removeChild(form);
    return;
  }
  form.submit();
  document.body.removeChild(form);
  const storageKey = `payfast_${mPaymentId}`;
  localStorage.removeItem(storageKey);
  const poll = setInterval(() => {
    if (popup.closed) {
      clearInterval(poll);
      return;
    }
    const status = localStorage.getItem(storageKey);
    if (status === "success") {
      clearInterval(poll);
      popup.close();
      localStorage.removeItem(storageKey);
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      bizData.subscriptionExpiry = expiry.toISOString();
      bizData.lastPaymentDate = new Date().toISOString();
      bizData.lastPaymentRef = mPaymentId;
      saveBusinesses();
      toast("Subscription renewed!");
      switchTab("overview");
    } else if (status === "cancelled") {
      clearInterval(poll);
      popup.close();
      toast("Renewal cancelled.", "info");
    }
  }, 600);
}
function openForgotPasswordModal() {
  document.getElementById("forgot-password-modal").classList.add("open");
  document.getElementById("reset-err").style.display = "none";
  document.getElementById("temp-password-display").style.display = "none";
}
function closeForgotPasswordModal() {
  document.getElementById("forgot-password-modal").classList.remove("open");
}
async function doResetPassword() {
  const email = document
      .getElementById("reset-email")
      .value.trim()
      .toLowerCase(),
    err = document.getElementById("reset-err"),
    biz = businesses.find((b) => b.email === email);
  if (!biz) {
    err.textContent = "No account found with that email.";
    err.style.display = "block";
    return;
  }
  const tempPassword = generateTempPassword(10);
  tempPasswordValue = tempPassword;
  const { hash, salt } = await hashPassword(tempPassword);
  biz.passwordHash = hash;
  biz.salt = salt;
  saveBusinesses();
  document.getElementById("temp-pwd-value").textContent = tempPassword;
  document.getElementById("temp-password-display").style.display = "block";
  err.style.display = "none";
  toast("Temporary password generated. Please copy it.", "info");
}
function copyTempPassword() {
  navigator.clipboard
    ?.writeText(tempPasswordValue)
    .then(() => toast("Password copied!", "success"))
    .catch(() => toast("Press Ctrl+C to copy", "error"));
}

// ----- Write Review (Business) -----
function openWriteReviewModal() {
  const bizData = businesses.find((b) => b.id === currentBusiness.id);
  if (!checkSubscriptionAndWarn(bizData)) return;
  document.getElementById("biz-wr-biz").value = currentBusiness.businessName;
  const catSelect = document.getElementById("biz-wr-cat");
  catSelect.innerHTML = CATEGORIES.map(
    (c) =>
      `<option value="${c}" ${
        c === currentBusiness.category ? "selected" : ""
      }>${esc(c)}</option>`
  ).join("");
  bizWrRating = 0;
  bizWrHover = 0;
  renderBizStarsInput();
  document.getElementById("biz-wr-title").value = "";
  document.getElementById("biz-wr-content").value = "";
  document.getElementById("write-review-modal").classList.add("open");
}
function closeWriteReviewModal() {
  document.getElementById("write-review-modal").classList.remove("open");
}
function renderBizStarsInput() {
  const container = document.getElementById("biz-wr-stars");
  const display = bizWrHover || bizWrRating;
  container.innerHTML = [1, 2, 3, 4, 5]
    .map(
      (star) =>
        `<button type="button" class="star-btn" onclick="setBizRating(${star})" onmouseenter="hoverBizStar(${star})" onmouseleave="hoverBizStar(0)"><svg width="32" height="32" viewBox="0 0 24 24" fill="${
          star <= display ? "var(--nam-gold)" : "none"
        }" stroke="${
          star <= display ? "var(--nam-gold)" : "#c8c0b0"
        }" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></button>`
    )
    .join("");
  document.getElementById("biz-wr-rating-word").textContent = display
    ? ["", "Terrible", "Poor", "Average", "Good", "Excellent"][display]
    : "";
}
function setBizRating(n) {
  bizWrRating = n;
  renderBizStarsInput();
}
function hoverBizStar(n) {
  bizWrHover = n;
  renderBizStarsInput();
}
function submitBusinessReview() {
  const bizData = businesses.find((b) => b.id === currentBusiness.id);
  if (!checkSubscriptionAndWarn(bizData)) return;
  const biz =
    document.getElementById("biz-wr-biz").value.trim() ||
    currentBusiness.businessName;
  const cat = document.getElementById("biz-wr-cat").value;
  const title = document.getElementById("biz-wr-title").value.trim();
  const content = document.getElementById("biz-wr-content").value.trim();
  if (!biz || !cat || !title || !content || bizWrRating === 0) {
    toast("All fields are required, including a star rating.", "error");
    return;
  }
  const newReview = {
    id: Date.now(),
    businessName: biz,
    category: cat,
    rating: bizWrRating,
    title,
    content,
    userName: currentBusiness.businessName,
    date: new Date().toISOString(),
    comments: [],
  };
  reviews.unshift(newReview);
  saveReviews();
  toast("Your review has been published!");
  closeWriteReviewModal();
  if (currentTab === "consumerview") renderConsumerView();
  else renderDashboard();
}
function openReplyModal(reviewId) {
  const bizData = businesses.find((b) => b.id === currentBusiness.id);
  if (!checkSubscriptionAndWarn(bizData)) return;
  currentReplyReviewId = reviewId;
  const rev = reviews.find((r) => r.id === reviewId);
  document.getElementById("reply-modal-review-title").textContent = rev
    ? `Replying to: ${rev.title}`
    : "";
  document.getElementById("reply-text").value = "";
  document.getElementById("reply-modal").classList.add("open");
}
function closeReplyModal() {
  document.getElementById("reply-modal").classList.remove("open");
  currentReplyReviewId = null;
}
function submitBusinessReply() {
  const bizData = businesses.find((b) => b.id === currentBusiness.id);
  if (!checkSubscriptionAndWarn(bizData)) return;
  if (!currentReplyReviewId) return;
  const text = document.getElementById("reply-text").value.trim();
  if (!text) {
    toast("Please enter a reply.", "error");
    return;
  }
  const revIdx = reviews.findIndex((r) => r.id === currentReplyReviewId);
  if (revIdx === -1) return;
  const rev = reviews[revIdx];
  const newComment = {
    id: "c" + Date.now() + Math.random().toString(36).slice(2),
    author: currentBusiness.businessName,
    text,
    date: new Date().toISOString(),
    isBusiness: true,
    replies: [],
  };
  reviews[revIdx] = { ...rev, comments: [...(rev.comments || []), newComment] };
  saveReviews();
  toast("Reply posted as verified business!");
  closeReplyModal();
  if (currentTab === "reviews")
    renderMyReviewsList(
      reviews.filter(
        (r) =>
          r.businessName.toLowerCase() ===
          currentBusiness.businessName.toLowerCase()
      )
    );
  else if (currentTab === "consumerview") renderConsumerView();
}
function getFilteredConsumerReviews() {
  let f = [...reviews];
  const { search, cat, rating, sort } = consumerFilter;
  if (search.trim())
    f = f.filter(
      (r) =>
        r.businessName.toLowerCase().includes(search.trim().toLowerCase()) ||
        r.title.toLowerCase().includes(search.trim().toLowerCase())
    );
  if (cat !== "all") f = f.filter((r) => r.category === cat);
  if (rating !== "all") f = f.filter((r) => r.rating === parseInt(rating));
  f.sort((a, b) =>
    sort === "newest"
      ? new Date(b.date) - new Date(a.date)
      : b.rating - a.rating
  );
  return f;
}
function updateConsumerFilter(key, value) {
  consumerFilter[key] = value;
  renderConsumerView();
}
function renderConsumerView() {
  try {
    const stored = localStorage.getItem(STORAGE.REVIEWS);
    if (stored) reviews = JSON.parse(stored);
  } catch (e) {}
  const filtered = getFilteredConsumerReviews();
  const catOptions = CATEGORIES.map(
    (c) =>
      `<option value="${c}" ${consumerFilter.cat === c ? "selected" : ""}>${esc(
        c
      )}</option>`
  ).join("");
  const ratingOptions = [5, 4, 3, 2, 1]
    .map(
      (r) =>
        `<option value="${r}" ${
          consumerFilter.rating == r ? "selected" : ""
        }>★×${r} — ${
          r >= 5
            ? "Excellent"
            : r >= 4
            ? "Good"
            : r >= 3
            ? "Average"
            : r >= 2
            ? "Poor"
            : "Terrible"
        }</option>`
    )
    .join("");
  const html = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <h3 style="font-family:'Fraunces',serif">All Consumer Reviews <span style="font-size:0.875rem;color:var(--fg-muted)">(${
        filtered.length
      })</span></h3>
      <button class="btn btn-outline btn-sm" onclick="loadState();renderConsumerView()">↻ Refresh</button>
    </div>
    <div style="margin-bottom:1.5rem;display:flex;flex-wrap:wrap;gap:0.75rem">
      <div style="flex:1;min-width:200px"><input class="input" id="consumerSearch" placeholder="Search business..." value="${esc(
        consumerFilter.search
      )}" oninput="updateConsumerFilter('search', this.value)"></div>
      <div style="min-width:160px"><div class="select-wrap"><select class="input" onchange="updateConsumerFilter('cat', this.value)"><option value="all" ${
        consumerFilter.cat === "all" ? "selected" : ""
      }>All Categories</option>${catOptions}</select></div></div>
      <div style="min-width:140px"><div class="select-wrap"><select class="input" onchange="updateConsumerFilter('rating', this.value)"><option value="all" ${
        consumerFilter.rating === "all" ? "selected" : ""
      }>All Ratings</option>${ratingOptions}</select></div></div>
      <div style="min-width:140px"><div class="select-wrap"><select class="input" onchange="updateConsumerFilter('sort', this.value)"><option value="newest" ${
        consumerFilter.sort === "newest" ? "selected" : ""
      }>Newest</option><option value="highest" ${
    consumerFilter.sort === "highest" ? "selected" : ""
  }>Highest Rated</option></select></div></div>
    </div>
    <div class="reviews-grid" style="grid-template-columns:1fr">${
      filtered.length
        ? filtered
            .map((r) => {
              const verified = isVerifiedBiz(r.businessName);
              const commentCount = (r.comments || []).reduce(
                (a, c) => a + 1 + (c.replies || []).length,
                0
              );
              const hasBusinessReply = (r.comments || []).some(
                (c) => c.isBusiness
              );
              return `<div class="review-card" style="border-left-color:${getRatingColor(
                r.rating
              )}"><div class="rc-inner">
        <div class="rc-header"><div><span class="rc-biz-name">${esc(
          r.businessName
        )}</span>${
                verified ? '<span class="rc-verified">✓ Verified</span>' : ""
              }</div>
        <div class="rc-rating-badge" style="background:${getRatingColor(
          r.rating
        )}18"><span class="rc-rating-num" style="color:${getRatingColor(
                r.rating
              )}">${r.rating}</span></div></div>
        <div class="rc-stars">${starsSVG(
          r.rating,
          14
        )}</div><div style="font-size:0.75rem;color:var(--fg-muted)">${esc(
                r.category
              )}</div>
        <div class="rc-title">${esc(
          r.title
        )}</div><div class="rc-content">${esc(r.content)}</div>
        <div class="rc-meta"><span>${esc(r.userName)} · ${formatDate(r.date)}${
                commentCount > 0 ? ` · 💬 ${commentCount}` : ""
              }${
                hasBusinessReply
                  ? ' · <span style="color:var(--nam-green)">Business replied</span>'
                  : ""
              }</span>
        ${
          currentBusiness &&
          r.businessName.toLowerCase() ===
            currentBusiness.businessName.toLowerCase()
            ? `<button class="btn btn-outline btn-sm" onclick="openReplyModal(${r.id})">Reply</button>`
            : ""
        }</div>
      </div></div>`;
            })
            .join("")
        : '<p style="color:var(--fg-muted);text-align:center">No reviews match filters.</p>'
    }</div>`;
  document.getElementById("dash-content").innerHTML = html;
}
function exportReviewsCSV() {
  const bizReviews = reviews.filter(
    (r) =>
      r.businessName.toLowerCase() ===
      currentBusiness.businessName.toLowerCase()
  );
  const csvRows = [["Date", "Rating", "Title", "Content", "User", "Comments"]];
  bizReviews.forEach((r) =>
    csvRows.push([
      r.date,
      r.rating,
      r.title,
      r.content.replace(/,/g, " "),
      r.userName,
      (r.comments || []).length,
    ])
  );
  const csvContent = csvRows
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reviews_${currentBusiness.businessName.replace(
    /\s/g,
    "_"
  )}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
function updateLastVisit() {
  const last = localStorage.getItem(STORAGE.LAST_VISIT);
  const now = new Date().toISOString();
  localStorage.setItem(STORAGE.LAST_VISIT, now);
  if (currentBusiness) {
    const newReviews = reviews.filter(
      (r) =>
        r.businessName.toLowerCase() ===
          currentBusiness.businessName.toLowerCase() && r.date > (last || 0)
    );
    if (newReviews.length)
      toast(`You have ${newReviews.length} new review(s)!`, "info");
  }
}
function doLogout() {
  setSession(null);
  renderPortal();
  toast("Logged out.");
}

// ----- Hamburger Toggle -----
function toggleSidebar() {
  const sidebar = document.getElementById("bizSidebar");
  const openBtn = document.getElementById("ham-open");
  const closeBtn = document.getElementById("ham-close");
  sidebar.classList.toggle("open");
  const isOpen = sidebar.classList.contains("open");
  openBtn.style.display = isOpen ? "none" : "block";
  closeBtn.style.display = isOpen ? "block" : "none";
}

// ----- Init -----
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  handlePaymentReturn();
  document.getElementById("footer-year").textContent = new Date().getFullYear();
  renderPortal();
  document
    .getElementById("navOverview")
    .addEventListener("click", () => switchTab("overview"));
  document
    .getElementById("navReviews")
    .addEventListener("click", () => switchTab("reviews"));
  document
    .getElementById("navSettings")
    .addEventListener("click", () => switchTab("settings"));
  document
    .getElementById("navConsumerView")
    .addEventListener("click", () => switchTab("consumerview"));
  document
    .getElementById("navRenew")
    .addEventListener("click", () => switchTab("renew"));
  document
    .getElementById("bizHamburger")
    .addEventListener("click", toggleSidebar);
  window.addEventListener("click", (e) => {
    if (
      window.innerWidth < 768 &&
      !e.target.closest(".biz-sidebar") &&
      !e.target.closest(".hamburger")
    ) {
      document.getElementById("bizSidebar").classList.remove("open");
      document.getElementById("ham-open").style.display = "block";
      document.getElementById("ham-close").style.display = "none";
    }
  });
  window.addEventListener("resize", () => {
    if (currentBusiness) {
      const main = document.querySelector(".biz-main");
      const hamburger = document.getElementById("bizHamburger");
      if (window.innerWidth >= 768) {
        main.style.marginLeft = "260px";
        hamburger.style.display = "none";
        document.getElementById("bizSidebar").classList.remove("open");
        document.getElementById("ham-open").style.display = "block";
        document.getElementById("ham-close").style.display = "none";
      } else {
        main.style.marginLeft = "0";
        hamburger.style.display = "flex";
      }
    }
  });
});

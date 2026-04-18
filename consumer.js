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
  LAST_VISIT: "speakup_consumer_last_visit",
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

// ----- State -----
let reviews = [],
  businesses = [],
  currentBusiness = null;
let filterSearch = "",
  filterCat = "all",
  filterRating = "all",
  filterSort = "newest";
let highlightId = null,
  detailReviewId = null,
  wrRating = 0,
  wrHover = 0;

// ----- Helpers -----
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
  try {
    localStorage.setItem(STORAGE.REVIEWS, JSON.stringify(reviews));
  } catch (e) {
    console.warn("Could not save reviews:", e);
  }
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
function countComments(cs = []) {
  return cs.reduce((a, c) => a + 1 + countComments(c.replies || []), 0);
}
function getRatingColor(r) {
  if (r >= 5) return "var(--r5)";
  if (r >= 4) return "var(--r4)";
  if (r >= 3) return "var(--r3)";
  if (r >= 2) return "var(--r2)";
  return "var(--r1)";
}
function getRatingLabel(r) {
  if (r >= 5) return "Excellent";
  if (r >= 4) return "Good";
  if (r >= 3) return "Average";
  if (r >= 2) return "Poor";
  return "Terrible";
}
function isVerifiedBiz(name) {
  return businesses.some(
    (b) => b.businessName.toLowerCase() === name.toLowerCase()
  );
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
function findComment(cs, id) {
  for (const c of cs) {
    if (c.id === id) return c;
    const f = findComment(c.replies || [], id);
    if (f) return f;
  }
  return null;
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

// ----- Filters -----
function getFiltered() {
  let f = [...reviews];
  if (filterSearch.trim())
    f = f.filter((r) =>
      r.businessName.toLowerCase().includes(filterSearch.trim().toLowerCase())
    );
  if (filterCat !== "all") f = f.filter((r) => r.category === filterCat);
  if (filterRating !== "all")
    f = f.filter((r) => r.rating === parseInt(filterRating));
  f.sort((a, b) =>
    filterSort === "newest"
      ? new Date(b.date) - new Date(a.date)
      : b.rating - a.rating
  );
  return f;
}
function renderFilters() {
  const cats = CATEGORIES.map(
    (c) =>
      `<option value="${c}" ${filterCat === c ? "selected" : ""}>${esc(
        c
      )}</option>`
  ).join("");
  const ratingOpts = [5, 4, 3, 2, 1]
    .map(
      (r) =>
        `<option value="${r}" ${
          filterRating == r ? "selected" : ""
        }>★×${r} — ${getRatingLabel(r)}</option>`
    )
    .join("");
  const activeCount =
    (filterCat !== "all" ? 1 : 0) + (filterRating !== "all" ? 1 : 0);
  const html = `
    <div class="filter-group"><div class="filter-label"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Search</div>
    <div class="input-with-icon"><div class="icon"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
    <input class="input" id="filter-search" type="text" placeholder="Business name…" value="${esc(
      filterSearch
    )}" oninput="onSearch(this.value)"></div></div>
    <div class="filter-group"><div class="filter-label"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> Category</div>
    <div class="select-wrap"><select class="input" id="filter-cat" onchange="onCat(this.value)"><option value="all" ${
      filterCat === "all" ? "selected" : ""
    }>All Categories</option>${cats}</select></div></div>
    <div class="filter-group"><div class="filter-label"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Rating</div>
    <div class="select-wrap"><select class="input" id="filter-rating" onchange="onRating(this.value)"><option value="all" ${
      filterRating === "all" ? "selected" : ""
    }>All Ratings</option>${ratingOpts}</select></div></div>
    <div class="filter-group"><div class="filter-label"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg> Sort By</div>
    <div class="select-wrap"><select class="input" id="filter-sort" onchange="onSort(this.value)"><option value="newest" ${
      filterSort === "newest" ? "selected" : ""
    }>Newest First</option><option value="highest" ${
    filterSort === "highest" ? "selected" : ""
  }>Highest Rated</option></select></div></div>
    ${
      activeCount > 0
        ? `<button class="btn btn-ghost" style="width:100%;color:var(--fg-muted)" onclick="clearFilters()">Clear ${activeCount} filter${
            activeCount > 1 ? "s" : ""
          }</button>`
        : ""
    }`;
  document.getElementById("filter-form-desktop").innerHTML = html;
  document.getElementById("filter-form-mobile").innerHTML = html;
}
function onSearch(v) {
  filterSearch = v;
  renderReviews();
}
function onCat(v) {
  filterCat = v;
  renderFilters();
  renderReviews();
}
function onRating(v) {
  filterRating = v;
  renderFilters();
  renderReviews();
}
function onSort(v) {
  filterSort = v;
  renderFilters();
  renderReviews();
}
function clearFilters() {
  filterCat = "all";
  filterRating = "all";
  filterSearch = "";
  renderFilters();
  renderReviews();
}
function toggleMobileFilters() {
  document.getElementById("mobile-filter-panel").classList.toggle("open");
}

// ----- Render Reviews -----
function renderReviews() {
  const filtered = getFiltered();
  const grid = document.getElementById("reviews-grid");
  document.getElementById("filtered-count").textContent = filtered.length;
  document.getElementById("filtered-label").textContent =
    filtered.length === reviews.length
      ? "total reviews"
      : `of ${reviews.length} reviews`;
  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><line x1="9" y1="10" x2="15" y2="10"/></svg></div><h3 class="empty-h3 font-display">No reviews found</h3><p class="empty-p">Try adjusting your filters or be the first to speak up.</p></div>`;
    return;
  }
  grid.innerHTML = filtered
    .map((rev, i) => {
      const verified = isVerifiedBiz(rev.businessName);
      const cc = countComments(rev.comments || []);
      const rc = getRatingColor(rev.rating);
      const rl = getRatingLabel(rev.rating);
      const isNew = rev.id === highlightId;
      return `<div class="review-card ${
        isNew ? "highlight" : ""
      }" style="border-left-color:${rc};animation-delay:${Math.min(
        i * 60,
        360
      )}ms" data-id="${rev.id}">
      <div class="rc-inner"><div class="rc-header"><div><span class="rc-biz-name">${esc(
        rev.businessName
      )}</span>${
        verified ? `<span class="rc-verified">✓ Verified</span>` : ""
      }</div>
      <div class="rc-rating-badge" style="background:${rc}18"><span class="rc-rating-num" style="color:${rc}">${
        rev.rating
      }</span><span class="rc-rating-lbl" style="color:${rc}">${rl}</span></div></div>
      <div class="rc-stars">${starsSVG(
        rev.rating,
        14
      )}</div><div class="rc-cat"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>${esc(
        rev.category
      )}</div>
      <div class="rc-title">${esc(
        rev.title
      )}</div><div class="rc-content line-clamp-3">${esc(rev.content)}</div>
      <div class="rc-meta"><span class="rc-meta-item"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${esc(
        rev.userName
      )}</span>
      <span class="rc-meta-item"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${formatDate(
        rev.date
      )}</span>${
        cc > 0
          ? `<span class="rc-meta-item"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>${cc}</span>`
          : ""
      }</div>
      <button class="btn btn-outline rc-cta" onclick="openReviewDetail(${
        rev.id
      })">Read &amp; Join Discussion</button></div></div>`;
    })
    .join("");
}

// ----- Hero -----
function renderHero() {
  const total = reviews.length;
  const avg = reviews.length
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";
  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-avg").innerHTML =
    avg + '<span style="font-size:1.25rem">/5</span>';
  document.getElementById("stat-biz").textContent = businesses.length;
  const latest = reviews.slice(0, 3);
  if (latest.length) {
    document.getElementById("hero-cards").style.display = "flex";
    document.getElementById("hero-mini-cards").innerHTML = latest
      .map((rev) => {
        const verified = isVerifiedBiz(rev.businessName);
        const rc = getRatingColor(rev.rating);
        return `<div class="hero-mini-card" style="border-left-color:${rc}"><div class="hero-mini-biz"><span class="hero-mini-biz-name">${esc(
          rev.businessName
        )}</span><div style="display:flex;align-items:center;gap:0.25rem">${
          verified ? `<span class="verified-badge">✓ VERIFIED</span>` : ""
        }<span class="star-num">★ ${
          rev.rating
        }/5</span></div></div><div class="hero-mini-cat">${esc(
          rev.title
        )}</div><div class="hero-mini-snippet line-clamp-2">${esc(
          rev.content
        )}</div><div class="hero-mini-meta">${esc(rev.userName)} · ${formatDate(
          rev.date
        )}</div></div>`;
      })
      .join("");
  }
}

// ----- Write Review -----
function openWriteReview() {
  resetWriteReview();
  const sel = document.getElementById("wr-cat");
  sel.innerHTML =
    `<option value="">Select a category…</option>` +
    CATEGORIES.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join(
      ""
    );
  renderStarsInput();
  document.getElementById("write-review-modal").classList.add("open");
}
function closeWriteReview() {
  document.getElementById("write-review-modal").classList.remove("open");
  resetWriteReview();
}
function resetWriteReview() {
  ["wr-biz", "wr-title", "wr-content", "wr-name"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("wr-cat").value = "";
  wrRating = 0;
  wrHover = 0;
  renderStarsInput();
}
function renderStarsInput() {
  const container = document.getElementById("wr-stars");
  if (!container) return;
  container.innerHTML = [5, 4, 3, 2, 1]
    .map(
      (star) =>
        `<button type="button" class="star-btn" data-star="${star}" data-filled="${
          star <= wrRating
        }" onclick="setRating(${star})" aria-label="${star} star${
          star > 1 ? "s" : ""
        }"><svg width="32" height="32" viewBox="0 0 24 24" fill="${
          star <= wrRating ? "var(--nam-gold)" : "none"
        }" stroke="${
          star <= wrRating ? "var(--nam-gold)" : "#c8c0b0"
        }" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></button>`
    )
    .join("");
  const wordEl = document.getElementById("wr-rating-word");
  const labels = ["", "Terrible", "Poor", "Average", "Good", "Excellent"];
  wordEl.textContent = wrRating ? labels[wrRating] : "";
  // Update label on hover without re-rendering DOM
  container.addEventListener("mouseover", (e) => {
    const btn = e.target.closest(".star-btn");
    if (btn) wordEl.textContent = labels[+btn.dataset.star] || "";
  });
  container.addEventListener("mouseleave", () => {
    wordEl.textContent = wrRating ? labels[wrRating] : "";
  });
}
function setRating(n) {
  wrRating = n;
  wrHover = 0;
  renderStarsInput();
}
function hoverStar(n) {
  // No-op: hover is handled via mouseover listener added in renderStarsInput
}
function submitWriteReview() {
  const biz = document.getElementById("wr-biz").value.trim();
  const cat = document.getElementById("wr-cat").value;
  const title = document.getElementById("wr-title").value.trim();
  const content = document.getElementById("wr-content").value.trim();
  const name = document.getElementById("wr-name").value.trim();
  if (!biz || !cat || !title || !content || !name || wrRating === 0) {
    toast("All fields are required, including a star rating.", "error");
    return;
  }
  const btn = document.getElementById("wr-submit");
  if (btn.disabled) return; // prevent double-submit
  btn.disabled = true;
  btn.textContent = "Publishing…";
  setTimeout(() => {
    try {
      const rev = {
        id: Date.now(),
        businessName: biz,
        category: cat,
        rating: wrRating,
        title,
        content,
        userName: name,
        date: new Date().toISOString(),
        comments: [],
      };
      reviews.unshift(rev);
      saveReviews();
      toast("Your review has been published!");
      closeWriteReview();
      renderHero();
      renderFilters();
      renderReviews();
      highlightId = rev.id;
      setTimeout(() => {
        scrollToReviews();
        setTimeout(() => {
          highlightId = null;
          renderReviews();
        }, 3000);
      }, 200);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Publish Review`;
    }
  }, 400);
}

// ----- Review Detail & Comments -----
function openReviewDetail(id) {
  detailReviewId = id;
  renderReviewDetail();
  document.getElementById("review-detail-modal").classList.add("open");
}
function closeReviewDetail() {
  document.getElementById("review-detail-modal").classList.remove("open");
  detailReviewId = null;
}
function renderReviewDetail() {
  const rev = reviews.find((r) => r.id === detailReviewId);
  if (!rev) return;
  const verified = isVerifiedBiz(rev.businessName);
  const rc = getRatingColor(rev.rating);
  const rl = getRatingLabel(rev.rating);
  document.getElementById("rdt-color-bar").style.background = rc;
  document.getElementById("rdt-biz").textContent = rev.businessName;
  document.getElementById("rdt-verified").style.display = verified
    ? "inline-flex"
    : "none";
  document.getElementById("rdt-stars").innerHTML = starsSVG(rev.rating, 16);
  document.getElementById("rdt-rating-txt").style.color = rc;
  document.getElementById(
    "rdt-rating-txt"
  ).textContent = `${rev.rating}/5 — ${rl}`;
  const defaultName = currentBusiness?.businessName || "";
  document.getElementById("rdt-body").innerHTML = `
    <div class="rdt-meta"><span class="rdt-meta-item"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>${esc(
      rev.category
    )}</span>
    <span class="rdt-meta-item"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${esc(
      rev.userName
    )}</span>
    <span class="rdt-meta-item"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${formatDate(
      rev.date
    )}</span></div>
    <div class="rdt-title font-display">${esc(
      rev.title
    )}</div><div class="rdt-content">${esc(rev.content)}</div>
    <div class="discussion-section"><h4 class="discussion-h"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>Discussion ${
      rev.comments.length
        ? `<span style="font-size:0.75rem;color:var(--fg-muted)">(${rev.comments.length})</span>`
        : ""
    }</h4>
    <div class="comment-form"><input class="input" id="cmt-name" type="text" placeholder="Your name *" value="${esc(
      defaultName
    )}" ${currentBusiness ? "readonly" : ""} style="${
    currentBusiness ? "background:var(--bg)" : ""
  }">
    <textarea class="input textarea" id="cmt-text" rows="3" placeholder="Share your thoughts…"></textarea>
    <button class="btn btn-primary btn-sm" onclick="postComment(null)">Post Comment</button></div>
    <div class="comment-list" id="comment-list"></div></div>`;
  renderComments(rev);
}
function renderComments(rev, showAll = false) {
  const list = document.getElementById("comment-list");
  if (!list) return;
  if (!rev.comments.length) {
    list.innerHTML = `<p style="font-size:0.875rem;color:var(--fg-muted);text-align:center;padding:1rem 0">No comments yet.</p>`;
    return;
  }
  const visible = showAll ? rev.comments : rev.comments.slice(0, 3);
  list.innerHTML =
    visible.map((c) => renderCommentHTML(c, rev.id, 0)).join("") +
    (!showAll && rev.comments.length > 3
      ? `<button class="show-more-comments" onclick="showAllComments(${
          rev.id
        })">Show ${rev.comments.length - 3} more</button>`
      : "");
}
function renderCommentHTML(c, revId, level) {
  const isBiz = c.isBusiness;
  const replies = (c.replies || [])
    .map((r) => renderCommentHTML(r, revId, level + 1))
    .join("");
  return `<div class="${
    level > 0 ? "comment-nested" : ""
  }"><div class="comment-item"><div style="display:flex;align-items:flex-start;justify-content:space-between"><div><span class="comment-author">${esc(
    c.author
  )}</span>${
    isBiz ? `<span class="comment-biz-badge">✓ VERIFIED BUSINESS</span>` : ""
  }</div><span class="comment-date">${formatDate(
    c.date
  )}</span></div><div class="comment-text">${esc(
    c.text
  )}</div><button class="reply-btn" onclick="toggleReply('${
    c.id
  }')">Reply</button><div class="reply-form" id="reply-form-${
    c.id
  }" style="display:none"><input class="input" id="reply-name-${
    c.id
  }" type="text" placeholder="Your name *" value="${esc(
    currentBusiness?.businessName || ""
  )}" ${
    currentBusiness ? "readonly" : ""
  }><textarea class="input textarea" id="reply-text-${
    c.id
  }" rows="2" placeholder="Write a reply…"></textarea><div style="display:flex;gap:0.5rem"><button class="btn btn-primary btn-sm" onclick="postComment('${
    c.id
  }')">Post Reply</button><button class="btn btn-ghost btn-sm" onclick="toggleReply('${
    c.id
  }')">Cancel</button></div></div></div>${replies}</div>`;
}
function toggleReply(commentId) {
  const f = document.getElementById(`reply-form-${commentId}`);
  if (f) f.style.display = f.style.display === "none" ? "flex" : "none";
}
function postComment(parentId) {
  const rev = reviews.find((r) => r.id === detailReviewId);
  if (!rev) return;
  let name, text;
  if (parentId) {
    name = document.getElementById(`reply-name-${parentId}`)?.value.trim();
    text = document.getElementById(`reply-text-${parentId}`)?.value.trim();
  } else {
    name = document.getElementById("cmt-name")?.value.trim();
    text = document.getElementById("cmt-text")?.value.trim();
  }
  if (!name || !text) {
    toast("Please enter name and comment.", "error");
    return;
  }
  const isBiz = !!(
    currentBusiness &&
    currentBusiness.businessName.toLowerCase() ===
      rev.businessName.toLowerCase()
  );
  const c = {
    id: "c" + Date.now() + Math.random().toString(36).slice(2),
    author: name,
    text,
    date: new Date().toISOString(),
    isBusiness: isBiz,
    replies: [],
  };
  const revIdx = reviews.findIndex((r) => r.id === detailReviewId);
  if (parentId) {
    const comments = JSON.parse(JSON.stringify(rev.comments));
    const parent = findComment(comments, parentId);
    if (!parent) {
      toast("Parent comment not found.", "error");
      return;
    }
    parent.replies.push(c);
    reviews[revIdx] = { ...rev, comments };
  } else {
    reviews[revIdx] = { ...rev, comments: [...(rev.comments || []), c] };
    document.getElementById("cmt-text").value = "";
  }
  saveReviews();
  toast("Comment posted!");
  renderReviewDetail();
  renderReviews();
}
function showAllComments(revId) {
  const rev = reviews.find((r) => r.id === revId);
  if (rev) renderComments(rev, true);
}

// ----- How It Works -----
function openHowWorks() {
  const steps = [
    {
      num: "01",
      color: "var(--nam-blue)",
      title: "Write a Review",
      desc: "Share your honest experience.",
    },
    {
      num: "02",
      color: "var(--nam-red)",
      title: "Browse & Filter",
      desc: "Search by business, category or rating.",
    },
    {
      num: "03",
      color: "var(--nam-green)",
      title: "Join the Conversation",
      desc: "Comment and reply.",
    },
    {
      num: "04",
      color: "var(--nam-gold)",
      title: "Business Portal",
      desc: "Verified badge and analytics.",
    },
  ];
  const svgs = {
    "01": `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    "02": `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    "03": `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
    "04": `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  };
  document.getElementById("hiw-steps").innerHTML = steps
    .map(
      (s, i) =>
        `<div class="hiw-step"><div class="hiw-step-num-col"><div class="hiw-icon-box" style="background:${
          s.color
        }18">${svgs[s.num]}</div>${
          i < steps.length - 1 ? `<div class="hiw-connector"></div>` : ""
        }</div><div class="hiw-step-body"><div class="hiw-step-num font-mono" style="color:${
          s.color
        }">Step ${s.num}</div><div class="hiw-step-title font-display">${
          s.title
        }</div><div class="hiw-step-desc">${s.desc}</div></div></div>`
    )
    .join("");
  document.getElementById("how-works-modal").classList.add("open");
}
function closeHowWorks() {
  document.getElementById("how-works-modal").classList.remove("open");
}

// ----- Mobile Menu -----
function toggleMobileMenu() {
  const menu = document.getElementById("mobile-menu");
  const open = menu.classList.toggle("open");
  document.getElementById("ham-open").style.display = open ? "none" : "block";
  document.getElementById("ham-close").style.display = open ? "block" : "none";
}
function closeMobileMenu() {
  document.getElementById("mobile-menu").classList.remove("open");
  document.getElementById("ham-open").style.display = "block";
  document.getElementById("ham-close").style.display = "none";
}
function scrollToReviews() {
  document
    .getElementById("reviews-section")
    .scrollIntoView({ behavior: "smooth", block: "start" });
}

// ----- Init -----
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  document.getElementById("footer-year").textContent = new Date().getFullYear();
  renderFilters();
  renderHero();
  renderReviews();
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeWriteReview();
      closeReviewDetail();
      closeHowWorks();
      closeMobileMenu();
      document.getElementById("mobile-filter-panel").classList.remove("open");
    }
  });
  const last = localStorage.getItem(STORAGE.LAST_VISIT);
  if (last) {
    const newCount = reviews.filter((r) => r.date > last).length;
    if (newCount)
      toast(`${newCount} new review(s) since your last visit.`, "info");
  }
  localStorage.setItem(STORAGE.LAST_VISIT, new Date().toISOString());
});

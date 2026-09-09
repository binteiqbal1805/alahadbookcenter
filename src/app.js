/**
 * AL-AHAD BOOK CENTER — Main Storefront & Admin Controller
 */

// Supabase Configuration
const SUPABASE_URL = 'https://zprxtklqxfgvigcdrnbo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_EIzsAqJoYXTQOdHpt0-BzA_sREsIzah';

let supabaseClient = null;

function initSupabase() {
  if (!supabaseClient && window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    } catch (e) {
      console.warn("Supabase initialization error:", e);
    }
  }
  return supabaseClient;
}

// Initial call
initSupabase();

// Escape untrusted values before inserting them into HTML. Customer/order data
// comes from checkout and Supabase and must never be treated as trusted markup.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getPakistanDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

// Supabase Storage: global images shared by every visitor/device.
const STORAGE_BUCKET = 'site-media';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
window.pendingNewBookImageFile = null;
window.pendingEditBookImageFile = null;

function storagePublicUrl(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

function storagePathFromPublicUrl(value) {
  const raw = String(value || '');
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const index = raw.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(raw.slice(index + marker.length).split('?')[0]);
}

function imageExtension(file) {
  const map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
  return map[file.type] || 'jpg';
}

async function uploadImageToStorage(file, path) {
  if (!file) return null;
  if (!file.type.startsWith('image/')) throw new Error('Please select a valid image file.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Image must be 5 MB or smaller.');
  const client = initSupabase();
  if (!client) throw new Error('Supabase is unavailable. Please try again.');
  const { error } = await client.storage.from(STORAGE_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: '3600'
  });
  if (error) throw error;
  return `${storagePublicUrl(path)}?v=${Date.now()}`;
}

async function deleteStorageObject(path) {
  const client = initSupabase();
  if (!client) throw new Error('Supabase is unavailable.');
  const { error } = await client.storage.from(STORAGE_BUCKET).remove([path]);
  if (error && !/not found/i.test(error.message || '')) throw error;
}

// Default Catalog Data with verified image assets and sample extracts
const DEFAULT_BOOKS = [
  {
    id: 1,
    title: "Injection Therapy Book",
    urduTitle: "کلینیکل انجکشن گائیڈ معہ انجکشن تھراپی اینڈ سیفٹی گائیڈ",
    price: 1500,
    publisher: "Usmaniya Publications (عثمان پبلیکیشنز)",
    author: "Medical Clinical Panel",
    category: "Clinical Skills",
    languages: ["Urdu", "English"],
    image: "images/injection_therapy_book.svg",
    badge: "Bestseller",
    badgeColor: "bg-emerald-500",
    description: "Comprehensive step-by-step practical guide for administering injections safely. Covers intravenous (IV), intramuscular (IM hip/leg), arm injections, and pediatric dosage procedures.",
    urduDescription: "کونسی بیماری میں کونسا انجکشن لگائیں مکمل طریقہ کار۔ بازوؤں، رگوں، بچوں، ہپ اور ٹانگ میں انجکشن لگانے کے تفصیلی اور محفوظ طریقے معہ سیفٹی گائیڈ۔",
    topics: [
      "بازوؤں میں کیسے انجکشن لگائیں (Arm Injections)",
      "رگوں میں کیسے انجکشن لگائیں (IV Injections)",
      "بچوں کو کیسے انجکشن لگائیں (Pediatric Injection Protocol)",
      "ہپ اور ٹانگ میں کیسے انجکشن لگائیں (IM Hip & Leg)",
      "انجکشن لگانے کے مکمل سیفٹی طریقے (Safety & Prevention)"
    ],
    inStock: true,
    ebookPrice: 500,
    samplePdfUrl: "images/injection_sample_1.svg",
    sampleImages: ["images/injection_sample_1.svg"]
  },
  {
    id: 2,
    title: "Practice of Medicine",
    urduTitle: "پریکٹس آف میڈیسن",
    price: 3000,
    publisher: "Usmaniya Publications (عثمان پبلیکیشنز)",
    author: "Usmaniya Publications Board",
    category: "General Practice",
    languages: ["English", "Urdu"],
    image: "images/practice_of_medicine.svg",
    badge: "Essential Practice",
    badgeColor: "bg-skybrand-600",
    description: "The complete clinical reference manual for general practitioners, family physicians, and clinic doctors. Covers diagnosis, clinical investigation, treatment protocols, and prescription guidelines for major adult & pediatric illnesses.",
    urduDescription: "کلینکل پریکٹس اور جنرل پریکٹیشنرز کے لیے ایک مکمل رہنما کتاب۔ تمام عام و پیچیدہ بیماریوں کی تشخیص، علاج اور ادویات کی خوراک کے تفصیلی رہنما اصول۔",
    topics: [
      "General Clinical Diagnosis & Examination",
      "Prescription Protocols & Dosage Charts",
      "Management of Chronic & Acute Illnesses",
      "Pediatric & Adult Emergency Care",
      "Practical Clinic Management Guidelines"
    ],
    inStock: true,
    ebookPrice: 1000,
    samplePdfUrl: "images/practice_sample_1.svg",
    sampleImages: ["images/practice_sample_1.svg"]
  },
  {
    id: 3,
    title: "Foundations and Practices of Anesthesia",
    urduTitle: "فاؤنڈیشنز اینڈ پریکٹسز آف اینستھیزیا",
    subtitle: "A Comprehensive Learning Resource",
    price: 1500,
    publisher: "Usmaniya Publications",
    author: "Dr. Talha Khalid (Consultant Interventional Cardiologist)",
    category: "Anesthesia",
    languages: ["English", "Urdu (English - اردو)"],
    image: "images/anesthesia_book.svg",
    badge: "New Release",
    badgeColor: "bg-purple-600",
    description: "Authored by Dr. Talha Khalid, this comprehensive learning resource bridges foundational principles and practical clinical anesthesia techniques. Ideal for medical students, anesthesia technicians, nurses, and ICU practitioners.",
    urduDescription: "اینستھیزیا کی بنیادی تعلیم، تکنیکوں اور آپریشن تھیٹر سیٹ اپ کے لیے انگریزی اور اردو زبان میں ایک جامع تعلیمی و تدریسی گائیڈ۔",
    topics: [
      "Pre-operative Evaluation & Risk Assessment",
      "Airway Management & Intubation Protocols",
      "General, Regional & Local Anesthesia Methods",
      "Intraoperative Patient Monitoring & Cardiology Considerations",
      "Post-Anesthesia Care Unit (PACU) & Pain Management"
    ],
    inStock: true,
    ebookPrice: 500,
    samplePdfUrl: "images/anesthesia_sample_1.svg",
    sampleImages: ["images/anesthesia_sample_1.svg"]
  }
];

// State Variables
window.booksData = DEFAULT_BOOKS;
window.ordersData = [];
window.cart = [];
window.currentCategory = 'all';
window.currentSearch = '';
window.currentSort = 'featured';
window.isAdminLoggedIn = false;
window.currentAdminTab = 'catalog';
window.currentSampleBookId = null;

// Catalog state is backed by Supabase. LocalStorage is not used for book mutations.
function loadStoredBooks() {
  return DEFAULT_BOOKS.map(book => ({ ...book }));
}

function saveStoredBooks() {
  const countEl = document.getElementById('countAll');
  if (countEl) countEl.innerText = window.booksData.length;
}

function getSafeImageUrl(value, fallback = 'images/injection_therapy_book.svg') {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^images\//i.test(raw) || /^\.\/?images\//i.test(raw) || /^\/images\//i.test(raw)) return raw;
  return fallback;
}

function isAdminSessionActive() {
  return window.isAdminLoggedIn === true;
}

function requireAdmin() {
  if (!isAdminSessionActive()) {
    showAppToast('Unauthorized: Please sign in as an administrator.', 'error');
    return false;
  }
  return true;
}

// Supabase sync
async function syncFromSupabase() {
  const client = initSupabase();
  if (!client) return;
  try {
    const { data, error } = await client.from('books').select('*').order('id', { ascending: true });
    if (!error && Array.isArray(data)) {
      window.booksData = data.map(b => {
        const img = getSafeImageUrl(b.cover_image || b.image);


        return {
          id: b.id,
          title: b.title || '',
          urduTitle: b.urdu_title || b.urduTitle || '',
          price: Number(b.physical_price ?? b.price ?? 0),
          ebookPrice: b.ebook_price != null ? Number(b.ebook_price) : (b.ebookPrice != null ? Number(b.ebookPrice) : undefined),
          publisher: b.publisher || 'Usmaniya Publications',
          author: b.author || 'Medical Clinical Panel',
          category: b.category || 'General',
          languages: Array.isArray(b.languages) ? b.languages : ['English', 'Urdu'],
          image: img,
          badge: b.badge || 'Available',
          badgeColor: b.badge_color || b.badgeColor || 'bg-skybrand-600',
          description: b.description || '',
          urduDescription: b.urdu_description || b.urduDescription || '',
          topics: Array.isArray(b.topics) ? b.topics : [],
          inStock: b.in_stock !== false && b.inStock !== false,
          sampleImages: Array.isArray(b.sample_images) && b.sample_images.length > 0 
            ? b.sample_images 
            : (Array.isArray(b.sampleImages) && b.sampleImages.length > 0 ? b.sampleImages : ['images/injection_sample_1.svg'])
        };
      });
      renderBooks();
      renderAdminCatalog();
      const countEl = document.getElementById('countAll');
      if (countEl) countEl.innerText = window.booksData.length;
    }
  } catch (e) {
    console.warn('Supabase books fetch notice:', e);
  }
}

async function isSupabaseAdmin() {
  const client = initSupabase();
  if (!client?.auth) return false;
  try {
    const { data: sessionData } = await client.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return false;

    // Authorization is enforced by Supabase RLS. This table is a lightweight
    // client-side confirmation that the signed-in Auth user is an approved admin.
    const { data, error } = await client
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    return !error && !!data;
  } catch (_) {
    return false;
  }
}

async function syncOrdersFromSupabase() {
  const client = initSupabase();
  if (!client || !window.isAdminLoggedIn) return;
  if (!(await isSupabaseAdmin())) {
    window.isAdminLoggedIn = false;
    window.ordersData = [];
    renderAdminOrders();
    return;
  }
  try {
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData?.session?.user) {
      window.ordersData = [];
      renderAdminOrders();
      return;
    }
    const { data, error } = await client.from('orders').select('*').order('created_at', { ascending: false });
    if (!error && Array.isArray(data)) {
      const fetchedOrders = data.map(d => {
        let parsedTehsil = '';
        let parsedWA = '';
        let parsedSim = '';
        let parsedItems = Array.isArray(d.items) ? d.items : [];
        let parsedOrderId = d.order_id || '';

        // Check for structured JSON metadata in notes
        if (d.notes && d.notes.includes('[DATA:')) {
          try {
            const jsonMatch = d.notes.match(/\[DATA:\s*({.*?})\]/);
            if (jsonMatch && jsonMatch[1]) {
              const meta = JSON.parse(jsonMatch[1]);
              if (meta.orderId) parsedOrderId = meta.orderId;
              if (meta.simNumber) parsedSim = meta.simNumber;
              if (meta.whatsappNumber) parsedWA = meta.whatsappNumber;
              if (meta.tehsilDistrict) parsedTehsil = meta.tehsilDistrict;
              if (Array.isArray(meta.items) && meta.items.length > 0) parsedItems = meta.items;
            }
          } catch (_) {}
        }

        // Fallback text parsing from notes
        if (!parsedTehsil && d.notes && d.notes.includes('Tehsil & District:')) {
          const match = d.notes.match(/Tehsil & District:\s*([^|]+)/i);
          if (match && match[1]) parsedTehsil = match[1].trim();
        }
        if (!parsedWA && d.notes && d.notes.includes('WhatsApp:')) {
          const matchWA = d.notes.match(/WhatsApp:\s*([^|]+)/i);
          if (matchWA && matchWA[1]) parsedWA = matchWA[1].trim();
        }
        if (!parsedSim && d.notes && d.notes.includes('SIM:')) {
          const matchSIM = d.notes.match(/SIM:\s*([^|]+)/i);
          if (matchSIM && matchSIM[1]) parsedSim = matchSIM[1].trim();
        }
        if (!parsedOrderId && d.notes && d.notes.includes('Order ID:')) {
          const matchId = d.notes.match(/Order ID:\s*([^|]+)/i);
          if (matchId && matchId[1]) parsedOrderId = matchId[1].trim();
        }
        if (parsedItems.length === 0 && d.notes && d.notes.includes('Items:')) {
          const matchItems = d.notes.match(/Items:\s*([^|]+)/i);
          if (matchItems && matchItems[1]) {
            const parts = matchItems[1].split(',').map(s => s.trim()).filter(Boolean);
            parsedItems = parts.map(part => {
              const qtyMatch = part.match(/^(.*?)\s*\(Qty:\s*(\d+)/i);
              if (qtyMatch) {
                return { title: qtyMatch[1].trim(), qty: parseInt(qtyMatch[2], 10) || 1 };
              }
              return { title: part, qty: 1 };
            });
          }
        }

        return {
          id: parsedOrderId || d.id || `ORD-${Date.now()}`,
          date: d.created_at ? getPakistanDateString(new Date(d.created_at)) : (d.date || getPakistanDateString()),
          timestamp: d.created_at ? new Date(d.created_at).toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true }) : (d.timestamp || ''),
          customerName: d.customer_name || d.name || 'Customer',
          simNumber: d.sim_number || parsedSim || d.simNumber || d.phone || '',
          whatsappNumber: d.whatsapp_number || d.whatsappNumber || parsedWA || '',
          tehsilDistrict: d.tehsil_district || d.tehsilDistrict || parsedTehsil || '',
          phone: d.phone || d.sim_number || parsedSim || '',
          city: d.city || '',
          address: d.address || '',
          payment: d.payment_method || d.payment || 'COD',
          items: parsedItems,
          total: Number(d.total_amount ?? d.total ?? 0)
        };
      });

      // Supabase is the single source of truth; do not merge browser state.
      window.ordersData = fetchedOrders;
      renderAdminOrders();
    }
  } catch (e) {
    console.warn('Supabase orders fetch notice:', e);
  }
}

// Supabase Live Health Check
async function checkSupabaseConnection() {
  const badgeDot = document.getElementById('supabaseStatusDot');
  const badgeText = document.getElementById('supabaseStatusText');
  const client = initSupabase();

  if (!client) {
    if (badgeDot) badgeDot.className = 'w-2 h-2 rounded-full bg-amber-400';
    if (badgeText) badgeText.textContent = 'Supabase: Offline';
    return { ok: false, message: 'Supabase client library not initialized' };
  }

  const startTime = Date.now();
  try {
    const { data, error } = await client.from('books').select('id, title').limit(1);
    const latency = Date.now() - startTime;
    if (!error) {
      if (badgeDot) badgeDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
      if (badgeText) badgeText.textContent = `Supabase: Connected (${latency}ms)`;
      return { ok: true, latency, data };
    } else {
      if (badgeDot) badgeDot.className = 'w-2 h-2 rounded-full bg-amber-400';
      if (badgeText) badgeText.textContent = 'Supabase: Sync Notice';
      return { ok: false, error: error.message };
    }
  } catch (err) {
    if (badgeDot) badgeDot.className = 'w-2 h-2 rounded-full bg-red-400';
    if (badgeText) badgeText.textContent = 'Supabase: Disconnected';
    return { ok: false, error: err.message };
  }
}

async function testSupabaseConnectionUI() {
  showAppToast('Pinging Supabase Database (zprxtklqxfgvigcdrnbo.supabase.co)...', 'info');
  const result = await checkSupabaseConnection();
  if (result.ok) {
    await syncFromSupabase();
    await syncOrdersFromSupabase();
    showAppToast(`🟢 Supabase Connected! Response time: ${result.latency}ms. Catalog & orders in sync.`, 'success');
  } else {
    showAppToast(`⚠️ Supabase notice: ${result.error || result.message}`, 'error');
  }
}

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.booksData = loadStoredBooks();
  window.ordersData = loadStoredOrders();
  
  loadStoreBanner();
  setupBannerDragDrop();
  renderBooks();
  updateCartUI();
  setOrderDateToday();
  
  // Check existing Supabase auth session
  const client = initSupabase();
  if (client && client.auth) {
    client.auth.getSession().then(async ({ data }) => {
      if (data && data.session && data.session.user) {
        if (await isSupabaseAdmin()) {
          window.isAdminLoggedIn = true;
          console.log("Supabase active admin session detected:", data.session.user.email);
          await syncOrdersFromSupabase();
        } else {
          await client.auth.signOut();
        }
      }
    }).catch(() => {});
  }

  syncFromSupabase();
  checkSupabaseConnection();
});

// Render Books Grid
function renderBooks() {
  const grid = document.getElementById('booksGrid');
  const noResults = document.getElementById('noResults');
  if (!grid) return;

  const currentCategory = window.currentCategory;
  const currentSearch = (window.currentSearch || '').toLowerCase().trim();
  const currentSort = window.currentSort;

  let filtered = window.booksData.filter(book => {
    const matchesCategory = (currentCategory === 'all') || (book.category.toLowerCase() === currentCategory.toLowerCase());
    const matchesSearch = !currentSearch ||
      book.title.toLowerCase().includes(currentSearch) ||
      (book.urduTitle && book.urduTitle.toLowerCase().includes(currentSearch)) ||
      book.author.toLowerCase().includes(currentSearch) ||
      book.category.toLowerCase().includes(currentSearch);
    return matchesCategory && matchesSearch;
  });

  if (currentSort === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (currentSort === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (currentSort === 'name-asc') {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  }

  const countEl = document.getElementById('countAll');
  if (countEl) countEl.innerText = window.booksData.length;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (noResults) noResults.classList.remove('hidden');
    return;
  }
  if (noResults) noResults.classList.add('hidden');

  grid.innerHTML = filtered.map(book => `
    <div class="bg-white rounded-2xl border border-skybrand-100 overflow-hidden shadow-sm book-card-hover flex flex-col justify-between group">
      <div>
        <div class="relative bg-gradient-to-b from-skybrand-50 to-skybrand-100 p-4 h-72 flex items-center justify-center overflow-hidden">
          <span class="absolute top-3 left-3 text-[10px] uppercase tracking-wider font-extrabold text-white px-2.5 py-1 rounded-full shadow ${book.badgeColor || 'bg-skybrand-600'}">
            ${escapeHtml(book.badge || 'Available')}
          </span>
          <span class="absolute top-3 right-3 text-[10px] font-bold bg-skybrand-900 text-white backdrop-blur-sm px-2.5 py-1 rounded-full">
            Rs. ${book.price.toLocaleString()}
          </span>
          <img src="${escapeHtml(getSafeImageUrl(book.image))}" alt="${escapeHtml(book.title)}" class="max-h-full max-w-full object-contain rounded shadow-lg group-hover:scale-105 transition-transform duration-300" onerror="this.src='images/injection_therapy_book.svg'"/>
        </div>

        <div class="p-5 space-y-2">
          <div class="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span class="px-2 py-0.5 bg-skybrand-50 text-skybrand-700 rounded font-semibold border border-skybrand-100">${escapeHtml(book.category)}</span>
            <span class="flex items-center gap-1 text-emerald-600 font-medium">
              <span class="material-symbols-outlined text-xs">translate</span> ${escapeHtml(book.languages ? book.languages.join(' / ') : 'English/Urdu')}
            </span>
          </div>

          <h3 class="font-bold text-base text-slate-900 line-clamp-1 group-hover:text-skybrand-600 transition-colors">${escapeHtml(book.title)}</h3>
          <p class="text-xs text-slate-500 font-urdu font-medium leading-relaxed line-clamp-1" dir="rtl">${escapeHtml(book.urduTitle || '')}</p>
          
          <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed pt-1">
            ${escapeHtml(book.description)}
          </p>

          <div class="text-[11px] text-slate-400 font-medium flex items-center gap-1 pt-1">
            <span class="material-symbols-outlined text-xs text-slate-400">person</span> ${escapeHtml(book.author)}
          </div>
        </div>
      </div>

      <div class="p-5 pt-0 space-y-2">
        <div class="grid grid-cols-2 gap-2">
          <button onclick="openPreviewModal(${book.id})" class="py-2.5 px-3 bg-skybrand-50 hover:bg-skybrand-100 text-skybrand-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all border border-skybrand-200/60">
            <span class="material-symbols-outlined text-base">visibility</span> Preview
          </button>
          <button onclick="addToCart(${book.id})" ${book.inStock === false ? 'disabled' : ''} class="py-2.5 px-3 ${book.inStock === false ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-skybrand-600 hover:bg-skybrand-700 text-white shadow-sm shadow-skybrand-600/30'} rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all">
            <span class="material-symbols-outlined text-base">add_shopping_cart</span> ${book.inStock === false ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
        ${book.ebookPrice ? `
        <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
          <button onclick="openSamplePdfModal(${book.id})" class="py-2 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all">
            <span class="material-symbols-outlined text-sm text-amber-600">picture_as_pdf</span> Free Sample
          </button>
          <button onclick="buyEbook(${book.id})" class="py-2 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all shadow-sm">
            <span class="material-symbols-outlined text-sm">picture_as_pdf</span> Buy PDF (Rs. ${book.ebookPrice.toLocaleString()})
          </button>
        </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// Category Filtering
function filterCategory(cat) {
  window.currentCategory = cat;
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.remove('bg-skybrand-600', 'text-white', 'shadow-sm');
    btn.classList.add('bg-white', 'text-slate-600');
  });
  if (window.event && window.event.currentTarget) {
    window.event.currentTarget.classList.remove('bg-white', 'text-slate-600');
    window.event.currentTarget.classList.add('bg-skybrand-600', 'text-white', 'shadow-sm');
  }
  renderBooks();
}

function handleSearch() {
  const searchInput = document.getElementById('searchInput');
  window.currentSearch = searchInput ? searchInput.value : '';
  const mobileInput = document.getElementById('mobileSearchInput');
  if (mobileInput) mobileInput.value = window.currentSearch;
  toggleClearSearchBtn();
  renderBooks();
}

function handleMobileSearch() {
  const mobileInput = document.getElementById('mobileSearchInput');
  window.currentSearch = mobileInput ? mobileInput.value : '';
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = window.currentSearch;
  toggleClearSearchBtn();
  renderBooks();
}

function toggleClearSearchBtn() {
  const btn = document.getElementById('clearSearchBtn');
  if (!btn) return;
  if (window.currentSearch && window.currentSearch.trim().length > 0) {
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}

function clearSearch() {
  window.currentSearch = '';
  const si = document.getElementById('searchInput');
  const ms = document.getElementById('mobileSearchInput');
  if (si) si.value = '';
  if (ms) ms.value = '';
  toggleClearSearchBtn();
  renderBooks();
}

function handleSortChange() {
  const sortBy = document.getElementById('sortBy');
  window.currentSort = sortBy ? sortBy.value : 'featured';
  renderBooks();
}

// Cart Management
function addToCart(bookId) {
  const book = window.booksData.find(b => b.id === bookId);
  if (!book) return;

  const existing = window.cart.find(item => item.id === bookId);
  if (existing) {
    existing.qty += 1;
  } else {
    window.cart.push({ ...book, qty: 1 });
  }

  updateCartUI();
  toggleCartDrawer(true);
}

function updateQty(bookId, delta) {
  const item = window.cart.find(i => i.id === bookId);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    window.cart = window.cart.filter(i => i.id !== bookId);
  }
  updateCartUI();
}

function removeFromCart(bookId) {
  window.cart = window.cart.filter(i => i.id !== bookId);
  updateCartUI();
}

function updateCartUI() {
  const totalItems = window.cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = window.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const badge = document.getElementById('cartCountBadge');
  if (badge) badge.innerText = totalItems;

  const drawerCount = document.getElementById('cartDrawerCount');
  if (drawerCount) drawerCount.innerText = `${totalItems} items`;

  const subtotalEl = document.getElementById('cartSubtotal');
  const totalEl = document.getElementById('cartTotal');
  const checkoutTotal = document.getElementById('checkoutTotalText');

  if (subtotalEl) subtotalEl.innerText = `Rs. ${subtotal.toLocaleString()}`;
  if (totalEl) totalEl.innerText = `Rs. ${subtotal.toLocaleString()}`;
  if (checkoutTotal) checkoutTotal.innerText = `Rs. ${subtotal.toLocaleString()}`;

  const container = document.getElementById('cartItemsContainer');
  if (!container) return;

  if (window.cart.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400 space-y-3">
        <span class="material-symbols-outlined text-4xl text-skybrand-400">remove_shopping_cart</span>
        <p class="text-xs font-semibold text-slate-600">Your cart is currently empty</p>
        <p class="text-[11px] text-slate-400">Select any medical book from the catalog to add it to your order.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = window.cart.map(item => `
    <div class="flex items-center gap-3 p-3 bg-skybrand-50/50 rounded-xl border border-skybrand-100">
      <img src="${item.image}" alt="${item.title}" class="w-14 h-16 object-contain rounded bg-white p-1 border border-slate-200 shadow-sm" onerror="this.src='images/injection_therapy_book.svg'"/>
      <div class="flex-1 min-w-0">
        <h4 class="font-bold text-xs text-slate-900 truncate">${item.title}</h4>
        <p class="text-[11px] font-semibold text-skybrand-700">Rs. ${item.price.toLocaleString()}</p>
        
        <div class="flex items-center gap-2 mt-1.5">
          <div class="flex items-center bg-white border border-skybrand-200 rounded-lg overflow-hidden">
            <button onclick="updateQty(${item.id}, -1)" class="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-skybrand-50 font-bold">-</button>
            <span class="px-2 text-xs font-bold text-slate-800">${item.qty}</span>
            <button onclick="updateQty(${item.id}, 1)" class="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-skybrand-50 font-bold">+</button>
          </div>
          <button onclick="removeFromCart(${item.id})" class="text-slate-400 hover:text-red-500 text-xs">
            <span class="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      </div>
      <div class="text-right">
        <span class="font-bold text-xs text-slate-900">Rs. ${(item.price * item.qty).toLocaleString()}</span>
      </div>
    </div>
  `).join('');
}

function toggleCartDrawer(forceOpen = false) {
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('cartBackdrop');
  const panel = document.getElementById('cartPanel');
  if (!drawer || !backdrop || !panel) return;

  if (forceOpen || drawer.classList.contains('pointer-events-none')) {
    drawer.classList.remove('pointer-events-none');
    backdrop.classList.remove('opacity-0', 'pointer-events-none');
    backdrop.classList.add('opacity-100');
    panel.classList.remove('translate-x-full');
  } else {
    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0', 'pointer-events-none');
    panel.classList.add('translate-x-full');
    setTimeout(() => drawer.classList.add('pointer-events-none'), 300);
  }
}

// Book Preview Modal
function openPreviewModal(bookId) {
  const book = window.booksData.find(b => b.id === bookId);
  if (!book) return;

  const content = document.getElementById('previewModalContent');
  if (!content) return;

  content.innerHTML = `
    <div class="md:col-span-5 bg-skybrand-50 p-6 flex flex-col items-center justify-center border-r border-skybrand-100">
      <img src="${escapeHtml(getSafeImageUrl(book.image))}" alt="${escapeHtml(book.title)}" class="max-h-80 object-contain rounded-lg shadow-xl mb-4" onerror="this.src='images/injection_therapy_book.svg'"/>
      <span class="text-xs font-semibold px-3 py-1 bg-skybrand-600 text-white rounded-full">${escapeHtml(book.category)}</span>
    </div>
    
    <div class="md:col-span-7 p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
      <div>
        <h2 class="text-xl font-extrabold text-slate-900 font-serif">${escapeHtml(book.title)}</h2>
        <p class="text-sm font-bold text-skybrand-700 font-urdu pt-1" dir="rtl">${escapeHtml(book.urduTitle || '')}</p>
        <p class="text-xs text-slate-500 font-medium mt-1">Official Seller: AL-AHAD BOOK CENTER</p>
        <p class="text-xs text-slate-600 font-semibold">Publisher: ${escapeHtml(book.publisher || 'Usmaniya Publications')}</p>
      </div>

      <div class="flex items-center gap-3 py-2 border-y border-skybrand-100">
        <span class="text-2xl font-black text-slate-900">Rs. ${book.price.toLocaleString()}</span>
        <span class="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">FREE Delivery Included</span>
      </div>

      <div>
        <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Book Overview:</h4>
        <p class="text-xs text-slate-600 leading-relaxed">${escapeHtml(book.description)}</p>
      </div>

      ${book.urduDescription ? `
        <div class="bg-skybrand-50/70 p-3 rounded-xl border border-skybrand-100">
          <h4 class="text-xs font-bold text-slate-800 mb-1">خلاصہ (Urdu Summary):</h4>
          <p class="text-xs text-slate-700 font-urdu leading-relaxed" dir="rtl">${escapeHtml(book.urduDescription)}</p>
        </div>
      ` : ''}

      ${(book.topics && book.topics.length > 0) ? `
        <div>
          <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Key Topics &amp; Chapters Included:</h4>
          <ul class="space-y-1 text-xs text-slate-700">
            ${book.topics.map(t => `<li class="flex items-center gap-2"><span class="material-symbols-outlined text-skybrand-600 text-sm">check_circle</span> ${escapeHtml(t)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="pt-4 flex flex-wrap gap-2">
        <button onclick="addToCart(${book.id}); closePreviewModal();" class="flex-1 py-3 bg-skybrand-600 hover:bg-skybrand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-skybrand-600/20 flex items-center justify-center gap-1 transition-all">
          <span class="material-symbols-outlined text-base">add_shopping_cart</span> Add to Cart (Rs. ${book.price.toLocaleString()})
        </button>
        <button onclick="openSamplePdfModal(${book.id}); closePreviewModal();" class="py-3 px-3 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1 transition-all">
          <span class="material-symbols-outlined text-base">picture_as_pdf</span> Free Sample
        </button>
        <a href="https://wa.me/923281830420?text=Hello%20Abdul%20Ahad!%20I%20want%20to%20order%20${encodeURIComponent(book.title)}%20(Rs.%20${book.price})" target="_blank" class="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1 transition-all">
          <span class="material-symbols-outlined text-base">chat</span> WhatsApp
        </a>
      </div>
    </div>
  `;

  const modal = document.getElementById('previewModal');
  if (modal) modal.classList.remove('hidden');
}

function closePreviewModal() {
  const modal = document.getElementById('previewModal');
  if (modal) modal.classList.add('hidden');
}

// Checkout Flow
function openCheckoutModal() {
  if (window.cart.length === 0) {
    alert("Please add at least one book to your cart before proceeding to order!");
    return;
  }
  toggleCartDrawer(false);
  const modal = document.getElementById('checkoutModal');
  if (modal) modal.classList.remove('hidden');
}

function closeCheckoutModal() {
  const modal = document.getElementById('checkoutModal');
  if (modal) modal.classList.add('hidden');
}

function showPaymentDetails(val) {
  const box = document.getElementById('paymentDetailsBox');
  if (!box) return;
  box.classList.remove('hidden');

  const cod = document.getElementById('payDetail_cod');
  const jazz = document.getElementById('payDetail_jazzcash');
  const bank = document.getElementById('payDetail_bank');

  if (cod) cod.classList.toggle('hidden', val !== 'cod');
  if (jazz) jazz.classList.toggle('hidden', val !== 'jazzcash');
  if (bank) bank.classList.toggle('hidden', val !== 'bank');
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();
  if (!window.cart || window.cart.length === 0) {
    alert('Your cart is empty! Please add a book first.');
    return;
  }

  const name = document.getElementById('custName').value.trim();
  const simNumber = (document.getElementById('custSimNumber') ? document.getElementById('custSimNumber').value.trim() : '') || (document.getElementById('custPhone') ? document.getElementById('custPhone').value.trim() : '');
  const whatsappNumber = document.getElementById('custWhatsApp') ? document.getElementById('custWhatsApp').value.trim() : '';
  const tehsilDistrict = document.getElementById('custTehsilDistrict') ? document.getElementById('custTehsilDistrict').value.trim() : '';
  const city = document.getElementById('custCity').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const payment = document.getElementById('paymentMethod').value;
  if (!name || !city || !address || !payment) {
    alert('Please complete your name, city, address, and payment method.');
    return;
  }
  const normalizedItems = window.cart.map(item => ({ title: String(item.title || '').trim(), qty: Math.max(1, Number.parseInt(item.qty, 10) || 1), price: Number(item.price) }));
  if (normalizedItems.some(item => !item.title || !Number.isFinite(item.price) || item.price < 0)) {
    alert('One or more cart items are invalid. Please refresh the page and try again.');
    return;
  }
  const total = normalizedItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const now = new Date();
  const newOrder = {
    id: `ORD-${Date.now().toString().slice(-6)}`,
    date: now.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }),
    timestamp: now.toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true }),
    customerName: name, simNumber, whatsappNumber, phone: simNumber,
    tehsilDistrict, city, address, payment,
    items: normalizedItems, total
  };

  if (!Number.isFinite(total) || total < 0) { alert('Invalid order total. Please review your cart and try again.'); return; }

  const client = initSupabase();
  if (!client) {
    alert('Order could not be submitted because the database connection is unavailable. Please try again.');
    return;
  }

  const itemsSummary = newOrder.items.map(i => `${String(i.title).replace(/\|/g, ' ')} (Qty: ${i.qty} @ Rs. ${i.price})`).join(', ');
  const contactInfo = `SIM: ${simNumber}${whatsappNumber ? ` | WhatsApp: ${whatsappNumber}` : ''}`;
  const fullAddress = `${address}${tehsilDistrict ? `, Tehsil & District: ${tehsilDistrict}` : ''}`;
  const orderMetadata = JSON.stringify({ orderId: newOrder.id, simNumber, whatsappNumber, tehsilDistrict, city, items: newOrder.items, total: newOrder.total });
  const notesContent = `[DATA:${orderMetadata}] Order ID: ${newOrder.id} | Contact: ${contactInfo} | Tehsil & District: ${tehsilDistrict} | Items: ${itemsSummary} | Ordered at: ${newOrder.date} ${newOrder.timestamp}`;

  const submitButton = e.submitter || document.querySelector('#checkoutForm button[type="submit"]');
  if (submitButton) { submitButton.disabled = true; submitButton.dataset.originalText = submitButton.innerText; submitButton.innerText = 'Saving Order...'; }

  try {
    const { error } = await client.from('orders').insert([{
      customer_name: newOrder.customerName, customer_email: '', phone: simNumber || '', city: newOrder.city || '',
      address: fullAddress, payment_method: (newOrder.payment || 'cod').toLowerCase(), payment_status: 'pending',
      order_status: 'pending', total_amount: Number(newOrder.total) || 0, notes: notesContent
    }]);
    if (error) throw error;

    window.ordersData = (window.ordersData || []).filter(o => o.id !== newOrder.id);
    if (window.isAdminLoggedIn) await syncOrdersFromSupabase();
    alert(`🎉 Order Confirmed!\n\nThank you Dr./Mr. ${name}!\nYour order (${newOrder.id}) has been received by AL-AHAD BOOK CENTER.\nTotal Amount: Rs. ${total.toLocaleString()} (FREE Shipping)\nPayment: ${payment.toUpperCase()}\nDestination: ${city}${tehsilDistrict ? ` (Tehsil & District: ${tehsilDistrict})` : ''}\nSIM (Calling): ${simNumber}${whatsappNumber ? `\nWhatsApp: ${whatsappNumber}` : ''}`);
    window.cart = [];
    updateCartUI();
    closeCheckoutModal();
  } catch (err) {
    console.error('Order submission failed:', err);
    alert('We could not save your order. Please check your internet connection and try again. Your cart has been kept safe.');
  } finally {
    if (submitButton) { submitButton.disabled = false; submitButton.innerText = submitButton.dataset.originalText || 'Place Order'; }
  }
}

function checkoutWhatsApp() {
  if (window.cart.length === 0) {
    alert("Your cart is empty! Please add a book first.");
    return;
  }

  const total = window.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  let msg = "Hello Abdul Ahad (AL-AHAD BOOK CENTER)! I would like to place an order for the following medical books:\n\n";
  window.cart.forEach((item, idx) => {
    msg += `${idx + 1}. ${item.title} x ${item.qty} = Rs. ${(item.price * item.qty).toLocaleString()}\n`;
  });
  msg += `\nDelivery: FREE All Over Pakistan`;
  msg += `\n*Total Payable: Rs. ${total.toLocaleString()}*\n\nPlease confirm availability and dispatch details. Thank you!`;

  const encoded = encodeURIComponent(msg);
  window.open(`https://wa.me/923281830420?text=${encoded}`, '_blank');
}

// Sample PDF Modal Viewer & Navigator
let currentSampleIndex = 0;
let currentSampleList = [];

function openSamplePdfModal(bookId) {
  const book = window.booksData.find(b => b.id === bookId);
  if (!book) return;

  window.currentSampleBookId = bookId;

  const modal = document.getElementById('samplePdfModal');
  const titleEl = document.getElementById('samplePdfTitle');
  const galleryContainer = document.getElementById('sampleGalleryContainer');
  const fallback = document.getElementById('samplePdfFallback');
  const buyBtn = document.getElementById('samplePdfBuyBtn');

  if (!modal) return;

  if (titleEl) titleEl.textContent = `${book.title} — Sample Preview`;
  if (buyBtn) buyBtn.setAttribute('onclick', `buyEbook(${book.id})`);

  let samples = [];
  if (book.sampleImages && book.sampleImages.length > 0) {
    samples = book.sampleImages;
  } else if (book.samplePdfUrl && book.samplePdfUrl.trim() !== '') {
    samples = [book.samplePdfUrl.trim()];
  } else if (book.image) {
    samples = [book.image];
  }

  currentSampleList = samples;
  currentSampleIndex = 0;

  if (samples.length > 0) {
    if (fallback) fallback.classList.add('hidden');
    if (galleryContainer) galleryContainer.classList.remove('hidden');
    renderSampleGallerySlide();
  } else {
    if (galleryContainer) galleryContainer.classList.add('hidden');
    if (fallback) fallback.classList.remove('hidden');
  }

  modal.classList.remove('hidden');
}

function renderSampleGallerySlide() {
  const mainImg = document.getElementById('sampleModalMainImage');
  const counter = document.getElementById('samplePageCounter');
  const thumbsBar = document.getElementById('sampleThumbnailsBar');
  const prevBtn = document.getElementById('samplePrevBtn');
  const nextBtn = document.getElementById('sampleNextBtn');

  if (!currentSampleList || currentSampleList.length === 0) return;

  if (currentSampleIndex < 0) currentSampleIndex = 0;
  if (currentSampleIndex >= currentSampleList.length) currentSampleIndex = currentSampleList.length - 1;

  if (mainImg) mainImg.src = currentSampleList[currentSampleIndex];
  if (counter) counter.textContent = `Page ${currentSampleIndex + 1} of ${currentSampleList.length}`;

  if (currentSampleList.length <= 1) {
    if (prevBtn) prevBtn.classList.add('hidden');
    if (nextBtn) nextBtn.classList.add('hidden');
    if (thumbsBar) thumbsBar.classList.add('hidden');
  } else {
    if (prevBtn) prevBtn.classList.remove('hidden');
    if (nextBtn) nextBtn.classList.remove('hidden');
    if (thumbsBar) thumbsBar.classList.remove('hidden');

    if (thumbsBar) {
      thumbsBar.innerHTML = currentSampleList.map((src, i) => `
        <button onclick="setSampleGalleryIndex(${i})" class="w-12 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${i === currentSampleIndex ? 'border-amber-400 scale-105 shadow-md shadow-amber-400/40 ring-2 ring-amber-400/50' : 'border-slate-800 opacity-50 hover:opacity-100'}">
          <img src="${src}" class="w-full h-full object-cover" onerror="this.src='images/injection_therapy_book.svg'"/>
        </button>
      `).join('');
    }
  }
}

function navigateSampleImage(dir) {
  currentSampleIndex += dir;
  if (currentSampleIndex < 0) currentSampleIndex = currentSampleList.length - 1;
  if (currentSampleIndex >= currentSampleList.length) currentSampleIndex = 0;
  renderSampleGallerySlide();
}

function setSampleGalleryIndex(idx) {
  currentSampleIndex = idx;
  renderSampleGallerySlide();
}

function closeSamplePdfModal() {
  const modal = document.getElementById('samplePdfModal');
  if (modal) modal.classList.add('hidden');
}

function buyEbook(bookId) {
  const book = window.booksData.find(b => b.id === bookId);
  if (!book) return;
  const priceText = book.ebookPrice ? `Rs. ${book.ebookPrice.toLocaleString()}` : 'Special Price';
  const message = `محترم عبدالاحد صاحب،\n\nالسلام علیکم!\n\nمیں آپ سے درج ذیل PDF E-Book خریدنا چاہتا/چاہتی ہوں:\n\n📚 *کتاب کا نام:* ${book.title}\n💰 *قیمت:* ${priceText}\n\nبرائے مہربانی اکاؤنٹ اور پیمنٹ کی تفصیلات (بینک / ایزی پیسہ / جاز کیش) شیئر فرما دیں تاکہ میں رقم منتقل کر کے آرڈر مکمل کر سکوں۔\n\nشکریہ!`;
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/923281830420?text=${encoded}`, '_blank');
}

// Admin Portal Handlers
function openAdminPortal() {
  const modal = document.getElementById('adminAuthModal');
  const dash = document.getElementById('adminDashboardModal');
  if (window.isAdminLoggedIn) {
    if (dash) dash.classList.remove('hidden');
    renderAdminCatalog();
    renderAdminOrders();
  } else {
    if (modal) modal.classList.remove('hidden');
  }
}

function closeAdminAuthModal() {
  const modal = document.getElementById('adminAuthModal');
  if (modal) modal.classList.add('hidden');
}

async function verifyAdminPin(e) {
  e.preventDefault();
  const emailInput = document.getElementById('adminEmailInput');
  const pinInput = document.getElementById('adminPinInput');
  const err = document.getElementById('adminPinError');
  const submitBtn = e.target.querySelector('button[type="submit"]');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = pinInput ? pinInput.value.trim() : '';

  if (err) err.classList.add('hidden');
  if (!email || !email.includes('@') || !password) {
    if (err) { err.textContent = 'Enter your admin email and password.'; err.classList.remove('hidden'); }
    return;
  }

  const originalBtnContent = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="inline-block animate-spin mr-1">⌛</span> Verifying Credentials...`;
  }

  try {
    const client = initSupabase();

    // Supabase Auth is the only admin authentication mechanism.
    if (client && client.auth && email && email.includes('@')) {
      const { data, error } = await client.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (!error && data && data.user) {
        if (!(await isSupabaseAdmin())) {
          await client.auth.signOut();
          if (err) {
            err.textContent = "This account is not authorized as an admin.";
            err.classList.remove('hidden');
          }
          return;
        }
        window.isAdminLoggedIn = true;
        closeAdminAuthModal();
        const dash = document.getElementById('adminDashboardModal');
        if (dash) dash.classList.remove('hidden');
        renderAdminCatalog();
        renderAdminOrders();
        await syncOrdersFromSupabase();
        return;
      } else if (error) {
        console.warn("Supabase Auth error:", error.message);
      }
    }

    // Never fall back to a browser-stored password. Supabase Auth is the only admin login path.
    if (err) {
      err.textContent = "Invalid admin credentials.";
      err.classList.remove('hidden');
    }
  } catch (ex) {
    console.error("Admin sign-in error:", ex);
    if (err) {
      err.textContent = "Authentication error: " + (ex.message || "Please check credentials.");
      err.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnContent;
    }
  }
}

async function handleChangeAdminPassword(e) {
  e.preventDefault();
  if (!requireAdmin()) return;
  const currentInput = document.getElementById('currentAdminPass');
  const newInput = document.getElementById('newAdminPass');
  const confirmInput = document.getElementById('confirmAdminPass');
  const alertEl = document.getElementById('passwordChangeAlert');
  const submitBtn = document.getElementById('submitPassChangeBtn');

  const currentPass = currentInput ? currentInput.value.trim() : '';
  const newPass = newInput ? newInput.value.trim() : '';
  const confirmPass = confirmInput ? confirmInput.value.trim() : '';
  if (alertEl) alertEl.className = 'hidden p-3 rounded-xl text-xs font-semibold';

  if (newPass.length < 8) {
    if (alertEl) { alertEl.textContent = '❌ New password must be at least 8 characters long.'; alertEl.className = 'p-3 rounded-xl text-xs font-semibold bg-red-50 text-red-700 border border-red-200 block'; }
    return;
  }
  if (newPass !== confirmPass) {
    if (alertEl) { alertEl.textContent = '❌ New password and confirmation do not match.'; alertEl.className = 'p-3 rounded-xl text-xs font-semibold bg-red-50 text-red-700 border border-red-200 block'; }
    return;
  }

  const originalBtn = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span class="inline-block animate-spin mr-1">⌛</span> Updating...'; }
  try {
    const client = initSupabase();
    const { data: sessionData } = await client.auth.getSession();
    const email = sessionData?.session?.user?.email;
    if (!email) throw new Error('Your admin session has expired. Please sign in again.');

    // Re-authenticate before changing the password. Nothing is stored locally.
    const { error: authError } = await client.auth.signInWithPassword({ email, password: currentPass });
    if (authError) throw new Error('Current password is incorrect.');
    const { error } = await client.auth.updateUser({ password: newPass });
    if (error) throw error;

    if (alertEl) { alertEl.textContent = '✅ Admin password successfully updated.'; alertEl.className = 'p-3 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 block'; }
    if (currentInput) currentInput.value = ''; if (newInput) newInput.value = ''; if (confirmInput) confirmInput.value = '';
  } catch (err) {
    console.error('Password update error:', err);
    if (alertEl) { alertEl.textContent = `❌ ${err.message || 'Could not update password.'}`; alertEl.className = 'p-3 rounded-xl text-xs font-semibold bg-red-50 text-red-700 border border-red-200 block'; }
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalBtn || '<span class="material-symbols-outlined text-base">save</span> Update Password'; }
  }
}

async function logoutAdmin() {
  const client = initSupabase();
  if (client && client.auth) {
    try {
      await client.auth.signOut();
    } catch (e) {
      console.warn("Supabase signout:", e);
    }
  }
  window.isAdminLoggedIn = false;
  const dash = document.getElementById('adminDashboardModal');
  if (dash) dash.classList.add('hidden');
}

function switchAdminTab(tab) {
  window.currentAdminTab = tab;
  const tabCat = document.getElementById('adminTabCatalog');
  const tabOrd = document.getElementById('adminTabOrders');
  const tabSec = document.getElementById('adminTabSecurity');
  const btnCat = document.getElementById('tabBtnCatalog');
  const btnOrd = document.getElementById('tabBtnOrders');
  const btnSec = document.getElementById('tabBtnSecurity');

  if (tabCat) tabCat.classList.toggle('hidden', tab !== 'catalog');
  if (tabOrd) tabOrd.classList.toggle('hidden', tab !== 'orders');
  if (tabSec) tabSec.classList.toggle('hidden', tab !== 'security');

  const activeClass = "px-4 py-2 rounded-xl text-xs font-bold bg-skybrand-600 text-white flex items-center gap-1.5 transition-all shadow-sm";
  const inactiveClass = "px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-all";

  if (btnCat) btnCat.className = tab === 'catalog' ? activeClass : inactiveClass;
  if (btnOrd) btnOrd.className = tab === 'orders' ? activeClass : inactiveClass;
  if (btnSec) btnSec.className = tab === 'security' ? activeClass : inactiveClass;

  if (tab === 'catalog') renderAdminCatalog();
  else if (tab === 'orders') renderAdminOrders();
}

function showAppToast(message, type = 'success') {
  const toast = document.getElementById('appToastNotification');
  const msgEl = document.getElementById('appToastMessage');
  const iconEl = document.getElementById('appToastIcon');
  if (!toast || !msgEl || !iconEl) return;

  msgEl.textContent = message;

  if (type === 'error') {
    toast.className = 'fixed top-6 right-6 z-[100000] flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-2xl border text-xs font-bold transition-all duration-300 bg-red-900/95 text-white border-red-700';
    iconEl.textContent = 'error';
  } else if (type === 'info') {
    toast.className = 'fixed top-6 right-6 z-[100000] flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-2xl border text-xs font-bold transition-all duration-300 bg-slate-900/95 text-white border-slate-700';
    iconEl.textContent = 'info';
  } else {
    toast.className = 'fixed top-6 right-6 z-[100000] flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-2xl border text-xs font-bold transition-all duration-300 bg-emerald-900/95 text-white border-emerald-600';
    iconEl.textContent = 'check_circle';
  }

  toast.classList.remove('hidden');
  toast.style.display = 'flex';
  toast.style.opacity = '1';

  clearTimeout(window.__appToastTimeout);
  window.__appToastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.classList.add('hidden');
      toast.style.display = 'none';
    }, 300);
  }, 3200);
}

function renderAdminCatalog() {
  const tbody = document.getElementById('adminCatalogTableBody');
  if (!tbody) return;

  tbody.innerHTML = window.booksData.map(book => {
    const bookIdStr = String(book.id);
    return `
    <tr class="hover:bg-slate-50/80 transition-colors">
      <td class="p-3.5">
        <div class="relative group/cover w-12 h-14 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs flex items-center justify-center">
          <img src="${escapeHtml(getSafeImageUrl(book.image))}" alt="${escapeHtml(book.title)}" class="max-h-full max-w-full object-contain p-0.5" onerror="this.src='images/injection_therapy_book.svg'"/>
          <label class="absolute inset-0 bg-slate-900/80 opacity-0 group-hover/cover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white" title="Click to upload new picture from device">
            <span class="material-symbols-outlined text-sm text-amber-300">photo_camera</span>
            <span class="text-[8px] font-extrabold uppercase">Upload</span>
            <input type="file" accept="image/*" class="hidden" onchange="handleBookCoverUpload('${bookIdStr}', event)"/>
          </label>
        </div>
      </td>
      <td class="p-3.5">
        <div class="font-bold text-slate-900">${escapeHtml(book.title)}</div>
        <div class="text-[11px] text-skybrand-700 font-urdu" dir="rtl">${escapeHtml(book.urduTitle || '')}</div>
        <div class="text-[10px] text-slate-400">${escapeHtml(book.publisher || 'Usmaniya Publications')}</div>
      </td>
      <td class="p-3.5">
        <span class="px-2 py-0.5 bg-skybrand-50 text-skybrand-700 rounded text-[11px] font-semibold border border-skybrand-100">${escapeHtml(book.category)}</span>
      </td>
      <td class="p-3.5">
        <div class="flex items-center gap-1.5">
          <span class="font-semibold text-slate-500 text-[11px]">Rs.</span>
          <input type="number" id="priceInput_${bookIdStr}" value="${book.price}" class="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-skybrand-500 focus:outline-none"/>
          <button id="saveBtn_${bookIdStr}" onclick="saveBookPrice('${bookIdStr}')" class="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 text-xs font-bold flex items-center gap-1 transition-all" title="Save New Price">
            <span class="material-symbols-outlined text-sm">save</span> Save
          </button>
        </div>
      </td>
      <td class="p-3.5 bg-amber-50/40">
        <div class="flex items-center gap-1.5">
          <span class="font-semibold text-amber-600 text-[11px]">Rs.</span>
          <input type="number" id="ebookPriceInput_${bookIdStr}" value="${book.ebookPrice || ''}" placeholder="Not set" class="w-20 px-2 py-1 bg-white border border-amber-200 rounded text-xs font-bold text-amber-900 focus:bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none"/>
          <button onclick="saveEbookFields('${bookIdStr}')" class="p-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg border border-amber-200 text-xs font-bold flex items-center gap-1 transition-all" title="Save E-Book Settings">
            <span class="material-symbols-outlined text-sm">save</span>
          </button>
        </div>
      </td>
      <td class="p-3.5 bg-amber-50/40">
        <span class="text-xs font-semibold text-slate-700">${book.sampleImages && book.sampleImages.length > 0 ? `📷 ${book.sampleImages.length} sample page(s)` : 'Default Specimen'}</span>
      </td>
      <td class="p-3.5">
        <button onclick="toggleBookStock('${bookIdStr}')" class="px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${book.inStock !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}">
          ${book.inStock !== false ? 'In Stock' : 'Out of Stock'}
        </button>
      </td>
      <td class="p-3.5 text-right">
        <div class="flex items-center justify-end gap-1.5">
          <label class="cursor-pointer px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-xs" title="Upload new photo for this book from device">
            <span class="material-symbols-outlined text-sm text-amber-600">photo_camera</span>
            <span>Photo</span>
            <input type="file" accept="image/*" class="hidden" onchange="handleBookCoverUpload('${bookIdStr}', event)"/>
          </label>
          <button onclick="openEditBookModal('${bookIdStr}')" class="px-2.5 py-1.5 bg-skybrand-50 hover:bg-skybrand-100 text-skybrand-700 border border-skybrand-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-xs" title="Edit book specifications &amp; pricing">
            <span class="material-symbols-outlined text-sm">edit</span>
            <span>Edit</span>
          </button>
          <button onclick="openDeleteBookModal('${bookIdStr}')" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-all flex items-center justify-center" title="Delete book">
            <span class="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      </td>
    </tr>
  `;
  }).join('');
}

async function saveBookPrice(bookId) {
  if (!requireAdmin()) return;
  const input = document.getElementById(`priceInput_${bookId}`);
  const book = window.booksData.find(b => String(b.id) === String(bookId));
  if (!input || !book) return;
  const newPrice = Number.parseInt(input.value, 10);
  if (!Number.isFinite(newPrice) || newPrice <= 0) { showAppToast('Please enter a valid price amount!', 'error'); return; }
  const client = initSupabase();
  if (!client) { showAppToast('❌ Supabase is unavailable. Price was not changed.', 'error'); return; }
  const btn = document.getElementById(`saveBtn_${bookId}`);
  try {
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-symbols-outlined text-sm">hourglass_top</span>'; }
    const { error } = await client.from('books').update({ physical_price: newPrice, updated_at: new Date().toISOString() }).eq('id', book.id);
    if (error) throw error;
    book.price = newPrice;
    renderBooks(); renderAdminCatalog();
    showAppToast(`✅ Price for "${book.title}" updated to Rs. ${newPrice.toLocaleString()}!`, 'success');
  } catch (err) {
    console.error('Price update failed:', err);
    showAppToast(`❌ Price was not saved: ${err.message || 'Please try again.'}`, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined text-sm">save</span> Save'; }
  }
}

async function saveEbookFields(bookId) {
  if (!requireAdmin()) return;
  const input = document.getElementById(`ebookPriceInput_${bookId}`);
  const book = window.booksData.find(b => String(b.id) === String(bookId));
  if (!input || !book) return;
  const val = input.value.trim();
  if (val !== '' && (!Number.isInteger(Number.parseInt(val, 10)) || Number.parseInt(val, 10) < 0)) { showAppToast('Please enter a valid e-book price.', 'error'); return; }
  const ebookPrice = val === '' ? null : Number.parseInt(val, 10);
  const client = initSupabase();
  if (!client) { showAppToast('❌ Supabase is unavailable. E-book price was not changed.', 'error'); return; }
  try {
    const { error } = await client.from('books').update({ ebook_price: ebookPrice, updated_at: new Date().toISOString() }).eq('id', book.id);
    if (error) throw error;
    if (ebookPrice === null) delete book.ebookPrice; else book.ebookPrice = ebookPrice;
    renderBooks(); renderAdminCatalog();
    showAppToast(`✅ E-Book pricing updated for "${book.title}"!`, 'success');
  } catch (err) {
    console.error('E-book price update failed:', err);
    showAppToast(`❌ E-book price was not saved: ${err.message || 'Please try again.'}`, 'error');
  }
}

async function toggleBookStock(bookId) {
  if (!requireAdmin()) return;
  const book = window.booksData.find(b => String(b.id) === String(bookId));
  if (!book) return;
  const nextStock = !(book.inStock !== false);
  const client = initSupabase();
  if (!client) { showAppToast('❌ Supabase is unavailable. Stock was not changed.', 'error'); return; }
  try {
    const { error } = await client.from('books').update({ in_stock: nextStock, updated_at: new Date().toISOString() }).eq('id', book.id);
    if (error) throw error;
    book.inStock = nextStock;
    renderBooks(); renderAdminCatalog();
    showAppToast(nextStock ? `✅ "${book.title}" is now marked In Stock` : `⚠️ "${book.title}" marked Out of Stock`, 'info');
  } catch (err) {
    console.error('Stock update failed:', err);
    showAppToast(`❌ Stock status was not saved: ${err.message || 'Please try again.'}`, 'error');
  }
}

// Edit Book Modal Operations
function openEditBookModal(bookId) {
  window.pendingEditBookImageFile = null;
  const book = window.booksData.find(b => String(b.id) === String(bookId));
  if (!book) return;

  const idInput = document.getElementById('editBookId');
  const titleInput = document.getElementById('editTitle');
  const urduInput = document.getElementById('editUrduTitle');
  const priceInput = document.getElementById('editPrice');
  const ebookInput = document.getElementById('editEbookPrice');
  const catInput = document.getElementById('editCategory');
  const inStockInput = document.getElementById('editInStock');
  const authorInput = document.getElementById('editAuthor');
  const descInput = document.getElementById('editDesc');
  const imgInput = document.getElementById('editImage');

  if (idInput) idInput.value = book.id;
  if (titleInput) titleInput.value = book.title || '';
  if (urduInput) urduInput.value = book.urduTitle || '';
  if (priceInput) priceInput.value = book.price || 0;
  if (ebookInput) ebookInput.value = (book.ebookPrice != null) ? book.ebookPrice : '';
  if (catInput) catInput.value = book.category || 'Clinical Skills';
  if (inStockInput) inStockInput.value = (book.inStock !== false) ? 'true' : 'false';
  if (authorInput) authorInput.value = book.publisher || book.author || 'Usmaniya Publications';
  if (descInput) descInput.value = book.description || '';
  if (imgInput) imgInput.value = book.image || '';

  const imgPreview = document.getElementById('editImagePreview');
  if (imgPreview) imgPreview.src = book.image || 'images/injection_therapy_book.svg';

  const modal = document.getElementById('editBookModal');
  if (modal) modal.classList.remove('hidden');
}

function closeEditBookModal() {
  window.pendingEditBookImageFile = null;
  const fileInput = document.getElementById('editImageFileInput');
  if (fileInput) fileInput.value = '';
  const modal = document.getElementById('editBookModal');
  if (modal) modal.classList.add('hidden');
}

function handleEditImageFileInput(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showAppToast('Please select a valid image file.', 'error');
    event.target.value = '';
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    showAppToast('Image must be 5 MB or smaller.', 'error');
    event.target.value = '';
    return;
  }
  window.pendingEditBookImageFile = file;
  const imgPreview = document.getElementById('editImagePreview');
  if (imgPreview) imgPreview.src = URL.createObjectURL(file);
}

function handleNewBookImageFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showAppToast('Please select a valid image file.', 'error');
    event.target.value = '';
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    showAppToast('Image must be 5 MB or smaller.', 'error');
    event.target.value = '';
    return;
  }
  window.pendingNewBookImageFile = file;
  const imgPreview = document.getElementById('newImagePreview');
  if (imgPreview) imgPreview.src = URL.createObjectURL(file);
}

async function handleBookCoverUpload(bookId, event) {
  if (!requireAdmin()) return;
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const book = window.booksData.find(b => String(b.id) === String(bookId));
  if (!book) return;
  let newPath = null;
  try {
    const client = initSupabase();
    if (!client) throw new Error('Supabase is unavailable.');
    newPath = `book-covers/${book.id}-${crypto.randomUUID()}.${imageExtension(file)}`;
    showAppToast('Uploading book cover…', 'info');
    const publicUrl = await uploadImageToStorage(file, newPath);
    const oldPath = storagePathFromPublicUrl(book.image);
    const { error } = await client.from('books').update({ cover_image: publicUrl, updated_at: new Date().toISOString() }).eq('id', book.id);
    if (error) {
      await deleteStorageObject(newPath).catch(() => {});
      throw error;
    }
    book.image = publicUrl;
    renderBooks(); renderAdminCatalog();
    if (oldPath && oldPath !== newPath) await deleteStorageObject(oldPath).catch(err => console.warn('Old cover cleanup notice:', err));
    showAppToast(`✅ Picture for "${book.title}" updated for all visitors.`, 'success');
  } catch (err) {
    console.error('Book cover upload failed:', err);
    showAppToast(`❌ Cover upload failed: ${err.message || 'Please try again.'}`, 'error');
  } finally {
    if (event.target) event.target.value = '';
  }
}

async function handleSaveBookEdit(e) {
  e.preventDefault();
  if (!requireAdmin()) return;
  const bookId = document.getElementById('editBookId').value;
  const book = window.booksData.find(b => String(b.id) === String(bookId));
  if (!book) return;

  const newTitle = document.getElementById('editTitle').value.trim();
  const newUrdu = document.getElementById('editUrduTitle').value.trim();
  const newPrice = parseInt(document.getElementById('editPrice').value) || 0;
  const ebookVal = document.getElementById('editEbookPrice').value.trim();
  const newCategory = document.getElementById('editCategory').value.trim() || 'General';
  const newInStock = document.getElementById('editInStock').value === 'true';
  const newAuthor = document.getElementById('editAuthor').value.trim() || 'Usmaniya Publications';
  const newDesc = document.getElementById('editDesc').value.trim();
  const typedImage = document.getElementById('editImage').value.trim();
  const submitBtn = e.submitter;

  const updated = {
    title: newTitle,
    urdu_title: newUrdu || newTitle,
    physical_price: newPrice,
    ebook_price: (ebookVal !== '' && !isNaN(parseInt(ebookVal))) ? parseInt(ebookVal) : null,
    category: newCategory,
    in_stock: newInStock,
    publisher: newAuthor,
    author: newAuthor,
    description: newDesc,
    cover_image: getSafeImageUrl(typedImage || book.image),
    updated_at: new Date().toISOString()
  };

  try {
    if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('opacity-60', 'pointer-events-none'); }
    let newCoverPath = null;
    const oldCoverPath = storagePathFromPublicUrl(book.image);
    if (window.pendingEditBookImageFile) {
      newCoverPath = `book-covers/${book.id}-${crypto.randomUUID()}.${imageExtension(window.pendingEditBookImageFile)}`;
      showAppToast('Uploading new book cover…', 'info');
      updated.cover_image = await uploadImageToStorage(window.pendingEditBookImageFile, newCoverPath);
    }
    const client = initSupabase();
    if (!client) throw new Error('Supabase is unavailable.');
    const { error } = await client.from('books').update(updated).eq('id', book.id);
    if (error) {
      if (newCoverPath) await deleteStorageObject(newCoverPath).catch(() => {});
      throw error;
    }
    if (newCoverPath && oldCoverPath && oldCoverPath !== newCoverPath) {
      await deleteStorageObject(oldCoverPath).catch(err => console.warn('Old cover cleanup notice:', err));
    }

    book.title = updated.title;
    book.urduTitle = updated.urdu_title;
    book.price = updated.physical_price;
    if (updated.ebook_price != null) book.ebookPrice = updated.ebook_price; else delete book.ebookPrice;
    book.category = updated.category;
    book.inStock = updated.in_stock;
    book.publisher = updated.publisher;
    book.author = updated.author;
    book.description = updated.description;
    book.image = updated.cover_image || book.image;
    saveStoredBooks();
    renderBooks();
    renderAdminCatalog();
    closeEditBookModal();
    showAppToast(`✅ Changes for "${book.title}" saved successfully!`, 'success');
  } catch (err) {
    console.error('Book edit failed:', err);
    showAppToast(`❌ Could not save changes: ${err.message || 'Please try again.'}`, 'error');
  } finally {
    window.pendingEditBookImageFile = null;
    if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('opacity-60', 'pointer-events-none'); }
  }
}

// Delete Book Modal Operations
let pendingDeleteBookId = null;

function openDeleteBookModal(bookId) {
  const book = window.booksData.find(b => String(b.id) === String(bookId));
  if (!book) return;
  pendingDeleteBookId = book.id;
  const promptEl = document.getElementById('deleteBookTitlePrompt');
  if (promptEl) {
    promptEl.textContent = `Are you sure you want to remove "${book.title}" (${book.urduTitle || ''}) from your store catalog?`;
  }
  const modal = document.getElementById('deleteBookConfirmModal');
  if (modal) modal.classList.remove('hidden');
}

function closeDeleteBookModal() {
  pendingDeleteBookId = null;
  const modal = document.getElementById('deleteBookConfirmModal');
  if (modal) modal.classList.add('hidden');
}

async function executeDeleteBook() {
  if (!pendingDeleteBookId || !requireAdmin()) return;
  const idToDelete = pendingDeleteBookId;
  const book = window.booksData.find(b => String(b.id) === String(idToDelete));
  if (!book) return;
  const title = book.title;
  const client = initSupabase();
  if (!client) { showAppToast('❌ Supabase is unavailable. Book was not deleted.', 'error'); return; }
  try {
    const { error } = await client.from('books').delete().eq('id', idToDelete);
    if (error) throw error;
    try { await deleteStorageObject(`book-covers/${idToDelete}`); } catch (storageErr) { console.warn('Cover cleanup notice:', storageErr); }
    window.booksData = window.booksData.filter(b => String(b.id) !== String(idToDelete));
    renderBooks(); renderAdminCatalog(); closeDeleteBookModal();
    showAppToast(`🗑️ "${title}" permanently removed from the catalog.`, 'success');
  } catch (err) {
    console.error('Book delete failed:', err);
    showAppToast(`❌ Book was not deleted: ${err.message || 'Please try again.'}`, 'error');
  }
}

function deleteBook(bookId) {
  openDeleteBookModal(bookId);
}

// Clear Orders Log Operations
function openClearLogsModal() {
  const modal = document.getElementById('clearLogsConfirmModal');
  if (modal) modal.classList.remove('hidden');
}

function closeClearLogsModal() {
  const modal = document.getElementById('clearLogsConfirmModal');
  if (modal) modal.classList.add('hidden');
}

function executeClearOrderLogs() {
  // Deliberately clear only the current in-memory view. Database orders are not deleted.
  window.ordersData = [];
  renderAdminOrders();
  closeClearLogsModal();
  showAppToast('🧹 Local order view cleared. Database records were not deleted.', 'info');
}

function clearOrderLogs() {
  openClearLogsModal();
}

function setOrderDateToday() {
  const dateInput = document.getElementById('adminOrderDateFilter');
  if (dateInput) {
    dateInput.value = getPakistanDateString();
    renderAdminOrders();
  }
}

function renderAdminOrders() {
  const tbody = document.getElementById('adminOrdersTableBody');
  if (!tbody) return;
  const dateInput = document.getElementById('adminOrderDateFilter');
  const selectedDate = (dateInput && dateInput.value) ? dateInput.value : getPakistanDateString();

  const filtered = window.ordersData.filter(o => o.date === selectedDate);

  const statOrders = document.getElementById('statTotalOrders');
  const statRev = document.getElementById('statTotalRevenue');
  const statBooks = document.getElementById('statTotalBooks');

  const totalRev = filtered.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalBooks = filtered.reduce((sum, o) => sum + (o.items ? o.items.reduce((s, i) => s + (i.qty || 1), 0) : 0), 0);

  if (statOrders) statOrders.innerText = filtered.length;
  if (statRev) statRev.innerText = `Rs. ${totalRev.toLocaleString()}`;
  if (statBooks) statBooks.innerText = totalBooks;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="p-8 text-center text-slate-400 font-medium">No orders recorded for ${selectedDate}. Customer checkout orders will appear here.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(ord => `
    <tr class="hover:bg-slate-50/80 transition-colors">
      <td class="p-3.5">
        <div class="font-bold text-skybrand-700">${escapeHtml(ord.id)}</div>
        <div class="text-[10px] text-slate-400">${escapeHtml(ord.timestamp || '')}</div>
      </td>
      <td class="p-3.5">
        <div class="font-bold text-slate-900">${escapeHtml(ord.customerName)}</div>
        <div class="text-[11px] text-slate-700 font-semibold flex items-center gap-1 mt-0.5">
          <span class="material-symbols-outlined text-xs text-amber-600">call</span>
          <span class="font-bold text-slate-800">SIM: ${escapeHtml(ord.simNumber || ord.phone)}</span>
        </div>
        ${ord.whatsappNumber ? `
          <a href="https://wa.me/${ord.whatsappNumber.replace(/[^0-9]/g, '')}" target="_blank" class="text-[10.5px] text-emerald-600 font-semibold hover:underline flex items-center gap-1 mt-0.5">
            <span class="material-symbols-outlined text-xs text-emerald-500">chat</span>
            <span>WA: ${escapeHtml(ord.whatsappNumber)}</span>
          </a>
        ` : `
          <a href="https://wa.me/${(ord.simNumber || ord.phone || '').replace(/[^0-9]/g, '')}" target="_blank" class="text-[10px] text-slate-400 hover:text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
            <span class="material-symbols-outlined text-xs">chat</span> Chat
          </a>
        `}
      </td>
      <td class="p-3.5">
        <div class="font-bold text-slate-800 text-[11px] bg-skybrand-50/60 border border-skybrand-200/70 text-skybrand-900 px-2 py-1 rounded-lg inline-block shadow-2xs">
          ${ord.tehsilDistrict ? escapeHtml(ord.tehsilDistrict) : '<span class="text-slate-400 font-normal italic">Not specified</span>'}
        </div>
      </td>
      <td class="p-3.5">
        <div class="font-bold text-slate-800 text-[11px]">${escapeHtml(ord.city)}</div>
        <div class="text-[10px] text-slate-500 line-clamp-1">${escapeHtml(ord.address)}</div>
      </td>
      <td class="p-3.5">
        <div class="space-y-0.5">
          ${(ord.items || []).map(i => `<div class="text-[11px] text-slate-700 font-medium">• ${escapeHtml(i.title)} <span class="font-bold text-skybrand-700">x${i.qty}</span></div>`).join('')}
        </div>
      </td>
      <td class="p-3.5">
        <span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold uppercase">${escapeHtml(ord.payment || 'COD')}</span>
      </td>
      <td class="p-3.5">
        <span class="font-black text-slate-900 text-xs">Rs. ${(ord.total || 0).toLocaleString()}</span>
      </td>
      <td class="p-3.5 text-right">
        <button onclick="window.generateOrderInvoicePDF(${JSON.stringify(String(ord.id))})" class="px-2.5 py-1 bg-skybrand-50 hover:bg-skybrand-100 text-skybrand-700 border border-skybrand-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ml-auto">
          <span class="material-symbols-outlined text-sm">print</span> Receipt
        </button>
      </td>
    </tr>
  `).join('');
}

// Modal management for Add Book
function openAddBookModal() {
  const modal = document.getElementById('addBookModal');
  if (modal) modal.classList.remove('hidden');
}

function closeAddBookModal() {
  window.pendingNewBookImageFile = null;
  const fileInput = document.getElementById('newImageFileInput');
  if (fileInput) fileInput.value = '';
  const modal = document.getElementById('addBookModal');
  if (modal) modal.classList.add('hidden');
}

async function handleAddNewBook(e) {
  e.preventDefault();
  if (!requireAdmin()) return;
  const title = document.getElementById('newTitle').value.trim();
  const urdu = document.getElementById('newUrduTitle').value.trim();
  const price = parseInt(document.getElementById('newPrice').value) || 1500;
  const category = document.getElementById('newCategory').value.trim() || 'Clinical Skills';
  const author = document.getElementById('newAuthor').value.trim() || 'Usmaniya Publications';
  const desc = document.getElementById('newDesc').value.trim() || 'Clinical medical reference textbook.';
  const ebookPriceVal = document.getElementById('newEbookPrice')?.value;
  const imageVal = document.getElementById('newBookImage')?.value.trim();
  const submitBtn = e.submitter;

  const client = initSupabase();
  if (!client) {
    showAppToast('❌ Supabase is unavailable. Book was not added.', 'error');
    return;
  }

  try {
    if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('opacity-60', 'pointer-events-none'); }
    const payload = {
      title,
      urdu_title: urdu || title,
      physical_price: price,
      ebook_price: (ebookPriceVal && parseInt(ebookPriceVal) > 0) ? parseInt(ebookPriceVal) : null,
      category,
      publisher: author,
      author,
      description: desc,
      cover_image: getSafeImageUrl(imageVal),
      in_stock: true
    };

    const { data: inserted, error: insertError } = await client.from('books').insert([payload]).select().single();
    if (insertError) throw insertError;
    const dbBook = inserted;

    if (window.pendingNewBookImageFile) {
      const path = `book-covers/${dbBook.id}-${crypto.randomUUID()}.${imageExtension(window.pendingNewBookImageFile)}`;
      showAppToast('Uploading new book cover…', 'info');
      const publicUrl = await uploadImageToStorage(window.pendingNewBookImageFile, path);
      const { error: imageError } = await client.from('books').update({ cover_image: publicUrl, updated_at: new Date().toISOString() }).eq('id', dbBook.id);
      if (imageError) {
        await deleteStorageObject(path).catch(() => {});
        await client.from('books').delete().eq('id', dbBook.id).catch(() => {});
        throw imageError;
      }
      dbBook.cover_image = publicUrl;
    }

    const newBook = {
      id: dbBook.id,
      title: dbBook.title,
      urduTitle: dbBook.urdu_title || dbBook.title,
      price: Number(dbBook.physical_price || 0),
      ebookPrice: dbBook.ebook_price != null ? Number(dbBook.ebook_price) : undefined,
      publisher: dbBook.publisher || author,
      author: dbBook.author || author,
      category: dbBook.category || category,
      languages: ['English', 'Urdu'],
      image: dbBook.cover_image || imageVal || 'images/injection_therapy_book.svg',
      badge: 'New Arrival',
      badgeColor: 'bg-skybrand-600',
      description: dbBook.description || desc,
      urduDescription: 'نئی طبی کلینیکل گائیڈ معہ تفصیلی پریکٹیکل طریقے',
      inStock: dbBook.in_stock !== false,
      sampleImages: ['images/injection_sample_1.svg']
    };
    window.booksData.push(newBook);
    saveStoredBooks();
    renderBooks();
    renderAdminCatalog();
    closeAddBookModal();
    document.getElementById('newImageFileInput').value = '';
    window.pendingNewBookImageFile = null;
    showAppToast(`✅ "${title}" added to catalog for all visitors!`, 'success');
  } catch (err) {
    console.error('Add book failed:', err);
    showAppToast(`❌ Could not add book: ${err.message || 'Please try again.'}`, 'error');
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('opacity-60', 'pointer-events-none'); }
  }
}

// Attach all public functions to window
window.renderBooks = renderBooks;
window.filterCategory = filterCategory;
window.handleSearch = handleSearch;
window.handleMobileSearch = handleMobileSearch;
window.clearSearch = clearSearch;
window.handleSortChange = handleSortChange;
window.addToCart = addToCart;
window.updateQty = updateQty;
window.removeFromCart = removeFromCart;
window.updateCartUI = updateCartUI;
window.toggleCartDrawer = toggleCartDrawer;
window.openPreviewModal = openPreviewModal;
window.closePreviewModal = closePreviewModal;
window.openCheckoutModal = openCheckoutModal;
window.closeCheckoutModal = closeCheckoutModal;
window.showPaymentDetails = showPaymentDetails;
window.handleCheckoutSubmit = handleCheckoutSubmit;
window.checkoutWhatsApp = checkoutWhatsApp;
window.openSamplePdfModal = openSamplePdfModal;
window.closeSamplePdfModal = closeSamplePdfModal;
window.renderSampleGallerySlide = renderSampleGallerySlide;
window.navigateSampleImage = navigateSampleImage;
window.setSampleGalleryIndex = setSampleGalleryIndex;
window.buyEbook = buyEbook;
window.openAdminPortal = openAdminPortal;
window.closeAdminAuthModal = closeAdminAuthModal;
window.verifyAdminPin = verifyAdminPin;
window.logoutAdmin = logoutAdmin;
window.switchAdminTab = switchAdminTab;
window.renderAdminCatalog = renderAdminCatalog;
window.saveBookPrice = saveBookPrice;
window.saveEbookFields = saveEbookFields;
window.toggleBookStock = toggleBookStock;
window.deleteBook = deleteBook;
window.openEditBookModal = openEditBookModal;
window.closeEditBookModal = closeEditBookModal;
window.handleSaveBookEdit = handleSaveBookEdit;
window.openDeleteBookModal = openDeleteBookModal;
window.closeDeleteBookModal = closeDeleteBookModal;
window.executeDeleteBook = executeDeleteBook;
window.openClearLogsModal = openClearLogsModal;
window.closeClearLogsModal = closeClearLogsModal;
window.executeClearOrderLogs = executeClearOrderLogs;
window.showAppToast = showAppToast;
window.setOrderDateToday = setOrderDateToday;
window.renderAdminOrders = renderAdminOrders;
window.clearOrderLogs = clearOrderLogs;
window.openAddBookModal = openAddBookModal;
window.closeAddBookModal = closeAddBookModal;
window.handleAddNewBook = handleAddNewBook;
window.handleBookCoverUpload = handleBookCoverUpload;
window.handleEditImageFileInput = handleEditImageFileInput;
window.handleNewBookImageFile = handleNewBookImageFile;
window.handleChangeAdminPassword = handleChangeAdminPassword;
window.loadStoreBanner = loadStoreBanner;
window.handleBannerFileUpload = handleBannerFileUpload;
window.resetStoreBanner = resetStoreBanner;
// Store Flyer Handling (Admin Only Controls)
async function loadStoreBanner() {
  const officialBanner = 'images/al_ahad_banner.jpg?v=3';
  const bannerImg = document.getElementById('heroBannerImg');
  const adminThumb = document.getElementById('adminBannerThumbnail');
  if (bannerImg) bannerImg.src = officialBanner;
  if (adminThumb) adminThumb.src = officialBanner;

  try {
    const client = initSupabase();
    if (!client) return;
    const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl('site/banner');
    if (data?.publicUrl) {
      const url = `${data.publicUrl}?v=${Date.now()}`;
      // HEAD is intentionally avoided; an empty object is not useful. The image
      // element's onerror falls back to the official bundled banner.
      if (bannerImg) bannerImg.src = url;
      if (adminThumb) adminThumb.src = url;
    }
  } catch (e) {
    console.warn('Could not load global banner:', e);
  }
}

async function handleBannerFileUpload(event) {
  if (!requireAdmin()) return;
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    showAppToast('Uploading store flyer…', 'info');
    const publicUrl = await uploadImageToStorage(file, 'site/banner');
    const bannerImg = document.getElementById('heroBannerImg');
    const adminThumb = document.getElementById('adminBannerThumbnail');
    const url = publicUrl;
    if (bannerImg) bannerImg.src = url;
    if (adminThumb) adminThumb.src = url;
    showAppToast('✅ Store flyer updated globally for all visitors!', 'success');
  } catch (err) {
    console.error('Banner upload failed:', err);
    showAppToast(`❌ Flyer upload failed: ${err.message || 'Please try again.'}`, 'error');
  } finally {
    event.target.value = '';
  }
}

async function resetStoreBanner() {
  if (!requireAdmin()) return;
  try {
    await deleteStorageObject('site/banner');
  } catch (err) {
    console.error('Banner reset failed:', err);
    showAppToast(`❌ Could not reset flyer: ${err.message || 'Please try again.'}`, 'error');
    return;
  }
  const officialBanner = 'images/al_ahad_banner.jpg?v=3';
  const bannerImg = document.getElementById('heroBannerImg');
  const adminThumb = document.getElementById('adminBannerThumbnail');
  if (bannerImg) bannerImg.src = officialBanner;
  if (adminThumb) adminThumb.src = officialBanner;
  showAppToast('Store flyer reset to official default edition.', 'info');
}

function setupBannerDragDrop() {
  // Disabled for public users: only admin can change flyer via Admin Portal
}




window.setupBannerDragDrop = setupBannerDragDrop;
window.checkSupabaseConnection = checkSupabaseConnection;
window.testSupabaseConnectionUI = testSupabaseConnectionUI;

/* ==========================================================================
   نَسْج — المحرك البرمجي للوحة الإدارة والتحكم (Admin Control Panel JS)
   ========================================================================== */

let activeTab = 'products';
let currentFilterStyle = '';
let currentSearchQuery = '';
let editingProductId = null;
let editingStyleId = null;

document.addEventListener('DOMContentLoaded', () => {
  renderOverviewStats();
  renderProductsTable();
  renderStylesTable();
  loadSettings();
  setupEvents();
});

/* ================== التنبيهات ================== */
function showAdminToast(msg) {
  const t = document.getElementById('adminToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

/* ================== إحصائيات نظرة عامة ================== */
function renderOverviewStats() {
  document.getElementById('statTotalProducts').textContent = PRODUCTS.length;
  document.getElementById('statTotalStyles').textContent = STYLES.length;
  document.getElementById('statBestProducts').textContent = PRODUCTS.filter(p => p.isBest).length;
  document.getElementById('statSaleProducts').textContent = PRODUCTS.filter(p => p.discount > 0).length;
}

/* ================== التنقل بين التبويبات ================== */
function switchTab(tabId) {
  activeTab = tabId;
  document.querySelectorAll('.admin-nav-item button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabId}`);
  });

  const titles = {
    products: 'إدارة وترتيب المنتجات',
    styles: 'إدارة وتنسيق تصنيفات الأنماط',
    settings: 'إعدادات المتجر والشريط العلوي'
  };
  const descs = {
    products: 'إضافة، تعديل، تغيير ترتيب الظهور وحذف المنتجات بسهولة',
    styles: 'ترتيب ظهور الأنماط وتعديل العناوين والأوصاف والشعارات',
    settings: 'تعديل الإعلانات العليا والحد الأدنى للشحن وإدارة التخزين'
  };
  document.getElementById('pageTitle').textContent = titles[tabId] || 'لوحة الإدارة';
  document.getElementById('pageDesc').textContent = descs[tabId] || '';

  const topAddBtn = document.getElementById('topbarAddBtn');
  if (topAddBtn) {
    if (tabId === 'products') {
      topAddBtn.style.display = 'inline-flex';
      topAddBtn.innerHTML = '<span>➕</span><span>إضافة سجادة جديدة</span>';
      topAddBtn.onclick = openAddProductModal;
      renderProductsTable();
    } else if (tabId === 'styles') {
      topAddBtn.style.display = 'inline-flex';
      topAddBtn.innerHTML = '<span>➕</span><span>إضافة نمط جديد</span>';
      topAddBtn.onclick = openAddStyleModal;
      renderStylesTable();
    } else {
      topAddBtn.style.display = 'none';
    }
  }
}

/* ================== جدول المنتجات وترتيبها ================== */
function renderProductsTable() {
  const tbody = document.getElementById('productsTbody');
  if (!tbody) return;

  // خيارات الفلترة بالنمط في أعلى الجدول
  const filterStyleSelect = document.getElementById('filterStyleSelect');
  if (filterStyleSelect && filterStyleSelect.children.length <= 1) {
    filterStyleSelect.innerHTML = '<option value="">كل الأنماط</option>' + 
      STYLES.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  }

  // تصفية المنتجات
  let list = [...PRODUCTS];
  if (currentFilterStyle) {
    list = list.filter(p => p.style === currentFilterStyle);
  }
  if (currentSearchQuery) {
    const q = currentSearchQuery.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--admin-muted);">لا توجد منتجات تطابق البحث أو الفلتر المختار</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((p, idx) => {
    const imgUrl = Rugs.url(p, 0, 'full');
    const styleObj = STYLES.find(s => s.id === p.style) || { name: p.style };
    const firstSize = p.sizes[0] || DEFAULT_SIZES[0].id;
    const { finalPrice } = calculateProductPrice(p, firstSize);

    let badges = '';
    if (p.isBest) badges += `<span class="badge-tag badge-best-tag">الأكثر طلباً</span>`;
    if (p.isNew) badges += `<span class="badge-tag badge-new-tag">جديد</span>`;
    if (p.discount > 0) badges += `<span class="badge-tag badge-sale-tag">خصم ${p.discount}%</span>`;

    return `
      <tr>
        <td style="font-weight:700;">${p.order + 1}</td>
        <td>
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="${imgUrl}" class="prod-thumb" alt="${p.name}">
            <div>
              <div style="font-weight:800; color:#24201c;">${p.name}</div>
              <div style="font-size:0.78rem; color:var(--admin-muted);">ID: ${p.id}</div>
            </div>
          </div>
        </td>
        <td><span style="font-weight:600; color:var(--admin-primary);">${styleObj.name}</span></td>
        <td style="font-weight:800;">${finalPrice} ر.س</td>
        <td>${badges || '<span style="color:#aaa;">عادي</span>'}</td>
        <td>
          <div class="order-btns">
            <button class="btn-icon-sm" title="تحريك لأعلى (تقديم الترتيب)" onclick="moveProductOrder(${idx}, -1)">▲</button>
            <button class="btn-icon-sm" title="تحريك لأسفل (تأخير الترتيب)" onclick="moveProductOrder(${idx}, 1)">▼</button>
          </div>
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn-admin btn-admin-secondary" style="padding:6px 12px; font-size:0.82rem;" onclick="openEditProductModal('${p.id}')">✏️ تعديل</button>
            <button class="btn-admin btn-admin-danger" style="padding:6px 10px; font-size:0.82rem;" onclick="deleteProduct('${p.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/* إعادة ترتيب المنتجات */
function moveProductOrder(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= PRODUCTS.length) return;

  // تبديل المنتجات في المصفوفة
  const temp = PRODUCTS[index];
  PRODUCTS[index] = PRODUCTS[targetIndex];
  PRODUCTS[targetIndex] = temp;

  // تحديث خاصية order
  PRODUCTS.forEach((p, i) => p.order = i);

  // حفظ وحفظ في localStorage
  NasjStore.saveProducts(PRODUCTS);
  renderProductsTable();
  showAdminToast('تم تغيير ترتيب المنتج بنجاح 🔄');
}

/* حذف منتج */
function deleteProduct(productId) {
  const p = PRODUCTS.find(x => x.id === productId);
  if (!p) return;

  if (confirm(`هل أنت تأكد من حذف سجادة "${p.name}"؟`)) {
    PRODUCTS = PRODUCTS.filter(x => x.id !== productId);
    PRODUCTS.forEach((item, i) => item.order = i);
    NasjStore.saveProducts(PRODUCTS);
    renderProductsTable();
    renderOverviewStats();
    showAdminToast('تم حذف المنتج بنجاح');
  }
}

/* ================== نافذة إضافة/تعديل منتج ================== */
function openAddProductModal() {
  editingProductId = null;
  document.getElementById('productModalTitle').textContent = 'إضافة سجادة جديدة للكتالوج';
  document.getElementById('prodName').value = '';
  document.getElementById('prodStyleSelect').value = STYLES[0].id;
  document.getElementById('prodMinPrice').value = '299';
  document.getElementById('prodDiscount').value = '0';
  document.getElementById('prodIsNew').checked = true;
  document.getElementById('prodIsBest').checked = false;
  document.getElementById('productFormModal').classList.add('active');
}

function openEditProductModal(productId) {
  const p = PRODUCTS.find(x => x.id === productId);
  if (!p) return;

  editingProductId = productId;
  document.getElementById('productModalTitle').textContent = `تعديل سجادة: ${p.name}`;
  document.getElementById('prodName').value = p.name;
  document.getElementById('prodStyleSelect').value = p.style;
  document.getElementById('prodMinPrice').value = p.minPrice;
  document.getElementById('prodDiscount').value = p.discount || 0;
  document.getElementById('prodIsNew').checked = !!p.isNew;
  document.getElementById('prodIsBest').checked = !!p.isBest;
  document.getElementById('productFormModal').classList.add('active');
}

function closeProductModal() {
  document.getElementById('productFormModal').classList.remove('active');
}

function saveProductForm(e) {
  e.preventDefault();
  const name = document.getElementById('prodName').value.trim();
  const style = document.getElementById('prodStyleSelect').value;
  const minPrice = parseInt(document.getElementById('prodMinPrice').value) || 199;
  const discount = parseInt(document.getElementById('prodDiscount').value) || 0;
  const isNew = document.getElementById('prodIsNew').checked;
  const isBest = document.getElementById('prodIsBest').checked;

  if (!name) {
    alert('يرجى كتابة اسم السجادة');
    return;
  }

  if (editingProductId) {
    // تعديل منتج قائم
    const p = PRODUCTS.find(x => x.id === editingProductId);
    if (p) {
      p.name = name;
      p.style = style;
      p.minPrice = minPrice;
      p.discount = discount;
      p.isNew = isNew;
      p.isBest = isBest;
    }
    showAdminToast('تم تحديث بيانات المنتج بنجاح ✨');
  } else {
    // إضافة منتج جديد
    const newId = 'rug_' + Date.now();
    const styleObj = STYLES.find(s => s.id === style) || STYLES[0];
    const newProduct = {
      id: newId,
      style: style,
      variant: 'medallion',
      name: name,
      colors: ['beige', 'gold'],
      seed: Math.floor(Math.random() * 9999),
      sizes: ['s100x200', 's150x220', 's200x300', 's250x350'],
      rooms: ['living', 'bedroom'],
      ppm: 220,
      minPrice: minPrice,
      isNew: isNew,
      isBest: isBest,
      discount: discount,
      rating: 4.8,
      reviews: 12,
      sold: isBest ? 150 : 20,
      order: PRODUCTS.length,
      specs: {
        material: 'صوف طبيعي فاخر مع حرير نباتي',
        pile: '12 ملم',
        weave: 'نسيج أوتوماتيكي بدقة عالية',
        origin: 'تركيا',
        backing: 'ظهر قطني ممتازة',
        care: 'تنظيف بالمكنسة وتنظيف احترافي سنوي',
        sku: 'NJ-' + newId.toUpperCase(),
      },
      description: `${name}. تصاميم نقوش فاخرة تضفي دفئاً وأناقة استثنائية لمساحتك.`,
    };
    PRODUCTS.unshift(newProduct);
    PRODUCTS.forEach((p, i) => p.order = i);
    showAdminToast('🎉 تم تزويد المتجر بالسجادة الجديدة بنجاح');
  }

  NasjStore.saveProducts(PRODUCTS);
  closeProductModal();
  renderProductsTable();
  renderOverviewStats();
}

/* ================== جدول التصنيفات والأنماط ================== */
function renderStylesTable() {
  const tbody = document.getElementById('stylesTbody');
  if (!tbody) return;

  tbody.innerHTML = STYLES.map((st, idx) => {
    const count = PRODUCTS.filter(p => p.style === st.id).length;
    return `
      <tr>
        <td style="font-weight:700;">${idx + 1}</td>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:24px; height:24px; border-radius:6px; background:${st.tint}; border:1px solid #ccc;"></div>
            <div>
              <div style="font-weight:800;">${st.name}</div>
              <div style="font-size:0.78rem; color:var(--admin-muted);">${st.en || st.name}</div>
            </div>
          </div>
        </td>
        <td style="font-size:0.86rem; max-width:280px;">${st.tagline}</td>
        <td><span class="badge-tag badge-new-tag">${count} منتجات</span></td>
        <td>
          <div class="order-btns">
            <button class="btn-icon-sm" title="تقديم النمط (رفع الترتيب)" onclick="moveStyleOrder(${idx}, -1)">▲</button>
            <button class="btn-icon-sm" title="تأخير النمط (خفض الترتيب)" onclick="moveStyleOrder(${idx}, 1)">▼</button>
          </div>
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn-admin btn-admin-secondary" style="padding:6px 12px; font-size:0.82rem;" onclick="openEditStyleModal('${st.id}')">✏️ تعديل</button>
            <button class="btn-admin btn-admin-danger" style="padding:6px 10px; font-size:0.82rem;" onclick="deleteStyle('${st.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function moveStyleOrder(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= STYLES.length) return;

  const temp = STYLES[index];
  STYLES[index] = STYLES[targetIndex];
  STYLES[targetIndex] = temp;

  NasjStore.saveStyles(STYLES);
  renderStylesTable();
  showAdminToast('تم تغيير ترتيب ظهور النمط 🔄');
}

function openAddStyleModal() {
  editingStyleId = null;
  document.getElementById('styleModalTitle').textContent = 'إضافة نمط سجادة جديد';
  document.getElementById('styleNameInput').value = '';
  document.getElementById('styleTaglineInput').value = '';
  document.getElementById('styleDescInput').value = '';
  document.getElementById('styleTintInput').value = '#f2e6d6';
  document.getElementById('styleFormModal').classList.add('active');
}

function openEditStyleModal(styleId) {
  const st = STYLES.find(x => x.id === styleId);
  if (!st) return;

  editingStyleId = styleId;
  document.getElementById('styleModalTitle').textContent = `تعديل نمط: ${st.name}`;
  document.getElementById('styleNameInput').value = st.name;
  document.getElementById('styleTaglineInput').value = st.tagline;
  document.getElementById('styleDescInput').value = st.desc;
  document.getElementById('styleTintInput').value = st.tint;
  document.getElementById('styleFormModal').classList.add('active');
}

function closeStyleModal() {
  document.getElementById('styleFormModal').classList.remove('active');
}

function saveStyleForm(e) {
  e.preventDefault();
  const name = document.getElementById('styleNameInput').value.trim();
  const tagline = document.getElementById('styleTaglineInput').value.trim();
  const desc = document.getElementById('styleDescInput').value.trim();
  const tint = document.getElementById('styleTintInput').value;

  if (!name) {
    alert('يرجى كتابة اسم النمط');
    return;
  }

  if (editingStyleId) {
    const st = STYLES.find(x => x.id === editingStyleId);
    if (st) {
      st.name = name;
      st.tagline = tagline;
      st.desc = desc;
      st.tint = tint;
      showAdminToast('تم حفظ تعديلات النمط بنجاح ✨');
    }
  } else {
    const newId = 'style_' + Date.now();
    const newStyle = {
      id: newId,
      ar: name,
      en: name,
      name: name,
      tint: tint,
      tagline: tagline || name,
      desc: desc || name,
    };
    STYLES.push(newStyle);
    showAdminToast('🎉 تم إضافة النمط الجديد بنجاح');
  }

  NasjStore.saveStyles(STYLES);
  renderStylesTable();
  renderOverviewStats();
  closeStyleModal();
}

function deleteStyle(styleId) {
  const st = STYLES.find(x => x.id === styleId);
  if (!st) return;

  if (confirm(`هل أنت تأكد من حذف نمط "${st.name}"؟`)) {
    STYLES = STYLES.filter(x => x.id !== styleId);
    NasjStore.saveStyles(STYLES);
    renderStylesTable();
    renderOverviewStats();
    showAdminToast('تم حذف النمط بنجاح');
  }
}

/* ================== الإعدادات العامة ================== */
function loadSettings() {
  const annText = localStorage.getItem('nasj_announcement') || '✨ شحن مجاني لكافة مدن المملكة للطلبات فوق 499 ر.س | ضمان ذهبي واسترجاع خلال 14 يوماً';
  const annInput = document.getElementById('settingAnnouncementInput');
  if (annInput) annInput.value = annText;
}

function saveSettingsForm(e) {
  e.preventDefault();
  const annText = document.getElementById('settingAnnouncementInput').value.trim();
  if (annText) {
    localStorage.setItem('nasj_announcement', annText);
    showAdminToast('تم حفظ إعدادات الشريط العلوي 📢');
  }
}

function resetAllData() {
  if (confirm('⚠️ هل أنت تأكد من استعادة كافة بيانات المنتجات والتصنيفات الأصلية المسجلة أول مرة؟ سيتم الغاء كل تعديل أحدثته.')) {
    NasjStore.resetAll();
  }
}

/* ================== الأحداث والبحث ================== */
function setupEvents() {
  document.getElementById('adminSearchInput')?.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value;
    renderProductsTable();
  });

  document.getElementById('filterStyleSelect')?.addEventListener('change', (e) => {
    currentFilterStyle = e.target.value;
    renderProductsTable();
  });
}

/**
 * AL-AHAD BOOK CENTER — High-Fidelity PDF Generation Engine
 * Fixes the blank page bug by ensuring proper DOM positioning,
 * waiting for image assets to load, and configuring html2canvas/jspdf correctly.
 */

// Show a friendly loading notification during PDF generation
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showPdfLoadingToast(message = 'Preparing PDF download...') {
  let toast = document.getElementById('pdfLoadingToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'pdfLoadingToast';
    toast.className = 'fixed bottom-6 right-6 z-[100000] bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 transition-all duration-300 font-sans text-xs';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `
    <div class="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
    <div>
      <p class="font-bold text-slate-100">${message}</p>
      <p class="text-[10px] text-slate-400">Please wait while pages are formatted...</p>
    </div>
  `;
  toast.style.display = 'flex';
  toast.style.opacity = '1';
}

function hidePdfLoadingToast() {
  const toast = document.getElementById('pdfLoadingToast');
  if (toast) {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast) toast.style.display = 'none';
    }, 300);
  }
}

/**
 * Robust HTML to PDF renderer
 * Eliminates blank white pages by using direct html2canvas + jsPDF pixel rendering:
 * 1. Positions wrapper at fixed (0,0) without scroll displacement
 * 2. Uses html2canvas to render full pixel-perfect bitmap at 2x resolution
 * 3. Slices bitmap cleanly onto A4 jsPDF canvas without html2pdf pagebreaker artifacts
 */
async function renderElementToPDF(htmlContent, filename) {
  showPdfLoadingToast('Generating verified PDF document...');

  // Create temporary container placed at top-left of viewport
  const wrapper = document.createElement('div');
  wrapper.id = 'pdf-render-canvas-wrapper';
  wrapper.style.cssText = [
    'position: fixed',
    'left: 0',
    'top: 0',
    'width: 800px',
    'background: #ffffff',
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    'color: #0f172a',
    'padding: 0',
    'margin: 0',
    'z-index: 999999',
    'visibility: visible',
    'pointer-events: none',
    'box-sizing: border-box'
  ].join(';');

  wrapper.innerHTML = htmlContent;
  document.body.appendChild(wrapper);

  try {
    // Preload and wait for all images inside wrapper
    const images = Array.from(wrapper.querySelectorAll('img'));
    await Promise.all(images.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(resolve => {
        const timer = setTimeout(() => {
          img.style.display = 'none';
          resolve();
        }, 1500);
        img.onload = () => { clearTimeout(timer); resolve(); };
        img.onerror = () => {
          clearTimeout(timer);
          img.style.display = 'none';
          resolve();
        };
      });
    }));

    // Delay to let fonts and DOM reflow
    await new Promise(r => setTimeout(r, 250));

    // Try direct html2canvas + jsPDF rendering first (guaranteed zero blank pages)
    const hasHtml2Canvas = typeof window.html2canvas === 'function';
    const jsPDFConstructor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;

    if (hasHtml2Canvas && jsPDFConstructor) {
      const canvas = await window.html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        windowWidth: 800
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas render was empty');
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDFConstructor({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth(); // 210 mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Page 1
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Extra pages if document exceeds one A4 page
      while (heightLeft > 5) { // 5mm tolerance
        position = -(imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(filename);
      if (typeof window.showAppToast === 'function') {
        window.showAppToast(`📄 Downloaded: ${filename}`, 'success');
      }
    } else if (typeof html2pdf !== 'undefined') {
      // Fallback to html2pdf with corrected settings
      const opt = {
        margin: [6, 6, 6, 6],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          scrollX: 0,
          scrollY: 0,
          backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      await html2pdf().set(opt).from(wrapper).save();
      if (typeof window.showAppToast === 'function') {
        window.showAppToast(`📄 Downloaded: ${filename}`, 'success');
      }
    } else {
      throw new Error('No PDF generation library available');
    }
  } catch (err) {
    console.error('PDF generation error:', err);
    // Print fallback if file export is blocked
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(`<!DOCTYPE html><html><head><title>${filename}</title><style>body{font-family:sans-serif;margin:20px;}@media print{body{margin:0;}}</style></head><body>${htmlContent}</body></html>`);
      printWin.document.close();
      setTimeout(() => { printWin.print(); }, 400);
    }
  } finally {
    hidePdfLoadingToast();
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper);
    }
  }
}

/**
 * Generates a comprehensive, verified Sample E-Book Booklet for the chosen medical book
 */
function downloadSamplePdf(bookId) {
  const targetId = bookId || window.currentSampleBookId;
  const book = (window.booksData || []).find(b => b.id === targetId);
  if (!book) {
    alert('Please select a book to download its sample preview.');
    return;
  }

  const safeTitle = (book.title || 'Book').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `AlAhad_Sample_${safeTitle}.pdf`;

  // Determine sample images
  let sampleImgs = [];
  if (book.sampleImages && book.sampleImages.length > 0) {
    sampleImgs = book.sampleImages;
  } else if (book.samplePdfUrl && book.samplePdfUrl.trim() !== '') {
    sampleImgs = [book.samplePdfUrl];
  } else if (book.image) {
    sampleImgs = [book.image];
  }

  // Generate topics list
  const topicsHtml = (book.topics && book.topics.length > 0)
    ? book.topics.map((t, idx) => `
        <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; font-size: 11px;">
          <span style="color: #0284c7; font-weight: 800;">✓ Chapter ${idx + 1}:</span>
          <span style="color: #1e293b; font-weight: 600;">${t}</span>
        </div>
      `).join('')
    : '<p style="font-size: 11px; color: #64748b;">Comprehensive chapter breakdown included in complete volume.</p>';

  const htmlContent = `
    <div style="padding: 24px; font-family: Helvetica, Arial, sans-serif; color: #0f172a; max-width: 720px; margin: 0 auto; background: #ffffff;">
      
      <!-- Top Official Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px;">
        <div>
          <h1 style="margin: 0; color: #0369a1; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">AL-AHAD BOOK CENTER</h1>
          <p style="margin: 2px 0 0 0; color: #0284c7; font-size: 12px; font-weight: 700;">Official Sellers of Usmaniya Publications (عثمان پبلیکیشنز)</p>
          <p style="margin: 2px 0 0 0; color: #64748b; font-size: 11px;">Direct Orders &amp; Inquiries: <strong>Abdul Ahad (0328-1830420)</strong></p>
        </div>
        <div style="text-align: right; background: #f0f9ff; border: 1px solid #bae6fd; padding: 6px 12px; border-radius: 8px;">
          <span style="font-size: 10px; color: #0369a1; text-transform: uppercase; font-weight: 800; display: block;">FREE SAMPLE SPECIMEN</span>
          <span style="font-size: 11px; color: #0c4a6e; font-weight: 700;">Authorized Clinical Extract</span>
        </div>
      </div>

      <!-- Book Overview Card -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 18px; display: flex; gap: 16px; align-items: center;">
        <img src="${book.image}" style="width: 85px; height: 115px; object-fit: contain; border-radius: 6px; border: 1px solid #cbd5e1; background: #ffffff;" onerror="this.style.display='none'"/>
        <div style="flex: 1;">
          <span style="display: inline-block; background: #e0f2fe; color: #0369a1; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px; margin-bottom: 4px;">${book.category || 'Medical'}</span>
          <h2 style="margin: 0; font-size: 17px; color: #0f172a; font-weight: 800;">${book.title}</h2>
          ${book.urduTitle ? `<p style="margin: 2px 0 0 0; font-size: 14px; color: #0284c7; font-weight: 700; direction: rtl;">${book.urduTitle}</p>` : ''}
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">Author: <strong>${book.author || 'Usmaniya Editorial Board'}</strong> | Publisher: <strong>${book.publisher || 'Usmaniya Publications'}</strong></p>
          <div style="margin-top: 6px; display: flex; gap: 12px; font-size: 11px;">
            <span style="color: #166534; font-weight: 800;">Hardcopy: Rs. ${(book.price || 0).toLocaleString()}</span>
            ${book.ebookPrice ? `<span style="color: #7c2d12; font-weight: 800;">PDF E-Book: Rs. ${book.ebookPrice.toLocaleString()}</span>` : ''}
            <span style="color: #0284c7; font-weight: 700;">• FREE Delivery Nationwide 🚚</span>
          </div>
        </div>
      </div>

      <!-- Description Section -->
      <div style="margin-bottom: 18px; background: #ffffff; border: 1px solid #e2e8f0; padding: 12px 14px; border-radius: 8px;">
        <h3 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 800; color: #0369a1; text-transform: uppercase;">Book Summary &amp; Scope</h3>
        <p style="margin: 0; font-size: 11.5px; line-height: 1.55; color: #334155;">${book.description || 'Comprehensive medical clinical manual published by Usmaniya Publications.'}</p>
        ${book.urduDescription ? `
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e2e8f0; text-align: right; direction: rtl;">
            <p style="margin: 0; font-size: 12px; line-height: 1.8; color: #0c4a6e; font-weight: 600;">${book.urduDescription}</p>
          </div>
        ` : ''}
      </div>

      <!-- Table of Contents / Syllabus -->
      <div style="margin-bottom: 20px; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px; border-radius: 8px;">
        <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 800; color: #166534; text-transform: uppercase;">Included Clinical Chapters &amp; Practical Topics</h3>
        <div style="display: grid; grid-template-columns: 1fr; gap: 2px;">
          ${topicsHtml}
        </div>
      </div>

      <!-- Sample Pages Visual Gallery -->
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
          Sample Clinical Page Previews (${sampleImgs.length} Page${sampleImgs.length > 1 ? 's' : ''})
        </h3>

        ${sampleImgs.map((imgSrc, idx) => `
          <div style="margin-bottom: 18px; text-align: center; background: #f8fafc; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;">
            <div style="font-size: 10px; font-weight: 700; color: #64748b; margin-bottom: 6px;">Sample Page View ${idx + 1} of ${sampleImgs.length}</div>
            <img src="${imgSrc}" style="max-width: 100%; max-height: 600px; border-radius: 4px; border: 1px solid #e2e8f0; display: inline-block; object-fit: contain; background: #ffffff;" onerror="this.style.display='none'"/>
          </div>
        `).join('')}
      </div>

      <!-- Order CTA Box -->
      <div style="border: 2px solid #0284c7; background: #f0f9ff; border-radius: 10px; padding: 14px; text-align: center;">
        <h4 style="margin: 0; color: #0369a1; font-size: 14px; font-weight: 800;">Get the Full Book Delivered to Your Doorstep</h4>
        <p style="margin: 4px 0 8px 0; font-size: 11px; color: #334155;">Cash on Delivery (COD) &amp; EasyPaisa / JazzCash / Bank Transfer accepted with FREE shipping across Pakistan.</p>
        <div style="display: inline-block; background: #0284c7; color: #ffffff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 800;">
          📞 WhatsApp: 0328-1830420 (Abdul Ahad) • Bahawalpur, Punjab
        </div>
      </div>

    </div>
  `;

  renderElementToPDF(htmlContent, fileName);
}

function downloadCurrentSamplePdf() {
  downloadSamplePdf(window.currentSampleBookId);
}

/**
 * Generates Daily Orders PDF Report
 * Displays all orders of the selected day with complete customer details, itemized books, and financial totals.
 */
function generateDailyOrdersPDF() {
  const dateInput = document.getElementById('adminOrderDateFilter');
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const selectedDate = (dateInput && dateInput.value) ? dateInput.value.trim() : todayStr;
  
  const allOrders = window.ordersData || [];

  const getOrderDate = (ord) => {
    if (!ord) return '';
    const raw = ord.date || ord.created_at;
    if (typeof raw === 'string') {
      return raw.split('T')[0].trim();
    }
    return '';
  };

  let ordersToExport = allOrders.filter(o => getOrderDate(o) === selectedDate);
  let reportSubtitle = `Date: ${selectedDate}`;


  const totalRev = ordersToExport.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalItems = ordersToExport.reduce((sum, o) => sum + (o.items ? o.items.reduce((s, i) => s + (i.qty || 1), 0) : 0), 0);

  const tableRowsHtml = ordersToExport.length > 0 
    ? ordersToExport.map((ord, idx) => `
        <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 7px 6px; text-align: center; font-weight: 700; color: #64748b; border: 1px solid #e2e8f0;">${idx + 1}</td>
          <td style="padding: 7px 6px; font-weight: 800; color: #0284c7; border: 1px solid #e2e8f0;">
            ${escapeHtml(ord.id)}
            <div style="font-size: 8px; color: #94a3b8; font-weight: 400; margin-top: 2px;">${escapeHtml(ord.timestamp || '')}</div>
          </td>
          <td style="padding: 7px 6px; border: 1px solid #e2e8f0;">
            <strong style="color: #0f172a; font-size: 11px;">${escapeHtml(ord.customerName)}</strong><br/>
            <span style="color: #0284c7; font-weight: 700; font-size: 9.5px;">📞 SIM: ${escapeHtml(ord.simNumber || ord.phone)}</span>
            ${ord.whatsappNumber ? `<br/><span style="color: #059669; font-weight: 600; font-size: 9px;">💬 WA: ${escapeHtml(ord.whatsappNumber)}</span>` : ''}
          </td>
          <td style="padding: 7px 6px; border: 1px solid #e2e8f0;">
            ${ord.tehsilDistrict ? `<span style="display: block; font-weight: 700; color: #0369a1; font-size: 9.5px; margin-bottom: 2px;">🏛️ ${escapeHtml(ord.tehsilDistrict)}</span>` : ''}
            <strong style="color: #1e293b;">${escapeHtml(ord.city)}</strong><br/>
            <span style="color: #64748b; font-size: 9px; line-height: 1.3; display: block; margin-top: 1px;">${escapeHtml(ord.address)}</span>
          </td>
          <td style="padding: 7px 6px; border: 1px solid #e2e8f0;">
            ${(ord.items || []).map(i => `
              <div style="margin-bottom: 3px; font-size: 9.5px; line-height: 1.3;">
                • <strong style="color: #1e293b;">${escapeHtml(i.title)}</strong> 
                <span style="color: #0284c7; font-weight: 700;">(Qty: ${i.qty || 1}${i.price ? ` @ Rs. ${i.price.toLocaleString()}` : ''})</span>
              </div>
            `).join('')}
          </td>
          <td style="padding: 7px 6px; text-align: center; border: 1px solid #e2e8f0;">
            <span style="background: #e2e8f0; color: #334155; padding: 3px 6px; border-radius: 4px; font-weight: 700; font-size: 8.5px; display: inline-block;">
              ${escapeHtml((ord.payment || 'COD').toUpperCase())}
            </span>
          </td>
          <td style="padding: 7px 6px; text-align: right; font-weight: 900; color: #0f172a; border: 1px solid #e2e8f0; font-size: 11px;">
            Rs. ${(ord.total || 0).toLocaleString()}
          </td>
        </tr>
      `).join('')
    : `
        <tr>
          <td colspan="7" style="padding: 24px; text-align: center; color: #64748b; font-size: 11px; border: 1px solid #e2e8f0;">
            No customer checkout orders recorded for this period.
          </td>
        </tr>
      `;

  const htmlContent = `
    <div style="padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; max-width: 760px; margin: 0 auto; background: #ffffff;">
      
      <!-- Report Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 14px; margin-bottom: 16px;">
        <div>
          <h1 style="margin: 0; color: #0369a1; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">AL-AHAD BOOK CENTER</h1>
          <p style="margin: 3px 0 0 0; color: #334155; font-size: 11px; font-weight: 600;">Official Sellers of Usmaniya Publications — Bahawalpur, Punjab, Pakistan</p>
          <p style="margin: 2px 0 0 0; color: #64748b; font-size: 10px;">Store Owner: Abdul Ahad • Phone / WhatsApp: 03281830420</p>
        </div>
        <div style="text-align: right; background: #f0f9ff; border: 1px solid #bae6fd; padding: 8px 14px; border-radius: 10px;">
          <span style="font-size: 9px; color: #0369a1; text-transform: uppercase; font-weight: 800; display: block; letter-spacing: 0.5px;">OFFICIAL DAILY ORDERS REPORT</span>
          <strong style="font-size: 13px; color: #0c4a6e;">${reportSubtitle}</strong>
        </div>
      </div>

      <!-- Financial & Order Summary Cards -->
      <div style="display: flex; gap: 10px; margin-bottom: 18px;">
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 12px; border-radius: 8px; text-align: center;">
          <span style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Total Orders</span>
          <h3 style="margin: 4px 0 0 0; font-size: 18px; color: #0f172a; font-weight: 800;">${ordersToExport.length}</h3>
        </div>
        <div style="flex: 1; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 12px; border-radius: 8px; text-align: center;">
          <span style="font-size: 10px; color: #166534; font-weight: 700; text-transform: uppercase;">Daily Revenue</span>
          <h3 style="margin: 4px 0 0 0; font-size: 18px; color: #15803d; font-weight: 800;">Rs. ${totalRev.toLocaleString()}</h3>
        </div>
        <div style="flex: 1; background: #faf5ff; border: 1px solid #e9d5ff; padding: 10px 12px; border-radius: 8px; text-align: center;">
          <span style="font-size: 10px; color: #6b21a8; font-weight: 700; text-transform: uppercase;">Total Books Dispatched</span>
          <h3 style="margin: 4px 0 0 0; font-size: 18px; color: #7e22ce; font-weight: 800;">${totalItems}</h3>
        </div>
      </div>

      <!-- Itemized Orders Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 16px;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; text-align: left;">
            <th style="padding: 7px 8px; border: 1px solid #1e293b; width: 24px; text-align: center;">#</th>
            <th style="padding: 7px 8px; border: 1px solid #1e293b; width: 75px;">Order ID</th>
            <th style="padding: 7px 8px; border: 1px solid #1e293b; width: 140px;">Customer &amp; Contact</th>
            <th style="padding: 7px 8px; border: 1px solid #1e293b; width: 140px;">Destination Address</th>
            <th style="padding: 7px 8px; border: 1px solid #1e293b;">Books / Items Ordered</th>
            <th style="padding: 7px 8px; border: 1px solid #1e293b; width: 55px; text-align: center;">Payment</th>
            <th style="padding: 7px 8px; border: 1px solid #1e293b; width: 70px; text-align: right;">Total (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
        <tfoot>
          <tr style="background: #0f172a; color: #ffffff;">
            <td colspan="6" style="padding: 9px 10px; font-weight: 800; text-align: right; font-size: 11px; border: 1px solid #1e293b;">GRAND TOTAL REVENUE:</td>
            <td style="padding: 9px 8px; font-weight: 900; text-align: right; color: #4ade80; font-size: 12px; border: 1px solid #1e293b;">Rs. ${totalRev.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      <!-- Footer Notes -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 9px; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
        <span>Generated by Al-Ahad Book Center Store Portal • Free Delivery Nationwide</span>
        <span style="font-weight: 700; color: #0369a1;">Certified Usmaniya Publications Seller</span>
      </div>

    </div>
  `;

  renderElementToPDF(htmlContent, `AlAhad_Daily_Orders_${selectedDate}.pdf`);
}

/**
 * Generates an Order Shipping Invoice / Receipt PDF
 */
function generateOrderInvoicePDF(orderId) {
  const order = (window.ordersData || []).find(o => o.id === orderId);
  if (!order) return;

  const htmlContent = `
    <div style="padding: 24px; font-family: Helvetica, Arial, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px;">
      
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 14px;">
        <div>
          <h2 style="margin: 0; color: #0369a1; font-size: 18px; font-weight: 800;">AL-AHAD BOOK CENTER</h2>
          <p style="margin: 2px 0 0 0; color: #475569; font-size: 10px;">Official Sellers of Usmaniya Publications</p>
          <p style="margin: 1px 0 0 0; color: #64748b; font-size: 10px;">Bahawalpur, Punjab • 0328-1830420</p>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 10px; font-weight: 800; color: #0284c7; display: block;">CUSTOMER INVOICE</span>
          <strong style="font-size: 12px; color: #0f172a;">${escapeHtml(order.id)}</strong>
          <div style="font-size: 9px; color: #64748b;">${escapeHtml(order.date)} ${escapeHtml(order.timestamp || '')}</div>
        </div>
      </div>

      <div style="background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 14px;">
        <span style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 800; display: block;">SHIP TO:</span>
        <strong style="font-size: 12px; color: #0f172a;">${escapeHtml(order.customerName)}</strong><br/>
        <span style="font-size: 10px; color: #0284c7; font-weight: 700;">📞 SIM Number (Calls/SMS): ${escapeHtml(order.simNumber || order.phone)}</span><br/>
        ${order.whatsappNumber ? `<span style="font-size: 10px; color: #059669; font-weight: 600;">💬 WhatsApp: ${escapeHtml(order.whatsappNumber)}</span><br/>` : ''}
        ${order.tehsilDistrict ? `<span style="font-size: 10px; color: #334155; font-weight: 600;">🏛️ Tehsil &amp; District: <strong>${escapeHtml(order.tehsilDistrict)}</strong></span><br/>` : ''}
        <span style="font-size: 10px; color: #334155;">📍 Address: ${escapeHtml(order.address)}, <strong>${escapeHtml(order.city)}</strong></span>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 14px;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff;">
            <th style="padding: 5px 8px; text-align: left;">Book Title</th>
            <th style="padding: 5px 8px; text-align: center;">Qty</th>
            <th style="padding: 5px 8px; text-align: right;">Price</th>
            <th style="padding: 5px 8px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${(order.items || []).map((item, i) => `
            <tr style="border-bottom: 1px solid #e2e8f0; background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
              <td style="padding: 5px 8px; font-weight: 600;">${escapeHtml(item.title)}</td>
              <td style="padding: 5px 8px; text-align: center;">${item.qty}</td>
              <td style="padding: 5px 8px; text-align: right;">Rs. ${item.price.toLocaleString()}</td>
              <td style="padding: 5px 8px; text-align: right; font-weight: 700;">Rs. ${(item.price * item.qty).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="text-align: right; border-top: 2px solid #0f172a; padding-top: 6px; margin-bottom: 10px;">
        <span style="font-size: 12px; font-weight: 900; color: #0f172a;">TOTAL: Rs. ${(order.total || 0).toLocaleString()} (FREE Shipping)</span>
      </div>

      <div style="font-size: 9px; color: #64748b; text-align: center;">
        Payment: <strong>${escapeHtml((order.payment || 'COD').toUpperCase())}</strong> • Thank you for ordering from Al-Ahad Book Center!
      </div>

    </div>
  `;

  renderElementToPDF(htmlContent, `AlAhad_Receipt_${escapeHtml(order.id)}.pdf`);
}

// Attach to window object for inline HTML event handlers
window.renderElementToPDF = renderElementToPDF;
window.downloadSamplePdf = downloadSamplePdf;
window.downloadCurrentSamplePdf = downloadCurrentSamplePdf;
window.generateDailyOrdersPDF = generateDailyOrdersPDF;
window.generateOrderInvoicePDF = generateOrderInvoicePDF;

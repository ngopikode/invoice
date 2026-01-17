import 'bootstrap';

import './style.css';

// Import Font (Inter)
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

// Import Icons (FontAwesome)
import '@fortawesome/fontawesome-free/css/all.min.css';

// Import HTML sebagai text string (Fitur Vite ?raw)
import invoiceTemplate from './invoice.html?raw';
import {jsPDF} from 'jspdf';
import html2canvas from 'html2canvas';

// ==========================================
// 2. INJECT HTML KE DALAM DOM (ALA REACT)
// ==========================================
document.querySelector('#app').innerHTML = String(invoiceTemplate);


// ==========================================
// 3. LOGIC APLIKASI
// ==========================================

const defaultItem = {name: '', desc: '', qty: 1, price: 0, disc: 0, tax: 0};
let items = [{...defaultItem}];

function formatIDR(num) {
    return new Intl.NumberFormat('id-ID', {style: 'currency', currency: 'IDR', minimumFractionDigits: 0}).format(num);
}

function addItem() {
    items.push({...defaultItem});
    renderItems();
    calculateAll();
    saveData();
}

function removeItem(index) {
    if (items.length > 1) {
        items.splice(index, 1);
        renderItems();
        calculateAll();
        saveData();
    }
}

function updateItem(index, field, value) {
    items[index][field] = value;
    calculateAll();
    saveData();
}

function renderItems() {
    const tbody = document.getElementById('itemsBody');
    tbody.innerHTML = '';

    items.forEach((item, index) => {
        const tr = document.createElement('tr');
        const sub = item.qty * item.price;
        const discVal = sub * (item.disc / 100);
        const taxBase = sub - discVal;
        const taxVal = taxBase * (item.tax / 100);
        const total = taxBase + taxVal;

        tr.innerHTML = `
            <td>
                <input type="text" class="editable fw-bold" placeholder="Item" 
                    value="${item.name}" oninput="updateItem(${index}, 'name', this.value)">
            </td>
            <td>
                <textarea class="editable editable-textarea text-muted small" placeholder="Deskripsi" 
                    oninput="updateItem(${index}, 'desc', this.value)">${item.desc}</textarea>
            </td>
            <td>
                <input type="number" class="editable text-center" value="${item.qty}" min="1" 
                    oninput="updateItem(${index}, 'qty', parseFloat(this.value))">
            </td>
            <td>
                <input type="number" class="editable text-end" value="${item.price}" 
                    oninput="updateItem(${index}, 'price', parseFloat(this.value))">
            </td>
            <td class="column-disc">
                <div class="input-group input-group-sm">
                    <input type="number" class="form-control border-0 bg-transparent text-center p-0" 
                        value="${item.disc}" oninput="updateItem(${index}, 'disc', parseFloat(this.value))">
                    <span class="small text-muted align-self-center">%</span>
                </div>
            </td>
            <td class="column-tax">
                <input type="number" class="form-control border-0 bg-transparent text-center p-0" 
                        value="${item.tax}" oninput="updateItem(${index}, 'tax', parseFloat(this.value))">
            </td>
            <td class="text-end fw-bold">
                ${formatIDR(total)}
            </td>
            <td class="no-print text-center align-middle" data-html2canvas-ignore="true">
                <i class="fas fa-trash text-danger" style="cursor:pointer;" onclick="removeItem(${index})"></i>
            </td>
        `;
        tbody.appendChild(tr);
    });
    toggleColumns();
}

function toggleColumns() {
    // Karena elemen baru di-inject, kita harus pastikan elemennya ada
    const elDisc = document.getElementById('showDisc');
    const elTax = document.getElementById('showTax');

    if (!elDisc || !elTax) return;

    const showDisc = elDisc.checked;
    const showTax = elTax.checked;

    document.querySelectorAll('.column-disc').forEach(el => el.style.display = showDisc ? '' : 'none');
    document.querySelectorAll('.column-tax').forEach(el => el.style.display = showTax ? '' : 'none');

    // Safety check kalau header belum ke-render sempurna
    const hDisc = document.getElementById('headerDisc');
    if (hDisc) hDisc.parentElement.style.display = showDisc ? '' : 'none';

    const hTax = document.getElementById('headerTax');
    if (hTax) hTax.parentElement.style.display = showTax ? '' : 'none';

    const rowDisc = document.getElementById('rowTotalDisc');
    if (rowDisc) rowDisc.style.display = showDisc ? 'flex' : 'none';

    const rowTax = document.getElementById('rowTotalTax');
    if (rowTax) rowTax.style.display = showTax ? 'flex' : 'none';
}

function calculateAll() {
    let subtotal = 0;
    let totalDisc = 0;
    let totalTax = 0;

    items.forEach(item => {
        const qty = item.qty || 0;
        const price = item.price || 0;
        const discPct = item.disc || 0;
        const taxPct = item.tax || 0;

        const base = qty * price;
        const discAmt = base * (discPct / 100);
        const afterDisc = base - discAmt;
        const taxAmt = afterDisc * (taxPct / 100);

        subtotal += base;
        totalDisc += discAmt;
        totalTax += taxAmt;
    });

    const grandTotal = subtotal - totalDisc + totalTax;

    document.getElementById('subtotalDisplay').innerText = formatIDR(subtotal);
    document.getElementById('totalDiscDisplay').innerText = `(${formatIDR(totalDisc)})`;
    document.getElementById('totalTaxDisplay').innerText = formatIDR(totalTax);
    document.getElementById('grandTotalDisplay').innerText = formatIDR(grandTotal);
}

function handleLogoUpload(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            // Pastikan result ada
            if (!e.target || !e.target.result) return;

            // 1. Update Preview (aman karena browser handle src otomatis)
            const result = e.target.result;
            document.getElementById('logoPreview').src = result;
            document.getElementById('logoPreview').style.display = 'block';
            document.getElementById('logoText').style.display = 'none';

            try {
                // 2. SOLUSI: Bungkus result pakai String() atau backtick
                // localStorage.setItem('inv_logo', result);  <-- INI YG ERROR

                localStorage.setItem('inv_logo', String(result));
                // ATAU
                // localStorage.setItem('inv_logo', `${result}`);
            } catch (err) {
                console.error('Gagal menyimpan logo:', err);
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function updatePrintVisibility() {
    const fields = ['companyPhone', 'companyEmail', 'clientContact'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const wrapper = el.parentElement;
        if (el.value.trim() === '') {
            wrapper.classList.add('d-print-none');
        } else {
            wrapper.classList.remove('d-print-none');
        }
    });
}

function checkNotes() {
    const el = document.getElementById('notes');
    if (el && el.value.trim() === '') {
        el.value = '-';
        saveData();
    }
}

function saveData() {
    const labels = {
        from: document.getElementById('labelFrom').value,
        to: document.getElementById('labelTo').value,
        title: document.getElementById('labelInvoiceTitle').value,
        subtitle: document.getElementById('labelInvoiceSubtitle').value,
        invNo: document.getElementById('labelInvoiceNo').value,
        date: document.getElementById('labelDate').value,
        due: document.getElementById('labelDue').value,
        notes: document.getElementById('labelNotes').value,
        hItem: document.getElementById('headerItem').value,
        hDesc: document.getElementById('headerDesc').value,
        hQty: document.getElementById('headerQty').value,
        hPrice: document.getElementById('headerPrice').value,
        hDisc: document.getElementById('headerDisc').value,
        hTax: document.getElementById('headerTax').value,
        hTotal: document.getElementById('headerTotal').value,
        recipient: document.getElementById('labelRecipient').value,
        sender: document.getElementById('labelSender').value,
        lSub: document.getElementById('labelSubtotal').value,
        lDisc: document.getElementById('labelTotalDisc').value,
        lTax: document.getElementById('labelTotalTax').value,
        lGrand: document.getElementById('labelGrandTotal').value
    };

    const data = {
        companyName: document.getElementById('companyName').value,
        companyAddress: document.getElementById('companyAddress').value,
        companyPhone: document.getElementById('companyPhone').value,
        companyEmail: document.getElementById('companyEmail').value,
        clientName: document.getElementById('clientName').value,
        clientAddress: document.getElementById('clientAddress').value,
        clientContact: document.getElementById('clientContact').value,
        invoiceNo: document.getElementById('invoiceNo').value,
        invoiceDate: document.getElementById('invoiceDate').value,
        dueDate: document.getElementById('dueDate').value,
        items: items,
        notes: document.getElementById('notes').value,
        signerName: document.getElementById('signerName').value,
        labels: labels,
        settings: {
            showDisc: document.getElementById('showDisc').checked,
            showTax: document.getElementById('showTax').checked
        }
    };
    localStorage.setItem('kledo_data', JSON.stringify(data));
}

function loadData() {
    const logo = localStorage.getItem('kledo_logo');
    if (logo) {
        const img = document.getElementById('logoPreview');
        if (img) {
            img.src = logo;
            img.style.display = 'block';
            document.getElementById('logoText').style.display = 'none';
        }
    }

    const saved = localStorage.getItem('kledo_data');
    if (saved) {
        const data = JSON.parse(saved);

        // Helper biar gak error kalau element belum ada (defensive programming)
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        };

        setVal('companyName', data.companyName || '');
        setVal('companyAddress', data.companyAddress || '');
        setVal('companyPhone', data.companyPhone || '');
        setVal('companyEmail', data.companyEmail || '');

        setVal('clientName', data.clientName || '');
        setVal('clientAddress', data.clientAddress || '');
        setVal('clientContact', data.clientContact || '');

        setVal('invoiceNo', data.invoiceNo || 'INV/2026/001');
        if (data.invoiceDate) setVal('invoiceDate', data.invoiceDate);
        if (data.dueDate) setVal('dueDate', data.dueDate);

        if (data.items) items = data.items;
        setVal('notes', data.notes || '');
        setVal('signerName', data.signerName || 'Admin Keuangan');

        // Load Custom Labels
        if (data.labels) {
            setVal('labelFrom', data.labels.from || 'Dari (Perusahaan)');
            setVal('labelTo', data.labels.to || 'Tagihan Untuk (Klien)');
            setVal('labelInvoiceTitle', data.labels.title || 'INVOICE');
            setVal('labelInvoiceSubtitle', data.labels.subtitle || 'Original Document');
            setVal('labelInvoiceNo', data.labels.invNo || 'Nomor Referensi');
            setVal('labelDate', data.labels.date || 'Tanggal Terbit');
            setVal('labelDue', data.labels.due || 'Jatuh Tempo');
            setVal('labelNotes', data.labels.notes || 'Catatan / Metode Pembayaran');

            setVal('headerItem', data.labels.hItem || 'Item');
            setVal('headerDesc', data.labels.hDesc || 'Deskripsi');
            setVal('headerQty', data.labels.hQty || 'Qty');
            setVal('headerPrice', data.labels.hPrice || 'Harga');
            setVal('headerDisc', data.labels.hDisc || 'Disc %');
            setVal('headerTax', data.labels.hTax || 'Pajak %');
            setVal('headerTotal', data.labels.hTotal || 'Total');

            setVal('labelRecipient', data.labels.recipient || 'Penerima');
            setVal('labelSender', data.labels.sender || 'Hormat Kami');
            setVal('labelSubtotal', data.labels.lSub || 'Subtotal');
            setVal('labelTotalDisc', data.labels.lDisc || 'Total Diskon');
            setVal('labelTotalTax', data.labels.lTax || 'Total Pajak');
            setVal('labelGrandTotal', data.labels.lGrand || 'Total Tagihan');
        }

        if (data.settings) {
            const dCheck = document.getElementById('showDisc');
            const tCheck = document.getElementById('showTax');
            if (dCheck) dCheck.checked = data.settings.showDisc;
            if (tCheck) tCheck.checked = data.settings.showTax;
        }
    }
}

function clearData() {
    if (confirm('Reset semua data? Data akan hilang.')) {
        localStorage.removeItem('kledo_data');
        localStorage.removeItem('kledo_logo');
        location.reload();
    }
}

// ==========================================
// 4. EXPORT KE WINDOW
// (WAJIB, Supaya onclick="" di HTML bisa baca fungsi ini)
// ==========================================
window.addItem = addItem;
window.removeItem = removeItem;
window.updateItem = updateItem;
window.saveData = saveData;
window.checkNotes = checkNotes;
window.handleLogoUpload = handleLogoUpload;
window.toggleColumns = toggleColumns;
window.clearData = clearData;
window.updatePrintVisibility = updatePrintVisibility;

// --- FUNCTION PDF BARU ---
window.handleDownloadPDF = async function () {
    // 1. Tombol Loading
    const btn = document.querySelector('.fab-dl');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Converting...';

    // 2. Ambil elemen asli
    const element = document.getElementById('invoiceArea');
    const invNo = document.getElementById('invoiceNo').value.replace(/[^a-zA-Z0-9]/g, '_') || 'Invoice';

    try {
        // --- TRIK ANTI KEPOTONG: CLONING ---
        // Kita duplikat elemen invoice
        const clone = element.cloneNode(true);

        // Kita pasang class khusus buat si clone ini
        clone.classList.add('pdf-clone-mode');

        // Tempel clone ke body (tapi taruh di lapisan paling bawah/tersembunyi)
        // Penting: Harus ditempel ke DOM supaya html2canvas bisa membacanya
        document.body.appendChild(clone);

        // 3. Render Clone ke Canvas (Bukan elemen asli)
        const canvas = await html2canvas(clone, {
            scale: 2, // Resolusi (2 = Tajam, 3 = Sangat Tajam)
            useCORS: true, // Izinkan gambar eksternal
            logging: false,
            // Paksa ukuran canvas sesuai A4 Landscape dalam pixel (biar presisi)
            windowWidth: 1123, // ~297mm
            windowHeight: 794  // ~210mm
        });

        // 4. Hapus Clone (Tugasnya sudah selesai)
        document.body.removeChild(clone);

        // 5. Masukkan ke PDF
        const imgData = canvas.toDataURL('image/jpeg', 0.98);

        // Buat dokumen PDF A4 Landscape (l = landscape, mm = millimeter)
        const pdf = new jsPDF('l', 'mm', 'a4');

        // Ukuran A4 Landscape: 297 x 210
        const pdfWidth = 297;
        const pdfHeight = 210;

        // Tempel gambar canvas ke PDF (Full satu halaman)
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

        // 6. Download
        pdf.save(`${invNo}.pdf`);

    } catch (error) {
        console.error('Gagal generate PDF:', error);
        alert('Terjadi kesalahan saat membuat PDF.');
    } finally {
        // Balikin tombol
        btn.innerHTML = originalText;
    }
};

// ==========================================
// 5. INITIALIZE
// ==========================================
// Jalankan setelah HTML di-inject dan DOM siap
const today = new Date().toISOString().split('T')[0];
const dateInput = document.getElementById('invoiceDate');

// Cek dulu, siapa tau usernya baru pertama kali buka
if (dateInput && !dateInput.value) {
    dateInput.value = today;
}

const dueInput = document.getElementById('dueDate');
if (dueInput && !dueInput.value) {
    const due = new Date();
    due.setDate(due.getDate() + 30);
    dueInput.value = due.toISOString().split('T')[0];
}

// Load data dari LocalStorage
loadData();
renderItems();
toggleColumns();
updatePrintVisibility();
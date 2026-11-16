'use strict';

/* =========================================
   PAWPAW — SCRIPT.JS
   Tema: Biru
========================================= */

const API_URL = 'api.php';

let books = [];
let genres = [];
let currentUser = null;
let selectedBook = null;
let lastApiError = '';


/* =========================================
   API
========================================= */

async function api(action, method = 'GET', data = null, params = {}) {
    try {
        const options = {
            method,
            credentials: 'same-origin',
            headers: {}
        };

        if (data && method !== 'GET') {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        }

        const query = new URLSearchParams({ action, ...params });
        const response = await fetch(`${API_URL}?${query}`, options);
        const result = await response.json();

        if (!response.ok || result.success === false) {
            throw new Error(result.message || 'Terjadi kesalahan.');
        }

        return result;
    } catch (error) {
        lastApiError = error.message || '';
        console.error(`API ${action}:`, error);
        showToast(error.message || 'Gagal menghubungkan ke server.', true);
        return null;
    }
}


/* =========================================
   UTILITAS
========================================= */

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showToast(message, isError = false) {
    let toast = document.getElementById('toast');

    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = isError
        ? 'toast toast-error'
        : 'toast toast-success';

    toast.style.opacity = '1';
    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
        toast.style.opacity = '0';
    }, 2800);
}

function getData(response) {
    if (!response) return [];

    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.loans)) return response.data.loans;
    if (Array.isArray(response.data?.books)) return response.data.books;
    if (Array.isArray(response.data?.genres)) return response.data.genres;

    return [];
}

function getBookId(book) {
    return book.id ?? book.book_id ?? '';
}

function getBookTitle(book) {
    return book.title ?? book.judul ?? 'Tanpa judul';
}

function getBookAuthor(book) {
    return book.author ?? book.pengarang ?? 'Penulis tidak diketahui';
}

function getBookImage(book) {
    return book.img ?? book.image ?? book.image_url ?? book.cover ?? '';
}

function getBookGenre(book) {
    return book.genre_name ?? book.genre ?? book.kategori ?? 'Umum';
}

function getBookDescription(book) {
    return book.description ?? book.deskripsi ?? 'Belum ada deskripsi untuk buku ini.';
}

function getBookAvailability(book) {
    const available = book.available_stock ?? book.stock ?? 0;
    return Math.max(0, Number(available));
}

function getBookMetadata(book) {
    return [
        ['Penerbit', book.publisher],
        ['Tahun Terbit', book.publication_year],
        ['Jumlah Halaman', book.page_count ? `${book.page_count} halaman` : ''],
        ['ISBN', book.isbn],
        ['Stok Tersedia', `${getBookAvailability(book)} buku`]
    ];
}

function renderBookMetadata(book) {
    return getBookMetadata(book)
        .filter(item =>
            item[1] !== null &&
            item[1] !== undefined &&
            item[1] !== ''
        )
        .map(item => `
            <div class="book-metadata-item">
                <span>${escapeHtml(item[0])}</span>
                <strong>${escapeHtml(item[1])}</strong>
            </div>
        `)
        .join('');
}

function getGenreId(genre) {
    return genre.id ?? genre.genre_id ?? '';
}

function getGenreName(genre) {
    return genre.name ?? genre.nama ?? genre.genre ?? '';
}

function isAdmin() {
    return currentUser?.role === 'admin';
}

function formatLoanDate(date) {
    if (!date) return '-';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return escapeHtml(date);
    }

    return parsedDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function isLoanActive(status) {
    const value = String(status ?? '').toLowerCase();

    return (
        value.includes('pinjam') ||
        value.includes('borrow')
    ) && !(
        value.includes('kembali') ||
        value.includes('return') ||
        value.includes('selesai')
    );
}


/* =========================================
   SESSION DAN HEADER
========================================= */

async function checkSession() {
    const response = await api('me');

    if (response?.success) {
        currentUser = response.data?.user ?? response.data ?? null;
    } else {
        currentUser = null;
    }

    updateHeader();
    updateAdminControls();

    return currentUser;
}

function updateHeader() {
    const navAuth = document.getElementById('nav-auth');

    if (navAuth) {
        // Header PAWPAW memakai teks Inggris, halaman lama tetap Indonesia
        const isPaw = !!navAuth.closest('.pp-header');

        if (currentUser) {
            navAuth.textContent = isPaw ? 'Sign out' : 'Keluar';
            navAuth.href = '#logout';

            navAuth.onclick = async function(event) {
                event.preventDefault();
                await logout();
            };
        } else {
            navAuth.textContent = isPaw ? 'Sign in' : 'Masuk';
            navAuth.href = 'login.html';
            navAuth.onclick = null;
        }
    }

    // Sembunyikan "Create account" setelah login
    const navRegister = document.getElementById('nav-register');
    if (navRegister) navRegister.style.display = currentUser ? 'none' : '';

    document.querySelectorAll('.profile-shortcut').forEach(item => {
        const avatar = item.querySelector('.avatar');

        if (avatar && currentUser) {
            avatar.textContent = (currentUser.name || 'U')
                .charAt(0).toUpperCase();
        }
    });
}

function updateAdminControls() {
    const controls = document.getElementById('admin-controls');

    if (controls) {
        controls.style.display = isAdmin() ? '' : 'none';
    }

    const dashboard = document.querySelector('.admin-dashboard');

    if (dashboard) {
        dashboard.style.display = isAdmin() ? 'block' : 'none';
    }
}

async function logout() {
    const response = await api('logout', 'POST', {});

    if (response?.success) {
        currentUser = null;
        showToast('Berhasil keluar dari akun.');

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 700);
    }
}


/* =========================================
   LOGIN
========================================= */

function setFormMessage(el, text, success = false) {
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('is-success', success);
}

function normalizePhoneInput(value) {
    let phone = String(value || '').replace(/[\s\-.()]/g, '');

    if (phone.startsWith('+62')) phone = '0' + phone.slice(3);
    else if (phone.startsWith('62')) phone = '0' + phone.slice(2);

    return phone;
}

function isValidPhoneInput(phone) {
    return /^08\d{8,12}$/.test(phone);
}

function initLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async event => {
        event.preventDefault();

        // Kolom ini menerima email ATAU nomor telepon
        const identifier = document.getElementById('login-email')?.value.trim();
        const password = document.getElementById('login-password')?.value;
        const message = document.getElementById('login-message');
        const button = document.getElementById('login-submit');

        if (!identifier || !password) {
            setFormMessage(message, 'Email/nomor telepon dan password wajib diisi.');
            return;
        }

        if (!identifier.includes('@') && !isValidPhoneInput(normalizePhoneInput(identifier))) {
            setFormMessage(message, 'Masukkan email atau nomor telepon yang valid (08xxxxxxxxxx).');
            return;
        }

        if (button) button.disabled = true;

        const response = await api('login', 'POST', { email: identifier, password });

        if (response?.success) {
            setFormMessage(message, 'Login berhasil. Mengalihkan...', true);

            showToast('Selamat datang di PAWPAW!');

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 700);
        } else {
            setFormMessage(message, response?.message || lastApiError || 'Email/nomor telepon atau password salah.');
            if (button) button.disabled = false;
        }
    });
}


/* =========================================
   REGISTER
========================================= */

function initRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) return;

    form.addEventListener('submit', async event => {
        event.preventDefault();

        const value = id => document.getElementById(id)?.value.trim() ?? '';

        const name = value('register-name');
        const email = value('register-email');
        const phone = normalizePhoneInput(value('register-phone'));
        const birth_date = value('register-birth');
        const gender = value('register-gender');
        const address = value('register-address');
        const password = document.getElementById('register-password')?.value ?? '';
        const confirm = document.getElementById('register-confirm')?.value ?? '';
        const message = document.getElementById('register-message');
        const button = document.getElementById('register-submit');

        if (!name || !email || !phone || !password) {
            setFormMessage(message, 'Nama, email, nomor telepon, dan password wajib diisi.');
            return;
        }

        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            setFormMessage(message, 'Format email tidak valid.');
            return;
        }

        if (!isValidPhoneInput(phone)) {
            setFormMessage(message, 'Nomor telepon tidak valid. Gunakan format 08xxxxxxxxxx.');
            return;
        }

        if (password.length < 6) {
            setFormMessage(message, 'Password minimal 6 karakter.');
            return;
        }

        if (password !== confirm) {
            setFormMessage(message, 'Konfirmasi password tidak sama.');
            return;
        }

        if (button) button.disabled = true;

        const response = await api('register', 'POST', {
            name,
            email,
            phone,
            birth_date,
            gender,
            address,
            password
        });

        if (response?.success) {
            setFormMessage(message, 'Pendaftaran berhasil. Mengalihkan ke halaman login...', true);

            showToast('Akun berhasil dibuat.');

            setTimeout(() => {
                window.location.href = 'login.html';
            }, 900);
        } else {
            setFormMessage(message, response?.message || lastApiError || 'Pendaftaran gagal.');
            if (button) button.disabled = false;
        }
    });
}


/* =========================================
   DATA BUKU
========================================= */

async function loadBooks() {
    const response = await api('get_books');

    if (response?.success) {
        books = getData(response);
    } else {
        books = [];
    }

    renderBooks();

    // Halaman pencarian: terapkan kata kunci/filter yang sudah terisi
    if (document.getElementById('search')) {
        cariBuku();
    } else {
        renderResults();
    }

    return books;
}

function bookCard(book) {
    const id = getBookId(book);
    const title = getBookTitle(book);
    const author = getBookAuthor(book);
    const image = getBookImage(book);
    const genre = getBookGenre(book);
    const available = getBookAvailability(book);

    const cover = image
        ? escapeHtml(image)
        : 'https://placehold.co/300x400/e6ebff/3a54d0?text=PAWPAW';

    return `
        <article class="buku card book-card">
            <div class="book-cover">
                <img
                    src="${cover}"
                    alt="${escapeHtml(title)}"
                    loading="lazy"
                    onerror="this.onerror=null;this.src='https://placehold.co/300x400/e6ebff/3a54d0?text=PAWPAW'"
                >
                <span class="status-badge ${available > 0 ? 'is-available' : 'is-out'}">
                    ${available > 0 ? 'Tersedia' : 'Habis'}
                </span>
            </div>

            <div class="book-info">
                <span class="book-genre">${escapeHtml(genre)}</span>
                <h3>${escapeHtml(title)}</h3>
                <p>${escapeHtml(author)}</p>

                <p class="book-card-stock">
                    ${available > 0
                        ? `Stok tersedia: ${available} buku`
                        : 'Stok sedang habis'}
                </p>

                <div class="book-actions">
                    <button type="button" class="btn-secondary"
                        data-detail-id="${escapeHtml(id)}">
                        Detail Buku
                    </button>

                    ${!isAdmin() ? `
                        <button type="button" class="btn-primary"
                            data-loan-id="${escapeHtml(id)}"
                            ${available <= 0 ? 'disabled' : ''}>
                            ${available > 0 ? 'Pinjam Buku' : 'Stok Habis'}
                        </button>
                    ` : ''}

                    ${isAdmin() ? `
                        <button type="button" class="btn-secondary"
                            data-edit-id="${escapeHtml(id)}">
                            Edit
                        </button>

                        <button type="button"
                            class="btn-secondary delete-book-button"
                            data-delete-id="${escapeHtml(id)}">
                            Hapus
                        </button>
                    ` : ''}
                </div>
            </div>
        </article>
    `;
}

/* ---------- Katalog: filter, urutan, "muat lebih banyak" ---------- */

const catalogState = { shown: 0 };

function getCatalogFilters() {
    return {
        keyword: (document.getElementById('cat-search')?.value || '')
            .trim().toLowerCase(),
        genre: document.getElementById('genre-filter')?.value || '',
        availability: document.getElementById('availability-filter')?.value || '',
        sort: document.getElementById('sort-select')?.value || 'newest'
    };
}

function filterCatalogBooks(filters) {
    const list = books.filter(book => {
        const title = getBookTitle(book).toLowerCase();
        const author = getBookAuthor(book).toLowerCase();
        const genre = getBookGenre(book).toLowerCase();
        const available = getBookAvailability(book);

        const matchesKeyword = !filters.keyword ||
            title.includes(filters.keyword) ||
            author.includes(filters.keyword) ||
            genre.includes(filters.keyword);

        const matchesGenre = !filters.genre ||
            genre === filters.genre.toLowerCase();

        const matchesAvailability =
            !filters.availability ||
            (filters.availability === 'available' && available > 0) ||
            (filters.availability === 'unavailable' && available <= 0);

        return matchesKeyword && matchesGenre && matchesAvailability;
    });

    const byText = (getter) => (a, b) =>
        getter(a).localeCompare(getter(b), 'id', { sensitivity: 'base' });

    switch (filters.sort) {
        case 'title':
            list.sort(byText(getBookTitle));
            break;
        case 'author':
            list.sort(byText(getBookAuthor));
            break;
        case 'stock':
            list.sort((a, b) => getBookAvailability(b) - getBookAvailability(a));
            break;
        default: // terbaru = id terbesar lebih dulu
            list.sort((a, b) =>
                Number(getBookId(b)) - Number(getBookId(a)));
    }

    return list;
}

function renderActiveFilters(filters) {
    const box = document.getElementById('active-filters');
    if (!box) return;

    const chips = [];
    if (filters.keyword) chips.push(['keyword', `Cari: ${filters.keyword}`]);
    if (filters.genre) chips.push(['genre', filters.genre]);
    if (filters.availability) {
        chips.push([
            'availability',
            filters.availability === 'available' ? 'Tersedia' : 'Stok habis'
        ]);
    }

    box.innerHTML = chips.map(([key, label]) => `
        <button type="button" class="filter-chip"
            data-clear-filter="${key}">
            ${escapeHtml(label)} ✕
        </button>
    `).join('');
}

function updateCatalogInfo(shown, total) {
    const shownEl = document.getElementById('shown-books');
    const totalEl = document.getElementById('total-books');
    const more = document.getElementById('load-more');

    if (shownEl) shownEl.textContent = shown;
    if (totalEl) totalEl.textContent = total;
    if (more) more.hidden = shown >= total;
}

function renderBooks() {
    const container = document.getElementById('book-list');
    if (!container) return;

    const isCatalog = !!document.getElementById('catalog-toolbar');

    if (!books.length) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Belum ada buku</h3>
                <p>Koleksi buku akan ditampilkan di sini.</p>
            </div>
        `;
        if (isCatalog) updateCatalogInfo(0, 0);
        return;
    }

    // Halaman katalog: pakai filter + pagination
    if (isCatalog) {
        const filters = getCatalogFilters();
        const list = filterCatalogBooks(filters);
        const pageSize = Number(container.dataset.pageSize) || 12;

        if (!catalogState.shown) catalogState.shown = pageSize;

        const visible = list.slice(0, catalogState.shown);

        renderActiveFilters(filters);
        updateCatalogInfo(visible.length, list.length);

        container.innerHTML = visible.length
            ? visible.map(bookCard).join('')
            : `
                <div class="empty-state">
                    <h3>Buku tidak ditemukan</h3>
                    <p>Coba ubah kata kunci atau filter yang dipakai.</p>
                </div>
            `;
        return;
    }

    // Halaman lain (mis. beranda): boleh dibatasi lewat data-limit
    const limit = Number(container.dataset.limit) || 0;
    const list = limit ? books.slice(0, limit) : books;

    container.innerHTML = list.map(bookCard).join('');
}

function initCatalog() {
    if (!document.getElementById('catalog-toolbar')) return;

    const search = document.getElementById('cat-search');
    const genre = document.getElementById('genre-filter');
    const availability = document.getElementById('availability-filter');
    const sort = document.getElementById('sort-select');
    const list = document.getElementById('book-list');

    const refresh = () => {
        catalogState.shown = 0;
        renderBooks();
    };

    search?.addEventListener('input', refresh);
    document.getElementById('cat-search-btn')?.addEventListener('click', refresh);
    [genre, availability, sort].forEach(el =>
        el?.addEventListener('change', refresh));

    document.getElementById('filter-reset')?.addEventListener('click', () => {
        if (search) search.value = '';
        if (genre) genre.value = '';
        if (availability) availability.value = '';
        if (sort) sort.value = 'newest';
        refresh();
    });

    document.getElementById('load-more')?.addEventListener('click', () => {
        const pageSize = Number(list?.dataset.pageSize) || 12;
        catalogState.shown += pageSize;
        renderBooks();
    });

    document.getElementById('active-filters')?.addEventListener('click', event => {
        const chip = event.target.closest('[data-clear-filter]');
        if (!chip) return;

        const key = chip.dataset.clearFilter;
        if (key === 'keyword' && search) search.value = '';
        if (key === 'genre' && genre) genre.value = '';
        if (key === 'availability' && availability) availability.value = '';
        refresh();
    });

    // Dukungan ?q=kata&genre=Nama dari link / pencarian beranda
    const params = new URLSearchParams(window.location.search);
    if (params.get('q') && search) search.value = params.get('q');
    if (params.get('genre') && genre) genre.value = params.get('genre');
}


/* ---------- Statistik beranda ---------- */

function animateCount(element, target) {
    if (!element) return;

    if (!Number.isFinite(target)) {
        element.textContent = '–';
        return;
    }

    const start = performance.now();
    const duration = 1100;

    const tick = now => {
        const progress = Math.min((now - start) / duration, 1);
        element.textContent = Math.floor(target * progress);
        if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
}

async function loadStats() {
    if (!document.getElementById('stat-books')) return;

    // Opsional: endpoint api.php?action=get_stats (lihat catatan).
    // Dipanggil langsung agar tidak memunculkan toast error bila belum ada.
    let stats = null;

    try {
        const response = await fetch(`${API_URL}?action=get_stats`, {
            credentials: 'same-origin'
        });
        const result = await response.json();

        if (response.ok && result.success !== false) {
            stats = result.data ?? result;
        }
    } catch (error) {
        stats = null;
    }

    const totalBooks = Number(stats?.books ?? stats?.total_books ?? books.length);

    const borrowedFromBooks = books.reduce((sum, book) => {
        const stock = Number(book.stock ?? 0);
        const available = Number(book.available_stock ?? book.stock ?? 0);
        return sum + Math.max(0, stock - available);
    }, 0);

    const borrowed = Number(stats?.borrowed ?? stats?.active_loans ?? borrowedFromBooks);
    const registered = Number(stats?.users ?? stats?.registered ?? stats?.total_users);

    animateCount(document.getElementById('stat-books'), totalBooks);
    animateCount(document.getElementById('stat-registered'), registered);
    animateCount(document.getElementById('stat-borrowed'), borrowed);
}


/* ---------- Header PAWPAW: menu mobile + dropdown Books ---------- */

function initPawHeader() {
    const header = document.querySelector('.pp-header');

    // Halaman dengan skrip header sendiri (ppHeaderReady) tidak perlu dipasang ulang
    if (!header || window.ppHeaderReady) return;
    window.ppHeaderReady = true;

    const toggle = header.querySelector('.pp-toggle');
    const dropBtn = header.querySelector('.pp-drop-btn');
    const dropLi = header.querySelector('.pp-dropdown');

    toggle?.addEventListener('click', event => {
        event.stopPropagation();
        const open = header.classList.toggle('nav-open');
        toggle.setAttribute('aria-expanded', String(open));
    });

    dropBtn?.addEventListener('click', event => {
        event.stopPropagation();
        const open = dropLi.classList.toggle('open');
        dropBtn.setAttribute('aria-expanded', String(open));
    });

    document.addEventListener('click', event => {
        if (dropLi && !dropLi.contains(event.target)) {
            dropLi.classList.remove('open');
            dropBtn?.setAttribute('aria-expanded', 'false');
        }

        if (!header.contains(event.target)) {
            header.classList.remove('nav-open');
            toggle?.setAttribute('aria-expanded', 'false');
        }
    });
}

async function borrowBook(bookId) {
    if (!currentUser) {
        showToast('Silakan login terlebih dahulu.', true);

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 700);

        return;
    }

    if (isAdmin()) {
        showToast('Admin tidak dapat meminjam buku.', true);
        return;
    }

    const book = books.find(item =>
        String(getBookId(item)) === String(bookId)
    );

    if (book && getBookAvailability(book) <= 0) {
        showToast('Maaf, stok buku sedang habis.', true);
        return;
    }

    const response = await api('borrow', 'POST', {
        book_id: bookId
    });

    if (response?.success) {
        showToast('Buku berhasil dipinjam.');

        closeBookModal();
        await loadBooks();
        await renderUserLoanHistory();
    }
}

async function deleteBook(bookId) {
    if (!isAdmin()) {
        showToast('Hanya admin yang dapat menghapus buku.', true);
        return;
    }

    if (!confirm('Yakin ingin menghapus buku ini?')) return;

    const response = await api('delete_book', 'POST', {
        id: bookId
    });

    if (response?.success) {
        showToast('Buku berhasil dihapus.');
        await loadBooks();
    }
}


/* =========================================
   DETAIL BUKU
========================================= */

function ensureBookModal() {
    if (document.getElementById('book-detail-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'book-detail-modal';
    modal.className = 'mb-modal';
    modal.hidden = true;

    modal.innerHTML = `
        <div class="mb-modal-overlay" data-close-modal></div>

        <div class="mb-modal-content" role="dialog" aria-modal="true">
            <button type="button" class="mb-modal-close"
                data-close-modal aria-label="Tutup">&times;</button>
            <div id="book-detail-content"></div>
        </div>
    `;

    document.body.appendChild(modal);
}

function closeBookModal() {
    const modal = document.getElementById('book-detail-modal');

    if (modal) {
        modal.hidden = true;
        document.body.classList.remove('modal-open');
    }
}

async function showBookDetail(bookId) {
    ensureBookModal();

    const modal = document.getElementById('book-detail-modal');
    const content = document.getElementById('book-detail-content');

    modal.hidden = false;
    document.body.classList.add('modal-open');

    content.innerHTML = `
        <div class="empty-state">
            <p>Memuat detail buku...</p>
        </div>
    `;

    const response = await api('get_book_detail', 'GET', null, {
        id: bookId
    });

    if (!response?.success || !response.data) {
        content.innerHTML = `
            <div class="empty-state">
                <h3>Detail buku tidak ditemukan</h3>
                <p>Silakan coba lagi.</p>
            </div>
        `;
        return;
    }

    const book = response.data;
    selectedBook = book;

    const image = getBookImage(book) ||
        'https://placehold.co/300x400/e6ebff/3a54d0?text=PAWPAW';

    const stock = Number(book.stock ?? 0);
    const available = getBookAvailability(book);
    const borrowed = Number(book.borrowed_count ?? 0);
    const isAvailable = available > 0;

    content.innerHTML = `
        <div class="book-detail-layout">

            <div class="book-detail-cover">
                <img
                    src="${escapeHtml(image)}"
                    alt="${escapeHtml(getBookTitle(book))}"
                    onerror="this.onerror=null;this.src='https://placehold.co/300x400/e6ebff/3a54d0?text=PAWPAW'"
                >
            </div>

            <div class="book-detail-info">

                <span class="book-genre">
                    ${escapeHtml(getBookGenre(book))}
                </span>

                <h2>${escapeHtml(getBookTitle(book))}</h2>

                <p class="book-detail-author">
                    Penulis: ${escapeHtml(getBookAuthor(book))}
                </p>

                <div class="book-detail-description">
                    <h3>Sinopsis Buku</h3>
                    <p>${escapeHtml(getBookDescription(book))}</p>
                </div>

                <div class="book-detail-metadata">
                    <h3>Informasi Buku</h3>

                    ${renderBookMetadata(book)}

                    <div class="book-metadata-item">
                        <span>Total Stok</span>
                        <strong>${stock} buku</strong>
                    </div>

                    <div class="book-metadata-item">
                        <span>Sedang Dipinjam</span>
                        <strong>${borrowed} buku</strong>
                    </div>

                    <div class="book-metadata-item">
                        <span>Stok Tersedia</span>
                        <strong>${available} buku</strong>
                    </div>
                </div>

                <div class="book-availability">
                    <span>Status Ketersediaan</span>

                    <strong class="${isAvailable ? 'available' : 'unavailable'}">
                        ${isAvailable
                            ? `Tersedia (${available} buku)`
                            : 'Stok sedang habis'}
                    </strong>
                </div>

                <div class="book-detail-actions">

                    ${!isAdmin() ? `
                        <button
                            type="button"
                            class="btn-primary"
                            data-loan-id="${escapeHtml(getBookId(book))}"
                            ${!isAvailable ? 'disabled' : ''}
                        >
                            ${isAvailable ? 'Pinjam Buku' : 'Stok Habis'}
                        </button>
                    ` : ''}

                    ${isAdmin() ? `
                        <button
                            type="button"
                            class="btn-secondary"
                            data-edit-id="${escapeHtml(getBookId(book))}"
                        >
                            Edit Buku
                        </button>
                    ` : ''}

                    <button type="button" class="btn-secondary"
                        data-close-modal>
                        Tutup
                    </button>

                </div>
            </div>
        </div>
    `;
}


/* =========================================
   FORM TAMBAH BUKU
========================================= */

function ensureAddBookMetadataFields(form) {
    if (!form || document.getElementById('new-publisher')) return;

    const fields = document.createElement('div');
    fields.className = 'book-extra-fields';

    fields.innerHTML = `
        <label for="new-publisher">Penerbit</label>
        <input type="text" id="new-publisher"
            placeholder="Masukkan nama penerbit">

        <label for="new-publication-year">Tahun Terbit</label>
        <input type="number" id="new-publication-year"
            min="1000" max="2100" placeholder="Contoh: 2024">

        <label for="new-page-count">Jumlah Halaman</label>
        <input type="number" id="new-page-count"
            min="1" placeholder="Contoh: 250">

        <label for="new-isbn">ISBN</label>
        <input type="text" id="new-isbn"
            placeholder="Masukkan nomor ISBN">

        <label for="new-stock">Jumlah Stok</label>
        <input type="number" id="new-stock"
            min="1" value="1" required>
    `;

    const submitButton = form.querySelector(
        'button[type="submit"], input[type="submit"]'
    );

    if (submitButton) {
        form.insertBefore(fields, submitButton);
    } else {
        form.appendChild(fields);
    }
}


/* =========================================
   EDIT BUKU ADMIN
========================================= */

function ensureEditModal() {
    if (document.getElementById('book-edit-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'book-edit-modal';
    modal.className = 'mb-modal';
    modal.hidden = true;

    modal.innerHTML = `
        <div class="mb-modal-overlay" data-close-edit></div>

        <div class="mb-modal-content mb-edit-content"
            role="dialog" aria-modal="true">

            <button type="button" class="mb-modal-close"
                data-close-edit aria-label="Tutup">&times;</button>

            <h2>Edit Informasi Buku</h2>

            <form id="edit-book-form">
                <input type="hidden" id="edit-book-id">

                <label for="edit-title">Judul Buku</label>
                <input id="edit-title" type="text" required>

                <label for="edit-author">Penulis</label>
                <input id="edit-author" type="text" required>

                <label for="edit-genre">Kategori</label>
                <select id="edit-genre" required></select>

                <label for="edit-img">URL Sampul Buku</label>
                <input id="edit-img" type="url" placeholder="https://...">

                <label for="edit-description">Deskripsi Buku</label>
                <textarea id="edit-description" rows="5"></textarea>

                <label for="edit-publisher">Penerbit</label>
                <input id="edit-publisher" type="text">

                <label for="edit-publication-year">Tahun Terbit</label>
                <input id="edit-publication-year" type="number"
                    min="1000" max="2100">

                <label for="edit-page-count">Jumlah Halaman</label>
                <input id="edit-page-count" type="number" min="1">

                <label for="edit-isbn">ISBN</label>
                <input id="edit-isbn" type="text">

                <label for="edit-stock">Jumlah Stok</label>
                <input id="edit-stock" type="number" min="1" required>

                <div class="book-detail-actions">
                    <button type="submit" class="btn-primary">
                        Simpan Perubahan
                    </button>

                    <button type="button" class="btn-secondary"
                        data-close-edit>
                        Batal
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll('[data-close-edit]').forEach(button => {
        button.addEventListener('click', closeEditModal);
    });

    document.getElementById('edit-book-form')
        .addEventListener('submit', saveBookEdit);
}

function closeEditModal() {
    const modal = document.getElementById('book-edit-modal');

    if (modal) {
        modal.hidden = true;
        document.body.classList.remove('modal-open');
    }
}

function openEditBook(bookId) {
    if (!isAdmin()) {
        showToast('Hanya admin yang dapat mengedit buku.', true);
        return;
    }

    const book = books.find(item =>
        String(getBookId(item)) === String(bookId)
    );

    if (!book) {
        showToast('Data buku tidak ditemukan.', true);
        return;
    }

    ensureEditModal();

    document.getElementById('edit-book-id').value = getBookId(book);
    document.getElementById('edit-title').value = getBookTitle(book);
    document.getElementById('edit-author').value = getBookAuthor(book);
    document.getElementById('edit-img').value = getBookImage(book);
    document.getElementById('edit-description').value =
        book.description ?? book.deskripsi ?? '';

    document.getElementById('edit-publisher').value =
        book.publisher ?? '';

    document.getElementById('edit-publication-year').value =
        book.publication_year ?? '';

    document.getElementById('edit-page-count').value =
        book.page_count ?? '';

    document.getElementById('edit-isbn').value =
        book.isbn ?? '';

    document.getElementById('edit-stock').value =
        book.stock ?? 1;

    const genreSelect = document.getElementById('edit-genre');
    genreSelect.innerHTML = '';

    genres.forEach(genre => {
        const option = document.createElement('option');
        option.value = getGenreName(genre);
        option.textContent = getGenreName(genre);
        genreSelect.appendChild(option);
    });

    genreSelect.value = getBookGenre(book);

    const modal = document.getElementById('book-edit-modal');
    modal.hidden = false;
    document.body.classList.add('modal-open');
}

async function saveBookEdit(event) {
    event.preventDefault();

    if (!isAdmin()) {
        showToast('Akses admin diperlukan.', true);
        return;
    }

    const id = document.getElementById('edit-book-id').value;
    const title = document.getElementById('edit-title').value.trim();
    const author = document.getElementById('edit-author').value.trim();
    const genre = document.getElementById('edit-genre').value;
    const img = document.getElementById('edit-img').value.trim();
    const description = document.getElementById('edit-description').value.trim();

    const publisher = document.getElementById('edit-publisher').value.trim();
    const publication_year = document.getElementById('edit-publication-year').value;
    const page_count = document.getElementById('edit-page-count').value;
    const isbn = document.getElementById('edit-isbn').value.trim();
    const stock = document.getElementById('edit-stock').value;

    if (!title || !author || !genre || stock === '') {
        showToast('Judul, penulis, kategori, dan stok wajib diisi.', true);
        return;
    }

    if (!Number.isInteger(Number(stock)) || Number(stock) < 1) {
        showToast('Stok minimal 1 buku.', true);
        return;
    }

    const response = await api('update_book', 'POST', {
        id,
        title,
        author,
        genre,
        img,
        description,
        publisher,
        publication_year,
        page_count,
        isbn,
        stock
    });

    if (response?.success) {
        showToast('Informasi buku berhasil diperbarui.');
        closeEditModal();
        await loadBooks();

        if (selectedBook &&
            String(getBookId(selectedBook)) === String(id)) {
            closeBookModal();
        }
    }
}


/* =========================================
   EVENT KARTU BUKU
========================================= */

document.addEventListener('click', async event => {
    const detailButton = event.target.closest('[data-detail-id]');
    const editButton = event.target.closest('[data-edit-id]');
    const borrowButton = event.target.closest('[data-loan-id]');
    const deleteButton = event.target.closest('[data-delete-id]');
    const returnButton = event.target.closest('[data-return-id]');
    const closeDetail = event.target.closest('[data-close-modal]');

    if (closeDetail) {
        closeBookModal();
        return;
    }

    if (detailButton) {
        await showBookDetail(detailButton.dataset.detailId);
        return;
    }

    if (editButton) {
        openEditBook(editButton.dataset.editId);
        return;
    }

    if (borrowButton) {
        await borrowBook(borrowButton.dataset.loanId);
        return;
    }

    if (deleteButton) {
        await deleteBook(deleteButton.dataset.deleteId);
        return;
    }

    if (returnButton) {
        await returnLoan(returnButton.dataset.returnId);
    }
});

document.addEventListener('click', event => {
    if (event.target.closest('[data-close-edit]')) {
        closeEditModal();
    }
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        closeBookModal();
        closeEditModal();
    }
});


/* =========================================
   GENRE / KATEGORI
========================================= */

async function loadGenres() {
    const response = await api('get_genres');

    genres = response?.success ? getData(response) : [];

    populateGenreSelects();
    renderGenresAdmin();

    return genres;
}

function populateGenreSelects() {
    const selects = [
        document.getElementById('new-genre'),
        document.getElementById('genre-filter')
    ];

    selects.forEach(select => {
        if (!select) return;

        const previousValue = select.value;

        select.innerHTML = select.id === 'genre-filter'
            ? '<option value="">Semua Kategori</option>'
            : '<option value="">Pilih Kategori</option>';

        genres.forEach(genre => {
            const option = document.createElement('option');

            option.value = getGenreName(genre);
            option.textContent = getGenreName(genre);

            select.appendChild(option);
        });

        if (previousValue) select.value = previousValue;
    });
}

function renderGenresAdmin() {
    const container = document.getElementById('genre-list');
    if (!container) return;

    if (!isAdmin()) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = genres.map(genre => `
        <div class="genre-item">
            <span>${escapeHtml(getGenreName(genre))}</span>

            <button type="button"
                class="btn-secondary delete-genre-button"
                data-genre-id="${escapeHtml(getGenreId(genre))}">
                Hapus
            </button>
        </div>
    `).join('');

    container.querySelectorAll('[data-genre-id]').forEach(button => {
        button.addEventListener('click', async () => {
            if (!confirm('Hapus kategori ini?')) return;

            const response = await api('delete_genre', 'POST', {
                id: button.dataset.genreId
            });

            if (response?.success) {
                showToast('Kategori berhasil dihapus.');
                await loadGenres();
            }
        });
    });
}


/* =========================================
   FORM ADMIN
========================================= */

function initAdminControls() {
    const addBookButton = document.getElementById('show-add-book');
    const addBookForm = document.getElementById('add-book-form');
    const genreButton = document.getElementById('show-genre-manager');
    const genreManager = document.getElementById('genre-manager');

    if (addBookForm) {
        ensureAddBookMetadataFields(addBookForm);
    }

    if (addBookButton && addBookForm) {
        addBookButton.addEventListener('click', () => {
            addBookForm.classList.toggle('active');
            addBookForm.hidden = !addBookForm.classList.contains('active');
        });
    }

    if (genreButton && genreManager) {
        genreButton.addEventListener('click', () => {
            genreManager.classList.toggle('active');
            genreManager.hidden = !genreManager.classList.contains('active');
        });
    }

    if (addBookForm) {
        addBookForm.addEventListener('submit', async event => {
            event.preventDefault();

            if (!isAdmin()) {
                showToast('Akses admin diperlukan.', true);
                return;
            }

            const title = document.getElementById('new-title')?.value.trim();
            const author = document.getElementById('new-author')?.value.trim();
            const img = document.getElementById('new-img')?.value.trim();
            const genre = document.getElementById('new-genre')?.value;
            const description =
                document.getElementById('new-description')?.value.trim() || '';

            const publisher =
                document.getElementById('new-publisher')?.value.trim() || '';

            const publication_year =
                document.getElementById('new-publication-year')?.value || '';

            const page_count =
                document.getElementById('new-page-count')?.value || '';

            const isbn =
                document.getElementById('new-isbn')?.value.trim() || '';

            const stock =
                document.getElementById('new-stock')?.value || '1';

            if (!title || !author || !genre) {
                showToast('Lengkapi judul, penulis, dan kategori.', true);
                return;
            }

            if (!Number.isInteger(Number(stock)) || Number(stock) < 1) {
                showToast('Stok minimal 1 buku.', true);
                return;
            }

            const response = await api('add_book', 'POST', {
                title,
                author,
                img,
                genre,
                description,
                publisher,
                publication_year,
                page_count,
                isbn,
                stock
            });

            if (response?.success) {
                showToast('Buku berhasil ditambahkan.');
                addBookForm.reset();

                const stockInput = document.getElementById('new-stock');
                if (stockInput) stockInput.value = '1';

                await loadBooks();
            }
        });
    }

    const addGenreForm = document.getElementById('add-genre-form');

    if (addGenreForm) {
        addGenreForm.addEventListener('submit', async event => {
            event.preventDefault();

            if (!isAdmin()) {
                showToast('Akses admin diperlukan.', true);
                return;
            }

            const name = document.getElementById('genre-name')?.value.trim();

            if (!name) {
                showToast('Nama kategori wajib diisi.', true);
                return;
            }

            const response = await api('add_genre', 'POST', { name });

            if (response?.success) {
                showToast('Kategori berhasil ditambahkan.');
                addGenreForm.reset();
                await loadGenres();
            }
        });
    }
}


/* =========================================
   PENCARIAN BUKU
========================================= */

function renderResults(resultBooks = books) {
    const container = document.getElementById('hasil');
    if (!container) return;

    if (!resultBooks.length) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Buku tidak ditemukan</h3>
                <p>Coba gunakan kata kunci atau kategori lain.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="book-grid">
            ${resultBooks.map(bookCard).join('')}
        </div>
    `;
}

function cariBuku() {
    const keyword = document.getElementById('search')
        ?.value.trim().toLowerCase() || '';

    const selectedGenre =
        document.getElementById('genre-filter')?.value || '';

    const results = books.filter(book => {
        const title = getBookTitle(book).toLowerCase();
        const author = getBookAuthor(book).toLowerCase();
        const genre = getBookGenre(book).toLowerCase();

        const matchesKeyword =
            title.includes(keyword) ||
            author.includes(keyword) ||
            genre.includes(keyword);

        const matchesGenre =
            !selectedGenre ||
            genre === selectedGenre.toLowerCase();

        return matchesKeyword && matchesGenre;
    });

    renderResults(results);
}

function initSearch() {
    const search = document.getElementById('search');
    const filter = document.getElementById('genre-filter');
    const button = document.getElementById('search-btn');

    if (search) search.addEventListener('input', cariBuku);
    if (filter) filter.addEventListener('change', cariBuku);
    if (button) button.addEventListener('click', cariBuku);

    // Kata kunci dari kolom cari di beranda: pencarian.html?q=...
    const queryFromUrl = new URLSearchParams(window.location.search).get('q');
    if (search && queryFromUrl) search.value = queryFromUrl;

    document.querySelectorAll('[data-search]').forEach(item => {
        item.addEventListener('click', event => {
            event.preventDefault();

            if (search) {
                search.value = item.dataset.search;
                cariBuku();
            }
        });
    });
}


/* =========================================
   PROFIL PENGGUNA
========================================= */

async function renderProfile() {
    const details = document.getElementById('profile-details');
    if (!details) return;

    if (!currentUser) {
        details.innerHTML = `
            <div class="empty-state">
                <h3>Belum login</h3>
                <p>Silakan login untuk melihat profil.</p>
                <a href="login.html" class="btn-primary">Login</a>
            </div>
        `;
        return;
    }

    details.innerHTML = `
        <div class="profile-detail-item">
            <span>Nama</span>
            <strong>${escapeHtml(currentUser.name)}</strong>
        </div>

        <div class="profile-detail-item">
            <span>Email</span>
            <strong>${escapeHtml(currentUser.email)}</strong>
        </div>

        <div class="profile-detail-item">
            <span>Nomor telepon</span>
            <strong>${escapeHtml(currentUser.phone || '-')}</strong>
        </div>

        <div class="profile-detail-item">
            <span>Status akun</span>
            <strong>${isAdmin() ? 'Administrator' : 'Anggota'}</strong>
        </div>
    `;
}


/* =========================================
   PROFIL PAWPAW — INTEGRASI SESSION API
========================================= */

function formatProfileDate(value, withYearOnly) {
    if (!value) return '-';

    const date = new Date(String(value).replace(' ', 'T'));

    if (isNaN(date)) return String(value);

    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

async function renderProfilePage() {
    const nameEl = document.getElementById('profile-name');
    const emailEl = document.getElementById('profile-email');
    const avatarEl = document.getElementById('profile-avatar');
    const historyEl = document.getElementById('profile-loan-history');

    if (!nameEl) return;

    // Periksa apakah pengguna sudah login
    if (!currentUser) {
        nameEl.textContent = 'Belum Login';

        if (emailEl) emailEl.textContent = 'Silakan login terlebih dahulu.';
        if (avatarEl) avatarEl.textContent = '👤';

        if (historyEl) {
            historyEl.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-history">
                        Silakan login untuk melihat profil.
                        <a href="login.html">Login di sini</a>
                    </td>
                </tr>
            `;
        }

        return;
    }

    const name = currentUser.name || '-';
    const email = currentUser.email || '-';
    const id = currentUser.id ?? '-';
    const phone = currentUser.phone || '-';
    const birth = formatProfileDate(currentUser.birth_date, false);
    const gender = currentUser.gender || '-';
    const address = currentUser.address || '-';
    const joined = formatProfileDate(currentUser.created_at, true);
    const roleLabel = currentUser.role === 'admin' ? 'Administrator' : 'Anggota';

    // Informasi profil
    nameEl.textContent = name;

    if (emailEl) emailEl.textContent = email;
    if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();

    const setText = (elementId, value) => {
        const element = document.getElementById(elementId);
        if (element) element.textContent = value;
    };

    setText('profile-phone', phone);
    setText('profile-id', 'ID Anggota: ' + id);
    setText('detail-name', name);
    setText('detail-email', email);
    setText('detail-phone', phone);
    setText('detail-birth', birth);
    setText('detail-gender', gender);
    setText('detail-address', address);
    setText('detail-role', roleLabel);
    setText('detail-id', id);
    setText('detail-joined', joined);

    // Ambil riwayat dari database melalui API
    if (isAdmin()) {
        if (historyEl) {
            historyEl.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-history">
                        Riwayat peminjaman anggota tidak ditampilkan pada akun admin.
                    </td>
                </tr>
            `;
        }
        return;
    }

    const response = await api('get_loans');

    if (!response?.success) return;

    const loans = getData(response);

    const activeLoans = loans.filter(item =>
        isLoanActive(item.status)
    );

    const returnedLoans = loans.filter(item =>
        !isLoanActive(item.status)
    );

    setText('total-loans', loans.length);
    setText('active-loans', activeLoans.length);
    setText('returned-loans', returnedLoans.length);

    if (!historyEl) return;

    if (!loans.length) {
        historyEl.innerHTML = `
            <tr>
                <td colspan="5" class="empty-history">
                    Belum ada riwayat peminjaman.
                </td>
            </tr>
        `;
        return;
    }

    historyEl.innerHTML = '';

    loans.forEach((loan, index) => {
        const row = document.createElement('tr');

        const values = [
            index + 1,
            loan.title || '-',
            formatLoanDate(loan.date || loan.borrowed_at),
            formatLoanDate(loan.returned_at),
            loan.status || '-'
        ];

        values.forEach((value, i) => {
            const cell = document.createElement('td');

            if (i === 4) {
                const badge = document.createElement('span');
                badge.className = 'history-status';
                badge.textContent = value;
                cell.appendChild(badge);
            } else {
                cell.textContent = value;
            }

            row.appendChild(cell);
        });

        historyEl.appendChild(row);
    });
}


/* =========================================
   RIWAYAT USER
========================================= */

async function renderUserLoanHistory() {
    const container = document.getElementById('loan-history');
    if (!container) return;

    if (!currentUser) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Belum login</h3>
                <p>Silakan login untuk melihat riwayat peminjaman.</p>
                <a href="login.html" class="btn-primary">Login</a>
            </div>
        `;
        return;
    }

    if (isAdmin()) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Riwayat seluruh anggota tersedia pada tampilan admin.</p>
            </div>
        `;
        return;
    }

    const response = await api('get_loans');

    if (!response?.success) {
        container.innerHTML = '<p>Gagal memuat riwayat peminjaman.</p>';
        return;
    }

    const loans = getData(response);

    if (!loans.length) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Belum ada peminjaman</h3>
                <p>Buku yang kamu pinjam akan muncul di sini.</p>
                <a href="katalog.html" class="btn-primary">Lihat Katalog</a>
            </div>
        `;
        return;
    }

    container.innerHTML = loans.map(item => {
        const active = isLoanActive(item.status);
        const loanId = item.id ?? item.loan_id;

        return `
            <div class="loan-item">
                <div class="loan-information">
                    <h3>${escapeHtml(item.title ?? 'Buku')}</h3>
                    <p>${escapeHtml(item.author ?? '-')}</p>

                    <span>
                        Tanggal pinjam:
                        ${formatLoanDate(item.date ?? item.borrowed_at)}
                    </span>

                    <span>
                        Tanggal kembali:
                        ${formatLoanDate(item.returned_at)}
                    </span>
                </div>

                <div class="loan-actions">
                    <span class="loan-status ${
                        active ? 'status-active' : 'status-returned'
                    }">
                        ${escapeHtml(item.status ?? '-')}
                    </span>

                    ${active ? `
                        <button type="button" class="btn-return"
                            data-return-id="${escapeHtml(loanId)}">
                            Kembalikan Buku
                        </button>
                    ` : `
                        <span class="returned-label">Selesai</span>
                    `}
                </div>
            </div>
        `;
    }).join('');
}


/* =========================================
   RIWAYAT ADMIN
========================================= */

async function renderAdminLoanHistory() {
    const container = document.getElementById('admin-loan-history');
    if (!container) return;

    if (!isAdmin()) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = '<p>Memuat data peminjaman...</p>';

    const response = await api('get_all_loans');

    if (!response?.success) {
        container.innerHTML = '<p>Gagal memuat riwayat peminjaman.</p>';
        return;
    }

    const loans = getData(response);

    if (!loans.length) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Belum ada transaksi peminjaman</h3>
                <p>Riwayat anggota akan muncul di sini.</p>
            </div>
        `;
        return;
    }

    const activeCount = loans.filter(
        item => isLoanActive(item.status)
    ).length;

    const returnedCount = loans.length - activeCount;

    container.innerHTML = `
        <div class="admin-loan-summary">
            <div class="admin-summary-card">
                <span>Total Peminjaman</span>
                <strong>${loans.length}</strong>
            </div>

            <div class="admin-summary-card">
                <span>Sedang Dipinjam</span>
                <strong>${activeCount}</strong>
            </div>

            <div class="admin-summary-card">
                <span>Sudah Dikembalikan</span>
                <strong>${returnedCount}</strong>
            </div>
        </div>

        <div class="admin-loan-toolbar">
            <input type="search" id="admin-loan-search"
                placeholder="Cari peminjam, email, atau judul buku..."
                aria-label="Cari riwayat peminjaman">

            <select id="admin-loan-status" aria-label="Filter status">
                <option value="all">Semua status</option>
                <option value="active">Sedang dipinjam</option>
                <option value="returned">Sudah dikembalikan</option>
            </select>
        </div>

        <div class="admin-loan-table">
            <table>
                <thead>
                    <tr>
                        <th>No.</th>
                        <th>Nama Peminjam</th>
                        <th>Email</th>
                        <th>Judul Buku</th>
                        <th>Penulis</th>
                        <th>Tanggal Pinjam</th>
                        <th>Tanggal Kembali</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="admin-loan-body"></tbody>
            </table>
        </div>
    `;

    const searchInput = document.getElementById('admin-loan-search');
    const statusSelect = document.getElementById('admin-loan-status');
    const body = document.getElementById('admin-loan-body');

    const draw = () => {
        const keyword = searchInput.value.toLowerCase().trim();
        const status = statusSelect.value;

        const rows = loans.filter(item => {
            const active = isLoanActive(item.status);

            if (status === 'active' && !active) return false;
            if (status === 'returned' && active) return false;

            if (!keyword) return true;

            return [item.user_name, item.user_email, item.title, item.author]
                .some(v => String(v ?? '').toLowerCase().includes(keyword));
        });

        if (!rows.length) {
            body.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-history">
                        Tidak ada data yang cocok.
                    </td>
                </tr>
            `;
            return;
        }

        body.innerHTML = rows.map((item, index) => {
            const active = isLoanActive(item.status);

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(item.user_name ?? '-')}</td>
                    <td>${escapeHtml(item.user_email ?? '-')}</td>
                    <td>${escapeHtml(item.title ?? '-')}</td>
                    <td>${escapeHtml(item.author ?? '-')}</td>
                    <td>${formatLoanDate(item.date ?? item.borrowed_at)}</td>
                    <td>${formatLoanDate(item.returned_at)}</td>
                    <td>
                        <span class="loan-status ${
                            active ? 'status-active' : 'status-returned'
                        }">
                            ${escapeHtml(item.status ?? '-')}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    };

    searchInput.addEventListener('input', draw);
    statusSelect.addEventListener('change', draw);
    draw();
}



/* =========================================
   PEMILIH TAMPILAN RIWAYAT
========================================= */

async function renderAdminOnlyPage() {
    const page = document.getElementById('admin-only-page');
    if (!page) return false;

    const denied = document.getElementById('admin-denied');

    if (isAdmin()) {
        page.hidden = false;
        if (denied) denied.hidden = true;
        await renderAdminLoanHistory();
    } else {
        page.hidden = true;
        if (denied) denied.hidden = false;
    }

    return true;
}

async function renderLoanPage() {
    if (await renderAdminOnlyPage()) return;

    const userSection = document.getElementById('user-loan-section');
    const adminSection = document.getElementById('admin-loan-section');

    if (!userSection && !adminSection) return;

    // ADMIN
    if (isAdmin()) {

        if (userSection) {
            userSection.hidden = true;
            userSection.style.display = 'none';
        }

        if (adminSection) {
            adminSection.hidden = false;
            adminSection.style.display = '';
        }

        await renderAdminLoanHistory();

    } else {

        // USER
        if (adminSection) {
            adminSection.hidden = true;
            adminSection.style.display = 'none';
        }

        if (userSection) {
            userSection.hidden = false;
            userSection.style.display = '';
        }

        await renderUserLoanHistory();
    }
}



/* =========================================
   PENGEMBALIAN BUKU OLEH USER
========================================= */

async function returnLoan(loanId) {
    if (!currentUser || currentUser.role !== 'user') {
        showToast('Hanya pengguna yang dapat mengembalikan buku.', true);
        return;
    }

    if (!confirm('Apakah kamu yakin ingin mengembalikan buku ini?')) {
        return;
    }

    const response = await api('return_book', 'POST', {
        loan_id: loanId
    });

    if (response?.success) {
        showToast('Buku berhasil dikembalikan.');

        await loadBooks();
        await renderUserLoanHistory();
    }
}


/* =========================================
   NAVIGASI OTOMATIS
========================================= */

function addExtraNavigation() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;

    // Hapus tautan lama yang mengarah ke riwayat di dalam profil.
    nav.querySelectorAll('a').forEach(link => {
        const href = (link.getAttribute('href') || '')
            .trim()
            .toLowerCase();

        if (
            href === 'profile.html#riwayat' ||
            href.endsWith('/profile.html#riwayat')
        ) {
            link.remove();
        }
    });

    const requiredLinks = [
        {
            href: 'panduan.html',
            text: 'Panduan',
            icon: '✦'
        },
        {
            href: 'riwayat.html',
            text: 'Riwayat Peminjaman',
            icon: '♡'
        }
    ];

    requiredLinks.forEach(item => {
        const matchingLinks = [...nav.querySelectorAll('a')].filter(link => {
            const href = (link.getAttribute('href') || '')
                .split('?')[0]
                .split('#')[0];

            return href === item.href;
        });

        // Jika sudah ada lebih dari satu, sisakan satu saja.
        if (matchingLinks.length > 1) {
            matchingLinks.slice(1).forEach(link => link.remove());
        }

        // Jika menu sudah ada, tidak perlu membuat lagi.
        if (matchingLinks.length > 0) return;

        const link = document.createElement('a');

        link.href = item.href;
        link.className = 'nav-link';
        link.innerHTML = `
            <span>${item.icon}</span>
            ${item.text}
        `;

        const authLink = nav.querySelector('#nav-auth');

        if (authLink) {
            nav.insertBefore(link, authLink);
        } else {
            nav.appendChild(link);
        }
    });
}

/* Menu khusus admin: hanya muncul bila yang login adalah admin */
function addAdminMenu() {
    document.querySelectorAll('.pp-links .admin-only-nav').forEach(el => el.remove());

    const links = document.querySelector('.pp-links');
    if (!links || !isAdmin()) return;

    const li = document.createElement('li');
    li.className = 'admin-only-nav';
    li.innerHTML = '<a href="admin-riwayat.html">Admin: Semua Peminjaman</a>';

    const push = links.querySelector('.pp-push');
    links.insertBefore(li, push || null);
}

function setActiveNav() {
    const currentPage =
        window.location.pathname.split('/').pop() || 'index.html';

    document.querySelectorAll('.sidebar-nav a, .pp-links a').forEach(link => {
        link.classList.remove('active');

        const href = link.getAttribute('href') || '';
        const linkPage = href.split('?')[0].split('#')[0];

        if (linkPage === currentPage) {
            link.classList.add('active');
        }
    });

    // Menu "Books": tandai tombolnya bila salah satu anaknya aktif
    const dropBtn = document.querySelector('.pp-drop-btn');

    if (dropBtn) {
        dropBtn.classList.toggle(
            'active',
            !!document.querySelector('.pp-menu a.active')
        );
    }
}


/* =========================================
   CSS MODAL OTOMATIS
========================================= */

function addModalStyles() {
    if (document.getElementById('manybooks-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'manybooks-modal-styles';

    
style.textContent = `
    .mb-modal[hidden] {
        display: none !important;
    }

    .mb-modal {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    }

    .mb-modal-overlay {
        position: absolute;
        inset: 0;
        background: rgba(31, 43, 110, .65);
        backdrop-filter: blur(4px);
    }

    .mb-modal-content {
        position: relative;
        z-index: 1;
        width: min(850px, 100%);
        max-height: 90vh;
        overflow-y: auto;
        padding: 30px;
        border-radius: 22px;
        background: #f4f6fd;
        box-shadow: 0 18px 60px rgba(31, 43, 110, .2);
    }

    .mb-modal-close {
        position: absolute;
        top: 12px;
        right: 16px;
        border: none;
        background: transparent;
        color: #2f45b3;
        font-size: 30px;
        cursor: pointer;
    }

    .book-detail-layout {
        display: grid;
        grid-template-columns: minmax(180px, 260px) 1fr;
        gap: 30px;
        align-items: start;
        padding-top: 15px;
    }

    .book-detail-cover img {
        width: 100%;
        max-height: 380px;
        object-fit: contain;
        border-radius: 14px;
    }

    .book-detail-info h2 {
        color: #2f45b3;
        margin: 12px 0;
    }

    .book-detail-author {
        color: #4d5575;
    }

    .book-detail-description {
        margin: 24px 0;
        line-height: 1.8;
        color: #263238;
    }

    .book-detail-description h3,
    .book-detail-metadata h3 {
        color: #2f45b3;
        margin-bottom: 10px;
    }

    .book-detail-metadata {
        margin: 20px 0;
    }

    .book-metadata-item {
        display: flex;
        justify-content: space-between;
        gap: 15px;
        padding: 10px 0;
        border-bottom: 1px solid #d6dcf5;
        color: #4d5575;
    }

    .book-metadata-item strong {
        color: #2f45b3;
        text-align: right;
    }

    .book-availability {
        display: flex;
        flex-direction: column;
        gap: 7px;
        padding: 14px;
        margin-top: 18px;
        border-radius: 12px;
        background: #e6ebff;
        color: #2f45b3;
    }

    .book-availability .available {
        color: #26834b;
    }

    .book-availability .unavailable {
        color: #c0395b;
    }

    .book-card-stock {
        color: #2f45b3;
        font-size: 13px;
        margin: 8px 0;
    }

    .book-detail-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 20px;
    }

    .book-detail-actions button {
        cursor: pointer;
    }

    .book-detail-actions button:disabled,
    .book-actions button:disabled {
        opacity: .55;
        cursor: not-allowed;
    }

    .mb-edit-content {
        width: min(580px, 100%);
    }

    .mb-edit-content h2 {
        color: #2f45b3;
        margin-bottom: 22px;
    }

    #edit-book-form {
        display: grid;
        gap: 10px;
    }

    #edit-book-form label,
    .book-extra-fields label {
        color: #2f45b3;
        font-weight: 600;
        margin-top: 7px;
    }

    #edit-book-form input,
    #edit-book-form select,
    #edit-book-form textarea,
    .book-extra-fields input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #d6dcf5;
        border-radius: 10px;
        padding: 12px;
        background: #ffffff;
        color: #263238;
        font: inherit;
    }

    #edit-book-form input:focus,
    #edit-book-form select:focus,
    #edit-book-form textarea:focus,
    .book-extra-fields input:focus {
        outline: 2px solid #a9b8f0;
        border-color: #3a54d0;
    }

    .book-extra-fields {
        display: grid;
        gap: 10px;
        margin: 15px 0;
    }

    body.modal-open {
        overflow: hidden;
    }

    @media (max-width: 650px) {
        .mb-modal {
            padding: 10px;
        }

        .mb-modal-content {
            padding: 24px 18px;
        }

        .book-detail-layout {
            grid-template-columns: 1fr;
        }

        .book-detail-cover img {
            max-height: 270px;
        }

        .book-metadata-item {
            flex-direction: column;
            gap: 4px;
        }

        .book-metadata-item strong {
            text-align: left;
        }
    }
`;

document.head.appendChild(style);
}


/* =========================================
   INISIALISASI
========================================= */

document.addEventListener('DOMContentLoaded', async () => {
    addModalStyles();

    // Lengkapi navigasi tanpa membuat menu ganda.
    addExtraNavigation();

    // Tandai menu sesuai halaman yang sedang dibuka.
    setActiveNav();

    initPawHeader();
    initLoginForm();
    initRegisterForm();
    initSearch();

    // Periksa session sebelum menentukan tampilan user/admin.
    await checkSession();
    addAdminMenu();

    // Muat kategori dan buku.
    await loadGenres();
    initCatalog();
    await loadBooks();
    await loadStats();

    // Pasang fitur admin setelah session diketahui.
    initAdminControls();

    // Tampilkan data profil dan riwayat jika elemennya tersedia.
    await renderProfile();
    await renderProfilePage();
    await renderLoanPage();

    // Perbarui navigasi aktif setelah seluruh inisialisasi.
    setActiveNav();
});

function searchBooks(books, keyword) {
    const search = keyword.toLowerCase().trim();

    return books.filter(book =>
        book.title.toLowerCase().includes(search) ||
        book.author.toLowerCase().includes(search)
    );
}


document.addEventListener('DOMContentLoaded', () => {
    const editButton = document.getElementById('edit-profile');

    if (!editButton) return;

    let modal = null;

    function buildModal() {
        modal = document.createElement('div');
        modal.className = 'modal-overlay profile-edit-overlay';
        modal.innerHTML = `
            <div class="profile-edit-modal" role="dialog" aria-modal="true" aria-labelledby="pe-title">
                <h2 id="pe-title">Edit Profil</h2>

                <form id="profile-edit-form" novalidate>
                    <label>Nama Lengkap
                        <input type="text" id="pe-name" required>
                    </label>

                    <label>Email
                        <input type="email" id="pe-email" required>
                    </label>

                    <label>Nomor Telepon
                        <input type="tel" id="pe-phone" placeholder="08xxxxxxxxxx">
                    </label>

                    <div class="pe-row">
                        <label>Tanggal Lahir
                            <input type="date" id="pe-birth">
                        </label>

                        <label>Jenis Kelamin
                            <select id="pe-gender">
                                <option value="">Pilih</option>
                                <option value="Laki-laki">Laki-laki</option>
                                <option value="Perempuan">Perempuan</option>
                            </select>
                        </label>
                    </div>

                    <label>Alamat
                        <textarea id="pe-address" rows="2" maxlength="255"></textarea>
                    </label>

                    <p class="pe-message" id="pe-message"></p>

                    <div class="pe-actions">
                        <button type="button" class="pe-cancel" id="pe-cancel">Batal</button>
                        <button type="submit" class="pe-save" id="pe-save">Simpan</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener('click', e => {
            if (e.target === modal) closeModal();
        });

        modal.querySelector('#pe-cancel').addEventListener('click', closeModal);
        modal.querySelector('#profile-edit-form').addEventListener('submit', saveProfile);
    }

    function closeModal() {
        if (modal) modal.classList.remove('open');
    }

    function openModal() {
        if (!modal) buildModal();

        const set = (id, v) => { modal.querySelector(id).value = v || ''; };

        set('#pe-name', currentUser.name);
        set('#pe-email', currentUser.email);
        set('#pe-phone', currentUser.phone);
        set('#pe-birth', currentUser.birth_date);
        set('#pe-gender', currentUser.gender);
        set('#pe-address', currentUser.address);
        modal.querySelector('#pe-message').textContent = '';

        modal.classList.add('open');
        modal.querySelector('#pe-name').focus();
    }

    async function saveProfile(event) {
        event.preventDefault();

        const get = id => modal.querySelector(id).value.trim();
        const message = modal.querySelector('#pe-message');
        const save = modal.querySelector('#pe-save');

        const payload = {
            name: get('#pe-name'),
            email: get('#pe-email'),
            phone: normalizePhoneInput(get('#pe-phone')),
            birth_date: get('#pe-birth'),
            gender: get('#pe-gender'),
            address: get('#pe-address')
        };

        if (!payload.name || !payload.email) {
            message.textContent = 'Nama dan email wajib diisi.';
            return;
        }

        if (payload.phone && !isValidPhoneInput(payload.phone)) {
            message.textContent = 'Nomor telepon tidak valid. Gunakan format 08xxxxxxxxxx.';
            return;
        }

        save.disabled = true;

        try {
            const result = await api('update_profile', 'POST', payload);

            if (!result || !result.success) {
                message.textContent = result?.message || lastApiError || 'Gagal memperbarui profil';
                return;
            }

            currentUser = result.data.user;

            await renderProfilePage();

            closeModal();
            showToast('Profil berhasil diperbarui!');
        } catch (error) {
            console.error('Update profile error:', error);
            message.textContent = 'Terjadi kesalahan saat memperbarui profil';
        } finally {
            save.disabled = false;
        }
    }

    editButton.addEventListener('click', () => {
        if (!currentUser) {
            showToast('Silakan login terlebih dahulu', true);
            return;
        }

        openModal();
    });
});

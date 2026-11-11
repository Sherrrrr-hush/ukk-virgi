
/*
 * script.js — Perpustakaan Sekolah Nelita
 * Fitur:
 * - Login dan logout
 * - Profil pengguna dan edit profil
 * - Hak akses admin dan pengguna
 * - Katalog, pencarian, dan genre buku
 * - Penyimpanan data melalui localStorage
 */

'use strict';

/* =========================================
   1. DATA BUKU DAN GENRE
========================================= */

const DEFAULT_BOOKS = [
    {
        title: 'Matematika Dasar',
        author: 'John Doe',
        img: 'https://via.placeholder.com/150',
        genre: 'Umum'
    },
    {
        title: 'Sejarah Dunia',
        author: 'Jane Smith',
        img: 'https://via.placeholder.com/150',
        genre: 'Sejarah'
    }
];

const DEFAULT_GENRES = ['Umum', 'Sains', 'Sejarah'];

let books = [];
let genres = [];

/* =========================================
   2. PENYIMPANAN DATA
========================================= */

function saveBooks() {
    localStorage.setItem('books', JSON.stringify(books));
}

function loadBooks() {
    try {
        const data = JSON.parse(localStorage.getItem('books'));

        if (Array.isArray(data) && data.length > 0) {
            books = data;
            return;
        }
    } catch (error) {
        console.warn('Data buku tidak dapat dibaca.');
    }

    books = DEFAULT_BOOKS.map(book => ({ ...book }));
    saveBooks();
}

function saveGenres() {
    localStorage.setItem('genres', JSON.stringify(genres));
}

function loadGenres() {
    try {
        const data = JSON.parse(localStorage.getItem('genres'));

        if (Array.isArray(data) && data.length > 0) {
            genres = data;
            return;
        }
    } catch (error) {
        console.warn('Data genre tidak dapat dibaca.');
    }

    genres = [...DEFAULT_GENRES];
    saveGenres();
}

function loadUsers() {
    try {
        const data = JSON.parse(localStorage.getItem('users') || '[]');
        return Array.isArray(data) ? data : [];
    } catch (error) {
        return [];
    }
}

function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

/* =========================================
   3. UTILITAS
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
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `toast ${isError ? 'toast-error' : 'toast-success'}`;
    toast.style.opacity = '1';

    if (toast._timer) {
        clearTimeout(toast._timer);
    }

    toast._timer = setTimeout(() => {
        toast.style.opacity = '0';
    }, 2500);
}

/* =========================================
   4. LOGIN DAN AKUN PENGGUNA
========================================= */

function ensureDemoAdmin() {
    const users = loadUsers();
    const admin = users.find(
        user => user.email.toLowerCase() === 'admin@admin.com'
    );

    if (!admin) {
        users.push({
            name: 'Admin',
            email: 'admin@admin.com',
            password: 'admin123',
            role: 'admin',
            kelas: '',
            telepon: ''
        });

        saveUsers(users);
    }
}

function registerUser({
    name,
    email,
    password,
    role = 'user'
}) {
    const users = loadUsers();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!name || !normalizedEmail || !password) {
        return false;
    }

    if (users.some(user =>
        user.email.toLowerCase() === normalizedEmail
    )) {
        return false;
    }

    // Pendaftaran publik tidak boleh membuat akun admin.
    users.push({
        name: String(name).trim(),
        email: normalizedEmail,
        password: String(password),
        role: 'user',
        kelas: '',
        telepon: ''
    });

    saveUsers(users);
    return true;
}

function loginUser(email, password) {
    const users = loadUsers();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    const found = users.find(user =>
        user.email.toLowerCase() === normalizedEmail &&
        user.password === password
    );

    if (!found) {
        return false;
    }

    const currentUser = {
        name: found.name,
        email: found.email,
        role: found.role || 'user',
        kelas: found.kelas || '',
        telepon: found.telepon || ''
    };

    localStorage.setItem(
        'currentUser',
        JSON.stringify(currentUser)
    );

    updateHeader();
    return true;
}

function getCurrentUser() {
    try {
        return JSON.parse(
            localStorage.getItem('currentUser') || 'null'
        );
    } catch (error) {
        return null;
    }
}

function logoutUser() {
    localStorage.removeItem('currentUser');
    updateHeader();
}

function requireLogin() {
    const user = getCurrentUser();

    if (!user) {
        window.location.href = 'login.html';
        return false;
    }

    return true;
}

/* =========================================
   5. EDIT DAN SIMPAN PROFIL
========================================= */

function updateUserProfile(profileData) {
    const currentUser = getCurrentUser();

    if (!currentUser) {
        showToast('Silakan masuk terlebih dahulu.', true);
        return false;
    }

    const name = String(profileData.name || '').trim();
    const email = String(profileData.email || '')
        .trim()
        .toLowerCase();
    const kelas = String(profileData.kelas || '').trim();
    const telepon = String(profileData.telepon || '').trim();

    if (!name || !email) {
        showToast('Nama dan email wajib diisi.', true);
        return false;
    }

    const users = loadUsers();

    const emailUsed = users.some(user =>
        user.email.toLowerCase() === email &&
        user.email.toLowerCase() !== currentUser.email.toLowerCase()
    );

    if (emailUsed) {
        showToast('Email sudah digunakan akun lain.', true);
        return false;
    }

    const account = users.find(user =>
        user.email.toLowerCase() === currentUser.email.toLowerCase()
    );

    if (!account) {
        showToast('Akun tidak ditemukan. Silakan login kembali.', true);
        return false;
    }

    account.name = name;
    account.email = email;
    account.kelas = kelas;
    account.telepon = telepon;

    saveUsers(users);

    const updatedUser = {
        name: account.name,
        email: account.email,
        role: account.role || 'user',
        kelas: account.kelas,
        telepon: account.telepon
    };

    localStorage.setItem(
        'currentUser',
        JSON.stringify(updatedUser)
    );

    updateHeader();
    return true;
}

/* =========================================
   6. NAVIGASI DAN HAK AKSES
========================================= */

function updateHeader() {
    const navAuth = document.getElementById('nav-auth');
    const user = getCurrentUser();

    if (navAuth) {
        if (user) {
            navAuth.innerHTML = `
                <a href="profil.html">Profil Saya</a>
                <span class="user-greet">
                    Halo, ${escapeHtml(user.name)}
                </span>
                <a href="#" id="logout-link">Keluar</a>
            `;

            const logoutLink = document.getElementById('logout-link');

            if (logoutLink) {
                logoutLink.addEventListener('click', function (event) {
                    event.preventDefault();
                    logoutUser();
                    showToast('Anda telah keluar.');

                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 400);
                });
            }
        } else {
            navAuth.innerHTML = `
                <a href="login.html">Masuk / Daftar</a>
            `;
        }
    }

    const adminControls = document.getElementById('admin-controls');

    if (adminControls) {
        adminControls.style.display =
            user && user.role === 'admin' ? 'block' : 'none';
    }

    setActiveNav();
}

function setActiveNav() {
    const links = document.querySelectorAll('nav a');
    const path = window.location.pathname.split('/').pop() || 'index.html';

    links.forEach(link => {
        const href = link.getAttribute('href');

        if (href === path) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/* =========================================
   7. HALAMAN PROFIL
========================================= */

function initProfilePage() {
    const form = document.getElementById('form-profil');

    // Jalankan hanya pada halaman yang memiliki form profil.
    if (!form) {
        return;
    }

    const user = getCurrentUser();

    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const getElement = id => document.getElementById(id);

    const tombolEdit = getElement('tombol-edit');
    const tombolBatal = getElement('tombol-batal');
    const pesan = getElement('pesan');

    function renderProfile() {
        const current = getCurrentUser();
        if (!current) return;

        const values = {
            'nama-judul': current.name || 'Pengguna',
            'email-judul': current.email || '-',
            'tampil-nama': current.name || 'Pengguna',
            'tampil-email': current.email || '-',
            'tampil-anggota': current.role === 'admin'
                ? 'Administrator'
                : 'Anggota Perpustakaan',
            'tampil-kelas': current.kelas || 'Belum diisi',
            'tampil-telepon': current.telepon || 'Belum diisi',
            'avatar': (current.name || 'P').trim().charAt(0).toUpperCase()
        };

        Object.entries(values).forEach(([id, value]) => {
            const element = getElement(id);

            if (element) {
                element.textContent = value;
            }
        });
    }

    function fillForm() {
        const current = getCurrentUser();

        getElement('nama').value = current.name || '';
        getElement('email').value = current.email || '';
        getElement('kelas').value = current.kelas || '';
        getElement('telepon').value = current.telepon || '';

        const anggota = getElement('anggota');

        if (anggota) {
            anggota.value = current.role === 'admin'
                ? 'Administrator'
                : 'Anggota Perpustakaan';

            anggota.readOnly = true;
        }
    }

    if (tombolEdit) {
        tombolEdit.addEventListener('click', function () {
            fillForm();

            if (pesan) pesan.textContent = '';

            form.classList.add('aktif');
            tombolEdit.style.display = 'none';

            getElement('nama').focus();
        });
    }

    if (tombolBatal) {
        tombolBatal.addEventListener('click', function () {
            form.classList.remove('aktif');

            if (tombolEdit) {
                tombolEdit.style.display = 'inline-block';
            }

            if (pesan) pesan.textContent = '';
        });
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        const berhasil = updateUserProfile({
            name: getElement('nama').value,
            email: getElement('email').value,
            kelas: getElement('kelas').value,
            telepon: getElement('telepon').value
        });

        if (!berhasil) {
            return;
        }

        renderProfile();
        form.classList.remove('aktif');

        if (tombolEdit) {
            tombolEdit.style.display = 'inline-block';
        }

        if (pesan) {
            pesan.textContent = 'Profil berhasil diperbarui.';
        }

        showToast('Profil berhasil diperbarui.');
    });

    renderProfile();
}

/* =========================================
   8. PENGELOLAAN GENRE
========================================= */

function populateGenreSelects() {
    const selectGenre = document.getElementById('new-genre');

    if (selectGenre) {
        selectGenre.innerHTML = '';

        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            selectGenre.appendChild(option);
        });
    }

    const filter = document.getElementById('genre-filter');

    if (filter) {
        const selected = filter.value;

        filter.innerHTML = '<option value="">Semua Genre</option>';

        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            filter.appendChild(option);
        });

        filter.value = selected;
    }
}

function renderGenresAdmin() {
    const container = document.getElementById('genre-list');

    if (!container) return;

    container.innerHTML = '';

    genres.forEach((genre, index) => {
        const item = document.createElement('div');
        item.className = 'genre-item';

        const label = document.createElement('span');
        label.textContent = genre;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'del';
        button.textContent = '×';
        button.setAttribute('aria-label', `Hapus genre ${genre}`);

        button.addEventListener('click', () => deleteGenre(index));

        item.append(label, button);
        container.appendChild(item);
    });
}

function addGenre(name) {
    const user = getCurrentUser();

    if (!user || user.role !== 'admin') {
        showToast('Hanya admin yang dapat menambah genre.', true);
        return false;
    }

    const genre = String(name || '').trim();

    if (!genre) {
        showToast('Nama genre wajib diisi.', true);
        return false;
    }

    if (genres.some(item => item.toLowerCase() === genre.toLowerCase())) {
        showToast('Genre sudah ada.', true);
        return false;
    }

    genres.push(genre);
    saveGenres();
    populateGenreSelects();
    renderGenresAdmin();
    showToast('Genre berhasil ditambahkan.');

    return true;
}

function deleteGenre(index) {
    const user = getCurrentUser();

    if (!user || user.role !== 'admin') {
        showToast('Hanya admin yang dapat menghapus genre.', true);
        return;
    }

    if (index < 0 || index >= genres.length) return;

    if (!confirm(`Hapus genre "${genres[index]}"?`)) return;

    genres.splice(index, 1);
    saveGenres();
    populateGenreSelects();
    renderGenresAdmin();

    showToast('Genre berhasil dihapus.');
}

/* =========================================
   9. KATALOG BUKU
========================================= */

function deleteBook(index) {
    const user = getCurrentUser();

    if (!user || user.role !== 'admin') {
        showToast('Hanya admin yang dapat menghapus buku.', true);
        return;
    }

    if (index < 0 || index >= books.length) return;

    books.splice(index, 1);
    saveBooks();
    renderBooks();

    showToast('Buku berhasil dihapus.');
}

function renderResults(results, query = '') {
    const container = document.getElementById('hasil');

    if (!container) return;

    if (!results || results.length === 0) {
        container.textContent = query
            ? `Tidak ada buku ditemukan untuk "${query}".`
            : 'Belum ada buku di katalog.';

        return;
    }

    container.innerHTML = '';

    const heading = document.createElement('p');
    heading.textContent = query
        ? `Hasil pencarian untuk "${query}": (${results.length})`
        : `Semua buku: (${results.length})`;

    container.appendChild(heading);

    const resultList = document.createElement('div');
    resultList.className = 'results';

    results.forEach(book => {
        const item = document.createElement('div');
        item.className = 'result';

        const image = document.createElement('img');
        image.src = book.img || 'https://via.placeholder.com/150';
        image.alt = book.title;
        image.width = 80;

        const meta = document.createElement('div');
        meta.className = 'meta';

        const title = document.createElement('h4');
        title.textContent = book.title;

        const badge = document.createElement('span');
        badge.className = 'genre-badge';
        badge.textContent = book.genre || 'Umum';
        title.appendChild(document.createTextNode(' '));
        title.appendChild(badge);

        const author = document.createElement('p');
        author.textContent = `Penulis: ${book.author}`;

        meta.append(title, author);
        item.append(image, meta);
        resultList.appendChild(item);
    });

    container.appendChild(resultList);
}

function cariBuku() {
    const input = document.getElementById('search');
    const filter = document.getElementById('genre-filter');

    if (!input) return;

    const query = input.value.trim();
    const normalizedQuery = query.toLowerCase();
    const selectedGenre = filter ? filter.value : '';

    const matches = books.filter(book => {
        const title = (book.title || '').toLowerCase();
        const author = (book.author || '').toLowerCase();
        const genre = book.genre || 'Umum';

        const matchesQuery =
            !normalizedQuery ||
            title.includes(normalizedQuery) ||
            author.includes(normalizedQuery);

        const matchesGenre =
            !selectedGenre ||
            genre.toLowerCase() === selectedGenre.toLowerCase();

        return matchesQuery && matchesGenre;
    });

    renderResults(matches, query);
}

function renderBooks() {
    const container = document.getElementById('book-list');

    if (!container) return;

    const user = getCurrentUser();
    container.innerHTML = '';

    books.forEach((book, index) => {
        const card = document.createElement('div');
        card.className = 'buku card';

        const image = document.createElement('img');
        image.src = book.img || 'https://via.placeholder.com/150';
        image.alt = book.title;

        const title = document.createElement('h3');
        title.textContent = book.title;

        const author = document.createElement('p');
        author.textContent = `Penulis: ${book.author}`;

        const genre = document.createElement('div');
        genre.className = 'meta-extra';

        const badge = document.createElement('span');
        badge.className = 'genre-badge';
        badge.textContent = book.genre || 'Umum';
        genre.appendChild(badge);

        const actions = document.createElement('div');
        actions.className = 'card-actions';

        const borrowButton = document.createElement('button');
        borrowButton.type = 'button';
        borrowButton.className = 'btn-primary';
        borrowButton.textContent = 'Pinjam';

        borrowButton.addEventListener('click', () => {
            if (!getCurrentUser()) {
                showToast('Silakan masuk terlebih dahulu untuk meminjam.', true);

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 700);

                return;
            }

            showToast('Fitur peminjaman belum terhubung ke sistem.');
        });

        actions.appendChild(borrowButton);

        if (user && user.role === 'admin') {
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'btn-danger';
            deleteButton.textContent = 'Hapus';

            deleteButton.addEventListener('click', () => {
                if (confirm('Hapus buku ini?')) {
                    deleteBook(index);
                }
            });

            actions.appendChild(deleteButton);
        }

        card.append(image, title, author, genre, actions);
        container.appendChild(card);
    });
}

/* =========================================
   10. FORM TAMBAH BUKU ADMIN
========================================= */

function initAdminControls() {
    const showButton = document.getElementById('show-add-book');
    const form = document.getElementById('add-book-form');

    if (showButton && form) {
        showButton.addEventListener('click', () => {
            form.style.display =
                form.style.display === 'none' ? 'block' : 'none';
        });

        form.addEventListener('submit', event => {
            event.preventDefault();

            const user = getCurrentUser();

            if (!user || user.role !== 'admin') {
                showToast('Akses hanya untuk admin.', true);
                return;
            }

            const title = document.getElementById('new-title').value.trim();
            const author = document.getElementById('new-author').value.trim();
            const image = document.getElementById('new-img').value.trim();
            const genreSelect = document.getElementById('new-genre');

            const genre = genreSelect ? genreSelect.value : 'Umum';

            if (!title || !author) {
                showToast('Judul dan penulis wajib diisi.', true);
                return;
            }

            books.push({
                title,
                author,
                img: image || 'https://via.placeholder.com/150',
                genre: genre || 'Umum'
            });

            saveBooks();
            renderBooks();
            form.reset();

            showToast('Buku berhasil ditambahkan.');
        });
    }

    const showGenreButton = document.getElementById('show-genre-manager');
    const genreManager = document.getElementById('genre-manager');

    if (showGenreButton && genreManager) {
        showGenreButton.addEventListener('click', () => {
            const user = getCurrentUser();

            if (!user || user.role !== 'admin') {
                showToast('Akses hanya untuk admin.', true);
                return;
            }

            genreManager.style.display =
                genreManager.style.display === 'none' ? 'block' : 'none';
        });
    }

    const genreForm = document.getElementById('add-genre-form');

    if (genreForm) {
        genreForm.addEventListener('submit', event => {
            event.preventDefault();

            const input = document.getElementById('genre-name');

            if (input && addGenre(input.value)) {
                genreForm.reset();
            }
        });
    }
}

/* =========================================
   11. INISIALISASI WEBSITE
========================================= */

document.addEventListener('DOMContentLoaded', () => {
    ensureDemoAdmin();
    loadBooks();
    loadGenres();

    updateHeader();
    populateGenreSelects();
    renderGenresAdmin();

    const searchInput = document.getElementById('search');

    if (searchInput) {
        searchInput.addEventListener('input', cariBuku);
    }

    const genreFilter = document.getElementById('genre-filter');

    if (genreFilter) {
        genreFilter.addEventListener('change', cariBuku);
    }

    const resultsContainer = document.getElementById('hasil');

    if (resultsContainer) {
        renderResults(books);
    }

    if (document.getElementById('book-list')) {
        renderBooks();
        initAdminControls();
    }

    initProfilePage();
});

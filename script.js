const countries = [
    "Afghanistan","Albania","Algeria","Andorra","Angola",
    "Argentina","Armenia","Australia","Austria","Azerbaijan",
    "Bahrain","Bangladesh","Belarus","Belgium","Belize",
    "Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil",
    "Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia",
    "Cameroon","Canada","Chad","Chile","China",
    "Colombia","Costa Rica","Croatia","Cuba","Cyprus",
    "Czech Republic","Denmark","Dominican Republic","Ecuador","Egypt",
    "El Salvador","Estonia","Ethiopia","Finland","France",
    "Georgia","Germany","Ghana","Greece","Guatemala",
    "Haiti","Honduras","Hungary","Iceland","India",
    "Indonesia","Iran","Iraq","Ireland","Israel",
    "Italy","Jamaica","Japan","Jordan","Kazakhstan",
    "Kenya","Kuwait","Latvia","Lebanon","Libya",
    "Lithuania","Luxembourg","Madagascar","Malaysia","Maldives",
    "Mali","Malta","Mauritania","Mexico","Moldova",
    "Mongolia","Morocco","Myanmar","Nepal","Netherlands",
    "New Zealand","Nicaragua","Niger","Nigeria","North Korea",
    "Norway","Oman","Pakistan","Palestine","Panama",
    "Paraguay","Peru","Philippines","Poland","Portugal",
    "Qatar","Romania","Russia","Rwanda","Saudi Arabia",
    "Senegal","Serbia","Singapore","Slovakia","Slovenia",
    "Somalia","South Africa","South Korea","Spain","Sri Lanka",
    "Sudan","Sweden","Switzerland","Syria","Taiwan",
    "Tanzania","Thailand","Tunisia","Turkey","UAE",
    "Uganda","Ukraine","United Kingdom","United States",
    "Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen",
    "Zambia","Zimbabwe"
];

const USERS_STORAGE_KEY = 'taarny_users';
const CURRENT_USER_KEY = 'taarny_current_user_email';
const TRIPS_STORAGE_KEY = 'taarny_trips';
const PAGE_ORDER = ['login-page', 'booking-page', 'flights-page', 'seat-page', 'checkout-page', 'confirmation-page'];
const SEAT_COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F'];
const ROWS = 6;
const PREMIUM_ROWS = [1, 2];
const CLASS_MULTIPLIER = { economy: 1, business: 2.4, first: 4.2 };
const BASE_FARE = 189;

let usersDB = [];
let tripsDB = [];
let isLogin = true;
let totalPeople = 1;
let currentSelected = 0;
let currentTab = 'one-way';
let selectedSeats = [];
let currentUser = null;

let booking = {
    origin: '', destination: '', departDate: '', returnDate: '',
    tripType: 'one-way', adults: 1, children: 0, infants: 0,
    cabinClass: 'economy', flight: null, seats: [], seatFees: 0,
    basePrice: 0, totalPrice: 0, ref: ''
};

function loadUsers() {
    try {
        const raw = localStorage.getItem(USERS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
}

function loadTrips() {
    try {
        const raw = localStorage.getItem(TRIPS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
}

function saveUsers(users) { localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users)); }
function saveTrips() { localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(tripsDB)); }

async function hashPassword(password) {
    const data = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3500);
}

function setBtnLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.classList.toggle('loading', loading);
}

function updateStepNav(activeId) {
    const idx = PAGE_ORDER.indexOf(activeId);
    document.querySelectorAll('.step').forEach((step, i) => {
        step.classList.remove('active', 'completed');
        if (i === idx) step.classList.add('active');
        else if (i < idx) step.classList.add('completed');
    });
    const hideNav = activeId === 'login-page' || activeId === 'confirmation-page';
    document.getElementById('step-nav').classList.toggle('hidden', hideNav);
}

function navigateTo(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    updateStepNav(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (id === 'seat-page') setupSeats();
    if (id === 'checkout-page') renderCheckout();
    if (id === 'confirmation-page') renderBoardingPass();
}

function updateHeader() {
    const actions = document.getElementById('header-actions');
    if (currentUser) {
        actions.classList.remove('hidden');
        const initial = (currentUser.name || currentUser.email)[0].toUpperCase();
        document.getElementById('user-avatar').textContent = initial;
        document.getElementById('user-name').textContent = currentUser.name || currentUser.email.split('@')[0];
    } else {
        actions.classList.add('hidden');
    }
}

function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    currentUser = null;
    updateHeader();
    navigateTo('login-page');
    showToast('Signed out successfully.', 'info');
}

function goHome() {
    if (currentUser) navigateTo('booking-page');
    else navigateTo('login-page');
}

function toggleTripsDrawer(force) {
    const drawer = document.getElementById('trips-drawer');
    const open = force !== undefined ? force : !drawer.classList.contains('open');
    drawer.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', !open);
    if (open) renderTripsList();
}

function renderTripsList() {
    const list = document.getElementById('trips-list');
    const userTrips = tripsDB.filter(t => t.email === currentUser?.email);
    if (!userTrips.length) {
        list.innerHTML = '<p class="empty-state">No trips yet. Book your first adventure!</p>';
        return;
    }
    list.innerHTML = userTrips.slice().reverse().map(t => `
        <div class="trip-card">
            <div class="trip-card-ref">${t.ref}</div>
            <div class="trip-card-route">${t.origin} → ${t.destination}</div>
            <div class="trip-card-meta">${formatDate(t.departDate)} · ${t.seats.join(', ')} · $${t.totalPrice}</div>
        </div>
    `).join('');
}

function fillCountries(container) {
    const root = container || document;
    root.querySelectorAll('.country-list, #origin-select, #dest-select').forEach(select => {
        if (select.options.length > 1) return;
        countries.forEach(c => {
            const op = document.createElement('option');
            op.value = c; op.textContent = c;
            select.appendChild(op);
        });
    });
}

function togglePassword() {
    const input = document.getElementById('user-pass');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
}

function toggleAuthMode() {
    isLogin = !isLogin;
    const box = document.getElementById('auth-inputs');
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const text = document.getElementById('auth-toggle-text');

    if (!isLogin) {
        title.textContent = 'Create your account';
        subtitle.textContent = 'Join Taiarny Air and start exploring';
        box.innerHTML = `
            <div class="field"><label for="fname">First name</label><input type="text" id="fname" placeholder="First name"></div>
            <div class="field"><label for="lname">Last name</label><input type="text" id="lname" placeholder="Last name"></div>
            <div class="field"><label for="reg-country">Country</label><select id="reg-country" class="country-list"><option value="">Select country</option></select></div>
            <div class="field"><label for="user-email">Email</label><input type="email" id="user-email" placeholder="you@example.com"></div>
            <div class="field"><label for="user-pass">Password</label>
                <div class="input-wrap"><input type="password" id="user-pass" placeholder="Create a password"><button type="button" class="toggle-pass" onclick="togglePassword()">👁</button></div>
            </div>
            <button class="btn btn-primary btn-full" id="auth-btn" onclick="handleAuth()"><span class="btn-text">Create account</span><span class="btn-spinner"></span></button>`;
        fillCountries(box);
        text.innerHTML = 'Already have an account? <span>Sign in</span>';
    } else {
        title.textContent = 'Welcome back';
        subtitle.textContent = 'Sign in to manage your bookings';
        box.innerHTML = `
            <div class="field"><label for="user-email">Email</label><input type="email" id="user-email" placeholder="you@example.com"></div>
            <div class="field"><label for="user-pass">Password</label>
                <div class="input-wrap"><input type="password" id="user-pass" placeholder="Enter your password"><button type="button" class="toggle-pass" onclick="togglePassword()">👁</button></div>
            </div>
            <button class="btn btn-primary btn-full" id="auth-btn" onclick="handleAuth()"><span class="btn-text">Sign in</span><span class="btn-spinner"></span></button>`;
        text.innerHTML = 'Don\'t have an account? <span>Create one</span>';
    }
}

async function handleAuth() {
    const btn = document.getElementById('auth-btn');
    const email = document.getElementById('user-email')?.value.trim();
    const password = document.getElementById('user-pass')?.value;

    if (!email || !password) { showToast('Please enter email and password.', 'error'); return; }

    let name = '';
    if (!isLogin) {
        const fname = document.getElementById('fname')?.value.trim();
        const lname = document.getElementById('lname')?.value.trim();
        if (!fname || !lname) { showToast('Please enter your name.', 'error'); return; }
        name = `${fname} ${lname}`;
    }

    setBtnLoading(btn, true);
    await new Promise(r => setTimeout(r, 500));

    try {
        if (isLogin) {
            const found = usersDB.find(u => u.email === email);
            if (!found) { showToast('Account not found. Create one first.', 'error'); return; }
            const hash = await hashPassword(password);
            if (found.passwordHash !== hash) { showToast('Incorrect password.', 'error'); return; }
            currentUser = { email, name: found.name || email.split('@')[0] };
        } else {
            if (usersDB.some(u => u.email === email)) { showToast('Email already registered.', 'error'); return; }
            const hash = await hashPassword(password);
            usersDB.push({ email, passwordHash: hash, name });
            saveUsers(usersDB);
            currentUser = { email, name };
        }
        localStorage.setItem(CURRENT_USER_KEY, email);
        updateHeader();
        showToast(`Welcome${name ? ', ' + name.split(' ')[0] : ' back'}!`, 'success');
        navigateTo('booking-page');
    } finally {
        setBtnLoading(btn, false);
    }
}

function switchTab(tab, btn) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('return-field').classList.toggle('hidden', tab !== 'round-trip');
    document.getElementById('add-flight-btn').classList.toggle('hidden', tab !== 'multi-city');
    if (tab !== 'multi-city') {
        document.querySelectorAll('#dynamic-flights .flight-row').forEach((r, i) => { if (i > 0) r.remove(); });
    }
    updatePricePreview();
}

function swapFirstRow() {
    const o = document.getElementById('origin-select');
    const d = document.getElementById('dest-select');
    [o.value, d.value] = [d.value, o.value];
    updatePricePreview();
}

function addFlightRow() {
    showToast('Multi-city booking coming soon!', 'info');
}

function adjustCounter(id, delta) {
    const input = document.getElementById(id);
    const display = document.getElementById(`${id}-display`);
    const min = id === 'adults' ? 1 : 0;
    let val = Math.max(min, Math.min(9, parseInt(input.value) + delta));
    input.value = val;
    display.textContent = val;
    updateTotalTravelers();
    updatePricePreview();
}

function updateTotalTravelers() {
    const a = parseInt(document.getElementById('adults').value) || 0;
    const c = parseInt(document.getElementById('children').value) || 0;
    const i = parseInt(document.getElementById('infants').value) || 0;
    totalPeople = Math.max(1, a + c + i);
    const el = document.getElementById('required-seats');
    if (el) el.textContent = totalPeople;
}

function getTravelerCount() {
    return {
        adults: parseInt(document.getElementById('adults')?.value) || 1,
        children: parseInt(document.getElementById('children')?.value) || 0,
        infants: parseInt(document.getElementById('infants')?.value) || 0
    };
}

function calcBasePrice() {
    const t = getTravelerCount();
    const cls = document.getElementById('class-type')?.value || 'economy';
    const pax = t.adults + t.children;
    const mult = CLASS_MULTIPLIER[cls] || 1;
    const dist = hashDistance(booking.origin || document.getElementById('origin-select')?.value, booking.destination || document.getElementById('dest-select')?.value);
    return Math.round((BASE_FARE + dist * 12) * mult * pax);
}

function hashDistance(a, b) {
    if (!a || !b) return 5;
    return Math.abs(a.charCodeAt(0) - b.charCodeAt(0)) + Math.abs(a.length - b.length) + 3;
}

function updatePricePreview() {
    const origin = document.getElementById('origin-select')?.value;
    const dest = document.getElementById('dest-select')?.value;
    const depart = document.getElementById('depart-date')?.value;
    const cls = document.getElementById('class-type');
    const t = getTravelerCount();

    document.getElementById('sum-route').textContent = origin && dest ? `${origin} → ${dest}` : '—';
    document.getElementById('sum-date').textContent = depart ? formatDate(depart) : '—';
    const parts = [];
    if (t.adults) parts.push(`${t.adults} adult${t.adults > 1 ? 's' : ''}`);
    if (t.children) parts.push(`${t.children} child${t.children > 1 ? 'ren' : ''}`);
    if (t.infants) parts.push(`${t.infants} infant${t.infants > 1 ? 's' : ''}`);
    document.getElementById('sum-travelers').textContent = parts.join(', ') || '1 adult';
    document.getElementById('sum-class').textContent = cls?.options[cls.selectedIndex]?.text.replace(' Class', '') || 'Economy';

    booking.origin = origin;
    booking.destination = dest;
    const price = calcBasePrice();
    document.getElementById('sum-price').textContent = price ? `$${price}` : '$0';
}

function quickRoute(from, to) {
    if (!currentUser) { showToast('Sign in first to book.', 'info'); return; }
    navigateTo('booking-page');
    document.getElementById('origin-select').value = from;
    document.getElementById('dest-select').value = to;
    updatePricePreview();
    showToast(`${from} → ${to} selected!`, 'success');
}

function validateSearch() {
    const origin = document.getElementById('origin-select').value;
    const dest = document.getElementById('dest-select').value;
    const depart = document.getElementById('depart-date').value;
    if (!origin || !dest) { showToast('Select origin and destination.', 'error'); return false; }
    if (origin === dest) { showToast('Origin and destination must differ.', 'error'); return false; }
    if (!depart) { showToast('Select a departure date.', 'error'); return false; }
    if (currentTab === 'round-trip') {
        const ret = document.getElementById('return-date').value;
        if (!ret) { showToast('Select a return date.', 'error'); return false; }
        if (ret < depart) { showToast('Return must be after departure.', 'error'); return false; }
    }
    return true;
}

async function searchFlights() {
    if (!validateSearch()) return;
    const btn = event?.target?.closest('.btn');
    setBtnLoading(btn, true);
    await new Promise(r => setTimeout(r, 800));

    const t = getTravelerCount();
    booking = {
        ...booking,
        origin: document.getElementById('origin-select').value,
        destination: document.getElementById('dest-select').value,
        departDate: document.getElementById('depart-date').value,
        returnDate: document.getElementById('return-date')?.value || '',
        tripType: currentTab,
        adults: t.adults, children: t.children, infants: t.infants,
        cabinClass: document.getElementById('class-type').value,
        flight: null, seats: [], seatFees: 0
    };
    booking.basePrice = calcBasePrice();
    updateTotalTravelers();

    renderFlightResults();
    setBtnLoading(btn, false);
    navigateTo('flights-page');
}

function generateFlights() {
    const times = [
        { dep: '06:30', arr: '09:15', dur: '2h 45m', stops: 'Nonstop', tag: 'Best value' },
        { dep: '11:00', arr: '13:50', dur: '2h 50m', stops: 'Nonstop', tag: 'Popular' },
        { dep: '15:45', arr: '19:20', dur: '3h 35m', stops: '1 stop', tag: null },
        { dep: '21:10', arr: '23:55', dur: '2h 45m', stops: 'Nonstop', tag: 'Red-eye' }
    ];
    return times.map((t, i) => ({
        id: i,
        ...t,
        price: Math.round(booking.basePrice * (1 + i * 0.08 + (t.stops !== 'Nonstop' ? -0.12 : 0))),
        flightNo: `TA${100 + i}${Math.floor(Math.random() * 9)}`
    }));
}

function renderFlightResults() {
    document.getElementById('flights-route-label').textContent =
        `${booking.origin} → ${booking.destination} · ${formatDate(booking.departDate)} · ${totalPeople} traveler${totalPeople > 1 ? 's' : ''}`;

    const flights = generateFlights();
    const container = document.getElementById('flight-results');
    container.innerHTML = flights.map((f, i) => `
        <div class="flight-card" style="animation-delay:${i * 0.08}s" onclick="selectFlight(${f.id})">
            <div class="flight-times">
                <div class="flight-time-block"><strong>${f.dep}</strong><span>${booking.origin.slice(0,3).toUpperCase()}</span></div>
                <div class="flight-arrow">→</div>
                <div class="flight-time-block"><strong>${f.arr}</strong><span>${booking.destination.slice(0,3).toUpperCase()}</span></div>
            </div>
            <div class="flight-meta">
                <span>${f.dur} · ${f.stops}</span>
                <span>${f.flightNo}</span>
                ${f.tag ? `<span class="flight-badge">${f.tag}</span>` : ''}
            </div>
            <div class="flight-price">
                <strong>$${f.price}</strong>
                <span>per party</span>
                <button class="btn btn-primary btn-sm flight-select-btn" onclick="event.stopPropagation(); selectFlight(${f.id})">Select</button>
            </div>
        </div>
    `).join('');

    booking._flights = flights;
}

function selectFlight(id) {
    const flight = booking._flights.find(f => f.id === id);
    if (!flight) return;
    booking.flight = flight;
    booking.basePrice = flight.price;
    showToast(`Flight ${flight.flightNo} selected!`, 'success');
    navigateTo('seat-page');
}

function setupSeats() {
    selectedSeats = [];
    currentSelected = 0;
    document.getElementById('selected-count').textContent = '0';
    updateTotalTravelers();

    const grid = document.getElementById('seatGrid');
    grid.innerHTML = '';

    const colLabels = document.createElement('div');
    colLabels.className = 'col-labels';
    colLabels.innerHTML = `<span class="row-label"></span>
        ${SEAT_COLUMNS.slice(0,3).map(c => `<span class="col-label">${c}</span>`).join('')}
        <span class="aisle-gap"></span>
        ${SEAT_COLUMNS.slice(3).map(c => `<span class="col-label">${c}</span>`).join('')}`;
    grid.appendChild(colLabels);

    for (let r = 1; r <= ROWS; r++) {
        const rowEl = document.createElement('div');
        rowEl.className = 'seat-row';
        const rowLabel = document.createElement('span');
        rowLabel.className = 'row-label';
        rowLabel.textContent = r;
        rowEl.appendChild(rowLabel);

        const left = document.createElement('div'); left.className = 'seat-group';
        const right = document.createElement('div'); right.className = 'seat-group';

        SEAT_COLUMNS.forEach((col, ci) => {
            const seatId = `${r}${col}`;
            const isPremium = PREMIUM_ROWS.includes(r);
            const isOccupied = Math.random() < 0.25;
            const seat = document.createElement('div');
            seat.className = isOccupied ? 'seat taken' : isPremium ? 'seat premium available' : 'seat available';
            seat.textContent = col;
            seat.dataset.seat = seatId;
            seat.dataset.premium = isPremium;
            if (!isOccupied) seat.addEventListener('click', () => toggleSeat(seat));
            (ci < 3 ? left : right).appendChild(seat);
        });

        rowEl.appendChild(left);
        rowEl.appendChild(Object.assign(document.createElement('div'), { className: 'aisle-gap' }));
        rowEl.appendChild(right);
        grid.appendChild(rowEl);
    }

    renderSeatSummary();
}

function toggleSeat(seat) {
    const id = seat.dataset.seat;
    if (seat.classList.contains('selected')) {
        seat.classList.remove('selected');
        selectedSeats = selectedSeats.filter(s => s.id !== id);
        currentSelected--;
    } else if (currentSelected < totalPeople) {
        seat.classList.add('selected');
        selectedSeats.push({ id, premium: seat.dataset.premium === 'true' });
        currentSelected++;
    } else {
        showToast(`Select only ${totalPeople} seat(s).`, 'info');
        return;
    }
    document.getElementById('selected-count').textContent = currentSelected;
    booking.seatFees = selectedSeats.filter(s => s.premium).length * 45;
    renderSeatSummary();
}

function renderSeatSummary() {
    const el = document.getElementById('seat-summary-detail');
    if (!el) return;
    el.innerHTML = `
        <div class="summary-row"><span>Flight</span><strong>${booking.flight?.flightNo || '—'}</strong></div>
        <div class="summary-row"><span>Route</span><strong>${booking.origin} → ${booking.destination}</strong></div>
        <div class="summary-row"><span>Seats</span><strong>${selectedSeats.map(s => s.id).join(', ') || '—'}</strong></div>
    `;
    document.getElementById('seat-fees').textContent = `$${booking.seatFees}`;
}

function continueToCheckout() {
    if (currentSelected < totalPeople) {
        showToast(`Pick ${totalPeople - currentSelected} more seat(s).`, 'error');
        return;
    }
    booking.seats = selectedSeats.map(s => s.id);
    booking.totalPrice = booking.basePrice + booking.seatFees;
    navigateTo('checkout-page');
}

function renderCheckout() {
    booking.totalPrice = booking.basePrice + booking.seatFees;
    document.getElementById('checkout-summary').innerHTML = `
        <div class="summary-row"><span>Flight ${booking.flight?.flightNo}</span><strong>$${booking.basePrice}</strong></div>
        <div class="summary-row"><span>${booking.origin} → ${booking.destination}</span><strong></strong></div>
        <div class="summary-row"><span>Seats (${booking.seats.join(', ')})</span><strong>$${booking.seatFees || '0'}</strong></div>
        <div class="summary-row"><span>Taxes & fees</span><strong>$${Math.round(booking.basePrice * 0.12)}</strong></div>
    `;
    const taxes = Math.round(booking.basePrice * 0.12);
    booking.totalPrice = booking.basePrice + booking.seatFees + taxes;
    document.getElementById('checkout-total').textContent = `$${booking.totalPrice}`;
    document.getElementById('pay-amount').textContent = `$${booking.totalPrice}`;
}

function formatCard(input) {
    let v = input.value.replace(/\D/g, '').substring(0, 16);
    input.value = v.replace(/(.{4})/g, '$1 ').trim();
}

async function processPayment() {
    const name = document.getElementById('card-name').value.trim();
    const num = document.getElementById('card-number').value.replace(/\s/g, '');
    if (!name || num.length < 16) { showToast('Enter valid payment details.', 'error'); return; }

    const btn = document.getElementById('pay-btn');
    setBtnLoading(btn, true);
    await new Promise(r => setTimeout(r, 1200));

    booking.ref = 'TA' + Date.now().toString(36).toUpperCase().slice(-6);
    const trip = {
        ref: booking.ref, email: currentUser.email,
        origin: booking.origin, destination: booking.destination,
        departDate: booking.departDate, seats: booking.seats,
        flightNo: booking.flight?.flightNo, totalPrice: booking.totalPrice,
        passenger: currentUser.name, class: booking.cabinClass
    };
    tripsDB.push(trip);
    saveTrips();

    setBtnLoading(btn, false);
    launchConfetti();
    navigateTo('confirmation-page');
}

function renderBoardingPass() {
    const pass = document.getElementById('boarding-pass');
    pass.innerHTML = `
        <div class="pass-header">
            <strong>Taiarny Air</strong>
            <span>BOARDING PASS</span>
        </div>
        <div class="pass-body">
            <div class="pass-field"><label>Passenger</label><strong>${currentUser?.name || 'Guest'}</strong></div>
            <div class="pass-field"><label>Booking ref</label><strong>${booking.ref}</strong></div>
            <div class="pass-field"><label>Flight</label><strong>${booking.flight?.flightNo}</strong></div>
            <div class="pass-field"><label>Date</label><strong>${formatDate(booking.departDate)}</strong></div>
            <div class="pass-field"><label>Seat(s)</label><strong>${booking.seats.join(', ')}</strong></div>
            <div class="pass-field"><label>Class</label><strong>${booking.cabinClass.charAt(0).toUpperCase() + booking.cabinClass.slice(1)}</strong></div>
            <div class="pass-route">
                <div class="pass-city"><strong>${booking.origin.slice(0,3).toUpperCase()}</strong><span>${booking.origin}</span></div>
                <div class="pass-plane">✈</div>
                <div class="pass-city"><strong>${booking.destination.slice(0,3).toUpperCase()}</strong><span>${booking.destination}</span></div>
            </div>
            <div class="pass-barcode"></div>
        </div>`;
}

function formatDate(d) {
    if (!d) return '—';
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function downloadPass() {
    showToast('Boarding pass saved! (demo)', 'success');
}

function bookAnother() {
    selectedSeats = [];
    currentSelected = 0;
    navigateTo('booking-page');
}

function launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const pieces = Array.from({ length: 120 }, () => ({
        x: Math.random() * canvas.width, y: -20 - Math.random() * 200,
        w: 6 + Math.random() * 6, h: 4 + Math.random() * 4,
        color: ['#c9a84c','#e2c06a','#5ec4b6','#e8f0fa','#4caf82'][Math.floor(Math.random()*5)],
        vy: 2 + Math.random() * 4, vx: -2 + Math.random() * 4, rot: Math.random() * 360, vr: -5 + Math.random() * 10
    }));
    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(p => {
            p.x += p.vx; p.y += p.vy; p.rot += p.vr;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot * Math.PI / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
            ctx.restore();
        });
        frame++;
        if (frame < 120) requestAnimationFrame(draw);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    draw();
}

document.addEventListener('DOMContentLoaded', () => {
    fillCountries();
    usersDB = loadUsers();
    tripsDB = loadTrips();
    updateTotalTravelers();
    updateStepNav('login-page');

    const today = new Date().toISOString().split('T')[0];
    const depart = document.getElementById('depart-date');
    const ret = document.getElementById('return-date');
    if (depart) { depart.min = today; depart.addEventListener('change', updatePricePreview); }
    if (ret) ret.min = today;
    depart?.addEventListener('change', () => { if (ret) ret.min = depart.value || today; });

    ['origin-select', 'dest-select', 'class-type'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', updatePricePreview);
    });

    const savedEmail = localStorage.getItem(CURRENT_USER_KEY);
    if (savedEmail) {
        const user = usersDB.find(u => u.email === savedEmail);
        if (user) {
            currentUser = { email: user.email, name: user.name || user.email.split('@')[0] };
            updateHeader();
            navigateTo('booking-page');
        }
    }
});
window.addEventListener("load", () => {
    const video = document.getElementById("intro-video");
    const intro = document.getElementById("intro-screen");

    video.play().catch(console.error);

    video.onended = () => {
        intro.remove();
    };

    setTimeout(() => {
        intro.remove();
    }, 5000);
});

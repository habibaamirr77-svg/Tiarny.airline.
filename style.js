
const flightsData = {
    'New York-London': [
        { id: 1, time: '10:00 - 18:00', date: '2024-10-15 10:00', duration: '7h', price: '$450' },
        { id: 2, time: '14:00 - 22:00', date: '2024-10-16 14:00', duration: '7h', price: '$470' },
        { id: 3, time: '08:00 - 16:00', date: '2024-10-17 08:00', duration: '7h', price: '$440' }
    ],
    'London-New York': [
        { id: 4, time: '09:00 - 13:00', date: '2024-10-15 09:00', duration: '7h', price: '$460' },
        { id: 5, time: '15:00 - 19:00', date: '2024-10-16 15:00', duration: '7h', price: '$480' }
    ],
    'Dubai-Riyadh': [
        { id: 10, time: '09:00 - 10:30', date: '2024-10-15 09:00', duration: '1.5h', price: '$150' },
        { id: 11, time: '14:00 - 15:30', date: '2024-10-16 14:00', duration: '1.5h', price: '$155' },
        { id: 12, time: '18:00 - 19:30', date: '2024-10-17 18:00', duration: '1.5h', price: '$145' },
        { id: 13, time: '07:00 - 08:30', date: '2024-10-18 07:00', duration: '1.5h', price: '$160' }
    ],
    'Riyadh-Dubai': [
        { id: 14, time: '11:00 - 12:30', date: '2024-10-15 11:00', duration: '1.5h', price: '$160' },
        { id: 15, time: '16:00 - 17:30', date: '2024-10-16 16:00', duration: '1.5h', price: '$165' },
        { id: 16, time: '20:00 - 21:30', date: '2024-10-17 20:00', duration: '1.5h', price: '$155' }
    ],
    'Cairo-Dubai': [
        { id: 17, time: '01:00 - 07:00', date: '2024-10-15 01:00', duration: '4h', price: '$280' },
        { id: 18, time: '06:00 - 12:00', date: '2024-10-16 06:00', duration: '4h', price: '$290' }
    ],
    'Dubai-Cairo': [
        { id: 19, time: '14:00 - 18:00', date: '2024-10-15 14:00', duration: '4h', price: '$300' },
        { id: 20, time: '22:00 - 02:00', date: '2024-10-16 22:00', duration: '4h', price: '$310' }
    ],
    'default': [
        { id: 999, time: '09:00 - 12:00', date: '2024-10-15 09:00', duration: '3h', price: '$250' },
        { id: 1000, time: '14:00 - 17:00', date: '2024-10-16 14:00', duration: '3h', price: '$230' },
        { id: 1001, time: '18:00 - 21:00', date: '2024-10-17 18:00', duration: '3h', price: '$270' }
    ]
};


function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return hash.toString();
}

function toggleForm(mode) {
    document.getElementById('login-form').style.display = mode === 'register' ? 'none' : 'block';
    document.getElementById('register-form').style.display = mode === 'register' ? 'block' : 'none';
    document.getElementById('switch-to-register').style.display = mode === 'register' ? 'none' : 'block';
    document.getElementById('switch-to-login').style.display = mode === 'register' ? 'block' : 'none';
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    
    document.body.classList.remove('welcome-bg', 'login-bg', 'book-bg');
    if (sectionId === 'welcome-section') {
        document.body.classList.add('welcome-bg');
    } else if (sectionId === 'auth-section') {
        document.body.classList.add('login-bg');
    } else {
        document.body.classList.add('book-bg');
    }
    
    if (sectionId === 'seats-section') {
        generateSeats();
    }
}

function goToWelcome() {
    showSection('welcome-section');
}

function goToLogin() {
    showSection('auth-section');
}

function goToReservation() {
    showSection('reservation-section');
}


document.getElementById('reservation-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const from = document.getElementById('from-city').value;
    const to = document.getElementById('to-city').value;
    const numPeople = document.getElementById('num-people').value;

    if (!from || !to || !numPeople) return alert('Please fill all fields');
    if (from === to) return alert('Departure and arrival cities must be different');

    if (!isLoggedIn()) return alert('Please login or register first');

    const routeKey = `${from}-${to}`;
    localStorage.setItem('routeKey', routeKey);
    localStorage.setItem('bookingDetails', JSON.stringify({ from, to, numPeople }));
    let routeFlights = flightsData[routeKey] || flightsData['default'];

    const flightsList = document.getElementById('flights-list');
    const routeDisplay = document.getElementById('route-display');
    
    routeDisplay.textContent = `${from} → ${to} (${numPeople} persons)`;
    
    flightsList.innerHTML = routeFlights.map(f => `
        <div class="flight-card" onclick="selectFlight(this, '${f.date}', ${f.id})">
            <div class="flight-info">${f.time} (${f.duration})</div>
            <div class="flight-date">${f.date}</div>
            <div class="flight-price">${f.price} × ${numPeople}</div>
        </div>
    `).join('');
    
    document.getElementById('select-flight-btn').style.display = 'block';
    localStorage.setItem('bookingDetails', JSON.stringify({ from, to, numPeople }));
    
    showSection('timetable-section');
});

function selectFlight(card, date, id) {
    document.querySelectorAll('.flight-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    localStorage.setItem('selectedDate', date);
    localStorage.setItem('flightId', id.toString());
    document.getElementById('select-flight-btn').style.display = 'block';
}

function goToSeats() {
    if (!document.querySelector('.flight-card.selected')) {
        document.getElementById('timetable-error').textContent = 'Please select a flight first.';
        return;
    }
    const routeKey = localStorage.getItem('routeKey');
    const flightId = localStorage.getItem('flightId');
    const routeFlights = flightsData[routeKey] || flightsData['default'];
    window.selectedFlight = routeFlights.find(f => f.id.toString() === flightId);
    selectedSeats = [];
    showSection('seats-section');
}

function goToTimetable() {
    showSection('timetable-section');
}

document.getElementById('select-flight-btn').onclick = () => {
    if (!document.querySelector('.flight-card.selected')) return alert('اختر موعد الرحلة');
    
    const details = JSON.parse(localStorage.getItem('bookingDetails'));
    const date = localStorage.getItem('selectedDate');
    alert(`تم الحجز!\n${details.from} → ${details.to}\nالتاريخ: ${date}\n${details.numPeople} مسافر`);
    showSection('reservation-section');
    document.getElementById('reservation-form').reset();
};


document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const saved = JSON.parse(localStorage.getItem('user') || '{}');
    if (saved.email === email && saved.passwordHash === simpleHash(pass)) {
        localStorage.setItem('loggedInUser', 'true');
        showSection('reservation-section');
    } else {
        document.getElementById('login-error').textContent = 'خطأ في البيانات';
    }
});

document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm-password').value;
    if (pass !== confirm) return document.getElementById('reg-error').textContent = 'كلمات المرور غير متطابقة';
    if (localStorage.getItem('user')) return document.getElementById('reg-error').textContent = 'حساب موجود';
    
    localStorage.setItem('user', JSON.stringify({name, email, passwordHash: simpleHash(pass)}));
    localStorage.setItem('loggedInUser', 'true');
    showSection('reservation-section');
});

function isLoggedIn() {
    return localStorage.getItem('loggedInUser') === 'true';
}

document.addEventListener('DOMContentLoaded', () => {
    showSection('welcome-section');
    
    // Hide select-flight-btn initially
    const selectBtn = document.getElementById('select-flight-btn');
    if (selectBtn) selectBtn.style.display = 'none';
});

// Seats functionality
let selectedSeats = [];
let selectedFlight = null;
let availableSeats = [];

function generateSeats() {
    const grid = document.getElementById('seats-grid');
    const numNeeded = parseInt(localStorage.getItem('bookingDetails') ? JSON.parse(localStorage.getItem('bookingDetails')).numPeople : 1);
    document.getElementById('num-seats-needed').textContent = numNeeded;
    
    // Generate 7 seats
    const seats = Array.from({length: 7}, (_, i) => `Seat ${i+1}`);
    
    grid.innerHTML = seats.map(seat => `<button class="seat-btn" onclick="toggleSeat('${seat}')">${seat}</button>`).join('');
    
    const flightDetails = document.getElementById('flight-details');
    flightDetails.textContent = selectedFlight ? `${selectedFlight.time} - ${selectedFlight.price}` : '';
    
    document.getElementById('confirm-seats-btn').style.display = 'none';
}

function toggleSeat(seat) {
    const index = selectedSeats.indexOf(seat);
    const numNeeded = parseInt(localStorage.getItem('bookingDetails') ? JSON.parse(localStorage.getItem('bookingDetails')).numPeople : 1);
    
    if (index > -1) {
        selectedSeats.splice(index, 1);
        event.target.classList.remove('selected');
    } else if (selectedSeats.length < numNeeded) {
        selectedSeats.push(seat);
        event.target.classList.add('selected');
    } else {
    alert(`Maximum ${numNeeded} seats`);
    }
    
    const confirmBtn = document.getElementById('confirm-seats-btn');
    if (selectedSeats.length === numNeeded) {
        confirmBtn.style.display = 'block';
    } else {
        confirmBtn.style.display = 'none';
    }
}

function confirmSeats() {
    const details = JSON.parse(localStorage.getItem('bookingDetails'));
    const date = localStorage.getItem('selectedDate');
    alert(`تم الحجز!\n${details.from} → ${details.to}\n${selectedFlight.time}\nالتاريخ: ${date}\nالمقاعد: ${selectedSeats.join(', ')}\n${details.numPeople} مسافر`);
    showSection('reservation-section');
    document.getElementById('reservation-form').reset();
}

function goToSeats() {
    generateSeats();
}



import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, setDoc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global Firebase variables
let app, db, auth, userId, userName = 'ဧည့်သည် (Guest)', userPhone = ''; // Default values

// IMPORTANT: Replace this with YOUR OWN Firebase project configuration
// You can get this from your Firebase project settings -> "Your apps" -> Web app -> Config
// Without a valid configuration, Firebase features (like saving orders) will not work.
const firebaseConfig = {
    // Paste your Firebase config object here, e.g.:
    // apiKey: "YOUR_API_KEY_GOES_HERE",
    // authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    // projectId: "YOUR_PROJECT_ID",
    // storageBucket: "YOUR_PROJECT_ID.appspot.com",
    // messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    // appId: "YOUR_APP_ID"
};


// --- Firebase Initialization ---
async function initializeFirebase() {
    // Check if firebaseConfig is empty or missing essential keys
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.error("Firebase config is missing or incomplete. Please provide your Firebase project's configuration.");
        document.getElementById('displayUserId').textContent = "Firebase အမှား (Config မပြည့်စုံပါ)"; // Config incomplete
        // Proceed with UI display but without Firebase functionality
        document.getElementById('main-content').classList.remove('hidden');
        window.showTab('main-dashboard-section');
        return;
    }

    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Sign in anonymously for a unique user ID without explicit login
        await signInAnonymously(auth);

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                // Attempt to load profile if it exists, otherwise use defaults
                const userDocRef = doc(db, `artifacts/${getAppIdFromFirebaseConfig()}/users/${userId}/profile`, 'info');
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    userName = userData.name || 'ဧည့်သည် (Guest)';
                    userPhone = userData.phone || '';
                }
                
                document.getElementById('displayUserId').textContent = userId;
                window.loadOrderQuantities();
                document.getElementById('main-content').classList.remove('hidden');
                window.showTab('main-dashboard-section'); // Show main dashboard by default
                window.displayOrderRecords(); // Start listening for records
            } else {
                console.error("No user after authentication attempt, falling back to guest ID.");
                userId = crypto.randomUUID(); // Fallback for safety
                document.getElementById('displayUserId').textContent = userId + " (ဧည့်သည်)";
                window.loadOrderQuantities();
                document.getElementById('main-content').classList.remove('hidden');
                window.showTab('main-dashboard-section'); // Show main dashboard by default
                window.displayOrderRecords(); // Start listening for records
            }
            console.log("Firebase initialized. User ID:", userId);
        });

    } catch (error) {
        console.error("Error initializing Firebase or signing in:", error);
        document.getElementById('displayUserId').textContent = "အမှား (Firebase Error)";
        document.getElementById('main-content').classList.remove('hidden');
        window.showTab('main-dashboard-section');
    }
}

// Helper to get app ID for Firestore paths (using projectId from config)
function getAppIdFromFirebaseConfig() {
    return firebaseConfig.projectId; // Using projectId as appId for Firestore path
}

// --- User Profile Management (now handled by contact form submission) ---
window.saveUserProfile = async function(name, email, phone) { // Modified to accept email and phone
    if (!db || !userId) {
        console.error("Cannot save profile: DB or User ID not available.");
        return;
    }
    try {
        const userDocRef = doc(db, `artifacts/${getAppIdFromFirebaseConfig()}/users/${userId}/profile`, 'info');
        await setDoc(userDocRef, { name: name, email: email, phone: phone }, { merge: true });
        userName = name;
        userPhone = phone;
        console.log("User profile saved/updated:", userName, userPhone);
    } catch (e) {
        console.error("Error saving user profile:", e);
    }
}

// --- UI Visibility & Modals ---
window.openModal = function(title, message, buttons = [{ text: 'နားလည်ပါပြီ', action: 'window.closeModal()' }]) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').innerHTML = message;

    const modalButtonsDiv = document.getElementById('modalButtons');
    modalButtonsDiv.innerHTML = '';

    buttons.forEach(btn => {
        const buttonElement = document.createElement('button');
        buttonElement.textContent = btn.text;
        buttonElement.className = 'btn-elegant text-sm px-6 py-3';
        if (btn.styleClass) {
            buttonElement.classList.add(...btn.styleClass.split(' '));
        }
        buttonElement.onclick = new Function(btn.action);
        modalButtonsDiv.appendChild(buttonElement);
    });

    document.getElementById('customModalOverlay').classList.add('active');
}

window.closeModal = function() {
    document.getElementById('customModalOverlay').classList.remove('active');
}

window.showLoading = function() {
    document.getElementById('loadingOverlay').classList.add('active');
}

window.hideLoading = function() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

// --- Tab Switching Logic ---
window.showTab = function(tabId) {
    document.querySelectorAll('.tab-content-section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(tabId).classList.remove('hidden');

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${tabId}`) {
            link.classList.add('active');
        }
    });

    if (tabId === 'order-records-section') {
        window.displayOrderRecords();
    }
}

// --- Order Quantity Management ---
window.saveOrderQuantities = function() {
    const orderData = {
        '20ml': parseInt(document.getElementById('customerOrder20ml').value),
        '80ml': parseInt(document.getElementById('customerOrder80ml').value),
        '20l': parseInt(document.getElementById('customerOrder20l').value)
    };
    localStorage.setItem('customerOrderQuantities_' + userId, JSON.stringify(orderData));
}

window.loadOrderQuantities = function() {
    const savedData = localStorage.getItem('customerOrderQuantities_' + userId);
    if (savedData) {
        const orderData = JSON.parse(savedData);
        document.getElementById('customerOrder20ml').value = orderData['20ml'];
        document.getElementById('customerOrder80ml').value = orderData['80ml'];
        document.getElementById('customerOrder20l').value = orderData['20l'];
    } else {
        document.getElementById('customerOrder20ml').value = 0;
        document.getElementById('customerOrder80ml').value = 0;
        document.getElementById('customerOrder20l').value = 0;
    }
}

// --- Send Order Logic with Confirmation ---
window.sendOrderLogic = async function(productId, productName, orderQuantity) {
    window.closeModal();
    if (!db || !userId) {
        window.openModal("အမှား", "ဒေတာဘေ့စ်ကို ချိတ်ဆက်၍မရပါ (Database connection error)။ ကျေးဇူးပြု၍ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။");
        return;
    }

    window.showLoading();

    try {
        const timestamp = new Date();
        const docRef = await addDoc(collection(db, `artifacts/${getAppIdFromFirebaseConfig()}/public/data/customerOrders`), {
            userId: userId,
            userName: userName,
            userPhone: userPhone,
            productId: productId,
            productName: productName,
            orderQuantity: orderQuantity,
            timestamp: timestamp,
            message: `${userName} (ဖုန်းနံပါတ်: ${userPhone || 'မသိရှိ'}) မှ ${productName} (${orderQuantity} ${getUnit(productId)}) ကို မှာယူပါသည်`
        });
        console.log("Order written with ID: ", docRef.id);
        window.openModal(
            "မှာယူမှုလက်ခံရရှိပါပြီ",
            `သင့်၏ ${productName} (${orderQuantity} ${getUnit(productId)}) မှာယူမှုကို လက်ခံရရှိပါပြီ။ မိုင်ဆွန်ခ အဖွဲ့မှ မကြာမီ ဆက်သွယ်ပါလိမ့်မည်။
            <br><br><strong>မှာယူသည့်အချိန်:</strong> ${timestamp.toLocaleString('my-MM')}`
        );
        window.saveOrderQuantities();
    } catch (e) {
        console.error("Error adding document: ", e);
        window.openModal("အမှား", `မှာယူမှု ပေးပို့ရာတွင် အမှားအယွင်း ဖြစ်ပွားခဲ့ပါသည်။ ကျေးဇူးပြု၍ ထပ်မံကြိုးစားပါ။ (Error sending order. Please try again.)<br><br>အသေးစိတ်: ${e.message}`);
    } finally {
        window.hideLoading();
    }
}

// Helper to get unit name
function getUnit(productId) {
    if (productId === '20l') return 'ပုံး';
    return 'ပုလင်း';
}

// Main function to trigger order confirmation
window.confirmAndSendOrder = function(productId, productName, unit) {
    const orderQuantity = parseInt(document.getElementById(`customerOrder${productId}`).value);

    if (orderQuantity <= 0) {
        window.openModal("သတိပေးချက်", "ကျေးဇူးပြု၍ မှာယူလိုသော ပမာဏကို ထည့်သွင်းပါ။");
        return;
    }

    const message = `သင်၏ ${productName} ပမာဏ ${orderQuantity} ${unit} ဖြစ်ကြောင်း မိုင်ဆွန်ခ စက်ရုံသို့ မှာယူရန် အတည်ပြုလိုပါသလား။`;

    window.openModal(
        "မှာယူမှု အတည်ပြုပါ",
        message,
        [
            { text: 'အတည်ပြုသည်', action: `window.sendOrderLogic('${productId}', '${productName}', ${orderQuantity})` },
            { text: 'မလုပ်တော့ပါ', action: 'window.closeModal()', styleClass: 'bg-gray-500 hover:bg-gray-600 border-gray-500 hover:border-gray-600' }
        ]
    );
};

// --- Display Order Records ---
window.displayOrderRecords = function() {
    const orderRecordsListDiv = document.getElementById('orderRecordsList');
    orderRecordsListDiv.innerHTML = '<p class="text-center text-gray-500">မှာယူမှုမှတ်တမ်းများကို ဆွဲယူနေပါသည်။...</p>'; // Loading message

    if (!db || !userId) {
        orderRecordsListDiv.innerHTML = '<p class="text-center text-red-500">ဒေတာဘေ့စ်ကို ချိတ်ဆက်၍မရပါ သို့မဟုတ် အသုံးပြုသူအချက်အလက် မရရှိပါ။</p>';
        return;
    }

    const q = query(
        collection(db, `artifacts/${getAppIdFromFirebaseConfig()}/public/data/customerOrders`),
        where("userId", "==", userId)
    );

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            orderRecordsListDiv.innerHTML = '<p class="text-center text-gray-500">မှာယူမှုမှတ်တမ်း မရှိသေးပါ။</p>';
            return;
        }

        const records = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            records.push({ id: doc.id, ...data });
        });

        records.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());

        orderRecordsListDiv.innerHTML = ''; // Clear previous records

        records.forEach(record => {
            const recordDate = record.timestamp ? record.timestamp.toDate().toLocaleString('my-MM') : 'မသိရှိ (Unknown)';
            const orderCard = `
                <div class="card-elegant p-6 flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
                    <div>
                        <p class="text-lg font-semibold text-gray-800">${record.productName}</p>
                        <p class="text-md text-gray-700">မှာယူသော ပမာဏ: <strong class="text-blue-700">${record.orderQuantity} ${getUnit(record.productId)}</strong></p>
                        <p class="text-sm text-gray-500">မှာယူသည့်အချိန်: ${recordDate}</p>
                    </div>
                    <div class="flex-shrink-0">
                        <span class="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">လက်ခံရရှိပြီ</span>
                    </div>
                </div>
            `;
            orderRecordsListDiv.insertAdjacentHTML('beforeend', orderCard);
        });
    }, (error) => {
        console.error("Error fetching order records:", error);
        orderRecordsListDiv.innerHTML = '<p class="text-center text-red-500">မှာယူမှုမှတ်တမ်းများကို ဆွဲယူရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။</p>';
    });
};

// --- Event Listener ---
document.addEventListener('DOMContentLoaded', () => {
    initializeFirebase();

    // Handle contact form submission to save user profile (name, email, phone) and send message
    document.getElementById('contactForm').addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission
        const nameInput = document.getElementById('contact-name');
        const emailInput = document.getElementById('contact-email');
        const phoneInput = document.getElementById('contact-phone');
        const messageInput = document.getElementById('contact-message');

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const phone = phoneInput.value.trim();
        const message = messageInput.value.trim();

        if (!name || !email || !message) {
            window.openModal("အမှား", "ကျေးဇူးပြု၍ အမည်၊ အီးမေးလ်နှင့် မက်ဆေ့ချ် အပြည့်အစုံ ထည့်သွင်းပါ။");
            return;
        }

        // Save user profile info
        await window.saveUserProfile(name, email, phone);

        // Optionally, send the contact message to a separate Firestore collection or an external service
        if (db) {
            try {
                await addDoc(collection(db, `artifacts/${getAppIdFromFirebaseConfig()}/public/data/contactMessages`), {
                    userId: userId,
                    userName: userName,
                    userEmail: email,
                    userPhone: userPhone,
                    message: message,
                    timestamp: new Date()
                });
                window.openModal("အောင်မြင်ပါသည်", "သင်၏ မက်ဆေ့ချ်ကို လက်ခံရရှိပါပြီ။ မိုင်ဆွန်ခ အဖွဲ့မှ မကြာမီ ဆက်သွယ်ပါလိမ့်မည်။");
                // Clear the form
                nameInput.value = '';
                emailInput.value = '';
                phoneInput.value = '';
                messageInput.value = '';
            } catch (e) {
                console.error("Error sending contact message:", e);
                window.openModal("အမှား", `မက်ဆေ့ချ် ပေးပို့ရာတွင် အမှားအယွင်း ဖြစ်ပွားခဲ့ပါသည်။ ကျေးဇူးပြု၍ ထပ်မံကြိုးစားပါ။ <br><br>အသေးစိတ်: ${e.message}`);
            }
        } else {
            window.openModal("အမှား", "Firebase ချိတ်ဆက်မှု မရှိပါက မက်ဆေ့ချ် ပေးပို့၍မရပါ။");
        }
    });
});

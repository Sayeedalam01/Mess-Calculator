const MEMBERS = ["Sayeed", "Saklain", "Shishir", "Farhan"];
const ADMIN_ID = "Sayeed";
// <<<<< আপনার Web App URL এখানে দিন >>>>>
const API_ENDPOINT = https://script.google.com/macros/s/AKfycbwTlTqtlYo-jKOAt3DeRJPUJIAPuQkQhLW24P5vQvlVwOdR7-npsm5kIOS4Y3z5JlBmHQ/exec; 

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('bn-BD', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    updateUI(); 
});

// --- UI AND AUTHENTICATION ---

function updateUI() {
    const role = document.getElementById('user-role').value;
    const isSayeed = (role === ADMIN_ID);
    
    document.getElementById('bazar-entry').style.display = isSayeed ? 'block' : 'none';
    document.getElementById('admin-panel').style.display = isSayeed ? 'block' : 'none';
    document.getElementById('all-entries-view').style.display = 'none'; 
    document.getElementById('meal-entry').style.display = 'block';
}

// --- API FUNCTIONS ---

async function fetchData(sheetName) {
    try {
        const response = await fetch(`${API_ENDPOINT}?sheet=${sheetName}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    } catch (error) {
        alert('ডেটা লোড করতে সমস্যা হয়েছে: ' + error.message);
        console.error('Fetch error:', error);
        return [];
    }
}

async function postData(sheetName, data) {
    const role = document.getElementById('user-role').value;
    data.isAdmin = (role === ADMIN_ID);
    
    try {
        const response = await fetch(`${API_ENDPOINT}?sheet=${sheetName}`, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', // Important for Apps Script POST
            }
        });
        const result = await response.json();
        
        if (result.status === 'error') {
            alert(result.message); // Displays the "already logged" message from Apps Script
            return false;
        }
        return true;
        
    } catch (error) {
        alert('ডেটা সেভ করতে সমস্যা হয়েছে: ' + error.message);
        console.error('Post error:', error);
        return false;
    }
}

// --- MEAL ENTRY ---

async function addMealEntry() {
    const member = document.getElementById('meal-member-select').value;
    const count = parseFloat(document.getElementById('meal-count').value);
    
    if (isNaN(count) || count <= 0) {
        alert("সঠিক মিল সংখ্যা দিন।");
        return;
    }
    
    const mealData = { member, count };
    const success = await postData('Meals', mealData);
    
    if (success) {
        alert(`${member}-এর জন্য ${count} মিল যোগ করা হলো।`);
        document.getElementById('meal-count').value = '1';
    }
}

// --- EXPENSE ENTRY (Bazar/Utility) ---

async function addExpense() {
    const member = document.getElementById('bazar-member-select').value;
    const amount = parseFloat(document.getElementById('bazar-amount').value);
    const note = document.getElementById('bazar-note').value.trim();
    
    if (isNaN(amount) || amount <= 0) {
        alert("সঠিক টাকার পরিমাণ দিন।");
        return;
    }
    
    const expenseData = { member, amount, note };
    const success = await postData('Expenses', expenseData);
    
    if (success) {
        alert(`${member}-এর জন্য ${amount} টাকা খরচ যোগ করা হলো (${note})।`);
        document.getElementById('bazar-amount').value = '';
        document.getElementById('bazar-note').value = '';
    }
}

// --- CALCULATION LOGIC (Uses Fetched Data) ---

async function calculateMonthlyBill() {
    document.getElementById('total-stats').textContent = "হিসাব করা হচ্ছে... ⏳";
    
    const allMeals = await fetchData('Meals');
    const allExpenses = await fetchData('Expenses');
    
    if (allMeals.length === 0 && allExpenses.length === 0) {
         document.getElementById('total-stats').textContent = "কোনো এন্ট্রি নেই, হিসাব করা সম্ভব নয়।";
         document.getElementById('balance-result').textContent = "";
         return;
    }

    // 1. Calculate Total Bazar, Total Utility, Total Meals, and Per-Person contributions
    let totalBazar = 0;
    let totalUtility = 0;
    let totalMeals = 0;
    
    const memberData = {};
    MEMBERS.forEach(m => memberData[m] = { bazar: 0, utility: 0, meals: 0, totalPaid: 0, totalCost: 0, balance: 0 });
    
    // Group Expenses
    allExpenses.forEach(exp => {
        const amount = parseFloat(exp.Amount);
        const member = exp.Member;
        
        if (exp.Type === 'Bazar') {
            totalBazar += amount;
            memberData[member].bazar += amount;
        } else if (exp.Type === 'Utility') {
            totalUtility += amount;
            memberData[member].utility += amount;
        }
        memberData[member].totalPaid += amount;
    });
    
    // Group Meals
    allMeals.forEach(meal => {
        const count = parseFloat(meal.Count);
        const member = meal.Member;
        totalMeals += count;
        memberData[member].meals += count;
    });
    
    if (totalMeals === 0) {
        document.getElementById('total-stats').textContent = "কোনো মিল এন্ট্রি হয়নি, হিসাব করা সম্ভব নয়।";
        document.getElementById('balance-result').textContent = "";
        return;
    }
    
    const mealRate = totalBazar / totalMeals;
    const utilityPerPerson = totalUtility / MEMBERS.length;
    
    // 2. Calculate Final Balance for each member
    let resultText = "";
    MEMBERS.forEach(member => {
        const data = memberData[member];
        const mealCost = data.meals * mealRate;
        const totalCost = mealCost + utilityPerPerson;
        const balance = data.totalPaid - totalCost; // Paid - Cost = Balance
        
        data.totalCost = totalCost;
        data.balance = balance;
        
        const status = balance > 0 ? "পাবে (Will Get)" : (balance < 0 ? "দিবে (Will Pay)" : "হিসাব সমান");
        
        resultText += `${member}:\n` +
                      `  মোট মিল: ${data.meals}টি\n` +
                      `  মোট বাজার খরচ: ${data.bazar.toFixed(2)} টাকা\n` +
                      `  মোট ইউটিলিটি খরচ: ${data.utility.toFixed(2)} টাকা\n` +
                      `  মোট পরিশোধ: ${data.totalPaid.toFixed(2)} টাকা\n` +
                      `  মোট খরচ (মিল + ইউটিলিটি): ${totalCost.toFixed(2)} টাকা\n` +
                      `  **ব্যালেন্স: ${Math.abs(balance).toFixed(2)} টাকা → ${status}**\n\n`;
    });
    
    // 3. Display Results
    document.getElementById('total-stats').innerHTML = 
        `সর্বমোট বাজার: **${totalBazar.toFixed(2)} টাকা**<br>` +
        `সর্বমোট ইউটিলিটি: **${totalUtility.toFixed(2)} টাকা**<br>` +
        `সর্বমোট মিল: **${totalMeals}টি**<br>` +
        `**মিল রেট: ${mealRate.toFixed(2)} টাকা/মিল**`;
        
    document.getElementById('balance-result').textContent = resultText;
}

// --- ADMIN FEATURES ---

async function showAllEntries() {
    const meals = await fetchData('Meals');
    const expenses = await fetchData('Expenses');
    const listElement = document.getElementById('entries-list');
    listElement.innerHTML = '';
    
    // Prepare for combined display (for now, display separately for simplicity)
    const allEntries = [];
    
    meals.forEach(e => allEntries.push({ date: e.Date, member: e.Member, text: `মিল: ${e.Count}টি`, timestamp: e.Timestamp }));
    expenses.forEach(e => allEntries.push({ date: e.Date, member: e.Member, text: `${e.Type} খরচ: ${e.Amount} টাকা (${e.Note})`, timestamp: new Date(e.Date).getTime() }));

    allEntries.sort((a, b) => b.timestamp - a.timestamp); // Sort by newest (using timestamp where available)
    
    if (allEntries.length === 0) {
        listElement.innerHTML = '<li>কোনো এন্ট্রি নেই।</li>';
        document.getElementById('all-entries-view').style.display = 'block';
        return;
    }
    
    allEntries.forEach(entry => {
        const listItem = document.createElement('li');
        listItem.textContent = `[${entry.date}] - ${entry.member}: ${entry.text}`;
        listElement.appendChild(listItem);
    });

    document.getElementById('all-entries-view').style.display = 'block';
}

function resetData() {
    alert("Google Sheets-এ ডেটা রিসেট করার জন্য Apps Script-এ একটি DELETE ফাংশন তৈরি করতে হবে, যা নিরাপত্তার কারণে এই সহজ কাঠামোতে অন্তর্ভুক্ত করা হয়নি। আপনি সরাসরি Google Sheet থেকে ডেটা (Header বাদে বাকি রো গুলো) ম্যানুয়ালি মুছে দিন।");
}

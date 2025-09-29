const MEMBERS = ["Sayeed", "Saklain", "Shishir", "Farhan"];
const ADMIN_ID = "sayeed"; // Admin/Manager is Sayeed
const STORAGE_KEY_MEALS = 'messMealsData';
const STORAGE_KEY_EXPENSES = 'messExpensesData';

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('bn-BD', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    updateUI(); // Set initial view based on default role
});

// --- UI AND AUTHENTICATION ---

function updateUI() {
    const role = document.getElementById('user-role').value;
    const isSayeed = (role === ADMIN_ID);
    const isMember = (role === 'member');
    
    document.getElementById('bazar-entry').style.display = isSayeed ? 'block' : 'none';
    document.getElementById('admin-panel').style.display = isSayeed ? 'block' : 'none';
    document.getElementById('all-entries-view').style.display = 'none'; // Hide entry list initially
    
    // Member Meal Entry (Everyone can enter their own)
    document.getElementById('meal-entry').style.display = 'block';
    
    // In a real system, you'd use a password/proper login. Here we use a simple dropdown.
    if (isMember) {
        // A member can only enter their own meal (simple version)
        const select = document.getElementById('meal-member-select');
        select.innerHTML = '';
        const selectedMember = MEMBERS.find(m => m === getMemberFromDropdown(role)); // Assuming 'member' role is general
        
        // Simple authentication: If "member" is selected, they can select anyone to log.
        // For a tighter structure: Only let them log their name, but for this simple setup, let them choose.
        MEMBERS.forEach(member => {
             const option = document.createElement('option');
             option.value = member;
             option.textContent = member;
             select.appendChild(option);
        });
    }
}

// Helper to get the member name from the selected dropdown role (simple auth)
function getMemberFromDropdown(role) {
    if (role === ADMIN_ID) return 'Sayeed';
    // In a real system, you'd know the user's name from their login.
    return document.getElementById('meal-member-select').value;
}

// --- DATA MANAGEMENT (Local Storage) ---

function getMeals() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_MEALS) || '[]');
}

function getExpenses() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_EXPENSES) || '[]');
}

function saveMeals(data) {
    localStorage.setItem(STORAGE_KEY_MEALS, JSON.stringify(data));
}

function saveExpenses(data) {
    localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(data));
}

// --- MEAL ENTRY ---

function addMealEntry() {
    const member = document.getElementById('meal-member-select').value;
    const count = parseFloat(document.getElementById('meal-count').value);
    
    if (isNaN(count) || count <= 0) {
        alert("সঠিক মিল সংখ্যা দিন।");
        return;
    }
    
    const meals = getMeals();
    const today = new Date().toDateString();
    
    // Check if meal for this member has already been logged today by a NON-ADMIN (as per your rule)
    // NOTE: This is a simplified check. A proper system would need more robust tracking.
    // For now: Sayeed (admin) can edit/add any meal, members cannot edit their own on the same day if one exists.
    
    const existingEntryIndex = meals.findIndex(e => e.member === member && e.date === today);
    const role = document.getElementById('user-role').value;
    
    if (existingEntryIndex !== -1) {
        if (role === ADMIN_ID) {
            // Admin can overwrite/edit (Simplification: we'll overwrite)
            meals[existingEntryIndex].count = count;
            alert(`${member}-এর আজকের মিল এন্ট্রি পরিবর্তন করা হয়েছে (এডমিন দ্বারা)।`);
        } else {
            alert(`${member} আপনি আজকের মিল (${meals[existingEntryIndex].count}) ইতিমধ্যে যোগ করেছেন। এটি শুধুমাত্র এডমিন পরিবর্তন করতে পারবে।`);
            return;
        }
    } else {
        // New entry
        meals.push({
            member: member,
            count: count,
            date: today,
            timestamp: Date.now()
        });
        alert(`${member}-এর জন্য ${count} মিল যোগ করা হলো।`);
    }

    saveMeals(meals);
    document.getElementById('meal-count').value = '1';
}

// --- EXPENSE ENTRY (Bazar/Utility) ---

function addExpense() {
    const member = document.getElementById('bazar-member-select').value;
    const amount = parseFloat(document.getElementById('bazar-amount').value);
    const note = document.getElementById('bazar-note').value.trim();
    
    if (isNaN(amount) || amount <= 0) {
        alert("সঠিক টাকার পরিমাণ দিন।");
        return;
    }
    
    const expenses = getExpenses();
    
    expenses.push({
        member: member,
        amount: amount,
        note: note,
        type: note.toLowerCase().includes('utility') || note.toLowerCase().includes('bill') ? 'Utility' : 'Bazar',
        date: new Date().toDateString(),
        timestamp: Date.now()
    });
    
    saveExpenses(expenses);
    alert(`${member}-এর জন্য ${amount} টাকা খরচ যোগ করা হলো (${note})।`);

    document.getElementById('bazar-amount').value = '';
    document.getElementById('bazar-note').value = '';
}

// --- CALCULATION LOGIC ---

function calculateMonthlyBill() {
    const allMeals = getMeals();
    const allExpenses = getExpenses();
    
    // 1. Calculate Total Bazar, Total Utility, Total Meals, and Per-Person contributions
    let totalBazar = 0;
    let totalUtility = 0;
    let totalMeals = 0;
    
    const memberData = {};
    MEMBERS.forEach(m => memberData[m] = { bazar: 0, utility: 0, meals: 0, totalPaid: 0, totalCost: 0, balance: 0 });
    
    // Group Expenses
    allExpenses.forEach(exp => {
        if (exp.type === 'Bazar') {
            totalBazar += exp.amount;
            memberData[exp.member].bazar += exp.amount;
        } else if (exp.type === 'Utility') {
            totalUtility += exp.amount;
            memberData[exp.member].utility += exp.amount;
        }
        memberData[exp.member].totalPaid += exp.amount;
    });
    
    // Group Meals
    allMeals.forEach(meal => {
        totalMeals += meal.count;
        memberData[meal.member].meals += meal.count;
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

function showAllEntries() {
    const meals = getMeals();
    const expenses = getExpenses();
    const listElement = document.getElementById('entries-list');
    listElement.innerHTML = '';
    
    const allEntries = [...meals, ...expenses].sort((a, b) => b.timestamp - a.timestamp); // Combine and sort by newest
    
    if (allEntries.length === 0) {
        listElement.innerHTML = '<li>কোনো এন্ট্রি নেই।</li>';
        document.getElementById('all-entries-view').style.display = 'block';
        return;
    }
    
    allEntries.forEach(entry => {
        const listItem = document.createElement('li');
        let text = `[${entry.date}] - ${entry.member}: `;
        
        if (entry.count !== undefined) {
            text += `মিল: ${entry.count}টি`;
        } else if (entry.amount !== undefined) {
            text += `${entry.type} খরচ: ${entry.amount.toFixed(2)} টাকা (${entry.note})`;
        }
        
        listItem.textContent = text;
        listElement.appendChild(listItem);
    });

    document.getElementById('all-entries-view').style.display = 'block';
}

function resetData() {
    if (confirm("আপনি কি নিশ্চিত? মাস শেষে সম্পূর্ণ ডেটা (মিল ও খরচ) রিসেট হবে। এই প্রক্রিয়া ফিরিয়ে আনা যাবে না।")) {
        localStorage.removeItem(STORAGE_KEY_MEALS);
        localStorage.removeItem(STORAGE_KEY_EXPENSES);
        alert("ডেটা সফলভাবে রিসেট করা হয়েছে! নতুন মাস শুরু করুন।");
        document.getElementById('total-stats').textContent = "";
        document.getElementById('balance-result').textContent = "";
        document.getElementById('entries-list').innerHTML = "";
    }
}

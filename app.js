// Bhanu's YOLO Daily Tracker - Main Application
class TaskTracker {
    constructor() {
        this.tasks = [];
        this.currentView = 'kanban';
        this.filterType = 'day';
        this.filterDate = new Date().toISOString().split('T')[0];
        this.currentUser = null;
        this.unsubscribe = null; // Firestore listener
        this.draggedTaskId = null;
        this.heatmapYear = new Date().getFullYear();
        this.heatmapMonth = 'all';

        // Clean up old localStorage key (migration from previous version)
        localStorage.removeItem('yolo_tasks');

        this.init();
    }

    async init() {
        // Set current date display
        this.updateCurrentDate();

        // Set filter date to today
        document.getElementById('filterDate').value = this.filterDate;

        // Setup date input validation
        this.setupDateValidation();

        // Initialize heatmap year dropdown
        this.initHeatmapYearDropdown();

        // Setup auth listener if Firebase is configured
        if (window.firebaseConfig && window.firebaseConfig.isConfigured) {
            // Hide auth section until we know auth state (prevents flicker)
            document.getElementById('authSection').style.opacity = '0';
            this.setupAuthListener();
            // Don't render until auth state is known - setupAuthListener will handle it
        } else {
            // Load from localStorage (offline mode)
            this.loadFromLocalStorage();
            document.getElementById('loginBtn').innerHTML = '<span>☁️</span> Offline Mode';
            document.getElementById('loginBtn').disabled = true;
            document.getElementById('loginBtn').style.opacity = '0.6';
            // Render heatmap and tasks
            this.renderHeatmap();
            this.render();
        }

        // Close export menu on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.export-dropdown')) {
                document.getElementById('exportMenu').classList.add('hidden');
            }
        });

        // Heatmap tooltip edge detection
        this.setupHeatmapTooltips();
    }

    setupHeatmapTooltips() {
        // Delegate mouse events for heatmap days
        document.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('heatmap-day')) {
                const rect = e.target.getBoundingClientRect();
                const containerRect = document.getElementById('heatmapContainer').getBoundingClientRect();

                // Remove existing position classes
                e.target.classList.remove('tooltip-left', 'tooltip-right', 'tooltip-bottom');

                // Check if near top edge (first 2 rows - within ~35px from top)
                if (rect.top - containerRect.top < 35) {
                    e.target.classList.add('tooltip-bottom');
                }

                // Check if near left edge (first 2 weeks)
                if (rect.left - containerRect.left < 100) {
                    e.target.classList.add('tooltip-left');
                }
                // Check if near right edge (last 2 weeks)
                else if (containerRect.right - rect.right < 100) {
                    e.target.classList.add('tooltip-right');
                }
            }
        });
    }

    setupDateValidation() {
        // Validate date inputs to prevent invalid years (more than 4 digits)
        const dateInputs = document.querySelectorAll('input[type="date"]');
        dateInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                if (value) {
                    const year = value.split('-')[0];
                    if (year && year.length > 4) {
                        // Truncate to 4 digits
                        const correctedYear = year.substring(0, 4);
                        const parts = value.split('-');
                        parts[0] = correctedYear;
                        e.target.value = parts.join('-');
                    }
                }
            });

            // Also validate on change
            input.addEventListener('change', (e) => {
                const value = e.target.value;
                if (value) {
                    const year = parseInt(value.split('-')[0]);
                    if (year > 9999) {
                        e.target.value = '';
                        alert('Please enter a valid 4-digit year (e.g., 2026)');
                    }
                }
            });
        });
    }

    initHeatmapYearDropdown() {
        const yearSelect = document.getElementById('heatmapYear');
        const currentYear = new Date().getFullYear();

        // Get all years from tasks, plus current year
        const years = new Set([currentYear]);
        this.tasks.forEach(task => {
            const taskYear = new Date(task.date).getFullYear();
            if (taskYear >= 2020 && taskYear <= 2100) {
                years.add(taskYear);
            }
        });

        // Sort years descending
        const sortedYears = Array.from(years).sort((a, b) => b - a);

        yearSelect.innerHTML = sortedYears.map(year =>
            `<option value="${year}" ${year === this.heatmapYear ? 'selected' : ''}>${year}</option>`
        ).join('');
    }

    setupAuthListener() {
        window.firebaseConfig.auth.onAuthStateChanged((user) => {
            this.currentUser = user;

            // Show auth section now that we know the state (fixes flicker)
            document.getElementById('authSection').style.opacity = '1';
            this.updateAuthUI();

            if (user) {
                // Logged in - sync with Firestore
                this.setupFirestoreListener();
            } else {
                // Logged out - unsubscribe from Firestore
                if (this.unsubscribe) {
                    this.unsubscribe();
                    this.unsubscribe = null;
                }

                // Load localStorage data (guest mode)
                // This shows tasks saved locally before login or offline
                this.loadFromLocalStorage();
                this.initHeatmapYearDropdown();
                this.render();
                this.renderHeatmap();
            }
        });
    }

    updateAuthUI() {
        const loginBtn = document.getElementById('loginBtn');
        const userInfo = document.getElementById('userInfo');
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const appTitle = document.getElementById('appTitle');

        if (this.currentUser) {
            loginBtn.classList.add('hidden');
            userInfo.classList.remove('hidden');
            userAvatar.src = this.currentUser.photoURL || '';
            userName.textContent = this.currentUser.displayName || this.currentUser.email;

            // Update app title with user's first name
            const firstName = this.currentUser.displayName
                ? this.currentUser.displayName.split(' ')[0]
                : 'User';
            appTitle.textContent = `🚀 ${firstName}'s YOLO Daily Tracker`;
            document.title = `${firstName}'s YOLO Daily Tracker`;
        } else {
            loginBtn.classList.remove('hidden');
            userInfo.classList.add('hidden');

            // Reset to default title
            appTitle.textContent = "🚀 Bhanu's YOLO Daily Tracker";
            document.title = "Bhanu's YOLO Daily Tracker";
        }
    }

    setupFirestoreListener() {
        const db = window.firebaseConfig.db;
        const userId = this.currentUser.uid;

        // Show sync status
        this.showSyncStatus();

        // Listen for real-time updates
        this.unsubscribe = db.collection('users').doc(userId).collection('tasks')
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                this.tasks = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Note: We don't save Firebase data to localStorage
                // This keeps each user's cloud data private and separate from guest data

                // Update year dropdown with new data
                this.initHeatmapYearDropdown();

                this.hideSyncStatus();
                this.render();
                this.renderHeatmap();
            }, (error) => {
                console.error('Firestore error:', error);
                this.hideSyncStatus();
                // Fall back to localStorage only on error
                this.loadFromLocalStorage();
                this.render();
            });
    }

    showSyncStatus() {
        document.getElementById('syncStatus').classList.remove('hidden');
    }

    hideSyncStatus() {
        document.getElementById('syncStatus').classList.add('hidden');
    }

    updateCurrentDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('currentDate').textContent =
            new Date().toLocaleDateString('en-US', options);
    }

    loadFromLocalStorage() {
        // Use separate key for guest tasks (not mixed with logged-in data)
        this.tasks = JSON.parse(localStorage.getItem('yolo_guest_tasks')) || [];
        // Update year dropdown after loading
        this.initHeatmapYearDropdown();
    }

    saveToLocalStorage() {
        // Only save when NOT logged in (guest mode)
        localStorage.setItem('yolo_guest_tasks', JSON.stringify(this.tasks));
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    async save() {
        if (this.currentUser && window.firebaseConfig.isConfigured) {
            // Sync is handled by Firestore listener
        } else {
            this.saveToLocalStorage();
        }
    }

    getFilteredTasks() {
        const filterDate = document.getElementById('filterDate').value;
        const filterType = document.getElementById('filterType').value;

        if (filterType === 'all') {
            return this.tasks;
        }

        const targetDate = new Date(filterDate);

        return this.tasks.filter(task => {
            const taskDate = new Date(task.date);

            switch (filterType) {
                case 'day':
                    return task.date === filterDate;

                case 'week':
                    const weekStart = new Date(targetDate);
                    weekStart.setDate(targetDate.getDate() - targetDate.getDay());
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    return taskDate >= weekStart && taskDate <= weekEnd;

                case 'month':
                    return taskDate.getMonth() === targetDate.getMonth() &&
                        taskDate.getFullYear() === targetDate.getFullYear();

                default:
                    return true;
            }
        });
    }

    async addTask(taskData) {
        const task = {
            id: this.generateId(),
            title: taskData.title,
            date: taskData.date,
            status: taskData.status,
            hours: parseFloat(taskData.hours) || 0,
            notes: taskData.notes || '',
            createdAt: new Date().toISOString()
        };

        if (this.currentUser && window.firebaseConfig.isConfigured) {
            // Add to Firestore
            this.showSyncStatus();
            try {
                const db = window.firebaseConfig.db;
                await db.collection('users').doc(this.currentUser.uid)
                    .collection('tasks').doc(task.id).set(task);
            } catch (error) {
                console.error('Error adding task:', error);
                // Fall back to local
                this.tasks.push(task);
                this.saveToLocalStorage();
                this.render();
            }
        } else {
            this.tasks.push(task);
            this.saveToLocalStorage();
            this.render();
        }

        this.initHeatmapYearDropdown();
        this.renderHeatmap();
    }

    async updateTask(id, taskData) {
        const updatedTask = {
            title: taskData.title,
            date: taskData.date,
            status: taskData.status,
            hours: parseFloat(taskData.hours) || 0,
            notes: taskData.notes || '',
            updatedAt: new Date().toISOString()
        };

        if (this.currentUser && window.firebaseConfig.isConfigured) {
            this.showSyncStatus();
            try {
                const db = window.firebaseConfig.db;
                await db.collection('users').doc(this.currentUser.uid)
                    .collection('tasks').doc(id).update(updatedTask);
            } catch (error) {
                console.error('Error updating task:', error);
                // Fall back to local
                const index = this.tasks.findIndex(t => t.id === id);
                if (index !== -1) {
                    this.tasks[index] = { ...this.tasks[index], ...updatedTask };
                    this.saveToLocalStorage();
                    this.render();
                }
            }
        } else {
            const index = this.tasks.findIndex(t => t.id === id);
            if (index !== -1) {
                this.tasks[index] = { ...this.tasks[index], ...updatedTask };
                this.saveToLocalStorage();
                this.render();
            }
        }

        this.renderHeatmap();
    }

    async updateTaskStatus(id, newStatus) {
        if (this.currentUser && window.firebaseConfig.isConfigured) {
            this.showSyncStatus();
            try {
                const db = window.firebaseConfig.db;
                await db.collection('users').doc(this.currentUser.uid)
                    .collection('tasks').doc(id).update({
                        status: newStatus,
                        updatedAt: new Date().toISOString()
                    });
            } catch (error) {
                console.error('Error updating task status:', error);
            }
        } else {
            const index = this.tasks.findIndex(t => t.id === id);
            if (index !== -1) {
                this.tasks[index].status = newStatus;
                this.saveToLocalStorage();
                this.render();
            }
        }
    }

    async deleteTask(id) {
        if (confirm('Are you sure you want to delete this task?')) {
            if (this.currentUser && window.firebaseConfig.isConfigured) {
                this.showSyncStatus();
                try {
                    const db = window.firebaseConfig.db;
                    await db.collection('users').doc(this.currentUser.uid)
                        .collection('tasks').doc(id).delete();
                } catch (error) {
                    console.error('Error deleting task:', error);
                }
            } else {
                this.tasks = this.tasks.filter(t => t.id !== id);
                this.saveToLocalStorage();
                this.render();
            }

            this.renderHeatmap();
        }
    }

    render() {
        if (this.currentView === 'kanban') {
            this.renderKanban();
        } else {
            this.renderList();
        }
        this.renderStats();
    }

    renderKanban() {
        const filteredTasks = this.getFilteredTasks();
        const columns = ['todo', 'inprogress', 'onhold', 'done'];

        columns.forEach(status => {
            const container = document.getElementById(`${status}Tasks`);
            const countEl = document.getElementById(`${status}Count`);
            const tasksInColumn = filteredTasks.filter(t => t.status === status);

            countEl.textContent = tasksInColumn.length;

            if (tasksInColumn.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="icon">📝</div>
                        <p>No tasks here</p>
                    </div>
                `;
            } else {
                container.innerHTML = tasksInColumn.map(task => this.createTaskCard(task)).join('');
            }
        });
    }

    createTaskCard(task) {
        const dateFormatted = new Date(task.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });

        return `
            <div class="task-card ${task.status}" 
                 draggable="true" 
                 data-task-id="${task.id}"
                 ondragstart="handleDragStart(event, '${task.id}')"
                 ondragend="handleDragEnd(event)"
                 onclick="tracker.editTask('${task.id}')">
                <div class="task-actions">
                    <button onclick="event.stopPropagation(); tracker.editTask('${task.id}')" title="Edit">✏️</button>
                    <button class="delete" onclick="event.stopPropagation(); tracker.deleteTask('${task.id}')" title="Delete">🗑️</button>
                </div>
                <div class="task-title">${this.escapeHtml(task.title)}</div>
                <div class="task-meta">
                    <span>📅 ${dateFormatted}</span>
                    ${task.hours > 0 ? `<span>⏱️ ${task.hours}h</span>` : ''}
                </div>
                ${task.notes ? `<div class="task-notes">${this.escapeHtml(task.notes)}</div>` : ''}
            </div>
        `;
    }

    renderList() {
        const filteredTasks = this.getFilteredTasks();
        const container = document.getElementById('listContainer');

        if (filteredTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 60px 20px;">
                    <div class="icon">📋</div>
                    <p>No tasks found for this period</p>
                </div>
            `;
            return;
        }

        // Group tasks by date
        const groupedTasks = {};
        filteredTasks.forEach(task => {
            if (!groupedTasks[task.date]) {
                groupedTasks[task.date] = [];
            }
            groupedTasks[task.date].push(task);
        });

        // Sort dates in descending order
        const sortedDates = Object.keys(groupedTasks).sort((a, b) => new Date(b) - new Date(a));

        container.innerHTML = sortedDates.map(date => {
            const tasks = groupedTasks[date];
            const dateFormatted = new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });

            return `
                <div class="list-date-group">
                    <div class="list-date-header">
                        <span class="date-icon">📅</span>
                        <span>${dateFormatted}</span>
                        <span class="task-count">${tasks.length} task${tasks.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="list-tasks">
                        ${tasks.map(task => `
                            <div class="list-task-item" onclick="tracker.editTask('${task.id}')">
                                <span class="status-badge ${task.status}">${this.getStatusLabel(task.status)}</span>
                                <div class="task-info">
                                    <div class="task-title">${this.escapeHtml(task.title)}</div>
                                    ${task.notes ? `<div class="task-notes-preview">${this.escapeHtml(task.notes)}</div>` : ''}
                                </div>
                                ${task.hours > 0 ? `<span class="task-hours">⏱️ ${task.hours}h</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    getStatusLabel(status) {
        const labels = {
            'todo': 'To Do',
            'inprogress': 'In Progress',
            'onhold': 'On Hold',
            'done': 'Done'
        };
        return labels[status] || status;
    }

    renderStats() {
        const filteredTasks = this.getFilteredTasks();

        document.getElementById('totalTasks').textContent = filteredTasks.length;
        document.getElementById('completedTasks').textContent =
            filteredTasks.filter(t => t.status === 'done').length;
        document.getElementById('progressTasks').textContent =
            filteredTasks.filter(t => t.status === 'inprogress').length;

        const totalHours = filteredTasks.reduce((sum, t) => sum + (t.hours || 0), 0);
        document.getElementById('totalHours').textContent = totalHours;
    }

    renderHeatmap() {
        const container = document.getElementById('heatmapContainer');
        const monthsContainer = document.getElementById('heatmapMonths');
        const summaryContainer = document.getElementById('heatmapSummary');

        // Get selected year and month
        const selectedYear = parseInt(document.getElementById('heatmapYear').value) || new Date().getFullYear();
        const selectedMonth = document.getElementById('heatmapMonth').value;

        this.heatmapYear = selectedYear;
        this.heatmapMonth = selectedMonth;

        // Calculate activity per day
        const activityMap = {};
        let totalTasks = 0;
        let totalHours = 0;
        let activeDays = 0;

        this.tasks.forEach(task => {
            const taskDate = new Date(task.date);
            const taskYear = taskDate.getFullYear();
            const taskMonth = taskDate.getMonth();

            // Filter by year
            if (taskYear !== selectedYear) return;

            // Filter by month if not "all"
            if (selectedMonth !== 'all' && taskMonth !== parseInt(selectedMonth)) return;

            if (!activityMap[task.date]) {
                activityMap[task.date] = 0;
                activeDays++;
            }
            activityMap[task.date]++;
            totalTasks++;
            totalHours += task.hours || 0;
        });

        // Determine date range
        let startDate, endDate;
        const today = new Date();

        if (selectedMonth === 'all') {
            // Show full year
            startDate = new Date(selectedYear, 0, 1);
            endDate = new Date(selectedYear, 11, 31);
            if (selectedYear === today.getFullYear()) {
                endDate = today;
            }
        } else {
            // Show selected month
            const month = parseInt(selectedMonth);
            startDate = new Date(selectedYear, month, 1);
            endDate = new Date(selectedYear, month + 1, 0); // Last day of month
            if (selectedYear === today.getFullYear() && month === today.getMonth()) {
                endDate = today;
            }
        }

        // Align to start of week (Sunday)
        const alignedStart = new Date(startDate);
        alignedStart.setDate(startDate.getDate() - startDate.getDay());

        // Generate month labels
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let monthLabels = [];

        if (selectedMonth === 'all') {
            monthLabels = monthNames.map((name, index) => ({ name, index }));
        } else {
            monthLabels = [{ name: monthNames[parseInt(selectedMonth)], index: parseInt(selectedMonth) }];
        }

        monthsContainer.innerHTML = monthLabels.map(m =>
            `<span class="heatmap-month-label">${m.name}</span>`
        ).join('');

        // Generate heatmap HTML
        let html = '';
        let currentDate = new Date(alignedStart);

        while (currentDate <= endDate) {
            html += '<div class="heatmap-week">';

            for (let day = 0; day < 7; day++) {
                // Use local date string to avoid timezone issues
                const dateStr = this.getLocalDateString(currentDate);
                const count = activityMap[dateStr] || 0;
                const level = this.getActivityLevel(count);
                const dateFormatted = currentDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });

                // Improved tooltip with clear message (GitHub style - no emoji)
                let tooltip;
                if (count === 0) {
                    tooltip = `No contributions on ${dateFormatted}`;
                } else {
                    tooltip = `${count} contribution${count !== 1 ? 's' : ''} on ${dateFormatted}`;
                }

                const isFuture = currentDate > today;
                const isBeforeRange = currentDate < startDate;

                if (!isFuture && !isBeforeRange) {
                    html += `<div class="heatmap-day level-${level}" 
                                  data-date="${dateStr}" 
                                  data-tooltip="${tooltip}"
                                  onclick="navigateToDate('${dateStr}')"></div>`;
                } else {
                    html += `<div class="heatmap-day level-0" style="opacity: 0.2;"></div>`;
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }

            html += '</div>';
        }

        container.innerHTML = html;

        // Render summary
        const periodLabel = selectedMonth === 'all' ? selectedYear : `${monthNames[parseInt(selectedMonth)]} ${selectedYear}`;
        summaryContainer.innerHTML = `
            <span>📊 <strong>${totalTasks}</strong> tasks in ${periodLabel}</span>
            <span>⏱️ <strong>${totalHours}</strong> hours logged</span>
            <span>📅 <strong>${activeDays}</strong> active days</span>
        `;
    }

    getActivityLevel(count) {
        if (count === 0) return 0;
        if (count <= 1) return 1;
        if (count <= 3) return 2;
        if (count <= 5) return 3;
        return 4;
    }

    // Helper to get date string in local timezone (YYYY-MM-DD format)
    getLocalDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    editTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        document.getElementById('modalTitle').textContent = 'Edit Task';
        document.getElementById('taskId').value = task.id;
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDate').value = task.date;
        document.getElementById('taskHours').value = task.hours || '';
        document.getElementById('taskNotes').value = task.notes || '';

        // Set status radio
        document.querySelector(`input[name="taskStatus"][value="${task.status}"]`).checked = true;

        document.getElementById('modalOverlay').classList.remove('hidden');
    }

    exportTasks(range) {
        let tasksToExport = [];
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        switch (range) {
            case 'current':
                tasksToExport = this.getFilteredTasks();
                break;
            case 'day':
                tasksToExport = this.tasks.filter(t => t.date === todayStr);
                break;
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                tasksToExport = this.tasks.filter(t => {
                    const taskDate = new Date(t.date);
                    return taskDate >= weekStart && taskDate <= weekEnd;
                });
                break;
            case 'month':
                tasksToExport = this.tasks.filter(t => {
                    const taskDate = new Date(t.date);
                    return taskDate.getMonth() === today.getMonth() &&
                        taskDate.getFullYear() === today.getFullYear();
                });
                break;
            case 'all':
                tasksToExport = [...this.tasks];
                break;
        }

        if (tasksToExport.length === 0) {
            alert('No tasks to export for the selected range.');
            return;
        }

        // Create CSV content
        const headers = ['Date', 'Title', 'Status', 'Hours', 'Notes'];
        const rows = tasksToExport.map(task => [
            task.date,
            `"${task.title.replace(/"/g, '""')}"`,
            this.getStatusLabel(task.status),
            task.hours || 0,
            `"${(task.notes || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `yolo-tasks-${range}-${todayStr}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Close menu
        document.getElementById('exportMenu').classList.add('hidden');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize tracker
let tracker;
document.addEventListener('DOMContentLoaded', () => {
    tracker = new TaskTracker();
});

// Auth functions
async function signInWithGoogle() {
    if (!window.firebaseConfig || !window.firebaseConfig.isConfigured) {
        alert('Firebase is not configured. Please update firebase-config.js with your Firebase project credentials to enable cloud sync.');
        return;
    }

    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await window.firebaseConfig.auth.signInWithPopup(provider);
    } catch (error) {
        console.error('Sign in error:', error);
        alert('Sign in failed. Please try again.');
    }
}

async function signOutUser() {
    if (window.firebaseConfig && window.firebaseConfig.isConfigured) {
        try {
            await window.firebaseConfig.auth.signOut();
        } catch (error) {
            console.error('Sign out error:', error);
        }
    }
}

// View functions
function switchView(view) {
    tracker.currentView = view;

    document.getElementById('kanbanViewBtn').classList.toggle('active', view === 'kanban');
    document.getElementById('listViewBtn').classList.toggle('active', view === 'list');

    document.getElementById('kanbanView').classList.toggle('hidden', view !== 'kanban');
    document.getElementById('listView').classList.toggle('hidden', view !== 'list');

    tracker.render();
}

function updateFilter() {
    tracker.render();
}

function updateHeatmap() {
    tracker.renderHeatmap();
}

// Modal functions
function openModal() {
    document.getElementById('modalTitle').textContent = 'Add New Task';
    document.getElementById('taskForm').reset();
    document.getElementById('taskId').value = '';
    document.getElementById('taskDate').value = document.getElementById('filterDate').value ||
        new Date().toISOString().split('T')[0];
    document.querySelector('input[name="taskStatus"][value="todo"]').checked = true;
    document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal(event) {
    if (!event || event.target === document.getElementById('modalOverlay')) {
        document.getElementById('modalOverlay').classList.add('hidden');
    }
}

function saveTask(event) {
    event.preventDefault();

    // Validate date
    const dateValue = document.getElementById('taskDate').value;
    const year = dateValue.split('-')[0];
    if (year.length !== 4 || parseInt(year) < 1900 || parseInt(year) > 2100) {
        alert('Please enter a valid date with a 4-digit year between 1900 and 2100');
        return;
    }

    const taskData = {
        title: document.getElementById('taskTitle').value,
        date: document.getElementById('taskDate').value,
        status: document.querySelector('input[name="taskStatus"]:checked').value,
        hours: document.getElementById('taskHours').value,
        notes: document.getElementById('taskNotes').value
    };

    const taskId = document.getElementById('taskId').value;

    if (taskId) {
        tracker.updateTask(taskId, taskData);
    } else {
        tracker.addTask(taskData);
    }

    closeModal();
}

// Export functions
function toggleExportMenu() {
    document.getElementById('exportMenu').classList.toggle('hidden');
}

function exportTasks(range) {
    tracker.exportTasks(range);
}

// Heatmap navigation
function navigateToDate(dateStr) {
    document.getElementById('filterDate').value = dateStr;
    document.getElementById('filterType').value = 'day';
    tracker.render();

    // Scroll to kanban/list view
    const targetView = tracker.currentView === 'kanban' ? 'kanbanView' : 'listView';
    document.getElementById(targetView).scrollIntoView({ behavior: 'smooth' });
}

// Drag and Drop functions
function handleDragStart(event, taskId) {
    tracker.draggedTaskId = taskId;
    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', taskId);
}

function handleDragEnd(event) {
    event.target.classList.remove('dragging');
    tracker.draggedTaskId = null;

    // Remove drag-over class from all columns
    document.querySelectorAll('.kanban-column').forEach(col => {
        col.classList.remove('drag-over');
    });
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const column = event.target.closest('.kanban-column');
    if (column) {
        // Remove from others first
        document.querySelectorAll('.kanban-column').forEach(col => {
            col.classList.remove('drag-over');
        });
        column.classList.add('drag-over');
    }
}

function handleDrop(event, newStatus) {
    event.preventDefault();

    const column = event.target.closest('.kanban-column');
    if (column) {
        column.classList.remove('drag-over');
    }

    const taskId = event.dataTransfer.getData('text/plain') || tracker.draggedTaskId;

    if (taskId) {
        tracker.updateTaskStatus(taskId, newStatus);
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
    if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        openModal();
    }
});

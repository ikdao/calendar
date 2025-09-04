        const DB_NAME = 'calendar_db';
        const DB_VERSION = 1;
        const EVENTS_STORE = 'events';
        const TASKS_STORE = 'tasks';

        const tgl = (id) => {
            document.getElementById(id).classList.toggle('show');
        };

        // --- State Variables ---
        let db;
        let allItems = [];
        let currentViewMode = 'month';
        let currentDate = new Date();
        let selectedDate = new Date();
        let itemToEdit = null;
        let itemToDelete = null;
        const todayStr = new Date().toISOString().split('T')[0];

        // --- DOM Elements ---
        const viewSelectorEl = document.getElementById('view-selector');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const currentPeriodDisplayEl = document.getElementById('current-period-display');
        const calendarContentEl = document.getElementById('calendar-content');
        const eventsTasksHeaderEl = document.getElementById('events-tasks-header');
        const eventsTasksContainerEl = document.getElementById('events-tasks-container');
        const addItemBtn = document.getElementById('add-item-btn');
        const itemModal = document.getElementById('item-modal');
        const confirmModal = document.getElementById('confirm-modal');
        const modalTitleEl = document.getElementById('modal-title');
        const itemForm = document.getElementById('item-form');
        const itemIdInput = document.getElementById('item-id');
        const itemDateInput = document.getElementById('item-date');
        const itemTitleInput = document.getElementById('item-title');
        const itemTypeSelect = document.getElementById('item-type');
        const itemTimeInput = document.getElementById('item-time');
        const itemEndTimeGroup = document.getElementById('end-time-group');
        const itemEndTimeInput = document.getElementById('item-end-time');
        const itemDescriptionInput = document.getElementById('item-description');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const closeConfirmBtn = document.getElementById('close-confirm-btn');
        const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        
        // New UI elements
        const bottomNav = document.querySelector('.l-bottom-nav');
        const homeView = document.getElementById('home-view');
        const historyView = document.getElementById('history-view');
        const settingsView = document.getElementById('settings-view');
        const historyContainer = document.getElementById('history-container');
        const notificationBtn = document.getElementById('notification-btn');

        // --- IndexedDB Functions ---
        function openDatabase() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);

                request.onupgradeneeded = (event) => {
                    db = event.target.result;
                    if (!db.objectStoreNames.contains(EVENTS_STORE)) {
                        db.createObjectStore(EVENTS_STORE, { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains(TASKS_STORE)) {
                        db.createObjectStore(TASKS_STORE, { keyPath: 'id' });
                    }
                };

                request.onsuccess = (event) => {
                    db = event.target.result;
                    resolve(db);
                };

                request.onerror = (event) => {
                    console.error('IndexedDB error:', event.target.errorCode);
                    reject(event.target.error);
                };
            });
        }

        async function loadData() {
            try {
                const transaction = db.transaction([EVENTS_STORE, TASKS_STORE], 'readonly');
                const eventsStore = transaction.objectStore(EVENTS_STORE);
                const tasksStore = transaction.objectStore(TASKS_STORE);

                const eventRequest = eventsStore.getAll();
                const taskRequest = tasksStore.getAll();

                await Promise.all([
                    new Promise(r => eventRequest.onsuccess = () => r()),
                    new Promise(r => taskRequest.onsuccess = () => r()),
                ]);

                allItems = [...eventRequest.result, ...taskRequest.result];
            } catch (error) {
                console.error('Failed to load data:', error);
            }
        }

        async function saveData(item) {
            try {
                const storeName = item.type === 'event' ? EVENTS_STORE : TASKS_STORE;
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                await store.put(item);
                await new Promise(r => transaction.oncomplete = () => r());
            } catch (error) {
                console.error('Failed to save data:', error);
            }
        }

        async function deleteData(item) {
            try {
                const storeName = item.type === 'event' ? EVENTS_STORE : TASKS_STORE;
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                await store.delete(item.id);
                await new Promise(r => transaction.oncomplete = () => r());
            } catch (error) {
                console.error('Failed to delete data:', error);
            }
        }

        // --- Utility Functions ---
        function formatDateToYYYYMMDD(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        function getHeaderTitle() {
            if (currentViewMode === 'month') return currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            if (currentViewMode === 'week') {
                const startOfWeek = new Date(currentDate);
                startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                return `${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}`;
            }
            if (currentViewMode === 'year') return currentDate.getFullYear().toString();
        }

        function setPeriodDisplay() {
            currentPeriodDisplayEl.textContent = getHeaderTitle();
        }
        
        function updateNotificationButton() {
            if (!("Notification" in window)) {
                notificationBtn.textContent = "Notifications Not Supported";
                notificationBtn.disabled = true;
            } else {
                if (Notification.permission === 'granted') {
                    notificationBtn.textContent = "Notifications Allowed";
                    notificationBtn.disabled = true;
                } else if (Notification.permission === 'denied') {
                    notificationBtn.textContent = "Notifications Blocked";
                    notificationBtn.disabled = true;
                } else {
                    notificationBtn.textContent = "Allow Notifications";
                    notificationBtn.disabled = false;
                }
            }
        }

        // --- Rendering Functions ---
        function renderCalendar() {
            let calendarHtml = '';
            if (currentViewMode === 'month') {
                const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
                const startDayIndex = firstDayOfMonth.getDay();
                const daysInPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();

                const days = [];
                for (let i = startDayIndex - 1; i >= 0; i--) {
                    days.push({ date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, daysInPrevMonth - i), currentMonth: false });
                }
                for (let i = 1; i <= daysInMonth; i++) {
                    days.push({ date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i), currentMonth: true });
                }
                const totalCells = days.length;
                const remainingCells = 42 - totalCells;
                for (let i = 1; i <= remainingCells; i++) {
                    days.push({ date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i), currentMonth: false });
                }

                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                calendarHtml += `<div class="l-calendar-grid">`;
                dayNames.forEach(day => calendarHtml += `<div class="l-day-name">${day}</div>`);
                days.forEach(dayInfo => {
                    const dateStr = formatDateToYYYYMMDD(dayInfo.date);
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === formatDateToYYYYMMDD(selectedDate);
                    const hasEvents = allItems.some(e => e.date === dateStr);
                    calendarHtml += `
                        <div
                            class="l-date-cell ${dayInfo.currentMonth ? 'l-current-month' : 'l-other-month'} ${isToday ? 'l-today' : ''} ${isSelected ? 'l-selected' : ''}"
                            data-date="${dateStr}"
                        >
                            ${dayInfo.date.getDate()}
                            ${hasEvents ? `<div class="event-indicator"></div>` : ''}
                        </div>
                    `;
                });
                calendarHtml += `</div>`;
            } else if (currentViewMode === 'week') {
                const startOfWeek = new Date(currentDate);
                startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
                const weekDays = [];
                for (let i = 0; i < 7; i++) {
                    weekDays.push(new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i));
                }
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                calendarHtml += `<div class="l-week-view-grid">`;
                dayNames.forEach(day => calendarHtml += `<div class="l-day-name">${day}</div>`);
                weekDays.forEach(date => {
                    const dateStr = formatDateToYYYYMMDD(date);
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === formatDateToYYYYMMDD(selectedDate);
                    const hasEvents = allItems.some(e => e.date === dateStr);
                    calendarHtml += `
                        <div
                            class="l-date-cell ${isToday ? 'l-today' : ''} ${isSelected ? 'l-selected' : ''}"
                            data-date="${dateStr}"
                        >
                            ${date.getDate()}
                            ${hasEvents ? `<div class="event-indicator"></div>` : ''}
                        </div>
                    `;
                });
                calendarHtml += `</div>`;
            } else if (currentViewMode === 'year') {
                const months = [];
                for (let i = 0; i < 12; i++) {
                    months.push(new Date(currentDate.getFullYear(), i));
                }
                calendarHtml += `<div class="l-month-thumbnail-grid">`;
                months.forEach(month => {
                    calendarHtml += `
                        <div class="l-month-thumbnail ${month.getMonth() === currentDate.getMonth() ? 'l-current-month' : ''}" data-month="${month.getMonth()}" data-year="${month.getFullYear()}">
                            ${month.toLocaleString('en-US', { month: 'short' })}
                        </div>
                    `;
                });
                calendarHtml += `</div>`;
            }
            calendarContentEl.innerHTML = calendarHtml;
            setupCalendarEventListeners();
        }
        
        function renderEventsList() {
            eventsTasksHeaderEl.textContent = `Events & Tasks for ${selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`;
            const eventsForSelectedDate = allItems
                .filter(e => e.date === formatDateToYYYYMMDD(selectedDate))
                .sort((a, b) => {
                    if (a.time && b.time) return a.time.localeCompare(b.time);
                    if (a.time) return -1;
                    if (b.time) return 1;
                    return 0;
                });

            let listHtml = renderItemList(eventsForSelectedDate);
            eventsTasksContainerEl.innerHTML = listHtml;
            setupEventItemListeners();
        }

        function renderHistoryList() {
            const now = new Date();
            const sortedItems = allItems.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                
                // Sort by date, then time
                if (dateA.getTime() !== dateB.getTime()) {
                    return dateA - dateB;
                }
                return a.time.localeCompare(b.time);
            });
            
            let listHtml = renderItemList(sortedItems);
            historyContainer.innerHTML = listHtml;
            setupEventItemListeners();
        }
        
        function renderItemList(items) {
            let listHtml = '';
            if (items.length > 0) {
                items.forEach(item => {
                    const timeDisplay = item.type === 'event' && item.endTime ? `${item.time} - ${item.endTime}` : item.time || 'No Time';
                    listHtml += `
                        <div class="l-event-task-item" data-id="${item.id}" data-type="${item.type}">
                            <div class="details">
                                <div class="title">${item.title}</div>
                                <div class="time-type">${item.date} | ${timeDisplay} - ${item.type}</div>
                            </div>
                            <div class="actions">
                                <button class="l-button edit-btn">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1em" height="1em"><path d="M410.3 231.2l12.9 12.9c16.1 16.1 16.1 42.1 0 58.2l-39.7 39.7c-16.1 16.1-42.1 16.1-58.2 0L273.7 273.7c-16.1-16.1-16.1-42.1 0-58.2s42.1-16.1 58.2 0L397.7 248.9zM240 272c-8.8 0-16-7.2-16-16s7.2-16 16-16H416c8.8 0 16 7.2 16 16s-7.2 16-16 16H240zM320 288c-8.8 0-16-7.2-16-16s7.2-16 16-16h80c8.8 0 16 7.2 16 16s-7.2 16-16 16h-80zM368 288c-8.8 0-16-7.2-16-16s7.2-16 16-16h24c8.8 0 16 7.2 16 16s-7.2 16-16 16h-24zM397.7 248.9l-114.3-114.3c-16.1-16.1-16.1-42.1 0-58.2L148.9 159.9c-16.1 16.1-16.1 42.1 0 58.2s42.1 16.1 58.2 0L339.5 98.7c16.1-16.1 16.1-42.1 0-58.2s-42.1-16.1-58.2 0L167.3 115.3c-16.1 16.1-16.1 42.1 0 58.2L281.6 287.7c16.1 16.1 42.1 16.1 58.2 0s16.1-42.1 0-58.2L219.8 148.3c-16.1-16.1-42.1-16.1-58.2 0L109.9 198.2c-16.1 16.1-16.1 42.1 0 58.2s42.1 16.1 58.2 0L98.7 167.3c-16.1-16.1-16.1-42.1 0-58.2s42.1-16.1 58.2 0L248.9 187.7c16.1 16.1 16.1 42.1 0 58.2s-42.1 16.1-58.2 0L207.3 198.2c-16.1-16.1-42.1-16.1-58.2 0s-16.1 42.1 0 58.2L198.2 256c-16.1-16.1-42.1-16.1-58.2 0s-16.1 42.1 0 58.2L256 320c16.1 16.1 42.1 16.1 58.2 0s16.1-42.1 0-58.2L207.3 198.2c-16.1-16.1-42.1-16.1-58.2 0s-16.1 42.1 0 58.2L198.2 256z" /></svg>
                                </button>
                                <button class="l-button delete-btn">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="1em" height="1em"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.7C309.8 1.9 294.5-3.2 278.2 3.8s-27.1 16.5-27.1 32.7V112H192V36c0-16.2-10.7-30.8-27.1-37.8s-33.3-1.9-40.7 10.3zM100.8 160H347.2L320 448H128L100.8 160zm16.5 240H320L312.8 208H135.2L117.3 400zM224 256c-13.3 0-24 10.7-24 24v128c0 13.3 10.7 24 24 24s24-10.7 24-24V280c0-13.3-10.7-24-24-24z" /></svg>
                                </button>
                            </div>
                        </div>
                    `;
                });
            } else {
                listHtml = `<p class="no-history-message">No items to display.</p>`;
            }
            return listHtml;
        }

        // --- View & Navigation Management ---
        function setViewMode(mode) {
            currentViewMode = mode;
            const viewButtons = viewSelectorEl.querySelectorAll('.l-button');
            viewButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelector(`.l-button[data-view-mode="${mode}"]`).classList.add('active');
            renderCalendar();
            setPeriodDisplay();
        }

        function renderView(view) {
            // Hide all views first
            homeView.classList.remove('active');
            historyView.classList.remove('active');
            settingsView.classList.remove('active');

            // Deactivate all nav items
            const navItems = document.querySelectorAll('.l-bottom-nav-item');
            navItems.forEach(item => item.classList.remove('active'));

            // Show the selected view and activate its nav item
            if (view === 'home') {
                homeView.classList.add('active');
                document.querySelector('[data-view="home"]').classList.add('active');
                // Re-render home content
                renderCalendar();
                renderEventsList();
                setPeriodDisplay();
            } else if (view === 'history') {
                historyView.classList.add('active');
                document.querySelector('[data-view="history"]').classList.add('active');
                renderHistoryList();
            } else if (view === 'settings') {
                settingsView.classList.add('active');
                document.querySelector('[data-view="settings"]').classList.add('active');
                updateNotificationButton();
            }
        }
        
        // --- Modal Functions ---
        function showItemModal(item = null) {
            itemToEdit = item;
            modalTitleEl.textContent = item ? 'Edit Item' : 'Add New Item';
            itemIdInput.value = item ? item.id : '';
            itemDateInput.value = item ? item.date : formatDateToYYYYMMDD(selectedDate);
            itemTitleInput.value = item ? item.title : '';
            itemTypeSelect.value = item ? item.type : 'event';
            itemTimeInput.value = item ? item.time : '';
            itemEndTimeInput.value = item && item.type === 'event' ? item.endTime : '';
            itemDescriptionInput.value = item ? item.description : '';
            
            // Show/hide end time field based on item type
            itemTypeSelect.dispatchEvent(new Event('change'));
            
            tgl('item-modal');
        }

        function hideItemModal() {
            tgl('item-modal');
            itemToEdit = null;
        }

        function showConfirmModal(item) {
            itemToDelete = item;
            tgl('confirm-modal');
        }

        function hideConfirmModal() {
            tgl('confirm-modal');
            itemToDelete = null;
        }

        // --- Event Handlers ---
        async function handleFormSubmit(event) {
            event.preventDefault();
            
            const itemType = itemTypeSelect.value;
            const newItem = {
                id: itemIdInput.value || (itemType === 'event' ? `i-event-${crypto.randomUUID()}` : `i-task-${crypto.randomUUID()}`),
                date: itemDateInput.value,
                title: itemTitleInput.value,
                type: itemType,
                time: itemTimeInput.value,
                description: itemDescriptionInput.value,
            };

            if (itemType === 'event') {
                newItem.endTime = itemEndTimeInput.value;
            }

            await saveData(newItem);
            await loadData();
            hideItemModal();
            renderEventsList();
            renderCalendar();
            renderHistoryList(); // Also update history on save
        }

        async function handleDelete() {
            if (itemToDelete) {
                await deleteData(itemToDelete);
                await loadData();
                hideConfirmModal();
                renderEventsList();
                renderCalendar();
                renderHistoryList();
            }
        }

        async function handleNotificationPermissionRequest() {
            if ("Notification" in window) {
                const permission = await Notification.requestPermission();
                updateNotificationButton();
            }
        }

        function setupCalendarEventListeners() {
            const dateCells = calendarContentEl.querySelectorAll('.l-date-cell');
            dateCells.forEach(cell => {
                cell.addEventListener('click', () => {
                    const dateStr = cell.dataset.date;
                    selectedDate = new Date(dateStr);
                    renderCalendar();
                    renderEventsList();
                });
            });

            const monthThumbnails = calendarContentEl.querySelectorAll('.l-month-thumbnail');
            monthThumbnails.forEach(thumb => {
                thumb.addEventListener('click', () => {
                    const month = parseInt(thumb.dataset.month);
                    const year = parseInt(thumb.dataset.year);
                    currentDate = new Date(year, month);
                    selectedDate = new Date(year, month);
                    setViewMode('month');
                });
            });
        }

        function setupEventItemListeners() {
            const editButtons = document.querySelectorAll('.edit-btn');
            editButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const itemId = btn.closest('.l-event-task-item').dataset.id;
                    const item = allItems.find(i => i.id === itemId);
                    if (item) showItemModal(item);
                });
            });

            const deleteButtons = document.querySelectorAll('.delete-btn');
            deleteButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const itemId = btn.closest('.l-event-task-item').dataset.id;
                    const item = allItems.find(i => i.id === itemId);
                    if (item) showConfirmModal(item);
                });
            });
        }

        // --- Initial Setup and Event Listeners ---
        async function init() {
            try {
                await openDatabase();
                await loadData();
                renderView('home'); // Initial view
            } catch (error) {
                console.error("Initialization failed:", error);
            }

            viewSelectorEl.addEventListener('click', (event) => {
                const button = event.target.closest('.l-button');
                if (button) setViewMode(button.dataset.viewMode);
            });

            prevBtn.addEventListener('click', () => {
                const direction = -1;
                if (currentViewMode === 'month') currentDate.setMonth(currentDate.getMonth() + direction);
                if (currentViewMode === 'week') currentDate.setDate(currentDate.getDate() + (direction * 7));
                if (currentViewMode === 'year') currentDate.setFullYear(currentDate.getFullYear() + direction);
                selectedDate = new Date(currentDate);
                renderCalendar();
                renderEventsList();
                setPeriodDisplay();
            });

            nextBtn.addEventListener('click', () => {
                const direction = 1;
                if (currentViewMode === 'month') currentDate.setMonth(currentDate.getMonth() + direction);
                if (currentViewMode === 'week') currentDate.setDate(currentDate.getDate() + (direction * 7));
                if (currentViewMode === 'year') currentDate.setFullYear(currentDate.getFullYear() + direction);
                selectedDate = new Date(currentDate);
                renderCalendar();
                renderEventsList();
                setPeriodDisplay();
            });

            addItemBtn.addEventListener('click', () => showItemModal());
            closeModalBtn.addEventListener('click', () => hideItemModal());
            closeConfirmBtn.addEventListener('click', () => hideConfirmModal());
            cancelDeleteBtn.addEventListener('click', () => hideConfirmModal());
            confirmDeleteBtn.addEventListener('click', handleDelete);
            itemForm.addEventListener('submit', handleFormSubmit);
            
            itemTypeSelect.addEventListener('change', (event) => {
                if (event.target.value === 'event') {
                    itemEndTimeGroup.style.display = 'block';
                } else {
                    itemEndTimeGroup.style.display = 'none';
                }
            });
            
            // New navigation event listener
            bottomNav.addEventListener('click', (event) => {
                const navItem = event.target.closest('.l-bottom-nav-item');
                if (navItem) {
                    renderView(navItem.dataset.view);
                }
            });

            notificationBtn.addEventListener('click', handleNotificationPermissionRequest);
            
            itemTypeSelect.dispatchEvent(new Event('change'));
        }

        window.onload = init;
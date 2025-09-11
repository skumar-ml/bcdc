/**
  * AnnouncementUI Class
  * Handles the display and interaction of announcements in the portal
  * Manages filtering, searching, and mobile responsiveness
  */
        class AnnouncementUI {
            /**
             * Check if the current viewport is mobile (width <= 766px)
             * @returns {boolean} True if mobile viewport
             */
            static isMobile() {
                return window.innerWidth <= 766;
            }

            /**
             * Check if testMemberId is present in URL parameters
             * @returns {boolean} True if testMemberId is present in URL
             */
            static hasTestMemberId() {
                const urlParams = new URLSearchParams(window.location.search);
                return urlParams.has('testMemberId');
            }

            // Class properties for managing state
            $announcements = [];           // Array of all announcements
            $selectedOid = null;           // Currently selected announcement ID
            $searchTerm = '';              // Current search term
            $studentFilter = 'All Students'; // Current student filter
            $typeFilter = 'all types';     // Current type filter
            $readUnreadFilter = 'all status'; // Current read/unread filter
            $selectedEmailId = null;       // Selected email ID for filtering
            /**
             * Constructor - Initialize the AnnouncementUI with data and DOM elements
             * @param {Object} data - Configuration data including API URL, member ID, account info
             */
            constructor(data) {
                this.data = data;
                this.$selectedEmailId = data.accountEmail;
                
                // Check if testMemberId is present in URL parameters
                this.isTestMode = AnnouncementUI.hasTestMemberId();

                // Get DOM elements for UI components
                this.spinner = document.getElementById("half-circle-spinner");
                this.portalInfoWrapper = document.querySelector('.portal-info-wrapper');
                this.noRecordDiv = document.querySelector('[data-container="no-record-found"]');
                this.listDiv = document.querySelector('[data-announcements="list"]');
                this.detailsDiv = document.querySelector('[data-announcements="details"]');
                this.countsDivs = document.querySelectorAll('[data-announcements="counts"]');

                // Get filter input elements
                this.searchInput = document.getElementById('search');
                this.studentSelect = document.getElementById('student');
                this.typeSelect = document.getElementById('type');
                this.readUnreadSelect = document.getElementById('readUnread');

                // Clear initial content
                this.listDiv.innerHTML = "";
                this.detailsDiv.innerHTML = "";

                // Hide student filter for non-parent accounts
                if (this.data.accountType !== "parent") {
                    this.studentSelect.style.display = "none";
                }

                // Set up event listeners for filter inputs
                if (this.searchInput) {
                    this.searchInput.addEventListener('input', (e) => {
                        this.$searchTerm = e.target.value.toLowerCase();
                        this.renderAnnouncements();
                    });
                }
                if (this.studentSelect) {
                    this.studentSelect.addEventListener('change', (e) => {
                        this.$studentFilter = e.target.value;
                        this.renderAnnouncements();
                    });
                }
                if (this.typeSelect) {
                    this.typeSelect.addEventListener('change', (e) => {
                        this.$typeFilter = e.target.value;
                        this.renderAnnouncements();
                    });
                }
                if (this.readUnreadSelect) {
                    this.readUnreadSelect.addEventListener('change', (e) => {
                        this.$readUnreadFilter = e.target.value;
                        this.renderAnnouncements();
                    });
                }

                // Initialize the UI
                this.render();
                this.eventMarkAllAsRead();
                this.setupMobileHandlers();
                
                // Disable Mark All as Read button if in test mode
                this.setupTestModeUI();
            }
            /**
             * Show the announcements list and hide the details view
             */
            showListAndHideDetails() {
                if (this.listDiv) this.listDiv.style.display = "block";
                if (this.detailsDiv) this.detailsDiv.style.display = "none";
            }

            /**
             * Show the details view and hide the announcements list
             */
            showDetailsAndHideList() {
                if (this.listDiv) this.listDiv.style.display = "none";
                if (this.detailsDiv) this.detailsDiv.style.display = "flex";
            }

            /**
             * Handle mobile viewport changes - adjust layout for mobile/desktop
             */
            handleMobileView() {
                if (AnnouncementUI.isMobile()) {
                    this.$selectedOid = null; // Remove selection on mobile
                    this.showListAndHideDetails();
                    this.renderAnnouncements();
                    this.renderDetails();
                } else {
                    // Desktop view - show both list and details
                    if (this.listDiv) this.listDiv.style.display = "block";
                    if (this.detailsDiv) this.detailsDiv.style.display = "flex";
                }
            }

            /**
             * Set up mobile responsiveness handlers
             */
            setupMobileHandlers() {
                window.addEventListener('resize', () => this.handleMobileView());
                this.handleMobileView();
            }

            /**
             * Set up UI changes for test mode (when testMemberId is present)
             */
            setupTestModeUI() {
                if (this.isTestMode) {
                    const markAllBtn = document.getElementById('mark-all-read-btn');
                    if (markAllBtn) {
                        markAllBtn.style.opacity = '0.5';
                        markAllBtn.style.cursor = 'not-allowed';
                        markAllBtn.style.pointerEvents = 'none';
                        
                        // Update button text
                        const buttonText = markAllBtn.querySelector('.mark-all-read');
                        if (buttonText) {
                            buttonText.textContent = 'Mark All as Read (Disabled)';
                        }
                    }
                }
            }
            /**
             * Fetch announcements data from the API
             * @returns {Promise<Object>} API response data or undefined on error
             */
            async fetchData() {
                try {
                    const response = await fetch(`${this.data.apiBaseURL}getAnnouncement/${this.data.memberId}`);
                    if (!response.ok) throw new Error('Network response was not ok');

                    const apiData = await response.json();
                    return apiData;
                } catch (error) {
                    // Handle fetch errors by showing no records message
                    this.portalInfoWrapper.style.display = 'none';
                    this.noRecordDiv.style.display = 'block';
                    this.spinner.style.display = 'none';
                    console.error('Fetch error:', error);
                }
            }
            /**
             * Main render method - fetches data and initializes the UI
             */
            async render() {
                // Show loading spinner
                this.spinner.style.display = "block";

                // Hide UI elements while loading
                const announcementsList = document.querySelector('[data-announcements="list"]');
                const announcementsDetails = document.querySelector('[data-announcements="details"]');
                announcementsList.style.display = "none";
                announcementsDetails.style.display = "none";
                this.portalInfoWrapper.style.display = "none";

                // Fetch data from API
                const apiData = await this.fetchData();
                this.spinner.style.display = "none";

                // Handle empty results
                if (apiData.announcement.length > 0) {
                    this.noRecordDiv.style.display = "none";
                    this.portalInfoWrapper.style.display = "block";
                } else {
                    this.noRecordDiv.style.display = "block";
                    this.portalInfoWrapper.style.display = "none";
                    return;
                }

                // Store announcements and set initial selection
                this.$announcements = apiData.announcement;
                this.$selectedOid = this.$announcements.length > 0 && !AnnouncementUI.isMobile() ? this.$announcements[0].oid : null;

                // Populate filter dropdowns
                this.populateStudentFilter();
                this.populateTypeFilter();

                // Render the UI
                this.renderAnnouncements();
                this.renderDetails();

                // Set appropriate view based on device
                if (AnnouncementUI.isMobile()) {
                    this.showListAndHideDetails();
                } else {
                    announcementsList.style.display = "block";
                    announcementsDetails.style.display = "flex";
                }
            }

            /**
             * Populate the student filter dropdown with unique students
             */
            populateStudentFilter() {
                if (this.studentSelect) {
                    // Get unique students by name+email
                    const studentMap = new Map();
                    const onlyStudentData = this.$announcements.filter(a => a.accountType == "student");
                    onlyStudentData.forEach(a => {
                        if (a.emailId && a.name) {
                            studentMap.set(a.emailId, a.name);
                        }
                    });
                    this.studentSelect.innerHTML = '<option value="All Students">All Students</option>' +
                        Array.from(studentMap.entries()).map(([email, name]) => `<option value="${email}">${name}</option>`).join('');
                }
            }

            /**
             * Populate the type filter dropdown with unique announcement types
             */
            populateTypeFilter() {
                if (this.typeSelect) {
                    // Get unique types from all announcements
                    const typeSet = new Set();
                    this.$announcements.forEach(a => {
                        if (Array.isArray(a.type)) {
                            a.type.forEach(type => typeSet.add(type));
                        }
                    });
                    const types = Array.from(typeSet);
                    this.typeSelect.innerHTML = '<option value="all types">All Types</option>' +
                        types.map(t => `<option value="${t}">${t}</option>`).join('');
                }
            }

            /**
             * Render the announcements list with filtering applied
             */
            renderAnnouncements() {
                this.updateUnreadCount();

                // Start with announcements for the current user
                let filtered = this.$announcements.filter(a => a.emailId === this.$selectedEmailId);

                // Add metadata about all recipients for each announcement
                filtered.forEach(a => {
                    a.allSentNames = this.$announcements.filter(b => b.message_id === a.message_id).map(c => c.name).join(', ');
                    a.allSentStudents = this.$announcements.filter(b => b.message_id === a.message_id).map(c => c.emailId.toLowerCase());
                });

                // Apply search filter
                if (this.$searchTerm && this.$searchTerm.trim() !== '') {
                    filtered = filtered.filter(a =>
                        (a.title && a.title.toLowerCase().includes(this.$searchTerm)) ||
                        (a.message && a.message.toLowerCase().includes(this.$searchTerm))
                    );
                }

                // Apply student filter
                if (this.$studentFilter && this.$studentFilter !== 'All Students') {
                    filtered = filtered.filter(a =>
                        (a.allSentStudents && a.allSentStudents.includes(this.$studentFilter.toLowerCase()))
                    );
                } else {
                    filtered = filtered.filter(a => a.emailId === this.$selectedEmailId);
                }

                // Apply type filter
                if (this.$typeFilter && this.$typeFilter !== 'all types') {
                    filtered = filtered.filter(a => Array.isArray(a.type) && a.type.some(type => type.toLowerCase().includes(this.$typeFilter.toLowerCase())));
                }

                // Apply read/unread filter
                if (this.$readUnreadFilter && this.$readUnreadFilter !== 'all status') {
                    if (this.$readUnreadFilter === 'true') {
                        filtered = filtered.filter(a => a.is_read === true);
                    } else if (this.$readUnreadFilter === 'false') {
                        filtered = filtered.filter(a => a.is_read === false);
                    }
                }

                // Show "No Record Found" if no announcements match filters
                if (filtered.length === 0) {
                    this.listDiv.innerHTML = '<div class="no-record-found-div"><p class="dm-sans no-record-found">No Record Found</p></div>';
                    return;
                }


                // Generate HTML for each filtered announcement
                this.listDiv.innerHTML = filtered.map(a => {
                    // Remove HTML tags from message for preview
                    const plainMessage = a.message ? a.message.replace(/<[^>]*>/g, '') : '';

                    // Truncate message for preview (approximately 2 lines)
                    let shortMessage = plainMessage;
                    const maxLen = 160;
                    if (plainMessage.length > maxLen) {
                        shortMessage = plainMessage.slice(0, maxLen).trim() + '...';
                    }

                    return `
    <div class="announcement-feed-info ${a.is_read === false ? '' : ' white-bluish-bg'} ${this.$selectedOid === a.oid ? ' pink-bg' : ''} " data-oid="${a.oid}" style="cursor:pointer;">  
        <div class="announcement-feed-flex-wrapper no-margin-top">
            <div class="announcement-feed-rounded-circle${a.is_read ? ' gray' : ''}"></div>
            <p class="announcement-feed-title">${a.title}</p>
            <p class="dm-sans announcement-feed-date">${this.formatDate(a.created_on)}</p>
        </div>
        <p class="dm-sans announcement-feed">${shortMessage}</p>
        <div>
            <div class="announcement-feed-flex-wrapper">
                ${a.type.map(type => `
                    <div class="${AnnouncementUI.getTypeTagClass(type)}">
                        <p class="announcement-feed-tag-text">${type}</p>
                    </div>
                `).join('')}
                <p class="dm-sans ${a.is_read ? 'announcement-feed-gray-text' : 'announcement-feed-blue-text'} ${this.isTestMode ? 'mark-read-toggle-disabled' : 'mark-read-toggle'}" data-oid="${a.oid}" style="${this.isTestMode ? 'cursor:not-allowed; text-decoration:none; opacity:0.5;' : 'cursor:pointer; text-decoration:underline;'}">
                    ${this.isTestMode ? 'Read/Unread Disabled' : (a.is_read ? 'Mark as Unread' : 'Mark as Read')}
                </p>
            </div>
            <div class="announcement-feed-flex-wrapper margin-0">
                <p class="poppins-para announcement-text">${(this.data.accountType != 'student') ? a.allSentNames : ""}</p>
            </div>
        </div>
    </div>
`;
                }).join('');

                // Add click event listeners for announcement selection
                this.setupAnnouncementClickHandlers();

                // Add click event listeners for mark as read/unread functionality
                this.setupMarkAsReadHandlers();
            }

            /**
             * Set up click handlers for selecting announcements
             */
            setupAnnouncementClickHandlers() {
                this.listDiv.querySelectorAll('.announcement-feed-info').forEach(div => {
                    div.addEventListener('click', (e) => {
                        // Prevent toggling read/unread if clicking the mark-read-toggle text
                        if (e.target.classList.contains('mark-read-toggle')) return;

                        const oid = div.getAttribute('data-oid');
                        this.$selectedOid = oid;

                        // Auto-mark as read when selected (if not already read and not in test mode)
                        const announcement = this.$announcements.find(a => a.oid === oid);
                        if (announcement && !announcement.is_read && !this.isTestMode) {
                            announcement.is_read = true;
                            this.markAsRead(oid, true);
                        }

                        // Update UI
                        this.renderAnnouncements();
                        this.renderDetails();

                        // Show details view on mobile
                        if (AnnouncementUI.isMobile()) {
                            this.showDetailsAndHideList();
                        }
                    });
                });
            }

            /**
             * Set up click handlers for mark as read/unread functionality
             */
            setupMarkAsReadHandlers() {
                this.listDiv.querySelectorAll('.mark-read-toggle').forEach(text => {
                    text.addEventListener('click', (e) => {
                        e.stopPropagation();
                        
                        // Prevent functionality if in test mode
                        if (this.isTestMode) {
                            return;
                        }
                        
                        const oid = text.getAttribute('data-oid');
                        const announcement = this.$announcements.find(a => a.oid === oid);
                        if (announcement) {
                            announcement.is_read = !announcement.is_read;
                            this.renderAnnouncements();
                            this.renderDetails();
                            this.markAsRead(oid, announcement.is_read);
                        }
                    });
                });
            }

            /**
             * Render the detailed view of the selected announcement
             */
            renderDetails() {
                const a = this.$announcements.find(x => x.oid === this.$selectedOid);

                // Handle case where no announcement is selected
                if (!a) {
                    this.detailsDiv.innerHTML = '<div class="announcement-feed-assignment-info"><p class="select-announcement-text">Select an announcement to see details.</p></div>';
                    if (AnnouncementUI.isMobile()) {
                        this.showListAndHideDetails();
                    }
                    return;
                }

                // Add recipient names for the selected announcement
                a.allSentNames = this.$announcements.filter(b => b.message_id === a.message_id).map(c => c.name).join(', ');

                // Generate detailed view HTML
                this.detailsDiv.innerHTML = `
    <div class="announcement-feed-flex-wrapper assignment">
        <div class="announcement-feed-header-flex">
                <img data-announcement="back-button" src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/687725db35ce7096b740e632_chevron_forward%20(1).svg" alt="announcement-feed-icon" class="announcement-feed-icon" />
                <p class="portal-node-title announcement" style="cursor:pointer;">${a.title}</p>
            </div>
        <div class="announcement-feed-flex-wrapper tags">
            ${a.type.map(type => `
                <div class="${AnnouncementUI.getTypeTagClass(type)}">
                    <p class="announcement-feed-tag-text">${type}</p>
                </div>
            `).join('')}
        </div>
    </div>
    <div class="announcement-feed-assignment-info">
        <div class="announcement-flex-wrapper assignment">
            <p class="dm-sans announcement-text"><span class="bold-text">To: &nbsp;</span>${(this.data.accountType != 'student') ? a.allSentNames : ""}</p>
            <p class="dm-sans announcement-text-small">${new Date(a.created_on).toLocaleString()}</p>
        </div>
        <div class="announcement-feed-assignment-inner-div">
            <p class="dm-sans text-black">${a.message}</p>
        </div>
    </div>
`;

                // Set up mobile back button handler
                this.setupMobileBackButton();
            }

            /**
             * Set up the back button handler for mobile view
             */
            setupMobileBackButton() {
                if (AnnouncementUI.isMobile()) {
                    const backBtn = this.detailsDiv.querySelector('[data-announcement="back-button"]');
                    if (backBtn) {
                        backBtn.addEventListener('click', () => {
                            this.$selectedOid = null;
                            this.renderAnnouncements();
                            this.renderDetails();
                            this.showListAndHideDetails();
                        });
                    }
                }
            }

            /**
             * Update the unread count display in the UI
             */
            updateUnreadCount() {
                if (!this.countsDivs || this.countsDivs.length === 0) return;

                // Count unread announcements for the current user
                const unreadCount = this.$announcements.filter(a => !a.is_read && a.emailId === this.data.accountEmail).length;

                // Update all count display elements
                this.countsDivs.forEach(el => {
                    if (unreadCount > 0) {
                        el.textContent = `${unreadCount}`;
                    } else {
                        el.textContent = '0';
                    }
                    el.parentElement.style.display = "block";
                });
            }

            /**
             * Mark a specific announcement as read/unread via API
             * @param {string} oid - Announcement object ID
             * @param {boolean} isRead - Whether to mark as read (true) or unread (false)
             */
            async markAsRead(oid, isRead) {
                try {
                    await fetch(`${this.data.apiBaseURL}isReadAnnouncement`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ objectId: oid, markAsRead: isRead })
                    });
                    // Local state is already updated in the click handler
                } catch (e) {
                    console.error('Failed to mark as read', e);
                }
            }

            /**
             * Mark all announcements as read for the current user
             */
            async markAllAsRead() {
                // Prevent functionality if in test mode
                if (this.isTestMode) {
                    return;
                }
                
                // Update local state first
                this.$announcements.forEach(a => a.is_read = true);
                this.renderAnnouncements();
                this.renderDetails();

                // Update server state
                try {
                    await fetch(`${this.data.apiBaseURL}isReadAnnouncement`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ readAll: true, accountEmail: this.data.accountEmail })
                    });
                } catch (e) {
                    console.error('Failed to mark all as read', e);
                }
            }

            /**
             * Set up event listener for the "Mark All as Read" button
             */
            eventMarkAllAsRead() {
                const markAllBtn = document.querySelector('.mark-all-read');
                if (markAllBtn) {
                    markAllBtn.addEventListener('click', () => {
                        this.markAllAsRead();
                    });
                }
            }

            /**
             * Format a date string for display
             * @param {string} dateStr - Date string to format
             * @returns {string} Formatted date (e.g., "15 Jan")
             */
            formatDate(dateStr) {
                const date = new Date(dateStr);
                return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            }

            /**
             * Get CSS class for announcement type tags (with color cycling)
             * @param {string} type - Announcement type
             * @returns {string} CSS class name for the type tag
             */
            static getTypeTagClass(type) {
                // Initialize class mapping if not exists
                if (!this.prototype.$typeClassMap) this.prototype.$typeClassMap = {};
                if (!this.prototype.$typeClassList) this.prototype.$typeClassList = [
                    'announcement-feed-tags',
                    'announcement-feed-tags green',
                    'announcement-feed-tags orange'
                ];

                // Assign a class to the type if not already assigned
                if (!this.prototype.$typeClassMap[type]) {
                    const keys = Object.keys(this.prototype.$typeClassMap);
                    const idx = keys.length % this.prototype.$typeClassList.length;
                    this.prototype.$typeClassMap[type] = this.prototype.$typeClassList[idx];
                }

                return this.prototype.$typeClassMap[type];
            }
        }

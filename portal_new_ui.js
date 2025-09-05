/**
 * Portal Class - Main class for managing the student portal interface
 * Handles data fetching, rendering, and user interactions for the portal
 */
class Portal {
    /**
     * Constructor - Initializes the Portal instance
     * @param {Object} data - Configuration data containing API URLs and member information
     * @param {Function} onReady - Callback function to execute when portal is fully loaded
     */
    constructor(data, onReady) {
        this.data = data; // Store configuration data
        this.spinner = document.getElementById("half-circle-spinner"); // Loading spinner element
        this.onReady = onReady; // Callback function for when portal is ready
        this.render(); // Start rendering the portal
    }

    /**
     * Fetches portal data from the API
     * @returns {Promise<Object>} Portal data containing student information
     */
    async fetchData() {
        const response = await fetch(`${this.data.apiBaseURL}getPortalDetail/${this.data.memberId}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const apiData = await response.json();
        return apiData;
    }

    /**
     * Fetches millions transaction data for the member
     * @returns {Promise<Array>} Array of millions transaction data or empty array if failed
     */
    async fetchMillionsData() {
        const response = await fetch(`${this.data.apiBaseURL}getMillionsTransactionData/${this.data.memberId}`);
        if (!response.ok) {
            return [];
        };
        const millionsData = await response.json();
        return millionsData;
    }
    /**
     * Checks if user has access to referrals based on current session data
     * Controls visibility of referral links in sidebar
     * @param {Array} data - Student data array to check for current sessions
     */
    checkReferralsAccess(data) {
        const currentDateTime = new Date().toISOString();
        const referralsLinks = document.querySelectorAll('[sidebar-menu="referrals"]');

        if (data) {
            if (Array.isArray(data) && data.length > 0) {
                let hasCurrentSession = false;

                // Check each student for current session
                data.forEach((studentObj) => {
                    const studentName = Object.keys(studentObj)[0];
                    const studentData = studentObj[studentName];

                    // If student has current session, enable referrals access
                    if (
                        studentData.currentSession &&
                        Array.isArray(studentData.currentSession) &&
                        studentData.currentSession.length > 0
                    ) {
                        hasCurrentSession = true;
                        // Store referral session info in localStorage
                        localStorage.setItem(
                            "hasReferralSession",
                            JSON.stringify({ hasCurrentSession, currentDateTime, memberId: this.data.memberId })
                        );
                    }
                });

                // Show/hide referral links based on current session availability
                referralsLinks.forEach((referralsLink) => {
                    referralsLink.style.display = hasCurrentSession ? "flex" : "none";
                });

                // Store session status even if no current session
                if (!hasCurrentSession) {
                    localStorage.setItem(
                        "hasReferralSession",
                        JSON.stringify({ hasCurrentSession, currentDateTime })
                    );
                }
            } else {
                // No data available, hide referral links
                referralsLinks.forEach((referralsLink) => {
                    referralsLink.style.display = "none";
                });
            }
        } else {
            // No data provided, hide referral links
            if (referralsLinks.length > 0) {
                referralsLinks.forEach((referralsLink) => {
                    referralsLink.style.display = "none";
                });
            }
        }
    }
    /**
     * Fetches announcements for the member
     * @returns {Promise<Array>} Array of announcements or empty array if failed
     */
    async fetchAnnouncements() {
        const response = await fetch(`${this.data.apiBaseURL}getAnnouncement/${this.data.memberId}`);
        if (!response.ok) {
            return [];
        }
        const data = await response.json();
        return data;
    }

    /**
     * Controls visibility of free and paid resources based on data availability
     * @param {Object} response - Portal data response, null/undefined shows free resources
     */
    hideShowFreeAndPaidResources(response) {
        const freeResourcesDivs = document.querySelectorAll('[data-resources="free"]');
        const paidResource = document.querySelectorAll('[data-resources="paid"]');

        if (!response) {
            // No data found - show free resources, hide paid resources
            if (freeResourcesDivs) freeResourcesDivs.forEach(div => div.style.display = "block");
            if (paidResource) paidResource.forEach(div => div.style.display = "none");
            this.spinner.style.display = "none";
            return;
        }

        // Data found - hide free resources, show paid resources
        if (freeResourcesDivs) freeResourcesDivs.forEach(div => div.style.display = "none");
        if (paidResource) paidResource.forEach(div => div.style.display = "grid");
    }

    /**
     * Main render method - orchestrates the entire portal rendering process
     * Fetches data, sets up UI components, and initializes interactions
     */
    async render() {
        // Hide portal content and show loading spinner
        const paidResource = document.querySelector('.portal-info-wrapper')
        paidResource.style.display = "none";
        this.spinner.style.display = "block";

        // Fetch all required data in parallel for better performance
        const [data, millionsData, announcements] = await Promise.all([
            this.fetchData(),
            this.fetchMillionsData(),
            this.fetchAnnouncements()
        ]);

        // Handle case where no data is found
        if (data == "No data Found") {
            this.hideShowFreeAndPaidResources(false);
            return false
        }

        // Extract millions transactions data
        const millions_transactions = millionsData.millions_transactions;

        // Set up the main portal interface
        this.setupTabs(data, millions_transactions, announcements);
        this.initTooltips();
        //this.initStripePaymentLinks(); // Commented out - may be used later
        this.initiateLightbox();
        Webflow.require('tabs').redraw(); // Refresh Webflow tabs component

        // Initialize accordion components
        this.initializeFAQAccordion();
        this.initializeInvoiceAccordion();
        this.hideRegistrationFormAccordion();

        // Check and configure referrals access
        this.checkReferralsAccess(data);

        // Show portal content and hide spinner with delay for smooth transition
        paidResource.style.display = "block";
        setTimeout(() => {
            this.spinner.style.display = "none";
        }, 500);

        // Update sidebar millions count for the initially active tab
        const getCurrentStudentName = () => {
            const currentTab = document.querySelector('.portal-tab-link.w--current');
            return currentTab ? currentTab.querySelector('.portal-tab-text-semibold').textContent : '';
        };
        this.updateSidebarMillionsCount(millions_transactions, getCurrentStudentName());

        // Set up tab change listeners to update sidebar millions count
        document.querySelectorAll('.portal-tab-link').forEach(tab => {
            tab.addEventListener('click', () => {
                setTimeout(() => {
                    this.updateSidebarMillionsCount(millions_transactions, getCurrentStudentName());
                }, 0);
            });
        });

        // Execute onReady callback if provided
        if (typeof this.onReady === 'function') {
            this.onReady();
        }
    }

    /**
     * Hides registration form accordion (currently commented out)
     * This method was used to hide registration forms but is now disabled
     */
    hideRegistrationFormAccordion() {
        // const tabPane = document.querySelector('.portal-tab-pane');
        // tabPane.querySelectorAll('.registration-form-accordian').forEach(el => {
        //     if (el) el.style.display = 'none';
        // });
    }
    /**
     * Sets up dynamic tabs for each student
     * Creates tab structure based on student data and manages tab switching
     * @param {Array} data - Student data array
     * @param {Array} millionsData - Millions transaction data
     * @param {Array} announcements - Announcements data
     */
    setupTabs(data, millionsData, announcements) {
        // 1. Get references to tab menu and tab panes
        const tabMenu = document.querySelector('.portal-tab-menus');
        const tabLinks = tabMenu.querySelectorAll('.portal-tab-link');
        const tabContent = document.querySelector('.portal-tab-content');
        const tabPanes = tabContent.querySelectorAll('.portal-tab-pane');

        // 2. Filter students from data (studentDetail.studentName must exist)
        //const students = data.filter(item => item.studentDetail && item.studentDetail.studentName);
        const students = data;

        // 3. Use the first tab and pane as templates for cloning
        const tabLinkTemplate = tabLinks[0].cloneNode(true);
        const tabPaneTemplate = tabPanes[0].cloneNode(true);

        // 4. Remove all existing tab links and panes (except first ones)
        tabLinks.forEach((link, idx) => { if (idx > 0) link.remove(); });
        tabPanes.forEach((pane, idx) => { if (idx > 0) pane.remove(); });

        // 5. Clear the first tab link and pane for reuse
        const firstTabLink = tabMenu.querySelector('.portal-tab-link');
        const firstTabPane = tabContent.querySelector('.portal-tab-pane');

        // Remove active classes from first tab
        firstTabLink.classList.remove('w--current');
        firstTabLink.setAttribute('aria-selected', 'false');
        firstTabPane.classList.remove('w--tab-active');
        // 6. Sort students by currentSession[0].createdOn (most recent first)
        students.sort((a, b) => {
            const aData = Object.values(a)[0];
            const bData = Object.values(b)[0];
            const aSession = aData.currentSession && aData.currentSession[0] ? aData.currentSession[0] : null;
            const bSession = bData.currentSession && bData.currentSession[0] ? bData.currentSession[0] : null;
            const aDate = aSession && aSession.createdOn ? new Date(aSession.createdOn) : new Date(0);
            const bDate = bSession && bSession.createdOn ? new Date(bSession.createdOn) : new Date(0);
            // Most recent first (descending order)
            return bDate - aDate;
        });

        // 7. For each student, create tab link and pane
        students.forEach((student, idx) => {
            // Extract student name and data from the student object
            const studentName = Object.keys(student)[0];
            const studentData = Object.values(student)[0];
            const currentSession = studentData.currentSession && studentData.currentSession.length > 0 ? studentData.currentSession[0] : null;
            // comment for future change: studentData.currentSession.length - 1

            // Determine whether to use existing first tab or create new ones
            let tabLink, tabPane;
            if (idx === 0) {
                // Use the existing first tab and pane
                tabLink = firstTabLink;
                tabPane = firstTabPane;
            } else {
                // Clone templates for additional tabs
                tabLink = tabLinkTemplate.cloneNode(true);
                tabPane = tabPaneTemplate.cloneNode(true);
                tabMenu.appendChild(tabLink);
                tabContent.appendChild(tabPane);
            }
            // 8. Set tab attributes for Webflow tabs functionality
            tabLink.setAttribute('data-w-tab', 'Tab-' + idx);
            tabLink.setAttribute('id', 'w-tabs-0-data-w-tab-' + idx);
            tabLink.setAttribute('href', '#w-tabs-0-data-w-pane-' + idx);
            tabLink.setAttribute('aria-controls', 'w-tabs-0-data-w-pane-' + idx);
            tabPane.setAttribute('data-w-tab', 'Tab-' + idx);
            tabPane.setAttribute('id', 'w-tabs-0-data-w-pane-' + idx);
            tabPane.setAttribute('aria-labelledby', 'w-tabs-0-data-w-tab-' + idx);

            // 9. Set active class for first tab only
            if (idx === 0) {
                tabLink.classList.add('w--current');
                tabLink.setAttribute('aria-selected', 'true');
                tabPane.classList.add('w--tab-active');
            } else {
                tabLink.classList.remove('w--current');
                tabLink.setAttribute('aria-selected', 'false');
                tabPane.classList.remove('w--tab-active');
            }

            // 10. Set student name as tab label
            if (tabLink.querySelector('.portal-tab-text-semibold')) {
                tabLink.querySelector('.portal-tab-text-semibold').textContent = studentName;
            }

            // 11. Render content inside tab based on available data
            this.renderStudentTab(tabPane, studentData, millionsData, announcements);
            // 12. Control section visibility based on current session availability
            if (currentSession) {
                // Show all main sections when student has current session
                tabPane.querySelectorAll('.recent-announcement-div.current-class, .recent-announcement-info-div, [data-portal="invoice-form-accordian"], .calendar-info-grid-wrapper, .class-tools-quick-links-div, .millions-balance-flex-wrapper').forEach(el => {
                    if (el) el.style.display = '';
                });

                // Show/hide registration-form-accordian based on formList in currentSession
                const regFormAccordian = tabPane.querySelector('.registration-form-accordian');
                if (currentSession.formList && Array.isArray(currentSession.formList) && currentSession.formList.length > 0) {
                    if (regFormAccordian) regFormAccordian.style.display = 'block';
                } else {
                    if (regFormAccordian) regFormAccordian.style.display = 'none';
                }
            } else {
                // Hide all main sections if no currentSession
                tabPane.querySelectorAll('.recent-announcement-div.current-class, .recent-announcement-info-div, [data-portal="invoice-form-accordian"], .calendar-info-grid-wrapper, .class-tools-quick-links-div, .millions-balance-flex-wrapper').forEach(el => {
                    if (el) el.style.display = 'none';
                });

                // Hide registration-form-accordian if no currentSession
                tabPane.querySelectorAll('.registration-form-accordian').forEach(el => {
                    if (el) el.style.display = 'none';
                });
            }
            // 13. Always handle Future Classes and Past Class History (independent of current session)

            // Future Classes - Show if future sessions exist
            const futureClassesDiv = tabPane.querySelector('.sem-classes-info-div.future-classes');
            if (studentData.futureSession && Array.isArray(studentData.futureSession) && studentData.futureSession.length > 0) {
                if (futureClassesDiv) futureClassesDiv.style.display = '';
            } else {
                if (futureClassesDiv) futureClassesDiv.style.display = 'none';
            }

            // Past Class History - Show if past sessions exist
            const pastClassesDiv = tabPane.querySelectorAll('.sem-classes-info-div')[1]; // assuming second div is for past classes
            if (studentData.pastSession && Array.isArray(studentData.pastSession) && studentData.pastSession.length > 0) {
                if (pastClassesDiv) pastClassesDiv.style.display = '';
            } else {
                if (pastClassesDiv) pastClassesDiv.style.display = 'none';
            }
        });
    }

    /**
     * Main function to render all content for a student tab
     * Orchestrates rendering of all tab sections and components
     * @param {HTMLElement} tabPane - The tab pane element to render content into
     * @param {Object} studentData - Student data object containing all student information
     * @param {Array} millionsData - Millions transaction data
     * @param {Array} announcements - Announcements data
     */
    renderStudentTab(tabPane, studentData, millionsData, announcements) {
        const student = studentData.currentSession[0];

        if (student) {
            // Render sections that require current session data
            this.renderCurrentClassSection(tabPane, student);
            this.renderMillions(tabPane, student, millionsData);
            this.renderUploadedContent(tabPane, student);
            this.renderRecommendedLevel(tabPane, student);

            // Render pending items with delay to ensure DOM is ready
            setTimeout(() => {
                this.renderPendingItems(tabPane, student);
            }, 500);
        } else {
            // Hide recommended section if no current session data
            const recommendedSection = tabPane.querySelector('.next-recomm-prog-info');
            recommendedSection.style.display = 'none';
        }

        // Render sections that don't require current session
        this.renderRecentAnnouncements(tabPane, announcements);
        this.renderFutureClasses(tabPane, studentData);
        this.renderPastClasses(tabPane, studentData);
    }
    /**
     * Renders the recommended level section for a student
     * Shows next recommended program with countdown timer if applicable
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Student data object
     */
    renderRecommendedLevel(tabPane, student) {
        const recommendedSection = tabPane.querySelector('.next-recomm-prog-info');
        const programTitle = tabPane.querySelector('.next-recomm-prog-title');
        if (!recommendedSection) return;

        const studentName = student.studentDetail.studentName || 'Student';
        if (programTitle) {
            programTitle.textContent = `Next Recommended Program for ${studentName}`;
        }

        const recommendedLevel = student.recommendedLevel;

        // Check if recommended level data is empty or invalid
        const isEmpty = !recommendedLevel || Object.values(recommendedLevel).every(v => v === undefined || v === null || `${v}`.trim() === '');
        if (isEmpty) {
            recommendedSection.style.display = 'none';
            return;
        }

        // Show the recommended section
        recommendedSection.style.display = '';

        // Update the display text with session/year and level information
        const textEls = recommendedSection.querySelectorAll('.next-recomm-prog-text');
        if (!textEls || textEls.length === 0) return;

        const sessionYear = [recommendedLevel.session, recommendedLevel.year].filter(Boolean).join(' ');
        const levelLabel = recommendedLevel.level || '';

        // Build display text with fallback options
        let displayText = '';
        if (sessionYear && levelLabel) displayText = `${sessionYear} | ${levelLabel}`;
        else if (sessionYear) displayText = sessionYear;
        else if (levelLabel) displayText = levelLabel;
        else if (recommendedLevel.grade) displayText = recommendedLevel.grade;

        if (!displayText) {
            recommendedSection.style.display = 'none';
            return;
        }

        // Update the first text element with the display text
        textEls[0].textContent = displayText;

        // Set up modal and click events for Learn More functionality
        this.updateModalContent(student, recommendedLevel, tabPane);
        this.addLearnMoreClickEvent(recommendedSection, student, recommendedLevel);

        // Start countdown timer if early bird deadline exists
        const earlyBirdDeadline = student?.classDetail?.earlyBirdDeadlineDate;
        if (earlyBirdDeadline) {
            this.startOfferCountdown(recommendedSection, earlyBirdDeadline);
        }
    }
    /**
     * Shows a modal dialog
     * @param {HTMLElement} modal - The modal element to show
     */
    showModal(modal) {
        modal.classList.add("show");
        modal.style.display = "flex";
    }

    /**
     * Hides a modal dialog
     * @param {HTMLElement} modal - The modal element to hide
     */
    hideModal(modal) {
        modal.classList.remove("show");
        modal.style.display = "none";
    }
    /**
     * Updates the content of the recommendation modal with student-specific information
     * @param {Object} student - Student data object
     * @param {Object} recommendedLevel - Recommended level data
     * @param {HTMLElement} tabPane - Tab pane element (optional)
     */
    updateModalContent(student, recommendedLevel, tabPane = "") {
        const modal = document.getElementById('next-recomm-modal');
        if (!modal) return;

        // Get student name (fallback to 'Student' if not available)
        const studentName = student.studentDetail.studentName || 'Student';

        // Update modal title with student name
        const titleEl = document.getElementById('modal-student-name');
        if (titleEl) {
            titleEl.textContent = `Next Step for ${studentName}`;
        }

        // Update recommended text with session/year and level information
        const recommendedTextEl = document.getElementById('modal-recommended-text');
        if (recommendedTextEl) {
            const sessionYear = [recommendedLevel.session, recommendedLevel.year].filter(Boolean).join(' ');
            const levelLabel = recommendedLevel.level || '';
            const gradeLabel = recommendedLevel.grade || '';

            let recommendedText = 'Recommended: ';
            if (sessionYear && levelLabel) {
                recommendedText += `${sessionYear} | ${levelLabel}`;
            } else if (sessionYear) {
                recommendedText += sessionYear;
            } else if (levelLabel) {
                recommendedText += levelLabel;
            } else if (gradeLabel) {
                recommendedText += gradeLabel;
            }

            recommendedTextEl.textContent = recommendedText;
        }

        // Update countdown timer in modal if deadline exists
        const earlyBirdDeadline = student?.classDetail?.earlyBirdDeadlineDate;
        if (earlyBirdDeadline) {
            this.startOfferCountdown(modal, earlyBirdDeadline);
        }

        // Update enrollment links in the modal
        this.updateEnrollNowLinks(modal, recommendedLevel, tabPane);

        // Update "Why This Program" section with personalized text
        const whyProgramTextEl = modal.querySelector('.why-this-program-rounded-div .dm-sans.blue-text');
        if (whyProgramTextEl) {
            const levelLabel = recommendedLevel.level || recommendedLevel.grade || 'this level';
            whyProgramTextEl.textContent = `Based on ${studentName}'s current level and performance, we recommend enrolling in ${levelLabel} for continued skill growth and advanced debate techniques.`;
        }
    }
    /**
     * Updates enrollment links based on recommended level
     * Converts level names to URL-friendly format and updates button links
     * @param {HTMLElement} contextEl - Context element to search for buttons
     * @param {Object} recommendedLevel - Recommended level data
     * @param {HTMLElement} tabPane - Tab pane element for additional button search
     */
    updateEnrollNowLinks(contextEl, recommendedLevel, tabPane) {
        if (!contextEl || !recommendedLevel) return;

        // Get the level from recommendedLevel
        const level = recommendedLevel.level || recommendedLevel.grade || '';
        if (!level) return;

        // Convert level to URL format (e.g., "Level 3B" -> "level-3b")
        const levelUrl = level.toLowerCase()
            .replace(/\s+/g, '-')  // Replace spaces with hyphens
            .replace(/[^a-z0-9-]/g, ''); // Remove any other special characters

        // Generate the enrollment URL
        const enrollUrl = `https://www.bergendebate.com/programs/${levelUrl}`;

        // Find and update all Enroll Now buttons in the context
        const enrollButtons = document.getElementById('enroll-now-btn');
        if (enrollButtons) {
            enrollButtons.href = enrollUrl;
            enrollButtons.target = '_blank'; // Open in new tab
        }
        const enrollButtons2 = tabPane.querySelector('#enroll-now-btn-2');
        if (enrollButtons2) {
            enrollButtons2.href = enrollUrl;
            enrollButtons2.target = '_blank'; // Open in new tab
        }
    }
    /**
     * Adds click event listener to the Learn More button
     * @param {HTMLElement} recommendedSection - The recommended section element
     * @param {Object} student - Student data object
     * @param {Object} recommendedLevel - Recommended level data
     */
    addLearnMoreClickEvent(recommendedSection, student, recommendedLevel) {
        var $this = this
        const learnMoreBtn = recommendedSection.querySelector('#next-recomm-learn-more');
        if (!learnMoreBtn) return;

        // Remove existing event listeners to prevent duplicates
        learnMoreBtn.removeEventListener('click', this.handleLearnMoreClick);

        // Add new click event
        learnMoreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLearnMoreClick();
            // Update modal content with current student and recommended level data
            $this.updateModalContent(student, recommendedLevel);
        });
    }

    /**
     * Handles the Learn More button click event
     * Shows the modal and sets up close events
     */
    handleLearnMoreClick() {
        const modal = document.getElementById('next-recomm-modal');
        if (modal) {
            this.showModal(modal);
            this.addModalCloseEvents(modal);
        }
    }
    /**
     * Starts a countdown timer for early bird offers
     * Updates timer elements every second until deadline is reached
     * @param {HTMLElement} contextEl - Context element containing timer elements
     * @param {string} deadlineString - Deadline date string
     */
    startOfferCountdown(contextEl, deadlineString) {
        if (!contextEl || !deadlineString) return;

        // Locate timer elements within the provided context element
        const daysEl = contextEl.querySelector('[data-timer="day"]');
        const hoursEl = contextEl.querySelector('[data-timer="hour"]');
        const minutesEl = contextEl.querySelector('[data-timer="minutes"]');
        const secondsEl = contextEl.querySelector('[data-timer="seconds"]');
        if (!daysEl || !hoursEl || !minutesEl) return;

        // Clear any previous interval attached to this context to prevent duplicates
        if (contextEl._countdownInterval) {
            clearInterval(contextEl._countdownInterval);
            contextEl._countdownInterval = null;
        }

        // Parse deadline (treat provided string as local time)
        const parsed = new Date(deadlineString.replace(' ', 'T'));
        if (isNaN(parsed.getTime())) return;

        // Update function that calculates and displays remaining time
        const update = () => {
            const now = new Date();
            let totalSeconds = Math.floor((parsed.getTime() - now.getTime()) / 1000);

            // If deadline has passed, stop the timer
            if (totalSeconds <= 0) {
                daysEl.textContent = '0';
                hoursEl.textContent = '00';
                minutesEl.textContent = '00';
                clearInterval(contextEl._countdownInterval);
                contextEl._countdownInterval = null;
                return;
            }

            // Calculate days, hours, minutes, and seconds
            const days = Math.floor(totalSeconds / 86400);
            totalSeconds -= days * 86400;
            const hours = Math.floor(totalSeconds / 3600);
            totalSeconds -= hours * 3600;
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;

            // Update timer display elements
            daysEl.textContent = String(days);
            hoursEl.textContent = String(hours).padStart(2, '0');
            minutesEl.textContent = String(minutes).padStart(2, '0');
            secondsEl.textContent = String(seconds).padStart(2, '0');
        };

        // Initial paint and start 1-second interval updates
        update();
        contextEl._countdownInterval = setInterval(update, 1000);
    }
    /**
     * Adds event listeners for closing the modal
     * Handles background click, close button, and Escape key
     * @param {HTMLElement} modal - The modal element
     */
    addModalCloseEvents(modal) {
        // Close on background click
        const modalBg = modal.querySelector('#next-recomm-modal-bg');
        if (modalBg) {
            modalBg.addEventListener('click', () => this.hideModal(modal));
        }

        // Close on close button click
        const closeBtn = modal.querySelector('#close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideModal(modal);
            });
        }

        // Close on Escape key press
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.hideModal(modal);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }
    /**
     * Renders recent announcements in the tab pane
     * Updates sidebar counts and displays announcement content
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} announcements - Announcements data object
     */
    renderRecentAnnouncements(tabPane, announcements) {

        // Update sidebar announcement count for unread announcements
        const sidebarAnnouncementsCount = document.querySelectorAll('[data-announcements="counts"]');
        sidebarAnnouncementsCount.forEach(el => {
            // Filter unread announcements for the current account email
            el.textContent = announcements.announcement.filter(ann => !ann.is_read && ann.emailId === this.data.accountEmail).length;
            el.parentElement.style.display = 'block';
        });

        const announcementDiv = tabPane.querySelector('.recent-announcement-info-div');

        if (!announcementDiv || !Array.isArray(announcements.announcement)) return;

        // Update announcement count in the tab
        const countDiv = tabPane.querySelector('.recent-announcement-number');
        const unreadAnnouncements = announcements.announcement.filter(ann => !ann.is_read && ann.emailId === this.data.accountEmail);
        if (countDiv) countDiv.textContent = unreadAnnouncements.length;

        // Get the 2 most recent announcements
        const recent = announcements.announcement.slice(0, 2);

        // Clear existing announcement content
        announcementDiv.querySelectorAll('.recent-announcement-info-inner-div, .recent-announcement-info-flex, .dm-sans.recent-announcement-info').forEach(el => el.remove());

        // Create announcement elements for each recent announcement
        recent.forEach(ann => {
            const container = document.createElement('div');
            container.className = 'recent-announcement-info-inner-div';

            const flex = document.createElement('div');
            flex.className = 'recent-announcement-info-flex';

            // Create title element
            const title = document.createElement('p');
            title.className = 'dm-sans recent-announcement-sub-title';
            const titleText = ann.title || ann.subject || 'Announcement';
            const type = ann.type || '';
            title.textContent = type ? `${titleText}: ${type}` : titleText;

            // Create date element
            const date = document.createElement('p');
            date.className = 'dm-sans medium';
            const dates = new Date(ann.created_on);

            // Format date to "July 10" format
            const options = { month: "long", day: "numeric" };
            const formattedDate = dates.toLocaleDateString("en-US", options);
            date.textContent = formattedDate || '';

            flex.appendChild(title);
            flex.appendChild(date);

            // Create message element with text truncation
            const message = document.createElement('p');
            message.className = 'dm-sans recent-announcement-info';
            const plainText = ann.message ? ann.message.replace(/<[^>]*>/g, '') : '';
            message.textContent = plainText;

            // Apply CSS for text truncation (2 lines max)
            message.style.display = '-webkit-box';
            message.style.webkitBoxOrient = 'vertical';
            message.style.webkitLineClamp = '2';
            message.style.overflow = 'hidden';
            message.style.textOverflow = 'ellipsis';

            container.appendChild(flex);
            container.appendChild(message);
            announcementDiv.appendChild(container);
        });
    }
    /**
     * Renders future classes section for a student
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} studentData - Student data object
     */
    renderFutureClasses(tabPane, studentData) {
        const futureClassesDiv = tabPane.querySelector('.sem-classes-info-div.future-classes');
        if (!futureClassesDiv) return;

        const futureList = Array.isArray(studentData.futureSession) ? studentData.futureSession : [];
        const container = futureClassesDiv.querySelector('[data-portal="future-classe-list"]');
        if (container) container.innerHTML = '';

        if (futureList.length > 0) {
            // Show future classes section and populate with data
            futureClassesDiv.style.display = '';
            futureList.forEach(session => {
                // Get session name from various possible sources
                let text = session.sessionName || session.classDetail?.sessionName || session.summerProgramDetail?.programName || 'No details available';
                const div = document.createElement('div');
                div.className = 'announcement-flex-wrapper';
                div.innerHTML = `<img loading="lazy" src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/68752684beabb8d0a43428b5_calendar_today.svg" alt="" />\n<p class="poppins-para no-margin-bottom">${text}</p>`;
                container?.appendChild(div);
            });
        } else {
            // Hide section if no future classes
            futureClassesDiv.style.display = 'none';
            container.innerHTML = '<div>No future classes available</div>';
        }
    }

    /**
     * Renders past classes section for a student
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} studentData - Student data object
     */
    renderPastClasses(tabPane, studentData) {
        const pastClassesDiv = tabPane.querySelectorAll('.sem-classes-info-div')[1];
        if (!pastClassesDiv) return;

        const pastList = Array.isArray(studentData.pastSession) ? studentData.pastSession : [];
        const container = pastClassesDiv.querySelector('[data-portal="past-classe-list"]');
        if (container) container.innerHTML = '';

        if (pastList.length > 0) {
            // Show past classes section and populate with data
            pastClassesDiv.style.display = '';
            pastList.forEach(session => {
                let text = 'No details available';

                // Build text from class detail or summer program detail
                if (session.classDetail && Object.keys(session.classDetail).length > 0) {
                    const { sessionName = '', currentYear = '', classLevel = '', location = '' } = session.classDetail;
                    text = `${sessionName} ${currentYear} | ${classLevel} | ${location}`.replace(/\s+\|/g, '').trim();
                } else if (session.summerProgramDetail && Object.keys(session.summerProgramDetail).length > 0) {
                    const { programName = 'Summer Program', currentYear = '', location = '' } = session.summerProgramDetail;
                    text = `Summer ${currentYear ? ' | ' + currentYear : ''} ${programName} ${location ? ' | ' + location : ''}`;
                }

                const div = document.createElement('div');
                div.className = 'announcement-flex-wrapper';
                div.innerHTML = `<img loading="lazy" src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/6875275c255155b046e482da_history.svg" alt="" />\n<p class="poppins-para no-margin-bottom">${text}</p>`;
                container?.appendChild(div);

                // Add refunded indicator if applicable
                if (session.isRefunded) {
                    div.innerHTML += '<div class="refunded-rounded-div"><p class="poppins-para refunded-dark-gray-text">REFUNDED</p></div>';
                }
            });
        } else {
            // Hide section if no past classes
            pastClassesDiv.style.display = 'none';
            container.innerHTML = '<div>No past classes available</div>';
        }
    }

    /**
     * Renders the current class section for a student
     * Displays current program information including class details or summer program details
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Student data object
     */
    renderCurrentClassSection(tabPane, student) {
        const currentClassDiv = tabPane.querySelector('.recent-announcement-div.current-class');
        if (!currentClassDiv) return;

        // Check if student has class detail or summer program detail
        const hasClassDetail = student.classDetail && Object.keys(student.classDetail).length > 0;
        const hasSummerProgram = student.summerProgramDetail && Object.keys(student.summerProgramDetail).length > 0;

        const titleEl = currentClassDiv.querySelector('.recent-announcement-title');
        const classInfoEl = currentClassDiv.querySelector('.poppins-para.current-class');

        if (hasClassDetail) {
            // Display regular class information
            const { classLevel = '', day = '', startTime = '', location = '', sessionName = '', currentYear = '' } = student.classDetail;
            if (titleEl) titleEl.innerHTML = `Current Program <span class="dm-sans regular">(${sessionName} ${currentYear})</span>`;
            if (classInfoEl) classInfoEl.textContent = `${classLevel} | ${day} ${startTime} | ${location}`;
        } else if (hasSummerProgram) {
            // Display summer program information
            const { programName = 'Summer Program', location = '', year, summerSessionId } = student.summerProgramDetail;
            let inferredYear = year || 'Summer ' + (student.summerProgramDetail?.currentYear) || (new Date().getFullYear() + ' Summer');
            const paren = [inferredYear].filter(Boolean).join(', ');
            if (titleEl) titleEl.innerHTML = `Current Program <span class="dm-sans regular">(${paren})</span>`;
            if (classInfoEl) classInfoEl.textContent = programName + ' | ' + summerSessionId + ' | ' + location;
        } else {
            // Display fallback message when no program data is available
            if (titleEl) titleEl.innerHTML = `Current Program <span class="dm-sans regular">(No class or summer program data available)</span>`;
            if (classInfoEl) classInfoEl.textContent = '';
        }
    }

    /**
     * Renders pending items section and controls visibility of related accordions
     * Checks for pending forms and invoices and shows/hides appropriate sections
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Student data object
     */
    renderPendingItems(tabPane, student) {
        const wrapper = tabPane.querySelector('.items-pending-flex-wrapper');
        if (!wrapper) return;

        let hasPendingForm = false;
        let hasPendingInvoice = false;

        // Check for pending forms
        if (Array.isArray(student.formList)) {
            let allForms = student.formList.flatMap(group => group.forms || []);
            hasPendingForm = allForms.some(form => !student.formCompletedList?.some(c => c.formId === form.formId));
        }

        // Check for pending invoices
        if (Array.isArray(student.invoiceList)) {
            hasPendingInvoice = student.invoiceList.some(inv => !inv.is_completed);
        }

        // Show/hide pending items wrapper based on pending items
        wrapper.style.display = (hasPendingForm || hasPendingInvoice) ? 'flex' : 'none';

        // Hide registration form accordion if no pending forms
        if (!hasPendingForm) {
            const registrationFormDiv = tabPane.querySelector('.registration-form-accordian');
            if (registrationFormDiv) {
                registrationFormDiv.style.display = 'none';
            }
        }

        // Hide invoice accordion if no pending invoices
        if (!hasPendingInvoice) {
            const invoiceAccordion = tabPane.querySelector('.invoice-form-accordian');
            if (invoiceAccordion) {
                invoiceAccordion.style.display = 'none';
            }
        }
    }

    /**
     * Renders the millions balance for a student
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Student data object
     * @param {Array} millionsData - Millions transaction data array
     */
    renderMillions(tabPane, student, millionsData) {
        const millionsText = tabPane.querySelector('.million-price-text');
        if (!millionsText) return;

        // Find the millions entry for this student
        const entry = millionsData.find(e => e.studentName === student.studentDetail.studentName);
        const millionsCount = entry?.earnAmount || 0;
        millionsText.innerHTML = `${millionsCount} <span class="million-text-gray">millions</span>`;
    }

    /**
     * Renders all uploaded content sections for a student
     * Orchestrates rendering of various content types and resources
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Student data object
     */
    renderUploadedContent(tabPane, student) {
        this.renderHomeworkLink(tabPane, student);
        this.renderInvoiceAccordionStyled(tabPane, student);
        this.renderFailedInvoiceNotification(tabPane, student);
        this.renderRegistrationForms(tabPane, student);
        Webflow.require('tabs').redraw(); // Refresh Webflow tabs after content changes
        this.renderGoogleCalendar(tabPane, student);
        this.renderCalendarIframe(tabPane, student);
        this.renderMakeupLinks(tabPane, student);
        this.renderZoomLinks(tabPane, student);
        this.renderGeneralResources(tabPane, student);
    }

    /**
     * Renders calendar iframe from uploaded content
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Student data object
     */
    renderCalendarIframe(tabPane, student) {
        const calendarDiv = tabPane.querySelector('.calendar-white-rounded-div');
        if (!calendarDiv) return;

        // Find Google Calendar content in uploaded content
        const googleCalendar = student.uploadedContent?.find(u => u.label === 'Google Calendar');
        const calendarLink = googleCalendar?.upload_content?.[0]?.link;

        if (calendarLink) {
            // Create and configure iframe for calendar
            calendarDiv.innerHTML = '';
            const iframe = document.createElement('iframe');
            iframe.src = calendarLink;
            iframe.width = '100%';
            iframe.height = '600';
            iframe.style.border = '0';
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('scrolling', 'no');
            calendarDiv.appendChild(iframe);
        } else {
            // Show fallback message when no calendar link is available
            calendarDiv.innerHTML = '<p class="portal-node-title">Calendar Graph</p><div>No records available</div>';
        }
    }

    /**
     * Renders makeup scheduling links from uploaded content
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Student data object
     */
    renderMakeupLinks(tabPane, student) {
        const makeupDiv = tabPane.querySelector('.class-tools-quick-links-div');
        if (!makeupDiv) return;
        const makeupSection = makeupDiv.querySelector('.class-tools-quick-links-flex-wrapper');
        if (!makeupSection) return;
        makeupSection.innerHTML = '';

        // Find makeup links in uploaded content
        const makeupLink = student.uploadedContent?.find(u => u.label === 'Make-up Acuity Link');
        if (makeupLink?.upload_content?.length > 0) {
            // Create makeup link elements for each available link
            makeupLink.upload_content.forEach(item => {
                const wrapper = document.createElement('div');
                wrapper.className = 'class-tools-quick-links-flex-wrapper';

                // Create calendar icon
                const icon = document.createElement('img');
                icon.loading = 'lazy';
                icon.src = 'https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/68752684beabb8d0a43428b5_calendar_today.svg';
                icon.alt = '';
                icon.className = 'inline-block-icon';

                // Create text content container
                const textDiv = document.createElement('div');
                const titleDiv = document.createElement('div');
                titleDiv.className = 'dm-sans title';
                const titleSpan = document.createElement('span');
                titleSpan.textContent = 'Schedule a Makeup';
                titleDiv.appendChild(titleSpan);

                const subtitleDiv = document.createElement('div');
                subtitleDiv.className = 'poppins-para class-tools-quick-links';
                const subtitleSpan = document.createElement('span');
                subtitleSpan.textContent = 'One-click redirect to Acuity';
                subtitleDiv.appendChild(subtitleSpan);

                // Create link container with external link icon
                const linkDiv = document.createElement('div');
                linkDiv.className = 'poppins-para scheduling';
                const a = document.createElement('a');
                a.href = item.link;
                a.classList.add('any-link', 'underline');
                a.textContent = 'Go to scheduling';
                a.target = '_blank';
                a.style.marginRight = '8px';

                // Create external link icon
                const img = document.createElement('img');
                img.src = 'https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/68835aaecba0da532a6b3d19_Group%20(2).svg';
                img.alt = 'click to open link';
                img.style.cursor = 'pointer';
                img.style.width = '18px';
                img.style.height = '18px';

                // Add click behavior to open link in new tab
                this.addTooltipCopyBehavior(img, item.link);

                linkDiv.appendChild(a);
                var imgContainer = document.createElement('div');
                imgContainer.classList.add("new-tab-icon-wrapper")
                imgContainer.appendChild(img);
                linkDiv.appendChild(imgContainer);
                textDiv.appendChild(titleDiv);
                textDiv.appendChild(subtitleDiv);
                textDiv.appendChild(linkDiv);

                makeupSection.appendChild(icon);
                makeupSection.appendChild(textDiv);
            });
        } else {
            // Show fallback message when no makeup links are available
            makeupSection.innerHTML = '<div>No records available</div>';
        }
    }

    /**
     * Renders Zoom links from uploaded content
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Student data object
     */
    renderZoomLinks(tabPane, student) {
        const zoomDiv = tabPane.querySelector('.zoom-links-info-wrapper');
        if (!zoomDiv) return;

        // Clear existing zoom link elements
        zoomDiv.querySelectorAll('.zoom-links-info-div').forEach(el => el.remove());

        // Find Zoom links in uploaded content
        const zoomLinks = student.uploadedContent?.find(u => u.label === 'Zoom links');
        if (zoomLinks?.upload_content?.length > 0) {
            // Create zoom link elements for each available link
            zoomLinks.upload_content.forEach(item => {
                const wrapper = document.createElement('div');
                wrapper.className = 'zoom-links-info-div';

                // Create title element
                const titleDiv = document.createElement('div');
                titleDiv.className = 'dm-sans title';
                const titleSpan = document.createElement('span');
                titleSpan.textContent = item.name || 'Zoom Link';
                titleDiv.appendChild(titleSpan);

                // Create external link icon
                const img = document.createElement('img');
                img.src = 'https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/68835aaecba0da532a6b3d19_Group%20(2).svg';
                img.alt = 'Copy link';
                img.style.cursor = 'pointer';
                img.style.width = '18px';
                img.style.height = '18px';
                img.style.marginLeft = '8px';

                // Create subtitle element
                const subtitleDiv = document.createElement('div');
                subtitleDiv.className = 'poppins-para class-tools-quick-links';
                const subtitleSpan = document.createElement('span');
                subtitleSpan.textContent = item.resourceDesc || '';
                subtitleDiv.appendChild(subtitleSpan);

                // Add click behavior to open link in new tab
                this.addTooltipCopyBehavior(img, item.link);

                // Assemble the wrapper structure
                const titleDescWrapper = document.createElement('div');
                titleDescWrapper.appendChild(titleDiv);
                titleDescWrapper.appendChild(subtitleDiv);

                wrapper.appendChild(titleDescWrapper);
                var imgContainer = document.createElement('div');
                imgContainer.classList.add("new-tab-icon-wrapper")
                imgContainer.appendChild(img);
                wrapper.appendChild(imgContainer);
                zoomDiv.appendChild(wrapper);
            });
        } else {
            // Show fallback message when no zoom links are available
            const zoomSection = zoomDiv.querySelector('.zoom-links-info-div');
            if (zoomSection) zoomSection.innerHTML = '<div>No records available</div>';
        }
    }

    /**
     * Renders general resources from uploaded content
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Student data object
     */
    renderGeneralResources(tabPane, student) {
        const generalDiv = tabPane.querySelector('.general-resources-info-wrapper');
        if (!generalDiv) return;

        // Clear existing general resource elements
        generalDiv.querySelectorAll('.general-resources-flex-wrapper').forEach(el => el.remove());

        // Find general resources in uploaded content
        const generalResources = student.uploadedContent?.find(u => u.label === 'General resources');
        if (generalResources?.upload_content?.length > 0) {
            // Create general resource elements for each available resource
            generalResources.upload_content.forEach(item => {
                const wrapper = document.createElement('div');
                wrapper.className = 'general-resources-flex-wrapper';

                // Create left content container
                const leftDiv = document.createElement('div');
                const titleDiv = document.createElement('div');
                titleDiv.className = 'dm-sans title';
                const titleSpan = document.createElement('span');
                titleSpan.textContent = item.name || 'Resource';
                titleDiv.appendChild(titleSpan);

                const subtitleDiv = document.createElement('div');
                subtitleDiv.className = 'poppins-para class-tools-quick-links';
                const subtitleSpan = document.createElement('span');
                subtitleSpan.textContent = item.resourceDesc || '';
                subtitleDiv.appendChild(subtitleSpan);

                leftDiv.appendChild(titleDiv);
                leftDiv.appendChild(subtitleDiv);

                // Create external link icon
                const img = document.createElement('img');
                img.loading = 'lazy';
                img.src = 'https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/68835aaecba0da532a6b3d19_Group%20(2).svg';
                img.alt = 'Copy link';
                img.className = 'inline-block-icon';
                img.style.cursor = 'pointer';
                img.style.width = '18px';
                img.style.height = '18px';

                // Add click behavior to open link in new tab
                this.addTooltipCopyBehavior(img, item.link);

                // Assemble the wrapper structure
                wrapper.appendChild(leftDiv);
                var imgContainer = document.createElement('div');
                imgContainer.classList.add("new-tab-icon-wrapper")
                imgContainer.appendChild(img);
                wrapper.appendChild(imgContainer);
                wrapper.appendChild(imgContainer); // Note: This appears to be duplicated
                generalDiv.appendChild(wrapper);
            });
        } else {
            // Show fallback message when no general resources are available
            const noDiv = document.createElement('div');
            noDiv.className = 'general-resources-flex-wrapper';
            noDiv.innerHTML = '<div><div class="dm-sans title"><span>No records available</span></div></div>';
            generalDiv.appendChild(noDiv);
        }
    }

    /**
     * Adds click behavior to open links in new tabs
     * Previously included tooltip functionality (now commented out)
     * @param {HTMLElement} img - The image element to add behavior to
     * @param {string} link - The URL to open when clicked
     */
    addTooltipCopyBehavior(img, link) {
        // Open link in new tab when image is clicked
        img.addEventListener('click', () => {
            window.open(link, '_blank');
        });

        // Commented out tooltip functionality - may be used in future
        // let tooltip;
        // const showTooltip = (text) => {
        //     if (!tooltip) {
        //         tooltip = document.createElement('div');
        //         tooltip.className = 'copy-tooltip';
        //         tooltip.style.position = 'absolute';
        //         tooltip.style.background = '#222';
        //         tooltip.style.color = '#fff';
        //         tooltip.style.padding = '4px 10px';
        //         tooltip.style.borderRadius = '4px';
        //         tooltip.style.fontSize = '12px';
        //         tooltip.style.zIndex = 10000;
        //         document.body.appendChild(tooltip);
        //     }
        //     tooltip.textContent = text;
        //     const rect = img.getBoundingClientRect();
        //     tooltip.style.left = (rect.left + window.scrollX + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
        //     tooltip.style.top = (rect.top + window.scrollY - 30) + 'px';
        //     tooltip.style.display = 'block';
        // };
        // const hideTooltip = () => {
        //     if (tooltip) tooltip.style.display = 'none';
        // };
        // img.addEventListener('mouseenter', () => showTooltip('Copy link'));
        // img.addEventListener('mouseleave', hideTooltip);
        // img.addEventListener('focus', () => showTooltip('Copy link'));
        // img.addEventListener('blur', hideTooltip);
        // img.addEventListener('click', () => {
        //     navigator.clipboard.writeText(link).then(() => {
        //         showTooltip('Copied!');
        //         setTimeout(hideTooltip, 1200);
        //     });
        // });
    }



    /**
     * Renders Google Calendar iframe using student's parent email
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Student data object
     */
    renderGoogleCalendar(tabPane, student) {
        const calendarDiv = tabPane.querySelector('.calendar-white-rounded-div');
        if (calendarDiv && student.studentDetail && student.studentDetail.parentEmail) {
            // Remove any previous iframe to prevent duplicates
            let oldIframe = calendarDiv.querySelector('iframe[data-google-calendar]');
            if (oldIframe) oldIframe.remove();

            // Create new iframe for Google Calendar
            const iframe = document.createElement('iframe');
            iframe.setAttribute('data-google-calendar', '1');
            iframe.style.border = '0';
            iframe.width = '800';
            iframe.height = '600';
            iframe.frameBorder = '0';
            iframe.scrolling = 'no';

            // Use the student's parent email as the calendar source (must be public!)
            const calendarEmail = encodeURIComponent(student.studentDetail.parentEmail);
            iframe.src = `https://calendar.google.com/calendar/embed?src=${calendarEmail}&ctz=America%2FChicago`;
            calendarDiv.appendChild(iframe);
        }
    }

    /**
     * Renders homework link with lightbox functionality
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Student data object
     */
    renderHomeworkLink(tabPane, student) {
        const homeworkDiv = tabPane.querySelector('[data-portal="homework-link"]');
        const homeworkImg = homeworkDiv ? homeworkDiv.querySelector('[data-portal="homework-link-image"]') : null;
        const homeworkNewTabIcon = homeworkDiv ? homeworkDiv.querySelector('[data-portal="homework-new-tab-icon"]') : null;

        if (homeworkDiv) {
            if (student.studentDetail.home_work_link) {
                // Show homework section if link exists
                homeworkDiv.style.display = 'flex';

                if (homeworkImg && !homeworkImg._copyHandlerAttached) {
                    // Set up tooltip functionality (currently commented out)
                    let tooltip;
                    const showTooltip = (text) => {
                        if (!tooltip) {
                            tooltip = document.createElement('div');
                            tooltip.className = 'copy-tooltip';
                            tooltip.style.position = 'absolute';
                            tooltip.style.background = '#222';
                            tooltip.style.color = '#fff';
                            tooltip.style.padding = '4px 10px';
                            tooltip.style.borderRadius = '4px';
                            tooltip.style.fontSize = '12px';
                            tooltip.style.zIndex = 10000;
                            document.body.appendChild(tooltip);
                        }
                        tooltip.textContent = text;
                        const rect = homeworkImg.getBoundingClientRect();
                        tooltip.style.left = (rect.left + window.scrollX + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
                        tooltip.style.top = (rect.top + window.scrollY - 30) + 'px';
                        tooltip.style.display = 'block';
                    };
                    const hideTooltip = () => {
                        if (tooltip) tooltip.style.display = 'none';
                    };

                    // Configure homework image for lightbox functionality
                    homeworkImg.style.cursor = 'pointer';
                    homeworkImg.setAttribute('tabindex', '0');
                    homeworkImg.setAttribute('aria-label', 'Copy homework link');

                    // Add click event to open homework in lightbox
                    homeworkImg.addEventListener('click', () => {
                        var lightbox = document.getElementById('lightbox');
                        var iframe = lightbox.querySelector('iframe');
                        iframe.src = student.studentDetail.home_work_link;
                        lightbox.style.display = 'block';
                    });

                    // Mark handler as attached to prevent duplicates
                    homeworkImg._copyHandlerAttached = true;

                    // Add click event to new tab icon to open homework in new tab
                    homeworkNewTabIcon.addEventListener('click', () => {
                        window.open(student.studentDetail.home_work_link, '_blank');
                    });
                }
            } else {
                // Hide homework section if no link exists
                homeworkDiv.style.display = 'none';
            }
        }
    }

    /**
     * Renders styled invoice accordion with payment functionality
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Student data object
     */
    renderInvoiceAccordionStyled(tabPane, student) {
        var $this = this;

        // Find the placeholder for the invoice accordion
        const invoiceAccordion = tabPane.querySelector('[data-portal="invoice-form-accordian"]');
        if (!invoiceAccordion) return;

        // Remove any previous content
        invoiceAccordion.innerHTML = '';

        const invoices = student.invoiceList || [];
        if (!Array.isArray(invoices) || invoices.length === 0) {
            // If no invoices, do not render the accordion, just clear
            return;
        }

        // Create accordion header with dynamic status
        invoiceAccordion.className = 'invoice-form-accordian registration-form-accordian'; // reuse styles
        invoiceAccordion.innerHTML = `
            <div class="registration-form-accordion-header">
                <div class="registration-form-title"><span>Invoices</span></div>
                <div class="registration-form-flex-wrapper">
                    <div class="registration-form-tag">
                        <p class="dashboard-tag-text">${invoices.some(inv => !inv.is_completed) ? 'Needs to be completed' : 'All Paid'}</p>
                    </div>
                    <img loading="eager" src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/66bc5bebffd8cf0e335b1d95_icon%20(2).svg" alt="" class="registration-form-toggle-icon-open" />
                    <img loading="eager" src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/68778b4fa96c8f8c87733352_check_indeterminate_small.svg" alt="" class="registration-form-toggle-icon-close" />
                </div>
            </div>
            <div class="registration-form-accordion-body">
                <div class="completion-progress-div">
                    <div class="completion-progress-flex-wrapper">
                        <img loading="lazy" src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/6877903fb840c5aea61921a4_clock_loader_40.svg" alt="" class="inline-block-icon" />
                        <div class="dm-sans completion-progress"><span>Completion Progress</span></div>
                        <div class="dm-sans medium-text-with-margin-auto"><span></span></div>
                    </div>
                    <div class="completion-progress-bar">
                        <div class="progress-bar-red-fill"></div>
                    </div>
                    <div class="completion-percent-flex-wrapper">
                        <div class="dm-sans bold-text-with-margin-auto"><span></span></div>
                    </div>
                </div>
                <div class="required-forms-div"></div>
            </div>
        `;

        // Fill in invoice data and progress information
        const body = invoiceAccordion.querySelector('.registration-form-accordion-body');
        const requiredDiv = body.querySelector('.required-forms-div');
        requiredDiv.innerHTML = '';

        // Calculate completion statistics
        const completed = invoices.filter(inv => inv.is_completed).length;
        const total = invoices.length;
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

        // Update progress display elements
        const progressText = body.querySelector('.medium-text-with-margin-auto span');
        if (progressText) progressText.textContent = `${completed} of ${total} invoices complete`;
        const percentText = body.querySelector('.bold-text-with-margin-auto span');
        if (percentText) percentText.textContent = `${percent}%`;
        const progressBar = body.querySelector('.progress-bar-red-fill');
        if (progressBar) progressBar.style.width = `${percent}%`;

        // Create invoice list items
        invoices.forEach(inv => {
            const div = document.createElement('div');
            div.className = 'required-forms-flex-wrapper bluish-gray-rounded-with-mt-10';
            const isCompleted = inv.is_completed;

            // Create action links container for payment options
            const actionLinksContainer = document.createElement('span');
            actionLinksContainer.style.textDecoration = 'underline';

            if (!isCompleted && Array.isArray(inv.jotFormUrlLink)) {
                // Create payment links for incomplete invoices
                inv.jotFormUrlLink.forEach((link, idx) => {
                    let a;
                    if (link.paymentType === 'card' || link.paymentType === 'us_bank_account') {
                        // Create Stripe payment link
                        a = document.createElement('a');
                        a.href = '#';
                        a.className = 'pay-link';
                        a.setAttribute('data-invoice-id', inv.invoice_id);
                        a.setAttribute('data-amount', link.amount);
                        a.setAttribute('data-payment-link-id', link.paymentLinkId);
                        a.setAttribute('data-title', link.title);
                        a.setAttribute('data-payment-type', link.paymentType);
                        a.textContent = link.title;

                        // Add event listener for Stripe payment processing
                        a.addEventListener('click', (e) => {
                            e.preventDefault();
                            a.textContent = 'Processing...';
                            if (typeof $this.initializeStripePayment === 'function') {
                                $this.initializeStripePayment(
                                    inv.invoice_id,
                                    inv.invoiceName,
                                    link.amount,
                                    link.paymentLinkId,
                                    a, // pass the link element
                                    link.title,
                                    link.paymentType,
                                    student
                                );
                            }
                        });
                    } else {
                        // Create regular JotForm link
                        a = document.createElement('a');
                        a.href = link.jotFormUrl;
                        a.target = '_blank';
                        a.className = 'pay-link';
                        a.textContent = link.title;
                    }
                    actionLinksContainer.appendChild(a);

                    // Add separator between multiple payment options
                    if (idx < inv.jotFormUrlLink.length - 1) {
                        actionLinksContainer.appendChild(document.createTextNode(' | '));
                    }
                });
            } else if (isCompleted) {
                // Show "Paid" status for completed invoices
                actionLinksContainer.innerHTML = '<span class="invoice-paid">Paid</span>';
            }
            // Create invoice item HTML structure
            div.innerHTML = `
                <div class="required-forms-inner-flex-wrapper">
                    <img loading="lazy" src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/68777aa573ccf80dbcfca9a0_svg1053.svg" alt="" class="inline-block-icon">
                    <div>
                        <div class="poppins-para medium"><span>${inv.invoiceName}</span></div>
                        <div class="poppins-para dark-gray"><span>${inv.status === 'Complete' || isCompleted ? 'Paid' : 'Pending'}</span></div>
                    </div>
                </div>
                <div class="required-forms-tags-wrapper">
                    <div class="${isCompleted ? 'required-form-completed-tag' : 'required-form-in-completed-tag'}">
                        <p class="${isCompleted ? 'completed-tag-text' : 'incompleted-tag-text'}">${isCompleted ? 'Completed' : 'Incompleted'}</p>
                    </div>
                    <div class="edit-form-flex-wrapper">
                        <img loading="lazy" src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/68777c5d76467e79b4430b3c_border_color.svg" alt="" class="inline-block-icon">
                        <span class="action-links-placeholder"></span>
                    </div>
                </div>
            `;

            // Replace placeholder with action links container
            const placeholder = div.querySelector('.action-links-placeholder');
            if (placeholder) {
                placeholder.replaceWith(actionLinksContainer);
            }
            requiredDiv.appendChild(div);
        });

        // Set up accordion open/close functionality
        const header = invoiceAccordion.querySelector('.registration-form-accordion-header');
        header.addEventListener('click', function () {
            if (invoiceAccordion.classList.contains('open')) {
                // Close the accordion
                invoiceAccordion.classList.remove('open');
                body.style.maxHeight = '0';
            } else {
                // Close other open accordions in this tab first
                tabPane.querySelectorAll('.registration-form-accordian.open').forEach(faq => {
                    faq.classList.remove('open');
                    const b = faq.querySelector('.registration-form-accordion-body');
                    if (b) b.style.maxHeight = '0';
                });

                // Open the current accordion
                invoiceAccordion.classList.add('open');
                body.style.maxHeight = body.scrollHeight + 'px';
            }
        });
    }

    /**
     * Renders notification for failed invoice payments
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Student data object
     */
    renderFailedInvoiceNotification(tabPane, student) {
        if (student.invoiceList && student.invoiceList.some(inv => inv.status === 'Failed')) {
            const failedDiv = document.createElement('div');
            failedDiv.className = 'notification-failed-invoice';
            failedDiv.innerHTML = '<span>Some invoices have failed payments. Please pay again.</span>';
            tabPane.prepend(failedDiv);
        }
    }

    /**
     * Renders registration forms accordion with completion tracking
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Student data object
     */
    renderRegistrationForms(tabPane, student) {
        const regFormAccordian = tabPane.querySelector('.registration-form-accordian');
        if (regFormAccordian) {
            const regFormBody = regFormAccordian.querySelector('.registration-form-accordion-body');
            if (regFormBody) {
                const requiredFormsDiv = regFormBody.querySelector('.required-forms-div');
                const progressDiv = regFormBody.querySelector('.completion-progress-div');
                const needsToBeCompleted = regFormAccordian.querySelector('.dashboard-tag-text');

                if (requiredFormsDiv) {
                    requiredFormsDiv.innerHTML = '';
                    let forms = [];

                    // Flatten form groups into single array
                    if (student.formList && student.formList.length > 0) {
                        student.formList.forEach(formGroup => {
                            if (formGroup.forms && formGroup.forms.length > 0) {
                                forms = forms.concat(formGroup.forms);
                            }
                        });
                    }

                    // Hide registration form accordion if no forms
                    const regFormTitle = regFormAccordian.querySelector('.registration-form-title span');
                    if (regFormTitle && regFormTitle.textContent.trim() === 'Registration Forms') {
                        if (forms.length === 0) {
                            regFormAccordian.style.display = 'none';
                            return;
                        } else {
                            regFormAccordian.style.display = 'block';
                        }
                    }
                    // Helper function to check if a form is completed
                    const checkform = (formId) => {
                        if (!formId || !Array.isArray(student.formCompletedList)) return false;
                        return student.formCompletedList.some(el => el.formId == formId);
                    };

                    if (forms.length === 0) {
                        // Hide progress elements and show no forms message
                        if (progressDiv) progressDiv.style.display = 'none';
                        requiredFormsDiv.style.display = 'none';
                        if (needsToBeCompleted) needsToBeCompleted.style.display = 'none';
                        const noFormDiv = document.createElement('div');
                        noFormDiv.className = 'required-forms-flex-wrapper bluish-gray-rounded';
                        noFormDiv.innerHTML = `<div class="required-forms-inner-flex-wrapper"><div><div class="poppins-para medium"><span>No registration forms available</span></div></div></div>`;
                        regFormBody.appendChild(noFormDiv);
                    } else {
                        // Show progress elements and form list
                        if (progressDiv) progressDiv.style.display = '';
                        requiredFormsDiv.style.display = 'block';
                        if (needsToBeCompleted) needsToBeCompleted.style.display = '';

                        // Create header for forms section
                        const header = document.createElement('div');
                        header.className = 'required-forms-flex-wrapper';
                        header.innerHTML = `<img loading="lazy" src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/687776c15a20ab54ef82bb9b_receipt_long%20(1).svg" alt="" class="inline-block-icon"><div class="poppins-para no-margin-bottom"><span>Required Forms</span></div>`;
                        requiredFormsDiv.appendChild(header);

                        // Calculate completion statistics
                        const completedForms = forms.filter(f => checkform(f.formId)).length;
                        const totalForms = forms.length;
                        const percent = totalForms === 0 ? 0 : Math.round((completedForms / totalForms) * 100);

                        // Update progress display elements
                        const progressText = regFormBody.querySelector('.medium-text-with-margin-auto span');
                        if (progressText) {
                            progressText.textContent = `${completedForms} of ${totalForms} forms complete`;
                        }
                        const percentText = regFormBody.querySelector('.bold-text-with-margin-auto span');
                        if (percentText) {
                            percentText.textContent = `${percent}%`;
                        }
                        const progressBar = regFormBody.querySelector('.progress-bar-red-fill');
                        if (progressBar) {
                            progressBar.style.width = `${percent}%`;
                        }

                        // Create form list items
                        forms.forEach(form => {
                            const editable = checkform(form.formId);
                            let actionText = '';
                            let formLinkHref = '';
                            const is_live = form.is_live;

                            if (is_live) {
                                if (editable) {
                                    // Form is completed - determine if editable or view-only
                                    let dbData = (student.formCompletedList || []).find(o => o.formId == form.formId);
                                    if (form.is_editable) {
                                        // Create edit link for completed form
                                        formLinkHref = (form.formId && dbData && dbData.submissionId) ?
                                            `https://www.jotform.com/edit/${dbData.submissionId}?memberId=${this.data.memberId || ''}&classId=${student.classDetail ? student.classDetail.classId : ''}&studentName=${encodeURIComponent(student.studentDetail.studentName)}&accountEmail=${encodeURIComponent(student.studentDetail.parentEmail)}&paymentId=${student.studentDetail.uniqueIdentification}` :
                                            '';
                                        actionText = 'Edit form';
                                    } else {
                                        // Create view-only link for completed form
                                        formLinkHref = (dbData && dbData.submissionId) ?
                                            `https://www.jotform.com/submission/${dbData.submissionId}` : '';
                                        actionText = 'View Form';
                                    }
                                } else {
                                    // Form is not completed - create new form link
                                    formLinkHref = (form.formId) ?
                                        `https://form.jotform.com/${form.formId}?memberId=${this.data.memberId || ''}&classId=${student.classDetail ? student.classDetail.classId : ''}&studentName=${encodeURIComponent(student.studentDetail.studentName)}&accountEmail=${encodeURIComponent(student.studentDetail.parentEmail)}&paymentId=${student.studentDetail.uniqueIdentification}` :
                                        '';
                                    actionText = 'Go to form';
                                }
                            } else {
                                // Form is not live
                                actionText = 'Go to form';
                                formLinkHref = '';
                            }

                            // Determine completion status and link class
                            const isCompleted = editable;
                            const linkClass = (is_live && window.innerWidth > 1200) ? 'iframe-lightbox-link dm-sans edit-form' : 'dm-sans edit-form';

                            // Create form item HTML structure
                            const formDiv = document.createElement('div');
                            formDiv.className = 'required-forms-flex-wrapper bluish-gray-rounded-with-mt-10';
                            formDiv.innerHTML = `
                                <div class="required-forms-inner-flex-wrapper">
                                    <img loading="lazy" src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/68777aa573ccf80dbcfca9a0_svg1053.svg" alt="" class="inline-block-icon">
                                    <div>
                                        <div class="poppins-para medium"><span>${form.name}</span></div>
                                        <div class="poppins-para dark-gray"><span>Required for program enrollment</span></div>
                                    </div>
                                </div>
                                <div class="required-forms-tags-wrapper">
                                    <div class="${isCompleted ? 'required-form-completed-tag' : 'required-form-in-completed-tag'}">
                                        <p class="${isCompleted ? 'completed-tag-text' : 'incompleted-tag-text'}">${isCompleted ? 'Completed' : 'Incompleted'}</p>
                                    </div>
                                    <div class="edit-form-flex-wrapper">
                                        <img loading="lazy" src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/68777c5d76467e79b4430b3c_border_color.svg" alt="" class="inline-block-icon">
                                        <a href="${formLinkHref}" target="_blank" class="${linkClass}" style="text-decoration:underline;">${actionText}</a>
                                    </div>
                                </div>
                            `;
                            requiredFormsDiv.appendChild(formDiv);
                        });
                    }
                }
            }
        }
    }

    /**
     * Initializes tooltips for elements with [tip] attribute
     * Creates and positions tooltips on mouse enter/leave
     */
    initTooltips() {
        setTimeout(() => {
            document.querySelectorAll('[tip]').forEach(el => {
                el.addEventListener('mouseenter', function (e) {
                    // Create tooltip element
                    let tipDiv = document.createElement('div');
                    tipDiv.className = 'tooltip';
                    tipDiv.textContent = el.getAttribute('tip');
                    document.body.appendChild(tipDiv);

                    // Position tooltip relative to element
                    const rect = el.getBoundingClientRect();
                    tipDiv.style.position = 'absolute';
                    tipDiv.style.left = (rect.left + window.scrollX + 20) + 'px';
                    tipDiv.style.top = (rect.top + window.scrollY - 10) + 'px';
                    el._tipDiv = tipDiv;
                });

                el.addEventListener('mouseleave', function (e) {
                    // Remove tooltip on mouse leave
                    if (el._tipDiv) {
                        el._tipDiv.remove();
                        el._tipDiv = null;
                    }
                });
            });
        }, 0);
    }
    /**
     * Initializes Stripe payment processing for invoices
     * @param {string} invoice_id - Invoice ID
     * @param {string} title - Payment title
     * @param {number} amount - Payment amount
     * @param {string} paymentLinkId - Payment link ID
     * @param {HTMLElement} span - Link element to update
     * @param {string} link_title - Link title text
     * @param {string} paymentType - Payment type (card, bank account, etc.)
     * @param {Object} student - Student data object
     */
    initializeStripePayment(invoice_id, title, amount, paymentLinkId, span, link_title, paymentType, student) {
        // Convert amount to cents for Stripe
        var centAmount = (amount * 100).toFixed(2);
        var data = {
            "email": student.studentDetail.parentEmail,
            "name": student.studentDetail.studentName,
            "label": title,
            "paymentType": paymentType,
            "amount": parseFloat(centAmount),
            "invoiceId": invoice_id,
            "paymentId": student.studentDetail.uniqueIdentification,
            "paymentLinkId": paymentLinkId,
            "memberId": this.data.memberId,
            "successUrl": encodeURI("https://www.bergendebate.com/members/" + this.data.memberId + "?programName=" + title),
            "cancelUrl": "https://www.bergendebate.com/members/" + this.data.memberId,
        }

        // Send payment request to API
        var xhr = new XMLHttpRequest()
        var $this = this;
        xhr.open("POST", "https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/createCheckoutUrl", true)
        xhr.withCredentials = false
        xhr.send(JSON.stringify(data))

        xhr.onload = function () {
            let responseText = JSON.parse(xhr.responseText);
            console.log('responseText', responseText)
            if (responseText.success) {
                // Restore link text and redirect to Stripe checkout
                span.innerHTML = link_title;
                window.location.href = responseText.stripe_url;
            }
        }
    }
    /**
     * Initializes Stripe payment links (currently commented out in main render)
     * Alternative payment initialization method using fetch API
     */
    initStripePaymentLinks() {
        setTimeout(() => {
            document.querySelectorAll('.pay-link[data-invoice-id]').forEach(link => {
                link.addEventListener('click', function (e) {
                    e.preventDefault();
                    const invoiceId = link.getAttribute('data-invoice-id');
                    const amount = link.getAttribute('data-amount');
                    const paymentLinkId = link.getAttribute('data-payment-link-id');
                    const title = link.getAttribute('data-title');
                    const paymentType = link.getAttribute('data-payment-type');

                    // Send payment request using fetch API
                    fetch('https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/createCheckoutUrl', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: '',
                            name: '',
                            label: title,
                            paymentType: paymentType,
                            amount: parseFloat(amount),
                            invoiceId: invoiceId,
                            paymentId: '',
                            paymentLinkId: paymentLinkId,
                            memberId: this.data.memberId,
                            successUrl: window.location.href,
                            cancelUrl: window.location.href
                        })
                    })
                        .then(res => res.json())
                        .then(data => {
                            if (data.success && data.stripe_url) {
                                window.location.href = data.stripe_url;
                            } else {
                                alert('Payment failed to initialize.');
                            }
                        })
                        .catch(() => alert('Payment failed to initialize.'));
                });
            });
        }, 0);
    }
    /**
     * Check form's id in completedForm list (from MongoDB) and use to determine if form is editable
     * @param {string} $formId - Jotform Id
     * @returns {boolean} True if form is completed
     */
    checkform($formId) {
        if ($formId) {
            const found = this.$completedForm.some(el => el.formId == $formId);
            return found;
        }
        return false;
    }

    /**
     * Get form data for a specific form ID
     * @param {string} $formId - Jotform Id
     * @returns {Object} Form data object
     */
    getformData($formId) {
        let data = this.$completedForm.find(o => o.formId == $formId);
        return data;
    }
    /**
     * Initializes lightbox functionality for iframe links
     * Sets up lightbox with reload and tab restoration on close
     */
    initiateLightbox() {
        var $this = this;
        [].forEach.call(document.getElementsByClassName("iframe-lightbox-link"), function (el) {
            el.lightbox = new IframeLightbox(el, {
                onClosed: function () {
                    // Reload page and restore active tab after lightbox closes
                    window.location.reload()
                    let activeTab = document.querySelector('.portal-tab-link.w--current');
                    let activeTabName = activeTab ? activeTab.querySelector('.portal-tab-text-semibold').textContent : null;

                    $this.spinner.style.display = 'block';
                    setTimeout(function () {
                        // Pass a callback to Portal that restores the tab
                        let portal = new Portal($this.data, function () {
                            if (activeTabName) {
                                let tabs = document.querySelectorAll('.portal-tab-link');
                                tabs.forEach(tab => {
                                    let name = tab.querySelector('.portal-tab-text-semibold');
                                    if (name && name.textContent === activeTabName) {
                                        tab.click();
                                    }
                                });
                            }
                            $this.spinner.style.display = 'none';
                        });
                    }, 500);
                },
                scrolling: true,
            });
        });
    }
    /**
     * Initializes FAQ accordion functionality
     * Sets up click handlers for accordion headers with open/close behavior
     */
    initializeFAQAccordion() {
        const faqItems = document.querySelectorAll('.registration-form-accordian');

        faqItems.forEach((item, index) => {
            const header = item.querySelector('.registration-form-accordion-header');
            const body = item.querySelector('.registration-form-accordion-body');

            header.addEventListener('click', function () {
                if (item.classList.contains('open')) {
                    // Close the current accordion
                    item.classList.remove('open');
                    body.style.maxHeight = '0';
                } else {
                    // Close any other open FAQ items first
                    faqItems.forEach(faq => {
                        faq.classList.remove('open');
                        faq.querySelector('.registration-form-accordion-body').style.maxHeight = '0';
                    });

                    // Open the current FAQ item
                    item.classList.add('open');
                    body.style.maxHeight = body.scrollHeight + 'px'; // Set max-height dynamically based on content height
                }
            });
        });
    }

    /**
     * Initializes invoice accordion functionality
     * Sets up click handlers for invoice accordion headers and lightbox close functionality
     */
    initializeInvoiceAccordion() {
        const invoiceItems = document.querySelectorAll('.invoice-form-accordian');

        invoiceItems.forEach((item, index) => {
            const header = item.querySelector('.registration-form-accordion-header');
            const body = item.querySelector('.registration-form-accordion-body');
            if (!header || !body) return;

            header.addEventListener('click', function () {
                if (item.classList.contains('open')) {
                    // Close the current accordion
                    item.classList.remove('open');
                    body.style.maxHeight = '0';
                } else {
                    // Close any other open invoice accordions first
                    invoiceItems.forEach(inv => {
                        inv.classList.remove('open');
                        const b = inv.querySelector('.registration-form-accordion-body');
                        if (b) b.style.maxHeight = '0';
                    });

                    // Open the current invoice accordion
                    item.classList.add('open');
                    body.style.maxHeight = body.scrollHeight + 'px';
                }
            });
        });

        // Set up lightbox close functionality
        var closeLink = document.getElementById('closeLightbox');
        closeLink.addEventListener('click', function () {
            var lightbox = document.getElementById('lightbox');
            lightbox.style.display = 'none';
        });
    }

    /**
     * Updates sidebar millions count for the specified student
     * @param {Array} millionsData - Millions transaction data array
     * @param {string} studentName - Name of the student to update count for
     */
    updateSidebarMillionsCount(millionsData, studentName) {
        const sidebarCountEls = document.querySelectorAll('[data-millions="sidebarCount"]');
        if (!sidebarCountEls) return;

        sidebarCountEls.forEach(el => {
            // Find the entry for the current student
            const entry = millionsData.find(e => e.studentName === studentName);
            const millionsCount = entry?.earnAmount || 0;
            el.innerText = `${millionsCount}M`;

            // Display the parent element of sidebar count
            el.parentElement.style.display = 'block';
        });
    }

}


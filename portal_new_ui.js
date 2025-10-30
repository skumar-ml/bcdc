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
        try {
            const response = await fetch(`${this.data.apiBaseURL}getPortalDetail/${this.data.memberId}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const apiData = await response.json();
        return apiData;
        } catch (error) {
            console.log(error);
            const portalMessage = document.querySelector('.portal-message')
            this.spinner.style.display = 'none';
            portalMessage.style.display = 'block';
            return; 
        }
        
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
                data.forEach((studentObj) => {
                    const studentName = Object.keys(studentObj)[0];
                    const studentData = studentObj[studentName];
                    if (
                        studentData.currentSession &&
                        Array.isArray(studentData.currentSession) &&
                        studentData.currentSession.length > 0
                    ) {
                        hasCurrentSession = true;
                        localStorage.setItem(
                            "hasReferralSession",
                            JSON.stringify({ hasCurrentSession, currentDateTime, memberId: this.data.memberId })
                        );
                    }
                });
                referralsLinks.forEach((referralsLink) => {
                    referralsLink.style.display = hasCurrentSession ? "flex" : "none";
                });
                if (!hasCurrentSession) {
                    localStorage.setItem(
                        "hasReferralSession",
                        JSON.stringify({ hasCurrentSession, currentDateTime })
                    );
                }
            } else {
                referralsLinks.forEach((referralsLink) => {
                    referralsLink.style.display = "none";
                });
            }
        } else {
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
        const response = await fetch(`${this.data.typeBApiBaseURL}getAnnouncement/${this.data.memberId}`);
        if (!response.ok) {
            return [];
        }
        const data = await response.json();
        return data;
    }

    /**
     * Controls visibility of free and paid resources based on response data
     * @param {Object} response - Response data to determine resource visibility
     */
    hideShowFreeAndPaidResources(response) {
        const freeResourcesDivs = document.querySelectorAll('[data-resources="free"]');
        const paidResource = document.querySelectorAll('[data-resources="paid"]');
        if (!response) {
            if (freeResourcesDivs) freeResourcesDivs.forEach(div => div.style.display = "block");
            if (paidResource) paidResource.forEach(div => div.style.display = "none");
            this.spinner.style.display = "none";
            return;
        }
        if (freeResourcesDivs) freeResourcesDivs.forEach(div => div.style.display = "none");
        if (paidResource) paidResource.forEach(div => div.style.display = "grid");
    }

    /**
     * Main render method - orchestrates the entire portal rendering process
     * Fetches data, sets up tabs, initializes components, and handles UI updates
     */
    async render() {
        const paidResource = document.querySelector('.portal-info-wrapper')
        paidResource.style.display = "none";
        this.spinner.style.display = "block";
        const [data, millionsData, announcements] = await Promise.all([
            this.fetchData(),
            this.fetchMillionsData(),
            this.fetchAnnouncements()
        ]);
        if (data == "No data Found") {
            this.hideShowFreeAndPaidResources(false);
            return false
        }
        const millions_transactions = millionsData.millions_transactions;
        this.setupTabs(data, millions_transactions, announcements);
        this.initTooltips();
        this.initiateLightbox();
        Webflow.require('tabs').redraw();
        this.initializeFAQAccordion();
        this.initializeInvoiceAccordion();
        this.checkReferralsAccess(data);
        paidResource.style.display = "block";
        setTimeout(() => {
            this.spinner.style.display = "none";
        }, 500);

        // Update sidebar millions count for the initially active tab
        this.updateSidebarMillionsCount(millions_transactions, this.getCurrentStudentName());

        // Update sidebar millions count on tab change
        document.querySelectorAll('.portal-tab-link').forEach(tab => {
            tab.addEventListener('click', () => {
                setTimeout(() => {
                    this.updateSidebarMillionsCount(millions_transactions, this.getCurrentStudentName());
                }, 0);
            });
        });
        if (typeof this.onReady === 'function') {
            this.onReady();
        }
    }
    getCurrentStudentName = () => {
        const currentTab = document.querySelector('.portal-tab-link.w--current');
        return currentTab ? currentTab.querySelector('.portal-tab-text-semibold').textContent : '';
    };
    /**
     * Sets up dynamic tabs for each student
     * Creates tab links and panes based on student data, sorts by most recent session
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

        // 2. Use all student data
        const students = data;
        // 3. Use the first tab and pane as templates
        const tabLinkTemplate = tabLinks[0].cloneNode(true);
        const tabPaneTemplate = tabPanes[0].cloneNode(true);

        // 4. Remove all existing tab links and panes
        tabLinks.forEach((link, idx) => { if (idx > 0) link.remove(); });
        tabPanes.forEach((pane, idx) => { if (idx > 0) pane.remove(); });

        // 5. Clear the first tab link and pane
        const firstTabLink = tabMenu.querySelector('.portal-tab-link');
        const firstTabPane = tabContent.querySelector('.portal-tab-pane');

        // Remove active classes
        firstTabLink.classList.remove('w--current');
        firstTabLink.setAttribute('aria-selected', 'false');
        firstTabPane.classList.remove('w--tab-active');
        // Sort students by currentSession[0].createdOn (most recent first)
        students.sort((a, b) => {
            const aData = Object.values(a)[0];
            const bData = Object.values(b)[0];
            const aSession = aData.currentSession && aData.currentSession[0] ? aData.currentSession[0] : null;
            const bSession = bData.currentSession && bData.currentSession[0] ? bData.currentSession[0] : null;
            const aDate = aSession && aSession.createdOn ? new Date(aSession.createdOn) : new Date(0);
            const bDate = bSession && bSession.createdOn ? new Date(bSession.createdOn) : new Date(0);
            // Most recent first
            return bDate - aDate;
        });
        // 6. For each student, create tab link and pane
        students.forEach((student, idx) => {
            // get Object key from the student object
            const studentName = Object.keys(student)[0];
            const studentData = Object.values(student)[0];
            const currentSession = studentData.currentSession && studentData.currentSession.length > 0 ? studentData.currentSession[0] : null;
            // comment for future change: studentData.currentSession.length - 1
            let tabLink, tabPane;
            if (idx === 0) {
                tabLink = firstTabLink;
                tabPane = firstTabPane;
            } else {
                tabLink = tabLinkTemplate.cloneNode(true);
                tabPane = tabPaneTemplate.cloneNode(true);
                tabMenu.appendChild(tabLink);
                tabContent.appendChild(tabPane);
            }
            // Set tab attributes
            tabLink.setAttribute('data-w-tab', 'Tab-' + idx);
            tabLink.setAttribute('id', 'w-tabs-0-data-w-tab-' + idx);
            tabLink.setAttribute('href', '#w-tabs-0-data-w-pane-' + idx);
            tabLink.setAttribute('aria-controls', 'w-tabs-0-data-w-pane-' + idx);
            tabPane.setAttribute('data-w-tab', 'Tab-' + idx);
            tabPane.setAttribute('id', 'w-tabs-0-data-w-pane-' + idx);
            tabPane.setAttribute('aria-labelledby', 'w-tabs-0-data-w-tab-' + idx);
            // Set active class for first tab
            if (idx === 0) {
                tabLink.classList.add('w--current');
                tabLink.setAttribute('aria-selected', 'true');
                tabPane.classList.add('w--tab-active');
            } else {
                tabLink.classList.remove('w--current');
                tabLink.setAttribute('aria-selected', 'false');
                tabPane.classList.remove('w--tab-active');
            }
            // Set label
            if (tabLink.querySelector('.portal-tab-text-semibold')) {
                tabLink.querySelector('.portal-tab-text-semibold').textContent = studentName;
            }
            // Render content inside tab based on available data
            this.renderStudentTab(tabPane, studentData, millionsData, announcements);
            if (currentSession) {
                // Show all main sections
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
                
                // display the invoice if futureSession or pastSession invoices exist
                const futureInvoices = studentData.futureSession.flatMap(session => session.invoiceList || []);
                var invoices = [].concat(futureInvoices);
                if (invoices.length > 0) {
                    const invoiceAccordian = tabPane.querySelector('[data-portal="invoice-form-accordian"]');
                    if (invoiceAccordian) invoiceAccordian.style.display = 'block';
                }


            }
            // Always handle Future Classes and Past Class History
            // Future Classes
            const futureClassesDiv = tabPane.querySelector('.sem-classes-info-div.future-classes');
            if (studentData.futureSession && Array.isArray(studentData.futureSession) && studentData.futureSession.length > 0) {
                if (futureClassesDiv) futureClassesDiv.style.display = '';
            } else {
                if (futureClassesDiv) futureClassesDiv.style.display = 'none';
            }
            // Past Class History
            const pastClassesDiv = tabPane.querySelectorAll('.sem-classes-info-div')[1]; // assuming second div is for past classes
            if (studentData.pastSession && Array.isArray(studentData.pastSession) && studentData.pastSession.length > 0) {
                if (pastClassesDiv) pastClassesDiv.style.display = '';
            } else {
                if (pastClassesDiv) pastClassesDiv.style.display = 'none';
            }
        });
    }

    /**
     * Main function to render individual student tab content
     * Handles current class, millions, uploaded content, and recommended level sections
     * @param {HTMLElement} tabPane - The tab pane element to render content into
     * @param {Object} studentData - Student data object
     * @param {Array} millionsData - Millions transaction data
     * @param {Array} announcements - Announcements data
     */
    renderStudentTab(tabPane, studentData, millionsData, announcements) {
        const student = studentData.currentSession[0];
        if (student) {
            this.renderCurrentClassSection(tabPane, student);
            this.renderMillions(tabPane, student, millionsData);
            this.renderUploadedContent(tabPane, student, studentData);
            this.renderRecommendedLevel(tabPane, student, studentData)
        } else {
            this.renderInvoiceAccordionStyled(tabPane, [], studentData);
            setTimeout(() => {
                this.renderPendingItems(tabPane, [], studentData);
            }, 500);
            // hide recommended section if student data is empty
            const recommendedSection = tabPane.querySelector('.next-recomm-prog-container');
            recommendedSection.style.display = 'none';
        }
        // render pending items text after a delay to ensure data is ready
        setTimeout(() => {
            this.renderPendingItems(tabPane, studentData.length > 0 ? student: [], studentData);
        }, 500);

        this.renderRecentAnnouncements(tabPane, announcements);
        this.renderFutureClasses(tabPane, studentData);
        this.renderPastClasses(tabPane, studentData);
    }
    /**
     * Renders the recommended level section with pre-registration and registration logic
     * Handles bundle visibility, time-based registration periods, and button states
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Current student data
     * @param {Object} studentData - Complete student data including future sessions
     */
    renderRecommendedLevel(tabPane, student, studentData) {
        const recommendedSection = tabPane.querySelector('.next-recomm-prog-container');
        const programTitle = tabPane.querySelector('.next-recomm-prog-title');
        const bundleContainer = tabPane.querySelector('[data-pre-registration="container"]');
        
        if (!bundleContainer) return;
        const studentName = student.studentDetail.studentName;
        if (programTitle) {
            programTitle.textContent = `Next Recommended Program for ${studentName}`;
        }

        const recommendedLevel = student.recommendedLevel;

        // Check if recommended level is empty
        const isRecommendedEmpty = !recommendedLevel.level;
        
        // Check if student has bundle
        const hasBundle = this.checkHasBundle(studentData);
        
        // Get current time-based visibility status
        const timeBasedVisibility = this.getTimeBasedVisibility(recommendedLevel, studentData);
        
        
        // Hide entire bundle container if no bundle and no recommended program
        if (!hasBundle && isRecommendedEmpty) {
            if (bundleContainer) {
                bundleContainer.style.display = 'none';
            }
            return;
        }
        
        // Show bundle container if either has bundle or has recommended program
        if (bundleContainer) {
            bundleContainer.style.display = 'block';
        }

        // Handle pre-reg-container visibility based on bundle status and pre-registration timing
        const preRegContainer = tabPane.querySelector('.pre-reg-container');
        let showPreRegContainer = false;
        if (preRegContainer) {
            if (hasBundle && timeBasedVisibility.showPreRegistration) {
                preRegContainer.style.display = '';
                showPreRegContainer = true;
                
                // Update pre-registration username dynamically
                const preRegUserName = preRegContainer.querySelector('.pre-reg-user-name');
                if (preRegUserName && studentName) {
                    preRegUserName.textContent = studentName + "'s";
                }
                
                // Start registration timer for pre-registration end date
                this.startRegistrationTimer(preRegContainer, studentData);
            } else {
                preRegContainer.style.display = 'none';
                showPreRegContainer = false;
            }
        }

        // Handle recommended program visibility based on registration timing
        let showRecommendedSection = false;
        if (isRecommendedEmpty) {
            recommendedSection.style.display = 'none';
            showRecommendedSection = false;
        } else {
            // Show recommended section only during registration period
            if (timeBasedVisibility.showRegistration && hasBundle) {
                recommendedSection.style.display = '';
                showRecommendedSection = true;
            } else {
                recommendedSection.style.display = 'none';
                showRecommendedSection = false;
            }
        }

        // Hide entire bundle container if both sections are hidden
        if (!showPreRegContainer && !showRecommendedSection) {
            if (bundleContainer) {
                bundleContainer.style.display = 'none';
                return;
            }
        }

        // Update the first next-recomm-prog-text (the line that shows session/year | level)
        const textEls = recommendedSection.querySelectorAll('[data-portal="next-recomm-prog-text"]');
        if (!textEls || textEls.length === 0) return;

        const sessionYear = [recommendedLevel.session, recommendedLevel.year].filter(Boolean).join(' ');
        const levelLabel = recommendedLevel.level || '';

        let displayText = '';
        if (sessionYear && levelLabel) displayText = `${sessionYear} | ${levelLabel}`;
        else if (sessionYear) displayText = sessionYear;
        else if (levelLabel) displayText = levelLabel;
        else if (recommendedLevel.grade) displayText = recommendedLevel.grade;

        if (!displayText) {
            recommendedSection.style.display = 'none';
        }

        // First element is the headline line we want to update
        textEls[0].textContent = displayText;

        // Implement new button visibility logic
        this.updateButtonVisibility(bundleContainer, recommendedLevel, timeBasedVisibility, studentData);

        // Update modal content and add click event for Learn More button
        //this.updateModalContent(student, recommendedLevel, tabPane, studentData);
        this.addLearnMoreClickEvent(bundleContainer, student, recommendedLevel, studentData);

        // Start/Update countdown in the recommended section if deadline exists
        const earlyBirdDeadline = student?.recommendedLevel?.earlyBirdDeadlineDate;
        if (earlyBirdDeadline) {
            this.startOfferCountdown(recommendedSection, earlyBirdDeadline);
        }
    }
    /**
     * Updates button visibility based on bundle status and registration timing
     * @param {HTMLElement} recommendedSection - The recommended section element
     * @param {Object} student - Current student data
     * @param {Object} recommendedLevel - Recommended level data
     * @param {Object} timeBasedVisibility - Time-based visibility status
     * @param {Object} studentData - Complete student data
     */
    updateButtonVisibility(recommendedSection, recommendedLevel, timeBasedVisibility, studentData) {
        // Get the buttons
        const registerNowBtn = recommendedSection.querySelector('#enroll-now-btn-2');
        const learnMoreBtn = recommendedSection.querySelector('[data-portal="next-recomm-learn-more"]');
        
        if (!registerNowBtn || !learnMoreBtn) return;

        // Condition A: Check if student has bundle (pre-reg-container) in future sessions except Summer
        const hasBundle = this.checkHasBundle(studentData);
        
        // Condition B: Check if returner conversion is published in recommendedLevel
        const hasReturnerConversion = this.checkReturnerConversion(recommendedLevel);
        
        // Debug logging
        
        // Apply button visibility logic based on time-based visibility
        if (timeBasedVisibility.showPreRegistration && timeBasedVisibility.showRegistration) {
            // Both periods are active: Show both buttons
            registerNowBtn.style.display = 'inline-block';
            learnMoreBtn.style.display = 'inline-block';
            recommendedSection.style.display = 'block';
        } else if (hasBundle && timeBasedVisibility.showPreRegistration) {
            // If A: Only show Register Now button during pre-registration
            registerNowBtn.style.display = 'inline-block';
            learnMoreBtn.style.display = 'none';
            recommendedSection.style.display = 'block';
        } else if (hasReturnerConversion && timeBasedVisibility.showRegistration) {
            // If B: Show both buttons during registration period
            registerNowBtn.style.display = 'inline-block';
            learnMoreBtn.style.display = 'inline-block';
            recommendedSection.style.display = 'block';
        } else if (hasBundle && hasReturnerConversion && timeBasedVisibility.showRegistration) {
            // If A & B: Show both buttons during registration period
            registerNowBtn.style.display = 'inline-block';
            learnMoreBtn.style.display = 'inline-block';
            recommendedSection.style.display = 'block';
        } else {
            // Default: Hide both buttons
            registerNowBtn.style.display = 'none';
            learnMoreBtn.style.display = 'none';
            recommendedSection.style.display = 'none';
        }
    }
    /**
     * Checks if student has bundle in future sessions (excluding Summer sessions)
     * @param {Object} student - Student data object
     * @returns {boolean} True if student has bundle, false otherwise
     */
    checkHasBundle(student) {
        // Check if student has bundle in future sessions except Summer
        if (!student.futureSession || !Array.isArray(student.futureSession)) {
            return false;
        }
        
        // Filter out futureSession objects that have classId
        const filteredSessions = student.futureSession.filter(session => !session.classId && session.earlyBirdDeadlineDate != "");
        if(filteredSessions.length == 0) {
            return false;
        }
        // Check if any remaining sessions are not Summer sessions
        const result = filteredSessions.some(session => {
            return !session.sessionName.toLowerCase().includes('summer');
        });
        
        return result;
    }
    /**
     * Checks if returner conversion is available in recommended level
     * @param {Object} recommendedLevel - Recommended level data
     * @returns {boolean} True if returner conversion is available, false otherwise
     */
    checkReturnerConversion(recommendedLevel) {
        // Check if returner conversion is published in recommendedLevel
        const result = recommendedLevel && recommendedLevel.level;
        return result;
    }
    /**
     * Determines time-based visibility for pre-registration and registration periods
     * @param {Object} recommendedLevel - Recommended level data
     * @param {Object} studentData - Student data with future sessions
     * @returns {Object} Object with showPreRegistration and showRegistration boolean flags
     */
    getTimeBasedVisibility(recommendedLevel, studentData) {
        const now = new Date();
        let showPreRegistration = false;
        let showRegistration = false;
        
        // Check pre-registration period from future session
        if (studentData.futureSession && Array.isArray(studentData.futureSession)) {
            const futureSession = studentData.futureSession.find(session => 
                session['pre-registrationDates'] && session['pre-registrationDates'].preRegStartDate
            );
            
            if (futureSession && futureSession['pre-registrationDates']) {
                const preRegStart = new Date(futureSession['pre-registrationDates'].preRegStartDate.replace(' ', 'T'));
                const preRegEnd = new Date(futureSession.programDates.startDate.replace(' ', 'T'));
                
                showPreRegistration = now >= preRegStart && now <= preRegEnd;
                
            }
        }
        
        // Check registration period from recommended level
        if (recommendedLevel && recommendedLevel['pre-registrationDates'] && recommendedLevel['pre-registrationDates'].preRegStartDate && recommendedLevel.registrationStartDate) {
            const regStart = new Date(recommendedLevel['pre-registrationDates'].preRegStartDate.replace(' ', 'T'));
            const regEnd = new Date(recommendedLevel.registrationEndDate.replace(' ', 'T'));
            
            showRegistration = now >= regStart && now <= regEnd;
            
        }
        
        return {
            showPreRegistration,
            showRegistration
        };
    }
    /**
     * Shows a modal by adding show class and setting display to flex
     * @param {HTMLElement} modal - The modal element to show
     */
    showModal(modal) {
        modal.classList.add("show");
        modal.style.display = "flex";
    }
    
    /**
     * Hides a modal by removing show class and setting display to none
     * @param {HTMLElement} modal - The modal element to hide
     */
    hideModal(modal) {
        modal.classList.remove("show");
        modal.style.display = "none";
    }
    /**
     * Updates modal content with student and recommended level information
     * @param {Object} student - Current student data
     * @param {Object} recommendedLevel - Recommended level data
     * @param {HTMLElement} tabPane - Tab pane element (optional)
     * @param {Object} studentData - Complete student data
     */
    updateModalContent(student, recommendedLevel, tabPane = "", studentData) {
        const modal = document.getElementById('next-recomm-modal');
        if (!modal) return;

        // Get student name (fallback to 'Student' if not available)
        const studentName = student.studentDetail.studentName || 'Student';

        // Update modal title using the new ID
        const titleEl = document.getElementById('modal-student-name');
        if (titleEl) {
            titleEl.textContent = `Next Step for ${studentName}`;
        }

        // Update recommended text using the new ID
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

        // Update countdown in modal if deadline exists
        const earlyBirdDeadline = student?.recommendedLevel?.earlyBirdDeadlineDate;
        if (earlyBirdDeadline) {
            this.startOfferCountdown(modal, earlyBirdDeadline);
        }

        // Update modal's Enroll Now button link
        this.updateEnrollNowLinks(modal, recommendedLevel, tabPane, studentData);

        // Update "Why This Program" section
        const whyProgramTextEl = modal.querySelector('.why-this-program-rounded-div .dm-sans.blue-text');
        if (whyProgramTextEl) {
            const levelLabel = recommendedLevel.level || recommendedLevel.grade || 'this level';
            whyProgramTextEl.textContent = `Based on ${studentName}'s current level and performance, we recommend enrolling in ${levelLabel} for continued skill growth and advanced debate techniques.`;
        }
    }
    /**
     * Updates enrollment links based on recommended level and conditions
     * @param {HTMLElement} contextEl - Context element containing enrollment buttons
     * @param {Object} recommendedLevel - Recommended level data
     * @param {HTMLElement} tabPane - Tab pane element
     * @param {Object} studentData - Complete student data
     */
    updateEnrollNowLinks(contextEl, recommendedLevel, tabPane, studentData) {
        if (!contextEl || !recommendedLevel) return;

        // Get the level from recommendedLevel
        const level = recommendedLevel.level || recommendedLevel.grade || '';
        if (!level) return;

        // Convert level to URL format (e.g., "Level 3B" -> "level-3b")
        const levelUrl = level.toLowerCase()
            .replace(/\s+/g, '-')  // Replace spaces with hyphens
            .replace(/[^a-z0-9-]/g, ''); // Remove any other special characters

        // Check if recommended condition matches (hasBundle or hasReturnerConversion)
        const hasReturnerConversion = this.checkReturnerConversion(recommendedLevel);
        const timeBasedVisibility = this.getTimeBasedVisibility(recommendedLevel, studentData);
        const hasRecommendedCondition = hasReturnerConversion && timeBasedVisibility.showRegistration;
        
        // Generate the enrollment URL based on condition
        let enrollUrl;
        if (hasRecommendedCondition) {
            enrollUrl = `https://www.bergendebate.com/programs/${levelUrl}`;
        } else {
            enrollUrl = 'https://www.bergendebate.com/classes-overview';
        }

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
     * Adds click event listener to Learn More button
     * @param {HTMLElement} recommendedSection - The recommended section element
     * @param {Object} student - Current student data
     * @param {Object} recommendedLevel - Recommended level data
     * @param {Object} studentData - Complete student data
     */
    addLearnMoreClickEvent(recommendedSection, student, recommendedLevel, studentData) {
        var $this = this
        const learnMoreBtn = recommendedSection.querySelector('[data-portal="next-recomm-learn-more"]');
        if (!learnMoreBtn) return;

        // Remove existing event listeners to prevent duplicates
        learnMoreBtn.removeEventListener('click', this.handleLearnMoreClick);

        // Add new click event
        learnMoreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLearnMoreClick();
            $this.updateModalContent(student, recommendedLevel, studentData);
        });
    }
    /**
     * Handles Learn More button click - shows modal and adds close events
     */
    handleLearnMoreClick() {
        const modal = document.getElementById('next-recomm-modal');
        if (modal) {
            this.showModal(modal);
            this.addModalCloseEvents(modal);
        }
    }
    /**
     * Starts countdown timer for offer deadline
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

        // Clear any previous interval attached to this context
        if (contextEl._countdownInterval) {
            clearInterval(contextEl._countdownInterval);
            contextEl._countdownInterval = null;
        }

        // Parse deadline (treat provided string as local time)
        const parsed = new Date(deadlineString.replace(' ', 'T'));
        if (isNaN(parsed.getTime())) return;

        const update = () => {
            const now = new Date();
            let totalSeconds = Math.floor((parsed.getTime() - now.getTime()) / 1000);
            if (totalSeconds <= 0) {
                daysEl.textContent = '0';
                hoursEl.textContent = '00';
                minutesEl.textContent = '00';
                clearInterval(contextEl._countdownInterval);
                contextEl._countdownInterval = null;
                return;
            }

            const days = Math.floor(totalSeconds / 86400);
            totalSeconds -= days * 86400;
            const hours = Math.floor(totalSeconds / 3600);
            totalSeconds -= hours * 3600;
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            daysEl.textContent = String(days);
            hoursEl.textContent = String(hours).padStart(2, '0');
            minutesEl.textContent = String(minutes).padStart(2, '0');
            secondsEl.textContent = String(seconds).padStart(2, '0');
        };

        // Initial paint and start 1s updates
        update();
        contextEl._countdownInterval = setInterval(update, 1000);
    }
    /**
     * Starts countdown timer for pre-registration end date
     * @param {HTMLElement} contextEl - Context element containing timer elements
     * @param {Object} studentData - Student data with future sessions
     */
    startRegistrationTimer(contextEl, studentData) {
        if (!contextEl || !studentData) return;

        // Find the pre-registration end date from future session
        let preRegEndDate = null;
        if (studentData.futureSession && Array.isArray(studentData.futureSession)) {
            const futureSession = studentData.futureSession.find(session => 
                session['pre-registrationDates'] && session['pre-registrationDates'].preRegEndDate
            );
            if (futureSession) {
                preRegEndDate = futureSession['pre-registrationDates'].preRegEndDate;
            }
        }

        if (!preRegEndDate) {
            return;
        }


        // Locate timer elements within the provided context element
        const daysEl = contextEl.querySelector('[data-registration-timer="day"]');
        const hoursEl = contextEl.querySelector('[data-registration-timer="hour"]');
        const minutesEl = contextEl.querySelector('[data-registration-timer="minutes"]');
        const secondsEl = contextEl.querySelector('[data-registration-timer="seconds"]');
        
        if (!daysEl || !hoursEl || !minutesEl || !secondsEl) {
            return;
        }

        // Clear any previous interval attached to this context
        if (contextEl._registrationTimerInterval) {
            clearInterval(contextEl._registrationTimerInterval);
            contextEl._registrationTimerInterval = null;
        }

        // Parse deadline (treat provided string as local time)
        const parsed = new Date(preRegEndDate.replace(' ', 'T'));
        if (isNaN(parsed.getTime())) {
            return;
        }

        const update = () => {
            const now = new Date();
            let totalSeconds = Math.floor((parsed.getTime() - now.getTime()) / 1000);
            
            if (totalSeconds <= 0) {
                daysEl.textContent = '0';
                hoursEl.textContent = '00';
                minutesEl.textContent = '00';
                secondsEl.textContent = '00';
                clearInterval(contextEl._registrationTimerInterval);
                contextEl._registrationTimerInterval = null;
                return;
            }

            const days = Math.floor(totalSeconds / 86400);
            totalSeconds -= days * 86400;
            const hours = Math.floor(totalSeconds / 3600);
            totalSeconds -= hours * 3600;
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            
            daysEl.textContent = String(days);
            hoursEl.textContent = String(hours).padStart(2, '0');
            minutesEl.textContent = String(minutes).padStart(2, '0');
            secondsEl.textContent = String(seconds).padStart(2, '0');
        };

        // Initial paint and start 1s updates
        update();
        contextEl._registrationTimerInterval = setInterval(update, 1000);
    }
    /**
     * Adds event listeners for modal close functionality
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

        // Close on Escape key
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
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} announcements - Announcements data
     */
    renderRecentAnnouncements(tabPane, announcements) {
        
        // update sidebar d)ata count data-announcements of is_read is false 
        const sidebarAnnouncementsCount = document.querySelectorAll('[data-announcements="counts"]');
        sidebarAnnouncementsCount.forEach(el => {
            el.textContent = (announcements.announcement) ? announcements.announcement.filter(ann => !ann.is_read && ann.emailId === this.data.accountEmail).length : 0;
            el.parentElement.style.display = 'block';
        });

        const announcementDiv = tabPane.querySelector('.recent-announcement-info-div');
        const countDiv = tabPane.querySelector('.recent-announcement-number');
        const unreadAnnouncements = (announcements.announcement) ? announcements.announcement.filter(ann => !ann.is_read && ann.emailId === this.data.accountEmail) : [];
        if (countDiv) countDiv.textContent = unreadAnnouncements.length;

        const recent = (announcements.announcement) ? announcements.announcement.slice(0, 2) : [];
        announcementDiv.querySelectorAll('.recent-announcement-info-inner-div, .recent-announcement-info-flex, .dm-sans.recent-announcement-info').forEach(el => el.remove());

        recent.forEach(ann => {
            const container = document.createElement('div');
            container.className = 'recent-announcement-info-inner-div';

            const flex = document.createElement('div');
            flex.className = 'recent-announcement-info-flex';

            const title = document.createElement('p');
            title.className = 'dm-sans recent-announcement-sub-title';
            const titleText = ann.title || ann.subject || 'Announcement';
            const type = ann.type || '';
            title.textContent = type ? `${titleText}: ${type}` : titleText;

            const date = document.createElement('p');
            date.className = 'dm-sans medium';
            const dates = new Date(ann.created_on);

            // Format to "July 10"
            const options = { month: "long", day: "numeric" };
            const formattedDate = dates.toLocaleDateString("en-US", options);

            date.textContent = formattedDate || '';

            flex.appendChild(title);
            flex.appendChild(date);

            const message = document.createElement('p');
            message.className = 'dm-sans recent-announcement-info';
            var plainText = ann.message ? ann.message.replace(/<[^>]*>/g, '') : '';
            plainText = plainText.replace(/&nbsp;/g, " ");
            message.textContent = plainText;
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
     * Renders future classes section in the tab pane
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} studentData - Student data with future sessions
     */
    renderFutureClasses(tabPane, studentData) {
        const futureClassesDiv = tabPane.querySelector('.sem-classes-info-div.future-classes');
        if (!futureClassesDiv) return;

        var futureList = Array.isArray(studentData.futureSession) ? studentData.futureSession : [];
        const container = futureClassesDiv.querySelector('[data-portal="future-classe-list"]');
        if (container) container.innerHTML = '';

        if (futureList.length > 0) {
            futureClassesDiv.style.display = '';
            // removed refunded future sessions
            //futureList = futureList.filter(session => !session.isRefunded);
            futureList.forEach(session => {
                let text = 'No details available';
                if(session.classId){
                    const hasClassDetail = session.classDetail && Object.keys(session.classDetail).length > 0;
                    const { classLevel = '', day = '', startTime = '', location = '', sessionName = '', currentYear = '' } = session.classDetail;
                    if(hasClassDetail){
                        text = `${classLevel} | ${day} ${startTime} | ${location} | ${sessionName} ${currentYear}`;
                    }else{
                        text = 'No details available';
                    }
                }else{
                    text = session.sessionName || session.classDetail?.sessionName || session.summerProgramDetail?.programName || 'No details available';
                }
                const div = document.createElement('div');
                div.className = 'announcement-flex-wrapper';
                div.innerHTML = `<img loading="lazy" src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/68752684beabb8d0a43428b5_calendar_today.svg" alt="" />\n<p class="poppins-para no-margin-bottom">${text}</p>`;
                container?.appendChild(div);
            });
        } else {
            futureClassesDiv.style.display = 'none';
            container.innerHTML = '<div>No future classes available</div>';
        }
    }

    /**
     * Renders past classes section in the tab pane
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} studentData - Student data with past sessions
     */
    renderPastClasses(tabPane, studentData) {
        const pastClassesDiv = tabPane.querySelectorAll('.sem-classes-info-div')[1];
        if (!pastClassesDiv) return;

        const pastList = Array.isArray(studentData.pastSession) ? studentData.pastSession : [];
        const container = pastClassesDiv.querySelector('[data-portal="past-classe-list"]');
        if (container) container.innerHTML = '';

        if (pastList.length > 0) {
            pastClassesDiv.style.display = '';
            // sort desc by createdOn
            pastList.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
            pastList.forEach(session => {
                let text = 'No details available';
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
                if (session.isRefunded) {
                    div.innerHTML += '<div class="refunded-rounded-div"><p class="poppins-para refunded-dark-gray-text">REFUNDED</p></div>';
                }
            });
        } else {
            pastClassesDiv.style.display = 'none';
            container.innerHTML = '<div>No past classes available</div>';
        }
    }

    /**
     * Renders current class section in the tab pane
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Current student data
     */
    renderCurrentClassSection(tabPane, student) {
        const currentClassDiv = tabPane.querySelector('.recent-announcement-div.current-class');
        if (!currentClassDiv) return;

        const hasClassDetail = student.classDetail && Object.keys(student.classDetail).length > 0;
        const hasSummerProgram = student.summerProgramDetail && Object.keys(student.summerProgramDetail).length > 0;

        const titleEl = currentClassDiv.querySelector('.recent-announcement-title');
        const classInfoEl = currentClassDiv.querySelector('.poppins-para.current-class');

        if (hasClassDetail) {
            const { classLevel = '', day = '', startTime = '', location = '', sessionName = '', currentYear = '' } = student.classDetail;
            if (titleEl) titleEl.innerHTML = `Current Program <span class="dm-sans regular">(${sessionName} ${currentYear})</span>`;
            if (classInfoEl) classInfoEl.textContent = `${classLevel} | ${day} ${startTime} | ${location}`;
        } else if (hasSummerProgram) {
            const { programName = 'Summer Program', location = '', year, summerSessionId } = student.summerProgramDetail;
            let inferredYear = year || 'Summer ' + (student.summerProgramDetail?.currentYear) || (new Date().getFullYear() + ' Summer');
            const paren = [inferredYear].filter(Boolean).join(', ');
            if (titleEl) titleEl.innerHTML = `Current Program <span class="dm-sans regular">(${paren})</span>`;
            if (classInfoEl) classInfoEl.textContent = programName + ' | ' + summerSessionId + ' | ' + location;
        } else {
            if (titleEl) titleEl.innerHTML = `Current Program <span class="dm-sans regular">(No class or summer program data available)</span>`;
            if (classInfoEl) classInfoEl.textContent = '';
        }
    }

    /**
     * Renders pending items section (forms and invoices)
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Current student data
     */
    renderPendingItems(tabPane, student, studentData) {
        const wrapper = tabPane.querySelector('.items-pending-flex-wrapper');
        if (!wrapper) return;

        let hasPendingForm = false;
        let hasPendingInvoice = false;

        if (Array.isArray(student.formList)) {
            let allForms = student.formList.flatMap(group => group.forms || []);
            hasPendingForm = allForms.some(form => !student.formCompletedList?.some(c => c.formId === form.formId));
        }
        var invoices = student.invoiceList || [];
        if(studentData.futureSession.length > 0){
            // include future session invoices
            const futureInvoices = studentData.futureSession.flatMap(session => session.invoiceList || []);
            invoices = invoices.concat(futureInvoices);
        }

        if (Array.isArray(invoices)) {
            hasPendingInvoice = invoices.some(inv => !inv.is_completed);
        }

        wrapper.style.display = (hasPendingForm || hasPendingInvoice) ? 'flex' : 'none';
        if (!hasPendingForm) {
            // hide registartion form
            const registrationFormDiv = tabPane.querySelector('.registration-form-accordian');
            if (registrationFormDiv) {
                registrationFormDiv.style.display = 'none';
            }
        }
        if (!hasPendingInvoice) {
            // hide invoice accordion
            const invoiceAccordion = tabPane.querySelector('.invoice-form-accordian');
            if (invoiceAccordion) {
                invoiceAccordion.style.display = 'none';
            }
        }
    }

    /**
     * Renders millions balance for the student
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Current student data
     * @param {Array} millionsData - Millions transaction data
     */
    renderMillions(tabPane, student, millionsData) {
        const millionsText = tabPane.querySelector('.million-price-text');
        if (!millionsText) return;
        if(!millionsData){
           millionsData =[];
        }
        const entry = millionsData.find(e => e.studentName === student.studentDetail.studentName);
        const millionsCount = entry?.earnAmount || 0;
        millionsText.innerHTML = `${millionsCount} <span class="million-text-gray">millions</span>`;
    }

    /**
     * Renders all uploaded content sections for the student
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Current student data
     */
    renderUploadedContent(tabPane, student, studentData) {
        this.renderHomeworkLink(tabPane, student);
        this.renderInvoiceAccordionStyled(tabPane, student, studentData);
        this.renderFailedInvoiceNotification(tabPane, student);
        this.renderRegistrationForms(tabPane, student);
        Webflow.require('tabs').redraw();
        this.renderGoogleCalendar(tabPane, student);
        this.renderCalendarIframe(tabPane, student);
        this.renderMakeupLinks(tabPane, student);
        this.renderZoomLinks(tabPane, student);
        this.renderGeneralResources(tabPane, student);
    }

    /**
     * Renders calendar iframe from uploaded content
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Current student data
     */
    renderCalendarIframe(tabPane, student) {
        const calendarDiv = tabPane.querySelector('.calendar-white-rounded-div');
        if (!calendarDiv) return;

        const googleCalendar = student.uploadedContent?.find(u => u.label === 'Google Calendar');
        const calendarLink = googleCalendar?.upload_content?.[0]?.link;

        if (calendarLink) {
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
            calendarDiv.innerHTML = '<p class="portal-node-title">Calendar Graph</p><div>No records available</div>';
        }
    }

    /**
     * Renders makeup scheduling links
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Current student data
     */
    renderMakeupLinks(tabPane, student) {
        const makeupDiv = tabPane.querySelector('.class-tools-quick-links-div');
        if (!makeupDiv) return;
        const makeupSection = makeupDiv.querySelector('.class-tools-quick-links-flex-wrapper');
        if (!makeupSection) return;
        makeupSection.innerHTML = '';

        const makeupLink = student.uploadedContent?.find(u => u.label === 'Make-up Acuity Link');
        if (makeupLink?.upload_content?.length > 0) {
            makeupLink.upload_content.forEach(item => {
                const wrapper = document.createElement('div');
                wrapper.className = 'class-tools-quick-links-flex-wrapper';

                const icon = document.createElement('img');
                icon.loading = 'lazy';
                icon.src = 'https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/68752684beabb8d0a43428b5_calendar_today.svg';
                icon.alt = '';
                icon.className = 'inline-block-icon';

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

                const linkDiv = document.createElement('div');
                linkDiv.className = 'poppins-para scheduling';
                const a = document.createElement('a');
                a.href = item.link;
                a.classList.add('any-link', 'underline');
                a.textContent = 'Go to scheduling';
                a.target = '_blank';
                a.style.marginRight = '8px';

                const img = document.createElement('img');
                img.src = 'https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/68835aaecba0da532a6b3d19_Group%20(2).svg';
                img.alt = 'click to open link';
                img.style.cursor = 'pointer';
                img.style.width = '18px';
                img.style.height = '18px';

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
            makeupSection.innerHTML = '<div>No records available</div>';
        }
    }

    /**
     * Renders Zoom meeting links
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Current student data
     */
    renderZoomLinks(tabPane, student) {
        const zoomDiv = tabPane.querySelector('.zoom-links-info-wrapper');
        if (!zoomDiv) return;
        zoomDiv.querySelectorAll('.zoom-links-info-div').forEach(el => el.remove());

        const zoomLinks = student.uploadedContent?.find(u => u.label === 'Zoom links');
        if (zoomLinks?.upload_content?.length > 0) {
            zoomLinks.upload_content.forEach(item => {
                const wrapper = document.createElement('div');
                wrapper.className = 'zoom-links-info-div';

                const titleDiv = document.createElement('div');
                titleDiv.className = 'dm-sans title';
                const titleSpan = document.createElement('span');
                titleSpan.textContent = item.name || 'Zoom Link';
                titleDiv.appendChild(titleSpan);

                const img = document.createElement('img');
                img.src = 'https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/68835aaecba0da532a6b3d19_Group%20(2).svg';
                img.alt = 'Copy link';
                img.style.cursor = 'pointer';
                img.style.width = '18px';
                img.style.height = '18px';
                img.style.marginLeft = '8px';

                const subtitleDiv = document.createElement('div');
                subtitleDiv.className = 'poppins-para class-tools-quick-links';
                const subtitleSpan = document.createElement('span');
                subtitleSpan.textContent = item.resourceDesc || '';
                subtitleDiv.appendChild(subtitleSpan);

                this.addTooltipCopyBehavior(img, item.link);

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
            const zoomSection = zoomDiv.querySelector('.zoom-links-info-div');
            if (zoomSection) zoomSection.innerHTML = '<div>No records available</div>';
        }
    }

    /**
     * Renders general resources links
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Current student data
     */
    renderGeneralResources(tabPane, student) {
        const generalDiv = tabPane.querySelector('.general-resources-info-wrapper');
        if (!generalDiv) return;
        generalDiv.querySelectorAll('.general-resources-flex-wrapper').forEach(el => el.remove());

        const generalResources = student.uploadedContent?.find(u => u.label === 'General resources');
        if (generalResources?.upload_content?.length > 0) {
            generalResources.upload_content.forEach(item => {
                const wrapper = document.createElement('div');
                wrapper.className = 'general-resources-flex-wrapper';

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

                const img = document.createElement('img');
                img.loading = 'lazy';
                img.src = 'https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/68835aaecba0da532a6b3d19_Group%20(2).svg';
                img.alt = 'Copy link';
                img.className = 'inline-block-icon';
                img.style.cursor = 'pointer';
                img.style.width = '18px';
                img.style.height = '18px';

                this.addTooltipCopyBehavior(img, item.link);

                wrapper.appendChild(leftDiv);
                var imgContainer = document.createElement('div');
                imgContainer.classList.add("new-tab-icon-wrapper")
                imgContainer.appendChild(img);
                wrapper.appendChild(imgContainer);
                wrapper.appendChild(imgContainer);
                generalDiv.appendChild(wrapper);
            });
        } else {
            const noDiv = document.createElement('div');
            noDiv.className = 'general-resources-flex-wrapper';
            noDiv.innerHTML = '<div><div class="dm-sans title"><span>No records available</span></div></div>';
            generalDiv.appendChild(noDiv);
        }
    }

    /**
     * Adds tooltip and copy behavior to image elements
     * @param {HTMLElement} img - Image element to add behavior to
     * @param {string} link - Link to open when clicked
     */
    addTooltipCopyBehavior(img, link) {
        // open a new tab with the link
        img.addEventListener('click', () => {
            window.open(link, '_blank');
        });

    }

    /**
     * Renders Google Calendar iframe using parent email
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Current student data
     */
    renderGoogleCalendar(tabPane, student) {
        const calendarDiv = tabPane.querySelector('.calendar-white-rounded-div');
        if (calendarDiv && student.studentDetail && student.studentDetail.parentEmail) {
            // Remove any previous iframe
            let oldIframe = calendarDiv.querySelector('iframe[data-google-calendar]');
            if (oldIframe) oldIframe.remove();
            // Create new iframe
            const iframe = document.createElement('iframe');
            iframe.setAttribute('data-google-calendar', '1');
            iframe.style.border = '0';
            iframe.width = '800';
            iframe.height = '600';
            iframe.frameBorder = '0';
            iframe.scrolling = 'no';
            // Use the student's email as the calendar src (must be public!)
            const calendarEmail = encodeURIComponent(student.studentDetail.parentEmail);
            iframe.src = `https://calendar.google.com/calendar/embed?src=${calendarEmail}&ctz=America%2FChicago`;
            calendarDiv.appendChild(iframe);
        }
    }

    /**
     * Renders homework link with lightbox functionality
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Current student data
     */
    renderHomeworkLink(tabPane, student) {
        const homeworkDiv = tabPane.querySelector('[data-portal="homework-link"]');
        const homeworkImg = homeworkDiv ? homeworkDiv.querySelector('[data-portal="homework-link-image"]') : null;
        const homeworkNewTabIcon = homeworkDiv ? homeworkDiv.querySelector('[data-portal="homework-new-tab-icon"]') : null;
        if (homeworkDiv) {
            if (student.studentDetail.home_work_link) {
                homeworkDiv.style.display = 'flex';
                if (homeworkImg && !homeworkImg._copyHandlerAttached) {
                    homeworkImg.style.cursor = 'pointer';
                    homeworkImg.setAttribute('tabindex', '0');
                    homeworkImg.setAttribute('aria-label', 'Copy homework link');
                    homeworkImg.addEventListener('click', () => {
                        var lightbox = document.getElementById('lightbox');
                        var iframe = lightbox.querySelector('iframe');
                        iframe.src = student.studentDetail.home_work_link;
                        lightbox.style.display = 'block';
                    });
                    homeworkImg._copyHandlerAttached = true;
                    homeworkNewTabIcon.addEventListener('click', () => {
                        window.open(student.studentDetail.home_work_link, '_blank');
                    });
                }
            } else {
                homeworkDiv.style.display = 'none';
            }
        }
    }

    /**
     * Renders styled invoice accordion with payment links
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Current student data
     */
    renderInvoiceAccordionStyled(tabPane, student, studentData) {
        var $this = this;
        // Find the placeholder for the invoice accordion
        const invoiceAccordion = tabPane.querySelector('[data-portal="invoice-form-accordian"]');
        if (!invoiceAccordion) return;

        // Remove any previous content
        invoiceAccordion.innerHTML = '';
        
        var invoices = student.invoiceList || [];
        if(studentData.futureSession.length > 0){
            // include future session invoices
            const futureInvoices = studentData.futureSession.flatMap(session => session.invoiceList || []);
            invoices = invoices.concat(futureInvoices);
        }
        if (!Array.isArray(invoices) || invoices.length === 0) {
            // If no invoices, do not render the accordion, just clear
            return;
        }

        // Accordion header
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

        // Fill in invoice data
        const body = invoiceAccordion.querySelector('.registration-form-accordion-body');
        const requiredDiv = body.querySelector('.required-forms-div');
        requiredDiv.innerHTML = '';

        const completed = invoices.filter(inv => inv.is_completed).length;
        const total = invoices.length;
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

        // Progress text
        const progressText = body.querySelector('.medium-text-with-margin-auto span');
        if (progressText) progressText.textContent = `${completed} of ${total} invoices complete`;
        const percentText = body.querySelector('.bold-text-with-margin-auto span');
        if (percentText) percentText.textContent = `${percent}%`;
        const progressBar = body.querySelector('.progress-bar-red-fill');
        if (progressBar) progressBar.style.width = `${percent}%`;

        // List each invoice
        invoices.forEach(inv => {
            const div = document.createElement('div');
            div.className = 'required-forms-flex-wrapper bluish-gray-rounded-with-mt-10';
            const isCompleted = inv.is_completed;
            // Action links container
            const actionLinksContainer = document.createElement('span');
            actionLinksContainer.style.textDecoration = 'underline';
            if (!isCompleted && Array.isArray(inv.jotFormUrlLink)) {
                inv.jotFormUrlLink.forEach((link, idx) => {
                    let a;
                    if (link.paymentType === 'card' || link.paymentType === 'us_bank_account') {
                        a = document.createElement('a');
                        a.href = '#';
                        a.className = 'pay-link';
                        a.setAttribute('data-invoice-id', inv.invoice_id);
                        a.setAttribute('data-amount', link.amount);
                        a.setAttribute('data-payment-link-id', link.paymentLinkId);
                        a.setAttribute('data-title', link.title);
                        a.setAttribute('data-payment-type', link.paymentType);
                        a.textContent = link.title;
                        // Add event listener for Stripe payment
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
                                    student,
                                    inv.paymentId
                                );
                            }
                        });
                    } else {
                        a = document.createElement('a');
                        a.href = link.jotFormUrl;
                        a.target = '_blank';
                        a.className = 'pay-link';
                        a.textContent = link.title;
                    }
                    actionLinksContainer.appendChild(a);
                    // Add separator if not last
                    if (idx < inv.jotFormUrlLink.length - 1) {
                        actionLinksContainer.appendChild(document.createTextNode(' | '));
                    }
                });
            } else if (isCompleted) {
                actionLinksContainer.innerHTML = '<span class="invoice-paid">Paid</span>';
            }
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
            // Replace placeholder with actionLinksContainer
            const placeholder = div.querySelector('.action-links-placeholder');
            if (placeholder) {
                placeholder.replaceWith(actionLinksContainer);
            }
            requiredDiv.appendChild(div);
        });

        // Accordion open/close logic (reuse your FAQ/registration form logic)
        const header = invoiceAccordion.querySelector('.registration-form-accordion-header');
        header.addEventListener('click', function () {
            if (invoiceAccordion.classList.contains('open')) {
                invoiceAccordion.classList.remove('open');
                body.style.maxHeight = '0';
            } else {
                // Close other open accordions in this tab
                tabPane.querySelectorAll('.registration-form-accordian.open').forEach(faq => {
                    faq.classList.remove('open');
                    const b = faq.querySelector('.registration-form-accordion-body');
                    if (b) b.style.maxHeight = '0';
                });
                invoiceAccordion.classList.add('open');
                body.style.maxHeight = body.scrollHeight + 'px';
            }
        });
    }

    /**
     * Renders notification for failed invoice payments
     * @param {HTMLElement} tabPane - The tab pane element
     * @param {Object} student - Current student data
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
     * @param {Object} student - Current student data
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
                    // Helper: checkform (returns true if formId is in completed list)
                    const checkform = (formId) => {
                        if (!formId || !Array.isArray(student.formCompletedList)) return false;
                        return student.formCompletedList.some(el => el.formId == formId);
                    };
                    if (forms.length === 0) {
                        if (progressDiv) progressDiv.style.display = 'none';
                        requiredFormsDiv.style.display = 'none';
                        if (needsToBeCompleted) needsToBeCompleted.style.display = 'none';
                        const noFormDiv = document.createElement('div');
                        noFormDiv.className = 'required-forms-flex-wrapper bluish-gray-rounded';
                        noFormDiv.innerHTML = `<div class="required-forms-inner-flex-wrapper"><div><div class="poppins-para medium"><span>No registration forms available</span></div></div></div>`;
                        regFormBody.appendChild(noFormDiv);
                    } else {
                        if (progressDiv) progressDiv.style.display = '';
                        requiredFormsDiv.style.display = 'block';
                        if (needsToBeCompleted) needsToBeCompleted.style.display = '';
                        const header = document.createElement('div');
                        header.className = 'required-forms-flex-wrapper';
                        header.innerHTML = `<img loading="lazy" src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/687776c15a20ab54ef82bb9b_receipt_long%20(1).svg" alt="" class="inline-block-icon"><div class="poppins-para no-margin-bottom"><span>Required Forms</span></div>`;
                        requiredFormsDiv.appendChild(header);

                        const completedForms = forms.filter(f => checkform(f.formId)).length;
                        const totalForms = forms.length;
                        const percent = totalForms === 0 ? 0 : Math.round((completedForms / totalForms) * 100);

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

                        forms.forEach(form => {
                            const editable = checkform(form.formId);
                            let actionText = '';
                            let formLinkHref = '';
                            const is_live = form.is_live;
                            if (is_live) {
                                if (editable) {
                                    // Find completed form data for submissionId
                                    let dbData = (student.formCompletedList || []).find(o => o.formId == form.formId);
                                    if (form.is_editable) {
                                        formLinkHref = (form.formId && dbData && dbData.submissionId) ?
                                            `https://www.jotform.com/edit/${dbData.submissionId}?memberId=${this.data.memberId || ''}&classId=${student.classDetail ? student.classDetail.classId : ''}&studentName=${encodeURIComponent(student.studentDetail.studentName)}&accountEmail=${encodeURIComponent(student.studentDetail.parentEmail)}&paymentId=${student.studentDetail.uniqueIdentification}` :
                                            '';
                                        actionText = 'Edit form';
                                    } else {
                                        formLinkHref = (dbData && dbData.submissionId) ?
                                            `https://www.jotform.com/submission/${dbData.submissionId}` : '';
                                        actionText = 'View Form';
                                    }
                                } else {
                                    formLinkHref = (form.formId) ?
                                        `https://form.jotform.com/${form.formId}?memberId=${this.data.memberId || ''}&classId=${student.classDetail ? student.classDetail.classId : ''}&studentName=${encodeURIComponent(student.studentDetail.studentName)}&accountEmail=${encodeURIComponent(student.studentDetail.parentEmail)}&paymentId=${student.studentDetail.uniqueIdentification}` :
                                        '';
                                    actionText = 'Go to form';
                                }
                            } else {
                                actionText = 'Go to form';
                                formLinkHref = '';
                            }
                            // Completed/Incompleted tag based on editable
                            const isCompleted = editable;
                            const linkClass = (is_live && window.innerWidth > 1200) ? 'iframe-lightbox-link dm-sans edit-form' : 'dm-sans edit-form';
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
     * Initializes tooltips for elements with tip attribute
     */
    initTooltips() {
        setTimeout(() => {
            document.querySelectorAll('[tip]').forEach(el => {
                el.addEventListener('mouseenter', function (e) {
                    let tipDiv = document.createElement('div');
                    tipDiv.className = 'tooltip';
                    tipDiv.textContent = el.getAttribute('tip');
                    document.body.appendChild(tipDiv);
                    const rect = el.getBoundingClientRect();
                    tipDiv.style.position = 'absolute';
                    tipDiv.style.left = (rect.left + window.scrollX + 20) + 'px';
                    tipDiv.style.top = (rect.top + window.scrollY - 10) + 'px';
                    el._tipDiv = tipDiv;
                });
                el.addEventListener('mouseleave', function (e) {
                    if (el._tipDiv) {
                        el._tipDiv.remove();
                        el._tipDiv = null;
                    }
                });
            });
        }, 0);
    }
    /**
     * Initializes Stripe payment processing
     * @param {string} invoice_id - Invoice ID
     * @param {string} title - Payment title
     * @param {number} amount - Payment amount
     * @param {string} paymentLinkId - Stripe payment link ID
     * @param {HTMLElement} span - Span element for UI updates
     * @param {string} link_title - Link title text
     * @param {string} paymentType - Payment type (card, bank account, etc.)
     * @param {Object} student - Student data
     */
    initializeStripePayment(invoice_id, title, amount, paymentLinkId, span, link_title, paymentType, student, paymentId) {
        var centAmount = (amount * 100).toFixed(2);
        // student.studentDetail.parentEmail
        var data = {
            "email": this.data.accountEmail,
            "name": this.getCurrentStudentName(),
            "label": title,
            "paymentType": paymentType,
            "amount": parseFloat(centAmount),
            "invoiceId": invoice_id,
            "paymentId": paymentId,
            "paymentLinkId": paymentLinkId,
            "memberId": this.data.memberId,
            "successUrl": encodeURI("https://www.bergendebate.com/portal/dashboard?programName=" + title),
            "cancelUrl": "https://www.bergendebate.com/portal/dashboard",
        }
        var xhr = new XMLHttpRequest()
        var $this = this;
        xhr.open("POST", "https://nqxxsp0jzd.execute-api.us-east-1.amazonaws.com/prod/camp/createCheckoutUrl", true)
        xhr.withCredentials = false
        xhr.send(JSON.stringify(data))
        xhr.onload = function () {
            let responseText = JSON.parse(xhr.responseText);
            if (responseText.success) {
                span.innerHTML = link_title;
                window.location.href = responseText.stripe_url;
            }

        }
    }
    /**
     * Initializes iframe lightbox functionality for form links
     */
    initiateLightbox() {
        var $this = this;
        [].forEach.call(document.getElementsByClassName("iframe-lightbox-link"), function (el) {
            el.lightbox = new IframeLightbox(el, {
                onClosed: function () {
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
     */
    initializeFAQAccordion() {
        const faqItems = document.querySelectorAll('.registration-form-accordian');

        faqItems.forEach((item, index) => {
            const header = item.querySelector('.registration-form-accordion-header');
            const body = item.querySelector('.registration-form-accordion-body');

            header.addEventListener('click', function () {
                if (item.classList.contains('open')) {
                    item.classList.remove('open');
                    body.style.maxHeight = '0';
                } else {
                    // Close any other open FAQ items
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
     */
    initializeInvoiceAccordion() {
        const invoiceItems = document.querySelectorAll('.invoice-form-accordian');

        invoiceItems.forEach((item, index) => {
            const header = item.querySelector('.registration-form-accordion-header');
            const body = item.querySelector('.registration-form-accordion-body');
            if (!header || !body) return;
            header.addEventListener('click', function () {
                if (item.classList.contains('open')) {
                    item.classList.remove('open');
                    body.style.maxHeight = '0';
                } else {
                    // Close any other open invoice accordions
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

        // close event lightbox
        var closeLink = document.getElementById('closeLightbox');
        closeLink.addEventListener('click', function () {
            var lightbox = document.getElementById('lightbox');
            lightbox.style.display = 'none';
        });
    }

    /**
     * Updates sidebar millions count for the current student
     * @param {Array} millionsData - Millions transaction data
     * @param {string} studentName - Name of the current student
     */
    updateSidebarMillionsCount(millionsData, studentName) {
        const sidebarCountEls = document.querySelectorAll('[data-millions="sidebarCount"]');
        if (!sidebarCountEls) return;
        sidebarCountEls.forEach(el => {
            // Find the entry for the current student
            const entry = millionsData.find(e => e.studentName === studentName);
            const millionsCount = entry?.earnAmount || 0;
            el.innerText = `${millionsCount}M`;
            // display block parent element of sidebarCountEl
            el.parentElement.style.display = 'block';
        });
    }

}





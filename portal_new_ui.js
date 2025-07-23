class Portal {
            constructor(data) {
                this.data = data;
                this.spinner = document.getElementById("half-circle-spinner");
                this.render();
            }

            async fetchData() {
                const response = await fetch(`${this.data.apiBaseURL}getPortalDetail/${this.data.memberId}`);
                if (!response.ok) throw new Error('Network response was not ok');
                const apiData = await response.json();
                return apiData;
            }

            async fetchMillionsData() {
                const response = await fetch(`${this.data.apiBaseURL}getMillionsTransactionData/${this.data.memberId}`);
                if (!response.ok) throw new Error('Network response was not ok');
                const millionsData = await response.json();
                return millionsData;
            }

            async fetchAnnouncements() {
                const response = await fetch(`${this.data.apiBaseURL}getAnnouncement/${this.data.memberId}`);
                if (!response.ok) throw new Error('Failed to fetch announcements');
                const data = await response.json();
                return data;
            }

            async render() {
                const paidResource = document.querySelector('.portal-info-container')
                paidResource.style.display = "none";
                this.spinner.style.display = "block";
                const [data, millionsData, announcements] = await Promise.all([
                    this.fetchData(),
                    this.fetchMillionsData(),
                    this.fetchAnnouncements()
                ]);
                const millions_transactions = millionsData.millions_transactions;
                this.setupTabs(data, millions_transactions, announcements);
                this.initTooltips();
                //this.initStripePaymentLinks();
                this.initiateLightbox();
                Webflow.require('tabs').redraw();
                this.initializeFAQAccordion();
                this.initializeInvoiceAccordion();
                this.hideRegistrationFormAccordion();
                paidResource.style.display = "block";
                setTimeout(() => {
                    this.spinner.style.display = "none";
                }, 500);
            }

            hideRegistrationFormAccordion() {
                const tabPane = document.querySelector('.portal-tab-pane');
                tabPane.querySelectorAll('.registration-form-accordian').forEach(el => {
                    if (el) el.style.display = 'none';
                });
            }
            setupTabs(data, millionsData, announcements) {
                // 1. Get references to tab menu and tab panes
                const tabMenu = document.querySelector('.portal-tab-menus');
                const tabLinks = tabMenu.querySelectorAll('.portal-tab-link');
                const tabContent = document.querySelector('.portal-tab-content');
                const tabPanes = tabContent.querySelectorAll('.portal-tab-pane');

                // 2. Filter students from data (studentDetail.studentName must exist)
                //const students = data.filter(item => item.studentDetail && item.studentDetail.studentName);
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
                    if (currentSession) {
                        this.renderStudentTab(tabPane, currentSession, millionsData, announcements);
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

            renderStudentTab(tabPane, student, millionsData, announcements) {
                // Update Current Class details dynamically
                const currentClassDiv = tabPane.querySelector('.recent-announcement-div.current-class');
                if (currentClassDiv) {
                    let hasClassDetail = student.classDetail && Object.keys(student.classDetail).length > 0;
                    if (hasClassDetail) {
                        // Build class info string
                        const classLevel = student.classDetail.classLevel || '';
                        const day = student.classDetail.day || '';
                        const startTime = student.classDetail.startTime || '';
                        const location = student.classDetail.location || '';
                        const sessionName = student.classDetail.sessionName || '';
                        const currentYear = student.classDetail.currentYear || '';
                        // Update title
                        const titleEl = currentClassDiv.querySelector('.recent-announcement-title');
                        if (titleEl) {
                            titleEl.innerHTML = `Current Class <span class=\"dm-sans regular\">(${sessionName} ${currentYear})</span>`;
                        }
                        // Update class info
                        const classInfoEl = currentClassDiv.querySelector('.poppins-para.current-class');
                        if (classInfoEl) {
                            classInfoEl.textContent = `${classLevel} | ${day} ${startTime} | ${location}`;
                        }
                    } else if (student.summerProgramDetail && Object.keys(student.summerProgramDetail).length > 0) {
                        // Show summer program data if classDetail is empty
                        const summer = student.summerProgramDetail;
                        const programName = summer.programName || 'Summer Program';
                        let location = summer.location || '';
                        let year = summer.year || '';
                        // Try to infer year if missing
                        if (!year) {
                            if (student.classDetail && student.classDetail.currentYear) {
                                year = student.classDetail.currentYear + ' Summer';
                            } else {
                                // fallback to current year
                                const d = new Date();
                                year = d.getFullYear() + ' Summer';
                            }
                        }
                        const titleEl = currentClassDiv.querySelector('.recent-announcement-title');
                        let paren = '';
                        if (location && year) {
                            paren = `(${location}, ${year})`;
                        } else if (location) {
                            paren = `(${location})`;
                        } else if (year) {
                            paren = `(${year})`;
                        }
                        if (titleEl) {
                            titleEl.innerHTML = `Current Program <span class=\"dm-sans regular\">${paren}</span>`;
                        }
                        const classInfoEl = currentClassDiv.querySelector('.poppins-para.current-class');
                        if (classInfoEl) {
                            classInfoEl.textContent = programName;
                        }
                    } else {
                        // Fallback if neither classDetail nor summerProgramDetail
                        const titleEl = currentClassDiv.querySelector('.recent-announcement-title');
                        if (titleEl) {
                            titleEl.innerHTML = `Current Class <span class=\"dm-sans regular\">(No class or summer program data available)</span>`;
                        }
                        const classInfoEl = currentClassDiv.querySelector('.poppins-para.current-class');
                        if (classInfoEl) {
                            classInfoEl.textContent = '';
                        }
                    }
                    // Show/hide Items Pending section based on registration form or invoice status
                    const itemsPendingWrapper = currentClassDiv.querySelector('.items-pending-flex-wrapper');
                    let hasPendingForm = false;
                    let hasPendingInvoice = false;
                    // Check registration forms
                    if (student.formList && Array.isArray(student.formList) && student.formList.length > 0) {
                        let forms = [];
                        student.formList.forEach(formGroup => {
                            if (formGroup.forms && formGroup.forms.length > 0) {
                                forms = forms.concat(formGroup.forms);
                            }
                        });
                        if (forms.length > 0 && Array.isArray(student.formCompletedList)) {
                            hasPendingForm = forms.some(f => !student.formCompletedList.some(c => c.formId == f.formId));
                        }
                    }
                    // Check invoices
                    if (student.invoiceList && Array.isArray(student.invoiceList) && student.invoiceList.length > 0) {
                        hasPendingInvoice = student.invoiceList.some(inv => !inv.is_completed);
                    }
                    if (itemsPendingWrapper) {
                        if (hasPendingForm || hasPendingInvoice) {
                            itemsPendingWrapper.style.display = '';
                        } else {
                            itemsPendingWrapper.style.display = 'none';
                        }
                    }
                }
                // Update millions count for this student
                let millionsCount = 0;
                if (Array.isArray(millionsData)) {
                    const millionsEntry = millionsData.find(entry => entry.studentName === student.studentDetail.studentName);
                    if (millionsEntry) {
                        millionsCount = millionsEntry.earnAmount || 0;
                    }
                }
                const millionsText = tabPane.querySelector('.million-price-text');
                if (millionsText) {
                    millionsText.innerHTML = `${millionsCount} <span class=\"million-text-gray\">millions</span>`;
                }
                this.renderHomeworkLink(tabPane, student);
                this.renderInvoiceAccordionStyled(tabPane, student);
                this.renderFailedInvoiceNotification(tabPane, student);
                this.renderRegistrationForms(tabPane, student);
                Webflow.require('tabs').redraw();
                this.renderGoogleCalendar(tabPane, student);
                // Future Classes and Past Class History
                // Find the future and past class containers
                const futureClassesDiv = tabPane.querySelector('.sem-classes-info-div.future-classes');
                const pastClassesDiv = tabPane.querySelectorAll('.sem-classes-info-div')[1]; // assuming second div is for past classes
                // Show/hide Future Classes
                if (student.futureSession && Array.isArray(student.futureSession) && student.futureSession.length > 0) {
                    if (futureClassesDiv) futureClassesDiv.style.display = '';
                    // Optionally, update the content if needed
                } else {
                    if (futureClassesDiv) futureClassesDiv.style.display = 'none';
                }
                // Show/hide Past Class History
                if (student.pastSession && Array.isArray(student.pastSession) && student.pastSession.length > 0) {
                    if (pastClassesDiv) pastClassesDiv.style.display = '';
                    // Optionally, update the content if needed
                } else {
                    if (pastClassesDiv) pastClassesDiv.style.display = 'none';
                }
                // Calendar Graph (Google Calendar)
                const calendarDiv = tabPane.querySelector('.calendar-white-rounded-div');
                if (calendarDiv) {
                    const googleCalendar = (student.uploadedContent || []).find(u => u.label === 'Google Calendar');
                    let calendarLink = '';
                    if (googleCalendar && googleCalendar.upload_content && googleCalendar.upload_content.length > 0) {
                        calendarLink = googleCalendar.upload_content[0].link;
                    }
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
                // Schedule a Makeup (Make-up Acuity Link)
                const makeupDiv = tabPane.querySelector('.class-tools-quick-links-div');
                if (makeupDiv) {
                    const makeupLink = (student.uploadedContent || []).find(u => u.label === 'Make-up Acuity Link');
                    const makeupSection = makeupDiv.querySelector('.class-tools-quick-links-flex-wrapper');
                    if (makeupSection) {
                        makeupSection.innerHTML = '';
                    }
                    if (makeupLink && makeupLink.upload_content && makeupLink.upload_content.length > 0) {
                        if (makeupSection) {
                            makeupLink.upload_content.forEach(item => {
                                // Provided HTML structure
                                const wrapper = document.createElement('div');
                                wrapper.className = 'class-tools-quick-links-flex-wrapper';
                                // Icon
                                const icon = document.createElement('img');
                                icon.loading = 'lazy';
                                icon.src = 'https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/68752684beabb8d0a43428b5_calendar_today.svg';
                                icon.alt = '';
                                icon.className = 'inline-block-icon';
                                // Text container
                                const textDiv = document.createElement('div');
                                // Title
                                const titleDiv = document.createElement('div');
                                titleDiv.className = 'dm-sans title';
                                const titleSpan = document.createElement('span');
                                titleSpan.textContent = 'Schedule a Makeup';
                                titleDiv.appendChild(titleSpan);
                                // Subtitle
                                const subtitleDiv = document.createElement('div');
                                subtitleDiv.className = 'poppins-para class-tools-quick-links';
                                const subtitleSpan = document.createElement('span');
                                subtitleSpan.textContent = 'One-click redirect to Acuity';
                                subtitleDiv.appendChild(subtitleSpan);
                                // Link row
                                const linkDiv = document.createElement('div');
                                linkDiv.className = 'poppins-para scheduling';
                                // Link
                                const a = document.createElement('a');
                                a.href = item.link;
                                a.classList.add('any-link', 'underline');
                                a.textContent = 'Go to scheduling';
                                a.target = '_blank';
                                a.style.marginRight = '8px';
                                // Copy icon
                                const img = document.createElement('img');
                                img.src = 'https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/6877c5c978d548ccecec33bf_link.svg';
                                img.alt = 'Copy link';
                                img.style.cursor = 'pointer';
                                img.style.width = '18px';
                                img.style.height = '18px';
                                // Tooltip
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
                                    const rect = img.getBoundingClientRect();
                                    tooltip.style.left = (rect.left + window.scrollX + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
                                    tooltip.style.top = (rect.top + window.scrollY - 30) + 'px';
                                    tooltip.style.display = 'block';
                                };
                                const hideTooltip = () => {
                                    if (tooltip) tooltip.style.display = 'none';
                                };
                                img.addEventListener('mouseenter', () => showTooltip('Copy link'));
                                img.addEventListener('mouseleave', hideTooltip);
                                img.addEventListener('focus', () => showTooltip('Copy link'));
                                img.addEventListener('blur', hideTooltip);
                                img.addEventListener('click', () => {
                                    navigator.clipboard.writeText(item.link).then(() => {
                                        showTooltip('Copied!');
                                        setTimeout(hideTooltip, 1200);
                                    });
                                });
                                linkDiv.appendChild(a);
                                linkDiv.appendChild(img);
                                // Compose
                                textDiv.appendChild(titleDiv);
                                textDiv.appendChild(subtitleDiv);
                                textDiv.appendChild(linkDiv);
                                makeupSection.appendChild(icon);
                                makeupSection.appendChild(textDiv);
                                //makeupSection.appendChild(wrapper);
                            });
                        }
                    } else {
                        if (makeupSection) makeupSection.innerHTML += '<div>No records available</div>';
                    }
                }
                // Zoom Links
                const zoomDiv = tabPane.querySelector('.zoom-links-info-wrapper');
                if (zoomDiv) {
                    const zoomLinks = (student.uploadedContent || []).find(u => u.label === 'Zoom links');
                    const zoomSection = zoomDiv.querySelector('.zoom-links-info-div');
                    if (zoomLinks && zoomLinks.upload_content && zoomLinks.upload_content.length > 0) {
                        // Remove all previous .zoom-links-info-div children
                        zoomDiv.querySelectorAll('.zoom-links-info-div').forEach(el => el.remove());
                        zoomLinks.upload_content.forEach(item => {
                            const wrapper = document.createElement('div');
                            wrapper.className = 'zoom-links-info-div';
                            const titleDescWrapper = document.createElement('div');
                            // Title row with copy icon
                            const titleDiv = document.createElement('div');
                            titleDiv.className = 'dm-sans title';
                            // Title text
                            const titleSpan = document.createElement('span');
                            titleSpan.textContent = item.name || 'Zoom Link';
                            titleDiv.appendChild(titleSpan);
                            // Copy icon
                            const img = document.createElement('img');
                            img.src = 'https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/6877c5c978d548ccecec33bf_link.svg';
                            img.alt = 'Copy link';
                            img.style.cursor = 'pointer';
                            img.style.width = '18px';
                            img.style.height = '18px';
                            img.style.marginLeft = '8px';
                            // Tooltip
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
                                const rect = img.getBoundingClientRect();
                                tooltip.style.left = (rect.left + window.scrollX + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
                                tooltip.style.top = (rect.top + window.scrollY - 30) + 'px';
                                tooltip.style.display = 'block';
                            };
                            const hideTooltip = () => {
                                if (tooltip) tooltip.style.display = 'none';
                            };
                            img.addEventListener('mouseenter', () => showTooltip('Copy link'));
                            img.addEventListener('mouseleave', hideTooltip);
                            img.addEventListener('focus', () => showTooltip('Copy link'));
                            img.addEventListener('blur', hideTooltip);
                            img.addEventListener('click', () => {
                                navigator.clipboard.writeText(item.link).then(() => {
                                    showTooltip('Copied!');
                                    setTimeout(hideTooltip, 1200);
                                });
                            });
                            //titleDiv.appendChild(img);
                            // Subtitle
                            const subtitleDiv = document.createElement('div');
                            subtitleDiv.className = 'poppins-para class-tools-quick-links';
                            const subtitleSpan = document.createElement('span');
                            subtitleSpan.textContent = item.resourceDesc || '';
                            subtitleDiv.appendChild(subtitleSpan);
                            // Compose
                            titleDescWrapper.appendChild(titleDiv);
                            titleDescWrapper.appendChild(subtitleDiv);
                            wrapper.appendChild(titleDescWrapper);
                            wrapper.appendChild(img);
                            zoomDiv.appendChild(wrapper);
                        });
                    } else {
                        if (zoomSection) zoomSection.innerHTML = '<div>No records available</div>';
                    }
                }
                // General Resources
                const generalDiv = tabPane.querySelector('.general-resources-info-wrapper');
                if (generalDiv) {
                    const generalResources = (student.uploadedContent || []).find(u => u.label === 'General resources');
                    // Remove all previous .general-resources-flex-wrapper children
                    generalDiv.querySelectorAll('.general-resources-flex-wrapper').forEach(el => el.remove());
                    if (generalResources && generalResources.upload_content && generalResources.upload_content.length > 0) {
                        generalResources.upload_content.forEach(item => {
                            const wrapper = document.createElement('div');
                            wrapper.className = 'general-resources-flex-wrapper';
                            // Left div
                            const leftDiv = document.createElement('div');
                            // Title
                            const titleDiv = document.createElement('div');
                            titleDiv.className = 'dm-sans title';
                            const titleSpan = document.createElement('span');
                            titleSpan.textContent = item.name || 'Resource';
                            titleDiv.appendChild(titleSpan);
                            // Subtitle
                            const subtitleDiv = document.createElement('div');
                            subtitleDiv.className = 'poppins-para class-tools-quick-links';
                            const subtitleSpan = document.createElement('span');
                            subtitleSpan.textContent = item.resourceDesc || '';
                            subtitleDiv.appendChild(subtitleSpan);
                            leftDiv.appendChild(titleDiv);
                            leftDiv.appendChild(subtitleDiv);
                            // Copy icon
                            const img = document.createElement('img');
                            img.loading = 'lazy';
                            img.src = 'https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/6877c5c978d548ccecec33bf_link.svg';
                            img.alt = 'Copy link';
                            img.className = 'inline-block-icon';
                            img.style.cursor = 'pointer';
                            img.style.width = '18px';
                            img.style.height = '18px';
                            // Tooltip
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
                                const rect = img.getBoundingClientRect();
                                tooltip.style.left = (rect.left + window.scrollX + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
                                tooltip.style.top = (rect.top + window.scrollY - 30) + 'px';
                                tooltip.style.display = 'block';
                            };
                            const hideTooltip = () => {
                                if (tooltip) tooltip.style.display = 'none';
                            };
                            img.addEventListener('mouseenter', () => showTooltip('Copy link'));
                            img.addEventListener('mouseleave', hideTooltip);
                            img.addEventListener('focus', () => showTooltip('Copy link'));
                            img.addEventListener('blur', hideTooltip);
                            img.addEventListener('click', () => {
                                navigator.clipboard.writeText(item.link).then(() => {
                                    showTooltip('Copied!');
                                    setTimeout(hideTooltip, 1200);
                                });
                            });
                            // Compose
                            wrapper.appendChild(leftDiv);
                            wrapper.appendChild(img);
                            generalDiv.appendChild(wrapper);
                        });
                    } else {
                        // If no resources, show message
                        const noDiv = document.createElement('div');
                        noDiv.className = 'general-resources-flex-wrapper';
                        noDiv.innerHTML = '<div><div class="dm-sans title"><span>No records available</span></div></div>';
                        generalDiv.appendChild(noDiv);
                    }
                }
                // Recent Announcements
                const announcementDiv = tabPane.querySelector('.recent-announcement-info-div');
                if (announcementDiv && Array.isArray(announcements.announcement) && announcements.announcement.length > 0) {
                    // Show count
                    const countDiv = tabPane.querySelector('.recent-announcement-number');
                    if (countDiv) countDiv.textContent = announcements.announcement.length;
                    // Show two most recent
                    const recent = announcements.announcement.slice(0, 2);
                    // Remove previous announcement blocks
                    announcementDiv.querySelectorAll('.recent-announcement-info-inner-div, .recent-announcement-info-flex, .dm-sans.recent-announcement-info').forEach(el => el.remove());
                    recent.forEach(ann => {
                        const container = document.createElement('div');
                        container.className = 'recent-announcement-info-inner-div';
                        // Flex row for title/type and date
                        const flex = document.createElement('div');
                        flex.className = 'recent-announcement-info-flex';
                        const title = document.createElement('p');
                        title.className = 'dm-sans recent-announcement-sub-title';
                        const titleText = ann.title || ann.subject || 'Announcement';
                        const type = ann.type ? ann.type : '';
                        title.textContent = type ? `${titleText}: ${type}` : titleText;
                        const date = document.createElement('p');
                        date.className = 'dm-sans medium';
                        date.textContent = ann.date || ann.createdAt || '';
                        flex.appendChild(title);
                        flex.appendChild(date);
                        // Message
                        const message = document.createElement('p');
                        message.className = 'dm-sans recent-announcement-info';
                        // Remove HTML tags and limit to 2 lines
                        let plainText = ann.message ? ann.message.replace(/<[^>]*>/g, '') : '';
                        message.textContent = plainText;
                        // CSS for 2-line clamp with ellipsis
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
            }

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

            renderHomeworkLink(tabPane, student) {
                const homeworkDiv = tabPane.querySelector('[data-portal="homework-link"]');
                const homeworkImg = homeworkDiv ? homeworkDiv.querySelector('[data-portal="homework-link-image"]') : null;
                if (homeworkDiv) {
                    if (student.studentDetail.home_work_link) {
                        homeworkDiv.style.display = 'flex';
                        if (homeworkImg && !homeworkImg._copyHandlerAttached) {
                            // ... existing copy/tooltip logic ...
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
                            homeworkImg.style.cursor = 'pointer';
                            homeworkImg.setAttribute('tabindex', '0');
                            homeworkImg.setAttribute('aria-label', 'Copy homework link');
                            homeworkImg.addEventListener('mouseenter', () => showTooltip('Copy homework link'));
                            homeworkImg.addEventListener('mouseleave', hideTooltip);
                            homeworkImg.addEventListener('focus', () => showTooltip('Copy homework link'));
                            homeworkImg.addEventListener('blur', hideTooltip);
                            homeworkImg.addEventListener('click', () => {
                                navigator.clipboard.writeText(student.studentDetail.home_work_link).then(() => {
                                    showTooltip('Copied!');
                                    setTimeout(hideTooltip, 1200);
                                });
                            });
                            homeworkImg._copyHandlerAttached = true;
                        }
                    } else {
                        homeworkDiv.style.display = 'none';
                    }
                }
            }

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
                                            student
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

            renderFailedInvoiceNotification(tabPane, student) {
                if (student.invoiceList && student.invoiceList.some(inv => inv.status === 'Failed')) {
                    const failedDiv = document.createElement('div');
                    failedDiv.className = 'notification-failed-invoice';
                    failedDiv.innerHTML = '<span>Some invoices have failed payments. Please pay again.</span>';
                    tabPane.prepend(failedDiv);
                }
            }

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
                                requiredFormsDiv.style.display = '';
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
            initializeStripePayment(invoice_id, title, amount, paymentLinkId, span, link_title, paymentType, student) {
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
                var xhr = new XMLHttpRequest()
                var $this = this;
                xhr.open("POST", "https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/createCheckoutUrl", true)
                xhr.withCredentials = false
                xhr.send(JSON.stringify(data))
                xhr.onload = function () {
                    let responseText = JSON.parse(xhr.responseText);
                    console.log('responseText', responseText)
                    if (responseText.success) {
                        span.innerHTML = link_title;
                        window.location.href = responseText.stripe_url;
                    }

                }
            }
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
     * @param formId - Jotform Id
     */
            checkform($formId) {
                if ($formId) {
                    const found = this.$completedForm.some(el => el.formId == $formId);
                    return found;
                }
                return false;
            }
            getformData($formId) {
                let data = this.$completedForm.find(o => o.formId == $formId);
                return data;
            }
            initiateLightbox() {
                var $this = this;
                [].forEach.call(document.getElementsByClassName("iframe-lightbox-link"), function (el) {
                    el.lightbox = new IframeLightbox(el, {
                        onClosed: function () {
                            console.log("Lightbox closed");
                        },
                        scrolling: true,
                    });
                });
            }
            initializeFAQAccordion() {
                const faqItems = document.querySelectorAll('.registration-form-accordian');

                faqItems.forEach((item, index) => {
                    const header = item.querySelector('.registration-form-accordion-header');
                    const body = item.querySelector('.registration-form-accordion-body');
                    //console.log("Attaching click event to header", index); 

                    header.addEventListener('click', function () {
                        //console.log("Header clicked:", index); 
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
            }
        }

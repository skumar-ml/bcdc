/*
        
Purpose: Displays member payment history with transaction details and status. Shows invoices and millions transactions in tabs for each student.

Brief Logic: Fetches portal detail and millions transaction data from API, creates tabs for each student, displays invoice list with payment details, shows millions transactions, updates sidebar with millions count, and handles tab switching.

Are there any dependent JS files: No

*/
class PaymentHistory {
    // Initializes the PaymentHistory instance
    constructor(data) {
        this.data = data;
        this.spinner = document.getElementById("half-circle-spinner");
        this.no_record = document.querySelector('[data-container="no-record-found"]');
        this.render();
    }

    // Fetches portal detail data from the API
    async fetchData() {
        const response = await fetch(
            `${this.data.apiBaseURL}getPortalDetail/${this.data.memberId}`
        );
        if (!response.ok) throw new Error("Network response was not ok");
        const apiData = await response.json();
        return apiData;
    }

    // Fetches millions transaction data from the API
    async fetchMillionsData() {
        const response = await fetch(
            `${this.data.apiBaseURL}getMillionsTransactionData/${this.data.memberId}`
        );
        if (!response.ok) {
            return [];
        }
        const millionsData = await response.json();
        return millionsData;
    }

    // Main render method to orchestrate UI setup
    async render() {
        // Hide content and show loading spinner
        const paidResource = document.querySelector(".portal-info-wrapper");
        paidResource.style.display = "none";
        this.spinner.style.display = "block";

        // Fetch all required data in parallel
        const [data, millionsData] = await Promise.all([
            this.fetchData(),
            this.fetchMillionsData(),
        ]);

        // Check if data exists
        if (data == "No data Found") {
            this.spinner.style.display = "none";
            this.no_record.style.display = "block";
            return false;
        }

        // Setup tabs with the fetched data
        const millions_transactions = millionsData.millions_transactions;
        this.setupTabs(data);

        // Redraw Webflow tabs and show content
        Webflow.require("tabs").redraw();
        paidResource.style.display = "block";
        setTimeout(() => {
            this.spinner.style.display = "none";
        }, 500);

        // Initialize invoice breakdown links
        this.initializeInvoiceBreakdownLinks();

        // Update sidebar millions count for initially active tab
        this.updateSidebarMillionsCount(
            millions_transactions,
            this.getCurrentStudentName()
        );

        // Add event listeners for tab changes to update millions count
        document.querySelectorAll(".portal-tab-link").forEach((tab) => {
            tab.addEventListener("click", () => {
                setTimeout(() => {
                    this.updateSidebarMillionsCount(
                        millions_transactions,
                        this.getCurrentStudentName()
                    );
                }, 0);
            });
        });
    }
    getCurrentStudentName = () => {
        const currentTab = document.querySelector(".portal-tab-link.w--current");
        return currentTab
            ? currentTab.querySelector(".portal-tab-text-semibold").textContent
            : "";
    };
    // Sets up dynamic tabs for each student
    setupTabs(data) {
        // Get DOM references for tab elements
        const tabMenu = document.querySelector(".portal-tab-menus");
        const tabLinks = tabMenu.querySelectorAll(".portal-tab-link");
        const tabContent = document.querySelector(".portal-tab-content");
        const tabPanes = tabContent.querySelectorAll(".portal-tab-pane");

        // Use all students data
        var students = data;

        // Clone first tab and pane as templates for new tabs
        const tabLinkTemplate = tabLinks[0].cloneNode(true);
        const tabPaneTemplate = tabPanes[0].cloneNode(true);

        // Remove all existing tabs except the first one
        tabLinks.forEach((link, idx) => {
            if (idx > 0) link.remove();
        });
        tabPanes.forEach((pane, idx) => {
            if (idx > 0) pane.remove();
        });

        // Get references to the first tab elements
        const firstTabLink = tabMenu.querySelector(".portal-tab-link");
        const firstTabPane = tabContent.querySelector(".portal-tab-pane");

        // Clear active states from first tab
        firstTabLink.classList.remove("w--current");
        firstTabLink.setAttribute("aria-selected", "false");
        firstTabPane.classList.remove("w--tab-active");
        // Sort students by most recent session creation date
        students.sort((a, b) => {
            const aData = Object.values(a)[0];
            const bData = Object.values(b)[0];

            // Get the first current session for comparison
            const aSession = aData.currentSession && aData.currentSession[0] ? aData.currentSession[0] : null;
            const bSession = bData.currentSession && bData.currentSession[0] ? bData.currentSession[0] : null;

            // Convert creation dates to Date objects for comparison
            const aDate = aSession && aSession.createdOn ? new Date(aSession.createdOn) : new Date(0);
            const bDate = bSession && bSession.createdOn ? new Date(bSession.createdOn) : new Date(0);

            // Sort by most recent first (descending order)
            return bDate - aDate;
        });

        // Create tabs for each student
        students.forEach((student, idx) => {
            // Extract student name and data from object
            const studentName = Object.keys(student)[0];
            const studentData = Object.values(student)[0];

            // Use first tab for first student, clone for others
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
            // Set Webflow tab attributes for proper functionality
            tabLink.setAttribute("data-w-tab", "Tab-" + idx);
            tabLink.setAttribute("id", "w-tabs-0-data-w-tab-" + idx);
            tabLink.setAttribute("href", "#w-tabs-0-data-w-pane-" + idx);
            tabLink.setAttribute("aria-controls", "w-tabs-0-data-w-pane-" + idx);
            tabPane.setAttribute("data-w-tab", "Tab-" + idx);
            tabPane.setAttribute("id", "w-tabs-0-data-w-pane-" + idx);
            tabPane.setAttribute("aria-labelledby", "w-tabs-0-data-w-tab-" + idx);
            // Set active state for first tab only
            if (idx === 0) {
                tabLink.classList.add("w--current");
                tabLink.setAttribute("aria-selected", "true");
                tabPane.classList.add("w--tab-active");
            } else {
                tabLink.classList.remove("w--current");
                tabLink.setAttribute("aria-selected", "false");
                tabPane.classList.remove("w--tab-active");
            }

            // Set student name as tab label
            if (tabLink.querySelector(".portal-tab-text-semibold")) {
                tabLink.querySelector(".portal-tab-text-semibold").textContent = studentName;
            }

            // Render student-specific content in the tab
            this.renderStudentTab(
                tabPane,
                studentData,
                studentName
            );
        });
    }

    // Renders content for a specific student tab
    renderStudentTab(
        tabPane,
        studentData,
        studentName
    ) {
        // Render outstanding invoices section
        this.renderOutstandingInvoices(tabPane, studentData, studentName);

        // Render payment history section
        this.renderPaymentHistory(tabPane, studentData, studentName);
    }

    // Renders outstanding invoices for a student
    renderOutstandingInvoices(tabPane, studentData, studentName) {
        const outstandingInvoiceContainer = tabPane.querySelector(
            '[data-payment="outstanding-invoice"]'
        );
        if (!outstandingInvoiceContainer) return;

        // Clear existing content
        outstandingInvoiceContainer.innerHTML = "";

        // Collect all outstanding invoices from current sessions
        let allOutstandingInvoices = [];

        // Process each current session to find outstanding invoices
        if (studentData.currentSession && studentData.currentSession.length > 0) {
            var currentSessions = studentData.currentSession[0];
            studentData.currentSession.forEach((session) => {
                if (session.invoiceList && session.invoiceList.length > 0) {
                    // Filter for incomplete invoices only
                    const outstandingInvoices = session.invoiceList.filter(
                        (invoice) => !invoice.is_completed
                    );

                    // Add invoice with session context
                    outstandingInvoices.forEach((invoice) => {
                        allOutstandingInvoices.push({
                            invoice: invoice,
                            session: session,
                        });
                    });
                }
            });
        }

        if (studentData.futureSession && studentData.futureSession.length > 0) {
            studentData.futureSession.forEach((session) => {
                if (session.invoiceList && session.invoiceList.length > 0) {
                    // Filter for incomplete invoices only
                    const outstandingInvoices = session.invoiceList.filter(
                        (invoice) => !invoice.is_completed
                    );

                    // Add invoice with session context
                    outstandingInvoices.forEach((invoice) => {
                        allOutstandingInvoices.push({
                            invoice: invoice,
                            session: currentSessions || session,
                        });
                    });
                }
            });
        }

        // Show message if no outstanding invoices
        if (allOutstandingInvoices.length === 0) {
            const noInvoicesRow = document.createElement("div");
            noInvoicesRow.className = "invoices-table-row-grid-wrapper";

            const noInvoicesText = document.createElement("div");
            noInvoicesText.className = "invoices-table-row-text no-outstanding-invoices";
            noInvoicesText.textContent = "No outstanding invoices";

            noInvoicesRow.appendChild(noInvoicesText);
            outstandingInvoiceContainer.appendChild(noInvoicesRow);
            return;
        }

        // Sort outstanding invoices by creation date (newest first)
        allOutstandingInvoices.sort((a, b) => {
            const dateA = new Date(a.invoice.created_on);
            const dateB = new Date(b.invoice.created_on);
            return dateB - dateA; // Newest first
        });

        // Render each outstanding invoice
        allOutstandingInvoices.forEach((invoiceData) => {
            const invoice = invoiceData.invoice;
            const session = invoiceData.session;
            const isCompleted = invoice.is_completed;

            // Create invoice container matching the HTML structure
            const invoiceContainer = document.createElement("div");
            invoiceContainer.className = "invoice-info-flex-container";

            // Left side: Invoice info
            const leftFlex = document.createElement("div");
            leftFlex.className = "invoice-inner-flex";

            // Icon based on completion status
            const icon = document.createElement("img");
            icon.loading = "lazy";
            if (isCompleted) {
                icon.src = "https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/6943e4bcc4af80937f99d7d3_radio_button_checked_16dp_3A974F_FILL0_wght400_GRAD0_opsz20.svg";
                icon.className = "checked-radio-icon";
            } else {
                icon.src = "https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/69439d207730a2b708fee46f_check.svg";
                icon.className = "uncheck-radio-icon";
            }
            leftFlex.appendChild(icon);

            const invoiceInfoDiv = document.createElement("div");
            const invoiceName = document.createElement("div");
            invoiceName.className = "poppins-para medium";
            invoiceName.innerHTML = `<span>${invoice.invoiceName || "Invoice"}</span>`;
            invoiceInfoDiv.appendChild(invoiceName);

            // Invoice breakdown link (show only if not completed or if breakdown is available)
            // Only show if "Semester Tuition" exists in breakDownList
            const hasSemesterTuition = invoice && invoice.breakDownList && invoice.breakDownList['Semester Tuition'] !== undefined;
            if ((!isCompleted || invoice.showBreakdown) && hasSemesterTuition) {
                const breakdownLink = document.createElement("a");
                breakdownLink.href = "#";
                breakdownLink.className = "invoice-breakdown-link w-inline-block";
                if (isCompleted) breakdownLink.classList.add("hide");
                breakdownLink.innerHTML = '<div><span>Invoice Breakdown</span></div>';
                // Store full invoice object and studentData as data attributes for use in modal
                if (invoice) {
                    breakdownLink.setAttribute('data-invoice', JSON.stringify(invoice));
                    breakdownLink.setAttribute('data-student-data', JSON.stringify(studentData));
                }
                invoiceInfoDiv.appendChild(breakdownLink);
            }
            leftFlex.appendChild(invoiceInfoDiv);

            // Right side: Payment options or status
            const rightFlex = document.createElement("div");
            rightFlex.className = "invoice-inner-flex";

            if (isCompleted) {
                // Completed state
                const completedTag = document.createElement("div");
                completedTag.className = "invoice-completed-tag";
                completedTag.innerHTML = '<p class="completed-tag-text">Completed</p>';
                rightFlex.appendChild(completedTag);

                const paidLink = document.createElement("a");
                paidLink.href = "#";
                paidLink.className = "invoice-card-payment-link plaid-info-icon w-inline-block";
                paidLink.innerHTML = '<div>Paid</div>';
                rightFlex.appendChild(paidLink);
            } else {
                // Incomplete state
                const incompleteTag = document.createElement("div");
                incompleteTag.className = "invoice-in-completed-tag";
                incompleteTag.innerHTML = '<p class="incompleted-tag-text">Incompleted</p>';
                // rightFlex.appendChild(incompleteTag); // Commented out to match HTML

                // Payment options
                if (Array.isArray(invoice.jotFormUrlLink) && invoice.jotFormUrlLink.length > 0) {
                    // Add credit card icon image before payment links
                    const paymentIcon = document.createElement("img");
                    paymentIcon.loading = "lazy";
                    paymentIcon.src = "https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/69439e917c2bfdd47f48a943_image%20150.svg";
                    paymentIcon.className = "inline-block-icon";
                    paymentIcon.alt = "";
                    rightFlex.appendChild(paymentIcon);

                    invoice.jotFormUrlLink.forEach((link, idx) => {
                        if (idx > 0) {
                            // Add separator line between payment links
                            const lineIcon = document.createElement("img");
                            lineIcon.src = "https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/6943df8b65a1afe5f4e5ac11__.svg";
                            lineIcon.loading = "lazy";
                            lineIcon.alt = "";
                            lineIcon.className = "line-icon";
                            rightFlex.appendChild(lineIcon);
                        }

                        let paymentLink;

                        // Handle Stripe payment methods (card/bank)
                        if (
                            link.paymentType === "card" ||
                            link.paymentType === "us_bank_account"
                        ) {
                            // Create Stripe payment link
                            paymentLink = document.createElement("a");
                            paymentLink.href = "#";
                            paymentLink.className = "invoice-card-payment-link w-inline-block";
                            paymentLink.setAttribute("data-invoice-id", invoice.invoice_id);
                            paymentLink.setAttribute("data-amount", link.amount);
                            paymentLink.setAttribute(
                                "data-payment-link-id",
                                link.paymentLinkId
                            );
                            paymentLink.setAttribute("data-title", link.title);
                            paymentLink.setAttribute("data-payment-type", link.paymentType);
                            paymentLink.innerHTML = `<div>${link.title}</div>`;

                            // Add click handler for Stripe payments
                            paymentLink.addEventListener("click", (e) => {
                                e.preventDefault();
                                paymentLink.textContent = "Processing...";
                                this.initializeStripePayment(
                                    invoice.invoice_id,
                                    invoice.invoiceName,
                                    link.amount,
                                    link.paymentLinkId,
                                    paymentLink,
                                    link.title,
                                    link.paymentType,
                                    session,
                                    invoice.paymentId
                                );
                            });
                        } else {
                            // Create external payment link (JotForm, etc.)
                            paymentLink = document.createElement("a");
                            paymentLink.href = link.jotFormUrl;
                            paymentLink.target = "_blank";
                            paymentLink.className = "invoice-card-payment-link w-inline-block";
                            paymentLink.innerHTML = `<div><span>${link.title}</span></div>`;
                        }

                        rightFlex.appendChild(paymentLink);
                    });
                } else {
                    // Default payment icon if no links
                    const paymentIcon = document.createElement("img");
                    paymentIcon.loading = "lazy";
                    paymentIcon.src = "https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/69439e917c2bfdd47f48a943_image%20150.svg";
                    paymentIcon.className = "inline-block-icon";
                    paymentIcon.alt = "";
                    rightFlex.appendChild(paymentIcon);
                }
            }

            invoiceContainer.appendChild(leftFlex);
            invoiceContainer.appendChild(rightFlex);
            outstandingInvoiceContainer.appendChild(invoiceContainer);
        });
    }

    // Initiates Stripe payment for an invoice
    initializeStripePayment(
        invoice_id,
        title,
        amount,
        paymentLinkId,
        span,
        link_title,
        paymentType,
        student,
        paymentId
    ) {
        // Convert amount to cents for Stripe
        var centAmount = (amount * 100).toFixed(2);

        // Prepare payment data for API
        var apiData = {
            email: this.data.accountEmail,
            name: this.getCurrentStudentName(),
            label: title,
            paymentType: paymentType,
            amount: parseFloat(centAmount),
            invoiceId: invoice_id,
            paymentId: paymentId,
            paymentLinkId: paymentLinkId,
            memberId: this.data.memberId,
            successUrl: encodeURI(
                "https://www.bergendebate.com/portal/payment-history?programName=" +
                title
            ),
            cancelUrl: "https://www.bergendebate.com/portal/payment-history",
        };
        // Send payment request to API
        var xhr = new XMLHttpRequest();
        xhr.open(
            "POST",
            "https://nqxxsp0jzd.execute-api.us-east-1.amazonaws.com/prod/camp/createCheckoutUrl",
            true
        );
        xhr.withCredentials = false;
        xhr.send(JSON.stringify(apiData));

        // Handle API response
        xhr.onload = function () {
            let responseText = JSON.parse(xhr.responseText);
            if (responseText.success) {
                span.innerHTML = link_title;
                window.location.href = responseText.stripe_url;
            }
        };
    }

    // Renders payment history for a student
    renderPaymentHistory(tabPane, studentData, studentName) {
        const paymentHistoryContainer = tabPane.querySelector(
            '[data-payment="payment-history"]'
        );
        if (!paymentHistoryContainer) return;

        // Clear existing content
        paymentHistoryContainer.innerHTML = "";

        // Get all sessions for the student
        let allSessions = this.getAllSessions(studentData);

        // Show message if no sessions found
        if (allSessions.length === 0) {
            const noSessionsRow = document.createElement("div");
            noSessionsRow.className = "completed-enrollments-row-wrapper";

            const noSessionsText = document.createElement("div");
            noSessionsText.className = "completed-enrollments-row-text";
            noSessionsText.textContent = "No sessions found";

            const emptyActionDiv = document.createElement("div");
            emptyActionDiv.className = "action-button-div";

            noSessionsRow.appendChild(noSessionsText);
            noSessionsRow.appendChild(emptyActionDiv);
            paymentHistoryContainer.appendChild(noSessionsRow);
            return;
        }

        // Remove duplicate sessions by year
        allSessions = allSessions.filter(
            (session, index, self) =>
                index === self.findIndex((t) => t.currentYear === session.currentYear)
        );

        // Sort sessions by year (newest first)
        allSessions.sort((a, b) => {
            const yearA = parseInt(a.currentYear || a.yearId || 0);
            const yearB = parseInt(b.currentYear || b.yearId || 0);
            return yearB - yearA;
        });

        // Create rows for each session
        allSessions.forEach((session) => {
            // Create session row container
            const sessionRow = document.createElement("div");
            sessionRow.className = "completed-enrollments-row-wrapper";

            // Get formatted session display name
            const sessionDisplayName = this.getSessionDisplayName(session);

            // Create session text display
            const sessionTextDiv = document.createElement("div");
            sessionTextDiv.className = "completed-enrollments-row-text";
            sessionTextDiv.textContent = sessionDisplayName;

            // Create action button container
            const actionButtonDiv = document.createElement("div");
            actionButtonDiv.className = "action-button-div";

            // Create download button for invoice PDF
            const downloadImg = document.createElement("img");
            downloadImg.loading = "lazy";
            downloadImg.src =
                "https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/689dcf57a789344578fd6a2a_download_payment.svg";
            downloadImg.alt = "";
            downloadImg.style.cursor = "pointer";

            // Add click handler for PDF generation
            downloadImg.addEventListener("click", () => {
                this.generateInvoicePDF(
                    this.data.memberId,
                    studentName,
                    session.yearId || session.currentYear || "",
                    downloadImg
                );
            });

            // Assemble session row and add to container
            actionButtonDiv.appendChild(downloadImg);
            sessionRow.appendChild(sessionTextDiv);
            sessionRow.appendChild(actionButtonDiv);
            paymentHistoryContainer.appendChild(sessionRow);
        });
    }

    // Retrieves all sessions (current and past) for a student
    getAllSessions(studentData) {
        const sessions = [];

        // Process current sessions
        if (studentData.currentSession && studentData.currentSession.length > 0) {
            studentData.currentSession.forEach((session) => {
                // Add class detail sessions
                if (
                    session.classDetail &&
                    Object.keys(session.classDetail).length > 0
                ) {
                    sessions.push({
                        ...session.classDetail,
                        yearId: session.classDetail.currentYear,
                        location: session.classLoactionDeatils?.locationName,
                        sessionData: session,
                    });
                }

                // Add summer program detail sessions
                if (
                    session.summerProgramDetail &&
                    Object.keys(session.summerProgramDetail).length > 0
                ) {
                    sessions.push({
                        ...session.summerProgramDetail,
                        yearId: session.summerProgramDetail.currentYear,
                        location: session.summerProgramDetail.location,
                        sessionData: session,
                    });
                }
            });
        }

        // Process past sessions
        if (studentData.pastSession && studentData.pastSession.length > 0) {
            studentData.pastSession.forEach((session) => {
                // Add past class detail sessions
                if (
                    session.classDetail &&
                    Object.keys(session.classDetail).length > 0
                ) {
                    sessions.push({
                        ...session.classDetail,
                        yearId: session.classDetail.currentYear,
                        location: session.classLoactionDeatils?.locationName,
                        sessionData: session,
                    });
                }

                // Add past summer program detail sessions
                if (
                    session.summerProgramDetail &&
                    Object.keys(session.summerProgramDetail).length > 0
                ) {
                    sessions.push({
                        ...session.summerProgramDetail,
                        yearId: session.summerProgramDetail.currentYear,
                        location: session.summerProgramDetail.location,
                        sessionData: session,
                    });
                }
            });
        }

        return sessions;
    }

    // Formats the session display name
    getSessionDisplayName(session) {
        const year = session.currentYear || session.yearId || "";
        return `Jan 1 - Dec 31, ${year}`;
    }

    // Updates the sidebar millions count
    updateSidebarMillionsCount(millionsData, studentName) {
        const sidebarCountEls = document.querySelectorAll(
            '[data-millions="sidebarCount"]'
        );
        if (!sidebarCountEls) return;

        sidebarCountEls.forEach((el) => {
            // Find millions data for current student
            const entry = millionsData.find((e) => e.studentName === studentName);
            const millionsCount = entry?.earnAmount || 0;

            // Update display with count
            el.innerText = `${millionsCount}M`;
            el.parentElement.style.display = "block";
        });
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
     * Shows invoice breakdown modal and sets up close functionality
     * @param {HTMLElement} modal - The invoice breakdown modal element
     * @param {Object} invoice - Invoice data to display
     * @param {Object} studentData - Complete student data
     */
    showInvoiceBreakdownModal(modal, invoice, studentData) {
        var $this = this;
        if (!modal) return;

        // Don't show modal if "Semester Tuition" is not available
        if (!invoice || !invoice.breakDownList || invoice.breakDownList['Semester Tuition'] === undefined) {
            return;
        }

        // Update modal content with invoice breakdown data
        if (invoice && invoice.breakDownList) {
            const breakdown = invoice.breakDownList;

            // Format currency helper
            const formatCurrency = (amount) => {
                const num = parseFloat(amount) || 0;
                const sign = num > 0 ? '+' : (num < 0 ? '-' : '');
                return `${sign}$${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
            };

            // Update Semester Tuition
            const semesterTuitionEl = modal.querySelector('[invoice-breakdown-data="SemesterTuition"]');
            if (semesterTuitionEl && breakdown['Semester Tuition'] !== undefined) {
                semesterTuitionEl.textContent = formatCurrency(breakdown['Semester Tuition']);
                if (breakdown['Semester Tuition'] == 0) {
                    semesterTuitionEl.parentElement.style.display = 'none';
                } else {
                    semesterTuitionEl.parentElement.style.display = 'flex';
                }
            }

            // Update Early Bird
            const earlyBirdEl = modal.querySelector('[invoice-breakdown-data="EarlyBird"]');
            if (earlyBirdEl && breakdown['Early Bird'] !== undefined) {
                earlyBirdEl.textContent = formatCurrency(breakdown['Early Bird']);
                if (breakdown['Early Bird'] == 0) {
                    earlyBirdEl.parentElement.style.display = 'none';
                } else {
                    earlyBirdEl.parentElement.style.display = 'flex';
                }
            }

            // Update New Student Fee
            const newStudentFeeEl = modal.querySelector('[invoice-breakdown-data="NewStudentFee"]');
            if (newStudentFeeEl && breakdown['New Student Fee'] !== undefined) {
                newStudentFeeEl.textContent = formatCurrency(breakdown['New Student Fee']);
                if (breakdown['New Student Fee'] == 0) {
                    newStudentFeeEl.parentElement.style.display = 'none';
                } else {
                    newStudentFeeEl.parentElement.style.display = 'flex';
                }
            }

            // invoice-breakdown-data="sibling-discount"
            const siblingDiscountEl = modal.querySelector('[invoice-breakdown-data="sibling-discount"]');
            if (siblingDiscountEl && breakdown['Sibling Discount'] !== undefined) {
                siblingDiscountEl.textContent = formatCurrency(breakdown['Sibling Discount']);
                if(breakdown['Sibling Discount'] == 0){
                    siblingDiscountEl.parentElement.style.display = 'none';
                } else {
                    siblingDiscountEl.parentElement.style.display = 'flex';
                }
            }

            // Update Deposit Title with date
            const depositTitleEl = modal.querySelector('[invoice-breakdown-data="DepositTitle"]');
            if (depositTitleEl && breakdown['Deposit'] !== undefined) {
                let depositDate = '';
                // Get date from currentSession.createdOn if available
                if (studentData && studentData.currentSession && studentData.currentSession.length > 0) {
                    const currentSession = studentData.currentSession[0];
                    if (currentSession.createdOn) {
                        try {
                            const date = new Date(currentSession.createdOn);
                            depositDate = date.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                            });
                        } catch (e) {
                            console.error('Error parsing date:', e);
                        }
                    }
                }
                depositTitleEl.textContent = depositDate ? `Deposit - Paid on ${depositDate}` : 'Deposit';
                if (breakdown['Deposit'] == 0) {
                    depositTitleEl.parentElement.style.display = 'none';
                } else {
                    depositTitleEl.parentElement.style.display = 'flex';
                }
            }

            // Update Deposit amount
            const depositEl = modal.querySelector('[invoice-breakdown-data="Deposit"]');
            if (depositEl && breakdown['Deposit'] !== undefined) {
                depositEl.textContent = formatCurrency(-Math.abs(breakdown['Deposit'])); // Always show as negative
            }

            // Calculate and update remaining balance
            const remainingBalanceEl = modal.querySelector('[data-cart-total="cart-total-price"]');
            if (remainingBalanceEl) {
                let total = 0;
                if (breakdown['Semester Tuition'] !== undefined) total += breakdown['Semester Tuition'];
                if (breakdown['Early Bird'] !== undefined) total += breakdown['Early Bird'];
                if (breakdown['New Student Fee'] !== undefined) total += breakdown['New Student Fee'];
                if (breakdown['Sibling Discount'] !== undefined) total += breakdown['Sibling Discount'];
                if (breakdown['Deposit'] !== undefined) total -= Math.abs(breakdown['Deposit']); // Subtract deposit

                remainingBalanceEl.innerHTML = `<strong>$${Math.max(0, total).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</strong>`;
            }
        }

        // Show the modal
        this.showModal(modal);

        // Set up close functionality if not already set up
        if (!modal.hasAttribute('data-close-setup')) {
            modal.setAttribute('data-close-setup', 'true');

            // Close on background click
            const modalBg = modal.querySelector('.invoice-breakdown-modal-bg');
            if (modalBg) {
                modalBg.addEventListener('click', () => {
                    $this.hideModal(modal);
                });
            }

            // Close on close button click
            const closeBtn = modal.querySelector('.upsell-buy-now-close-link');
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    $this.hideModal(modal);
                });
            }

            // Close on Escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape' && modal.classList.contains('show')) {
                    $this.hideModal(modal);
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        }
    }

    /**
     * Initializes invoice breakdown link click handlers
     */
    initializeInvoiceBreakdownLinks() {
        var $this = this;

        // Set up event delegation for invoice breakdown links
        // This handles both existing HTML links and dynamically created ones
        document.addEventListener('click', function (e) {
            const breakdownLink = e.target.closest('.invoice-breakdown-link');
            if (breakdownLink) {
                e.preventDefault();
                const modal = document.getElementById('invoice-breakdown-modal');
                if (modal) {
                    // Get full invoice and studentData from data attributes
                    let invoice = null;
                    let studentData = null;

                    const invoiceDataStr = breakdownLink.getAttribute('data-invoice');
                    const studentDataStr = breakdownLink.getAttribute('data-student-data');

                    if (invoiceDataStr) {
                        try {
                            invoice = JSON.parse(invoiceDataStr);
                        } catch (e) {
                            console.error('Error parsing invoice data:', e);
                        }
                    }

                    if (studentDataStr) {
                        try {
                            studentData = JSON.parse(studentDataStr);
                        } catch (e) {
                            console.error('Error parsing student data:', e);
                        }
                    }

                    // Only show modal if "Semester Tuition" exists in breakDownList
                    if (invoice && invoice.breakDownList && invoice.breakDownList['Semester Tuition'] !== undefined) {
                        $this.showInvoiceBreakdownModal(modal, invoice, studentData);
                    }
                }
            }
        });
    }

    // Generates and downloads an invoice PDF
    async generateInvoicePDF(memberId, name, yearId, imgElement = null) {
        try {
            // Show loading spinner if image element provided
            if (imgElement) {
                imgElement.src =
                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJWNk0xMiAxOFYyMk02IDEySDJNMTggMTJIMjJNMTkuNzcgMTkuNzZMMTguMzYgMTguMzVNMTkuNzcgNC4yNEwxOC4zNiA1LjY1TTQuMjMgNC4yM0w1LjY0IDUuNjRNNi4zNCAxNy42Nkw0LjkyIDE5LjA3IiBzdHJva2U9IiM2NjY2NjYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=";
                imgElement.style.animation = "spin 1s linear infinite";
                imgElement.style.cursor = "not-allowed";
            }

            // Send PDF generation request to API
            const response = await fetch(
                "https://nqxxsp0jzd.execute-api.us-east-1.amazonaws.com/prod/camp/generateInvoicePDF",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        memberId: memberId,
                        name: name,
                        yearId: parseInt(yearId),
                    }),
                }
            );

            const result = await response.json();

            // Process API response
            if (result.message == "PDF generated successfully") {
                // Download PDF if URL provided
                if (result.pdfUrl) {
                    const link = document.createElement("a");
                    link.href = result.pdfUrl;
                    link.download = `invoice_${name}_${yearId}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else {
                    // Show success message if no direct download
                    alert(`PDF generated successfully for ${name} - Year ${yearId}`);
                }
            } else {
                alert(`Error generating PDF: ${result.message || "Unknown error"}`);
            }

            // Restore download icon after successful completion
            if (imgElement) {
                imgElement.src =
                    "https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/689dcf57a789344578fd6a2a_download_payment.svg";
                imgElement.style.animation = "";
                imgElement.style.cursor = "pointer";
            }
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert(`Error generating PDF: ${error.message}`);

            // Restore download icon on error
            if (imgElement) {
                imgElement.src =
                    "https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/689dcf57a789344578fd6a2a_download_payment.svg";
                imgElement.style.animation = "";
                imgElement.style.cursor = "pointer";
            }
        }
    }
}




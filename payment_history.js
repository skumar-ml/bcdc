class PaymentHistory {
            constructor(data) {
                this.data = data;
                this.spinner = document.getElementById("half-circle-spinner");
                this.render();
            }

            async fetchData() {
                const response = await fetch(
                    `${this.data.apiBaseURL}getPortalDetail/${this.data.memberId}`
                );
                if (!response.ok) throw new Error("Network response was not ok");
                const apiData = await response.json();
                return apiData;
            }

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

            async fetchAnnouncements() {
                const response = await fetch(
                    `${this.data.apiBaseURL}getAnnouncement/${this.data.memberId}`
                );
                if (!response.ok) {
                    return [];
                }
                const data = await response.json();
                this.updateAnnouncement(data);
                return data;
            }
            updateAnnouncement(announcementData) {
                const announcementLength = announcementData.announcement.filter(ann => !ann.is_read && ann.emailId === this.data.accountEmail).length;
                const announcementDiv = document.querySelectorAll('[data-announcements="counts"]');
                if (announcementDiv) {
                    announcementDiv.forEach(div => {
                        div.textContent = announcementLength;
                        div.parentElement.style.display = 'block';
                    });
                }
            }
            async render() {
                const paidResource = document.querySelector(".portal-info-wrapper");
                paidResource.style.display = "none";
                this.spinner.style.display = "block";
                const [data, millionsData, announcements] = await Promise.all([
                    this.fetchData(),
                    this.fetchMillionsData(),
                    this.fetchAnnouncements(),
                ]);
                if (data == "No data Found") {
                    return false;
                }
                const millions_transactions = millionsData.millions_transactions;
                this.setupTabs(data, millions_transactions, announcements);

                Webflow.require("tabs").redraw();
                paidResource.style.display = "block";
                setTimeout(() => {
                    this.spinner.style.display = "none";
                }, 500);

                // Update sidebar millions count for the initially active tab
                const getCurrentStudentName = () => {
                    const currentTab = document.querySelector(".portal-tab-link.w--current");
                    return currentTab
                        ? currentTab.querySelector(".portal-tab-text-semibold").textContent
                        : "";
                };
                this.updateSidebarMillionsCount(
                    millions_transactions,
                    getCurrentStudentName()
                );

                // Update sidebar millions count on tab change
                document.querySelectorAll(".portal-tab-link").forEach((tab) => {
                    tab.addEventListener("click", () => {
                        setTimeout(() => {
                            this.updateSidebarMillionsCount(
                                millions_transactions,
                                getCurrentStudentName()
                            );
                        }, 0);
                    });
                });
            }

            setupTabs(data, millionsData, announcements) {
                // 1. Get references to tab menu and tab panes
                const tabMenu = document.querySelector(".portal-tab-menus");
                const tabLinks = tabMenu.querySelectorAll(".portal-tab-link");
                const tabContent = document.querySelector(".portal-tab-content");
                const tabPanes = tabContent.querySelectorAll(".portal-tab-pane");

                // 2. Filter students from data (studentDetail.studentName must exist)
                //const students = data.filter(item => item.studentDetail && item.studentDetail.studentName);
                var students = data;
                // 3. Use the first tab and pane as templates
                const tabLinkTemplate = tabLinks[0].cloneNode(true);
                const tabPaneTemplate = tabPanes[0].cloneNode(true);

                // 4. Remove all existing tab links and panes
                tabLinks.forEach((link, idx) => {
                    if (idx > 0) link.remove();
                });
                tabPanes.forEach((pane, idx) => {
                    if (idx > 0) pane.remove();
                });

                // 5. Clear the first tab link and pane
                const firstTabLink = tabMenu.querySelector(".portal-tab-link");
                const firstTabPane = tabContent.querySelector(".portal-tab-pane");

                // Remove active classes
                firstTabLink.classList.remove("w--current");
                firstTabLink.setAttribute("aria-selected", "false");
                firstTabPane.classList.remove("w--tab-active");
                // Sort students by currentSession[0].createdOn (most recent first)
                students.sort((a, b) => {
                    const aData = Object.values(a)[0];
                    const bData = Object.values(b)[0];
                    const aSession =
                        aData.currentSession && aData.currentSession[0]
                            ? aData.currentSession[0]
                            : null;
                    const bSession =
                        bData.currentSession && bData.currentSession[0]
                            ? bData.currentSession[0]
                            : null;
                    const aDate =
                        aSession && aSession.createdOn
                            ? new Date(aSession.createdOn)
                            : new Date(0);
                    const bDate =
                        bSession && bSession.createdOn
                            ? new Date(bSession.createdOn)
                            : new Date(0);
                    // Most recent first
                    return bDate - aDate;
                });
                // Remove pastSession isRefunded true data
                students = students.filter((student) => {
                    const studentName = Object.keys(student)[0];
                    const studentData = Object.values(student)[0];
                    if (studentData.pastSession.length > 0) {
                        return studentData.pastSession.find((session) => !session.isRefunded);
                    } else {
                        return true;
                    }
                });
                // 6. For each student, create tab link and pane
                students.forEach((student, idx) => {
                    // get Object key from the student object
                    const studentName = Object.keys(student)[0];
                    const studentData = Object.values(student)[0];

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
                    tabLink.setAttribute("data-w-tab", "Tab-" + idx);
                    tabLink.setAttribute("id", "w-tabs-0-data-w-tab-" + idx);
                    tabLink.setAttribute("href", "#w-tabs-0-data-w-pane-" + idx);
                    tabLink.setAttribute("aria-controls", "w-tabs-0-data-w-pane-" + idx);
                    tabPane.setAttribute("data-w-tab", "Tab-" + idx);
                    tabPane.setAttribute("id", "w-tabs-0-data-w-pane-" + idx);
                    tabPane.setAttribute("aria-labelledby", "w-tabs-0-data-w-tab-" + idx);
                    // Set active class for first tab
                    if (idx === 0) {
                        tabLink.classList.add("w--current");
                        tabLink.setAttribute("aria-selected", "true");
                        tabPane.classList.add("w--tab-active");
                    } else {
                        tabLink.classList.remove("w--current");
                        tabLink.setAttribute("aria-selected", "false");
                        tabPane.classList.remove("w--tab-active");
                    }
                    // Set label
                    if (tabLink.querySelector(".portal-tab-text-semibold")) {
                        tabLink.querySelector(".portal-tab-text-semibold").textContent =
                            studentName;
                    }
                    // Render content inside tab based on available data
                    this.renderStudentTab(
                        tabPane,
                        studentData,
                        studentName,
                        millionsData,
                        announcements
                    );
                });
            }

            renderStudentTab(
                tabPane,
                studentData,
                studentName,
                millionsData,
                announcements
            ) {
                // Render outstanding invoices
                this.renderOutstandingInvoices(tabPane, studentData, studentName);

                // Render payment history
                this.renderPaymentHistory(tabPane, studentData, studentName);
            }

            renderOutstandingInvoices(tabPane, studentData, studentName) {
                const outstandingInvoiceContainer = tabPane.querySelector(
                    '[data-payment="outstanding-invoice"]'
                );
                if (!outstandingInvoiceContainer) return;

                // Clear existing content
                outstandingInvoiceContainer.innerHTML = "";

                // Collect all outstanding invoices from all current sessions
                let allOutstandingInvoices = [];

                if (studentData.currentSession && studentData.currentSession.length > 0) {
                    studentData.currentSession.forEach((session) => {
                        if (session.invoiceList && session.invoiceList.length > 0) {
                            const outstandingInvoices = session.invoiceList.filter(
                                (invoice) => !invoice.is_completed
                            );
                            outstandingInvoices.forEach((invoice) => {
                                allOutstandingInvoices.push({
                                    invoice: invoice,
                                    session: session,
                                });
                            });
                        }
                    });
                }

                if (allOutstandingInvoices.length === 0) {
                    // Create "No outstanding invoices" row using DOM elements
                    const noInvoicesRow = document.createElement("div");
                    noInvoicesRow.className = "invoices-table-row-grid-wrapper";

                    const noInvoicesText = document.createElement("div");
                    noInvoicesText.className = "invoices-table-row-text no-outstanding-invoices";
                    noInvoicesText.textContent = "No outstanding invoices";

                    // const emptyTextDiv = document.createElement("div");
                    // emptyTextDiv.className = "invoices-table-row-text";

                    // const emptyActionDiv = document.createElement("div");
                    // emptyActionDiv.className = "invoices-action-button-div";

                    noInvoicesRow.appendChild(noInvoicesText);
                    // noInvoicesRow.appendChild(emptyTextDiv);
                    // noInvoicesRow.appendChild(emptyActionDiv);
                    outstandingInvoiceContainer.appendChild(noInvoicesRow);
                    return;
                }

                allOutstandingInvoices.forEach((invoiceData) => {
                    const invoice = invoiceData.invoice;
                    const session = invoiceData.session;

                    const invoiceRow = document.createElement("div");
                    invoiceRow.className = "invoices-table-row-grid-wrapper";

                    const createdDate = new Date(session.createdOn).toLocaleDateString(
                        "en-US",
                        {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                        }
                    );

                    const location =
                        session.classLoactionDeatils?.locationName ||
                        session.summerProgramDetail?.location ||
                        "N/A";
                    const sessionName =
                        session.classDetail?.sessionName ||
                        session.summerProgramDetail?.sessionName ||
                        "N/A";
                    const year =
                        session.classDetail?.currentYear ||
                        session.summerProgramDetail?.currentYear ||
                        "N/A";

                    // Get payment amount from jotFormUrlLink
                    const cardPayment = invoice.jotFormUrlLink?.find(
                        (link) => link.paymentType === "card"
                    );
                    const bankPayment = invoice.jotFormUrlLink?.find(
                        (link) => link.paymentType === "us_bank_account"
                    );
                    const amount = cardPayment?.amount || bankPayment?.amount || 0;

                    // Create date div
                    const dateDiv = document.createElement("div");
                    dateDiv.className = "invoices-table-row-text";
                    dateDiv.textContent = createdDate;

                    // Create invoice info div
                    const invoiceInfoDiv = document.createElement("div");
                    invoiceInfoDiv.className = "invoices-table-row-text";
                    invoiceInfoDiv.textContent = `${invoice.invoiceName} (${location}, ${sessionName} ${year})`;

                    // Create action button div
                    const actionButtonDiv = document.createElement("div");
                    actionButtonDiv.className = "invoices-action-button-div";

                    // Check if invoice has payment links and is not completed
                    if (!invoice.is_completed && Array.isArray(invoice.jotFormUrlLink)) {
                        invoice.jotFormUrlLink.forEach((link, idx) => {
                            let paymentLink;
                            if (
                                link.paymentType === "card" ||
                                link.paymentType === "us_bank_account"
                            ) {
                                // Create Stripe payment link
                                paymentLink = document.createElement("a");
                                paymentLink.href = "#";
                                paymentLink.className = "main-button invoices-action w-button";
                                paymentLink.setAttribute("data-invoice-id", invoice.invoice_id);
                                paymentLink.setAttribute("data-amount", link.amount);
                                paymentLink.setAttribute(
                                    "data-payment-link-id",
                                    link.paymentLinkId
                                );
                                paymentLink.setAttribute("data-title", link.title);
                                paymentLink.setAttribute("data-payment-type", link.paymentType);
                                paymentLink.textContent = link.title;

                                // Add event listener for Stripe payment
                                paymentLink.addEventListener("click", (e) => {
                                    e.preventDefault();
                                    paymentLink.textContent = "Processing...";
                                    this.initializeStripePayment(
                                        invoice.invoice_id,
                                        invoice.invoiceName,
                                        link.amount,
                                        link.paymentLinkId,
                                        paymentLink, // pass the link element
                                        link.title,
                                        link.paymentType,
                                        session
                                    );
                                });
                            } else {
                                // Create external payment link (e.g., JotForm)
                                paymentLink = document.createElement("a");
                                paymentLink.href = link.jotFormUrl;
                                paymentLink.target = "_blank";
                                paymentLink.className = "main-button invoices-action w-button";
                                paymentLink.textContent = link.title;
                            }

                            actionButtonDiv.appendChild(paymentLink);

                            // Add separator if not last
                            // if (idx < invoice.jotFormUrlLink.length - 1) {
                            //   const separator = document.createElement("span");
                            //   separator.className = "separator";
                            //   separator.textContent = " | ";
                            //   actionButtonDiv.appendChild(separator);
                            // }
                        });
                    } else if (invoice.is_completed) {
                        // Show paid status
                        const paidSpan = document.createElement("span");
                        paidSpan.className = "invoice-paid";
                        paidSpan.textContent = "Paid";
                        actionButtonDiv.appendChild(paidSpan);
                    } else {
                        // Fallback: create generic Pay Now button
                        const payNowButton = document.createElement("a");
                        payNowButton.href = "#";
                        payNowButton.setAttribute("data-upSell", "buy-now");
                        payNowButton.setAttribute("add-to-cart", "normal");
                        payNowButton.className = "main-button invoices-action w-button";
                        payNowButton.setAttribute("data-invoice-id", invoice.invoice_id);
                        payNowButton.setAttribute(
                            "data-payment-links",
                            JSON.stringify(invoice.jotFormUrlLink)
                        );
                        payNowButton.textContent = "Pay Now";
                        actionButtonDiv.appendChild(payNowButton);
                    }

                    // Append all elements to invoice row
                    invoiceRow.appendChild(dateDiv);
                    invoiceRow.appendChild(invoiceInfoDiv);
                    invoiceRow.appendChild(actionButtonDiv);

                    outstandingInvoiceContainer.appendChild(invoiceRow);
                });
            }

            initializeStripePayment(
                invoice_id,
                title,
                amount,
                paymentLinkId,
                span,
                link_title,
                paymentType,
                student
            ) {
                var centAmount = (amount * 100).toFixed(2);
                var data = {
                    email: student.studentDetail.parentEmail,
                    name: student.studentDetail.studentName,
                    label: title,
                    paymentType: paymentType,
                    amount: parseFloat(centAmount),
                    invoiceId: invoice_id,
                    paymentId: student.studentDetail.uniqueIdentification,
                    paymentLinkId: paymentLinkId,
                    memberId: this.data.memberId,
                    successUrl: encodeURI(
                        "https://www.bergendebate.com/members/" +
                        this.data.memberId +
                        "?programName=" +
                        title
                    ),
                    cancelUrl: "https://www.bergendebate.com/members/" + this.data.memberId,
                };
                var xhr = new XMLHttpRequest();
                var $this = this;
                xhr.open(
                    "POST",
                    "https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/createCheckoutUrl",
                    true
                );
                xhr.withCredentials = false;
                xhr.send(JSON.stringify(data));
                xhr.onload = function () {
                    let responseText = JSON.parse(xhr.responseText);
                    console.log("responseText", responseText);
                    if (responseText.success) {
                        span.innerHTML = link_title;
                        window.location.href = responseText.stripe_url;
                    }
                };
            }

            renderPaymentHistory(tabPane, studentData, studentName) {
                const paymentHistoryContainer = tabPane.querySelector(
                    '[data-payment="payment-history"]'
                );
                if (!paymentHistoryContainer) return;

                // Clear existing content
                paymentHistoryContainer.innerHTML = "";

                // Get all sessions (current, past, and future)
                let allSessions = this.getAllSessions(studentData);

                if (allSessions.length === 0) {
                    // Create "No sessions found" row using DOM elements
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

                // filter unique yearId
                allSessions = allSessions.filter(
                    (session, index, self) =>
                        index === self.findIndex((t) => t.currentYear === session.currentYear)
                );

                // Create rows for each session
                allSessions.forEach((session) => {
                    const sessionRow = document.createElement("div");
                    sessionRow.className = "completed-enrollments-row-wrapper";

                    const sessionDisplayName = this.getSessionDisplayName(session);

                    // Create text div
                    const sessionTextDiv = document.createElement("div");
                    sessionTextDiv.className = "completed-enrollments-row-text";
                    sessionTextDiv.textContent = sessionDisplayName;

                    // Create action button div
                    const actionButtonDiv = document.createElement("div");
                    actionButtonDiv.className = "action-button-div";

                    // Create download image
                    const downloadImg = document.createElement("img");
                    downloadImg.loading = "lazy";
                    downloadImg.src =
                        "https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/689dcf57a789344578fd6a2a_download_payment.svg";
                    downloadImg.alt = "";
                    downloadImg.style.cursor = "pointer";
                    downloadImg.addEventListener("click", () => {
                        this.generateInvoicePDF(
                            this.data.memberId,
                            studentName,
                            session.yearId || session.currentYear || "",
                            downloadImg
                        );
                    });

                    // Append elements
                    actionButtonDiv.appendChild(downloadImg);
                    sessionRow.appendChild(sessionTextDiv);
                    sessionRow.appendChild(actionButtonDiv);
                    paymentHistoryContainer.appendChild(sessionRow);
                });
            }

            getAllSessions(studentData) {
                const sessions = [];

                // Add current sessions
                if (studentData.currentSession && studentData.currentSession.length > 0) {
                    studentData.currentSession.forEach((session) => {
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

                // Add past sessions
                if (studentData.pastSession && studentData.pastSession.length > 0) {
                    studentData.pastSession.forEach((session) => {
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

            getSessionDisplayName(session) {
                const year = session.currentYear || session.yearId || "";
                return `Jan 1 - Dec 31, ${year}`;
            }

            updateSidebarMillionsCount(millionsData, studentName) {
                const sidebarCountEls = document.querySelectorAll(
                    '[data-millions="sidebarCount"]'
                );
                if (!sidebarCountEls) return;
                sidebarCountEls.forEach((el) => {
                    // Find the entry for the current student
                    const entry = millionsData.find((e) => e.studentName === studentName);
                    const millionsCount = entry?.earnAmount || 0;
                    el.innerText = `${millionsCount}M`;
                    // display block parent element of sidebarCountEl
                    el.parentElement.style.display = "block";
                });
            }
            // Global function to generate invoice PDF
            async generateInvoicePDF(memberId, name, yearId, imgElement = null) {
                try {
                    // Show loading indicator
                    const loadingMsg = `Generating PDF for ${name} - Year ${yearId}...`;
                    console.log(loadingMsg);
                    var $this = this;

                    // Show processing icon if imgElement is provided
                    if (imgElement) {
                        imgElement.src =
                            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJWNk0xMiAxOFYyMk02IDEySDJNMTggMTJIMjJNMTkuNzcgMTkuNzZMMTguMzYgMTguMzVNMTkuNzcgNC4yNEwxOC4zNiA1LjY1TTQuMjMgNC4yM0w1LjY0IDUuNjRNNi4zNCAxNy42Nkw0LjkyIDE5LjA3IiBzdHJva2U9IiM2NjY2NjYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=";
                        imgElement.style.animation = "spin 1s linear infinite";
                        imgElement.style.cursor = "not-allowed";
                    }

                    // Call the API
                    const response = await fetch(
                        "https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/generateInvoicePDF",
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

                    // Handle the response
                    if (result.message == "PDF generated successfully") {
                        // If the API returns a PDF URL, open it
                        if (result.pdfUrl) {
                            // Create a download link
                            const link = document.createElement("a");
                            link.href = result.pdfUrl;
                            link.download = `invoice_${name}_${yearId}.pdf`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        } else {
                            // If no direct URL, show success message
                            alert(`PDF generated successfully for ${name} - Year ${yearId}`);
                        }
                    } else {
                        alert(`Error generating PDF: ${result.message || "Unknown error"}`);
                    }

                    // Restore download icon after completion (success or error)
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




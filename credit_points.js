/*

Purpose: Manages and displays member credit balance and transaction history. Shows credit balance amount and lists all credit transactions with dates and descriptions.

Brief Logic: Fetches credit balance data from API, always shows the balance + FAQ area, and hides both the "Credit Transaction History" title (.portal-node-title.transactions) and the table banner when there are no rows.

Are there any dependent JS files: No

*/
class CreditBalance {
            $creditData = {};
            // Initializes the CreditBalance class with data and DOM elements
            constructor(data) {
                this.data = data;
                this.balance = 0.0; // Initial balance
                this.transactions = [];
                this.spinner = document.getElementById("half-circle-spinner");
                this.balanceElement = document.querySelector('[data-credit="balance"]');
                this.tableElement = document.querySelector('[data-credit="table"]');
                // Only the history table banner — not the balance / FAQ section
                this.transactionsBanner =
                    (this.tableElement && this.tableElement.closest(".portal-white-banner.transactions")) ||
                    document.querySelector(".portal-white-banner.transactions");
                // Heading sits above the banner in Webflow — hide it with empty history
                this.transactionsTitle = document.querySelector(".portal-node-title.transactions");
                // Column headers inside the banner (sibling of [data-credit="table"])
                this.transactionsHeader =
                    (this.transactionsBanner &&
                        this.transactionsBanner.querySelector(".transactions-header-grid-wrapper")) ||
                    null;
                // Balance + FAQ live here; keep this visible even when history is empty
                this.portalInfoWrapper = document.querySelector('.portal-info-wrapper');
                this.noRecordDiv = document.querySelector('[data-container="no-record-found"]');
                this.init();
            }
            // Fetches credit balance data from the API
            async fetchCreditData() {
                try {
                    // Prefer bdcFetch when peek/utils installed; fall back for older embeds
                    const doFetch = typeof bdcFetch === "function" ? bdcFetch : fetch;
                    const response = await doFetch(
                        `${this.data.apiBaseURL}getCreditBalance/${this.data.memberId}`
                    );
                    if (!response.ok) throw new Error("Network response was not ok");
                    const apiData = await response.json();
                    return apiData;
                } catch (error) {
                    console.error("Fetch error:", error);
                    // Still show $0 balance + FAQ; only history stays hidden
                    this.applyCreditUi(0, []);
                    return;
                }
            }
            // History title + banner only when there are real rows
            renderTransactionsSection(hasHistory) {
                if (this.transactionsTitle) {
                    // Same condition as the table — do not leave an orphan heading
                    this.transactionsTitle.style.display = hasHistory ? "" : "none";
                }
                if (this.transactionsBanner) {
                    this.transactionsBanner.style.display = hasHistory ? "" : "none";
                }
                if (this.transactionsHeader) {
                    this.transactionsHeader.style.display = hasHistory ? "" : "none";
                }
                if (this.tableElement) {
                    this.tableElement.innerHTML = "";
                    this.tableElement.style.display = hasHistory ? "block" : "none";
                    if (hasHistory) this.updateTransactionTable();
                }
            }
            // Balance + FAQ stay up; hide history title and table when empty
            applyCreditUi(balance, transactions) {
                this.balance = Number(balance) || 0;
                this.transactions = Array.isArray(transactions) ? transactions : [];
                if (this.spinner) this.spinner.style.display = "none";
                // Keep page chrome (balance card + FAQ) — never hide for empty history
                if (this.portalInfoWrapper) this.portalInfoWrapper.style.display = "block";
                if (this.noRecordDiv) this.noRecordDiv.style.display = "none";
                if (this.balanceElement) {
                    this.balanceElement.style.display = "block";
                    this.balanceElement.textContent = `$${this.balance.toFixed(2)}`;
                }
                this.renderTransactionsSection(this.transactions.length > 0);
            }
            // Initializes the UI, fetches credit data, and updates display
            async init() {
                if (this.spinner) this.spinner.style.display = "block";
                if (this.balanceElement) this.balanceElement.style.display = "none";
                // Clear designer sample rows; hide history title/table until we know there are rows
                if (this.tableElement) this.tableElement.innerHTML = "";
                if (this.transactionsTitle) this.transactionsTitle.style.display = "none";
                if (this.transactionsBanner) this.transactionsBanner.style.display = "none";
                if (this.noRecordDiv) this.noRecordDiv.style.display = "none";
                try {
                    const apiData = await this.fetchCreditData();
                    // fetchCreditData already applied UI on network failure
                    if (apiData === undefined) return;
                    if (!apiData || !apiData.creditBalance) {
                        // No credit doc yet — still show $0.00 + FAQ, not a blank page
                        if (apiData && apiData.message) {
                            console.warn("No credit balance data found:", apiData.message);
                        }
                        this.applyCreditUi(0, []);
                        return;
                    }
                    const credit = apiData.creditBalance;
                    this.$creditData = credit;
                    this.applyCreditUi(
                        credit.creditBalance,
                        Array.isArray(credit.creditHistory) ? credit.creditHistory : []
                    );
                } catch (error) {
                    console.error("Error during initialization:", error);
                    this.applyCreditUi(0, []);
                }
            }
            // Populates and sorts the transaction history table (caller already cleared the node)
            updateTransactionTable() {
                if (!this.tableElement) {
                    console.error("Transaction table element not found");
                    return;
                }
                if (!this.transactions.length) return;
                // Newest first
                this.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                this.transactions.forEach((transaction) => {
                    const row = document.createElement("div");
                    row.className = "transactions-table-row-grid-wrapper columns-5";
                    row.innerHTML = `
                        <div class="transactions-table-row-text">${new Date(
                        transaction.date
                    ).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                    })}</div>
                        <div class="transaction-type ${transaction.type === "credit"
                            ? "green"
                            : "credit-type"
                        }">
                            <p class="transaction-type-text ${transaction.type === "credit" ? "dark-green" : ""
                        }">${transaction.type != "RemovedAdmin"
                            ? transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)
                            : "Debit"
                        }</p>
                        </div>
                        <div class="transactions-table-row-text">${transaction.sessionName || ""}
                        ${transaction.year || ""}</div>
                        <div class="transactions-table-row-text">${transaction.description || ""}</div>
                        <div class="transactions-table-row-text ${transaction.type === "credit" ? "green-semi-bold" : "red-semi-bold"
                        }">${transaction.type === "credit"
                            ? `+${transaction.amount}`
                            : `-${Math.abs(transaction.amount)}`
                        }</div>
                    `;
                    this.tableElement.appendChild(row);
                });
            }
        }

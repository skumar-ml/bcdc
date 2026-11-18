/*

Purpose: Manages and displays member credit balance and transaction history. Shows credit balance amount and lists all credit transactions with dates and descriptions.

Brief Logic: Fetches credit balance data from API, displays current balance amount, renders transaction history table sorted by date in descending order, and handles empty state when no credits are available. Hides the whole transactions banner (not just the row wrapper) when there is no history — Webflow keeps headers outside [data-credit="table"].

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
                // Whole white banner — headers live outside [data-credit="table"] in Webflow
                this.transactionsBanner =
                    (this.tableElement && this.tableElement.closest(".portal-white-banner.transactions")) ||
                    document.querySelector(".portal-white-banner.transactions");
                // .credit-balance-rounded-div, .transactions
                this.portalInfoWrapper = document.querySelector('.portal-info-wrapper');
                // data-millions="no-record-div"
                this.noRecordDiv = document.querySelector('[data-container="no-record-found"]');
                // Check if elements are found
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
                    this.showEmptyState();
                    console.error("Fetch error:", error);
                }
            }
            // Hide balance + transactions; show the shared empty placeholder
            showEmptyState() {
                if (this.spinner) this.spinner.style.display = "none";
                if (this.balanceElement) this.balanceElement.style.display = "none";
                if (this.tableElement) {
                    this.tableElement.innerHTML = "";
                    this.tableElement.style.display = "none";
                }
                // Banner includes Date/Type/Session headers — must hide with the rows
                if (this.transactionsBanner) this.transactionsBanner.style.display = "none";
                if (this.portalInfoWrapper) this.portalInfoWrapper.style.display = "none";
                if (this.noRecordDiv) this.noRecordDiv.style.display = "block";
            }
            // Show balance; only show the transactions banner when there are rows
            showCreditState(hasHistory) {
                if (this.spinner) this.spinner.style.display = "none";
                if (this.balanceElement) this.balanceElement.style.display = "block";
                if (this.portalInfoWrapper) this.portalInfoWrapper.style.display = "block";
                if (this.noRecordDiv) this.noRecordDiv.style.display = "none";
                if (this.transactionsBanner) {
                    this.transactionsBanner.style.display = hasHistory ? "" : "none";
                }
                if (this.tableElement) {
                    this.tableElement.style.display = hasHistory ? "block" : "none";
                }
            }
            // Initializes the UI, fetches credit data, and updates display
            async init() {
                if (this.spinner) this.spinner.style.display = "block";
                if (this.balanceElement) this.balanceElement.style.display = "none";
                if (this.tableElement) {
                    // Drop any Webflow designer sample rows before the API returns
                    this.tableElement.innerHTML = "";
                    this.tableElement.style.display = "none";
                }
                if (this.transactionsBanner) this.transactionsBanner.style.display = "none";
                if (this.portalInfoWrapper) this.portalInfoWrapper.style.display = "none";
                if (this.noRecordDiv) this.noRecordDiv.style.display = "none";
                try {
                    const apiData = await this.fetchCreditData();
                    if (!apiData || !apiData.creditBalance) {
                        // Backend returns 200 with a "message" key (instead of an error status)
                        // when there's no credit balance for this member.
                        if (apiData && apiData.message) {
                            console.warn("No credit balance data found:", apiData.message);
                        } else {
                            console.error("No credit balance data found");
                        }
                        this.showEmptyState();
                        return;
                    }
                    this.$creditData = apiData.creditBalance;
                    this.balance = Number(this.$creditData.creditBalance) || 0;
                    // Always an array so empty history does not keep designer HTML
                    this.transactions = Array.isArray(this.$creditData.creditHistory)
                        ? this.$creditData.creditHistory
                        : [];
                    this.updateCreditBalanceDisplay();
                    this.showCreditState(this.transactions.length > 0);
                    } catch (error) {
                    console.error("Error during initialization:", error);
                    this.showEmptyState();
                    return;
                }
            }
            // Updates the displayed credit balance amount
            updateCreditBalanceDisplay() {
                if (this.balanceElement) {
                    this.balanceElement.textContent = `$${this.balance.toFixed(2)}`;
                } else {
                    console.error("Balance element not found");
                }
                this.updateTransactionTable();
            }
            // Populates and sorts the transaction history table
            updateTransactionTable() {
                if (!this.tableElement) {
                    console.error("Transaction table element not found");
                    return;
                }
                this.tableElement.innerHTML = ""; // Clear existing content
                if (!this.transactions.length) return;
                // sort by date in descending order
                this.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                // Populate the table with transactions
                this.transactions.forEach((transaction) => {
                    const row = document.createElement("div");
                    row.className = "transactions-table-row-grid-wrapper columns-5";
                    //date format should be like Jul 6, 2025
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

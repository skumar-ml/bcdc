class CreditBalance {
            $creditData = {};
            constructor(data) {
                this.data = data;
                this.balance = 0.0; // Initial balance
                this.transactions = [];
                this.spinner = document.getElementById("half-circle-spinner");
                this.balanceElement = document.querySelector('[data-credit="balance"]');
                this.tableElement = document.querySelector('[data-credit="table"]');
                // .credit-balance-rounded-div, .transactions
                this.balanceRoundedDiv = document.querySelector('.credit-balance-rounded-div');
                this.transactionsElement = document.querySelector('.transactions');
                // data-millions="no-record-div"
                this.noRecordDiv = document.querySelector('[data-container="no-record-found"]');
                // Check if elements are found
                this.init();
            }
            async fetchCreditData() {
                try {
                    const response = await fetch(
                        `${this.data.apiBaseURL}getCreditBalance/${this.data.memberId}`
                    );
                    if (!response.ok) throw new Error("Network response was not ok");
                    const apiData = await response.json();
                    return apiData;
                } catch (error) {
                    this.noRecordDiv.style.display = "block";
                    this.spinner.style.display = "none"; // Hide spinner on error
                    console.error("Fetch error:", error);
                }
            }
            async init() {
                this.spinner.style.display = "block"; // Show spinner
                this.balanceElement.style.display = "none"; // Hide balance element initially
                this.tableElement.style.display = "none"; // Hide table element initially
                this.balanceRoundedDiv.style.display = "none"; // Hide rounded div initially
                this.transactionsElement.style.display = "none"; // Hide transactions element initially
                this.noRecordDiv.style.display = "none"; // Hide no record div initially
                try {
                    const apiData = await this.fetchCreditData();
                    if (!apiData) {
                        
                        this.noRecordDiv.style.display = "block"; // Show no record div
                        return;
                        console.error("No credit balance data found");
                    }
                this.$creditData = apiData.creditBalance;
                    } catch (error) {
                    console.error("Error during initialization:", error);
                    this.spinner.style.display = "none"; // Hide spinner on error
                    this.noRecordDiv.style.display = "block"; // Show no record div on error
                    return;
                }
                // After fetching data, hide spinner and show elements
                this.spinner.style.display = "none"; // Hide spinner
                this.balanceElement.style.display = "block"; // Show balance element
                this.tableElement.style.display = "block"; // Show table element
                this.balanceRoundedDiv.style.display = "block"; // Show rounded div
                this.transactionsElement.style.display = "block"; // Show transactions element
                this.noRecordDiv.style.display = "none"; // Hide no record div
                
                this.$creditData = apiData.creditBalance;
                if (apiData) {
                    this.balance = this.$creditData.creditBalance;
                    this.transactions = this.$creditData.creditHistory;
                    this.updateCreditBalanceDisplay();
                }
            }
            updateCreditBalanceDisplay() {
                if (this.balanceElement) {
                    this.balanceElement.textContent = `$${this.balance.toFixed(2)}`;
                } else {
                    console.error("Balance element not found");
                }
                this.updateTransactionTable();
            }
            updateTransactionTable() {
                if (!this.tableElement) {
                    console.error("Transaction table element not found");
                    return;
                }
                this.tableElement.innerHTML = ""; // Clear existing content
                // sort by date in descending order
                this.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                // Populate the table with transactions
                // sessionName should not be empty
                this.transactions = this.transactions.filter(
                    (transaction) =>
                        transaction.sessionName && transaction.sessionName.trim() !== ""
                );
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
                        <div class="transactions-table-row-text">${transaction.sessionName
                        } ${transaction.year}</div>
                        <div class="transactions-table-row-text">${transaction.description
                        }</div>
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
        

class CreditBalance {
  $creditData = {};
  constructor(data) {
    this.data = data;
    this.balance = 1250.0; // Initial balance
    this.transactions = [];
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
      console.error("Fetch error:", error);
    }
  }
  async init() {
    const apiData = await this.fetchCreditData();
    this.$creditData = apiData.creditBalance;
    if (apiData) {
      this.balance = this.$creditData.creditBalance;
      this.transactions = this.$creditData.creditHistory;
      this.updateCreditBalanceDisplay();
    }
  }
  updateCreditBalanceDisplay() {
    const balanceElement = document.querySelector('[data-credit="balance"]');
    if (balanceElement) {
      balanceElement.textContent = `$${this.balance.toFixed(2)}`;
    } else {
      console.error("Balance element not found");
    }
    this.updateTransactionTable();
  }
  updateTransactionTable() {
    const tableElement = document.querySelector('[data-credit="table"]');
    if (!tableElement) {
      console.error("Transaction table element not found");
      return;
    }
    tableElement.innerHTML = ""; // Clear existing content
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
                        <div class="transaction-type ${
                          transaction.type === "credit"
                            ? "green"
                            : "credit-type"
                        }">
                            <p class="transaction-type-text ${
                              transaction.type === "credit" ? "dark-green" : ""
                            }">${
        transaction.type != "RemovedAdmin"
          ? transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)
          : "Debit"
      }</p>
                        </div>
                        <div class="transactions-table-row-text">${
                          transaction.sessionName
                        } ${transaction.year}</div>
                        <div class="transactions-table-row-text">${
                          transaction.description
                        }</div>
                        <div class="transactions-table-row-text ${
                          transaction.type === "credit" ? "green-semi-bold" : ""
                        }">${
        transaction.type === "credit"
          ? `+${transaction.amount}`
          : `-${Math.abs(transaction.amount)}`
      }</div>
                    `;
      tableElement.appendChild(row);
    });
  }
}

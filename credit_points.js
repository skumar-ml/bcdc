class CreditBalance {
  $creditData = {};
  constructor(data) {
    this.spinner = document.getElementById("half-circle-spinner");
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
      // dummy data for testing
      // {"creditBalance":{"createdOn":"2024-09-13 03:04:05.827000","creditBalance":0,"creditHistory":[{"amount":5,"date":"2024-09-13 03:04:05.827000","description":"Added new credit","sessionName":"Spring/Winter","type":"credit","year":2024},{"amount":1,"date":"2024-09-13 03:06:40.445000","description":"Updated credit","sessionName":"Spring/Winter","type":"credit","year":2024},{"amount":-3,"date":"2024-09-13 03:07:52.640000","description":"Remvoed Credit","sessionName":"Spring/Winter","type":"RemovedAdmin","year":2024},{"amount":3,"date":"2024-09-13 03:09:26.657000","description":"Updated from view page","sessionName":"Spring/Winter","type":"credit","year":2024},{"amount":-1,"date":"2024-09-13 03:09:54.807000","description":"Removed from view page","sessionName":"Spring/Winter","type":"RemovedAdmin","year":2024},{"amount":1.0,"date":"2024-09-13 03:11:03.927000","description":"used in invoice payment","sessionName":"","type":"debit","year":2024},{"amount":1,"date":"2024-09-13 07:42:51.349000","description":"removed default filter","sessionName":"","type":"credit","year":2024},{"amount":1,"date":"2024-09-13 07:44:20.263000","description":"Testted view page","sessionName":"","type":"credit","year":2024},{"amount":12,"date":"2024-09-13 10:10:35.024000","description":"adding 12","sessionName":"Spring/Winter","type":"credit","year":2024},{"amount":2,"date":"2024-09-13 10:12:46.755000","description":"adding 2 more","sessionName":"Spring/Winter","type":"credit","year":2024},{"amount":-2,"date":"2024-09-13 10:13:40.463000","description":"minus value 2","sessionName":"Spring/Winter","type":"RemovedAdmin","year":2024},{"amount":-8,"date":"2024-09-13 10:15:23.621000","description":"","sessionName":"Spring/Winter","type":"RemovedAdmin","year":2024},{"amount":5,"date":"2024-09-13 10:19:57.675000","description":"5 adding","sessionName":"","type":"credit","year":2024},{"amount":-5,"date":"2024-09-13 10:20:16.299000","description":"","sessionName":"","type":"RemovedAdmin","year":2024},{"amount":-1.0,"date":"2024-09-13 10:41:47.032000","description":"used in invoice payment","sessionName":"","type":"debit","year":2024},{"amount":1,"date":"2024-09-17 12:26:34.071000","description":"","sessionName":"","type":"credit","year":2024},{"amount":-10,"date":"2024-09-17 12:29:29.184000","description":"minus 10","sessionName":"","type":"RemovedAdmin","year":2024},{"amount":-6,"date":"2024-09-17 12:33:17.130000","description":"","sessionName":"","type":"RemovedAdmin","year":2024},{"amount":10,"date":"2024-09-18 06:56:39.153000","description":"","sessionName":"","type":"credit","year":2024},{"amount":-1.0,"date":"2024-09-18 07:11:11.996000","description":"used in invoice payment","sessionName":"","type":"debit","year":2024},{"amount":3191,"date":"2024-09-27 09:04:35.850000","description":"added","sessionName":"Spring/Winter","type":"credit","year":2024},{"amount":-3089.91,"date":"2024-09-27 09:08:08.537000","description":"used in invoice payment","sessionName":"","type":"debit","year":2024}],"email":"drishti.sharma@techment.com","memberId":"6482b3da118b050002290142","name":"Drishti Sharma","updatedOn":"2024-09-27 09:08:08.537000"}}}
      const apiData = await response.json();
      return apiData;
    } catch (error) {
      console.error("Fetch error:", error);
    }
  }
  async init() {
    // [data-credit="balance"] and [data-credit="table"]' hide and show
    const balanceElement = document.querySelector('[data-credit="balance"]');
    const tableElement = document.querySelector('[data-credit="table"]');
    if (balanceElement) balanceElement.style.display = "none";
    if (tableElement) tableElement.style.display = "none";
    this.spinner.style.display = "block";
    const apiData = await this.fetchCreditData();
    this.spinner.style.display = "none";
    if (balanceElement) balanceElement.style.display = "block";
    if (tableElement) tableElement.style.display = "grid";
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
        transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)
      }</p>
                        </div>
                        <div class="transactions-table-row-text">${
                          transaction.sessionName
                        } ${transaction.year}</div>
                        <div class="transactions-table-row-text">${
                          transaction.description
                        }</div>
                        <div class="transactions-table-row-text ${
                          transaction.type === "credit"
                            ? "green-semi-bold"
                            : "red-semi-bold"
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

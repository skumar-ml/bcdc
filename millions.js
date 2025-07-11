class MillionsRenderer {
  $millions_transactions = [];
  constructor(data) {
    this.data = data;
    this.renderAll();
  }
  async fetchData() {
    try {
      const response = await fetch(
        `${this.data.apiBaseURL}getMillionsTransactionData/${this.data.memberId}`
      );
      if (!response.ok) throw new Error("Network response was not ok");
      const apiData = await response.json();
      return apiData;
      // You can update this.data here if needed, then re-render
      // Example: this.data = apiData; this.renderAll();
    } catch (error) {
      console.error("Fetch error:", error);
    }
  }
  formatDate(dateStr) {
    const d = new Date(dateStr);
    const options = { year: "numeric", month: "short", day: "numeric" };
    return d.toLocaleDateString("en-US", options);
  }

  renderTab(tabIndex, student) {
    // Current Balance
    const balanceDiv = document.querySelectorAll(".million-price-text")[
      tabIndex
    ];
    if (balanceDiv) {
      balanceDiv.innerHTML = `${student.earnAmount} <span class="million-text-gray">millions</span>`;
    }

    // Transactions
    const tabPane = document.querySelectorAll(".w-tab-pane")[tabIndex];
    if (!tabPane) return;
    const transactionsDiv = tabPane.querySelector(
      ".transactions-table-div > div:last-child"
    );
    if (!transactionsDiv) return;
    transactionsDiv.innerHTML = "";

    student.transactions.forEach((tx) => {
      const row = document.createElement("div");
      row.className = "transactions-table-row-grid-wrapper";

      // Name
      const nameDiv = document.createElement("div");
      nameDiv.className = "transactions-table-row-text";
      nameDiv.textContent = student.studentName;
      row.appendChild(nameDiv);

      // Date
      const dateDiv = document.createElement("div");
      dateDiv.className = "transactions-table-row-text";
      dateDiv.textContent = this.formatDate(tx.lastEarnDate);
      row.appendChild(dateDiv);

      // Type
      const typeDiv = document.createElement("div");
      typeDiv.className = "transactions-table-row-text";
      typeDiv.innerHTML = tx.amount >= 0 ? "Reward<br>" : "Purchase<br>";
      row.appendChild(typeDiv);

      // Description
      const descDiv = document.createElement("div");
      descDiv.className = "transactions-table-row-text";
      descDiv.textContent = tx.description || "-";
      row.appendChild(descDiv);

      // Amount
      const amtDiv = document.createElement("div");
      amtDiv.className =
        "transactions-table-row-text " +
        (tx.amount >= 0 ? "green-semi-bold" : "red-semi-bold");
      amtDiv.textContent = (tx.amount >= 0 ? "+" : "-") + Math.abs(tx.amount);
      row.appendChild(amtDiv);

      transactionsDiv.appendChild(row);
    });
  }

  async renderAll() {
    const portalTab = document.querySelector(".portal-tab");
    if (portalTab) portalTab.style.display = "none";
    const apiData = await this.fetchData();
    if (portalTab) portalTab.style.display = "block";
    apiData.millions_transactions.forEach((student, idx) =>
      this.renderTab(idx, student)
    );
  }
}

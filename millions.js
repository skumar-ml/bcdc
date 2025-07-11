class MillionsRenderer {
  constructor(data) {
    this.data = data;
    this.spinner = document.getElementById("half-circle-spinner");
    this.init();
  }

  async fetchData() {
    try {
      const response = await fetch(
        `${this.data.apiBaseURL}getMillionsTransactionData/${this.data.memberId}`
      );
      if (!response.ok) throw new Error("Network response was not ok");
      const apiData = await response.json();
      return apiData;
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

  renderTabMenu(students) {
    const tabMenu = document.querySelector(".portal-tab-menus");
    if (!tabMenu) return;
    tabMenu.innerHTML = "";
    students.forEach((student, idx) => {
      const a = document.createElement("a");
      a.setAttribute("data-w-tab", `Tab ${idx + 1}`);
      a.className =
        "portal-tab-link w-inline-block w-tab-link" +
        (idx === 0 ? " w--current" : "");
      a.id = `w-tabs-0-data-w-tab-${idx}`;
      a.href = `#w-tabs-0-data-w-pane-${idx}`;
      a.setAttribute("role", "tab");
      a.setAttribute("aria-controls", `w-tabs-0-data-w-pane-${idx}`);
      a.setAttribute("aria-selected", idx === 0 ? "true" : "false");
      if (idx !== 0) a.setAttribute("tabindex", "-1");
      const div = document.createElement("div");
      div.className = "poppins-para portal-tab-text-semibold";
      div.textContent = student.studentName;
      a.appendChild(div);
      tabMenu.appendChild(a);
    });
  }

  renderTabContent(students) {
    const tabContent = document.querySelector(".portal-tab-content");
    if (!tabContent) return;
    tabContent.innerHTML = "";
    students.forEach((student, idx) => {
      const tabPane = document.createElement("div");
      tabPane.setAttribute("data-w-tab", `Tab ${idx + 1}`);
      tabPane.className = "w-tab-pane" + (idx === 0 ? " w--tab-active" : "");
      tabPane.id = `w-tabs-0-data-w-pane-${idx}`;
      tabPane.setAttribute("role", "tabpanel");
      tabPane.setAttribute("aria-labelledby", `w-tabs-0-data-w-tab-${idx}`);
      tabPane.style.opacity = idx === 0 ? "1" : "";
      tabPane.style.transition = idx === 0 ? "all, opacity 300ms" : "";

      // Current Balance
      const balanceBanner = document.createElement("div");
      balanceBanner.className = "portal-white-banner margin-bottom-20";
      balanceBanner.innerHTML = `
                        <div>
                            <p class="portal-node-title">Current Balance</p>
                            <div class="portal-flex-wrapper">
                                <div class="million-price-text">${student.earnAmount} <span class="million-text-gray">millions</span></div>
                            </div>
                        </div>
                        <a href="#" data-upsell="buy-now" add-to-cart="normal" class="main-button white-bold-rounded w-button">View Store</a>
                    `;
      tabPane.appendChild(balanceBanner);

      // Transactions
      const transactionsBanner = document.createElement("div");
      transactionsBanner.className = "portal-white-banner transactions";
      transactionsBanner.innerHTML = `
                        <p class="portal-node-title transactions">Transactions</p>
                        <div class="transactions-table-div">
                            <div class="transactions-header-grid-wrapper">
                                <div class="transaction-header-text">Name</div>
                                <div class="transaction-header-text">Date</div>
                                <div class="transaction-header-text">Type<br></div>
                                <div class="transaction-header-text">Description</div>
                                <div class="transaction-header-text">Amount</div>
                            </div>
                            <div></div>
                        </div>
                    `;
      tabPane.appendChild(transactionsBanner);

      tabContent.appendChild(tabPane);
    });
  }

  setupTabSwitching(students) {
    const tabLinks = document.querySelectorAll(".portal-tab-link");
    const tabPanes = document.querySelectorAll(".w-tab-pane");
    tabLinks.forEach((link, idx) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        tabLinks.forEach((l, i) => {
          l.classList.toggle("w--current", i === idx);
          l.setAttribute("aria-selected", i === idx ? "true" : "false");
          if (i !== idx) l.setAttribute("tabindex", "-1");
          else l.removeAttribute("tabindex");
        });
        tabPanes.forEach((pane, i) => {
          pane.classList.toggle("w--tab-active", i === idx);
          pane.style.opacity = i === idx ? "1" : "";
          pane.style.transition = i === idx ? "all, opacity 300ms" : "";
        });
        this.renderTab(idx, students[idx]);
      });
    });
  }

  async init() {
    this.spinner.style.display = "block";
    const portalTab = document.querySelector(".portal-tab");
    if (portalTab) portalTab.style.display = "none";
    this.spinner.style.display = "none";
    const apiData = await this.fetchData();
    if (!apiData || !apiData.millions_transactions) return;
    if (portalTab) portalTab.style.display = "block";
    this.renderTabMenu(apiData.millions_transactions);
    this.renderTabContent(apiData.millions_transactions);
    apiData.millions_transactions.forEach((student, idx) =>
      this.renderTab(idx, student)
    );
    this.setupTabSwitching(apiData.millions_transactions);
  }
}

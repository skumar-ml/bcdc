 class MillionsRenderer {
            constructor(data) {
                this.data = data;
                this.spinner = document.getElementById("half-circle-spinner");
                this.portalInfoWrapper = document.querySelector('.portal-info-wrapper');
                this.noRecordDiv = document.querySelector('[data-container="no-record-found"]');
                this.init();
                this.fetchAnnouncementData();
            }

            async fetchData() {
                try {
                    const response = await fetch(`${this.data.apiBaseURL}getMillionsTransactionData/${this.data.memberId}`);
                    if (!response.ok) {
                      this.portalInfoWrapper.style.display = 'none'; // Hide portal info wrapper initially
                      this.spinner.style.display = 'none';
                      this.noRecordDiv.style.display = 'block'; // Hide no record div initially
                     return []
                    };
                    
                    const apiData = await response.json();
                    return apiData;
                } catch (error) {
                    this.portalInfoWrapper.style.display = 'none'; // Hide portal info wrapper initially
                    this.spinner.style.display = 'none';
                    this.noRecordDiv.style.display = 'none'; // Hide no record div initially
                    console.error('Fetch error:', error);
                }
            }
            async fetchAnnouncementData() {
                try {
                    const response = await fetch(`${this.data.apiBaseURL}getAnnouncement/${this.data.memberId}`);
                    if (!response.ok) {
                      this.portalInfoWrapper.style.display = 'none'; // Hide portal info wrapper initially
                      this.noRecordDiv.style.display = 'block'; // Hide no record div initially
                     return []
                    };

                    const apiData = await response.json();
                    this.updateAnnouncement(apiData);
                    return apiData;
                } catch (error) {
                     this.portalInfoWrapper.style.display = 'none'; // Hide portal info wrapper initially
                    this.noRecordDiv.style.display = 'none'; // Hide no record div initially
                    console.error('Fetch error:', error);
                }
            }

            formatDate(dateStr) {
                const d = new Date(dateStr);
                const options = { year: 'numeric', month: 'short', day: 'numeric' };
                return d.toLocaleDateString('en-US', options);
            }

            updateSideBarAmount(earnAmount){
                const sidebarCountDiv = document.querySelectorAll('[data-millions="sidebarCount"]');
                sidebarCountDiv.forEach(div => {
                    div.parentElement.classList.remove('hide');
                    div.textContent = this.numberWithCommas(earnAmount) + 'M';
                    div.parentElement.style.display = 'block';
                });
            }

            updateAnnouncement(announcementData) {
                const announcementLength = announcementData.announcement.filter(ann => !ann.is_read).length;
                const announcementDiv = document.querySelectorAll('[data-announcements="counts"]');
                if (announcementDiv) {
                    announcementDiv.forEach(div => {
                        div.textContent = announcementLength;
                        div.parentElement.style.display = 'block';
                    });
                }
            }

            renderTab(tabIndex, student, link="") {
                // Current Balance
                const balanceDiv = document.querySelectorAll('.million-price-text')[tabIndex];
                if (balanceDiv) {
                    balanceDiv.innerHTML = `${this.numberWithCommas(student.earnAmount)} <span class="million-text-gray">millions</span>`;
                }
                if(link){
                    link.setAttribute("data-millions-amount", student.earnAmount);
                    this.updateSideBarAmount(this.numberWithCommas(student.earnAmount))
                }
                if (tabIndex == 0) {
                    this.updateSideBarAmount(this.numberWithCommas(student.earnAmount))
                }

                // Transactions
                const tabPane = document.querySelectorAll('.w-tab-pane')[tabIndex];
                if (!tabPane) return;
                const transactionsDiv = tabPane.querySelector('.transactions-table-div > div:last-child');
                if (!transactionsDiv) return;
                transactionsDiv.innerHTML = '';
                student.transactions.sort((a, b) => new Date(b.lastEarnDate) - new Date(a.lastEarnDate));
                student.transactions.forEach(tx => {
                    const row = document.createElement('div');
                    row.className = 'transactions-table-row-grid-wrapper';

                    

                    // Date
                    const dateDiv = document.createElement('div');
                    dateDiv.className = 'transactions-table-row-text';
                    dateDiv.textContent = this.formatDate(tx.lastEarnDate);
                    row.appendChild(dateDiv);

                    // Type
                    // const typeDiv = document.createElement('div');
                    // typeDiv.className = 'transactions-table-row-text';
                    // typeDiv.innerHTML = tx.amount >= 0 ? 'Reward<br>' : 'Purchase<br>';
                    // row.appendChild(typeDiv);

                    // Description
                    const descDiv = document.createElement('div');
                    descDiv.className = 'transactions-table-row-text';
                    descDiv.textContent = tx.description || '-';
                    row.appendChild(descDiv);

                    // Amount
                    const amtDiv = document.createElement('div');
                    amtDiv.className = 'transactions-table-row-text ' + (tx.amount >= 0 ? 'green-semi-bold' : 'red-semi-bold');
                    amtDiv.textContent = (tx.amount >= 0 ? '+' : '-') + this.numberWithCommas(Math.abs(tx.amount));
                    row.appendChild(amtDiv);

                    transactionsDiv.appendChild(row);
                });
            }

            renderTabMenu(students) {
                const tabMenu = document.querySelector('.portal-tab-menus');
                if (!tabMenu) return;
                tabMenu.innerHTML = '';
                students.forEach((student, idx) => {
                    const a = document.createElement('a');
                    a.setAttribute('data-w-tab', `Tab ${idx + 1}`);
                    a.className = 'portal-tab-link w-inline-block w-tab-link' + (idx === 0 ? ' w--current' : '');
                    a.id = `w-tabs-0-data-w-tab-${idx}`;
                    a.href = `#w-tabs-0-data-w-pane-${idx}`;
                    a.setAttribute('role', 'tab');
                    a.setAttribute('aria-controls', `w-tabs-0-data-w-pane-${idx}`);
                    a.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
                    if (idx !== 0) a.setAttribute('tabindex', '-1');
                    const div = document.createElement('div');
                    div.className = 'poppins-para portal-tab-text-semibold';
                    div.textContent = student.studentName;
                    a.appendChild(div);
                    tabMenu.appendChild(a);
                });
            }

            renderTabContent(students) {
                const tabContent = document.querySelector('.portal-tab-content');
                if (!tabContent) return;
                tabContent.innerHTML = '';
                students.forEach((student, idx) => {
                    const tabPane = document.createElement('div');
                    tabPane.setAttribute('data-w-tab', `Tab ${idx + 1}`);
                    tabPane.className = 'w-tab-pane' + (idx === 0 ? ' w--tab-active' : '');
                    tabPane.id = `w-tabs-0-data-w-pane-${idx}`;
                    tabPane.setAttribute('role', 'tabpanel');
                    tabPane.setAttribute('aria-labelledby', `w-tabs-0-data-w-tab-${idx}`);
                    tabPane.style.opacity = idx === 0 ? '1' : '';
                    tabPane.style.transition = idx === 0 ? 'all, opacity 300ms' : '';

                    // Current Balance
                    const balanceBanner = document.createElement('div');
                    balanceBanner.className = 'portal-white-banner margin-bottom-20';
                    balanceBanner.innerHTML = `
                        <div>
                            <p class="portal-node-title">Current Balance</p>
                            <div class="portal-flex-wrapper">
                                <div class="million-price-text">${this.numberWithCommas(student.earnAmount)} <span class="million-text-gray">millions</span></div>
                            </div>
                        </div>
                        <a href="https://www.bergendebate.com/reward-store" data-upsell="buy-now" add-to-cart="normal" class="main-button white-bold-rounded w-button">View Store</a>
                    `;
                    tabPane.appendChild(balanceBanner);

                    // Transactions
                    const transactionsBanner = document.createElement('div');
                    transactionsBanner.className = 'portal-white-banner transactions';
                    transactionsBanner.innerHTML = `
                        <p class="portal-node-title transactions">Transactions</p>
                        <div class="transactions-table-div">
                            <div class="transactions-header-grid-wrapper">
                                <div class="transaction-header-text">Date</div>
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
                
                const tabLinks = document.querySelectorAll('.portal-tab-link');
                const tabPanes = document.querySelectorAll('.w-tab-pane');
                tabLinks.forEach((link, idx) => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        tabLinks.forEach((l, i) => {
                            l.classList.toggle('w--current', i === idx);
                            l.setAttribute('aria-selected', i === idx ? 'true' : 'false');
                            if (i !== idx) l.setAttribute('tabindex', '-1');
                            else l.removeAttribute('tabindex');
                        });
                        tabPanes.forEach((pane, i) => {
                            pane.classList.toggle('w--tab-active', i === idx);
                            pane.style.opacity = i === idx ? '1' : '';
                            pane.style.transition = i === idx ? 'all, opacity 300ms' : '';
                        });
                        this.renderTab(idx, students[idx], link);
                    });
                });
            }

            async init() {
                this.spinner.style.display = "block";
                const portalTab = document.querySelector('.portal-tab');
                if (portalTab) portalTab.style.display = 'none';
                this.portalInfoWrapper.style.display = 'none'; // Hide portal info wrapper initially
                this.noRecordDiv.style.display = 'none'; // Hide no record div initially
                const apiData = await this.fetchData();
                if (!apiData || !apiData.millions_transactions) return;
                if(apiData.millions_transactions.length == 0){
                    this.noRecordDiv.style.display = 'block';
                    this.portalInfoWrapper.style.display = 'none';
                    this.spinner.style.display = "none"; // Hide spinner
                    return;
                }
                if (portalTab) portalTab.style.display = 'block';
                this.portalInfoWrapper.style.display = 'block';
                this.spinner.style.display = "none";
                this.renderTabMenu(apiData.millions_transactions);
                this.renderTabContent(apiData.millions_transactions);
                apiData.millions_transactions.forEach((student, idx) => this.renderTab(idx, student));
                this.setupTabSwitching(apiData.millions_transactions);
            }
            numberWithCommas(x) {
                return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            }
        }
        

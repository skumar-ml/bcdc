class RewardStore {
            $millions_transactions = []
            $items = [];
            constructor(data) {
                this.data = data;
                this.spinner = document.getElementById("half-circle-spinner");
                // .credit-balance-rounded-div, .transactions
                this.portalInfoWrapper = document.querySelector('.portal-info-wrapper');
                // data-millions="no-record-div"
                this.noRecordDiv = document.querySelector('[data-container="no-record-found"]');
                this.init()

            }
            async init() {
                this.spinner.style.display = "block";
                const millionsTab = document.querySelector('[data-rewards="millions"]');
                const itemsContainer = document.querySelector('[data-rewards="items"]');
                if (millionsTab) millionsTab.style.display = 'none';
                if (itemsContainer) itemsContainer.style.display = 'none';
                const apiData = await this.fetchData();
                this.$millions_transactions = apiData.millions_transactions;
                this.$items = apiData.items;
                this.spinner.style.display = "none";
                if (millionsTab) millionsTab.style.display = 'block';
                if (itemsContainer) itemsContainer.style.display = 'grid';
                //this.renderTabs()
                this.renderItems()
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
                     this.noRecordDiv.style.display = 'block'; // Hide no record div initially
                    console.error('Fetch error:', error);
                }
            }
            formatMillions(amount) {
                return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            }

            buildTabs() {
                let tabMenu = '';
                let tabContent = '';
                this.$millions_transactions.forEach((student, idx) => {
                    const isActive = idx === 0 ? 'w--current' : '';
                    const isPaneActive = idx === 0 ? 'w--tab-active' : '';
                    const ariaSelected = idx === 0 ? 'true' : 'false';
                    const tabIndex = idx === 0 ? '' : 'tabindex="-1"';
                    tabMenu += `
                            <a data-w-tab="Tab ${idx + 1}" class="portal-tab-link w-inline-block w-tab-link ${isActive}" id="w-tabs-0-data-w-tab-${idx}" href="#w-tabs-0-data-w-pane-${idx}" role="tab" aria-controls="w-tabs-0-data-w-pane-${idx}" aria-selected="${ariaSelected}" ${tabIndex}>
                                <div class="poppins-para portal-tab-text-semibold">${student.studentName}</div>
                            </a>
                        `;
                    tabContent += `
                            <div data-w-tab="Tab ${idx + 1}" class="portal-tab-pane no-padding w-tab-pane ${isPaneActive}" id="w-tabs-0-data-w-pane-${idx}" role="tabpanel" aria-labelledby="w-tabs-0-data-w-tab-${idx}" style="${isPaneActive ? 'opacity: 1; transition: all, opacity 0.3s, opacity 300ms;' : ''}">
                                <div class="portal-flex-wrapper reward">
                                    <div class="million-price-text reward-balance">
                                        <span class="reward-balance-text">Your Balance:</span> ${this.formatMillions(student.earnAmount)}M
                                    </div>
                                </div>
                            </div>
                        `;
                });
                return `
                        <div data-current="Tab 1" data-easing="ease" data-duration-in="300" data-duration-out="100" class="portal-tab w-tabs">
                            <div class="portal-tab-menus w-tab-menu" role="tablist">
                                ${tabMenu}
                            </div>
                            <div class="portal-tab-content w-tab-content">
                                ${tabContent}
                            </div>
                        </div>
                    `;
            }

            renderTabs() {
                const tabsHtml = this.buildTabs();
                const container = document.querySelector('[data-rewards="millions"');
                if (!container) return;
                const oldTab = container.querySelector('.portal-tab.w-tabs');
                if (oldTab) oldTab.remove();
                container.insertAdjacentHTML('afterbegin', tabsHtml);

                // Tab switching logic
                const tabLinks = container.querySelectorAll('.portal-tab-link');
                const tabPanes = container.querySelectorAll('.portal-tab-pane');
                tabLinks.forEach((link, idx) => {
                    link.addEventListener('click', function (e) {
                        e.preventDefault();
                        tabLinks.forEach((l, i) => {
                            l.classList.toggle('w--current', i === idx);
                            l.setAttribute('aria-selected', i === idx ? 'true' : 'false');
                        });
                        tabPanes.forEach((pane, i) => {
                            pane.classList.toggle('w--tab-active', i === idx);
                            pane.style.opacity = i === idx ? '1' : '';
                        });
                    });
                });
            }
            renderItems() {
                const container = document.querySelector('[data-rewards="items"]');
                if (!container) return;
                container.innerHTML = '';
                this.$items.forEach(item => {
                    const imageUrl = item.imageUrl && item.imageUrl.trim() !== ''
                        ? item.imageUrl
                        : 'https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/6874f05a6a3c8b52a411757b_Frame%20427320224%20(7).png';
                    const itemHtml = `
                            <div class="portal-white-banner-reward">
                                <img loading="lazy" src="${imageUrl}" alt="" class="reward-card-image">
                                <div class="reward-card-info">
                                    <p class="dm-sans reward">${item.itemName || ''}</p>
                                    <p class="poppins-para">${item.description || ''}</p>
                                    <div class="reward-cost-wrapper">
                                        <div class="portal-flex-wrapper">
                                            <div class="million-price-text reward">${this.formatMillions(item.amount)} <span class="million-text-gray reward">million</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    container.insertAdjacentHTML('beforeend', itemHtml);
                });
            }
        }

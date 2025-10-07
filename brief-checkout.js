class BriefsCheckout {
            constructor(data) {
                this.modal = document.getElementById("briefs-preview-modal");
                this.iframe = document.getElementById("preview-frame");
                this.closeBtn = document.getElementById("close-preview");
                this.data = data;
                this.selectedBriefs = [];
                this.init();
                this.getBriefs();
                this.addCloseModalHandler();
            }
            addCloseModalHandler() {
                if (this.closeBtn) {
                    this.closeBtn.addEventListener("click", () => {
                        this.modal.style.display = "none";
                        this.iframe.src = "";
                    });
                }
            }
            async fetchData(endpoint, memberId = null) {
                try {
                    let url = `${this.data.apiBaseURL}${endpoint}`;
                    if (memberId) {
                        url = `${this.data.apiBaseURL}${endpoint}/${memberId}`;
                    }

                    const response = await fetch(url);
                    if (!response.ok) throw new Error('Network response was not ok');

                    const apiData = await response.json();
                    return apiData;
                } catch (error) {
                    console.error('Fetch error:', error);
                    return null;
                }
            }

            async getBriefs() {
                this.showLoading();
                try {
                    const response = await this.fetchData('getTopicsDetails');
                    if (response && response.topics) {
                        if (response.topics.length === 0) {
                            this.showError('No briefs are currently available.');
                        } else {
                            this.renderBriefs(response.topics);
                            this.attachPreviewHandlers(response.topics);
                            this.showPayNowButton();
                        }
                    } else {
                        console.error('No briefs data received');
                        this.showError('Unable to load briefs. Please try again later.');
                    }
                } catch (error) {
                    console.error('Error fetching briefs:', error);
                    this.showError('Network error. Please check your connection and try again.');
                }
            }

            renderBriefs(topics) {
                const container = document.querySelector('[data-briefs-checkout="select-briefs"] .briefs-grid-wrapper');
                if (!container) {
                    console.error('Briefs container not found');
                    return;
                }

                // Clear existing content
                container.innerHTML = '';

                // Sort topics by topic_order
                const sortedTopics = topics.sort((a, b) => (a.topic_order || 0) - (b.topic_order || 0));

                // Create brief cards
                sortedTopics.forEach((topic, index) => {
                    const briefCard = this.createBriefCard(topic, index === 0); // First brief is selected by default
                    container.appendChild(briefCard);
                });

                // Update total if there are topics
                if (sortedTopics.length > 0) {
                    this.updateTotal();
                } else {
                    // Update order details even if no topics
                    this.updateOrderDetails();
                }
            }

            showLoading() {
                const container = document.querySelector('[data-briefs-checkout="select-briefs"] .briefs-grid-wrapper');
                if (container) {
                    container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666; grid-column: 1 / 4">
                        <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #d38d97; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <p style="margin-top: 20px;">Loading briefs...</p>
                    </div>
                    <style>
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    </style>
                `;
                }
            }

            createBriefCard(topic, isSelected = false) {
                const card = document.createElement('div');
                card.className = `brief-card ${isSelected ? 'brown-red-border' : ''}`;
                card.dataset.topicId = topic.topicId;

                const fullVersion = topic.full_version || {};
                const lightVersion = topic.light_version || {};

                card.innerHTML = `
                        <div class="brief-flex-wrapper checkout">
                            <div class="briefs-title">${topic.topicName}</div>
                            <a href="#" class="button view-brief w-button" data-topic-id="${topic.topicId}">Preview</a>
                        </div>
                        <p class="dm-sans brief">${topic.headings}</p>
                        <div class="recommended-tag-text">Recommended</div>
                        <div data-briefs-checkout="full-version" class="brief-pricing-info-wrapper ${isSelected ? 'selected-border-red' : 'not-selected-white'}">
                            <div class="brief-pricing-info-flex">
                                <div class="brief-inner-flex">
                                    <label class="no-margin-bottom w-radio">
                                        <input type="radio" data-name="Radio" name="radio-${topic.topicId}" 
                                               class="w-form-formradioinput w-radio-input" value="full" ${isSelected ? 'checked' : ''} />
                                        <span class="hide w-form-label">Radio</span>
                                    </label>
                                    <div class="brief-pricing-title-red">Full Version</div>
                                    <div class="brief-info-wrapper">
                                        <img src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/68d12df293ed238fb7b07265_Info.svg"
                                         loading="lazy" alt="" class="brief-info-icon" />
                                         <div><p class="dm-sans brief-tooltip">${fullVersion.description}</p></div>
                                    </div>
                                </div>
                                <div class="brief-price-medium">$${parseFloat(fullVersion.price || 0).toFixed(2)}</div>
                            </div>
                            <div class="recommended-tag-text">Recommended</div>
                        </div>
                        <div data-briefs-checkout="light-version" class="brief-pricing-info-wrapper not-selected-white">
                            <div class="brief-pricing-info-flex">
                                <div class="brief-inner-flex">
                                    <label class="no-margin-bottom w-radio">
                                        <input type="radio" data-name="Radio" name="radio-${topic.topicId}" 
                                               class="w-form-formradioinput w-radio-input" value="light" />
                                        <span class="hide w-form-label">Radio</span>
                                    </label>
                                    <div class="brief-pricing-title-red">Light Version</div>
                                    <div class="brief-info-wrapper">
                                    <img src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/68d12df293ed238fb7b07265_Info.svg"
                                         loading="lazy" alt="" class="brief-info-icon" />
                                         <div><p class="dm-sans brief-tooltip">${lightVersion.description}</p></div>
                                    </div>
                                </div>
                                <div class="brief-price-medium">$${parseFloat(lightVersion.price || 0).toFixed(2)}</div>
                            </div>
                        </div>
                    `;

                // Add click handlers for version selection
                const fullVersionDiv = card.querySelector('[data-briefs-checkout="full-version"]');
                const lightVersionDiv = card.querySelector('[data-briefs-checkout="light-version"]');
                const fullRadio = card.querySelector('input[value="full"]');
                const lightRadio = card.querySelector('input[value="light"]');

                fullVersionDiv.addEventListener('click', () => {
                    fullRadio.checked = true;
                    this.selectVersion(topic, 'full', card);
                });

                lightVersionDiv.addEventListener('click', () => {
                    lightRadio.checked = true;
                    this.selectVersion(topic, 'light', card);
                });

                // Add to selected briefs if initially selected
                if (isSelected) {
                    this.selectedBriefs.push({
                        topicId: topic.topicId,
                        topicName: topic.topicName,
                        version: 'full',
                        price: fullVersion.price || 0,
                        description: fullVersion.description || topic.headings
                    });
                    // Add brown-red-border class for initially selected briefs
                    card.classList.add('brown-red-border');
                }

                return card;
            }

            selectVersion(topic, version, card) {
                const fullVersionDiv = card.querySelector('[data-briefs-checkout="full-version"]');
                const lightVersionDiv = card.querySelector('[data-briefs-checkout="light-version"]');
                const fullRadio = card.querySelector('input[value="full"]');
                const lightRadio = card.querySelector('input[value="light"]');

                // Check if this brief is already selected with the same version
                const existingIndex = this.selectedBriefs.findIndex(brief => brief.topicId === topic.topicId);
                const isAlreadySelected = existingIndex >= 0 && this.selectedBriefs[existingIndex].version === version;

                if (isAlreadySelected) {
                    // Unselect the brief
                    this.selectedBriefs.splice(existingIndex, 1);
                    
                    // Remove brown-red-border class
                    card.classList.remove('brown-red-border');
                    
                    // Reset visual selection to unselected state
                    fullVersionDiv.className = 'brief-pricing-info-wrapper not-selected-white';
                    lightVersionDiv.className = 'brief-pricing-info-wrapper not-selected-white';
                    
                    // Uncheck radio buttons
                    fullRadio.checked = false;
                    lightRadio.checked = false;
                } else {
                    // Select the brief
                    const versionData = version === 'full' ? topic.full_version : topic.light_version;

                    const briefData = {
                        topicId: topic.topicId,
                        topicName: topic.topicName,
                        version: version,
                        price: versionData.price || 0,
                        description: versionData.description || topic.headings
                    };

                    if (existingIndex >= 0) {
                        // Update existing selection
                        this.selectedBriefs[existingIndex] = briefData;
                    } else {
                        // Add new selection
                        this.selectedBriefs.push(briefData);
                    }

                    // Update visual selection
                    if (version === 'full') {
                        fullVersionDiv.className = 'brief-pricing-info-wrapper selected-border-red';
                        lightVersionDiv.className = 'brief-pricing-info-wrapper not-selected-white';
                    } else {
                        fullVersionDiv.className = 'brief-pricing-info-wrapper not-selected-white';
                        lightVersionDiv.className = 'brief-pricing-info-wrapper selected-border-red';
                    }

                    // Add brown-red-border class to the card when selected
                    card.classList.add('brown-red-border');
                }

                this.updateTotal();
            }

            updateTotal() {
                // Calculate total from selected briefs
                const total = this.selectedBriefs.reduce((sum, brief) => {
                    return sum + (parseFloat(brief.price) || 0);
                }, 0);

                // Update order details sidebar
                this.updateOrderDetails();

                console.log('Selected briefs:', this.selectedBriefs);
                console.log('Total amount:', total);
            }

            showError(message) {
                const container = document.querySelector('[data-briefs-checkout="select-briefs"] .briefs-grid-wrapper');
                if (container) {
                    container.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #666;">
                        <p>${message}</p>
                    </div>
                `;
                }
            }

            showPayNowButton() {
                const payNowButtonDiv = document.querySelector('.button-div.align-end-with-margin-top-0');
                if (payNowButtonDiv) {
                    payNowButtonDiv.classList.remove('hide');
                }
            }

            init() {
                console.log('BriefsCheckout initialized');
                this.setInitialState();
                this.setupPayNowButton();
            }

            setInitialState() {
                // Ensure briefs selection is visible
                const briefsSection = document.querySelector('[data-briefs-checkout="select-briefs"]');
                if (briefsSection) {
                    briefsSection.style.display = 'block';
                }
            }

            setupPayNowButton() {
                const payNowButton = document.querySelector('[data-briefs-checkout="pay-now"]');
                if (payNowButton) {
                    payNowButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.payNow();
                    });
                }
            }

            updateOrderDetails() {
                const emptyOrderDetails = document.querySelector('[data-briefs-checkout="empty-order-details"]');
                const briefsOrderDetails = document.querySelector('[data-briefs-checkout="briefs-order-details"]');

                if (this.selectedBriefs.length === 0) {
                    // Show empty state
                    if (emptyOrderDetails) emptyOrderDetails.style.display = 'block';
                    if (briefsOrderDetails) briefsOrderDetails.style.display = 'none';
                } else {
                    // Show briefs details
                    if (emptyOrderDetails) emptyOrderDetails.style.display = 'none';
                    if (briefsOrderDetails) briefsOrderDetails.style.display = 'block';

                    // Update the briefs list in order details
                    this.updateBriefsListInOrderDetails();
                }
            }

            updateBriefsListInOrderDetails() {
                const briefsContainer = document.querySelector('[data-briefs-checkout="briefs-order-details"] .brief-flex-wrapper');
                if (!briefsContainer) return;

                // Clear existing briefs
                const existingBriefs = briefsContainer.parentElement.querySelectorAll('.brief-flex-wrapper');
                existingBriefs.forEach(brief => {
                    if (brief !== briefsContainer) {
                        brief.remove();
                    }
                });

                // Add selected briefs
                this.selectedBriefs.forEach(brief => {
                    const briefElement = document.createElement('div');
                    briefElement.className = 'brief-flex-wrapper';
                    briefElement.innerHTML = `
                            <p class="dm-sans medium-500">${brief.topicName} (${brief.version === 'full' ? 'Full' : 'Light'})</p>
                            <p class="dm-sans medium-500">$${parseFloat(brief.price).toFixed(2)}</p>
                        `;
                    briefsContainer.parentElement.insertBefore(briefElement, briefsContainer.nextSibling);
                });

                // Update total
                this.updateOrderTotal();
            }

            updateOrderTotal() {
                const totalElement = document.querySelector('[data-briefs-checkout="briefs-order-details"] .total-price-bold');
                if (totalElement) {
                    const total = this.selectedBriefs.reduce((sum, brief) => {
                        return sum + (parseFloat(brief.price) || 0);
                    }, 0);
                    totalElement.textContent = `$${total.toFixed(2)}`;
                }
            }

            validatePaymentData() {
                // Check if member ID is available
                if (!this.data.memberId) {
                    alert('Member ID is required for payment. Please log in again.');
                    return false;
                }

                // Check if account email is available
                if (!this.data.accountEmail) {
                    alert('Account email is required for payment. Please check your account settings.');
                    return false;
                }

                return true;
            }

            attachPreviewHandlers(briefs) {
                document.querySelectorAll(".button.view-brief").forEach((button) => {
                    console.log("Modal:", this.modal);
                    console.log("Iframe:", this.iframe);
                    //console.log("Buttons:", document.querySelectorAll(".button.view-brief"));

                    button.addEventListener("click", async (e) => {
                        e.preventDefault();

                        const topicId = button.dataset.topicId;
                        const brief = briefs.find((b) => b.topicId == topicId);
                        console.log("Selected Brief:", brief);

                        if (!brief) return;

                        const originalText = button.textContent;
                        // show spinner while PDF is loading
                        //this.showLoading();

                        // Determine which PDF to use (full_version preferred)
                        const pdfUrl = brief.full_version?.preview_pdf_url || brief.light_version?.preview_pdf_url;

                        if (pdfUrl) {
                            console.log("Preview URL:", pdfUrl);
                            this.modal.style.display = "flex";
                            this.iframe.src = pdfUrl;

                            this.iframe.onload = () => {
                                button.textContent = originalText;
                                button.disabled = false;
                                //this.hideLoading(); // hide spinner after PDF loads
                            };
                        } else {
                            button.textContent = "Not Available";
                            setTimeout(() => {
                                button.textContent = originalText;
                                button.disabled = false;
                                //this.hideLoading(); // hide spinner after PDF loads
                            }, 2000);
                        }
                    });

                });
            }


            payNow() {
                // Validate that at least one brief is selected
                if (this.selectedBriefs.length === 0) {
                    alert('Please select at least one brief before proceeding to payment.');
                    return;
                }

                // Validate payment data
                if (!this.validatePaymentData()) {
                    return;
                }

                // Show processing state on pay now button
                const payNowButton = document.querySelector('[data-briefs-checkout="pay-now"]');
                if (payNowButton) {
                    payNowButton.innerHTML = "Processing...";
                    payNowButton.style.pointerEvents = "none";
                }

                // Create cancel URL
                const cancelUrl = new URL("https://www.bergendebate.com/" + window.location.pathname);
                if (!cancelUrl.searchParams.has('returnType')) {
                    cancelUrl.searchParams.set('returnType', 'back');
                }
                let localUtmSource = localStorage.getItem("utm_source");

                // Prepare checkout data - only credit card payment
                const checkoutData = {
                    email: this.data.accountEmail || "user@example.com",
                    topics: this.selectedBriefs.map(brief => ({
                        topicId: brief.topicId,
                        version: brief.version === 'full' ? 'full_version' : 'light_version'
                    })),
                    memberId: this.data.memberId,
                    productType: "brief",
                    device: /Mobi|Android/i.test(navigator.userAgent) ? "Mobile" : "Desktop",
                    deviceUserAgent: navigator.userAgent,
                    successUrl: "https://www.bergendebate.com/portal/dashboard?briefsPayment=true",
                    cancelUrl: cancelUrl.href,
                    source: "brief-checkout",
                    utm_source: (localUtmSource != null) ? localUtmSource : "",
                    paymentId: "",
                    has_fee: false,
                    paymentMethod: "credit_card" // Force credit card payment
                };

                console.log('Checkout data:', checkoutData);
                //return;
                // Make API call
                const xhr = new XMLHttpRequest();
                const self = this;
                xhr.open("POST", `${this.data.apiBaseURL}checkoutUrlForUpsellProgram`, true);
                xhr.withCredentials = false;
                xhr.setRequestHeader('Content-Type', 'application/json');

                xhr.onload = function () {
                    try {
                        const responseText = JSON.parse(xhr.responseText);
                        console.log('Payment response:', responseText);

                        if (responseText.success) {
                            self.$checkoutData = responseText;

                            // Only use credit card URL since we're forcing credit card payment
                            if (responseText.cardUrl) {
                                window.location = responseText.cardUrl;
                            } else {
                                alert("Something went wrong. Please try again later.");
                            }
                        } else {
                            alert("Payment processing failed. Please try again.");
                            // Reset button state
                            if (payNowButton) {
                                payNowButton.innerHTML = "Pay Now";
                                payNowButton.style.pointerEvents = "auto";
                            }
                        }
                    } catch (error) {
                        console.error('Error parsing response:', error);
                        alert("An error occurred. Please try again.");
                        // Reset button state
                        if (payNowButton) {
                            payNowButton.innerHTML = "Pay Now";
                            payNowButton.style.pointerEvents = "auto";
                        }
                    }
                };

                xhr.onerror = function () {
                    console.error('Network error occurred');
                    alert("Network error. Please check your connection and try again.");
                    // Reset button state
                    if (payNowButton) {
                        payNowButton.innerHTML = "Pay Now";
                        payNowButton.style.pointerEvents = "auto";
                    }
                };

                xhr.send(JSON.stringify(checkoutData));
            }

            activeBreadCrumb(activeId) {
                let breadCrumbList = document.querySelectorAll('.stepper-container ul li');
                breadCrumbList.forEach(element => element.classList.remove('active'))
                document.getElementById(activeId).classList.add('active')
            }
        }



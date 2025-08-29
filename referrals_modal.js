 class ReferralModal {
            constructor(data) {
                this.data = data;
                this.referredMemberId = null;
                this.referralCode = null;
                this.init();
            }

            init() {
                this.checkEmptyState();
                this.handleModalEvents();
                this.processReferralFlow();
            }

            checkEmptyState() {
                this.formContainer = document.querySelector(".referral-claim-discount-form");
                this.referralForm = document.getElementById("referral-form-modal");
                this.closeModalBtn = document.getElementById('modal-close');
                this.modalBg = document.getElementById('referral-modal-bg');
                this.noThanksBtn = document.getElementById('no-thanks-btn');
                this.submitBtn = document.querySelector('[data-referral="claim-discount"]');
                this.spinner = document.getElementById("half-circle-spinner");
                this.nameEl = this.referralForm.querySelector("[data-name='name']");
                this.emailEl = this.referralForm.querySelector("[data-name='email']");
            }

            handleModalEvents() {
                const $this = this;
                this.closeModalBtn?.addEventListener('click', function () {
                    $this.closeReferralModal();
                });
                this.modalBg?.addEventListener('click', function () {
                    $this.closeReferralModal();
                });
                this.noThanksBtn?.addEventListener('click', function () {
                    $this.closeReferralModal();
                });
                this.submitBtn.addEventListener("click", (e) => this.handleFormSubmit(e));
            }

            // Main referral flow processor
            processReferralFlow() {
                const urlParams = new URLSearchParams(window.location.search);
                const codeParam = urlParams.get('code');
                const idParam = urlParams.get('id');
                
                // Check if user came via referral link
                const hasReferralLink = codeParam && idParam;
                
                // Get existing referral data from localStorage
                const existingReferralData = this.getReferralData();
                
                if (hasReferralLink) {
                    // User came via referral link
                    this.handleReferralLinkVisit(codeParam, idParam, existingReferralData);
                } else {
                    // User came without referral link
                    this.handleNonReferralVisit(existingReferralData);
                }
            }

            // Handle user coming via referral link
            handleReferralLinkVisit(codeParam, idParam, existingReferralData) {
                try {
                    // Decode the base64 encoded parameters
                    const decodedCode = atob(codeParam);
                    const referredMemberId = atob(idParam);
                    
                    this.referredMemberId = referredMemberId;
                    this.referralCode = decodedCode;
                    
                    // Update discount code display
                    this.updateDiscountCodeDisplay(decodedCode);
                    
                    // Fetch and display referrer name
                    this.fetchReferrerDetails(referredMemberId);
                    
                    // Create new referral data
                    const newReferralData = {
                        code: decodedCode,
                        memberId: referredMemberId,
                        timestamp: new Date().toISOString()
                    };
                    
                    if (existingReferralData) {
                        // User has visited before
                        if (existingReferralData.name && existingReferralData.email) {
                            // Case 2: They entered details before - don't show popup, just update timestamp
                            newReferralData.name = existingReferralData.name;
                            newReferralData.email = existingReferralData.email;
                            this.saveReferralData(newReferralData);
                            console.log('User previously submitted form - not showing popup');
                        } else {
                            // Case 1: They didn't enter details before - show popup again
                            this.saveReferralData(newReferralData);
                            this.showReferralModal();
                        }
                    } else {
                        // First time visit via referral link
                        this.saveReferralData(newReferralData);
                        this.showReferralModal();
                    }
                    
                } catch (error) {
                    console.error('Error processing referral link:', error);
                    // Fallback to original parameters if decoding fails
                    this.handleReferralLinkVisitFallback(codeParam, idParam, existingReferralData);
                }
            }

            // Fallback for referral link processing
            handleReferralLinkVisitFallback(codeParam, idParam, existingReferralData) {
                this.referralCode = codeParam;
                this.referredMemberId = idParam;
                
                this.updateDiscountCodeDisplay(codeParam);
                
                const newReferralData = {
                    code: codeParam,
                    memberId: idParam,
                    timestamp: new Date().toISOString()
                };
                
                if (existingReferralData && existingReferralData.name && existingReferralData.email) {
                    newReferralData.name = existingReferralData.name;
                    newReferralData.email = existingReferralData.email;
                    this.saveReferralData(newReferralData);
                } else {
                    this.saveReferralData(newReferralData);
                    this.showReferralModal();
                }
            }

            // Handle user coming without referral link
            handleNonReferralVisit(existingReferralData) {
                if (existingReferralData) {
                    if (existingReferralData.name && existingReferralData.email) {
                        // Case 2: They entered details before - don't show popup
                        console.log('User previously submitted form - not showing popup');
                    } else {
                        // Case 1: They didn't enter details before - show popup based on existing data
                        this.referredMemberId = existingReferralData.memberId;
                        this.referralCode = existingReferralData.code;
                        this.updateDiscountCodeDisplay(existingReferralData.code);
                        this.showReferralModal();
                    }
                }
                // If no existing referral data, do nothing
            }

            // Get referral data from localStorage
            getReferralData() {
                const referralData = localStorage.getItem('referralCode');
                return referralData ? JSON.parse(referralData) : null;
            }

            // Save referral data to localStorage
            saveReferralData(data) {
                localStorage.setItem('referralCode', JSON.stringify(data));
            }

            // Update discount code display
            updateDiscountCodeDisplay(code) {
                const discountCodeElement = document.querySelector('.discount-code-red');
                if (discountCodeElement) {
                    discountCodeElement.textContent = code;
                }
            }

            // Fetch referrer details and update display
            fetchReferrerDetails(memberId) {
                fetch(`${this.data.baseUrl}getMemberDetails/${memberId}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data && data.name) {
                            const referralTextNameEl = document.querySelector('[data-referral="referrer-name"]');
                            if (referralTextNameEl) {
                                referralTextNameEl.innerHTML = data.name;
                            }
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching member details:', error);
                    });
            }

            // Show referral modal
            showReferralModal() {
                const modal = document.getElementById('referral-modal');
                modal.classList.add('show');
                
                // Pre-fill form if user is logged in
                if (this.data.name && this.data.email) {
                    this.nameEl.value = this.data.name;
                    this.emailEl.value = this.data.email;
                }
            }

            // Close referral modal
            closeReferralModal() {
                const modal = document.getElementById('referral-modal');
                modal.classList.remove('show');
            }

            // Handle form submission
            async handleFormSubmit(e) {
                e.preventDefault();
                this.spinner.style.display = "block";

                const name = this.nameEl.value.trim();
                const email = this.emailEl.value.trim();
                
                const formDone = this.formContainer.querySelector(".w-form-done");
                const formFail = this.formContainer.querySelector(".w-form-fail");
                
                if (!name || !email) {
                    formFail.textContent = "Please fill in all fields.";
                    formFail.style.display = "block";
                    this.spinner.style.display = "none";
                    setTimeout(() => (formFail.style.display = "none"), 3000);
                    return;
                }

                // Disable submit button
                if (this.submitBtn) {
                    this.submitBtn.style.pointerEvents = "none";
                }

                try {
                    // Call API to insert referral record
                    const response = await fetch(`${this.data.baseUrl}addReferralData`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                            name, 
                            email, 
                            memberId: this.referredMemberId 
                        }),
                    });
                    
                    const apiResponse = await response.json();
                    
                    if (response.ok) {
                        // Update localStorage with form data
                        const currentReferralData = this.getReferralData();
                        const updatedReferralData = {
                            ...currentReferralData,
                            name: name,
                            email: email,
                            formSubmittedAt: new Date().toISOString()
                        };
                        this.saveReferralData(updatedReferralData);
                        
                        // Show success message
                        this.referralForm.style.display = "none";
                        formDone.style.display = "block";
                        formFail.style.display = "none";
                        formDone.querySelector('div').textContent = apiResponse;
                        
                        // Close modal after 3 seconds
                        setTimeout(() => {
                            this.closeReferralModal();
                            this.resetForm();
                        }, 3000);
                        
                    } else {
                        // Show error message
                        this.referralForm.style.display = "grid";
                        formDone.style.display = "none";
                        formFail.style.display = "block";
                        formFail.textContent = apiResponse;
                        setTimeout(() => (formFail.style.display = "none"), 3000);
                    }
                    
                } catch (error) {
                    console.error('Error submitting referral form:', error);
                    formFail.textContent = "Submission failed! Please try again.";
                    formFail.style.display = "block";
                    setTimeout(() => (formFail.style.display = "none"), 3000);
                } finally {
                    // Re-enable submit button
                    if (this.submitBtn) {
                        this.submitBtn.style.pointerEvents = "auto";
                    }
                    this.spinner.style.display = "none";
                }
            }

            // Reset form
            resetForm() {
                this.referralForm.reset();
                this.nameEl.value = "";
                this.emailEl.value = "";
                this.referralForm.style.display = "grid";
                const formDone = this.formContainer.querySelector(".w-form-done");
                const formFail = this.formContainer.querySelector(".w-form-fail");
                formDone.style.display = "none";
                formFail.style.display = "none";
            }

            // Method to handle checkout flow (to be called from checkout page)
            handleCheckout() {
                const referralData = this.getReferralData();
                if (referralData && referralData.code) {
                    // Apply referral code to checkout
                    console.log('Applying referral code to checkout:', referralData.code);
                    // This would integrate with your checkout system
                    return referralData.code;
                }
                return null;
            }
        }

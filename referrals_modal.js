        // required elements #referral-form-modal, #modal-close, #referral-modal-bg, #no-thanks-btn, [data-referral="claim-discount"], #half-circle-spinner, [data-referral="referrer-name"], .discount-code-red
        class ReferralModal {
            $referredMemberId = null;
            constructor(data) {
                this.data = data;
                this.checkEmptyState();
                this.init();
            }

            checkEmptyState() {
                this.referralForm = document.getElementById("referral-form-modal");
                this.closeModalBtn = document.getElementById('modal-close');
                this.modalBg = document.getElementById('referral-modal-bg');
                this.noThanksBtn = document.getElementById('no-thanks-btn');
                this.submitBtn = document.querySelector('[data-referral="claim-discount"]');
                this.spinner = document.getElementById("half-circle-spinner");
                this.nameEl = this.referralForm.querySelector("[data-name='name']");
                this.emailEl = this.referralForm.querySelector("[data-name='email']");
            }

            init() {
                this.handleModalEvents();
                this.checkCouponCodeInURLParam()
                if (this.data.memberId) {
                    this.updateLocalStorage(this.data.memberId);
                }
            }
            handleModalEvents() {
                var $this = this;
                this.closeModalBtn?.addEventListener('click', function () {
                    $this.closeReferralModal();
                });
                this.modalBg?.addEventListener('click', function () {
                    $this.closeReferralModal();
                });
                this.noThanksBtn?.addEventListener('click', function () {
                    $this.closeReferralModal();
                });
                this.noThanksBtn?.addEventListener('click', function () {
                    $this.closeReferralModal();
                });
                this.submitBtn.addEventListener("click", (e) => this.handleFormSubmit(e));
            }
            // handle user logged in state and referral code name and email of empty
            // Update local storage with timestamp, name, and email if not already set
            updateLocalStorage(memberId) {
                let referralData = localStorage.getItem('referralCode');
                // If no referral data exists, return early
                if (!referralData) {
                    return;
                } else {
                    referralData = JSON.parse(referralData);
                }
                // If name is already set, return early
                if (referralData.name && referralData.email) {
                    return;
                }
                // If name is not set, update it with the current data
                referralData = {
                    ...referralData,
                    timestamp: new Date().toISOString(),
                    name: this.data.name,
                    email: this.data.email
                };
                this.nameEl.value = referralData.name;
                this.emailEl.value = referralData.email;
                localStorage.setItem('referralCode', JSON.stringify(referralData));
            }
            // Check for coupon code in URL parameters
            checkCouponCodeInURLParam() {
                // Get URL parameters
                const urlParams = new URLSearchParams(window.location.search);
                // Get the coupon code and member ID from the URL parameters
                const codeParam = urlParams.get('code');
                const idParam = urlParams.get('id');
                if (codeParam && idParam) {
                    try {
                        // Decode the base64 encoded code using atob
                        const decodedCode = atob(codeParam);
                        const referredMemberId = atob(idParam);
                        this.$referredMemberId = referredMemberId;
                        // Update the discount code display
                        const discountCodeElement = document.querySelector('.discount-code-red');
                        if (discountCodeElement) {
                            discountCodeElement.textContent = decodedCode;
                        }
                        // fetch the referred member's details
                        const referredMemberDetails = this.getMemberDetails(referredMemberId);
                        // Store code and timestamp in localStorage as JSON string
                        const referralData = {
                            code: decodedCode,
                            memberId: referredMemberId,
                            timestamp: new Date().toISOString()
                        };
                        localStorage.setItem('referralCode', JSON.stringify(referralData));

                        this.showReferralModal();
                    } catch (error) {
                        console.error('Error decoding referral code:', error);
                        // If decoding fails, use the original code
                        const discountCodeElement = document.querySelector('.discount-code-red');
                        if (discountCodeElement) {
                            discountCodeElement.textContent = codeParam;
                        }

                        const referralData = {
                            code: codeParam,
                            timestamp: new Date().toISOString()
                        };
                        localStorage.setItem('referralCode', JSON.stringify(referralData));

                        this.showReferralModal();
                    }
                }
            }
            getMemberDetails(memberId) {
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
            showReferralModal() {
                var loginModal = document.getElementById('referral-modal');
                loginModal.classList.add('show');
            }

            closeReferralModal() {
                var loginModal = document.getElementById('referral-modal');
                loginModal.classList.remove('show');
            }
            handleModelEvents() {
                var $this = this;
                this.closeModalBtn?.addEventListener('click', function () {
                    $this.closeReferralModal();
                });
                this.modalBg?.addEventListener('click', function () {
                    $this.closeReferralModal();
                });
                this.noThanksBtn?.addEventListener('click', function () {
                    $this.closeReferralModal();
                });
                this.noThanksBtn?.addEventListener('click', function () {
                    $this.closeReferralModal();
                });
                this.submitBtn.addEventListener("click", (e) => this.handleFormSubmit(e));
            }
            async handleFormSubmit(e) {
                e.preventDefault();
                this.spinner.style.display = "block";

                const name = this.nameEl.value.trim();
                const email = this.emailEl.value.trim();
                // select w-form-done and w-form-fail
                const formDone = this.referralForm.querySelector(".w-form-done");
                const formFail = this.referralForm.querySelector(".w-form-fail");
                if (!name || !email) {
                    formFail.textContent = "Please fill in all fields.";
                    formFail.style.display = "block";
                    this.spinner.style.display = "none";
                    // Hide the error message after 3 seconds
                    setTimeout(() => (formFail.style.display = "none"), 3000);
                    this.referralForm.setAttribute("data-wf-page", "false");
                    return;
                }

                // Disable submit button to prevent multiple submissions
                if (this.submitBtn) {
                    this.submitBtn.style.pointerEvents = "none";
                    //this.submitBtn.innerHTML = "Submitting...";
                }

                try {
                    const res = await fetch(`${this.data.baseUrl}addReferralData`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name, email, memberId: this.$referredMemberId }),
                    });
                    let apiResponse = await res.json();
                    formDone.querySelector('div').textContent = apiResponse;
                    if (res.ok) {
                        this.referralForm.style.display = "none";
                        formDone.style.display = "block";
                        formFail.style.display = "none";
                        this.referralForm.setAttribute("data-wf-page", "true");
                    } else {
                        this.referralForm.style.display = "grid";
                        formDone.style.display = "none";
                        formFail.style.display = "block";
                        formFail.textContent = apiResponse;
                        this.referralForm.setAttribute("data-wf-page", "false");
                        // Hide the error message after 3 seconds
                        setTimeout(() => (formFail.style.display = "none"), 3000);
                        //throw new Error(apiResponse);
                    }
                    // Reset the form and clear all inputs
                    this.referralForm.reset();
                    this.nameEl.value = "";
                    this.emailEl.value = "";
                    this.spinner.style.display = "none";
                    return;
                } catch (err) {
                    this.spinner.style.display = "none";
                    this.formFail.querySelector('div').textContent = "Submission failed!";
                    setTimeout(() => (this.formFail.querySelector('div').textContent = ""), 2000);
                } finally {
                    // Re-enable submit button after submission is complete
                    if (this.submitBtn) {
                        this.submitBtn.style.pointerEvents = "auto";
                        this.submitBtn.innerHTML = "Claim Discount";
                        this.spinner.style.display = "none";
                    }

                    // Clear the form completely
                    setTimeout(() => {
                        this.referralForm.reset();
                        this.nameEl.value = "";
                        this.emailEl.value = "";
                        this.closeReferralModal()
                        this.referralForm.style.display = "grid";
                        formDone.style.display = "none";
                        formFail.style.display = "none";
                    }, 3000)

                }
            }
        }


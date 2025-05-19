class ReferralProgram {
    constructor(memberId, baseUrl) {
        this.memberId = memberId;
        this.baseUrl = baseUrl;
        this.referralCodeInput = document.getElementById("referralCode");
        this.copyMsg = document.getElementById("copyMsg");
        this.referralsTableBody = document
            .getElementById("referralsTable")
            .getElementsByTagName("tbody")[0];
        // showEnrolled and showPending is checkbox field
        this.showEnrolled = document.getElementById("showEnrolled");
        this.showPending = document.getElementById("showPending");
        this.referralForm = document.getElementById("referralForm");
        this.formMsg = document.getElementById("formMsg");
        this.submitBtn = this.referralForm.querySelector("button[type='submit']");

        this.referralForm.addEventListener("submit", (e) => this.handleFormSubmit(e));
        // Copy code button
        this.copyCodeBtn = document.querySelector(".copy-btn[data-referrals='copy']");
        this.copyCodeBtn.addEventListener("click", () => this.copyCode());
        // Load referral data on page load 
        this.loadReferralData(); 
        this.showEnrolled.addEventListener("change", () => this.loadReferralData());
        this.showPending.addEventListener("change", () => this.loadReferralData());  
    }
    copyCode() {
        this.referralCodeInput.select();
        this.referralCodeInput.setSelectionRange(0, 99999);
        document.execCommand("copy");
        this.copyMsg.style.display = "inline";
        setTimeout(() => (this.copyMsg.style.display = "none"), 1500);
    }

    async loadReferralData() {
        var spinner = document.getElementById('half-circle-spinner');
        spinner.style.display = 'block';
        try {
            const res = await fetch(
                `${this.baseUrl}getReferralData/${this.memberId}`
            );
            spinner.style.display = 'none';
            // Check if the response is ok
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();

            // Set coupon code
            this.referralCodeInput.value = data.coupon_code || "";

            // display showEnrolled and showPending based on referred_stage None or else
            if(this.showEnrolled.checked && this.showPending.checked) {
                data.referrals = data.referrals;
            } else if(this.showEnrolled.checked && !this.showPending.checked) {
                data.referrals = data.referrals.filter(ref => ref.referred_stage != "None");
            } else if(this.showPending.checked && !this.showEnrolled.checked) {
                data.referrals = data.referrals.filter(ref => ref.referred_stage == "None");
            }

            // Populate referrals table
            this.referralsTableBody.innerHTML = "";
            (data.referrals || []).forEach((ref) => {
                const row = this.referralsTableBody.insertRow();
                row.insertCell(0).textContent = ref.name || "";
                row.insertCell(1).textContent = ref.email || "";
                row.insertCell(2).textContent = (ref.date_referred && this.formatDate(ref.date_referred)) || "";
                row.insertCell(3).textContent = ref.purchased_date
                    ? this.formatDate(ref.purchased_date)
                    : "Pending";
            });
        } catch (err) {
            console.error(err);
        }
    }
    formatDate(dateString) {  
        const options = { year: "numeric", month: "long", day: "numeric" };
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", options);
    }
    async handleFormSubmit(e) {
        e.preventDefault();
        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        if (!name || !email) return;

        // Disable submit button to prevent multiple submissions
        if (this.submitBtn) {
            this.submitBtn.disabled = true;
            this.submitBtn.innerHTML = "Submitting...";
        }

        try {
            const res = await fetch(
                `${this.baseUrl}addReferralData`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, memberId: this.memberId }),
                }
            );
            if (!res.ok) throw new Error("Failed to submit");
            let apiResponse = await res.json();
            this.formMsg.textContent = apiResponse;
            if(apiResponse == "Referral data added successfully") {
                this.formMsg.style.color = "green";
            }else {
                this.formMsg.style.color = "red";
            }
            this.referralForm.reset();
            this.loadReferralData();
            setTimeout(() => (this.formMsg.textContent = ""), 5000);
            return;
            
        } catch (err) {
            this.formMsg.textContent = "Submission failed!";
            setTimeout(() => (this.formMsg.textContent = ""), 2000);
        } finally {
            // Re-enable submit button after submission is complete
            if (this.submitBtn) {
                this.submitBtn.disabled = false;
                this.submitBtn.innerHTML = "Submit";
            }
        }
    }
}


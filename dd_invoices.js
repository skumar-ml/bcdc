/*

Purpose: Manages direct debit invoices and payment processing. Displays invoice data in tabs, handles invoice details, program information, and student details for each invoice.

Brief Logic: Fetches invoice data from API, creates tabs for each student/invoice, displays invoice list with program details, handles tab switching, and manages invoice status and payment information.

Are there any dependent JS files: No

*/
class DDInvoices {
    $completedForm = [];
    $invoiceList = [];
    $programCategory = {};
    $programDetail = {};
    $studentDetail = {};
    $totalInvoice = 0;
    $isLiveProgram = true;
    $startDate = '';
    $endDate = '';
    $completedInvoice = 0;
    constructor(webflowMemberId, accountEmail, apiBaseUrl) {
        this.webflowMemberId = webflowMemberId;
        this.accountEmail = accountEmail;
        this.baseUrl = apiBaseUrl;
        this.tabMenu = document.getElementById('tab-menu');
        this.tabContent = document.getElementById('tab-content');
        this.getPortalData();
    }
    // Get API data with the help of endpoint
    async fetchData(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`);
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            const data = await response.json();
            return data;
        } catch (error) {
            //console.error("Error fetching data:", error);
            //throw error;
        }
    }
    async getPortalData() {
        // API call
        const curr_dashboard_title = document.getElementById('curr_dashboard_title');
        var spinner = document.getElementById('half-circle-spinner');
        spinner.style.display = 'block';
        const data = await this.fetchData("getInvoiceData/" + this.webflowMemberId);
        console.log('data', data)
        // Hide free and paid resources
        this.hidePortalData(data)
        // hide spinner
        spinner.style.display = 'none';
        curr_dashboard_title.style.display = 'block';
        // create portal student program tabs
        this.init(data);
        this.removeByDefaultSelectedTab()
        // Re initialize webflow tabs after API call 
        Webflow.require('tabs').redraw();
    }
    updateGlobalVariable(tab) {
        this.$completedForm = tab.formCompletedList;
        this.$invoiceList = tab.invoiceList;
        this.$programCategory = tab.programCategory;
        this.$studentDetail = tab.studentDetail;
        this.$programDetail = tab.programDetail;
        this.$uploadedContent = tab.uploadedContent;
        this.$totalInvoice = 0;
        this.$startDate = new Date(this.$programDetail.startDate);
        this.$endDate = new Date(this.$programDetail.endDate);
    }
    // Hide free and paid resources after api response data
    hidePortalData(responseText) {
        if (responseText == "No data Found") {
            document.getElementById("free-resources").style.display = "block";
        } else if (responseText.length == 0) {
            document.getElementById("free-resources").style.display = "block";
        } else {
            if (!(localStorage.getItem('locat') === null)) {
                localStorage.removeItem('locat');
            }
            document.getElementById("paid-resources").style.display = "block";
        }
    }
    crossEvent() {
        var crossIcon = document.querySelectorAll('.cross-icon')
        var $this = this;
        crossIcon.forEach(e => {
            e.addEventListener("click", function (event) {
                event.preventDefault();
                $this.removeByDefaultSelectedTab()

            });
        })
    }
    removeByDefaultSelectedTab() {
        const panLink = document.querySelectorAll('.w-tab-link');
        panLink.forEach(element => {
            element.classList.remove('w--current');
        });
        const tabPan = document.querySelectorAll('.w-tab-pane');
        tabPan.forEach(element => {
            element.classList.remove('w--tab-active');
        });
        Webflow.require('tabs').redraw();
    }
    init(data) {
        this.createTabs(data);
        this.createTabContent(data);
    }

    createTabs(tabData) {
        console.log('data', tabData)
        tabData.forEach((tab, index) => {
            this.updateGlobalVariable(tab);
            const tabLink = document.createElement('a');
            tabLink.className = 'current-programs_sub-div w-inline-block w-tab-link';
            if (index === 0) tabLink.classList.add('w--current');
            tabLink.setAttribute('data-w-tab', 'Tab ' + (index + 1));
            tabLink.setAttribute('role', 'tab');
            tabLink.setAttribute('aria-controls', 'w-tabs-0-data-w-pane-' + index);
            tabLink.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
            tabLink.href = '#w-tabs-0-data-w-pane-' + index;

            const tabLinkContentDiv = document.createElement('div');
            const currentProgramContentDiv = document.createElement('div');
            currentProgramContentDiv.className = 'current-program_content-div';

            const currentProgramSubtitleDiv = document.createElement('div');
            currentProgramSubtitleDiv.className = 'dm-sans-3 current-program_subtitle';
            currentProgramSubtitleDiv.textContent = `${tab.programDetail.programName}`;

            const currentProgramTabSubtitleDiv = document.createElement('div');
            currentProgramTabSubtitleDiv.className = 'dm-sans-3 opacity-70';
            currentProgramTabSubtitleDiv.textContent = `${tab.studentDetail.studentName.first} ${tab.studentDetail.studentName.last} | ${ this.$startDate.toLocaleString('default', { month: 'long' })} ${this.$startDate.getDate()} - ${ this.$endDate.toLocaleString('default', { month: 'long' })} ${this.$endDate.getDate()}`;

            currentProgramContentDiv.appendChild(currentProgramSubtitleDiv);
            currentProgramContentDiv.appendChild(currentProgramTabSubtitleDiv);
            tabLinkContentDiv.appendChild(currentProgramContentDiv);
            tabLink.appendChild(tabLinkContentDiv);
            this.tabMenu.appendChild(tabLink);
        });
    }

    createTabContent(tabData) {
        var $this = this;
        tabData.forEach((tab, index) => {
            const tabPane = document.createElement('div');
            tabPane.className = 'w-tab-pane';
            if (index === 0) tabPane.classList.add('w--tab-active');
            tabPane.setAttribute('data-w-tab', 'Tab ' + (index + 1));
            tabPane.setAttribute('role', 'tabpanel');
            tabPane.setAttribute('aria-labelledby', 'w-tabs-0-data-w-tab-' + index);
            tabPane.id = 'w-tabs-0-data-w-pane-' + index;

            const preCampDiv = document.createElement('div');
            preCampDiv.className = 'pre-camp_div';

            const preCampTitleContentWrapper = document.createElement('div');
            preCampTitleContentWrapper.className = 'pre-camp_title-content-wrapper';

            // Create the inner div
            const titleInvoice = document.createElement('div');
            titleInvoice.className = 'pre-camp_title-text';
            titleInvoice.innerHTML = 'Invoice';

            preCampTitleContentWrapper.appendChild(titleInvoice);

            const crossIcon = document.createElement('div');
            crossIcon.className = 'cross-icon';

            const crossIconImg = document.createElement('img');
            crossIconImg.loading = 'lazy';
            crossIconImg.alt = '';
            crossIconImg.src = 'https://cdn.prod.website-files.com/60aafce5cb6bcd2d42d9a420/66a730aedff039e96624b23a_icon%20(1).svg';

            crossIcon.appendChild(crossIconImg);

            preCampTitleContentWrapper.appendChild(crossIcon);


            preCampDiv.appendChild(preCampTitleContentWrapper);
            

            const invoicesDiv = document.createElement('div');

            const preCampGrid = document.createElement('div');
            preCampGrid.className = 'pre-camp_grid';

            tab.invoiceList.forEach((invoice) => {
                const preCampRow = document.createElement('div');
                preCampRow.className = 'pre-camp_row';

                let editable = (invoice.is_completed) ? true : false;

                let completed = (editable && (invoice.status == 'Complete' || !invoice.status));
                let failed = (invoice.status == 'Failed');
                let processing = (invoice.status == 'Processing');
                let paymentProcessMsg = (invoice.paymentProcessMsg != '');

                const invoiceImg = document.createElement('img');
                invoiceImg.loading = 'lazy';
                invoiceImg.alt = '';
                invoiceImg.className = 'status_icon';
                invoiceImg.src = this.getCheckedIcon(completed, failed, processing);

                const invoiceNameDiv = document.createElement('div');
                invoiceNameDiv.className = 'dm-sans-3 bold-500';
                invoiceNameDiv.textContent = invoice.invoiceName;

                const invoicePaymentLinkDiv = document.createElement('div');
                invoicePaymentLinkDiv.className = 'invoice_payment_link';

                var jotFormUrlLink = invoice.jotFormUrlLink;
                jotFormUrlLink.sort((a, b) => (a.title > b.title) ? 1 : ((b.title > a.title) ? -1 : 0));
                if (!editable || failed) {
                    jotFormUrlLink.forEach((option) => {
                        const paymentLink = document.createElement('a');

                        const paymentOptionDiv = document.createElement('div');
                        paymentOptionDiv.className = 'dm-sans-3 opacity-70 margin-right';
                        paymentOptionDiv.textContent = option.title;

                        if (option.paymentType == 'jotform') {
                            paymentLink.href = (link.formid) ? "https://form.jotform.com/" + link.formid + "?memberId=" + $this.webflowMemberId + "&invoiceId=" + invoice.invoice_id + "&paymentLinkId=" + link.paymentLinkId + "&paymentId=" + $this.$studentDetail.uniqueIdentification : "";

                            //Add iframe when it's live and above certain screenwidth
                            paymentLink.className = (window.innerWidth > 1200) ? "iframe-lightbox-link" : "";
                        } else {

                            paymentLink.addEventListener('click', function () {
                                paymentOptionDiv.innerHTML = "Processing..."
                                $this.initializeStripePayment(invoice.invoice_id, invoice.invoiceName, option.amount, option.paymentLinkId, paymentOptionDiv, option.title, option.paymentType)
                            })
                        }

                        paymentLink.className = 'dashboard_link-block w-inline-block incomplete_invoice';



                        paymentLink.appendChild(paymentOptionDiv);
                        invoicePaymentLinkDiv.appendChild(paymentLink);
                    });
                } else {
                    const paymentLink = document.createElement('a');
                    

                    const paymentOptionDiv = document.createElement('div');
                    paymentOptionDiv.className = 'dm-sans-3 opacity-70 margin-right';
                    if (processing) {
                        paymentOptionDiv.textContent = 'Processing...';
                    } else {
                        paymentOptionDiv.textContent = 'Completed';
                    }
                    paymentLink.className = 'dashboard_link-block w-inline-block '+ (completed)? 'completed_form_link': '';
                    paymentLink.appendChild(paymentOptionDiv);
                    invoicePaymentLinkDiv.appendChild(paymentLink);

                    $this.$completedInvoice;
                }

                $this.$totalInvoice++;
                preCampRow.appendChild(invoiceImg);
                preCampRow.appendChild(invoiceNameDiv);
                preCampRow.appendChild(invoicePaymentLinkDiv);
                preCampGrid.appendChild(preCampRow);
            });


            const preCampSubtitleWrapper = document.createElement('div');
            preCampSubtitleWrapper.className = 'pre-camp_subtitle-wrapper';

            const preCampProgressContainer = document.createElement('div');
            preCampProgressContainer.className = 'pre-camp_progress-container';

            const preCampProgressSubtitleDiv = document.createElement('div');
            preCampProgressSubtitleDiv.className = 'pre-camp_subtitle opacity-50';
            let percentageAmount = (this.$completetdInvoice) ? (100 * this.$completetdInvoice) / this.$totalInvoice : 0;
            preCampProgressSubtitleDiv.textContent = `${Math.round(percentageAmount)}% / ${this.$completedInvoice} of ${this.$totalInvoice} forms complete`;

            const preCampProgressBar = document.createElement('div');
            preCampProgressBar.className = 'pre-camp_progress-bar';

            const subDiv = document.createElement('div');
            subDiv.className = 'sub-div';
            preCampProgressBar.appendChild(subDiv);
            preCampProgressContainer.appendChild(preCampProgressSubtitleDiv);
            preCampProgressContainer.appendChild(preCampProgressBar);
            preCampSubtitleWrapper.appendChild(preCampProgressContainer);
            preCampDiv.appendChild(preCampSubtitleWrapper);

            invoicesDiv.appendChild(preCampGrid);
            preCampDiv.appendChild(invoicesDiv);
            tabPane.appendChild(preCampDiv);
            this.tabContent.appendChild(tabPane);
        });
    }
    initializeStripePayment(invoice_id, title, amount, paymentLinkId, span, link_title, paymentType) {
        var centAmount = (amount * 100).toFixed(2);
        var data = {
            "email": this.$studentDetail.parentEmail,
            "name": this.$studentDetail.studentName,
            "label": title,
            "paymentType": paymentType,
            "amount": parseFloat(centAmount),
            "invoiceId": invoice_id,
            "paymentId": this.$studentDetail.uniqueIdentification,
            "paymentLinkId": paymentLinkId,
            "memberId": this.webflowMemberId,
            "successUrl": encodeURI("https://www.debatedrills.com/payment-confirmation?programName=" + title),
            "cancelUrl": "https://www.debatedrills.com/invoices" ,
        }
        var xhr = new XMLHttpRequest()
        var $this = this;
        xhr.open("POST", "https://fsiokpe5d7.execute-api.us-west-1.amazonaws.com/prod/camp/createCheckoutUrlForInvoice", true)
        xhr.withCredentials = false
        xhr.send(JSON.stringify(data))
        xhr.onload = function () {
            let responseText = JSON.parse(xhr.responseText);
            console.log('responseText', responseText)
            if (responseText.success) {
                span.innerHTML = link_title;
                window.location.href = responseText.stripe_url;
            }

        }
    }
    /**
     * Get Checkbox icon for form complete or complete
     */
    getCheckedIcon(status, failed, processing) {

        if (processing) {
            return "https://uploads-ssl.webflow.com/64091ce7166e6d5fb836545e/653a046b720f1634ea7288cc_loading-circles.gif";
        } else if (failed) {
            return "https://uploads-ssl.webflow.com/64091ce7166e6d5fb836545e/6539ec996a84c0196f6009bc_circle-xmark-regular.png";
        } else if (status) {
            return "https://uploads-ssl.webflow.com/6271a4bf060d543533060f47/639c495f35742c15354b2e0d_circle-check-regular.png";
        } else {
            return "https://uploads-ssl.webflow.com/6271a4bf060d543533060f47/639c495fdc487955887ade5b_circle-regular.png";
        }
    }
}

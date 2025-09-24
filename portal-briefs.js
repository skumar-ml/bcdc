class BriefManager {
    constructor(data) {
        // Store the data object
        this.data = data;

        // Array of briefs (each brief should have: topicName, pdf_url, pdf_url)
        this.$briefs = [];

        // Index of the currently selected brief
        this.currentBriefIndex = 0;

        // Store DOM element references
        this.elements = {
            selectBriefs: null,   // Dropdown(s) for selecting briefs
            downloadPDFs: null,   // Links/buttons for downloading PDF
            downloadWords: null,  // Links/buttons for downloading Word
            pdfPreviews: null,    // Iframes for previewing PDFs
            containers: null,     // Main container(s) for briefs
            spinner: null         // Loading spinner
        };

        this.init();
    }
    /**
     * Fetch data from the API
     */
    async fetchData(endpoint) {
        try {
            let url = `${this.data.baseUrl}${endpoint}`;
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
        try {
            const response = await this.fetchData('getTopicsDetails?memberId=' + this.data.memberId);
            if (response) {
                console.log('API Response:', response);
                console.log('Topics:', response.topics);
                return response.topics;
            } else {
                return [];
            }
        } catch (error) {
            console.error('Error fetching briefs:', error);
            return [];
            window.location.href = 'https://www.bergendebate.com/briefs';
        }
    }
    /**
     * Initialize the manager: cache DOM, handle empty state, bind events, update UI
     */
    async init() {
        this.cacheElements();
        this.bindEvents();
        this.elements.spinner.style.display = 'block';
        this.$briefs = await this.getBriefs();
        this.checkEmptyState();
        this.updateAllElements();
        this.elements.spinner.style.display = 'none';
    }

    /**
     * Cache DOM elements into this.elements for reuse
     */
    cacheElements() {
        this.elements.selectBriefs = document.querySelectorAll('[data-brief="select-brief"]');
        this.elements.downloadPDFs = document.querySelectorAll('[data-brief="download-pdf"]');
        this.elements.pdfPreviews = document.querySelectorAll('[data-brief="pdf-preview"]');
        this.elements.containers = document.querySelectorAll('.pdf-briefs-main-container');
        this.elements.spinner = document.getElementById('half-circle-spinner');
    }

    /**
     * Handle empty state: hide containers if no briefs
     */
    checkEmptyState() {
        if (!this.elements.containers || this.elements.containers.length === 0) return;

        if (this.$briefs.length === 0) {
            // No briefs → hide content, show loader
            this.elements.containers.forEach(container => {
                container.style.display = 'none';
            });
            this.elements.spinner.style.display = 'block';
        } else {
            // Briefs available → show content, hide loader
            this.elements.containers.forEach(container => {
                container.style.display = 'block';
            });
            this.elements.spinner.style.display = 'none';
        }
    }

    /**
     * Bind events to DOM elements
     */
    bindEvents() {
        // Handle dropdown change to switch briefs
        if (this.elements.selectBriefs && this.elements.selectBriefs.length > 0) {
            this.elements.selectBriefs.forEach(select => {
                select.addEventListener('change', (e) => {
                    this.setCurrentBrief(parseInt(e.target.value));
                });
            });
        }
    }

    /**
     * Set the current brief index and update UI
     */
    setCurrentBrief(index) {
        if (index >= 0 && index < this.$briefs.length) {
            this.currentBriefIndex = index;
            this.updateAllElements();
        }
    }

    /**
     * Get the currently selected brief object
     */
    getCurrentBrief() {
        return this.$briefs[this.currentBriefIndex];
    }

    /**
     * Update dropdowns with list of briefs
     */
    updateBriefSelect() {
        if (!this.elements.selectBriefs || this.elements.selectBriefs.length === 0) return;

        console.log('Updating brief select with briefs:', this.$briefs);
        if (this.$briefs.length === 0) {
            window.location.href = 'https://www.bergendebate.com/briefs';
        }
        this.elements.selectBriefs.forEach(select => {
            select.innerHTML = '';
            this.$briefs.forEach((brief, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = brief.topicName;
                console.log(`Adding option: ${brief.topicName} (index: ${index})`);
                select.appendChild(option);
            });
            select.value = this.currentBriefIndex;
        });
    }

    /**
     * Update PDF download links with current brief
     */
    updateDownloadPDF() {
        if (!this.elements.downloadPDFs || this.elements.downloadPDFs.length === 0) return;

        const currentBrief = this.getCurrentBrief();
        if (currentBrief) {
            this.elements.downloadPDFs.forEach(link => {
                link.href = currentBrief.pdf_url;
                link.setAttribute('target', "_blank");
            });
        }
    }

    /**
     * Update PDF preview iframe with current brief
     */
    updatePDFPreview() {
        if (!this.elements.pdfPreviews || this.elements.pdfPreviews.length === 0) return;

        const currentBrief = this.getCurrentBrief();
        if (currentBrief) {
            const previewUrl = currentBrief.pdf_url; // Use preview PDF URL
            this.elements.pdfPreviews.forEach(iframe => {
                iframe.src = previewUrl + "?#toolbar=0"; // Hide toolbar for cleaner look
            });
        }
    }

    /**
     * Update all UI elements (dropdown, downloads, previews)
     */
    updateAllElements() {
        this.updateBriefSelect();
        this.updateDownloadPDF();
        this.updatePDFPreview();
    }
}

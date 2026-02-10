/*

Purpose: Coach-facing interface for managing millions program transactions and data. Allows coaches to view students, search/filter, add or remove millions amounts, and manage student balances.

Brief Logic: Fetches students data from API with pagination, displays student list with search functionality, shows modal for adding/removing millions, processes API calls to update student balances, and handles pagination and filtering.

Are there any dependent JS files: No

*/
        class MillionsCoach {
            $currentStudent = null;
            
            /**
             * Constructor for MillionsCoach class
             * @param {Object} data - Configuration object containing API base URL and member ID
             */
            constructor(data) {
                this.noRecordDiv = document.querySelector('[data-table="no-record-found"]');
                this.noRecordAPIDiv = document.querySelector('[data-container="no-record-found"]');
                this.spinner = document.getElementById("half-circle-spinner");
                this.portalInfoWrapper = document.querySelector('.portal-info-wrapper');
                this.data = data;
                this.currentPage = 0;
                this.limit = 10;
                this.totalStudents = 0;
                this.currentSearchText = '';
                this.currentStudentsList = []; // Store current students data
                this.render();
                this.setupEventListeners();
            }

            
            /**
             * Renders the initial students list and pagination
             * Fetches data from API and displays it on the page
             */
            async render() {
                // Hide no record div initially
                if (this.noRecordDiv) {
                    this.noRecordDiv.style.display = "none";
                }
                if (this.portalInfoWrapper) {
                    this.portalInfoWrapper.style.display = "none";
                }
                if (this.spinner) {
                    this.spinner.style.display = "block";
                }

                try {
                    this.showLoading('Loading students data...');
                    const data = await this.fetchMillionsStudents();
                    const studentsList = data.data;

                    // Set total students count
                    this.totalStudents = studentsList.length >= this.limit ? data.count : studentsList.length;

                    // Handle no records found
                    if (studentsList.length === 0) {
                        this.showNoRecordsMessage('No students found');
                        return;
                    }

                    this.displayStudentsList(studentsList);
                    this.displayPagination();

                    this.portalInfoWrapper.style.display = "block";
                    this.spinner.style.display = "none";

                } catch (error) {
                    this.portalInfoWrapper.style.display = "none";
                    this.noRecordAPIDiv.style.display = "block";
                    this.spinner.style.display = "none";
                    console.error('Error rendering students:', error);
                    this.displayError('Failed to load students data');

                }
            }

            
            /**
             * Fetches students data from the API with optional search and pagination
             * @param {string} searchText - Search term to filter students
             * @param {number} offset - Number of records to skip for pagination
             * @param {number} limit - Maximum number of records to return
             * @returns {Promise<Object>} Promise resolving to API response data
             */
            async fetchMillionsStudents(searchText = '', offset = 0, limit = 10) {
                try {
                    const url = `${this.data.apiBaseURL}getMillionsDetails`;
                    const body = {
                        memberId: this.data.memberId,
                        searchText: searchText,
                        offset: offset,
                        limit: limit
                    }

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(body)
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();
                    return data;
                } catch (error) {
                    console.error('Error fetching millions students:', error);
                    throw error;
                }
            }

            
            /**
             * Updates the millions amount for a specific student via API
             * @param {string} description - Description of the update
             * @param {number} amount - New amount to set for the student
             * @returns {Promise<Object>} Promise resolving to update result
             */
            async updatePortalMillions(description, amount) {
                try {
                    const url = `${this.data.apiBaseURL}updatePortalMillions`;
                    const body = {
                        memberId: this.data.memberId,
                        studentId: this.$currentStudent.studentId,
                        newStudent: this.$currentStudent.newStudent,
                        amount: amount,
                        description: description,
                        prevAmount: this.$currentStudent.amount
                    }

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(body)
                    });

                    const data = await response.json();
                    if(data.studentId){
                        this.$currentStudent.studentId = data.studentId;
                    }
                    return { message: "Success", data: data };
                } catch (error) {
                    console.error('Error updating portal millions:', error);
                    throw error;
                }
            }

            /**
             * Displays the list of students in the UI
             * @param {Array} studentsList - Array of student objects to display
             */
            displayStudentsList(studentsList) {
                const studentsListDiv = document.querySelector('[data-millions="students-list"]');

                if (!studentsListDiv) {
                    console.error('Students list container not found');
                    return;
                }

                // Store current students list for reference
                this.currentStudentsList = studentsList || [];

                // Clear existing content
                studentsListDiv.innerHTML = '';

                if (!studentsList || studentsList.length === 0) {
                    // Show no records message
                    this.showNoRecordsMessage('No students found');
                    return;
                }

                // Hide no records message
                this.hideNoRecordsMessage();

                // Show students list container
                studentsListDiv.style.display = 'block';

                // Create student rows
                studentsList.forEach(student => {
                    const studentRow = this.createStudentRow(student);
                    studentsListDiv.appendChild(studentRow);
                });
            }

            /**
             * Shows a no records found message
             * @param {string} message - Message to display
             */
            showNoRecordsMessage(message = 'No records found') {
                // Hide students list
                const studentsListDiv = document.querySelector('[data-millions="students-list"]');
                if (studentsListDiv) {
                    studentsListDiv.style.display = 'none';
                }

                // Hide pagination
                const paginationContainer = document.querySelector('[data-millions="pagination"]');
                if (paginationContainer) {
                    paginationContainer.style.display = 'none';
                }

                // Show no record div
                if (this.noRecordDiv) {
                    this.noRecordDiv.style.display = 'block';
                    // Update the message text
                    const messageElement = this.noRecordDiv.querySelector('.no-record-found');
                    if (messageElement) {
                        messageElement.textContent = message;
                    }
                }
            }

            /**
             * Hides the no records found message
             */
            hideNoRecordsMessage() {
                if (this.noRecordDiv) {
                    this.noRecordDiv.style.display = 'none';
                }
            }

            // Creates a DOM element for a single student row
            /**
             * Creates a DOM element for a single student row
             * @param {Object} student - Student object containing name, email, amount, and newStudent, studentID
             * @returns {HTMLElement} DOM element representing the student row
             */
            createStudentRow(student) {
                const row = document.createElement('div');
                row.className = 'students-info-row-grid';
                row.setAttribute('data-student-id', student.studentId);

                const amountClass = student.amount > 0 ? 'green-semi-bold' : 'red-semi-bold';
                const amountText = student.amount > 0 ? `+$${student.amount}` : `$${student.amount}`;

                row.innerHTML = `
    <div class="students-info-row-text">${student.name || 'N/A'}</div>
    <div class="students-info-row-text">${student.emailId || 'N/A'}</div>
    <div class="students-info-row-text ${amountClass}">${amountText}</div>
    <div class="students-info-flex-wrapper">
        <div class="students-info-add-icon-div" data-student-id="${student.studentId}" data-action="add">
            <img src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/688a001a61f82b5217fc5b50_add_box%201.svg" 
                 loading="lazy" alt="" class="add-icon">
            <div class="add-tooltip-text">Add</div>
        </div>
        <div class="students-info-delete-icon-div" data-student-id="${student.studentId}" data-action="delete">
            <img src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/688a0024a37a8bf30b97a453_remove_circle%201.svg" 
                 loading="lazy" alt="" class="delete-icon">
            <div class="delete-tooltip-text">Delete</div>
        </div>
    </div>
`;

                // Add event listeners to the action buttons
                const addButton = row.querySelector('[data-action="add"]');
                const deleteButton = row.querySelector('[data-action="delete"]');

                if (addButton) {
                    addButton.addEventListener('click', () => {
                        this.addStudentAmount(student.studentId);
                    });
                }

                if (deleteButton) {
                    deleteButton.addEventListener('click', () => {
                        this.deleteStudentAmount(student.studentId);
                    });
                }

                return row;
            }

            
            /**
             * Displays pagination controls for navigating through student pages
             */
            displayPagination() {
                let paginationContainer = document.querySelector('[data-millions="pagination"]');

                const totalPages = Math.ceil(this.totalStudents / this.limit);

                // Show pagination if we have more than one page
                if (totalPages <= 1) {
                    if (paginationContainer) {
                        paginationContainer.style.display = "none";
                    }
                    return;
                }

                if (!paginationContainer) {
                    // Create pagination container if it doesn't exist
                    const studentsTableDiv = document.querySelector('.students-info-table-div');
                    if (studentsTableDiv) {
                        paginationContainer = document.createElement('div');
                        paginationContainer.setAttribute('data-millions', 'pagination');
                        paginationContainer.className = 'pagination-container';
                        studentsTableDiv.appendChild(paginationContainer);
                    } else {
                        console.error('students-info-table-div not found');
                        return;
                    }
                }

                paginationContainer.style.display = "block";

                const pageNumbers = this.generatePageNumbers(totalPages);

                paginationContainer.innerHTML = `
    <div class="pagination-controls">
        <button class="pagination-btn" data-page="${this.currentPage - 1}" data-action="prev"
                ${this.currentPage === 0 ? 'disabled' : ''}>
            <
        </button>
        <div class="page-numbers">
            ${pageNumbers}
        </div>
        <button class="pagination-btn" data-page="${this.currentPage + 1}" data-action="next"
                ${this.currentPage >= totalPages - 1 ? 'disabled' : ''}>
            >
        </button>
    </div>
    <div class="pagination-info">Page ${this.currentPage + 1} of ${totalPages} (${this.totalStudents} total students)</div>
`;

                // Add event listeners to pagination buttons
                const prevButton = paginationContainer.querySelector('[data-action="prev"]');
                const nextButton = paginationContainer.querySelector('[data-action="next"]');
                const pageButtons = paginationContainer.querySelectorAll('[data-page]');

                if (prevButton && !prevButton.disabled) {
                    prevButton.addEventListener('click', () => {
                        this.goToPage(this.currentPage - 1);
                    });
                }

                if (nextButton && !nextButton.disabled) {
                    nextButton.addEventListener('click', () => {
                        this.goToPage(this.currentPage + 1);
                    });
                }

                // Add event listeners to page number buttons
                pageButtons.forEach(button => {
                    if (!button.disabled) {
                        button.addEventListener('click', () => {
                            const page = parseInt(button.getAttribute('data-page'));
                            this.goToPage(page);
                        });
                    }
                });
            }
            /**
             * Generates pagination page numbers with smart ellipsis for large page counts
             * @param {number} totalPages - Total number of pages
             * @returns {string} HTML string of pagination buttons
             */
            generatePageNumbers(totalPages) {
                const currentPage = this.currentPage;
                const pageNumbers = [];

                // Always show first page
                pageNumbers.push(this.createPageButton(1, currentPage === 0));

                if (totalPages <= 7) {
                    // If 7 or fewer pages, show all page numbers
                    for (let i = 2; i <= totalPages; i++) {
                        pageNumbers.push(this.createPageButton(i, currentPage === i - 1));
                    }
                } else {
                    // More than 7 pages, show smart pagination
                    if (currentPage <= 3) {
                        // Near the beginning
                        for (let i = 2; i <= 5; i++) {
                            pageNumbers.push(this.createPageButton(i, currentPage === i - 1));
                        }
                        pageNumbers.push('<span class="pagination-ellipsis">...</span>');
                        pageNumbers.push(this.createPageButton(totalPages, currentPage === totalPages - 1));
                    } else if (currentPage >= totalPages - 4) {
                        // Near the end
                        pageNumbers.push('<span class="pagination-ellipsis">...</span>');
                        for (let i = totalPages - 4; i <= totalPages; i++) {
                            pageNumbers.push(this.createPageButton(i, currentPage === i - 1));
                        }
                    } else {
                        // In the middle
                        pageNumbers.push('<span class="pagination-ellipsis">...</span>');
                        for (let i = currentPage; i <= currentPage + 2; i++) {
                            pageNumbers.push(this.createPageButton(i + 1, currentPage === i));
                        }
                        pageNumbers.push('<span class="pagination-ellipsis">...</span>');
                        pageNumbers.push(this.createPageButton(totalPages, currentPage === totalPages - 1));
                    }
                }

                return pageNumbers.join('');
            }
            /**
             * Creates a single pagination page button
             * @param {number} pageNumber - Page number to display
             * @param {boolean} isActive - Whether this is the current active page
             * @returns {string} HTML string for the page button
             */
            createPageButton(pageNumber, isActive) {
                if (isActive) {
                    return `<button class="pagination-btn page-number active" disabled>${pageNumber}</button>`;
                } else {
                    return `<button class="pagination-btn page-number" data-page="${pageNumber - 1}">${pageNumber}</button>`;
                }
            }
            /**
             * Navigates to a specific page and loads the corresponding student data
             * @param {number} page - Page number to navigate to (0-based)
             */
            async goToPage(page) {
                if (page < 0) return;

                this.currentPage = page;
                const offset = page * this.limit;

                try {
                    this.showLoading('Loading page...');
                    const data = await this.fetchMillionsStudents(this.currentSearchText, offset, this.limit);
                    const studentsList = data.data;
                    this.displayStudentsList(studentsList);
                    this.displayPagination();
                } catch (error) {
                    console.error('Error loading page:', error);
                    this.displayError('Failed to load page');
                }
            }
            /**
             * Searches for students based on the provided search text
             * @param {string} searchText - Text to search for in student names/emails
             */
            async searchStudents(searchText) {
                this.currentSearchText = searchText;
                this.currentPage = 0;

                try {
                    this.showLoading('Searching students...');
                    const data = await this.fetchMillionsStudents(searchText, 0, this.limit);
                    const studentsList = data.data;

                    // Set total students count for search results
                    this.totalStudents = studentsList.length >= this.limit ? data.count : studentsList.length;

                    // Handle no search results
                    if (studentsList.length === 0) {
                        this.showNoRecordsMessage(`No students found matching "${searchText}"`);
                        return;
                    }

                    this.displayStudentsList(studentsList);
                    this.displayPagination();
                } catch (error) {
                    console.error('Error searching students:', error);
                    this.displayError('Failed to search students');
                }

                // Handle search form display
                this.handleSearchFormDisplay();
            }
            /**
             * Handles search form display and hides success/error messages
             */
            handleSearchFormDisplay() {
                const searchForm = document.getElementById('wf-form-Millions-Students-Form');
                if (searchForm) {
                    searchForm.style.display = 'block';
                    const wFormDone = document.querySelector('.w-form-done');
                    const wFormFail = document.querySelector('.w-form-fail');
                    if (wFormDone) {
                        wFormDone.style.display = 'none';
                    }
                    if (wFormFail) {
                        wFormFail.style.display = 'none';
                    }
                }
            }

            /**
             * Clears the current search and returns to the original student list
             */
            async clearSearch() {
                this.currentSearchText = '';
                this.currentPage = 0;

                try {
                    this.showLoading('Loading students...');
                    const data = await this.fetchMillionsStudents('', 0, this.limit);
                    const studentsList = data.data;

                    // Set total students count for original list
                    this.totalStudents = studentsList.length >= this.limit ? data.count : studentsList.length;

                    // Handle no records in original list
                    if (studentsList.length === 0) {
                        this.showNoRecordsMessage('No students found');
                        return;
                    }

                    this.displayStudentsList(studentsList);
                    this.displayPagination();
                } catch (error) {
                    console.error('Error clearing search:', error);
                    this.displayError('Failed to load students');
                }

                // Clear search input
                const searchInput = document.getElementById('Search');
                if (searchInput) {
                    searchInput.value = '';
                }
            }

            
            /**
             * Opens the modal for adding amount to a student's millions
             * @param {string} studentId - ID of the student to add amount for
             */
            async addStudentAmount(studentId) {
                // Find the student data from the current students list
                const student = this.findStudentById(studentId);
                if (!student) {
                    alert('Student not found');
                    return;
                }

                // Store the student data for later use
                this.currentStudentId = studentId;
                this.currentAction = 'add';
                this.$currentStudent = student;

                // Update modal title and form
                const modal = document.getElementById('millionsDetails');
                const title = modal.querySelector('.millions-details-title');
                const amountInput = document.getElementById('field');
                const descriptionField = document.getElementById('Description');

                if (title) title.textContent = 'Add Millions Amount';
                if (amountInput) {
                    amountInput.value = '';
                    amountInput.placeholder = 'Enter amount to add';
                }
                if (descriptionField) {
                    descriptionField.value = '';
                    descriptionField.placeholder = 'Enter description (optional)';
                }

                // Show modal
                modal.classList.add("show");
                modal.style.display = "flex";
            }

            
            /**
             * Opens the modal for removing amount from a student's millions
             * @param {string} studentId - ID of the student to remove amount from
             */
            async deleteStudentAmount(studentId) {
                // Find the student data from the current students list
                const student = this.findStudentById(studentId);
                if (!student) {
                    alert('Student not found');
                    return;
                }

                // Store the student data for later use
                this.currentStudentId = studentId;
                this.currentAction = 'delete';
                this.$currentStudent = student;

                // Update modal title and form
                const modal = document.getElementById('millionsDetails');
                const title = modal.querySelector('.millions-details-title');
                const amountInput = document.getElementById('field');
                const descriptionField = document.getElementById('Description');

                if (title) title.textContent = 'Remove Millions Amount';
                if (amountInput) {
                    amountInput.value = '';
                    amountInput.placeholder = 'Enter amount to remove';
                }
                if (descriptionField) {
                    descriptionField.value = '';
                    descriptionField.placeholder = 'Enter description (optional)';
                }

                // Show modal
                modal.style.display = "flex";
                modal.classList.add("show");
            }

            
            /**
             * Displays an error message in the students list area
             * @param {string} message - Error message to display
             */
            displayError(message) {
                const studentsListDiv = document.querySelector('[data-millions="students-list"]');
                if (studentsListDiv) {
                    studentsListDiv.innerHTML = `
        <div class="error-message" style="text-align: center; color: red; padding: 20px;">
            ${message}
        </div>
    `;
                }
            }

           
            /**
             * Shows a loading spinner with optional message
             * @param {string} message - Loading message to display (default: 'Loading...')
             */
            showLoading(message = 'Loading...') {
                const studentsListDiv = document.querySelector('[data-millions="students-list"]');
                if (studentsListDiv) {
                    studentsListDiv.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        </div>
    `;
                }
            }



            
            /**
             * Sets up all event listeners for search, pagination, and modal interactions
             */
            setupEventListeners() {
                // Search form submission
                const searchForm = document.getElementById('wf-form-Millions-Students-Form');
                if (searchForm) {
                    searchForm.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const searchInput = document.getElementById('Search');
                        const searchText = searchInput ? searchInput.value.trim() : '';
                        this.searchStudents(searchText);
                    });
                }

                // Search input real-time search (optional)
                const searchInput = document.getElementById('Search');
                if (searchInput) {
                    let searchTimeout;
                    searchInput.addEventListener('input', (e) => {
                        clearTimeout(searchTimeout);
                        searchTimeout = setTimeout(() => {
                            const searchText = e.target.value.trim();
                            if (searchText === '') {
                                // If search is cleared, return to original list
                                this.clearSearch();
                            } else {
                                this.searchStudents(searchText);
                            }
                        }, 500); // Debounce for 500ms
                    });
                }

                // Modal form submission
                this.setupModalEventListeners();
            }

            
            /**
             * Sets up event listeners specifically for modal interactions
             */
            setupModalEventListeners() {
                // Save button click
                const saveButton = document.querySelector('.main-button.save');
                if (saveButton) {
                    saveButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.handleModalSubmit();
                    });
                }

                // Modal close button
                const closeButton = document.querySelector('.millions-details-close-link');
                if (closeButton) {
                    closeButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.closeModal();
                    });
                }

                // Modal background click to close
                const modalBg = document.querySelector('.millions-modal-bg');
                if (modalBg) {
                    modalBg.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.closeModal();
                    });
                }
            }

            
            /**
             * Handles the submission of the modal form for adding/removing amounts
             */
            async handleModalSubmit() {
                try {
                    const amountInput = document.getElementById('field');
                    const descriptionField = document.getElementById('Description');

                    if (!amountInput || !amountInput.value) {
                        alert('Please enter an amount');
                        return;
                    }

                    const amount = parseFloat(amountInput.value);
                    if (isNaN(amount) || amount <= 0) {
                        alert('Please enter a valid positive amount');
                        return;
                    }

                    // Determine the amount to send (positive for add, negative for delete)
                    const apiAmount = this.currentAction === 'add' ? this.$currentStudent.amount + amount : this.$currentStudent.amount - amount;

                    // Show loading in modal
                    const saveButton = document.querySelector('.main-button.save');
                    const originalText = saveButton.textContent;
                    saveButton.textContent = 'Saving...';
                    saveButton.disabled = true;

                    // Call API
                    const result = await this.updatePortalMillions(descriptionField.value, apiAmount);

                    // Reset button
                    saveButton.textContent = originalText;
                    saveButton.disabled = false;

                    if (result.message === 'Success') {
                        // Update the current student's amount in the local data immediately
                        const studentIndex = this.currentStudentsList.findIndex(student => student.studentId === this.currentStudentId);
                        if (studentIndex !== -1) {
                            this.currentStudentsList[studentIndex].amount = apiAmount;
                        }

                        // Close modal
                        this.closeModal();

                        // Update the display immediately with the new data
                        this.displayStudentsList(this.currentStudentsList);

                        // Also refresh from server to ensure consistency
                        //this.render();
                    } else {
                        alert('Failed to update millions amount. Please try again.');
                    }

                } catch (error) {
                    console.error('Error handling modal submit:', error);

                    // Reset button
                    const saveButton = document.querySelector('.main-button.save');
                    if (saveButton) {
                        saveButton.textContent = 'Save';
                        saveButton.disabled = false;
                    }

                    alert('An error occurred while updating the millions amount. Please try again.');
                }
            }

            
            /**
             * Closes the modal and clears current student data
             */
            closeModal() {
                const modal = document.getElementById('millionsDetails');
                if (modal) {
                    modal.classList.remove("show");
                    modal.style.display = "none";
                }

                // Clear current student data
                this.currentStudentId = null;
                this.currentAction = null;
                this.$currentStudent = null;
            }
            /**
             * Finds a student by their ID in the current students list
             * @param {string} studentId - ID of the student to find
             * @returns {Object|null} Student object if found, null otherwise
             */
            findStudentById(studentId) {
                return this.currentStudentsList.find(student => student.studentId === studentId);
            }
        }


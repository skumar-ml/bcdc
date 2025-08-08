class MillionsCoach {
            $currentStudent = null;
            constructor(data) {
                this.noRecordDiv = document.querySelector('[data-container="no-record-found"]');
                this.data = data;
                this.currentPage = 0;
                this.limit = 10;
                this.totalStudents = 0;
                this.currentSearchText = '';
                this.testMode = false; // Set to true to force pagination for testing
                this.currentStudentsList = []; // Store current students data
                this.render();
                this.setupEventListeners();

            }

            async render() {
                this.noRecordDiv.style.display = "none"
                try {
                    this.showLoading('Loading students data...');
                    const data = await this.fetchMillionsStudents();
                    const studentsList = data.data;
                    // For testing, force pagination to show
                    if (this.testMode) {
                        this.totalStudents = Math.max(studentsList.length, 25); // Force at least 25 students for testing
                    } else {
                        this.totalStudents = studentsList.length >= this.limit ? data.count : studentsList.length;
                    }
                    this.hideLoading();
                    this.noRecordDiv.style.display = "block"
                    this.displayStudentsList(studentsList);
                    this.displayPagination();
                } catch (error) {
                    this.noRecordDiv.style.display = "block"
                    console.error('Error rendering students:', error);
                    this.hideLoading();
                    this.displayError('Failed to load students data');
                }
            }

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

            async updatePortalMillions(description, amount) {
                try {
                    const url = `${this.data.apiBaseURL}updatePortalMillions`;
                    const body = {
                        memberId: this.data.memberId,
                        paymentId : this.$currentStudent.paymentId,
                        _id: this.$currentStudent._id,
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

                    // if (!response.ok) {
                    //     throw new Error(`HTTP error! status: ${response.status}`);
                    // }
                    const data = await response.json();
                    return {message: "Success", data: data};
                } catch (error) {
                    console.error('Error updating portal millions:', error);
                    throw error;
                }
            }

            displayStudentsList(studentsList) {
                const studentsListDiv = document.querySelector('[data-millions="students-list"]');
                //const noRecordDiv = document.querySelector('[data-container="no-record-found"]');
                
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
                    if (noRecordDiv) {
                        //noRecordDiv.style.display = 'block';
                    }
                    return;
                }

                // Hide no records message
                if (noRecordDiv) {
                    //noRecordDiv.style.display = 'none';
                }

                // Create student rows
                studentsList.forEach(student => {
                    const studentRow = this.createStudentRow(student);
                    studentsListDiv.appendChild(studentRow);
                });
            }

            createStudentRow(student) {
                const row = document.createElement('div');
                row.className = 'students-info-row-grid';
                row.setAttribute('data-student-id', student._id);

                const amountClass = student.amount > 0 ? 'green-semi-bold' : 'red-semi-bold';
                const amountText = student.amount > 0 ? `+$${student.amount}` : `$${student.amount}`;

                row.innerHTML = `
                    <div class="students-info-row-text">${student.name || 'N/A'}</div>
                    <div class="students-info-row-text">${student.emailId || 'N/A'}</div>
                    <div class="students-info-row-text ${amountClass}">${amountText}</div>
                    <div class="students-info-flex-wrapper">
                        <div class="students-info-add-icon-div" data-student-id="${student._id}" data-action="add">
                            <img src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/688a001a61f82b5217fc5b50_add_box%201.svg" 
                                 loading="lazy" alt="" class="add-icon">
                            <div class="add-tooltip-text">Add</div>
                        </div>
                        <div class="students-info-delete-icon-div" data-student-id="${student._id}" data-action="delete">
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
                        this.addStudentAmount(student._id);
                    });
                }
                
                if (deleteButton) {
                    deleteButton.addEventListener('click', () => {
                        this.deleteStudentAmount(student._id);
                    });
                }

                return row;
            }

            displayPagination() {
                const totalPages = Math.ceil(this.totalStudents / this.limit);
                console.log('Total students:', this.totalStudents, 'Limit:', this.limit, 'Total pages:', totalPages, 'Test mode:', this.testMode);
                
                // Show pagination if we have more than one page OR if in test mode
                if (totalPages <= 1 && this.totalStudents <= this.limit && !this.testMode) {
                    console.log('No pagination needed - only one page or less data');
                    return;
                }

                let paginationContainer = document.querySelector('[data-millions="pagination"]');
                if (!paginationContainer) {
                    // Create pagination container if it doesn't exist
                    const studentsTableDiv = document.querySelector('.students-info-table-div');
                    if (studentsTableDiv) {
                        paginationContainer = document.createElement('div');
                        paginationContainer.setAttribute('data-millions', 'pagination');
                        paginationContainer.className = 'pagination-container';
                        studentsTableDiv.appendChild(paginationContainer);
                        console.log('Created pagination container');
                    } else {
                        console.error('students-info-table-div not found');
                        return;
                    }
                }

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
                console.log('Pagination displayed');
            }

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

            createPageButton(pageNumber, isActive) {
                if (isActive) {
                    return `<button class="pagination-btn page-number active" disabled>${pageNumber}</button>`;
                } else {
                    return `<button class="pagination-btn page-number" data-page="${pageNumber - 1}">${pageNumber}</button>`;
                }
            }

            async goToPage(page) {
                if (page < 0) return;
                
                this.currentPage = page;
                const offset = page * this.limit;
                
                try {
                    this.showLoading('Loading page...');
                    const data = await this.fetchMillionsStudents(this.currentSearchText, offset, this.limit);
                    const studentsList = data.data;
                    this.hideLoading();
                    this.displayStudentsList(studentsList);
                    this.displayPagination();
                } catch (error) {
                    console.error('Error loading page:', error);
                    this.hideLoading();
                    this.displayError('Failed to load page');
                }
            }

            async searchStudents(searchText) {
                this.currentSearchText = searchText;
                this.currentPage = 0;
                
                try {
                    this.showLoading('Searching students...');
                    const data = await this.fetchMillionsStudents(searchText, 0, this.limit);
                    const studentsList = data.data;
                    // For search results, use actual length but ensure pagination shows if needed
                    this.totalStudents = studentsList.length >= this.limit ? studentsList.length + 5 : studentsList.length;
                    this.hideLoading();
                    this.displayStudentsList(studentsList);
                    this.displayPagination();
                } catch (error) {
                    console.error('Error searching students:', error);
                    this.hideLoading();
                    this.displayError('Failed to search students');
                }
                // display id wf-form-Millions-Students-Form
                // hide class w-form-done and w-form-fail
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

            async clearSearch() {
                this.currentSearchText = '';
                this.currentPage = 0;
                
                try {
                    this.showLoading('Loading students...');
                    const data = await this.fetchMillionsStudents('', 0, this.limit);
                    const studentsList = data.data;
                    // For original list, use actual count from API
                    this.totalStudents = studentsList.length >= this.limit ? data.count : studentsList.length;
                    this.hideLoading();
                    this.displayStudentsList(studentsList);
                    this.displayPagination();
                } catch (error) {
                    console.error('Error clearing search:', error);
                    this.hideLoading();
                    this.displayError('Failed to load students');
                }
                
                // Clear search input
                const searchInput = document.getElementById('Search');
                if (searchInput) {
                    searchInput.value = '';
                }
            }

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

            hideLoading() {
                // Loading will be hidden when new content is displayed
                // This method is called before displaying new content
            }

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

                // Form submission
                const emailForm = document.getElementById('email-form');
                if (emailForm) {
                    emailForm.addEventListener('submit', (e) => {
                        e.preventDefault();
                        this.handleModalSubmit();
                    });
                }
            }

            async handleModalSubmit() {
                try {
                    const amountInput = document.getElementById('field');
                    const descriptionField = document.getElementById('Description');
                    
                    if (!amountInput || !amountInput.value) {
                        alert('Please enter an amount');
                        return;
                    }
                    if(descriptionField && !descriptionField.value){
                        descriptionField.value = '';
                        descriptionField.placeholder = 'Enter description';  
                    }

                    const amount = parseFloat(amountInput.value);
                    if (isNaN(amount) || amount <= 0) {
                        alert('Please enter a valid positive amount');
                        return;
                    }

                    // Determine the amount to send (positive for add, negative for delete)
                    const apiAmount = this.currentAction === 'add' ? this.$currentStudent.amount + amount : this.$currentStudent.amount -  amount;

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
                        const studentIndex = this.currentStudentsList.findIndex(student => student._id === this.currentStudentId);
                        if (studentIndex !== -1) {
                            this.currentStudentsList[studentIndex].amount = apiAmount;
                        }
                        
                        // Close modal
                        this.closeModal();
                        
                        // Show success message
                        const action = this.currentAction === 'add' ? 'added' : 'removed';
                        //alert(`Successfully ${action} $${amount} for student`);
                        
                        // Update the display immediately with the new data
                        this.displayStudentsList(this.currentStudentsList);
                        
                        // Also refresh from server to ensure consistency
                        this.render();
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

            findStudentById(studentId) {
                return this.currentStudentsList.find(student => student._id === studentId);
            }
        }
  


/*

Purpose: Trial class detail page handler that displays trial class information and handles registration. Manages appointment types, student lists, attendance tracking, and notes.

Brief Logic: Fetches trial class appointment types from API with pagination, displays appointment type list, shows students for selected appointment type, handles attendance marking and notes, manages pagination for appointment types and students, and processes attendance updates through API.

Are there any dependent JS files: No

*/
class TrialClassDetails {
    currentAppointmentType = null;
    currentPage = 0;
    limit = 5; // Number of appointment types per page
    totalAppointmentTypes = 0;
    currentStudentsList = [];
    // Local variable to track attendance changes
    localAttendanceChanges = new Map(); // Map<studentId, boolean>
    // Store original attendance states to compare against
    originalAttendanceStates = new Map(); // Map<studentId, boolean>
    // Store appointment type states to restore when switching back
    appointmentTypeStates = new Map(); // Map<appointmentTypeKey, {students: [], originalStates: Map}>

    /**
     * Constructor for TrialClassDetails class
     * @param {Object} data - Configuration object containing API base URL and member ID
     */
    constructor(data) {
        this.data = data;
        this.noRecordDiv = document.querySelector('.no-record-div');
        this.appointmentTypeListDiv = document.querySelector('[data-trial-class-details="appointmentTypeList"]');
        this.studentListDiv = document.querySelector('[data-trial-class-details="trialClassStudentList"]');
        // element for handling api responce message message
        this.noRecordAPIDiv = document.querySelector('[data-container="no-record-found"]');
        this.spinner = document.getElementById("half-circle-spinner");
        this.portalInfoWrapper = document.querySelector('.portal-info-wrapper');

        this.render();
        this.setupEventListeners();
    }

    /**
     * Renders the initial appointment types list
     * Fetches data from API and displays it on the page
     */
    async render() {
        if (this.portalInfoWrapper) {
            this.portalInfoWrapper.style.display = "none";
        }
        if (this.spinner) {
            this.spinner.style.display = "block";
        }
        try {
            this.showLoading('Loading trial class details...');
            const data = await this.fetchTrialClassDetails(this.currentPage * this.limit, this.limit);

            if (data.data && data.data.length > 0) {
                this.totalAppointmentTypes = data.count || data.data.length;
                this.displayAppointmentTypes(data.data);
                this.displayPagination();
                // Select first appointment type by default
                this.selectAppointmentType(data.data[0]);
            } else {
                this.showNoRecordsMessage('No trial class appointments found');
            }
            this.portalInfoWrapper.style.display = "block";
            this.spinner.style.display = "none";
        } catch (error) {
            this.portalInfoWrapper.style.display = "none";
            this.noRecordAPIDiv.style.display = "block";
            this.spinner.style.display = "none";
            console.error('Error rendering trial class details:', error);
            this.displayError('Failed to load trial class details');
        }
    }

    /**
     * Fetches trial class details from the API
     * @returns {Promise<Object>} Promise resolving to API response data
     */
    async fetchTrialClassDetails(offset = 0, limit = 5) {
        try {
            const url = `${this.data.apiBaseURL}getTrialClassDetails/${this.data.memberId}?offset=${offset}&limit=${limit}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching trial class details:', error);
            throw error;
        }
    }

    /**
     * Updates trial class notes and attendance via POST API
     * @param {Object} data - Object containing memberId, notes (optional), trialClassId (optional), trialClassAttendance (optional)
     * @returns {Promise<boolean>} Promise resolving to success status
     */
    async updateTrialClass(data) {
        try {
            const url = `${this.data.apiBaseURL}updateTrialClass`;

            // Log the data being sent for debugging
            console.log('updateTrialClass API call:', {
                url: url,
                method: 'POST',
                data: data
            });

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('updateTrialClass API response:', result);
            return result.message;
        } catch (error) {
            console.error('Error updating trial class:', error);
            throw error;
        }
    }

    /**
     * Displays the list of appointment types in the UI
     * @param {Array} appointmentTypes - Array of appointment type objects to display
     */
    displayAppointmentTypes(appointmentTypes) {
        if (!this.appointmentTypeListDiv) {
            console.error('Appointment type list container not found');
            return;
        }

        // Clear existing content
        this.appointmentTypeListDiv.innerHTML = '';

        if (!appointmentTypes || appointmentTypes.length === 0) {
            this.showNoRecordsMessage('No appointment types found');
            return;
        }

        // Hide no records message
        this.hideNoRecordsMessage();

        // Create appointment type rows
        appointmentTypes.forEach((appointmentType, index) => {
            const appointmentTypeRow = this.createAppointmentTypeRow(appointmentType, index);
            this.appointmentTypeListDiv.appendChild(appointmentTypeRow);
        });
    }

    /**
     * Creates a DOM element for a single appointment type row
     * @param {Object} appointmentType - Appointment type object
     * @param {number} index - Index of the appointment type
     * @returns {HTMLElement} DOM element representing the appointment type row
     */
    createAppointmentTypeRow(appointmentType, index) {
        const row = document.createElement('div');
        row.className = 'trial-class-details-row-block';
        row.setAttribute('data-appointment-index', index);
        row.setAttribute('data-appointment-type', appointmentType.appointmentType);
        row.setAttribute('data-scheduled-date', appointmentType.scheduledDate);
        row.setAttribute('data-scheduled-time', appointmentType.scheduledTime);

        const dateTime = `${appointmentType.scheduledDate} at ${appointmentType.scheduledTime}`;
        const studentCount = appointmentType.appointments ? appointmentType.appointments.length : 0;

        row.innerHTML = `
    <div class="trail-class-details-row-text">
        ${appointmentType.appointmentType}
        <br><small style="color: #666; font-size: 12px;">${dateTime} (${studentCount} students)</small>
    </div>
`;

        // Add click event listener
        row.addEventListener('click', () => {
            this.selectAppointmentType(appointmentType);
        });

        return row;
    }

    /**
     * Selects an appointment type and displays its students
     * @param {Object} appointmentType - The appointment type to select
     */
    async selectAppointmentType(appointmentType) {
        // Save current state before switching (if there's a current appointment type)
        if (this.currentAppointmentType) {
            const currentKey = this.getAppointmentTypeKey(this.currentAppointmentType);
            const currentState = {
                students: [...this.currentStudentsList],
                originalStates: new Map(this.originalAttendanceStates),
                localChanges: new Map(this.localAttendanceChanges)
            };
            this.appointmentTypeStates.set(currentKey, currentState);
            console.log('Saved state for appointment type:', currentKey, currentState);
        }

        // Remove active class from all appointment type rows
        const allRows = this.appointmentTypeListDiv.querySelectorAll('.trial-class-details-row-block');
        allRows.forEach(row => row.classList.remove('selected'));

        // Add active class to selected row based on appointmentType, scheduledDate, and scheduledTime
        const selectedRow = this.appointmentTypeListDiv.querySelector(
            `[data-appointment-type="${appointmentType.appointmentType}"][data-scheduled-date="${appointmentType.scheduledDate}"][data-scheduled-time="${appointmentType.scheduledTime}"]`
        );
        if (selectedRow) {
            selectedRow.classList.add('selected');
        }

        this.currentAppointmentType = appointmentType;

        // Check if we have a saved state for this appointment type
        const appointmentKey = this.getAppointmentTypeKey(appointmentType);
        const savedState = this.appointmentTypeStates.get(appointmentKey);

        if (savedState) {
            // Restore the saved state
            console.log('Restoring saved state for appointment type:', appointmentKey);
            this.currentStudentsList = savedState.students;
            this.originalAttendanceStates = new Map(savedState.originalStates);
            this.localAttendanceChanges = new Map(savedState.localChanges);

            // Display the restored state
            this.displayStudentsList(this.currentStudentsList, true);
        } else {
            // No saved state, load fresh data
            console.log('No saved state found, loading fresh data for appointment type:', appointmentKey);

            // Clear local attendance changes for new appointment type
            this.localAttendanceChanges.clear();
            this.originalAttendanceStates.clear();

            if (appointmentType.appointments && appointmentType.appointments.length > 0) {
                this.displayStudentsList(appointmentType.appointments);
            } else {
                this.showNoStudentsMessage('No students found for this appointment type');
            }
        }
    }

    /**
* Displays the list of students for the selected appointment type
* @param {Array} studentsList - Array of student objects to display
* @param {boolean} preserveOriginalStates - Whether to preserve existing original states (default: false)
*/
    displayStudentsList(studentsList, preserveOriginalStates = false) {
        if (!this.studentListDiv) {
            console.error('Student list container not found');
            return;
        }

        // Store current students list for reference
        this.currentStudentsList = studentsList || [];

        // Store original attendance states for comparison (only if not preserving)
        if (!preserveOriginalStates) {
            this.originalAttendanceStates.clear();
            studentsList.forEach(student => {
                this.originalAttendanceStates.set(student._id, student.attended);
            });
            console.log('Stored original attendance states:', this.originalAttendanceStates);
        }

        // Clear existing content
        this.studentListDiv.innerHTML = '';

        if (!studentsList || studentsList.length === 0) {
            this.showNoStudentsMessage('No students found for this appointment type');
            return;
        }

        // Hide no records message
        this.hideNoRecordsMessage();

        // Show students list container
        this.studentListDiv.style.display = 'block';

        // Display all students (no pagination for students)
        studentsList.forEach(student => {
            const studentRow = this.createStudentRow(student);
            this.studentListDiv.appendChild(studentRow);
        });

        // Update the Mark Attendance button visibility after displaying students
        this.updateMarkAttendanceButtonVisibility();
    }

    /**
     * Creates a DOM element for a single student row
     * @param {Object} student - Student object containing name, email, attended, and _id
     * @returns {HTMLElement} DOM element representing the student row
     */

     createStudentRow(student) {
                const row = document.createElement('div');
                row.className = `trial-class-details-row-grid ${student.attended ? 'checked-attendance-bg-bluish-white' : ''}`;
                row.setAttribute('data-student-id', student._id);

                const attendanceIcon = student.attended
                    ? 'https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/682ecd5b8bc5ccc9aff51d85_checked-icon.svg'
                    : 'https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/682b19d6917e60cb04ec4624_Rectangle%204630.svg';

                const attendanceClass = student.attended ? 'attendance-checked' : 'attendance-uncheck';

                // Determine button text based on whether notes exist
                const notesButtonText = student.notes && student.notes.trim() ? 'Update Notes' : 'Add Notes';

                row.innerHTML = `
                <div>
                    <div data-parent="parent-name" class="trail-class-details-row-text">
                        ${student.parentName || 'N/A'}
                    </div>
                    <div data-parent="parent-email" class="trail-class-details-row-email-text">
                        ${student.parentEmail || 'N/A'}
                    </div>
                </div>

                <div>
                    <div data-parent="student-name" class="trail-class-details-row-text">
                        ${student.studentName || 'N/A'}
                    </div>
                    <div data-parent="student-email" class="trail-class-details-row-email-text">
                        ${student.studentEmail || 'N/A'}
                    </div>
                </div>
                <img src="${attendanceIcon}" 
                    loading="lazy" 
                    alt="" 
                    class="${attendanceClass}"
                    data-student-id="${student._id}"
                    data-action="toggle-attendance">
                <a href="#" 
                class="button wine-red add-notes w-button"
                data-student-id="${student._id}"
                data-action="add-notes">${notesButtonText}</a>
            `;

                // Add event listeners
                const attendanceToggle = row.querySelector('[data-action="toggle-attendance"]');
                const addNotesButton = row.querySelector('[data-action="add-notes"]');

                if (attendanceToggle) {
                    attendanceToggle.addEventListener('click', () => {
                        this.toggleAttendance(student._id);
                    });
                }

                if (addNotesButton) {
                    addNotesButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.addNotes(student._id);
                    });
                }

                return row;
            }


    /**
     * Toggles attendance for a student
     * @param {string} studentId - ID of the student to toggle attendance for
     */
    async toggleAttendance(studentId) {
        try {
            // Find the student in current list
            const student = this.currentStudentsList.find(s => s._id === studentId);
            if (!student) {
                console.error('Student not found');
                return;
            }

            console.log('Toggling attendance for student:', student.studentName, 'Current attended:', student.attended);

            // Get the original attendance state (before any local changes)
            const originalAttendance = this.getOriginalAttendanceState(studentId);
            console.log('Original attendance state:', originalAttendance);

            // Toggle attendance locally
            student.attended = !student.attended;

            // Check if the new state matches the original state
            if (student.attended === originalAttendance) {
                // If we're back to the original state, remove from local changes
                this.localAttendanceChanges.delete(studentId);
                console.log('Removed from local changes - back to original state');
            } else {
                // If we're different from original state, add to local changes
                this.localAttendanceChanges.set(studentId, student.attended);
                console.log('Added to local changes - different from original state');
            }

            console.log('After toggle - attended:', student.attended);
            console.log('Local attendance changes:', this.localAttendanceChanges);

            // Update the display immediately (preserve original states)
            this.displayStudentsList(this.currentStudentsList, true);

            // Update the Mark Attendance button visibility based on local changes
            this.updateMarkAttendanceButtonVisibility();

            // TODO: Call API to update attendance on server
            // await this.updateStudentAttendance(studentId, student.attended);

        } catch (error) {
            console.error('Error toggling attendance:', error);
            //alert('Failed to update attendance. Please try again.');
        }
    }

    /**
* Gets the original attendance state for a student (before any local changes)
* @param {string} studentId - ID of the student
* @returns {boolean} Original attendance state
*/
    getOriginalAttendanceState(studentId) {
        return this.originalAttendanceStates.get(studentId) || false;
    }

    /**
     * Generates a unique key for an appointment type
     * @param {Object} appointmentType - The appointment type object
     * @returns {string} Unique key for the appointment type
     */
    getAppointmentTypeKey(appointmentType) {
        return `${appointmentType.appointmentType}_${appointmentType.scheduledDate}_${appointmentType.scheduledTime}`;
    }

    /**
     * Updates the visibility of the Mark Attendance button based on selected checkboxes
     */
    updateMarkAttendanceButtonVisibility() {
        const markAttendanceButton = document.querySelector('[data-action="update-attendance"]');
        if (!markAttendanceButton) {
            console.error('Mark Attendance button not found');
            return;
        }

        // Check if there are any local attendance changes
        const hasLocalChanges = this.localAttendanceChanges.size > 0;

        console.log('Checking attendance visibility:');
        console.log('Local attendance changes:', this.localAttendanceChanges);
        console.log('Has local changes:', hasLocalChanges);
        console.log('Number of local changes:', this.localAttendanceChanges.size);

        if (hasLocalChanges) {
            markAttendanceButton.style.display = 'inline-block';
            console.log('Mark Attendance button: SHOWING (due to local changes)');
        } else {
            markAttendanceButton.style.display = 'none';
            console.log('Mark Attendance button: HIDING (no local changes)');
        }
    }

    /**
* Handles the Mark Attendance button click
*/
    async handleMarkAttendance() {
        try {
            if (!this.currentStudentsList || this.currentStudentsList.length === 0) {
                //alert('No students to update attendance for');
                return;
            }

            // Get students with local attendance changes
            const studentsWithAttendance = [];
            this.localAttendanceChanges.forEach((attended, studentId) => {
                const student = this.currentStudentsList.find(s => s._id === studentId);
                if (student) {
                    studentsWithAttendance.push({
                        _id: studentId,
                        attended: attended
                    });
                }
            });

            if (studentsWithAttendance.length === 0) {
                //alert('No students have attendance marked');
                return;
            }

            // Show loading state on button
            const markAttendanceButton = document.querySelector('[data-action="update-attendance"]');
            if (markAttendanceButton) {
                const originalText = markAttendanceButton.textContent;
                markAttendanceButton.textContent = 'Updating...';
                markAttendanceButton.disabled = true;
                markAttendanceButton.style.opacity = '0.7';
                markAttendanceButton.style.cursor = 'not-allowed';
            }

            // Prepare attendance data for API
            const trialClassAttendance = studentsWithAttendance.map(student => ({
                _id: student._id,
                attended: student.attended
            }));

            // Call API to update attendance
            const success = await this.updateTrialClass({
                memberId: this.data.memberId,
                trialClassAttendance: trialClassAttendance
            });

            if (success) {
                //alert(`Attendance updated for ${studentsWithAttendance.length} student(s)`);
                // Clear local attendance changes after successful API call
                this.localAttendanceChanges.clear();
                console.log('Local attendance changes cleared after successful API call');

                // Update local student objects to reflect the changes
                studentsWithAttendance.forEach(attendanceData => {
                    const student = this.currentStudentsList.find(s => s._id === attendanceData._id);
                    if (student) {
                        student.attended = attendanceData.attended;
                    }
                });

                // Update original states to reflect the new saved state
                studentsWithAttendance.forEach(attendanceData => {
                    this.originalAttendanceStates.set(attendanceData._id, attendanceData.attended);
                });

                // Update the display to reflect the changes (preserve original states)
                this.displayStudentsList(this.currentStudentsList, true);

                // Update the Mark Attendance button visibility after API update
                this.updateMarkAttendanceButtonVisibility();

                // Save the updated state
                if (this.currentAppointmentType) {
                    const currentKey = this.getAppointmentTypeKey(this.currentAppointmentType);
                    const currentState = {
                        students: [...this.currentStudentsList],
                        originalStates: new Map(this.originalAttendanceStates),
                        localChanges: new Map(this.localAttendanceChanges)
                    };
                    this.appointmentTypeStates.set(currentKey, currentState);
                    console.log('Updated saved state after API call for appointment type:', currentKey);
                }
            }
        } catch (error) {
            console.error('Error updating attendance:', error);
            //alert('Failed to update attendance. Please try again.');
        } finally {
            // Restore button state regardless of success or failure
            const markAttendanceButton = document.querySelector('[data-action="update-attendance"]');
            if (markAttendanceButton) {
                markAttendanceButton.textContent = 'Mark Attendance';
                markAttendanceButton.disabled = false;
                markAttendanceButton.style.opacity = '1';
                markAttendanceButton.style.cursor = 'pointer';
            }
        }
    }

    /**
     * Opens modal for adding notes to a student
     * @param {string} studentId - ID of the student to add notes for
     */
    addNotes(studentId) {
        const student = this.currentStudentsList.find(s => s._id === studentId);
        if (!student) {
            return;
        }

        console.log('Opening notes modal for student:', student);
        console.log('Current student notes:', student.notes);

        // Get the existing modal
        const modal = document.getElementById('trial-class-add-notes-modal');
        if (!modal) {
            console.error('Modal not found');
            return;
        }

        // Update modal title based on whether notes exist
        const hasExistingNotes = student.notes && student.notes.trim();
        const modalTitle = hasExistingNotes ? `Update Notes for ${student.studentName}` : `Add Notes for ${student.studentName}`;
        const modalTitleElement = modal.querySelector('.poppins-heading');
        if (modalTitleElement) {
            modalTitleElement.textContent = modalTitle;
        }

        // Update textarea with current notes
        const notesTextarea = modal.querySelector('#notesText');
        if (notesTextarea) {
            notesTextarea.value = student.notes || '';
            notesTextarea.placeholder = 'Enter notes for this student...';
        }

        // Update save button text
        const saveBtn = modal.querySelector('#saveNotes');
        if (saveBtn) {
            const saveButtonText = hasExistingNotes ? 'Update Notes' : 'Save Notes';
            saveBtn.value = saveButtonText;
        }

        // Store current student ID for use in save function
        modal.setAttribute('data-current-student-id', studentId);

        // Show the modal
        this.showModal(modal);

        // Set up event listeners for the modal
        this.setupModalEventListeners(modal, student);
    }

    /**
     * Sets up event listeners for the notes modal
     * @param {HTMLElement} modal - The modal element
     * @param {Object} student - The student object
     */
    setupModalEventListeners(modal, student) {
        // Remove existing event listeners to prevent duplicates
        const saveBtn = modal.querySelector('#saveNotes');
        const closeBtn = modal.querySelector('#modal-close');
        const modalBg = modal.querySelector('#login-modal-bg');

        // Remove existing listeners
        if (saveBtn) {
            const newSaveBtn = saveBtn.cloneNode(true);
            saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        }

        // Add save button event listener
        const newSaveBtn = modal.querySelector('#saveNotes');
        if (newSaveBtn) {
            newSaveBtn.addEventListener('click', async (e) => {
                e.preventDefault();

                const notesTextarea = modal.querySelector('#notesText');
                const notes = notesTextarea.value.trim();
                const studentId = modal.getAttribute('data-current-student-id');

                // Show loading state on save button
                const originalSaveText = newSaveBtn.value;
                newSaveBtn.value = 'Updating...';
                newSaveBtn.disabled = true;
                newSaveBtn.style.opacity = '0.7';
                newSaveBtn.style.cursor = 'not-allowed';

                try {
                    // Prepare the API call data with all required attributes
                    const apiData = {
                        memberId: this.data.memberId,
                        notes: notes,
                        trialClassId: studentId
                    };

                    console.log('Sending notes update with data:', apiData);

                    const success = await this.updateTrialClass(apiData);

                    if (success) {
                        // Determine success message based on whether notes existed before
                        const hadExistingNotes = student.notes && student.notes.trim();
                        const successMessage = hadExistingNotes ? 'Notes updated successfully' : 'Notes saved successfully';
                        //alert(successMessage);

                        // Update the student object with new notes
                        student.notes = notes;

                        // Update the button text to reflect the change
                        const notesButton = document.querySelector(`[data-student-id="${student._id}"][data-action="add-notes"]`);
                        if (notesButton) {
                            notesButton.textContent = notes.trim() ? 'Update Notes' : 'Add Notes';
                        }

                        console.log('Updated student notes:', student.notes);
                    }

                    // Hide the modal
                    this.hideModal(modal);
                } catch (error) {
                    console.error('Error saving notes:', error);
                    //alert('Failed to save notes. Please try again.');
                } finally {
                    // Restore button state regardless of success or failure
                    newSaveBtn.value = originalSaveText;
                    newSaveBtn.disabled = false;
                    newSaveBtn.style.opacity = '1';
                    newSaveBtn.style.cursor = 'pointer';
                }
            });
        }

        // Add close button event listener
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideModal(modal);
            });
        }

        // Add modal background click event listener
        if (modalBg) {
            modalBg.addEventListener('click', () => {
                this.hideModal(modal);
            });
        }
    }

    /**
     * Displays pagination controls for navigating through student pages
     */
    displayPagination() {
        const totalPages = Math.ceil(this.totalAppointmentTypes / this.limit);
        console.log('Total appointment types:', this.totalAppointmentTypes, 'Limit:', this.limit, 'Total pages:', totalPages);

        // Get the existing pagination container
        const paginationContainer = document.querySelector('[data-trial-class-details="pagination"]');
        if (!paginationContainer) {
            console.error('Pagination container not found');
            return;
        }

        // Show pagination if we have more than one page
        if (totalPages <= 1) {
            console.log('No pagination needed - only one page or no appointment types');
            paginationContainer.innerHTML = '';
            return;
        }

        // Set styles for the pagination container
        paginationContainer.style.cssText = `
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    margin-top: 20px;
    padding: 10px;
    background-color: #f9f9f9;
    border-radius: 5px;
`;

        const pageNumbers = this.generatePageNumbers(totalPages);

        paginationContainer.innerHTML = `
    <div class="pagination-controls" style="display: flex; gap: 5px; align-items: center;">
        <button class="pagination-btn" data-page="${this.currentPage - 1}" data-action="prev"
                ${this.currentPage === 0 ? 'disabled' : ''} style="padding: 5px 10px; border: 1px solid #ccc; background: white; cursor: pointer;">
            &lt;
        </button>
        <div class="page-numbers" style="display: flex; gap: 5px;">
            ${pageNumbers}
        </div>
        <button class="pagination-btn" data-page="${this.currentPage + 1}" data-action="next"
                ${this.currentPage >= totalPages - 1 ? 'disabled' : ''} style="padding: 5px 10px; border: 1px solid #ccc; background: white; cursor: pointer;">
            &gt;
        </button>
    </div>
    <div class="pagination-info" style="margin-left: 20px; font-size: 14px; color: #666;">
        Page ${this.currentPage + 1} of ${totalPages} (${this.totalAppointmentTypes} total appointment types)
    </div>
`;

        console.log('Pagination added to existing container');

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
                pageNumbers.push('<span style="padding: 5px;">...</span>');
                pageNumbers.push(this.createPageButton(totalPages, currentPage === totalPages - 1));
            } else if (currentPage >= totalPages - 4) {
                // Near the end
                pageNumbers.push('<span style="padding: 5px;">...</span>');
                for (let i = totalPages - 4; i <= totalPages; i++) {
                    pageNumbers.push(this.createPageButton(i, currentPage === i - 1));
                }
            } else {
                // In the middle
                pageNumbers.push('<span style="padding: 5px;">...</span>');
                for (let i = currentPage; i <= currentPage + 2; i++) {
                    pageNumbers.push(this.createPageButton(i + 1, currentPage === i));
                }
                pageNumbers.push('<span style="padding: 5px;">...</span>');
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
            return `<button class="pagination-btn page-number active" disabled style="padding: 5px 10px; border: 1px solid #7c303e; background: #7c303e; color: white; cursor: default;">${pageNumber}</button>`;
        } else {
            return `<button class="pagination-btn page-number" data-page="${pageNumber - 1}" style="padding: 5px 10px; border: 1px solid #ccc; background: white; cursor: pointer;">${pageNumber}</button>`;
        }
    }

    /**
     * Navigates to a specific page and displays the corresponding student data
     * @param {number} page - Page number to navigate to (0-based)
     */
    async goToPage(page) {
        if (page < 0) return;

        this.currentPage = page;

        try {
            this.showLoading('Loading appointment types...');
            const data = await this.fetchTrialClassDetails(this.currentPage * this.limit, this.limit);

            if (data.data && data.data.length > 0) {
                this.displayAppointmentTypes(data.data);
                this.displayPagination();
                // Select first appointment type on the new page
                this.selectAppointmentType(data.data[0]);
            } else {
                this.showNoRecordsMessage('No appointment types found on this page');
            }
        } catch (error) {
            console.error('Error loading page:', error);
            this.displayError('Failed to load appointment types');
        }
    }

    /**
     * Shows a no records found message
     * @param {string} message - Message to display
     */
    showNoRecordsMessage(message = 'No records found') {
        if (this.noRecordDiv) {
            this.noRecordDiv.style.display = 'block';
            const messageElement = this.noRecordDiv.querySelector('.no-record');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }

        // Hide student list
        if (this.studentListDiv) {
            this.studentListDiv.style.display = 'none';
        }

        // Hide pagination
        const existingPagination = document.querySelector('[data-trial-class-details="pagination"]');
        if (existingPagination) {
            existingPagination.innerHTML = '';
        }
    }

    /**
     * Shows a no students found message
     * @param {string} message - Message to display
     */
    showNoStudentsMessage(message = 'No students found') {
        if (this.studentListDiv) {
            this.studentListDiv.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #666;">
            ${message}
        </div>
    `;
            this.studentListDiv.style.display = 'block';
        }

        // Hide pagination
        const existingPagination = document.querySelector('[data-trial-class-details="pagination"]');
        if (existingPagination) {
            existingPagination.innerHTML = '';
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

    /**
     * Displays an error message
     * @param {string} message - Error message to display
     */
    displayError(message) {
        if (this.studentListDiv) {
            this.studentListDiv.innerHTML = `
        <div style="text-align: center; color: red; padding: 20px;">
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
        if (this.studentListDiv) {
            this.studentListDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #7c303e; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <div style="margin-top: 10px; color: #666;">${message}</div>
        </div>
    `;
        }

        // Also show loading in appointment type list
        if (this.appointmentTypeListDiv) {
            this.appointmentTypeListDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #7c303e; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <div style="margin-top: 10px; color: #666;">${message}</div>
        </div>
    `;
        }
    }

    /**
     * Sets up all event listeners
     */
    setupEventListeners() {
        // Add CSS for selected state
        const style = document.createElement('style');
        style.textContent = `
    .trial-class-details-row-block.selected {
        background-color: #f0f0f0;
        border-left: 3px solid #7c303e;
    }
    .trial-class-details-row-block {
        cursor: pointer;
        transition: background-color 0.2s ease;
    }
    .trial-class-details-row-block:hover {
        background-color: #f5f5f5;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
        document.head.appendChild(style);

        // Add event listener for Mark Attendance button
        const markAttendanceButton = document.querySelector('[data-action="update-attendance"]');
        if (markAttendanceButton) {
            markAttendanceButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleMarkAttendance();
            });
        }

        // Initially hide the Mark Attendance button
        if (markAttendanceButton) {
            markAttendanceButton.style.display = 'none';
        }
    }
    showModal(modal) {
        if (modal) {
            modal.classList.add("show");
            modal.style.display = "flex";
        }
    }
    hideModal(modal) {
        if (modal) {
            modal.classList.remove("show");
            modal.style.display = "none";
        }
    }
}


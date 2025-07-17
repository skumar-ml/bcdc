 class AnnouncementUI {
        $announcements = [];
        $selectedOid = null;
        $searchTerm = '';
        $studentFilter = 'All Students';
        $tagsFilter = 'all categories';
        $readUnreadFilter = 'all status';
        constructor(data) {
            this.data = data;
            this.spinner = document.getElementById("half-circle-spinner");
            this.listDiv = document.querySelector('[data-announcements="list"]');
            this.detailsDiv = document.querySelector('[data-announcements="details"]');
            this.searchInput = document.getElementById('search');
            this.studentSelect = document.getElementById('student');
            this.tagsSelect = document.getElementById('tags');
            this.readUnreadSelect = document.getElementById('readUnread');
            if (this.searchInput) {
                this.searchInput.addEventListener('input', (e) => {
                    this.$searchTerm = e.target.value.toLowerCase();
                    this.renderAnnouncements();
                });
            }
            if (this.studentSelect) {
                this.studentSelect.addEventListener('change', (e) => {
                    this.$studentFilter = e.target.value;
                    this.renderAnnouncements();
                });
            }
            if (this.tagsSelect) {
                this.tagsSelect.addEventListener('change', (e) => {
                    this.$tagsFilter = e.target.value;
                    this.renderAnnouncements();
                });
            }
            if (this.readUnreadSelect) {
                this.readUnreadSelect.addEventListener('change', (e) => {
                    this.$readUnreadFilter = e.target.value;
                    this.renderAnnouncements();
                });
            }
            this.render();
            this.eventMarkAllAsRead();
        }
        async fetchData() {
            try {
                const response = await fetch(`${this.data.apiBaseURL}getAnnouncement/${this.data.memberId}`);
                if (!response.ok) throw new Error('Network response was not ok');

                const apiData = await response.json();
                return apiData;
            } catch (error) {
                console.error('Fetch error:', error);
            }
        }
        async render() {
            this.spinner.style.display = "block";
            // hide before API call data-announcements="list" and data-announcements="details"
            const announcementsList = document.querySelector('[data-announcements="list"]');
            const announcementsDetails = document.querySelector('[data-announcements="details"]');
            announcementsList.style.display = "none";
            announcementsDetails.style.display = "none";
            const apiData = await this.fetchData();
            this.spinner.style.display = "none";
            this.$announcements = apiData.announcement;
            this.$selectedOid = this.$announcements.length > 0 ? this.$announcements[0].oid : null;
            // Populate student and tags select boxes
            if (this.studentSelect) {
                // Get unique students by name+email
                const studentMap = new Map();
                this.$announcements.forEach(a => {
                    if (a.emailId && a.name) {
                        studentMap.set(a.emailId, a.name);
                    }
                });
                this.studentSelect.innerHTML = '<option value="All Students">All Students</option>' +
                    Array.from(studentMap.entries()).map(([email, name]) => `<option value="${email}">${name} (${email})</option>`).join('');
            }
            if (this.tagsSelect) {
                // Get unique tags
                const tagSet = new Set();
                this.$announcements.forEach(a => {
                    if (Array.isArray(a.tagNames)) {
                        a.tagNames.forEach(tag => tagSet.add(tag));
                    }
                });
                const tags = Array.from(tagSet);
                this.tagsSelect.innerHTML = '<option value="all categories">All Categories</option>' +
                    tags.map(t => `<option value="${t}">${t}</option>`).join('');
            }
            console.log(this.$announcements);
            this.renderAnnouncements();
            this.renderDetails();
            announcementsList.style.display = "block";
            announcementsDetails.style.display = "block";
        }

        renderAnnouncements() {
            // Filter announcements by search term, student, tags, and read/unread
            let filtered = this.$announcements;
            if (this.$searchTerm && this.$searchTerm.trim() !== '') {
                filtered = filtered.filter(a =>
                    (a.title && a.title.toLowerCase().includes(this.$searchTerm)) ||
                    (a.message && a.message.toLowerCase().includes(this.$searchTerm))
                );
            }
            if (this.$studentFilter && this.$studentFilter !== 'All Students') {
                filtered = filtered.filter(a =>
                    (a.emailId && a.emailId.toLowerCase().includes(this.$studentFilter.toLowerCase())) ||
                    (a.name && a.name.toLowerCase().includes(this.$studentFilter.toLowerCase()))
                );
            }
            if (this.$tagsFilter && this.$tagsFilter !== 'all categories') {
                filtered = filtered.filter(a => Array.isArray(a.tagNames) && a.tagNames.some(tag => tag.toLowerCase().includes(this.$tagsFilter.toLowerCase())));
            }
            if (this.$readUnreadFilter && this.$readUnreadFilter !== 'all status') {
                if (this.$readUnreadFilter === 'true') {
                    filtered = filtered.filter(a => a.is_read === true);
                } else if (this.$readUnreadFilter === 'false') {
                    filtered = filtered.filter(a => a.is_read === false);
                }
            }
            if (filtered.length === 0) {
                this.listDiv.innerHTML = '<div data-millions="no-record-div" class="no-record-div test"><p class="dm-sans no-record">No Record Found</p></div>';
                return;
            }
            this.listDiv.innerHTML = filtered.map(a => `
            <div class="announcement-feed-info ${a.is_read === false ? ' white-bluish-bg' : ''} ${this.$selectedOid === a.oid ? ' pink-bg' : ''} " data-oid="${a.oid}" style="cursor:pointer;">  
                <div class="announcement-feed-flex-wrapper no-margin-top">
                    <div class="announcement-feed-rounded-circle${a.is_read ? ' gray' : ''}"></div>
                    <p class="announcement-feed-title">${a.title}</p>
                    <p class="dm-sans announcement-feed-date">${this.formatDate(a.created_on)}</p>
                </div>
                <p class="dm-sans announcement-feed">${a.message}</p>
                <div>
                    <div class="announcement-feed-flex-wrapper">
                        ${a.tagNames.map(tag => `
                            <div class="announcement-feed-tags">
                                <p class="announcement-feed-tag-text">${tag}</p>
                            </div>
                        `).join('')}
                        <p class="dm-sans ${a.is_read ? 'announcement-feed-gray-text' : 'announcement-feed-blue-text'} mark-read-toggle" data-oid="${a.oid}" style="cursor:pointer; text-decoration:underline;">
                            ${a.is_read ? 'Mark as Unread' : 'Mark as Read'}
                        </p>
                    </div>
                    <div class="announcement-feed-flex-wrapper margin-0">
                        <p class="poppins-para announcement-text">${a.emailId}</p>
                    </div>
                </div>
            </div>
        `).join('');

            // Add click event for selecting announcement (details)
            this.listDiv.querySelectorAll('.announcement-feed-info').forEach(div => {
                div.addEventListener('click', (e) => {
                    // Prevent toggling read/unread if clicking the mark-read-toggle text
                    if (e.target.classList.contains('mark-read-toggle')) return;
                    const oid = div.getAttribute('data-oid');
                    this.$selectedOid = oid;
                    // If not already read, mark as read
                    const announcement = this.$announcements.find(a => a.oid === oid);
                    if (announcement && !announcement.is_read) {
                        announcement.is_read = true;
                        this.markAsRead(oid, true);
                    }
                    this.renderAnnouncements();
                    this.renderDetails();
                });
            });
            // Add click event for mark as read/unread text
            this.listDiv.querySelectorAll('.mark-read-toggle').forEach(text => {
                text.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const oid = text.getAttribute('data-oid');
                    const announcement = this.$announcements.find(a => a.oid === oid);
                    if (announcement) announcement.is_read = !announcement.is_read;
                    this.renderAnnouncements();
                    this.renderDetails();
                    this.markAsRead(oid, announcement.is_read);
                });
            });
        }

        renderDetails() {
            const a = this.$announcements.find(x => x.oid === this.$selectedOid);
            if (!a) {
                this.detailsDiv.innerHTML = '<div class="announcement-feed-assignment-info">Select an announcement to see details.</div>';
                return;
            }
            this.detailsDiv.innerHTML = `
            <div class="announcement-feed-flex-wrapper assignment">
                <p class="portal-node-title announcement">${a.title}</p>
                <div class="announcement-feed-flex-wrapper tags">
                    ${a.tagNames.map(tag => `
                        <div class="announcement-feed-tags">
                            <p class="announcement-feed-tag-text">${tag}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="announcement-feed-assignment-info">
                <div class="announcement-flex-wrapper assignment">
                    <p class="dm-sans announcement-text"><span class="bold-text">To: &nbsp;</span>${a.emailId}</p>
                    <p class="dm-sans announcement-text-small">${new Date(a.created_on).toLocaleString()}</p>
                </div>
                <div class="announcement-feed-assignment-inner-div">
                    <p class="dm-sans text-black">${a.message}</p>
                </div>
            </div>
        `;
        }

        async markAsRead(oid, isRead) {
            try {
                await fetch(`${this.data.apiBaseURL}isReadAnnouncement`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ objectId: oid, markAsRead: isRead })
                });
                // Update local state (already done in click handler)
            } catch (e) {
                console.error('Failed to mark as read', e);
            }
        }

        async markAllAsRead() {
            // Update all local announcements
            this.$announcements.forEach(a => a.is_read = true);
            this.renderAnnouncements();
            this.renderDetails();
            // Call API
            try {
                await fetch(`${this.data.apiBaseURL}isReadAnnouncement`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ readAll: true, accountEmail: this.data.accountEmail })
                });
            } catch (e) {
                console.error('Failed to mark all as read', e);
            }
        }
        eventMarkAllAsRead() {
            const markAllBtn = document.querySelector('.mark-all-read');
            if (markAllBtn) {
                markAllBtn.addEventListener('click', () => {
                    this.markAllAsRead();
                });
            }
        }
        formatDate(dateStr) {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        }
    }

/*

Purpose: Sidebar navigation component for portal menu and navigation controls. Manages sidebar links, referrals access control, and announcement count updates.

Brief Logic: Checks referrals access based on localStorage and API data, shows/hides referral links accordingly, updates all portal links with test parameters if present, fetches announcements and updates count badge, and manages sidebar menu visibility.

Are there any dependent JS files: No

*/
class Sidebar {
  // Initializes the Sidebar instance
  constructor(data) {
    this.data = data;
    this.init();
    this.updateAllPortalLinks();
    // update count in sidebar
    this.fetchAnnouncements();
  }
  // Fetches data from the specified API endpoint
  async fetchData(endPoint) {
    try {
      const response = await fetch(
        `${this.data.baseUrl}${endPoint}/${this.data.memberId}`
      );
      if (!response.ok) throw new Error("Network response was not ok");

      const apiData = await response.json();
      return apiData;
    } catch (error) {
      console.error("Fetch error:", error);
    }
  }
  // Initializes sidebar access checks
  init() {
    // add condition url doesn't contain "members"
    if (!window.location.href.includes("dashboard")) {
      this.checkReferralsAccess();
    } else if (!window.location.href.includes("dashboard")) {
      this.checkOtherAccess();
    }
  }
  // Returns true when a student has an active current session
  studentHasReferralAccess(studentData) {
    return Array.isArray(studentData?.currentSession) && studentData.currentSession.length > 0;
  }
  // Shows or hides referral links in the sidebar
  setReferralsLinksVisibility(visible) {
    document.querySelectorAll('[sidebar-menu="referrals"]').forEach((referralsLink) => {
      referralsLink.style.display = visible ? "flex" : "none";
    });
  }
  // Checks and controls access to referral links
  checkReferralsAccess() {
    const hasReferralSession = JSON.parse(
      localStorage.getItem("hasReferralSession")
    );
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    if (
      hasReferralSession &&
      hasReferralSession.hasCurrentSession &&
      hasReferralSession.memberId === this.data.memberId &&
      new Date(hasReferralSession.currentDateTime) > new Date(oneHourAgo)
    ) {
      this.setReferralsLinksVisibility(true);
      return;
    }

    this.fetchData("getPortalDetail").then((data) => {
      const currentDateTime = new Date().toISOString();
      if (!data || data === "No data Found" || !Array.isArray(data) || data.length === 0) {
        this.setReferralsLinksVisibility(false);
        localStorage.setItem(
          "hasReferralSession",
          JSON.stringify({ hasCurrentSession: false, currentDateTime, memberId: this.data.memberId })
        );
        return;
      }

      let hasReferralAccess = false;
      data.forEach((studentObj) => {
        const studentName = Object.keys(studentObj)[0];
        const studentData = studentObj[studentName];
        if (this.studentHasReferralAccess(studentData)) {
          hasReferralAccess = true;
        }
      });

      this.setReferralsLinksVisibility(hasReferralAccess);
      localStorage.setItem(
        "hasReferralSession",
        JSON.stringify({ hasCurrentSession: hasReferralAccess, currentDateTime, memberId: this.data.memberId })
      );
    });
  }
  // Updates all portal links with test parameters if present
  updateAllPortalLinks() {
    const urlParams = new URLSearchParams(window.location.search);
    const testMemberId = urlParams.get('testMemberId');
    const testAccountEmail = urlParams.get('testAccountEmail');
    const testAccountType = urlParams.get('testAccountType');
    if(!testMemberId && !testAccountEmail && !testAccountType){
      return;
    }
    const allPortalLinks = document.querySelectorAll('a[href*="/portal/"]');
            
    allPortalLinks.forEach((link) => {
      const currentHref = link.getAttribute('href');
      
      // Skip if no href
      if (!currentHref) {
        return;
      }
      
      // Check if it's a portal URL (starts with /portal/ or contains /portal/)
      if (currentHref.startsWith('/portal/') || currentHref.includes('/portal/')) {
        try {
          // Create URL object
          const url = new URL(currentHref, window.location.origin);
          
          // Add or update testMemberId parameter
          url.searchParams.set('testMemberId', testMemberId);
          
          // Add or update testAccountEmail parameter
          url.searchParams.set('testAccountEmail', testAccountEmail);
          
          // Add or update testAccountType parameter
          url.searchParams.set('testAccountType', testAccountType);
          
          // Update the link
          link.setAttribute('href', url.pathname + url.search);
        } catch (error) {
          console.error('Error updating link:', error);
        }
      }
    });
  }

  // Fetches announcements and updates the count
  async fetchAnnouncements() {
      const response = await fetch(
          `${this.data.bTypeApiBaseURL}getAnnouncement/${this.data.memberId}`
      );
      if (!response.ok) {
          return [];
      }
      const data = await response.json();
      this.updateAnnouncement(data);
      return data;
  }
  // Updates the announcement count badge in the sidebar
  updateAnnouncement(announcementData) {
      const announcementLength = announcementData.announcement.filter(ann => !ann.is_read && ann.emailId === this.data.accountEmail).length;
      const announcementDiv = document.querySelectorAll('[data-announcements="counts"]');
      if (announcementDiv) {
          announcementDiv.forEach(div => {
              div.textContent = announcementLength;
              div.parentElement.style.display = 'block';
          });
      }
  }
}





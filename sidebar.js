/*

Purpose: Sidebar navigation component for portal menu and navigation controls. Manages sidebar links, referrals access control, and announcement count updates.

Brief Logic: Checks referrals access based on localStorage and API data, shows/hides referral links accordingly, updates all portal links with test parameters if present, fetches announcements and updates count badge, and manages sidebar menu visibility.

Are there any dependent JS files: No

*/
class Sidebar {
  constructor(data) {
    this.data = data;
    this.init();
    this.updateAllPortalLinks();
    // update count in sidebar
    this.fetchAnnouncements();
  }
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
  init() {
    // add condition url doesn't contain "members"
    if (!window.location.href.includes("dashboard")) {
      this.checkReferralsAccess();
    } else if (!window.location.href.includes("dashboard")) {
      this.checkOtherAccess();
    }
  }
  checkReferralsAccess() {
    // get hasReferralSession localstorage data and check for date should be > 1 hours and hasCurrentSession should false
    const hasReferralSession = JSON.parse(
      localStorage.getItem("hasReferralSession")
    );
    const currentDateTime = new Date().toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    if (
      hasReferralSession &&
      hasReferralSession.hasCurrentSession &&
      hasReferralSession.memberId === this.data.memberId &&
      new Date(hasReferralSession.currentDateTime) > new Date(oneHourAgo)
    ) {
      // if hasReferralSession is true and currentDateTime is less than 1 hour then show referrals links
      const referralsLinks = document.querySelectorAll(
        '[sidebar-menu="referrals"]'
      );
      referralsLinks.forEach((referralsLink) => {
        referralsLink.style.display = "flex";
      });
    } else {
      const referralsLinks = document.querySelectorAll(
        '[sidebar-menu="referrals"]'
      );
      this.fetchData("getPortalDetail").then((data) => {
        if (data) {
          const currentDateTime = new Date().toISOString();
          if (Array.isArray(data) && data.length > 0) {
            let hasCurrentSession = false;
            data.forEach((studentObj) => {
              const studentName = Object.keys(studentObj)[0];
              const studentData = studentObj[studentName];
              if (
                studentData.currentSession &&
                Array.isArray(studentData.currentSession) &&
                studentData.currentSession.length > 0
              ) {
                hasCurrentSession = true;
                // add in local storage hasCurrentSession and current date time json
                
                localStorage.setItem(
                  "hasReferralSession",
                  JSON.stringify({ hasCurrentSession, currentDateTime, memberId: this.data.memberId })
                );
              }
            });
            referralsLinks.forEach((referralsLink) => {
              referralsLink.style.display = hasCurrentSession ? "flex" : "none";
            });
            if (!hasCurrentSession) {
                localStorage.setItem(
                  "hasReferralSession",
                  JSON.stringify({ hasCurrentSession, currentDateTime })
                );
            }
          } else {
            referralsLinks.forEach((referralsLink) => {
              referralsLink.style.display = "none";
            });
          }
        } else {
          if (referralsLinks.length > 0) {
            referralsLinks.forEach((referralsLink) => {
              referralsLink.style.display = "none";
            });
          }
        }
      });
    }
  }
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

  // Fetch announcements and update UI
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
  // Update announcement count badge
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





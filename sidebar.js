class Sidebar {
  constructor(data) {
    this.data = data;
    this.init();
    this.updateAllPortalLinks();
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
    if(!testMemberId && !testAccountEmail){
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
          
          // Add or update testMemberId parameter if present
          if (testMemberId) {
            url.searchParams.set('testMemberId', testMemberId);
          }
          
          // Add or update testAccountEmail parameter if present
          if (testAccountEmail) {
            url.searchParams.set('testAccountEmail', testAccountEmail);
          }
          
          // Update the link
          link.setAttribute('href', url.pathname + url.search);
        } catch (error) {
          console.error('Error updating link:', error);
        }
      }
    });
  }
}



class Sidebar {
  constructor(data) {
    this.data = data;
    this.init();
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
    if (!window.location.href.includes("members")) {
      this.checkReferralsAccess();
    }
  }
  checkReferralsAccess() {
    const referralsLinks = document.querySelectorAll('[sidebar-menu="referrals"]');
    this.fetchData("getPortalDetail").then((data) => {
      if (data) {
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
            }
          });
          referralsLinks.forEach((referralsLink) => {
            referralsLink.style.display = hasCurrentSession ? "block" : "none";
          });
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


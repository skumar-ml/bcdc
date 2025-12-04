/*

Purpose: Displays a modal to prompt users to recover abandoned checkout carts. Validates cart age, program start dates, and respects user dismissal preferences before showing the modal. Also updates cart menu display with cart information.

Brief Logic: Checks localStorage or fetches cart data from API. Validates that cart is older than configured hours but less than 5 months, program hasn't started, and 7-day cooldown period has passed. If all conditions pass, displays modal and updates cart menu with program details.

Are there any dependent JS files: No

*/
class AbandonedCartModal {
  // Initializes the abandoned cart modal with data and sets up event listeners
  constructor(data) {
    this.data = data;
    this.baseUrl = data.baseUrl;
    this.memberId = data.memberId;
    this.modalId = data.modalId;
    this.modal = document.getElementById(this.modalId);
    this.locations = [{"locationId":1,"locationName":"Glen Rock", "slug": "glen-rock"},{"locationId":3,"locationName":"Online", "slug": "online"},{"locationId":2,"locationName":"Fort Lee", "slug": "fort-lee"},{"locationId":4,"locationName":"Livingston", "slug": "livingston"},{"locationId":5,"locationName":"Other", "slug": "other"}];
    this.closeButtons = this.modal?.querySelectorAll(".continue-browse, .close-abandoned");
    this.init();
  }

  // Sets up event listeners for modal close buttons and checks if modal should be displayed
  init() {
    if (this.modal && this.closeButtons) {
      this.closeButtons.forEach((button) => {
        button.addEventListener("click", () => {
          this.closeModal();
          this.setModelDisplay();
          
        });
      });
      this.checkAndDisplayModal();
    }
  }
  // Checks if a given date is within the past week
  isWithinAWeek(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    return date >= oneWeekAgo && date <= now;
  }
  // Validates if selling session has started based on cart creation date
  checkSellingSession(cartData){
        if(!cartData){
            return false;
        }
        var data = JSON.parse(cartData)
        if(!data){
            return false;
        }
        var is_selling_started = true;
        const createdOnDate = new Date(data.createdOn);
         // Condition 2.5: If createdOnDate is less than September 29th AND September 29th is greater than current date OR createdOnDate is greater than current date
         const currentYear = new Date().getFullYear();
         const sellingStartDate = new Date(currentYear, 8, 29); // Month is 0-indexed, so 8 = September
         const currentDate = new Date();
         if (createdOnDate < sellingStartDate && sellingStartDate <= currentDate) {
           localStorage.removeItem("checkOutData");
           is_selling_started = false;
         }
         return is_selling_started;
    }
  // Main method to check cart data and display modal if conditions are met
  checkAndDisplayModal() {
    var $this = this;
    if (
      window.location.pathname.includes("/cart/") ||
      window.location.pathname.includes("log-in")
    ) {
      return;
    }
    
    const cartData = localStorage.getItem("checkOutData");
    var is_selling_started = $this.checkSellingSession(cartData);
    if(!is_selling_started){
        return;
    }
    if (cartData) {
      $this.displayCartMenuData()
      const parsedCartData = JSON.parse(cartData);
      if (parsedCartData.createdOn) {
        $this.checkAndDisplayModals(parsedCartData).then((result) => { 
          $this.openModal();
          $this.addLinkTOViewCartBtn();
        }).catch((error) => {
          console.error("Error displaying modal:", error);
        });
      }
    }else {
      this.fetchCartDataFromAPI()
      .then((data) => {
        if (data.createdOn) {
          localStorage.setItem("checkOutData", JSON.stringify(data));
          $this.displayCartMenuData()
          return $this.checkAndDisplayModals(data);
        }else{
          return Promise.reject("No createdOn found in the response.");
        }
      }).then((result) => {
        $this.openModal();
        $this.addLinkTOViewCartBtn();
      }).catch((error) => {
        console.error("Error fetching cart data:", error);
      });
    }
  }
  // Validates cart age and cooldown period before displaying modal
  checkAndDisplayModals(data) {
    return new Promise((resolve, reject) => {
      const createdOnDate = new Date(data.createdOn);
      const sixHoursAgo = new Date(Date.now() - this.data.hour * 60 * 60 * 1000);
      // Condition 1: If abandoned cart happened less than 6 hours ago
      if (createdOnDate > sixHoursAgo) {
          reject(`Fetched cart data is less than ${this.data.hour} hours old, not displaying modal.`);
        return;
      }

      const fiveMonthsAgo = new Date();
      fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);

      // Condition 2: If abandoned cart happened 5 months ago
      if (createdOnDate < fiveMonthsAgo) {
        reject("Fetched cart data is older than 5 months, not displaying modal.");
        return;
      }
      
      // Condition 4: If user closes pop-up with “Continue Browsing” or cross button, show it again after 7 days
      const isAbandonedModalOpen = localStorage.getItem("isAbandonedModalOpen");
      if (isAbandonedModalOpen === "true") {
        const lastOpenedDate = new Date(localStorage.getItem("lastModalClosedDate"));
        const now = new Date();
        const sevenDaysLater = new Date(lastOpenedDate);
        sevenDaysLater.setDate(lastOpenedDate.getDate() + 7);

        if (now < sevenDaysLater) {
          reject("Modal was closed less than 7 days ago, not displaying modal.");
          return;
        }
      }

      // If all conditions pass, resolve to display the modal
      resolve("All conditions passed, displaying modal.");
    });
  }
  // Sets the modal display flag and last closed date in localStorage
  setModelDisplay() {
    localStorage.setItem("isAbandonedModalOpen", true);
    localStorage.setItem(
      "lastModalClosedDate",
      new Date().toISOString()
    );  
  }

  // Fetches cart data from API endpoint using member ID
  async fetchCartDataFromAPI() {
    try {
      const response = await fetch(
        `${this.baseUrl}` + "getCheckoutUrlByMemberId/" + this.memberId
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  }
  // Opens the abandoned cart modal by adding show class and setting display
  openModal() {
    if (this.modal) {
      this.modal.classList.add("show");
      this.modal.style.display = "flex";
    }
  }

  // Closes the abandoned cart modal by removing show class and hiding display
  closeModal() {
    if (this.modal) {
      this.modal.classList.remove("show");
      this.modal.style.display = "none";
    }
  }

  // Handles clicking outside the modal to close it
  handleOutsideClick(event) {
    if (event.target === this.modal) {
      this.closeModal();
    }
  }

  // Adds cart URL link to the view cart button based on stored cart data
  addLinkTOViewCartBtn() {
    const viewCartBtn = document.getElementById("view-cart-btn");
    const cartData = localStorage.getItem("checkOutData");
    // Check if cartData is not empty or null before parsing
    if (cartData) {
      const parsedCartData = JSON.parse(cartData);
      // Check if parsedCartData is not empty or null before using it
      if (parsedCartData && parsedCartData.levelId) {
        // Convert levelId to lower case and replace spaces with hyphens
        const baseUrl = window.location.origin;
        const levelId = parsedCartData.levelId.toLowerCase().replace(/\s+/g, '-');
        var cart_url = `${baseUrl}/programs/level-${levelId}?returnType=back`;
        viewCartBtn.href = cart_url;
      }
    }
    // Add event listener to viewCartBtn
  }
   // Displays cart information in the menu sidebar with program details and student name
   displayCartMenuData() {
    // get checkOutData from local storage
    const noRecordsDivs = document.querySelectorAll("[data-cart-menu='no-records-div']");
    const cartDataDivs = document.querySelectorAll("[data-cart-menu='cart-data-div']");
    const cartRedIcons = document.querySelectorAll("[data-cart-menu='red-icon']");
    if(!noRecordsDivs.length && !cartDataDivs.length) {
        console.error("No elements found with data-cart-menu attributes.");
        return;
    }  
    if (!localStorage.getItem("checkOutData")) {
        noRecordsDivs.forEach(div => div.style.display = "block");
        cartDataDivs.forEach(div => div.style.display = "none");
        return;
    }
    const checkOutData = JSON.parse(localStorage.getItem("checkOutData"));
    if (!checkOutData) {
        noRecordsDivs.forEach(div => div.style.display = "block");
        cartDataDivs.forEach(div => div.style.display = "none");
        return;
    }
    if (!(checkOutData.firstName || checkOutData.studentName) || !checkOutData.levelId) {
        noRecordsDivs.forEach(div => div.style.display = "block");
        cartDataDivs.forEach(div => div.style.display = "none");
        return;
    }
    // Display block cart red icons
    cartRedIcons.forEach(icon => { icon.style.display = "block"; });
    
    const programNameElements = document.querySelectorAll("[data-cart-menu='programName']")
    if(programNameElements.length > 0){
        programNameElements.forEach((element) => {
            element.innerHTML = (checkOutData.levelId != "competitivetrack")? "Level " + checkOutData.levelId : "Competitive Track";
        });
    }
    
    const programDateElements = document.querySelectorAll("[data-cart-menu='programDate']")
    if(programDateElements.length > 0){
        programDateElements.forEach((element) => {
            const locationId = checkOutData.locationId;
            const location = checkOutData.location;
            if(locationId) {
              const location = this.locations.find(loc => loc.locationId === locationId);
              if(location) {
                element.style.display = "block";
                element.innerHTML = location.locationName;
              } else {
                element.style.display = "none";
              }
            } else if(location) {
              const location = this.locations.find(loc => loc.slug === checkOutData.location);
              if(location) {
                element.style.display = "block";
                element.innerHTML = location.locationName;
              } else {
                element.style.display = "none";
              }
            }else {
              element.style.display = "none";
            }

        });
    }

    const studentNameElements = document.querySelectorAll("[data-cart-menu='studentName']")
    if(studentNameElements.length > 0){
        studentNameElements.forEach((element) => {
            if(checkOutData.lastName){
                element.innerHTML = checkOutData.firstName + " " + checkOutData.lastName;
            }else if(checkOutData.studentName){
                element.innerHTML = checkOutData.studentName;
            }else {
                element.innerHTML = checkOutData.firstName;
            }
            
        });
    }

    const baseUrl = window.location.origin;
    // convert levelId in lover case and remove spaces
    const levelId = checkOutData.levelId.toLowerCase().replace(/\s+/g, '-');
    var cart_url = `${baseUrl}/programs/level-${levelId}?returnType=back`;

    const checkoutLinkElements = document.querySelectorAll("[data-cart-menu='checkoutLink']")
    if(checkoutLinkElements.length > 0){
        checkoutLinkElements.forEach((element) => {
                element.href = cart_url;
        });
    }
    this.setCartAnimation();
    cartDataDivs.forEach(div => div.style.display = "block");
    noRecordsDivs.forEach(div => div.style.display = "none");
    
  }
  // Sets up a repeating animation for the cart icon to draw attention
  setCartAnimation(){
    const cartDiv = document.querySelector('.cart-icon-rounded-div');
    var intervalId = setInterval(() => {
      cartDiv.classList.add('wiggle');
      setTimeout(() => cartDiv.classList.remove('wiggle'), 700);
      // Clear the interval after 3 seconds
      //clearInterval(intervalId);
    }, 45000);
  }
}






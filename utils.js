/*

Purpose: Utility functions and helper methods used across BCDC scripts. Provides common functionality for modal management, credit data fetching, and API calls.

Brief Logic: Provides static methods for showing/closing modals, fetching credit balance data, handling Bergen credits modal interactions, and general utility functions for API calls and DOM manipulation.

Are there any dependent JS files: No

*/
class Utils {
    
    constructor() {
        console.log("Utils constructor");
    }

    /**
     * Fetches data from an API endpoint and returns the JSON response
     * @param {string} endpoint - The API endpoint to call
     * @param {string} apiBaseUrl - The base URL for the API
     * @returns {Promise<Object>} - The JSON data from the API response
     * @throws {Error} - Throws an error if the network request fails
     */
    async fetchData(endpoint, apiBaseUrl) {
        try {
            const response = await fetch(`${apiBaseUrl}${endpoint}`);
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error fetching data:", error);
            throw error;
        }
    }

    /**
     * Handles the Bergen credits modal functionality
     * Sets up event listeners for closing the modal and fetches credit data
     * @param {string} webflowMemberId - The Webflow member ID to fetch credits for
     * @returns {Promise<void>}
     */
    static async handleBergenCreditsModal(webflowMemberId) {
        // Validate webflowMemberId parameter
        if (!webflowMemberId || typeof webflowMemberId !== 'string') {
            console.error("Invalid webflowMemberId provided");
            return;
        }

        // Create an instance to access private methods
        const instance = new Utils();
        
        // Get the Bergen credits modal element
        const bergenCreditsModal = document.getElementById("bergen-credits-modal");
        
        if (bergenCreditsModal) {
            const bergenCreditsModalBg = document.getElementById("bergen-credits-modal-bg");
            const bergenCreditsModalClose = document.getElementById("bergen-credits-modal-close");
            
            // Add event listener to close modal when close button is clicked
            if (bergenCreditsModalClose) {
                bergenCreditsModalClose.addEventListener("click", () => {
                    Utils.close(bergenCreditsModal, bergenCreditsModalBg);
                });
            }
            
            // Add event listener to close modal when background is clicked
            if (bergenCreditsModalBg) {
                bergenCreditsModalBg.addEventListener("click", () => {
                    Utils.close(bergenCreditsModal, bergenCreditsModalBg);
                });
            }
        }

        // Fetch credits data using private method
        try {
            const creditsData = await instance.#getCreditsData(webflowMemberId);
            console.log("Credits data:", creditsData);
            
            // Update the UI with the fetched credit data
            if (creditsData) {
                Utils.updateCreditData(creditsData);
            }
        } catch (error) {
            console.error("Error fetching credits data:", error);
        }
    }
   
    static calculateDiscountPrice() {
        const creditPriceEl = document.querySelector('[data-credit="amount"]');
        const totalDepositPriceEl = document.querySelector(".current-price-gray");
        const totalCurrentPriceEl = document.querySelector(".current-price-text-red");

        if (!creditPriceEl || !totalDepositPriceEl || !totalCurrentPriceEl) return;

        // Credit amount
        const creditPrice = parseFloat(
            creditPriceEl.textContent.replace(/[^0-9.]/g, "")
        );
        console.log("Credit price:", creditPrice);

         if (isNaN(creditPrice)) creditPrice = 0;

        // Format & update UI for credit price
        creditPriceEl.textContent = `$${creditPrice.toFixed(2)}`;
        //console.log("Credit price:", creditPrice);

        // Total price amount
        const depositPrice = parseFloat(
            totalDepositPriceEl.textContent.replace(/[^0-9.]/g, "")
        );
        console.log("Total Deposit price:", depositPrice);

        // Discount
        var finalPrice = depositPrice - creditPrice;
        finalPrice = (finalPrice < 0) ? 0 : finalPrice;
        finalPrice = finalPrice.toFixed(2);

        // Set discounted value
        totalCurrentPriceEl.textContent = `$${finalPrice}`;
    }


    /**
     * Updates the credit amount displayed in the UI
     * Finds all elements with data-credit="amount" and updates their text content
     * @param {Object} creditsData - The credits data object containing creditBalance
     * @param {Object} creditsData.creditBalance - The credit balance object
     * @param {number} creditsData.creditBalance.creditBalance - The actual credit balance value
     */
    static updateCreditData(creditsData) {
        // Validate creditsData structure
        if (!creditsData || !creditsData.creditBalance || 
            creditsData.creditBalance.creditBalance === undefined || 
            creditsData.creditBalance.creditBalance === null) {
            console.error("Invalid credits data structure:", creditsData);
            return;
        }

        // Find all elements with the data-credit="amount" attribute
        const creditAmountElements = document.querySelectorAll("[data-credit='amount']");
        
        // Update each element's text content with the credit balance
        creditAmountElements.forEach(element => {
            element.textContent = creditsData.creditBalance.creditBalance;
        });

       /* requestAnimationFrame(() => {
            this.calculateDiscountPrice();
        });*/

         // Fix: allow Webflow to update totalDepositPrice first
        setTimeout(() => {
            this.calculateDiscountPrice();
        }, 50);

        }
    /**
     * Private method to fetch credits data from the API
     * @param {string} webflowMemberId - The Webflow member ID to fetch credits for
     * @returns {Promise<Object>} - The credits data from the API
     * @private
     */
    #getCreditsData(webflowMemberId) {
        const endpoint = `getCreditBalance/${webflowMemberId}`;
        const apiBaseUrl = "https://bkqmhuwcwj.execute-api.us-east-1.amazonaws.com/prod/camp/";
        return this.fetchData(endpoint, apiBaseUrl);
    }
    
    /**
     * Shows the Bergen credits modal
     * Displays the modal by adding the 'show' class and setting display to flex
     */
    static showBergenCreditsModal() {
        const bergenCreditsModal = document.getElementById("bergen-credits-modal");
        
        if (bergenCreditsModal) {
            const bergenCreditsModalBg = document.getElementById("bergen-credits-modal-bg");
            Utils.show(bergenCreditsModal, bergenCreditsModalBg);
        }
    }

    /**
     * Shows the Bergen credits modal and waits for user to choose whether to apply credits
     * @param {string} webflowMemberId - Optional Webflow member ID to fetch and display credit data
     * @returns {Promise<boolean>} - Returns true if user clicks "apply", false if user clicks "no"
     */
    static async waitForCreditApplicationChoice(webflowMemberId = null) {
        
        // If webflowMemberId is provided, check credits data before showing modal
        if (webflowMemberId) {
            try {
                const instance = new Utils();
                const creditsData = await instance.#getCreditsData(webflowMemberId);
                
                // Check if creditBalance is 0 or invalid
                const creditBalance = creditsData?.creditBalance?.creditBalance;
                if (!creditsData || 
                    !creditsData.creditBalance || 
                    creditBalance === undefined || 
                    creditBalance === null ||
                    creditBalance === 0 ||
                    Number(creditBalance) === 0) {
                    console.log("Credit balance is 0 or invalid, not showing modal");
                    return false;
                }
                
                // Update the UI with the fetched credit data
                Utils.updateCreditData(creditsData);
            } catch (error) {
                console.error("Error fetching credits data, not showing modal:", error);
                return false;
            }
        }
        
        Utils.showBergenCreditsModal();
        // Wait for user to click either "apply" or "no" button
        const applyCredit = await new Promise((resolve) => {
            // Query for buttons - may need to wait a moment for modal to render
            const applyButton = document.querySelector('[data-credit="apply"]');
            const noButton = document.querySelector('[data-credit="no"]');
            
            // If buttons don't exist, default to false and resolve immediately
            if (!applyButton && !noButton) {
                console.warn("Credit modal buttons not found, defaulting to applyCredit = false");
                resolve(false);
                return;
            }
            
            // Handler for apply button click
            const handleApply = () => {
                cleanup();
                resolve(true);
            };
            
            // Handler for no button click
            const handleNo = () => {
                cleanup();
                resolve(false);
            };
            
            // Cleanup function to remove event listeners
            const cleanup = () => {
                if (applyButton) {
                    applyButton.removeEventListener('click', handleApply);
                }
                if (noButton) {
                    noButton.removeEventListener('click', handleNo);
                }
            };
            
            // Add event listeners
            if (applyButton) {
                applyButton.addEventListener('click', handleApply);
            }
            if (noButton) {
                noButton.addEventListener('click', handleNo);
            }
        });
        
        // Close the modal after user makes a choice
        const bergenCreditsModal = document.getElementById("bergen-credits-modal");
        const bergenCreditsModalBg = document.getElementById("bergen-credits-modal-bg");
        if (bergenCreditsModal) {
            Utils.close(bergenCreditsModal, bergenCreditsModalBg);
        }
        
        return applyCredit;
    }

    /**
     * Shows a modal by adding the 'show' class and setting display to flex
     * @param {HTMLElement} modal - The modal element to show
     * @param {HTMLElement} modalBg - Optional background element for the modal
     */
    static show(modal, modalBg = "") {
        if (modal) {
            modal.classList.add('show');
            modal.style.display = 'flex';
            
            // Update aria-hidden attribute for accessibility
            if (modalBg) {
                modalBg.setAttribute('aria-hidden', 'false');
            }
        }
    }

    /**
     * Closes a modal by removing the 'show' class and setting display to none
     * @param {HTMLElement} modal - The modal element to close
     * @param {HTMLElement} modalBg - Optional background element for the modal
     */
    static close(modal, modalBg = "") {
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
            
            // Update aria-hidden attribute for accessibility
            if (modalBg) {
                modalBg.setAttribute('aria-hidden', 'true');
            }
        }
    }
}

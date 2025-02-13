/**
 *
 * @param name - HTML element name
 * @param className - HTML element class attribute
 * @param idName - HTML element id attribute
 */
function creEl(name, className, idName) {
	var el = document.createElement(name);
	if (className) {
		el.className = className;
	}
	if (idName) {
		el.setAttribute("id", idName);
	}
	return el;
}
class PaymentConfirmation {
    constructor(webFlowMemberId, apiBaseUrl, site_url) {
        this.apiBaseUrl = apiBaseUrl;
        this.site_url = site_url;
        this.webFlowMemberId = webFlowMemberId;
        this.programId = this.getURLParam('programId')
        this.sessionId = this.getURLParam('transactionID')
        this.cart_page_variant = localStorage.getItem('_ab_test_variant');
        this.memberUrl = site_url +"members/"+ webFlowMemberId;
        this.portal_home = site_url +"portal/home?from=success";
        if(!this.programId || !this.sessionId){
            return false;
        }
        this.eventHandlerForUpSellModal();
        this.displaySupplementaryProgram();
        
    }

    eventHandlerForUpSellModal() {
        let upSellModalBtn = document.getElementById('upsellModalBtn1')
        var $this = this;
        upSellModalBtn.addEventListener("click", function (event) {
            event.preventDefault()
            if($this.cart_page_variant != undefined){
                $this.displayUpSellModal();
            }else{
                window.location.href = $this.portal_home;
            }
            
        })

        // Showing up-sell modal content based on cart page modal variant
        if($this.cart_page_variant != undefined){
            let topicPrepUpSellModal = document.querySelector('.upsell-modal-container.topic-prep-week')
		    let tutoringUpSellModal = document.querySelector('.upsell-modal-container.tutoring')
            if($this.cart_page_variant == 2){
                tutoringUpSellModal.style.display = "none";
                topicPrepUpSellModal.style.display = "flex";
            }else{
                tutoringUpSellModal.style.display = "flex";
                topicPrepUpSellModal.style.display = "none";
            }
        }
    }
    
    displayUpSellModal() {
        const modal = document.getElementById('upsell-modal-1');
        var $this = this;
        const noThanks = document.getElementsByClassName('no-thanks');

        if (modal) {
            console.log('Showing modal on page load');
            $this.showUpSellModal(modal);
        } else {
            console.log('Modal element not found.');
        }
        if (noThanks) {
            for (let index = 0; index < noThanks.length; index++) {
                const element = noThanks[index];
                element.addEventListener('click', function () {
                    window.location.href = $this.portal_home;
                })

            }
        }
        const closeLinks = document.querySelectorAll('.upsell-close-link');
        if(closeLinks != undefined){
            closeLinks.forEach(function (closeLink) {
                console.log("SignIn Click Event Called");
                closeLink.addEventListener('click', function (event) {
                    event.preventDefault();
                    window.location.href = $this.portal_home;
                });
            });
        }
        //$this.buyNow()
    }

    showUpSellModal(modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
        document.querySelector('.upsell-modal-bg').setAttribute('aria-hidden', 'false');
    }

    hideUpSellModal(modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.querySelector('.upsell-modal-bg').removeAttribute('aria-hidden');
    }

    // Get API data with the help of endpoint
    async fetchData(endpoint) {
        try {
            const response = await fetch(`${this.apiBaseUrl}${endpoint}`);
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

    // async displaySupplementaryProgram() {
    //     let apiData = await this.fetchData("getSupplementaryProgram/" + this.programId);
    //     // Added in our Local Data
    //     this.$suppPro = apiData;
    //     let prep_week_searchText = "topic prep week";
    //     let tutoring_week_searchText = "5 hours";
    //     //let variant_type = _vwo_exp[_vwo_exp_ids[0]].combination_chosen;
    //     // let variant_type = this.memberData.variant_type
    //     // variant_type = variant_type != undefined || variant_type != null ? variant_type : "";
    //     let prep_week_data = apiData.filter(i => i.label.toLowerCase().includes(prep_week_searchText.toLowerCase()))
    //     let tutoring_data = apiData.filter(i => i.label.toLowerCase().includes(tutoring_week_searchText.toLowerCase()))
    //     this.updateUpSellModal(prep_week_data, tutoring_data)

    // }

    updateUpSellModal(prep_week_data, tutoring_data) {

        if (prep_week_data.length > 0) {
            var tpwAmount = document.getElementById('tpw-amount');
            if (tpwAmount != undefined) {
                tpwAmount.innerHTML = "$" + parseFloat(prep_week_data[0].amount).toFixed(2);
            }
            var tpwSaveAmount = document.getElementById('tpw-save-amount');
            if (tpwSaveAmount != undefined) {
                tpwSaveAmount.innerHTML = "$" + parseFloat(prep_week_data[0].disc_amount - prep_week_data[0].amount).toFixed(2)
            }
            var tpwDescAmount = document.getElementById('tpw-desc-amount');
            if (tpwDescAmount != undefined) {
                tpwDescAmount.innerHTML = "$" + parseFloat(prep_week_data[0].disc_amount).toFixed(2)
            }
            var upSellTpwProgramId = document.getElementById('upsellTpwProgranId');
            if (upSellTpwProgramId != undefined) {
                upSellTpwProgramId.setAttribute('programdetailid', prep_week_data[0].programDetailId)
                upSellTpwProgramId.setAttribute('programName', prep_week_data[0].label)
                upSellTpwProgramId.value = prep_week_data[0].amount
            }
            // For mobile upsellTpwProgranId-1
			var upsellTpwProgranIdMob = document.getElementById('upsellTpwProgranId-1');
			if (upsellTpwProgranIdMob != undefined) {
				upsellTpwProgranIdMob.setAttribute('programdetailid', prep_week_data[0].programDetailId)
                upsellTpwProgranIdMob.setAttribute('programName', prep_week_data[0].label)
                upsellTpwProgranIdMob.value = prep_week_data[0].amount
			}

            let tpwTitle = document.querySelector("[upsell-modal='tpw-title']")
			if(tpwTitle != undefined){
				tpwTitle.innerHTML = prep_week_data[0].label
			}
            let tpwReadMore = document.querySelectorAll("[upsell-modal='tpw_read-more']")
			if (tpwReadMore.length > 0) {
				tpwReadMore.forEach(read_more_link => {
					read_more_link.href = this.site_url + "topic-prep-week";
				})
			}
        }


        if (tutoring_data.length > 0) {
            var tutoringAmount = document.getElementById('tuto-amount');
            if (tutoringAmount != undefined) {
                tutoringAmount.innerHTML = "$" + parseFloat(tutoring_data[0].amount).toFixed(2);
            }
            var tutoringSaveAmount = document.getElementById('tuto-save-amount');
            if (tutoringSaveAmount != undefined) {
                tutoringSaveAmount.innerHTML = "$" + parseFloat(tutoring_data[0].disc_amount - tutoring_data[0].amount).toFixed(2)
            }
            var tutoringDescAmount = document.getElementById('tuto-desc-amount');
            if (tutoringDescAmount != undefined) {
                tutoringDescAmount.innerHTML = "$" + parseFloat(tutoring_data[0].disc_amount).toFixed(2)
            }
            var upSellTutoringProgramId = document.getElementById('upsellTutoProgranId');
            if (upSellTutoringProgramId != undefined) {
                upSellTutoringProgramId.setAttribute('programdetailid', tutoring_data[0].programDetailId)
                upSellTutoringProgramId.setAttribute('programName', tutoring_data[0].label)
                upSellTutoringProgramId.value = tutoring_data[0].amount
            }
            // Mobile div id upsellTutoProgranId-1
			var upsellTutoProgranIdMob = document.getElementById('upsellTutoProgranId-1');
			if (upsellTutoProgranIdMob != undefined) {
				upsellTutoProgranIdMob.setAttribute('programdetailid', tutoring_data[0].programDetailId)
                upsellTutoProgranIdMob.setAttribute('programName', tutoring_data[0].label)
                upsellTutoProgranIdMob.value = tutoring_data[0].amount
			}

            //tutoring title
			let tutoringTitle = document.querySelector("[upsell-modal='tutoring-title']")
			if(tutoringTitle != undefined){
				tutoringTitle.innerHTML = tutoring_data[0].label
			}

            let tutoringReadMore = document.querySelectorAll("[upsell-modal='tutoring_read-more']")
			if (tutoringReadMore.length > 0) {
				tutoringReadMore.forEach(read_more_link => {
					read_more_link.href = this.site_url + "debate-tutoring";
				})
			} 
        }
    }

    buyNow() {
        // Select all 'add-to-card' buttons
        const addToCartButtons = document.querySelectorAll(".add-to-card");
        var $this = this;
        addToCartButtons.forEach(button => {
            button.innerHTML = "Buy Now";
            button.addEventListener("click", function (event) {

                event.preventDefault(); // Prevent default link behavior

                // Find the parent container with the 'btn-reserve-spot' class
                const parent = button.closest(".button_add-to-card");

                if (parent) {
                    // Locate the child checkbox within the parent container
                    const checkbox = parent.querySelector(".suppCheckbox");

                    if (checkbox) {
                        // Toggle the checkbox state
                        checkbox.checked = !checkbox.checked;
                        if (checkbox.checked) {
                            let programId = checkbox.getAttribute('programdetailid'),
                                programName = checkbox.getAttribute('programName'),
                                amount = checkbox.value;
                            $this.getPaymentUrl(programId, programName, amount);
                        }
                        // Update the button text based on the checkbox state
                        button.textContent = checkbox.checked ? "Processing..." : "Buy Now";

                        // Optional: Add or remove a disabled class (if needed)
                        button.classList.toggle("disabled", checkbox.checked);
                    }
                }
            });
        });
    }

    getURLParam(name) {
        //transactionID
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        return urlParams.get(name);


    }
    getPaymentUrl(programId, programName, amount) {
        // Define the data to be sent in the POST request
        const data = {
            "sessionId": this.sessionId,
            "programId": parseInt(programId),
            "successUrl": this.site_url+"members/"+ this.webFlowMemberId+"?paymentType=Supplementary",
            "cancelUrl": this.site_url+"payment-confirmation?programId=" + encodeURIComponent(programId) + "&sessionId=" + encodeURIComponent(this.sessionId),
            "label": programName,
            "amount": parseFloat(amount*100)
        };
        // Create the POST request
        fetch(this.apiBaseUrl+"createCheckoutUrlForSupplementary", {
                method: 'POST', // Specify the method
                headers: {
                    'Content-Type': 'application/json' // Specify the content type
                },
                body: JSON.stringify(data) // Convert the data to a JSON string
            })
            .then(response => {
                if (!response.ok) {
                    // Handle the error response
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json(); // Parse the JSON from the response
            })
            .then(data => {
                console.log('Success:', data); // Handle the JSON data
                if (data.success) {
                    console.log(data.cardUrl);
                    window.location.href = data.cardUrl;

                }
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error); // Handle errors
            });
    }

    async displaySupplementaryProgram() {
		let container2 = document.getElementById("checkout-supplimentary-data-2");
		let swiperSlideWrapper = container2.querySelector('.you-might_slick-slider')
		
		// Get the container element
		let apiData = await this.fetchData("getSupplementaryProgram/" + this.programId);
		
		// Added in our Local Data
		this.$suppPro = apiData;
		let prep_week_searchText = "topic prep week";
		let tutoring_week_searchText = "5 hours";
		//let variant_type = _vwo_exp[_vwo_exp_ids[0]].combination_chosen;
		let variant_type = this.cart_page_variant;
		variant_type = variant_type != undefined || variant_type != null ? variant_type : "";
		let prep_week_data = apiData.filter(i => i.label.toLowerCase().includes(prep_week_searchText.toLowerCase()))
		let tutoring_data = apiData.filter(i => i.label.toLowerCase().includes(tutoring_week_searchText.toLowerCase()))
		//let care_package_data = apiData.find(i => i.programDetailId == 21);
		this.updateUpSellModal(prep_week_data, tutoring_data)
		
		
        if (variant_type == 1) {
            apiData = apiData.filter(i => !i.label.toLowerCase().includes(prep_week_searchText.toLowerCase()));
        } else {
            apiData = apiData.filter(i => !i.label.toLowerCase().includes(tutoring_week_searchText.toLowerCase()));
        }
		
		apiData = apiData.filter(i => i.programDetailId != 21);

		if(!apiData.length){
			swiperSlideWrapper.style.display="none";
		}
		
		if (container2 == undefined) return;
		
		if (swiperSlideWrapper == undefined) return

		swiperSlideWrapper.innerHTML = "";
		apiData.forEach(item => {
			item.forumType = "Public Forum";
			//slider div
			let swiperSlide = creEl('div', 'you-might_slide-item')
			const outerShadowDiv1 = this.displaySingleSuppProgram(item, 'desktop', swiperSlide);
			swiperSlide.appendChild(outerShadowDiv1)
			swiperSlideWrapper.prepend(swiperSlide)
		});
        this.initSlickSlider();
        this.buyNow();
	}
	initSlickSlider() {
		var $slider = $('.you-might_slick-slider');
		// Check if the slider is already initialized
		if (!$slider.hasClass('slick-initialized')) {

			var slickSettings = {
                speed: 300,
                slidesToShow: 1,
                slidesToScroll: 1,
                infinite: true,
                centerMode: false,
                variableWidth: false,
                arrows: false,
                dots: true,
            };
			// Initialize you might slider
			var $sliderYouMight = $slider.slick(slickSettings);
            var $sliderFamilies = $(".why-families_slick-slider").slick(
                slickSettings
              );

			// Shared navigation logic for the "You Might" slider
			$('.left-arrow-slick').click(function () {
				console.log("You Might: Left arrow clicked.");
				$sliderYouMight.slick('slickPrev');
			});

			$('.right-arrow-slick').click(function () {
				console.log("You Might: Right arrow clicked.");
				$sliderYouMight.slick('slickNext');
			});
            // Shared navigation logic for the "Why Families" slider
            $(".families-left-arrow").click(function () {
                console.log("Why Families: Left arrow clicked.");
                $sliderFamilies.slick("slickPrev");
              });

              $(".families-right-arrow").click(function () {
                console.log("Why Families: Right arrow clicked.");
                $sliderFamilies.slick("slickNext");
              });
		}

	}
    // New UpSell Program / Supplementary
	displaySingleSuppProgram(item, size, slideDiv) {
		var $this = this;
		// Create the outer-shadow div
		//const outerDiv = document.createElement("div");
		//outerDiv.classList.add("div-block-93", "outer-shadow");
		// Create the grid container
		const gridDiv = document.createElement("div");
		gridDiv.classList.add("w-layout-grid", "payment-conf-program-grid", "upsell");

		// Create the course-info div (left column)
		const courseInfoDiv = document.createElement("div");

		const upsellDiv = document.createElement("div");
		upsellDiv.classList.add("upsell-div");

		// Create the checkbox
		const checkboxDiv = document.createElement("div");
		checkboxDiv.classList.add("core-checkbox");

		const label = document.createElement("label");
		label.classList.add("w-checkbox");

		const input = document.createElement("input");
		input.classList.add("w-checkbox-input", "core-checkbox", "suppCheckbox");
		input.type = "checkbox";
		input.id = size + item.label.replace(/\s+/g, '-').toLowerCase();
		input.name = "checkbox";
		input.value = item.amount;
		input.setAttribute("programdetailid", item.programDetailId);
		input.setAttribute("data-name", "Checkbox");
		var $this = this;
		input.addEventListener("change", function () {
			this.checked ? slideDiv.classList.add('border-red') : slideDiv.classList.remove('border-red')
			$this.updateAmount(this, item.amount);
		})

		const span = document.createElement("span");
		span.classList.add("core-checkbox-label", "w-form-label");

		label.appendChild(input);
		label.appendChild(span);
		checkboxDiv.appendChild(label);
		const labelWrapper = creEl('div')
		const campNameDiv = document.createElement("label");
		campNameDiv.classList.add("camp-name", "margin-bottom-0");
		campNameDiv.setAttribute("for", size + item.label.replace(/\s+/g, '-').toLowerCase())
		campNameDiv.textContent = item.label;
		labelWrapper.appendChild(campNameDiv)
		courseInfoDiv.appendChild(labelWrapper)
		//upsellDiv.appendChild(checkboxDiv);
		///upsellDiv.appendChild(campNameDiv);


		const textBlockWrapper = document.createElement("div");
		textBlockWrapper.classList.add("text-block-wrapper");

		item.tags.forEach(tag => {
			const tagDiv = document.createElement("div");
			tagDiv.classList.add("payment-conf-tag", "bg-color-light-blue");
			tagDiv.style.backgroundColor = tag.color
			tagDiv.textContent = tag.name;
			textBlockWrapper.appendChild(tagDiv);
		});
        
        // Create the textBlockWrapper2 div
        const textBlockWrapper2 = document.createElement("div");
        textBlockWrapper2.classList.add("text-block-wrapper");

        // Create the button_add-to-card div
        const buttonAddToCardDiv = document.createElement("div");
        buttonAddToCardDiv.classList.add("button_add-to-card");

        // Create the 'Add to Cart' button
        const addToCartButton = document.createElement("a");
        addToCartButton.href = "#";
        addToCartButton.classList.add(
        "main-button-26",
        "red",
        "add-to-card",
        "upsell_add_to_card",
        "padding-all",
        "w-button"
        );
        addToCartButton.textContent = "Add to Cart";

        // Append 'Add to Cart' button to button_add-to-card div
        buttonAddToCardDiv.appendChild(addToCartButton);

        // Create the hidden div
        const hiddenDiv = document.createElement("div");
        hiddenDiv.classList.add("hide", "w-embed");

        // Create the checkbox input
        const checkboxInput = document.createElement("input");
        checkboxInput.classList.add("w-checkbox-input", "core-checkbox", "suppCheckbox", "hide");
        checkboxInput.id = "upsellTpwProgranId-1";
        checkboxInput.type = "checkbox";
        checkboxInput.name = "checkbox";
        checkboxInput.value = "719.2";
        checkboxInput.setAttribute("programdetailid", "13");
        checkboxInput.setAttribute("data-name", "Checkbox");
        checkboxInput.setAttribute("programname", "NSD PF Topic Prep Week");

        // Append the checkbox to the hidden div
        hiddenDiv.appendChild(checkboxInput);

        // Append the hidden div to button_add-to-card div
        buttonAddToCardDiv.appendChild(hiddenDiv);

        // Create the 'Learn More' button
        const learnMoreButton = document.createElement("a");
        learnMoreButton.id = "learnMore";
        learnMoreButton.href = "#";
        learnMoreButton.classList.add("main-button", "red", "alternate", "upsell", "w-button");
        learnMoreButton.textContent = "Learn More";

        // Append elements to textBlockWrapper2
        textBlockWrapper2.appendChild(buttonAddToCardDiv);
        textBlockWrapper2.appendChild(learnMoreButton);




		const priceItem = document.createElement("div");
		priceItem.classList.add("price-item");

		const saveDiv1 = document.createElement("div");
		saveDiv1.classList.add("save-amount");
		saveDiv1.textContent = "Save";

		const saveDiv2 = document.createElement("div");
		saveDiv2.classList.add("save-amount");
		saveDiv2.textContent = "$" + (parseFloat(item.disc_amount) - parseFloat(item.amount)).toFixed(2);

		priceItem.appendChild(saveDiv1);
		priceItem.appendChild(saveDiv2);
		
		slideDiv.appendChild(upsellDiv);
		upsellDiv.appendChild(textBlockWrapper);
        upsellDiv.appendChild(textBlockWrapper2);
		

		// Create the price details div (right column)
		const priceDiv = document.createElement("div");
		priceDiv.classList.add("course-info", "p-16", "upsell");

		const discountPriceDiv = document.createElement("div");
		const discountLabel = document.createElement("div");
		discountLabel.classList.add("dm-sans", "bold-700");
		discountLabel.textContent = "Discount Price";
		discountPriceDiv.appendChild(discountLabel);

		const priceWrapper1 = document.createElement("div");
		priceWrapper1.classList.add("price-wrapper", "upsell");

		const originalPriceDiv1 = document.createElement("div");
		originalPriceDiv1.classList.add("price-item", "upsell");

		const originalPrice = document.createElement("div");
		originalPrice.classList.add("original-price");
		originalPrice.textContent = "$" + item.disc_amount;
		originalPriceDiv1.appendChild(originalPrice);

		const discountedPriceDiv = document.createElement("div");
		discountedPriceDiv.classList.add("price-item", "upsell");

		const discountedPrice = document.createElement("div");
		discountedPrice.classList.add("discounted-price", "text-blue");
		discountedPrice.textContent = "$" + item.amount;
		discountedPriceDiv.appendChild(discountedPrice);

		priceWrapper1.appendChild(priceItem);
		priceWrapper1.appendChild(originalPriceDiv1);
		priceWrapper1.appendChild(discountedPriceDiv);

		

		priceDiv.appendChild(discountPriceDiv);
		courseInfoDiv.appendChild(priceWrapper1);
		

		gridDiv.appendChild(courseInfoDiv);
		gridDiv.appendChild(checkboxDiv)
		//gridDiv.appendChild(priceDiv);

		//outerDiv.appendChild(gridDiv);

		return gridDiv;
	}
}
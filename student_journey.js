/*

Purpose: Renders the grade/semester "student journey" catalog — the circular grade-progression UI that shows a student's current and upcoming grade levels with semester labels, descriptions, and register links.

Brief Logic: Reads grade/semester from URL query params (or prompts via a modal if missing), fetches class level data for the class service, populates circle containers and description panels for the selected grade band, and wires up prev/next navigation, grade/semester select changes, and responsive mobile/desktop layout switching.

Are there any dependent JS files: No — expects getMemberstackToken/window.BDC_API/bdcFetch from Webflow's site-wide Head code. The page also needs its own <style> block (kept in Webflow custom code, not here) for the active-state styling this script toggles.

*/
document.addEventListener('DOMContentLoaded', function () {
    fetchAndUpdateGradeAndSemester();
    handleGradeWrapperImgClick();
    fetchAndUpdateActiveClassText();
    handleGradeAndSemesterSelectChange();
});

// Check if it's a mobile view
const isMobileView = window.innerWidth < 1024;
let data;

let activeIndex = -1;
function setupNavigationListeners(filteredData, initialActiveIndex) {
    activeIndex = initialActiveIndex;
    const isMobileView = window.innerWidth < 1024;
    var prevLinks = document.querySelectorAll(isMobileView ? '.navigation_link-block .prev-link' : '.navigation_link-block-desktop .prev-link');
    var nextLinks = document.querySelectorAll(isMobileView ? '.navigation_link-block .next-link' : '.navigation_link-block-desktop .next-link');

    var circleContainers = document.querySelectorAll('.circle-container');

    if (!isMobileView || initialActiveIndex === 0) {
        hideLinks(prevLinks);
    }

     function updateActiveIndex(isNext) {
        if (isNext) {
            activeIndex = Math.min(activeIndex + 1, filteredData.length - 1);
        } else {
            activeIndex = Math.max(activeIndex - 1, 0);
        }
    }

    prevLinks.forEach(prevLink => {
        prevLink.addEventListener('click', event => {
            event.preventDefault();
            updateActiveIndex(false); // Decrease index
            updateActiveCircleByIndex(activeIndex);
            updateStateOnNavigation(activeIndex, prevLinks, nextLinks, filteredData);
        });
    });

    nextLinks.forEach(nextLink => {
        nextLink.addEventListener('click', event => {
            event.preventDefault();
            updateActiveIndex(true); // Increase index
            updateActiveCircleByIndex(activeIndex);
            updateStateOnNavigation(activeIndex, prevLinks, nextLinks, filteredData);
        });
    });


    circleContainers.forEach((container, index) => {
        container.addEventListener('click', () => {
            activeIndex = index;
            updateActiveCircleByIndex(activeIndex);
            updateStateOnNavigation(activeIndex, prevLinks, nextLinks, filteredData);
        });
    });

    updateActiveCircleByIndex(activeIndex);
    updateStateOnNavigation(activeIndex, prevLinks, nextLinks, filteredData);
}

function updateStateOnNavigation(activeIndex, prevLinks, nextLinks, filteredData) {
    updateDescriptionDivHeader(activeIndex); // Update description based on the new active circle
    const totalItems = filteredData.length; // Calculate total items based on filtered data

    // Handle mobile and desktop views differently
    if (isMobileView) {
        handleMobileNavigation(activeIndex, totalItems, prevLinks, nextLinks);
    } else {
        handleDesktopNavigation(activeIndex, totalItems, prevLinks, nextLinks);
    }

    // Add previous arrow icons for visible previous links
    updateLinkArrows(prevLinks, 'arrow_left', activeIndex > 0);
}

function handleMobileNavigation(activeIndex, totalItems, prevLinks, nextLinks) {
    if (activeIndex === totalItems - 1) {
        // At the last item
        //toggleLinkVisibility(nextLinks, prevLinks, true, false);
        toggleLinkVisibility(nextLinks, prevLinks, false, true);
        updateLinkText(prevLinks, 'Previous', 'arrow_left');
        showPipeSymbol(false);
    } else if (activeIndex === 0) {
        // At the first item
        toggleLinkVisibility(nextLinks, prevLinks, true, false);
        //toggleLinkVisibility(nextLinks, prevLinks, false, true);
        updateLinkText(nextLinks, 'Next', 'arrow_right');
        updateLinkArrows(prevLinks, 'arrow_left', true); // Ensure the arrow is visible
        showPipeSymbol(false);
    } else {
        // For all other items
        toggleLinkVisibility(nextLinks, prevLinks, true, true);
        updateLinkText(prevLinks, 'Previous', 'arrow_left');
        updateLinkText(nextLinks, 'Next', 'arrow_right');
        showPipeSymbol(true);
    }
}

function handleDesktopNavigation(activeIndex, totalItems, prevLinks, nextLinks) {
    if (activeIndex === 0) {
        // At the first item
        hideLinks(prevLinks);
        showPipeSymbol(false);
    } else {
        showLinks(prevLinks);
        showPipeSymbol(true);
    }

    if (activeIndex === totalItems - 1) {
        hideLinks(nextLinks);
        showPipeSymbol(false);
    } else {
        showLinks(nextLinks);
        updateLinkText(nextLinks, 'Next', 'arrow_right');
    }
}

function toggleLinkVisibility(nextLinks, prevLinks, showNext, showPrev) {
    // Toggle visibility of "Next" and "Previous" links
    if (showNext) showLinks(nextLinks);
    else hideLinks(nextLinks);

    if (showPrev) showLinks(prevLinks);
    else hideLinks(prevLinks);
}

function updateLinkText(links, text, icon) {
    const isMobileView = window.innerWidth < 1024; // Check if it's mobile view
    links.forEach(link => {
        const linkText = link.querySelector('.link-text');
        if (linkText) {
            removeArrowIcons(linkText); // Remove existing arrow icons
            linkText.textContent = text + ' '; // Reset the text content

            if (!isMobileView) { // Only add the icon if not in mobile view
                const arrowIcon = document.createElement('span');
                arrowIcon.className = 'material-symbols-outlined';
                arrowIcon.textContent = icon;
                linkText.appendChild(arrowIcon); // Append the arrow icon to the link text
            }
        }
    });
}

function updateLinkArrows(links, icon, shouldShow) {
    const isMobileView = window.innerWidth < 1024; // Check if it's mobile view
    links.forEach((link) => {
        const linkText = link.querySelector('.link-text');
        if (linkText) {
            removeArrowIcons(linkText); // Remove existing arrow icons
            if (shouldShow && !isMobileView) { // Show arrow only if not in mobile view
                linkText.textContent = ' ' + linkText.textContent.trim(); // Ensure whitespace
                const arrowIcon = document.createElement('span');
                arrowIcon.className = 'material-symbols-outlined';
                arrowIcon.textContent = icon;
                linkText.insertBefore(arrowIcon, linkText.firstChild); // Insert arrow before text
            }
        }
    });
}

// Function to show/hide the pipe symbol
function showPipeSymbol(shouldShow) {
    const pipeSymbols = document.querySelectorAll('.pipe-symbol'); // Select all pipe symbols
    pipeSymbols.forEach(pipeSymbol => {
        pipeSymbol.style.display = shouldShow ? 'inline' : 'none'; // Show or hide the pipe symbol
    });
}

// Helper function to remove any existing arrow icons
function removeArrowIcons(linkText) {
    // Use a more flexible selector to handle both left and right arrows
    const arrowIcons = linkText.querySelectorAll('.material-symbols-outlined');
    arrowIcons.forEach(icon => linkText.removeChild(icon)); // Remove all arrow icons
}
// Helper functions to show and hide links
function hideLinks(links) {
    links.forEach(link => link.style.display = 'none');
}
function showLinks(links) {
    links.forEach(link => link.style.display = 'inline-block');
}

// Function to handle circle navigation based on direction
function updateActiveCircle(direction) {
    const circleContainers = document.querySelectorAll('.circle-container');
    let activeIndex = getActiveCircleIndex(circleContainers);
    if (activeIndex === -1) return null;

    activeIndex = direction === 'next' ?
        (activeIndex + 1) % circleContainers.length :
        (activeIndex - 1 + circleContainers.length) % circleContainers.length;

    setActiveCircle(circleContainers, activeIndex);
    return activeIndex;
}

// Function to handle the active circle by a given index
function updateActiveCircleByIndex(index) {
    const circleContainers = document.querySelectorAll('.circle-container');
    if (index < 0 || index >= circleContainers.length) return null;
    setActiveCircle(circleContainers, index);
    return index;
}

// Helper function to get the current active circle index
function getActiveCircleIndex(circleContainers) {
    let activeIndex = -1;
    circleContainers.forEach((container, index) => {
        if (container.classList.contains('active')) activeIndex = index;
    });
    return activeIndex;
}

// Helper function to set a new active circle
function setActiveCircle(circleContainers, index) {
    circleContainers.forEach(container => container.classList.remove('active'));
    circleContainers[index].classList.add('active');
}


// Utility function to toggle the display of elements based on gradeTopDiv and gradeBottomDiv's styles
function toggleGradeDivVisibility(container, isActive, isMobileView) {
    // Get all gradeTopDiv and gradeBottomDiv elements in the container (for both desktop and mobile)
    const gradeTopDivs = container.querySelectorAll('.grade_top-div');
    // Get all active-class_text-div elements in the container
    const activeClassTextDivs = container.querySelectorAll('.active-class_text-div');

    // Set display based on whether the container is active or not
    if (isActive) {
        // Loop through all gradeTopDivs to check their display status
        gradeTopDivs.forEach(gradeTopDiv => {
            if (gradeTopDiv.style.display === 'flex') {
                // Set display based on the view type
                activeClassTextDivs.forEach(div => {
                    div.style.display = isMobileView ? 'none' : 'flex';
                });
            }
        });

    } else {
        // Hide all activeClassTextDivs
        activeClassTextDivs.forEach(div => {
            div.style.display = 'none';
        });
    }
}

// Updated Function to handle 5th and 6th grade specific logic
function handleFifthSixthGrade(container, index, isMobileView) {
    // Always set the first container as active, no need to check for mobile or desktop separately
    if (index === 0) {
        container.classList.add('active');
        toggleGradeDivVisibility(container, true, isMobileView);   // Show the grade div for the first container
    } else if (!isMobileView) {  // If it's not mobile, apply for desktop as usual
        toggleGradeDivVisibility(container, false, isMobileView);  // Hide other containers if needed
    }
}

// Function to handle 7th and 8th grade specific logic
function handleSeventhEighthGrade(container, index, isMobileView) {
    // Always set the first container as active, no need to check for mobile or desktop separately
    if (index === 0) {
        container.classList.add('active');
        toggleGradeDivVisibility(container, true, isMobileView); // Show the grade div for the first container
    } else if (!isMobileView) {  // If it's not mobile, apply for desktop as usual
        toggleGradeDivVisibility(container, false, isMobileView); // Hide other containers if needed
    }
}

// Updated function to handle resetting and setting active containers
function resetActiveContainers(circleContainers) {
    circleContainers.forEach((container) => {
        container.classList.remove('active');
    });
}


// Function to set active circle container based on grade and update text
function setActiveCircleContainerByGradeAndUpdateText(selectedGrade, semester, counter) {
    const circleContainers = document.querySelectorAll('.circle-container.class-catalog');
    const isSeventhOrEighthGrade = selectedGrade === '7th Grade' || selectedGrade === '8th Grade';
    const isFifthOrSixthGrade = selectedGrade === '5th Grade' || selectedGrade === '6th Grade';
    let activeContainer = null;
    let activeIndex = -1;

    let desktopGradeCounter = 1; // Start from 1 for desktop
    let mobileGradeCounter = 1; // Start mobile counter from the highest number
    let isMobileView = window.innerWidth < 1024; // Check if it's mobile view

    // Reset all active containers first
    resetActiveContainers(circleContainers);

    // Reset all containers
    circleContainers.forEach((container, index) => {
        //container.classList.remove('active');
        initializeElements(container); // Reset each element

        // Update grade number for mobile or desktop
        if (isMobileView) {
            if (container.classList.contains('mobile_grade_container')) {
                container.querySelector('.grade-num').textContent = mobileGradeCounter.toString();
                mobileGradeCounter++;
            }
        } else {
            if (container.classList.contains('desktop_grade_container')) {
                container.querySelector('.grade-num').textContent = desktopGradeCounter.toString();
                desktopGradeCounter++;
            }
        }

        // Pass totalContainers and isMobileView to the handler functions
        const totalContainers = circleContainers.length;

        // Set active container and visibility based on grade
        if (isFifthOrSixthGrade) {
            handleFifthSixthGrade(container, index, isMobileView);
        } else if (isSeventhOrEighthGrade) {
            handleSeventhEighthGrade(container, index, isMobileView);
        }

        // Track the active container and index if found
        if (container.classList.contains('active')) {
            //console.log("Active container set at index", index);
            activeContainer = container;
            activeIndex = index;
        }
    });

    // If no active container is found, set the first container as active
    if (!activeContainer) {
        activeContainer = circleContainers[0]; // Always set the first container
        activeIndex = 0;  // Set the index to 0 (first container)

        //console.log("[Default] Defaulting to active index:", activeIndex);

        // Add the 'active' class to the first container
        activeContainer.classList.add('active');
    }

    // Update the active container UI
    if (activeContainer) {
        updateActiveContainerText(activeContainer, selectedGrade, semester);
        updateDescriptionDivHeader(activeIndex);
        alternateSemesterText(activeContainer, semester);
        incrementGradeNumbersAfterActive(circleContainers);
        //setupNavigationListeners(filteredData);
    }
}


function initializeElements(container) {
    const gradeNumElements = container.querySelectorAll('.grade-num');
    // Reset container state
    container.classList.remove('active');
    gradeNumElements.forEach(gradeNumElement => {
        gradeNumElement.textContent = ''; // Clear the content initially
    });
}


function updateActiveContainerText(container, selectedGrade, semester) {
    const gradeMainTexts = container.querySelectorAll('.grade_main-text');
    const semesterTexts = container.querySelectorAll('.semester-text');

    gradeMainTexts.forEach(gradeMainText => {
        gradeMainText.textContent = modifyGradeText(selectedGrade);

    });
    semesterTexts.forEach(semesterText => {
        semesterText.textContent = semester;

    });
}

function modifyGradeText(grade) {
    return grade.includes('Grade') ? grade.replace('Grade', 'Grader') : grade;
}

function incrementGradeNumbersAfterActive(circleContainers) {
    const activeIndex = Array.from(circleContainers).findIndex(container =>
        container.classList.contains('active')
    );

    if (activeIndex === -1) {
        return;
    }

    let currentGradeNumber = parseInt(circleContainers[activeIndex]
        .querySelector('.grade_main-text').textContent.split(' ')[0]);
    let gradeNumber = currentGradeNumber;
    const isFallSemester = circleContainers[activeIndex]
        .querySelector('.semester-text').textContent === 'Fall';

    //const isMobileView = window.innerWidth < 1024;

    const processContainer = (container) => {
        const semesterText = container.querySelector('.semester-text')?.textContent;

        if (semesterText === 'Fall') {
            gradeNumber++;
        }

        container.querySelectorAll('.grade_top-div .grade_main-text').forEach(gradeTopText => {
            gradeTopText.textContent = `${gradeNumber}th Grader`;
        });
        container.querySelectorAll('.grade_bottom-div .grade_main-text').forEach(gradeBottomText => {
            gradeBottomText.textContent = `${gradeNumber}th Grader`;
        });

        container.querySelectorAll('.grade_sub-text').forEach(subText => {
            if (gradeNumber >= 9) {
                subText.textContent = subText.textContent.replace(/Level\s*[12]([A-Z])/, 'Level 3$1');
            }
        });



        container.querySelectorAll('.div-wrapper').forEach(wrapper => {
            if (gradeNumber > 9) {
                const gradeSubText = wrapper.querySelector('.grade_sub-text');
                if (gradeSubText) {
                    gradeSubText.textContent = 'Level X - ';
                }
            }
        });
    };

    //registerButtons = container.querySelectorAll('.class-register');

    for (let i = activeIndex + 1; i < circleContainers.length; i++) {
        processContainer(circleContainers[i]);
    }

}


// Function to alternate semester text for containers after the active container
function alternateSemesterText(activeContainer, selectedSemester) {
    const isMobileView = window.innerWidth < 1024;
    // Get all circle containers
    const circleContainers = document.querySelectorAll('.circle-container.class-catalog');
    // Find the index of the active container
    let activeIndex = Array.from(circleContainers).indexOf(activeContainer);

    // Define semester labels to alternate between
    const semesterOptions = ['Fall', 'Winter/Spring'];
    // Convert selectedSemester to lowercase for case-insensitive matching
    selectedSemester = selectedSemester.toLowerCase();
    //console.log(selectedSemester);

    // Determine starting index for alternating based on the selected semester
    let startIndex = semesterOptions.findIndex(semester => semester.toLowerCase() === selectedSemester);
    //console.log("Start Index", startIndex);

    // Fallback if startIndex is -1 (invalid semester)
    if (startIndex === -1) {
        startIndex = 0; // Default to 'Fall'
    }
  // Update the remaining containers with alternating semesters
        for (let index = activeIndex + 1; index < circleContainers.length; index++) {
            const container = circleContainers[index];

            const isMobileContainer = container.classList.contains('mobile_grade_container');
            const isDesktopContainer = !isMobileContainer;

            if ((isMobileView && isMobileContainer) || (!isMobileView && isDesktopContainer)) {
                // Alternate semester based on the current position relative to startIndex
                let alternatingSemester = semesterOptions[(startIndex + (index - activeIndex)) % semesterOptions.length];
                updateSemesterText(container, alternatingSemester);
            }
       }
}

// Function to update the semester text
function updateSemesterText(container, selectedSemester) {
    const semesterTopTexts = container.querySelectorAll('.grade_top-div .semester-text');
    const semesterBottomTexts = container.querySelectorAll('.grade_bottom-div .semester-text');

    // Update text for all top semester-text elements
    semesterTopTexts.forEach(semesterTopText => {
        semesterTopText.textContent = selectedSemester;
    });

    // Update text for all bottom semester-text elements
    semesterBottomTexts.forEach(semesterBottomText => {
        semesterBottomText.textContent = selectedSemester;
    });
}

function updateDescriptionDivHeader(activeIndex) {
    const circleContainers = document.querySelectorAll('.circle-container');

    if (activeIndex < 0 || activeIndex >= circleContainers.length) {
        return;
    }

    const activeContainer = circleContainers[activeIndex];
    if (!activeContainer) return;

    const gradeMainText = activeContainer.querySelector('.grade_main-text')?.textContent.trim() || '';
    const gradeSubText = activeContainer.querySelector('.grade_sub-text')?.textContent.trim() || '';
    const semesterText = activeContainer.querySelector('.semester-text')?.textContent.trim() || '';

    // Extract numeric grade from text
    const gradeMatch = gradeMainText.match(/(\d+)/);
    const gradeNumber = gradeMatch ? parseInt(gradeMatch[1], 10) : null;

    const isMobileView = window.innerWidth < 1024;

    if (isMobileView) {
        // ===== MOBILE VIEW =====

        const descriptionContainerMobile = document.querySelector('#description-container-mobile');
        if (!descriptionContainerMobile) return;

        const descriptionDivsMobile = descriptionContainerMobile.querySelectorAll('.description-div');

        descriptionDivsMobile.forEach((descriptionDiv, descIndex) => {
            const shouldDisplay = descIndex === activeIndex;

            if (shouldDisplay) {
                const gradeHeaderText = descriptionDiv.querySelector('.grade-header-text');
                if (gradeHeaderText) {
                    gradeHeaderText.textContent = `${gradeMainText}, ${gradeSubText} ${semesterText}`;
                }

                descriptionDiv.style.display = 'block';
            } else {
                descriptionDiv.style.display = 'none';
            }
        });

        // Update Mobile Register Button (outside description container)
        const mobileRegisterButton = document.querySelector('.main-container.mobile .class-register');
        if (mobileRegisterButton && gradeNumber !== null) {
            let mobileHref = mobileRegisterButton.getAttribute('href') || '';
            console.log("Original Mobile Href:", mobileHref);

            if (gradeNumber === 9) {
                mobileHref = mobileHref.replace(/level-[12]([a-z])/i, 'level-3$1');
            } else if (gradeNumber > 9) {
                mobileHref = mobileHref.replace(/level-\d+[a-z]/i, 'level-x');
            }

            mobileRegisterButton.setAttribute('href', mobileHref);
            console.log("Updated Mobile Register Link:", mobileHref);
        }

    } else {
        // ===== DESKTOP VIEW =====

        const descriptionContainer = document.querySelector('#description-container');
        if (!descriptionContainer) return;

        const descriptionDivs = descriptionContainer.querySelectorAll('.description-div');

        descriptionDivs.forEach((descriptionDiv, descIndex) => {
            const shouldDisplay = descIndex === activeIndex;

            if (shouldDisplay) {
                const gradeHeaderText = descriptionDiv.querySelector('.grade-header-text');
                if (gradeHeaderText) {
                    gradeHeaderText.textContent = `${gradeMainText}, ${gradeSubText} ${semesterText}`;
                }

                // Update Desktop Register Button
                const registerButton = descriptionDiv.querySelector('.class-register');
                if (registerButton && gradeNumber !== null) {
                    let currentHref = registerButton.getAttribute('href') || '';
                    console.log("Original Desktop Href:", currentHref);

                    if (gradeNumber === 9) {
                        currentHref = currentHref.replace(/level-[12]([a-z])/i, 'level-3$1');
                    } else if (gradeNumber > 9) {
                        currentHref = currentHref.replace(/level-\d+[a-z]/i, 'level-x');
                    }

                    registerButton.setAttribute('href', currentHref);
                    console.log("Updated Desktop Register Link:", currentHref);
                }

                descriptionDiv.style.display = 'block';
            } else {
                descriptionDiv.style.display = 'none';
            }
        });
    }
}


function handleCircleContainerClicks(filteredData) {
    // Get all circle containers
    const circleContainers = document.querySelectorAll('.circle-container');
    const descriptionDivs = document.querySelectorAll(
        '.description-div'); // Assuming there are multiple description divs

    // Get the external static arrow image
    //const externalArrow = document.querySelector('.descriptipn_down-arrow'); // Updated to point to the static image

    circleContainers.forEach((container, index) => {
        container.addEventListener('click', function () {
            // Remove active class from all circle containers
            circleContainers.forEach(c => {
                c.classList.remove('active');
            });

            // Add active class to the clicked container
            container.classList.add('active');

            // Call the function to update the description div header
            updateDescriptionDivHeader(index);

            // Update state and mobile register button
            changeActiveIndex(filteredData, index);
            //console.log("After function called Active Index", index);
            //updateStaticButtonHref(index);
        });
    });
}


// Mapping of grades to their start and end values
const gradeMap = {
    '5th Grade': {
        start: 1,
        end: 15
    },
    '6th Grade': {
        start: 1,
        end: 13
    },
    '7th Grade': {
        start: 3,
        end: 13
    },
    '8th Grade': {
        start: 3,
        end: 11
    }
};


function filterDataByGrade(data, gradeInfo) {
    return data.filter(item => item.classLevelOrder >= gradeInfo.start && item.classLevelOrder <= gradeInfo
        .end);
}

//let activeIndex = -1; // Initialize global activeIndex
let response = null;
// Global variable to store the filtered data

function fetchAndUpdateActiveClassText() {
    let grade = getQueryParam('grade');
    let semester = getQueryParam('semester');
    const gradeInfo = gradeMap[grade];

    if (!gradeInfo) {
        return;
    }

    if (response) {
        const filteredData = filterDataByGrade(response, gradeInfo);
        data = filteredData;
        populateData(filteredData);
        activeIndex = findActiveIndex(filteredData);
        setupNavigationListeners(filteredData, activeIndex); // Pass filtered data and active index
        // Call mobileRegisterButton only after data is populated
        mobileRegisterButton(filteredData, activeIndex);

    } else {
        // const apiUrl = `https://73u5k1iw5h.execute-api.us-east-1.amazonaws.com/prod/camp/getClassLevel`;
        const apiUrl = `${window.BDC_API.class}getClassLevel`;

        bdcFetch(apiUrl)
            .then(apiResponse => {
                if (!apiResponse.ok) throw new Error(`Network response was not ok: ${apiResponse.statusText}`);
                return apiResponse.json();
            })
            .then(data => {
                response = data;
                const filteredData = filterDataByGrade(data, gradeInfo);
                //console.log(filteredData);
                data = filteredData;

                populateData(filteredData);

                activeIndex = findActiveIndex(filteredData);
                console.log("Active Index", activeIndex);

                setupNavigationListeners(filteredData, activeIndex); // Pass filtered data and active index
                // Call mobileRegisterButton only after data is populated
                mobileRegisterButton(filteredData, activeIndex);
            })
            .catch(error => {
                console.error('Fetch error:', error);
            });
    }

}

function findActiveIndex(data) {
    const circleContainers = document.querySelectorAll('.circle-container.class-catalog');
    let activeIndex = -1;
    circleContainers.forEach((container, index) => {
        if (container.classList.contains('active')) {
            activeIndex = index;
        }
    });
    return activeIndex;
}


let currentView = window.innerWidth < 1024 ? 'mobile' : 'desktop'; // Initial detection of the current view

function handleResize() {
    const newView = window.innerWidth < 1024 ? 'mobile' : 'desktop'; // Detect the view on resize

    if (data) {
        let activeIndex = findActiveIndex(data);
        // Check if view has changed
        if (currentView !== newView) {
            populateData(data);
            fetchAndUpdateActiveClassText();
            setupNavigationListeners(data, activeIndex);
            fetchAndUpdateGradeAndSemester();

            // Update current view after repopulating
            currentView = newView;
        }
    } else {
        fetchAndUpdateActiveClassText(); // Fetch and populate data if not already present
    }
}

// Add event listener for window resize
window.addEventListener('resize', handleResize);


function gradeItemHtml(index, item, counter, className) {
    //alert(counter)
    const gradeItem = document.createElement('div');
    gradeItem.classList.add('circle-container', 'class-catalog', 'w-dyn-item', 'w-col', 'w-col-2', className);

    gradeItem.innerHTML = `
    <div class="grade_top-div" style="display: ${index % 2 === 0 ? 'flex' : 'none'};">
        <p class="grade_main-text"></p>
          <div class="divider-line"></div>
        <div class="div-wrapper">
          <p class="grade_sub-text">${item.classLevelName} -</p>
            <p class="semester-text"></p>
        </div>
    </div>
    <div class="active-class_text-div" style="display: none;">
        <img src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/66d6e599e4f991c57398f03f_6218401%201.png" loading="lazy" alt="" class="active-class">
        <p class="active-class-text">You Are <br>Here</p>
    </div>
    <div class="outer-circle class-catalog">
        <div class="inner-circle class-catalog">
            <p class="grade-num">${counter}</p>
        </div>
    </div>
    <div class="grade_bottom-div" style="display: ${index % 2 !== 0 ? 'flex' : 'none'};">
        <p class="grade_main-text"></p>
        <div class="divider-line"></div>
        <div class="div-wrapper">
          <p class="grade_sub-text">${item.classLevelName} -</p>
            <p class="semester-text"></p>
        </div>
    </div>

`;
    return gradeItem;
}

function mobileRegisterButton(filteredData, activeIndex) {
    console.log("Filtered Data", filteredData);
    const activeItem = filteredData?.[activeIndex];
    const mobileRegisterButton = document.querySelector('.main-container.mobile .class-register');

    if (mobileRegisterButton && activeItem) {
        mobileRegisterButton.href = activeItem.registerLink;
    }
}
function changeActiveIndex(filteredData, newIndex) {
    //console.log("Calling Mobile Register Button Function");
    mobileRegisterButton(filteredData, newIndex);
}


// Function to populate the DOM with data
function populateData(data) {
    // Check if it's a mobile view
    const isMobileView = window.innerWidth < 1024;
    const gradeDesktopContainers = document.querySelectorAll('.inner-div.desktop-div.top-grade');
    const gradeMobileContainers = document.querySelectorAll('.inner-div.mobile-div.top-grade');
    // Select the container based on mobile or desktop view
    const descriptionContainer = isMobileView
        ? document.querySelector('#description-container-mobile')
        : document.querySelector('#description-container');

    const yellowBannerLinks = document.querySelectorAll('.yellow-banner-link');

    // Clear existing content in all containers
    gradeDesktopContainers.forEach(container => (container.innerHTML = ''));
    gradeMobileContainers.forEach(container => (container.innerHTML = ''));
    descriptionContainer.innerHTML = '';

    // Initialize the counter starting from the length of the data
    //let mobileCounter = index + 1;

    // Dynamically create circle containers for each class level
    data.forEach((item, index) => {
        const counter = index + 1;
        //const mobileCounter = index + 1;

        if (isMobileView) {
            gradeMobileContainers.forEach(container => {
                container.appendChild(gradeItemHtml(index, item, counter, 'mobile_grade_container'));
            });

        } else {
            gradeDesktopContainers.forEach(container => {
                container.appendChild(gradeItemHtml(index, item, counter, 'desktop_grade_container'));
            });
        }

        // Create the description item
        const descriptionItem = document.createElement('div');
        descriptionItem.classList.add('w-dyn-item');
        descriptionItem.innerHTML = `
        <div class="description-div" style="display: ${index === 0 ? 'block' : 'none'};">
            <div class="grade-header">
                <!-- Desktop view grade header, shown only when !isMobileView -->
                ${!isMobileView ?
                `<div class="left-div_grade-class">
                        <div class="grade-header-text">
                            <p class="grade-class-level">${item.gradeMainText}</p>
                            <div>-</div>
                            <p class="class-semester">${item.semesterText}</p>
                        </div>
                        <!-- Register button for desktop view -->
                        <a href="${item.registerLink}" class="button class-register w-button">Register Now</a>
                    </div>`
                : ''
            }

                <!-- Mobile view navigation and centered grade info, shown when isMobileView -->
                ${isMobileView ?
                `<div class="navigation_link-block">
                        <a id="prevLink" href="#" class="prev-link w-inline-block">
                            <p class="link-text">Previous</p>
                        </a>
                    </div>

                    <!-- Centered class information for mobile -->
                    <div class="left-div_grade-class">
                        <div class="grade-header-text">
                            <p class="grade-class-level">${item.gradeMainText}</p>
                            <div>-</div>
                            <p class="class-semester">${item.semesterText}</p>
                        </div>
                    </div>

                    <!-- Next link for mobile -->
                    <div class="navigation_link-block">
                        <a id="nextLink" href="#" class="next-link w-inline-block">
                            <p class="link-text">Next</p>
                        </a>
                    </div>`
                :
                `<div class="navigation_link-block-desktop">
                        <a id="prevLink" href="#" class="prev-link w-inline-block">
                            <p class="link-text">Previous</p>
                        </a>
                        <span class="pipe-symbol">|</span>
                        <a id="nextLink" href="#" class="next-link w-inline-block">
                            <p class="link-text">Next <span class="material-symbols-outlined">arrow_right</span></p>
                        </a>
                    </div>`
            }
            </div>

            <div class="grade-description-div">
                <div class="border-right">
                       <div class="description-header">Description</div>
                       <div class="rich-text w-richtext">
                            <ul role="list">
                            ${item.description.map(desc => `<li>${desc}</li>`).join('')}
                            </ul>
                       </div>
                </div>
                <div>
                    <div class="description-header">Learning Objectives</div>
                    <div class="rich-text w-richtext">
                        <ul role="list">
                            ${item.accomplishments.map(accomplishment => `<li>${accomplishment}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;

        // Append the description item to the description container
        descriptionContainer.appendChild(descriptionItem);
        //console.log("Description Container", descriptionContainer);

    });
   // Append image AFTER last circle container in the last .top-grade container
        if (!isMobileView) {
            // Desktop logic
            if (gradeDesktopContainers.length > 0) {
                const lastContainer = gradeDesktopContainers[gradeDesktopContainers.length - 1];
                if (!lastContainer.querySelector('.grade-image.summer-catalog')) {
                    const image = document.createElement('div');
                    image.className = 'grade-image summer-catalog';
                    image.innerHTML = `<img src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/66c6e2cd3b7355a74b94450a_Layer_1.svg" alt="">`;
                    image.style.position = 'absolute';
                    image.style.right = '0';
                    image.style.transform = 'translateX(100%)';
                    lastContainer.appendChild(image);
                }
            }
        } else {
            // Mobile logic
            if (gradeMobileContainers.length > 0) {
                const lastMobileContainer = gradeMobileContainers[gradeMobileContainers.length - 1];
                if (!lastMobileContainer.querySelector('.grade-image.summer-catalog')) {
                    const mobileImage = document.createElement('div');
                    mobileImage.className = 'grade-image summer-catalog';
                    mobileImage.innerHTML = `<img src="https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/66c6e2cd3b7355a74b94450a_Layer_1.svg" alt="">`;
                    mobileImage.style.width = '80px';
                    mobileImage.style.position = 'absolute';
                    mobileImage.style.bottom = '-68px';
                    mobileImage.style.transform = 'translateX(-50%) rotate(90deg)';
                    mobileImage.style.top = 'auto';
                    lastMobileContainer.appendChild(mobileImage);
                }
            }
        }


       // Handle circle container clicks
       handleCircleContainerClicks(data);

    // Update multiple circle containers based on the classLevelOrder
    document.querySelectorAll('.circle-container').forEach(container => {
        const gradeNum = parseInt(container.querySelector('.grade-num').textContent.trim(), 10);
        const matchedItem = data.find(item => parseInt(item.classLevelOrder, 10) === gradeNum);

        if (matchedItem) {
            updateElements(container, matchedItem, [
                ['.grade_top-div .grade_sub_text', 'classLevelName'],
                ['.grade_bottom-div .grade_sub_text', 'classLevelName']
            ]);
        }
    });

    let urlData = new URLSearchParams(window.location.search);
    let grade = urlData.get('grade');
    let semester = urlData.get('semester');

    // Define activeCircleContainer and call necessary functions if grade and semester are provided
    if (grade && semester) {
        // setActiveCircleContainerByGradeAndUpdateText(grade, semester);
        setActiveCircleContainerByGradeAndUpdateText(grade, semester, 1)
    }

    // Set the href attribute dynamically for the yellow banner link
    yellowBannerLinks.forEach(yellowBannerLink => {
        const firstClass = data[0]; // Assuming you want the first class level's registerLink
        yellowBannerLink.setAttribute('href', firstClass.registerLink);
    });

}

// Helper function to update container elements based on the provided selectors and data keys
function updateElements(container, matchedItem, elementsToUpdate) {
    elementsToUpdate.forEach(([selector, dataKey]) => {
        const elements = container.querySelectorAll(selector);
        elements.forEach(element => {
            if (element) {
                element.textContent = matchedItem[dataKey];
            }
        });
    });
}

// Function to fetch and update grade and semester from the URL
function fetchAndUpdateGradeAndSemester() {
    let grade = getQueryParam('grade'); // Fetch 'grade' from the URL
    let semester = getQueryParam('semester'); // Fetch 'semester' from the URL

    // Form select fields
    const gradeSelectForms = document.querySelectorAll('.grade-select'); // Grade select elements on page
    const semesterSelectForms = document.querySelectorAll('.semester-select'); // Semester select elements on page

    // Modal select fields by ID
    const gradeSelectModal = document.getElementById('Grade'); // Grade select element in modal
    const semesterSelectModal = document.getElementById('Semester'); // Semester select element in modal

    // Pre-fill form select fields with URL values if available
    if (grade) {
        gradeSelectForms.forEach(form => form.value = grade);
    }
    if (semester) {
        semesterSelectForms.forEach(form => form.value = semester);
    }

    // Show modal if grade or semester is missing in URL or not selected in the form
    if (!grade || !semester || !Array.from(gradeSelectForms).some(form => form.value) || !Array.from(semesterSelectForms).some(form => form.value)) {

        // Show the modal using class names
        const modals = document.querySelectorAll('.student-info-modal'); // Changed from ID to class name
        const modalBgs = document.querySelectorAll('.student-info_modal-bg'); // Background modal

        // Show all modals
        modals.forEach(modal => {
            modal.classList.add('show');
            modal.style.display = 'flex'; // Show modal as flex
        });

        // Show all modal backgrounds
        modalBgs.forEach(modalBg => {
            modalBg.setAttribute('aria-hidden', 'false');
        });

        // Pre-fill modal select fields if available in the URL or form fields
        // gradeSelectModal.value = grade || Array.from(gradeSelectForms).find(form => form.value)?.value || '';
        // semesterSelectModal.value = semester || Array.from(semesterSelectForms).find(form => form.value)?.value || '';
    } else {
        // If both grade and semester are available, update the modal fields
        gradeSelectModal.value = grade;
        semesterSelectModal.value = semester;
    }

    // Call existing functions
    updateTextSpans(grade, semester); // Existing function to update text spans
    handleGradeWrapperImgClick(); // Existing function to handle image click events
}


// Utility function to get URL query parameters
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Utility function to update URL query parameters
function updateQueryParam(param, value) {
    const url = new URL(window.location);
    url.searchParams.set(param, value);
    window.history.replaceState(null, null, url.toString());
}

// Utility function to update URL parameters for grade and semester
function updateURLParams(grade, semester) {
    updateQueryParam('grade', grade);
    updateQueryParam('semester', semester);
}

// Reusable function to update the text spans for grade and semester
function updateTextSpans(grade, semester) {
    const semesterElements = document.querySelectorAll('.text-span-sem');
    const gradeElements = document.querySelectorAll('.text-span-grade');

    semesterElements.forEach(element => {
        element.textContent = semester;
    });

    gradeElements.forEach(element => {
        element.textContent = grade;
    });
}
// Reusable function to handle the grade-wrapper image click event
function handleGradeWrapperImgClick() {
    const prevIcons = document.querySelectorAll('.grade-wrapper .prev-icon');

    if (prevIcons.length > 0) {
        prevIcons.forEach(prevIcon => {
            prevIcon.addEventListener('click', function () {
                window.history.back(); // Navigate to the previous page
            });
        });
    }
}


// Function to handle both grade and semester select changes
function handleGradeAndSemesterSelectChange() {
    const gradeSelects = document.querySelectorAll('.grade-select'); // Select for desktop or mobile
    const semesterSelects = document.querySelectorAll('.semester-select'); // Select for desktop or mobile
    const modal = document.getElementById('student-info-modal'); // Reference to the modal

    // Get initial values from URL params and store as last valid values
    const initialGrade = getQueryParam('grade') || gradeSelects[0].value;
    const initialSemester = getQueryParam('semester') || semesterSelects[0].value;

    // Initialize the last valid grade and semester
    let lastValidGrade = initialGrade;
    let lastValidSemester = initialSemester;

    // Set the select fields to the initial values from URL
    gradeSelects.forEach(gradeSelect => gradeSelect.value = initialGrade);
    semesterSelects.forEach(semesterSelect => semesterSelect.value = initialSemester);

    if (gradeSelects.length > 0 && semesterSelects.length > 0) {

        // Function to handle resetting to last valid value on invalid input
        function handleInvalidValues() {
            let validGradeSelected = true;
            let validSemesterSelected = true;

            gradeSelects.forEach(gradeSelect => {
                const grade = gradeSelect.value;

                // Check for invalid selections (e.g., "Select Grade")
                if (grade === "Select Grade" || !grade) {
                    validGradeSelected = false; // Mark as invalid
                }
            });

            semesterSelects.forEach(semesterSelect => {
                const semester = semesterSelect.value;

                // Check for invalid selections (e.g., "Select Semester")
                if (semester === "Select Semester" || !semester) {
                    validSemesterSelected = false; // Mark as invalid
                }
            });

            // Reset all to last valid values if either selection is invalid
            if (!validGradeSelected) {
                gradeSelects.forEach(el => el.value = lastValidGrade); // Reset all to last valid grade
            }
            if (!validSemesterSelected) {
                semesterSelects.forEach(el => el.value = lastValidSemester); // Reset all to last valid semester
            }
        }

        // Handle grade change event
        gradeSelects.forEach(gradeSelect => {
            gradeSelect.addEventListener('change', function () {
                handleInvalidValues(); // Validate before proceeding
                const grade = this.value;

                // Update last valid grade if current selection is valid
                if (grade !== "Select Grade" && grade) {
                    lastValidGrade = grade; // Update the last valid grade
                }

                const semester = semesterSelects[0].value;

                // Update the URL and fetch updated class text
                updateURLParams(grade, semester);
                fetchAndUpdateActiveClassText();

                // Update the text spans based on the new selection
                updateTextSpans(grade, semester);
            });
        });

        // Handle semester change event
        semesterSelects.forEach(semesterSelect => {
            semesterSelect.addEventListener('change', function () {
                handleInvalidValues(); // Validate before proceeding
                const grade = gradeSelects[0].value;
                const semester = this.value;

                // Update last valid semester if current selection is valid
                if (semester !== "Select Semester" && semester) {
                    lastValidSemester = semester; // Update the last valid semester
                }

                // Update the URL and fetch updated class text
                updateURLParams(grade, semester);
                fetchAndUpdateActiveClassText();

                // Update the text spans based on the new selection
                updateTextSpans(grade, semester);
            });
        });

        // Initial modal display logic based on page load values
        function checkInitialValuesAndShowModal() {
            const grade = gradeSelects[0].value;
            const semester = semesterSelects[0].value;

            // Show modal if both are empty or invalid at load
            if ((!grade || !semester || grade === "Select Grade" || semester === "Select Semester") && modal) {
                modal.classList.add('show');
                modal.style.display = 'flex'; // Show modal as flex
                document.querySelector('.student-info_modal-bg').setAttribute('aria-hidden', 'false');
            }
        }

        // Check initial values on page load and possibly show the modal
        checkInitialValuesAndShowModal();

    } else {
        //console.error("Grade or Semester select elements not found.");
    }
}

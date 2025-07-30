class InvoiceHistory {
  constructor(data) {
    this.data = data;
    this.spinner = document.getElementById("half-circle-spinner");
    this.listDiv = document.querySelector('[data-invoice="tabData"]');
    this.noRecord = document.querySelector('[data-container="no-record-found"]');
    this.init();
  }

  async init() {
    const invoiceTab = document.querySelector('[data-tab-group="invoice"]');
    invoiceTab.style.display = "none";
    this.spinner.style.display = "block";
    var data = await this.fetchData();
    invoiceTab.style.display = "block";
    this.spinner.style.display = "none";
    if(data.SummerInvoiceData.length == 0 && data.classInvoiceData.length == 0){
	this.noRecord.style.display = 'block';
    }
    console.log(data);
    this.renderTabs(data);
    Webflow.require("tabs").redraw();

    // Update sidebar millions count for the initially active tab
	const getCurrentStudentName = () => {
	    const currentTab = document.querySelector('.portal-tab-link.w--current');
	    return currentTab ? currentTab.querySelector('.portal-tab-text-semibold').textContent : '';
	};
	this.updateSidebarMillionsCount(getCurrentStudentName());
	
	// Update sidebar millions count on tab change
	document.querySelectorAll('.portal-tab-link').forEach(tab => {
	    tab.addEventListener('click', () => {
		setTimeout(() => {
		    this.updateSidebarMillionsCount(getCurrentStudentName());
		}, 0);
	    });
	});
	this.updateSidebarAnnouncementsCount()
  }

  async fetchData() {
    try {
      const response = await fetch(
        `${this.data.apiBaseURL}getSemesterInvoiceDataV2/${this.data.memberId}`
      );
      if (!response.ok) throw new Error("Network response was not ok");
      const apiData = await response.json();
      return apiData;
    } catch (error) {
      console.error("Fetch error:", error);
      this.noRecord.style.display = 'block';
      throw error;
    }
  }

  renderTabs(data) {
    var $this = this;
    // 1. Combine all invoices and extract unique student names
    const allInvoices = [
      ...(data.classInvoiceData || []),
      ...(data.SummerInvoiceData || []),
    ];
    const studentMap = {};
    allInvoices.forEach((inv) => {
      if (!studentMap[inv.studentName]) {
        studentMap[inv.studentName] = [];
      }
      studentMap[inv.studentName].push(inv);
    });
    const studentNames = Object.keys(studentMap);

    // 2. Get tab menu and content containers
    const tabMenu = document.querySelector(".portal-tab-menus.w-tab-menu");
    const tabContent = document.querySelector(
      ".portal-tab-content.w-tab-content"
    );

    // 3. Clear existing tabs and content
    tabMenu.innerHTML = "";
    tabContent.innerHTML = "";

    // 4. Create tabs and content dynamically
    studentNames.forEach((student, idx) => {
      // Main student tab link
      const tabLink = document.createElement("a");
      tabLink.className =
        "portal-tab-link w-inline-block w-tab-link" +
        (idx === 0 ? " w--current" : "");
      tabLink.setAttribute("data-w-tab", `Tab ${idx + 1}`);
      tabLink.setAttribute("data-tab-index", idx);
      tabLink.setAttribute("aria-selected", idx === 0 ? "true" : "false");
      tabLink.setAttribute("id", `w-tabs-0-data-w-tab-${idx}`);
      tabLink.setAttribute("href", `#w-tabs-0-data-w-pane-${idx}`);
      tabLink.setAttribute("role", "tab");
      tabLink.setAttribute("aria-controls", `w-tabs-0-data-w-pane-${idx}`);
      const tabText = document.createElement("div");
      tabText.className = "poppins-para portal-tab-text-semibold";
      tabText.textContent = student;
      tabLink.appendChild(tabText);
      tabMenu.appendChild(tabLink);

      // Main student tab pane
      const tabPane = document.createElement("div");
      tabPane.className =
        "portal-tab-pane w-tab-pane" + (idx === 0 ? " w--tab-active" : "");
      tabPane.setAttribute("data-w-tab", `Tab ${idx + 1}`);
      tabPane.setAttribute("id", `w-tabs-0-data-w-pane-${idx}`);
      tabPane.setAttribute("role", "tabpanel");
      tabPane.setAttribute("aria-labelledby", `w-tabs-0-data-w-tab-${idx}`);

      // Sub-tabs for Invoice and Summer Invoice (Webflow nested tabs structure)
      const subTabGroup = `invoice-list-${idx}`;
      const subTab1Id = `w-tabs-${idx + 1}-data-w-tab-0`;
      const subTab2Id = `w-tabs-${idx + 1}-data-w-tab-1`;
      const subPane1Id = `w-tabs-${idx + 1}-data-w-pane-0`;
      const subPane2Id = `w-tabs-${idx + 1}-data-w-pane-1`;

      // Sub-tabs wrapper
      const subTabsWrapper = document.createElement("div");
      subTabsWrapper.className = "w-tabs";
      subTabsWrapper.setAttribute("data-tab-group", subTabGroup);
      subTabsWrapper.setAttribute("data-current", "Tab 1");
      subTabsWrapper.setAttribute("data-easing", "ease");
      subTabsWrapper.setAttribute("data-duration-in", "300");
      subTabsWrapper.setAttribute("data-duration-out", "100");

      // Sub-tab menu
      const subTabMenu = document.createElement("div");
      subTabMenu.className = "tab-menus-invoice-history w-tab-menu";
      subTabMenu.setAttribute("role", "tablist");

      // Sub-tab 1: Invoice
      const subTab1 = document.createElement("a");
      subTab1.className =
        "tab-item-invoice-history w-inline-block w-tab-link w--current";
      subTab1.setAttribute("data-w-tab", "Tab 1");
      subTab1.setAttribute("data-tab-index", "0");
      subTab1.setAttribute("id", subTab1Id);
      subTab1.setAttribute("href", `#${subPane1Id}`);
      subTab1.setAttribute("role", "tab");
      subTab1.setAttribute("aria-controls", subPane1Id);
      subTab1.setAttribute("aria-selected", "true");
      const subTab1Text = document.createElement("div");
      subTab1Text.className = "tab-item-text-invoice-history";
      subTab1Text.textContent = "Invoice";
      const subTab1Line = document.createElement("div");
      subTab1Line.className = "tab-active-line";
      subTab1.appendChild(subTab1Text);
      subTab1.appendChild(subTab1Line);

      // Sub-tab 2: Summer Invoice
      const subTab2 = document.createElement("a");
      subTab2.className = "tab-item-invoice-history w-inline-block w-tab-link";
      subTab2.setAttribute("data-w-tab", "Tab 2");
      subTab2.setAttribute("data-tab-index", "1");
      subTab2.setAttribute("id", subTab2Id);
      subTab2.setAttribute("href", `#${subPane2Id}`);
      subTab2.setAttribute("role", "tab");
      subTab2.setAttribute("aria-controls", subPane2Id);
      subTab2.setAttribute("aria-selected", "false");
      subTab2.setAttribute("tabindex", "-1");
      const subTab2Text = document.createElement("div");
      subTab2Text.className = "tab-item-text-invoice-history";
      subTab2Text.textContent = "Summer Invoice";
      const subTab2Line = document.createElement("div");
      subTab2Line.className = "tab-active-line";
      subTab2.appendChild(subTab2Text);
      subTab2.appendChild(subTab2Line);

      subTabMenu.appendChild(subTab1);
      subTabMenu.appendChild(subTab2);

      // Sub-tab content wrapper
      const subTabContent = document.createElement("div");
      subTabContent.className = "w-tab-content";

      // Sub-tab pane 1: Invoice
      const subTabPane1 = document.createElement("div");
      subTabPane1.className = "w-tab-pane w--tab-active";
      subTabPane1.setAttribute("data-w-tab", "Tab 1");
      subTabPane1.setAttribute("id", subPane1Id);
      subTabPane1.setAttribute("role", "tabpanel");
      subTabPane1.setAttribute("aria-labelledby", subTab1Id);

      // Invoice info div
      const infoDiv1 = document.createElement("div");
      infoDiv1.className = "portal-invoices-info-div";
      const title1 = document.createElement("p");
      title1.className = "portal-invoices-table-title";
      title1.textContent = "Completed Invoices";
      infoDiv1.appendChild(title1);

      // Transactions table div
      const transactionsDiv1 = document.createElement("div");
      transactionsDiv1.className = "transactions-table-div";

      // Header grid
      const headerGrid1 = document.createElement("div");
      headerGrid1.className = "invoices-header-grid-wrapper";
      ["Date", "Description", "Action"].forEach((text) => {
        const div = document.createElement("div");
        div.className = "invoices-header-text";
        div.textContent = text;
        headerGrid1.appendChild(div);
      });
      transactionsDiv1.appendChild(headerGrid1);

      // Invoice rows
      const academicRowsDiv = document.createElement("div");
      academicRowsDiv.className = "invoice-rows-academic";
      const classInvoices = (data.classInvoiceData || []).filter(
        (inv) => inv.studentName === student
      );
      if (classInvoices.length > 0) {
        classInvoices.forEach((inv) => {
          const row = document.createElement("div");
          row.className = "invoices-table-row-grid-wrapper";
          // Date
          const dateDiv = document.createElement("div");
          dateDiv.className = "invoices-table-row-text";
          dateDiv.textContent = inv.invoiceDateLast
            ? inv.invoiceDateLast.split(" ")[0]
            : "";
          // Description
          const descDiv = document.createElement("div");
          descDiv.className = "invoices-table-row-text";
          descDiv.textContent = inv.invoiceTitle || "";
          // Action
          const actionDiv = document.createElement("div");
          actionDiv.className = "invoices-action-button-div";
          const eyeImg = document.createElement("img");
          eyeImg.setAttribute("loading", "lazy");
          eyeImg.className = "view-invoice-eye";
          eyeImg.style.cursor = "pointer";
          eyeImg.src =
            "https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/687a385e4d6106073ecd4988_visibility.svg";
          eyeImg.alt = "View";
          eyeImg.addEventListener("click", (e) => {
            const infoDiv = subTabPane1.querySelector(
              ".portal-invoices-info-div"
            );
            if (infoDiv) infoDiv.style.display = "none";
            const detailsDiv = subTabPane1.querySelector(
              ".portal-invoice-details-wrapper"
            );
            if (detailsDiv) detailsDiv.style.display = "block";
            e.stopPropagation();
            const detailsContainer = subTabPane1.querySelector(
              ".portal-invoice-details-wrapper"
            );
            detailsContainer.innerHTML = "";
            $this.displayDetailsPage(inv, "academic", detailsContainer);
          });
          actionDiv.appendChild(eyeImg);

          row.appendChild(dateDiv);
          row.appendChild(descDiv);
          row.appendChild(actionDiv);
          academicRowsDiv.appendChild(row);
        });
      } else {
        const noRecord = document.createElement("div");
        noRecord.textContent = "No Record Found";
        academicRowsDiv.appendChild(noRecord);
      }
      transactionsDiv1.appendChild(academicRowsDiv);
      infoDiv1.appendChild(transactionsDiv1);
      subTabPane1.appendChild(infoDiv1);
      // Details PDF container
      const detailsPdf1 = document.createElement("div");
      detailsPdf1.className = "portal-invoice-details-wrapper";
      subTabPane1.appendChild(detailsPdf1);

      // Sub-tab pane 2: Summer Invoice
      const subTabPane2 = document.createElement("div");
      subTabPane2.className = "w-tab-pane";
      subTabPane2.setAttribute("data-w-tab", "Tab 2");
      subTabPane2.setAttribute("id", subPane2Id);
      subTabPane2.setAttribute("role", "tabpanel");
      subTabPane2.setAttribute("aria-labelledby", subTab2Id);

      // Invoice info div
      const infoDiv2 = document.createElement("div");
      infoDiv2.className = "portal-invoices-info-div";
      const title2 = document.createElement("p");
      title2.className = "portal-invoices-table-title";
      title2.textContent = "Completed Invoices";
      infoDiv2.appendChild(title2);

      // Transactions table div
      const transactionsDiv2 = document.createElement("div");
      transactionsDiv2.className = "transactions-table-div";

      // Header grid
      const headerGrid2 = document.createElement("div");
      headerGrid2.className = "invoices-header-grid-wrapper";
      ["Date", "Description", "Action"].forEach((text) => {
        const div = document.createElement("div");
        div.className = "invoices-header-text";
        div.textContent = text;
        headerGrid2.appendChild(div);
      });
      transactionsDiv2.appendChild(headerGrid2);

      // Invoice rows
      const summerRowsDiv = document.createElement("div");
      summerRowsDiv.className = "invoice-rows-summer";
      const summerInvoices = (data.SummerInvoiceData || []).filter(
        (inv) => inv.studentName === student
      );
      if (summerInvoices.length > 0) {
        summerInvoices.forEach((inv) => {
          const row = document.createElement("div");
          row.className = "invoices-table-row-grid-wrapper";
          // Date
          const dateDiv = document.createElement("div");
          dateDiv.className = "invoices-table-row-text";
          dateDiv.textContent = inv.paymentDate
            ? inv.paymentDate.split(" ")[0]
            : "";
          // Description
          const descDiv = document.createElement("div");
          descDiv.className = "invoices-table-row-text";
          descDiv.textContent = inv.classSessionName || "";
          // Action
          const actionDiv = document.createElement("div");
          actionDiv.className = "invoices-action-button-div";
          const eyeImg = document.createElement("img");
          eyeImg.setAttribute("loading", "lazy");
          eyeImg.className = "view-invoice-eye";
          eyeImg.style.cursor = "pointer";
          eyeImg.src =
            "https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/687a385e4d6106073ecd4988_visibility.svg";
          eyeImg.alt = "View";
          eyeImg.addEventListener("click", (e) => {
            const infoDiv = subTabPane2.querySelector(
              ".portal-invoices-info-div"
            );
            if (infoDiv) infoDiv.style.display = "none";
            const detailsDiv = subTabPane2.querySelector(
              ".portal-invoice-details-wrapper"
            );
            if (detailsDiv) detailsDiv.style.display = "block";
            e.stopPropagation();
            const detailsContainer = subTabPane2.querySelector(
              ".portal-invoice-details-wrapper"
            );
            detailsContainer.innerHTML = "";
            $this.displayDetailsPage(inv, "summer", detailsContainer);
          });
          actionDiv.appendChild(eyeImg);

          row.appendChild(dateDiv);
          row.appendChild(descDiv);
          row.appendChild(actionDiv);
          summerRowsDiv.appendChild(row);
        });
      } else {
        const noRecord = document.createElement("div");
        noRecord.textContent = "No Record Found";
        summerRowsDiv.appendChild(noRecord);
      }
      transactionsDiv2.appendChild(summerRowsDiv);
      infoDiv2.appendChild(transactionsDiv2);
      subTabPane2.appendChild(infoDiv2);
      // Details PDF container
      const detailsPdf2 = document.createElement("div");
      detailsPdf2.className = "portal-invoice-details-wrapper";
      subTabPane2.appendChild(detailsPdf2);

      // Assemble sub-tab content
      subTabContent.appendChild(subTabPane1);
      subTabContent.appendChild(subTabPane2);

      // Assemble sub-tabs
      subTabsWrapper.appendChild(subTabMenu);
      subTabsWrapper.appendChild(subTabContent);

      // Add to main tab pane
      tabPane.appendChild(subTabsWrapper);

      // Add to tab content
      tabContent.appendChild(tabPane);
    });
  }
  creEl(name, className, idName) {
    var el = document.createElement(name);
    if (className) {
      el.className = className;
    }
    if (idName) {
      el.setAttribute("id", idName);
    }
    return el;
  }
  /*Display download file icon for detail page*/
  getInvoiceDownloadIcon($type) {
    var $this = this;
    var a = this.creEl("a", "downloadLink");

    var img = this.creEl("img", "downloadIcon");
    img.class = "download-file";
    img.title = "Download";
    img.src =
      "https://uploads-ssl.webflow.com/6271a4bf060d543533060f47/6434ff69906fb9a8c9c8b4d3_download-file.svg";

    a.appendChild(img);
    a.addEventListener("click", function () {
      $this.downloadInvoice($type);
    });
    return a;
  }
  async downloadInvoice($type) {
    try {
      // Proceed to generate and download the PDF
      if ($type == "summer") {
        var contentToConvert = document.querySelector(".summer-invoice");
      } else {
        var contentToConvert = document.querySelector(".invoice");
      }

      const currentDate = new Date();
      const formattedDate = currentDate
        .toISOString()
        .slice(0, 19)
        .replace(/[-:]/g, "");

      const filename = `Receipt-${formattedDate}.pdf`;

      await html2pdf()
        .from(contentToConvert)
        .set({ margin: 1, filename: filename, html2canvas: { scale: 2 } })
        .save();

      console.log("PDF generated successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      //downloadButton.textContent = originalButtonText;
    }
  }

  displayDetailsPage(item, $type, detailsContainer) {
    console.log("Displaying details for:", item, "Type:", $type);
    if (detailsContainer) {
      detailsContainer.innerHTML = "";

      // Top info flex
      const infoFlex = document.createElement("div");
      infoFlex.className = "invoice-info-flex-wrapper";

      // Back icon
      const backIcon = document.createElement("img");
      backIcon.id = "invoice-back-icon";
      backIcon.src =
        "https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/6881de260d85fded92c4619b_chevron_forward%20(3).svg";
      backIcon.loading = "lazy";
      backIcon.alt = "";
      backIcon.className = "invoice-back-icon";
      backIcon.style.cursor = "pointer";
      backIcon.onclick = () => {
        detailsContainer.innerHTML = "";
        const infoDiv = detailsContainer.parentElement.querySelector(
          ".portal-invoices-info-div"
        );
        if (infoDiv) infoDiv.style.display = "block";
        detailsContainer.style.display = "none";
      };
      infoFlex.appendChild(backIcon);
      detailsContainer.appendChild(infoFlex);
      //Header
      const headerDiv = document.createElement("div");
      headerDiv.className = "invoice-info-header";
      headerDiv.textContent = "Invoice for " + (item.studentName || "");
      infoFlex.appendChild(headerDiv);

      //Download icon
      const downloadIcon = document.createElement("img");
      downloadIcon.id = "invoice-download-icon";
      downloadIcon.src =
        "https://cdn.prod.website-files.com/64091ce7166e6d5fb836545e/6881de3d373802c944ac055b_download%20(1).svg";
      downloadIcon.loading = "lazy";
      downloadIcon.alt = "";
      downloadIcon.className = "invoice-download-icon";
      downloadIcon.style.cursor = "pointer";
      downloadIcon.onclick = () => {
        if (typeof this.downloadInvoice === "function") {
          this.downloadInvoice(item, $type);
        } else {
          alert("Download functionality not implemented.");
        }
      };
      infoFlex.appendChild(downloadIcon);

      detailsContainer.appendChild(infoFlex);

      // Add back button
      // const backBtn = document.createElement('a');
      // backBtn.className = 'portal-invoice-back-btn';
      // backBtn.innerHTML = '<span>&larr; Back</span>';
      // backBtn.style.cursor = 'pointer';
      // backBtn.onclick = () => {
      //     detailsContainer.innerHTML = '';
      //     const infoDiv = detailsContainer.parentElement.querySelector('.portal-invoices-info-div');
      //     if (infoDiv) infoDiv.style.display = 'block';
      //     detailsContainer.style.display = 'none';
      // };
      // detailsContainer.appendChild(backBtn);

      // var downloadIcon = this.getInvoiceDownloadIcon();
      // var downloadCol = this.creEl("div", 'w-col w-col-12 download-icon');
      // downloadCol.appendChild(downloadIcon);
      // detailsContainer.appendChild(downloadCol);

      // Details content
      const detailsDiv = document.createElement("div");
      detailsDiv.className = "portal-invoice-details-content";
      var invoicePdfClass = $type == "summer" ? "summer-invoice" : "invoice";
      detailsContainer.classList.add(invoicePdfClass);
      // Header
      const header = document.createElement("div");
      header.className = "invoice-header";
      const title = document.createElement("h4");
      title.textContent = "Invoice for " + (item.studentName || "");
      // header.appendChild(title);

      header.innerHTML +=
        '<div class="invoice-icon">' +
        `<?xml version="1.0" standalone="no"?>
		<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd">
		<svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="1535.000000pt" height="1534.000000pt" viewBox="0 0 1535.000000 1534.000000" preserveAspectRatio="xMidYMid meet">
			<g transform="translate(0.000000,1534.000000) scale(0.100000,-0.100000)" fill="#000000" stroke="none">
				<path d="M7295 15333 c-651 -39 -1194 -131 -1765 -298 -1494 -437 -2809 -1312
		-3811 -2535 -776 -947 -1327 -2117 -1568 -3330 -103 -518 -145 -952 -145
		-1500 0 -537 42 -976 140 -1475 367 -1864 1409 -3519 2945 -4672 1104 -829
		2455 -1354 3829 -1488 499 -48 1033 -48 1520 1 1390 138 2715 656 3835 1496
		494 372 951 808 1340 1283 689 840 1198 1832 1478 2880 115 429 187 839 234
		1335 25 265 25 1015 0 1280 -47 496 -119 906 -234 1335 -443 1658 -1435 3125
		-2818 4163 -1208 907 -2632 1428 -4155 1522 -147 9 -696 11 -825 3z m670 -333
		c917 -39 1750 -226 2580 -577 219 -93 626 -298 830 -417 1936 -1139 3251
		-3087 3564 -5282 102 -713 102 -1395 0 -2108 -150 -1053 -534 -2065 -1124
		-2961 -922 -1403 -2284 -2445 -3875 -2964 -1612 -525 -3389 -469 -4965 159
		-1467 584 -2704 1620 -3542 2970 -1032 1661 -1352 3693 -882 5601 594 2417
		2396 4384 4756 5193 593 203 1257 335 1883 376 308 20 489 22 775 10z" />
				<path d="M6387 14532 c-162 -37 -196 -48 -193 -61 2 -9 7 -29 11 -45 5 -25 9
		-28 38 -23 18 3 61 9 98 12 l65 7 73 -326 c41 -180 72 -328 70 -330 -2 -2
		-155 129 -339 291 -184 162 -349 305 -367 319 l-32 26 -157 -37 c-87 -19 -160
		-37 -162 -40 -6 -6 7 -74 16 -78 4 -3 32 -1 62 3 45 6 58 5 72 -9 10 -10 50
		-169 117 -466 56 -247 101 -453 101 -456 0 -4 -28 -17 -62 -29 -35 -13 -66
		-26 -70 -29 -10 -9 11 -81 23 -81 13 0 423 92 427 95 2 2 -2 22 -8 45 l-11 41
		-57 -6 c-31 -3 -75 -8 -97 -11 l-40 -4 -69 307 c-38 170 -77 343 -86 386 -16
		71 -17 77 -2 65 9 -7 195 -168 412 -358 217 -190 402 -350 410 -357 20 -16
		110 4 110 25 0 8 -52 244 -115 524 -64 281 -114 512 -113 514 2 1 32 13 68 27
		60 23 65 27 63 53 -3 43 -11 54 -35 53 -13 -1 -112 -22 -221 -47z" />
				<path d="M9091 14466 c-24 -64 -26 -61 48 -91 l69 -27 -20 -72 c-19 -71 -157
		-528 -225 -745 l-35 -113 -51 7 c-95 14 -98 14 -113 -27 l-13 -38 112 -34
		c314 -97 388 -119 455 -132 330 -64 589 100 684 433 31 108 31 271 -1 357 -46
		128 -146 237 -274 300 -40 19 -197 73 -350 119 -273 83 -279 84 -286 63z m417
		-202 c129 -37 205 -96 251 -193 24 -51 26 -66 25 -176 -1 -100 -5 -135 -28
		-210 -54 -178 -146 -309 -254 -362 -46 -23 -70 -27 -132 -27 -81 0 -198 28
		-207 50 -5 14 221 780 272 922 6 15 6 15 73 -4z" />
				<path d="M4005 13634 c-209 -125 -381 -228 -383 -229 -3 -3 38 -75 43 -75 2 0
		33 13 69 30 l67 29 43 -67 c52 -82 417 -695 439 -738 l16 -31 -59 -43 -60 -43
		22 -38 22 -39 35 21 c298 174 761 455 761 462 0 13 -140 267 -147 267 -12 0
		-103 -56 -103 -63 0 -4 16 -49 35 -98 19 -50 35 -94 35 -99 0 -7 -316 -200
		-328 -200 -4 0 -54 78 -111 173 -58 94 -111 181 -118 192 -12 20 -7 24 79 75
		50 30 94 56 98 58 4 1 28 -24 54 -57 l48 -59 34 20 c19 11 36 24 39 28 3 5
		-40 86 -96 179 l-101 170 -39 -22 c-21 -12 -39 -27 -39 -34 0 -6 12 -39 26
		-73 15 -33 25 -62 23 -64 -2 -2 -46 -29 -96 -60 l-92 -55 -87 147 c-48 81 -96
		162 -107 180 -17 29 -18 36 -6 46 19 18 290 179 293 175 1 -2 31 -38 66 -79
		35 -41 66 -77 68 -80 2 -2 28 9 58 25 36 20 53 34 49 44 -8 21 -159 251 -165
		251 -3 0 -176 -102 -385 -226z" />
				<path d="M11131 13633 c-20 -31 -21 -38 -9 -47 8 -6 34 -28 58 -48 l43 -38
		-80 -118 c-89 -134 -436 -637 -457 -665 -14 -18 -17 -17 -80 18 l-65 36 -25
		-37 -25 -37 242 -165 c133 -91 305 -209 382 -263 77 -53 144 -94 149 -92 4 3
		48 60 97 126 l89 120 -50 34 c-27 18 -52 33 -54 33 -3 0 -39 -35 -79 -77 l-74
		-76 -159 108 c-87 59 -160 109 -162 111 -2 1 54 88 124 193 l127 190 46 -31
		c25 -17 67 -47 93 -65 l48 -34 -35 -69 -34 -68 40 -27 c23 -14 42 -25 43 -23
		2 2 53 77 115 166 123 179 120 167 52 204 -22 12 -27 10 -72 -41 -32 -35 -53
		-52 -63 -48 -9 4 -52 31 -96 62 l-80 57 61 86 c33 48 88 126 121 174 l61 87
		147 -100 148 -101 -44 -95 c-24 -52 -44 -97 -44 -101 0 -9 99 -77 104 -71 10
		11 166 263 163 264 -18 14 -737 505 -739 505 -2 0 -14 -17 -27 -37z" />
				<path d="M7428 12989 c-1571 -71 -2993 -815 -3983 -2084 -180 -230 -390 -565
		-530 -845 -306 -612 -481 -1232 -547 -1935 -17 -183 -17 -727 0 -910 86 -925
		374 -1744 878 -2500 199 -299 390 -531 664 -806 638 -640 1395 -1093 2246
		-1344 1030 -304 2144 -291 3163 37 448 144 927 376 1319 639 295 198 515 381
		803 668 452 452 741 853 1014 1406 254 513 414 1026 494 1585 69 480 69 1060
		0 1540 -80 559 -241 1074 -494 1585 -275 555 -562 953 -1014 1406 -453 452
		-852 741 -1406 1014 -674 334 -1360 509 -2130 545 -229 10 -233 10 -477 -1z
		m574 -189 c691 -47 1317 -213 1933 -515 522 -256 961 -570 1375 -985 745 -744
		1238 -1680 1425 -2702 60 -329 79 -559 79 -928 0 -369 -20 -600 -79 -928 -232
		-1266 -942 -2408 -1980 -3186 -444 -333 -957 -600 -1480 -771 -845 -277 -1747
		-328 -2630 -150 -974 197 -1884 688 -2601 1403 -751 750 -1260 1730 -1433
		2762 -59 346 -66 440 -66 870 0 430 7 524 66 870 136 811 492 1619 1002 2274
		481 618 1107 1129 1802 1471 615 301 1306 482 1980 518 148 8 467 6 607 -3z" />
				<path d="M5800 11355 l0 -105 -57 47 c-115 93 -267 146 -418 146 -110 0 -194
		-20 -300 -72 -189 -94 -317 -255 -376 -476 -31 -113 -31 -315 -1 -436 56 -228
		156 -428 317 -634 81 -103 241 -259 892 -869 461 -431 536 -506 560 -553 20
		-42 24 -59 16 -72 -15 -24 -39 -25 -70 -3 -84 58 -186 54 -259 -10 -101 -89
		-99 -242 4 -325 227 -183 577 -109 699 147 15 30 28 57 29 59 2 2 38 -29 81
		-69 72 -68 191 -165 327 -267 69 -53 112 -111 132 -180 12 -42 13 -61 5 -85
		-15 -41 -14 -48 4 -48 26 0 28 -28 5 -75 -26 -54 -36 -55 -191 -25 -143 29
		-221 51 -459 130 -245 82 -379 109 -590 117 -201 7 -370 -8 -695 -62 -526 -89
		-957 -157 -962 -151 -3 2 15 31 40 63 124 161 257 409 316 588 96 291 99 595
		10 856 -26 76 -86 199 -97 199 -5 0 -14 -22 -21 -49 -34 -135 -169 -348 -340
		-540 l-39 -44 -19 44 c-47 105 -181 296 -377 539 l-101 124 -3 -39 c-18 -289
		-81 -770 -113 -862 -64 -189 -175 -275 -474 -364 -319 -95 -379 -152 -391
		-376 -4 -61 -1 -156 5 -218 23 -217 131 -842 155 -897 16 -39 90 -111 163
		-161 318 -214 1038 -250 1953 -96 129 22 316 59 415 84 237 58 328 69 500 62
		169 -7 258 -27 444 -102 178 -70 342 -119 510 -152 75 -14 143 -28 151 -30 8
		-3 -23 -16 -70 -29 -128 -38 -279 -101 -393 -164 l-102 -56 -5 -45 -5 -44
		-127 -3 -128 -3 0 -759 0 -760 -85 0 -85 0 0 -195 0 -195 1483 2 1482 3 3 193
		2 192 -85 0 -85 0 0 760 0 760 -130 0 -130 0 0 43 c0 43 0 43 -72 85 -142 81
		-281 139 -458 193 -54 17 -68 24 -50 26 163 23 491 107 620 159 210 84 311
		105 505 105 158 0 257 -13 530 -70 223 -47 456 -82 720 -110 365 -39 472 -46
		735 -46 287 0 381 11 585 70 197 57 374 174 430 285 38 74 135 593 171 908 25
		220 3 345 -76 436 -48 54 -101 81 -266 135 -311 101 -475 208 -518 339 -51
		153 -116 631 -116 854 0 37 -4 69 -9 72 -17 11 -186 -215 -409 -546 -47 -71
		-91 -128 -98 -128 -15 0 -106 104 -177 202 -58 82 -149 253 -188 356 -13 34
		-27 62 -30 62 -8 0 -73 -163 -92 -230 -33 -117 -47 -224 -47 -364 0 -271 60
		-503 202 -778 54 -106 163 -275 206 -320 l26 -28 -30 0 c-78 0 -357 44 -729
		115 -384 74 -403 76 -675 82 -391 9 -585 -17 -900 -121 -242 -79 -504 -138
		-545 -122 -19 7 -59 92 -50 106 3 6 13 10 20 10 12 0 13 12 8 60 -5 54 -3 66
		26 125 35 70 55 89 220 212 57 42 145 116 196 165 51 48 95 88 98 88 3 0 16
		-24 30 -52 49 -107 160 -202 278 -239 203 -63 456 38 499 200 25 93 -24 195
		-113 236 -71 34 -121 32 -195 -6 -51 -27 -64 -30 -77 -19 -41 34 1 105 141
		240 55 53 347 328 649 612 655 613 728 695 864 966 105 209 147 387 138 587
		-7 143 -23 208 -84 334 -38 79 -59 108 -127 175 -91 91 -161 136 -265 172
		-141 49 -293 50 -432 4 -83 -28 -124 -50 -195 -103 l-59 -45 -5 96 -5 97
		-1862 3 -1863 2 0 -105z m3570 -123 c0 -120 -21 -380 -46 -582 -72 -577 -247
		-1171 -494 -1675 -195 -399 -421 -671 -776 -936 -72 -54 -146 -115 -163 -136
		-41 -49 -90 -147 -97 -195 l-7 -38 -121 0 -122 0 -18 58 c-41 130 -102 201
		-294 341 -255 185 -513 482 -675 777 -164 301 -336 760 -437 1167 -98 399
		-140 695 -165 1175 l-6 112 1710 0 1711 0 0 -68z m-3949 48 c95 -18 195 -73
		268 -148 109 -111 157 -239 148 -392 -5 -95 -31 -178 -76 -249 -45 -69 -69
		-91 -99 -91 -58 0 -69 51 -23 109 165 210 96 509 -148 629 -70 35 -80 37 -165
		36 -70 0 -105 -6 -149 -23 -119 -47 -215 -152 -258 -283 -20 -62 -24 -92 -23
		-198 1 -106 5 -139 28 -215 51 -169 150 -346 282 -505 32 -39 338 -333 679
		-653 341 -320 644 -606 673 -636 75 -77 135 -202 140 -290 2 -37 -1 -85 -7
		-108 -28 -102 -126 -190 -239 -214 -135 -28 -318 73 -257 141 21 24 67 26 85
		5 7 -8 37 -22 66 -31 43 -12 61 -13 96 -4 90 24 148 98 148 187 0 65 -52 173
		-116 240 -27 28 -312 297 -634 598 -322 300 -625 589 -673 643 -145 158 -269
		357 -330 529 -119 330 -47 668 176 827 128 91 264 123 408 96z m4698 -5 c180
		-43 326 -181 392 -373 100 -291 -17 -678 -313 -1029 -38 -46 -356 -352 -706
		-681 -350 -329 -651 -615 -668 -634 -39 -44 -81 -132 -90 -186 -11 -73 37
		-161 110 -199 48 -25 126 -21 179 11 55 32 92 34 107 5 19 -35 7 -62 -43 -96
		-153 -103 -360 -39 -441 136 -15 34 -21 66 -20 121 0 81 22 143 87 244 19 31
		269 273 672 651 352 330 668 632 703 671 110 121 216 288 272 427 93 232 97
		433 13 602 -72 144 -248 247 -402 232 -323 -30 -486 -399 -290 -659 43 -58 47
		-73 22 -100 -27 -30 -67 -23 -103 20 -78 93 -127 253 -115 372 33 321 327 537
		634 465z m-4692 -276 c51 -25 118 -97 134 -146 6 -19 9 -65 7 -102 -3 -66 -22
		-110 -78 -181 -33 -42 -46 -112 -31 -167 24 -90 90 -149 180 -160 74 -8 129
		16 191 83 31 34 52 51 54 42 2 -7 14 -65 26 -128 50 -269 186 -734 279 -959
		17 -41 30 -76 28 -78 -9 -8 -847 790 -901 858 -175 219 -267 430 -267 612 -1
		124 21 192 84 263 69 79 202 108 294 63z m4681 -1 c63 -30 117 -89 144 -156
		18 -47 22 -76 22 -167 0 -97 -4 -121 -32 -202 -59 -171 -158 -334 -290 -474
		-75 -80 -827 -791 -842 -797 -5 -2 12 48 36 110 103 261 216 653 275 955 l22
		113 52 -54 c39 -42 64 -58 105 -70 63 -19 73 -19 123 -5 82 22 147 110 147
		198 0 62 -10 88 -58 154 -46 60 -62 104 -62 161 0 99 51 182 139 228 69 36
		153 38 219 6z m-6036 -2280 c34 -51 106 -166 159 -256 l97 -164 77 74 c67 63
		138 143 303 343 l33 40 -5 -185 c-5 -202 -16 -270 -72 -438 -59 -180 -173
		-380 -309 -542 -116 -138 -104 -131 -253 -138 -258 -10 -643 48 -989 150 -78
		22 -84 30 -72 88 13 60 56 86 251 150 179 59 343 132 432 191 132 88 215 295
		262 649 9 72 18 130 20 130 2 0 32 -42 66 -92z m7269 -123 c38 -253 98 -413
		191 -511 72 -76 266 -172 491 -244 89 -28 173 -57 186 -63 38 -19 62 -59 64
		-107 2 -43 1 -45 -38 -58 -87 -30 -354 -92 -493 -116 -210 -35 -385 -50 -536
		-43 l-131 5 -53 58 c-250 276 -402 589 -441 909 -13 104 -14 284 -3 302 5 9
		38 -24 99 -100 109 -134 219 -255 272 -296 l38 -30 78 132 c43 73 114 188 159
		257 l81 124 7 -39 c4 -22 17 -103 29 -180z m-5006 -1070 c124 -19 181 -35 320
		-90 493 -195 1074 -242 1585 -129 133 30 300 82 417 130 154 63 419 104 674
		104 173 0 324 -20 537 -70 491 -114 883 -163 1322 -163 410 0 747 42 1020 129
		41 13 76 22 78 20 5 -5 -125 -730 -142 -794 -21 -78 -69 -145 -134 -189 -273
		-181 -959 -198 -1942 -47 -162 25 -253 42 -447 86 -84 19 -129 22 -318 22
		-243 1 -334 -12 -514 -76 -268 -94 -521 -157 -786 -195 -185 -26 -629 -26
		-800 1 -174 26 -380 80 -540 141 -152 57 -361 118 -465 134 -82 14 -274 14
		-365 1 -38 -6 -125 -24 -192 -40 -151 -37 -415 -82 -678 -114 -775 -98 -1333
		-78 -1596 55 -124 62 -174 133 -208 294 -23 106 -131 719 -128 722 1 1 46 -11
		99 -27 603 -179 1427 -167 2298 35 126 29 285 56 400 68 102 11 413 6 505 -8z
		m1434 -52 c7 -21 15 -44 17 -50 4 -10 -24 -13 -123 -13 l-130 0 16 50 16 50
		96 0 96 0 12 -37z m57 -1474 c207 -20 429 -80 604 -162 l75 -36 -840 1 -840 0
		80 38 c268 130 615 190 921 159z m994 -1064 l0 -685 -1157 2 -1158 3 -3 670
		c-1 369 0 676 3 683 3 9 245 12 1160 12 l1155 0 0 -685z m170 -875 l0 -40
		-1330 0 -1330 0 0 40 0 40 1330 0 1330 0 0 -40z" />
				<path d="M8641 7214 c-77 -16 -130 -55 -150 -109 -13 -32 -13 -43 0 -78 21
		-61 65 -87 146 -87 81 0 129 -19 135 -54 12 -59 -47 -101 -127 -90 -29 4 -48
		15 -70 39 -45 52 -60 34 -33 -39 l22 -58 76 4 c133 6 220 70 220 163 0 76 -59
		125 -152 125 -77 0 -123 15 -136 46 -21 44 9 79 76 90 38 6 44 4 78 -30 48
		-48 61 -36 40 38 -19 64 -19 64 -125 40z" />
				<path d="M5314 7191 c-76 -35 -109 -106 -80 -174 19 -48 64 -74 140 -82 101
		-12 138 -43 116 -100 -12 -31 -40 -45 -89 -45 -56 0 -86 14 -107 49 -20 34
		-59 44 -50 14 3 -10 10 -39 17 -65 11 -47 12 -48 53 -49 126 -4 192 15 238 69
		37 44 44 84 21 129 -26 53 -71 80 -149 88 -73 8 -114 33 -114 71 0 63 105 90
		155 39 14 -13 25 -29 25 -35 0 -5 9 -10 21 -10 17 0 20 5 16 23 -3 12 -9 39
		-12 60 l-7 37 -77 0 c-52 0 -89 -6 -117 -19z" />
				<path d="M9630 7197 c0 -8 12 -19 26 -25 17 -8 24 -18 20 -30 -3 -9 -16 -80
		-31 -157 -36 -197 -32 -185 -60 -185 -23 0 -42 -16 -32 -27 3 -3 75 -18 159
		-34 84 -15 165 -30 179 -33 25 -5 26 -2 37 58 15 79 15 86 -1 86 -7 0 -23 -20
		-37 -45 -14 -25 -32 -45 -41 -45 -16 0 -132 21 -137 25 -2 2 11 79 28 171 32
		173 41 194 83 194 10 0 17 5 15 12 -3 7 -45 21 -94 30 -111 21 -114 21 -114 5z" />
				<path d="M6395 7170 c-3 -5 3 -15 15 -22 11 -7 20 -20 20 -29 0 -18 -93 -286
		-110 -319 -7 -13 -21 -20 -41 -20 -54 0 -27 -21 71 -56 52 -19 98 -34 103 -34
		15 0 6 23 -17 41 l-25 19 20 58 c10 31 21 63 24 70 4 10 11 9 30 -7 55 -42
		125 -38 181 11 69 61 64 152 -13 202 -30 20 -226 96 -247 96 -3 0 -8 -4 -11
		-10z m198 -108 c11 -10 17 -30 17 -58 0 -76 -62 -125 -120 -94 -18 10 -18 12
		5 78 36 105 35 103 59 96 11 -3 29 -13 39 -22z" />
				<path d="M4881 7118 c-172 -85 -144 -389 42 -439 91 -24 201 15 248 89 72 113
		34 287 -76 349 -55 31 -153 32 -214 1z m140 -35 c36 -22 64 -79 79 -160 13
		-77 4 -137 -27 -174 -32 -37 -96 -41 -132 -7 -60 55 -92 226 -57 300 27 57 83
		73 137 41z" />
				<path d="M10100 7105 c-78 -35 -120 -104 -128 -206 -2 -38 1 -82 8 -103 45
		-138 236 -190 346 -94 60 53 79 100 79 200 0 80 -2 89 -30 129 -16 23 -48 52
		-70 63 -52 27 -157 32 -205 11z m149 -40 c40 -20 56 -67 55 -155 -1 -83 -31
		-170 -68 -195 -30 -21 -89 -19 -119 5 -38 30 -53 108 -38 195 14 80 31 115 67
		144 31 25 64 27 103 6z" />
				<path d="M11538 7096 c-86 -23 -138 -77 -138 -144 0 -83 65 -131 178 -132 53
		0 67 -4 87 -25 32 -31 32 -60 -1 -90 -22 -20 -37 -25 -82 -25 -50 0 -58 3 -88
		35 -55 59 -65 47 -37 -43 l17 -55 74 6 c139 11 225 75 224 168 -1 81 -51 117
		-173 128 -55 5 -84 12 -98 25 -48 44 -4 106 75 106 37 0 47 -5 70 -34 27 -34
		59 -39 50 -7 -3 9 -10 35 -16 59 -11 41 -12 42 -53 41 -23 0 -63 -6 -89 -13z" />
				<path d="M3424 7088 c-4 -6 -3 -13 3 -15 6 -2 18 -10 28 -17 18 -13 18 -20 -5
		-182 -13 -93 -27 -175 -33 -181 -5 -7 -18 -13 -28 -13 -16 0 -35 -17 -28 -25
		4 -4 353 -55 375 -55 7 0 16 16 19 38 4 20 9 49 11 65 9 43 -22 34 -47 -14
		-20 -39 -22 -41 -57 -36 -20 3 -61 9 -90 13 -48 6 -53 9 -48 28 2 11 8 50 12
		85 l7 63 36 -6 c20 -3 41 -6 48 -6 7 0 16 -15 21 -32 4 -18 15 -34 24 -36 13
		-2 17 11 24 70 11 95 11 91 -3 95 -6 2 -19 -10 -28 -27 -15 -30 -18 -31 -63
		-24 -26 3 -48 7 -49 8 -1 1 3 35 9 75 l11 73 56 -7 c95 -11 98 -13 105 -56 4
		-25 12 -39 21 -39 14 0 18 11 30 81 l5 36 -162 22 c-90 12 -170 25 -180 27 -9
		3 -20 -1 -24 -8z" />
				<path d="M4558 7083 c-55 -5 -63 -23 -19 -39 26 -10 29 -16 36 -78 4 -37 4
		-70 1 -73 -5 -5 -169 -24 -172 -20 -1 1 -4 35 -8 75 -6 70 -5 73 19 84 14 6
		25 18 25 25 0 15 -57 13 -173 -3 -39 -6 -46 -26 -11 -32 10 -2 23 -8 28 -12 8
		-8 35 -247 36 -323 0 -31 -5 -40 -25 -49 -31 -14 -27 -34 6 -31 141 10 179 16
		179 27 0 6 -13 16 -29 22 -27 11 -29 15 -36 88 -4 43 -5 79 -3 82 2 2 43 7 90
		10 l85 7 6 -78 c7 -79 0 -105 -29 -105 -8 0 -14 -7 -14 -16 0 -14 11 -15 88
		-9 97 7 122 12 122 25 0 4 -13 13 -29 18 -33 12 -33 10 -51 206 -15 159 -14
		165 15 176 14 5 25 14 25 20 0 10 -60 11 -162 3z" />
				<path d="M8155 7061 c-110 -51 -153 -175 -105 -304 32 -86 112 -147 193 -147
		151 0 255 123 227 270 -25 130 -101 200 -217 200 -35 0 -74 -8 -98 -19z m131
		-47 c50 -34 104 -194 90 -269 -15 -78 -93 -110 -156 -65 -65 46 -112 223 -80
		301 23 55 89 70 146 33z" />
				<path d="M10596 7056 c-99 -37 -156 -121 -156 -231 0 -63 18 -113 56 -155 51
		-57 104 -73 214 -68 49 2 95 9 101 15 6 6 13 39 16 73 6 57 8 63 34 72 38 13
		38 38 1 38 -16 0 -63 3 -105 6 -65 6 -77 5 -77 -8 0 -9 11 -19 25 -22 23 -6
		25 -11 25 -61 0 -30 -5 -57 -12 -61 -6 -4 -31 -7 -55 -7 -77 0 -113 56 -113
		175 0 84 22 142 66 177 24 19 37 22 76 18 59 -7 108 -32 108 -55 0 -10 7 -27
		15 -38 13 -16 16 -17 25 -4 5 8 10 36 10 62 l0 46 -47 16 c-74 24 -162 29
		-207 12z" />
				<path d="M3810 6985 c0 -77 22 -90 41 -25 l12 40 54 0 53 0 0 -179 0 -179 -30
		-11 c-60 -20 -32 -31 80 -31 87 0 110 3 110 14 0 7 -13 16 -30 20 l-30 6 0
		185 0 185 46 0 c44 0 46 -1 65 -46 20 -43 45 -56 43 -21 0 10 -1 37 -2 62 l-2
		45 -205 0 -205 0 0 -65z" />
				<path d="M11056 7035 c-88 -31 -135 -109 -136 -221 0 -102 35 -167 109 -206
		115 -60 246 -23 304 86 31 58 31 184 0 242 -52 98 -166 139 -277 99z m118 -39
		c48 -20 70 -72 74 -178 3 -74 1 -94 -17 -132 -25 -50 -63 -72 -109 -61 -60 13
		-94 84 -96 195 -1 94 16 146 58 171 37 23 47 23 90 5z" />
				<path d="M6867 6991 c-19 -25 -75 -108 -126 -183 -66 -100 -98 -139 -116 -144
		-45 -11 -27 -30 45 -46 56 -12 70 -12 70 -2 0 7 -9 19 -21 28 -21 14 -21 14
		13 63 l33 49 67 -14 c73 -16 72 -16 84 -94 l6 -48 -32 0 c-58 0 -27 -23 56
		-41 43 -10 87 -18 97 -18 23 -1 22 17 -3 37 -15 14 -25 55 -50 207 -40 255
		-37 242 -65 247 -18 4 -30 -4 -58 -41z m18 -163 l7 -57 -33 9 c-19 5 -42 10
		-52 12 -15 3 -13 11 19 62 42 66 48 63 59 -26z" />
				<path d="M7086 6983 c-3 -3 -6 -33 -6 -65 0 -71 19 -78 43 -17 l16 41 48 -7
		c26 -4 49 -8 50 -9 5 -4 -27 -348 -32 -357 -4 -5 -17 -9 -31 -9 -14 0 -24 -6
		-24 -14 0 -14 40 -21 169 -28 53 -4 66 15 21 30 -17 6 -30 18 -30 27 0 25 20
		254 26 303 l5 43 47 -3 c46 -3 47 -4 60 -45 18 -55 38 -55 45 -2 6 49 10 53
		40 45 23 -5 24 -10 36 -153 7 -82 15 -162 18 -180 4 -27 1 -33 -24 -45 -38
		-18 -31 -33 15 -31 105 5 173 15 169 26 -2 7 -13 13 -25 15 -30 5 -38 25 -45
		108 l-6 72 85 7 c47 4 87 5 89 3 2 -2 7 -40 11 -84 6 -79 6 -80 -20 -92 -14
		-6 -26 -17 -26 -23 0 -9 21 -10 77 -5 42 3 89 6 105 6 38 0 37 25 -2 39 -16 5
		-30 15 -30 22 0 6 -7 86 -16 178 -9 100 -12 167 -6 169 21 7 46 31 40 37 -12
		13 -201 -9 -206 -23 -2 -7 8 -15 27 -18 27 -6 30 -10 36 -58 13 -98 11 -100
		-79 -108 -44 -4 -82 -5 -85 -2 -3 3 -7 38 -9 78 -4 72 -4 73 22 80 26 6 34 20
		18 30 -5 3 -46 1 -93 -4 -75 -7 -309 4 -475 24 -23 3 -44 2 -48 -1z" />
				<path d="M2630 12547 c-97 -48 -263 -216 -313 -317 -47 -96 -67 -175 -67 -270
		0 -163 58 -289 196 -426 74 -74 107 -100 175 -133 145 -71 263 -87 398 -56
		198 47 391 231 470 449 17 48 31 95 31 104 0 9 -35 48 -77 86 -43 38 -109 98
		-147 133 l-68 63 26 34 c32 43 32 46 -2 79 l-29 28 -154 -173 c-204 -229 -187
		-204 -153 -231 16 -12 32 -22 36 -22 4 0 35 24 68 53 l60 53 140 -123 c77 -67
		140 -126 140 -130 0 -17 -52 -90 -91 -128 -23 -22 -66 -52 -97 -67 -51 -25
		-68 -28 -157 -28 -92 0 -106 3 -167 32 -175 83 -337 242 -400 395 -17 40 -22
		74 -22 143 -1 79 2 97 27 147 33 68 99 138 156 168 l41 21 96 -57 96 -57 38
		44 c22 24 39 47 40 50 0 12 -194 169 -209 169 -9 0 -45 -15 -81 -33z" />
				<path d="M12730 12340 l-34 -28 38 -57 c20 -31 35 -63 32 -70 -7 -18 -713
		-581 -744 -593 -8 -2 -36 18 -65 46 l-52 51 -32 -27 -33 -27 183 -230 c101
		-126 211 -256 245 -287 162 -149 344 -170 470 -54 102 93 114 223 37 377 l-26
		51 45 -32 c69 -46 108 -60 179 -60 157 0 270 128 254 287 -10 92 -63 180 -268
		437 -104 132 -191 241 -192 242 -1 1 -18 -10 -37 -26z m248 -393 c76 -98 100
		-184 68 -246 -17 -32 -83 -94 -123 -114 -90 -46 -152 -29 -250 70 -40 40 -73
		77 -73 82 0 9 319 261 331 261 4 0 25 -24 47 -53z m-398 -334 c55 -74 90 -156
		90 -206 -1 -70 -67 -159 -152 -203 -72 -37 -172 -14 -248 58 -59 55 -114 128
		-104 138 27 26 350 280 357 280 4 0 30 -30 57 -67z" />
				<path d="M1427 10748 c-61 -33 -126 -101 -170 -178 -30 -54 -260 -570 -255
		-575 6 -5 67 -35 72 -35 3 0 21 29 41 64 l36 65 70 -29 c170 -71 819 -363 819
		-370 0 -4 -9 -33 -20 -65 -11 -32 -20 -62 -20 -67 0 -7 59 -38 74 -38 4 0 216
		475 216 485 0 5 -63 35 -74 35 -3 0 -21 -29 -41 -64 l-36 -65 -77 33 c-260
		112 -322 141 -322 149 0 28 76 149 105 167 46 28 97 26 292 -16 199 -42 219
		-40 281 32 40 45 85 139 97 206 7 35 5 37 -33 57 l-41 21 -33 -60 c-18 -33
		-35 -60 -39 -60 -3 0 -66 11 -139 25 -216 41 -296 32 -370 -40 l-35 -34 0 92
		c0 106 -19 161 -77 219 -52 52 -102 72 -188 75 -69 3 -80 1 -133 -29z m173
		-215 c120 -61 151 -171 89 -319 -17 -41 -35 -77 -40 -80 -8 -5 -87 28 -331
		140 l-78 35 35 78 c46 99 74 135 127 162 55 28 121 23 198 -16z" />
				<path d="M12853 10286 c-17 -6 -34 -14 -37 -17 -5 -5 125 -354 137 -365 9 -9
		77 25 77 38 -1 7 -7 40 -15 73 -8 32 -13 60 -11 62 1 1 61 6 132 9 l130 7 67
		-174 c37 -96 67 -177 67 -180 0 -6 -197 -169 -204 -169 -2 0 -21 29 -41 65
		-20 36 -38 65 -41 65 -2 0 -20 -7 -39 -15 l-35 -14 24 -63 c73 -194 158 -413
		161 -416 2 -2 20 4 40 12 36 15 37 17 29 53 -18 88 -42 62 396 428 223 185
		418 350 434 365 l29 28 -23 66 -24 66 -64 0 c-78 0 -837 -27 -978 -35 l-101
		-5 -32 59 c-17 33 -35 62 -39 64 -4 3 -21 -1 -39 -7z m1012 -175 c-6 -4 -86
		-70 -180 -146 -93 -76 -177 -144 -186 -152 -14 -12 -22 2 -73 133 -31 81 -55
		148 -54 149 3 3 341 20 448 23 30 1 50 -2 45 -7z" />
				<path d="M699 8828 c0 -13 -21 -213 -48 -445 -51 -458 -52 -433 9 -433 31 0
		35 8 55 108 6 28 11 32 38 32 26 0 686 -72 884 -96 l52 -7 3 -76 3 -76 43 -3
		c35 -3 42 0 42 15 0 10 23 216 50 458 27 242 46 443 42 446 -10 9 -294 50
		-300 44 -4 -3 -9 -31 -12 -61 -7 -65 -12 -61 113 -95 80 -22 87 -26 87 -49 0
		-48 -38 -351 -44 -358 -6 -6 -312 20 -410 35 l-38 6 6 66 c4 36 9 87 12 113
		l6 47 77 3 76 3 3 48 c2 37 0 47 -12 47 -9 0 -97 9 -197 21 -100 11 -182 19
		-184 17 -2 -2 -5 -23 -7 -48 l-3 -44 70 -19 c39 -11 72 -20 73 -22 2 -2 -2
		-53 -8 -114 l-13 -111 -31 5 c-17 3 -110 14 -206 26 -96 11 -177 23 -179 25
		-6 5 29 335 35 346 3 5 29 8 57 8 29 0 76 3 104 6 58 7 60 11 65 84 l3 45 -65
		6 c-36 4 -107 9 -157 13 -92 7 -93 6 -94 -16z" />
				<path d="M14251 8673 l-54 -4 6 -60 c3 -33 7 -62 9 -64 1 -2 51 -7 111 -13 59
		-5 109 -11 112 -13 10 -11 20 -221 10 -225 -5 -2 -190 -17 -410 -34 -220 -16
		-434 -33 -476 -36 l-77 -6 -11 69 c-18 102 -16 99 -61 95 -39 -4 -40 -5 -40
		-45 0 -47 28 -422 36 -485 l5 -43 42 3 42 3 3 83 c2 45 6 82 10 82 4 0 106 9
		227 20 302 26 733 55 738 50 3 -3 7 -55 11 -116 l7 -110 -77 -18 c-154 -37
		-144 -31 -144 -86 0 -81 -9 -77 165 -60 85 9 157 19 160 22 4 3 -11 229 -31
		502 l-38 496 -110 -2 c-61 -1 -135 -3 -165 -5z" />
				<path d="M1432 7002 c-63 -23 -123 -78 -152 -139 -17 -37 -37 -136 -40 -203
		-1 -8 -12 5 -25 30 -33 65 -98 126 -152 144 -131 45 -257 -6 -321 -129 -21
		-41 -26 -67 -30 -145 -3 -83 4 -133 52 -388 30 -162 57 -296 60 -299 2 -3 22
		-2 44 2 l39 6 -5 74 -5 74 39 10 c52 14 840 159 883 163 l35 3 20 -69 19 -68
		40 5 c21 3 41 7 43 10 7 7 -94 539 -117 614 -76 247 -247 369 -427 305z m216
		-237 c72 -31 119 -100 147 -217 26 -111 44 -98 -202 -146 -120 -23 -223 -42
		-229 -42 -27 0 -43 200 -23 275 30 107 195 176 307 130z m-521 -155 c56 -25
		97 -90 119 -187 9 -41 13 -77 10 -80 -8 -8 -351 -72 -387 -73 -24 0 -27 5 -38
		57 -32 161 0 246 109 283 70 25 134 25 187 0z" />
				<path d="M13360 6812 c0 -4 -45 -208 -100 -452 -54 -244 -97 -446 -95 -448 3
		-4 285 -81 295 -82 7 0 33 120 28 125 -2 2 -43 19 -93 40 -49 20 -93 40 -97
		43 -5 5 68 366 77 379 3 5 430 -89 438 -96 4 -4 -3 -55 -15 -112 l-24 -104
		-76 3 -77 4 -11 -42 c-6 -23 -9 -44 -6 -47 9 -10 387 -90 391 -83 2 4 7 25 11
		47 l6 40 -71 28 c-61 24 -70 31 -66 49 3 12 13 58 24 104 10 46 21 85 23 88 9
		9 408 -89 408 -100 0 -6 -16 -85 -37 -175 l-37 -163 -109 3 -110 4 -14 -59
		c-7 -33 -12 -60 -11 -61 2 -1 70 -15 152 -30 100 -19 150 -24 155 -17 10 16
		196 861 190 866 -2 2 -22 6 -43 8 l-39 3 -22 -65 c-21 -61 -24 -65 -51 -62
		-25 2 -574 123 -831 182 -85 20 -93 24 -89 43 11 54 16 126 9 130 -17 10 -83
		17 -83 9z" />
				<path d="M1783 5204 c-58 -21 -117 -83 -133 -139 -50 -178 122 -336 288 -265
		131 56 178 196 107 316 -49 84 -166 123 -262 88z" />
				<path d="M13442 5059 c-130 -65 -162 -239 -64 -342 92 -97 236 -98 320 -2 66
		75 79 158 37 242 -54 107 -187 154 -293 102z" />
				<path d="M2542 4536 c-74 -36 -155 -121 -178 -188 -30 -85 -24 -215 16 -373
		38 -154 38 -215 -3 -268 -29 -38 -99 -77 -138 -77 -82 0 -174 69 -226 167 -53
		99 -54 93 31 186 l75 83 -35 44 c-20 25 -39 49 -44 54 -5 4 -55 -24 -115 -65
		l-106 -73 7 -40 c29 -182 190 -408 341 -483 51 -24 69 -28 148 -28 74 0 98 4
		137 23 70 35 134 96 165 160 40 82 39 198 -5 375 -47 188 -41 257 24 319 55
		51 127 62 193 28 51 -25 116 -101 134 -153 l14 -42 -69 -74 c-37 -40 -68 -76
		-68 -80 0 -4 17 -30 38 -59 l39 -51 99 66 c54 36 101 67 103 69 12 10 -28 149
		-62 217 -52 104 -158 215 -243 254 -86 40 -198 44 -272 9z" />
				<path d="M12634 4402 c-134 -47 -271 -222 -282 -358 -6 -73 3 -114 39 -168 28
		-41 35 -46 69 -46 31 0 44 7 69 35 51 58 39 109 -54 221 l-25 31 40 45 c71 82
		138 97 228 52 94 -46 154 -146 137 -225 -10 -44 -37 -98 -70 -137 -14 -16 -25
		-34 -25 -38 0 -5 16 -20 36 -33 l35 -25 55 61 c61 69 121 103 180 103 82 0
		198 -80 237 -162 36 -76 14 -171 -59 -257 l-35 -41 -77 39 c-42 21 -91 42
		-109 45 -41 9 -87 -14 -108 -54 -35 -69 -5 -118 90 -146 110 -32 201 1 311
		111 117 118 175 263 154 389 -12 75 -40 125 -100 179 -107 96 -240 102 -361
		16 -17 -12 -32 -19 -34 -17 -3 2 0 22 6 44 15 52 6 161 -16 204 -61 122 -202
		178 -331 132z" />
				<path d="M3466 3711 l-29 -30 52 -56 51 -57 -82 -91 c-328 -367 -571 -626
		-582 -620 -6 4 -34 24 -62 44 l-51 38 -28 -29 c-15 -16 -26 -33 -24 -38 5 -13
		379 -352 388 -352 4 0 19 13 34 28 l27 28 -50 56 -50 56 183 204 c268 298 459
		503 472 506 6 1 35 -16 65 -38 l54 -40 28 27 c15 15 28 30 28 34 0 8 -375 352
		-388 357 -5 1 -21 -11 -36 -27z" />
				<path d="M11553 3283 c-66 -87 -122 -163 -126 -169 -3 -6 7 -26 23 -45 l29
		-34 73 73 74 72 269 -326 c149 -179 272 -330 273 -335 2 -5 -29 -48 -68 -95
		-66 -78 -71 -88 -61 -110 6 -14 17 -27 25 -30 10 -4 108 72 271 206 140 117
		257 215 259 219 2 3 -7 19 -20 34 l-24 28 -101 -56 -102 -57 -22 24 c-36 37
		-504 606 -565 686 -30 39 -62 72 -71 72 -10 0 -67 -66 -136 -157z" />
				<path d="M4201 3062 l-19 -37 48 -35 c27 -19 51 -43 53 -52 3 -10 -91 -184
		-231 -427 l-236 -409 -51 20 c-27 11 -59 24 -71 28 -18 7 -25 2 -43 -30 l-21
		-38 182 -105 c101 -58 190 -108 198 -111 14 -6 50 41 50 64 0 4 -34 33 -75 64
		-62 46 -74 60 -66 74 29 55 374 648 380 655 4 4 18 -90 30 -210 13 -120 40
		-371 60 -557 l36 -340 47 -27 47 -28 261 452 c143 249 264 458 269 466 9 14
		20 12 132 -34 24 -9 69 63 48 76 -8 5 -79 47 -159 93 -80 46 -161 93 -181 105
		l-37 22 -21 -36 c-11 -20 -21 -38 -21 -39 0 -2 34 -29 75 -60 41 -31 75 -59
		75 -62 0 -9 -333 -584 -336 -581 -2 1 -26 218 -54 482 -32 298 -56 484 -63
		491 -13 12 -275 164 -282 164 -3 0 -13 -17 -24 -38z" />
				<path d="M10657 2729 c-107 -25 -209 -114 -247 -217 -27 -71 -30 -198 -6 -288
		49 -189 187 -418 308 -515 91 -73 149 -94 253 -94 76 0 99 4 145 26 147 69
		223 223 200 403 -30 232 -216 537 -390 639 -50 29 -149 58 -195 56 -16 -1 -47
		-5 -68 -10z m108 -142 c59 -47 93 -89 158 -190 122 -190 213 -401 224 -512 12
		-133 -76 -202 -185 -146 -79 40 -187 189 -297 406 -81 162 -110 250 -110 342
		0 62 3 75 25 98 14 15 34 31 45 36 35 15 98 0 140 -34z" />
				<path d="M5860 2245 c-162 -45 -299 -158 -369 -306 -55 -115 -81 -221 -81
		-333 0 -168 49 -288 164 -401 127 -125 286 -187 486 -189 172 -2 162 -8 208
		137 22 67 37 125 33 129 -3 3 -30 13 -59 22 l-52 15 -51 -101 -50 -100 -87 4
		c-149 7 -253 72 -314 196 -30 60 -33 77 -36 172 -10 287 140 569 339 635 103
		35 248 12 322 -49 l29 -23 -11 -109 c-6 -59 -8 -111 -4 -115 5 -4 32 -14 61
		-22 39 -11 54 -12 57 -4 2 7 18 66 35 132 l32 120 -42 36 c-64 55 -142 99
		-237 132 -74 26 -106 31 -203 34 -80 2 -132 -2 -170 -12z" />
				<path d="M9535 2253 c-98 -13 -230 -70 -293 -128 -21 -19 -51 -58 -67 -87 -24
		-44 -30 -65 -30 -121 0 -60 3 -71 24 -88 32 -26 100 -25 134 1 36 29 47 76 40
		180 l-6 90 39 16 c26 11 57 15 95 12 74 -5 118 -38 156 -115 26 -53 28 -67 27
		-168 0 -95 -4 -120 -28 -185 -33 -87 -112 -248 -199 -404 l-60 -109 17 -66
		c10 -36 19 -67 20 -68 3 -3 717 206 727 213 7 4 -36 162 -46 172 -2 3 -123
		-30 -267 -73 -145 -43 -271 -80 -281 -83 -12 -3 18 51 86 154 225 344 272 459
		246 599 -32 175 -169 280 -334 258z" />
				<path d="M6966 2033 c-9 -9 -7 -83 2 -84 4 -1 36 -6 72 -13 l65 -11 -3 -85
		c-6 -178 -43 -866 -47 -877 -2 -8 -31 -13 -77 -15 l-73 -3 -3 -42 -3 -41 63
		-6 c193 -18 862 -46 868 -37 9 15 33 292 25 299 -3 3 -32 8 -63 10 l-58 4 -24
		-107 -24 -107 -175 7 c-97 3 -184 9 -193 11 -21 6 -22 40 -11 298 l6 159 109
		-5 c60 -3 111 -8 114 -11 3 -2 8 -37 11 -76 6 -68 7 -71 32 -71 14 0 36 -3 47
		-6 20 -5 22 -1 28 68 3 40 8 133 12 206 l7 132 -50 0 -50 0 -13 -75 -13 -75
		-111 6 c-61 4 -112 8 -113 8 -5 4 21 406 26 415 5 8 340 -5 349 -14 2 -2 9
		-49 16 -104 7 -55 14 -102 16 -105 3 -2 32 -6 65 -7 l60 -3 3 156 2 156 -92 6
		c-51 3 -228 13 -393 21 -165 8 -323 17 -352 19 -28 2 -54 2 -57 -1z" />
			</g>
		</svg>` +
        "</div>";

      detailsDiv.appendChild(header);

      // Invoice info
      const info = document.createElement("div");
      info.className = "invoice-details";

      // Invoice for
      let invoiceForContent =
        $type !== "summer"
          ? (item.sessionName || "") + " " + (item.currentYear || "")
          : (item.classSessionName || "") + " " + (item.currentYear || "");
      const invoiceFor = document.createElement("p");
      invoiceFor.classList.add("dm-sans", "invoice");
      invoiceFor.innerHTML =
        "<strong>Invoice for:</strong> " +
        invoiceForContent +
        " Bergen Debate Club Semester Course";
      info.appendChild(invoiceFor);

      // Invoice title
      const invoiceTitle = document.createElement("p");
      invoiceTitle.classList.add("dm-sans", "invoice");
      invoiceTitle.innerHTML =
        "<strong>Invoice:</strong> " +
        ($type !== "summer"
          ? item.invoiceTitle || ""
          : (item.programName || "") +
            " " +
            (item.location || "") +
            ", " +
            (item.currentYear || "") +
            " " +
            (item.sessionName || ""));
      info.appendChild(invoiceTitle);

      // Session
      const session = document.createElement("p");
      session.classList.add("dm-sans", "invoice");
      session.innerHTML =
        "<strong>Session:</strong> " +
        invoiceForContent +
        " Bergen Debate Club";
      info.appendChild(session);

      // Class (only for academic)
      if ($type !== "summer") {
        const classInfo = document.createElement("p");
        classInfo.classList.add("dm-sans", "invoice");
        classInfo.innerHTML =
          "<strong>Class:</strong> " +
          (item.classLevel || "") +
          " - " +
          (item.day || "") +
          " " +
          (item.startTime || "");
        info.appendChild(classInfo);
      }

      // Student Name
      const studentName = document.createElement("p");
      studentName.classList.add("dm-sans", "invoice");
      studentName.innerHTML =
        "<strong>Student Name:</strong> " + (item.studentName || "");
      info.appendChild(studentName);

      // Base Price
      const baseAmount = document.createElement("p");
      baseAmount.classList.add("dm-sans", "invoice");
      let basePrice =
        $type === "summer"
          ? parseFloat(item.paymentTotal || 0)
          : parseFloat(item.basePrice || 0);
      baseAmount.innerHTML =
        "<br><strong>Base Price:</strong> $" +
        basePrice.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      info.appendChild(baseAmount);

      // Deposit Amount
      if (item.depositAmount && parseFloat(item.depositAmount)) {
        const deposit = document.createElement("p");
        deposit.classList.add("dm-sans", "invoice");
        deposit.innerHTML =
          "<strong>Deposit:</strong> $" +
          parseFloat(item.depositAmount).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        info.appendChild(deposit);
      }

      // Early Bird Discount
      if (item.earlyBirdsDiscount && parseFloat(item.earlyBirdsDiscount)) {
        const earlyBird = document.createElement("p");
        earlyBird.classList.add("dm-sans", "invoice");
        earlyBird.innerHTML =
          "<strong>Early Bird:</strong> ($" +
          Math.abs(parseFloat(item.earlyBirdsDiscount)).toLocaleString(
            undefined,
            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
          ) +
          ")";
        info.appendChild(earlyBird);
      }

      // New Student Fee
      if (item.newStudentFee && parseFloat(item.newStudentFee)) {
        const newStudent = document.createElement("p");
        newStudent.classList.add("dm-sans", "invoice");
        newStudent.innerHTML =
          "<strong>New Student Fee:</strong> $" +
          parseFloat(item.newStudentFee).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        info.appendChild(newStudent);
      }

      // Sibling Discount
      if (item.siblingDisc && parseFloat(item.siblingDisc)) {
        const sibling = document.createElement("p");
        sibling.classList.add("dm-sans", "invoice");
        sibling.innerHTML =
          "<strong>Sibling Discount:</strong> ($" +
          Math.abs(parseFloat(item.siblingDisc)).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) +
          ")";
        info.appendChild(sibling);
      }

      // BCDC Credit
      if (item.credit_amount && parseFloat(item.credit_amount)) {
        const credit = document.createElement("p");
        credit.classList.add("dm-sans", "invoice");
        credit.innerHTML =
          "<strong>BCDC Credit:</strong> ($" +
          Math.abs(parseFloat(item.credit_amount)).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) +
          ")";
        info.appendChild(credit);
      }

      // Total Amount
      const totalAmount = document.createElement("p");
      totalAmount.classList.add("dm-sans", "invoice");
      let total =
        $type === "summer"
          ? parseFloat(item.paymentTotal || 0)
          : parseFloat(item.totalAmount || 0);
      totalAmount.innerHTML =
        "-----------------------------------------<br><strong>Total Amount:</strong> $" +
        total.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      info.appendChild(totalAmount);

      // Status
      const status = document.createElement("p");
      status.classList.add("dm-sans", "invoice");
      status.innerHTML = "<br><strong>Status:</strong> Paid";
      info.appendChild(status);

      // Date of Billing
      const invoiceDate = item.invoiceDateLast || item.paymentDate || "";
      const dateOfBilling = document.createElement("p");
      dateOfBilling.classList.add("dm-sans", "invoice");
      dateOfBilling.innerHTML =
        "<strong>Date of Billing:</strong> " +
        (invoiceDate
          ? new Date(invoiceDate).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "");
      info.appendChild(dateOfBilling);

      // Location
      const location = document.createElement("p");
      location.classList.add("dm-sans", "invoice");
      location.innerHTML =
        "<strong>Location:</strong> 440 West Street, Fort Lee NJ 07024";
      info.appendChild(location);

      // Payment Made To
      const paymentMadeTo = document.createElement("p");
      paymentMadeTo.classList.add("dm-sans", "invoice");
      paymentMadeTo.innerHTML =
        "<strong>Payment Made To:</strong> DCA - Bergen County, LLC";
      info.appendChild(paymentMadeTo);

      // EIN and Phone
      const ein = document.createElement("p");
      ein.classList.add("dm-sans", "invoice");
      ein.innerHTML =
        "<strong>Phone Number:</strong> 201-421-8621<br/><br/><strong>EIN:</strong> 92-1876164";
      info.appendChild(ein);

      detailsDiv.appendChild(info);
      detailsContainer.appendChild(detailsDiv);
    }
  }

  async fetchMillionsData() {
	const response = await fetch(`${this.data.apiBaseURL}getMillionsTransactionData/${this.data.memberId}`);
	if (!response.ok) throw new Error('Network response was not ok');
	const millionsData = await response.json();
	return millionsData;
    }

    async fetchAnnouncements() {
	const response = await fetch(`${this.data.apiBaseURL}getAnnouncement/${this.data.memberId}`);
	if (!response.ok) throw new Error('Failed to fetch announcements');
	const data = await response.json();
	return data;
    }

    async updateSidebarMillionsCount(studentName) {
	var millionsData = await this.fetchMillionsData();
	const sidebarCountEls = document.querySelectorAll('[data-millions="sidebarCount"]');
	if (!sidebarCountEls) return;
	sidebarCountEls.forEach(el => {
	// Find the entry for the current student
	const entry = millionsData.millions_transactions.find(e => e.studentName === studentName);
	const millionsCount = entry?.earnAmount || 0;
	    el.innerText = `${millionsCount}M`;
	    // display block parent element of sidebarCountEl
	    el.parentElement.style.display = 'block';
	});
    }

    async updateSidebarAnnouncementsCount() {
	var announcements = await this.fetchAnnouncements();
	const sidebarCountEls = document.querySelectorAll('[data-announcements="counts"]');
	if (!sidebarCountEls) return;
	sidebarCountEls.forEach(el => {
	    el.textContent = announcements.announcement.filter(ann => !ann.is_read).length;
	    el.parentElement.style.display = 'block';
	});
    }
}

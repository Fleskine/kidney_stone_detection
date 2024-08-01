//Setting up table
function initTabulator(table_data) {
    return new Tabulator("#imgData", {
        paginationSize: 8,
        data: table_data,
        pagination: true,
        layout: "fitColumns",
        responsiveLayout: "collapse",
        groupBy: "patient_id",
        paginationCounter: "rows",
        columns: [
            { title: "IMG_ID", field: "img_id" },
            { title: "PATIENT_ID", field: "patient_id" },
            {
                title: "IMG", field: "img", formatter: "image",
                formatterParams: {
                    height: "100px",
                    width: "100px",
                    urlPrefix: "data:image/jpg;base64,",
                }
            },
            { title: "IS_DIAGNOSED", field: "is_diagnosed", formatter: "tickCross" },
            { title: "DIAGNOSE", formatter: diagnosisIcon, hozAlign: "left", responsive: 0, cellClick: function (e, cell) { getImages(e, cell); } }
        ]
    });
}

//Diagnosis initiation button
let diagnosisIcon = function () {
    return `<button class='btn btn-success ms-3' data-bs-toggle='modal' data-bs-target='#diagnosisModal'>
                <i class='fa-solid fa-stethoscope'></i>
            </button>`;
};


//Retrieve image records from db (Desktop)
function getImages(e, cell) {
    let patient_id = cell.getRow().getData().patient_id;
    fetch(`getImgData?patient_id=${patient_id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", "Accept": "application/json" }
    }).then(response => response.json())
        .then(json_data => {
            fetched_data = json_data;
            formatJSONResponse(json_data);
            createDynamicContent(json_data);
        })
        .catch(error => {
            console.log(error);
        })
}


//Retrieve image records from db (Mobile)
function getImagesMobile(patient_id) {
    let patient_id_mobile = patient_id;
    console.log("MOBILE", patient_id_mobile)
    fetch(`getImgData?patient_id=${patient_id_mobile}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", "Accept": "application/json" }
    }).then(response => response.json())
        .then(json_data => {
            formatJSONResponse(json_data);
            createDynamicMobileContent(json_data);
        })
        .catch(error => {
            console.log(error);
        })
}

//Create model inference reports
function formatJSONResponse(json_response) {
    json_response.forEach(function (response_object) {
        //rounding confidence scores to 2dp
        response_object['model_report']['scores'] = response_object['model_report']['scores'].map(num => parseFloat(num.toFixed(2)));

        //Single Stone Detected
        if (response_object['model_report']['stones'] == 1) {
            msg = `<span>In this image, only <b>1</b> stone was detected in line with the decision threshold(<i>0.5</i>).</span><br>
            <span>Confidence Score:  ${response_object['model_report']['scores']}</span>`;
            response_object['formatted_msg'] = msg;
        }

        //Multiple Stones Detected
        else if (response_object['model_report']['stones'] > 1) {
            msg = `<span>In this image, <b>${response_object['model_report']['stones']}</b> stones were detected in line with the decision threshold(<i>0.5</i>).</span><br>
            <span>Confidence Scores:  ${response_object['model_report']['scores']}</span>`;
            response_object['formatted_msg'] = msg;
        }

        //No Stone Detected
        else {
            msg = `<span>In this image, <b>${response_object['model_report']['stones']}</b> stones were detected in line with the decision threshold(<i>0.5</i>).</span><br>
            Confidence Scores:  ${response_object['model_report']['scores']}`;
            response_object['formatted_msg'] = msg;
        }
        console.log(response_object);
    })
}


//Dynamically create display cards for model inference (Desktop)
function createDynamicContent(results) {
    let container = document.getElementById("dynamicContentContainer");

    // Clear existing content in the modal body
    container.innerHTML = '';

    // Loop through the results list
    results.forEach(function (result) {
        // Create a new row using string interpolation
        let rowHtml = `
            <div class="row mt-4">
                <div class="col-md-6 mb-3 mb-md-0">
                    <!-- CARD IMAGE START -->
                    <div class="card h-100" style="background-color: rgba(33, 37, 41, 0.03);">
                        <!-- CARD HEADER -->
                        <div class="card-header">Image ${result.img_id}</div>
                        <!-- IMAGE DIAGNOSIS RESULT -->
                        <img src="data:image/jpg;base64,${result.img_result}" class="card-img-top border border-danger border-5" alt="...">
                    </div>
                    <!-- CARD IMAGE END -->
                </div>

                <!-- MESSAGE START -->
                <div class="col-md-6">
                    <h6 class="m-2">Model Inference</h6><hr class="border border-primary">
                    <p class="m-2" style="font-size: 20px;" innerHTML=${result.formatted_msg}</p>
                </div>
                <!-- MESSAGE END -->
            </div><hr class="border border-secondary border-5">
        `;

        // Append the row HTML to the modal body
        container.innerHTML += rowHtml;
    });
}


//Dynamically create display cards for model inference (Mobile)
function createDynamicMobileContent(results) {
    let container = document.getElementById("dynamicMobileContentContainer");

    // Clear existing content in the modal body
    container.innerHTML = '';

    // Loop through the results list
    results.forEach(function (result) {
        // Create a new row using string interpolation
        let rowHtml = `
            <div class="row m-3">
                <div class="col-md-6 mb-3 mb-md-0">
                    <!-- CARD IMAGE START -->
                    <div class="card h-100" style="background-color: rgba(33, 37, 41, 0.03);">
                        <!-- CARD HEADER -->
                        <div class="card-header">Image ${result.img_id}</div>
                        <!-- IMAGE DIAGNOSIS RESULT -->
                        <img src="data:image/jpg;base64,${result.img_result}" class="card-img-top border border-danger border-5" alt="...">
                    </div>
                    <!-- CARD IMAGE END -->
                </div>

                <!-- MESSAGE START -->
                <div class="col-md-6">
                    <h6 class="m-2">Model Inference</h6><hr class="border border-primary">
                    <p class="m-2" innerHTML=${result.formatted_msg}</p>
                </div>
                <!-- MESSAGE END -->
            </div><hr class="border border-secondary border-5">
        `;

        // Append the row HTML to the modal body
        container.innerHTML += rowHtml;
    });
}




//Variable to access assignees from resize context
let data;


window.onload = function () {
    //Handle dynamic rendering for Mobile
    window.addEventListener("resize", handleResponsiveness);
    window.addEventListener("orientationchange", handleResponsiveness);

    
    //Fecthing image data from db
    fetch(`getPatientData?doctor_id=${doc_id}`, {
        method: "GET"
    }).then(response => response.json())
        .then(json_data => {
            initTabulator(json_data);
            data = json_data;
        })
        .catch(error => {
            console.log(error);
        })
}



function handleResponsiveness() {
    let cards_container = document.getElementById("cardData");
    cards_container.innerHTML = "";

    if (this.innerWidth <= 767) {
        //Hide table
        document.getElementById("imgData").style.display = "none";
              
        data.forEach(function (info) {
            let card = `<div class="row mt-2">
                            <div class="col-sm-12 col-md-6">
                                <div class="card mb-3" style="background-color: rgba(33, 37, 41, 0.03); height: 95%;">
                                    <!-- CARD HEADER -->
                                    <div class="card-header">Patient ID: ${info.user_id}</div>

                                    <!-- IMAGE -->
                                    <img src="data:image/jpg;base64,${info.img}" class="card-img-top img-fluid p-2 border-bottom" style="height: 75%; object-fit: contain;" alt="...">

                                    <div class="card-body">
                                        <span class="card-text">Image ID: ${info.img_id}</span>
                                        <span class="card-text float-right">Diagnosis Status: ${info.is_diagnosed.toString().toUpperCase()} </span>
                                        <div class="mt-3 mb-3">
                                            <button class="btn btn-outline-primary" onclick="getImagesMobile(${info.user_id})" data-bs-toggle="modal" data-bs-target="#diagnosisMobileModal">DIAGNOSE</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>`;
            cards_container.innerHTML += card;
        });
        cards_container.style.display = "block";
    }
    else {
        cards_container.innerHTML = "";
        cards_container.style.display = "none";
        document.getElementById("imgData").style.display = "block";
    }
}


//Download Model Inference Report
let download_btn = document.getElementById("downloadBtn");
download_btn.addEventListener("click", function () {
    const report_content = document.getElementById("dynamicContentContainer");
    const pdf_config_options = {
        margin: 1,
        filename: 'myfile.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, backgroundColor: '#E3240D' },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: 'avoid-all' }
    }
    html2pdf().set(pdf_config_options).from(report_content).save();

})
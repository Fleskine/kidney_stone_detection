let input_img_tag = document.getElementById("leftImg");
let output_img_tag = document.getElementById("imgOutput");
let default_input_msg = document.getElementById("defaultMsg1");
let default_output_msg = document.getElementById("defaultMsg2");

let imgFile;


function displayImage() {
    imgFile = document.getElementById("imgInput").files[0];

    if (imgFile) {
        const reader = new FileReader();
        reader.readAsDataURL(imgFile);

        reader.onload = function (e) {
            //hide default input message
            default_input_msg.style.display = "none";

            //inhibit display of previous img
            output_img_tag.style.visibility = "hidden";

            //set card to uploaded image
            input_img_tag.src = e.target.result;

            //make input img visible
            input_img_tag.style.visibility = "visible";
        };
    }
}


const diagnosis_form = document.getElementById("diagnosisForm");
diagnosis_form.addEventListener("submit", predictRequest);


function predictRequest(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('inputImg', imgFile);

    fetch("/predict", {
        method: "POST",
        body: formData
    }).then(response => response.json())
        .then(json_data => {
            const diagnosis_img = json_data["img_result"];
            default_output_msg.innerHTML = "";
            output_img_tag.src = "data:image/jpg;base64," + diagnosis_img;
            output_img_tag.style.visibility = "visible";

            confidence_arr = json_data['diagnosis_scores']
            confidence_arr.forEach((_, index, confidence_arr) => {
                confidence_arr[index] = confidence_arr[index].toFixed(4);
                console.log("SCORE:", confidence_arr[index]);
            });

            const scores_par = document.createElement("h6");
            scores_par.textContent = ` The confidence scores were: (${confidence_arr.toString()})`;
            
            const model_inference = document.querySelector(".model_report");
            //model_inference.innerHTML = ''; 
            model_inference.appendChild(scores_par);
            model_inference.innerHTML = json_data["model_report"] + scores_par.textContent;
            

            const textWrapper = document.querySelector('.model_report');
            textWrapper.innerHTML = textWrapper.textContent.replace(/\S/g, "<span class='letter'>$&</span>");

            anime.timeline()
                .add({
                    targets: '.model_report .letter',
                    opacity: [0, 1],
                    easing: "easeInOutQuad",
                    duration: 100,
                    delay: (el, i) => 100 * (i + 1)
                });




            console.log(json_data)
        })
        .catch(error => {
            console.error("Error:", error);
        });
}



// const textWrapper = document.querySelector('.model_report');
// textWrapper.innerHTML = textWrapper.textContent.replace(/\S/g, "<span class='letter'>$&</span>");

// anime.timeline()
//     .add({
//         targets: '.model_report .letter',
//         opacity: [0, 1],
//         easing: "easeInOutQuad",
//         duration: 2250,
//         delay: (el, i) => 150 * (i + 1)
//     });



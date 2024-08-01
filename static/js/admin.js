//Setting up table
let actionIcons = function (cell, formatterParams, onRendered) {
    return `<button class="btn btn-outline-primary mr-2 p-1" data-bs-toggle="modal" data-bs-target="#editUserModal">
                <i class='fa-solid fa-user-pen p-2'></i>
            </button> 
            <button class="btn btn-outline-danger p-1"><i class='fa-solid fa-trash p-2'></i></button>`;
};

const table = new Tabulator("#userData", {
    index: "user_id",
    paginationSize: 8,
    pagination: true,
    layout: "fitColumns",
    responsiveLayout: "collapse",
    paginationCounter: "rows",
    columns: [
        { title: "UID", field: "user_id" },
        { title: "ROLE", field: "user_role" },
        { title: "NAME", field: "name" },
        { title: "EMAIL", field: "email" },
        {
            title: "Action",
            formatter: actionIcons,
            hozAlign: "left",
            responsive: 1,
            cellClick: determineAction
        },
    ],
});


function initTabulator(table_data) {
    return table.setData(table_data);
}


const edit_icon = "fa-user-pen";
const del_icon = "fa-trash";

//Var to get user_id for access in requestEdit()
let user_id = 0;

function determineAction(e, cell) {
    const user_details = cell.getRow().getData();
    user_id = user_details['user_id'];
    console.log(user_details);

    //Split name into fname + lname
    const split_name_arr = user_details['name'].split(" ");
    const fname = split_name_arr[0];
    const lname = split_name_arr[1];

    const fetched_styles = (Object.values(e.srcElement.classList));
    if (fetched_styles.includes(edit_icon)) {
        //Edit Modal Body Container
        const edit_modal_container = document.getElementById("editUserModalContent");

        //Ensure Container Empty
        edit_modal_container.innerHTML = "";

        //Actual Modal Body
        const modal_content = `
        <div class="modal-content" id="editUserModalBody">
            <div class="modal-header">
                <h1 class="modal-title fs-5" id="editUserModalLabel">Edit User <b>#${user_details.user_id}</b></h1>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <div class="modal-body">
                <form id="editUserForm" method="POST">
                    <div class="input-group input-group-md mb-3">
                        <span class="input-group-text">First Name</span>
                        <input type="text" name="fname" value="${fname}" class="form-control" aria-label="Sizing example input"
                        aria-describedby="inputGroup-sizing-default">
                    </div>
    
                    <div class="input-group input-group-md mb-3">
                        <span class="input-group-text">Last Name</span>
                        <input type="text" name="lname" value="${lname}" class="form-control" aria-label="Sizing example input"
                        aria-describedby="inputGroup-sizing-default">
                    </div>
    
                    <div class="input-group input-group-md mb-3">
                        <span class="input-group-text">Email</span>
                        <input type="text" name="email" value="${user_details.email}" class="form-control"
                        aria-label="Sizing example input" aria-describedby="inputGroup-sizing-default">
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="submit" class="btn btn-primary" data-bs-dismiss="modal">Save changes</button>
                    </div>
                </form>
            </div>
        </div>`;

        //Appending Modal Body
        edit_modal_container.innerHTML += modal_content;

        //Edit Form
        const edit_form = document.getElementById("editUserForm");
        edit_form.addEventListener("submit", handleEditRequest);
    }
    else {
        console.log("DELETE");
    }
}


function handleEditRequest(e){
    e.preventDefault();
    console.log("ID:", user_id)

    const form_data_object = new FormData(this);

    //append user_id
    form_data_object.append("user_id", user_id)

    //get current data in table
    let updated_data = Object.fromEntries(form_data_object.entries())
    console.warn(updated_data)

    fetch(`editUser`, {
        method: "POST",
        body: form_data_object
    }).then(response => response.json())
    .then(json_response => {
        console.log(json_response);
        if(json_response.message == "Success"){
            table.updateData([{
                user_id: updated_data["user_id"],
                name: updated_data["fname"] + " " + updated_data["lname"],
                email: updated_data["email"]
            }]);
            
            
            Swal.fire({
                title: 'Update Successfull!',
                text: `User ${user_id}'s details updated!`,
                icon: 'success',
                confirmButtonText: 'OK'
            });
        }
        else{
            Swal.fire({
                title: 'Update Unsuccessfull!',
                text: `User ${user_id}'s details NOT updated!`,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    })
}


//Variable to access user data from resize context
let data;
//Fetch user data from db
window.onload = function () {
    fetch("getUserData", {
        method: "GET"
    }).then(response => response.json())
        .then(json_data => {
            console.log(json_data);
            initTabulator(json_data);
            data = json_data;
        })
        .catch(error => {
            console.log(error);
        })
}


//Handle dynamic rendering for Mobile
window.onresize = function () {
    let cards_container = document.getElementById("cardData");
    cards_container.innerHTML = "";

    if (this.innerWidth <= 767) {
        document.getElementById("userData").style.display = "none";
        data.forEach(function (info) {
            let card = `
                        <div class="row mt-4">
                            <div class="col-sm-12 col-md-6">
                                <div class="card">
                                    <div class="card-header"><b>User ID #${info.user_id}</b></div>
                                        <ul class="list-group list-group-flush">
                                            <li class="list-group-item">Role: ${info.user_role}</li>
                                            <li class="list-group-item">Name: ${info.name}</li>
                                            <li class="list-group-item">Email: ${info.email}</li>
                                        </ul>
                                    </div>

                                    <div class="card-footer">
                                        <button class="btn btn-outline-primary">EDIT</button>
                                        <button class="btn btn-outline-danger">DELETE</button>
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
        document.getElementById("userData").style.display = "block";
    }
}


const message = "{{ data.messaage }}";
console.log(message)
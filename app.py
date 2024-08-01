import io
import base64
import numpy as np
import tensorflow as tf

from PIL import Image
from flask import Flask, request, Response, redirect, render_template, jsonify, url_for, session
from core_funcs import run_inference_for_single_image, show_inference, generate_model_report

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash


# load saved model
model = tf.saved_model.load("saved_model")

app = Flask(__name__)
app.secret_key = 'shakara23'



@app.route('/editUser', methods=['POST'])
def updateUser():
    #request.form['fname'], request.form['lname'], request.form['email']

    # if data to update is available
    if request.form:
        print('USER', dict(request.form))
        #obtain user id
        user_id = request.form['user_id']

        # fetch user to update from db
        user = User.query.get(user_id)

        # if user to update exists, update name & email
        if user:
            user.fname = request.form['fname']
            user.lname = request.form['lname']
            user.email = request.form['email']
            response_data = {'message': 'Success'}
            db.session.commit()

            return jsonify(response_data)
        else:
            response_data = {'message': 'Failed'}
            return jsonify(response_data)      
        
    print(request.form)
    return ['TEST']


# home route
@app.route('/', methods=['GET'])
def index():
    # return render_template('diagnosis.html')
    return render_template('main.html')


# predict
@app.route('/predict', methods=['POST'])
def predict():
    print(request.files)

    if request.files and 'inputImg' in request.files:
        img_bytes = request.files['inputImg'].read()
        undiagnosed_pil_img = Image.open(io.BytesIO(img_bytes))
        # undiagnosed_pil_img = undiagnosed_pil_img.resize((512, 512), Image.BICUBIC)
        diagnosed_np_img, diagnosis_scores = show_inference(
            model, undiagnosed_pil_img)
        # diagnosis_scores = diagnosis_scores.tolist()
        # diagnosis_scores = [round(score, 4) for score in diagnosis_scores]
        model_report = generate_model_report(diagnosis_scores)

        diagnosed_pil_img = Image.fromarray(diagnosed_np_img)

        # diagnosed_pil_img.save('static/images/pred_1.jpg')

        buffer = io.BytesIO()
        diagnosed_pil_img.save(buffer, format='JPEG')
        diagnosed_img_bytes = buffer.getvalue()

        diagnosis_dict = {'img_result': base64.b64encode(diagnosed_img_bytes).decode('utf-8'),
                          'diagnosis_scores': diagnosis_scores.tolist(),
                          'model_report': model_report
                          }

        return jsonify(diagnosis_dict)

    return jsonify({"message": "Wahala!"})


# registration page
@app.route('/register', methods=['GET'])
def renderRegistrationForm():
    return render_template('register.html')

# registration logic
@app.route('/register', methods=['POST'])
def handleRegistration():
    # if passwords match
    if request.form['password'] == request.form['password2']:
        user_details = {
            'role_no': request.form['role_no'],
            'fname': request.form['fname'],
            'lname': request.form['lname'],
            'email': request.form['email'],
            'password': request.form['password']
        }
        
        # Doctor 
        if user_details['role_no'] == '1':  
            insertUser(user_details)
            message = "Success"
            outgoing_data={'message': message, 'admin_info': session['admin_info']}
            return render_template('admin_page.html', data=outgoing_data)
        # Patient
        elif user_details['role_no'] == '2':
            insertUser(user_details)
            message = "Success"
            # retrieve doctors to assign 
            fetched_doctors = User.query.filter_by(role_id=1).all()

            # session to hold user details for access in assignment
            session['user_info'] = user_details

            # data transmitted to assignment_page
            outgoing_data = {'message': message, 'doctor_users': fetched_doctors, 'admin_info': session['admin_info']}
            return render_template('assignment_page.html', data=outgoing_data)
        # Admin
        else:
            insertUser(user_details) 
            message = "Success"
            outgoing_data={'message': message, 'admin_info': session['admin_info']}
            return render_template('admin_page.html', data=outgoing_data)
        
    # if passwords mismatch
    else:
        message = 'Error'
        outgoing_data={'message': message, 'admin_info': session['admin_info']}
        return render_template('register.html', message=message)


# function to insert users
def insertUser(user_details):
    new_user = User(user_details['role_no'], user_details['fname'],
                    user_details['lname'], user_details['email'], user_details['password'])
    db.session.add(new_user)
    db.session.commit()


# render login page
@app.route('/login', methods=['GET'])
def login():
    return render_template('login.html')



# login
@app.route('/login', methods=['POST'])
def login_user():
    if request.form:
        user_email = request.form['email']
        user_password = request.form['password']
        user_exists = User.query.filter_by(email=user_email).first()

        # valid user
        if user_exists and check_password_hash(user_exists.password, user_password):
            # Doctor
            if user_exists.role_id == 1:
                session['user_id'] = user_exists.user_id
                session['doctor_info'] = {'id': user_exists.user_id, 'fname': user_exists.fname}
                message = 'Success'
                outgoing_data = {'message': message, 'doctor_info': session['doctor_info']}
                return render_template('doctor_page.html', data=outgoing_data)
            # Patient
            elif user_exists.role_id == 2:
                session['user_id'] = user_exists.user_id
                message = 'Success'
                outgoing_data = {'message': message, 'patient_info': session['patient_info']}
                return render_template('patient_page.html', data=outgoing_data)
            # Admin
            else:
                session['user_id'] = user_exists.user_id
                session['admin_info'] = {'id': user_exists.user_id, 'fname': user_exists.fname}

                message = 'Success'
                outgoing_data = {'message': message, 'admin_info': session['admin_info']}
                return render_template('admin_page.html', data=outgoing_data)
        # invalid user
        else:
            session['user_id'] = user_exists.user_id
            msg = "Password and Email MUST be valid"
            return render_template('login.html', error=msg)


# render doctor assignment
@app.route('/assign', methods=['GET'])
def assign_doc():
    return render_template('doctor_page.html')

# make assignment
@app.route('/assign', methods=['POST'])
def make_assignment():
    if request.form and request.files:
        print(f'Assignment {request.form}')
        print(f'Files {request.files.getlist("inputImg")}')

        # Doctor ID(doctor being assigned)
        doctor_assigned = request.form['doc_assigned']

        # fetch registered patient ID via email from registration session
        registered_user_exists = User.query.filter_by(
            email=session['user_info']['email']).first()
        patient_id = registered_user_exists.user_id

        received_images = request.files.getlist("inputImg")
        for img in received_images:
            details_to_upload = X_Ray_Images(
                img.read(), doctor_assigned, patient_id)
            db.session.add(details_to_upload)
            db.session.commit()


        outgoing_data = {'message': 'Success', 'admin_info': session['admin_info']}
        return render_template('admin_page.html', data=outgoing_data)
    return 'An error occurred!'

    


# admin fetching users
@app.route('/getUserData', methods=['GET'])
def getUserRecords():
    roles_dict = dict()
    user_roles = Role.query.all()
    for role_object in user_roles:
        roles_dict[role_object.role_id] = role_object.role
    print("ROLES DICT:", roles_dict )
    user_records = User.query.all()
    user_list = []
    for user in user_records:
        user_list.append({'user_id': user.user_id, 'user_role': roles_dict[user.role_id],
                         'name': user.fname + " " + user.lname, 'email': user.email})
    return user_list


# doctor fetching patient details
@app.route('/getPatientData', methods=['GET'])
def getPatientRecords():
    doctor_id = request.args.get('doctor_id')
    img_records = X_Ray_Images.query.filter_by(doc_id=doctor_id).all()
    img_records_list = []

    for img_record in img_records:
        img_records_list.append(
            {'img_id': img_record.img_id, 
             'patient_id': img_record.user_id, 
             'is_diagnosed': img_record.is_diagnosed,
             'img': base64.b64encode(img_record.img).decode('utf-8')
            })

    return img_records_list


# fetching patient images
@app.route('/getImgData', methods=['GET'])
def getPatientImages():
    patient_id = request.args.get('patient_id')
    patient_images = X_Ray_Images.query.filter_by(user_id=patient_id).all()

    results_list = []

    for img_record in patient_images:
        sample_img = img_record.img
        undiagnosed_pil_img = Image.open(io.BytesIO(sample_img))
        diagnosed_np_img, diagnosis_scores = show_inference(
            model, undiagnosed_pil_img)
        model_report = generate_model_report(diagnosis_scores)
        diagnosed_pil_img = Image.fromarray(diagnosed_np_img)
        buffer = io.BytesIO()
        diagnosed_pil_img.save(buffer, format='JPEG')
        diagnosed_img_bytes = buffer.getvalue()
        diagnosis_dict = {'img_id': img_record.img_id, 
                          'img_result': base64.b64encode(diagnosed_img_bytes).decode('utf-8'),
                          'diagnosis_scores': diagnosis_scores.tolist(),
                          'model_report': model_report
                          }
        results_list.append(diagnosis_dict)

    return results_list


# DB Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql://root:''@localhost/ksd_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# User Table
class User(db.Model):
    user_id = db.Column(db.Integer, primary_key=True)
    role_id = db.Column(db.Integer, db.ForeignKey('role.role_id'), nullable=False)
    fname = db.Column(db.String(50), nullable=False)
    lname = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(100), nullable=False, unique=True)
    password = db.Column(db.String(164), nullable=False)
    
    x_ray_images = db.relationship('X_Ray_Images', cascade='all, delete-orphan', backref='user')


    def __init__(self, role_id, fname, lname, email, password):
        self.role_id = role_id
        self.fname = fname
        self.lname = lname
        self.email = email
        self.password = generate_password_hash(password)


# Role Table
class Role(db.Model):
    role_id = db.Column(db.Integer, primary_key=True)
    role = db.Column(db.String(30))

    def __init__(self, role_id, role):
        self.role_id = role_id
        self.role = role


# Image Assignment Table
class X_Ray_Images(db.Model):
    img_id = db.Column(db.Integer, primary_key=True)
    img = db.Column(db.LargeBinary(length=900000))
    doc_id = db.Column(db.Integer)
    #patient_id = db.Column(db.Integer)
    is_diagnosed = db.Column(db.Boolean, default=False)

    user_id = db.Column(db.Integer, db.ForeignKey('user.user_id', ondelete='CASCADE'))


    def __init__(self, img, doc_id, user_id, is_diagnosed=False):
        self.img = img
        self.doc_id = doc_id
        self.user_id = user_id
        self.is_diagnosed = is_diagnosed


if __name__ == '__main__':
    app.run(port=5000, debug=True)

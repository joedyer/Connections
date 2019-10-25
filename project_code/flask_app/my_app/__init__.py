import flask
from flask import Flask, render_template
# import SQLAlchemy
from flask_cas import CAS, login_required
from flask_sqlalchemy import SQLAlchemy
#from flask_login import LoginManager

app = Flask(__name__)
# TODO: set all values correctly
app.config['DEBUG'] = False
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql://root:connections@127.0.0.1/connections'
app.config['WTF_CSRF_SECRET_KEY'] = 'random key la la la for form'
#app.config['LDAP_PROVIDER_URL'] = 'ldap://directory.umd.edu/dc=umd,dc=edu'#'https://login.umd.edu/cas/login' #ldap.umd.edu
#app.config['LDAP_PROTOCOL_VERSION'] = 3
db = SQLAlchemy(app)

cas = CAS(app, '/cas')
# cas = CAS(app)
app.config['CAS_SERVER'] = 'https://login.umd.edu'
app.config['CAS_AFTER_LOGIN'] = 'auth.route_login'
app.secret_key = 'super secret key'


#
# login_manager = LoginManager()
# login_manager.init_app(app)
# login_manager.login_view = 'login'

from my_app.auth.views import auth

app.register_blueprint(auth)





db.create_all()

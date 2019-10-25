## REFERENCES
# http://flask.pocoo.org/docs/0.11/patterns/jquery/
# http://codehandbook.org/python-flask-jquery-ajax-post/
# https://mariadb.com/resources/blog/how-connect-python-programs-mariadb

## MORE GENERAL NOTES
# How do users get added to our database? They sign in though LDAP but an entry has to be made
# for each user in the database so we can keep track of how many tables they have.

## ALL REFERENCES TO TUPLES SHOULD BE LISTS INSTEAD

# TEST QUERY FORMATTING ON repl.it

import mysql.connector as mariadb
# import ldap
import os
import json
import unicodecsv as csv
import datetime
from pprint import pprint
from collections import defaultdict, deque

from flask import request, render_template, flash, redirect, \
    url_for, Blueprint, g, send_from_directory, make_response
from flask_cas import login_required, CAS
# from flask_login import current_user, login_user, \
#     logout_user, login_required
#from my_app import login_manager, db
# from my_app.auth.models import User, LoginForm
from my_app.auth.models import Users
from flask import Flask, jsonify, request
from _mysql import ProgrammingError
# app = Flask(__name__)

# from werkzeug.utils import secure_filename

from my_app import app, db, cas


## DATABASE CONNECTION
USER =      'root'
PASSWORD =  'connections'
HOST =      'localhost'
DB_NAME =   'connections'

conn = mariadb.connect(user = USER,
                       password = PASSWORD,
                       host = HOST,
                       database = DB_NAME)
cursor = conn.cursor()


### starting paste


### ending paste


auth = Blueprint('auth', __name__)

def get_json_from_file(file_name):
    try:
        with open(file_name, 'r') as read_file:
            json_val = json.load(read_file)
        read_file.close()
    except:
        json_val = None
    return json_val


## VARIABLES / PREPROCESSING DICTIONARIES
folder_path = os.path.join('/var', 'www', 'html', 'flask_app', 'my_app', 'files')
cols_to_tables = get_json_from_file(os.path.join(folder_path, 'columns_to_tables.txt')) or defaultdict(list)  # value is [db_tablenames] list
tables_to_metadata = get_json_from_file(os.path.join(folder_path, 'tables_to_metadata.txt')) or defaultdict(list) # value is [[col names], ingest_date]
users_to_saved_tables = get_json_from_file(os.path.join(folder_path, 'users_to_saved_tables.txt')) or defaultdict(list) # value is [[db_tablename, user_chosen_tablename], ...]
users_to_cached_tables = get_json_from_file(os.path.join(folder_path, 'users_to_cached_tables.txt')) or defaultdict(list) # value is [db_tablename] list


## LOGIN MANAGEMENT USING LDAP (or CAS)
# auth = Blueprint('auth', __name__)
cursor.execute
# @login_manager.user_loader
# def load_user():
#     return User.query.get(int(id))
#
# @app.before_request
# def get_current_user():
#     g.user = current_user

''
@auth.route('/test')
@login_required
def test():
    return cas.username


#This will be the first page to be called at the website
@auth.route('/home')
@auth.route('/')
def route_login():
    return render_template('login.html')


#This will prompt the user to the CAS Screen and should bring them back here
@auth.route('/login/')
@login_required
def route_root():
    initialize_user(cas.username)
    return render_template(
        'home.html', username = cas.username)

@auth.route('/computer_guided')
@login_required
def computer_guided():
    return render_template('computer_guided.html')

@auth.route('/about')
def about():
    return render_template('about.html')

@auth.route('/index')
def index():
    return render_template('index.html')

@auth.route('/user_directed')
@login_required
def user_directed():
    return render_template('user_directed.html')


## FUNCTIONS

# TODO: when a user logs out, delete all tables that are in their cached_table array IF they are not in the saved tables dict
@auth.route('/logout')
@login_required
def logout():
    # logout_user()
    return redirect(url_for('auth.home'))


@auth.route('/ingest_home')
@login_required
def ingest_home():
    unIngestedFiles = os.listdir(os.path.join(folder_path, 'new_tables'))
    return render_template('ingest.html', unIngestedFiles = unIngestedFiles)


# DONE (TAI)
# Searches the user table in the database given a user login. If the user does not exist
# in the server, add the user as a new user with zero tables and add user to dictionaries.
#     parameters:    username str
#     return:        none
def initialize_user(username):
    # Search if user exists in server...
    query = 'SELECT COUNT(1) FROM users WHERE username = \'%s\'' % username
    cursor.execute(query)
    user_found = cursor.fetchall()[0][0]

    # If user does not exist in server...
    if user_found < 1:
        query = 'INSERT INTO users (username) VALUES (\'%s\')' % username
        cursor.execute(query)
        conn.commit()
    # Check if user is in users_to_cached_tables; if they're not, add them
    if username not in users_to_cached_tables:
        users_to_cached_tables[username] = []
    # Check if user is in users_to_saved_tabbles; if they're not, add them
    if username not in users_to_cached_tables:
        users_to_saved_tables[username] = []


# DONE (TAI)
# NOTES:
#    What if user inserts file with same name as previous? Currently, ignores the file.
#    However, maybe drop old table and make new table (user wants to update data).
# Ingests new tables from new tables file into the database.
#     parameters:    none
#     return:        true/false for success/failure
@auth.route('/ingest')
@login_required
def ingest():
    # All dictionaries are initially loaded from saved files during initialization process

    # /var/www/html/flask_app/my_app/files/new_tables/
    new_tables_path = os.path.join(folder_path, 'new_tables')
    # /var/www/html/flask_app/my_app/files/old_tables/
    old_tables_path = os.path.join(folder_path, 'old_tables')

    # For each file in /new_tables:
    for file_name in os.listdir(new_tables_path):
        if file_name.endswith('.csv'):
            file_path = os.path.join(new_tables_path, file_name)
            table_name = file_name.rsplit(".", 1)[0]
            query = 'SELECT COUNT(1) FROM information_schema.tables WHERE table_name = \'%s\' AND table_schema = \'%s\'' % (table_name, DB_NAME)
            cursor.execute(query)
            table_found = cursor.fetchall()[0][0]

            with open(file_path, 'r') as file:
                reader = csv.reader(file)
                columns = []
                first_line_flag = True

                # Each line of csv is inserted as entries along a table row
                for line in reader:
                    if first_line_flag:
                        # Create new table with columns (read from first line of csv) set as strings
                        #    CREATE TABLE IF NOT EXISTS table_name (
                        #        'col1' VARCHAR(255),
                        #        'col2' VARCHAR(255), ...)
                        columns = line
                        if table_found < 1:
                            query = 'CREATE TABLE IF NOT EXISTS %s (' % table_name
                            query += ', '.join('{} VARCHAR(255)'.format(column) for column in line) + ')'
                            cursor.execute(query)
                            conn.commit()
                        first_line_flag = False
                    else:
                        if table_found < 1:
                            #    INSERT INTO table_name SET 'column1' = %s, 'col2' = %s ...
                            query = 'INSERT INTO %s SET ' % table_name
                            query += ', '.join('{} = \'%s\''.format(column) for column in columns)
                            query = query % tuple(line)
                            cursor.execute(query)
                            conn.commit()

                # Add to tables -> [[column names], metadata] dictionary
                tables_to_metadata[table_name] = [columns, str(datetime.datetime.now())]

                # Add to [column names] -> table name dictionary
                for column in columns:
                    cols_to_tables[column].append(table_name)

        # Move file once processed (from .../new_tables_path/file.csv to .../new_tables_path/file.csv)
        os.rename(os.path.join(new_tables_path, file_name), os.path.join(old_tables_path, file_name))

    # Dump tables_to_metadata into tables_to_metadata.txt (overwrite contents of file)
    with open(os.path.join(folder_path, 'tables_to_metadata.txt'), 'w') as new_file:
        json.dump(tables_to_metadata, new_file)
    new_file.close()

    # Dump cols_to_tables into columns_to_tables.txt (overwrite contents of file)
    with open(os.path.join(folder_path, 'columns_to_tables.txt'), 'w') as new_file:
        json.dump(cols_to_tables, new_file)
    new_file.close()

    # If any exception is thrown, return False. Otherwise, return True.
    return jsonify(True)


@auth.route('/get_saved_tables_home')
@login_required
def get_saved_tables_home():
    return render_template('get_saved_tables.html')


# DONE
# Gets list of saved table names that correspond with tables the user saved.
#     parameters:    none
#     return:        list of lists [[user_chosen_table_name, db_table_name], ...]
@auth.route('/get_saved_tables')
@login_required
def get_saved_tables():
    return jsonify(users_to_saved_tables[cas.username])


# DONE
# Gets list of all unique column names in the database. Used to populate dropdown menu
# for both user directed and computer guided modes.
#     parameters:     none
#     return:        list of column names [str]
@auth.route('/get_all_cols')
@login_required
def get_all_cols():
    cols = cols_to_tables.keys()
    cols.sort()
    return jsonify(cols)


# DONE (TAI)
# Gets list of table-tuples that contain all required_cols and 0 or more optional_cols
# (sorted in descending order by length of related_cols list). Used for 'Continue' after in single table
# view and want to continue searching for tables join with based on columns
#     parameters:    required_cols: list of required column names [str]
#                    optional_cols: list of optional column names [str] (can be empty)
#     return:        list of table-tuples [[table_name, [related_col_names], [all_col_names], ingest_date], ...]
@auth.route('/get_tables_with_cols')
@login_required
def get_tables_with_cols():
    required_cols = json.loads(request.args.get('required_cols'))
    optional_cols = json.loads(request.args.get('optional_cols'))
    required_cols_set = set(required_cols)
    optional_cols_set = set(optional_cols)

    list_tuples = []
    for table_name, metadata in tables_to_metadata.iteritems():
        try:
            all_col_names = metadata[0]
            ingest_date = metadata[1]

            # Check for tables that contain all required columns
            if set(all_col_names).issuperset(required_cols_set):
                related_col_names = list(required_cols)

                # Check for optional columns to add to related column names
                for column in optional_cols:
                    if column in all_col_names:
                        related_col_names.append(column)

                if 'id' in related_col_names:
                    related_col_names.remove('id')

                # Return only tables that have at least one matching column
                if len(related_col_names) > 0:
                    list_tuples.append([table_name, related_col_names, all_col_names, ingest_date])

        except IndexError:
            print 'Tried to access nonexistent table: %s' % table_name

    # Sort tuples by alphabetical order of table_name
    # list_tuples.sort(key = lambda x: x[0])
    # Sort tuples by length of related_col_names list:
    list_tuples.sort(key = lambda x: len(x[1]), reverse = True)
    return jsonify(list_tuples)


# DONE (TAI)
# Performs left outer join on two tables, joining on pairs of column names.
#     parameters:    l_table: left table name str
#                    r_table: right table name str
#                    join_pairs: list of tuples of l_col_name and r_col_names for joining [[l_col, r_col], ...]
#     return:        table-tuple [[new_table_name, [col_names], ingest_date], [entry, entry, entry, entry, entry]]
@auth.route('/join_two_tables')
@login_required
def join_two_tables():
    l_table = request.args.get('l_table', '', type=str)
    r_table = request.args.get('r_table', '', type=str)
    join_pairs = json.loads(request.args.get('join_pairs'))
    return jsonify(join_two_tables_aux(l_table, r_table, join_pairs))


def join_two_tables_aux(l_table, r_table, join_pairs):
    # Get number of user tables
    query = 'SELECT num_tables FROM users WHERE username = \'%s\'' % cas.username
    cursor.execute(query)
    num_tables = cursor.fetchall()[0][0]

    # Update number of user tables in database
    query = 'UPDATE users SET num_tables = %s + 1 WHERE username = \'%s\'' % (num_tables, cas.username)
    cursor.execute(query)
    conn.commit()

    # new_table_name is username# where # is num_tables
    new_table_name = cas.username + str(num_tables)

    # Create new table as left outer join of left and right tables under multiple join pair conditions
    #    CREATE TABLE new_table_name AS (
    #        SELECT DISTINCT * FROM l_table AS lefty
    #        LEFT OUTER JOIN (SELECT DISTINCT * FROM r_table) AS righty
    #        ON l_table.lcol1 = r_table.rcol1
    #        AND l_table.lcol2 = r_table.rcol2 ...)
    try:
        query = 'SELECT column_name FROM information_schema.columns WHERE table_name = \'%s\' AND table_schema = \'%s\'' % (l_table, DB_NAME)
        cursor.execute(query)
        left_cols = [col for [col] in cursor.fetchall()]

        query = 'SELECT column_name FROM information_schema.columns WHERE table_name = \'%s\' AND table_schema = \'%s\'' % (r_table, DB_NAME)
        cursor.execute(query)
        right_col_names = [col for [col] in cursor.fetchall()]
        
        right_cols = [i for i in right_col_names if i not in left_cols]

        query = 'CREATE TABLE %s AS (SELECT DISTINCT ' % new_table_name
        query += ', '.join(('lefty.{}').format(col) for col in left_cols) + ', '
        query += ', '.join(('righty.{}').format(col) for col in right_cols)
        query += ' FROM %s AS lefty LEFT OUTER JOIN (SELECT DISTINCT * FROM %s) AS righty ON ' % (l_table, r_table)
        query += ' AND '.join(('lefty.{}').format(l) + (' = righty.{}').format(r) for l, r in join_pairs) + ')'
        

        cursor.execute(query)
        conn.commit()
        
        # Record new_table_name in current user's cached tables list
        users_to_cached_tables[cas.username].append(new_table_name)

        # Dump users_to_cached_tables into users_to_cached_tables.txt (overwrite contents of file)
        with open(os.path.join(folder_path, 'users_to_cached_tables.txt'), 'w') as new_file:
            json.dump(users_to_cached_tables, new_file)
            new_file.close()
    except ProgrammingError:
        new_table_name = l_table

    query = 'SELECT column_name FROM information_schema.columns WHERE table_name = \'%s\' AND table_schema = \'%s\'' % (new_table_name, DB_NAME)
    cursor.execute(query)
    col_names = [col for [col] in cursor.fetchall()]
    
    ingest_date = str(datetime.datetime.now())

    # Retrieve first five rows of new_table_name
    query = 'SELECT * FROM %s LIMIT 5' % new_table_name
    cursor.execute(query)
    entries = cursor.fetchall()

    # Set return table-tuple
    table_tuple = [[new_table_name, col_names, ingest_date], entries]
    return table_tuple


# DONE (TAI)
# Saves user_chosen_table_name associated with db_table_name in users_to_saved_tables dictionary,
# dumps contents of db_table_name table into csv file located in /my_app/files/user_tables/username/user_chosen_table_name.csv and
# and returns its path for front end to provide link for downloading.
#     parameters:    db_table_name: name of the new table in the database str
#                    user_chosen_table_name: name of the new table the user chose str
#     return:        CSV filename
@auth.route('/save_table')
@login_required
def save_table():
    db_table_name = request.args.get('db_table_name', '', type=str)
    user_chosen_table_name = request.args.get('user_chosen_table_name', '', type=str)

    # DEBUG

    # Save to dictionary
    users_to_saved_tables[cas.username].append([user_chosen_table_name, db_table_name])

    # Dump contents of table into csv file
    file_path = os.path.join(folder_path, 'user_tables', cas.username)
    file_name = user_chosen_table_name + '.csv'
    if not os.path.exists(file_path):
        os.makedirs(file_path)

    with open(os.path.join(file_path, file_name), "w") as file:
        writer = csv.writer(file)

        # Get column names to write into first line
        query = 'SELECT column_name FROM information_schema.columns WHERE table_name = \'%s\' AND table_schema = \'%s\'' % (db_table_name, DB_NAME)
        cursor.execute(query)
        col_names = [col for [col] in cursor.fetchall()]
        writer.writerow(col_names)

        # Get table entries to write
        query = 'SELECT * FROM %s' % db_table_name
        cursor.execute(query)
        lines = cursor.fetchall()
        writer.writerows(lines)

    file.close()

    # Return path to file
    return jsonify(os.path.join(file_path, file_name))


# DONE (jeremy)
# Query by example (qbe): takes what the user typed into various columns and use it to query the table
#     parameters:    table_name: str
#                    query_pairs: list of tuples of col_names and query_text [[col_name, query_text], ...]
#     return:        [[table_name, [cols], ingest_date], [entry, entry, entry, ...]]
@auth.route('/qbe')
@login_required
def qbe():
    table_name = request.args.get('table_name', '', type=str)
    query_pairs = json.loads(request.args.get('query_pairs'))

    # select * from table_name where query_pairs[0][0] == query_pairs[0][1], query_pairs[1][0] == query_pairs[1][1], etc
    # query for the column names first
    query = 'SELECT column_name FROM information_schema.columns WHERE table_name = \'%s\' AND table_schema = \'%s\'' % (table_name, DB_NAME)
    cursor.execute(query)
    col_names = [col for [col] in cursor.fetchall()]
    

    # make the actual qbe and add all the where statements
    query = ''
    args = [table_name]

    if query_pairs:
        for col_name, query_text in query_pairs:
            if query: # for the first query pair, we add the main body of the query, including select, etc.
                query += ' AND %s = \'%s\''
            else: # every time thereafter, we add an 'AND' statement to the WHERE clause
                query = 'SELECT * FROM %s WHERE %s = \'%s\''
            # add arguments to the query
            args += [col_name, query_text]
    else:
        query = 'SELECT * FROM %s'

    query = query % tuple(args)
    # execute the query and commit it
    cursor.execute(query)

    # fetch all entries
    entries = cursor.fetchall()
    try:
        ingest_date = tables_to_metadata[table_name][1]
    except IndexError:
        ingest_date = str(datetime.datetime.now())

    table_tuple = [[table_name, col_names, ingest_date], entries]

    return jsonify(table_tuple)


# DONE (jeremy)
# Removes current table from cache (and database, if it's the result of a join) and returns previously cached table name and data
#     parameters:    none
#     return:        [[table, [col_names], ingest_date], [entry, entry, entry, entry, entry]]
@auth.route('/undo_join')
@login_required
def undo_join():
    # if the length of the cached table list is 0:
        # return empty tuple ( ie: jsonify(())   )
    # if the length of the cached table list is 1:
        # reset cached_table list to empty list
        # return empty tuple (ie: jsonify(())  )
    # otherwise:
        # if the last table_name in the cached table list is not a saved table (in users_to_saved_tables):
            # delete the table associated with the last element in the list
        # pop the end off the cached table list
        # query for the first 5 entries in the now-last table in the cached table list
        # return a tuple [[table, [col_names], ingest_date], [5 entries from table]] from the now-last table on the cached tables list
    # get the cached table list of the current user
    cached_table_list = users_to_cached_tables[cas.username]

    if len(cached_table_list) == 0:
        return jsonify([])
    elif len(cached_table_list) == 1:
        users_to_cached_tables[cas.username] = [] #current_user.username] = []

        # Dump users_to_cached_tables into users_to_cached_tables.txt (overwrite contents of file)
        with open(os.path.join(folder_path, 'users_to_cached_tables.txt'), 'w') as new_file:
            json.dump(users_to_cached_tables, new_file)
        new_file.close()
        return jsonify([])
    else:
        users_to_cached_tables[cas.username].pop()

        last_cached_table = users_to_cached_tables[cas.username][-1]
        query = 'SELECT column_name FROM information_schema.columns WHERE table_name = \'%s\' AND table_schema = \'%s\'' % (last_cached_table, DB_NAME) # was last_cached_table.name
        cursor.execute(query)
        col_names = [col for [col] in cursor.fetchall()]
        ingest_date = str(datetime.datetime.now())

        # Retrieve first five rows of new_table_name
        query = 'SELECT * FROM %s LIMIT 5' % last_cached_table # was last_cached_table.name
        cursor.execute(query)
        entries = cursor.fetchall()

        # Set return table-tuple
        table_tuple = [[last_cached_table, [col_names], ingest_date], entries]

        # Dump users_to_cached_tables into users_to_cached_tables.txt (overwrite contents of file)
        with open(os.path.join(folder_path, 'users_to_cached_tables.txt'), 'w') as new_file:
            json.dump(users_to_cached_tables, new_file)
        new_file.close()

        return jsonify(table_tuple)


# Finds the five shortest paths between a given start and end column.
#     parameters:    start_col: str
#                    end_col: str
#     return:        list of lists of list of table-tups and list of joining cols; looks like this:
#                    [[[table, [cols], ingest_date], ...], [joining_col, ...]]
@auth.route('/find_paths')
@login_required
def find_paths():
    # perform BFS using row dict and table dict
    # get params
    start_col = request.args.get('start_col', '', type=str)
    end_col = request.args.get('end_col', '', type=str)
    # constants and variable setup
    COL = True
    TBL = False
    NAME = 0 # idx of col or table name in tuple
    TYPE = 1 # idx of type (COL or TBL)
    COL_NAMES = 0
    parent_dict = dict() # keys are (name, type) tuples and values are (name, type) tuples, which are parent/predecessor;
    q = deque()
    # initialize vars
    q.append((start_col, COL))
    parent_dict[(start_col, COL)] = None
    # perform BFS using row dict and table dict
    while len(q) > 0:
        curr = q.popleft()
        # curr_type = curr[TYPE]
        # get children of curr
        if curr[TYPE] == COL:
            children = list(cols_to_tables[curr[NAME]])
        else:
            children = list(tables_to_metadata[curr[NAME]][COL_NAMES])
        try:
            children.remove('id')
        except ValueError:
             print "children don't have id"
        # go through each child and add to queue, if relevant
        for child in children:
            # if children are col names
            if curr[TYPE] == TBL:
                # check for end_col
                if child == end_col:
                    # insert predecessor to child into parent_dict
                    if (child, COL) in parent_dict:
                        parent_dict[(child, COL)].append(curr)
                        # check if 5 solutions have been found and return solution if so
                        if len(parent_dict[(end_col, COL)]) == 5:
                            ans = unwind_solution(end_col, parent_dict)
                            return jsonify(ans)  # unwind_solution(end_col, parent_dict))
                    else:
                        parent_dict[(child, COL)] = [curr]
                # check if child has been seen before, if not then insert into parent dict and append child to q
                elif (child, COL) not in parent_dict:
                    parent_dict[(child, COL)] = curr
                    q.append((child, COL))
            # if children are table names
            else:
                # check if child has been seen before, if not then insert into parent dict and append child to q
                if (child, TBL) not in parent_dict:
                    parent_dict[(child, TBL)] = curr
                    q.append((child, TBL))
    ans = unwind_solution(end_col, parent_dict)
    return jsonify(ans[:5]) #unwind_solution(end_col, parent_dict))


# takes end_col string and parent_dict dictionary and returns unwound solutions, tracing backwards from end_col
#     return:        list of lists of list of table-tups and list of joining cols; looks like this:
#                    [[[[table, [cols], ingest_date],...],[joining_col,...]],...]

def unwind_solution(end_col, parent_dict):
    # define constants
    COL = True
    TBL = False
    NAME = 0 # idx of col or table name in tuple
    TYPE = 1 # idx of type (COL or TBL)
    all_paths = []
    # for each path that ends with end_col, accumulate path and add to all_paths
    for table in parent_dict[(end_col, COL)]:
        list_of_tables = []
        list_of_cols = []
        curr = table
        # work on one path
        while curr is not None:
            if curr[TYPE] == TBL:
                table_tuple = [curr[NAME]]
                table_tuple.extend(tables_to_metadata[curr[NAME]])
                list_of_tables.append(table_tuple)
            else:
                list_of_cols.append(curr[NAME])
            curr = parent_dict[curr]
        # clean path, revers accumulated lists, add to all_paths
        list_of_cols.pop() # remove last col from list_of_cols, since it's not an "internal" col
        list_of_cols.reverse()
        list_of_tables.reverse()
        all_paths.append([list_of_tables, list_of_cols])
    return all_paths



# DELETE NEXT TWO ROWS. JUST FOR REFERENCE
# cols_to_tables = get_json_from_file(os.path.join(folder_path, 'columns_to_tables.txt')) or defaultdict(list)  # value is [db_tablenames] list
# tables_to_metadata = get_json_from_file(os.path.join(folder_path, 'tables_to_metadata.txt')) or defaultdict(tuple)  # value is [[col names], ingest_date]


# DONE (SHEHAN)
# Given a path of tables and their joining columns, left joins the tables from left to right,
# ending with one large joined table.
#     parameters:    path: tuple of list of table tups and list of joining cols; looks like this:
#                    [[[table, [cols], ingest_date],...],[joining_col,...]]
#     return:        table-tuple [[table, [col_names], ingest_date], [entry, entry, entry, entry, entry]]
@auth.route('/join_path')
@login_required
def join_path():
    path = json.loads(request.args.get('path'))
    # while length of path is greater than 1,
        # replace first two tables in list with result of joining them on the first col in joining cols list
        # remove first element of joining cols list
    # in the end, the path of tables will have been joined until it is just a single table in length
    # return the table-tuple of this single element in the list

    #Extracting the contents of the outer list
    list_of_tables = path[0]
    if len(list_of_tables) == 1:
        query = 'SELECT * FROM %s LIMIT 5' % list_of_tables[0][0]
        cursor.execute(query)
        entries = cursor.fetchall()
        return jsonify([list_of_tables[0], entries])
    joining_columns = path[1]
    # if len(list_of_tables) > 0:
    joined_table_name = list_of_tables[0][0]
    for i in range(len(joining_columns)):
        joined_table_tuple = join_two_tables_aux(joined_table_name, list_of_tables[i+1][0], [[joining_columns[i], joining_columns[i]]]) 
        #   #make sure not to index out of bounds
#         if i < len(joining_columns) -1:
#             # check if next column to join on is present in accumulated joined table; if not, return table to date
#             if joining_columns[i+1][0] not in joined_table_tuple[0][1]:
#                 return jsonify(joined_table_tuple)
        joined_table_name = joined_table_tuple[0][0]
    
#     new_table_name = joined_table_tuple[0]
#     # Retrieve first five rows of new_table_name
#     query = 'SELECT * FROM %s LIMIT 5' % new_table_name
#     cursor.execute(query)
#     entries = cursor.fetchall()

    return jsonify(joined_table_tuple)


# DONE (TAI)
# Gets table tuple data and first 5 entries for a given table.
#     parameters:    db_table_name: str
#     return:        table-tuple with first 5 entries [[table, [col_names], ingest_date], [entry, entry, entry, entry, entry]]
@auth.route('/get_table_info')
@login_required
def get_table_info():
    db_table_name = request.args.get('db_table_name', '', type=str)

    metadata = tables_to_metadata[db_table_name]
    
    try:
        col_names = metadata[0]
        ingest_date = metadata[1]
    except IndexError:
        query = 'SELECT column_name FROM information_schema.columns WHERE table_name = \'%s\' AND table_schema = \'%s\'' % (db_table_name, DB_NAME)
        cursor.execute(query)
        col_names = [col for [col] in cursor.fetchall()]
        ingest_date = str(datetime.datetime.now())

    # Retrieve first five rows of new_table_name
    query = ('SELECT * FROM %s LIMIT 5') % db_table_name
    cursor.execute(query)
    entries = cursor.fetchall()
    

    # Set return table-tuple
    table_tuple = [[db_table_name, col_names, ingest_date], entries]
    return jsonify(table_tuple)


# DONE (TAI)
# Gets table tuple data.
#     parameters:    table_name: str
#     return:        table-tuple without first 5 entries [table, [col_names], ingest_date]
@auth.route('/get_table_metadata')
@login_required
def get_table_metadata():
    table_name = request.args.get('table_name', '', type=str)

    metadata = tables_to_metadata[table_name]
    col_names = metadata[0]
    ingest_date = metadata[1]

    # Set return table-tuple
    table_tuple = [table_name, col_names, ingest_date]
    return jsonify(table_tuple)


# DONE? (jeremy) what does it mean for this function to fail (return false) ?
# Resets cached table list.
# parameters:
# table_name: str
# return value: True if successful, False if failed
@auth.route('/reset_cached_table_list')
@login_required
def reset_cached_table_list():
    # for tablename in users_to_cached_tables[cas.username][1:]: # this is all but the first table
        # if tablename is not in users_to_saved_tables[cas.username] tuples:
            # drop tablename table from database
    # set users_to_cached_tables[cas.username] = [table_name]  #this is the parameter value
    # return True if successful, False otherwise
    for table_name in users_to_cached_tables[cas.username][1:]:
        table_found = False
        for tuples in users_to_saved_tables[cas.username]:
            if table_name == tuples[1]: # table_name was found in saved tables, so don't drop
                table_found = True
                break
        if not table_found: # if the cached table name wasn't found in saved tables
            # drop table by the name of table_name from database and remove from cache
            users_to_cached_tables[cas.username].remove(table_name)
            try:
                cursor.execute('DROP TABLE IF EXISTS \'' + table_name + '\'')
                conn.commit()
            except Exception as e:
                print 'Error in attempting to drop table \'' + table_name + '\': %s' % e.args[0]
                print e
    return jsonify(True)


#
# if __name__ == "__main__":
#     app.run()

@auth.route('/upload', methods=['GET','POST'])
@login_required
def upload():
    file = request.files['file']
    flash(file.name)
    # if user does not select file, browser also
    # submit a empty part without filename
    if file.filename == '':
        flash('No selected file')
        # return redirect(request.url)
    if file and (file.filename.endswith('.csv')):
        flash(file.name+" got past the check")
        # filename = secure_filename(file.filename)
        file.save(os.path.join('/var/www/html/flask_app/my_app/files/new_tables/', file.filename))
            # return redirect(url_for('uploaded_file',filename=filename))
    unIngestedFiles = os.listdir(os.path.join(folder_path, 'new_tables'))
    return render_template('ingest.html', unIngestedFiles = unIngestedFiles)


@auth.route('/download', methods=['POST'])
@login_required
def download():
    fullfilename = request.values["data_file"][:-1]
    return send_from_directory(directory=('/var/www/html/flask_app/my_app/files/user_tables/'+cas.username+'/') , filename=(fullfilename+'.csv'))

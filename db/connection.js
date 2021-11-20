var mysql = require('mysql');

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "inventory"
});

connection.connect((err) => {
    if(!err){
        console.log("Connected to MySQL");
    }
    else{
        console.log(err);
    }
});

module.exports = connection;
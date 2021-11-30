var connection = require("./db/connection");
const auth = require('./middleware/auth');
const path = require('path');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const cookieParser = require('cookie-parser');
require('dotenv').config();
const app = express();

const staticPath = path.join(__dirname, ("public"));
const viewsPath = path.join(__dirname, ("templates/views"));

app.use(express.static(staticPath));
app.set("view engine", "ejs");
app.set("views", viewsPath);
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

let customerItems = [];
let count=0;

app.get("/", auth, (req, res) => {
    //customerItems = [];
    if (req.usertype == "Admin") {
        return res.render("home", { usertype: "Admin" });
    }
    else if (req.usertype == "Cashier") {
        return res.redirect("/cashpayment");
    }
    res.render("login", { message: null });
});

app.post("/", (req, res) => {
    const query = "SELECT * from users WHERE username=? AND usertype=?";
    connection.query(query, [req.body.username, req.body.usertype], async (err, rows) => {
        if (!err) {
            if (rows[0] == undefined) {
                return res.render("login", { message: "Wrong Username/Password Combination" });
            }
            let { username, password, usertype } = rows[0];
            if (rows.length == 1) {
                const check = await bcrypt.compare(req.body.password, password);
                if (check == true || req.body.password == password) {
                    const fullname = usertype + " " + username
                    const token = await jwt.sign(fullname, process.env.SECRET_KEY);
                    res.cookie("jwt", token, { expires: new Date(Date.now() + 253402300000000), httpOnly: true });
                    return res.redirect("/");
                }
                console.log("1");
                res.render("login", { message: "Wrong Username/Password Combination" });
            }
        } else {
            console.log(err);
        }
    })
});

app.get("/product", auth, (req, res) => {
    if (req.usertype != "Admin") {
        return res.redirect("/");
    }
    let query = "SELECT * FROM products";
    connection.query(query, (err,rows) => {
        if(!err){
            let query = "SELECT DISTINCT supplier FROM products";
            connection.query(query, (err,suppliers) => {
                if(!err){
                    return res.render("product", { usertype: "Admin", datas: rows, names: suppliers, message: req.query.message });
                }
                return console.log(err);
            })
            return;
        }
        console.log(err);
    })
});

app.post("/product", auth, (req,res) => {
    if(req.usertype != "Admin"){
        return res.redirect("/");
    }
    let {supplier, productCode, brand, productName, unit, quantity, cp, srp, dd, ed} = req.body; 
    let query = "SELECT * FROM products WHERE productCode=?"
    connection.query(query, [productCode], (err,rows) => {
        if(!err){
            if(rows.length > 0){
                return res.redirect("/product/?message=fail");
            }
            query = "INSERT INTO products (supplier, productCode, brandName, productName, productUnit, quantity, cost, srp, dateDeli, dateExp) VALUES ?";
            const values = [[supplier, productCode, brand, productName, unit, quantity, cp, srp, dd, ed]]
            connection.query(query, [values], (err,datas) => {
                if(!err){
                    return res.redirect("/product/?message=success");
                }
                console.log(err);
            })
            return;
        }
        console.log(err);
    })
});

app.post("/product/edit/:id", auth, (req,res) => {
    if(req.usertype != "Admin"){
        return res.redirect("/");
    }
    let query = "UPDATE products SET supplier=?, productCode=?, brandName=?, productName=?, productUnit=?, quantity=?, cost=?, srp=? WHERE id=?";
    let { supplier, productCode, brand, productName, unit, quantity, cp, srp } = req.body;
    connection.query(query, [supplier, productCode, brand, productName, unit, quantity, cp, srp, req.params.id], (err, rows) => {
        if(!err){
            return res.redirect('/product/?message=edited');
        }
        console.log(err);
    })
});

app.post("/product/delete/:id", auth, (req,res) => {
    if(req.usertype != "Admin"){
        return res.redirect("/");
    }
    let query = "DELETE FROM products WHERE id=?";
    connection.query(query, [req.params.id], (err,rows) => {
        if(!err){
            return res.redirect("/product/?message=deleted");
        }
        console.log(err);
    })
});

app.get("/cashier", auth, (req, res) => {
    if (req.usertype != "Admin") {
        return res.redirect("/");
    }
    let query = "SELECT * FROM users WHERE usertype=?";
    connection.query(query, ["Cashier"], (err, rows) => {
        if (!err) {
            res.render("addCashier", { usertype: "Admin", message: req.query.message, datas: rows });
        } else {
            console.log(err);
        }
    });
});

app.post("/cashier", auth, (req, res) => {
    if (req.usertype != "Admin") {
        return res.redirect("/");
    }
    let query = "SELECT * FROM users WHERE username=?";
    connection.query(query, [req.body.username], (err, rows) => {
        if (!err && rows.length == 1) {
            res.redirect("/cashier/?message=fail");
        }
        else if (!err) {
            query = "INSERT INTO users (fullname, email, phone, address, username, password, usertype) VALUES ?";
            let { fullname, email, phone, address, username, password } = req.body;
            const values = [[fullname, email, phone, address, username, password, "Cashier"]];
            connection.query(query, [values], (err, rows) => {
                if (!err) {
                    return res.redirect("/cashier/?message=success");
                }
                console.log(err);
            })
        }
        else {
            console.log(err);
        }
    })
});

app.post("/cashier/edit/:id", auth, (req, res) => {
    if (req.usertype != "Admin") {
        return res.redirect("/");
    }
    let query = "UPDATE users SET fullname=?, email=?, phone=?, address=?, username=?, password=? WHERE id=?";
    let { fullname, email, phone, address, username, password } = req.body;
    connection.query(query, [fullname, email, phone, address, username, password, req.params.id], (err, rows) => {
        if (!err) {
            return res.redirect("/cashier/?message=edited");
        }
        console.log(err);
    });
});

app.post("/cashier/delete/:id", auth, (req, res) => {
    if (req.usertype != "Admin") {
        return res.redirect("/");
    }
    let query = "DELETE FROM users WHERE id=?";
    connection.query(query, [req.params.id], (err, rows) => {
        if (!err) {
            return res.redirect("/cashier/?message=deleted");
        }
        console.log(err);
    })
})

app.get("/cashpayment", auth, (req, res) => {
    if (req.usertype != "Cashier") {
        return res.redirect("/");
    }
    if(count==0){
        count = 1;
    }
    let query = "SELECT * FROM products WHERE quantity > 0 ORDER BY dateExp";
    connection.query(query, (err,rows) => {
        if(!err){
            query = `SELECT * FROM products WHERE productCode='${req.query.code}'`;
            connection.query(query, (err,datas) => {
                if(!err){
                    if(req.query.quantity !== undefined && req.query.dis !== undefined && req.query.vat !== undefined){
                        customerItems.push(
                            {
                                ...datas[0],
                                quantity: req.query.quantity,
                                discount: req.query.dis,
                                vat: req.query.vat,
                                no: count
                            }
                        )
                        count++
                    }
                    return res.render("cashPayment", { usertype: "Cashier", items: rows, table: customerItems });
                }
                console.log(err);
            })
            return;
        }
        console.log(err);
    })
});

app.post("/cashpayment", auth, (req,res) => {
    if(req.usertype != "Cashier"){
        return res.redirect("/");
    }
    let {quantity, selectProductCode, discount, vat} = req.body;
    query = `UPDATE products SET quantity=quantity-${quantity} WHERE productCode='${selectProductCode}'`;
    connection.query(query, (err, rows) => {
        if(!err){
            return res.redirect(`/cashpayment/?code=${selectProductCode}&quantity=${quantity}&dis=${discount}&vat=${vat}`);
        }
        console.log(err);
    })
});

app.post("/item/delete/:productcode/:itemno/:quantity", auth, (req,res) => {
    if(req.usertype != "Cashier"){
        return res.redirect("/");
    }
    let query = `UPDATE products SET quantity=quantity+${req.params.quantity} WHERE productCode='${req.params.productcode}'`;
    connection.query(query, (err, rows) => {
        if(!err){
            customerItems = customerItems.filter(data => {
                return data.no != req.params.itemno;
            });
            count--;
            return res.redirect("/cashpayment");
        }
        console.log(err);
    })
});

app.get("/logout", (req, res) => {
    res.clearCookie("jwt");
    res.redirect("/");
});

/* This Route required to run only for One Time after Creation of Database */
/* After Creation of Database Restart the Server */
app.get("/createtables", (req, res) => {
    //Create Table users
    let query = "CREATE TABLE IF NOT EXISTS `users` ( `id` INT NOT NULL AUTO_INCREMENT , `fullname` VARCHAR(255) NOT NULL , `email` VARCHAR(255) NOT NULL , `phone` VARCHAR(255) NOT NULL , `address` VARCHAR(255) NOT NULL , `username` VARCHAR(255) NOT NULL , `password` VARCHAR(255) NOT NULL , `usertype` VARCHAR(20) NOT NULL , PRIMARY KEY (`id`))"
    connection.query(query, async (err, row) => {
        if (!err) {
            const hashedPassword = await bcrypt.hash("admin123", 10);
            let query = "INSERT INTO users (fullname, email, phone, address, username, password, usertype) VALUES ?";
            let values = [["Creator", "creator@gmail.com", "123456789", "creatorAddress", "admin", hashedPassword, "Admin"]];
            connection.query(query, [values], (err, result) => {
                if (err) {
                    console.log("Username already Existed");
                }
            })
        }
        else {
            console.log(err);
        }
    })

    //Create Table Product
    query = "CREATE TABLE IF NOT EXISTS `products` ( `id` BIGINT NOT NULL AUTO_INCREMENT , `supplier` VARCHAR(255), `productCode` VARCHAR(255) NOT NULL , `brandName` VARCHAR(255) NOT NULL , `productName` VARCHAR(255) NOT NULL , `productUnit` VARCHAR(20) NOT NULL , `quantity` INT NOT NULL , `cost` INT NOT NULL , `srp` INT , `dateDeli` DATE , `dateExp` DATE NOT NULL , PRIMARY KEY (`id`))"
    connection.query(query, (err, row) => {
        if (err) {
            console.log(err);
        }
    })

    //Create Table Orders
    res.send("Tables Created");
})

app.get("*", (req, res) => {
    res.send("404 ERROR");
});

const port = process.env.PORT || 3000;
app.listen(port, (err) => {
    if (!err) {
        console.log(`Server listening at port ${port}`);
    }
    else {
        console.log(`Error : ${err}`);
    }
});
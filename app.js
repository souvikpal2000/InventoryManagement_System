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
    if (req.usertype == "Cashier") {
        return res.redirect("/cashpayment");
    }
    else if(req.usertype != "Admin"){
        return res.render("login", {message:null});
    }
    const promiseFunc1 = () => {
        const promise1 = new Promise((resolve, reject) => {
            const query = "SELECT COUNT(*) AS product FROM products";
            connection.query(query, (err,rows) => {
                if(err){
                    return reject("Error while counting number of Product");
                }
                const totalProduct = rows[0].product;
                const query = "SELECT SUM(quantity*cost) AS cost FROM products";
                connection.query(query, (err, rows) => {
                    if(err){
                        return reject("Error while finding Total Cost");
                    }
                    const totalCost = rows[0].cost;
                    const query = "SELECT SUM(quantity) AS quantity FROM products";
                    connection.query(query, (err, rows) => {
                        if(err){
                            return reject("Error while finding total Quantity");
                        }
                        const quantity = rows[0].quantity;
                        const arr1 = [totalProduct, totalCost, quantity] 
                        resolve(arr1);
                    })

                })
            })
        });
        return promise1;
    }

    const promiseFunc2 = () => {
        const promise2 = new Promise((resolve, reject) => {
            const query = "SELECT COUNT(*) as count FROM products WHERE quantity > 0 AND DATE_SUB(dateExp, INTERVAL 1 MONTH) < CURDATE() AND dateExp > CURDATE() ORDER BY dateExp";
            connection.query(query, (err, rows) => {
                if(err){
                    return reject("Error while counting Expiring Product");
                }
                const expiring = rows[0].count;
                const query = "SELECT COUNT(*) as count FROM products WHERE dateExp < CURDATE() ORDER BY dateExp";
                connection.query(query, (err, rows) => {
                    if(err){
                        return reject("Error while counting Expired Product");
                    }
                    const expired = rows[0].count;
                    const arr2 = [expiring, expired];
                    resolve(arr2);
                })
                
            })
        });
        return promise2;
    }

    const promiseFunc3 = () => {
        const promise3 = new Promise((resolve, reject) => {
            const query = "SELECT SUM(totalAmount) AS total FROM sales";
            connection.query(query, (err, rows) => {
                if(err){
                    return reject("Error while calculating Total Sales");
                }
                const totalSales = rows[0].total;
                const query = "SELECT SUM(cost*quantity) as loss FROM products WHERE dateExp < CURDATE() ORDER BY dateExp";
                connection.query(query, (err, rows) => {
                    if(err){
                        return reject("Error while calculating Loss Suffered");
                    }
                    const loss = rows[0].loss;
                    const arr3 = [totalSales, loss];
                    resolve(arr3);
                })
            })
        });
        return promise3;
    }

    const promiseFunc4 = () => {
        const promise4 = new Promise((resolve, reject) => {
            const query = "SELECT COUNT(*) AS count FROM users WHERE usertype='Cashier'";
            connection.query(query, (err, rows) => {
                if(err){
                    return reject("Error while counting Cashier");
                }
                const cashier = rows[0].count;
                const query = `SELECT fullName FROM users INNER JOIN
                                (SELECT cashierName FROM (
                                    SELECT cashierName, SUM(totalAmount) AS totalSales FROM sales GROUP BY cashierName
                                ) A WHERE totalSales=(
                                    SELECT MAX(totalSales) FROM (SELECT SUM(totalAmount) AS totalSales FROM sales GROUP BY cashierName) B
                                )) C
                                ON users.username = cashierName`
                connection.query(query, (err, rows) => {
                    if(err){
                        return reject("Error while calculating sales by Single Cashier");
                    }
                    const cashierName = rows[0].fullName;
                    const arr4 = [cashier, cashierName];
                    resolve(arr4);
                })

            })
        })
        return promise4;
    }

    (async() => {
        try{
            const arr1 = await promiseFunc1();
            const arr2 = await promiseFunc2();
            const arr3 = await promiseFunc3();
            const arr4 = await promiseFunc4();
            return res.render("home",{  usertype: "admin", 
                                        product: arr1[0], totalCost: arr1[1], quantity: arr1[2],
                                        expiring: arr2[0], expired: arr2[1],
                                        totalSales: arr3[0], loss: arr3[1],
                                        cashiers: arr4[0], cashierName: arr4[1]});
        }
        catch(err){
            console.log(err);
        }
    })();
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
    let query = "SELECT * FROM products WHERE id!=? AND productCode=?"
    connection.query(query, [req.params.id, req.body.productCode], (err, rows) => {
        if(!err && rows.length > 0){
            return res.redirect('/product/?message=fail');
        }
        query = "UPDATE products SET supplier=?, productCode=?, brandName=?, productName=?, productUnit=?, quantity=?, cost=?, srp=? WHERE id=?";
        let { supplier, productCode, brand, productName, unit, quantity, cp, srp } = req.body;
        connection.query(query, [supplier, productCode, brand, productName, unit, quantity, cp, srp, req.params.id], (err, rows) => {
            if(!err){
                return res.redirect('/product/?message=edited');
            }
            console.log(err);
        })
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

app.get("/expiring", auth, (req,res) => {
    //customerItems = [];
    if (req.usertype == "Admin") {
        let query = "SELECT * FROM products WHERE quantity > 0 AND DATE_SUB(dateExp, INTERVAL 1 MONTH) < CURDATE() AND dateExp > CURDATE() ORDER BY dateExp";
        connection.query(query, (err, rows) => {
            if(!err){
                return res.render("expiring", { usertype: "Admin", items: rows});
            }
            console.log(err);
        })
        return;
    }
    // else if (req.usertype == "Cashier") {
    //     return res.redirect("/cashpayment");
    // }
    res.render("login", { message: null });
})

app.get("/expired", auth, (req,res) => {
    if(req.usertype != "Admin"){
        return res.redirect("/");
    }
    let query = "SELECT * FROM products WHERE dateExp < CURDATE() ORDER BY dateExp";
    connection.query(query, (err, rows) => {
        if(!err){
            return res.render("expiredProduct", { usertype: "Admin", items: rows });
        }
        console.log(err);
    })  
})

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
    let query = "SELECT * FROM users WHERE id!=? AND username=?";
    connection.query(query, [req.params.id, req.body.username], (err, rows) => {
        if(!err && rows.length > 0){
            return res.redirect("/cashier/?message=fail");
        }
        query = "UPDATE users SET fullname=?, email=?, phone=?, address=?, username=?, password=? WHERE id=?";
        let { fullname, email, phone, address, username, password } = req.body;
        connection.query(query, [fullname, email, phone, address, username, password, req.params.id], (err, rows) => {
            if (!err) {
                return res.redirect("/cashier/?message=edited");
            }
            console.log(err);
        });
    })
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
    let query = "SELECT * FROM products WHERE quantity > 0 AND dateExp > CURDATE() ORDER BY dateExp";
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
                    return res.render("cashPayment", { usertype: "Cashier", items: rows, table: customerItems, message: req.query.message });
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

app.post("/pay", auth, (req,res) => {
    if(req.usertype != "Cashier"){
        return res.redirect("/");
    }
    if(!customerItems.length){
        return res.redirect("/cashpayment/?message=fail");
    }
    let totalSum = 0
    customerItems.forEach(data => {
        let {quantity, srp, discount, vat} = data;
        let cost = quantity * srp;
        totalSum = totalSum + (cost - ((cost + (cost*(vat/100))) * (discount/100)));
    })
    let {customerName, customerAddress, phone, cashPaid} = req.body;
    let query = "INSERT INTO sales (cashierName, customerName, address, phoneNo, totalAmount, cashPaid, cashReturn, date) VALUES ?";
    let today = new Date();
    let date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    let values = [[req.username, customerName, customerAddress, phone, totalSum, cashPaid, (cashPaid - totalSum), date]];
    connection.query(query, [values], (err, rows) => {
        if(err){
            return console.log(err);
        }
        const id = rows.insertId;
        query = "INSERT INTO sales_order (productCode, brandName, productName, quantity, price, discount, vat, invoiceId) VALUES ?";
        customerItems.forEach(data => {
            let {productCode, brandName, productName, quantity, srp, discount, vat} = data;
            values = [[productCode, brandName, productName, quantity, srp, discount, vat, id]];
            connection.query(query, [values], (err, rows) => {
                if(err){
                    console.log(err);
                }
            })  
        });
        customerItems = [];
        res.redirect(`/print/?invoice=${id}`);   
    })
});

app.get("/print", auth, (req,res) => {
    if(req.usertype == null || !req.query.invoice){
        return res.redirect("/");
    }
    let query;
    const adminDetails = new Promise((resolve, reject) => {
        query = "SELECT * FROM users WHERE usertype='admin'";
        connection.query(query, (err, rows) => {
            if(err){
                reject(err);
            }else{
                resolve(rows)
            }
        })
    })
    const invoiceDetails = (invoiceId) => {
        return new Promise((resolve, reject) => {
            query = "SELECT * FROM sales WHERE invoiceId=?";
            connection.query(query, [invoiceId], (err, rows) => {
                if(err){
                    reject(err);
                }else{
                    resolve(rows);
                }
            })
        })
    }
    const userDetails = (invoiceData) => {
        return new Promise((resolve, reject) => {
            query = "SELECT * FROM users WHERE username=?";
            connection.query(query, [invoiceData[0].cashierName], (err, rows) => {
                if(err){
                    reject(err);
                }else{
                    resolve(rows);
                }
            })
        })
    }
    const productDetails = (invoiceId) => {
        return new Promise((resolve, reject) => {
            query = "SELECT * FROM sales_order WHERE invoiceId=?";
            connection.query(query, [invoiceId], (err, rows) => {
                if(err){
                    reject(err);
                }else{
                    resolve(rows);
                }
            })
        })
    }

    const mainFunc = async () => {
        try{
            const admin = await adminDetails;
            const invoice = await invoiceDetails(req.query.invoice);
            const cashierDetails = await userDetails(invoice);
            const product = await productDetails(req.query.invoice);
            
            if(cashierDetails[0] == undefined){
                return res.render("print", {
                    data: admin[0], 
                    invoiceData: invoice[0], 
                    cashier: "Unknown",
                    products: product,
                    usertype: req.usertype
                });
            }
            res.render("print", {
                data: admin[0], 
                invoiceData: invoice[0], 
                cashier: cashierDetails[0].fullname,
                products: product,
                usertype: req.usertype
            });
        }
        catch(err){
            console.log(err);
            if(req.usertype == "Admin"){
                res.redirect("/salesreport");
            }
            else if(req.usertype == "Cashier"){
                res.redirect("/cashpayment");
            }
        }
    }
    mainFunc();
})

app.get("/salesreport", auth, (req,res) => {
    if(req.usertype != "Admin"){
        return res.redirect("/");
    }
    let query = "SELECT * FROM sales ORDER BY date DESC"
    connection.query(query, (err, rows) => {
        if(!err){
            return res.render("salesReport", {usertype: "Admin", sales: rows}); 
        }
    })
})

app.post("/salesreport/delete/:id", auth, (req,res) => {
    if(req.usertype != "Admin"){
        return res.redirect("/");
    }
    let query = "DELETE FROM sales WHERE invoiceId=?";
    connection.query(query, [req.params.id], (err, rows) => {
        if(!err){
            return res.redirect("/salesreport");
        }
        console.log(err);
    })
})

app.get("/logout", (req, res) => {
    res.clearCookie("jwt");
    res.redirect("/");
});

/* This Route required to run only for One Time after Creation of Database */
/* After Creation of Database Restart the Server */
app.get("/createtables", (req, res) => {
    //Create Table users
    let query = `CREATE TABLE IF NOT EXISTS users ( 
        id INT NOT NULL AUTO_INCREMENT , 
        fullname VARCHAR(255) NOT NULL , 
        email VARCHAR(255) NOT NULL ,
        phone VARCHAR(255) NOT NULL , 
        address VARCHAR(255) NOT NULL , 
        username VARCHAR(255) NOT NULL , 
        password VARCHAR(255) NOT NULL , 
        usertype VARCHAR(20) NOT NULL , 
        PRIMARY KEY (id),
        UNIQUE (username)
    )`
    connection.query(query, (err, row) => {
        if (!err) {
            query = `SELECT * FROM users WHERE username='admin'`;
            connection.query(query, async (err, rows) => {
                if(!err && rows.length > 0){
                    console.log("Admin Details Already Existed!!");
                }
                else if(!err && rows.length == 0){
                    const hashedPassword = await bcrypt.hash("admin123", 10);
                    query = "INSERT INTO users (fullname, email, phone, address, username, password, usertype) VALUES ?";
                    let values = [["Cartmax", "cartmax@gmail.com", "123456789", "185, Madhusudan Banerjee Rd · 033 3018 2624", "admin", hashedPassword, "Admin"]];
                    connection.query(query, [values], (err, result) => {
                        if (!err) {
                            console.log("Admin Details Added!!");
                            return;
                        }
                        console.log(err);
                    })
                    return;
                }
                else if(err){
                    console.log(err);
                }
            })
        }
        else {
            console.log(err);
        }
    })

    //Create Table Product
    query = `CREATE TABLE IF NOT EXISTS products ( 
        id BIGINT NOT NULL AUTO_INCREMENT , 
        supplier VARCHAR(255), 
        productCode VARCHAR(255) NOT NULL , 
        brandName VARCHAR(255) NOT NULL , 
        productName VARCHAR(255) NOT NULL , 
        productUnit VARCHAR(20) NOT NULL , 
        quantity INT NOT NULL , 
        cost INT NOT NULL , 
        srp INT NOT NULL , 
        dateDeli DATE NOT NULL , 
        dateExp DATE NOT NULL , 
        PRIMARY KEY (id)
    )`
    connection.query(query, (err, row) => {
        if (err) {
            console.log(err);
        }
    })

    //Create Table Sales
    query = `CREATE TABLE IF NOT EXISTS sales ( 
        invoiceId INT NOT NULL AUTO_INCREMENT , 
        cashierName VARCHAR(255) , 
        customerName VARCHAR(255) NOT NULL , 
        address VARCHAR(255) , 
        phoneNo VARCHAR(255) , 
        totalAmount INT NOT NULL , 
        cashPaid INT NOT NULL , 
        cashReturn INT NOT NULL , 
        date DATE NOT NULL ,
        PRIMARY KEY (invoiceId) , 
        FOREIGN KEY (cashierName) REFERENCES users(username) ON DELETE SET NULL ON UPDATE CASCADE
    )`
    connection.query(query, (err, rows) => {
        if(err){
            console.log(err);
        }
    });

    //Create Table Sales_Order
    query = `CREATE TABLE IF NOT EXISTS sales_order ( 
        id INT NOT NULL AUTO_INCREMENT , 
        productCode VARCHAR(255) NOT NULL , 
        brandName VARCHAR(255) NOT NULL , 
        productName VARCHAR(255) NOT NULL , 
        quantity INT NOT NULL , 
        price INT NOT NULL , 
        discount INT NOT NULL , 
        vat INT NOT NULL , 
        invoiceId INT , 
        PRIMARY KEY (id) , 
        FOREIGN KEY (invoiceId) REFERENCES sales(invoiceId) ON DELETE CASCADE
    )`;
    connection.query(query, (err, rows) => {
        if(err){
            console.log(err);
        }
    });

    //Create Table Orders
    res.send("Tables Created");
})

app.get("*", (req, res) => {
    res.render("404Error", { errMessage: 'Oops! Page not Found'});
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
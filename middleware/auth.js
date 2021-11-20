const jwt = require('jsonwebtoken');

const auth = (req,res,next) => {
    if(!req.cookies.jwt){
        req.usertype = null;
        req.username = null;
        return next();
    }
    const token = req.cookies.jwt;
    const verifyUser = jwt.verify(token, process.env.SECRET_KEY);
    const array = verifyUser.split(" ");
    req.usertype = array[0];
    req.username = array[1];
    next();
}

module.exports = auth;
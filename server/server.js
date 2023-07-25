const http = require('http');
const express = require('express');
const app = express();
//this will be used to expose the cookie header in the request
const cookieParser = require('cookie-parser');

// importing the routers (we export these modules in the respective files)
const indexRouter = require("./routes/index");
const authRouter = require("./routes/auth");

//set the port
const port = process.env.PORT || 3000;

//setting up our app to serve static files from this path
app.use(express.static(`${__dirname}/..`));

//set the view directory '../client/views
app.set('views', `${__dirname}/../client/views`);
app.set('view engine', 'ejs');

// adding middleware to parse the cookies and more
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

//setting the routes
app.use("/", indexRouter);
app.use("/auth", authRouter);

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
})
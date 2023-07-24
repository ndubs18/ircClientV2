const http = require('http');
const express = require('express');
const app = express();

//setting up our app to serve static files from this path
app.use(express.static(`${__dirname}/..`));

//set the view directory '../client/views
app.set('views', `${__dirname}/../client/views`);
app.set('view engine', 'ejs');
const port = 3000;


app.get("/", (req, res) => {
    res.render('index');
})


app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
})
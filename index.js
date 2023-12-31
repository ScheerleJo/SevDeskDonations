const config = require('./configHandling')
const requests = require('./requests');
const formatting = require('./formatting');
const sort = require('./sorting');
const fileHandler = require('./fileHandling');
const urlHandler = require('./urlHandling');
const out = require('./output');
const process = require('node:process');
const express = require('express');
const cors = require('cors');
var app = express();

const VERSION = config.VERSION;
const PORT = config.PORT;

console.log(`SevDesk-Extension for Theologische Fernschule e.V. running on Version: ${VERSION}`)
console.log('Trying to start the server...')

let corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200,
    methods: "GET, PUT, POST"
}

// Options for the FrontEnd to function properly
app.use(cors(corsOptions));
let donationData, year;
let loadedData =  fileHandler.loadStatusFromFile();

if (loadedData != undefined) {
    donationData = loadedData.Data;
    year = loadedData.Year;
}

app.get('/', (req, res) => {
    res.send({
        "status": "running",
        "message": "Invalid Branch. Use '/getDonations?year=...' to get all Donations to the input year Use '/saveData?data=...' to save the input Data to a json file"
});
});
app.get('/kill', (req, res) => {
    console.log('The Server will Shutdown with ExitCode 1');
    res.send({"status":"shutdown"});
    process.exit()
});
app.get('/fetchNew', (req, res) => {
    year = urlHandler.getYearFromQuery(req.url)
    requests.getDonations(year, () => {
        console.log('DATA GATHERING (Donations) COMPLETE')
        formatting.setDonationData(requests.getData());
        requests.getAllAddresses(() => {
            console.log('DATA GATHERING (Addresses) COMPLETE')
            formatting.setAddressData(requests.getAddressData());
            donationData = formatting.newFormat();
            console.log('DATA PUSHED SUCCESSFULLY');
            res.send({
                "Year": year,
                "Data": donationData
            });
        })
    })
})

app.get('/saveData', (req, res) => {
    let response = fileHandler.saveStatusToFile(donationData, year);
    res.send({"status": response});     //  Send Status Code (200 for everything okay)
});
app.get('/loadData', (req, res) => {
    res.send({
        "Year": year,
        "Data": donationData
    });
});

app.get('/deleteItem', (req, res) => { ///deleteItem?donatorIndex=...(num)&donationIndex=...(num)&deleteAll=...(true/false)
    sort.setDonationData(donationData);
    
    donationData = sort.deleteItemAtIndex(urlHandler.getDeleteItem(req.url));
    res.send(donationData);
});
app.get('/updateStatuses', (req, res) => {
    
})

app.get('/createLatex', (req, res) => {
    out.setYear(year);
    out.setData(donationData);
    let output = out.createTexDoc();
    let success = fileHandler.writeTexDoc(output);
    if (success != 200){
        res.send(success);
    }
    else {
        res.send({"status":"LaTeX File Created Successfully!"})
    }
});


app.listen(PORT, function(){  
    console.log(`Server running on Port ${PORT}`);
});
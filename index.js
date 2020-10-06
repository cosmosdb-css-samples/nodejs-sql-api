const express = require('express')
const {CosmosClient} = require("@azure/cosmos");
var bodyParser = require('body-parser')

const app = express()
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: false }));
const port =  process.env.PORT || 3000

const endpoint = "https://santacrew.documents.azure.com:443/";
const key = "3VPnWEVJ6OqhD494lsPOCYR7gAYXUfwYL5yJXDbvyY68WErD8qfDKsPmZmTJl2a6etAfYyTqYC4BtOFevWxCog==";
const databaseName = "santadb";
const collectionName = "santacontainer";
app.db = null;
app.col = null;

const client = new CosmosClient({ endpoint, key});
client.getReadEndpoint().then((result) => console.log("Read Endpoint => "+result));
client.getWriteEndpoint().then((result) => console.log("Write Endpoint => "+result));

async function createDatabase(database) {
    const { database: db } = await client.databases.createIfNotExists({ id: database });
    app.db = db;
}

async function createCollection(collection) {
    partitionKey = { kind: "Hash", paths: ["/zipcode"] };
    const { container: col } = await app.db.containers.createIfNotExists({ id: collection, partitionKey }, { offerThroughput: 400 });
    app.col  = col;
}

const asyncMiddleware = fn =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(next);
  };


// Insert Ask
app.post('/insert', (req, res) => {
    req.body.zipcode= Number(req.body.zipcode)
    app.col.items.create(req.body).catch((err) =>  console.log(err));
    res.send('Inserted Successfully')
})

app.post('/upsert', (req, res) => {
    req.body.zipcode= Number(req.body.zipcode)
    app.col.items.upsert(req.body).catch((err) =>  console.log(err));
    res.send('Inserted Successfully')
})

// Retrieve Asks in a zipcode
app.get('/:zipcode',asyncMiddleware(async (req, res, next) => {
    
    const querySpec = {
        query: "SELECT * FROM c WHERE c.zipcode = @zipcode",
        parameters: [
            {
                name: "@zipcode",
                value: req.params.zipcode
            }
        ]
    };
    
    // populate query metrics
    output = await app.col.items.query("SELECT * FROM c WHERE c.zipcode ="+ req.params.zipcode,{populateQueryMetrics:true}).fetchAll();
    // printing query metrics for debugging purpose
    console.log(output.queryMetrics)
    res.json(output.resources);
}));

app.get('/ask/:id',asyncMiddleware(async (req, res, next) => {   
   data = await app.col.items.query("SELECT * FROM c WHERE c.id ='"+req.params.id+"'").fetchAll();
//    console.log(data);
   res.send(data.resources);
}));


app.get('/:updateRecord',asyncMiddleware(async (req, res, next) => {    
}));

app.get('/addcomment/:id', (req, res) => {
    res.send('Hello World!')
})

async function init() {
    await createDatabase(databaseName).catch(err => { console.error(err); });
    await createCollection(collectionName).catch(err => { console.error(err); });
}

app.listen(port, () => {
    init()
    console.log(`Example app listening at http://localhost:${port}`)
})
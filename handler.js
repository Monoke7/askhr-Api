const AWS = require("aws-sdk");
const express = require("express");
const serverless = require("serverless-http");
const {v4:uuidv4} = require("uuid");

const app = express();

const ASKHR_TABLE = process.env.ASKHR_TABLE;
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

app.use(express.json());

async function getData (keyData){
  const params = {
    TableName: ASKHR_TABLE,
    Key: {
      phoneNo: keyData,
    },
  };

  return await dynamoDbClient.get(params).promise();
}

app.get("/askhr/get_consent/:mobPhone", async function (req, res) {
  let keyData = req.params.mobPhone;

  try {
    const { Item } =  await getData (keyData);
    if (Item) {
      const { lastname, nickname, facility, empNum, phoneNo, consent,Id } = Item;
      res.json({ consent });
    } else {
      res
        .status(404)
        .json({ error: 'Could not find consent with provided "mobile phone"' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not retrieve consent", errorCatched: error });
  }
});

app.post("/askhr/add/employee", async function (req, res) {
  const { name, nickname, facility, empNum, phoneNo, consent } = req.body;  

  if (typeof name !== "string") {
    res.status(400).json({ error: '"name" must be a string' });
    return;
  } else if (typeof nickname !== "string") {
    res.status(400).json({ error: '"nickname" must be a string' });
    return;
  }else if (typeof facility !== "string") {
    res.status(400).json({ error: '"facility" must be a string' });
    return;
  }else if (typeof empNum !== "string") {
    res.status(400).json({ error: '"employee number" must be a string' });
    return;
  }else if (typeof phoneNo !== "string") {
    res.status(400).json({ error: '"phone number" must be a string' });
    return;
  }else if (typeof consent !== "string") {
    res.status(400).json({ error: '"consent" must be a string' });
    return;
  }

  let { Item } = await getData(phoneNo);

  if(Item){
    await updateData(res,name, nickname, facility, empNum, phoneNo, consent);
  }else{
    await createData(res,name, nickname, facility, empNum, phoneNo, consent);
  }
  
});

async function createData(res,name, nickname, facility, empNum, phoneNo, consent){
  var id = uuidv4();
  
  const params = {
    TableName: ASKHR_TABLE,
    Item: {
      Id: id,
      lastname: name,
      nickname:nickname,
      facility:facility,
      empNum:empNum,
      phoneNo:phoneNo,
      consent:consent
    },
  };

  try {
    await dynamoDbClient.put(params).promise();
    res.json({ id, name, nickname, facility, empNum, phoneNo, consent });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not create askhr employee", cashed_error:error });
  }
}


async function updateData(res,name, nickname, facility, empNum, phoneNo, consent){
  const params = {
    TableName: ASKHR_TABLE,
    Key: {
      phoneNo:phoneNo
    },
    UpdateExpression: "set lastname = :l, nickname = :n, facility = :f, empNum = :e, consent = :c",
    ExpressionAttributeValues:{
      ":l": name,
      ":n":nickname,
      ":f":facility,
      ":e":empNum,
      ":c":consent
    },
    ReturnValues: "UPDATED_NEW"
  };

  try {
    await dynamoDbClient.update(params).promise();
    res.json({ name, nickname, facility, empNum, phoneNo, consent });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not update askhr employee", cashed_error:error });
  }
}
app.post("/askhr/add_many/employee", async function (req, res) {
  const arReqBody = req.body;
  let errodata = [];
  let successData = 0;

  if(typeof arReqBody !== "object"){
    res.status(400).json({ error: 'to add many employee object, you need to enclose them with an array [{},].' });
    return;
  }else if(arReqBody.lenght < 1){
    res.status(400).json({ error: 'The request body is empty.', body: arReqBody });
    return;
  }
  await arReqBody.forEach((element,index) => {
    const { name, nickname, facility, empNum, phoneNo, consent } = element; 
    
    if (typeof name !== "string") {
      errodata.push({ error: (index+1) + '. "name" must be a string', errorCode: 400 });
    } else if (typeof nickname !== "string") {
      errodata.push({ error: (index+1) + '. "nickname" must be a string', errorCode: 400 });
    }else if (typeof facility !== "string") {
      errodata.push({ error: (index+1) + '. "facility" must be a string', errorCode: 400 });
    }else if (typeof empNum !== "string") {
      errodata.push({ error: (index+1) + '. "employee number" must be a string', errorCode: 400 });
    }else if (typeof phoneNo !== "string") {
      errodata.push({ error: (index+1) + '. "phone number" must be a string', errorCode: 400 });
    }else if (typeof consent !== "string") {
      errodata.push({ error: (index+1) + '. "consent" must be a string', errorCode: 400 });
    }else{
      var id = uuidv4();
  const params = {
    TableName: ASKHR_TABLE,
    Item: {
      Id: id,
      lastname: name,
      nickname:nickname,
      facility:facility,
      empNum:empNum,
      phoneNo:phoneNo,
      consent:consent
    },
  };

  try {
    (async ()=>{
      await dynamoDbClient.put(params).promise();
      })();
    successData++;
  } catch (error) {
    console.log(error);
    errodata.push({ error: (index+1) + ". Could not create askhr employee", cashed_error:error, errorCode:500 });
  }
    }
  
  }); 
  
  res.status(200).json({
    error_details:errodata,
    count_added: successData
  });
});

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});


module.exports.handler = serverless(app);
